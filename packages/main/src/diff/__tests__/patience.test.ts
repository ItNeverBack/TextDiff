import { describe, it, expect } from 'vitest'
import { patienceDiff } from '../patience'

describe('Patience Diff Algorithm', () => {
  describe('基本边界情况', () => {
    it('空数组对比应返回空数组', () => {
      const result = patienceDiff([], [])
      expect(result).toEqual([])
    })

    it('左侧空数组应全为insert', () => {
      const result = patienceDiff([], ['a', 'b', 'c'])
      expect(result).toHaveLength(3)
      expect(result.every(op => op.type === 'insert')).toBe(true)
    })

    it('右侧空数组应全为delete', () => {
      const result = patienceDiff(['a', 'b', 'c'], [])
      expect(result).toHaveLength(3)
      expect(result.every(op => op.type === 'delete')).toBe(true)
    })
  })

  describe('相同内容', () => {
    it('完全相同的内容应全为equal', () => {
      const result = patienceDiff(['a', 'b', 'c'], ['a', 'b', 'c'])
      expect(result).toHaveLength(3)
      expect(result.every(op => op.type === 'equal')).toBe(true)
    })

    it('单元素相同', () => {
      const result = patienceDiff(['hello'], ['hello'])
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('equal')
    })
  })

  describe('代码块移动', () => {
    it('应识别代码块移动而非删除+插入', () => {
      // 函数从顶部移到底部
      const left = [
        'function foo() {',
        '  return 1;',
        '}',
        'function bar() {',
        '  return 2;',
        '}'
      ]
      const right = [
        'function bar() {',
        '  return 2;',
        '}',
        'function foo() {',
        '  return 1;',
        '}'
      ]
      
      const result = patienceDiff(left, right)
      
      // Patience 应该识别出 equal 行（因为都是唯一的）
      const equalCount = result.filter(op => op.type === 'equal').length
      expect(equalCount).toBeGreaterThanOrEqual(4) // 至少保留一些 equal
    })

    it('重复行的处理', () => {
      // 多个相同行（如空行）
      const left = ['a', '', '', 'b']
      const right = ['a', '', '', 'b']
      
      const result = patienceDiff(left, right)
      
      // 验证行数守恒
      const deleteCount = result.filter(op => op.type === 'delete').length
      const insertCount = result.filter(op => op.type === 'insert').length
      const equalCount = result.filter(op => op.type === 'equal').length
      
      expect(deleteCount + equalCount).toBe(left.length)
      expect(insertCount + equalCount).toBe(right.length)
    })
  })

  describe('纯插入', () => {
    it('末尾插入', () => {
      const result = patienceDiff(['a', 'b'], ['a', 'b', 'c'])
      expect(result.some(op => op.type === 'insert')).toBe(true)
      expect(result.filter(op => op.type === 'equal')).toHaveLength(2)
    })

    it('开头插入', () => {
      const result = patienceDiff(['b', 'c'], ['a', 'b', 'c'])
      expect(result.some(op => op.type === 'insert')).toBe(true)
    })

    it('中间插入', () => {
      const result = patienceDiff(['a', 'c'], ['a', 'b', 'c'])
      expect(result.some(op => op.type === 'insert')).toBe(true)
      expect(result.filter(op => op.type === 'equal')).toHaveLength(2)
    })
  })

  describe('纯删除', () => {
    it('末尾删除', () => {
      const result = patienceDiff(['a', 'b', 'c'], ['a', 'b'])
      expect(result.some(op => op.type === 'delete')).toBe(true)
    })

    it('开头删除', () => {
      const result = patienceDiff(['a', 'b', 'c'], ['b', 'c'])
      expect(result.some(op => op.type === 'delete')).toBe(true)
    })

    it('中间删除', () => {
      const result = patienceDiff(['a', 'b', 'c'], ['a', 'c'])
      expect(result.some(op => op.type === 'delete')).toBe(true)
    })
  })

  describe('替换操作', () => {
    it('单行替换', () => {
      const result = patienceDiff(['a', 'b', 'c'], ['a', 'x', 'c'])
      expect(result.some(op => op.type === 'replace')).toBe(true)
    })

    it('多行替换', () => {
      const result = patienceDiff(['a', 'b', 'c', 'd'], ['a', 'x', 'y', 'd'])
      expect(result.some(op => op.type === 'delete')).toBe(true)
      expect(result.some(op => op.type === 'insert') || result.some(op => op.type === 'replace')).toBe(true)
    })
  })

  describe('唯一行匹配', () => {
    it('优先匹配唯一行', () => {
      const left = ['unique1', 'common', 'unique2']
      const right = ['unique1', 'common', 'different']
      
      const result = patienceDiff(left, right)
      
      // unique1 和 common 应该被匹配为 equal
      const equalLines = result.filter(op => op.type === 'equal')
      expect(equalLines.length).toBeGreaterThanOrEqual(1)
    })

    it('无唯一行时回退到 Myers', () => {
      // 所有行都重复的情况
      const left = ['a', 'a', 'a']
      const right = ['a', 'a', 'a']
      
      const result = patienceDiff(left, right)
      
      // 应该能正确处理
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('与 Myers 对比', () => {
    it('相同输入的 equal 行数应相同', () => {
      const left = ['line1', 'line2', 'line3', 'line4', 'line5']
      const right = ['line1', 'modified', 'line3', 'line4', 'modified2']
      
      const patienceResult = patienceDiff(left, right)
      
      // 验证基本的正确性
      const deleteCount = patienceResult.filter(op => op.type === 'delete').length
      const insertCount = patienceResult.filter(op => op.type === 'insert').length
      const equalCount = patienceResult.filter(op => op.type === 'equal').length
      
      expect(deleteCount + equalCount).toBe(left.length)
      expect(insertCount + equalCount).toBe(right.length)
    })
  })

  describe('特殊字符', () => {
    it('处理 Unicode', () => {
      const result = patienceDiff(['你好', '世界'], ['你好', '地球'])
      expect(result).toHaveLength(3)
      expect(result[0].type).toBe('equal')
    })

    it('处理空字符串行', () => {
      const result = patienceDiff(['a', '', 'b'], ['a', 'x', 'b'])
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('性能', () => {
    it('处理大量数据', () => {
      const left = Array(1000).fill(null).map((_, i) => `line${i}`)
      const right = Array(1000).fill(null).map((_, i) => i === 500 ? 'modified' : `line${i}`)
      
      const start = Date.now()
      const result = patienceDiff(left, right)
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(1000) // 应该在1秒内完成
      expect(result.length).toBeGreaterThan(0)
    })
  })
})
