import { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme } from './features/theme'
import { useTabStore, useDiffStore, useComputeDiff, useSettingsStore } from './stores'
import { MenuBar, Toolbar, TabBar, StatusBar, FileDropZone } from './components/layout'
import { DiffView, configureMonaco } from './features/diff-view'
import { MergeView } from './features/merge'
import { DirectoryView } from './features/directory'
import { WelcomeView } from './components/welcome'
import { PasteDialog, IgnorePanel, SearchDialog, SettingsDialog, ShortcutsHelp, SessionListDialog, UnsavedChangesDialog } from './components/dialogs'
import type { UnsavedChangesAction } from './components/dialogs'
import { ShortcutProvider } from './features/shortcuts/ShortcutProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useFileWatcher } from './hooks'
import { useSession } from './hooks/useSession'
import { api } from './lib/api'
import type { DiffSession } from '@shared/types'

export default function App() {
  const { resolvedTheme } = useTheme()
  const { tabs, activeIndex, setActiveTabFiles, addDirectoryTab, addMergeTab } = useTabStore()
  const { leftFile, rightFile, viewMode, setLeftFile, setRightFile, setOptions, setViewMode } = useDiffStore()
  
  const { settings } = useSettingsStore()
  const { restoreSession } = useSession()
  const [showPasteDialog, setShowPasteDialog] = useState(false)
  const [showIgnorePanel, setShowIgnorePanel] = useState(false)
  const [showSearchDialog, setShowSearchDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [showSessionList, setShowSessionList] = useState(false)

  // 未保存更改确认状态
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [unsavedTabIndex, setUnsavedTabIndex] = useState(0)
  const [dirtyTabsList, setDirtyTabsList] = useState<{ index: number; tab: import('./stores/tab.store').TabInfo }[]>([])
  const isQuitCheckRef = useRef(false)
  const pendingTabCloseRef = useRef<number | null>(null)

  const computeDiff = useComputeDiff()

  // 关闭所有浮层/对话框
  const closeAllOverlays = useCallback(() => {
    setShowPasteDialog(false)
    setShowIgnorePanel(false)
    setShowSearchDialog(false)
    setShowSettingsDialog(false)
    setShowShortcutsHelp(false)
    setShowSessionList(false)
    setShowUnsavedDialog(false)
  }, [])

  // 保存指定标签页的文件
  const saveTabFiles = useCallback(async (tab: import('./stores/tab.store').TabInfo) => {
    if (tab.leftFile?.path) {
      await api.writeFile(tab.leftFile.path, tab.leftFile.content)
    }
    if (tab.rightFile?.path) {
      await api.writeFile(tab.rightFile.path, tab.rightFile.content)
    }
  }, [])

  // 处理未保存更改对话框的操作
  const handleUnsavedAction = useCallback(async (action: UnsavedChangesAction) => {
    const dirtyList = dirtyTabsList
    if (dirtyList.length === 0) return

    const currentDirty = dirtyList[unsavedTabIndex]
    if (!currentDirty) return

    const tabStore = useTabStore.getState()

    if (action === 'cancel') {
      setShowUnsavedDialog(false)
      isQuitCheckRef.current = false
      pendingTabCloseRef.current = null
      return
    }

    if (action === 'save-all') {
      for (let i = 0; i < dirtyList.length; i++) {
        try {
          await saveTabFiles(dirtyList[i].tab)
          tabStore.markTabAsSaved(dirtyList[i].index)
        } catch (e) {
          console.error('Failed to save:', e)
        }
      }
    } else if (action === 'discard-all') {
      for (let i = 0; i < dirtyList.length; i++) {
        tabStore.markTabAsNotDirty(dirtyList[i].index)
      }
    } else if (action === 'save') {
      try {
        await saveTabFiles(currentDirty.tab)
        tabStore.markTabAsSaved(currentDirty.index)
      } catch (e) {
        console.error('Failed to save:', e)
      }
      const nextIndex = unsavedTabIndex + 1
      if (nextIndex < dirtyList.length) {
        setUnsavedTabIndex(nextIndex)
        return
      }
    } else if (action === 'discard') {
      tabStore.markTabAsNotDirty(currentDirty.index)
      const nextIndex = unsavedTabIndex + 1
      if (nextIndex < dirtyList.length) {
        setUnsavedTabIndex(nextIndex)
        return
      }
    }

    // All done
    setShowUnsavedDialog(false)

    // Continue with the pending operation
    if (isQuitCheckRef.current) {
      isQuitCheckRef.current = false
      window.api.confirmClose()
    } else if (pendingTabCloseRef.current !== null) {
      const idx = pendingTabCloseRef.current
      pendingTabCloseRef.current = null
      tabStore.closeTab(idx)
    }
  }, [dirtyTabsList, unsavedTabIndex, saveTabFiles])

  // 启动未保存更改确认流程
  const startUnsavedCheck = useCallback((
    dirtyList: { index: number; tab: import('./stores/tab.store').TabInfo }[],
    isQuit: boolean,
    tabCloseIndex?: number
  ) => {
    if (dirtyList.length === 0) {
      if (isQuit) {
        window.api.confirmClose()
      } else if (tabCloseIndex !== undefined) {
        useTabStore.getState().closeTab(tabCloseIndex)
      }
      return
    }

    isQuitCheckRef.current = isQuit
    pendingTabCloseRef.current = tabCloseIndex ?? null
    setDirtyTabsList(dirtyList)
    setUnsavedTabIndex(0)
    setShowUnsavedDialog(true)
  }, [])

  // 监听主进程的关闭确认
  useEffect(() => {
    const unsubscribe = window.api.onCheckUnsaved(() => {
      const dirtyList = useTabStore.getState().getDirtyTabs()
      startUnsavedCheck(dirtyList, true)
    })
    return unsubscribe
  }, [startUnsavedCheck])

  // 标签页关闭处理（检查未保存更改）
  const handleCloseTab = useCallback((index: number) => {
    const tab = useTabStore.getState().tabs[index]
    if (tab?.isDirty && !tab.isDirectoryView && (tab.leftFile?.path || tab.rightFile?.path)) {
      startUnsavedCheck([{ index, tab }], false, index)
    } else {
      useTabStore.getState().closeTab(index)
    }
  }, [startUnsavedCheck])

  // 视图切换处理函数
  const handleSetSplitView = useCallback(() => {
    setViewMode('split')
  }, [setViewMode])

  const handleSetUnifiedView = useCallback(() => {
    setViewMode('unified')
  }, [setViewMode])

  // 显示目录对比视图 — 新建一个目录对比 tab，不覆盖当前 tab
  const handleShowDirectoryView = useCallback(async () => {
    addDirectoryTab('', '', undefined, { startComparison: false })
  }, [addDirectoryTab])

  // 打开目录对 — 连续选择两个目录后直接开始对比
  const handleOpenDirectoryPair = useCallback(async () => {
    try {
      const leftPath = await api.directory.open('left')
      if (!leftPath) return

      const rightPath = await api.directory.open('right')
      if (!rightPath) return

      addDirectoryTab(leftPath, rightPath, undefined, { startComparison: true })
    } catch (error) {
      console.error('Failed to open directory pair:', error)
    }
  }, [addDirectoryTab])

  // 显示合并视图 — 新建一个合并 tab，不覆盖当前 tab
  const handleShowMergeView = useCallback(() => {
    addMergeTab()
  }, [addMergeTab])

  
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
      onCloseTab={handleCloseTab}
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
            onOpenDirectoryPair={handleOpenDirectoryPair}
            onSetSplitView={handleSetSplitView}
            onSetUnifiedView={handleSetUnifiedView}
          />
          <Toolbar
            onPasteDialog={() => setShowPasteDialog(true)}
            onShowIgnorePanel={() => setShowIgnorePanel(true)}
            onShowSearch={() => setShowSearchDialog(true)}
            onShowDirectoryView={handleShowDirectoryView}
            onOpenDirectoryPair={handleOpenDirectoryPair}
            onShowMergeView={handleShowMergeView}
            onSetSplitView={handleSetSplitView}
            onSetUnifiedView={handleSetUnifiedView}
          />
          <TabBar onCloseTab={handleCloseTab} />

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

          <UnsavedChangesDialog
            open={showUnsavedDialog}
            tabTitle={dirtyTabsList[unsavedTabIndex]?.tab.title || ''}
            remainingCount={dirtyTabsList.length - unsavedTabIndex - 1}
            onAction={handleUnsavedAction}
          />
        </div>
      </FileDropZone>
    </ShortcutProvider>
  )
}
