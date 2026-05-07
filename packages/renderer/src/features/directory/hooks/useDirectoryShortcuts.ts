/**
 * useDirectoryShortcuts Hook
 * 目录对比功能的快捷键支持
 */
import { useEffect, useCallback } from 'react';
import { useDirectoryCompareStore } from '@renderer/stores/directory.store';

// ============================================
// 快捷键配置选项
// ============================================
export interface DirectoryShortcutsOptions {
  /** 目录对比是否处于活动状态 */
  isActive: boolean;
  /** 是否有选中的条目 */
  hasSelection: boolean;
  /** 选中的是否是目录 */
  isDirectorySelected: boolean;
  /** 向上导航 */
  onNavigateUp: () => void;
  /** 向下导航 */
  onNavigateDown: () => void;
  /** 向左导航（折叠） */
  onNavigateLeft: () => void;
  /** 向右导航（展开） */
  onNavigateRight: () => void;
  /** 展开全部 */
  onExpandAll: () => void;
  /** 折叠全部 */
  onCollapseAll: () => void;
  /** 展开到差异项 */
  onExpandToDiffs: () => void;
  /** 查看差异 */
  onViewDiff: () => void;
  /** 快速预览 */
  onQuickPreview: () => void;
  /** 刷新 */
  onRefresh: () => void;
  /** 复制路径 */
  onCopyPath: () => void;
  /** 聚焦搜索框 */
  onFocusSearch: () => void;
  /** 切换到全部视图 */
  onViewModeAll: () => void;
  /** 切换到仅差异视图 */
  onViewModeDiffOnly: () => void;
  /** 切换到仅左侧视图 */
  onViewModeLeftOnly: () => void;
  /** 切换到仅右侧视图 */
  onViewModeRightOnly: () => void;
  /** 关闭浮层 */
  onCloseOverlay: () => void;
}

// ============================================
// 快捷键映射
// ============================================
interface ShortcutMapping {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: () => void;
  description: string;
  condition?: () => boolean;
}

/**
 * 目录对比快捷键 Hook
 */
export function useDirectoryShortcuts(options: DirectoryShortcutsOptions): void {
  const {
    isActive,
    hasSelection,
    isDirectorySelected,
    onNavigateUp,
    onNavigateDown,
    onNavigateLeft,
    onNavigateRight,
    onExpandAll,
    onCollapseAll,
    onExpandToDiffs,
    onViewDiff,
    onQuickPreview,
    onRefresh,
    onCopyPath,
    onFocusSearch,
    onViewModeAll,
    onViewModeDiffOnly,
    onViewModeLeftOnly,
    onViewModeRightOnly,
    onCloseOverlay
  } = options;

  const store = useDirectoryCompareStore();

  // 定义所有快捷键映射
  const shortcuts: ShortcutMapping[] = [
    // 导航快捷键
    {
      key: 'ArrowUp',
      handler: onNavigateUp,
      description: '向上导航'
    },
    {
      key: 'ArrowDown',
      handler: onNavigateDown,
      description: '向下导航'
    },
    {
      key: 'ArrowLeft',
      handler: onNavigateLeft,
      description: '向左导航/折叠目录',
      condition: () => hasSelection && isDirectorySelected
    },
    {
      key: 'ArrowRight',
      handler: onNavigateRight,
      description: '向右导航/展开目录',
      condition: () => hasSelection && isDirectorySelected
    },

    // 视图操作快捷键
    {
      key: '*',
      handler: onExpandAll,
      description: '展开全部'
    },
    {
      key: '/',
      handler: onCollapseAll,
      description: '折叠全部'
    },
    {
      key: 'd',
      shift: true,
      handler: onExpandToDiffs,
      description: '展开到差异项'
    },

    // 文件操作快捷键
    {
      key: 'Enter',
      handler: onViewDiff,
      description: '查看差异',
      condition: () => hasSelection
    },
    {
      key: ' ',
      handler: onQuickPreview,
      description: '快速预览'
    },
    {
      key: 'f5',
      handler: onRefresh,
      description: '刷新对比'
    },

    // 编辑快捷键
    {
      key: 'c',
      ctrl: true,
      handler: onCopyPath,
      description: '复制路径',
      condition: () => hasSelection
    },
    {
      key: 'c',
      meta: true,
      handler: onCopyPath,
      description: '复制路径 (Mac)',
      condition: () => hasSelection
    },

    // 搜索快捷键
    {
      key: 'f',
      ctrl: true,
      handler: onFocusSearch,
      description: '聚焦搜索框'
    },
    {
      key: 'f',
      meta: true,
      handler: onFocusSearch,
      description: '聚焦搜索框 (Mac)'
    },

    // 视图模式快捷键
    {
      key: '1',
      ctrl: true,
      handler: onViewModeAll,
      description: '显示全部'
    },
    {
      key: '2',
      ctrl: true,
      handler: onViewModeDiffOnly,
      description: '仅显示差异'
    },
    {
      key: '3',
      ctrl: true,
      handler: onViewModeLeftOnly,
      description: '仅显示左侧'
    },
    {
      key: '4',
      ctrl: true,
      handler: onViewModeRightOnly,
      description: '仅显示右侧'
    },

    // 关闭浮层
    {
      key: 'Escape',
      handler: onCloseOverlay,
      description: '关闭浮层/取消'
    }
  ];

  // 检查快捷键是否匹配
  const matchesShortcut = useCallback((event: KeyboardEvent, mapping: ShortcutMapping): boolean => {
    const key = event.key.toLowerCase();
    const expectedKey = mapping.key.toLowerCase();

    // 特殊键处理
    if (mapping.key === 'f5' && key === 'f5') return true;
    if (mapping.key === ' ' && key === ' ') return true;
    if (mapping.key === '*' && key === '*') return true;
    if (mapping.key === '/' && key === '/') return true;

    // 检查修饰键
    const ctrlMatch = !!mapping.ctrl === (event.ctrlKey || event.metaKey);
    const shiftMatch = !!mapping.shift === event.shiftKey;
    const altMatch = !!mapping.alt === event.altKey;

    // 检查主键
    const keyMatch = key === expectedKey;

    return keyMatch && ctrlMatch && shiftMatch && altMatch;
  }, []);

  // 键盘事件处理
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // 如果在输入框中，只处理特定快捷键
      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      const isMonaco = !!target.closest('.monaco-editor');

      for (const shortcut of shortcuts) {
        if (matchesShortcut(event, shortcut)) {
          // 在输入框中时，只处理带修饰键的快捷键
          if ((isInput || isMonaco) && !shortcut.ctrl && !shortcut.meta && !shortcut.alt) {
            continue;
          }

          // 检查条件
          if (shortcut.condition && !shortcut.condition()) {
            continue;
          }

          // 执行处理器
          event.preventDefault();
          event.stopPropagation();
          shortcut.handler();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, shortcuts, matchesShortcut]);
}

// ============================================
// 快捷键帮助数据
// ============================================
export interface ShortcutHelpItem {
  key: string;
  description: string;
  category: 'navigation' | 'view' | 'file' | 'edit' | 'search';
}

export const DIRECTORY_SHORTCUTS_HELP: ShortcutHelpItem[] = [
  // 导航
  { key: '↑ / ↓', description: '上下导航条目', category: 'navigation' },
  { key: '← / →', description: '展开/折叠目录', category: 'navigation' },

  // 视图
  { key: '*', description: '展开全部', category: 'view' },
  { key: '/', description: '折叠全部', category: 'view' },
  { key: 'Shift + D', description: '展开到差异项', category: 'view' },
  { key: 'Ctrl + 1/2/3/4', description: '切换视图模式', category: 'view' },

  // 文件操作
  { key: 'Enter', description: '查看差异', category: 'file' },
  { key: 'Space', description: '快速预览', category: 'file' },
  { key: 'F5', description: '刷新对比', category: 'file' },

  // 编辑
  { key: 'Ctrl + C', description: '复制路径', category: 'edit' },

  // 搜索
  { key: 'Ctrl + F', description: '聚焦搜索框', category: 'search' },

  // 其他
  { key: 'Esc', description: '关闭浮层/取消', category: 'navigation' }
];

// ============================================
// 使用快捷键帮助
// ============================================
export function useDirectoryShortcutsHelp() {
  const getShortcutsByCategory = useCallback((category: ShortcutHelpItem['category']) => {
    return DIRECTORY_SHORTCUTS_HELP.filter(s => s.category === category);
  }, []);

  const getAllShortcuts = useCallback(() => {
    return DIRECTORY_SHORTCUTS_HELP;
  }, []);

  return {
    shortcuts: DIRECTORY_SHORTCUTS_HELP,
    getShortcutsByCategory,
    getAllShortcuts,
    categories: ['navigation', 'view', 'file', 'edit', 'search'] as const
  };
}

export default useDirectoryShortcuts;
