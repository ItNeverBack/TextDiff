import { describe, it, expect } from 'vitest'
import { histogramDiff } from '../histogram'

describe('Histogram Diff Algorithm', () => {
  describe('基本边界情况', () => {
    it('空数组对比应返回空数组', () => {
      const result = histogramDiff([], [])
      expect(result).toEqual([])
    })

    it('左侧空数组应全为insert', () => {
      const result = histogramDiff([], ['a', 'b', 'c'])
      expect(result).toHaveLength(3)
      expect(result.every(op => op.type === 'insert')).toBe(true)
    })

    it('右侧空数组应全为delete', () => {
      const result = histogramDiff(['a', 'b', 'c'], [])
      expect(result).toHaveLength(3)
      expect(result.every(op => op.type === 'delete')).toBe(true)
    })
  })

  describe('相同内容', () => {
    it('完全相同的内容应全为equal', () => {
      const result = histogramDiff(['a', 'b', 'c'], ['a', 'b', 'c'])
      expect(result).toHaveLength(3)
      expect(result.every(op => op.type === 'equal')).toBe(true)
    })

    it('单元素相同', () => {
      const result = histogramDiff(['hello'], ['hello'])
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('equal')
    })
  })

  describe('频率直方图', () => {
    it('优先匹配低频行', () => {
      // 高频行 'common' 和低频行 'unique'
      const left = ['common', 'common', 'unique', 'common']
      const right = ['common', 'common', 'unique', 'common']
      
      const result = histogramDiff(left, right)
      expect(result.every(op => op.type === 'equal')).toBe(true)
    })

    it('处理重复行', () => {
      const left = ['a', 'a', 'a', 'b', 'b']
      const right = ['a', 'a', 'a', 'b', 'b']
      
      const result = histogramDiff(left, right)
      expect(result).toHaveLength(5)
      expect(result.every(op => op.type === 'equal')).toBe(true)
    })

    it('可配置频率阈值', () => {
      const left = Array(10).fill('high-freq').concat(['low-freq'])
      const right = Array(10).fill('high-freq').concat(['low-freq'])
      
      // 使用低阈值，高频率行不参与匹配
      const result = histogramDiff(left, right, 5)
      
      // 应该能处理，可能回退到 Myers
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('候选选择', () => {
    it('选择不冲突的匹配', () => {
      const left = ['anchor1', 'middle', 'anchor2']
      const right = ['anchor1', 'changed', 'anchor2']
      
      const result = histogramDiff(left, right)
      
      // anchor1 和 anchor2 应该被匹配
      const equalOps = result.filter(op => op.type === 'equal')
      expect(equalOps.length).toBeGreaterThanOrEqual(2)
    })

    it('按分数排序候选', () => {
      // 出现次数相近的行应该有更高优先级
      const left = ['rare', 'common', 'rare']
      const right = ['rare', 'common', 'rare']
      
      const result = histogramDiff(left, right)
      expect(result.filter(op => op.type === 'equal')).toHaveLength(3)
    })
  })

  describe('纯插入', () => {
    it('末尾插入', () => {
      const result = histogramDiff(['a', 'b'], ['a', 'b', 'c'])
      expect(result.some(op => op.type === 'insert')).toBe(true)
    })

    it('开头插入', () => {
      const result = histogramDiff(['b', 'c'], ['a', 'b', 'c'])
      expect(result.some(op => op.type === 'insert')).toBe(true)
    })

    it('中间插入', () => {
      const result = histogramDiff(['a', 'c'], ['a', 'b', 'c'])
      expect(result.some(op => op.type === 'insert')).toBe(true)
    })
  })

  describe('纯删除', () => {
    it('末尾删除', () => {
      const result = histogramDiff(['a', 'b', 'c'], ['a', 'b'])
      expect(result.some(op => op.type === 'delete')).toBe(true)
    })

    it('开头删除', () => {
      const result = histogramDiff(['a', 'b', 'c'], ['b', 'c'])
      expect(result.some(op => op.type === 'delete')).toBe(true)
    })

    it('中间删除', () => {
      const result = histogramDiff(['a', 'b', 'c'], ['a', 'c'])
      expect(result.some(op => op.type === 'delete')).toBe(true)
    })
  })

  describe('替换操作', () => {
    it('单行替换', () => {
      const result = histogramDiff(['a', 'b', 'c'], ['a', 'x', 'c'])
      expect(result.some(op => op.type === 'replace')).toBe(true)
    })

    it('多行替换', () => {
      const result = histogramDiff(['a', 'b', 'c', 'd'], ['a', 'x', 'y', 'd'])
      expect(result.some(op => op.type === 'delete')).toBe(true)
      expect(result.some(op => op.type === 'insert') || result.some(op => op.type === 'replace')).toBe(true)
    })
  })

  describe('无候选时回退', () => {
    it('完全不相同时回退到 Myers', () => {
      const left = ['a', 'b', 'c']
      const right = ['x', 'y', 'z']
      
      const result = histogramDiff(left, right)
      
      // 验证结果有效
      expect(result.length).toBeGreaterThan(0)
      expect(result.every(op => ['delete', 'insert', 'replace'].includes(op.type))).toBe(true)
    })
  })

  describe('特殊字符', () => {
    it('处理 Unicode', () => {
      const result = histogramDiff(['你好', '世界'], ['你好', '地球'])
      expect(result).toHaveLength(3)
      expect(result[0].type).toBe('equal')
    })

    it('处理空字符串行', () => {
      const result = histogramDiff(['a', '', 'b'], ['a', 'x', 'b'])
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('行数守恒', () => {
    it('delete + equal = 左侧行数', () => {
      const left = ['a', 'b', 'c', 'd', 'e']
      const right = ['a', 'x', 'e']
      const result = histogramDiff(left, right)
      
      const deleteCount = result.filter(op => op.type === 'delete').length
      const equalCount = result.filter(op => op.type === 'equal').length
      
      expect(deleteCount + equalCount).toBe(left.length)
    })

    it('insert + equal = 右侧行数', () => {
      const left = ['a', 'e']
      const right = ['a', 'b', 'c', 'd', 'e']
      const result = histogramDiff(left, right)
      
      const insertCount = result.filter(op => op.type === 'insert').length
      const equalCount = result.filter(op => op.type === 'equal').length
      
      expect(insertCount + equalCount).toBe(right.length)
    })
  })

  describe('与 Patience 对比', () => {
    it('对唯一行处理类似 Patience', () => {
      const left = ['unique', 'common', 'rare']
      const right = ['unique', 'common', 'rare']
      
      const result = histogramDiff(left, right)
      expect(result.every(op => op.type === 'equal')).toBe(true)
    })
  })
})
