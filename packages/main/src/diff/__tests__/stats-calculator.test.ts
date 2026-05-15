import { describe, it, expect } from 'vitest'
import { calculateStats } from '../stats-calculator'
import type { DiffLine, DiffChunk } from '@shared/types'

describe('calculateStats', () => {
  describe('基本统计', () => {
    it('空输入返回零统计', () => {
      const lines: DiffLine[] = []
      const chunks: DiffChunk[] = []
      const result = calculateStats(lines, chunks)
      
      expect(result.totalLines).toBe(0)
      expect(result.equalLines).toBe(0)
      expect(result.insertedLines).toBe(0)
      expect(result.deletedLines).toBe(0)
      expect(result.modifiedLines).toBe(0)
      expect(result.chunkCount).toBe(0)
    })

    it('相同内容统计', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'a', rightContent: 'a' },
        { leftLineNo: 2, rightLineNo: 2, type: 'equal', leftContent: 'b', rightContent: 'b' },
        { leftLineNo: 3, rightLineNo: 3, type: 'equal', leftContent: 'c', rightContent: 'c' }
      ]
      const chunks: DiffChunk[] = []
      const result = calculateStats(lines, chunks)
      
      expect(result.totalLines).toBe(3)
      expect(result.equalLines).toBe(3)
      expect(result.insertedLines).toBe(0)
      expect(result.deletedLines).toBe(0)
      expect(result.modifiedLines).toBe(0)
      expect(result.chunkCount).toBe(0)
    })

    it('只有insert', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'a', rightContent: 'a' },
        { leftLineNo: null, rightLineNo: 2, type: 'insert', leftContent: '', rightContent: 'b' },
        { leftLineNo: null, rightLineNo: 3, type: 'insert', leftContent: '', rightContent: 'c' }
      ]
      const chunks: DiffChunk[] = [{ 
        id: 'chunk-1', 
        startIndex: 1, 
        endIndex: 2, 
        type: 'insert', 
        leftLineRange: [0, 0], 
        rightLineRange: [2, 3], 
        changeIndices: [1, 2] 
      }]
      const result = calculateStats(lines, chunks)
      
      expect(result.totalLines).toBe(3)
      expect(result.equalLines).toBe(1)
      expect(result.insertedLines).toBe(2)
      expect(result.deletedLines).toBe(0)
      expect(result.modifiedLines).toBe(0)
      expect(result.chunkCount).toBe(1)
    })

    it('只有delete', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'a', rightContent: 'a' },
        { leftLineNo: 2, rightLineNo: null, type: 'delete', leftContent: 'b', rightContent: '' },
        { leftLineNo: 3, rightLineNo: null, type: 'delete', leftContent: 'c', rightContent: '' }
      ]
      const chunks: DiffChunk[] = [{ 
        id: 'chunk-1', 
        startIndex: 1, 
        endIndex: 2, 
        type: 'delete', 
        leftLineRange: [2, 3], 
        rightLineRange: [0, 0], 
        changeIndices: [1, 2] 
      }]
      const result = calculateStats(lines, chunks)
      
      expect(result.totalLines).toBe(3)
      expect(result.equalLines).toBe(1)
      expect(result.insertedLines).toBe(0)
      expect(result.deletedLines).toBe(2)
      expect(result.modifiedLines).toBe(0)
      expect(result.chunkCount).toBe(1)
    })

    it('只有replace', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'a', rightContent: 'a' },
        { leftLineNo: 2, rightLineNo: 2, type: 'replace', leftContent: 'old', rightContent: 'new' },
        { leftLineNo: 3, rightLineNo: 3, type: 'replace', leftContent: 'old2', rightContent: 'new2' }
      ]
      const chunks: DiffChunk[] = [{ 
        id: 'chunk-1', 
        startIndex: 1, 
        endIndex: 2, 
        type: 'change', 
        leftLineRange: [2, 3], 
        rightLineRange: [2, 3], 
        changeIndices: [1, 2] 
      }]
      const result = calculateStats(lines, chunks)
      
      expect(result.totalLines).toBe(3)
      expect(result.equalLines).toBe(1)
      expect(result.insertedLines).toBe(0)
      expect(result.deletedLines).toBe(0)
      expect(result.modifiedLines).toBe(2)
      expect(result.chunkCount).toBe(1)
    })
  })

  describe('混合统计', () => {
    it('insert + delete + equal', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'a', rightContent: 'a' },
        { leftLineNo: 2, rightLineNo: null, type: 'delete', leftContent: 'b', rightContent: '' },
        { leftLineNo: null, rightLineNo: 2, type: 'insert', leftContent: '', rightContent: 'c' },
        { leftLineNo: 3, rightLineNo: 3, type: 'equal', leftContent: 'd', rightContent: 'd' }
      ]
      const chunks: DiffChunk[] = [
        { id: 'chunk-1', startIndex: 1, endIndex: 2, type: 'change', leftLineRange: [2, 2], rightLineRange: [2, 2], changeIndices: [1, 2] }
      ]
      const result = calculateStats(lines, chunks)
      
      expect(result.totalLines).toBe(4)
      expect(result.equalLines).toBe(2)
      expect(result.insertedLines).toBe(1)
      expect(result.deletedLines).toBe(1)
      expect(result.modifiedLines).toBe(0)
      expect(result.chunkCount).toBe(1)
    })

    it('replace + insert + delete', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'a', rightContent: 'a' },
        { leftLineNo: 2, rightLineNo: 2, type: 'replace', leftContent: 'old', rightContent: 'new' },
        { leftLineNo: 3, rightLineNo: null, type: 'delete', leftContent: 'delete', rightContent: '' },
        { leftLineNo: null, rightLineNo: 3, type: 'insert', leftContent: '', rightContent: 'insert' },
        { leftLineNo: 4, rightLineNo: 4, type: 'equal', leftContent: 'b', rightContent: 'b' }
      ]
      const chunks: DiffChunk[] = [
        { id: 'chunk-1', startIndex: 1, endIndex: 3, type: 'change', leftLineRange: [2, 3], rightLineRange: [2, 3], changeIndices: [1, 2, 3] }
      ]
      const result = calculateStats(lines, chunks)
      
      expect(result.totalLines).toBe(5)
      expect(result.equalLines).toBe(2)
      expect(result.insertedLines).toBe(1)
      expect(result.deletedLines).toBe(1)
      expect(result.modifiedLines).toBe(1)
      expect(result.chunkCount).toBe(1)
    })

    it('多chunk统计', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: '1', rightContent: '1' },
        { leftLineNo: null, rightLineNo: 2, type: 'insert', leftContent: '', rightContent: 'a' },
        { leftLineNo: 2, rightLineNo: 3, type: 'equal', leftContent: '2', rightContent: '2' },
        { leftLineNo: 3, rightLineNo: null, type: 'delete', leftContent: '3', rightContent: '' },
        { leftLineNo: 4, rightLineNo: 4, type: 'equal', leftContent: '4', rightContent: '4' }
      ]
      const chunks: DiffChunk[] = [
        { id: 'chunk-1', startIndex: 1, endIndex: 1, type: 'insert', leftLineRange: [0, 0], rightLineRange: [2, 2], changeIndices: [1] },
        { id: 'chunk-2', startIndex: 3, endIndex: 3, type: 'delete', leftLineRange: [3, 3], rightLineRange: [0, 0], changeIndices: [3] }
      ]
      const result = calculateStats(lines, chunks)
      
      expect(result.totalLines).toBe(5)
      expect(result.equalLines).toBe(3)
      expect(result.insertedLines).toBe(1)
      expect(result.deletedLines).toBe(1)
      expect(result.modifiedLines).toBe(0)
      expect(result.chunkCount).toBe(2)
    })
  })

  describe('大量数据', () => {
    it('处理大量相同行', () => {
      const lines: DiffLine[] = Array(10000).fill(null).map((_, i) => ({
        leftLineNo: i + 1,
        rightLineNo: i + 1,
        type: 'equal' as const,
        leftContent: `line${i}`,
        rightContent: `line${i}`
      }))
      const chunks: DiffChunk[] = []
      const result = calculateStats(lines, chunks)
      
      expect(result.totalLines).toBe(10000)
      expect(result.equalLines).toBe(10000)
      expect(result.insertedLines).toBe(0)
      expect(result.deletedLines).toBe(0)
      expect(result.modifiedLines).toBe(0)
    })

    it('处理大量变更行', () => {
      const lines: DiffLine[] = Array(1000).fill(null).map((_, i) => ({
        leftLineNo: null,
        rightLineNo: i + 1,
        type: 'insert' as const,
        leftContent: '',
        rightContent: `line${i}`
      }))
      const chunks: DiffChunk[] = [{ 
        id: 'chunk-1', 
        startIndex: 0, 
        endIndex: 999, 
        type: 'insert', 
        leftLineRange: [0, 0], 
        rightLineRange: [1, 1000], 
        changeIndices: Array.from({ length: 1000 }, (_, i) => i) 
      }]
      const result = calculateStats(lines, chunks)
      
      expect(result.totalLines).toBe(1000)
      expect(result.equalLines).toBe(0)
      expect(result.insertedLines).toBe(1000)
      expect(result.deletedLines).toBe(0)
      expect(result.modifiedLines).toBe(0)
      expect(result.chunkCount).toBe(1)
    })
  })

  describe('边界情况', () => {
    it('单行insert', () => {
      const lines: DiffLine[] = [
        { leftLineNo: null, rightLineNo: 1, type: 'insert', leftContent: '', rightContent: 'new' }
      ]
      const chunks: DiffChunk[] = [{ 
        id: 'chunk-1', 
        startIndex: 0, 
        endIndex: 0, 
        type: 'insert', 
        leftLineRange: [0, 0], 
        rightLineRange: [1, 1], 
        changeIndices: [0] 
      }]
      const result = calculateStats(lines, chunks)
      
      expect(result.totalLines).toBe(1)
      expect(result.insertedLines).toBe(1)
      expect(result.chunkCount).toBe(1)
    })

    it('单行delete', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: null, type: 'delete', leftContent: 'old', rightContent: '' }
      ]
      const chunks: DiffChunk[] = [{ 
        id: 'chunk-1', 
        startIndex: 0, 
        endIndex: 0, 
        type: 'delete', 
        leftLineRange: [1, 1], 
        rightLineRange: [0, 0], 
        changeIndices: [0] 
      }]
      const result = calculateStats(lines, chunks)
      
      expect(result.totalLines).toBe(1)
      expect(result.deletedLines).toBe(1)
      expect(result.chunkCount).toBe(1)
    })

    it('单行replace', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'replace', leftContent: 'old', rightContent: 'new' }
      ]
      const chunks: DiffChunk[] = [{ 
        id: 'chunk-1', 
        startIndex: 0, 
        endIndex: 0, 
        type: 'change', 
        leftLineRange: [1, 1], 
        rightLineRange: [1, 1], 
        changeIndices: [0] 
      }]
      const result = calculateStats(lines, chunks)
      
      expect(result.totalLines).toBe(1)
      expect(result.modifiedLines).toBe(1)
      expect(result.chunkCount).toBe(1)
    })
  })
})
