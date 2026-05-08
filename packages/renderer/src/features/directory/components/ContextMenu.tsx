/**
 * ContextMenu 组件
 * 目录树右键菜单
 */
import React, { useEffect, useRef } from 'react';
import { cn } from '@renderer/lib/utils';
import type { DirectoryDiffEntry } from '@shared/types/directory.types';

// ============================================
// 菜单项类型
// ============================================
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
  divider?: boolean;
  danger?: boolean;
}

// ============================================
// 组件属性
// ============================================
export interface ContextMenuProps {
  entry: DirectoryDiffEntry | null;
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  onViewDiff?: (entry: DirectoryDiffEntry) => void;
  onEditFile?: (entry: DirectoryDiffEntry) => void;
  onCopyToOtherSide?: (entry: DirectoryDiffEntry) => void;
  onDeleteFile?: (entry: DirectoryDiffEntry) => void;
  onCopyPath?: (entry: DirectoryDiffEntry) => void;
  onShowInExplorer?: (entry: DirectoryDiffEntry) => void;
  onIgnoreFile?: (entry: DirectoryDiffEntry) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onSyncDirectory?: (entry: DirectoryDiffEntry) => void;
}

// ============================================
// ContextMenu 组件
// ============================================
export const ContextMenu: React.FC<ContextMenuProps> = ({
  entry,
  x,
  y,
  isOpen,
  onClose,
  onViewDiff,
  onEditFile,
  onCopyToOtherSide,
  onDeleteFile,
  onCopyPath,
  onShowInExplorer,
  onIgnoreFile,
  onExpandAll,
  onCollapseAll,
  onSyncDirectory
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !entry) return null;

  const isFile = entry.type === 'file';
  const isDirectory = entry.type === 'directory';
  const hasDiff = entry.status !== 'equal';

  // 构建菜单项
  const buildMenuItems = (): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    if (isFile) {
      // 文件菜单
      items.push({
        id: 'view-diff',
        label: '查看差异',
        icon: <DiffIcon />,
        shortcut: 'Enter',
        action: () => {
          onViewDiff?.(entry);
          onClose();
        },
        disabled: !hasDiff
      });

      items.push({
        id: 'edit',
        label: '编辑文件',
        icon: <EditIcon />,
        action: () => {
          onEditFile?.(entry);
          onClose();
        }
      });

      items.push({ id: 'divider1', label: '', divider: true, action: () => {} });

      if (hasDiff) {
        items.push({
          id: 'copy-to-other',
          label: entry.status === 'left-only' ? '复制到右侧' : '复制到左侧',
          icon: <CopyIcon />,
          action: () => {
            onCopyToOtherSide?.(entry);
            onClose();
          }
        });
      }

      items.push({
        id: 'delete',
        label: '删除',
        icon: <DeleteIcon />,
        shortcut: 'Del',
        action: () => {
          onDeleteFile?.(entry);
          onClose();
        },
        danger: true
      });

      items.push({ id: 'divider2', label: '', divider: true, action: () => {} });

      items.push({
        id: 'copy-path',
        label: '复制路径',
        icon: <LinkIcon />,
        shortcut: 'Ctrl+C',
        action: () => {
          onCopyPath?.(entry);
          onClose();
        }
      });

      items.push({
        id: 'show-in-explorer',
        label: '在资源管理器中显示',
        icon: <FolderIcon />,
        action: () => {
          onShowInExplorer?.(entry);
          onClose();
        }
      });

      items.push({
        id: 'ignore',
        label: '忽略此文件',
        icon: <IgnoreIcon />,
        action: () => {
          onIgnoreFile?.(entry);
          onClose();
        }
      });
    } else if (isDirectory) {
      // 目录菜单
      items.push({
        id: 'expand-all',
        label: '展开全部',
        icon: <ExpandIcon />,
        action: () => {
          onExpandAll?.();
          onClose();
        }
      });

      items.push({
        id: 'collapse-all',
        label: '折叠全部',
        icon: <CollapseIcon />,
        action: () => {
          onCollapseAll?.();
          onClose();
        }
      });

      items.push({ id: 'divider1', label: '', divider: true, action: () => {} });

      items.push({
        id: 'sync-dir',
        label: '同步此目录',
        icon: <SyncIcon />,
        action: () => {
          onSyncDirectory?.(entry);
          onClose();
        }
      });

      items.push({
        id: 'copy-path',
        label: '复制路径',
        icon: <LinkIcon />,
        action: () => {
          onCopyPath?.(entry);
          onClose();
        }
      });
    }

    return items;
  };

  const menuItems = buildMenuItems();

  // 计算菜单位置，确保不超出屏幕
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 1000
  };

  return (
    <div
      ref={menuRef}
      className={cn(
        'context-menu',
        'bg-white dark:bg-gray-800',
        'rounded-lg shadow-lg',
        'border border-gray-200 dark:border-gray-700',
        'py-1 min-w-[180px]'
      )}
      style={menuStyle}
    >
      {menuItems.map((item) => {
        if (item.divider) {
          return (
            <div
              key={item.id}
              className="my-1 border-t border-gray-200 dark:border-gray-700"
            />
          );
        }

        return (
          <button
            key={item.id}
            onClick={item.action}
            disabled={item.disabled}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 text-sm',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              item.danger && 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
              !item.danger && 'text-gray-700 dark:text-gray-300',
              'transition-colors'
            )}
          >
            <span className="flex items-center gap-2">
              {item.icon && <span className="w-4 h-4">{item.icon}</span>}
              {item.label}
            </span>
            {item.shortcut && (
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-4">
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

// ============================================
// 图标组件
// ============================================
const DiffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M8 12h8" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const DeleteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const LinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const FolderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const IgnoreIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);

const ExpandIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 14h6v6M4 10h6V4M14 10h6V4M14 14h6v6" />
  </svg>
);

const CollapseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 14h6M4 10h6V4M14 14h6v6M14 10h6V4" />
  </svg>
);

const SyncIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

export default ContextMenu;