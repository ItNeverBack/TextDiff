import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useDirectoryCompareStore } from '../../stores/directory.store'
import type { DirectoryComparison, DirectoryDiffEntry, DirCompareOptions } from '@shared/types/directory.types'

describe('useDirectoryCompareStore', () => {
  beforeEach(() => {
    // 重置 store 到初始状态
    useDirectoryCompareStore.setState({
      comparison: null,
      isLoading: false,
      error: null,
      progress: null,
      selectedEntry: null,
      selectedPaths: new Set(),
      expandedPaths: new Set(),
      filteredEntries: [],
      hiddenCount: 0,
      viewMode: 'all',
      showEqualFiles: true
    })
  })

  describe('初始状态', () => {
    it('初始 comparison 为 null', () => {
      expect(useDirectoryCompareStore.getState().comparison).toBeNull()
    })

    it('初始 isLoading 为 false', () => {
      expect(useDirectoryCompareStore.getState().isLoading).toBe(false)
    })

    it('初始 error 为 null', () => {
      expect(useDirectoryCompareStore.getState().error).toBeNull()
    })

    it('初始 selectedEntry 为 null', () => {
      expect(useDirectoryCompareStore.getState().selectedEntry).toBeNull()
    })

    it('初始 expandedPaths 为空', () => {
      expect(useDirectoryCompareStore.getState().expandedPaths.size).toBe(0)
    })
  })

  describe('对比结果设置', () => {
    const createMockComparison = (): DirectoryComparison => ({
      leftRoot: { path: '/left', name: 'left', totalFiles: 10, totalSize: 1000, lastModified: new Date() },
      rightRoot: { path: '/right', name: 'right', totalFiles: 10, totalSize: 1000, lastModified: new Date() },
      entries: [],
      statistics: {
        totalFiles: 10,
        totalDirs: 5,
        leftOnlyFiles: 2,
        rightOnlyFiles: 2,
        modifiedFiles: 2,
        equalFiles: 4,
        totalSize: 1000,
        totalDiffSize: 100
      },
      options: {
        recursive: true,
        compareMode: 'content',
        excludePatterns: [],
        includePatterns: [],
        followSymlinks: false,
        useHash: true
      },
      comparedAt: Date.now()
    })

    it('setComparison 设置对比结果', () => {
      const comparison = createMockComparison()
      useDirectoryCompareStore.getState().setComparison(comparison)
      
      expect(useDirectoryCompareStore.getState().comparison).toEqual(comparison)
      expect(useDirectoryCompareStore.getState().filteredEntries).toEqual(comparison.entries)
    })

    it('setComparison 设置默认展开路径', () => {
      const comparison: DirectoryComparison = {
        ...createMockComparison(),
        entries: [
          { id: '1', relativePath: 'src', type: 'directory', status: 'equal', depth: 0 },
          { id: '2', relativePath: 'dist', type: 'directory', status: 'equal', depth: 0 }
        ] as DirectoryDiffEntry[]
      }
      
      useDirectoryCompareStore.getState().setComparison(comparison)
      
      expect(useDirectoryCompareStore.getState().expandedPaths.has('src')).toBe(true)
      expect(useDirectoryCompareStore.getState().expandedPaths.has('dist')).toBe(true)
    })

    it('clearComparison 清空对比', () => {
      useDirectoryCompareStore.getState().setComparison(createMockComparison())
      useDirectoryCompareStore.getState().clearComparison()
      
      const state = useDirectoryCompareStore.getState()
      expect(state.comparison).toBeNull()
      expect(state.selectedEntry).toBeNull()
      expect(state.expandedPaths.size).toBe(0)
      expect(state.filteredEntries).toHaveLength(0)
    })

    it('cancelComparison 取消对比', () => {
      useDirectoryCompareStore.setState({
        isLoading: true,
        progress: {
          comparisonId: 'test-id',
          status: 'scanning',
          currentPhase: '扫描中',
          totalFiles: 100,
          processedFiles: 50,
          percentage: 50
        }
      })
      
      useDirectoryCompareStore.getState().cancelComparison()
      
      const state = useDirectoryCompareStore.getState()
      expect(state.isLoading).toBe(false)
      expect(state.progress).toBeNull()
    })
  })

  describe('进度管理', () => {
    it('setProgress 更新进度', () => {
      const progress = {
        comparisonId: 'test-id',
        status: 'scanning' as const,
        currentPhase: '扫描中',
        totalFiles: 100,
        processedFiles: 50,
        percentage: 50
      }
      
      useDirectoryCompareStore.getState().setProgress(progress)
      
      expect(useDirectoryCompareStore.getState().progress).toEqual(progress)
    })

    it('setProgress 更新不同状态', () => {
      useDirectoryCompareStore.getState().setProgress({
        comparisonId: 'test-id',
        status: 'pending',
        currentPhase: '准备中',
        totalFiles: 0,
        processedFiles: 0,
        percentage: 0
      })
      
      expect(useDirectoryCompareStore.getState().progress?.status).toBe('pending')
    })
  })

  describe('错误处理', () => {
    it('setError 设置错误', () => {
      useDirectoryCompareStore.getState().setError('对比失败')
      
      expect(useDirectoryCompareStore.getState().error).toBe('对比失败')
      expect(useDirectoryCompareStore.getState().isLoading).toBe(false)
    })

    it('setError(null) 清除错误', () => {
      useDirectoryCompareStore.getState().setError('对比失败')
      useDirectoryCompareStore.getState().setError(null)
      
      expect(useDirectoryCompareStore.getState().error).toBeNull()
    })
  })

  describe('选择操作', () => {
    const mockEntry: DirectoryDiffEntry = {
      id: 'entry-1',
      relativePath: 'test.txt',
      type: 'file',
      status: 'modified',
      depth: 0
    }

    it('selectEntry 选择条目', () => {
      useDirectoryCompareStore.getState().selectEntry(mockEntry)
      
      expect(useDirectoryCompareStore.getState().selectedEntry).toEqual(mockEntry)
      expect(useDirectoryCompareStore.getState().selectedPaths.has('entry-1')).toBe(true)
    })

    it('selectEntry(null) 取消选择', () => {
      useDirectoryCompareStore.getState().selectEntry(mockEntry)
      useDirectoryCompareStore.getState().selectEntry(null)
      
      expect(useDirectoryCompareStore.getState().selectedEntry).toBeNull()
    })

    it('toggleSelection 切换选择', () => {
      useDirectoryCompareStore.getState().toggleSelection(mockEntry)
      expect(useDirectoryCompareStore.getState().selectedPaths.has('entry-1')).toBe(true)
      
      useDirectoryCompareStore.getState().toggleSelection(mockEntry)
      expect(useDirectoryCompareStore.getState().selectedPaths.has('entry-1')).toBe(false)
    })

    it('toggleSelection 取消选中时清除 selectedEntry', () => {
      useDirectoryCompareStore.getState().selectEntry(mockEntry)
      useDirectoryCompareStore.getState().toggleSelection(mockEntry)
      
      expect(useDirectoryCompareStore.getState().selectedEntry).toBeNull()
    })

    it('selectAll 全选', () => {
      const entries: DirectoryDiffEntry[] = [
        { id: '1', relativePath: 'a.txt', type: 'file', status: 'equal', depth: 0 },
        { id: '2', relativePath: 'b.txt', type: 'file', status: 'modified', depth: 0 }
      ]
      
      useDirectoryCompareStore.getState().selectAll(entries)
      
      expect(useDirectoryCompareStore.getState().selectedPaths.has('1')).toBe(true)
      expect(useDirectoryCompareStore.getState().selectedPaths.has('2')).toBe(true)
    })

    it('clearSelection 清除选择', () => {
      const entries: DirectoryDiffEntry[] = [
        { id: '1', relativePath: 'a.txt', type: 'file', status: 'equal', depth: 0 }
      ]
      
      useDirectoryCompareStore.getState().selectAll(entries)
      useDirectoryCompareStore.getState().clearSelection()
      
      expect(useDirectoryCompareStore.getState().selectedPaths.size).toBe(0)
      expect(useDirectoryCompareStore.getState().selectedEntry).toBeNull()
    })
  })

  describe('展开/折叠操作', () => {
    it('toggleExpand 切换展开状态', () => {
      useDirectoryCompareStore.getState().toggleExpand('src')
      expect(useDirectoryCompareStore.getState().expandedPaths.has('src')).toBe(true)
      
      useDirectoryCompareStore.getState().toggleExpand('src')
      expect(useDirectoryCompareStore.getState().expandedPaths.has('src')).toBe(false)
    })

    it('expandAll 展开所有目录', () => {
      useDirectoryCompareStore.setState({
        comparison: {
          entries: [
            { id: '1', relativePath: 'src', type: 'directory', status: 'equal', depth: 0 },
            { id: '2', relativePath: 'src/components', type: 'directory', status: 'equal', depth: 1, children: [] }
          ] as DirectoryDiffEntry[]
        } as DirectoryComparison
      })
      
      useDirectoryCompareStore.getState().expandAll()
      
      expect(useDirectoryCompareStore.getState().expandedPaths.has('src')).toBe(true)
      expect(useDirectoryCompareStore.getState().expandedPaths.has('src/components')).toBe(true)
    })

    it('collapseAll 折叠所有', () => {
      useDirectoryCompareStore.getState().toggleExpand('src')
      useDirectoryCompareStore.getState().toggleExpand('dist')
      
      useDirectoryCompareStore.getState().collapseAll()
      
      expect(useDirectoryCompareStore.getState().expandedPaths.size).toBe(0)
    })

    it('expandToDepth 展开到指定深度', () => {
      useDirectoryCompareStore.setState({
        comparison: {
          entries: [
            { id: '1', relativePath: 'src', type: 'directory', status: 'equal', depth: 0 },
            { id: '2', relativePath: 'src/a', type: 'directory', status: 'equal', depth: 1 },
            { id: '3', relativePath: 'src/a/b', type: 'directory', status: 'equal', depth: 2 }
          ] as DirectoryDiffEntry[]
        } as DirectoryComparison
      })
      
      useDirectoryCompareStore.getState().expandToDepth(1)
      
      expect(useDirectoryCompareStore.getState().expandedPaths.has('src')).toBe(true)
      expect(useDirectoryCompareStore.getState().expandedPaths.has('src/a')).toBe(true)
      expect(useDirectoryCompareStore.getState().expandedPaths.has('src/a/b')).toBe(false)
    })

    it('setExpandedPaths 直接设置展开路径', () => {
      useDirectoryCompareStore.getState().setExpandedPaths(['src', 'dist', 'docs'])
      
      expect(useDirectoryCompareStore.getState().expandedPaths.has('src')).toBe(true)
      expect(useDirectoryCompareStore.getState().expandedPaths.has('dist')).toBe(true)
      expect(useDirectoryCompareStore.getState().expandedPaths.has('docs')).toBe(true)
    })
  })

  describe('视图模式', () => {
    it('setViewMode 改变视图模式', () => {
      useDirectoryCompareStore.getState().setViewMode('diff-only')
      expect(useDirectoryCompareStore.getState().viewMode).toBe('diff-only')
    })

    it('setViewMode 自动应用过滤', () => {
      useDirectoryCompareStore.setState({
        comparison: {
          entries: [
            { id: '1', relativePath: 'a.txt', type: 'file', status: 'equal', depth: 0 },
            { id: '2', relativePath: 'b.txt', type: 'file', status: 'modified', depth: 0 }
          ] as DirectoryDiffEntry[]
        } as DirectoryComparison
      })
      
      useDirectoryCompareStore.getState().setViewMode('diff-only')
      
      const filtered = useDirectoryCompareStore.getState().filteredEntries
      expect(filtered.every(e => e.status !== 'equal')).toBe(true)
    })

    it('toggleShowEqualFiles 切换显示相同文件', () => {
      const initial = useDirectoryCompareStore.getState().showEqualFiles
      useDirectoryCompareStore.getState().toggleShowEqualFiles()
      expect(useDirectoryCompareStore.getState().showEqualFiles).toBe(!initial)
    })
  })

  describe('过滤操作', () => {
    it('applyFilters 应用自定义过滤', () => {
      useDirectoryCompareStore.setState({
        comparison: {
          entries: [
            { id: '1', relativePath: 'a.js', type: 'file', status: 'equal', depth: 0 },
            { id: '2', relativePath: 'b.ts', type: 'file', status: 'modified', depth: 0 }
          ] as DirectoryDiffEntry[]
        } as DirectoryComparison
      })
      
      useDirectoryCompareStore.getState().applyFilters(
        (entry) => entry.relativePath.endsWith('.ts')
      )
      
      const filtered = useDirectoryCompareStore.getState().filteredEntries
      expect(filtered).toHaveLength(1)
      expect(filtered[0].relativePath).toBe('b.ts')
    })

    it('applyFilters 计算隐藏数量', () => {
      useDirectoryCompareStore.setState({
        comparison: {
          entries: [
            { id: '1', relativePath: 'a.txt', type: 'file', status: 'equal', depth: 0 },
            { id: '2', relativePath: 'b.txt', type: 'file', status: 'equal', depth: 0 }
          ] as DirectoryDiffEntry[]
        } as DirectoryComparison
      })
      
      useDirectoryCompareStore.getState().applyFilters(() => false)
      
      expect(useDirectoryCompareStore.getState().hiddenCount).toBe(2)
    })
  })
})
