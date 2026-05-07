/**
 * TreeNode 组件
 * 目录树中的单个节点
 */
import React, { memo, useCallback, MouseEvent } from 'react';
import { cn } from '@renderer/lib/utils';
import { FileIcon, StatusIcon } from './FileIcon';
import type { DirectoryDiffEntry, DiffStatus } from '@shared/types/directory.types';
import { STATUS_COLORS, STATUS_DETAILS } from '@shared/types/directory.types';

// ============================================
// 组件属性
// ============================================
export interface TreeNodeProps {
  entry: DirectoryDiffEntry;
  side: 'left' | 'right';
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onDoubleClick?: () => void;
  onContextMenu?: (e: MouseEvent) => void;
  showSize?: boolean;
  showDate?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// ============================================
// TreeNode 组件
// ============================================
export const TreeNode: React.FC<TreeNodeProps> = memo(({
  entry,
  side,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onDoubleClick,
  onContextMenu,
  showSize = false,
  showDate = false,
  className,
  style
}) => {
  const isDirectory = entry.type === 'directory';
  const hasChildren = isDirectory && entry.children && entry.children.length > 0;

  // 获取状态信息
  const statusInfo = STATUS_DETAILS[entry.status];
  const statusColor = STATUS_COLORS[entry.status];

  // 获取文件元数据
  const metadata = side === 'left' ? entry.leftMetadata : entry.rightMetadata;

  // 点击展开/折叠按钮
  const handleToggleClick = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    onToggle();
  }, [onToggle]);

  // 格式化文件大小
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化日期
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      className={cn(
        'tree-node',
        'flex items-center gap-1 px-2 py-1 rounded cursor-pointer select-none',
        'transition-colors duration-150',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        isSelected && 'bg-blue-100 dark:bg-blue-900/30',
        className
      )}
      style={{
        ...style,
        paddingLeft: `${entry.depth * 16 + 8}px`
      }}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      data-status={entry.status}
      data-type={entry.type}
      data-selected={isSelected}
    >
      {/* 展开/折叠按钮 */}
      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
        {isDirectory && hasChildren ? (
          <button
            onClick={handleToggleClick}
            className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            aria-label={isExpanded ? '折叠' : '展开'}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s ease'
              }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ) : (
          <span className="w-4" />
        )}
      </div>

      {/* 文件/目录图标 */}
      <FileIcon
        type={entry.type}
        name={entry.name}
        isExpanded={isExpanded}
        size="md"
        className="flex-shrink-0"
      />

      {/* 文件名 */}
      <span
        className={cn(
          'flex-1 truncate text-sm',
          'text-gray-900 dark:text-gray-100',
          entry.status !== 'equal' && 'font-medium'
        )}
        title={entry.relativePath}
      >
        {entry.name}
      </span>

      {/* 文件大小 */}
      {showSize && metadata?.size !== undefined && (
        <span className="text-xs text-gray-500 dark:text-gray-400 w-20 text-right flex-shrink-0">
          {formatSize(metadata.size)}
        </span>
      )}

      {/* 修改日期 */}
      {showDate && metadata?.modifiedTime && (
        <span className="text-xs text-gray-500 dark:text-gray-400 w-28 text-right flex-shrink-0 hidden lg:block">
          {formatDate(metadata.modifiedTime)}
        </span>
      )}

      {/* 状态图标 */}
      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
        <StatusIcon
          status={entry.status}
          size="sm"
          color={statusColor.color}
        />

        {/* 状态标签（仅在有差异时显示） */}
        {entry.status !== 'equal' && (
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded font-medium',
              'hidden sm:inline-block'
            )}
            style={{
              backgroundColor: statusColor.bgColor,
              color: statusColor.color
            }}
          >
            {statusInfo.label}
          </span>
        )}
      </div>
    </div>
  );
});

TreeNode.displayName = 'TreeNode';

// ============================================
// TreeNodePlaceholder 组件
// 用于虚拟滚动的占位符
// ============================================
export interface TreeNodePlaceholderProps {
  height: number;
  depth?: number;
  className?: string;
}

export const TreeNodePlaceholder: React.FC<TreeNodePlaceholderProps> = ({
  height,
  depth = 0,
  className
}) => {
  return (
    <div
      className={cn(
        'tree-node-placeholder',
        'flex items-center gap-1 px-2 py-1',
        'bg-gray-50 dark:bg-gray-800/50',
        'animate-pulse',
        className
      )}
      style={{
        height,
        paddingLeft: `${depth * 16 + 8}px`
      }}
    >
      <div className="w-4 h-4 flex-shrink-0" />
      <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0" />
      <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded max-w-[200px]" />
    </div>
  );
};

// ============================================
// TreeNodeEmpty 组件
// 空状态显示
// ============================================
export interface TreeNodeEmptyProps {
  message?: string;
  className?: string;
}

export const TreeNodeEmpty: React.FC<TreeNodeEmptyProps> = ({
  message = '没有可显示的内容',
  className
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-8',
        'text-gray-500 dark:text-gray-400',
        className
      )}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="mb-3 opacity-50"
      >
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
      <span className="text-sm">{message}</span>
    </div>
  );
};

// ============================================
// TreeNodeLoading 组件
// 加载状态
// ============================================
export interface TreeNodeLoadingProps {
  className?: string;
}

export const TreeNodeLoading: React.FC<TreeNodeLoadingProps> = ({ className }) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-8',
        'text-gray-500 dark:text-gray-400',
        className
      )}
    >
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3" />
      <span className="text-sm">加载中...</span>
    </div>
  );
};

// ============================================
// TreeNodeError 组件
// 错误状态
// ============================================
export interface TreeNodeErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const TreeNodeError: React.FC<TreeNodeErrorProps> = ({
  message,
  onRetry,
  className
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-8',
        'text-red-500 dark:text-red-400',
        className
      )}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="mb-3"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span className="text-sm mb-3 text-center px-4">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className={cn(
            'px-4 py-2 text-sm rounded',
            'bg-red-500 text-white',
            'hover:bg-red-600 transition-colors'
          )}
        >
          重试
        </button>
      )}
    </div>
  );
};

export default TreeNode;
