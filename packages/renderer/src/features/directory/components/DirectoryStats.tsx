/**
 * DirectoryStats 组件
 * 目录对比统计面板
 */
import React from 'react';
import { cn } from '@renderer/lib/utils';
import type { DirDiffStatistics, DirectoryInfo } from '@shared/types/directory.types';

// ============================================
// 组件属性
// ============================================
export interface DirectoryStatsProps {
  stats?: DirDiffStatistics;
  leftRoot?: DirectoryInfo;
  rightRoot?: DirectoryInfo;
  visibleStats?: {
    total: number;
    modified: number;
    leftOnly: number;
    rightOnly: number;
    equal: number;
  };
  hiddenCount?: number;
  className?: string;
}

// ============================================
// DirectoryStats 组件
// ============================================
export const DirectoryStats: React.FC<DirectoryStatsProps> = ({
  stats,
  leftRoot,
  rightRoot,
  visibleStats,
  hiddenCount = 0,
  className
}) => {
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // 计算总文件数（使用原始 DirectoryInfo 数据，而不是过滤后的）
  const totalFiles = leftRoot && rightRoot
    ? leftRoot.totalFiles + rightRoot.totalFiles
    : (visibleStats?.total ?? stats?.totalFiles ?? 0);

  // 计算总大小（使用原始 DirectoryInfo 数据）
  const totalSizeLeft = leftRoot?.totalSize ?? stats?.totalSizeLeft ?? 0;
  const totalSizeRight = rightRoot?.totalSize ?? stats?.totalSizeRight ?? 0;

  const statItems = [
    {
      label: '总文件',
      value: totalFiles,
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-100 dark:bg-gray-800'
    },
    {
      label: '相同',
      value: visibleStats?.equal ?? stats?.equal ?? 0,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      label: '修改',
      value: visibleStats?.modified ?? stats?.modified ?? 0,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20'
    },
    {
      label: '仅左侧',
      value: visibleStats?.leftOnly ?? stats?.leftOnly ?? 0,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      label: '仅右侧',
      value: visibleStats?.rightOnly ?? stats?.rightOnly ?? 0,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20'
    }
  ];

  return (
    <div
      className={cn(
        'directory-stats',
        'flex flex-wrap items-center gap-3',
        'px-4 py-3',
        'bg-gray-50 dark:bg-gray-800/50',
        'border-b border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* 统计卡片 */}
      <div className="flex flex-wrap items-center gap-2">
        {statItems.map((item) => (
          <div
            key={item.label}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg',
              item.bgColor
            )}
          >
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {item.label}
            </span>
            <span className={cn('text-sm font-semibold', item.color)}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex-1" />

      {/* 额外信息 */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        {stats?.totalDirectories !== undefined && (
          <span>
            {stats.totalDirectories} 个目录
          </span>
        )}

        {hiddenCount > 0 && (
          <span className="text-gray-400">
            已隐藏: {hiddenCount}
          </span>
        )}

        {(totalSizeLeft > 0 || totalSizeRight > 0) && (
          <span title={`左侧: ${formatSize(totalSizeLeft)}\n右侧: ${formatSize(totalSizeRight)}`}>
            大小: {formatSize(totalSizeLeft)} / {formatSize(totalSizeRight)}
          </span>
        )}

        {stats?.duration !== undefined && (
          <span>
            耗时: {formatDuration(stats.duration)}
          </span>
        )}

        {stats?.scannedAt && (
          <span className="hidden sm:inline">
            扫描于: {new Date(stats.scannedAt).toLocaleTimeString('zh-CN')}
          </span>
        )}
      </div>
    </div>
  );
};

export default DirectoryStats;
