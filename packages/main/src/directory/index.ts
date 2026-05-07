// 导出扫描器
export {
  scanDirectory,
  getFileMetadata,
  getDirMetadata,
  computeFileHash,
  computeFileHashes,
  buildPathIndex,
  flattenTree,
  type ScanResult
} from './scanner'

// 导出对比器
export {
  compareDirectories,
  mergeStatus,
  updateDirectoryStatus,
  type CompareResult
} from './comparator'

// 导出过滤器
export {
  applyFilters,
  matchGlob,
  shouldExcludePath,
  createDefaultFilters,
  createExtensionFilter,
  createGlobFilter,
  createRegexFilter,
  validateFilter,
  mergeFilters,
  DEFAULT_EXCLUDE_PATTERNS
} from './filter'

// 导出统计
export {
  computeStatistics,
  computeDiffStats,
  createDirectoryInfo,
  formatFileSize,
  formatDuration,
  generateStatsSummary,
  calculateProgress,
  getComparisonSummary,
  filterByStatus,
  computeDepthDistribution,
  computeTypeDistribution
} from './stats'

// 导出 Worker 池
export {
  WorkerPool,
  getScanWorkerPool,
  getHashWorkerPool,
  shutdownAllWorkerPools
} from './worker/pool'

// 导出 Worker 类型
export type {
  WorkerTask,
  WorkerTaskType,
  ScanTask,
  HashTask,
  CompareTask,
  WorkerMessage,
  WorkerPoolConfig,
  WorkerPoolStats,
  WorkerInfo
} from './worker/types'

// 导出缓存系统
export type {
  CacheEntry,
  DirectoryCache
} from './cache'
export {
  DirectoryCacheManager,
  getCacheManager,
  resetCacheManager,
  generateCacheKey,
  estimateEntrySize
} from './cache'

// 导出增量扫描
export {
  IncrementalScanner,
  incrementalScan,
  mergeWithCache
} from './incremental'

// 导出缓存管理器
export {
  CacheManager,
  getGlobalCacheManager,
  resetGlobalCacheManager,
  getCacheHealthReport
} from './cache-manager'

// 导出同步引擎
export type { SyncOptions } from './sync'
export {
  SyncEngine,
  SyncError,
  DEFAULT_SYNC_OPTIONS,
  createSyncEngine,
  executeSync,
  validateSyncOperation,
  validateSyncPlan
} from './sync'

// 导出同步计划生成器
export type { SyncPlanConfig } from './sync-plan'
export {
  SyncPlanGenerator,
  DEFAULT_SYNC_PLAN_CONFIG,
  generateSyncPlan,
  createCustomSyncPlan,
  generateSyncPlanByStrategy,
  generateLeftToRightPlan,
  generateRightToLeftPlan,
  generateBidirectionalPlan,
  analyzeSyncPlan,
  filterSyncOperations,
  mergeSyncPlans
} from './sync-plan'

// 导出报告生成器
export {
  ReportGenerator,
  DEFAULT_REPORT_OPTIONS,
  generateReport,
  generateHtmlReport,
  generateJsonReport,
  generateCsvReport,
  generateXmlReport
} from './report'

// 导出撤销管理器
export type { UndoOperation } from './undo'
export {
  UndoManager,
  createUndoOperation,
  getUndoManager,
  resetUndoManager
} from './undo'
