import { describe, it, expect } from 'vitest'
import { buildChunks } from '../chunk-builder'
import type { DiffLine } from '@shared/types'

describe('buildChunks', () => {
  describe('基本功能', () => {
    it('空lines数组返回空chunks', () => {
      const result = buildChunks([], 3)
      expect(result).toEqual([])
    })

    it('没有变更行返回空chunks', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'a', rightContent: 'a' },
        { leftLineNo: 2, rightLineNo: 2, type: 'equal', leftContent: 'b', rightContent: 'b' }
      ]
      const result = buildChunks(lines, 3)
      expect(result).toEqual([])
    })

    it('单变更行创建单个chunk', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'a', rightContent: 'a' },
        { leftLineNo: 2, rightLineNo: null, type: 'delete', leftContent: 'b', rightContent: '' },
        { leftLineNo: 3, rightLineNo: 2, type: 'equal', leftContent: 'c', rightContent: 'c' }
      ]
      const result = buildChunks(lines, 3)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('delete')
    })
  })

  describe('相邻变更合并', () => {
    it('相邻变更行合并为同一chunk', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'a', rightContent: 'a' },
        { leftLineNo: null, rightLineNo: 2, type: 'insert', leftContent: '', rightContent: 'b' },
        { leftLineNo: null, rightLineNo: 3, type: 'insert', leftContent: '', rightContent: 'c' },
        { leftLineNo: 2, rightLineNo: 4, type: 'equal', leftContent: 'd', rightContent: 'd' }
      ]
      const result = buildChunks(lines, 3)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('insert')
      expect(result[0].changeIndices).toEqual([1, 2])
    })

    it('不相邻的变更分为不同chunks', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'a', rightContent: 'a' },
        { leftLineNo: null, rightLineNo: 2, type: 'insert', leftContent: '', rightContent: 'b' },
        { leftLineNo: 2, rightLineNo: 3, type: 'equal', leftContent: 'c', rightContent: 'c' },
        { leftLineNo: null, rightLineNo: 4, type: 'insert', leftContent: '', rightContent: 'd' },
        { leftLineNo: 3, rightLineNo: 5, type: 'equal', leftContent: 'e', rightContent: 'e' }
      ]
      const result = buildChunks(lines, 0) // contextLines=0确保不重叠
      expect(result).toHaveLength(2)
    })
  })

  describe('chunk范围计算', () => {
    it('contextLines=3时包含3行上下文', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: '1', rightContent: '1' },
        { leftLineNo: 2, rightLineNo: 2, type: 'equal', leftContent: '2', rightContent: '2' },
        { leftLineNo: 3, rightLineNo: 3, type: 'equal', leftContent: '3', rightContent: '3' },
        { leftLineNo: 4, rightLineNo: 4, type: 'equal', leftContent: '4', rightContent: '4' },
        { leftLineNo: null, rightLineNo: 5, type: 'insert', leftContent: '', rightContent: 'new' },
        { leftLineNo: 5, rightLineNo: 6, type: 'equal', leftContent: '5', rightContent: '5' },
        { leftLineNo: 6, rightLineNo: 7, type: 'equal', leftContent: '6', rightContent: '6' },
        { leftLineNo: 7, rightLineNo: 8, type: 'equal', leftContent: '7', rightContent: '7' },
        { leftLineNo: 8, rightLineNo: 9, type: 'equal', leftContent: '8', rightContent: '8' }
      ]
      const result = buildChunks(lines, 3)
      expect(result).toHaveLength(1)
      // chunk 应该包含上下文：从第1行(index=0)到第7行(index=6)
      expect(result[0].startIndex).toBe(1) // 3行上下文
      expect(result[0].endIndex).toBe(6)   // 3行上下文
    })

    it('contextLines=0时只包含变更行', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'a', rightContent: 'a' },
        { leftLineNo: null, rightLineNo: 2, type: 'insert', leftContent: '', rightContent: 'b' },
        { leftLineNo: 2, rightLineNo: 3, type: 'equal', leftContent: 'c', rightContent: 'c' }
      ]
      const result = buildChunks(lines, 0)
      expect(result).toHaveLength(1)
      expect(result[0].startIndex).toBe(1)
      expect(result[0].endIndex).toBe(1)
    })

    it('文件开头变更不越界', () => {
      const lines: DiffLine[] = [
        { leftLineNo: null, rightLineNo: 1, type: 'insert', leftContent: '', rightContent: 'new' },
        { leftLineNo: 1, rightLineNo: 2, type: 'equal', leftContent: 'a', rightContent: 'a' },
        { leftLineNo: 2, rightLineNo: 3, type: 'equal', leftContent: 'b', rightContent: 'b' }
      ]
      const result = buildChunks(lines, 5) // 超过文件行数的上下文
      expect(result).toHaveLength(1)
      expect(result[0].startIndex).toBe(0) // 不能小于0
    })

    it('文件末尾变更不越界', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'a', rightContent: 'a' },
        { leftLineNo: 2, rightLineNo: 2, type: 'equal', leftContent: 'b', rightContent: 'b' },
        { leftLineNo: null, rightLineNo: 3, type: 'insert', leftContent: '', rightContent: 'new' }
      ]
      const result = buildChunks(lines, 5)
      expect(result).toHaveLength(1)
      expect(result[0].endIndex).toBeLessThan(lines.length)
    })
  })

  describe('chunk类型', () => {
    it('只有insert时类型为insert', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'a', rightContent: 'a' },
        { leftLineNo: null, rightLineNo: 2, type: 'insert', leftContent: '', rightContent: 'b' },
        { leftLineNo: null, rightLineNo: 3, type: 'insert', leftContent: '', rightContent: 'c' }
      ]
      const result = buildChunks(lines, 0)
      expect(result[0].type).toBe('insert')
    })

    it('只有delete时类型为delete', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'a', rightContent: 'a' },
        { leftLineNo: 2, rightLineNo: null, type: 'delete', leftContent: 'b', rightContent: '' },
        { leftLineNo: 3, rightLineNo: null, type: 'delete', leftContent: 'c', rightContent: '' }
      ]
      const result = buildChunks(lines, 0)
      expect(result[0].type).toBe('delete')
    })

    it('insert和delete混合时类型为change', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'a', rightContent: 'a' },
        { leftLineNo: 2, rightLineNo: null, type: 'delete', leftContent: 'b', rightContent: '' },
        { leftLineNo: null, rightLineNo: 2, type: 'insert', leftContent: '', rightContent: 'c' }
      ]
      const result = buildChunks(lines, 0)
      expect(result[0].type).toBe('change')
    })
  })

  describe('行号范围', () => {
    it('计算正确的leftLineRange', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'a', rightContent: 'a' },
        { leftLineNo: 2, rightLineNo: null, type: 'delete', leftContent: 'b', rightContent: '' },
        { leftLineNo: 3, rightLineNo: null, type: 'delete', leftContent: 'c', rightContent: '' },
        { leftLineNo: 4, rightLineNo: 2, type: 'equal', leftContent: 'd', rightContent: 'd' }
      ]
      const result = buildChunks(lines, 0)
      expect(result[0].leftLineRange).toEqual([2, 3])
    })

    it('计算正确的rightLineRange', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'a', rightContent: 'a' },
        { leftLineNo: null, rightLineNo: 2, type: 'insert', leftContent: '', rightContent: 'b' },
        { leftLineNo: null, rightLineNo: 3, type: 'insert', leftContent: '', rightContent: 'c' },
        { leftLineNo: 2, rightLineNo: 4, type: 'equal', leftContent: 'd', rightContent: 'd' }
      ]
      const result = buildChunks(lines, 0)
      expect(result[0].rightLineRange).toEqual([2, 3])
    })

    it('混合变更的行号范围', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'a', rightContent: 'a' },
        { leftLineNo: 2, rightLineNo: 2, type: 'replace', leftContent: 'old', rightContent: 'new' },
        { leftLineNo: 3, rightLineNo: 3, type: 'equal', leftContent: 'c', rightContent: 'c' }
      ]
      const result = buildChunks(lines, 0)
      expect(result[0].leftLineRange).toEqual([2, 2])
      expect(result[0].rightLineRange).toEqual([2, 2])
    })
  })

  describe('changeIndices', () => {
    it('记录正确的变更行索引', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'a', rightContent: 'a' },
        { leftLineNo: null, rightLineNo: 2, type: 'insert', leftContent: '', rightContent: 'b' },
        { leftLineNo: null, rightLineNo: 3, type: 'insert', leftContent: '', rightContent: 'c' },
        { leftLineNo: 2, rightLineNo: 4, type: 'equal', leftContent: 'd', rightContent: 'd' }
      ]
      const result = buildChunks(lines, 3)
      expect(result[0].changeIndices).toEqual([1, 2])
    })

    it('不包含上下文行', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: '1', rightContent: '1' },
        { leftLineNo: 2, rightLineNo: 2, type: 'equal', leftContent: '2', rightContent: '2' },
        { leftLineNo: 3, rightLineNo: 3, type: 'equal', leftContent: '3', rightContent: '3' },
        { leftLineNo: null, rightLineNo: 4, type: 'insert', leftContent: '', rightContent: 'new' },
        { leftLineNo: 4, rightLineNo: 5, type: 'equal', leftContent: '4', rightContent: '4' },
        { leftLineNo: 5, rightLineNo: 6, type: 'equal', leftContent: '5', rightContent: '5' },
        { leftLineNo: 6, rightLineNo: 7, type: 'equal', leftContent: '6', rightContent: '6' }
      ]
      const result = buildChunks(lines, 3)
      // 即使chunk范围包含上下文，changeIndices只记录实际变更
      expect(result[0].changeIndices).toEqual([3])
    })
  })

  describe('多chunk不重叠', () => {
    it('多个chunk之间不重叠', () => {
      // 创建有间隔的变更
      const lines: DiffLine[] = []
      for (let i = 1; i <= 20; i++) {
        lines.push({
          leftLineNo: i,
          rightLineNo: i,
          type: 'equal',
          leftContent: `line${i}`,
          rightContent: `line${i}`
        })
      }
      // 在位置3和位置15插入变更
      lines[3] = { leftLineNo: null, rightLineNo: 4, type: 'insert', leftContent: '', rightContent: 'new1' }
      lines[15] = { leftLineNo: null, rightLineNo: 16, type: 'insert', leftContent: '', rightContent: 'new2' }
      
      const result = buildChunks(lines, 3)
      expect(result).toHaveLength(2)
      // 第一个chunk的结束应该小于第二个chunk的开始
      expect(result[0].endIndex).toBeLessThan(result[1].startIndex)
    })

    it('边界合并时chunk不重叠', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: '1', rightContent: '1' },
        { leftLineNo: null, rightLineNo: 2, type: 'insert', leftContent: '', rightContent: 'a' },
        { leftLineNo: 2, rightLineNo: 3, type: 'equal', leftContent: '2', rightContent: '2' },
        { leftLineNo: 3, rightLineNo: 4, type: 'equal', leftContent: '3', rightContent: '3' },
        { leftLineNo: 4, rightLineNo: 5, type: 'equal', leftContent: '4', rightContent: '4' },
        { leftLineNo: 5, rightLineNo: 6, type: 'equal', leftContent: '5', rightContent: '5' },
        { leftLineNo: null, rightLineNo: 7, type: 'insert', leftContent: '', rightContent: 'b' },
        { leftLineNo: 6, rightLineNo: 8, type: 'equal', leftContent: '6', rightContent: '6' }
      ]
      const result = buildChunks(lines, 3)
      expect(result).toHaveLength(2)
      // chunk边界应该是它们之间的中点
      expect(result[0].endIndex).toBeLessThan(result[1].startIndex)
    })
  })

  describe('chunk ID', () => {
    it('每个chunk有唯一ID', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: '1', rightContent: '1' },
        { leftLineNo: null, rightLineNo: 2, type: 'insert', leftContent: '', rightContent: 'a' },
        { leftLineNo: 2, rightLineNo: 3, type: 'equal', leftContent: '2', rightContent: '2' },
        { leftLineNo: null, rightLineNo: 4, type: 'insert', leftContent: '', rightContent: 'b' },
        { leftLineNo: 3, rightLineNo: 5, type: 'equal', leftContent: '3', rightContent: '3' }
      ]
      const result = buildChunks(lines, 0)
      expect(result).toHaveLength(2)
      expect(result[0].id).toBeDefined()
      expect(result[1].id).toBeDefined()
      expect(result[0].id).not.toBe(result[1].id)
      expect(result[0].id.startsWith('chunk-')).toBe(true)
    })
  })
})
