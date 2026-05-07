import { useState, useEffect, useCallback } from 'react'
import { useTheme } from './features/theme'
import { useTabStore, useDiffStore, useComputeDiff, useSettingsStore } from './stores'
import { MenuBar, Toolbar, TabBar, StatusBar, FileDropZone } from './components/layout'
import { DiffView, configureMonaco } from './features/diff-view'
import { MergeView } from './features/merge'
import { DirectoryView } from './features/directory'
import { WelcomeView } from './components/welcome'
import { PasteDialog, IgnorePanel, SearchDialog, SettingsDialog, ShortcutsHelp, SessionListDialog } from './components/dialogs'
import { ShortcutProvider } from './features/shortcuts/ShortcutProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useFileWatcher } from './hooks'
import { useSession } from './hooks/useSession'
import type { DiffSession } from '@shared/types'

export default function App() {
  const { resolvedTheme } = useTheme()
  const { tabs, activeIndex, setActiveTabFiles } = useTabStore()
  const { leftFile, rightFile, viewMode, setLeftFile, setRightFile, setOptions, setViewMode } = useDiffStore()
  
  const { settings } = useSettingsStore()
  const { restoreSession } = useSession()
  const [showPasteDialog, setShowPasteDialog] = useState(false)
  const [showIgnorePanel, setShowIgnorePanel] = useState(false)
  const [showSearchDialog, setShowSearchDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [showSessionList, setShowSessionList] = useState(false)

  const computeDiff = useComputeDiff()

  // 关闭所有浮层/对话框
  const closeAllOverlays = useCallback(() => {
    setShowPasteDialog(false)
    setShowIgnorePanel(false)
    setShowSearchDialog(false)
    setShowSettingsDialog(false)
    setShowShortcutsHelp(false)
    setShowSessionList(false)
  }, [])

  // 视图切换处理函数
  const handleSetSplitView = useCallback(() => {
    setViewMode('split')
  }, [setViewMode])

  const handleSetUnifiedView = useCallback(() => {
    setViewMode('unified')
  }, [setViewMode])

  // 显示目录对比视图
  const handleShowDirectoryView = useCallback(async () => {
    setViewMode('directory')
    // 清除文件对比状态，避免冲突
    setLeftFile(null)
    setRightFile(null)
  }, [setViewMode, setLeftFile, setRightFile])

  // 显示合并视图
  const handleShowMergeView = useCallback(() => {
    setViewMode('merge')
    // 清除文件对比状态，避免冲突
    setLeftFile(null)
    setRightFile(null)
  }, [setViewMode, setLeftFile, setRightFile])

  
  // 使用文件监听
  useFileWatcher()

  // §2.7.1 加载会话处理
  const handleLoadSession = useCallback((session: DiffSession) => {
    // 恢复文件
    if (session.left) {
      setLeftFile(session.left)
    }
    if (session.right) {
      setRightFile(session.right)
    }
    // 恢复选项
    if (session.options) {
      setOptions(session.options)
    }
    // 更新当前标签页
    setActiveTabFiles(session.left, session.right)
    // 恢复会话状态
    restoreSession(session)
  }, [setLeftFile, setRightFile, setOptions, setActiveTabFiles, restoreSession])

  // 当忽略规则应用后重新计算 diff
  const handleIgnorePanelApply = useCallback(() => {
    setShowIgnorePanel(false)
    // 如果有文件已打开，重新计算 diff
    if (leftFile && rightFile) {
      computeDiff()
    }
  }, [leftFile, rightFile, computeDiff])

  // 初始化主题
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme)
    // 同步 Tailwind dark: 工具类所需的 dark class
    if (resolvedTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [resolvedTheme])

  // 更新字体 CSS 变量
  useEffect(() => {
    const root = document.documentElement
    // 设置字体大小
    root.style.setProperty('--editor-font-size', `${settings.editor.fontSize}px`)
  }, [settings.editor.fontSize])

  // 单独处理字体族变化，避免影响 Monaco Editor 布局
  useEffect(() => {
    const root = document.documentElement
    // 字体族通过 CSS 变量设置，Monaco Editor 单独通过 updateOptions 更新
    root.style.setProperty('--font-mono', settings.editor.fontFamily)
  }, [settings.editor.fontFamily])

  // 初始化 Monaco Editor
  useEffect(() => {
    configureMonaco()
  }, [])

  // 监听主题变化，更新 Monaco 主题
  useEffect(() => {
    const monacoTheme = resolvedTheme === 'dark' ? 'textdiff-dark' : 'textdiff-light'
    import('monaco-editor').then((monaco) => {
      monaco.editor.setTheme(monacoTheme)
    })
  }, [resolvedTheme])

  // §修复搜索框问题：监听来自 Monaco 编辑器的搜索事件
  useEffect(() => {
    const handleOpenSearch = () => {
      setShowSearchDialog(true)
    }
    window.addEventListener('textdiff:open-search' as any, handleOpenSearch)
    return () => {
      window.removeEventListener('textdiff:open-search' as any, handleOpenSearch)
    }
  }, [])

  const activeTab = tabs[activeIndex]
  const hasBothFiles = activeTab?.leftFile && activeTab?.rightFile

  return (
    <ShortcutProvider
      onPasteDialog={() => setShowPasteDialog(true)}
      onShowSearch={() => setShowSearchDialog(true)}
      onShowSettings={() => setShowSettingsDialog(true)}
      onShowSessionHistory={() => setShowSessionList(true)}
      onCloseOverlay={closeAllOverlays}
    >
      <FileDropZone>
        <div className="app-shell" id="app">
          <MenuBar
            onPasteDialog={() => setShowPasteDialog(true)}
            onShowIgnorePanel={() => setShowIgnorePanel(true)}
            onShowSessionHistory={() => setShowSessionList(true)}
            onShowSettings={() => setShowSettingsDialog(true)}
            onShowShortcuts={() => setShowShortcutsHelp(true)}
            onShowMergeView={handleShowMergeView}
            onShowDirectoryView={handleShowDirectoryView}
            onSetSplitView={handleSetSplitView}
            onSetUnifiedView={handleSetUnifiedView}
          />
          <Toolbar
            onPasteDialog={() => setShowPasteDialog(true)}
            onShowIgnorePanel={() => setShowIgnorePanel(true)}
            onShowSearch={() => setShowSearchDialog(true)}
            onShowDirectoryView={handleShowDirectoryView}
            onShowMergeView={handleShowMergeView}
            onSetSplitView={handleSetSplitView}
            onSetUnifiedView={handleSetUnifiedView}
          />
          <TabBar />

          <div className="content-area">
            {viewMode === 'directory' ? (
              <ErrorBoundary>
                <DirectoryView />
              </ErrorBoundary>
            ) : viewMode === 'merge' ? (
              <ErrorBoundary>
                <MergeView />
              </ErrorBoundary>
            ) : hasBothFiles ? (
              <ErrorBoundary>
                <DiffView />
              </ErrorBoundary>
            ) : (
              <WelcomeView onPasteDialog={() => setShowPasteDialog(true)} />
            )}
          </div>

          <StatusBar />

          <PasteDialog
            open={showPasteDialog}
            onClose={() => setShowPasteDialog(false)}
          />

          <IgnorePanel
            open={showIgnorePanel}
            onClose={() => setShowIgnorePanel(false)}
            onApply={handleIgnorePanelApply}
          />

          <SearchDialog
            open={showSearchDialog}
            onClose={() => setShowSearchDialog(false)}
          />

          <SettingsDialog
            open={showSettingsDialog}
            onClose={() => setShowSettingsDialog(false)}
          />

          <ShortcutsHelp
            open={showShortcutsHelp}
            onClose={() => setShowShortcutsHelp(false)}
          />

          <SessionListDialog
            open={showSessionList}
            onClose={() => setShowSessionList(false)}
            onLoadSession={handleLoadSession}
          />
        </div>
      </FileDropZone>
    </ShortcutProvider>
  )
}
