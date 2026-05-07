import type {
  DirectoryDiffEntry,
  DirDiffStatistics,
  DirectoryComparison,
  DirectoryInfo
} from '@shared/types'

/**
 * 计算目录对比统计信息
 * @param entries 差异条目列表
 * @param leftRoot 左侧目录信息
 * @param rightRoot 右侧目录信息
 * @param startTime 开始时间
 * @returns 统计信息
 */
export function computeStatistics(
  entries: DirectoryDiffEntry[],
  leftRoot: DirectoryInfo,
  rightRoot: DirectoryInfo,
  startTime: number
): DirDiffStatistics {
  const stats: DirDiffStatistics = {
    totalFiles: 0,
    totalDirectories: 0,
    leftOnly: 0,
    rightOnly: 0,
    modified: 0,
    equal: 0,
    permissionChanged: 0,
    totalSizeLeft: leftRoot.totalSize,
    totalSizeRight: rightRoot.totalSize,
    scannedAt: new Date(),
    duration: Date.now() - startTime
  }

  // 递归统计
  function traverse(entries: DirectoryDiffEntry[]) {
    for (const entry of entries) {
      if (entry.type === 'file') {
        stats.totalFiles++

        switch (entry.status) {
          case 'equal':
            stats.equal++
            break
          case 'modified':
            stats.modified++
            break
          case 'left-only':
            stats.leftOnly++
            break
          case 'right-only':
            stats.rightOnly++
            break
          case 'permission-changed':
            stats.permissionChanged = (stats.permissionChanged || 0) + 1
            break
        }
      } else {
        stats.totalDirectories++
      }

      // 递归处理子项
      if (entry.children && entry.children.length > 0) {
        traverse(entry.children)
      }
    }
  }

  traverse(entries)

  return stats
}

/**
 * 计算差异统计
 * @param entries 差异条目列表
 * @returns 按状态分组的统计
 */
export function computeDiffStats(entries: DirectoryDiffEntry[]): {
  equal: number
  modified: number
  leftOnly: number
  rightOnly: number
  typeChanged: number
  total: number
} {
  const stats = {
    equal: 0,
    modified: 0,
    leftOnly: 0,
    rightOnly: 0,
    typeChanged: 0,
    total: 0
  }

  function traverse(entries: DirectoryDiffEntry[]) {
    for (const entry of entries) {
      stats.total++

      switch (entry.status) {
        case 'equal':
          stats.equal++
          break
        case 'modified':
          stats.modified++
          break
        case 'left-only':
          stats.leftOnly++
          break
        case 'right-only':
          stats.rightOnly++
          break
        case 'type-changed':
          stats.typeChanged++
          break
      }

      if (entry.children) {
        traverse(entry.children)
      }
    }
  }

  traverse(entries)
  return stats
}

/**
 * 计算目录信息
 * @param path 目录路径
 * @param totalFiles 总文件数
 * @param totalSize 总大小
 * @param lastModified 最后修改时间
 * @returns 目录信息
 */
export function createDirectoryInfo(
  path: string,
  name: string,
  totalFiles: number,
  totalSize: number,
  lastModified: Date
): DirectoryInfo {
  return {
    path,
    name,
    totalFiles,
    totalSize,
    lastModified
  }
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  const value = bytes / Math.pow(k, i)
  // 如果是整数，不显示小数部分
  const formatted = value % 1 === 0 ? value.toString() : value.toFixed(2)

  return `${formatted} ${units[i]}`
}

/**
 * 格式化持续时间
 * @param ms 毫秒数
 * @returns 格式化后的字符串
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }

  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

/**
 * 生成统计摘要
 * @param stats 统计信息
 * @returns 摘要字符串
 */
export function generateStatsSummary(stats: DirDiffStatistics): string {
  const parts: string[] = []

  parts.push(`共 ${stats.totalFiles} 个文件`)

  if (stats.equal > 0) {
    parts.push(`${stats.equal} 个相同`)
  }

  if (stats.modified > 0) {
    parts.push(`${stats.modified} 个修改`)
  }

  if (stats.leftOnly > 0) {
    parts.push(`${stats.leftOnly} 个仅左侧`)
  }

  if (stats.rightOnly > 0) {
    parts.push(`${stats.rightOnly} 个仅右侧`)
  }

  return parts.join('，')
}

/**
 * 计算进度百分比
 * @param current 当前值
 * @param total 总值
 * @returns 百分比 (0-100)
 */
export function calculateProgress(current: number, total: number): number {
  if (total === 0) return 0
  return Math.min(100, Math.round((current / total) * 100))
}

/**
 * 计算对比结果的摘要
 * @param comparison 目录对比结果
 * @returns 摘要对象
 */
export function getComparisonSummary(comparison: DirectoryComparison): {
  hasDifferences: boolean
  differenceCount: number
  summary: string
} {
  const stats = comparison.statistics
  const differenceCount = stats.modified + stats.leftOnly + stats.rightOnly

  return {
    hasDifferences: differenceCount > 0,
    differenceCount,
    summary: generateStatsSummary(stats)
  }
}

/**
 * 按状态筛选条目
 * @param entries 差异条目列表
 * @param status 状态
 * @returns 筛选后的条目
 */
export function filterByStatus(
  entries: DirectoryDiffEntry[],
  status: string
): DirectoryDiffEntry[] {
  const result: DirectoryDiffEntry[] = []

  function traverse(entries: DirectoryDiffEntry[]) {
    for (const entry of entries) {
      if (entry.status === status) {
        result.push(entry)
      }

      if (entry.children) {
        traverse(entry.children)
      }
    }
  }

  traverse(entries)
  return result
}

/**
 * 计算条目深度分布
 * @param entries 差异条目列表
 * @returns 各深度的条目数量
 */
export function computeDepthDistribution(
  entries: DirectoryDiffEntry[]
): Map<number, number> {
  const distribution = new Map<number, number>()

  function traverse(entries: DirectoryDiffEntry[]) {
    for (const entry of entries) {
      const count = distribution.get(entry.depth) || 0
      distribution.set(entry.depth, count + 1)

      if (entry.children) {
        traverse(entry.children)
      }
    }
  }

  traverse(entries)
  return distribution
}

/**
 * 计算文件类型分布
 * @param entries 差异条目列表
 * @returns 各扩展名的文件数量
 */
export function computeTypeDistribution(
  entries: DirectoryDiffEntry[]
): Map<string, number> {
  const distribution = new Map<string, number>()

  function traverse(entries: DirectoryDiffEntry[]) {
    for (const entry of entries) {
      if (entry.type === 'file') {
        const ext = entry.name.includes('.')
          ? entry.name.split('.').pop()?.toLowerCase() || 'no-extension'
          : 'no-extension'

        const count = distribution.get(ext) || 0
        distribution.set(ext, count + 1)
      }

      if (entry.children) {
        traverse(entry.children)
      }
    }
  }

  traverse(entries)
  return distribution
}
