import { useState, useRef, useEffect } from 'react'
import { useTheme } from '../../features/theme'
import { useTabStore, useDiffStore } from '../../stores'
import { api } from '../../lib/api'
import { useI18n } from '../../hooks/useI18n'

interface MenuBarProps {
  onPasteDialog: () => void
  onShowIgnorePanel: () => void
  onShowSessionHistory?: () => void
  onShowSettings?: () => void
  onShowShortcuts?: () => void
  onShowMergeView?: () => void
  onShowDirectoryView?: () => void
  onOpenDirectoryPair?: () => void
  onSetSplitView?: () => void
  onSetUnifiedView?: () => void
}

export function MenuBar({ onPasteDialog, onShowIgnorePanel, onShowSessionHistory, onShowSettings, onShowShortcuts, onShowMergeView, onShowDirectoryView: _onShowDirectoryView, onOpenDirectoryPair, onSetSplitView, onSetUnifiedView }: MenuBarProps) {
  const { theme, toggleTheme } = useTheme()
  const { addTab, closeTab, tabs, activeIndex, setActiveTabFiles } = useTabStore()
  const { setLeftFile, setRightFile, toggleCollapse } = useDiffStore()
  const { t } = useI18n()
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const menuBarRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭菜单
  useEffect(() => {
    if (!activeMenu) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        setActiveMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeMenu])

  const handleOpenFile = async (side: 'both') => {
    try {
      let leftFile: Awaited<ReturnType<typeof api.openFile>> = null
      let rightFile: Awaited<ReturnType<typeof api.openFile>> = null

      if (side === 'both') {
        // 打开文件对：必须先选择左侧，才能选择右侧
        leftFile = await api.openFile('left')
        if (!leftFile) {
          setActiveMenu(null)
          return // 用户取消左侧文件，直接返回
        }
        setLeftFile(leftFile)

        rightFile = await api.openFile('right')
        if (!rightFile) {
          // 用户取消右侧文件，只更新左侧
          setActiveTabFiles(leftFile, null)
          setActiveMenu(null)
          return
        }
        setRightFile(rightFile)

        // 两侧都选择成功，统一更新
        setActiveTabFiles(leftFile, rightFile)
      }
    } catch (error) {
      console.error('Failed to open file:', error)
    }
    setActiveMenu(null)
  }

  return (
    <div ref={menuBarRef} className="menu-bar">
      <div className="menu-brand">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6"/>
          <path d="M8 13h8M8 17h5"/>
        </svg>
        <span className="brand-name">{t('app.name')}</span>
      </div>

      <div className="menu-items">
        <div 
          className={`menu-item has-dropdown ${activeMenu === 'file' ? 'active' : ''}`}
          onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
        >
          <span>{t('menu.file')}</span>
          <div className="menu-dropdown">
            <div className="menu-dropdown-item" onClick={() => handleOpenFile('both')}>
              <span className="menu-label">{t('menu.file.openPair')}</span>
              <span className="menu-shortcut">Ctrl+O</span>
            </div>
            <div className="menu-dropdown-item" onClick={() => { onOpenDirectoryPair?.(); setActiveMenu(null); }}>
              <span className="menu-label">{t('menu.file.openDirectoryPair')}</span>
              <span className="menu-shortcut">Ctrl+Shift+D</span>
            </div>
            <div className="menu-divider" />
            <div className="menu-dropdown-item" onClick={() => { onPasteDialog(); setActiveMenu(null); }}>
              <span className="menu-label">{t('menu.file.pasteText')}</span>
              <span className="menu-shortcut">Ctrl+Shift+V</span>
            </div>
            <div className="menu-divider" />
            <div className="menu-dropdown-item" onClick={() => { onShowMergeView?.(); setActiveMenu(null); }}>
              <span className="menu-label">{t('menu.file.mergeView')}</span>
              <span className="menu-shortcut">Ctrl+Shift+M</span>
            </div>
            <div className="menu-divider" />
            <div className="menu-dropdown-item">
              <span className="menu-label">{t('menu.file.saveSession')}</span>
              <span className="menu-shortcut">Ctrl+S</span>
            </div>
          </div>
        </div>

        <div 
          className={`menu-item has-dropdown ${activeMenu === 'edit' ? 'active' : ''}`}
          onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
        >
          <span>{t('menu.edit')}</span>
          <div className="menu-dropdown">
            <div className="menu-dropdown-item" onClick={() => { toggleCollapse(); setActiveMenu(null); }}>
              <span className="menu-label">{t('menu.edit.collapseUnchanged')}</span>
              <span className="menu-shortcut">Ctrl+Shift+C</span>
            </div>
          </div>
        </div>

        <div 
          className={`menu-item has-dropdown ${activeMenu === 'view' ? 'active' : ''}`}
          onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
        >
          <span>{t('menu.view')}</span>
          <div className="menu-dropdown">
            <div className="menu-dropdown-item" onClick={() => { onSetSplitView?.(); setActiveMenu(null); }}>
              <span className="menu-label">{t('menu.view.splitView')}</span>
              <span className="menu-shortcut">Ctrl+1</span>
            </div>
            <div className="menu-dropdown-item" onClick={() => { onSetUnifiedView?.(); setActiveMenu(null); }}>
              <span className="menu-label">{t('menu.view.unifiedView')}</span>
              <span className="menu-shortcut">Ctrl+2</span>
            </div>
            <div className="menu-divider" />
            <div className="menu-dropdown-item" onClick={() => { toggleTheme(); setActiveMenu(null); }}>
              <span className="menu-label">{t('menu.view.toggleTheme')}</span>
              <span className="menu-shortcut">Ctrl+Shift+T</span>
            </div>
          </div>
        </div>

        <div 
          className={`menu-item has-dropdown ${activeMenu === 'session' ? 'active' : ''}`}
          onClick={() => setActiveMenu(activeMenu === 'session' ? null : 'session')}
        >
          <span>{t('menu.session')}</span>
          <div className="menu-dropdown">
            <div className="menu-dropdown-item" onClick={() => { addTab(); setActiveMenu(null); }}>
              <span className="menu-label">{t('menu.session.newTab')}</span>
              <span className="menu-shortcut">Ctrl+T</span>
            </div>
            <div className="menu-dropdown-item" onClick={() => { if (tabs.length > 1) closeTab(activeIndex); setActiveMenu(null); }}>
              <span className="menu-label">{t('menu.session.closeTab')}</span>
              <span className="menu-shortcut">Ctrl+W</span>
            </div>
            <div className="menu-divider" />
            <div className="menu-dropdown-item" onClick={() => { onShowSessionHistory?.(); setActiveMenu(null); }}>
              <span className="menu-label">{t('menu.session.history')}</span>
              <span className="menu-shortcut">Ctrl+H</span>
            </div>
          </div>
        </div>

        <div
          className={`menu-item has-dropdown ${activeMenu === 'tools' ? 'active' : ''}`}
          onClick={() => setActiveMenu(activeMenu === 'tools' ? null : 'tools')}
        >
          <span>{t('menu.tools')}</span>
          <div className="menu-dropdown">
            <div className="menu-dropdown-item" onClick={() => { onShowIgnorePanel(); setActiveMenu(null); }}>
              <span className="menu-label">{t('menu.tools.ignoreRules')}</span>
            </div>
            <div className="menu-divider" />
            <div className="menu-dropdown-item" onClick={() => { onShowSettings?.(); setActiveMenu(null); }}>
              <span className="menu-label">{t('menu.tools.preferences')}</span>
              <span className="menu-shortcut">Ctrl+,</span>
            </div>
          </div>
        </div>

        <div
          className={`menu-item has-dropdown ${activeMenu === 'help' ? 'active' : ''}`}
          onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
        >
          <span>{t('menu.help')}</span>
          <div className="menu-dropdown">
            <div className="menu-dropdown-item" onClick={() => { onShowShortcuts?.(); setActiveMenu(null); }}>
              <span className="menu-label">{t('menu.help.shortcuts')}</span>
            </div>
            <div className="menu-divider" />
            <div className="menu-dropdown-item">
              <span className="menu-label">{t('menu.help.about')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="menu-actions">
        <button className="icon-btn" onClick={toggleTheme} title={t('menu.view.toggleTheme')}>
          {theme === 'dark' ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
        <button className="icon-btn" onClick={addTab} title={t('menu.session.newTab')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
