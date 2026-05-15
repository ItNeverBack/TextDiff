import { ipcMain, dialog, BrowserWindow } from 'electron'
import * as path from 'path'
import type {
  DirectoryDiffEntry,
  DirectoryComparison,
  DirCompareOptions
} from '@shared/types'
import { DEFAULT_DIR_COMPARE_OPTIONS } from '@shared/types'
import {
  scanDirectory,
  compareDirectories,
  computeStatistics,
  applyFilters,
  createDirectoryInfo
} from '../directory'
import { compareDirectories as legacyCompareDirectories } from '../fs/directory'

/**
 * 活跃的对比会话
 */
const activeComparisons = new Map<string, {
  startTime: number
  cancelled: boolean
}>()

/**
 * 生成对比会话ID
 */
function generateComparisonId(): string {
  return `compare-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Directory IPC Handlers
 *
 * 目录对比功能：
 * - 支持两个目录的递归对比
 * - 支持文件过滤（扩展名、排除模式）
 * - 支持多种对比模式（名称/大小/内容）
 */

export function registerDirectoryHandlers(): void {
  // 对比两个目录（完整版 - 使用新的 directory 模块）
  ipcMain.handle('directory:compare', async (
    _event,
    leftDir: string,
    rightDir: string,
    options?: Partial<DirCompareOptions>
  ): Promise<DirectoryComparison> => {
    const comparisonId = generateComparisonId()
    const startTime = Date.now()

    // 记录活跃会话
    activeComparisons.set(comparisonId, { startTime, cancelled: false })

    try {
      // 合并选项与默认值
      const mergedOptions: DirCompareOptions = {
        ...DEFAULT_DIR_COMPARE_OPTIONS,
        ...options
      }

      // 1. 并行扫描两个目录
      const [leftResult, rightResult] = await Promise.all([
        scanDirectory(leftDir, mergedOptions),
        scanDirectory(rightDir, mergedOptions)
      ])

      // 检查是否已取消
      const session = activeComparisons.get(comparisonId)
      if (session?.cancelled) {
        throw new Error('Comparison cancelled')
      }

      // 2. 对比两个目录树
      const compareResult = await compareDirectories(
        leftResult.root,
        rightResult.root,
        mergedOptions
      )

      // 3. 应用过滤器
      const filteredEntries = applyFilters(compareResult.entries, mergedOptions.filters)

      // 4. 计算统计信息
      const leftInfo = createDirectoryInfo(
        leftDir,
        path.basename(leftDir),
        leftResult.totalFiles,
        leftResult.totalSize,
        leftResult.root.metadata?.modifiedTime || new Date()
      )

      const rightInfo = createDirectoryInfo(
        rightDir,
        path.basename(rightDir),
        rightResult.totalFiles,
        rightResult.totalSize,
        rightResult.root.metadata?.modifiedTime || new Date()
      )

      const statistics = computeStatistics(
        filteredEntries,
        leftInfo,
        rightInfo,
        startTime
      )

      // 5. 构建完整对比结果
      const comparison: DirectoryComparison = {
        id: comparisonId,
        leftRoot: leftInfo,
        rightRoot: rightInfo,
        entries: filteredEntries,
        statistics,
        completedAt: new Date(),
        options: mergedOptions
      }

      return comparison
    } finally {
      // 清理会话
      activeComparisons.delete(comparisonId)
    }
  })

  // 对比两个目录（简化版 - 向后兼容）
  ipcMain.handle('directory:compareSimple', async (
    _event,
    leftDir: string,
    rightDir: string,
    options?: { recursive?: boolean; extensions?: string[]; exclude?: string[] }
  ): Promise<DirectoryDiffEntry[]> => {
    return await legacyCompareDirectories(leftDir, rightDir, {
      recursive: options?.recursive ?? true,
      filter: {
        extensions: options?.extensions,
        exclude: options?.exclude
      }
    })
  })

  // 取消对比
  ipcMain.handle('directory:cancel', async (
    _event,
    comparisonId: string
  ): Promise<boolean> => {
    const session = activeComparisons.get(comparisonId)
    if (session) {
      session.cancelled = true
      return true
    }
    return false
  })

  // 记录上次选择目录的父目录，避免下次打开时默认进入上次选择的目录内部
  let lastDirectoryParent: string | undefined

  // 打开目录选择对话框
  ipcMain.handle('directory:open', async (event, side: 'left' | 'right'): Promise<string | null> => {
    const win = BrowserWindow.fromWebContents(event.sender)!

    // §修复 Linux 下对话框可能显示在主窗口下层的问题
    // 使用 moveTop() 而不是 focus()，避免触发 "窗口已就绪" 的系统通知
    if (process.platform === 'linux') {
      win.moveTop()
    }

    const result = await dialog.showOpenDialog(win, {
      title: side === 'left' ? '选择左侧目录' : '选择右侧目录',
      defaultPath: lastDirectoryParent,
      properties: ['openDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const selectedPath = result.filePaths[0]
    // 保存所选目录的父目录，下次打开时从父目录开始
    lastDirectoryParent = path.dirname(selectedPath)
    return selectedPath
  })

  // 获取对比进度（预留接口）
  ipcMain.handle('directory:getProgress', async (
    _event,
    comparisonId: string
  ): Promise<{
    exists: boolean
    startTime?: number
    elapsedTime?: number
  }> => {
    const session = activeComparisons.get(comparisonId)
    if (!session) {
      return { exists: false }
    }

    return {
      exists: true,
      startTime: session.startTime,
      elapsedTime: Date.now() - session.startTime
    }
  })
}
