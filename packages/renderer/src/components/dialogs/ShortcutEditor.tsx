import { useState, useCallback, useRef, useEffect } from 'react'
import { SHORTCUTS } from '@shared/constants'
import { useI18n } from '../../hooks/useI18n'
import { cn } from '../../lib/utils'
import type { TranslationKey } from '@shared/locales'

interface ShortcutEditorProps {
  keyBindings: Record<string, string>
  onChange: (keyBindings: Record<string, string>) => void
}

interface EditingState {
  action: string | null
  key: string | null
}

const EDITABLE_GROUPS: { group: string; actions: string[] }[] = [
  {
    group: 'fileOps',
    actions: ['openFilePair', 'saveSession', 'showSessionHistory', 'search', 'openSettings', 'pasteText', 'swapFiles']
  },
  {
    group: 'tabManagement',
    actions: ['newTab', 'closeTab']
  },
  {
    group: 'viewMode',
    actions: ['viewSplit', 'viewUnified', 'viewDirectory', 'viewMerge', 'toggleCollapse', 'toggleTheme']
  },
  {
    group: 'diffNavigation',
    actions: ['nextDiff', 'prevDiff', 'firstDiff', 'lastDiff']
  }
]

const DESCRIPTION_KEYS: Record<string, string> = {
  openFilePair: 'menu.file.openPair',
  saveSession: 'menu.file.saveSession',
  showSessionHistory: 'menu.session.history',
  search: 'toolbar.search',
  openSettings: 'menu.tools.preferences',
  pasteText: 'menu.file.pasteText',
  swapFiles: 'menu.edit.swapFiles',
  newTab: 'menu.session.newTab',
  closeTab: 'menu.session.closeTab',
  viewSplit: 'toolbar.splitView',
  viewUnified: 'toolbar.unifiedView',
  viewDirectory: 'toolbar.directoryView',
  viewMerge: 'toolbar.mergeView',
  toggleCollapse: 'toolbar.collapseUnchanged',
  toggleTheme: 'menu.view.toggleTheme',
  nextDiff: 'toolbar.nextDiff',
  prevDiff: 'toolbar.prevDiff',
  firstDiff: 'toolbar.firstDiff',
  lastDiff: 'toolbar.lastDiff'
}

function normalizeKey(event: KeyboardEvent): string | null {
  if (event.key === 'Tab' || event.key === 'CapsLock' || event.key === 'NumLock') return null

  const parts: string[] = []
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')

  const key = event.key
  if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') {
    return parts.length > 0 ? parts.join('+') : null
  }

  if (key === ' ') {
    parts.push('Space')
  } else if (key === 'Escape') {
    parts.push('Escape')
  } else if (key === 'ArrowUp') {
    parts.push('ArrowUp')
  } else if (key === 'ArrowDown') {
    parts.push('ArrowDown')
  } else if (key === 'ArrowLeft') {
    parts.push('ArrowLeft')
  } else if (key === 'ArrowRight') {
    parts.push('ArrowRight')
  } else if (key === 'Enter') {
    parts.push('Enter')
  } else if (key === 'Home') {
    parts.push('Home')
  } else if (key === 'End') {
    parts.push('End')
  } else if (key === 'Delete') {
    parts.push('Delete')
  } else if (key.startsWith('F') && key.length <= 3) {
    parts.push(key)
  } else if (key.length === 1) {
    parts.push(key.toUpperCase())
  } else {
    return null
  }

  return parts.join('+')
}

function getKeyForAction(action: string, keyBindings: Record<string, string>): string {
  if (keyBindings[action]) return keyBindings[action]
  const found = SHORTCUTS.find(s => s.action === action)
  return found ? found.key : ''
}

function findConflicts(action: string, newKey: string, keyBindings: Record<string, string>): string[] {
  const conflicts: string[] = []
  const allShortcuts = SHORTCUTS.map(s => ({
    action: s.action,
    key: keyBindings[s.action] || s.key
  }))

  for (const s of allShortcuts) {
    if (s.action === action) continue
    if (s.key === newKey) {
      conflicts.push(s.action)
    }
  }
  return conflicts
}

function formatKeyDisplay(key: string): string {
  return key
    .replace(/\+/g, ' + ')
    .replace(/ArrowUp/g, '↑')
    .replace(/ArrowDown/g, '↓')
    .replace(/ArrowLeft/g, '←')
    .replace(/ArrowRight/g, '→')
}

export function ShortcutEditor({ keyBindings, onChange }: ShortcutEditorProps) {
  const { t } = useI18n()
  const [editing, setEditing] = useState<EditingState>({ action: null, key: null })
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const inputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editing.action && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editing.action])

  const handleStartEdit = useCallback((action: string) => {
    setEditing({ action, key: null })
    setError(null)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditing({ action: null, key: null })
    setError(null)
  }, [])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (event.key === 'Escape') {
      handleCancelEdit()
      return
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      if (!editing.key) {
        const newBindings = { ...keyBindings }
        delete newBindings[editing.action!]
        onChange(newBindings)
      }
      handleCancelEdit()
      return
    }

    const normalized = normalizeKey(event.nativeEvent)
    if (!normalized) return

    const modifierOnly = ['Ctrl', 'Alt', 'Shift', 'Ctrl+Alt', 'Ctrl+Shift', 'Alt+Shift', 'Ctrl+Alt+Shift']
    if (modifierOnly.includes(normalized)) {
      setEditing(prev => ({ ...prev, key: normalized }))
      return
    }

    const conflicts = findConflicts(editing.action!, normalized, keyBindings)
    if (conflicts.length > 0) {
      setError(t('shortcuts.conflictError' as TranslationKey))
      return
    }

    onChange({ ...keyBindings, [editing.action!]: normalized })
    handleCancelEdit()
  }, [editing, keyBindings, onChange, handleCancelEdit, t])

  const filteredGroups = EDITABLE_GROUPS.map(g => ({
    ...g,
    actions: g.actions.filter(action => {
      if (!searchQuery) return true
      const desc = t((DESCRIPTION_KEYS[action] || '') as TranslationKey).toLowerCase()
      const key = getKeyForAction(action, keyBindings).toLowerCase()
      return desc.includes(searchQuery.toLowerCase()) || key.includes(searchQuery.toLowerCase())
    })
  })).filter(g => g.actions.length > 0)

  return (
    <div className="shortcut-editor">
      <div className="shortcut-editor-header">
        <p className="settings-description">{t('shortcuts.editHint')}</p>
        <div className="shortcut-editor-toolbar">
          <input
            type="text"
            className="shortcut-search-input"
            placeholder={t('shortcuts.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="shortcut-editor-list">
        {filteredGroups.map(group => (
          <div key={group.group} className="shortcut-category">
            <h5>{t((`shortcuts.group.${group.group}`) as TranslationKey)}</h5>
            {group.actions.map(action => {
              const currentKey = getKeyForAction(action, keyBindings)
              const isEditing = editing.action === action
              const isCustom = !!keyBindings[action]
              const displayKey = editing.key || currentKey

              return (
                <div
                  key={action}
                  className={cn('shortcut-item-row', isEditing && 'editing', isCustom && 'custom')}
                >
                  <div
                    className={cn('shortcut-item', isEditing && 'editing', isCustom && 'custom')}
                    onClick={() => !isEditing && handleStartEdit(action)}
                  >
                    <span className="shortcut-label">
                      {t((DESCRIPTION_KEYS[action] || '') as TranslationKey)}
                      {isCustom && <span className="shortcut-custom-badge">{t('shortcuts.custom' as TranslationKey)}</span>}
                    </span>
                    <div
                      ref={isEditing ? inputRef : undefined}
                      className={cn('shortcut-key-display', isEditing && 'recording')}
                      tabIndex={isEditing ? 0 : -1}
                      onKeyDown={isEditing ? handleKeyDown : undefined}
                    >
                      {isEditing ? (
                        <>
                          <kbd className="recording-key">{formatKeyDisplay(displayKey)}</kbd>
                          {editing.key ? (
                            <span className="recording-hint">...</span>
                          ) : (
                            <span className="recording-hint">{t('shortcuts.pressKeys' as TranslationKey)}</span>
                          )}
                        </>
                      ) : (
                        <kbd>{formatKeyDisplay(currentKey)}</kbd>
                      )}
                    </div>
                  </div>
                  {isEditing && error && (
                    <div className="shortcut-item-error">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      {error}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

    </div>
  )
}
