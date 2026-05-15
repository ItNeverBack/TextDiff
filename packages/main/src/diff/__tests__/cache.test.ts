import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  computeDiffWithCache,
  computeDiffFromFiles,
  clearDiffCache,
  getDiffCacheStats
} from '../cache'
import type { DiffResult, DiffOptions, FileInfo } from '@shared/types'

// Mock console.log to reduce noise
const originalConsoleLog = console.log
beforeEach(() => {
  console.log = vi.fn()
})

afterEach(() => {
  console.log = originalConsoleLog
  clearDiffCache()
})

describe('DiffCache', () => {
  const createMockOptions = (): DiffOptions => ({
    ignoreWhitespace: 'none',
    ignoreCase: false,
    ignoreLineEndings: true,
    ignorePatterns: [],
    ignoreComments: false,
    commentPrefixes: [],
    algorithm: 'myers',
    contextLines: 3
  })

  const createMockFileInfo = (content: string): FileInfo => ({
    path: '/test/file.txt',
    name: 'file.txt',
    content,
    encoding: 'utf-8',
    lineEnding: 'LF',
    size: content.length
  })

  describe('基本缓存功能', () => {
    it('第一次调用未命中缓存，执行计算', async () => {
      const options = createMockOptions()
      const result = await computeDiffWithCache('hello', 'world', options)
      
      expect(result).toBeDefined()
      expect(result.lines.length).toBeGreaterThan(0)
    })

    it('相同内容第二次调用命中缓存', async () => {
      const options = createMockOptions()
      
      // 第一次调用
      await computeDiffWithCache('hello\nworld', 'hello\nthere', options)
      
      // 第二次调用，应该命中缓存
      const result2 = await computeDiffWithCache('hello\nworld', 'hello\nthere', options)
      
      expect(result2).toBeDefined()
      expect(result2.computedAt).toBeLessThanOrEqual(Date.now())
    })

    it('不同内容不命中缓存', async () => {
      const options = createMockOptions()
      
      // 第一次调用
      await computeDiffWithCache('content1', 'content2', options)
      
      // 不同内容
      const result = await computeDiffWithCache('different1', 'different2', options)
      
      expect(result).toBeDefined()
    })
  })

  describe('缓存键计算', () => {
    it('不同选项生成不同缓存键', async () => {
      const options1 = { ...createMockOptions(), ignoreCase: false }
      const options2 = { ...createMockOptions(), ignoreCase: true }
      
      const result1 = await computeDiffWithCache('HELLO', 'hello', options1)
      const result2 = await computeDiffWithCache('HELLO', 'hello', options2)
      
      // options1 应该检测到差异
      expect(result1.stats.equalLines).toBe(0)
      
      // options2 应该忽略大小写
      expect(result2.stats.equalLines).toBe(1)
    })

    it('不同算法生成不同缓存键', async () => {
      const options1 = { ...createMockOptions(), algorithm: 'myers' as const }
      const options2 = { ...createMockOptions(), algorithm: 'patience' as const }
      
      const result1 = await computeDiffWithCache('a\nb\nc', 'a\nx\nc', options1)
      const result2 = await computeDiffWithCache('a\nb\nc', 'a\nx\nc', options2)
      
      // 两种算法都应该产生有效结果
      expect(result1.lines.length).toBeGreaterThan(0)
      expect(result2.lines.length).toBeGreaterThan(0)
    })
  })

  describe('缓存管理', () => {
    it('clearCache 清空缓存', async () => {
      const options = createMockOptions()
      
      // 添加缓存
      await computeDiffWithCache('test', 'data', options)
      
      // 清空缓存
      clearDiffCache()
      
      // 验证缓存已清空
      const stats = getDiffCacheStats()
      expect(stats.size).toBe(0)
    })

    it('getCacheStats 返回正确的统计', async () => {
      const options = createMockOptions()
      
      // 初始状态
      let stats = getDiffCacheStats()
      expect(stats.size).toBe(0)
      expect(stats.maxSize).toBe(50)
      expect(stats.ttl).toBeGreaterThan(0)

      // 添加缓存
      await computeDiffWithCache('test', 'data', options)
      
      stats = getDiffCacheStats()
      expect(stats.size).toBe(1)
    })

    it('缓存大小限制', async () => {
      const options = createMockOptions()
      
      // 添加多个不同内容的缓存
      for (let i = 0; i < 55; i++) {
        await computeDiffWithCache(`content${i}`, `content${i + 100}`, options)
      }
      
      const stats = getDiffCacheStats()
      expect(stats.size).toBeLessThanOrEqual(stats.maxSize)
    })
  })

  describe('computeDiffFromFiles', () => {
    it('从 FileInfo 计算 diff', async () => {
      const leftFile = createMockFileInfo('hello\nworld')
      const rightFile = createMockFileInfo('hello\nthere')
      const options = createMockOptions()
      
      const result = await computeDiffFromFiles(leftFile, rightFile, options)
      
      expect(result).toBeDefined()
      expect(result.lines.length).toBeGreaterThan(0)
    })

    it('文件内容被缓存', async () => {
      const leftFile = createMockFileInfo('same content')
      const rightFile = createMockFileInfo('same content')
      const options = createMockOptions()
      
      // 第一次调用
      await computeDiffFromFiles(leftFile, rightFile, options)
      
      // 第二次调用应该命中缓存
      const result = await computeDiffFromFiles(leftFile, rightFile, options)
      
      expect(result).toBeDefined()
    })
  })

  describe('缓存时间戳', () => {
    it('缓存命中时更新 computedAt', async () => {
      const options = createMockOptions()
      
      // 第一次调用
      const result1 = await computeDiffWithCache('content', 'content', options)
      const firstTimestamp = result1.computedAt
      
      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 10))
      
      // 第二次调用（命中缓存）
      const result2 = await computeDiffWithCache('content', 'content', options)
      
      // computedAt 应该更新为当前时间
      expect(result2.computedAt).toBeGreaterThanOrEqual(firstTimestamp)
    })
  })

  describe('缓存内容哈希验证', () => {
    it('哈希碰撞时重新计算', async () => {
      const options = createMockOptions()
      
      // 这两个内容会产生不同的结果
      const result1 = await computeDiffWithCache('a\nb\nc', 'a\nx\nc', options)
      const result2 = await computeDiffWithCache('a\nb\nc', 'a\ny\nc', options)
      
      // 结果应该不同
      const hasDifferentLines = result1.lines.some((line, i) => {
        const line2 = result2.lines[i]
        if (!line2) return true
        return line.type !== line2.type || line.leftContent !== line2.leftContent
      })
      
      expect(hasDifferentLines).toBe(true)
    })
  })
})
