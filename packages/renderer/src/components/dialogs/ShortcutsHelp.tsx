import { SHORTCUTS } from '@shared/constants'
import type { ShortcutDefinition } from '@shared/constants'
import { useI18n } from '../../hooks/useI18n'

interface ShortcutsHelpProps {
  open: boolean
  onClose: () => void
}

interface ShortcutGroup {
  nameKey: 'shortcuts.group.fileOps' | 'shortcuts.group.tabManagement' | 'shortcuts.group.viewMode' | 'shortcuts.group.directory' | 'shortcuts.group.diffNavigation' | 'shortcuts.group.other'
  shortcuts: ShortcutDefinition[]
}

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  const { t } = useI18n()

  if (!open) return null

  const groups: ShortcutGroup[] = [
    {
      nameKey: 'shortcuts.group.fileOps',
      shortcuts: SHORTCUTS.filter(s =>
        ['openFilePair', 'openLeftFile', 'openRightFile', 'openDirectoryDiff', 'saveSession', 'pasteText', 'showSessionHistory'].includes(s.action)
      )
    },
    {
      nameKey: 'shortcuts.group.tabManagement',
      shortcuts: SHORTCUTS.filter(s =>
        ['newTab', 'closeTab'].includes(s.action)
      )
    },
    {
      nameKey: 'shortcuts.group.viewMode',
      shortcuts: SHORTCUTS.filter(s =>
        ['viewSplit', 'viewUnified', 'viewDirectory', 'toggleCollapse', 'toggleTheme'].includes(s.action)
      )
    },
    {
      nameKey: 'shortcuts.group.directory',
      shortcuts: SHORTCUTS.filter(s =>
        ['navigateUp', 'navigateDown', 'expand', 'collapse', 'viewDiff', 'quickPreview', 'refresh'].includes(s.action)
      )
    },
    {
      nameKey: 'shortcuts.group.diffNavigation',
      shortcuts: SHORTCUTS.filter(s =>
        ['nextDiff', 'prevDiff', 'firstDiff', 'lastDiff'].includes(s.action)
      )
    },
    {
      nameKey: 'shortcuts.group.other',
      shortcuts: SHORTCUTS.filter(s =>
        ['search', 'openSettings', 'closeOverlay', 'swapFiles'].includes(s.action)
      )
    }
  ]

  // 格式化快捷键显示
  const formatShortcut = (key: string): string => {
    return key
      .replace('Ctrl+', 'Ctrl + ')
      .replace('Shift+', 'Shift + ')
      .replace('Alt+', 'Alt + ')
      .replace('ArrowUp', '↑')
      .replace('ArrowDown', '↓')
  }

  return (
    <div className="overlay">
      <div className="panel shortcuts-panel">
        <div className="panel-header">
          <h3 className="panel-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 0 0 6.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 0 0 6.001 0M18 7l3 9m-3-9l-6-2"/>
          </svg>
          {t('dialog.shortcuts.title')}</h3>
          <button className="panel-close" onClick={onClose}>×</button>
        </div>

        <div className="panel-body shortcuts-body">
          {groups.map((group) => (
            <div key={group.nameKey} className="shortcuts-group">
              <h4 className="shortcuts-group-title">{t(group.nameKey)}</h4>
              <div className="shortcuts-list">
                {group.shortcuts.map((shortcut) => (
                  <div key={shortcut.key} className="shortcuts-item">
                    <span className="shortcuts-desc">{shortcut.description}</span>
                    <kbd className="shortcuts-key">{formatShortcut(shortcut.key)}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="panel-footer">
          <span className="shortcuts-hint">{t('shortcuts.hint')}</span>
          <button className="btn-primary" onClick={onClose}>{t('dialog.ok')}</button>
        </div>
      </div>
    </div>
  )
}
