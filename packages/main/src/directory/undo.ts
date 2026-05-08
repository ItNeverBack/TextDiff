import * as fs from 'fs'
import * as path from 'path'
import type { SyncOperation } from '@shared/types'

/**
 * 撤销操作类型
 */
export interface UndoOperation {
  id: string
  timestamp: number
  originalOperation: SyncOperation
  undoAction: () => Promise<void>
  description: string
}

/**
 * 撤销管理器
 */
export class UndoManager {
  private operations: UndoOperation[] = []
  private maxSize: number

  constructor(maxSize = 50) {
    this.maxSize = maxSize
  }

  /**
   * 添加撤销操作
   */
  add(operation: UndoOperation): void {
    this.operations.push(operation)

    // 限制大小
    if (this.operations.length > this.maxSize) {
      this.operations.shift()
    }
  }

  /**
   * 执行撤销
   */
  async undo(): Promise<{ success: boolean; operation?: UndoOperation; error?: string }> {
    if (this.operations.length === 0) {
      return { success: false, error: '没有可撤销的操作' }
    }

    const operation = this.operations.pop()!

    try {
      await operation.undoAction()
      return { success: true, operation }
    } catch (error) {
      // 放回操作列表
      this.operations.push(operation)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 获取可撤销的操作列表
   */
  getUndoableOperations(): UndoOperation[] {
    return [...this.operations].reverse()
  }

  /**
   * 检查是否有可撤销的操作
   */
  canUndo(): boolean {
    return this.operations.length > 0
  }

  /**
   * 清空撤销历史
   */
  clear(): void {
    this.operations = []
  }

  /**
   * 获取撤销历史数量
   */
  getHistorySize(): number {
    return this.operations.length
  }
}

/**
 * 创建撤销操作
 */
export async function createUndoOperation(
  operation: SyncOperation,
  backupPath?: string
): Promise<UndoOperation> {
  const { action } = operation
  const id = `undo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  switch (action) {
    case 'copy-left-to-right':
      return createCopyUndoOperation(id, operation, 'right', backupPath)

    case 'copy-right-to-left':
      return createCopyUndoOperation(id, operation, 'left', backupPath)

    case 'delete-left':
      return createDeleteUndoOperation(id, operation, 'left', backupPath)

    case 'delete-right':
      return createDeleteUndoOperation(id, operation, 'right', backupPath)

    case 'merge':
      return createMergeUndoOperation(id, operation, backupPath)

    default:
      throw new Error(`Unsupported action for undo: ${action}`)
  }
}

/**
 * 创建复制操作的撤销
 */
async function createCopyUndoOperation(
  id: string,
  operation: SyncOperation,
  targetSide: 'left' | 'right',
  _backupPath?: string
): Promise<UndoOperation> {
  const { entry } = operation
  const targetPath = targetSide === 'left' ? entry.leftPath : entry.rightPath

  return {
    id,
    timestamp: Date.now(),
    originalOperation: operation,
    undoAction: async () => {
      if (targetPath) {
        // 删除复制过去的文件
        await fs.promises.rm(targetPath, { recursive: true, force: true })
      }
    },
    description: `撤销复制: ${entry.name}`
  }
}

/**
 * 创建删除操作的撤销
 */
async function createDeleteUndoOperation(
  id: string,
  operation: SyncOperation,
  targetSide: 'left' | 'right',
  backupPath?: string
): Promise<UndoOperation> {
  const { entry } = operation
  const sourcePath = targetSide === 'left' ? entry.leftPath : entry.rightPath

  if (!backupPath || !sourcePath) {
    throw new Error('Cannot create undo for delete without backup')
  }

  return {
    id,
    timestamp: Date.now(),
    originalOperation: operation,
    undoAction: async () => {
      // 从备份恢复
      const stats = await fs.promises.stat(backupPath)

      if (stats.isDirectory()) {
        await copyDirectory(backupPath, sourcePath)
      } else {
        await fs.promises.mkdir(path.dirname(sourcePath), { recursive: true })
        await fs.promises.copyFile(backupPath, sourcePath)
      }
    },
    description: `撤销删除: ${entry.name}`
  }
}

/**
 * 创建合并操作的撤销
 */
async function createMergeUndoOperation(
  id: string,
  operation: SyncOperation,
  backupPath?: string
): Promise<UndoOperation> {
  const { entry } = operation

  // 合并操作需要备份两边的文件
  return {
    id,
    timestamp: Date.now(),
    originalOperation: operation,
    undoAction: async () => {
      // 从备份恢复两边
      if (backupPath && entry.leftPath) {
        const stats = await fs.promises.stat(backupPath)
        if (stats.isDirectory()) {
          await fs.promises.rm(entry.leftPath, { recursive: true, force: true })
          await copyDirectory(backupPath, entry.leftPath)
        } else {
          await fs.promises.copyFile(backupPath, entry.leftPath)
        }
      }
    },
    description: `撤销合并: ${entry.name}`
  }
}

/**
 * 复制目录辅助函数
 */
async function copyDirectory(source: string, target: string): Promise<void> {
  await fs.promises.mkdir(target, { recursive: true })
  const entries = await fs.promises.readdir(source, { withFileTypes: true })

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name)
    const targetPath = path.join(target, entry.name)

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath)
    } else {
      await fs.promises.copyFile(sourcePath, targetPath)
    }
  }
}

/**
 * 同步撤销管理器单例
 */
let globalUndoManager: UndoManager | null = null

export function getUndoManager(): UndoManager {
  if (!globalUndoManager) {
    globalUndoManager = new UndoManager()
  }
  return globalUndoManager
}

/**
 * 重置撤销管理器
 */
export function resetUndoManager(): void {
  globalUndoManager = null
}
