import * as fs from 'fs'
import * as path from 'path'
import { createHash } from 'crypto'
import type { DirTreeNode, FileMetadata, DirCompareOptions } from '@shared/types'
import { DEFAULT_EXCLUDE_PATTERNS, shouldExcludePath } from './filter'
import { getScanWorkerPool, getHashWorkerPool } from './worker/pool'
import { getCacheManager } from './cache'
import { incrementalScan } from './incremental'

// Worker 池启用阈值 - 根据设计文档 §4.2 性能优化策略
const WORKER_THRESHOLD = 1000 // 文件数超过此值启用 Worker
const LARGE_DIR_THRESHOLD = 100 // 子目录数超过此值启用并行扫描

/**
 * 扫描进度回调
 */
export interface ScanProgress {
  phase: 'estimating' | 'scanning' | 'comparing' | 'caching' | 'complete'
  currentPhase: string
  totalFiles: number
  processedFiles: number
  percentage: number
  message?: string
}

/**
 * 扫描选项
 */
export interface ScanOptions extends DirCompareOptions {
  onProgress?: (progress: ScanProgress) => void
  signal?: AbortSignal
}

/**
 * 扫描结果
 */
export interface ScanResult {
  root: DirTreeNode
  totalFiles: number
  totalSize: number
}

/**
 * 递归扫描目录 - 增强版，支持详细进度追踪和自动 Worker 启用
 * @param rootPath 根目录路径
 * @param options 对比选项
 * @returns 扫描结果
 */
export async function scanDirectory(
  rootPath: string,
  options: ScanOptions
): Promise<ScanResult> {
  const scanOptions = options as ScanOptions
  const onProgress = scanOptions.onProgress
  const signal = scanOptions.signal

  // 报告开始阶段
  onProgress?.({
    phase: 'estimating',
    currentPhase: '估算文件数量...',
    totalFiles: 0,
    processedFiles: 0,
    percentage: 0,
    message: '正在分析目录结构...'
  })

  // 1. 尝试增量扫描（如果启用了缓存）
  const cacheManager = getCacheManager()
  const existingCache = cacheManager.getCache(rootPath)

  if (existingCache && options.useIncremental !== false) {
    onProgress?.({
      phase: 'scanning',
      currentPhase: '增量扫描...',
      totalFiles: existingCache.totalFiles || 0,
      processedFiles: 0,
      percentage: 10,
      message: '检查缓存的有效性...'
    })

    const incrementalResult = await incrementalScan(rootPath, options, cacheManager)

    if (incrementalResult.usedCache && incrementalResult.timeSaved > 0) {
      console.log(`Incremental scan saved ${incrementalResult.timeSaved}ms`)

      // 如果有变更，更新缓存
      if (incrementalResult.changes.length > 0 || incrementalResult.added.length > 0) {
        // 这里可以合并变更到现有树结构
      }
    }
  }

  // 检查是否取消
  if (signal?.aborted) {
    throw new Error('Scan cancelled')
  }

  const root: DirTreeNode = {
    path: rootPath,
    name: path.basename(rootPath),
    type: 'directory',
    children: [],
    metadata: await getDirMetadata(rootPath),
    relativePath: ''
  }

  const stats = {
    totalFiles: 0,
    totalSize: 0
  }

  // 2. 根据目录大小选择扫描策略
  const estimatedFiles = await estimateFileCount(rootPath, options)

  onProgress?.({
    phase: 'scanning',
    currentPhase: '扫描目录...',
    totalFiles: estimatedFiles,
    processedFiles: 0,
    percentage: 20,
    message: estimatedFiles > WORKER_THRESHOLD
      ? `检测到大型目录 (${estimatedFiles} 文件)，启用并行扫描...`
      : `开始扫描 ${estimatedFiles} 个文件...`
  })

  // 自动启用 Worker 池条件：
  // 1. 文件数超过阈值 (1000)
  // 2. 并行处理未禁用
  // 3. 不是单文件模式
  const shouldUseWorkers = estimatedFiles > WORKER_THRESHOLD &&
    options.parallel !== false &&
    options.workerCount !== 0

  if (shouldUseWorkers) {
    // 使用 Worker 池进行并行扫描
    await scanWithWorkers(root, rootPath, options, stats, onProgress, signal)
  } else {
    // 使用常规递归扫描，带进度报告
    await scanRecursiveWithProgress(
      root, rootPath, '', options, stats, 0,
      estimatedFiles, onProgress, signal, 0
    )
  }

  // 3. 更新根目录的元数据
  if (root.metadata) {
    root.metadata = {
      ...root.metadata,
      size: stats.totalSize
    }
  }

  // 4. 更新缓存
  if (options.useCache !== false) {
    onProgress?.({
      phase: 'caching',
      currentPhase: '更新缓存...',
      totalFiles: stats.totalFiles,
      processedFiles: stats.totalFiles,
      percentage: 95,
      message: '正在保存扫描结果到缓存...'
    })
    await updateScanCache(rootPath, root, stats)
  }

  onProgress?.({
    phase: 'complete',
    currentPhase: '完成',
    totalFiles: stats.totalFiles,
    processedFiles: stats.totalFiles,
    percentage: 100,
    message: `扫描完成，共 ${stats.totalFiles} 个文件`
  })

  return {
    root,
    totalFiles: stats.totalFiles,
    totalSize: stats.totalSize
  }
}

/**
 * 估算文件数量
 */
async function estimateFileCount(rootPath: string, _options: DirCompareOptions): Promise<number> {
  try {
    const entries = await fs.promises.readdir(rootPath)
    let count = 0

    for (const entry of entries.slice(0, 10)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue

      const fullPath = path.join(rootPath, entry)
      const stats = await fs.promises.stat(fullPath).catch(() => null)
      if (stats?.isDirectory()) {
        const subEntries = await fs.promises.readdir(fullPath).catch(() => [])
        count += subEntries.length
      } else if (stats?.isFile()) {
        count++
      }
    }

    // 简单估算
    return count * entries.length
  } catch {
    return 0
  }
}

/**
 * 使用 Worker 池扫描 - 增强版，带进度报告
 */
async function scanWithWorkers(
  rootNode: DirTreeNode,
  rootPath: string,
  options: DirCompareOptions,
  stats: { totalFiles: number; totalSize: number },
  onProgress?: (progress: ScanProgress) => void,
  signal?: AbortSignal
): Promise<void> {
  const workerPool = getScanWorkerPool()

  try {
    // 并行扫描根目录下的各个子目录
    const entries = await fs.promises.readdir(rootPath, { withFileTypes: true })
    const subDirs = entries.filter(e => e.isDirectory() && !shouldExcludePath(e.name, e.name, DEFAULT_EXCLUDE_PATTERNS))
    const files = entries.filter(e => e.isFile())

    onProgress?.({
      phase: 'scanning',
      currentPhase: 'Worker 扫描...',
      totalFiles: 0,
      processedFiles: 0,
      percentage: 30,
      message: `发现 ${subDirs.length} 个子目录，启用 ${options.workerCount || 2} 个 Worker...`
    })

    // 先处理当前目录的文件
    for (const file of files) {
      if (signal?.aborted) throw new Error('Scan cancelled')

      const fullPath = path.join(rootPath, file.name)
      const metadata = await getFileMetadata(fullPath, options.useHash)
      const fileNode: DirTreeNode = {
        path: fullPath,
        name: file.name,
        type: 'file',
        metadata,
        relativePath: ''
      }
      rootNode.children?.push(fileNode)
      stats.totalFiles++
      stats.totalSize += metadata.size
    }

    if (subDirs.length > 0) {
      // 根据子目录数量决定策略
      const shouldUseParallel = subDirs.length > LARGE_DIR_THRESHOLD || stats.totalFiles > WORKER_THRESHOLD

      if (shouldUseParallel && options.parallel !== false) {
        // 大量子目录，使用并行扫描
        const scanTasks = subDirs.map(dir => ({
          type: 'scan' as const,
          payload: {
            rootPath: path.join(rootPath, dir.name),
            relativePath: '',
            options: {
              recursive: options.recursive,
              maxDepth: options.maxDepth,
              filters: options.filters,
              excludePatterns: DEFAULT_EXCLUDE_PATTERNS
            }
          }
        }))

        const results = await workerPool.executeTasks(scanTasks)

        // 合并结果
        for (let i = 0; i < subDirs.length; i++) {
          if (signal?.aborted) throw new Error('Scan cancelled')

          const dir = subDirs[i]
          const result = results[i] as {
            entries: Array<{
              name: string;
              relativePath: string;
              type: 'file' | 'directory';
              size?: number;
              modifiedTime?: Date;
            }>
          }

          if (result && result.entries) {
            // 使用辅助函数构建目录树并统计
            const { tree: childNode, fileCount, totalSize } = buildTreeFromEntries(
              rootPath,
              dir.name,
              result.entries
            )

            rootNode.children?.push(childNode)

            // 更新统计信息
            stats.totalFiles += fileCount
            stats.totalSize += totalSize
          }

          // 报告进度
          onProgress?.({
            phase: 'scanning',
            currentPhase: 'Worker 扫描...',
            totalFiles: subDirs.length,
            processedFiles: i + 1,
            percentage: 30 + Math.floor((i + 1) / subDirs.length * 50),
            message: `已扫描 ${i + 1}/${subDirs.length} 个子目录...`
          })
        }
      } else {
        // 子目录较少，回退到常规扫描
        for (const dir of subDirs) {
          if (signal?.aborted) throw new Error('Scan cancelled')

          const childNode: DirTreeNode = {
            path: path.join(rootPath, dir.name),
            name: dir.name,
            type: 'directory',
            children: [],
            metadata: await getDirMetadata(path.join(rootPath, dir.name)),
            relativePath: dir.name
          }
          await scanRecursive(childNode, rootPath, dir.name, options, stats, 1)
          rootNode.children?.push(childNode)
        }
      }
    }
  } catch (error) {
    console.error('Worker scan failed, falling back to regular scan:', error)
    // Worker 失败时回退到常规扫描
    await scanRecursive(rootNode, rootPath, '', options, stats, 0)
  }
}

/**
 * 更新扫描缓存
 */
async function updateScanCache(
  rootPath: string,
  rootNode: DirTreeNode,
  stats: { totalFiles: number; totalSize: number }
): Promise<void> {
  const cacheManager = getCacheManager()
  let cache = cacheManager.getCache(rootPath)

  if (!cache) {
    cache = cacheManager.createCache(rootPath)
  }

  // 更新缓存统计
  cache.lastScan = Date.now()
  cache.totalFiles = stats.totalFiles
  cache.totalSize = stats.totalSize

  // 递归缓存文件条目
  const cacheEntries = (node: DirTreeNode, relativePath: string) => {
    if (node.type === 'file' && node.metadata) {
      cacheManager.setEntry(cache!, {
        relativePath,
        size: node.metadata.size,
        modifiedTime: node.metadata.modifiedTime.getTime(),
        hash: node.metadata.hash,
        cachedAt: Date.now()
      })
    }

    if (node.children) {
      for (const child of node.children) {
        const childPath = relativePath ? path.join(relativePath, child.name) : child.name
        cacheEntries(child, childPath)
      }
    }
  }

  cacheEntries(rootNode, '')
}

/**
 * 递归扫描子目录 - 带进度报告
 */
async function scanRecursiveWithProgress(
  parentNode: DirTreeNode,
  rootPath: string,
  currentRelativePath: string,
  options: DirCompareOptions,
  stats: { totalFiles: number; totalSize: number },
  depth: number,
  estimatedTotal: number,
  onProgress?: (progress: ScanProgress) => void,
  signal?: AbortSignal,
  _processedCount: number = 0
): Promise<number> {
  const currentPath = currentRelativePath
    ? path.join(rootPath, currentRelativePath)
    : rootPath

  // 检查取消
  if (signal?.aborted) {
    throw new Error('Scan cancelled')
  }

  // 检查最大深度
  if (options.maxDepth !== undefined && depth >= options.maxDepth) {
    return _processedCount
  }

  let entries: fs.Dirent[]
  try {
    entries = await fs.promises.readdir(currentPath, { withFileTypes: true })
  } catch (error) {
    console.error(`Failed to read directory: ${currentPath}`, error)
    return _processedCount
  }

  for (const entry of entries) {
    // 检查取消
    if (signal?.aborted) {
      throw new Error('Scan cancelled')
    }

    const fullPath = path.join(currentPath, entry.name)
    const relativePath = currentRelativePath
      ? path.join(currentRelativePath, entry.name)
      : entry.name

    // 应用排除规则
    if (shouldExclude(relativePath, entry, options)) {
      continue
    }

    if (entry.isDirectory()) {
      // 递归扫描子目录
      const childNode: DirTreeNode = {
        path: fullPath,
        name: entry.name,
        type: 'directory',
        children: [],
        metadata: await getDirMetadata(fullPath),
        relativePath
      }

      if (options.recursive) {
        _processedCount = await scanRecursiveWithProgress(
          childNode,
          rootPath,
          relativePath,
          options,
          stats,
          depth + 1,
          estimatedTotal,
          onProgress,
          signal,
          _processedCount
        )
      }

      if (!parentNode.children) {
        parentNode.children = []
      }
      parentNode.children.push(childNode)
    } else if (entry.isFile()) {
      // 收集文件元数据
      const metadata = await getFileMetadata(fullPath, options.useHash)
      const fileNode: DirTreeNode = {
        path: fullPath,
        name: entry.name,
        type: 'file',
        metadata,
        relativePath
      }

      if (!parentNode.children) {
        parentNode.children = []
      }
      parentNode.children.push(fileNode)

      stats.totalFiles++
      stats.totalSize += metadata.size
      _processedCount++

      // 每处理100个文件报告一次进度
      if (_processedCount % 100 === 0) {
        onProgress?.({
          phase: 'scanning',
          currentPhase: '扫描文件中...',
          totalFiles: estimatedTotal,
          processedFiles: _processedCount,
          percentage: Math.min(80, 30 + Math.floor(_processedCount / estimatedTotal * 50)),
          message: `已扫描 ${_processedCount}/${estimatedTotal} 个文件...`
        })
      }
    }
  }

  return _processedCount
}

/**
 * 递归扫描子目录 (兼容旧版)
 */
async function scanRecursive(
  parentNode: DirTreeNode,
  rootPath: string,
  currentRelativePath: string,
  options: DirCompareOptions,
  stats: { totalFiles: number; totalSize: number },
  depth: number
): Promise<void> {
  await scanRecursiveWithProgress(
    parentNode, rootPath, currentRelativePath,
    options, stats, depth, 1000, undefined, undefined, 0
  )
}

/**
 * 检查是否应该排除此条目
 */
function shouldExclude(
  relativePath: string,
  entry: fs.Dirent,
  options: DirCompareOptions
): boolean {
  // 1. 首先应用默认排除规则（如 node_modules, .git 等）
  if (shouldExcludePath(relativePath, entry.name, DEFAULT_EXCLUDE_PATTERNS)) {
    return true
  }

  // 2. 检查用户定义的过滤器
  if (options.filters && options.filters.length > 0) {
    for (const filter of options.filters) {
      if (!filter.enabled) continue

      switch (filter.type) {
        case 'extension':
          if (entry.isFile()) {
            const ext = path.extname(entry.name)
            const normalizedExt = filter.caseSensitive ? ext : ext.toLowerCase()
            const normalizedFilters = filter.extensions.map(e =>
              filter.caseSensitive ? e : e.toLowerCase()
            )
            // 如果启用了过滤器，不匹配则排除（除非 invert 为 true）
            const matches = normalizedFilters.includes(normalizedExt)
            if (filter.invert ? matches : !matches) {
              return true
            }
          }
          break

        case 'glob':
          for (const pattern of filter.patterns) {
            const matches = matchGlob(relativePath, pattern)
            if (filter.invert ? !matches : matches) {
              return true
            }
          }
          break

        case 'regex':
          try {
            const regex = new RegExp(filter.pattern, filter.flags)
            const matches = regex.test(relativePath)
            if (filter.invert ? !matches : matches) {
              return true
            }
          } catch {
            // 无效的正则表达式，跳过
          }
          break

        case 'size':
          if (entry.isFile()) {
            // 文件大小过滤需要在获取元数据后处理
            // 这里只检查目录
            continue
          }
          break

        case 'date':
          // 日期过滤需要在获取元数据后处理
          continue
      }
    }
  }

  // 默认不排除
  return false
}

/**
 * 获取文件元数据
 */
export async function getFileMetadata(
  filePath: string,
  computeHash: boolean = false
): Promise<FileMetadata> {
  const stats = await fs.promises.stat(filePath)

  let hash: string | undefined
  if (computeHash) {
    hash = await computeFileHash(filePath)
  }

  return {
    size: stats.size,
    modifiedTime: stats.mtime,
    createdTime: stats.ctime,
    hash,
    permissions: stats.mode.toString(8)
  }
}

/**
 * 获取目录元数据
 */
export async function getDirMetadata(dirPath: string): Promise<FileMetadata> {
  const stats = await fs.promises.stat(dirPath)
  return {
    size: 0, // 目录大小在扫描完成后更新
    modifiedTime: stats.mtime,
    createdTime: stats.ctime,
    permissions: stats.mode.toString(8)
  }
}

/**
 * 计算文件哈希 (MD5)
 * 大文件使用 Worker 池
 */
export async function computeFileHash(
  filePath: string,
  useWorker: boolean = true
): Promise<string> {
  // 检查文件大小
  const stats = await fs.promises.stat(filePath).catch(() => null)
  const fileSize = stats?.size || 0

  // 大文件（>10MB）使用 Worker 池
  if (useWorker && fileSize > 10 * 1024 * 1024) {
    try {
      const workerPool = getHashWorkerPool()
      const result = await workerPool.executeTask('hash', {
        filePath,
        algorithm: 'md5'
      }) as { hash: string }

      return result.hash
    } catch (error) {
      console.warn('Worker hash failed, falling back to main thread:', error)
      // Worker 失败时回退到主线程
    }
  }

  // 常规哈希计算
  return new Promise((resolve, reject) => {
    const hash = createHash('md5')
    const stream = fs.createReadStream(filePath)

    stream.on('error', reject)
    stream.on('data', chunk => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

/**
 * 批量计算文件哈希
 */
export async function computeFileHashes(
  filePaths: string[],
  algorithm: 'md5' | 'sha256' = 'md5'
): Promise<Array<{ filePath: string; hash: string; error?: string }>> {
  const workerPool = getHashWorkerPool()

  try {
    const result = await workerPool.executeTask('batch-hash', {
      filePaths,
      algorithm
    }) as {
      results: Array<{ filePath: string; hash: string; error?: string }>
    }

    return result.results
  } catch (error) {
    // Worker 失败时逐个计算
    const results: Array<{ filePath: string; hash: string; error?: string }> = []

    for (const filePath of filePaths) {
      try {
        const hash = await computeFileHash(filePath, false)
        results.push({ filePath, hash })
      } catch (err) {
        results.push({
          filePath,
          hash: '',
          error: err instanceof Error ? err.message : 'Hash failed'
        })
      }
    }

    return results
  }
}

/**
 * 匹配 glob 模式
 * @param str 要匹配的字符串
 * @param pattern glob 模式
 */
function matchGlob(str: string, pattern: string): boolean {
  // 简单的 glob 匹配实现
  // 支持 * 匹配任意字符，? 匹配单个字符，** 匹配任意层级

  if (pattern === '**') {
    return true
  }

  // 转换 glob 为正则表达式
  let regexPattern = pattern
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.')
    .replace(/{{GLOBSTAR}}/g, '.*')

  // 处理目录分隔符
  regexPattern = regexPattern.replace(/\//g, '\\\\')

  const regex = new RegExp(`^${regexPattern}$`, 'i')
  return regex.test(str)
}

/**
 * 构建路径索引
 * @param tree 目录树
 * @returns 路径索引 Map
 */
export function buildPathIndex(tree: DirTreeNode): Map<string, DirTreeNode> {
  const index = new Map<string, DirTreeNode>()

  function traverse(node: DirTreeNode, relativePath: string) {
    index.set(relativePath, node)

    if (node.children) {
      for (const child of node.children) {
        const childPath = relativePath
          ? path.join(relativePath, child.name)
          : child.name
        traverse(child, childPath)
      }
    }
  }

  traverse(tree, '')
  return index
}

/**
 * 扁平化目录树
 * @param tree 目录树
 * @returns 扁平化的节点列表
 */
export function flattenTree(tree: DirTreeNode): DirTreeNode[] {
  const result: DirTreeNode[] = []

  function traverse(node: DirTreeNode) {
    result.push(node)
    if (node.children) {
      for (const child of node.children) {
        traverse(child)
      }
    }
  }

  traverse(tree)
  return result
}

/**
 * 从扁平化的条目列表构建目录树
 * @param rootPath 根目录路径
 * @param dirName 当前目录名
 * @param entries Worker 返回的扁平化条目列表
 * @returns 构建的树节点、文件数和总大小
 */
function buildTreeFromEntries(
  rootPath: string,
  dirName: string,
  entries: Array<{
    name: string;
    relativePath: string;
    type: 'file' | 'directory';
    size?: number;
    modifiedTime?: Date;
  }>
): { tree: DirTreeNode; fileCount: number; totalSize: number } {
  const dirPath = path.join(rootPath, dirName)
  let fileCount = 0
  let totalSize = 0

  // 创建根目录节点
  const rootNode: DirTreeNode = {
    path: dirPath,
    name: dirName,
    type: 'directory',
    children: [],
    metadata: {
      size: 0,
      modifiedTime: new Date(),
      createdTime: new Date(),
      permissions: '755'
    },
    relativePath: dirName
  }

  // 使用 Map 来跟踪已创建的目录节点
  const dirMap = new Map<string, DirTreeNode>()
  dirMap.set(dirName, rootNode)

  // 按路径深度排序条目，确保父目录先被处理
  const sortedEntries = [...entries].sort((a, b) => {
    const depthA = a.relativePath.split(path.sep).length
    const depthB = b.relativePath.split(path.sep).length
    return depthA - depthB
  })

  for (const entry of sortedEntries) {
    const pathParts = entry.relativePath.split(path.sep)
    const parentPath = pathParts.slice(0, -1).join(path.sep)
    const entryName = pathParts[pathParts.length - 1]

    // 确定父节点
    let parentNode: DirTreeNode | undefined
    if (pathParts.length === 1) {
      // 直接子项，父节点是根节点
      parentNode = rootNode
    } else {
      // 嵌套子项，查找父节点
      parentNode = dirMap.get(path.join(dirName, parentPath))
    }

    if (!parentNode) {
      // 如果找不到父节点，跳过此条目
      continue
    }

    // 确保父节点有 children 数组
    if (!parentNode.children) {
      parentNode.children = []
    }

    const entryFullPath = path.join(rootPath, entry.relativePath)

    if (entry.type === 'file') {
      const fileNode: DirTreeNode = {
        path: entryFullPath,
        name: entryName,
        type: 'file',
        metadata: {
          size: entry.size || 0,
          modifiedTime: entry.modifiedTime || new Date(),
          createdTime: new Date(),
          permissions: '644'
        },
        relativePath: entry.relativePath
      }
      parentNode.children.push(fileNode)
      fileCount++
      totalSize += entry.size || 0
    } else if (entry.type === 'directory') {
      const dirNode: DirTreeNode = {
        path: entryFullPath,
        name: entryName,
        type: 'directory',
        children: [],
        metadata: {
          size: 0,
          modifiedTime: entry.modifiedTime || new Date(),
          createdTime: new Date(),
          permissions: '755'
        },
        relativePath: entry.relativePath
      }
      parentNode.children.push(dirNode)
      // 记录到 Map 中，以便子项可以找到它
      dirMap.set(entry.relativePath, dirNode)
    }
  }

  return { tree: rootNode, fileCount, totalSize }
}
