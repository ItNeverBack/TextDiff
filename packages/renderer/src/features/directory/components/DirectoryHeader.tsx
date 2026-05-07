/**
 * DirectoryHeader 组件
 * 目录对比头部组件
 */
import React from 'react';
import { cn } from '@renderer/lib/utils';
import type { DirectoryInfo } from '@shared/types/directory.types';

// ============================================
// 组件属性
// ============================================
export interface DirectoryHeaderProps {
  leftRoot?: DirectoryInfo;
  rightRoot?: DirectoryInfo;
  onBack?: () => void;
  onSettings?: () => void;
  onHelp?: () => void;
  className?: string;
}

// ============================================
// DirectoryHeader 组件
// ============================================
export const DirectoryHeader: React.FC<DirectoryHeaderProps> = ({
  leftRoot,
  rightRoot,
  onBack,
  onSettings,
  onHelp,
  className
}) => {
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div
      className={cn(
        'directory-header',
        'flex items-center justify-between',
        'px-4 py-3',
        'bg-white dark:bg-gray-900',
        'border-b border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* 左侧：返回按钮和标题 */}
      <div className="flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className={cn(
              'flex items-center gap-1.5',
              'px-3 py-1.5 rounded-md',
              'text-sm font-medium text-gray-700 dark:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'transition-colors'
            )}
            title="返回"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>返回</span>
          </button>
        )}

        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            目录对比
          </span>

          {(leftRoot || rightRoot) && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              {leftRoot && (
                <div className="flex items-center gap-1.5"
                  title={`${leftRoot.path}\n文件数: ${leftRoot.totalFiles}\n大小: ${formatSize(leftRoot.totalSize)}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className="text-yellow-500"
                  >
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  <span className="truncate max-w-[150px]">
                    {leftRoot.name}
                  </span>
                </div>
              )}

              <span className="text-gray-400">vs</span>

              {rightRoot && (
                <div className="flex items-center gap-1.5"
                  title={`${rightRoot.path}\n文件数: ${rightRoot.totalFiles}\n大小: ${formatSize(rightRoot.totalSize)}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className="text-yellow-500"
                  >
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  <span className="truncate max-w-[150px]">
                    {rightRoot.name}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-2">
        {onSettings && (
          <button
            onClick={onSettings}
            className={cn(
              'p-2 rounded-md',
              'text-gray-500 dark:text-gray-400',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'transition-colors'
            )}
            title="设置"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        )}

        {onHelp && (
          <button
            onClick={onHelp}
            className={cn(
              'p-2 rounded-md',
              'text-gray-500 dark:text-gray-400',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'transition-colors'
            )}
            title="帮助"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default DirectoryHeader;
