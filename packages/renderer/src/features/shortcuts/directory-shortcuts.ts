import { useCallback, useEffect } from 'react'
import { useDirectoryStore } from '../../stores/directory.store'

/**
 * 目录对比专用快捷键 Hook
 *
 * 支持的快捷键:
 * - Ctrl/Cmd + Shift + D: 打开目录对比
 * - ↑/↓: 导航条目
 * - ←/→: 展开/折叠目录
 * - Enter: 查看差异
 * - Space: 快速预览
 * - F5: 刷新对比
 * - Delete: 删除文件 (需要确认)
 * - Ctrl/Cmd + C: 复制路径
 */

export interface DirectoryShortcutsOptions {
  onOpenDirectoryDiff?: () => void
  onNavigateUp?: () => void
  onNavigateDown?: () => void
  onExpandCollapse?: () => void
  onViewDiff?: () => void
  onQuickPreview?: () => void
  onRefresh?: () => void
  onDelete?: () => void
  onCopyPath?: () => void
}

export function useDirectoryShortcuts(options: DirectoryShortcutsOptions = {}) {
  const {
    selectedEntry,
    toggleExpand,
    setSelectedEntry,
    entries,
    expandedPaths,
    compareDirectories
  } = useDirectoryStore()

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 如果正在输入框中，不处理快捷键
    const target = event.target as HTMLElement
    const isInputElement = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
    if (isInputElement && event.key !== 'Escape') {
      return
    }

    const key = []
    if (event.ctrlKey || event.metaKey) key.push('Ctrl')
    if (event.altKey) key.push('Alt')
    if (event.shiftKey) key.push('Shift')
    key.push(event.key)

    const shortcut = key.join('+')

    switch (shortcut) {
      case 'Ctrl+Shift+D':
        event.preventDefault()
        options.onOpenDirectoryDiff?.()
        break

      case 'ArrowUp':
        event.preventDefault()
        options.onNavigateUp?.()
        break

      case 'ArrowDown':
        event.preventDefault()
        options.onNavigateDown?.()
        break

      case 'ArrowLeft':
      case 'ArrowRight':
        event.preventDefault()
        if (selectedEntry && selectedEntry.type === 'directory') {
          toggleExpand(selectedEntry.relativePath)
        }
        options.onExpandCollapse?.()
        break

      case 'Enter':
        event.preventDefault()
        options.onViewDiff?.()
        break

      case ' ':
        event.preventDefault()
        options.onQuickPreview?.()
        break

      case 'F5':
        event.preventDefault()
        options.onRefresh?.()
        break

      case 'Delete':
        event.preventDefault()
        options.onDelete?.()
        break

      case 'Ctrl+C':
        // 只在选中条目时处理
        if (selectedEntry) {
          event.preventDefault()
          options.onCopyPath?.()
        }
        break
    }
  }, [
    options,
    selectedEntry,
    toggleExpand
  ])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

/**
 * 目录导航辅助函数
 */
export function useDirectoryNavigation() {
  const { entries, selectedEntry, setSelectedEntry, expandedPaths } = useDirectoryStore()

  const getVisibleEntries = useCallback(() => {
    const visible: typeof entries = []

    const traverse = (entryList: typeof entries, depth = 0) => {
      for (const entry of entryList) {
        visible.push(entry)
        if (entry.type === 'directory' && expandedPaths.has(entry.relativePath) && entry.children) {
          traverse(entry.children, depth + 1)
        }
      }
    }

    traverse(entries)
    return visible
  }, [entries, expandedPaths])

  const navigateUp = useCallback(() => {
    const visible = getVisibleEntries()
    if (!selectedEntry) {
      if (visible.length > 0) {
        setSelectedEntry(visible[0])
      }
      return
    }

    const currentIndex = visible.findIndex(e => e.id === selectedEntry.id)
    if (currentIndex > 0) {
      setSelectedEntry(visible[currentIndex - 1])
    }
  }, [getVisibleEntries, selectedEntry, setSelectedEntry])

  const navigateDown = useCallback(() => {
    const visible = getVisibleEntries()
    if (!selectedEntry) {
      if (visible.length > 0) {
        setSelectedEntry(visible[0])
      }
      return
    }

    const currentIndex = visible.findIndex(e => e.id === selectedEntry.id)
    if (currentIndex < visible.length - 1) {
      setSelectedEntry(visible[currentIndex + 1])
    }
  }, [getVisibleEntries, selectedEntry, setSelectedEntry])

  return {
    navigateUp,
    navigateDown,
    getVisibleEntries
  }
}

/**
 * 目录对比快捷键常量定义
 */
export const DIRECTORY_SHORTCUTS = [
  { key: 'Ctrl+Shift+D', action: 'openDirectoryDiff', description: '打开目录对比' },
  { key: 'ArrowUp', action: 'navigateUp', description: '向上导航' },
  { key: 'ArrowDown', action: 'navigateDown', description: '向下导航' },
  { key: 'ArrowLeft', action: 'collapse', description: '折叠目录' },
  { key: 'ArrowRight', action: 'expand', description: '展开目录' },
  { key: 'Enter', action: 'viewDiff', description: '查看差异' },
  { key: 'Space', action: 'quickPreview', description: '快速预览' },
  { key: 'F5', action: 'refresh', description: '刷新对比' },
  { key: 'Delete', action: 'delete', description: '删除文件' },
  { key: 'Ctrl+C', action: 'copyPath', description: '复制路径' }
] as const

export type DirectoryShortcutAction = typeof DIRECTORY_SHORTCUTS[number]['action']
