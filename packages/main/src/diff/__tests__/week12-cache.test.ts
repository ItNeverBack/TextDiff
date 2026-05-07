import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { computeDiffWithCache, clearDiffCache, getDiffCacheStats } from '../cache'
import { computeIncrementalDiff, computeSmartDiff } from '../incremental'
import { computeDiff } from '../index'

// 模拟性能 API
const mockPerformanceNow = vi.fn()
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true
})

describe('Week 12 - Diff Cache Performance', () => {
  beforeEach(() => {
    clearDiffCache()
    mockPerformanceNow.mockReturnValue(0)
  })

  afterEach(() => {
    clearDiffCache()
  })

  describe('Diff Cache', () => {
    it('should cache diff results', async () => {
      const left = 'line1\nline2\nline3'
      const right = 'line1\nline2 modified\nline3'
      const options = { algorithm: 'myers' as const }

      // 第一次计算
      const result1 = await computeDiffWithCache(left, right, options)
      expect(result1).toBeDefined()
      expect(result1.lines.length).toBeGreaterThan(0)

      // 第二次计算应该使用缓存（但 computedAt 会更新）
      const result2 = await computeDiffWithCache(left, right, options)
      // 验证内容相同（忽略 computedAt）
      expect(result2.lines).toEqual(result1.lines)
      expect(result2.chunks).toEqual(result1.chunks)
      expect(result2.stats).toEqual(result1.stats)
      // computedAt 应该被更新
      expect(result2.computedAt).toBeGreaterThanOrEqual(result1.computedAt)
    })

    it('should return different results for different content', async () => {
      const left = 'line1\nline2\nline3'
      const right1 = 'line1\nline2 modified\nline3'
      const right2 = 'line1\nline2\nline3 modified'
      const options = { algorithm: 'myers' as const }

      const result1 = await computeDiffWithCache(left, right1, options)
      const result2 = await computeDiffWithCache(left, right2, options)

      expect(result1).not.toEqual(result2)
    })

    it('should clear cache', async () => {
      const left = 'line1\nline2\nline3'
      const right = 'line1\nline2 modified\nline3'
      const options = { algorithm: 'myers' as const }

      await computeDiffWithCache(left, right, options)
      
      const statsBefore = getDiffCacheStats()
      expect(statsBefore.size).toBe(1)

      clearDiffCache()

      const statsAfter = getDiffCacheStats()
      expect(statsAfter.size).toBe(0)
    })

    it('should track cache stats correctly', async () => {
      const left = 'line1\nline2\nline3'
      const right = 'line1\nline2 modified\nline3'
      const options = { algorithm: 'myers' as const }

      const statsBefore = getDiffCacheStats()
      expect(statsBefore.size).toBe(0)
      expect(statsBefore.maxSize).toBe(50)

      await computeDiffWithCache(left, right, options)

      const statsAfter = getDiffCacheStats()
      expect(statsAfter.size).toBe(1)
    })
  })

  describe('Incremental Diff', () => {
    it('should compute full diff when no previous result', async () => {
      const left = 'line1\nline2\nline3'
      const right = 'line1\nline2 modified\nline3'
      const options = { algorithm: 'myers' as const }

      const result = await computeIncrementalDiff(
        left, right, null, null, null, options
      )

      expect(result).toBeDefined()
      expect(result.lines.length).toBeGreaterThan(0)
    })

    it('should return cached result when no changes', async () => {
      const left = 'line1\nline2\nline3'
      const right = 'line1\nline2\nline3'
      const options = { algorithm: 'myers' as const }

      const previousResult = await computeDiff(left, right, options)

      const result = await computeIncrementalDiff(
        left, right, previousResult, left, right, options
      )

      expect(result.lines).toEqual(previousResult.lines)
    })

    it('should detect changes correctly', async () => {
      const previousLeft = 'line1\nline2\nline3'
      const previousRight = 'line1\nline2\nline3'
      const newLeft = 'line1\nline2\nline3'
      const newRight = 'line1\nline2 modified\nline3'
      const options = { algorithm: 'myers' as const }

      const previousResult = await computeDiff(previousLeft, previousRight, options)

      const result = await computeIncrementalDiff(
        newLeft, newRight, previousResult, previousLeft, previousRight, options
      )

      expect(result).toBeDefined()
      expect(result.lines.length).toBeGreaterThan(0)
    })
  })

  describe('Smart Diff', () => {
    it('should use full diff for small files', async () => {
      const left = Array(100).fill('line').join('\n')
      const right = Array(100).fill('line modified').join('\n')
      const options = { algorithm: 'myers' as const }

      const result = await computeSmartDiff(left, right, options)

      expect(result).toBeDefined()
      expect(result.lines.length).toBeGreaterThan(0)
    })

    it('should handle large files', async () => {
      const left = Array(2000).fill('line').join('\n')
      const right = Array(2000).fill('line modified').join('\n')
      const options = { algorithm: 'myers' as const }

      const result = await computeSmartDiff(left, right, options)

      expect(result).toBeDefined()
      expect(result.lines.length).toBeGreaterThan(0)
    })
  })
})
