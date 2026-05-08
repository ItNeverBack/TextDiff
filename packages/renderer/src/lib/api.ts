/**
 * Type-safe wrapper around window.api (TextDiffAPI exposed via contextBridge).
 * Use these functions instead of calling window.api directly.
 */
import type { DiffOptions, DiffResult, ThreeWayDiffResult, DiffLine, DiffChunk } from '@shared/types'
import type { FileInfo, DirectoryDiffEntry, WatchEvent } from '@shared/types'
import type { DiffSession, RecentFile, RecentDirectory, ListOptions } from '@shared/types'
import type { AppSettings, DirectoryComparison, DirCompareOptions, SyncPlan, SyncResult, SyncStrategy, SyncProgress, ReportOptions, SyncOperation } from '@shared/types'
import type { SaveDialogOptions, OpenDialogOptions, SyncDiffOptions, SyncDiffResult } from '@shared/types/ipc.types'

export const api = {
  // File operations
  openFile: (side: 'left' | 'right'): Promise<FileInfo | null> =>
    window.api.openFile(side),

  readFile: (path: string): Promise<FileInfo> =>
    window.api.readFile(path),

  writeFile: (path: string, content: string): Promise<void> =>
    window.api.writeFile(path, content),

  watchFile: (path: string, callback: (event: WatchEvent) => void): (() => void) =>
    window.api.watchFile(path, callback),

  // Diff operations
  computeDiff: (left: FileInfo, right: FileInfo, options: DiffOptions): Promise<DiffResult> =>
    window.api.computeDiff(left, right, options),

  computeThreeWayDiff: (base: FileInfo, left: FileInfo, right: FileInfo): Promise<ThreeWayDiffResult> =>
    window.api.computeThreeWayDiff(base, left, right),

  // Directory operations (legacy - use api.directory.compare for full comparison)
  compareDirectories: (leftDir: string, rightDir: string, options?: Partial<DirCompareOptions>): Promise<DirectoryDiffEntry[]> =>
    window.api.directory.compare(leftDir, rightDir, options).then(r => r.entries),

  // Session operations
  saveSession: (session: DiffSession): Promise<void> =>
    window.api.saveSession(session),

  loadSession: (id: string): Promise<DiffSession | null> =>
    window.api.loadSession(id),

  listSessions: (options?: ListOptions): Promise<DiffSession[]> =>
    window.api.listSessions(options),

  deleteSession: (id: string): Promise<void> =>
    window.api.deleteSession(id),

  // Recent files
  getRecentFiles: (limit?: number): Promise<RecentFile[]> =>
    window.api.getRecentFiles(limit),

  addRecentFile: (path: string): Promise<void> =>
    window.api.addRecentFile(path),

  getRecentDirectories: (limit?: number): Promise<RecentDirectory[]> =>
    window.api.getRecentDirectories(limit),

  addRecentDirectory: (path: string): Promise<void> =>
    window.api.addRecentDirectory(path),

  // Settings
  getSettings: (): Promise<AppSettings> =>
    window.api.getSettings(),

  updateSettings: (settings: Partial<AppSettings>): Promise<void> =>
    window.api.updateSettings(settings),

  // Dialogs
  showSaveDialog: (options: SaveDialogOptions): Promise<string | null> =>
    window.api.showSaveDialog(options),

  showOpenDialog: (options: OpenDialogOptions): Promise<string[] | null> =>
    window.api.showOpenDialog(options),
  
  // Week 12: Cache management
  getDiffCacheStats: (): Promise<{ size: number; maxSize: number; ttl: number }> =>
    window.api.getDiffCacheStats(),

  clearDiffCache: (): Promise<void> =>
    window.api.clearDiffCache(),

  clearSessionCache: (leftPath: string, rightPath: string): Promise<void> =>
    window.api.clearSessionCache(leftPath, rightPath),

  // Directory operations (extended)
  directory: {
    open: (side: 'left' | 'right'): Promise<string | null> =>
      window.api.directory.open(side),
    compare: (leftDir: string, rightDir: string, options?: Partial<DirCompareOptions>): Promise<DirectoryComparison> =>
      window.api.directory.compare(leftDir, rightDir, options),
    cancel: (comparisonId: string): Promise<boolean> =>
      window.api.directory.cancel(comparisonId),
    getProgress: (comparisonId: string): Promise<{ exists: boolean; startTime?: number; elapsedTime?: number }> =>
      window.api.directory.getProgress(comparisonId),
  },

  // Sync operations
  sync: {
    generatePlan: (entries: DirectoryDiffEntry[], strategy: SyncStrategy): Promise<SyncPlan> =>
      window.api.sync.generatePlan(entries, strategy),
    execute: (plan: SyncPlan, options?: { strategy?: SyncStrategy; createBackup?: boolean; confirmOverwrite?: boolean; preservePermissions?: boolean }): Promise<SyncResult> =>
      window.api.sync.execute(plan, options),
    cancel: (syncId: string): Promise<boolean> =>
      window.api.sync.cancel(syncId),
    getProgress: (syncId: string): Promise<{ exists: boolean; currentOperation?: SyncOperation | null; elapsedTime?: number }> =>
      window.api.sync.getProgress(syncId),
  },

  // Report operations
  report: {
    generateAndSave: (comparison: DirectoryComparison, options?: Partial<ReportOptions>): Promise<{ success: boolean; filePath?: string; error?: string }> =>
      window.api.report.generateAndSave(comparison, options),
  },

  // Sync progress listener
  onSyncProgress: (callback: (progress: SyncProgress & { syncId: string }) => void): (() => void) =>
    window.api.onSyncProgress(callback),

  // Diff sync operations
  syncDiff: (
    leftPath: string,
    rightPath: string,
    leftContent: string,
    rightContent: string,
    lines: DiffLine[],
    chunks: DiffChunk[],
    options: SyncDiffOptions
  ): Promise<SyncDiffResult> =>
    window.api.syncDiff(leftPath, rightPath, leftContent, rightContent, lines, chunks, options),
}
