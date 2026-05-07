import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import type {
  TextDiffAPI,
  FileInfo,
  DiffOptions,
  DiffResult,
  ThreeWayDiffResult,
  DirectoryComparison,
  DirCompareOptions,
  DirectoryDiffEntry,
  DiffSession,
  RecentFile,
  RecentDirectory,
  AppSettings,
  SaveDialogOptions,
  OpenDialogOptions,
  WatchEvent,
  IPCChannel,
  Language,
  DiffLine,
  DiffChunk,
  SyncDiffOptions,
  SyncDiffResult,
  SyncPlan,
  SyncResult,
  SyncProgress,
  SyncStrategy,
  SyncOperation,
  ReportFormat,
  ReportOptions
} from '@shared/types'

/**
 * 类型安全的 IPC 调用辅助函数
 */
function invoke<T>(channel: IPCChannel, ...args: unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args) as Promise<T>
}

function send(channel: IPCChannel, ...args: unknown[]): void {
  ipcRenderer.send(channel, ...args)
}

/**
 * 大文件 diff 进度回调类型
 */
interface DiffProgress {
  taskId: string
  stage: 'preprocessing' | 'computing' | 'building' | 'complete'
  percent: number
  message?: string
  isLargeFile: boolean
}

interface DiffComplete {
  taskId: string
  stats: DiffResult['stats']
  computeTime: number
}

interface DiffError {
  taskId: string
  error: string
}

/**
 * 扩展的 TextDiffAPI 类型
 */
interface ExtendedTextDiffAPI extends TextDiffAPI {
  // 大文件 diff 进度监听
  onDiffProgress: (callback: (progress: DiffProgress) => void) => () => void
  onDiffComplete: (callback: (data: DiffComplete) => void) => () => void
  onDiffError: (callback: (error: DiffError) => void) => () => void
  // CLI 文件打开监听
  onCliOpenFiles: (callback: (files: { left?: string; right?: string }) => void) => () => void
  // 检查文件大小
  checkFileSize: (leftSize: number, rightSize: number) => Promise<{
    isLargeFile: boolean
    threshold: number
    totalSize: number
  }>
  // Week 12: 缓存管理
  getDiffCacheStats: () => Promise<{ size: number; maxSize: number; ttl: number }>
  clearDiffCache: () => Promise<void>
  clearSessionCache: (leftPath: string, rightPath: string) => Promise<void>
  // 语言切换
  setLanguage: (language: Language) => Promise<void>
  // 同步进度监听
  onSyncProgress: (callback: (progress: SyncProgress & { syncId: string }) => void) => () => void
}

const textDiffApi: ExtendedTextDiffAPI = {
  openFile: (side: 'left' | 'right') =>
    invoke<FileInfo | null>('file:open', side),

  readFile: (path: string) =>
    invoke<FileInfo>('file:read', path),

  writeFile: (path: string, content: string) =>
    invoke<void>('file:write', path, content),

  watchFile: (path: string, callback: (event: WatchEvent) => void) => {
    const channel = `file:watch:${path}`

    const handler = (_event: IpcRendererEvent, watchEvent: WatchEvent) => {
      callback(watchEvent)
    }

    ipcRenderer.on(channel, handler)

    send('file:watch:start', path)

    return () => {
      ipcRenderer.off(channel, handler)
      send('file:watch:stop', path)
    }
  },

  computeDiff: (left: FileInfo, right: FileInfo, options: DiffOptions) =>
    invoke<DiffResult>('diff:compute', left, right, options),

  computeThreeWayDiff: (base: FileInfo, left: FileInfo, right: FileInfo) =>
    invoke<ThreeWayDiffResult>('diff:computeThreeWay', base, left, right),

  directory: {
    compare: (leftDir: string, rightDir: string, options?: Partial<DirCompareOptions>) =>
      invoke<DirectoryComparison>('directory:compare', leftDir, rightDir, options),

    cancel: (comparisonId: string) =>
      invoke<boolean>('directory:cancel', comparisonId),

    getProgress: (comparisonId: string) =>
      invoke<{ exists: boolean; startTime?: number; elapsedTime?: number }>('directory:getProgress', comparisonId),

    open: (side: 'left' | 'right') =>
      invoke<string | null>('directory:open', side)
  },

  sync: {
    generatePlan: (entries: DirectoryDiffEntry[], strategy: SyncStrategy) =>
      invoke<SyncPlan>('sync:generatePlan', entries, strategy),

    generatePlanWithConfig: (entries: DirectoryDiffEntry[], config: {
      strategy: SyncStrategy
      includeEqual?: boolean
      includeLeftOnly?: boolean
      includeRightOnly?: boolean
      includeModified?: boolean
    }) =>
      invoke<SyncPlan>('sync:generatePlanWithConfig', entries, config),

    validate: (plan: SyncPlan) =>
      invoke<{ valid: boolean; operations: { operation: SyncOperation; warnings: string[] }[] }>('sync:validate', plan),

    analyze: (plan: SyncPlan) =>
      invoke<{
        totalOperations: number
        copyCount: number
        deleteCount: number
        mergeCount: number
        ignoreCount: number
        estimatedTime: number
      }>('sync:analyze', plan),

    execute: (plan: SyncPlan, options?: { strategy?: SyncStrategy; createBackup?: boolean; confirmOverwrite?: boolean }) =>
      invoke<SyncResult>('sync:execute', plan, options),

    cancel: (syncId: string) =>
      invoke<boolean>('sync:cancel', syncId),

    getProgress: (syncId: string) =>
      invoke<{ exists: boolean; currentOperation?: SyncOperation | null; elapsedTime?: number }>('sync:getProgress', syncId)
  },

  report: {
    generate: (comparison: DirectoryComparison, options?: Partial<ReportOptions>) =>
      invoke<string>('report:generate', comparison, options),

    save: (content: string, format: ReportFormat, defaultFileName?: string) =>
      invoke<{ success: boolean; filePath?: string; error?: string }>('report:save', content, format, defaultFileName),

    generateAndSave: (comparison: DirectoryComparison, options?: Partial<ReportOptions>) =>
      invoke<{ success: boolean; filePath?: string; error?: string }>('report:generateAndSave', comparison, options),

    preview: (comparison: DirectoryComparison, options?: Omit<Partial<ReportOptions>, 'format'>) =>
      invoke<string>('report:preview', comparison, options)
  },

  saveSession: (session: DiffSession) =>
    invoke<void>('session:save', session),

  loadSession: (id: string) =>
    invoke<DiffSession | null>('session:load', id),

  listSessions: (options) =>
    invoke<DiffSession[]>('session:list', options),

  deleteSession: (id: string) =>
    invoke<void>('session:delete', id),

  getRecentFiles: (limit?: number) =>
    invoke<RecentFile[]>('recentFiles:get', limit),

  addRecentFile: (path: string) =>
    invoke<void>('recentFiles:add', path),

  getRecentDirectories: (limit?: number) =>
    invoke<RecentDirectory[]>('recentDirectories:get', limit),

  addRecentDirectory: (path: string) =>
    invoke<void>('recentDirectories:add', path),

  getSettings: () =>
    invoke<AppSettings>('settings:get'),

  updateSettings: (settings: Partial<AppSettings>) =>
    invoke<void>('settings:update', settings),

  showSaveDialog: (options: SaveDialogOptions) =>
    invoke<string | null>('dialog:save', options),

  showOpenDialog: (options: OpenDialogOptions) =>
    invoke<string[] | null>('dialog:open', options),

  // 大文件 diff 进度监听
  onDiffProgress: (callback: (progress: DiffProgress) => void) => {
    const handler = (_event: IpcRendererEvent, progress: DiffProgress) => {
      callback(progress)
    }
    ipcRenderer.on('diff:progress', handler)
    return () => ipcRenderer.off('diff:progress', handler)
  },

  onDiffComplete: (callback: (data: DiffComplete) => void) => {
    const handler = (_event: IpcRendererEvent, data: DiffComplete) => {
      callback(data)
    }
    ipcRenderer.on('diff:complete', handler)
    return () => ipcRenderer.off('diff:complete', handler)
  },

  onDiffError: (callback: (error: DiffError) => void) => {
    const handler = (_event: IpcRendererEvent, error: DiffError) => {
      callback(error)
    }
    ipcRenderer.on('diff:error', handler)
    return () => ipcRenderer.off('diff:error', handler)
  },

  // 同步进度监听
  onSyncProgress: (callback: (progress: SyncProgress & { syncId: string }) => void) => {
    const handler = (_event: IpcRendererEvent, progress: SyncProgress & { syncId: string }) => {
      callback(progress)
    }
    ipcRenderer.on('sync:progress', handler)
    return () => ipcRenderer.off('sync:progress', handler)
  },

  // CLI 文件打开监听
  onCliOpenFiles: (callback: (files: { left?: string; right?: string }) => void) => {
    const handler = (_event: IpcRendererEvent, files: { left?: string; right?: string }) => {
      callback(files)
    }
    ipcRenderer.on('cli:open-files', handler)
    return () => ipcRenderer.off('cli:open-files', handler)
  },

  // 检查文件大小
  checkFileSize: (leftSize: number, rightSize: number) =>
    invoke<{ isLargeFile: boolean; threshold: number; totalSize: number }>('diff:checkFileSize', leftSize, rightSize),
  
  // Week 12: 缓存管理
  getDiffCacheStats: () =>
    invoke<{ size: number; maxSize: number; ttl: number }>('diff:cacheStats'),
  
  clearDiffCache: () =>
    invoke<void>('diff:clearCache'),
  
  clearSessionCache: (leftPath: string, rightPath: string) =>
    invoke<void>('diff:clearSessionCache', leftPath, rightPath),

  // 语言切换
  setLanguage: (language: Language) =>
    invoke<void>('app:setLanguage', language),

  // 差异同步
  syncDiff: (leftPath: string, rightPath: string, leftContent: string, rightContent: string, lines: DiffLine[], chunks: DiffChunk[], options: SyncDiffOptions) =>
    invoke<SyncDiffResult>('diff:sync', leftPath, rightPath, leftContent, rightContent, lines, chunks, options)
}

contextBridge.exposeInMainWorld('api', textDiffApi)

export { textDiffApi }
export type { ExtendedTextDiffAPI, DiffProgress, DiffComplete, DiffError }
