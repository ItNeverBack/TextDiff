import { describe, it, expect, vi } from 'vitest'
import { computeDiff, computeInlineDiff, buildChunks, calculateStats, myersDiff, patienceDiff, histogramDiff } from '../index'

describe('computeDiff', () => {
  describe('基本功能', () => {
    it('空字符串对比返回空结果', async () => {
      const result = await computeDiff('', '')
      expect(result.stats.totalLines).toBe(0)
      expect(result.lines).toHaveLength(0)
      expect(result.chunks).toHaveLength(0)
    })

    it('相同内容返回全equal', async () => {
      const result = await computeDiff('line1\nline2\nline3', 'line1\nline2\nline3')
      expect(result.stats.equalLines).toBe(3)
      expect(result.stats.insertedLines).toBe(0)
      expect(result.stats.deletedLines).toBe(0)
      expect(result.lines.every(l => l.type === 'equal')).toBe(true)
    })

    it('纯插入检测到insert', async () => {
      const result = await computeDiff('line1\nline3', 'line1\nline2\nline3')
      expect(result.stats.insertedLines).toBe(1)
      expect(result.stats.deletedLines).toBe(0)
      expect(result.lines.some(l => l.type === 'insert')).toBe(true)
    })

    it('纯删除检测到delete', async () => {
      const result = await computeDiff('line1\nline2\nline3', 'line1\nline3')
      expect(result.stats.deletedLines).toBe(1)
      expect(result.stats.insertedLines).toBe(0)
      expect(result.lines.some(l => l.type === 'delete')).toBe(true)
    })

    it('替换检测到replace', async () => {
      const result = await computeDiff('line1\nold\nline3', 'line1\nnew\nline3')
      expect(result.stats.modifiedLines).toBe(1)
      expect(result.lines.some(l => l.type === 'replace')).toBe(true)
    })
  })

  describe('算法选择', () => {
    it('algorithm=myers 使用 Myers 算法', async () => {
      const result = await computeDiff('a\nb\nc', 'a\nx\nc', { algorithm: 'myers' })
      expect(result).toBeDefined()
      expect(result.lines.length).toBeGreaterThan(0)
    })

    it('algorithm=patience 使用 Patience 算法', async () => {
      const result = await computeDiff('a\nb\nc', 'a\nx\nc', { algorithm: 'patience' })
      expect(result).toBeDefined()
      expect(result.lines.length).toBeGreaterThan(0)
    })

    it('algorithm=histogram 使用 Histogram 算法', async () => {
      const result = await computeDiff('a\nb\nc', 'a\nx\nc', { algorithm: 'histogram' })
      expect(result).toBeDefined()
      expect(result.lines.length).toBeGreaterThan(0)
    })
  })

  describe('忽略选项', () => {
    it('ignoreWhitespace=leading-trailing 忽略首尾空白', async () => {
      const result = await computeDiff('  hello  ', 'hello', { ignoreWhitespace: 'leading-trailing' })
      expect(result.stats.equalLines).toBe(1)
    })

    it('ignoreWhitespace=all 忽略所有空白', async () => {
      const result = await computeDiff('h e l l o', 'hello', { ignoreWhitespace: 'all' })
      expect(result.stats.equalLines).toBe(1)
    })

    it('ignoreCase 忽略大小写', async () => {
      const result = await computeDiff('HELLO', 'hello', { ignoreCase: true })
      expect(result.stats.equalLines).toBe(1)
    })

    it('ignoreLineEndings 统一行尾符', async () => {
      const result = await computeDiff('line1\r\nline2', 'line1\nline2', { ignoreLineEndings: true })
      expect(result.stats.equalLines).toBe(2)
    })
  })

  describe('contextLines 选项', () => {
    it('contextLines=0 不显示上下文', async () => {
      const left = 'a\nb\nc\nd\ne'
      const right = 'a\nb\nX\nd\ne'
      const result = await computeDiff(left, right, { contextLines: 0 })
      expect(result.chunks.length).toBeGreaterThan(0)
      if (result.chunks.length > 0) {
        const chunk = result.chunks[0]
        expect(chunk.endIndex - chunk.startIndex + 1).toBeLessThanOrEqual(5) // 变更行本身
      }
    })

    it('contextLines=5 显示5行上下文', async () => {
      const left = Array(20).fill('line').join('\n')
      const right = left.replace('line\nline', 'line\nmodified\nline')
      const result = await computeDiff(left, right, { contextLines: 5 })
      expect(result.chunks.length).toBeGreaterThan(0)
    })
  })

  describe('注释过滤', () => {
    it('ignoreComments 过滤注释行', async () => {
      const left = 'code\n// comment'
      const right = 'code\n// different comment'
      const result = await computeDiff(left, right, { ignoreComments: true })
      expect(result.stats.equalLines).toBeGreaterThan(0)
    })

    it('使用自定义 commentPrefixes', async () => {
      const left = 'code\n# comment'
      const right = 'code\n# different'
      const result = await computeDiff(left, right, { 
        ignoreComments: true,
        commentPrefixes: ['#']
      })
      expect(result.stats.equalLines).toBe(1)
    })
  })

  describe('ignorePatterns 正则过滤', () => {
    it('过滤匹配正则的行', async () => {
      const left = 'code\nconsole.log(1)'
      const right = 'code\nconsole.log(2)'
      const result = await computeDiff(left, right, { 
        ignorePatterns: ['^\\s*console\\.log']
      })
      expect(result.stats.equalLines).toBe(1)
    })
  })

  describe('内联差异', () => {
    it('replace 行包含 inlineDiff', async () => {
      const result = await computeDiff('hello world', 'hello there')
      const replaceLine = result.lines.find(l => l.type === 'replace')
      expect(replaceLine).toBeDefined()
      expect(replaceLine?.inlineDiff).toBeDefined()
    })

    it('equal 行不包含 inlineDiff', async () => {
      const result = await computeDiff('same', 'same')
      const equalLine = result.lines.find(l => l.type === 'equal')
      expect(equalLine?.inlineDiff).toBeUndefined()
    })
  })

  describe('统计数据', () => {
    it('返回正确的 chunkCount', async () => {
      const result = await computeDiff('a\nb\nc', 'a\nX\nc')
      expect(result.stats.chunkCount).toBe(1)
    })

    it('返回 totalLines', async () => {
      const result = await computeDiff('a\nb\nc', 'a\nb\nc')
      expect(result.stats.totalLines).toBe(3)
    })

    it('computedAt 是时间戳', async () => {
      const result = await computeDiff('a', 'a')
      expect(typeof result.computedAt).toBe('number')
      expect(result.computedAt).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('CRLF/LF 处理', () => {
    it('处理 CRLF 行尾', async () => {
      const result = await computeDiff('line1\r\nline2', 'line1\r\nmodified\r\nline2')
      expect(result.stats.modifiedLines).toBe(1)
    })

    it('处理混合行尾', async () => {
      const result = await computeDiff('line1\nline2\rline3', 'line1\nmodified\rline3')
      expect(result.stats.modifiedLines).toBe(1)
    })
  })
})

describe('算法导出', () => {
  it('导出 myersDiff', () => {
    expect(typeof myersDiff).toBe('function')
  })

  it('导出 patienceDiff', () => {
    expect(typeof patienceDiff).toBe('function')
  })

  it('导出 histogramDiff', () => {
    expect(typeof histogramDiff).toBe('function')
  })

  it('导出 computeInlineDiff', () => {
    expect(typeof computeInlineDiff).toBe('function')
  })

  it('导出 buildChunks', () => {
    expect(typeof buildChunks).toBe('function')
  })

  it('导出 calculateStats', () => {
    expect(typeof calculateStats).toBe('function')
  })
})
