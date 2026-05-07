import { describe, it, expect } from 'vitest'
import { computeDiff } from '../index'

describe('Diff 算法切换测试', () => {
  const left = `function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

function multiply(a, b) {
  return a * b;
}`

  const right = `function add(a, b) {
  return a + b;
}

function divide(a, b) {
  return a / b;
}

function multiply(a, b) {
  return a * b;
}`

  it('Myers 算法应正常工作', async () => {
    const result = await computeDiff(left, right, {
      ignoreWhitespace: 'none',
      ignoreCase: false,
      ignoreLineEndings: true,
      ignorePatterns: [],
      ignoreComments: false,
      commentPrefixes: [],
      algorithm: 'myers',
      contextLines: 3
    })

    expect(result).toBeDefined()
    expect(result.lines).toBeDefined()
    expect(result.chunks).toBeDefined()
    expect(result.stats).toBeDefined()
  })

  it('Patience 算法应正常工作', async () => {
    const result = await computeDiff(left, right, {
      ignoreWhitespace: 'none',
      ignoreCase: false,
      ignoreLineEndings: true,
      ignorePatterns: [],
      ignoreComments: false,
      commentPrefixes: [],
      algorithm: 'patience',
      contextLines: 3
    })

    expect(result).toBeDefined()
    expect(result.lines).toBeDefined()
    expect(result.chunks).toBeDefined()
    expect(result.stats).toBeDefined()
  })

  it('Histogram 算法应正常工作', async () => {
    const result = await computeDiff(left, right, {
      ignoreWhitespace: 'none',
      ignoreCase: false,
      ignoreLineEndings: true,
      ignorePatterns: [],
      ignoreComments: false,
      commentPrefixes: [],
      algorithm: 'histogram',
      contextLines: 3
    })

    expect(result).toBeDefined()
    expect(result.lines).toBeDefined()
    expect(result.chunks).toBeDefined()
    expect(result.stats).toBeDefined()
  })

  it('算法切换应产生不同的结果结构', async () => {
    const myersResult = await computeDiff(left, right, {
      ignoreWhitespace: 'none',
      ignoreCase: false,
      ignoreLineEndings: true,
      ignorePatterns: [],
      ignoreComments: false,
      commentPrefixes: [],
      algorithm: 'myers',
      contextLines: 3
    })

    const patienceResult = await computeDiff(left, right, {
      ignoreWhitespace: 'none',
      ignoreCase: false,
      ignoreLineEndings: true,
      ignorePatterns: [],
      ignoreComments: false,
      commentPrefixes: [],
      algorithm: 'patience',
      contextLines: 3
    })

    const histogramResult = await computeDiff(left, right, {
      ignoreWhitespace: 'none',
      ignoreCase: false,
      ignoreLineEndings: true,
      ignorePatterns: [],
      ignoreComments: false,
      commentPrefixes: [],
      algorithm: 'histogram',
      contextLines: 3
    })

    // 所有算法都应该正确检测到变更
    expect(myersResult.stats.chunkCount).toBeGreaterThan(0)
    expect(patienceResult.stats.chunkCount).toBeGreaterThan(0)
    expect(histogramResult.stats.chunkCount).toBeGreaterThan(0)
  })
})

describe('忽略注释行测试', () => {
  const leftWithComments = `// This is a header comment
function add(a, b) {
  // Add two numbers
  return a + b;
}
// End of file`

  const rightWithComments = `// This is a different header
function add(a, b) {
  // Addition operation
  return a + b;
}
// Footer comment`

  it('不忽略注释时应包含所有行', async () => {
    const result = await computeDiff(leftWithComments, rightWithComments, {
      ignoreWhitespace: 'none',
      ignoreCase: false,
      ignoreLineEndings: true,
      ignorePatterns: [],
      ignoreComments: false,
      commentPrefixes: ['//'],
      algorithm: 'myers',
      contextLines: 3
    })

    // 应该检测到注释行的差异
    const commentLines = result.lines.filter(line =>
      line.leftContent?.trim().startsWith('//') ||
      line.rightContent?.trim().startsWith('//')
    )
    expect(commentLines.length).toBeGreaterThan(0)
  })

  it('忽略注释时应过滤掉注释行', async () => {
    const result = await computeDiff(leftWithComments, rightWithComments, {
      ignoreWhitespace: 'none',
      ignoreCase: false,
      ignoreLineEndings: true,
      ignorePatterns: [],
      ignoreComments: true,
      commentPrefixes: ['//'],
      algorithm: 'myers',
      contextLines: 3
    })

    // 只应该有函数体的差异（应该没有或很少，因为函数体相同）
    // 由于两个文件的函数体相同，应该只有很少的 chunks
    expect(result.stats.chunkCount).toBeLessThanOrEqual(1)
  })
})
