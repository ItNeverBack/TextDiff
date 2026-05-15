import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useTreeExpand,
  useTreeSelection,
  useTreeVisibility,
  useTreeOperations
} from '../useTreeExpand'
import { useDirectoryCompareStore } from '../../stores/directory.store'
import type { DirectoryDiffEntry } from '@shared/types/directory.types'

// Mock the store
vi.mock('../../stores/directory.store')

describe('useTreeExpand', () => {
  const mockEntries: DirectoryDiffEntry[] = [
    {
      id: '1',
      name: 'folder1',
      type: 'directory',
      status: 'equal',
      relativePath: 'folder1',
      children: [
        {
          id: '2',
          name: 'file1.txt',
          type: 'file',
          status: 'equal',
          relativePath: 'folder1/file1.txt',
          parentId: '1',
        } as DirectoryDiffEntry,
        {
          id: '3',
          name: 'subfolder',
          type: 'directory',
          status: 'modified',
          relativePath: 'folder1/subfolder',
          parentId: '1',
          children: [
            {
              id: '4',
              name: 'file2.txt',
              type: 'file',
              status: 'modified',
              relativePath: 'folder1/subfolder/file2.txt',
              parentId: '3',
            } as DirectoryDiffEntry,
          ],
        } as DirectoryDiffEntry,
      ],
    } as DirectoryDiffEntry,
    {
      id: '5',
      name: 'folder2',
      type: 'directory',
      status: 'left-only',
      relativePath: 'folder2',
    } as DirectoryDiffEntry,
  ]

  const mockToggleExpand = vi.fn()
  const mockExpandAll = vi.fn()
  const mockCollapseAll = vi.fn()
  const mockExpandToDepth = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useDirectoryCompareStore).mockReturnValue({
      expandedPaths: new Set(['folder1']),
      toggleExpand: mockToggleExpand,
      expandAll: mockExpandAll,
      collapseAll: mockCollapseAll,
      expandToDepth: mockExpandToDepth,
    } as any)
  })

  describe('useTreeExpand', () => {
    it('should return expanded paths', () => {
      const { result } = renderHook(() => useTreeExpand())

      expect(result.current.expandedPaths).toEqual(new Set(['folder1']))
      expect(result.current.expandedCount).toBe(1)
    })

    it('should check if path is expanded', () => {
      const { result } = renderHook(() => useTreeExpand())

      expect(result.current.isExpanded('folder1')).toBe(true)
      expect(result.current.isExpanded('folder2')).toBe(false)
    })

    it('should call toggleExpand when toggle is invoked', () => {
      const { result } = renderHook(() => useTreeExpand())

      act(() => {
        result.current.toggle('folder1')
      })

      expect(mockToggleExpand).toHaveBeenCalledWith('folder1')
    })

    it('should expand when path is not expanded', () => {
      const { result } = renderHook(() => useTreeExpand())

      act(() => {
        result.current.expand('folder2')
      })

      expect(mockToggleExpand).toHaveBeenCalledWith('folder2')
    })

    it('should not expand when path is already expanded', () => {
      const { result } = renderHook(() => useTreeExpand())

      act(() => {
        result.current.expand('folder1')
      })

      expect(mockToggleExpand).not.toHaveBeenCalled()
    })

    it('should collapse when path is expanded', () => {
      const { result } = renderHook(() => useTreeExpand())

      act(() => {
        result.current.collapse('folder1')
      })

      expect(mockToggleExpand).toHaveBeenCalledWith('folder1')
    })

    it('should not collapse when path is not expanded', () => {
      const { result } = renderHook(() => useTreeExpand())

      act(() => {
        result.current.collapse('folder2')
      })

      expect(mockToggleExpand).not.toHaveBeenCalled()
    })

    it('should call expandAll when invoked', () => {
      const { result } = renderHook(() => useTreeExpand())

      act(() => {
        result.current.expandAll()
      })

      expect(mockExpandAll).toHaveBeenCalled()
    })

    it('should call collapseAll when invoked', () => {
      const { result } = renderHook(() => useTreeExpand())

      act(() => {
        result.current.collapseAll()
      })

      expect(mockCollapseAll).toHaveBeenCalled()
    })

    it('should call expandToDepth when expandToLevel is invoked', () => {
      const { result } = renderHook(() => useTreeExpand())

      act(() => {
        result.current.expandToLevel(2)
      })

      expect(mockExpandToDepth).toHaveBeenCalledWith(2)
    })

    it('should expand parent paths when expandTo is called', () => {
      const { result } = renderHook(() => useTreeExpand())
      const targetEntry = mockEntries[0].children![1] // subfolder

      act(() => {
        result.current.expandTo(targetEntry, mockEntries)
      })

      // Should expand folder1 (parent of subfolder)
      expect(mockToggleExpand).toHaveBeenCalledWith('folder1')
    })

    it('should expand target if it is a directory', () => {
      vi.mocked(useDirectoryCompareStore).mockReturnValue({
        expandedPaths: new Set(),
        toggleExpand: mockToggleExpand,
      } as any)

      const { result } = renderHook(() => useTreeExpand())
      const targetEntry = mockEntries[0] // folder1 (directory)

      act(() => {
        result.current.expandTo(targetEntry, mockEntries)
      })

      expect(mockToggleExpand).toHaveBeenCalledWith('folder1')
    })

    it('should return correct isAllCollapsed state', () => {
      const { result } = renderHook(() => useTreeExpand())

      expect(result.current.isAllCollapsed).toBe(false)
    })

    it('should return true for isAllCollapsed when no paths expanded', () => {
      vi.mocked(useDirectoryCompareStore).mockReturnValue({
        expandedPaths: new Set(),
        toggleExpand: mockToggleExpand,
      } as any)

      const { result } = renderHook(() => useTreeExpand())

      expect(result.current.isAllCollapsed).toBe(true)
    })
  })

  describe('useTreeSelection', () => {
    const mockSelectEntry = vi.fn()
    const mockToggleSelection = vi.fn()
    const mockClearSelection = vi.fn()

    beforeEach(() => {
      vi.mocked(useDirectoryCompareStore).mockReturnValue({
        selectedEntry: null,
        selectedPaths: new Set(),
        selectEntry: mockSelectEntry,
        toggleSelection: mockToggleSelection,
        clearSelection: mockClearSelection,
      } as any)
    })

    it('should return selected entry', () => {
      vi.mocked(useDirectoryCompareStore).mockReturnValue({
        selectedEntry: mockEntries[0],
        selectedPaths: new Set(['1']),
        selectEntry: mockSelectEntry,
        toggleSelection: mockToggleSelection,
        clearSelection: mockClearSelection,
      } as any)

      const { result } = renderHook(() => useTreeSelection())

      expect(result.current.selectedEntry).toEqual(mockEntries[0])
      expect(result.current.selectedCount).toBe(1)
    })

    it('should check if entry is selected', () => {
      vi.mocked(useDirectoryCompareStore).mockReturnValue({
        selectedEntry: null,
        selectedPaths: new Set(['1']),
        selectEntry: mockSelectEntry,
        toggleSelection: mockToggleSelection,
        clearSelection: mockClearSelection,
      } as any)

      const { result } = renderHook(() => useTreeSelection())

      expect(result.current.isSelected('1')).toBe(true)
      expect(result.current.isSelected('2')).toBe(false)
    })

    it('should call selectEntry when select is invoked', () => {
      const { result } = renderHook(() => useTreeSelection())

      act(() => {
        result.current.select(mockEntries[0])
      })

      expect(mockSelectEntry).toHaveBeenCalledWith(mockEntries[0])
    })

    it('should call selectEntry with null when deselect is invoked', () => {
      const { result } = renderHook(() => useTreeSelection())

      act(() => {
        result.current.deselect()
      })

      expect(mockSelectEntry).toHaveBeenCalledWith(null)
    })

    it('should call toggleSelection when toggle is invoked', () => {
      const { result } = renderHook(() => useTreeSelection())

      act(() => {
        result.current.toggle(mockEntries[0])
      })

      expect(mockToggleSelection).toHaveBeenCalledWith(mockEntries[0])
    })

    it('should select multiple entries', () => {
      const { result } = renderHook(() => useTreeSelection())

      act(() => {
        result.current.selectMultiple(mockEntries)
      })

      expect(mockToggleSelection).toHaveBeenCalledTimes(2)
    })

    it('should not select already selected entries', () => {
      vi.mocked(useDirectoryCompareStore).mockReturnValue({
        selectedEntry: null,
        selectedPaths: new Set(['1']),
        selectEntry: mockSelectEntry,
        toggleSelection: mockToggleSelection,
        clearSelection: mockClearSelection,
      } as any)

      const { result } = renderHook(() => useTreeSelection())

      act(() => {
        result.current.selectMultiple(mockEntries)
      })

      // Only '5' should be toggled since '1' is already selected
      expect(mockToggleSelection).toHaveBeenCalledTimes(1)
    })

    it('should call clearSelection when invoked', () => {
      const { result } = renderHook(() => useTreeSelection())

      act(() => {
        result.current.clearSelection()
      })

      expect(mockClearSelection).toHaveBeenCalled()
    })
  })

  describe('useTreeVisibility', () => {
    it('should return all entries when all expanded', () => {
      const expandedPaths = new Set(['folder1', 'folder1/subfolder'])
      const { result } = renderHook(() => useTreeVisibility(mockEntries, expandedPaths))

      // folder1, file1.txt, subfolder, file2.txt, folder2
      expect(result.current.visibleEntries).toHaveLength(5)
    })

    it('should return only root entries when none expanded', () => {
      const expandedPaths = new Set<string>()
      const { result } = renderHook(() => useTreeVisibility(mockEntries, expandedPaths))

      // Only folder1 and folder2
      expect(result.current.visibleEntries).toHaveLength(2)
    })

    it('should return correct depth for entries', () => {
      const expandedPaths = new Set(['folder1', 'folder1/subfolder'])
      const { result } = renderHook(() => useTreeVisibility(mockEntries, expandedPaths))

      expect(result.current.visibleEntries[0].depth).toBe(0) // folder1
      expect(result.current.visibleEntries[1].depth).toBe(1) // file1.txt
      expect(result.current.visibleEntries[2].depth).toBe(1) // subfolder
      expect(result.current.visibleEntries[3].depth).toBe(2) // file2.txt
      expect(result.current.visibleEntries[4].depth).toBe(0) // folder2
    })

    it('should calculate total height', () => {
      const expandedPaths = new Set(['folder1'])
      const { result } = renderHook(() => useTreeVisibility(mockEntries, expandedPaths))

      // 4 visible entries * 28px height
      expect(result.current.totalHeight).toBe(112)
    })

    it('should get entry at index', () => {
      const expandedPaths = new Set<string>()
      const { result } = renderHook(() => useTreeVisibility(mockEntries, expandedPaths))

      expect(result.current.getEntryAtIndex(0)).toEqual(mockEntries[0])
      expect(result.current.getEntryAtIndex(1)).toEqual(mockEntries[1])
      expect(result.current.getEntryAtIndex(99)).toBeNull()
    })

    it('should get index of entry', () => {
      const expandedPaths = new Set<string>()
      const { result } = renderHook(() => useTreeVisibility(mockEntries, expandedPaths))

      expect(result.current.getIndexOfEntry('1')).toBe(0)
      expect(result.current.getIndexOfEntry('5')).toBe(1)
      expect(result.current.getIndexOfEntry('999')).toBe(-1)
    })

    it('should return visible count', () => {
      const expandedPaths = new Set(['folder1'])
      const { result } = renderHook(() => useTreeVisibility(mockEntries, expandedPaths))

      expect(result.current.visibleCount).toBe(4)
    })
  })

  describe('useTreeOperations', () => {
    it('should return all directory paths', () => {
      const { result } = renderHook(() => useTreeOperations(mockEntries))

      expect(result.current.allDirectoryPaths).toContain('folder1')
      expect(result.current.allDirectoryPaths).toContain('folder1/subfolder')
      expect(result.current.allDirectoryPaths).toContain('folder2')
      expect(result.current.allDirectoryPaths).not.toContain('folder1/file1.txt')
    })

    it('should return all file paths', () => {
      const { result } = renderHook(() => useTreeOperations(mockEntries))

      expect(result.current.allFilePaths).toContain('folder1/file1.txt')
      expect(result.current.allFilePaths).toContain('folder1/subfolder/file2.txt')
      expect(result.current.allFilePaths).not.toContain('folder1')
    })

    it('should find entry by id', () => {
      const { result } = renderHook(() => useTreeOperations(mockEntries))

      expect(result.current.findEntryById('1')).toEqual(mockEntries[0])
      expect(result.current.findEntryById('4')).toEqual(mockEntries[0].children![1].children![0])
      expect(result.current.findEntryById('999')).toBeNull()
    })

    it('should find entry by path', () => {
      const { result } = renderHook(() => useTreeOperations(mockEntries))

      expect(result.current.findEntryByPath('folder1')).toEqual(mockEntries[0])
      expect(result.current.findEntryByPath('folder1/subfolder/file2.txt')).toEqual(
        mockEntries[0].children![1].children![0]
      )
      expect(result.current.findEntryByPath('nonexistent')).toBeNull()
    })

    it('should get parent entry', () => {
      const { result } = renderHook(() => useTreeOperations(mockEntries))

      const childEntry = mockEntries[0].children![0]
      expect(result.current.getParent(childEntry)).toEqual(mockEntries[0])
    })

    it('should return null for root entries without parentId', () => {
      const { result } = renderHook(() => useTreeOperations(mockEntries))

      expect(result.current.getParent(mockEntries[0])).toBeNull()
    })

    it('should get siblings', () => {
      const { result } = renderHook(() => useTreeOperations(mockEntries))

      const file1 = mockEntries[0].children![0]
      const siblings = result.current.getSiblings(file1)

      expect(siblings).toHaveLength(1)
      expect(siblings[0].id).toBe('3') // subfolder
    })

    it('should get siblings at root level', () => {
      const { result } = renderHook(() => useTreeOperations(mockEntries))

      const siblings = result.current.getSiblings(mockEntries[0])

      expect(siblings).toHaveLength(1)
      expect(siblings[0].id).toBe('5') // folder2
    })

    it('should get descendants', () => {
      const { result } = renderHook(() => useTreeOperations(mockEntries))

      const descendants = result.current.getDescendants(mockEntries[0])

      expect(descendants).toHaveLength(3) // file1.txt, subfolder, file2.txt
      expect(descendants.map(d => d.id)).toContain('2')
      expect(descendants.map(d => d.id)).toContain('3')
      expect(descendants.map(d => d.id)).toContain('4')
    })

    it('should return empty array for leaf entries', () => {
      const { result } = renderHook(() => useTreeOperations(mockEntries))

      const descendants = result.current.getDescendants(mockEntries[0].children![0])

      expect(descendants).toHaveLength(0)
    })
  })
})
