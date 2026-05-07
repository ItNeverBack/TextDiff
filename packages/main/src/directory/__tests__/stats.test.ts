import { describe, it, expect } from 'vitest'
import type { DirectoryDiffEntry, DirectoryInfo } from '@shared/types'
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

describe('Directory Stats', () => {
  function createMockEntry(
    relativePath: string,
    type: 'file' | 'directory',
    status: DirectoryDiffEntry['status']
  ): DirectoryDiffEntry {
    return {
      id: `test-${relativePath}`,
      relativePath,
      name: relativePath.split('/').pop() || relativePath,
      type,
      status,
      leftPath: `/left/${relativePath}`,
      rightPath: `/right/${relativePath}`,
      depth: relativePath.split('/').length - 1
    }
  }

  describe('computeStatistics', () => {
    it('should compute statistics correctly', () => {
      const entries = [
        createMockEntry('file1.ts', 'file', 'equal'),
        createMockEntry('file2.ts', 'file', 'modified'),
        createMockEntry('file3.ts', 'file', 'left-only'),
        createMockEntry('file4.ts', 'file', 'right-only')
      ]

      const leftRoot: DirectoryInfo = {
        path: '/left',
        name: 'left',
        totalFiles: 3,
        totalSize: 1000,
        lastModified: new Date()
      }

      const rightRoot: DirectoryInfo = {
        path: '/right',
        name: 'right',
        totalFiles: 3,
        totalSize: 2000,
        lastModified: new Date()
      }

      const stats = computeStatistics(entries, leftRoot, rightRoot, Date.now() - 100)

      expect(stats.totalFiles).toBe(4)
      expect(stats.equal).toBe(1)
      expect(stats.modified).toBe(1)
      expect(stats.leftOnly).toBe(1)
      expect(stats.rightOnly).toBe(1)
      expect(stats.permissionChanged).toBe(0)
      expect(stats.totalSizeLeft).toBe(1000)
      expect(stats.totalSizeRight).toBe(2000)
      expect(stats.duration).toBeGreaterThanOrEqual(100)
    })

    it('should handle empty entries', () => {
      const leftRoot: DirectoryInfo = {
        path: '/left',
        name: 'left',
        totalFiles: 0,
        totalSize: 0,
        lastModified: new Date()
      }

      const rightRoot: DirectoryInfo = {
        path: '/right',
        name: 'right',
        totalFiles: 0,
        totalSize: 0,
        lastModified: new Date()
      }

      const stats = computeStatistics([], leftRoot, rightRoot, Date.now())

      expect(stats.totalFiles).toBe(0)
      expect(stats.totalDirectories).toBe(0)
      expect(stats.equal).toBe(0)
      expect(stats.modified).toBe(0)
      expect(stats.permissionChanged).toBe(0)
    })

    it('should count permission-changed files', () => {
      const entries = [
        createMockEntry('file1.ts', 'file', 'equal'),
        createMockEntry('file2.ts', 'file', 'permission-changed')
      ]

      const leftRoot: DirectoryInfo = {
        path: '/left',
        name: 'left',
        totalFiles: 2,
        totalSize: 100,
        lastModified: new Date()
      }

      const rightRoot: DirectoryInfo = {
        path: '/right',
        name: 'right',
        totalFiles: 2,
        totalSize: 100,
        lastModified: new Date()
      }

      const stats = computeStatistics(entries, leftRoot, rightRoot, Date.now())

      expect(stats.totalFiles).toBe(2)
      expect(stats.equal).toBe(1)
      expect(stats.permissionChanged).toBe(1)
    })

    it('should count directories', () => {
      const entries = [
        createMockEntry('src', 'directory', 'equal'),
        createMockEntry('src/file.ts', 'file', 'equal')
      ]

      const leftRoot: DirectoryInfo = {
        path: '/left',
        name: 'left',
        totalFiles: 1,
        totalSize: 100,
        lastModified: new Date()
      }

      const rightRoot: DirectoryInfo = {
        path: '/right',
        name: 'right',
        totalFiles: 1,
        totalSize: 100,
        lastModified: new Date()
      }

      const stats = computeStatistics(entries, leftRoot, rightRoot, Date.now())

      expect(stats.totalFiles).toBe(1)
      expect(stats.totalDirectories).toBe(1)
    })
  })

  describe('computeDiffStats', () => {
    it('should compute diff stats', () => {
      const entries = [
        createMockEntry('file1.ts', 'file', 'equal'),
        createMockEntry('file2.ts', 'file', 'modified'),
        createMockEntry('file3.ts', 'file', 'left-only'),
        createMockEntry('file4.ts', 'file', 'right-only'),
        createMockEntry('file5.ts', 'file', 'type-changed')
      ]

      const stats = computeDiffStats(entries)

      expect(stats.total).toBe(5)
      expect(stats.equal).toBe(1)
      expect(stats.modified).toBe(1)
      expect(stats.leftOnly).toBe(1)
      expect(stats.rightOnly).toBe(1)
      expect(stats.typeChanged).toBe(1)
    })

    it('should handle nested entries', () => {
      const entries: DirectoryDiffEntry[] = [
        {
          ...createMockEntry('src', 'directory', 'equal'),
          children: [
            createMockEntry('src/file1.ts', 'file', 'equal'),
            createMockEntry('src/file2.ts', 'file', 'modified')
          ]
        }
      ]

      const stats = computeDiffStats(entries)

      expect(stats.total).toBe(3)
      expect(stats.equal).toBe(2)
      expect(stats.modified).toBe(1)
    })
  })

  describe('createDirectoryInfo', () => {
    it('should create directory info', () => {
      const info = createDirectoryInfo(
        '/test/dir',
        'dir',
        10,
        1024,
        new Date('2024-01-01')
      )

      expect(info.path).toBe('/test/dir')
      expect(info.name).toBe('dir')
      expect(info.totalFiles).toBe(10)
      expect(info.totalSize).toBe(1024)
      expect(info.lastModified).toEqual(new Date('2024-01-01'))
    })
  })

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(0)).toBe('0 B')
      expect(formatFileSize(512)).toBe('512 B')
    })

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1536)).toBe('1.50 KB')
    })

    it('should format megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB')
    })

    it('should format gigabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
    })
  })

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms')
    })

    it('should format seconds', () => {
      expect(formatDuration(5000)).toBe('5s')
      expect(formatDuration(59000)).toBe('59s')
    })

    it('should format minutes', () => {
      expect(formatDuration(60000)).toBe('1m 0s')
      expect(formatDuration(90000)).toBe('1m 30s')
    })
  })

  describe('generateStatsSummary', () => {
    it('should generate summary', () => {
      const stats = {
        totalFiles: 10,
        totalDirectories: 2,
        leftOnly: 1,
        rightOnly: 1,
        modified: 2,
        equal: 6,
        totalSizeLeft: 1000,
        totalSizeRight: 2000,
        scannedAt: new Date(),
        duration: 1000
      }

      const summary = generateStatsSummary(stats)

      expect(summary).toContain('10')
      expect(summary).toContain('6')
      expect(summary).toContain('2')
      expect(summary).toContain('1')
    })

    it('should exclude zero counts', () => {
      const stats = {
        totalFiles: 5,
        totalDirectories: 0,
        leftOnly: 0,
        rightOnly: 0,
        modified: 0,
        equal: 5,
        totalSizeLeft: 1000,
        totalSizeRight: 1000,
        scannedAt: new Date(),
        duration: 500
      }

      const summary = generateStatsSummary(stats)

      expect(summary).toContain('5')
      expect(summary).not.toContain('仅左侧')
      expect(summary).not.toContain('仅右侧')
      expect(summary).not.toContain('修改')
    })
  })

  describe('calculateProgress', () => {
    it('should calculate progress percentage', () => {
      expect(calculateProgress(50, 100)).toBe(50)
      expect(calculateProgress(25, 100)).toBe(25)
      expect(calculateProgress(100, 100)).toBe(100)
    })

    it('should handle zero total', () => {
      expect(calculateProgress(0, 0)).toBe(0)
    })

    it('should cap at 100%', () => {
      expect(calculateProgress(150, 100)).toBe(100)
    })
  })

  describe('getComparisonSummary', () => {
    it('should return summary for comparison with differences', () => {
      const comparison = {
        id: 'test',
        leftRoot: createDirectoryInfo('/left', 'left', 5, 1000, new Date()),
        rightRoot: createDirectoryInfo('/right', 'right', 5, 1000, new Date()),
        entries: [],
        statistics: {
          totalFiles: 10,
          totalDirectories: 0,
          leftOnly: 2,
          rightOnly: 1,
          modified: 3,
          equal: 4,
          totalSizeLeft: 1000,
          totalSizeRight: 2000,
          scannedAt: new Date(),
          duration: 1000
        },
        completedAt: new Date(),
        options: {} as any
      }

      const summary = getComparisonSummary(comparison)

      expect(summary.hasDifferences).toBe(true)
      expect(summary.differenceCount).toBe(6)
      expect(summary.summary).toBeDefined()
    })

    it('should return summary for identical comparison', () => {
      const comparison = {
        id: 'test',
        leftRoot: createDirectoryInfo('/left', 'left', 5, 1000, new Date()),
        rightRoot: createDirectoryInfo('/right', 'right', 5, 1000, new Date()),
        entries: [],
        statistics: {
          totalFiles: 5,
          totalDirectories: 0,
          leftOnly: 0,
          rightOnly: 0,
          modified: 0,
          equal: 5,
          totalSizeLeft: 1000,
          totalSizeRight: 1000,
          scannedAt: new Date(),
          duration: 500
        },
        completedAt: new Date(),
        options: {} as any
      }

      const summary = getComparisonSummary(comparison)

      expect(summary.hasDifferences).toBe(false)
      expect(summary.differenceCount).toBe(0)
    })
  })

  describe('filterByStatus', () => {
    it('should filter entries by status', () => {
      const entries = [
        createMockEntry('file1.ts', 'file', 'equal'),
        createMockEntry('file2.ts', 'file', 'modified'),
        createMockEntry('file3.ts', 'file', 'modified')
      ]

      const result = filterByStatus(entries, 'modified')

      expect(result.length).toBe(2)
      expect(result.every(e => e.status === 'modified')).toBe(true)
    })

    it('should handle nested entries', () => {
      const entries: DirectoryDiffEntry[] = [
        {
          ...createMockEntry('src', 'directory', 'equal'),
          children: [
            createMockEntry('src/file1.ts', 'file', 'equal'),
            createMockEntry('src/file2.ts', 'file', 'modified')
          ]
        }
      ]

      const result = filterByStatus(entries, 'modified')

      expect(result.length).toBe(1)
      expect(result[0].name).toBe('file2.ts')
    })
  })

  describe('computeDepthDistribution', () => {
    it('should compute depth distribution', () => {
      const entries: DirectoryDiffEntry[] = [
        { ...createMockEntry('level0', 'directory', 'equal'), depth: 0 },
        { ...createMockEntry('level0/level1', 'directory', 'equal'), depth: 1 },
        { ...createMockEntry('level0/level1/file.ts', 'file', 'equal'), depth: 2 },
        { ...createMockEntry('level0/file.ts', 'file', 'equal'), depth: 1 }
      ]

      const distribution = computeDepthDistribution(entries)

      expect(distribution.get(0)).toBe(1)
      expect(distribution.get(1)).toBe(2)
      expect(distribution.get(2)).toBe(1)
    })
  })

  describe('computeTypeDistribution', () => {
    it('should compute file type distribution', () => {
      const entries = [
        createMockEntry('file.ts', 'file', 'equal'),
        createMockEntry('file.tsx', 'file', 'equal'),
        createMockEntry('file.js', 'file', 'equal'),
        createMockEntry('README', 'file', 'equal') // no extension
      ]

      const distribution = computeTypeDistribution(entries)

      expect(distribution.get('ts')).toBe(1)
      expect(distribution.get('tsx')).toBe(1)
      expect(distribution.get('js')).toBe(1)
      expect(distribution.get('no-extension')).toBe(1)
    })

    it('should handle nested entries', () => {
      const entries: DirectoryDiffEntry[] = [
        {
          ...createMockEntry('src', 'directory', 'equal'),
          children: [
            createMockEntry('src/index.ts', 'file', 'equal'),
            createMockEntry('src/utils.ts', 'file', 'equal')
          ]
        }
      ]

      const distribution = computeTypeDistribution(entries)

      expect(distribution.get('ts')).toBe(2)
    })
  })
})
