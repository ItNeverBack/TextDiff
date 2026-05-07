/**
 * DiffPreviewDrawer 组件
 * 文件差异预览抽屉 - 使用 DiffPreviewPanel 作为内容
 *
 * 修复：支持展开/折叠动画，确保动画完成后才卸载组件
 */
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { cn } from '@renderer/lib/utils';
import { DiffPreviewPanel } from './DiffPreviewPanel';
import type { DirectoryDiffEntry } from '@shared/types/directory.types';

// ============================================
// 组件属性
// ============================================
export interface DiffPreviewDrawerProps {
  /** 选中的目录差异条目 */
  entry: DirectoryDiffEntry | null;
  /** 是否打开 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 自定义高度（CSS值） */
  height?: string;
  /** 自定义类名 */
  className?: string;
}

// ============================================
// DiffPreviewDrawer 组件
// ============================================
export const DiffPreviewDrawer: React.FC<DiffPreviewDrawerProps> = ({
  entry,
  isOpen,
  onClose,
  height = '40vh',
  className
}) => {
  // 动画状态管理
  const [isVisible, setIsVisible] = useState(isOpen);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevEntryRef = useRef<DirectoryDiffEntry | null>(null);

  // 处理打开/关闭动画
  useEffect(() => {
    // 清除之前的定时器
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    if (isOpen && entry) {
      // 打开：先设置可见，然后触发打开动画
      setIsVisible(true);
      prevEntryRef.current = entry;
      // 使用 requestAnimationFrame 确保 DOM 更新后再触发动画
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else if (!isOpen && isVisible) {
      // 关闭：先触发关闭动画
      setIsAnimating(false);
      // 等待动画完成后隐藏组件
      animationTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        prevEntryRef.current = null;
      }, 300); // 与 CSS duration-300 对应
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [isOpen, entry]);

  // 处理键盘快捷键
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // 如果没有条目且不可见，不渲染
  if (!entry && !isVisible) return null;

  // 使用当前条目或之前的条目（动画期间保持显示）
  const displayEntry = entry || prevEntryRef.current;
  if (!displayEntry) return null;

  const isFile = displayEntry.type === 'file';

  return (
    <div
      className={cn(
        'diff-preview-drawer',
        'fixed inset-x-0 bottom-0 z-50',
        'bg-white dark:bg-gray-900',
        'border-t border-gray-200 dark:border-gray-700',
        'shadow-lg',
        'transition-transform duration-300 ease-in-out',
        isAnimating ? 'translate-y-0' : 'translate-y-full',
        className
      )}
      style={{ height, minHeight: '300px' }}
      onKeyDown={handleKeyDown}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {isFile ? '📄' : '📁'} {displayEntry.relativePath}
          </span>
          <span className={cn(
            'text-xs px-2 py-0.5 rounded flex-shrink-0',
            displayEntry.status === 'modified' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            displayEntry.status === 'left-only' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            displayEntry.status === 'right-only' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            displayEntry.status === 'equal' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            displayEntry.status === 'type-changed' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            displayEntry.status === 'permission-changed' && 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
          )}>
            {getStatusLabel(displayEntry.status)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* 调整高度按钮 */}
          <button
            onClick={() => {}}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
            title="调整高度"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <line x1="4" y1="8" x2="20" y2="8" />
              <line x1="4" y1="16" x2="20" y2="16" />
            </svg>
          </button>

          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
            title="关闭 (Esc)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* 内容区域 - 使用 DiffPreviewPanel */}
      <div className="h-[calc(100%-48px)]">
        <DiffPreviewPanel
          entry={displayEntry}
          className="h-full"
        />
      </div>
    </div>
  );
};

// ============================================
// 辅助函数：获取状态标签
// ============================================
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'equal': '相同',
    'modified': '已修改',
    'left-only': '仅左侧',
    'right-only': '仅右侧',
    'type-changed': '类型变更',
    'permission-changed': '权限变更'
  };
  return labels[status] || status;
}

export default DiffPreviewDrawer;
