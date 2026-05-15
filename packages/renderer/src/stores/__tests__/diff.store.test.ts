import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useDiffStore } from '../../stores/diff.store'
import type { FileInfo, DiffResult, DiffOptions } from '@shared/types'

describe('useDiffStore', () => {
  beforeEach(() => {
    // 重置 store 状态
    useDiffStore.setState(useDiffStore.getInitialState())
  })

  describe('初始状态', () => {
    it('初始状态正确', () => {
      const state = useDiffStore.getState()
      
      expect(state.leftFile).toBeNull()
      expect(state.rightFile).toBeNull()
      expect(state.diffResult).toBeNull()
      expect(state.viewMode).toBe('split')
      expect(state.isComputing).toBe(false)
      expect(state.activeChunkIndex).toBe(-1)
      expect(state.scrollSyncEnabled).toBe(true)
    })

    it('初始 options 包含所有字段', () => {
      const state = useDiffStore.getState()
      
      expect(state.options).toHaveProperty('ignoreWhitespace')
      expect(state.options).toHaveProperty('ignoreCase')
      expect(state.options).toHaveProperty('ignoreLineEndings')
      expect(state.options).toHaveProperty('algorithm')
      expect(state.options).toHaveProperty('contextLines')
    })
  })

  describe('文件操作', () => {
    it('setLeftFile 更新左侧文件', () => {
      const file: FileInfo = {
        path: '/test/left.txt',
        name: 'left.txt',
        content: 'content',
        encoding: 'utf-8',
        lineEnding: 'LF',
        size: 7
      }
      
      useDiffStore.getState().setLeftFile(file)
      
      expect(useDiffStore.getState().leftFile).toEqual(file)
    })

    it('setRightFile 更新右侧文件', () => {
      const file: FileInfo = {
        path: '/test/right.txt',
        name: 'right.txt',
        content: 'content',
        encoding: 'utf-8',
        lineEnding: 'LF',
        size: 7
      }
      
      useDiffStore.getState().setRightFile(file)
      
      expect(useDiffStore.getState().rightFile).toEqual(file)
    })

    it('setLeftFile(null) 清除左侧文件', () => {
      const file: FileInfo = {
        path: '/test/left.txt',
        name: 'left.txt',
        content: 'content',
        encoding: 'utf-8',
        lineEnding: 'LF',
        size: 7
      }
      
      useDiffStore.getState().setLeftFile(file)
      useDiffStore.getState().setLeftFile(null)
      
      expect(useDiffStore.getState().leftFile).toBeNull()
    })

    it('swapFiles 交换左右文件', () => {
      const leftFile: FileInfo = {
        path: '/test/left.txt',
        name: 'left.txt',
        content: 'left content',
        encoding: 'utf-8',
        lineEnding: 'LF',
        size: 12
      }
      const rightFile: FileInfo = {
        path: '/test/right.txt',
        name: 'right.txt',
        content: 'right content',
        encoding: 'utf-8',
        lineEnding: 'LF',
        size: 13
      }
      
      useDiffStore.getState().setLeftFile(leftFile)
      useDiffStore.getState().setRightFile(rightFile)
      useDiffStore.getState().swapFiles()
      
      expect(useDiffStore.getState().leftFile).toEqual(rightFile)
      expect(useDiffStore.getState().rightFile).toEqual(leftFile)
    })

    it('swapFiles 任一文件为空时正常工作', () => {
      const leftFile: FileInfo = {
        path: '/test/left.txt',
        name: 'left.txt',
        content: 'content',
        encoding: 'utf-8',
        lineEnding: 'LF',
        size: 7
      }
      
      useDiffStore.getState().setLeftFile(leftFile)
      useDiffStore.getState().swapFiles()
      
      expect(useDiffStore.getState().leftFile).toBeNull()
      expect(useDiffStore.getState().rightFile).toEqual(leftFile)
    })
  })

  describe('Diff 结果', () => {
    it('setDiffResult 更新差异结果', () => {
      const result: DiffResult = {
        lines: [],
        chunks: [],
        stats: {
          totalLines: 10,
          equalLines: 5,
          insertedLines: 3,
          deletedLines: 2,
          modifiedLines: 0,
          chunkCount: 1
        },
        computedAt: Date.now()
      }
      
      useDiffStore.getState().setDiffResult(result)
      
      expect(useDiffStore.getState().diffResult).toEqual(result)
    })

    it('setDiffResult(null) 清除结果', () => {
      const result: DiffResult = {
        lines: [],
        chunks: [],
        stats: {
          totalLines: 0,
          equalLines: 0,
          insertedLines: 0,
          deletedLines: 0,
          modifiedLines: 0,
          chunkCount: 0
        },
        computedAt: Date.now()
      }
      
      useDiffStore.getState().setDiffResult(result)
      useDiffStore.getState().setDiffResult(null)
      
      expect(useDiffStore.getState().diffResult).toBeNull()
    })
  })

  describe('选项操作', () => {
    it('setOptions 合并选项', () => {
      useDiffStore.getState().setOptions({ ignoreCase: true })
      
      const state = useDiffStore.getState()
      expect(state.options.ignoreCase).toBe(true)
      // 其他选项应保持不变
      expect(state.options.algorithm).toBeDefined()
    })

    it('setOptions 支持多个选项', () => {
      useDiffStore.getState().setOptions({
        ignoreCase: true,
        algorithm: 'patience',
        contextLines: 5
      })
      
      const state = useDiffStore.getState()
      expect(state.options.ignoreCase).toBe(true)
      expect(state.options.algorithm).toBe('patience')
      expect(state.options.contextLines).toBe(5)
    })
  })

  describe('视图操作', () => {
    it('setViewMode 改变视图模式', () => {
      useDiffStore.getState().setViewMode('unified')
      expect(useDiffStore.getState().viewMode).toBe('unified')
    })

    it('toggleCollapse 切换折叠状态', () => {
      const initialState = useDiffStore.getState().isCollapsed
      
      useDiffStore.getState().toggleCollapse()
      
      expect(useDiffStore.getState().isCollapsed).toBe(!initialState)
    })

    it('toggleScrollSync 切换滚动同步', () => {
      const initialState = useDiffStore.getState().scrollSyncEnabled
      
      useDiffStore.getState().toggleScrollSync()
      
      expect(useDiffStore.getState().scrollSyncEnabled).toBe(!initialState)
    })
  })

  describe('Chunk 导航', () => {
    beforeEach(() => {
      const result: DiffResult = {
        lines: [],
        chunks: [
          { id: 'chunk-1', startIndex: 0, endIndex: 2, type: 'change', leftLineRange: [1, 2], rightLineRange: [1, 2], changeIndices: [1] },
          { id: 'chunk-2', startIndex: 5, endIndex: 7, type: 'change', leftLineRange: [6, 7], rightLineRange: [6, 7], changeIndices: [6] },
          { id: 'chunk-3', startIndex: 10, endIndex: 12, type: 'change', leftLineRange: [11, 12], rightLineRange: [11, 12], changeIndices: [11] }
        ],
        stats: {
          totalLines: 20,
          equalLines: 17,
          insertedLines: 1,
          deletedLines: 1,
          modifiedLines: 1,
          chunkCount: 3
        },
        computedAt: Date.now()
      }
      useDiffStore.getState().setDiffResult(result)
      useDiffStore.getState().setActiveChunkIndex(0)
    })

    it('nextChunk 前进到下一个 chunk', () => {
      useDiffStore.getState().nextChunk()
      expect(useDiffStore.getState().activeChunkIndex).toBe(1)
    })

    it('nextChunk 在最后时不越界', () => {
      useDiffStore.getState().lastChunk()
      useDiffStore.getState().nextChunk()
      expect(useDiffStore.getState().activeChunkIndex).toBe(2)
    })

    it('prevChunk 后退到上一个 chunk', () => {
      useDiffStore.getState().nextChunk()
      useDiffStore.getState().nextChunk()
      useDiffStore.getState().prevChunk()
      expect(useDiffStore.getState().activeChunkIndex).toBe(1)
    })

    it('prevChunk 在最前时不越界', () => {
      useDiffStore.getState().firstChunk()
      useDiffStore.getState().prevChunk()
      expect(useDiffStore.getState().activeChunkIndex).toBe(0)
    })

    it('firstChunk 跳到第一个 chunk', () => {
      useDiffStore.getState().lastChunk()
      useDiffStore.getState().firstChunk()
      expect(useDiffStore.getState().activeChunkIndex).toBe(0)
    })

    it('lastChunk 跳到最后一个 chunk', () => {
      useDiffStore.getState().lastChunk()
      expect(useDiffStore.getState().activeChunkIndex).toBe(2)
    })

    it('navigateToChunk 导航到指定 chunk', () => {
      useDiffStore.getState().navigateToChunk(1)
      expect(useDiffStore.getState().activeChunkIndex).toBe(1)
    })

    it('navigateToChunk 无效索引不执行', () => {
      useDiffStore.getState().navigateToChunk(10)
      expect(useDiffStore.getState().activeChunkIndex).toBe(0) // 保持原值
    })
  })

  describe('计算状态', () => {
    it('setIsComputing 设置计算状态', () => {
      useDiffStore.getState().setIsComputing(true)
      expect(useDiffStore.getState().isComputing).toBe(true)
      
      useDiffStore.getState().setIsComputing(false)
      expect(useDiffStore.getState().isComputing).toBe(false)
    })
  })

  describe('重置', () => {
    it('reset 清空所有状态', () => {
      const file: FileInfo = {
        path: '/test/file.txt',
        name: 'file.txt',
        content: 'content',
        encoding: 'utf-8',
        lineEnding: 'LF',
        size: 7
      }
      const result: DiffResult = {
        lines: [],
        chunks: [],
        stats: { totalLines: 0, equalLines: 0, insertedLines: 0, deletedLines: 0, modifiedLines: 0, chunkCount: 0 },
        computedAt: Date.now()
      }
      
      useDiffStore.getState().setLeftFile(file)
      useDiffStore.getState().setRightFile(file)
      useDiffStore.getState().setDiffResult(result)
      useDiffStore.getState().setViewMode('unified')
      
      useDiffStore.getState().reset()
      
      const state = useDiffStore.getState()
      expect(state.leftFile).toBeNull()
      expect(state.rightFile).toBeNull()
      expect(state.diffResult).toBeNull()
      expect(state.viewMode).toBe('split')
      expect(state.activeChunkIndex).toBe(-1)
    })
  })
})
