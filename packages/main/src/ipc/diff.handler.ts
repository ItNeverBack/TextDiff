import { ipcMain, IpcMainInvokeEvent } from 'electron'
import type { FileInfo, DiffOptions, DiffResult, ThreeWayDiffResult, SyncDiffOptions, SyncDiffResult } from '@shared/types'
import { LARGE_FILE_THRESHOLD } from '@shared/constants'
import { computeThreeWayDiff } from '../diff/three-way'
import { computeDiffWithWorkerPool, type ProgressCallback } from '../diff/worker'
import { computeDiffWithCache, clearDiffCache, getDiffCacheStats } from '../diff/cache'
import { computeSmartDiff } from '../diff/incremental'
import { syncDiff } from '../diff/sync'
import type { DiffLine, DiffChunk } from '@shared/types'

/**
 * 会话状态存储（用于增量 diff）
 */
const sessionStates = new Map<string, {
  lastResult: DiffResult | null
  lastLeftContent: string | null
  lastRightContent: string | null
}>()

/**
 * Diff IPC Handlers
 * 
 * Week 12 性能优化：
 * - Diff 计算结果缓存（文件内容不变时不重复计算）
 * - 增量 diff（文件局部变更时只重算变更部分）
 * 
 * 大文件处理：
 * - 文件总大小 > 5MB 时自动使用 Worker 线程
 * - 支持进度通知通过事件通道
 * 
 * 参考: TextDiff-DevPlan.md §Week 12
 */

export function registerDiffHandlers(): void {
  // 计算差异 - 支持缓存、增量更新和大文件 Worker 线程处理
  ipcMain.handle('diff:compute', async (
    event: IpcMainInvokeEvent,
    left: FileInfo,
    right: FileInfo,
    options: DiffOptions
  ): Promise<DiffResult> => {
    const totalSize = left.content.length + right.content.length
    const isLargeFile = totalSize > LARGE_FILE_THRESHOLD
    
    // 生成会话 ID
    const sessionId = `${left.path}-${right.path}`
    const sessionState = sessionStates.get(sessionId) || {
      lastResult: null,
      lastLeftContent: null,
      lastRightContent: null
    }

    // 小文件（< 5MB）：优先使用缓存
    if (!isLargeFile) {
      try {
        const startTime = performance.now()
        
        // 尝试使用增量 diff
        const result = await computeSmartDiff(
          left.content,
          right.content,
          options,
          sessionState.lastResult,
          sessionState.lastLeftContent,
          sessionState.lastRightContent
        )
        
        const computeTime = performance.now() - startTime
        console.log(`[DiffHandler] Computed in ${computeTime.toFixed(2)}ms (cached/incremental)`)
        
        // 更新会话状态
        sessionStates.set(sessionId, {
          lastResult: result,
          lastLeftContent: left.content,
          lastRightContent: right.content
        })
        
        return result
      } catch (error) {
        console.warn('[DiffHandler] Smart diff failed, falling back to cache:', error)
        
        // 回退到缓存版本
        const result = await computeDiffWithCache(
          left.content,
          right.content,
          options
        )
        
        // 更新会话状态
        sessionStates.set(sessionId, {
          lastResult: result,
          lastLeftContent: left.content,
          lastRightContent: right.content
        })
        
        return result
      }
    }

    // 大文件：使用 Worker 线程
    const onProgress: ProgressCallback = (progress) => {
      event.sender.send('diff:progress', {
        taskId: sessionId,
        stage: progress.stage,
        percent: progress.percent,
        message: progress.message,
        isLargeFile: true
      })
    }

    try {
      console.log('[DiffHandler] Large file detected, using Worker pool')
      const result = await computeDiffWithWorkerPool(
        left.content,
        right.content,
        {
          ignoreWhitespace: options.ignoreWhitespace,
          ignoreCase: options.ignoreCase,
          ignoreLineEndings: options.ignoreLineEndings,
          ignorePatterns: options.ignorePatterns,
          ignoreComments: options.ignoreComments ?? false,
          commentPrefixes: options.commentPrefixes ?? [],
          algorithm: options.algorithm,
          contextLines: options.contextLines
        },
        onProgress
      )

      // 发送完成通知
      event.sender.send('diff:complete', {
        taskId: sessionId,
        stats: result.stats,
        computeTime: Date.now() - result.computedAt
      })

      // 更新会话状态
      sessionStates.set(sessionId, {
        lastResult: result,
        lastLeftContent: left.content,
        lastRightContent: right.content
      })

      return result
    } catch (error) {
      // 发送错误通知
      event.sender.send('diff:error', {
        taskId: sessionId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  })

  // 计算三路差异
  ipcMain.handle('diff:computeThreeWay', async (
    _event: IpcMainInvokeEvent,
    base: FileInfo,
    left: FileInfo,
    right: FileInfo
  ): Promise<ThreeWayDiffResult> => {
    return await computeThreeWayDiff(base, left, right)
  })

  // 检查文件大小是否需要 Worker 处理
  ipcMain.handle('diff:checkFileSize', async (
    _event: IpcMainInvokeEvent,
    leftSize: number,
    rightSize: number
  ): Promise<{ isLargeFile: boolean; threshold: number; totalSize: number }> => {
    const totalSize = leftSize + rightSize
    return {
      isLargeFile: totalSize > LARGE_FILE_THRESHOLD,
      threshold: LARGE_FILE_THRESHOLD,
      totalSize
    }
  })
  
  // Week 12: 获取缓存统计
  ipcMain.handle('diff:cacheStats', async (): Promise<{ size: number; maxSize: number; ttl: number }> => {
    return getDiffCacheStats()
  })
  
  // Week 12: 清空 diff 缓存
  ipcMain.handle('diff:clearCache', async (): Promise<void> => {
    clearDiffCache()
    // 同时清空会话状态
    sessionStates.clear()
  })
  
  // Week 12: 清理指定会话的缓存
  ipcMain.handle('diff:clearSessionCache', async (
    _event: IpcMainInvokeEvent,
    leftPath: string,
    rightPath: string
  ): Promise<void> => {
    const sessionId = `${leftPath}-${rightPath}`
    sessionStates.delete(sessionId)
  })

  // 差异同步：将一侧的变更同步到另一侧
  ipcMain.handle('diff:sync', async (
    _event: IpcMainInvokeEvent,
    leftPath: string,
    rightPath: string,
    leftContent: string,
    rightContent: string,
    lines: DiffLine[],
    chunks: DiffChunk[],
    options: SyncDiffOptions
  ): Promise<SyncDiffResult> => {
    const result = syncDiff(leftContent, rightContent, lines, chunks, {
      direction: options.direction,
      chunkIds: options.chunkIds,
      autoSave: options.autoSave
    })

    // 如果开启了自动保存，写回文件
    if (options.autoSave) {
      const { writeFile } = await import('../fs')
      if (options.direction === 'left-to-right' && rightPath) {
        await writeFile(rightPath, result.rightContent)
      } else if (options.direction === 'right-to-left' && leftPath) {
        await writeFile(leftPath, result.leftContent)
      }
    }

    return result
  })
}
