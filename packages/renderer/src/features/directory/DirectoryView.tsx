/**
 * DirectoryView 组件
 * 目录对比主视图
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@renderer/lib/utils';
import { useDirectoryCompare } from '@renderer/hooks/useDirectoryCompare';
import { useDirectoryStats } from '@renderer/hooks/useDirectoryCompare';
import { useTreeExpand } from '@renderer/hooks/useTreeExpand';
import { useDirectoryShortcuts } from './hooks/useDirectoryShortcuts';
import { DirectoryWelcomeView } from './DirectoryWelcomeView';
import { useTabStore } from '@renderer/stores/tab.store';
import { useDirectoryCompareStore } from '@renderer/stores/directory.store';

// 子组件
import { DirectoryHeader } from './components/DirectoryHeader';
import { FilterBar } from './components/FilterBar';
import { ActionToolbar } from './components/ActionToolbar';
import { DirectoryStats } from './components/DirectoryStats';
import { DirectoryTreePanel } from './components/DirectoryTreePanel';
import { DiffPreviewDrawer } from './components/DiffPreviewDrawer';
import { ContextMenu } from './components/ContextMenu';
import { ExportDialog } from './components/ExportDialog';
import { SyncConfirmDialog } from './components/SyncConfirmDialog';
import { SyncProgressView } from './components/SyncProgress';

// 样式
import './styles/directory.css';
import type { DirectoryDiffEntry, ReportFormat, ReportOptions, SyncPlan, SyncProgress, SyncStrategy } from '@shared/types';

// ============================================
// 组件属性
// ============================================
export interface DirectoryViewProps {
  className?: string;
}

// ============================================
// DirectoryView 组件
// ============================================
export const DirectoryView: React.FC<DirectoryViewProps> = ({ className }) => {
  // 目录对比状态
  const {
    comparison,
    isLoading,
    filteredEntries,
    compare,
    refresh,
    clear,
    selectEntry,
    viewMode,
    setViewMode,
    hiddenCount,
    selectedEntry
  } = useDirectoryCompare();

  // Tab 操作
  const { addTabWithFiles, activeIndex, updateTab } = useTabStore();
  const { expandedPaths } = useDirectoryCompareStore();

  // 将目录对比状态保存到当前 tab
  useEffect(() => {
    if (comparison) {
      updateTab(activeIndex, {
        directoryComparison: comparison,
        leftDirectory: comparison.leftRoot,
        rightDirectory: comparison.rightRoot,
        isDirectoryView: true,
        dirViewMode: viewMode,
        expandedPaths: Array.from(expandedPaths)
      });
    }
  }, [comparison, viewMode, expandedPaths, activeIndex, updateTab]);

  // 统计信息
  const stats = useDirectoryStats();

  // 树形展开操作
  const {
    expandAll,
    collapseAll,
    expandToDiffs
  } = useTreeExpand();

  // 差异预览抽屉状态
  const [showPreview, setShowPreview] = useState(false);
  const [previewEntry, setPreviewEntry] = useState<DirectoryDiffEntry | null>(null);

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    entry: DirectoryDiffEntry | null;
  }>({ isOpen: false, x: 0, y: 0, entry: null });

  // 导出对话框状态
  const [showExportDialog, setShowExportDialog] = useState(false);

  // 同步对话框状态
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [syncPlan, setSyncPlan] = useState<SyncPlan | null>(null);
  const [syncStrategy, setSyncStrategy] = useState<SyncStrategy>('left-to-right');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);

  // 处理视图模式切换
  const handleViewModeChange = useCallback((mode: typeof viewMode) => {
    setViewMode(mode);
  }, [setViewMode]);

  // 处理刷新
  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  // 处理展开到差异项
  const handleExpandToDiffs = useCallback(() => {
    if (comparison) {
      expandToDiffs(comparison.entries);
    }
  }, [comparison, expandToDiffs]);

  // 处理同步 - 打开同步确认对话框
  const handleSync = useCallback(async () => {
    if (!comparison) return;

    // 默认使用 left-to-right 策略
    const strategy: SyncStrategy = 'left-to-right';
    setSyncStrategy(strategy);

    try {
      // 生成同步计划
      const plan = await window.api.sync.generatePlan(filteredEntries, strategy);
      setSyncPlan(plan);
      setShowSyncDialog(true);
    } catch (err) {
      console.error('生成同步计划失败:', err);
      alert('生成同步计划失败: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [comparison, filteredEntries]);

  // 执行同步
  const handleExecuteSync = useCallback(async (options: {
    createBackup: boolean;
    confirmOverwrite: boolean;
    preservePermissions: boolean;
  }) => {
    if (!syncPlan) return;

    setShowSyncDialog(false);
    setIsSyncing(true);
    setSyncProgress(null);

    try {
      // 设置同步进度监听
      const unsubscribe = window.api.onSyncProgress((progress: SyncProgress & { syncId: string }) => {
        setSyncProgress(progress);
      });

      // 执行同步
      const result = await window.api.sync.execute(syncPlan, {
        strategy: syncStrategy,
        createBackup: options.createBackup,
        confirmOverwrite: options.confirmOverwrite,
        preservePermissions: options.preservePermissions
      });

      unsubscribe();

      // 同步完成后刷新
      if (result.success) {
        setTimeout(() => {
          setIsSyncing(false);
          refresh();
        }, 1000);
      } else {
        setIsSyncing(false);
        alert('同步完成，但有部分操作失败');
      }
    } catch (err) {
      console.error('同步失败:', err);
      setIsSyncing(false);
      alert('同步失败: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [syncPlan, syncStrategy, refresh]);

  // 取消同步
  const handleCancelSync = useCallback(() => {
    setShowSyncDialog(false);
    setSyncPlan(null);
  }, []);

  // 处理导出 - 打开导出对话框
  const handleExport = useCallback(() => {
    if (!comparison) return;
    setShowExportDialog(true);
  }, [comparison]);

  // 执行导出
  const handleExecuteExport = useCallback(async (_format: ReportFormat, options: ReportOptions) => {
    if (!comparison) return;

    try {
      const result = await window.api.report.generateAndSave(comparison, options);
      if (result.success) {
        setShowExportDialog(false);
        alert(`报告已保存到: ${result.filePath}`);
      } else {
        if (result.error) {
          alert('导出失败: ' + result.error);
        }
      }
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [comparison]);

  // 处理关闭预览
  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
    setPreviewEntry(null);
  }, []);

  // 处理右键菜单
  const handleContextMenu = useCallback((entry: DirectoryDiffEntry, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      entry
    });
  }, []);

  // 关闭右键菜单
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  }, []);

  // 处理复制路径
  const handleCopyPath = useCallback((entry: DirectoryDiffEntry) => {
    const path = entry.leftPath || entry.rightPath;
    if (path) {
      navigator.clipboard.writeText(path);
    }
  }, []);

  // 处理在资源管理器中显示
  const handleShowInExplorer = useCallback((entry: DirectoryDiffEntry) => {
    const path = entry.leftPath || entry.rightPath;
    if (path) {
      // 使用 Electron 的 shell 模块打开
      window.api.showOpenDialog({
        title: '在资源管理器中显示',
        defaultPath: path,
        properties: ['openDirectory']
      }).catch(console.error);
    }
  }, []);

  // 聚焦搜索框
  const handleFocusSearch = useCallback(() => {
    // 通过 FilterBar 组件的 ref 聚焦
    const searchInput = document.querySelector('.filter-bar input[type="text"]') as HTMLInputElement;
    searchInput?.focus();
    searchInput?.select();
  }, []);

  // 注册快捷键
  useDirectoryShortcuts({
    isActive: !!comparison,
    hasSelection: !!selectedEntry,
    isDirectorySelected: selectedEntry?.type === 'directory',
    onNavigateUp: () => {}, // TreePanel 内部处理
    onNavigateDown: () => {},
    onNavigateLeft: () => {},
    onNavigateRight: () => {},
    onExpandAll: expandAll,
    onCollapseAll: collapseAll,
    onExpandToDiffs: handleExpandToDiffs,
    onViewDiff: () => selectedEntry && handleEntryDoubleClick(selectedEntry),
    onQuickPreview: () => selectedEntry && handleEntryDoubleClick(selectedEntry),
    onRefresh: handleRefresh,
    onCopyPath: () => selectedEntry && handleCopyPath(selectedEntry),
    onFocusSearch: handleFocusSearch,
    onViewModeAll: () => setViewMode('all'),
    onViewModeDiffOnly: () => setViewMode('diff-only'),
    onViewModeLeftOnly: () => setViewMode('left-only'),
    onViewModeRightOnly: () => setViewMode('right-only'),
    onCloseOverlay: () => {
      handleClosePreview();
      handleCloseContextMenu();
    }
  });



  // 处理条目选择
  const handleEntrySelect = useCallback((entry: typeof filteredEntries[0]) => {
    selectEntry(entry);
  }, [selectEntry]);

  // 处理条目双击 - 在新 Tab 中打开文件对比
  const handleEntryDoubleClick = useCallback(async (entry: typeof filteredEntries[0]) => {
    if (entry.type !== 'file' || entry.status !== 'modified') return;
    if (!entry.leftPath || !entry.rightPath) return;

    try {
      const [leftFile, rightFile] = await Promise.all([
        window.api.readFile(entry.leftPath),
        window.api.readFile(entry.rightPath)
      ]);
      if (leftFile && rightFile) {
        addTabWithFiles(leftFile, rightFile);
      }
    } catch (err) {
      console.error('打开文件对比失败:', err);
    }
  }, [addTabWithFiles]);

  // 是否有差异
  const hasDifferences = useMemo(() => {
    if (!comparison) return false;
    return comparison.statistics.modified > 0 ||
           comparison.statistics.leftOnly > 0 ||
           comparison.statistics.rightOnly > 0;
  }, [comparison]);

  // 如果没有对比数据，显示欢迎页面
  if (!comparison && !isLoading) {
    return (
      <DirectoryWelcomeView
        onCompare={(leftDir, rightDir) => {
          // 先更新当前 Tab 的目录信息，标记为目录视图
          updateTab(activeIndex, {
            isDirectoryView: true,
            leftDirectory: leftDir,
            rightDirectory: rightDir,
            title: `${leftDir.name} vs ${rightDir.name}`
          });
          // 然后启动对比
          compare(leftDir.path, rightDir.path);
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        'directory-view',
        'flex flex-col h-full overflow-hidden',
        'bg-white dark:bg-gray-900',
        className
      )}
    >
      {/* 头部 */}
      <DirectoryHeader
        leftRoot={comparison?.leftRoot}
        rightRoot={comparison?.rightRoot}
        onBack={clear}
      />

      {/* 过滤器栏 */}
      <FilterBar
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
      />

      {/* 操作工具栏 */}
      <ActionToolbar
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        onExpandToDiffs={handleExpandToDiffs}
        onSync={handleSync}
        onExport={handleExport}
        canSync={hasDifferences}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />

      {/* 统计面板 */}
      {comparison && (
        <DirectoryStats
          stats={comparison.statistics}
          leftRoot={comparison.leftRoot}
          rightRoot={comparison.rightRoot}
          visibleStats={{
            total: stats.visibleTotal,
            modified: stats.visibleModified,
            leftOnly: stats.visibleLeftOnly,
            rightOnly: stats.visibleRightOnly,
            equal: stats.visibleEqual
          }}
          hiddenCount={hiddenCount}
        />
      )}

      {/* 目录树对比区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧目录树 */}
        <DirectoryTreePanel
          side="left"
          entries={filteredEntries}
          rootPath={comparison?.leftRoot.path}
          onEntrySelect={handleEntrySelect}
          onEntryDoubleClick={handleEntryDoubleClick}
          onContextMenu={handleContextMenu}
          className="flex-1"
        />

        {/* 右侧目录树 */}
        <DirectoryTreePanel
          side="right"
          entries={filteredEntries}
          rootPath={comparison?.rightRoot.path}
          onEntrySelect={handleEntrySelect}
          onEntryDoubleClick={handleEntryDoubleClick}
          onContextMenu={handleContextMenu}
          className="flex-1"
        />
      </div>

      {/* 差异预览抽屉 */}
      <DiffPreviewDrawer
        entry={previewEntry}
        isOpen={showPreview}
        onClose={handleClosePreview}
      />

      {/* 右键菜单 */}
      <ContextMenu
        entry={contextMenu.entry}
        x={contextMenu.x}
        y={contextMenu.y}
        isOpen={contextMenu.isOpen}
        onClose={handleCloseContextMenu}
        onViewDiff={handleEntryDoubleClick}
        onCopyPath={handleCopyPath}
        onShowInExplorer={handleShowInExplorer}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />

      {/* 导出对话框 */}
      <ExportDialog
        isOpen={showExportDialog}
        comparison={comparison}
        onClose={() => setShowExportDialog(false)}
        onExport={handleExecuteExport}
      />

      {/* 同步确认对话框 */}
      <SyncConfirmDialog
        isOpen={showSyncDialog}
        plan={syncPlan}
        strategy={syncStrategy}
        onClose={handleCancelSync}
        onConfirm={handleExecuteSync}
        onCancel={handleCancelSync}
      />

      {/* 同步进度显示 */}
      <SyncProgressView
        progress={syncProgress}
        isVisible={isSyncing}
        onCancel={() => {
          // 取消同步逻辑
          setIsSyncing(false);
        }}
      />
    </div>
  );
};

export default DirectoryView;
