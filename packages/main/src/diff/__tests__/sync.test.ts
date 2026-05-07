import { describe, it, expect } from 'vitest'
import { syncDiff } from '../sync'
import type { DiffChunk, DiffLine } from '@shared/types'

describe('Diff Sync', () => {
  describe('syncDiff - left-to-right', () => {
    it('should add deleted lines to right (delete chunk)', () => {
      // 左侧有2行，右侧没有（右侧删除了左侧的内容）
      const leftContent = 'line1\nline2\nline3\ndeleted1\ndeleted2'
      const rightContent = 'line1\nline2\nline3'

      // diff lines: 前3行是 equal，后2行是 delete
      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'line1', rightContent: 'line1' },
        { leftLineNo: 2, rightLineNo: 2, type: 'equal', leftContent: 'line2', rightContent: 'line2' },
        { leftLineNo: 3, rightLineNo: 3, type: 'equal', leftContent: 'line3', rightContent: 'line3' },
        { leftLineNo: 4, rightLineNo: null, type: 'delete', leftContent: 'deleted1', rightContent: '' },
        { leftLineNo: 5, rightLineNo: null, type: 'delete', leftContent: 'deleted2', rightContent: '' }
      ]

      const chunks: DiffChunk[] = [{
        id: 'chunk1',
        startIndex: 3,
        endIndex: 4,
        type: 'delete',
        leftLineRange: [4, 5],
        rightLineRange: [0, 0], // 右侧没有对应行
        changeIndices: [3, 4]
      }]

      const result = syncDiff(leftContent, rightContent, lines, chunks, {
        direction: 'left-to-right',
        chunkIds: ['chunk1']
      })

      // 左侧应该不变
      expect(result.leftContent).toBe('line1\nline2\nline3\ndeleted1\ndeleted2')
      // 右侧应该添加 deleted1 和 deleted2
      expect(result.rightContent).toBe('line1\nline2\nline3\ndeleted1\ndeleted2')
      expect(result.stats.insertedLines).toBe(2)
    })

    it('should remove inserted lines from right (insert chunk)', () => {
      // 左侧没有，右侧有2行（右侧新增了内容）
      const leftContent = 'line1\nline2\nline3'
      const rightContent = 'line1\nline2\nline3\ninserted1\ninserted2'

      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'line1', rightContent: 'line1' },
        { leftLineNo: 2, rightLineNo: 2, type: 'equal', leftContent: 'line2', rightContent: 'line2' },
        { leftLineNo: 3, rightLineNo: 3, type: 'equal', leftContent: 'line3', rightContent: 'line3' },
        { leftLineNo: null, rightLineNo: 4, type: 'insert', leftContent: '', rightContent: 'inserted1' },
        { leftLineNo: null, rightLineNo: 5, type: 'insert', leftContent: '', rightContent: 'inserted2' }
      ]

      const chunks: DiffChunk[] = [{
        id: 'chunk1',
        startIndex: 3,
        endIndex: 4,
        type: 'insert',
        leftLineRange: [0, 0], // 左侧没有对应行
        rightLineRange: [4, 5],
        changeIndices: [3, 4]
      }]

      const result = syncDiff(leftContent, rightContent, lines, chunks, {
        direction: 'left-to-right',
        chunkIds: ['chunk1']
      })

      expect(result.leftContent).toBe('line1\nline2\nline3')
      // 右侧应该删除 inserted1 和 inserted2
      expect(result.rightContent).toBe('line1\nline2\nline3')
      expect(result.stats.deletedLines).toBe(2)
    })

    it('should replace content in right (change chunk)', () => {
      // 两边都有但内容不同
      const leftContent = 'line1\nold line\nline3'
      const rightContent = 'line1\nnew line\nline3'

      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'line1', rightContent: 'line1' },
        { leftLineNo: 2, rightLineNo: 2, type: 'replace', leftContent: 'old line', rightContent: 'new line' },
        { leftLineNo: 3, rightLineNo: 3, type: 'equal', leftContent: 'line3', rightContent: 'line3' }
      ]

      const chunks: DiffChunk[] = [{
        id: 'chunk1',
        startIndex: 1,
        endIndex: 1,
        type: 'change',
        leftLineRange: [2, 2],
        rightLineRange: [2, 2],
        changeIndices: [1]
      }]

      const result = syncDiff(leftContent, rightContent, lines, chunks, {
        direction: 'left-to-right',
        chunkIds: ['chunk1']
      })

      expect(result.leftContent).toBe('line1\nold line\nline3')
      // 右侧应该变成 old line
      expect(result.rightContent).toBe('line1\nold line\nline3')
      expect(result.stats.modifiedLines).toBe(1)
    })
  })

  describe('syncDiff - right-to-left', () => {
    it('should remove deleted lines from left (delete chunk)', () => {
      // 左侧有2行，右侧没有（右侧删除了左侧的内容）
      const leftContent = 'line1\nline2\nline3\ndeleted1\ndeleted2'
      const rightContent = 'line1\nline2\nline3'

      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'line1', rightContent: 'line1' },
        { leftLineNo: 2, rightLineNo: 2, type: 'equal', leftContent: 'line2', rightContent: 'line2' },
        { leftLineNo: 3, rightLineNo: 3, type: 'equal', leftContent: 'line3', rightContent: 'line3' },
        { leftLineNo: 4, rightLineNo: null, type: 'delete', leftContent: 'deleted1', rightContent: '' },
        { leftLineNo: 5, rightLineNo: null, type: 'delete', leftContent: 'deleted2', rightContent: '' }
      ]

      const chunks: DiffChunk[] = [{
        id: 'chunk1',
        startIndex: 3,
        endIndex: 4,
        type: 'delete',
        leftLineRange: [4, 5],
        rightLineRange: [0, 0],
        changeIndices: [3, 4]
      }]

      const result = syncDiff(leftContent, rightContent, lines, chunks, {
        direction: 'right-to-left',
        chunkIds: ['chunk1']
      })

      // 左侧应该删除 deleted1 和 deleted2
      expect(result.leftContent).toBe('line1\nline2\nline3')
      expect(result.rightContent).toBe('line1\nline2\nline3')
      expect(result.stats.deletedLines).toBe(2)
    })

    it('should add inserted lines to left (insert chunk)', () => {
      // 左侧没有，右侧有2行（右侧新增了内容）
      const leftContent = 'line1\nline2\nline3'
      const rightContent = 'line1\nline2\nline3\ninserted1\ninserted2'

      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'line1', rightContent: 'line1' },
        { leftLineNo: 2, rightLineNo: 2, type: 'equal', leftContent: 'line2', rightContent: 'line2' },
        { leftLineNo: 3, rightLineNo: 3, type: 'equal', leftContent: 'line3', rightContent: 'line3' },
        { leftLineNo: null, rightLineNo: 4, type: 'insert', leftContent: '', rightContent: 'inserted1' },
        { leftLineNo: null, rightLineNo: 5, type: 'insert', leftContent: '', rightContent: 'inserted2' }
      ]

      const chunks: DiffChunk[] = [{
        id: 'chunk1',
        startIndex: 3,
        endIndex: 4,
        type: 'insert',
        leftLineRange: [0, 0],
        rightLineRange: [4, 5],
        changeIndices: [3, 4]
      }]

      const result = syncDiff(leftContent, rightContent, lines, chunks, {
        direction: 'right-to-left',
        chunkIds: ['chunk1']
      })

      // 左侧应该添加 inserted1 和 inserted2
      expect(result.leftContent).toBe('line1\nline2\nline3\ninserted1\ninserted2')
      expect(result.rightContent).toBe('line1\nline2\nline3\ninserted1\ninserted2')
      expect(result.stats.insertedLines).toBe(2)
    })

    it('should replace content in left (change chunk)', () => {
      // 两边都有但内容不同
      const leftContent = 'line1\nold line\nline3'
      const rightContent = 'line1\nnew line\nline3'

      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'line1', rightContent: 'line1' },
        { leftLineNo: 2, rightLineNo: 2, type: 'replace', leftContent: 'old line', rightContent: 'new line' },
        { leftLineNo: 3, rightLineNo: 3, type: 'equal', leftContent: 'line3', rightContent: 'line3' }
      ]

      const chunks: DiffChunk[] = [{
        id: 'chunk1',
        startIndex: 1,
        endIndex: 1,
        type: 'change',
        leftLineRange: [2, 2],
        rightLineRange: [2, 2],
        changeIndices: [1]
      }]

      const result = syncDiff(leftContent, rightContent, lines, chunks, {
        direction: 'right-to-left',
        chunkIds: ['chunk1']
      })

      // 左侧应该变成 new line
      expect(result.leftContent).toBe('line1\nnew line\nline3')
      expect(result.rightContent).toBe('line1\nnew line\nline3')
      expect(result.stats.modifiedLines).toBe(1)
    })
  })

  describe('syncDiff - multiple chunks', () => {
    it('should sync multiple chunks in correct order', () => {
      const leftContent = 'a\nb\nc\nd\ne'
      const rightContent = 'a\nB\nc\nD\ne'

      const lines: DiffLine[] = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'a', rightContent: 'a' },
        { leftLineNo: 2, rightLineNo: 2, type: 'replace', leftContent: 'b', rightContent: 'B' },
        { leftLineNo: 3, rightLineNo: 3, type: 'equal', leftContent: 'c', rightContent: 'c' },
        { leftLineNo: 4, rightLineNo: 4, type: 'replace', leftContent: 'd', rightContent: 'D' },
        { leftLineNo: 5, rightLineNo: 5, type: 'equal', leftContent: 'e', rightContent: 'e' }
      ]

      const chunks: DiffChunk[] = [
        {
          id: 'chunk1',
          startIndex: 1,
          endIndex: 1,
          type: 'change',
          leftLineRange: [2, 2],
          rightLineRange: [2, 2],
          changeIndices: [1]
        },
        {
          id: 'chunk2',
          startIndex: 3,
          endIndex: 3,
          type: 'change',
          leftLineRange: [4, 4],
          rightLineRange: [4, 4],
          changeIndices: [3]
        }
      ]

      const result = syncDiff(leftContent, rightContent, lines, chunks, {
        direction: 'left-to-right'
      })

      expect(result.rightContent).toBe('a\nb\nc\nd\ne')
      expect(result.stats.modifiedLines).toBe(2)
    })
  })
})
