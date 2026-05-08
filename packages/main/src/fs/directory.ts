import * as fs from 'fs'
import * as path from 'path'
import type { DirectoryDiffEntry, DirectoryReadOptions, FileFilter, DirectoryExcludeRule } from '@shared/types'
import { generateId } from '@shared/utils/id'

/**
 * 将 glob 模式转换为正则表达式
 * @param pattern glob 模式（支持 * 和 ?）
 * @returns 正则表达式
 */
function globToRegex(pattern: string): RegExp {
  // 转义特殊字符，但保留 * 和 ?
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(`^${escaped}$`, 'i')
}

/**
 * 检查名称是否匹配排除模式
 * @param name 文件/目录名称
 * @param patterns 排除模式列表
 * @returns 如果匹配返回 true
 */
function matchesExcludePattern(name: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    if (pattern.includes('*') || pattern.includes('?')) {
      return globToRegex(pattern).test(name)
    }
    return name === pattern
  })
}

/**
 * 检查文件是否通过过滤器
 * @param filename 文件名
 * @param filters 过滤器列表
 * @returns 如果通过返回 true
 */
function passesFilters(filename: string, filters?: FileFilter[]): boolean {
  if (!filters || filters.length === 0) return true

  // 分组处理不同类型的过滤器
  const extensionFilters = filters.filter(f => f.enabled && f.type === 'extension')
  const globFilters = filters.filter(f => f.enabled && f.type === 'glob')
  const regexFilters = filters.filter(f => f.enabled && f.type === 'regex')
  const excludeFilters = filters.filter(f => f.enabled && f.type === 'exclude')

  // 检查排除过滤器（任一匹配则失败）
  for (const filter of excludeFilters) {
    if (globToRegex(filter.pattern).test(filename)) {
      return false
    }
  }

  // 如果没有包含型过滤器，则通过
  const includeFilters = [...extensionFilters, ...globFilters, ...regexFilters]
  if (includeFilters.length === 0) return true

  // 检查是否匹配任一包含型过滤器
  const ext = path.extname(filename).toLowerCase()
  const name = path.basename(filename)

  for (const filter of includeFilters) {
    switch (filter.type) {
      case 'extension': {
        const filterExt = filter.pattern.startsWith('.') ? filter.pattern.toLowerCase() : `.${filter.pattern.toLowerCase()}`
        if (ext === filterExt) return true
        break
      }
      case 'glob': {
        if (globToRegex(filter.pattern).test(name)) return true
        break
      }
      case 'regex': {
        try {
          const regex = new RegExp(filter.pattern, 'i')
          if (regex.test(name)) return true
        } catch {
          // 无效的正则表达式，跳过
        }
        break
      }
    }
  }

  return false
}

/**
 * 检查目录是否应该被排除
 * @param dirName 目录名称
 * @param fullPath 完整路径
 * @param rules 排除规则
 * @returns 如果应该排除返回 true
 */
function shouldExcludeDirectory(dirName: string, fullPath: string, rules?: DirectoryExcludeRule[]): boolean {
  if (!rules || rules.length === 0) return false

  for (const rule of rules) {
    if (!rule.enabled) continue

    // 检查目录名是否匹配
    if (matchesExcludePattern(dirName, [rule.pattern])) {
      return true
    }

    // 检查完整路径的最后一个部分是否匹配
    const pathParts = fullPath.split(path.sep)
    for (const part of pathParts) {
      if (matchesExcludePattern(part, [rule.pattern])) {
        return true
      }
    }
  }

  return false
}

/**
 * 检查文件大小是否在范围内
 * @param filePath 文件路径
 * @param minSize 最小大小
 * @param maxSize 最大大小
 * @returns 如果在范围内返回 true
 */
async function isSizeInRange(filePath: string, minSize?: number, maxSize?: number): Promise<boolean> {
  if (minSize === undefined && maxSize === undefined) return true

  try {
    const stats = await fs.promises.stat(filePath)
    const size = stats.size

    if (minSize !== undefined && size < minSize) return false
    if (maxSize !== undefined && size > maxSize) return false

    return true
  } catch {
    return false
  }
}

/**
 * 读取目录内容
 * @param dir 目录路径
 * @param options 读取选项
 * @returns 文件路径列表
 */
export async function readDirectory(
  dir: string,
  options: DirectoryReadOptions = {}
): Promise<string[]> {
  const { 
    recursive = false, 
    filter 
  } = options

  const {
    extensions,
    exclude,
    filters,
    excludeRules,
    includeHidden = true,
    minSize,
    maxSize
  } = filter || {}

  const entries = await fs.promises.readdir(dir, { withFileTypes: true })
  let files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    // 跳过隐藏文件（如果未启用包含隐藏文件）
    if (!includeHidden && entry.name.startsWith('.')) {
      continue
    }

    if (entry.isDirectory()) {
      // 检查是否应该排除此目录
      if (exclude && matchesExcludePattern(entry.name, exclude)) {
        continue
      }
      
      // 检查高级排除规则
      if (excludeRules && shouldExcludeDirectory(entry.name, fullPath, excludeRules)) {
        continue
      }

      if (recursive) {
        const subFiles = await readDirectory(fullPath, options)
        files = files.concat(subFiles)
      }
    } else if (entry.isFile()) {
      // 检查排除模式
      if (exclude && matchesExcludePattern(entry.name, exclude)) {
        continue
      }

      // 检查高级过滤器
      if (filters && !passesFilters(entry.name, filters)) {
        continue
      }

      // 检查扩展名（向后兼容）
      if (extensions && !matchesExtension(entry.name, extensions)) {
        continue
      }

      // 检查文件大小
      const sizeOk = await isSizeInRange(fullPath, minSize, maxSize)
      if (!sizeOk) {
        continue
      }

      files.push(fullPath)
    }
  }

  return files
}

/**
 * 对比两个目录
 * @param leftDir 左侧目录
 * @param rightDir 右侧目录
 * @param options 读取选项
 * @returns 目录差异条目列表
 */
export async function compareDirectories(
  leftDir: string,
  rightDir: string,
  options: DirectoryReadOptions = {}
): Promise<DirectoryDiffEntry[]> {
  const leftFiles = await readDirectory(leftDir, { ...options, recursive: true })
  const rightFiles = await readDirectory(rightDir, { ...options, recursive: true })

  const leftRelative = leftFiles.map(f => path.relative(leftDir, f))
  const rightRelative = rightFiles.map(f => path.relative(rightDir, f))

  const allPaths = new Set([...leftRelative, ...rightRelative])
  const entries: DirectoryDiffEntry[] = []

  for (const relPath of allPaths) {
    const inLeft = leftRelative.includes(relPath)
    const inRight = rightRelative.includes(relPath)

    const entry: DirectoryDiffEntry = {
      id: generateId(),
      relativePath: relPath,
      name: path.basename(relPath),
      type: 'file',
      status: 'equal',
      depth: relPath.split(path.sep).length - 1,
      leftPath: inLeft ? path.join(leftDir, relPath) : null,
      rightPath: inRight ? path.join(rightDir, relPath) : null
    }

    if (inLeft && !inRight) {
      entry.status = 'left-only'
    } else if (!inLeft && inRight) {
      entry.status = 'right-only'
    } else {
      const leftContent = await fs.promises.readFile(entry.leftPath!, 'utf-8')
      const rightContent = await fs.promises.readFile(entry.rightPath!, 'utf-8')
      entry.status = leftContent === rightContent ? 'equal' : 'modified'
    }

    entries.push(entry)
  }

  return buildTree(entries)
}

/**
 * 构建目录树结构
 * @param entries 目录差异条目列表
 * @returns 树形结构
 */
function buildTree(entries: DirectoryDiffEntry[]): DirectoryDiffEntry[] {
  const root: DirectoryDiffEntry[] = []
  const map = new Map<string, DirectoryDiffEntry>()

  for (const entry of entries) {
    const parts = entry.relativePath.split(path.sep)
    let currentPath = ''

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isFile = i === parts.length - 1
      currentPath = currentPath ? path.join(currentPath, part) : part

      if (!map.has(currentPath)) {
        const dirEntry: DirectoryDiffEntry = {
          id: generateId(),
          relativePath: currentPath,
          name: part,
          type: isFile ? 'file' : 'directory',
          status: entry.status,
          depth: i,
          leftPath: isFile ? entry.leftPath : null,
          rightPath: isFile ? entry.rightPath : null,
          children: isFile ? undefined : []
        }
        map.set(currentPath, dirEntry)

        if (i === 0) {
          root.push(dirEntry)
        } else {
          const parentPath = parts.slice(0, i).join(path.sep)
          const parent = map.get(parentPath)
          if (parent && parent.children) {
            parent.children.push(dirEntry)
          }
        }
      } else if (!isFile) {
        const existing = map.get(currentPath)!
        existing.status = mergeStatus(existing.status, entry.status)
      }
    }
  }

  return root
}

/**
 * 合并两个状态
 * @param a 状态A
 * @param b 状态B
 * @returns 合并后的状态
 */
function mergeStatus(a: DirectoryDiffEntry['status'], b: DirectoryDiffEntry['status']): DirectoryDiffEntry['status'] {
  if (a === b) return a
  if (a === 'equal') return b
  if (b === 'equal') return a
  return 'modified'
}

/**
 * 检查文件扩展名是否匹配
 * @param filename 文件名
 * @param extensions 扩展名列表
 * @returns 如果匹配返回 true
 */
function matchesExtension(filename: string, extensions?: string[]): boolean {
  if (!extensions || extensions.length === 0) return true
  const ext = path.extname(filename).toLowerCase()
  return extensions.includes(ext) || extensions.includes(ext.slice(1))
}

/**
 * 创建默认的目录排除规则（常用规则）
 * @returns 默认排除规则列表
 */
export function createDefaultExcludeRules(): DirectoryExcludeRule[] {
  return [
    { pattern: 'node_modules', recursive: true, enabled: true },
    { pattern: '.git', recursive: true, enabled: true },
    { pattern: '.svn', recursive: true, enabled: true },
    { pattern: '.hg', recursive: true, enabled: true },
    { pattern: '.idea', recursive: true, enabled: true },
    { pattern: '.vscode', recursive: true, enabled: true },
    { pattern: 'dist', recursive: true, enabled: true },
    { pattern: 'build', recursive: true, enabled: true },
    { pattern: 'out', recursive: true, enabled: true },
    { pattern: 'target', recursive: true, enabled: true },
    { pattern: 'bin', recursive: true, enabled: true },
    { pattern: 'obj', recursive: true, enabled: true },
    { pattern: '__pycache__', recursive: true, enabled: true },
    { pattern: '*.pyc', recursive: true, enabled: true },
    { pattern: '.next', recursive: true, enabled: true },
    { pattern: '.nuxt', recursive: true, enabled: true }
  ]
}

/**
 * 创建文件过滤器（从扩展名列表）
 * @param extensions 扩展名列表
 * @returns 文件过滤器列表
 */
export function createExtensionFilters(extensions: string[]): FileFilter[] {
  return extensions.map(ext => ({
    type: 'extension' as const,
    pattern: ext.startsWith('.') ? ext.slice(1) : ext,
    enabled: true
  }))
}

/**
 * 验证文件过滤器
 * @param filter 文件过滤器
 * @returns 验证结果
 */
export function validateFileFilter(filter: FileFilter): { valid: boolean; error?: string } {
  // 检查类型
  if (!filter || typeof filter !== 'object') {
    return { valid: false, error: '过滤器必须是对象' }
  }

  // 检查 pattern 是否为字符串
  if (typeof filter.pattern !== 'string') {
    return { valid: false, error: '注释前缀必须是字符串' }
  }

  if (!filter.pattern.trim()) {
    return { valid: false, error: '过滤器模式不能为空' }
  }

  if (filter.type === 'regex') {
    try {
      new RegExp(filter.pattern)
    } catch (e) {
      return { valid: false, error: `无效的正则表达式: ${e}` }
    }
  }

  return { valid: true }
}
