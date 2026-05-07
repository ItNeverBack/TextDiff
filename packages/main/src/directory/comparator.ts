import * as path from 'path'
import * as fs from 'fs'
import type {
  DirTreeNode,
  DirectoryDiffEntry,
  DirCompareOptions,
  DiffStatus
} from '@shared/types'

// ============================================
// 权限规范化函数 - 改进 permission-changed 检测的健壮性
// ============================================

/**
 * 规范化权限字符串
 * 处理不同格式：
 * - Linux: "644", "755", "40755" (带文件类型位)
 * - Windows: 可能返回不同的格式
 * - 数值: 33188 (十进制)
 */
function normalizePermissions(permissions: string | number): string {
  let mode: number

  // 转换为数值
  if (typeof permissions === 'string') {
    // 移除前导的文件类型位（如 40755 -> 755）
    const trimmed = permissions.replace(/^[0-7]/, '')
    mode = parseInt(trimmed, 8)
    if (isNaN(mode)) {
      return permissions // 无法解析，返回原值
    }
  } else {
    mode = permissions
  }

  // 只保留权限位（低9位）
  const permissionBits = mode & 0o777

  // 转换为3位八进制字符串
  return permissionBits.toString(8).padStart(3, '0')
}

/**
 * 检查权限是否有实际差异
 * 忽略某些系统位的差异
 */
function hasPermissionDifference(left: string | number, right: string | number): boolean {
  const normalizedLeft = normalizePermissions(left)
  const normalizedRight = normalizePermissions(right)

  // 基本比较
  if (normalizedLeft === normalizedRight) {
    return false
  }

  // 检查是否是有效的权限差异
  // 某些系统可能返回不同的格式，但实际权限相同
  const leftNum = parseInt(normalizedLeft, 8)
  const rightNum = parseInt(normalizedRight, 8)

  // 如果解析失败，按字符串比较
  if (isNaN(leftNum) || isNaN(rightNum)) {
    return normalizedLeft !== normalizedRight
  }

  // 只比较标准权限位（读/写/执行）
  const standardBits = 0o777
  return (leftNum & standardBits) !== (rightNum & standardBits)
}

// ============================================
// 对比结果
// ============================================
export interface CompareResult {
  entries: DirectoryDiffEntry[]
  totalFiles: number
  totalDirectories: number
}

/**
 * 目录对比主流程
 * @param leftTree 左侧目录树
 * @param rightTree 右侧目录树
 * @param options 对比选项
 * @returns 对比结果
 */
export async function compareDirectories(
  leftTree: DirTreeNode,
  rightTree: DirTreeNode,
  options: DirCompareOptions
): Promise<CompareResult> {
  // 1. 构建路径索引
  const leftIndex = buildPathIndex(leftTree)
  const rightIndex = buildPathIndex(rightTree)

  // 2. 获取所有路径集合
  const allPaths = new Set([
    ...leftIndex.keys(),
    ...rightIndex.keys()
  ])

  // 3. 对比所有路径，生成扁平的差异条目列表
  const allEntries: DirectoryDiffEntry[] = []

  for (const relativePath of allPaths) {
    const leftNode = leftIndex.get(relativePath)
    const rightNode = rightIndex.get(relativePath)

    const entry = await compareNodes(
      relativePath,
      leftNode,
      rightNode,
      options
    )

    allEntries.push(entry)
  }

  // 4. 构建树形结构
  const treeResult = buildTreeStructure(allEntries)

  return {
    entries: treeResult,
    totalFiles: countFiles(leftTree) + countFiles(rightTree),
    totalDirectories: countDirectories(leftTree) + countDirectories(rightTree)
  }
}

/**
 * 构建路径索引
 */
function buildPathIndex(tree: DirTreeNode): Map<string, DirTreeNode> {
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
 * 对比单个节点
 */
async function compareNodes(
  relativePath: string,
  left: DirTreeNode | undefined,
  right: DirTreeNode | undefined,
  options: DirCompareOptions
): Promise<DirectoryDiffEntry> {
  const depth = relativePath ? relativePath.split(path.sep).length : 0

  // 先确定状态
  const status = await determineStatus(left, right, options)

  const entry: DirectoryDiffEntry = {
    id: generateId(),
    relativePath,
    name: path.basename(relativePath) || (left?.name || right?.name || ''),
    type: left?.type || right?.type || 'file',
    status,
    leftPath: left?.path || null,
    rightPath: right?.path || null,
    leftMetadata: left?.metadata,
    rightMetadata: right?.metadata,
    depth
  }

  // 注意：children 由 buildTreeStructure 根据 relativePath 自动构建
  // 不在此处递归处理，避免重复创建条目

  return entry
}

/**
 * 确定节点状态
 */
async function determineStatus(
  left: DirTreeNode | undefined,
  right: DirTreeNode | undefined,
  options: DirCompareOptions
): Promise<DiffStatus> {
  // 仅左侧存在
  if (!right) {
    return 'left-only'
  }

  // 仅右侧存在
  if (!left) {
    return 'right-only'
  }

  // 类型变更
  if (left.type !== right.type) {
    return 'type-changed'
  }

  // 如果是目录，递归检查子项
  if (left.type === 'directory') {
    return 'equal'
  }

  // 文件对比
  const contentStatus = await compareFileContent(left, right, options)

  // 如果内容相同，检查权限是否变更（使用健壮的权限比较）
  if (contentStatus === 'equal') {
    const leftPerms = left.metadata?.permissions
    const rightPerms = right.metadata?.permissions
    if (leftPerms && rightPerms && hasPermissionDifference(leftPerms, rightPerms)) {
      return 'permission-changed'
    }
  }

  return contentStatus
}

/**
 * 对比子节点
 */
async function compareChildren(
  parentPath: string,
  leftParent: DirTreeNode | undefined,
  rightParent: DirTreeNode | undefined,
  options: DirCompareOptions,
  leftIndex: Map<string, DirTreeNode>,
  rightIndex: Map<string, DirTreeNode>
): Promise<DirectoryDiffEntry[]> {
  // 获取直接子路径
  const childNames = new Set<string>()
  
  // 从左侧索引收集子路径
  for (const [relPath, node] of leftIndex) {
    if (relPath.startsWith(parentPath + path.sep) || 
        (parentPath === '' && !relPath.includes(path.sep))) {
      const remainingPath = parentPath === '' ? relPath : relPath.slice(parentPath.length + 1)
      const firstPart = remainingPath.split(path.sep)[0]
      if (firstPart && !relPath.slice(parentPath.length + 1).includes(path.sep)) {
        childNames.add(firstPart)
      }
    }
  }
  
  // 从右侧索引收集子路径
  for (const [relPath, node] of rightIndex) {
    if (relPath.startsWith(parentPath + path.sep) || 
        (parentPath === '' && !relPath.includes(path.sep))) {
      const remainingPath = parentPath === '' ? relPath : relPath.slice(parentPath.length + 1)
      const firstPart = remainingPath.split(path.sep)[0]
      if (firstPart && !relPath.slice(parentPath.length + 1).includes(path.sep)) {
        childNames.add(firstPart)
      }
    }
  }

  const result: DirectoryDiffEntry[] = []

  for (const name of childNames) {
    const childRelativePath = parentPath ? `${parentPath}${path.sep}${name}` : name
    const leftChild = leftIndex.get(childRelativePath)
    const rightChild = rightIndex.get(childRelativePath)

    const entry = await compareNodes(
      childRelativePath,
      leftChild,
      rightChild,
      options,
      leftIndex,
      rightIndex
    )

    result.push(entry)
  }

  // 按名称排序
  result.sort((a, b) => a.name.localeCompare(b.name))

  return result
}

/**
 * 对比文件内容
 */
async function compareFileContent(
  left: DirTreeNode,
  right: DirTreeNode,
  options: DirCompareOptions
): Promise<DiffStatus> {
  const leftMeta = left.metadata
  const rightMeta = right.metadata

  if (!leftMeta || !rightMeta) {
    return 'modified'
  }

  // 根据对比模式选择对比策略
  switch (options.compareMode) {
    case 'name':
      // 仅对比名称（已经通过路径匹配）
      return 'equal'

    case 'size':
      // 对比大小
      return leftMeta.size === rightMeta.size ? 'equal' : 'modified'

    case 'content':
    case 'full':
      return await compareFullContent(left, right, options)

    default:
      return 'modified'
  }
}

/**
 * 完整内容对比
 */
async function compareFullContent(
  left: DirTreeNode,
  right: DirTreeNode,
  options: DirCompareOptions
): Promise<DiffStatus> {
  const leftMeta = left.metadata!
  const rightMeta = right.metadata!

  // 快速检查：大小不同则内容一定不同
  if (leftMeta.size !== rightMeta.size) {
    return 'modified'
  }

  // 哈希对比（如果可用）
  if (options.useHash && leftMeta.hash && rightMeta.hash) {
    return leftMeta.hash === rightMeta.hash ? 'equal' : 'modified'
  }

  // 检查文件大小限制
  if (options.contentOptions?.maxFileSize) {
    const maxSize = options.contentOptions.maxFileSize
    if (leftMeta.size > maxSize || rightMeta.size > maxSize) {
      // 文件太大，跳过完整对比，使用修改时间
      const leftMtime = leftMeta.modifiedTime.getTime()
      const rightMtime = rightMeta.modifiedTime.getTime()
      return leftMtime === rightMtime ? 'equal' : 'modified'
    }
  }

  // 完整内容对比
  try {
    const leftContent = await fs.promises.readFile(left.path, 'utf-8')
    const rightContent = await fs.promises.readFile(right.path, 'utf-8')

    // 应用忽略选项
    const normalizedLeft = normalizeContent(leftContent, options)
    const normalizedRight = normalizeContent(rightContent, options)

    return normalizedLeft === normalizedRight ? 'equal' : 'modified'
  } catch {
    // 读取失败，认为不同
    return 'modified'
  }
}

/**
 * 规范化内容（应用忽略选项）
 */
function normalizeContent(content: string, options: DirCompareOptions): string {
  let result = content

  const contentOpts = options.contentOptions
  if (!contentOpts) return result

  // 忽略行尾
  if (contentOpts.ignoreLineEndings) {
    result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  }

  // 忽略空白字符
  if (contentOpts.ignoreWhitespace) {
    result = result.replace(/[ \t]+/g, ' ').trim()
  }

  // 忽略大小写
  if (contentOpts.ignoreCase) {
    result = result.toLowerCase()
  }

  return result
}

/**
 * 构建树形结构
 */
function buildTreeStructure(entries: DirectoryDiffEntry[]): DirectoryDiffEntry[] {
  const root: DirectoryDiffEntry[] = []
  const map = new Map<string, DirectoryDiffEntry>()
  const childrenPaths = new Set<string>()

  // 首先创建所有条目
  for (const entry of entries) {
    map.set(entry.relativePath, entry)
  }

  // 然后构建父子关系，记录哪些路径是子节点
  for (const entry of entries) {
    const parts = entry.relativePath.split(path.sep)

    if (parts.length === 1) {
      // 根级别条目，暂时不添加，后面会检查是否被子节点包含
    } else {
      // 有父目录的条目
      const parentPath = parts.slice(0, -1).join(path.sep)
      const parent = map.get(parentPath)

      if (parent) {
        if (!parent.children) {
          parent.children = []
        }
        parent.children.push(entry)
        entry.parentId = parent.id
        childrenPaths.add(entry.relativePath)
      }
    }
  }

  // 只添加不是子节点的根级别条目
  for (const entry of entries) {
    const parts = entry.relativePath.split(path.sep)
    if (parts.length === 1 && !childrenPaths.has(entry.relativePath)) {
      root.push(entry)
    }
  }

  // 递归排序子节点
  sortTree(root)

  return root
}

/**
 * 递归排序树节点
 */
function sortTree(entries: DirectoryDiffEntry[]): void {
  entries.sort((a, b) => {
    // 目录在前，文件在后
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1
    }
    // 按名称排序
    return a.name.localeCompare(b.name)
  })

  // 递归排序子节点
  for (const entry of entries) {
    if (entry.children && entry.children.length > 0) {
      sortTree(entry.children)
    }
  }
}

/**
 * 统计文件数量
 */
function countFiles(tree: DirTreeNode): number {
  let count = 0

  function traverse(node: DirTreeNode) {
    if (node.type === 'file') {
      count++
    }
    if (node.children) {
      for (const child of node.children) {
        traverse(child)
      }
    }
  }

  traverse(tree)
  return count
}

/**
 * 统计目录数量
 */
function countDirectories(tree: DirTreeNode): number {
  let count = 0

  function traverse(node: DirTreeNode) {
    if (node.type === 'directory') {
      count++
    }
    if (node.children) {
      for (const child of node.children) {
        traverse(child)
      }
    }
  }

  traverse(tree)
  return count
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 合并状态
 * 用于计算父目录的状态
 */
export function mergeStatus(
  a: DiffStatus,
  b: DiffStatus
): DiffStatus {
  if (a === b) return a
  if (a === 'equal') return b
  if (b === 'equal') return a
  return 'modified'
}

/**
 * 递归更新目录状态
 * 根据子项状态更新父目录状态
 */
export function updateDirectoryStatus(entries: DirectoryDiffEntry[]): void {
  function updateEntry(entry: DirectoryDiffEntry): DiffStatus {
    if (entry.type === 'file' || !entry.children || entry.children.length === 0) {
      return entry.status
    }

    // 递归更新子项
    let hasDifference = false

    for (const child of entry.children) {
      const childStatus = updateEntry(child)
      if (childStatus !== 'equal') {
        hasDifference = true
      }
    }

    // 如果子项有任何不同，目录标记为modified
    if (hasDifference && entry.status === 'equal') {
      entry.status = 'modified'
    }

    return entry.status
  }

  for (const entry of entries) {
    updateEntry(entry)
  }
}
