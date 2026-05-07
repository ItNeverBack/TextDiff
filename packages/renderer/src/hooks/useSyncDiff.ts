import { useCallback, useState } from 'react'
import type { DiffChunk, DiffLine, FileInfo, DiffResult, DiffStats } from '@shared/types'
import type { SyncDirection, SyncDiffResult } from '@shared/types/ipc.types'
import { api } from '@renderer/lib/api'
import { useHistoryStore, useTabStore } from '@renderer/stores'

export interface UseSyncDiffOptions {
  leftFile: FileInfo | null
  rightFile: FileInfo | null
  diffResult: DiffResult | null
  activeChunkIndex: number
  onSyncComplete?: (result: SyncDiffResult & { updatedDiffResult: DiffResult }) => void
  onSyncError?: (error: Error) => void
}

export interface UseSyncDiffReturn {
  /**
   * 同步单个 chunk
   * @param direction 同步方向
   * @param chunkId 要同步的 chunk ID，不传则同步当前选中的 chunk（默认第一个）
   */
  syncChunk: (direction: SyncDirection, chunkId?: string) => Promise<void>
  /**
   * 是否正在同步
   */
  isSyncing: boolean
  /**
   * 上次同步结果
   */
  lastResult: (SyncDiffResult & { updatedDiffResult: DiffResult }) | null
}

/**
 * 直接更新 diff 结果，移除已同步的 chunk
 * 避免重新计算 diff，提高性能
 */
function updateDiffResultAfterSync(
  diffResult: DiffResult,
  syncedChunkId: string,
  direction: SyncDirection
): DiffResult {
  const { lines, chunks } = diffResult

  // 找到被同步的 chunk
  const syncedChunkIndex = chunks.findIndex(c => c.id === syncedChunkId)
  if (syncedChunkIndex === -1) return diffResult

  const syncedChunk = chunks[syncedChunkIndex]

  // 1. 更新 lines：将该 chunk 中的 change 行改为 equal
  const newLines = lines.map((line, idx) => {
    if (idx >= syncedChunk.startIndex && idx <= syncedChunk.endIndex) {
      // 如果这个行是 change 行（在 changeIndices 中）
      if (syncedChunk.changeIndices.includes(idx)) {
        // 根据同步方向确定统一后的内容
        const unifiedContent = direction === 'left-to-right'
          ? line.leftContent
          : line.rightContent

        return {
          ...line,
          type: 'equal' as const,
          leftContent: unifiedContent,
          rightContent: unifiedContent
        }
      }
    }
    return line
  })

  // 2. 移除已同步的 chunk
  const newChunks = chunks.filter(c => c.id !== syncedChunkId)

  // 3. 剩余 chunk 的索引保持不变
  // 因为 chunk 的 startIndex/endIndex 是 diff lines 的索引，不是文件行号
  // 同步操作不会改变 diff lines 的数量，只是改变了行的 type
  const updatedChunks = newChunks
  
  // 4. 更新 stats
  // 重新计算统计信息
  const newStats = calculateStats(newLines, updatedChunks)
  
  return {
    lines: newLines,
    chunks: updatedChunks,
    stats: newStats,
    computedAt: Date.now()
  }
}

/**
 * 重新计算统计信息
 */
function calculateStats(lines: DiffLine[], chunks: DiffChunk[]): DiffStats {
  let insertedLines = 0
  let deletedLines = 0
  let modifiedLines = 0
  let equalLines = 0
  
  for (const line of lines) {
    switch (line.type) {
      case 'insert':
        insertedLines++
        break
      case 'delete':
        deletedLines++
        break
      case 'replace':
        modifiedLines++
        break
      case 'equal':
        equalLines++
        break
    }
  }
  
  return {
    totalLines: lines.length,
    equalLines,
    insertedLines,
    deletedLines,
    modifiedLines,
    chunkCount: chunks.length
  }
}

/**
 * 差异同步 Hook
 * 
 * 功能：
 * - 支持同步单个 chunk
 * - 同步后直接更新 diff 结果，避免重新计算
 * - 自动保存修改
 * - 添加历史记录以支持撤销
 */
export function useSyncDiff({
  leftFile,
  rightFile,
  diffResult,
  activeChunkIndex,
  onSyncComplete,
  onSyncError
}: UseSyncDiffOptions): UseSyncDiffReturn {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<(SyncDiffResult & { updatedDiffResult: DiffResult }) | null>(null)

  const { updateActiveTabContent } = useTabStore()
  const { addEntry } = useHistoryStore()

  const syncChunk = useCallback(async (
    direction: SyncDirection,
    chunkId?: string
  ) => {
    if (!leftFile || !rightFile || !diffResult || diffResult.chunks.length === 0) {
      return
    }

    // 确保路径不为 null
    if (!leftFile.path || !rightFile.path) {
      return
    }

    // 确定要同步的 chunk
    let targetChunkId = chunkId
    if (!targetChunkId) {
      // 如果没有指定 chunkId，使用当前选中的 chunk，或默认第一个
      const chunkIndex = activeChunkIndex >= 0 && activeChunkIndex < diffResult.chunks.length 
        ? activeChunkIndex 
        : 0
      targetChunkId = diffResult.chunks[chunkIndex]?.id
    }

    if (!targetChunkId) {
      return
    }

    const targetChunk = diffResult.chunks.find(c => c.id === targetChunkId)
    if (!targetChunk) {
      return
    }

    setIsSyncing(true)

    try {
      // 记录同步前的状态
      const beforeState = {
        leftContent: leftFile.content,
        rightContent: rightFile.content
      }

      // 调用主进程 API 进行同步
      const result = await api.syncDiff(
        leftFile.path,
        rightFile.path,
        leftFile.content,
        rightFile.content,
        diffResult.lines,
        diffResult.chunks,
        {
          direction,
          chunkIds: [targetChunkId],
          autoSave: true // 自动保存
        }
      )

      // 获取更新后的内容
      const newLeftContent = direction === 'right-to-left' ? result.leftContent : leftFile.content
      const newRightContent = direction === 'left-to-right' ? result.rightContent : rightFile.content

      // 更新前端状态
      if (direction === 'left-to-right') {
        updateActiveTabContent('right', result.rightContent)
      } else {
        updateActiveTabContent('left', result.leftContent)
      }

      // 直接更新 diff 结果，避免重新计算
      const updatedDiffResult = updateDiffResultAfterSync(diffResult, targetChunkId, direction)

      const finalResult = {
        ...result,
        updatedDiffResult
      }

      setLastResult(finalResult)

      // 添加到历史记录
      addEntry(
        'sync',
        direction === 'left-to-right' 
          ? `将左侧内容同步到右侧（${result.appliedChunkIds.length} 处差异）`
          : `将右侧内容同步到左侧（${result.appliedChunkIds.length} 处差异）`,
        beforeState,
        {
          leftContent: newLeftContent,
          rightContent: newRightContent
        }
      )

      onSyncComplete?.(finalResult)
    } catch (error) {
      onSyncError?.(error instanceof Error ? error : new Error(String(error)))
    } finally {
      setIsSyncing(false)
    }
  }, [leftFile, rightFile, diffResult, activeChunkIndex, updateActiveTabContent, addEntry, onSyncComplete, onSyncError])

  return {
    syncChunk,
    isSyncing,
    lastResult
  }
}
