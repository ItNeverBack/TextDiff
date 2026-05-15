import { describe, it, expect } from 'vitest'
import {
  syncDiff,
  syncAllDiffs,
  type SyncOptions
} from '../sync'
import type { DiffLine, DiffChunk } from '@shared/types'

describe('syncDiff', () => {
  const createMockLines = (): DiffLine[] => [
    { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'line1', rightContent: 'line1' },
    { leftLineNo: 2, rightLineNo: null, type: 'delete', leftContent: 'deleted-line', rightContent: '' },
    { leftLineNo: 3, rightLineNo: 2, type: 'equal', leftContent: 'line3', rightContent: 'line3' }
  ]

  const createMockChunks = (): DiffChunk[] => [
    {
      id: 'chunk-1',
      startIndex: 1,
      endIndex: 1,
      type: 'delete',
      leftLineRange: [2, 2],
      rightLineRange: [0, 0],
      changeIndices: [1]
    }
  ]

  describe('left-to-right 同步', () => {
    it('delete 行在右侧插入', () => {
      const leftContent = 'line1\ndeleted-line\nline3'
      const rightContent = 'line1\nline3'
      const lines = createMockLines()
      const chunks = createMockChunks()
      const options: SyncOptions = { direction: 'left-to-right' }

      const result = syncDiff(leftContent, rightContent, lines, chunks, options)

      expect(result.rightContent).toBe('line1\ndeleted-line\nline3')
      expect(result.stats.insertedLines).toBe(1)
    })

    it('insert 行在右侧删除', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'line1', rightContent: 'line1' },
        { leftLineNo: null, rightLineNo: 2, type: 'insert', leftContent: '', rightContent: 'inserted' },
        { leftLineNo: 2, rightLineNo: 3, type: 'equal', leftContent: 'line2', rightContent: 'line2' }
      ]
      const chunks: DiffChunk[] = [{
        id: 'chunk-1',
        startIndex: 1,
        endIndex: 1,
        type: 'insert',
        leftLineRange: [0, 0],
        rightLineRange: [2, 2],
        changeIndices: [1]
      }]
      
      const result = syncDiff('line1\nline2', 'line1\ninserted\nline2', lines, chunks, {
        direction: 'left-to-right'
      })

      expect(result.rightContent).toBe('line1\nline2')
      expect(result.stats.deletedLines).toBe(1)
    })

    it('replace 用左侧替换右侧', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'line1', rightContent: 'line1' },
        { leftLineNo: 2, rightLineNo: 2, type: 'replace', leftContent: 'new-content', rightContent: 'old-content' },
        { leftLineNo: 3, rightLineNo: 3, type: 'equal', leftContent: 'line3', rightContent: 'line3' }
      ]
      const chunks: DiffChunk[] = [{
        id: 'chunk-1',
        startIndex: 1,
        endIndex: 1,
        type: 'change',
        leftLineRange: [2, 2],
        rightLineRange: [2, 2],
        changeIndices: [1]
      }]
      
      const result = syncDiff('line1\nnew-content\nline3', 'line1\nold-content\nline3', lines, chunks, {
        direction: 'left-to-right'
      })

      expect(result.rightContent).toBe('line1\nnew-content\nline3')
      expect(result.stats.modifiedLines).toBe(1)
    })
  })

  describe('right-to-left 同步', () => {
    it('insert 行在左侧插入', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'line1', rightContent: 'line1' },
        { leftLineNo: null, rightLineNo: 2, type: 'insert', leftContent: '', rightContent: 'inserted' },
        { leftLineNo: 2, rightLineNo: 3, type: 'equal', leftContent: 'line2', rightContent: 'line2' }
      ]
      const chunks: DiffChunk[] = [{
        id: 'chunk-1',
        startIndex: 1,
        endIndex: 1,
        type: 'insert',
        leftLineRange: [0, 0],
        rightLineRange: [2, 2],
        changeIndices: [1]
      }]
      
      const result = syncDiff('line1\nline2', 'line1\ninserted\nline2', lines, chunks, {
        direction: 'right-to-left'
      })

      expect(result.leftContent).toBe('line1\ninserted\nline2')
      expect(result.stats.insertedLines).toBe(1)
    })

    it('delete 行在左侧删除', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'line1', rightContent: 'line1' },
        { leftLineNo: 2, rightLineNo: null, type: 'delete', leftContent: 'deleted', rightContent: '' },
        { leftLineNo: 3, rightLineNo: 2, type: 'equal', leftContent: 'line2', rightContent: 'line2' }
      ]
      const chunks: DiffChunk[] = [{
        id: 'chunk-1',
        startIndex: 1,
        endIndex: 1,
        type: 'delete',
        leftLineRange: [2, 2],
        rightLineRange: [0, 0],
        changeIndices: [1]
      }]
      
      const result = syncDiff('line1\ndeleted\nline2', 'line1\nline2', lines, chunks, {
        direction: 'right-to-left'
      })

      expect(result.leftContent).toBe('line1\nline2')
      expect(result.stats.deletedLines).toBe(1)
    })

    it('replace 用右侧替换左侧', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'line1', rightContent: 'line1' },
        { leftLineNo: 2, rightLineNo: 2, type: 'replace', leftContent: 'old', rightContent: 'new' },
        { leftLineNo: 3, rightLineNo: 3, type: 'equal', leftContent: 'line3', rightContent: 'line3' }
      ]
      const chunks: DiffChunk[] = [{
        id: 'chunk-1',
        startIndex: 1,
        endIndex: 1,
        type: 'change',
        leftLineRange: [2, 2],
        rightLineRange: [2, 2],
        changeIndices: [1]
      }]
      
      const result = syncDiff('line1\nold\nline3', 'line1\nnew\nline3', lines, chunks, {
        direction: 'right-to-left'
      })

      expect(result.leftContent).toBe('line1\nnew\nline3')
      expect(result.stats.modifiedLines).toBe(1)
    })
  })

  describe('多 chunk 同步', () => {
    it('同步多个 chunks', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'line1', rightContent: 'line1' },
        { leftLineNo: 2, rightLineNo: null, type: 'delete', leftContent: 'del1', rightContent: '' },
        { leftLineNo: 3, rightLineNo: 2, type: 'equal', leftContent: 'line2', rightContent: 'line2' },
        { leftLineNo: 4, rightLineNo: null, type: 'delete', leftContent: 'del2', rightContent: '' },
        { leftLineNo: 5, rightLineNo: 3, type: 'equal', leftContent: 'line3', rightContent: 'line3' }
      ]
      const chunks: DiffChunk[] = [
        {
          id: 'chunk-1',
          startIndex: 1,
          endIndex: 1,
          type: 'delete',
          leftLineRange: [2, 2],
          rightLineRange: [0, 0],
          changeIndices: [1]
        },
        {
          id: 'chunk-2',
          startIndex: 3,
          endIndex: 3,
          type: 'delete',
          leftLineRange: [4, 4],
          rightLineRange: [0, 0],
          changeIndices: [3]
        }
      ]
      
      const result = syncDiff(
        'line1\ndel1\nline2\ndel2\nline3',
        'line1\nline2\nline3',
        lines, chunks,
        { direction: 'left-to-right' }
      )

      expect(result.rightContent).toBe('line1\ndel1\nline2\ndel2\nline3')
      expect(result.appliedChunkIds).toHaveLength(2)
      expect(result.stats.insertedLines).toBe(2)
    })
  })

  describe('特定 chunk 同步', () => {
    it('只同步指定的 chunkIds', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'line1', rightContent: 'line1' },
        { leftLineNo: 2, rightLineNo: null, type: 'delete', leftContent: 'del1', rightContent: '' },
        { leftLineNo: 3, rightLineNo: 2, type: 'equal', leftContent: 'line2', rightContent: 'line2' },
        { leftLineNo: 4, rightLineNo: null, type: 'delete', leftContent: 'del2', rightContent: '' }
      ]
      const chunks: DiffChunk[] = [
        {
          id: 'chunk-1',
          startIndex: 1,
          endIndex: 1,
          type: 'delete',
          leftLineRange: [2, 2],
          rightLineRange: [0, 0],
          changeIndices: [1]
        },
        {
          id: 'chunk-2',
          startIndex: 3,
          endIndex: 3,
          type: 'delete',
          leftLineRange: [4, 4],
          rightLineRange: [0, 0],
          changeIndices: [3]
        }
      ]
      
      const result = syncDiff(
        'line1\ndel1\nline2\ndel2',
        'line1\nline2',
        lines, chunks,
        { direction: 'left-to-right', chunkIds: ['chunk-1'] }
      )

      expect(result.appliedChunkIds).toEqual(['chunk-1'])
      expect(result.rightContent).toBe('line1\ndel1\nline2')
    })
  })

  describe('空内容和边界情况', () => {
    it('空内容同步', () => {
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
      
      const result = syncDiff('', 'new', lines, chunks, { direction: 'right-to-left' })

      expect(result.leftContent).toBe('new')
    })

    it('保持未变更内容不变', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'equal-line', rightContent: 'equal-line' }
      ]
      const chunks: DiffChunk[] = []
      
      const result = syncDiff('equal-line', 'equal-line', lines, chunks, { direction: 'left-to-right' })

      expect(result.leftContent).toBe('equal-line')
      expect(result.rightContent).toBe('equal-line')
      expect(result.stats.insertedLines).toBe(0)
      expect(result.stats.deletedLines).toBe(0)
      expect(result.stats.modifiedLines).toBe(0)
    })
  })

  describe('syncAllDiffs', () => {
    it('同步所有差异', () => {
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'line1', rightContent: 'line1' },
        { leftLineNo: 2, rightLineNo: null, type: 'delete', leftContent: 'del', rightContent: '' }
      ]
      const chunks: DiffChunk[] = [{
        id: 'chunk-1',
        startIndex: 1,
        endIndex: 1,
        type: 'delete',
        leftLineRange: [2, 2],
        rightLineRange: [0, 0],
        changeIndices: [1]
      }]
      
      const result = syncAllDiffs('line1\ndel', 'line1', lines, chunks, 'left-to-right')

      expect(result.rightContent).toBe('line1\ndel')
    })
  })
})
