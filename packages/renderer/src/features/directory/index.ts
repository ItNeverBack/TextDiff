/**
 * Directory Feature Module
 * 目录对比功能模块
 */

// 组件导出
export { DirectoryView } from './DirectoryView';
export { DirectoryWelcomeView } from './DirectoryWelcomeView';
export { DirectoryHeader } from './components/DirectoryHeader';
export { DirectoryTreePanel } from './components/DirectoryTreePanel';
export { TreeNode } from './components/TreeNode';
export { FileIcon, StatusIcon } from './components/FileIcon';
export { FilterBar } from './components/FilterBar';
export { ActionToolbar } from './components/ActionToolbar';
export { DirectoryStats } from './components/DirectoryStats';
export { DiffPreviewDrawer } from './components/DiffPreviewDrawer';
export { DiffPreviewPanel } from './components/DiffPreviewPanel';
export { ContextMenu } from './components/ContextMenu';
export { SyncConfirmDialog } from './components/SyncConfirmDialog';
export { SyncProgressView } from './components/SyncProgress';
export { ExportDialog } from './components/ExportDialog';

// Hooks 导出
export { useDirectoryCompare, useDirectoryEntry, useDirectoryStats, useDirectoryNavigation, useDirectorySearch } from '@renderer/hooks/useDirectoryCompare';
export { useTreeExpand, useTreeSelection, useTreeVisibility, useTreeOperations } from '@renderer/hooks/useTreeExpand';
export { useDirectoryShortcuts } from './hooks/useDirectoryShortcuts';

// 类型导出
export type { DirectoryViewProps } from './DirectoryView';
export type { DirectoryHeaderProps } from './components/DirectoryHeader';
export type { DirectoryTreePanelProps } from './components/DirectoryTreePanel';
export type { TreeNodeProps } from './components/TreeNode';
export type { FileIconProps, StatusIconProps } from './components/FileIcon';
export type { FilterBarProps } from './components/FilterBar';
export type { ActionToolbarProps } from './components/ActionToolbar';
export type { DirectoryStatsProps } from './components/DirectoryStats';
export type { DiffPreviewDrawerProps } from './components/DiffPreviewDrawer';
export type { DiffPreviewPanelProps } from './components/DiffPreviewPanel';
export type { ContextMenuProps } from './components/ContextMenu';
export type { SyncConfirmDialogProps } from './components/SyncConfirmDialog';
export type { SyncProgressProps } from './components/SyncProgress';
export type { ExportDialogProps } from './components/ExportDialog';

// 导入样式（需要在应用入口导入）
// import './styles/directory.css';