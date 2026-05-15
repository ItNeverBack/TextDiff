import { describe, it, expect } from 'vitest'
import { myersDiff } from '../myers'

describe('Myers Diff Algorithm', () => {
  describe('基本边界情况', () => {
    it('空数组对比应返回空数组', () => {
      const result = myersDiff([], [])
      expect(result).toEqual([])
    })

    it('左侧空数组应全为insert', () => {
      const result = myersDiff([], ['a', 'b', 'c'])
      expect(result).toHaveLength(3)
      expect(result.every(op => op.type === 'insert')).toBe(true)
      expect(result[0].rightIndex).toBe(0)
      expect(result[1].rightIndex).toBe(1)
      expect(result[2].rightIndex).toBe(2)
      expect(result[0].leftIndex).toBe(-1)
    })

    it('右侧空数组应全为delete', () => {
      const result = myersDiff(['a', 'b', 'c'], [])
      expect(result).toHaveLength(3)
      expect(result.every(op => op.type === 'delete')).toBe(true)
      expect(result[0].leftIndex).toBe(0)
      expect(result[1].leftIndex).toBe(1)
      expect(result[2].leftIndex).toBe(2)
      expect(result[0].rightIndex).toBe(-1)
    })
  })

  describe('相同内容', () => {
    it('完全相同的内容应全为equal', () => {
      const result = myersDiff(['a', 'b', 'c'], ['a', 'b', 'c'])
      expect(result).toHaveLength(3)
      expect(result.every(op => op.type === 'equal')).toBe(true)
      expect(result[0].leftIndex).toBe(0)
      expect(result[0].rightIndex).toBe(0)
      expect(result[1].leftIndex).toBe(1)
      expect(result[1].rightIndex).toBe(1)
    })

    it('单元素相同', () => {
      const result = myersDiff(['hello'], ['hello'])
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('equal')
    })

    it('大量相同行应保持equal', () => {
      const lines = Array(1000).fill('same line')
      const start = Date.now()
      const result = myersDiff(lines, lines)
      const duration = Date.now() - start
      expect(result).toHaveLength(1000)
      expect(result.every(op => op.type === 'equal')).toBe(true)
      expect(duration).toBeLessThan(100) // 性能检查
    })
  })

  describe('纯插入', () => {
    it('末尾插入应只有一个insert', () => {
      const result = myersDiff(['a', 'b'], ['a', 'b', 'c'])
      expect(result).toHaveLength(3)
      expect(result[0].type).toBe('equal')
      expect(result[1].type).toBe('equal')
      expect(result[2].type).toBe('insert')
      expect(result[2].rightIndex).toBe(2)
    })

    it('开头插入应只有一个insert', () => {
      const result = myersDiff(['b', 'c'], ['a', 'b', 'c'])
      expect(result).toHaveLength(3)
      expect(result[0].type).toBe('insert')
      expect(result[1].type).toBe('equal')
      expect(result[2].type).toBe('equal')
    })

    it('中间插入应只有一个insert', () => {
      const result = myersDiff(['a', 'c'], ['a', 'b', 'c'])
      expect(result).toHaveLength(3)
      expect(result[0].type).toBe('equal')
      expect(result[1].type).toBe('insert')
      expect(result[2].type).toBe('equal')
    })

    it('多行插入', () => {
      const result = myersDiff(['a', 'd'], ['a', 'b', 'c', 'd'])
      expect(result).toHaveLength(4)
      expect(result[0].type).toBe('equal')
      expect(result[1].type).toBe('insert')
      expect(result[2].type).toBe('insert')
      expect(result[3].type).toBe('equal')
    })
  })

  describe('纯删除', () => {
    it('末尾删除应只有一个delete', () => {
      const result = myersDiff(['a', 'b', 'c'], ['a', 'b'])
      expect(result).toHaveLength(3)
      expect(result[0].type).toBe('equal')
      expect(result[1].type).toBe('equal')
      expect(result[2].type).toBe('delete')
      expect(result[2].leftIndex).toBe(2)
    })

    it('开头删除应只有一个delete', () => {
      const result = myersDiff(['a', 'b', 'c'], ['b', 'c'])
      expect(result).toHaveLength(3)
      expect(result[0].type).toBe('delete')
      expect(result[1].type).toBe('equal')
      expect(result[2].type).toBe('equal')
    })

    it('中间删除应只有一个delete', () => {
      const result = myersDiff(['a', 'b', 'c'], ['a', 'c'])
      expect(result).toHaveLength(3)
      expect(result[0].type).toBe('equal')
      expect(result[1].type).toBe('delete')
      expect(result[2].type).toBe('equal')
    })

    it('多行删除', () => {
      const result = myersDiff(['a', 'b', 'c', 'd'], ['a', 'd'])
      expect(result).toHaveLength(4)
      expect(result[0].type).toBe('equal')
      expect(result[1].type).toBe('delete')
      expect(result[2].type).toBe('delete')
      expect(result[3].type).toBe('equal')
    })
  })

  describe('替换（delete + insert）', () => {
    it('单行替换应返回delete后insert', () => {
      const result = myersDiff(['a', 'b', 'c'], ['a', 'x', 'c'])
      // myersDiff 直接输出 delete + insert (4个操作: equal, delete, insert, equal)
      // replace 类型是在 mergeReplaceOperations 中合并的
      expect(result).toHaveLength(4)
      expect(result[0].type).toBe('equal')
      expect(result[1].type).toBe('delete')
      expect(result[2].type).toBe('insert')
      expect(result[3].type).toBe('equal')
      expect(result[1].leftIndex).toBe(1)
      expect(result[2].rightIndex).toBe(1)
    })

    it('多行替换', () => {
      const result = myersDiff(['a', 'b', 'c', 'd'], ['a', 'x', 'y', 'd'])
      expect(result).toHaveLength(6)
      expect(result[0].type).toBe('equal')
      expect(result[1].type).toBe('delete')
      expect(result[2].type).toBe('delete')
      expect(result[3].type).toBe('insert')
      expect(result[4].type).toBe('insert')
      expect(result[5].type).toBe('equal')
      // Note: Myers may produce different sequence, just verify it's valid
      expect(result.some(op => op.type === 'delete')).toBe(true)
      expect(result.some(op => op.type === 'insert')).toBe(true)
    })
  })

  describe('复杂场景', () => {
    it('混合操作', () => {
      const left = ['a', 'b', 'c', 'd', 'e']
      const right = ['a', 'x', 'c', 'y', 'e']
      const result = myersDiff(left, right)
      
      // 验证结果数量
      expect(result.length).toBeGreaterThanOrEqual(5)
      
      // 验证首尾相等
      expect(result[0].type).toBe('equal')
      expect(result[result.length - 1].type).toBe('equal')
      
      // 验证包含变更
      const hasChanges = result.some(op => op.type === 'insert' || op.type === 'delete')
      expect(hasChanges).toBe(true)
    })

    it('完全重排', () => {
      const left = ['a', 'b', 'c']
      const right = ['c', 'b', 'a']
      const result = myersDiff(left, right)
      
      // 验证行数守恒
      const deleteCount = result.filter(op => op.type === 'delete').length
      const insertCount = result.filter(op => op.type === 'insert').length
      const equalCount = result.filter(op => op.type === 'equal').length
      
      expect(deleteCount + equalCount).toBe(left.length)
      expect(insertCount + equalCount).toBe(right.length)
    })
  })

  describe('特殊字符处理', () => {
    it('处理Unicode字符', () => {
      const result = myersDiff(['你好', '世界'], ['你好', '地球'])
      expect(result).toHaveLength(3)
      expect(result[0].type).toBe('equal')
      expect(result[1].type).toBe('delete')
      expect(result[2].type).toBe('insert')
      expect(result[1].leftIndex).toBe(1)
      expect(result[2].rightIndex).toBe(1)
    })

    it('处理空字符串行', () => {
      // 当从 ['a', '', 'c'] 变为 ['a', 'b', 'c'] 时
      // 中间行从空字符串变为 'b'，这是 delete + insert
      const result = myersDiff(['a', '', 'c'], ['a', 'b', 'c'])
      expect(result).toHaveLength(4)
      expect(result[0].type).toBe('equal')
      expect(result[1].type).toBe('delete')
      expect(result[2].type).toBe('insert')
      expect(result[3].type).toBe('equal')
    })

    it('处理Tab和空格', () => {
      const result = myersDiff(['a\tb', 'c'], ['a  b', 'c'])
      expect(result).toHaveLength(3)
      expect(result[0].type).toBe('delete')
      expect(result[1].type).toBe('insert')
      expect(result[2].type).toBe('equal')
    })

    it('处理长行', () => {
      const longLine1 = 'a'.repeat(10000)
      const longLine2 = 'b'.repeat(10000)
      const result = myersDiff([longLine1], [longLine2])
      expect(result).toHaveLength(2)
      expect(result[0].type).toBe('delete')
      expect(result[1].type).toBe('insert')
    })
  })

  describe('结果可逆性验证', () => {
    it('应用ops到左侧应得到右侧', () => {
      const left = ['line1', 'line2', 'line3']
      const right = ['line1', 'modified', 'line3', 'line4']
      const result = myersDiff(left, right)
      
      // 重建right
      const reconstructed: string[] = []
      for (const op of result) {
        if (op.type === 'equal') {
          reconstructed.push(left[op.leftIndex])
        } else if (op.type === 'insert') {
          reconstructed.push(right[op.rightIndex])
        }
        // delete类型不添加到结果
      }
      
      expect(reconstructed).toEqual(right)
    })
  })

  describe('行数守恒验证', () => {
    it('delete + equal = 左侧行数', () => {
      const left = ['a', 'b', 'c', 'd', 'e']
      const right = ['a', 'x', 'e']
      const result = myersDiff(left, right)
      
      const deleteCount = result.filter(op => op.type === 'delete').length
      const equalCount = result.filter(op => op.type === 'equal').length
      
      expect(deleteCount + equalCount).toBe(left.length)
    })

    it('insert + equal = 右侧行数', () => {
      const left = ['a', 'e']
      const right = ['a', 'b', 'c', 'd', 'e']
      const result = myersDiff(left, right)
      
      const insertCount = result.filter(op => op.type === 'insert').length
      const equalCount = result.filter(op => op.type === 'equal').length
      
      expect(insertCount + equalCount).toBe(right.length)
    })
  })
})
