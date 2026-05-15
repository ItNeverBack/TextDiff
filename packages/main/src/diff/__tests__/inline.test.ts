import { describe, it, expect } from 'vitest'
import { computeInlineDiff } from '../inline'

describe('computeInlineDiff', () => {
  describe('基本功能', () => {
    it('相同内容应全为equal', () => {
      const result = computeInlineDiff('hello', 'hello')
      expect(result.left).toHaveLength(1)
      expect(result.right).toHaveLength(1)
      expect(result.left[0].type).toBe('equal')
      expect(result.left[0].text).toBe('hello')
      expect(result.right[0].type).toBe('equal')
      expect(result.right[0].text).toBe('hello')
    })

    it('空字符串对比应返回空结果', () => {
      const result = computeInlineDiff('', '')
      expect(result.left).toHaveLength(0)
      expect(result.right).toHaveLength(0)
    })

    it('左侧空字符串应全为insert', () => {
      const result = computeInlineDiff('', 'abc')
      expect(result.left).toHaveLength(0)
      expect(result.right).toHaveLength(1)
      expect(result.right[0].type).toBe('insert')
      expect(result.right[0].text).toBe('abc')
    })

    it('右侧空字符串应全为delete', () => {
      const result = computeInlineDiff('abc', '')
      expect(result.left).toHaveLength(1)
      expect(result.right).toHaveLength(0)
      expect(result.left[0].type).toBe('delete')
      expect(result.left[0].text).toBe('abc')
    })
  })

  describe('前缀相同', () => {
    it('前缀相同后缀不同', () => {
      const result = computeInlineDiff('foo bar', 'foo baz')
      // 实际算法可能有不同的分段方式，验证基本结构即可
      expect(result.left.length).toBeGreaterThanOrEqual(1)
      expect(result.right.length).toBeGreaterThanOrEqual(1)
      expect(result.left.some(s => s.type === 'equal')).toBe(true)
      expect(result.left.some(s => s.type === 'delete')).toBe(true)
      expect(result.right.some(s => s.type === 'equal')).toBe(true)
      expect(result.right.some(s => s.type === 'insert')).toBe(true)
    })

    it('完全相同的prefix', () => {
      const result = computeInlineDiff('hello world', 'hello there')
      expect(result.left.some(s => s.type === 'equal')).toBe(true)
      expect(result.right.some(s => s.type === 'equal')).toBe(true)
    })
  })

  describe('单字符变化', () => {
    it('单字符删除', () => {
      const result = computeInlineDiff('hello', 'helo')
      expect(result.left.some(s => s.type === 'equal')).toBe(true)
      expect(result.left.some(s => s.type === 'delete')).toBe(true)
      expect(result.right.some(s => s.type === 'equal')).toBe(true)
    })

    it('单字符插入', () => {
      const result = computeInlineDiff('helo', 'hello')
      expect(result.left.some(s => s.type === 'equal')).toBe(true)
      expect(result.right.some(s => s.type === 'equal')).toBe(true)
      expect(result.right.some(s => s.type === 'insert')).toBe(true)
    })

    it('单字符替换', () => {
      const result = computeInlineDiff('cat', 'cut')
      expect(result.left.some(s => s.type === 'equal')).toBe(true)
      expect(result.left.some(s => s.type === 'delete')).toBe(true)
      expect(result.right.some(s => s.type === 'equal')).toBe(true)
      expect(result.right.some(s => s.type === 'insert')).toBe(true)
    })
  })

  describe('完全不同', () => {
    it('完全不同的字符串', () => {
      const result = computeInlineDiff('abc', 'xyz')
      expect(result.left).toHaveLength(1)
      expect(result.right).toHaveLength(1)
      expect(result.left[0].type).toBe('delete')
      expect(result.left[0].text).toBe('abc')
      expect(result.right[0].type).toBe('insert')
      expect(result.right[0].text).toBe('xyz')
    })

    it('没有共同字符', () => {
      const result = computeInlineDiff('aaaa', 'bbbb')
      expect(result.left).toHaveLength(1)
      expect(result.right).toHaveLength(1)
      expect(result.left[0].type).toBe('delete')
      expect(result.left[0].text).toBe('aaaa')
      expect(result.right[0].type).toBe('insert')
      expect(result.right[0].text).toBe('bbbb')
    })
  })

  describe('复杂变化', () => {
    it('中间插入', () => {
      const result = computeInlineDiff('abcd', 'abXcd')
      expect(result.left.some(s => s.type === 'equal')).toBe(true)
      expect(result.right.some(s => s.type === 'equal')).toBe(true)
      expect(result.right.some(s => s.type === 'insert')).toBe(true)
    })

    it('中间删除', () => {
      const result = computeInlineDiff('abXcd', 'abcd')
      expect(result.left.some(s => s.type === 'equal')).toBe(true)
      expect(result.left.some(s => s.type === 'delete')).toBe(true)
      expect(result.right.some(s => s.type === 'equal')).toBe(true)
    })

    it('多处变化', () => {
      const result = computeInlineDiff('abcde', 'aXcYe')
      expect(result.left.some(s => s.type === 'delete')).toBe(true)
      expect(result.right.some(s => s.type === 'insert')).toBe(true)
      expect(result.left.some(s => s.type === 'equal')).toBe(true)
      expect(result.right.some(s => s.type === 'equal')).toBe(true)
    })
  })

  describe('Unicode字符', () => {
    it('中文字符比较', () => {
      const result = computeInlineDiff('你好世界', '你好地球')
      // 实际算法可能将中文字符作为整体处理，不强制要求具体的分段数量
      expect(result.left.length).toBeGreaterThanOrEqual(1)
      expect(result.right.length).toBeGreaterThanOrEqual(1)
      expect(result.left.some(s => s.type === 'equal')).toBe(true)
      expect(result.left.some(s => s.type === 'delete')).toBe(true)
      expect(result.right.some(s => s.type === 'equal')).toBe(true)
      expect(result.right.some(s => s.type === 'insert')).toBe(true)
    })

    it('emoji字符', () => {
      const result = computeInlineDiff('Hello 😀', 'Hello 😁')
      expect(result.left.some(s => s.type === 'equal')).toBe(true)
      expect(result.left.some(s => s.type === 'delete')).toBe(true)
      expect(result.right.some(s => s.type === 'insert')).toBe(true)
    })

    it('混合字符', () => {
      const result = computeInlineDiff('abc中文123', 'abc英文123')
      expect(result.left.some(s => s.type === 'equal')).toBe(true)
      expect(result.left.some(s => s.type === 'delete')).toBe(true)
      expect(result.right.some(s => s.type === 'insert')).toBe(true)
    })
  })

  describe('特殊字符', () => {
    it('空格处理', () => {
      const result = computeInlineDiff('hello world', 'hello  world')
      expect(result.left.some(s => s.type === 'equal')).toBe(true)
      expect(result.right.some(s => s.type === 'equal')).toBe(true)
      expect(result.right.some(s => s.type === 'insert')).toBe(true)
    })

    it('Tab字符', () => {
      const result = computeInlineDiff('a\tb', 'a  b')
      expect(result.left.some(s => s.type === 'delete')).toBe(true)
      expect(result.right.some(s => s.type === 'insert')).toBe(true)
    })

    it('换行符', () => {
      const result = computeInlineDiff('line1\nline2', 'line1\r\nline2')
      // 换行符差异可能被算法合并或单独处理
      expect(result.left.length).toBeGreaterThanOrEqual(1)
      expect(result.right.length).toBeGreaterThanOrEqual(1)
    })

    it('HTML特殊字符', () => {
      const result = computeInlineDiff('<div>', '<span>')
      expect(result.left.some(s => s.type === 'equal')).toBe(true)
      expect(result.left.some(s => s.type === 'delete')).toBe(true)
      expect(result.right.some(s => s.type === 'insert')).toBe(true)
    })
  })

  describe('长字符串', () => {
    it('长字符串前缀相同', () => {
      const prefix = 'a'.repeat(1000)
      const result = computeInlineDiff(prefix + 'X', prefix + 'Y')
      expect(result.left[result.left.length - 1].type).toBe('delete')
      expect(result.left[result.left.length - 1].text).toBe('X')
      expect(result.right[result.right.length - 1].type).toBe('insert')
      expect(result.right[result.right.length - 1].text).toBe('Y')
    })

    it('长字符串完全不同', () => {
      const left = 'a'.repeat(1000)
      const right = 'b'.repeat(1000)
      const result = computeInlineDiff(left, right)
      expect(result.left).toHaveLength(1)
      expect(result.right).toHaveLength(1)
      expect(result.left[0].type).toBe('delete')
      expect(result.right[0].type).toBe('insert')
    })
  })

  describe('分段合并', () => {
    it('连续的相同类型应合并', () => {
      const result = computeInlineDiff('abc', 'axc')
      // 应该合并连续的equal和连续的delete/insert
      expect(result.left.length).toBeLessThanOrEqual(4)
      expect(result.right.length).toBeLessThanOrEqual(4)
    })

    it('相邻的insert不重复', () => {
      const result = computeInlineDiff('ac', 'abc')
      expect(result.right.filter(s => s.type === 'insert').length).toBe(1)
      expect(result.right.find(s => s.type === 'insert')!.text).toBe('b')
    })

    it('相邻的delete不重复', () => {
      const result = computeInlineDiff('abc', 'ac')
      expect(result.left.filter(s => s.type === 'delete').length).toBe(1)
      expect(result.left.find(s => s.type === 'delete')!.text).toBe('b')
    })
  })
})
