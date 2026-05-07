import { describe, it, expect } from 'vitest'
import { computeDiff } from '../index'

describe('DiffEngine — computeDiff', () => {
  // §5.2 空文件 vs 空文件
  it('空文件 vs 空文件', async () => {
    const result = await computeDiff('', '')
    expect(result.stats.totalLines).toBe(0) // 空文件应该有 0 行
    expect(result.stats.insertedLines).toBe(0)
    expect(result.stats.deletedLines).toBe(0)
    expect(result.chunks).toHaveLength(0)
  })

  // §5.2 空文件 vs 有内容
  it('空文件 vs 有内容', async () => {
    const result = await computeDiff('', 'line1\nline2')
    expect(result.stats.insertedLines).toBeGreaterThan(0)
    expect(result.stats.deletedLines).toBe(0)
    expect(result.lines.every(l => l.type === 'insert' || l.type === 'equal')).toBe(true)
  })

  // §5.2 完全相同文件
  it('完全相同文件', async () => {
    const content = 'hello\nworld\nfoo'
    const result = await computeDiff(content, content)
    expect(result.stats.insertedLines).toBe(0)
    expect(result.stats.deletedLines).toBe(0)
    expect(result.stats.modifiedLines).toBe(0)
    expect(result.chunks).toHaveLength(0)
    expect(result.lines.every(l => l.type === 'equal')).toBe(true)
  })

  // §5.2 纯新增
  it('纯新增', async () => {
    const result = await computeDiff('line1\nline2', 'line1\nline2\nline3')
    expect(result.stats.insertedLines).toBe(1)
    expect(result.stats.deletedLines).toBe(0)
    const insertLine = result.lines.find(l => l.type === 'insert')
    expect(insertLine?.rightContent).toBe('line3')
  })

  // §5.2 纯删除
  it('纯删除', async () => {
    const result = await computeDiff('line1\nline2\nline3', 'line1\nline2')
    expect(result.stats.deletedLines).toBe(1)
    expect(result.stats.insertedLines).toBe(0)
    const deleteLine = result.lines.find(l => l.type === 'delete')
    expect(deleteLine?.leftContent).toBe('line3')
  })

  // §5.2 混合修改（新增+删除+修改）
  it('混合修改', async () => {
    const left = 'aaa\nbbb\nccc\nddd'
    const right = 'aaa\nBBB\nccc\neee\nfff'
    const result = await computeDiff(left, right)
    expect(result.stats.insertedLines + result.stats.deletedLines + result.stats.modifiedLines).toBeGreaterThan(0)
    expect(result.chunks.length).toBeGreaterThan(0)
  })

  // §5.2 忽略空白符 — leading-trailing
  it('忽略首尾空白符', async () => {
    const left = 'hello\n  world  \nfoo'
    const right = 'hello\nworld\nfoo'
    const result = await computeDiff(left, right, { ignoreWhitespace: 'leading-trailing' })
    expect(result.stats.modifiedLines).toBe(0)
    expect(result.stats.insertedLines).toBe(0)
    expect(result.stats.deletedLines).toBe(0)
  })

  // §5.2 忽略空白符 — all
  it('忽略全部空白符', async () => {
    const left = 'h e l l o\nw o r l d'
    const right = 'hello\nworld'
    const result = await computeDiff(left, right, { ignoreWhitespace: 'all' })
    expect(result.stats.modifiedLines).toBe(0)
  })

  // §5.2 忽略大小写
  it('忽略大小写', async () => {
    const left = 'Hello\nWorld'
    const right = 'hello\nworld'
    const result = await computeDiff(left, right, { ignoreCase: true })
    expect(result.stats.modifiedLines).toBe(0)
    expect(result.stats.insertedLines).toBe(0)
    expect(result.stats.deletedLines).toBe(0)
  })

  // §5.2 忽略行尾符
  it('忽略行尾符 CRLF vs LF', async () => {
    const left = 'line1\r\nline2\r\n'
    const right = 'line1\nline2\n'
    const result = await computeDiff(left, right, { ignoreLineEndings: true })
    expect(result.stats.modifiedLines).toBe(0)
  })

  // 不忽略时 CRLF vs LF 应有差异
  it('不忽略行尾符时 CRLF vs LF 有差异', async () => {
    const left = 'line1\r\nline2'
    const right = 'line1\nline2'
    const result = await computeDiff(left, right, { ignoreLineEndings: false })
    expect(result.stats.modifiedLines + result.stats.insertedLines + result.stats.deletedLines).toBeGreaterThan(0)
  })

  // 行号正确性
  it('行号从 1 开始且连续', async () => {
    const left = 'a\nb\nc'
    const right = 'a\nX\nc'
    const result = await computeDiff(left, right)
    const leftNos = result.lines.filter(l => l.leftLineNo !== null).map(l => l.leftLineNo!)
    expect(leftNos).toEqual([1, 2, 3])
  })

  // 内联差异存在于 replace 行
  it('replace 行有内联差异', async () => {
    const result = await computeDiff('hello world', 'hello earth')
    const replaceLine = result.lines.find(l => l.type === 'replace')
    expect(replaceLine).toBeDefined()
    expect(replaceLine?.inlineDiff).toBeDefined()
    expect(replaceLine?.inlineDiff?.left.length).toBeGreaterThan(0)
    expect(replaceLine?.inlineDiff?.right.length).toBeGreaterThan(0)
  })

  // chunk 结构正确
  it('chunk 包含正确的行范围', async () => {
    const left = 'a\nb\nc\nd\ne'
    const right = 'a\nB\nc\nd\ne'
    const result = await computeDiff(left, right)
    expect(result.chunks.length).toBeGreaterThan(0)
    const chunk = result.chunks[0]
    expect(chunk.startIndex).toBeGreaterThanOrEqual(0)
    expect(chunk.endIndex).toBeGreaterThanOrEqual(chunk.startIndex)
  })

  // stats 计算正确
  it('stats 总行数等于 lines 数组长度', async () => {
    const left = 'a\nb\nc'
    const right = 'a\nX\nc\nd'
    const result = await computeDiff(left, right)
    expect(result.stats.totalLines).toBe(result.lines.length)
  })
})
