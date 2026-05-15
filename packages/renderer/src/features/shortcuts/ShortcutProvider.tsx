import { useCallback, useEffect, useMemo, useRef } from 'react'
import { SHORTCUTS } from '@shared/constants'
import type { ShortcutDefinition } from '@shared/constants'
import { useDiffStore, useTabStore, useSessionStore, useSettingsStore } from '../../stores'
import { useTheme } from '../theme'
import { api } from '../../lib/api'

type ShortcutHandler = () => void

export interface ShortcutConflict {
  key: string
  actions: string[]
}

export interface ShortcutProviderProps {
  children: React.ReactNode
  onPasteDialog?: () => void
  onShowSearch?: () => void
  onShowSettings?: () => void
  onShowSessionHistory?: () => void
  onCloseOverlay?: () => void
  onCloseTab?: (index: number) => void
  onConflictsDetected?: (conflicts: ShortcutConflict[]) => void
}

export function getEffectiveShortcuts(keyBindings: Record<string, string>): ShortcutDefinition[] {
  if (!keyBindings || Object.keys(keyBindings).length === 0) return SHORTCUTS
  return SHORTCUTS.map(s => {
    const customKey = keyBindings[s.action]
    return customKey ? { ...s, key: customKey } : s
  })
}

export function ShortcutProvider({ children, onPasteDialog, onShowSearch, onShowSettings, onShowSessionHistory, onCloseOverlay, onCloseTab, onConflictsDetected }: ShortcutProviderProps) {
  const keyBindings = useSettingsStore(s => s.settings.keyBindings)
  const { toggleTheme } = useTheme()
  const { nextChunk, prevChunk, firstChunk, lastChunk, toggleCollapse, swapFiles, viewMode: _viewMode, setViewMode, setLeftFile, setRightFile, leftFile, rightFile, diffResult } = useDiffStore()
  const { addTab, closeTab, tabs, activeIndex, setActiveTabFiles, swapActiveTabFiles } = useTabStore()

  // §修复：只有在双栏视图且有变化时才启用折叠快捷键
  const canCollapse = _viewMode === 'split' && diffResult && diffResult.chunks.length > 0
  const { saveSession } = useSessionStore()

  const openFile = useCallback(async (side: 'left' | 'right') => {
    try {
      const file = await api.openFile(side)
      if (file) {
        const { tabs: currentTabs, activeIndex: currentIndex } = useTabStore.getState()
        const currentTab = currentTabs[currentIndex]
        if (side === 'left') {
          setLeftFile(file)
          setActiveTabFiles(file, currentTab.rightFile)
        } else {
          setRightFile(file)
          setActiveTabFiles(currentTab.leftFile, file)
        }
      }
    } catch (error) {
      console.error('Failed to open file:', error)
    }
  }, [setLeftFile, setRightFile, setActiveTabFiles])

  const handlers: Record<string, ShortcutHandler> = {
    openFilePair: () => {
      openFile('left').then(() => openFile('right'))
    },
    saveSession: async () => {
      if (leftFile && rightFile) {
        const leftName = leftFile.path?.split(/[\/]/).pop() || '未命名'
        const rightName = rightFile.path?.split(/[\/]/).pop() || '未命名'
        const name = `${leftName} vs ${rightName}`

        try {
          // 获取当前 diff 结果中的统计信息
          const { diffResult } = useDiffStore.getState()
          await saveSession({
            name,
            left: leftFile,
            right: rightFile,
            stats: diffResult?.stats,  // 包含差异统计
            options: {
              ignoreWhitespace: 'none',
              ignoreCase: false,
              ignoreLineEndings: true,
              ignorePatterns: [],
              ignoreComments: false,
              commentPrefixes: ['//', '#', '--'],
              algorithm: 'myers',
              contextLines: 3
            }
          })
          // 可以在这里添加保存成功的提示
        } catch (error) {
          console.error('Failed to save session:', error)
        }
      }
    },
    newTab: () => addTab(),
    closeTab: () => {
      if (tabs.length > 1) {
        if (onCloseTab) {
          onCloseTab(activeIndex)
        } else {
          closeTab(activeIndex)
        }
      }
    },
    search: () => {
      onShowSearch?.()
    },
    viewSplit: () => {
      setViewMode('split')
    },
    viewUnified: () => {
      setViewMode('unified')
    },
    viewDirectory: () => {
      setViewMode('directory')
    },
    viewMerge: () => {
      setViewMode('merge')
    },
    // §修复：只有在双栏视图且有变化时才响应折叠快捷键
    toggleCollapse: () => {
      if (canCollapse) {
        toggleCollapse()
      }
    },
    toggleTheme: () => toggleTheme(),
    pasteText: () => onPasteDialog?.(),
    openSettings: () => {
      onShowSettings?.()
    },
    showSessionHistory: () => {
      onShowSessionHistory?.()
    },
    nextDiff: () => nextChunk(),
    prevDiff: () => prevChunk(),
    firstDiff: () => firstChunk(),
    lastDiff: () => lastChunk(),
    closeOverlay: () => {
      onCloseOverlay?.()
    },
    swapFiles: () => {
      swapFiles()
      swapActiveTabFiles()
    }
  }

  const effectiveShortcuts = useMemo(() => getEffectiveShortcuts(keyBindings), [keyBindings])

  const shortcutsRef = useRef<ShortcutDefinition[]>(effectiveShortcuts)
  const conflictsRef = useRef<ShortcutConflict[]>([])

  const detectConflicts = useCallback((shortcuts: ShortcutDefinition[]): ShortcutConflict[] => {
    const keyMap = new Map<string, string[]>()

    shortcuts.forEach(shortcut => {
      const existing = keyMap.get(shortcut.key) || []
      existing.push(shortcut.action)
      keyMap.set(shortcut.key, existing)
    })

    const conflicts: ShortcutConflict[] = []
    keyMap.forEach((actions, key) => {
      if (actions.length > 1) {
        conflicts.push({ key, actions })
      }
    })

    if (conflicts.length > 0) {
      console.warn('快捷键冲突检测:', conflicts.map(c =>
        `快捷键冲突: ${c.key} 被 ${c.actions.join(', ')} 同时使用`
      ))
    }

    return conflicts
  }, [])

  useEffect(() => {
    const currentShortcuts = JSON.stringify(effectiveShortcuts)
    const prevShortcuts = JSON.stringify(shortcutsRef.current)

    if (currentShortcuts !== prevShortcuts) {
      shortcutsRef.current = effectiveShortcuts
      const conflicts = detectConflicts(effectiveShortcuts)
      conflictsRef.current = conflicts

      if (conflicts.length > 0 && onConflictsDetected) {
        onConflictsDetected(conflicts)
      }
    }
  }, [effectiveShortcuts, detectConflicts, onConflictsDetected])

  useEffect(() => {
    const conflicts = detectConflicts(effectiveShortcuts)
    conflictsRef.current = conflicts

    if (conflicts.length > 0 && onConflictsDetected) {
      onConflictsDetected(conflicts)
    }
  }, [detectConflicts, onConflictsDetected, effectiveShortcuts])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 如果正在输入框中，不处理快捷键（除了 Escape）
    const target = event.target as HTMLElement
    const isInputElement = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
    const isMonacoEditor = !!target.closest('.monaco-editor')
    if ((isInputElement || isMonacoEditor) && event.key !== 'Escape') {
      return
    }

    const key = []

    if (event.ctrlKey || event.metaKey) key.push('Ctrl')
    if (event.altKey) key.push('Alt')
    if (event.shiftKey) key.push('Shift')

    const keyName = event.key.length === 1 ? event.key.toUpperCase() : event.key
    key.push(keyName)

    const shortcut = key.join('+')

    const found = effectiveShortcuts.find(s => s.key === shortcut)
    if (found) {
      const handler = handlers[found.action]
      if (handler) {
        event.preventDefault()
        handler()
      }
    }
  }, [handlers, effectiveShortcuts])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return <>{children}</>
}
