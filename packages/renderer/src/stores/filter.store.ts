import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  DirectoryFilter,
  ExtensionFilter,
  GlobFilter,
  RegexFilter,
  SizeFilter,
  DateFilter,
  FilterType
} from '@shared/types/directory.types';
import { generateId } from '@shared/utils/id';

// ============================================
// 过滤状态
// ============================================
export interface FilterState {
  // 过滤器列表
  filters: DirectoryFilter[];

  // 搜索关键词
  searchQuery: string;
  isRegexSearch: boolean;
  caseSensitive: boolean;

  // 快速过滤器
  showFiles: boolean;
  showDirectories: boolean;
  showEqual: boolean;
  showModified: boolean;
  showLeftOnly: boolean;
  showRightOnly: boolean;

  // 大小过滤
  minSize?: number;
  maxSize?: number;

  // 日期过滤
  modifiedAfter?: Date;
  modifiedBefore?: Date;
}

// ============================================
// 过滤操作
// ============================================
export interface FilterActions {
  // 过滤器管理
  addFilter: (filter: Omit<DirectoryFilter, 'id'>) => void;
  updateFilter: (id: string, updates: Partial<DirectoryFilter>) => void;
  removeFilter: (id: string) => void;
  toggleFilter: (id: string) => void;
  clearFilters: () => void;

  // 扩展名过滤器快捷操作
  addExtensionFilter: (extensions: string[], caseSensitive?: boolean) => void;
  removeExtensionFilter: (extensions: string[]) => void;

  // Glob过滤器快捷操作
  addGlobFilter: (patterns: string[]) => void;

  // 搜索
  setSearchQuery: (query: string) => void;
  toggleRegexSearch: () => void;
  toggleCaseSensitive: () => void;
  clearSearch: () => void;

  // 快速过滤器
  setShowFiles: (show: boolean) => void;
  setShowDirectories: (show: boolean) => void;
  toggleShowEqual: () => void;
  toggleShowModified: () => void;
  toggleShowLeftOnly: () => void;
  toggleShowRightOnly: () => void;

  // 大小过滤
  setSizeRange: (min?: number, max?: number) => void;
  clearSizeFilter: () => void;

  // 日期过滤
  setDateRange: (after?: Date, before?: Date) => void;
  clearDateFilter: () => void;

  // 预设过滤器
  applyPreset: (preset: FilterPreset) => void;
}

// ============================================
// 过滤预设
// ============================================
export interface FilterPreset {
  name: string;
  description: string;
  filters: Omit<DirectoryFilter, 'id'>[];
  searchQuery?: string;
}

// 常用预设
export const COMMON_FILTER_PRESETS: FilterPreset[] = [
  {
    name: '源代码文件',
    description: '只显示源代码文件',
    filters: [
      {
        type: 'extension',
        enabled: true,
        invert: false,
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.vue', '.py', '.java', '.cpp', '.c', '.h', '.go', '.rs'],
        caseSensitive: false
      }
    ]
  },
  {
    name: '排除Node模块',
    description: '排除 node_modules 和依赖目录',
    filters: [
      {
        type: 'glob',
        enabled: true,
        invert: true,
        patterns: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/.idea/**', '**/.vscode/**']
      }
    ]
  },
  {
    name: '只显示差异',
    description: '隐藏所有相同的文件',
    filters: []
  },
  {
    name: '大文件',
    description: '只显示大于 1MB 的文件',
    filters: [
      {
        type: 'size',
        enabled: true,
        invert: false,
        minSize: 1024 * 1024 // 1MB
      }
    ]
  }
];

// ============================================
// 创建 Store
// ============================================
export const useFilterStore = create<FilterState & FilterActions>()(
  immer((set, get) => ({
    // 初始状态
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
    minSize: undefined,
    maxSize: undefined,
    modifiedAfter: undefined,
    modifiedBefore: undefined,

    // ============================================
    // 过滤器管理
    // ============================================
    addFilter: (filter: Omit<DirectoryFilter, 'id'>) => {
      set(state => {
        state.filters.push({
          ...filter,
          id: generateId()
        });
      });
    },

    updateFilter: (id: string, updates: Partial<DirectoryFilter>) => {
      set(state => {
        const index = state.filters.findIndex(f => f.id === id);
        if (index !== -1) {
          state.filters[index] = { ...state.filters[index], ...updates };
        }
      });
    },

    removeFilter: (id: string) => {
      set(state => {
        state.filters = state.filters.filter(f => f.id !== id);
      });
    },

    toggleFilter: (id: string) => {
      set(state => {
        const filter = state.filters.find(f => f.id === id);
        if (filter) {
          filter.enabled = !filter.enabled;
        }
      });
    },

    clearFilters: () => {
      set(state => {
        state.filters = [];
        state.searchQuery = '';
        state.minSize = undefined;
        state.maxSize = undefined;
        state.modifiedAfter = undefined;
        state.modifiedBefore = undefined;
        state.showEqual = true;
        state.showModified = true;
        state.showLeftOnly = true;
        state.showRightOnly = true;
      });
    },

    // ============================================
    // 扩展名过滤器快捷操作
    // ============================================
    addExtensionFilter: (extensions: string[], caseSensitive = false) => {
      set(state => {
        // 检查是否已存在扩展名过滤器
        const existingFilter = state.filters.find(
          f => f.type === 'extension'
        ) as ExtensionFilter | undefined;

        if (existingFilter) {
          // 合并扩展名
          const newExtensions = [...new Set([...existingFilter.extensions, ...extensions])];
          existingFilter.extensions = newExtensions;
        } else {
          state.filters.push({
            id: generateId(),
            type: 'extension',
            enabled: true,
            invert: false,
            extensions,
            caseSensitive
          });
        }
      });
    },

    removeExtensionFilter: (extensions: string[]) => {
      set(state => {
        const existingFilter = state.filters.find(
          f => f.type === 'extension'
        ) as ExtensionFilter | undefined;

        if (existingFilter) {
          existingFilter.extensions = existingFilter.extensions.filter(
            e => !extensions.includes(e)
          );

          // 如果没有扩展名了，移除过滤器
          if (existingFilter.extensions.length === 0) {
            state.filters = state.filters.filter(f => f.id !== existingFilter.id);
          }
        }
      });
    },

    // ============================================
    // Glob过滤器快捷操作
    // ============================================
    addGlobFilter: (patterns: string[]) => {
      set(state => {
        state.filters.push({
          id: generateId(),
          type: 'glob',
          enabled: true,
          invert: true, // 默认排除
          patterns
        });
      });
    },

    // ============================================
    // 搜索
    // ============================================
    setSearchQuery: (query: string) => {
      set(state => {
        state.searchQuery = query;
      });
    },

    toggleRegexSearch: () => {
      set(state => {
        state.isRegexSearch = !state.isRegexSearch;
      });
    },

    toggleCaseSensitive: () => {
      set(state => {
        state.caseSensitive = !state.caseSensitive;
      });
    },

    clearSearch: () => {
      set(state => {
        state.searchQuery = '';
      });
    },

    // ============================================
    // 快速过滤器
    // ============================================
    setShowFiles: (show: boolean) => {
      set(state => {
        state.showFiles = show;
      });
    },

    setShowDirectories: (show: boolean) => {
      set(state => {
        state.showDirectories = show;
      });
    },

    toggleShowEqual: () => {
      set(state => {
        state.showEqual = !state.showEqual;
      });
    },

    toggleShowModified: () => {
      set(state => {
        state.showModified = !state.showModified;
      });
    },

    toggleShowLeftOnly: () => {
      set(state => {
        state.showLeftOnly = !state.showLeftOnly;
      });
    },

    toggleShowRightOnly: () => {
      set(state => {
        state.showRightOnly = !state.showRightOnly;
      });
    },

    // ============================================
    // 大小过滤
    // ============================================
    setSizeRange: (min?: number, max?: number) => {
      set(state => {
        state.minSize = min;
        state.maxSize = max;
      });
    },

    clearSizeFilter: () => {
      set(state => {
        state.minSize = undefined;
        state.maxSize = undefined;
      });
    },

    // ============================================
    // 日期过滤
    // ============================================
    setDateRange: (after?: Date, before?: Date) => {
      set(state => {
        state.modifiedAfter = after;
        state.modifiedBefore = before;
      });
    },

    clearDateFilter: () => {
      set(state => {
        state.modifiedAfter = undefined;
        state.modifiedBefore = undefined;
      });
    },

    // ============================================
    // 预设过滤器
    // ============================================
    applyPreset: (preset: FilterPreset) => {
      set(state => {
        state.filters = preset.filters.map(f => ({
          ...f,
          id: generateId()
        }));
        if (preset.searchQuery !== undefined) {
          state.searchQuery = preset.searchQuery;
        }
      });
    }
  }))
);

// ============================================
// 选择器 Hooks
// ============================================
export const useFilters = () => useFilterStore(state => state.filters);
export const useSearchQuery = () => useFilterStore(state => state.searchQuery);
export const useIsRegexSearch = () => useFilterStore(state => state.isRegexSearch);
export const useQuickFilters = () => useFilterStore(state => ({
  showFiles: state.showFiles,
  showDirectories: state.showDirectories,
  showEqual: state.showEqual,
  showModified: state.showModified,
  showLeftOnly: state.showLeftOnly,
  showRightOnly: state.showRightOnly
}));

// ============================================
// 过滤函数工厂
// ============================================
export function createFilterFunction(state: FilterState) {
  return (entry: {
    name: string;
    type: 'file' | 'directory';
    status: string;
    relativePath: string;
    leftMetadata?: { size?: number; modifiedTime?: Date };
    rightMetadata?: { size?: number; modifiedTime?: Date };
  }): boolean => {
    // 类型过滤
    if (!state.showFiles && entry.type === 'file') return false;
    if (!state.showDirectories && entry.type === 'directory') return false;

    // 状态过滤
    if (!state.showEqual && entry.status === 'equal') return false;
    if (!state.showModified && entry.status === 'modified') return false;
    if (!state.showLeftOnly && entry.status === 'left-only') return false;
    if (!state.showRightOnly && entry.status === 'right-only') return false;

    // 搜索过滤
    if (state.searchQuery) {
      const nameTarget = state.caseSensitive ? entry.name : entry.name.toLowerCase();
      const pathTarget = state.caseSensitive ? entry.relativePath : entry.relativePath.toLowerCase();
      const query = state.caseSensitive ? state.searchQuery : state.searchQuery.toLowerCase();

      if (state.isRegexSearch) {
        try {
          const regex = new RegExp(query, state.caseSensitive ? '' : 'i');
          if (!regex.test(entry.name) && !regex.test(entry.relativePath)) return false;
        } catch {
          if (!nameTarget.includes(query) && !pathTarget.includes(query)) return false;
        }
      } else {
        if (!nameTarget.includes(query) && !pathTarget.includes(query)) return false;
      }
    }

    // 自定义过滤器
    for (const filter of state.filters) {
      if (!filter.enabled) continue;

      const matches = matchesFilter(entry, filter);
      if (filter.invert ? matches : !matches) return false;
    }

    // 大小过滤
    if (state.minSize !== undefined || state.maxSize !== undefined) {
      const size = entry.leftMetadata?.size ?? entry.rightMetadata?.size ?? 0;
      if (state.minSize !== undefined && size < state.minSize) return false;
      if (state.maxSize !== undefined && size > state.maxSize) return false;
    }

    // 日期过滤
    if (state.modifiedAfter !== undefined || state.modifiedBefore !== undefined) {
      const mtime = entry.leftMetadata?.modifiedTime ?? entry.rightMetadata?.modifiedTime;
      if (mtime) {
        if (state.modifiedAfter && mtime < state.modifiedAfter) return false;
        if (state.modifiedBefore && mtime > state.modifiedBefore) return false;
      }
    }

    return true;
  };
}

// ============================================
// 单个过滤器匹配函数
// ============================================
function matchesFilter(
  entry: { name: string; type: string; relativePath: string },
  filter: DirectoryFilter
): boolean {
  switch (filter.type) {
    case 'extension': {
      const extFilter = filter as ExtensionFilter;
      const ext = entry.name.slice(entry.name.lastIndexOf('.'));
      const checkExt = extFilter.caseSensitive ? ext : ext.toLowerCase();
      const checkList = extFilter.caseSensitive
        ? extFilter.extensions
        : extFilter.extensions.map(e => e.toLowerCase());
      return checkList.includes(checkExt);
    }

    case 'glob': {
      const globFilter = filter as GlobFilter;
      return globFilter.patterns.some(pattern => {
        // 简化的 glob 匹配
        const regex = new RegExp(
          '^' +
          pattern
            .replace(/\*\*/g, '{{GLOBSTAR}}')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '.')
            .replace(/{{GLOBSTAR}}/g, '.*')
            .replace(/\./g, '\\.') +
          '$'
        );
        return regex.test(entry.relativePath);
      });
    }

    case 'regex': {
      const regexFilter = filter as RegexFilter;
      try {
        const regex = new RegExp(regexFilter.pattern, regexFilter.flags);
        return regex.test(entry.name) || regex.test(entry.relativePath);
      } catch {
        return false;
      }
    }

    case 'size': {
      // 大小过滤在处理函数中处理
      return true;
    }

    case 'date': {
      // 日期过滤在处理函数中处理
      return true;
    }

    default:
      return true;
  }
}
