/**
 * 目录对比相关类型定义
 * Directory Comparison Types
 */

// ============================================
// 差异状态枚举
// ============================================
export type DiffStatus =
  | 'equal'           // 完全相同
  | 'modified'        // 内容修改
  | 'left-only'       // 仅左侧存在
  | 'right-only'      // 仅右侧存在
  | 'type-changed'    // 类型变更(文件↔目录)
  | 'permission-changed'; // 仅权限变更

// ============================================
// 详细状态说明
// ============================================
export interface StatusDetail {
  code: DiffStatus;
  label: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
}

// ============================================
// 文件元数据
// ============================================
export interface FileMetadata {
  size: number;
  modifiedTime: Date;
  createdTime: Date;
  hash?: string;                       // 文件内容哈希
  permissions: string;                 // 权限模式
}

// ============================================
// 目录信息
// ============================================
export interface DirectoryInfo {
  path: string;                        // 绝对路径
  name: string;                        // 目录名
  totalFiles: number;                  // 总文件数
  totalSize: number;                   // 总大小(字节)
  lastModified: Date;                  // 最后修改时间
}

// ============================================
// 目录差异条目
// ============================================
export interface DirectoryDiffEntry {
  id: string;                          // 唯一标识
  relativePath: string;                // 相对路径
  name: string;                        // 文件名
  type: 'file' | 'directory';          // 类型

  // 状态
  status: DiffStatus;
  statusDetail?: StatusDetail;         // 详细状态说明

  // 路径信息
  leftPath: string | null;
  rightPath: string | null;

  // 文件元数据
  leftMetadata?: FileMetadata;
  rightMetadata?: FileMetadata;

  // 树形结构
  children?: DirectoryDiffEntry[];
  parentId?: string;
  depth: number;                       // 层级深度

  // UI状态 (客户端)
  isExpanded?: boolean;
  isSelected?: boolean;
  isVisible?: boolean;                 // 过滤后可见性
}

// ============================================
// 对比选项
// ============================================
export type CompareMode = 'name' | 'size' | 'content' | 'full';

export interface ContentCompareOptions {
  algorithm: 'myers' | 'patience' | 'histogram';
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  ignoreLineEndings: boolean;
  maxFileSize: number;                 // 超过此大小跳过内容对比
}

export interface DirCompareOptions {
  // 对比模式
  compareMode: CompareMode;

  // 内容对比选项 (当compareMode为content/full时)
  contentOptions?: ContentCompareOptions;

  // 过滤器
  filters: DirectoryFilter[];

  // 递归选项
  recursive: boolean;
  maxDepth?: number;                   // 最大递归深度

  // 性能选项
  useHash: boolean;                    // 使用哈希加速对比
  parallel: boolean;                   // 并行处理
  workerCount: number;                 // Worker线程数

  // 缓存选项
  useCache?: boolean;                  // 是否启用缓存
  useIncremental?: boolean;            // 是否启用增量扫描
}

// ============================================
// 过滤器定义
// ============================================
export type FilterType = 'extension' | 'glob' | 'regex' | 'size' | 'date';

export interface BaseFilter {
  id: string;
  type: FilterType;
  enabled: boolean;
  invert: boolean;                     // 反转匹配
}

export interface ExtensionFilter extends BaseFilter {
  type: 'extension';
  extensions: string[];                // ['.ts', '.js']
  caseSensitive: boolean;
}

export interface GlobFilter extends BaseFilter {
  type: 'glob';
  patterns: string[];                  // ['*.test.ts', 'node_modules/**']
}

export interface RegexFilter extends BaseFilter {
  type: 'regex';
  pattern: string;
  flags: string;
}

export interface SizeFilter extends BaseFilter {
  type: 'size';
  minSize?: number;
  maxSize?: number;
}

export interface DateFilter extends BaseFilter {
  type: 'date';
  modifiedAfter?: Date;
  modifiedBefore?: Date;
}

export type DirectoryFilter = ExtensionFilter | GlobFilter | RegexFilter | SizeFilter | DateFilter;

// ============================================
// 统计信息
// ============================================
export interface DirDiffStatistics {
  totalFiles: number;                  // 总文件数
  totalDirectories: number;            // 总目录数
  leftOnly: number;                    // 仅左侧数量
  rightOnly: number;                   // 仅右侧数量
  modified: number;                    // 修改数量
  equal: number;                       // 相同数量
  permissionChanged?: number;          // 权限变更数量（可选）
  totalSizeLeft: number;               // 左侧总大小
  totalSizeRight: number;              // 右侧总大小
  scannedAt: Date;                     // 扫描时间
  duration: number;                    // 耗时(ms)
}

// ============================================
// 目录对比结果
// ============================================
export interface DirectoryComparison {
  id: string;                          // 对比会话ID
  leftRoot: DirectoryInfo;             // 左侧目录信息
  rightRoot: DirectoryInfo;            // 右侧目录信息
  entries: DirectoryDiffEntry[];       // 差异条目列表
  statistics: DirDiffStatistics;       // 统计信息
  completedAt: Date;                   // 完成时间
  options: DirCompareOptions;          // 对比选项
}

// ============================================
// 对比进度
// ============================================
export interface ComparisonProgress {
  comparisonId: string;
  status: 'pending' | 'scanning' | 'comparing' | 'completed' | 'failed' | 'cancelled';
  currentPhase: string;
  totalFiles: number;
  processedFiles: number;
  percentage: number;
  message?: string;
}

// ============================================
// 同步相关类型
// ============================================
export type SyncAction =
  | 'copy-left-to-right'
  | 'copy-right-to-left'
  | 'delete-left'
  | 'delete-right'
  | 'merge'
  | 'ignore';

export interface SyncOperation {
  id: string;
  entry: DirectoryDiffEntry;
  action: SyncAction;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  error?: string;
}

export interface SyncPlan {
  operations: SyncOperation[];
  stats: {
    copyOperations: number;
    deleteOperations: number;
    totalBytes: number;
  };
  warnings: string[];
}

export interface SyncProgress {
  completed: number;
  total: number;
  current: SyncOperation;
  percentage: number;
}

export interface SyncResult {
  operations: SyncOperation[];
  success: boolean;
}

export type SyncStrategy = 'left-to-right' | 'right-to-left' | 'bidirectional' | 'custom';

// ============================================
// 报告相关类型
// ============================================
export type ReportFormat = 'html' | 'json' | 'csv' | 'xml';

export interface ReportOptions {
  format: ReportFormat;
  includeEqual: boolean;               // 包含相同文件
  includeContent: boolean;             // 包含内容差异
  maxContentLength?: number;           // 内容最大长度
  template?: string;                   // HTML模板
}

// ============================================
// 树形展开状态
// ============================================
export interface TreeExpandState {
  expandedPaths: Set<string>;
  selectedPath: string | null;
}

// ============================================
// 目录树节点 (内部使用)
// ============================================
export interface DirTreeNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: DirTreeNode[];
  metadata?: FileMetadata;
  relativePath: string;
}

// ============================================
// 虚拟滚动配置
// ============================================
export interface VirtualScrollConfig {
  itemHeight: number;                  // 每项高度
  overscan: number;                    // 额外渲染数量
  containerHeight: number;             // 容器高度
}

// ============================================
// 状态颜色映射
// ============================================
export const STATUS_COLORS: Record<DiffStatus, { color: string; bgColor: string; label: string }> = {
  'equal': { color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)', label: '相同' },
  'modified': { color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)', label: '修改' },
  'left-only': { color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)', label: '仅左侧' },
  'right-only': { color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)', label: '仅右侧' },
  'type-changed': { color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)', label: '类型变更' },
  'permission-changed': { color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.1)', label: '权限变更' }
};

// ============================================
// 默认对比选项
// ============================================
export const DEFAULT_DIR_COMPARE_OPTIONS: DirCompareOptions = {
  compareMode: 'content',
  filters: [],
  recursive: true,
  maxDepth: undefined,
  useHash: false,
  parallel: true,
  workerCount: 2,
  contentOptions: {
    algorithm: 'myers',
    ignoreWhitespace: false,
    ignoreCase: false,
    ignoreLineEndings: false,
    maxFileSize: 10 * 1024 * 1024 // 10MB
  }
};

// ============================================
// 状态详细说明映射
// ============================================
export const STATUS_DETAILS: Record<DiffStatus, StatusDetail> = {
  'equal': {
    code: 'equal',
    label: '相同',
    description: '文件内容完全相同',
    severity: 'info'
  },
  'modified': {
    code: 'modified',
    label: '已修改',
    description: '文件内容存在差异',
    severity: 'warning'
  },
  'left-only': {
    code: 'left-only',
    label: '仅左侧存在',
    description: '文件仅存在于左侧目录',
    severity: 'info'
  },
  'right-only': {
    code: 'right-only',
    label: '仅右侧存在',
    description: '文件仅存在于右侧目录',
    severity: 'info'
  },
  'type-changed': {
    code: 'type-changed',
    label: '类型变更',
    description: '文件类型发生变更(文件↔目录)',
    severity: 'error'
  },
  'permission-changed': {
    code: 'permission-changed',
    label: '权限变更',
    description: '仅文件权限发生变更',
    severity: 'warning'
  }
};
