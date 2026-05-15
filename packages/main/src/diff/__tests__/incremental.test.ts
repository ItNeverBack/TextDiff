import { describe, it, expect, vi } from 'vitest'
import {
  computeIncrementalDiff,
  computeSmartDiff,
  mergePartialDiffResult,
  type IncrementalDiffOptions
} from '../incremental'
import type { DiffResult } from '@shared/types'

describe('computeIncrementalDiff', () => {
  const createMockResult = (): DiffResult => ({
    lines: [
      { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'line1', rightContent: 'line1' },
      { leftLineNo: 2, rightLineNo: 2, type: 'equal', leftContent: 'line2', rightContent: 'line2' },
      { leftLineNo: 3, rightLineNo: 3, type: 'equal', leftContent: 'line3', rightContent: 'line3' }
    ],
    chunks: [],
    stats: {
      totalLines: 3,
      equalLines: 3,
      insertedLines: 0,
      deletedLines: 0,
      modifiedLines: 0,
      chunkCount: 0
    },
    computedAt: Date.now()
  })

  const createMockOptions = (): any => ({
    ignoreWhitespace: 'none',
    ignoreCase: false,
    ignoreLineEndings: true,
    contextLines: 3
  })

  it('无之前结果时执行完整diff', async () => {
    const left = 'line1\nline2\nline3'
    const right = 'line1\nmodified\nline3'
    const options = createMockOptions()
    
    const result = await computeIncrementalDiff(
      left, right,
      null, null, null,
      options
    )
    
    expect(result).toBeDefined()
    expect(result.lines.length).toBeGreaterThan(0)
  })

  it('无变更时返回之前结果', async () => {
    const content = 'line1\nline2\nline3'
    const previousResult = createMockResult()
    const options = createMockOptions()
    
    const result = await computeIncrementalDiff(
      content, content,
      previousResult,
      content, content,
      options
    )
    
    expect(result.stats.equalLines).toBe(3)
    expect(result.computedAt).toBeGreaterThanOrEqual(previousResult.computedAt)
  })

  it('小变更执行增量diff', async () => {
    const previousLeft = 'line1\nline2\nline3'
    const previousRight = 'line1\nline2\nline3'
    const newLeft = 'line1\nline2\nline3'
    const newRight = 'line1\nmodified\nline3'
    const previousResult = createMockResult()
    const options = createMockOptions()
    
    const result = await computeIncrementalDiff(
      newLeft, newRight,
      previousResult,
      previousLeft, previousRight,
      options
    )
    
    expect(result).toBeDefined()
    expect(result.lines.length).toBeGreaterThan(0)
  })

  it('过大变更执行完整diff', async () => {
    // 生成大量变更
    const previousLeft = Array(100).fill('line').join('\n')
    const previousRight = Array(100).fill('line').join('\n')
    const newLeft = Array(100).fill('modified').join('\n')
    const newRight = Array(100).fill('modified').join('\n')
    
    const previousResult: DiffResult = {
      lines: [],
      chunks: [],
      stats: {
        totalLines: 100,
        equalLines: 100,
        insertedLines: 0,
        deletedLines: 0,
        modifiedLines: 0,
        chunkCount: 0
      },
      computedAt: Date.now()
    }
    const options = createMockOptions()
    
    const result = await computeIncrementalDiff(
      newLeft, newRight,
      previousResult,
      previousLeft, previousRight,
      options
    )
    
    expect(result).toBeDefined()
    expect(result.stats.modifiedLines).toBeGreaterThan(0)
  })
})

describe('computeSmartDiff', () => {
  const createMockOptions = (): any => ({
    ignoreWhitespace: 'none',
    ignoreCase: false,
    ignoreLineEndings: true,
    contextLines: 3
  })

  it('小文件直接计算完整diff', async () => {
    const left = 'line1\nline2\nline3'
    const right = 'line1\nmodified\nline3'
    const options = createMockOptions()
    
    const result = await computeSmartDiff(left, right, options)
    
    expect(result).toBeDefined()
    expect(result.lines.length).toBeGreaterThan(0)
  })

  it('大文件尝试增量diff', async () => {
    // 生成超过1000行的文件
    const left = Array(50).fill(Array(20).fill('line').join('\n')).join('\n') // 约1000行
    const right = left.replace('line', 'modified') // 1000行修改
    
    const previousResult: DiffResult = {
      lines: [],
      chunks: [],
      stats: {
        totalLines: 1000,
        equalLines: 1000,
        insertedLines: 0,
        deletedLines: 0,
        modifiedLines: 0,
        chunkCount: 0
      },
      computedAt: Date.now()
    }
    
    const options = createMockOptions()
    
    const result = await computeSmartDiff(
      left, right,
      options,
      previousResult,
      left, right
    )
    
    expect(result).toBeDefined()
  })
})

describe('mergePartialDiffResult', () => {
  const createMockResult = (): DiffResult => ({
    lines: [
      { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'line1', rightContent: 'line1' },
      { leftLineNo: 2, rightLineNo: 2, type: 'equal', leftContent: 'line2', rightContent: 'line2' },
      { leftLineNo: 3, rightLineNo: 3, type: 'equal', leftContent: 'line3', rightContent: 'line3' }
    ],
    chunks: [],
    stats: {
      totalLines: 3,
      equalLines: 3,
      insertedLines: 0,
      deletedLines: 0,
      modifiedLines: 0,
      chunkCount: 0
    },
    computedAt: Date.now()
  })

  it('合并局部变更到基础结果', () => {
    const baseResult = createMockResult()
    const partialLines = [
      { leftLineNo: 2, rightLineNo: 2, type: 'replace' as const, leftContent: 'line2', rightContent: 'modified' }
    ]
    
    const result = mergePartialDiffResult(baseResult, partialLines, 1)
    
    expect(result.lines[1].type).toBe('replace')
    expect(result.lines[1].rightContent).toBe('modified')
  })

  it('更新 computedAt', () => {
    const baseResult = createMockResult()
    const partialLines: any[] = []
    
    const beforeTime = Date.now()
    const result = mergePartialDiffResult(baseResult, partialLines, 0)
    
    expect(result.computedAt).toBeGreaterThanOrEqual(beforeTime)
  })

  it('保留未修改的行', () => {
    const baseResult = createMockResult()
    const partialLines = [
      { leftLineNo: 2, rightLineNo: 2, type: 'replace' as const, leftContent: 'line2', rightContent: 'modified' }
    ]
    
    const result = mergePartialDiffResult(baseResult, partialLines, 1)
    
    // line1 保持不变
    expect(result.lines[0].type).toBe('equal')
    expect(result.lines[0].rightContent).toBe('line1')
    
    // line3 保持不变
    expect(result.lines[2].type).toBe('equal')
    expect(result.lines[2].rightContent).toBe('line3')
  })
})
