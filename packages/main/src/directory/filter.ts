import * as path from 'path'
import type {
  DirectoryFilter,
  ExtensionFilter,
  GlobFilter,
  RegexFilter,
  SizeFilter,
  DateFilter,
  DirectoryDiffEntry,
  FileMetadata
} from '@shared/types'

/**
 * 默认排除规则
 */
export const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '.idea',
  '.vscode',
  'dist',
  'build',
  'out',
  'target',
  'bin',
  'obj',
  '__pycache__',
  '.next',
  '.nuxt',
  '.cache',
  '*.log',
  '*.tmp',
  '*.temp',
  '.DS_Store',
  'Thumbs.db'
]

/**
 * 应用过滤器到目录差异条目
 * @param entries 差异条目列表
 * @param filters 过滤器列表
 * @returns 过滤后的条目列表
 */
export function applyFilters(
  entries: DirectoryDiffEntry[],
  filters: DirectoryFilter[]
): DirectoryDiffEntry[] {
  if (!filters || filters.length === 0) {
    return entries
  }

  // 启用过滤的过滤器
  const activeFilters = filters.filter(f => f.enabled)
  if (activeFilters.length === 0) {
    return entries
  }

  // 递归过滤
  return entries.filter(entry => {
    // 检查是否通过所有过滤器
    const passes = passesFilters(entry, activeFilters)

    // 递归处理子目录
    if (entry.children && entry.children.length > 0) {
      entry.children = applyFilters(entry.children, filters)

      // 如果目录包含可见的子项，则目录本身也可见
      if (entry.children.length > 0) {
        entry.isVisible = true
        return true
      }
    }

    entry.isVisible = passes
    return passes
  })
}

/**
 * 检查单个条目是否通过过滤器
 */
function passesFilters(
  entry: DirectoryDiffEntry,
  filters: DirectoryFilter[]
): boolean {
  // 如果没有任何过滤器，全部通过
  if (filters.length === 0) return true

  for (const filter of filters) {
    const passes = checkFilter(entry, filter)

    // 如果任何过滤器未通过，返回 false
    if (!passes) return false
  }

  return true
}

/**
 * 检查条目是否符合特定过滤器
 */
function checkFilter(
  entry: DirectoryDiffEntry,
  filter: DirectoryFilter
): boolean {
  const metadata = entry.leftMetadata || entry.rightMetadata

  switch (filter.type) {
    case 'extension':
      return checkExtensionFilter(entry, filter)

    case 'glob':
      return checkGlobFilter(entry, filter)

    case 'regex':
      return checkRegexFilter(entry, filter)

    case 'size':
      return checkSizeFilter(metadata, filter)

    case 'date':
      return checkDateFilter(metadata, filter)

    default:
      return true
  }
}

/**
 * 检查扩展名过滤器
 */
function checkExtensionFilter(
  entry: DirectoryDiffEntry,
  filter: ExtensionFilter
): boolean {
  if (entry.type === 'directory') {
    return true // 目录不检查扩展名
  }

  const ext = path.extname(entry.name)
  const normalizedExt = filter.caseSensitive ? ext : ext.toLowerCase()

  const normalizedFilters = filter.extensions.map(e => {
    const normalized = filter.caseSensitive ? e : e.toLowerCase()
    // 确保扩展名以点开头
    return normalized.startsWith('.') ? normalized : `.${normalized}`
  })

  const matches = normalizedFilters.includes(normalizedExt)
  return filter.invert ? !matches : matches
}

/**
 * 检查 glob 过滤器
 */
function checkGlobFilter(
  entry: DirectoryDiffEntry,
  filter: GlobFilter
): boolean {
  for (const pattern of filter.patterns) {
    if (matchGlob(entry.relativePath, pattern) ||
        matchGlob(entry.name, pattern)) {
      return filter.invert ? false : true
    }
  }

  return filter.invert ? true : false
}

/**
 * 检查正则过滤器
 */
function checkRegexFilter(
  entry: DirectoryDiffEntry,
  filter: RegexFilter
): boolean {
  try {
    const regex = new RegExp(filter.pattern, filter.flags)
    const matches = regex.test(entry.relativePath) || regex.test(entry.name)
    return filter.invert ? !matches : matches
  } catch {
    // 无效的正则表达式，视为通过
    return true
  }
}

/**
 * 检查大小过滤器
 */
function checkSizeFilter(
  metadata: FileMetadata | undefined,
  filter: SizeFilter
): boolean {
  if (!metadata) return true

  const size = metadata.size

  if (filter.minSize !== undefined && size < filter.minSize) {
    return filter.invert ? true : false
  }

  if (filter.maxSize !== undefined && size > filter.maxSize) {
    return filter.invert ? true : false
  }

  return filter.invert ? false : true
}

/**
 * 检查日期过滤器
 */
function checkDateFilter(
  metadata: FileMetadata | undefined,
  filter: DateFilter
): boolean {
  if (!metadata) return true

  const mtime = metadata.modifiedTime.getTime()

  if (filter.modifiedAfter !== undefined) {
    const after = new Date(filter.modifiedAfter).getTime()
    if (mtime < after) {
      return filter.invert ? true : false
    }
  }

  if (filter.modifiedBefore !== undefined) {
    const before = new Date(filter.modifiedBefore).getTime()
    if (mtime > before) {
      return filter.invert ? true : false
    }
  }

  return filter.invert ? false : true
}

/**
 * 匹配 glob 模式
 * @param str 要匹配的字符串
 * @param pattern glob 模式
 */
export function matchGlob(str: string, pattern: string): boolean {
  // 处理 ** 匹配任意层级
  if (pattern === '**') return true

  // 处理 **/prefix 模式
  if (pattern.startsWith('**/')) {
    const suffix = pattern.slice(3)
    return matchGlob(str, suffix) || str.split(/[/\\]/).some(part => matchGlob(part, suffix))
  }

  // 处理 prefix/** 模式
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3)
    return str.startsWith(prefix)
  }

  // 转换 glob 为正则表达式
  let regexPattern = pattern

  // 先转义特殊字符（除了 * 和 ?）
  regexPattern = regexPattern.replace(/[.+^${}()|[\]]/g, '\\$&')

  // 转换 glob 通配符
  regexPattern = regexPattern
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/\\\\]*')
    .replace(/\?/g, '.')
    .replace(/{{GLOBSTAR}}/g, '.*')

  try {
    const regex = new RegExp(`^${regexPattern}$`, 'i')
    return regex.test(str)
  } catch {
    return false
  }
}

/**
 * 检查路径是否应该被排除
 * @param relativePath 相对路径
 * @param name 文件名
 * @param excludePatterns 排除模式列表
 */
export function shouldExcludePath(
  relativePath: string,
  name: string,
  excludePatterns: string[]
): boolean {
  for (const pattern of excludePatterns) {
    // 直接匹配名称
    if (matchGlob(name, pattern)) {
      return true
    }

    // 匹配完整路径
    if (matchGlob(relativePath, pattern)) {
      return true
    }

    // 匹配路径的任何部分
    const parts = relativePath.split(/[/\\]/)
    for (const part of parts) {
      if (matchGlob(part, pattern)) {
        return true
      }
    }
  }

  return false
}

/**
 * 创建默认过滤器
 */
export function createDefaultFilters(): DirectoryFilter[] {
  return [
    {
      id: 'exclude-common',
      type: 'glob',
      enabled: true,
      invert: false,
      patterns: DEFAULT_EXCLUDE_PATTERNS
    } as GlobFilter
  ]
}

/**
 * 创建扩展名过滤器
 * @param extensions 扩展名列表
 */
export function createExtensionFilter(
  extensions: string[],
  caseSensitive: boolean = false
): ExtensionFilter {
  return {
    id: `ext-${Date.now()}`,
    type: 'extension',
    enabled: true,
    invert: false,
    extensions,
    caseSensitive
  }
}

/**
 * 创建 glob 过滤器
 * @param patterns glob 模式列表
 * @param invert 是否反转匹配
 */
export function createGlobFilter(
  patterns: string[],
  invert: boolean = false
): GlobFilter {
  return {
    id: `glob-${Date.now()}`,
    type: 'glob',
    enabled: true,
    invert,
    patterns
  }
}

/**
 * 创建正则过滤器
 * @param pattern 正则表达式
 * @param flags 正则标志
 */
export function createRegexFilter(
  pattern: string,
  flags: string = 'i'
): RegexFilter {
  return {
    id: `regex-${Date.now()}`,
    type: 'regex',
    enabled: true,
    invert: false,
    pattern,
    flags
  }
}

/**
 * 验证过滤器配置
 * @param filter 过滤器配置
 * @returns 验证结果
 */
export function validateFilter(
  filter: DirectoryFilter
): { valid: boolean; error?: string } {
  if (!filter || typeof filter !== 'object') {
    return { valid: false, error: '过滤器必须是对象' }
  }

  if (!filter.type) {
    return { valid: false, error: '过滤器类型不能为空' }
  }

  if (!filter.id) {
    return { valid: false, error: '过滤器ID不能为空' }
  }

  switch (filter.type) {
    case 'extension':
      const extFilter = filter as ExtensionFilter
      if (!Array.isArray(extFilter.extensions) || extFilter.extensions.length === 0) {
        return { valid: false, error: '扩展名过滤器必须包含至少一个扩展名' }
      }
      break

    case 'glob':
      const globFilter = filter as GlobFilter
      if (!Array.isArray(globFilter.patterns) || globFilter.patterns.length === 0) {
        return { valid: false, error: 'Glob过滤器必须包含至少一个模式' }
      }
      break

    case 'regex':
      const regexFilter = filter as RegexFilter
      try {
        new RegExp(regexFilter.pattern, regexFilter.flags)
      } catch (e) {
        return { valid: false, error: `无效的正则表达式: ${e}` }
      }
      break

    case 'size':
      const sizeFilter = filter as SizeFilter
      if (sizeFilter.minSize !== undefined && sizeFilter.minSize < 0) {
        return { valid: false, error: '最小大小不能为负数' }
      }
      if (sizeFilter.maxSize !== undefined && sizeFilter.maxSize < 0) {
        return { valid: false, error: '最大大小不能为负数' }
      }
      if (sizeFilter.minSize !== undefined &&
          sizeFilter.maxSize !== undefined &&
          sizeFilter.minSize > sizeFilter.maxSize) {
        return { valid: false, error: '最小大小不能大于最大大小' }
      }
      break

    case 'date':
      const dateFilter = filter as DateFilter
      if (dateFilter.modifiedAfter && dateFilter.modifiedBefore) {
        const after = new Date(dateFilter.modifiedAfter).getTime()
        const before = new Date(dateFilter.modifiedBefore).getTime()
        if (after > before) {
          return { valid: false, error: '起始日期不能晚于结束日期' }
        }
      }
      break

    default:
      return { valid: false, error: `未知的过滤器类型: ${(filter as DirectoryFilter).type}` }
  }

  return { valid: true }
}

/**
 * 合并多个过滤器列表
 * @param filtersList 过滤器列表数组
 * @returns 合并后的过滤器列表
 */
export function mergeFilters(
  ...filtersList: DirectoryFilter[][]
): DirectoryFilter[] {
  const result: DirectoryFilter[] = []

  for (const filters of filtersList) {
    for (const filter of filters) {
      // 检查是否已存在相同ID的过滤器
      const existingIndex = result.findIndex(f => f.id === filter.id)
      if (existingIndex >= 0) {
        // 覆盖现有过滤器
        result[existingIndex] = filter
      } else {
        result.push(filter)
      }
    }
  }

  return result
}
