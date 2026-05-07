import { useCallback, useEffect, useMemo } from 'react';
import { useDirectoryCompareStore } from '../stores/directory.store';
import { useFilterStore, createFilterFunction } from '../stores/filter.store';
import type {
  DirectoryDiffEntry,
  DirCompareOptions,
  DirectoryComparison
} from '@shared/types/directory.types';

// ============================================
// useDirectoryCompare Hook
// 封装目录对比的完整逻辑
// ============================================
export function useDirectoryCompare() {
  const store = useDirectoryCompareStore();
  const filterStore = useFilterStore();

  // 应用过滤
  useEffect(() => {
    if (!store.comparison) return;

    const filterFn = createFilterFunction(filterStore);
    store.applyFilters(filterFn as (entry: DirectoryDiffEntry) => boolean);
  }, [
    store.comparison,
    filterStore.filters,
    filterStore.searchQuery,
    filterStore.isRegexSearch,
    filterStore.caseSensitive,
    filterStore.showFiles,
    filterStore.showDirectories,
    filterStore.showEqual,
    filterStore.showModified,
    filterStore.showLeftOnly,
    filterStore.showRightOnly,
    filterStore.minSize,
    filterStore.maxSize,
    filterStore.modifiedAfter,
    filterStore.modifiedBefore
  ]);

  // 开始对比
  const compare = useCallback(async (
    leftPath: string,
    rightPath: string,
    options?: Partial<DirCompareOptions>
  ) => {
    await store.startComparison(leftPath, rightPath, options);
  }, [store]);

  // 刷新对比
  const refresh = useCallback(async () => {
    await store.refreshComparison();
  }, [store]);

  // 取消对比
  const cancel = useCallback(() => {
    store.cancelComparison();
  }, [store]);

  // 清除对比结果
  const clear = useCallback(() => {
    store.clearComparison();
  }, [store]);

  return {
    // 状态
    comparison: store.comparison,
    isLoading: store.isLoading,
    error: store.error,
    progress: store.progress,

    // 操作方法
    compare,
    refresh,
    cancel,
    clear,

    // 选中相关
    selectedEntry: store.selectedEntry,
    selectEntry: store.selectEntry,
    toggleSelection: store.toggleSelection,
    clearSelection: store.clearSelection,

    // 展开相关
    expandedPaths: store.expandedPaths,
    toggleExpand: store.toggleExpand,
    expandAll: store.expandAll,
    collapseAll: store.collapseAll,
    expandToDepth: store.expandToDepth,

    // 过滤相关
    filteredEntries: store.filteredEntries,
    viewMode: store.viewMode,
    setViewMode: store.setViewMode,
    showEqualFiles: store.showEqualFiles,
    toggleShowEqualFiles: store.toggleShowEqualFiles,
    hiddenCount: store.hiddenCount
  };
}

// ============================================
// useDirectoryEntry Hook
// 操作单个目录条目
// ============================================
export function useDirectoryEntry(entryId: string) {
  const store = useDirectoryCompareStore();

  const entry = useMemo(() => {
    if (!store.comparison) return null;

    const findEntry = (entries: DirectoryDiffEntry[]): DirectoryDiffEntry | null => {
      for (const e of entries) {
        if (e.id === entryId) return e;
        if (e.children) {
          const found = findEntry(e.children);
          if (found) return found;
        }
      }
      return null;
    };

    return findEntry(store.comparison.entries);
  }, [store.comparison, entryId]);

  const isExpanded = useMemo(() => {
    return entry ? store.expandedPaths.has(entry.relativePath) : false;
  }, [store.expandedPaths, entry]);

  const isSelected = useMemo(() => {
    return entry ? store.selectedPaths.has(entry.id) : false;
  }, [store.selectedPaths, entry]);

  const toggleExpand = useCallback(() => {
    if (entry) {
      store.toggleExpand(entry.relativePath);
    }
  }, [store, entry]);

  const select = useCallback(() => {
    if (entry) {
      store.selectEntry(entry);
    }
  }, [store, entry]);

  const toggleSelect = useCallback(() => {
    if (entry) {
      store.toggleSelection(entry);
    }
  }, [store, entry]);

  return {
    entry,
    isExpanded,
    isSelected,
    toggleExpand,
    select,
    toggleSelect
  };
}

// ============================================
// useDirectoryStats Hook
// 获取统计信息
// ============================================
export function useDirectoryStats() {
  const store = useDirectoryCompareStore();

  return useMemo(() => {
    const stats = store.comparison?.statistics;
    const filteredEntries = store.filteredEntries;

    // 计算过滤后的统计（只统计文件，不统计目录）
    let visibleTotal = 0;
    let visibleModified = 0;
    let visibleLeftOnly = 0;
    let visibleRightOnly = 0;
    let visibleEqual = 0;

    const countRecursive = (entries: DirectoryDiffEntry[]) => {
      for (const entry of entries) {
        // 只统计文件，不统计目录
        if (entry.type === 'file') {
          visibleTotal++;
          switch (entry.status) {
            case 'modified':
              visibleModified++;
              break;
            case 'left-only':
              visibleLeftOnly++;
              break;
            case 'right-only':
              visibleRightOnly++;
              break;
            case 'equal':
              visibleEqual++;
              break;
          }
        }
        // 递归处理子项（即使是目录也要递归）
        if (entry.children) {
          countRecursive(entry.children);
        }
      }
    };

    countRecursive(filteredEntries);

    return {
      // 原始统计
      total: stats?.totalFiles || 0,
      directories: stats?.totalDirectories || 0,
      modified: stats?.modified || 0,
      leftOnly: stats?.leftOnly || 0,
      rightOnly: stats?.rightOnly || 0,
      equal: stats?.equal || 0,
      totalSizeLeft: stats?.totalSizeLeft || 0,
      totalSizeRight: stats?.totalSizeRight || 0,
      duration: stats?.duration || 0,

      // 可见统计
      visibleTotal,
      visibleModified,
      visibleLeftOnly,
      visibleRightOnly,
      visibleEqual,
      hiddenCount: store.hiddenCount
    };
  }, [store.comparison?.statistics, store.filteredEntries, store.hiddenCount]);
}

// ============================================
// useDirectoryNavigation Hook
// 目录树导航
// ============================================
export function useDirectoryNavigation() {
  const store = useDirectoryCompareStore();

  const flatEntries = useMemo(() => {
    const result: DirectoryDiffEntry[] = [];

    const flatten = (entries: DirectoryDiffEntry[]) => {
      for (const entry of entries) {
        result.push(entry);
        if (entry.children && store.expandedPaths.has(entry.relativePath)) {
          flatten(entry.children);
        }
      }
    };

    flatten(store.filteredEntries);
    return result;
  }, [store.filteredEntries, store.expandedPaths]);

  const selectedIndex = useMemo(() => {
    if (!store.selectedEntry) return -1;
    return flatEntries.findIndex(e => e.id === store.selectedEntry?.id);
  }, [flatEntries, store.selectedEntry]);

  const navigateNext = useCallback(() => {
    if (selectedIndex < flatEntries.length - 1) {
      store.selectEntry(flatEntries[selectedIndex + 1]);
    }
  }, [flatEntries, selectedIndex, store]);

  const navigatePrev = useCallback(() => {
    if (selectedIndex > 0) {
      store.selectEntry(flatEntries[selectedIndex - 1]);
    }
  }, [flatEntries, selectedIndex, store]);

  const navigateToFirst = useCallback(() => {
    if (flatEntries.length > 0) {
      store.selectEntry(flatEntries[0]);
    }
  }, [flatEntries, store]);

  const navigateToLast = useCallback(() => {
    if (flatEntries.length > 0) {
      store.selectEntry(flatEntries[flatEntries.length - 1]);
    }
  }, [flatEntries, store]);

  return {
    flatEntries,
    selectedIndex,
    navigateNext,
    navigatePrev,
    navigateToFirst,
    navigateToLast
  };
}

// ============================================
// useDirectorySearch Hook
// 目录内搜索
// ============================================
export function useDirectorySearch() {
  const filterStore = useFilterStore();

  const searchResults = useMemo(() => {
    // 搜索逻辑在过滤函数中实现
    return {
      query: filterStore.searchQuery,
      isRegex: filterStore.isRegexSearch,
      caseSensitive: filterStore.caseSensitive
    };
  }, [filterStore.searchQuery, filterStore.isRegexSearch, filterStore.caseSensitive]);

  const setSearch = useCallback((query: string) => {
    filterStore.setSearchQuery(query);
  }, [filterStore]);

  const clearSearch = useCallback(() => {
    filterStore.clearSearch();
  }, [filterStore]);

  const toggleRegex = useCallback(() => {
    filterStore.toggleRegexSearch();
  }, [filterStore]);

  const toggleCaseSensitive = useCallback(() => {
    filterStore.toggleCaseSensitive();
  }, [filterStore]);

  return {
    ...searchResults,
    setSearch,
    clearSearch,
    toggleRegex,
    toggleCaseSensitive
  };
}
