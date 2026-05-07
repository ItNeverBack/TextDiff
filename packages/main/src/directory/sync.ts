import * as fs from 'fs'
import * as path from 'path'
import type {
  DirectoryDiffEntry,
  SyncOperation,
  SyncPlan,
  SyncProgress,
  SyncResult,
  SyncStrategy
} from '@shared/types'
import { UndoManager, createUndoOperation, getUndoManager } from './undo'

/**
 * 同步配置选项
 */
export interface SyncOptions {
  strategy: SyncStrategy
  createBackup: boolean           // 是否创建备份
  confirmOverwrite: boolean       // 是否确认覆盖较新文件
  preservePermissions: boolean    // 是否保留权限
  skipEmptyDirs: boolean          // 是否跳过空目录
}

/**
 * 同步错误类型
 */
export class SyncError extends Error {
  constructor(
    message: string,
    public readonly operation: SyncOperation,
    public readonly code: string
  ) {
    super(message)
    this.name = 'SyncError'
  }
}

/**
 * 默认同步选项
 */
export const DEFAULT_SYNC_OPTIONS: SyncOptions = {
  strategy: 'bidirectional',
  createBackup: true,
  confirmOverwrite: false,
  preservePermissions: true,
  skipEmptyDirs: false
}

/**
 * 同步引擎类
 */
export class SyncEngine {
  private abortController: AbortController | null = null
  private currentOperation: SyncOperation | null = null
  private undoManager: UndoManager
  private leftRootPath: string | null = null
  private rightRootPath: string | null = null

  constructor() {
    this.undoManager = getUndoManager()
  }

  /**
   * 设置根目录路径
   * @param leftRoot 左侧根目录
   * @param rightRoot 右侧根目录
   */
  setRootPaths(leftRoot: string, rightRoot: string): void {
    this.leftRootPath = leftRoot
    this.rightRootPath = rightRoot
  }

  /**
   * 执行同步操作
   * @param plan 同步计划
   * @param options 同步选项
   * @param onProgress 进度回调
   * @returns 同步结果
   */
  async execute(
    plan: SyncPlan,
    options: Partial<SyncOptions> = {},
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult> {
    const mergedOptions = { ...DEFAULT_SYNC_OPTIONS, ...options }
    this.abortController = new AbortController()

    const results: SyncOperation[] = []
    const total = plan.operations.length

    try {
      for (let i = 0; i < plan.operations.length; i++) {
        // 检查是否被取消
        if (this.abortController.signal.aborted) {
          throw new Error('Sync operation was cancelled')
        }

        const operation = plan.operations[i]
        this.currentOperation = operation

        try {
          operation.status = 'in-progress'
          await this.executeOperation(operation, mergedOptions)
          operation.status = 'completed'
        } catch (error) {
          operation.status = 'failed'
          operation.error = error instanceof Error ? error.message : String(error)
        }

        results.push(operation)

        // 报告进度
        if (onProgress) {
          onProgress({
            completed: i + 1,
            total,
            current: operation,
            percentage: Math.round(((i + 1) / total) * 100)
          })
        }
      }

      return {
        operations: results,
        success: results.every(r => r.status === 'completed')
      }
    } finally {
      this.currentOperation = null
      this.abortController = null
    }
  }

  /**
    * 构建目标路径
    * 当 entry.leftPath 或 entry.rightPath 为 null 时使用
    */
  private buildTargetPath(entry: DirectoryDiffEntry, side: 'left' | 'right'): string {
    // 优先使用设置的根目录路径
    const targetRoot = side === 'left' ? this.leftRootPath : this.rightRootPath
    
    if (targetRoot) {
      // 使用根目录 + relativePath 构建完整路径
      return path.join(targetRoot, entry.relativePath)
    }
    
    // 如果没有设置根目录，尝试从另一侧的路径推断
    const sourcePath = side === 'left' ? entry.rightPath : entry.leftPath
    
    if (sourcePath) {
      // 使用源路径的父目录
      const parentDir = path.dirname(sourcePath)
      return path.join(parentDir, entry.name)
    }
    
    // 如果都无法确定，抛出错误
    throw new Error(`Cannot build target path for entry: ${entry.relativePath}. Both leftPath and rightPath are null, and no root paths are set.`)
  }

  /**
    * 执行单个同步操作
    */
  private async executeOperation(
    operation: SyncOperation,
    options: SyncOptions
  ): Promise<void> {
    const { entry, action } = operation

    // 检查是否应该跳过
    if (action === 'ignore') {
      return
    }

    // 检查是否为空目录
    if (options.skipEmptyDirs && entry.type === 'directory') {
      const isEmpty = await this.isEmptyDirectory(entry)
      if (isEmpty) return
    }

    let backupPath: string | undefined

    try {
      // 如果需要创建备份，先创建备份
      if (options.createBackup) {
        backupPath = await this.createBackupForOperation(operation, options)
      }

      // 执行具体操作
      switch (action) {
        case 'copy-left-to-right': {
          // 对于 left-only 文件，rightPath 为 null，需要根据 relativePath 构建目标路径
          const targetPath = entry.rightPath || this.buildTargetPath(entry, 'right')
          await this.copyEntry(entry.leftPath!, targetPath, 'right', options)
          break
        }
        case 'copy-right-to-left': {
          // 对于 right-only 文件，leftPath 为 null，需要根据 relativePath 构建目标路径
          const targetPath = entry.leftPath || this.buildTargetPath(entry, 'left')
          await this.copyEntry(entry.rightPath!, targetPath, 'left', options)
          break
        }
        case 'delete-left':
          await this.deleteEntry(entry.leftPath!, options)
          break
        case 'delete-right':
          await this.deleteEntry(entry.rightPath!, options)
          break
        case 'merge':
          await this.mergeEntries(entry, options)
          break
        default:
          throw new SyncError(`Unknown sync action: ${action}`, operation, 'UNKNOWN_ACTION')
      }

      // 注册撤销操作
      await this.registerUndoOperation(operation, backupPath)

    } catch (error) {
      // 如果操作失败，清理备份文件
      if (backupPath) {
        try {
          await fs.promises.rm(backupPath, { recursive: true, force: true })
        } catch {
          // 忽略清理错误
        }
      }
      throw error
    }
  }

  /**
   * 为操作创建备份
   */
  private async createBackupForOperation(
    operation: SyncOperation,
    _options: SyncOptions
  ): Promise<string | undefined> {
    const { entry, action } = operation
    let targetPath: string | null = null

    // 确定需要备份的目标路径
    switch (action) {
      case 'copy-left-to-right':
        // 备份右侧将被覆盖的文件（仅当右侧文件存在时）
        if (entry.rightPath) {
          targetPath = entry.rightPath
        }
        break
      case 'copy-right-to-left':
        // 备份左侧将被覆盖的文件（仅当左侧文件存在时）
        if (entry.leftPath) {
          targetPath = entry.leftPath
        }
        break
      case 'delete-left':
        targetPath = entry.leftPath
        break
      case 'delete-right':
        targetPath = entry.rightPath
        break
      case 'merge':
        // 合并操作需要备份两边（使用右侧路径，如果不存在则使用左侧）
        targetPath = entry.rightPath || entry.leftPath
        break
    }

    if (!targetPath) {
      return undefined
    }

    // 检查目标文件是否存在
    const exists = await this.fileExists(targetPath)
    if (!exists) {
      return undefined
    }

    // 创建备份
    const backupPath = `${targetPath}.backup-${Date.now()}`
    const stats = await fs.promises.stat(targetPath)

    if (stats.isDirectory()) {
      await this.copyDirectory(targetPath, backupPath, 'left', {
        ...DEFAULT_SYNC_OPTIONS,
        createBackup: false
      })
    } else {
      await fs.promises.copyFile(targetPath, backupPath)
    }

    return backupPath
  }

  /**
   * 复制条目（文件或目录）
   */
  private async copyEntry(
    sourcePath: string,
    targetPath: string,
    side: 'left' | 'right',
    options: SyncOptions
  ): Promise<void> {
    const stats = await fs.promises.stat(sourcePath)

    if (stats.isDirectory()) {
      await this.copyDirectory(sourcePath, targetPath, side, options)
    } else {
      await this.copyFile(sourcePath, targetPath, side, options)
    }
  }

  /**
   * 复制文件
   */
  private async copyFile(
    sourcePath: string,
    targetPath: string,
    side: 'left' | 'right',
    options: SyncOptions
  ): Promise<void> {
    // 使用 side 参数来记录日志或进行其他操作
    const _direction = side
    // 确保目标目录存在
    const targetDir = path.dirname(targetPath)
    await this.ensureDirectoryExists(targetDir)

    // 如果需要备份且目标文件存在
    if (options.createBackup && await this.fileExists(targetPath)) {
      await this.createBackup(targetPath)
    }

    // 检查是否需要确认覆盖
    if (options.confirmOverwrite && await this.fileExists(targetPath)) {
      const sourceStat = await fs.promises.stat(sourcePath)
      const targetStat = await fs.promises.stat(targetPath)

      if (targetStat.mtime > sourceStat.mtime) {
        throw new Error(`Target file is newer: ${targetPath}`)
      }
    }

    // 复制文件
    await fs.promises.copyFile(sourcePath, targetPath)

    // 保留权限
    if (options.preservePermissions) {
      const sourceStat = await fs.promises.stat(sourcePath)
      await fs.promises.chmod(targetPath, sourceStat.mode)
    }
  }

  /**
   * 复制目录
   */
  private async copyDirectory(
    sourcePath: string,
    targetPath: string,
    _side: 'left' | 'right',
    options: SyncOptions
  ): Promise<void> {
    // 创建目标目录
    await this.ensureDirectoryExists(targetPath)

    // 复制权限
    if (options.preservePermissions) {
      const sourceStat = await fs.promises.stat(sourcePath)
      await fs.promises.chmod(targetPath, sourceStat.mode)
    }

    // 递归复制子项
    const entries = await fs.promises.readdir(sourcePath, { withFileTypes: true })

    for (const entry of entries) {
      const sourceChildPath = path.join(sourcePath, entry.name)
      const targetChildPath = path.join(targetPath, entry.name)

      if (entry.isDirectory()) {
        await this.copyDirectory(sourceChildPath, targetChildPath, _side, options)
      } else {
        await this.copyFile(sourceChildPath, targetChildPath, _side, options)
      }
    }
  }

  /**
   * 删除条目
   */
  private async deleteEntry(targetPath: string, options: SyncOptions): Promise<void> {
    // 如果需要备份
    if (options.createBackup) {
      await this.createBackup(targetPath)
    }

    const stats = await fs.promises.stat(targetPath)

    if (stats.isDirectory()) {
      await fs.promises.rm(targetPath, { recursive: true, force: true })
    } else {
      await fs.promises.unlink(targetPath)
    }
  }

  /**
   * 合并条目（简单实现：保留较新的）
   */
  private async mergeEntries(
    entry: DirectoryDiffEntry,
    options: SyncOptions
  ): Promise<void> {
    if (!entry.leftPath || !entry.rightPath) {
      throw new Error('Cannot merge entries without both paths')
    }

    const leftStat = await fs.promises.stat(entry.leftPath)
    const rightStat = await fs.promises.stat(entry.rightPath)

    // 保留较新的文件
    if (leftStat.mtime > rightStat.mtime) {
      await this.copyEntry(entry.leftPath, entry.rightPath, 'right', options)
    } else {
      await this.copyEntry(entry.rightPath, entry.leftPath, 'left', options)
    }
  }

  /**
   * 创建备份
   */
  private async createBackup(filePath: string): Promise<void> {
    const backupPath = `${filePath}.backup-${Date.now()}`
    const stats = await fs.promises.stat(filePath)

    if (stats.isDirectory()) {
      await this.copyDirectory(filePath, backupPath, 'left', {
        ...DEFAULT_SYNC_OPTIONS,
        createBackup: false
      })
    } else {
      await fs.promises.copyFile(filePath, backupPath)
    }
  }

  /**
   * 确保目录存在
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true })
    } catch (error) {
      // 如果目录已存在，忽略错误
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error
      }
    }
  }

  /**
   * 检查文件是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * 检查是否为空目录
   */
  private async isEmptyDirectory(entry: DirectoryDiffEntry): Promise<boolean> {
    if (entry.type !== 'directory') return false

    const pathToCheck = entry.leftPath || entry.rightPath
    if (!pathToCheck) return true

    try {
      const entries = await fs.promises.readdir(pathToCheck)
      return entries.length === 0
    } catch {
      return true
    }
  }

  /**
   * 取消同步操作
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
  }

  /**
   * 获取当前操作
   */
  getCurrentOperation(): SyncOperation | null {
    return this.currentOperation
  }

  /**
   * 注册撤销操作
   */
  async registerUndoOperation(operation: SyncOperation, backupPath?: string): Promise<void> {
    try {
      const undoOp = await createUndoOperation(operation, backupPath)
      this.undoManager.add(undoOp)
    } catch (error) {
      console.warn('Failed to create undo operation:', error)
    }
  }

  /**
   * 撤销上一个操作
   */
  async undo(): Promise<{ success: boolean; error?: string }> {
    return this.undoManager.undo()
  }

  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    return this.undoManager.canUndo()
  }

  /**
   * 获取撤销历史
   */
  getUndoHistory() {
    return this.undoManager.getUndoableOperations()
  }

  /**
   * 清空撤销历史
   */
  clearUndoHistory(): void {
    this.undoManager.clear()
  }
}

/**
 * 创建同步引擎实例
 */
export function createSyncEngine(): SyncEngine {
  return new SyncEngine()
}

/**
 * 执行同步（便捷函数）
 * @param plan 同步计划
 * @param options 同步选项
 * @param onProgress 进度回调
 * @param rootPaths 可选的根目录路径 { left, right }
 * @returns 同步结果
 */
export async function executeSync(
  plan: SyncPlan,
  options?: Partial<SyncOptions>,
  onProgress?: (progress: SyncProgress) => void,
  rootPaths?: { left: string; right: string }
): Promise<SyncResult> {
  const engine = createSyncEngine()
  if (rootPaths) {
    engine.setRootPaths(rootPaths.left, rootPaths.right)
  }
  return engine.execute(plan, options, onProgress)
}

/**
 * 验证同步操作
 * 检查是否有权限问题或其他潜在问题
 */
export async function validateSyncOperation(
  operation: SyncOperation
): Promise<{ valid: boolean; warnings: string[] }> {
  const warnings: string[] = []

  const { entry, action } = operation

  // 检查路径是否存在
  if (action.includes('left') && entry.leftPath) {
    const exists = await fs.promises.access(entry.leftPath)
      .then(() => true)
      .catch(() => false)
    if (!exists && action.startsWith('copy')) {
      warnings.push(`Source path does not exist: ${entry.leftPath}`)
    }
  }

  if (action.includes('right') && entry.rightPath) {
    const exists = await fs.promises.access(entry.rightPath)
      .then(() => true)
      .catch(() => false)
    if (!exists && action.startsWith('copy')) {
      warnings.push(`Source path does not exist: ${entry.rightPath}`)
    }
  }

  // 检查删除操作
  if (action.includes('delete')) {
    warnings.push(`This operation will delete: ${entry.name}`)
  }

  // 检查覆盖
  if (action.startsWith('copy')) {
    const targetPath = action === 'copy-left-to-right' ? entry.rightPath : entry.leftPath
    if (targetPath) {
      const exists = await fs.promises.access(targetPath)
        .then(() => true)
        .catch(() => false)
      if (exists) {
        warnings.push(`This will overwrite existing file: ${entry.name}`)
      }
    }
  }

  return { valid: warnings.length === 0 || !warnings.some(w => w.includes('does not exist')), warnings }
}

/**
 * 批量验证同步计划
 */
export async function validateSyncPlan(plan: SyncPlan): Promise<{
  valid: boolean
  operations: { operation: SyncOperation; warnings: string[] }[]
}> {
  const results = await Promise.all(
    plan.operations.map(async (operation) => {
      const validation = await validateSyncOperation(operation)
      return { operation, warnings: validation.warnings }
    })
  )

  const valid = results.every(r => r.warnings.length === 0 || !r.warnings.some(w => w.includes('does not exist')))

  return { valid, operations: results }
}
