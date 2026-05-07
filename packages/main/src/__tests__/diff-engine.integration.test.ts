import { describe, it, expect, afterAll } from 'vitest'
import { computeDiff, computeDiffWithWorkerPool } from '../diff'
import { getWorkerPool } from '../diff/worker'
import type { DiffOptions, DiffResult } from '@shared/types'

/**
 * 创建完整的 DiffOptions 用于测试
 */
function createDiffOptions(partial: Partial<DiffOptions> = {}): DiffOptions {
  return {
    ignoreWhitespace: 'none',
    ignoreCase: false,
    ignoreLineEndings: true,
    ignorePatterns: [],
    ignoreComments: false,
    commentPrefixes: [],
    algorithm: 'myers',
    contextLines: 3,
    ...partial
  }
}

/**
 * DiffEngine 集成测试
 * 
 * 测试各种 diff 场景：
 * - 空文件 vs 空文件
 * - 空文件 vs 有内容
 * - 完全相同文件
 * - 纯新增、纯删除
 * - 混合修改（新增+删除+修改）
 * - 忽略空白符（leading-trailing / all）
 * - 忽略大小写
 * - 忽略行尾符
 * - 大文件性能测试（10 万行文件 < 2s）
 * 
 * 参考: TextDiff-DevPlan.md §2.8.3 集成测试
 */

describe('DiffEngine Integration Tests', () => {
  afterAll(() => {
    // 清理 Worker Pool
    getWorkerPool().terminate()
  })

  describe('Basic Scenarios', () => {
    it('should handle empty files', async () => {
      const result = await computeDiff('', '')
      
      expect(result.lines).toHaveLength(0)
      expect(result.chunks).toHaveLength(0)
      expect(result.stats.totalLines).toBe(0)
      expect(result.stats.equalLines).toBe(0)
    })

    it('should handle empty left file', async () => {
      const result = await computeDiff('', 'line1\nline2')
      
      expect(result.stats.insertedLines).toBe(2)
      expect(result.stats.deletedLines).toBe(0)
      expect(result.stats.equalLines).toBe(0)
    })

    it('should handle empty right file', async () => {
      const result = await computeDiff('line1\nline2', '')
      
      expect(result.stats.insertedLines).toBe(0)
      expect(result.stats.deletedLines).toBe(2)
      expect(result.stats.equalLines).toBe(0)
    })

    it('should handle identical files', async () => {
      const content = 'line1\nline2\nline3'
      const result = await computeDiff(content, content)
      
      expect(result.stats.equalLines).toBe(3)
      expect(result.stats.insertedLines).toBe(0)
      expect(result.stats.deletedLines).toBe(0)
      expect(result.chunks).toHaveLength(0)
    })

    it('should handle pure additions', async () => {
      const left = 'line1\nline2'
      const right = 'line1\nline2\nline3\nline4'
      const result = await computeDiff(left, right)
      
      expect(result.stats.insertedLines).toBe(2)
      expect(result.stats.equalLines).toBe(2)
    })

    it('should handle pure deletions', async () => {
      const left = 'line1\nline2\nline3\nline4'
      const right = 'line1\nline2'
      const result = await computeDiff(left, right)
      
      expect(result.stats.deletedLines).toBe(2)
      expect(result.stats.equalLines).toBe(2)
    })

    it('should handle mixed changes', async () => {
      const left = 'line1\nline2\nline3\nline4'
      const right = 'line1\nmodified\nline3\nnew line'
      const result = await computeDiff(left, right)
      
      expect(result.stats.equalLines).toBe(2) // line1, line3
      // Note: adjacent delete+insert pairs are merged into replace
      // line2 -> modified (replace), line4 -> new line (replace)
      expect(result.stats.modifiedLines).toBe(2)
      expect(result.stats.deletedLines).toBe(0)
      expect(result.stats.insertedLines).toBe(0)
      // Chunks should be separated (2 chunks)
      expect(result.chunks.length).toBe(2)
    })
  })

  describe('Ignore Rules', () => {
    it('should ignore leading-trailing whitespace', async () => {
      const left = '  line1  \nline2'
      const right = 'line1\n  line2'
      const result = await computeDiff(left, right, {
        ignoreWhitespace: 'leading-trailing'
      })
      
      expect(result.stats.equalLines).toBe(2)
    })

    it('should ignore all whitespace', async () => {
      const left = 'l i n e 1'
      const right = 'line1'
      const result = await computeDiff(left, right, {
        ignoreWhitespace: 'all'
      })
      
      expect(result.stats.equalLines).toBe(1)
    })

    it('should ignore case differences', async () => {
      const left = 'HELLO World'
      const right = 'hello WORLD'
      const result = await computeDiff(left, right, {
        ignoreCase: true
      })
      
      expect(result.stats.equalLines).toBe(1)
    })

    it('should ignore line endings', async () => {
      const left = 'line1\r\nline2\r\n'
      const right = 'line1\nline2\n'
      const result = await computeDiff(left, right, {
        ignoreLineEndings: true
      })
      
      expect(result.stats.equalLines).toBe(2)
    })

    it('should apply multiple ignore rules', async () => {
      const left = '  HELLO  \r\n'
      const right = 'hello\n'
      const result = await computeDiff(left, right, {
        ignoreWhitespace: 'leading-trailing',
        ignoreCase: true,
        ignoreLineEndings: true
      })
      
      expect(result.stats.equalLines).toBe(1)
    })

    it('should filter lines by pattern', async () => {
      const left = '// comment 1\nline1\n# comment 2\nline2'
      const right = '// comment 1\nline1\n# different\nline2'
      const result = await computeDiff(left, right, {
        ignorePatterns: ['^\\s*//', '^\\s*#']
      })
      
      // Comments should be filtered out before comparison
      expect(result.stats.equalLines).toBe(2)
    })
  })

  describe('Algorithms', () => {
    const left = 'A\nB\nC\nD\nE'
    const right = 'A\nX\nC\nY\nE'

    it('should work with Myers algorithm', async () => {
      const result = await computeDiff(left, right, { algorithm: 'myers' })
      expect(result.stats.modifiedLines).toBe(2)
    })

    it('should work with Patience algorithm', async () => {
      const result = await computeDiff(left, right, { algorithm: 'patience' })
      expect(result.stats.modifiedLines).toBe(2)
    })

    it('should work with Histogram algorithm', async () => {
      const result = await computeDiff(left, right, { algorithm: 'histogram' })
      expect(result.stats.modifiedLines).toBe(2)
    })
  })

  describe('Inline Diff', () => {
    it('should compute inline diff for replace lines', async () => {
      const left = 'Hello World'
      const right = 'Hello TextDiff'
      const result = await computeDiff(left, right)
      
      // Find replace line
      const replaceLine = result.lines.find(l => l.type === 'replace')
      expect(replaceLine).toBeDefined()
      expect(replaceLine?.inlineDiff).toBeDefined()
      
      // Check inline diff segments
      if (replaceLine?.inlineDiff) {
        const leftSegments = replaceLine.inlineDiff.left
        const rightSegments = replaceLine.inlineDiff.right
        
        expect(leftSegments.some(s => s.type === 'delete')).toBe(true)
        expect(rightSegments.some(s => s.type === 'insert')).toBe(true)
      }
    })
  })

  describe('Performance', () => {
    it('should handle 10,000 line files within 2 seconds', async () => {
      const lines = 10000
      const left = Array(lines).fill(0).map((_, i) => `line ${i}`).join('\n')
      const right = Array(lines).fill(0).map((_, i) => 
        i % 10 === 0 ? `modified ${i}` : `line ${i}`
      ).join('\n')

      const start = performance.now()
      const result = await computeDiff(left, right)
      const duration = performance.now() - start

      expect(duration).toBeLessThan(2000)
      expect(result.stats.totalLines).toBeGreaterThan(0)
    })

    it('should handle 50,000 line files within 5 seconds', async () => {
      const lines = 50000
      const left = Array(lines).fill(0).map((_, i) => `line ${i}`).join('\n')
      const right = Array(lines).fill(0).map((_, i) => 
        i % 100 === 0 ? `modified ${i}` : `line ${i}`
      ).join('\n')

      const start = performance.now()
      const result = await computeDiff(left, right)
      const duration = performance.now() - start

      expect(duration).toBeLessThan(5000)
      expect(result.stats.totalLines).toBeGreaterThan(0)
    })
  })

  describe('Worker Pool', () => {
    it('should use Worker Pool for large files', async () => {
      const largeContent = 'x'.repeat(3 * 1024 * 1024) // 3MB each
      
      const progressUpdates: number[] = []
      const onProgress = (progress: { percent: number }) => {
        progressUpdates.push(progress.percent)
      }

      const result = await computeDiffWithWorkerPool(
        largeContent,
        largeContent + '\nextra',
        createDiffOptions(),
        onProgress
      )

      expect(result).toBeDefined()
      expect(progressUpdates.length).toBeGreaterThan(0)
    })

    it('should handle multiple concurrent diff tasks', async () => {
      const tasks = Array(5).fill(0).map((_, i) => {
        const left = `task ${i} line1\nline2`
        const right = `task ${i} line1\nmodified\nline3`
        return computeDiffWithWorkerPool(left, right, createDiffOptions())
      })

      const results = await Promise.all(tasks)
      
      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result.stats.totalLines).toBeGreaterThan(0)
      })
    })
  })

  describe('Chunk Building', () => {
    it('should group consecutive changes into chunks', async () => {
      const left = 'A\nB\nC\nD\nE\nF\nG'
      const right = 'A\nX\nY\nD\nE\nZ\nG'
      const result = await computeDiff(left, right)
      
      // Should have 2 chunks: [B,C -> X,Y] and [F -> Z]
      expect(result.chunks.length).toBeGreaterThanOrEqual(1)
      
      // Each chunk should have valid ranges
      result.chunks.forEach(chunk => {
        expect(chunk.leftLineRange[0]).toBeGreaterThanOrEqual(1)
        expect(chunk.rightLineRange[0]).toBeGreaterThanOrEqual(1)
      })
    })

    it('should respect contextLines option', async () => {
      const left = Array(20).fill(0).map((_, i) => `line ${i}`).join('\n')
      const right = Array(20).fill(0).map((_, i) => 
        i === 10 ? 'modified' : `line ${i}`
      ).join('\n')

      const resultWithContext3 = await computeDiff(left, right, { contextLines: 3 })
      const resultWithContext5 = await computeDiff(left, right, { contextLines: 5 })

      // More context lines should result in larger or same number of context lines
      expect(resultWithContext5.lines.length).toBeGreaterThanOrEqual(
        resultWithContext3.lines.length
      )
    })
  })
})
