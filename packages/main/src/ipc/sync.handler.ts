import { ipcMain } from 'electron'
import type {
  DirectoryDiffEntry,
  SyncPlan,
  SyncResult,
  SyncProgress,
  SyncStrategy,
  SyncOperation
} from '@shared/types'
import {
  SyncEngine,
  SyncOptions,
  validateSyncPlan
} from '../directory/sync'
import {
  generateSyncPlan,
  generateSyncPlanByStrategy,
  analyzeSyncPlan
} from '../directory/sync-plan'

/**
 * 活跃的同步会话
 */
const activeSyncs = new Map<string, {
  engine: SyncEngine
  startTime: number
}>()

/**
 * 生成同步会话ID
 */
function generateSyncId(): string {
  return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 同步 IPC Handlers
 *
 * 目录同步功能：
 * - 生成同步计划
 * - 执行同步操作
 * - 验证同步计划
 * - 取消同步
 */

export function registerSyncHandlers(): void {
  // 生成同步计划
  ipcMain.handle('sync:generatePlan', async (
    _event,
    entries: DirectoryDiffEntry[],
    strategy: SyncStrategy
  ): Promise<SyncPlan> => {
    return generateSyncPlanByStrategy(entries, strategy)
  })

  // 使用自定义配置生成同步计划
  ipcMain.handle('sync:generatePlanWithConfig', async (
    _event,
    entries: DirectoryDiffEntry[],
    config: {
      strategy: SyncStrategy
      includeEqual?: boolean
      includeLeftOnly?: boolean
      includeRightOnly?: boolean
      includeModified?: boolean
    }
  ): Promise<SyncPlan> => {
    return generateSyncPlan(entries, {
      strategy: config.strategy,
      includeEqual: config.includeEqual ?? false,
      includeLeftOnly: config.includeLeftOnly ?? true,
      includeRightOnly: config.includeRightOnly ?? true,
      includeModified: config.includeModified ?? true
    })
  })

  // 验证同步计划
  ipcMain.handle('sync:validate', async (
    _event,
    plan: SyncPlan
  ): Promise<{ valid: boolean; operations: { operation: SyncOperation; warnings: string[] }[] }> => {
    return validateSyncPlan(plan)
  })

  // 分析同步计划
  ipcMain.handle('sync:analyze', async (
    _event,
    plan: SyncPlan
  ): Promise<{
    totalOperations: number
    copyCount: number
    deleteCount: number
    mergeCount: number
    ignoreCount: number
    estimatedTime: number
  }> => {
    return analyzeSyncPlan(plan)
  })

  // 执行同步
  ipcMain.handle('sync:execute', async (
    event,
    plan: SyncPlan,
    options?: Partial<SyncOptions>
  ): Promise<SyncResult> => {
    const syncId = generateSyncId()
    const engine = new SyncEngine()

    // 记录活跃会话
    activeSyncs.set(syncId, {
      engine,
      startTime: Date.now()
    })

    try {
      const result = await engine.execute(
        plan,
        options,
        (progress: SyncProgress) => {
          // 发送进度更新到渲染进程
          event.sender.send('sync:progress', { syncId, ...progress })
        }
      )

      return result
    } finally {
      // 清理会话
      activeSyncs.delete(syncId)
    }
  })

  // 取消同步
  ipcMain.handle('sync:cancel', async (
    _event,
    syncId: string
  ): Promise<boolean> => {
    const session = activeSyncs.get(syncId)
    if (session) {
      session.engine.cancel()
      activeSyncs.delete(syncId)
      return true
    }
    return false
  })

  // 获取同步进度
  ipcMain.handle('sync:getProgress', async (
    _event,
    syncId: string
  ): Promise<{
    exists: boolean
    currentOperation?: SyncOperation | null
    elapsedTime?: number
  }> => {
    const session = activeSyncs.get(syncId)
    if (!session) {
      return { exists: false }
    }

    return {
      exists: true,
      currentOperation: session.engine.getCurrentOperation(),
      elapsedTime: Date.now() - session.startTime
    }
  })

  // 检查是否可以撤销
  ipcMain.handle('sync:canUndo', async (
    _event,
    syncId: string
  ): Promise<{ canUndo: boolean; historySize: number }> => {
    const session = activeSyncs.get(syncId)
    if (!session) {
      return { canUndo: false, historySize: 0 }
    }

    return {
      canUndo: session.engine.canUndo(),
      historySize: session.engine.getUndoHistory().length
    }
  })

  // 执行撤销
  ipcMain.handle('sync:undo', async (
    _event,
    syncId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const session = activeSyncs.get(syncId)
    if (!session) {
      return { success: false, error: 'Sync session not found' }
    }

    return session.engine.undo()
  })

  // 获取撤销历史
  ipcMain.handle('sync:getUndoHistory', async (
    _event,
    syncId: string
  ): Promise<{ exists: boolean; history?: { id: string; description: string; timestamp: number }[] }> => {
    const session = activeSyncs.get(syncId)
    if (!session) {
      return { exists: false }
    }

    const history = session.engine.getUndoHistory().map(op => ({
      id: op.id,
      description: op.description,
      timestamp: op.timestamp
    }))

    return { exists: true, history }
  })

  // 清空撤销历史
  ipcMain.handle('sync:clearUndoHistory', async (
    _event,
    syncId: string
  ): Promise<{ success: boolean }> => {
    const session = activeSyncs.get(syncId)
    if (!session) {
      return { success: false }
    }

    session.engine.clearUndoHistory()
    return { success: true }
  })
}
