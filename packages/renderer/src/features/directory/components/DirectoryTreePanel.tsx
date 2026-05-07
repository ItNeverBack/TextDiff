/**
 * DirectoryTreePanel 组件
 * 目录树面板，显示目录结构
 */
import React, { useCallback, MouseEvent } from 'react';
import { cn } from '@renderer/lib/utils';
import { TreeNode, TreeNodeEmpty, TreeNodeLoading, TreeNodeError } from './TreeNode';
import { useDirectoryCompareStore } from '@renderer/stores/directory.store';
import { useTreeExpand, useTreeVisibility, useTreeOperations } from '@renderer/hooks/useTreeExpand';
import { useVirtualScroll } from '@renderer/hooks/useVirtualScroll';
import type { DirectoryDiffEntry } from '@shared/types/directory.types';

// ============================================
// 组件属性
// ============================================
export interface DirectoryTreePanelProps {
  side: 'left' | 'right';
  entries: DirectoryDiffEntry[];
  rootPath?: string;
  className?: string;
  showSize?: boolean;
  showDate?: boolean;
  itemHeight?: number;
  overscan?: number;
  onEntrySelect?: (entry: DirectoryDiffEntry) => void;
  onEntryDoubleClick?: (entry: DirectoryDiffEntry) => void;
  onContextMenu?: (entry: DirectoryDiffEntry, e: MouseEvent) => void;
}

// ============================================
// DirectoryTreePanel 组件
// ============================================
export const DirectoryTreePanel: React.FC<DirectoryTreePanelProps> = ({
  side,
  entries,
  rootPath,
  className,
  showSize = false,
  showDate = false,
  itemHeight = 28,
  overscan = 5,
  onEntrySelect,
  onEntryDoubleClick,
  onContextMenu
}) => {
  const store = useDirectoryCompareStore();
  const { expandedPaths, selectedEntry, toggleExpand, selectEntry } = store;

  // 树形操作
  const treeOps = useTreeOperations(entries);

  // 可见条目（虚拟滚动准备）
  const { visibleEntries } = useTreeVisibility(entries, expandedPaths);

  // 使用虚拟滚动Hook
  const {
    visibleItems,
    totalHeight,
    containerRef,
    handleScroll,
    scrollToIndex
  } = useVirtualScroll(
    visibleEntries.map(({ entry }) => entry),
    {
      itemHeight,
      overscan,
      containerHeight: 0 // 初始值，会被ResizeObserver动态更新
    }
  );

  // 处理条目切换
  const handleToggle = useCallback((entry: DirectoryDiffEntry) => {
    if (entry.type === 'directory') {
      toggleExpand(entry.relativePath);
    }
  }, [toggleExpand]);

  // 处理条目选择
  const handleSelect = useCallback((entry: DirectoryDiffEntry) => {
    selectEntry(entry);
    onEntrySelect?.(entry);
  }, [selectEntry, onEntrySelect]);

  // 处理双击
  const handleDoubleClick = useCallback((entry: DirectoryDiffEntry) => {
    if (entry.type === 'directory') {
      handleToggle(entry);
    }
    onEntryDoubleClick?.(entry);
  }, [handleToggle, onEntryDoubleClick]);

  // 处理右键菜单
  const handleContextMenu = useCallback((entry: DirectoryDiffEntry, e: MouseEvent) => {
    e.preventDefault();
    onContextMenu?.(entry, e);
  }, [onContextMenu]);

  // 处理键盘导航
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!selectedEntry) return;

    const currentIndex = visibleEntries.findIndex(
      ({ entry }) => entry.id === selectedEntry.id
    );

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < visibleEntries.length - 1) {
          const nextEntry = visibleEntries[currentIndex + 1].entry;
          handleSelect(nextEntry);
          scrollToIndex(currentIndex + 1, 'auto');
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          const prevEntry = visibleEntries[currentIndex - 1].entry;
          handleSelect(prevEntry);
          scrollToIndex(currentIndex - 1, 'auto');
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (selectedEntry.type === 'directory' && !expandedPaths.has(selectedEntry.relativePath)) {
          handleToggle(selectedEntry);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (selectedEntry.type === 'directory' && expandedPaths.has(selectedEntry.relativePath)) {
          handleToggle(selectedEntry);
        } else if (selectedEntry.parentId) {
          const parent = treeOps.findEntryById(selectedEntry.parentId);
          if (parent) {
            handleSelect(parent);
          }
        }
        break;
      case 'Enter':
        e.preventDefault();
        handleDoubleClick(selectedEntry);
        break;
    }
  }, [selectedEntry, visibleEntries, expandedPaths, handleSelect, handleToggle, handleDoubleClick, treeOps, scrollToIndex]);

  // 渲染内容
  const renderContent = () => {
    if (store.isLoading) {
      return <TreeNodeLoading />;
    }

    if (store.error) {
      return (
        <TreeNodeError
          message={store.error}
          onRetry={() => store.refreshComparison()}
        />
      );
    }

    if (entries.length === 0) {
      return <TreeNodeEmpty message="没有可显示的文件" />;
    }

    return (
      <div
        style={{
          height: totalHeight,
          position: 'relative'
        }}
      >
        {visibleItems.map(({ item, index, style }) => {
          const entry = visibleEntries[index]?.entry || item;
          const depth = visibleEntries[index]?.depth || 0;
          return (
            <div
              key={entry.id}
              style={style}
            >
              <TreeNode
                entry={entry}
                side={side}
                isExpanded={expandedPaths.has(entry.relativePath)}
                isSelected={selectedEntry?.id === entry.id}
                onToggle={() => handleToggle(entry)}
                onSelect={() => handleSelect(entry)}
                onDoubleClick={() => handleDoubleClick(entry)}
                onContextMenu={(e) => handleContextMenu(entry, e)}
                showSize={showSize}
                showDate={showDate}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'directory-tree-panel',
        'flex flex-col h-full overflow-hidden',
        'bg-white dark:bg-gray-900',
        'border-r border-gray-200 dark:border-gray-700 last:border-r-0',
        className
      )}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="tree"
      aria-label={`${side === 'left' ? '左侧' : '右侧'}目录树`}
      aria-multiselectable="false"
    >
      {/* 面板头部 */}
      {rootPath && (
        <div className="flex flex-col px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="text-yellow-500 mr-2 flex-shrink-0"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-xs font-medium text-gray-900 dark:text-white truncate" title={rootPath}>
              {rootPath.split(/[\\/]/).pop() || rootPath}
            </span>
            <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
              {side === 'left' ? '左侧' : '右侧'}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-1" title={rootPath}>
            {rootPath}
          </span>
        </div>
      )}

      {/* 树形内容 */}
      <div
        className="flex-1 overflow-auto custom-scrollbar"
        onScroll={handleScroll}
      >
        {renderContent()}
      </div>

      {/* 底部信息 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
        <span>共 {visibleEntries.length} 项</span>
        <span>{expandedPaths.size} 个展开</span>
      </div>
    </div>
  );
};

export default DirectoryTreePanel;
