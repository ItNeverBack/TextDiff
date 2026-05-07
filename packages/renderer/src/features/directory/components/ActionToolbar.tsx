/**
 * ActionToolbar 组件
 * 目录对比操作工具栏
 */
import React from 'react';
import { cn } from '@renderer/lib/utils';
import { useDirectoryCompareStore } from '@renderer/stores/directory.store';

// ============================================
// 组件属性
// ============================================
export type ViewMode = 'all' | 'diff-only' | 'left-only' | 'right-only';

export interface ActionToolbarProps {
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onExpandToDiffs?: () => void;
  onSync?: () => void;
  onExport?: () => void;
  canSync?: boolean;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  className?: string;
}

// ============================================
// ActionToolbar 组件
// ============================================
export const ActionToolbar: React.FC<ActionToolbarProps> = ({
  onExpandAll,
  onCollapseAll,
  onExpandToDiffs,
  onSync,
  onExport,
  canSync = false,
  viewMode = 'all',
  onViewModeChange,
  className
}) => {
  const store = useDirectoryCompareStore();
  const { comparison, expandedPaths } = store;

  const viewModeLabels: Record<ViewMode, string> = {
    'all': '全部',
    'diff-only': '仅差异',
    'left-only': '仅左侧',
    'right-only': '仅右侧'
  };

  return (
    <div
      className={cn(
        'action-toolbar',
        'flex items-center gap-2',
        'px-4 py-2',
        'bg-white dark:bg-gray-900',
        'border-b border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* 视图模式切换 */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500 mr-1">显示:</span>
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-md p-0.5">
          {(Object.keys(viewModeLabels) as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange?.(mode)}
              className={cn(
                'px-2 py-1 text-xs rounded transition-colors',
                viewMode === mode
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              {viewModeLabels[mode]}
            </button>
          ))}
        </div>
      </div>

      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* 视图操作 */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500 mr-1">展开:</span>

        <button
          onClick={onExpandAll}
          className={cn(
            'p-1.5 rounded',
            'text-gray-600 dark:text-gray-400',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'transition-colors'
          )}
          title="展开全部"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <path d="M4 14h6v6M4 10h6V4M14 10h6V4M14 14h6v6" />
          </svg>
        </button>

        <button
          onClick={onCollapseAll}
          className={cn(
            'p-1.5 rounded',
            'text-gray-600 dark:text-gray-400',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'transition-colors'
          )}
          title="折叠全部"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <path d="M4 14h6M4 10h6V4M14 14h6v6M14 10h6V4" />
          </svg>
        </button>

        <button
          onClick={onExpandToDiffs}
          className={cn(
            'px-2 py-1.5 rounded text-xs',
            'text-gray-600 dark:text-gray-400',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'transition-colors flex items-center gap-1'
          )}
          title="展开差异项"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <path d="M4 10V4M4 4h6M4 4l6 6M20 10V4M20 4h-6M20 4l-6 6M4 14v6M4 20h6M4 20l6-6M20 14v6M20 20h-6M20 20l-6-6" />
          </svg>
          展开差异
        </button>
      </div>

      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* 选择操作 */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500 mr-1">选择:</span>

        <button
          onClick={() => store.selectAll(store.filteredEntries)}
          className={cn(
            'px-2 py-1.5 rounded text-xs',
            'text-gray-600 dark:text-gray-400',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'transition-colors'
          )}
        >
          全选
        </button>

        <button
          onClick={store.clearSelection}
          className={cn(
            'px-2 py-1.5 rounded text-xs',
            'text-gray-600 dark:text-gray-400',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'transition-colors'
          )}
        >
          清空
        </button>
      </div>

      <div className="flex-1" />

      {/* 操作按钮 */}
      <div className="flex items-center gap-2">
        {onExport && (
          <button
            onClick={onExport}
            className={cn(
              'px-3 py-1.5 rounded text-sm flex items-center gap-1.5',
              'bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-50 transition-colors'
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            导出
          </button>
        )}

        {onSync && (
          <button
            onClick={onSync}
            disabled={!canSync}
            className={cn(
              'px-3 py-1.5 rounded text-sm flex items-center gap-1.5',
              'bg-blue-500 text-white',
              'hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors'
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            同步
          </button>
        )}
      </div>
    </div>
  );
};

export default ActionToolbar;
