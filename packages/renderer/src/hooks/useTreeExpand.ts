import { useCallback, useMemo } from 'react';
import { useDirectoryCompareStore } from '../stores/directory.store';
import type { DirectoryDiffEntry } from '@shared/types/directory.types';

// ============================================
// useTreeExpand Hook
// 管理目录树的展开/折叠状态
// ============================================
export function useTreeExpand() {
  const store = useDirectoryCompareStore();
  const { expandedPaths, toggleExpand, expandAll, collapseAll, expandToDepth } = store;

  // 检查路径是否展开
  const isExpanded = useCallback((path: string): boolean => {
    return expandedPaths.has(path);
  }, [expandedPaths]);

  // 切换展开状态
  const toggle = useCallback((path: string) => {
    toggleExpand(path);
  }, [toggleExpand]);

  // 展开指定路径
  const expand = useCallback((path: string) => {
    if (!expandedPaths.has(path)) {
      toggleExpand(path);
    }
  }, [expandedPaths, toggleExpand]);

  // 折叠指定路径
  const collapse = useCallback((path: string) => {
    if (expandedPaths.has(path)) {
      toggleExpand(path);
    }
  }, [expandedPaths, toggleExpand]);

  // 展开指定条目及其所有父级
  const expandTo = useCallback((entry: DirectoryDiffEntry, allEntries: DirectoryDiffEntry[]) => {
    const pathsToExpand: string[] = [];
    let currentPath = entry.relativePath;

    // 找到所有父级路径
    while (currentPath.includes('/')) {
      const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
      if (parentPath) {
        const parent = allEntries.find(e => e.relativePath === parentPath);
        if (parent && !expandedPaths.has(parent.relativePath)) {
          pathsToExpand.push(parent.relativePath);
        }
        currentPath = parentPath;
      } else {
        break;
      }
    }

    // 同时展开自身（如果是目录）
    if (entry.type === 'directory' && !expandedPaths.has(entry.relativePath)) {
      pathsToExpand.push(entry.relativePath);
    }

    // 批量展开
    pathsToExpand.forEach(path => toggleExpand(path));
  }, [expandedPaths, toggleExpand]);

  // 展开到指定层级
  const expandToLevel = useCallback((level: number) => {
    expandToDepth(level);
  }, [expandToDepth]);

  // 只展开差异项的父目录
  const expandToDiffs = useCallback((entries: DirectoryDiffEntry[]) => {
    const findAndExpand = (items: DirectoryDiffEntry[]) => {
      for (const entry of items) {
        if (entry.status !== 'equal' && entry.parentId) {
          // 展开父级
          const parentEntry = findEntryById(entries, entry.parentId);
          if (parentEntry && !expandedPaths.has(parentEntry.relativePath)) {
            toggleExpand(parentEntry.relativePath);
          }
        }
        if (entry.children) {
          findAndExpand(entry.children);
        }
      }
    };

    findAndExpand(entries);
  }, [expandedPaths, toggleExpand]);

  // 折叠所有子目录
  const collapseChildren = useCallback((entry: DirectoryDiffEntry) => {
    if (!entry.children) return;

    const collectChildPaths = (items: DirectoryDiffEntry[]): string[] => {
      const paths: string[] = [];
      for (const item of items) {
        if (item.type === 'directory') {
          paths.push(item.relativePath);
          if (item.children) {
            paths.push(...collectChildPaths(item.children));
          }
        }
      }
      return paths;
    };

    const childPaths = collectChildPaths(entry.children);
    childPaths.forEach(path => {
      if (expandedPaths.has(path)) {
        toggleExpand(path);
      }
    });
  }, [expandedPaths, toggleExpand]);

  // 获取展开状态统计
  const stats = useMemo(() => {
    return {
      expandedCount: expandedPaths.size,
      isAllExpanded: false, // 需要结合总数计算
      isAllCollapsed: expandedPaths.size === 0
    };
  }, [expandedPaths]);

  return {
    // 状态
    expandedPaths,
    ...stats,

    // 基本操作
    isExpanded,
    toggle,
    expand,
    collapse,

    // 批量操作
    expandAll,
    collapseAll,
    expandTo,
    expandToLevel,
    expandToDiffs,
    collapseChildren
  };
}

// ============================================
// useTreeSelection Hook
// 管理目录树的选择状态
// ============================================
export function useTreeSelection() {
  const store = useDirectoryCompareStore();
  const { selectedEntry, selectedPaths, selectEntry, toggleSelection, clearSelection } = store;

  const isSelected = useCallback((entryId: string): boolean => {
    return selectedPaths.has(entryId);
  }, [selectedPaths]);

  const select = useCallback((entry: DirectoryDiffEntry) => {
    selectEntry(entry);
  }, [selectEntry]);

  const deselect = useCallback(() => {
    selectEntry(null);
  }, [selectEntry]);

  const toggle = useCallback((entry: DirectoryDiffEntry) => {
    toggleSelection(entry);
  }, [toggleSelection]);

  const selectMultiple = useCallback((entries: DirectoryDiffEntry[]) => {
    entries.forEach(entry => {
      if (!selectedPaths.has(entry.id)) {
        toggleSelection(entry);
      }
    });
  }, [selectedPaths, toggleSelection]);

  return {
    selectedEntry,
    selectedCount: selectedPaths.size,
    isSelected,
    select,
    deselect,
    toggle,
    selectMultiple,
    clearSelection
  };
}

// ============================================
// useTreeVisibility Hook
// 管理目录树的可见性（用于虚拟滚动）
// ============================================
export function useTreeVisibility(
  entries: DirectoryDiffEntry[],
  expandedPaths: Set<string>
) {
  // 将树形结构扁平化为可见条目列表
  const visibleEntries = useMemo(() => {
    const result: Array<{ entry: DirectoryDiffEntry; depth: number }> = [];

    const flatten = (items: DirectoryDiffEntry[], depth: number) => {
      for (const item of items) {
        result.push({ entry: item, depth });
        if (item.children && expandedPaths.has(item.relativePath)) {
          flatten(item.children, depth + 1);
        }
      }
    };

    flatten(entries, 0);
    return result;
  }, [entries, expandedPaths]);

  // 计算总高度（用于虚拟滚动）
  const totalHeight = useMemo(() => {
    const itemHeight = 28; // 每个条目默认高度
    return visibleEntries.length * itemHeight;
  }, [visibleEntries.length]);

  // 根据索引获取条目
  const getEntryAtIndex = useCallback((index: number): DirectoryDiffEntry | null => {
    return visibleEntries[index]?.entry ?? null;
  }, [visibleEntries]);

  // 获取条目的索引
  const getIndexOfEntry = useCallback((entryId: string): number => {
    return visibleEntries.findIndex(({ entry }) => entry.id === entryId);
  }, [visibleEntries]);

  return {
    visibleEntries,
    totalHeight,
    getEntryAtIndex,
    getIndexOfEntry,
    visibleCount: visibleEntries.length
  };
}

// ============================================
// useTreeOperations Hook
// 目录树复杂操作
// ============================================
export function useTreeOperations(entries: DirectoryDiffEntry[]) {
  // 获取所有目录路径
  const allDirectoryPaths = useMemo(() => {
    const paths: string[] = [];

    const collect = (items: DirectoryDiffEntry[]) => {
      for (const item of items) {
        if (item.type === 'directory') {
          paths.push(item.relativePath);
          if (item.children) {
            collect(item.children);
          }
        }
      }
    };

    collect(entries);
    return paths;
  }, [entries]);

  // 获取所有文件路径
  const allFilePaths = useMemo(() => {
    const paths: string[] = [];

    const collect = (items: DirectoryDiffEntry[]) => {
      for (const item of items) {
        if (item.type === 'file') {
          paths.push(item.relativePath);
        }
        if (item.children) {
          collect(item.children);
        }
      }
    };

    collect(entries);
    return paths;
  }, [entries]);

  // 根据ID查找条目
  const findEntryById = useCallback((id: string): DirectoryDiffEntry | null => {
    const search = (items: DirectoryDiffEntry[]): DirectoryDiffEntry | null => {
      for (const item of items) {
        if (item.id === id) return item;
        if (item.children) {
          const found = search(item.children);
          if (found) return found;
        }
      }
      return null;
    };

    return search(entries);
  }, [entries]);

  // 根据路径查找条目
  const findEntryByPath = useCallback((path: string): DirectoryDiffEntry | null => {
    const search = (items: DirectoryDiffEntry[]): DirectoryDiffEntry | null => {
      for (const item of items) {
        if (item.relativePath === path) return item;
        if (item.children) {
          const found = search(item.children);
          if (found) return found;
        }
      }
      return null;
    };

    return search(entries);
  }, [entries]);

  // 获取父条目
  const getParent = useCallback((entry: DirectoryDiffEntry): DirectoryDiffEntry | null => {
    if (!entry.parentId) return null;
    return findEntryById(entry.parentId);
  }, [findEntryById]);

  // 获取所有兄弟条目
  const getSiblings = useCallback((entry: DirectoryDiffEntry): DirectoryDiffEntry[] => {
    const parent = getParent(entry);
    if (!parent) {
      return entries.filter(e => e.parentId === undefined);
    }
    return parent.children?.filter(e => e.id !== entry.id) ?? [];
  }, [entries, getParent]);

  // 获取所有后代条目
  const getDescendants = useCallback((entry: DirectoryDiffEntry): DirectoryDiffEntry[] => {
    const result: DirectoryDiffEntry[] = [];

    const collect = (items: DirectoryDiffEntry[]) => {
      for (const item of items) {
        result.push(item);
        if (item.children) {
          collect(item.children);
        }
      }
    };

    if (entry.children) {
      collect(entry.children);
    }

    return result;
  }, []);

  return {
    allDirectoryPaths,
    allFilePaths,
    findEntryById,
    findEntryByPath,
    getParent,
    getSiblings,
    getDescendants
  };
}

// ============================================
// 辅助函数：根据ID查找条目
// ============================================
function findEntryById(entries: DirectoryDiffEntry[], id: string): DirectoryDiffEntry | null {
  const search = (items: DirectoryDiffEntry[]): DirectoryDiffEntry | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = search(item.children);
        if (found) return found;
      }
    }
    return null;
  };

  return search(entries);
}
