export type LineEnding = 'lf' | 'crlf' | 'mixed'

export interface FileInfo {
  path: string | null
  content: string
  encoding: string
  lineEnding: LineEnding
  size: number
  mtime: number | null
  language: string
}

export interface WatchEvent {
  type: 'change' | 'rename' | 'delete'
  path: string
}

/**
 * 文件过滤器类型
 */
export type FileFilterType = 'extension' | 'glob' | 'regex' | 'exclude'

/**
 * 文件过滤器配置
 */
export interface FileFilter {
  /** 过滤器类型 */
  type: FileFilterType
  /** 过滤器值（扩展名、glob模式、正则表达式、排除模式） */
  pattern: string
  /** 是否启用 */
  enabled: boolean
}

/**
 * 目录排除规则
 */
export interface DirectoryExcludeRule {
  /** 排除模式（支持通配符 * 和 ?） */
  pattern: string
  /** 是否递归应用到子目录 */
  recursive: boolean
  /** 是否启用 */
  enabled: boolean
}

export interface DirectoryReadOptions {
  recursive?: boolean
  filter?: {
    /** 文件扩展名过滤（如 ['.ts', '.tsx']） */
    extensions?: string[]
    /** 排除文件/目录模式（支持通配符 * 和 ?） */
    exclude?: string[]
    /** 高级过滤器列表 */
    filters?: FileFilter[]
    /** 目录排除规则 */
    excludeRules?: DirectoryExcludeRule[]
    /** 包含隐藏文件（以.开头的文件/目录） */
    includeHidden?: boolean
    /** 最小文件大小（字节） */
    minSize?: number
    /** 最大文件大小（字节） */
    maxSize?: number
  }
}

// DirectoryDiffEntry 已移至 directory.types.ts
