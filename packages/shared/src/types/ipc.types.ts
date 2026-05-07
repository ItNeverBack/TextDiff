import type { DiffOptions, DiffResult, ThreeWayDiffResult, DiffChunk, DiffLine } from './diff.types'
import type { FileInfo, WatchEvent, DirectoryReadOptions } from './file.types'
import type { DiffSession, RecentFile, RecentDirectory, ListOptions } from './session.types'
import type { AppSettings } from './settings.types'
import type {
  DirectoryComparison,
  DirCompareOptions,
  DirectoryDiffEntry,
  SyncPlan,
  SyncResult,
  SyncProgress,
  SyncStrategy,
  SyncOperation,
  ReportFormat,
  ReportOptions
} from './directory.types'

/**
 * 差异同步方向
 */
export type SyncDirection = 'left-to-right' | 'right-to-left'

/**
 * 差异同步选项
 */
export interface SyncDiffOptions {
  /** 同步方向 */
  direction: SyncDirection
  /** 要同步的 chunk IDs，如果未指定则同步所有 */
  chunkIds?: string[]
  /** 是否自动保存 */
  autoSave?: boolean
}

/**
 * 差异同步结果
 */
export interface SyncDiffResult {
  /** 修改后的左侧内容 */
  leftContent: string
  /** 修改后的右侧内容 */
  rightContent: string
  /** 应用同步的 chunk IDs */
  appliedChunkIds: string[]
  /** 同步的统计信息 */
  stats: {
    insertedLines: number
    deletedLines: number
    modifiedLines: number
  }
}

/**
 * 历史记录条目
 */
export interface HistoryEntry {
  /** 唯一标识 */
  id: string
  /** 时间戳 */
  timestamp: number
  /** 操作类型 */
  type: 'sync' | 'edit'
  /** 操作描述 */
  description: string
  /** 操作前的状态 */
  before: {
    leftContent: string
    rightContent: string
  }
  /** 操作后的状态 */
  after: {
    leftContent: string
    rightContent: string
  }
}

export interface TextDiffAPI {
  openFile: (side: 'left' | 'right') => Promise<FileInfo | null>
  readFile: (path: string) => Promise<FileInfo>
  writeFile: (path: string, content: string) => Promise<void>
  watchFile: (path: string, callback: (event: WatchEvent) => void) => () => void
  computeDiff: (left: FileInfo, right: FileInfo, options: DiffOptions) => Promise<DiffResult>
  computeThreeWayDiff: (base: FileInfo, left: FileInfo, right: FileInfo) => Promise<ThreeWayDiffResult>
  directory: {
    compare: (leftDir: string, rightDir: string, options?: Partial<DirCompareOptions>) => Promise<DirectoryComparison>
    cancel: (comparisonId: string) => Promise<boolean>
    getProgress: (comparisonId: string) => Promise<{
      exists: boolean
      startTime?: number
      elapsedTime?: number
    }>
    open: (side: 'left' | 'right') => Promise<string | null>
  }
  sync: {
    generatePlan: (entries: DirectoryDiffEntry[], strategy: SyncStrategy) => Promise<SyncPlan>
    generatePlanWithConfig: (entries: DirectoryDiffEntry[], config: {
      strategy: SyncStrategy
      includeEqual?: boolean
      includeLeftOnly?: boolean
      includeRightOnly?: boolean
      includeModified?: boolean
    }) => Promise<SyncPlan>
    validate: (plan: SyncPlan) => Promise<{ valid: boolean; operations: { operation: SyncOperation; warnings: string[] }[] }>
    analyze: (plan: SyncPlan) => Promise<{
      totalOperations: number
      copyCount: number
      deleteCount: number
      mergeCount: number
      ignoreCount: number
      estimatedTime: number
    }>
    execute: (plan: SyncPlan, options?: { strategy?: SyncStrategy; createBackup?: boolean; confirmOverwrite?: boolean; preservePermissions?: boolean }) => Promise<SyncResult>
    cancel: (syncId: string) => Promise<boolean>
    getProgress: (syncId: string) => Promise<{
      exists: boolean
      currentOperation?: SyncOperation | null
      elapsedTime?: number
    }>
  }
  report: {
    generate: (comparison: DirectoryComparison, options?: Partial<ReportOptions>) => Promise<string>
    save: (content: string, format: ReportFormat, defaultFileName?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
    generateAndSave: (comparison: DirectoryComparison, options?: Partial<ReportOptions>) => Promise<{ success: boolean; filePath?: string; error?: string }>
    preview: (comparison: DirectoryComparison, options?: Omit<Partial<ReportOptions>, 'format'>) => Promise<string>
  }
  saveSession: (session: DiffSession) => Promise<void>
  loadSession: (id: string) => Promise<DiffSession | null>
  listSessions: (options?: ListOptions) => Promise<DiffSession[]>
  deleteSession: (id: string) => Promise<void>
  getRecentFiles: (limit?: number) => Promise<RecentFile[]>
  addRecentFile: (path: string) => Promise<void>
  getRecentDirectories: (limit?: number) => Promise<RecentDirectory[]>
  addRecentDirectory: (path: string) => Promise<void>
  getSettings: () => Promise<AppSettings>
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>
  showSaveDialog: (options: SaveDialogOptions) => Promise<string | null>
  showOpenDialog: (options: OpenDialogOptions) => Promise<string[] | null>
  // 差异同步
  syncDiff: (leftPath: string, rightPath: string, leftContent: string, rightContent: string, lines: DiffLine[], chunks: DiffChunk[], options: SyncDiffOptions) => Promise<SyncDiffResult>
  // 同步进度监听
  onSyncProgress: (callback: (progress: SyncProgress & { syncId: string }) => void) => () => void
}

export interface SaveDialogOptions {
  title?: string
  defaultPath?: string
  filters?: DialogFileFilter[]
}

export interface OpenDialogOptions {
  title?: string
  defaultPath?: string
  filters?: DialogFileFilter[]
  properties?: ('openFile' | 'openDirectory' | 'multiSelections')[]
}

export interface DialogFileFilter {
  name: string
  extensions: string[]
}

/**
 * IPC 通信通道名称
 * 用于主进程和渲染进程之间的通信
 */
export type IPCChannel =
  // 文件操作
  | 'file:open'
  | 'file:openPair'
  | 'file:read'
  | 'file:write'
  | 'file:watch:start'
  | 'file:watch:stop'
  // 差异计算
  | 'diff:compute'
  | 'diff:computeThreeWay'
  | 'diff:checkFileSize'
  // 差异同步
  | 'diff:sync'
  // Week 12: 缓存管理
  | 'diff:cacheStats'
  | 'diff:clearCache'
  | 'diff:clearSessionCache'
  // 目录对比
  | 'directory:compare'
  | 'directory:compareSimple'
  | 'directory:cancel'
  | 'directory:open'
  | 'directory:getProgress'
  // 目录同步
  | 'sync:generatePlan'
  | 'sync:generatePlanWithConfig'
  | 'sync:validate'
  | 'sync:analyze'
  | 'sync:execute'
  | 'sync:cancel'
  | 'sync:getProgress'
  | 'sync:progress'
  // 报告导出
  | 'report:generate'
  | 'report:save'
  | 'report:generateAndSave'
  | 'report:preview'
  // 会话管理
  | 'session:save'
  | 'session:load'
  | 'session:list'
  | 'session:delete'
  // 最近文件
  | 'recentFiles:get'
  | 'recentFiles:add'
  // 最近目录
  | 'recentDirectories:get'
  | 'recentDirectories:add'
  // 设置
  | 'settings:get'
  | 'settings:update'
  // 对话框
  | 'dialog:save'
  | 'dialog:open'
  // Week 13: 语言设置
  | 'app:setLanguage'
