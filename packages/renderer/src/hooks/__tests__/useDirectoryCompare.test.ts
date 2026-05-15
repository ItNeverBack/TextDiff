import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import {
  useDirectoryCompare,
  useDirectoryEntry,
  useDirectoryStats,
  useDirectoryNavigation,
  useDirectorySearch
} from '../useDirectoryCompare'
import { useDirectoryCompareStore } from '../../stores/directory.store'
import { useFilterStore } from '../../stores/filter.store'
import type { DirectoryComparison, DirectoryDiffEntry, DirCompareOptions } from '@shared/types/directory.types'

// Mock the stores
vi.mock('../../stores/directory.store')
vi.mock('../../stores/filter.store')

describe('useDirectoryCompare', () => {
  const mockComparison: DirectoryComparison = {
    id: 'compare-1',
    leftRoot: {
      path: '/left',
      name: 'left',
      totalFiles: 10,
      totalSize: 1024,
      modifiedTime: new Date(),
    },
    rightRoot: {
      path: '/right',
      name: 'right',
      totalFiles: 10,
      totalSize: 1024,
      modifiedTime: new Date(),
    },
    entries: [
      {
        id: '1',
        name: 'file1.txt',
        type: 'file',
        status: 'equal',
        relativePath: 'file1.txt',
      } as DirectoryDiffEntry,
      {
        id: '2',
        name: 'file2.txt',
        type: 'file',
        status: 'modified',
        relativePath: 'file2.txt',
      } as DirectoryDiffEntry,
    ],
    statistics: {
      totalFiles: 10,
      equal: 5,
      modified: 2,
      leftOnly: 1,
      rightOnly: 2,
      totalSizeLeft: 1024,
      totalSizeRight: 1024,
      duration: 1000,
    },
    completedAt: new Date(),
    options: {} as DirCompareOptions,
  }

  const mockStore = {
    comparison: mockComparison,
    isLoading: false,
    error: null,
    progress: { current: 10, total: 10 },
    filteredEntries: mockComparison.entries,
    selectedEntry: null,
    selectedPaths: new Set<string>(),
    expandedPaths: new Set<string>(),
    hiddenCount: 0,
    viewMode: 'tree' as const,
    showEqualFiles: true,
    startComparison: vi.fn(),
    refreshComparison: vi.fn(),
    cancelComparison: vi.fn(),
    clearComparison: vi.fn(),
    selectEntry: vi.fn(),
    toggleSelection: vi.fn(),
    clearSelection: vi.fn(),
    toggleExpand: vi.fn(),
    expandAll: vi.fn(),
    collapseAll: vi.fn(),
    expandToDepth: vi.fn(),
    applyFilters: vi.fn(),
    setViewMode: vi.fn(),
    toggleShowEqualFiles: vi.fn(),
  }

  const mockFilterStore = {
    filters: [],
    searchQuery: '',
    isRegexSearch: false,
    caseSensitive: false,
    showFiles: true,
    showDirectories: true,
    showEqual: true,
    showModified: true,
    showLeftOnly: true,
    showRightOnly: true,
    minSize: null,
    maxSize: null,
    modifiedAfter: null,
    modifiedBefore: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useDirectoryCompareStore).mockReturnValue(mockStore)
    vi.mocked(useFilterStore).mockReturnValue(mockFilterStore as any)
  })

  describe('useDirectoryCompare', () => {
    it('should return comparison state', () => {
      const { result } = renderHook(() => useDirectoryCompare())

      expect(result.current.comparison).toEqual(mockComparison)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.progress).toEqual({ current: 10, total: 10 })
    })

    it('should call startComparison when compare is invoked', async () => {
      mockStore.startComparison.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDirectoryCompare())

      await act(async () => {
        await result.current.compare('/left', '/right', { recursive: true })
      })

      expect(mockStore.startComparison).toHaveBeenCalledWith('/left', '/right', { recursive: true })
    })

    it('should call refreshComparison when refresh is invoked', async () => {
      mockStore.refreshComparison.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDirectoryCompare())

      await act(async () => {
        await result.current.refresh()
      })

      expect(mockStore.refreshComparison).toHaveBeenCalled()
    })

    it('should call cancelComparison when cancel is invoked', () => {
      const { result } = renderHook(() => useDirectoryCompare())

      act(() => {
        result.current.cancel()
      })

      expect(mockStore.cancelComparison).toHaveBeenCalled()
    })

    it('should call clearComparison when clear is invoked', () => {
      const { result } = renderHook(() => useDirectoryCompare())

      act(() => {
        result.current.clear()
      })

      expect(mockStore.clearComparison).toHaveBeenCalled()
    })

    it('should return filtered entries', () => {
      const { result } = renderHook(() => useDirectoryCompare())

      expect(result.current.filteredEntries).toEqual(mockComparison.entries)
    })

    it('should return viewMode and setViewMode', () => {
      const { result } = renderHook(() => useDirectoryCompare())

      expect(result.current.viewMode).toBe('tree')

      act(() => {
        result.current.setViewMode('list')
      })

      expect(mockStore.setViewMode).toHaveBeenCalledWith('list')
    })
  })

  describe('useDirectoryEntry', () => {
    it('should find entry by id', () => {
      const { result } = renderHook(() => useDirectoryEntry('1'))

      expect(result.current.entry).toEqual(mockComparison.entries[0])
      expect(result.current.isSelected).toBe(false)
    })

    it('should return null for non-existent entry', () => {
      const { result } = renderHook(() => useDirectoryEntry('non-existent'))

      expect(result.current.entry).toBeNull()
    })

    it('should check expanded state', () => {
      mockStore.expandedPaths = new Set(['folder'])
      vi.mocked(useDirectoryCompareStore).mockReturnValue({
        ...mockStore,
        expandedPaths: new Set(['folder']),
      })

      const { result } = renderHook(() => useDirectoryEntry('1'))
      expect(result.current.isExpanded).toBe(false)
    })

    it('should call selectEntry when select is invoked', () => {
      const { result } = renderHook(() => useDirectoryEntry('1'))

      act(() => {
        result.current.select()
      })

      expect(mockStore.selectEntry).toHaveBeenCalledWith(mockComparison.entries[0])
    })

    it('should call toggleSelection when toggleSelect is invoked', () => {
      const { result } = renderHook(() => useDirectoryEntry('1'))

      act(() => {
        result.current.toggleSelect()
      })

      expect(mockStore.toggleSelection).toHaveBeenCalledWith(mockComparison.entries[0])
    })
  })

  describe('useDirectoryStats', () => {
    it('should calculate visible statistics', () => {
      const { result } = renderHook(() => useDirectoryStats())

      expect(result.current.total).toBe(10)
      expect(result.current.equal).toBe(5)
      expect(result.current.modified).toBe(2)
      expect(result.current.leftOnly).toBe(1)
      expect(result.current.rightOnly).toBe(2)
    })

    it('should calculate visible stats based on filtered entries', () => {
      const { result } = renderHook(() => useDirectoryStats())

      // Both entries are files, so visibleTotal should be 2
      expect(result.current.visibleTotal).toBe(2)
      expect(result.current.visibleModified).toBe(1)
      expect(result.current.visibleEqual).toBe(1)
    })

    it('should return zero when no comparison', () => {
      vi.mocked(useDirectoryCompareStore).mockReturnValue({
        ...mockStore,
        comparison: null,
        filteredEntries: [],
      })

      const { result } = renderHook(() => useDirectoryStats())

      expect(result.current.total).toBe(0)
      expect(result.current.visibleTotal).toBe(0)
    })
  })

  describe('useDirectoryNavigation', () => {
    it('should return flat entries', () => {
      const { result } = renderHook(() => useDirectoryNavigation())

      expect(result.current.flatEntries).toHaveLength(2)
    })

    it('should return -1 for selectedIndex when no selection', () => {
      const { result } = renderHook(() => useDirectoryNavigation())

      expect(result.current.selectedIndex).toBe(-1)
    })

    it('should return correct selectedIndex', () => {
      vi.mocked(useDirectoryCompareStore).mockReturnValue({
        ...mockStore,
        selectedEntry: mockComparison.entries[1],
      })

      const { result } = renderHook(() => useDirectoryNavigation())

      expect(result.current.selectedIndex).toBe(1)
    })

    it('should navigate to next entry', () => {
      vi.mocked(useDirectoryCompareStore).mockReturnValue({
        ...mockStore,
        selectedEntry: mockComparison.entries[0],
      })

      const { result } = renderHook(() => useDirectoryNavigation())

      act(() => {
        result.current.navigateNext()
      })

      expect(mockStore.selectEntry).toHaveBeenCalledWith(mockComparison.entries[1])
    })

    it('should navigate to previous entry', () => {
      vi.mocked(useDirectoryCompareStore).mockReturnValue({
        ...mockStore,
        selectedEntry: mockComparison.entries[1],
      })

      const { result } = renderHook(() => useDirectoryNavigation())

      act(() => {
        result.current.navigatePrev()
      })

      expect(mockStore.selectEntry).toHaveBeenCalledWith(mockComparison.entries[0])
    })

    it('should not navigate past first entry', () => {
      vi.mocked(useDirectoryCompareStore).mockReturnValue({
        ...mockStore,
        selectedEntry: mockComparison.entries[0],
      })

      const { result } = renderHook(() => useDirectoryNavigation())

      act(() => {
        result.current.navigatePrev()
      })

      expect(mockStore.selectEntry).not.toHaveBeenCalled()
    })

    it('should not navigate past last entry', () => {
      vi.mocked(useDirectoryCompareStore).mockReturnValue({
        ...mockStore,
        selectedEntry: mockComparison.entries[1],
      })

      const { result } = renderHook(() => useDirectoryNavigation())

      act(() => {
        result.current.navigateNext()
      })

      expect(mockStore.selectEntry).not.toHaveBeenCalled()
    })

    it('should navigate to first entry', () => {
      vi.mocked(useDirectoryCompareStore).mockReturnValue({
        ...mockStore,
        selectedEntry: mockComparison.entries[1],
      })

      const { result } = renderHook(() => useDirectoryNavigation())

      act(() => {
        result.current.navigateToFirst()
      })

      expect(mockStore.selectEntry).toHaveBeenCalledWith(mockComparison.entries[0])
    })

    it('should navigate to last entry', () => {
      vi.mocked(useDirectoryCompareStore).mockReturnValue({
        ...mockStore,
        selectedEntry: mockComparison.entries[0],
      })

      const { result } = renderHook(() => useDirectoryNavigation())

      act(() => {
        result.current.navigateToLast()
      })

      expect(mockStore.selectEntry).toHaveBeenCalledWith(mockComparison.entries[1])
    })
  })

  describe('useDirectorySearch', () => {
    it('should return search state', () => {
      const { result } = renderHook(() => useDirectorySearch())

      expect(result.current.query).toBe('')
      expect(result.current.isRegex).toBe(false)
      expect(result.current.caseSensitive).toBe(false)
    })

    it('should call setSearchQuery when setSearch is invoked', () => {
      const mockSetSearchQuery = vi.fn()
      vi.mocked(useFilterStore).mockReturnValue({
        ...mockFilterStore,
        setSearchQuery: mockSetSearchQuery,
      } as any)

      const { result } = renderHook(() => useDirectorySearch())

      act(() => {
        result.current.setSearch('test')
      })

      expect(mockSetSearchQuery).toHaveBeenCalledWith('test')
    })

    it('should call clearSearch when clearSearch is invoked', () => {
      const mockClearSearch = vi.fn()
      vi.mocked(useFilterStore).mockReturnValue({
        ...mockFilterStore,
        clearSearch: mockClearSearch,
      } as any)

      const { result } = renderHook(() => useDirectorySearch())

      act(() => {
        result.current.clearSearch()
      })

      expect(mockClearSearch).toHaveBeenCalled()
    })

    it('should call toggleRegexSearch when toggleRegex is invoked', () => {
      const mockToggleRegexSearch = vi.fn()
      vi.mocked(useFilterStore).mockReturnValue({
        ...mockFilterStore,
        toggleRegexSearch: mockToggleRegexSearch,
      } as any)

      const { result } = renderHook(() => useDirectorySearch())

      act(() => {
        result.current.toggleRegex()
      })

      expect(mockToggleRegexSearch).toHaveBeenCalled()
    })
  })
})
