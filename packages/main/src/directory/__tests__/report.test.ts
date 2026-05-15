import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ReportGenerator,
  generateReport,
  generateHtmlReport,
  generateJsonReport,
  generateCsvReport,
  generateXmlReport,
  DEFAULT_REPORT_OPTIONS
} from '../report'
import type { DirectoryComparison, DirectoryDiffEntry } from '@shared/types'
import * as fs from 'fs'

// Mock fs
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}))

describe('ReportGenerator', () => {
  const mockEntries: DirectoryDiffEntry[] = [
    {
      id: '1',
      name: 'file1.txt',
      type: 'file',
      status: 'equal',
      relativePath: 'file1.txt',
      leftMetadata: { size: 100, modifiedTime: new Date('2024-01-01') },
      rightMetadata: { size: 100, modifiedTime: new Date('2024-01-01') },
    } as DirectoryDiffEntry,
    {
      id: '2',
      name: 'file2.txt',
      type: 'file',
      status: 'modified',
      relativePath: 'file2.txt',
      leftMetadata: { size: 200, modifiedTime: new Date('2024-01-01') },
      rightMetadata: { size: 250, modifiedTime: new Date('2024-01-02') },
    } as DirectoryDiffEntry,
    {
      id: '3',
      name: 'folder1',
      type: 'directory',
      status: 'left-only',
      relativePath: 'folder1',
      children: [
        {
          id: '4',
          name: 'file3.txt',
          type: 'file',
          status: 'left-only',
          relativePath: 'folder1/file3.txt',
          parentId: '3',
        } as DirectoryDiffEntry,
      ],
    } as DirectoryDiffEntry,
  ]

  const mockComparison: DirectoryComparison = {
    id: 'compare-1',
    leftRoot: {
      path: '/left',
      name: 'left',
      totalFiles: 10,
      totalSize: 1024,
      modifiedTime: new Date('2024-01-01'),
    },
    rightRoot: {
      path: '/right',
      name: 'right',
      totalFiles: 8,
      totalSize: 900,
      modifiedTime: new Date('2024-01-01'),
    },
    entries: mockEntries,
    statistics: {
      totalFiles: 10,
      totalDirectories: 5,
      equal: 3,
      modified: 2,
      leftOnly: 3,
      rightOnly: 2,
      totalSizeLeft: 1024,
      totalSizeRight: 900,
      duration: 1500,
    },
    completedAt: new Date('2024-01-15T10:30:00'),
    options: {} as any,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should use default options', () => {
      const generator = new ReportGenerator()
      const report = generator.generate(mockComparison)

      expect(report).toContain('html')
    })

    it('should merge custom options', () => {
      const generator = new ReportGenerator({ format: 'json' })
      const report = generator.generate(mockComparison)

      expect(() => JSON.parse(report)).not.toThrow()
    })
  })

  describe('HTML report', () => {
    it('should generate HTML report inline when template not found', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const generator = new ReportGenerator({ format: 'html' })
      const report = generator.generate(mockComparison)

      expect(report).toContain('<!DOCTYPE html>')
      expect(report).toContain('目录对比报告')
      expect(report).toContain('/left')
      expect(report).toContain('/right')
    })

    it('should use template when available', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(`
        <html>
          <head><title>{{title}}</title></head>
          <body>
            <h1>{{{headerTitle}}}</h1>
            <p>Left: {{leftPath}}</p>
            <p>Right: {{rightPath}}>
            {{summaryHtml}}
          </body>
        </html>
      `)

      const generator = new ReportGenerator({ format: 'html' })
      const report = generator.generate(mockComparison)

      expect(report).toContain('目录对比报告')
      expect(report).toContain('/left')
      expect(report).toContain('/right')
    })

    it('should include statistics in HTML', () => {
      const generator = new ReportGenerator({ format: 'html' })
      const report = generator.generate(mockComparison)

      expect(report).toContain('10') // total files
      expect(report).toContain('2') // modified
      expect(report).toContain('3') // left only
    })

    it('should escape HTML in entry names', () => {
      const comparisonWithHtml = {
        ...mockComparison,
        entries: [
          {
            ...mockEntries[0],
            name: '<script>alert("xss")</script>',
          },
        ],
      }

      const generator = new ReportGenerator({ format: 'html' })
      const report = generator.generate(comparisonWithHtml as any)

      expect(report).toContain('&lt;script&gt;')
      expect(report).not.toContain('<script>alert')
    })
  })

  describe('JSON report', () => {
    it('should generate valid JSON', () => {
      const generator = new ReportGenerator({ format: 'json' })
      const report = generator.generate(mockComparison)

      const parsed = JSON.parse(report)
      expect(parsed.meta.leftPath).toBe('/left')
      expect(parsed.meta.rightPath).toBe('/right')
      expect(parsed.statistics.totalFiles).toBe(10)
      expect(parsed.entries).toHaveLength(3)
    })

    it('should simplify entries in JSON', () => {
      const generator = new ReportGenerator({ format: 'json' })
      const report = generator.generate(mockComparison)

      const parsed = JSON.parse(report)
      const entry = parsed.entries[0]

      expect(entry).toHaveProperty('relativePath')
      expect(entry).toHaveProperty('name')
      expect(entry).toHaveProperty('type')
      expect(entry).toHaveProperty('status')
      expect(entry).not.toHaveProperty('leftPath')
      expect(entry).not.toHaveProperty('rightPath')
    })

    it('should format dates as ISO strings', () => {
      const generator = new ReportGenerator({ format: 'json' })
      const report = generator.generate(mockComparison)

      const parsed = JSON.parse(report)
      expect(parsed.meta.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}/)
    })
  })

  describe('CSV report', () => {
    it('should generate valid CSV', () => {
      const generator = new ReportGenerator({ format: 'csv' })
      const report = generator.generate(mockComparison)

      const lines = report.split('\n')
      expect(lines[0]).toContain('Relative Path,Name,Type,Status')
      expect(lines).toHaveLength(4) // header + 3 entries
    })

    it('should escape CSV fields with commas', () => {
      const comparisonWithComma = {
        ...mockComparison,
        entries: [
          {
            ...mockEntries[0],
            name: 'file, with comma.txt',
          },
        ],
      }

      const generator = new ReportGenerator({ format: 'csv' })
      const report = generator.generate(comparisonWithComma as any)

      expect(report).toContain('"file, with comma.txt"')
    })

    it('should escape CSV fields with quotes', () => {
      const comparisonWithQuote = {
        ...mockComparison,
        entries: [
          {
            ...mockEntries[0],
            name: 'file "quoted".txt',
          },
        ],
      }

      const generator = new ReportGenerator({ format: 'csv' })
      const report = generator.generate(comparisonWithQuote as any)

      expect(report).toContain('"file ""quoted"".txt"')
    })
  })

  describe('XML report', () => {
    it('should generate valid XML', () => {
      const generator = new ReportGenerator({ format: 'xml' })
      const report = generator.generate(mockComparison)

      expect(report).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(report).toContain('<directoryComparison>')
      expect(report).toContain('<leftPath>/left</leftPath>')
      expect(report).toContain('<rightPath>/right</rightPath>')
    })

    it('should include entry details', () => {
      const generator = new ReportGenerator({ format: 'xml' })
      const report = generator.generate(mockComparison)

      expect(report).toContain('<entry>')
      expect(report).toContain('<name>file1.txt</name>')
      expect(report).toContain('<status>equal</status>')
    })

    it('should escape XML special characters', () => {
      const comparisonWithSpecialChars = {
        ...mockComparison,
        leftRoot: {
          ...mockComparison.leftRoot,
          path: '/path<with>special>&chars',
        },
      }

      const generator = new ReportGenerator({ format: 'xml' })
      const report = generator.generate(comparisonWithSpecialChars as any)

      expect(report).toContain('/path&lt;with&gt;special&gt;&amp;chars')
    })
  })

  describe('filter entries', () => {
    it('should include equal entries when option is set', () => {
      const generator = new ReportGenerator({ format: 'json', includeEqual: true })
      const report = generator.generate(mockComparison)

      const parsed = JSON.parse(report)
      expect(parsed.entries.length).toBe(3)
    })

    it('should exclude equal entries by default', () => {
      const generator = new ReportGenerator({ format: 'json', includeEqual: false })
      const report = generator.generate(mockComparison)

      const parsed = JSON.parse(report)
      expect(parsed.entries.length).toBe(2) // modified and left-only
      expect(parsed.entries.every((e: any) => e.status !== 'equal')).toBe(true)
    })

    it('should include parent directories even if filtered', () => {
      const entriesWithFilteredParent = [
        {
          id: '1',
          name: 'parent',
          type: 'directory',
          status: 'equal',
          relativePath: 'parent',
          children: [
            {
              id: '2',
              name: 'child.txt',
              type: 'file',
              status: 'modified',
              relativePath: 'parent/child.txt',
              parentId: '1',
            } as DirectoryDiffEntry,
          ],
        } as DirectoryDiffEntry,
      ]

      const comparison = {
        ...mockComparison,
        entries: entriesWithFilteredParent,
      }

      const generator = new ReportGenerator({ format: 'json', includeEqual: false })
      const report = generator.generate(comparison)

      const parsed = JSON.parse(report)
      expect(parsed.entries.length).toBe(1)
      expect(parsed.entries[0].name).toBe('parent')
      expect(parsed.entries[0].children.length).toBe(1)
    })
  })

  describe('convenience functions', () => {
    it('should generate report with default options', () => {
      const report = generateReport(mockComparison)
      expect(report).toContain('<html>')
    })

    it('should generate HTML report', () => {
      const report = generateHtmlReport(mockComparison)
      expect(report).toContain('<html>')
    })

    it('should generate JSON report', () => {
      const report = generateJsonReport(mockComparison)
      expect(() => JSON.parse(report)).not.toThrow()
    })

    it('should generate CSV report', () => {
      const report = generateCsvReport(mockComparison)
      expect(report).toContain('Relative Path')
    })

    it('should generate XML report', () => {
      const report = generateXmlReport(mockComparison)
      expect(report).toContain('<?xml')
    })
  })

  describe('default options', () => {
    it('should have correct default options', () => {
      expect(DEFAULT_REPORT_OPTIONS).toEqual({
        format: 'html',
        includeEqual: false,
        includeContent: false,
        maxContentLength: 1000,
      })
    })
  })

  describe('unsupported format', () => {
    it('should throw error for unsupported format', () => {
      const generator = new ReportGenerator({ format: 'pdf' as any })

      expect(() => generator.generate(mockComparison)).toThrow('Unsupported report format')
    })
  })
})
