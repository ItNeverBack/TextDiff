import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  DirectoryComparison,
  DirectoryDiffEntry,
  DirDiffStatistics,
  DirCompareOptions,
  DirectoryInfo,
  ComparisonProgress,
  DiffStatus
} from '@shared/types/directory.types';
import { DEFAULT_DIR_COMPARE_OPTIONS } from '@shared/types/directory.types';

// ============================================
// Store State
// ============================================
export interface DirectoryCompareState {
  // 对比会话
  comparison: DirectoryComparison | null;
  isLoading: boolean;
  error: string | null;
  progress: ComparisonProgress | null;

  // 选中的条目
  selectedEntry: DirectoryDiffEntry | null;
  selectedPaths: Set<string>;

  // 展开状态
  expandedPaths: Set<string>;

  // 过滤后的可见条目
  filteredEntries: DirectoryDiffEntry[];
  hiddenCount: number;

  // 视图选项
  viewMode: 'all' | 'diff-only' | 'left-only' | 'right-only';
  showEqualFiles: boolean;
}

// ============================================
// Store Actions
// ============================================
export interface DirectoryCompareActions {
  // 对比操作
  startComparison: (leftPath: string, rightPath: string, options?: Partial<DirCompareOptions>) => Promise<void>;
  setComparison: (comparison: DirectoryComparison) => void;
  clearComparison: () => void;
  cancelComparison: () => void;

  // 进度更新
  setProgress: (progress: ComparisonProgress) => void;

  // 错误处理
  setError: (error: string | null) => void;

  // 选择操作
  selectEntry: (entry: DirectoryDiffEntry | null) => void;
  toggleSelection: (entry: DirectoryDiffEntry) => void;
  selectAll: (entries?: DirectoryDiffEntry[]) => void;
  clearSelection: () => void;

  // 展开/折叠操作
  toggleExpand: (path: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  expandToDepth: (depth: number) => void;
  setExpandedPaths: (paths: string[]) => void;

  // 过滤操作
  applyFilters: (filters: (entry: DirectoryDiffEntry) => boolean) => void;
  setViewMode: (mode: DirectoryCompareState['viewMode']) => void;
  toggleShowEqualFiles: () => void;

  // 刷新
  refreshComparison: () => Promise<void>;
}

// ============================================
// 创建 Store
// ============================================
export const useDirectoryCompareStore = create<DirectoryCompareState & DirectoryCompareActions>()(
  immer((set, get) => ({
    // 初始状态
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
    showEqualFiles: true,

    // ============================================
    // 对比操作
    // ============================================
    startComparison: async (leftPath: string, rightPath: string, options?: Partial<DirCompareOptions>) => {
      set(state => {
        state.isLoading = true;
        state.error = null;
        state.progress = {
          comparisonId: `dir-compare-${Date.now()}`,
          status: 'pending',
          currentPhase: '准备中',
          totalFiles: 0,
          processedFiles: 0,
          percentage: 0
        };
      });

      try {
        const compareOptions = { ...DEFAULT_DIR_COMPARE_OPTIONS, ...options };
        const result = await window.api.directory.compare(leftPath, rightPath, compareOptions);

        set(state => {
          state.comparison = result;
          state.isLoading = false;
          state.progress = null;
          state.filteredEntries = result.entries;
          state.hiddenCount = 0;
          // 默认展开第一层
          state.expandedPaths = new Set(
            result.entries
              .filter(e => e.depth === 0 && e.type === 'directory')
              .map(e => e.relativePath)
          );
        });
      } catch (err) {
        set(state => {
          state.isLoading = false;
          state.error = err instanceof Error ? err.message : '对比失败';
          state.progress = null;
        });
      }
    },

    setComparison: (comparison: DirectoryComparison) => {
      set(state => {
        state.comparison = comparison;
        state.filteredEntries = comparison.entries;
        state.hiddenCount = 0;
        state.expandedPaths = new Set(
          comparison.entries
            .filter(e => e.depth === 0 && e.type === 'directory')
            .map(e => e.relativePath)
        );
      });
    },

    clearComparison: () => {
      set(state => {
        state.comparison = null;
        state.selectedEntry = null;
        state.selectedPaths.clear();
        state.expandedPaths.clear();
        state.filteredEntries = [];
        state.hiddenCount = 0;
        state.error = null;
        state.progress = null;
      });
    },

    cancelComparison: () => {
      const { progress } = get();
      if (progress?.comparisonId) {
        window.api.directory.cancel(progress.comparisonId).catch(console.error);
      }
      set(state => {
        state.isLoading = false;
        state.progress = null;
      });
    },

    // ============================================
    // 进度更新
    // ============================================
    setProgress: (progress: ComparisonProgress) => {
      set(state => {
        state.progress = progress;
      });
    },

    // ============================================
    // 错误处理
    // ============================================
    setError: (error: string | null) => {
      set(state => {
        state.error = error;
        state.isLoading = false;
      });
    },

    // ============================================
    // 选择操作
    // ============================================
    selectEntry: (entry: DirectoryDiffEntry | null) => {
      set(state => {
        state.selectedEntry = entry;
        if (entry) {
          state.selectedPaths.add(entry.id);
        }
      });
    },

    toggleSelection: (entry: DirectoryDiffEntry) => {
      set(state => {
        if (state.selectedPaths.has(entry.id)) {
          state.selectedPaths.delete(entry.id);
          if (state.selectedEntry?.id === entry.id) {
            state.selectedEntry = null;
          }
        } else {
          state.selectedPaths.add(entry.id);
          state.selectedEntry = entry;
        }
      });
    },

    selectAll: (entries?: DirectoryDiffEntry[]) => {
      set(state => {
        const targetEntries = entries || state.filteredEntries;
        targetEntries.forEach(entry => {
          state.selectedPaths.add(entry.id);
        });
      });
    },

    clearSelection: () => {
      set(state => {
        state.selectedPaths.clear();
        state.selectedEntry = null;
      });
    },

    // ============================================
    // 展开/折叠操作
    // ============================================
    toggleExpand: (path: string) => {
      set(state => {
        if (state.expandedPaths.has(path)) {
          state.expandedPaths.delete(path);
        } else {
          state.expandedPaths.add(path);
        }
      });
    },

    expandAll: () => {
      set(state => {
        const allPaths = new Set<string>();
        const collectPaths = (entries: DirectoryDiffEntry[]) => {
          entries.forEach(entry => {
            if (entry.type === 'directory') {
              allPaths.add(entry.relativePath);
              if (entry.children) {
                collectPaths(entry.children);
              }
            }
          });
        };
        if (state.comparison) {
          collectPaths(state.comparison.entries);
        }
        state.expandedPaths = allPaths;
      });
    },

    collapseAll: () => {
      set(state => {
        state.expandedPaths.clear();
      });
    },

    expandToDepth: (depth: number) => {
      set(state => {
        const paths = new Set<string>();
        const collectPaths = (entries: DirectoryDiffEntry[]) => {
          entries.forEach(entry => {
            if (entry.type === 'directory' && entry.depth < depth) {
              paths.add(entry.relativePath);
              if (entry.children) {
                collectPaths(entry.children);
              }
            }
          });
        };
        if (state.comparison) {
          collectPaths(state.comparison.entries);
        }
        state.expandedPaths = paths;
      });
    },

    setExpandedPaths: (paths: string[]) => {
      set(state => {
        state.expandedPaths = new Set(paths);
      });
    },

    // ============================================
    // 过滤操作
    // ============================================
    applyFilters: (filterFn: (entry: DirectoryDiffEntry) => boolean) => {
      set(state => {
        if (!state.comparison) return;

        const filterRecursiveWithCount = (entries: DirectoryDiffEntry[]): { entries: DirectoryDiffEntry[]; hiddenCount: number } => {
          let hidden = 0;
          const result: DirectoryDiffEntry[] = [];

          for (const entry of entries) {
            const selfVisible = filterFn(entry);

            if (entry.children && entry.children.length > 0) {
              const { entries: childEntries, hiddenCount: childHidden } = filterRecursiveWithCount(entry.children);
              const hasVisibleDescendant = childEntries.length > 0;

              if (selfVisible || hasVisibleDescendant) {
                const filteredEntry = { ...entry };
                filteredEntry.children = childEntries;
                hidden += childHidden;
                if (!selfVisible) {
                  hidden++;
                }
                result.push(filteredEntry);
              } else {
                const countChildren = (e: DirectoryDiffEntry): number => {
                  let count = 1;
                  if (e.children) {
                    e.children.forEach(c => { count += countChildren(c); });
                  }
                  return count;
                };
                hidden += countChildren(entry);
              }
            } else if (selfVisible) {
              result.push({ ...entry });
            } else {
              hidden++;
            }
          }

          return { entries: result, hiddenCount: hidden };
        };

        const { entries: filtered, hiddenCount } = filterRecursiveWithCount(state.comparison.entries);
        state.filteredEntries = filtered;
        state.hiddenCount = hiddenCount;
      });
    },

    setViewMode: (mode: DirectoryCompareState['viewMode']) => {
      set(state => {
        state.viewMode = mode;

        // 根据视图模式自动应用过滤
        const viewModeFilters: Record<typeof mode, (entry: DirectoryDiffEntry) => boolean> = {
          'all': () => true,
          'diff-only': (entry) => entry.status !== 'equal',
          'left-only': (entry) => entry.status === 'left-only',
          'right-only': (entry) => entry.status === 'right-only'
        };

        const filter = viewModeFilters[mode];
        if (state.comparison) {
          const filterRecursive = (entries: DirectoryDiffEntry[]): DirectoryDiffEntry[] => {
            const result: DirectoryDiffEntry[] = [];
            for (const entry of entries) {
              if (entry.children && entry.children.length > 0) {
                const childEntries = filterRecursive(entry.children);
                if (filter(entry) || childEntries.length > 0) {
                  result.push({ ...entry, children: childEntries });
                }
              } else if (filter(entry)) {
                result.push({ ...entry });
              }
            }
            return result;
          };
          state.filteredEntries = filterRecursive(state.comparison.entries);
        }
      });
    },

    toggleShowEqualFiles: () => {
      set(state => {
        state.showEqualFiles = !state.showEqualFiles;
        if (!state.comparison) return;

        const filterRecursive = (entries: DirectoryDiffEntry[]): DirectoryDiffEntry[] => {
          const result: DirectoryDiffEntry[] = [];
          for (const entry of entries) {
            const selfVisible = state.showEqualFiles || entry.status !== 'equal';
            if (entry.children && entry.children.length > 0) {
              const childEntries = filterRecursive(entry.children);
              if (selfVisible || childEntries.length > 0) {
                result.push({ ...entry, children: childEntries });
              }
            } else if (selfVisible) {
              result.push({ ...entry });
            }
          }
          return result;
        };

        state.filteredEntries = filterRecursive(state.comparison.entries);
      });
    },

    // ============================================
    // 刷新
    // ============================================
    refreshComparison: async () => {
      const { comparison, startComparison } = get();
      if (!comparison) return;

      await startComparison(
        comparison.leftRoot.path,
        comparison.rightRoot.path,
        comparison.options
      );
    }
  }))
);

// ============================================
// 选择器 Hooks
// ============================================
export const useDirectoryComparison = () =>
  useDirectoryCompareStore(state => state.comparison);

export const useIsDirectoryComparing = () =>
  useDirectoryCompareStore(state => state.isLoading);

export const useDirectoryCompareError = () =>
  useDirectoryCompareStore(state => state.error);

export const useSelectedDirectoryEntry = () =>
  useDirectoryCompareStore(state => state.selectedEntry);

export const useExpandedPaths = () =>
  useDirectoryCompareStore(state => state.expandedPaths);

export const useDirectoryStatistics = () =>
  useDirectoryCompareStore(state => state.comparison?.statistics);

export const useFilteredDirectoryEntries = () =>
  useDirectoryCompareStore(state => state.filteredEntries);
