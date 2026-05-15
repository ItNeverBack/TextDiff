import { describe, it, expect } from 'vitest'
import {
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
} from '../stats'
import type { DirectoryDiffEntry, DirectoryInfo, DirectoryComparison } from '@shared/types'

describe('computeStatistics', () => {
  const mockLeftRoot: DirectoryInfo = {
    path: '/left',
    name: 'left',
    totalFiles: 10,
    totalSize: 1024,
    lastModified: new Date()
  }

  const mockRightRoot: DirectoryInfo = {
    path: '/right',
    name: 'right',
    totalFiles: 8,
    totalSize: 2048,
    lastModified: new Date()
  }

  it('空条目返回全零统计', () => {
    const startTime = Date.now()
    const stats = computeStatistics([], mockLeftRoot, mockRightRoot, startTime)

    expect(stats.totalFiles).toBe(0)
    expect(stats.totalDirectories).toBe(0)
    expect(stats.leftOnly).toBe(0)
    expect(stats.rightOnly).toBe(0)
    expect(stats.modified).toBe(0)
    expect(stats.equal).toBe(0)
    expect(stats.totalSizeLeft).toBe(1024)
    expect(stats.totalSizeRight).toBe(2048)
    expect(stats.duration).toBeGreaterThanOrEqual(0)
  })

  it('正确统计各类状态数量', () => {
    const entries: DirectoryDiffEntry[] = [
      { id: '1', name: 'file1.txt', type: 'file', path: '/file1.txt', depth: 0, status: 'equal', relativePath: 'file1.txt' },
      { id: '2', name: 'file2.txt', type: 'file', path: '/file2.txt', depth: 0, status: 'modified', relativePath: 'file2.txt' },
      { id: '3', name: 'file3.txt', type: 'file', path: '/file3.txt', depth: 0, status: 'left-only', relativePath: 'file3.txt' },
      { id: '4', name: 'file4.txt', type: 'file', path: '/file4.txt', depth: 0, status: 'right-only', relativePath: 'file4.txt' },
      { id: '5', name: 'dir1', type: 'directory', path: '/dir1', depth: 0, status: 'equal', relativePath: 'dir1' }
    ]

    const startTime = Date.now()
    const stats = computeStatistics(entries, mockLeftRoot, mockRightRoot, startTime)

    expect(stats.totalFiles).toBe(4)
    expect(stats.totalDirectories).toBe(1)
    expect(stats.equal).toBe(1)
    expect(stats.modified).toBe(1)
    expect(stats.leftOnly).toBe(1)
    expect(stats.rightOnly).toBe(1)
  })

  it('递归统计子目录', () => {
    const entries: DirectoryDiffEntry[] = [
      {
        id: '1',
        name: 'dir1',
        type: 'directory',
        path: '/dir1',
        depth: 0,
        status: 'equal',
        relativePath: 'dir1',
        children: [
          { id: '2', name: 'child1.txt', type: 'file', path: '/dir1/child1.txt', depth: 1, status: 'equal', relativePath: 'dir1/child1.txt' },
          { id: '3', name: 'child2.txt', type: 'file', path: '/dir1/child2.txt', depth: 1, status: 'modified', relativePath: 'dir1/child2.txt' }
        ]
      }
    ]

    const startTime = Date.now()
    const stats = computeStatistics(entries, mockLeftRoot, mockRightRoot, startTime)

    expect(stats.totalFiles).toBe(2)
    expect(stats.totalDirectories).toBe(1)
    expect(stats.equal).toBe(1)
    expect(stats.modified).toBe(1)
  })

  it('统计 permission-changed 状态', () => {
    const entries: DirectoryDiffEntry[] = [
      { id: '1', name: 'file1.txt', type: 'file', path: '/file1.txt', depth: 0, status: 'permission-changed', relativePath: 'file1.txt' }
    ]

    const startTime = Date.now()
    const stats = computeStatistics(entries, mockLeftRoot, mockRightRoot, startTime)

    expect(stats.totalFiles).toBe(1)
    expect(stats.permissionChanged).toBe(1)
  })
})

describe('computeDiffStats', () => {
  it('空条目返回全零统计', () => {
    const stats = computeDiffStats([])

    expect(stats.total).toBe(0)
    expect(stats.equal).toBe(0)
    expect(stats.modified).toBe(0)
    expect(stats.leftOnly).toBe(0)
    expect(stats.rightOnly).toBe(0)
    expect(stats.typeChanged).toBe(0)
  })

  it('正确统计各类状态', () => {
    const entries: DirectoryDiffEntry[] = [
      { id: '1', name: 'file1.txt', type: 'file', path: '/file1.txt', depth: 0, status: 'equal', relativePath: 'file1.txt' },
      { id: '2', name: 'file2.txt', type: 'file', path: '/file2.txt', depth: 0, status: 'equal', relativePath: 'file2.txt' },
      { id: '3', name: 'file3.txt', type: 'file', path: '/file3.txt', depth: 0, status: 'modified', relativePath: 'file3.txt' },
      { id: '4', name: 'file4.txt', type: 'file', path: '/file4.txt', depth: 0, status: 'left-only', relativePath: 'file4.txt' },
      { id: '5', name: 'file5.txt', type: 'file', path: '/file5.txt', depth: 0, status: 'right-only', relativePath: 'file5.txt' },
      { id: '6', name: 'file6.txt', type: 'file', path: '/file6.txt', depth: 0, status: 'type-changed', relativePath: 'file6.txt' }
    ]

    const stats = computeDiffStats(entries)

    expect(stats.total).toBe(6)
    expect(stats.equal).toBe(2)
    expect(stats.modified).toBe(1)
    expect(stats.leftOnly).toBe(1)
    expect(stats.rightOnly).toBe(1)
    expect(stats.typeChanged).toBe(1)
  })

  it('递归统计子目录', () => {
    const entries: DirectoryDiffEntry[] = [
      {
        id: '1',
        name: 'dir1',
        type: 'directory',
        path: '/dir1',
        depth: 0,
        status: 'equal',
        relativePath: 'dir1',
        children: [
          { id: '2', name: 'child1.txt', type: 'file', path: '/dir1/child1.txt', depth: 1, status: 'equal', relativePath: 'dir1/child1.txt' },
          { id: '3', name: 'child2.txt', type: 'file', path: '/dir1/child2.txt', depth: 1, status: 'modified', relativePath: 'dir1/child2.txt' },
          { id: '4', name: 'child3.txt', type: 'file', path: '/dir1/child3.txt', depth: 1, status: 'left-only', relativePath: 'dir1/child3.txt' }
        ]
      }
    ]

    const stats = computeDiffStats(entries)

    expect(stats.total).toBe(4)
    expect(stats.equal).toBe(2)
    expect(stats.modified).toBe(1)
    expect(stats.leftOnly).toBe(1)
  })
})

describe('createDirectoryInfo', () => {
  it('创建目录信息对象', () => {
    const lastModified = new Date('2024-01-01')
    const info = createDirectoryInfo('/path/to/dir', 'dir', 10, 1024, lastModified)

    expect(info.path).toBe('/path/to/dir')
    expect(info.name).toBe('dir')
    expect(info.totalFiles).toBe(10)
    expect(info.totalSize).toBe(1024)
    expect(info.lastModified).toBe(lastModified)
  })
})

describe('formatFileSize', () => {
  it('0 bytes 显示 "0 B"', () => {
    expect(formatFileSize(0)).toBe('0 B')
  })

  it('B 单位显示整数', () => {
    expect(formatFileSize(100)).toBe('100 B')
  })

  it('1024 bytes 显示 "1 KB"', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
  })

  it('1.5 KB 显示小数', () => {
    expect(formatFileSize(1536)).toBe('1.50 KB')
  })

  it('1048576 bytes 显示 "1 MB"', () => {
    expect(formatFileSize(1048576)).toBe('1 MB')
  })

  it('1.5 MB 显示小数', () => {
    expect(formatFileSize(1572864)).toMatch(/^1.50 MB$/)
  })

  it('1073741824 bytes 显示 "1 GB"', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB')
  })

  it('超大文件显示 TB', () => {
    expect(formatFileSize(1099511627776)).toBe('1 TB')
  })
})

describe('formatDuration', () => {
  it('小于1秒显示毫秒', () => {
    expect(formatDuration(500)).toBe('500ms')
  })

  it('1秒显示秒', () => {
    expect(formatDuration(1000)).toBe('1s')
  })

  it('30秒显示秒', () => {
    expect(formatDuration(30000)).toBe('30s')
  })

  it('1分钟显示分钟和秒', () => {
    expect(formatDuration(60000)).toBe('1m 0s')
  })

  it('90秒显示分钟和秒', () => {
    expect(formatDuration(90000)).toBe('1m 30s')
  })

  it('5分钟显示分钟和秒', () => {
    expect(formatDuration(300000)).toBe('5m 0s')
  })
})

describe('generateStatsSummary', () => {
  it('生成统计摘要', () => {
    const stats = {
      totalFiles: 10,
      totalDirectories: 2,
      leftOnly: 3,
      rightOnly: 2,
      modified: 4,
      equal: 1,
      permissionChanged: 0,
      totalSizeLeft: 1024,
      totalSizeRight: 2048,
      scannedAt: new Date(),
      duration: 1000
    }

    const summary = generateStatsSummary(stats)

    expect(summary).toContain('10 个文件')
    expect(summary).toContain('1 个相同')
    expect(summary).toContain('4 个修改')
    expect(summary).toContain('3 个仅左侧')
    expect(summary).toContain('2 个仅右侧')
  })

  it('跳过为零的统计', () => {
    const stats = {
      totalFiles: 5,
      totalDirectories: 0,
      leftOnly: 0,
      rightOnly: 0,
      modified: 0,
      equal: 5,
      permissionChanged: 0,
      totalSizeLeft: 1024,
      totalSizeRight: 1024,
      scannedAt: new Date(),
      duration: 500
    }

    const summary = generateStatsSummary(stats)

    expect(summary).toBe('共 5 个文件，5 个相同')
    expect(summary).not.toContain('修改')
    expect(summary).not.toContain('仅左侧')
    expect(summary).not.toContain('仅右侧')
  })
})

describe('calculateProgress', () => {
  it('total为0返回0', () => {
    expect(calculateProgress(0, 0)).toBe(0)
    expect(calculateProgress(5, 0)).toBe(0)
  })

  it('计算正确百分比', () => {
    expect(calculateProgress(50, 100)).toBe(50)
    expect(calculateProgress(25, 100)).toBe(25)
    expect(calculateProgress(75, 100)).toBe(75)
  })

  it('四舍五入到整数', () => {
    expect(calculateProgress(33, 100)).toBe(33)
    expect(calculateProgress(66, 100)).toBe(66)
  })

  it('不超过100%', () => {
    expect(calculateProgress(150, 100)).toBe(100)
    expect(calculateProgress(200, 100)).toBe(100)
  })

  it('0%正确显示', () => {
    expect(calculateProgress(0, 100)).toBe(0)
  })
})

describe('getComparisonSummary', () => {
  it('有差异时返回正确摘要', () => {
    const comparison = {
      entries: [],
      statistics: {
        totalFiles: 10,
        totalDirectories: 2,
        leftOnly: 3,
        rightOnly: 2,
        modified: 4,
        equal: 1,
        permissionChanged: 0,
        totalSizeLeft: 1024,
        totalSizeRight: 2048,
        scannedAt: new Date(),
        duration: 1000
      },
      leftRoot: { path: '/left', name: 'left', totalFiles: 10, totalSize: 1024, lastModified: new Date() },
      rightRoot: { path: '/right', name: 'right', totalFiles: 8, totalSize: 2048, lastModified: new Date() }
    } as DirectoryComparison

    const summary = getComparisonSummary(comparison)

    expect(summary.hasDifferences).toBe(true)
    expect(summary.differenceCount).toBe(9)
    expect(summary.summary).toContain('10 个文件')
  })

  it('无差异时正确标识', () => {
    const comparison = {
      entries: [],
      statistics: {
        totalFiles: 5,
        totalDirectories: 1,
        leftOnly: 0,
        rightOnly: 0,
        modified: 0,
        equal: 5,
        permissionChanged: 0,
        totalSizeLeft: 1024,
        totalSizeRight: 1024,
        scannedAt: new Date(),
        duration: 500
      },
      leftRoot: { path: '/left', name: 'left', totalFiles: 5, totalSize: 1024, lastModified: new Date() },
      rightRoot: { path: '/right', name: 'right', totalFiles: 5, totalSize: 1024, lastModified: new Date() }
    } as DirectoryComparison

    const summary = getComparisonSummary(comparison)

    expect(summary.hasDifferences).toBe(false)
    expect(summary.differenceCount).toBe(0)
  })
})

describe('filterByStatus', () => {
  const entries: DirectoryDiffEntry[] = [
    { id: '1', name: 'equal.txt', type: 'file', path: '/equal.txt', depth: 0, status: 'equal', relativePath: 'equal.txt' },
    { id: '2', name: 'modified.txt', type: 'file', path: '/modified.txt', depth: 0, status: 'modified', relativePath: 'modified.txt' },
    { id: '3', name: 'left.txt', type: 'file', path: '/left.txt', depth: 0, status: 'left-only', relativePath: 'left.txt' },
    {
      id: '4',
      name: 'dir',
      type: 'directory',
      path: '/dir',
      depth: 0,
      status: 'equal',
      relativePath: 'dir',
      children: [
        { id: '5', name: 'child.txt', type: 'file', path: '/dir/child.txt', depth: 1, status: 'modified', relativePath: 'dir/child.txt' }
      ]
    }
  ]

  it('按 equal 状态筛选', () => {
    const filtered = filterByStatus(entries, 'equal')
    expect(filtered).toHaveLength(2)
    expect(filtered[0].name).toBe('equal.txt')
    expect(filtered[1].name).toBe('dir')
  })

  it('按 modified 状态筛选', () => {
    const filtered = filterByStatus(entries, 'modified')
    expect(filtered).toHaveLength(2)
    expect(filtered.map(e => e.name)).toContain('modified.txt')
    expect(filtered.map(e => e.name)).toContain('child.txt')
  })

  it('按 left-only 状态筛选', () => {
    const filtered = filterByStatus(entries, 'left-only')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].name).toBe('left.txt')
  })

  it('无匹配返回空数组', () => {
    const filtered = filterByStatus(entries, 'right-only')
    expect(filtered).toHaveLength(0)
  })
})

describe('computeDepthDistribution', () => {
  it('计算深度分布', () => {
    const entries: DirectoryDiffEntry[] = [
      { id: '1', name: 'root1.txt', type: 'file', path: '/root1.txt', depth: 0, status: 'equal', relativePath: 'root1.txt' },
      { id: '2', name: 'root2.txt', type: 'file', path: '/root2.txt', depth: 0, status: 'equal', relativePath: 'root2.txt' },
      {
        id: '3',
        name: 'dir',
        type: 'directory',
        path: '/dir',
        depth: 0,
        status: 'equal',
        relativePath: 'dir',
        children: [
          { id: '4', name: 'level1.txt', type: 'file', path: '/dir/level1.txt', depth: 1, status: 'equal', relativePath: 'dir/level1.txt' },
          {
            id: '5',
            name: 'subdir',
            type: 'directory',
            path: '/dir/subdir',
            depth: 1,
            status: 'equal',
            relativePath: 'dir/subdir',
            children: [
              { id: '6', name: 'level2.txt', type: 'file', path: '/dir/subdir/level2.txt', depth: 2, status: 'equal', relativePath: 'dir/subdir/level2.txt' }
            ]
          }
        ]
      }
    ]

    const distribution = computeDepthDistribution(entries)

    expect(distribution.get(0)).toBe(3)
    expect(distribution.get(1)).toBe(2)
    expect(distribution.get(2)).toBe(1)
  })

  it('空条目返回空Map', () => {
    const distribution = computeDepthDistribution([])
    expect(distribution.size).toBe(0)
  })
})

describe('computeTypeDistribution', () => {
  it('计算文件类型分布', () => {
    const entries: DirectoryDiffEntry[] = [
      { id: '1', name: 'file1.txt', type: 'file', path: '/file1.txt', depth: 0, status: 'equal', relativePath: 'file1.txt' },
      { id: '2', name: 'file2.txt', type: 'file', path: '/file2.txt', depth: 0, status: 'equal', relativePath: 'file2.txt' },
      { id: '3', name: 'file3.js', type: 'file', path: '/file3.js', depth: 0, status: 'equal', relativePath: 'file3.js' },
      { id: '4', name: 'file4.js', type: 'file', path: '/file4.js', depth: 0, status: 'equal', relativePath: 'file4.js' },
      { id: '5', name: 'file5.js', type: 'file', path: '/file5.js', depth: 0, status: 'equal', relativePath: 'file5.js' },
      { id: '6', name: 'file6.ts', type: 'file', path: '/file6.ts', depth: 0, status: 'equal', relativePath: 'file6.ts' },
      { id: '7', name: 'README', type: 'file', path: '/README', depth: 0, status: 'equal', relativePath: 'README' },
      {
        id: '8',
        name: 'dir',
        type: 'directory',
        path: '/dir',
        depth: 0,
        status: 'equal',
        relativePath: 'dir',
        children: [
          { id: '9', name: 'child.txt', type: 'file', path: '/dir/child.txt', depth: 1, status: 'equal', relativePath: 'dir/child.txt' }
        ]
      }
    ]

    const distribution = computeTypeDistribution(entries)

    expect(distribution.get('txt')).toBe(3)
    expect(distribution.get('js')).toBe(3)
    expect(distribution.get('ts')).toBe(1)
    expect(distribution.get('no-extension')).toBe(1)
  })

  it('忽略目录', () => {
    const entries: DirectoryDiffEntry[] = [
      {
        id: '1',
        name: 'dir',
        type: 'directory',
        path: '/dir',
        depth: 0,
        status: 'equal',
        relativePath: 'dir'
      }
    ]

    const distribution = computeTypeDistribution(entries)
    expect(distribution.size).toBe(0)
  })

  it('区分大小写扩展名', () => {
    const entries: DirectoryDiffEntry[] = [
      { id: '1', name: 'file.TXT', type: 'file', path: '/file.TXT', depth: 0, status: 'equal', relativePath: 'file.TXT' },
      { id: '2', name: 'file.txt', type: 'file', path: '/file.txt', depth: 0, status: 'equal', relativePath: 'file.txt' }
    ]

    const distribution = computeTypeDistribution(entries)

    expect(distribution.get('txt')).toBe(2)
  })
})
