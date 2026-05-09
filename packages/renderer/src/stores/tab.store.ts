import type { FileInfo, DiffResult, ThreeWayDiffResult } from '@shared/types'
import type { DirectoryComparison, DirectoryInfo, DirCompareOptions } from '@shared/types/directory.types'
import { create } from 'zustand'
import { generateSessionId } from '@shared/utils'
import { useDiffStore } from './diff.store'
import { useDirectoryCompareStore } from './directory.store'
import { useMergeStore } from '../features/merge/stores/merge.store'

export interface TabInfo {
  id: string
  title: string
  leftFile: FileInfo | null
  rightFile: FileInfo | null
  diffResult: DiffResult | null
  hasChanges: boolean
  isDirty: boolean
  isDirectoryView?: boolean
  isMergeView?: boolean
  // 目录对比相关字段
  directoryComparison?: DirectoryComparison | null
  leftDirectory?: DirectoryInfo | null
  rightDirectory?: DirectoryInfo | null
  dirCompareOptions?: DirCompareOptions
  // 目录树展开状态
  expandedPaths?: string[]
  // 视图模式
  dirViewMode?: 'all' | 'diff-only' | 'left-only' | 'right-only'
  // 三路合并相关字段
  baseFile?: FileInfo | null
  mergeResult?: ThreeWayDiffResult | null
  mergeResolutions?: Array<[string, { type: string; content?: string }]>
  activeConflictIndex?: number
}

interface TabState {
  tabs: TabInfo[]
  activeIndex: number
}

interface TabActions {
  addTab: () => void
  addTabWithFiles: (left: FileInfo, right: FileInfo) => void
  addDirectoryTab: (leftPath: string, rightPath: string, comparison?: DirectoryComparison, options?: { startComparison?: boolean }) => void
  addMergeTab: () => void
  closeTab: (index: number) => void
  selectTab: (index: number) => void
  updateTab: (index: number, updates: Partial<TabInfo>) => void
  updateTabTitle: (index: number, title: string) => void
  setActiveTabFiles: (left: FileInfo | null, right: FileInfo | null) => void
  setActiveTabDiffResult: (result: DiffResult | null) => void
  setActiveTabDirectoryComparison: (comparison: DirectoryComparison | null) => void
  setActiveTabDirectories: (leftDir: DirectoryInfo | null, rightDir: DirectoryInfo | null) => void
  updateActiveTabDirViewMode: (mode: 'all' | 'diff-only' | 'left-only' | 'right-only') => void
  updateActiveTabExpandedPaths: (paths: string[]) => void
  swapActiveTabFiles: () => void
  updateActiveTabContent: (side: 'left' | 'right', content: string) => void
  markActiveTabAsSaved: () => void
  markTabAsSaved: (index: number) => void
  markTabAsNotDirty: (index: number) => void
  getDirtyTabs: () => { index: number; tab: TabInfo }[]
  saveCurrentDirectoryState: () => void
  restoreDirectoryStateForTab: (index: number) => void
  saveCurrentMergeState: () => void
  restoreMergeStateForTab: (index: number) => void
}

const createNewTab = (): TabInfo => ({
  id: generateSessionId(),
  title: '新对比',
  leftFile: null,
  rightFile: null,
  diffResult: null,
  hasChanges: false,
  isDirty: false
})

export const useTabStore = create<TabState & TabActions>((set, get) => ({
  tabs: [createNewTab()],
  activeIndex: 0,

  addTab: () => {
    const { activeIndex, tabs } = get()

    const currentTab = tabs[activeIndex]
    if (currentTab?.isDirectoryView) {
      get().saveCurrentDirectoryState()
    }
    if (currentTab?.isMergeView) {
      get().saveCurrentMergeState()
    }

    const newTab = createNewTab()
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeIndex: state.tabs.length
    }))
    const { reset, setViewMode } = useDiffStore.getState()
    reset()
    setViewMode('split')
    const { clearComparison } = useDirectoryCompareStore.getState()
    clearComparison()
    const { reset: resetMerge } = useMergeStore.getState()
    resetMerge()
  },

  addTabWithFiles: (left, right) => {
    const { activeIndex, tabs } = get()
    const currentTab = tabs[activeIndex]
    if (currentTab?.isMergeView) {
      get().saveCurrentMergeState()
    }

    const leftName = left.path?.split('/').pop() || left.path?.split('\\').pop() || ''
    const rightName = right.path?.split('/').pop() || right.path?.split('\\').pop() || ''
    const title = `${leftName} vs ${rightName}`
    const newTab: TabInfo = {
      id: generateSessionId(),
      title,
      leftFile: left,
      rightFile: right,
      diffResult: null,
      hasChanges: false,
      isDirty: false,
      isDirectoryView: false
    }
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeIndex: state.tabs.length
    }))
    const { reset } = useDiffStore.getState()
    reset()
    const { clearComparison } = useDirectoryCompareStore.getState()
    clearComparison()
    const { reset: resetMerge } = useMergeStore.getState()
    resetMerge()
  },

  addDirectoryTab: (leftPath: string, rightPath: string, comparison?: DirectoryComparison, options?: { startComparison?: boolean }) => {
    const startComparisonNow = options?.startComparison !== false
    const leftName = leftPath ? (leftPath.split('/').pop() || leftPath.split('\\').pop() || '') : '选择目录'
    const rightName = rightPath ? (rightPath.split('/').pop() || rightPath.split('\\').pop() || '') : '选择目录'
    const title = leftPath && rightPath ? `${leftName} vs ${rightName}` : '目录对比'

    const { activeIndex, tabs } = get()
    const currentTab = tabs[activeIndex]
    if (currentTab?.isDirectoryView) {
      get().saveCurrentDirectoryState()
    }
    if (currentTab?.isMergeView) {
      get().saveCurrentMergeState()
    }

    const newTab: TabInfo = {
      id: generateSessionId(),
      title,
      leftFile: null,
      rightFile: null,
      diffResult: null,
      hasChanges: false,
      isDirty: false,
      isDirectoryView: true,
      directoryComparison: comparison || null,
      dirViewMode: 'all',
      expandedPaths: [],
      leftDirectory: leftPath ? { path: leftPath, name: leftName, totalFiles: 0, totalSize: 0, lastModified: new Date() } : undefined,
      rightDirectory: rightPath ? { path: rightPath, name: rightName, totalFiles: 0, totalSize: 0, lastModified: new Date() } : undefined
    }
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeIndex: state.tabs.length
    }))
    const { reset, setViewMode } = useDiffStore.getState()
    reset()
    setViewMode('directory')
    if (startComparisonNow && leftPath && rightPath) {
      const { startComparison } = useDirectoryCompareStore.getState()
      startComparison(leftPath, rightPath)
    } else {
      const { clearComparison } = useDirectoryCompareStore.getState()
      clearComparison()
    }
    const { reset: resetMerge } = useMergeStore.getState()
    resetMerge()
  },

  addMergeTab: () => {
    const { activeIndex, tabs } = get()
    const currentTab = tabs[activeIndex]
    if (currentTab?.isDirectoryView) {
      get().saveCurrentDirectoryState()
    }
    if (currentTab?.isMergeView) {
      get().saveCurrentMergeState()
    }

    const newTab: TabInfo = {
      id: generateSessionId(),
      title: '三路合并',
      leftFile: null,
      rightFile: null,
      diffResult: null,
      hasChanges: false,
      isDirty: false,
      isMergeView: true
    }
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeIndex: state.tabs.length
    }))
    const { reset: resetDiff, setViewMode } = useDiffStore.getState()
    resetDiff()
    setViewMode('merge')
    const { clearComparison } = useDirectoryCompareStore.getState()
    clearComparison()
    const { reset: resetMerge } = useMergeStore.getState()
    resetMerge()
  },

  closeTab: (index) => {
    const { tabs, activeIndex } = get()
    if (tabs.length <= 1) return

    if (index === activeIndex) {
      const currentTab = tabs[activeIndex]
      if (currentTab?.isDirectoryView) {
        get().saveCurrentDirectoryState()
      }
      if (currentTab?.isMergeView) {
        get().saveCurrentMergeState()
      }
    }

    const newTabs = tabs.filter((_, i) => i !== index)
    let newActiveIndex = activeIndex

    if (index <= activeIndex) {
      newActiveIndex = Math.max(0, activeIndex - 1)
    }

    if (newActiveIndex >= newTabs.length) {
      newActiveIndex = newTabs.length - 1
    }

    set({ tabs: newTabs, activeIndex: newActiveIndex })

    if (newTabs.length > 0) {
      const newTab = newTabs[newActiveIndex]
      if (newTab?.isDirectoryView) {
        get().restoreDirectoryStateForTab(newActiveIndex)
      } else {
        const { clearComparison } = useDirectoryCompareStore.getState()
        clearComparison()
      }

      if (newTab?.isMergeView) {
        get().restoreMergeStateForTab(newActiveIndex)
      } else {
        const { reset: resetMerge } = useMergeStore.getState()
        resetMerge()
      }

      const { setLeftFile, setRightFile, setViewMode } = useDiffStore.getState()
      setLeftFile(newTab.leftFile)
      setRightFile(newTab.rightFile)
      const resolvedMode = newTab.isDirectoryView ? 'directory' : newTab.isMergeView ? 'merge' : 'split'
      setViewMode(resolvedMode)
    }
  },

  selectTab: (index) => {
    const { tabs, activeIndex } = get()
    if (index >= 0 && index < tabs.length && index !== activeIndex) {
      const currentTab = tabs[activeIndex]
      if (currentTab?.isDirectoryView) {
        get().saveCurrentDirectoryState()
      }
      if (currentTab?.isMergeView) {
        get().saveCurrentMergeState()
      }

      set({ activeIndex: index })

      const newTab = tabs[index]
      if (newTab?.isDirectoryView) {
        get().restoreDirectoryStateForTab(index)
      } else {
        const { clearComparison } = useDirectoryCompareStore.getState()
        clearComparison()
      }

      if (newTab?.isMergeView) {
        get().restoreMergeStateForTab(index)
      } else {
        const { reset: resetMerge } = useMergeStore.getState()
        resetMerge()
      }

      const { setLeftFile, setRightFile, setViewMode } = useDiffStore.getState()
      if (newTab) {
        setLeftFile(newTab.leftFile)
        setRightFile(newTab.rightFile)
        const resolvedMode = newTab.isDirectoryView ? 'directory' : newTab.isMergeView ? 'merge' : 'split'
        setViewMode(resolvedMode)
      }
    }
  },

  updateTab: (index, updates) => {
    set((state) => ({
      tabs: state.tabs.map((tab, i) =>
        i === index ? { ...tab, ...updates } : tab
      )
    }))
  },

  updateTabTitle: (index, title) => {
    set((state) => ({
      tabs: state.tabs.map((tab, i) =>
        i === index ? { ...tab, title } : tab
      )
    }))
  },

  setActiveTabFiles: (left, right) => {
    const { activeIndex, tabs } = get()
    const leftName = left?.path?.split('/').pop() || left?.path?.split('\\').pop() || ''
    const rightName = right?.path?.split('/').pop() || right?.path?.split('\\').pop() || ''
    
    const title = left && right 
      ? `${leftName} vs ${rightName}` 
      : left ? `${leftName}` 
      : right ? `${rightName}`
      : '新对比'

    set({
      tabs: tabs.map((tab, i) =>
        i === activeIndex 
          ? { ...tab, leftFile: left, rightFile: right, title, hasChanges: true }
          : tab
      )
    })

    // 同步更新 diff store，与 selectTab/closeTab 保持一致
    const { setLeftFile, setRightFile } = useDiffStore.getState()
    setLeftFile(left)
    setRightFile(right)
  },

  setActiveTabDiffResult: (result) => {
    const { activeIndex, tabs } = get()
    set({
      tabs: tabs.map((tab, i) =>
        i === activeIndex
          ? { ...tab, diffResult: result }
          : tab
      )
    })
  },

  setActiveTabDirectoryComparison: (comparison) => {
    const { activeIndex, tabs } = get()
    set({
      tabs: tabs.map((tab, i) =>
        i === activeIndex
          ? { ...tab, directoryComparison: comparison, isDirectoryView: true }
          : tab
      )
    })
  },

  setActiveTabDirectories: (leftDir, rightDir) => {
    const { activeIndex, tabs } = get()
    const leftName = leftDir?.name || leftDir?.path?.split('/').pop() || leftDir?.path?.split('\\').pop() || ''
    const rightName = rightDir?.name || rightDir?.path?.split('/').pop() || rightDir?.path?.split('\\').pop() || ''
    const title = leftDir && rightDir
      ? `${leftName} vs ${rightName}`
      : leftDir ? `${leftName}`
      : rightDir ? `${rightName}`
      : '新对比'

    set({
      tabs: tabs.map((tab, i) =>
        i === activeIndex
          ? { ...tab, leftDirectory: leftDir, rightDirectory: rightDir, title, isDirectoryView: true }
          : tab
      )
    })
  },

  updateActiveTabDirViewMode: (mode) => {
    const { activeIndex, tabs } = get()
    set({
      tabs: tabs.map((tab, i) =>
        i === activeIndex
          ? { ...tab, dirViewMode: mode }
          : tab
      )
    })
  },

  updateActiveTabExpandedPaths: (paths) => {
    const { activeIndex, tabs } = get()
    set({
      tabs: tabs.map((tab, i) =>
        i === activeIndex
          ? { ...tab, expandedPaths: paths }
          : tab
      )
    })
  },

  saveCurrentDirectoryState: () => {
    const { activeIndex } = get()
    const dirStore = useDirectoryCompareStore.getState()

    if (!dirStore.comparison) return

    // 保存当前目录对比状态到 active tab
    get().updateTab(activeIndex, {
      directoryComparison: dirStore.comparison,
      leftDirectory: dirStore.comparison.leftRoot,
      rightDirectory: dirStore.comparison.rightRoot,
      expandedPaths: Array.from(dirStore.expandedPaths),
      dirViewMode: dirStore.viewMode,
      isDirectoryView: true
    })
  },

  restoreDirectoryStateForTab: (index) => {
    const { tabs } = get()
    const tab = tabs[index]
    if (!tab || !tab.isDirectoryView) return

    const dirStore = useDirectoryCompareStore.getState()

    // 恢复目录对比状态
    if (tab.directoryComparison) {
      dirStore.setComparison(tab.directoryComparison)
    } else if (tab.leftDirectory && tab.rightDirectory) {
      // 如果有目录信息但没有对比结果，启动新的对比
      dirStore.startComparison(tab.leftDirectory.path, tab.rightDirectory.path)
    } else {
      // 清空目录对比状态
      dirStore.clearComparison()
    }

    // 恢复展开状态
    if (tab.expandedPaths) {
      dirStore.setExpandedPaths(tab.expandedPaths)
    }

    // 恢复视图模式
    if (tab.dirViewMode) {
      dirStore.setViewMode(tab.dirViewMode)
    }
  },

  saveCurrentMergeState: () => {
    const { activeIndex } = get()
    const mergeStore = useMergeStore.getState()

    if (!mergeStore.baseFile) return

    get().updateTab(activeIndex, {
      baseFile: mergeStore.baseFile,
      leftFile: mergeStore.leftFile,
      rightFile: mergeStore.rightFile,
      mergeResult: mergeStore.mergeResult,
      mergeResolutions: Array.from(mergeStore.resolutions.entries()).map(([k, v]) => [
        k,
        v.type === 'manual' ? { type: v.type, content: v.content } : { type: v.type }
      ]),
      activeConflictIndex: mergeStore.activeConflictIndex,
      isMergeView: true
    })
  },

  restoreMergeStateForTab: (index) => {
    const { tabs } = get()
    const tab = tabs[index]
    if (!tab || !tab.isMergeView) return

    const mergeStore = useMergeStore.getState()
    mergeStore.setBaseFile(tab.baseFile ?? null)
    mergeStore.setLeftFile(tab.leftFile ?? null)
    mergeStore.setRightFile(tab.rightFile ?? null)
    mergeStore.setMergeResult(tab.mergeResult ?? null)
    if (tab.activeConflictIndex != null) {
      mergeStore.setActiveConflictIndex(tab.activeConflictIndex)
    }
    if (tab.mergeResolutions) {
      const resolutions = new Map()
      for (const [k, v] of tab.mergeResolutions) {
        if (v.type === 'manual') {
          resolutions.set(k, { type: 'manual' as const, content: v.content ?? '' })
        } else {
          resolutions.set(k, { type: v.type as 'base' | 'left' | 'right' })
        }
      }
      useMergeStore.setState({ resolutions })
    }
  },

  swapActiveTabFiles: () => {
    const { activeIndex, tabs } = get()
    const activeTab = tabs[activeIndex]
    if (!activeTab) return

    const { leftFile, rightFile } = activeTab
    const leftName = rightFile?.path?.split('/').pop() || rightFile?.path?.split('\\').pop() || ''
    const rightName = leftFile?.path?.split('/').pop() || leftFile?.path?.split('\\').pop() || ''
    
    const title = leftFile && rightFile 
      ? `${leftName} vs ${rightName}` 
      : leftFile ? `${leftName}` 
      : rightFile ? `${rightName}`
      : '新对比'

    set({
      tabs: tabs.map((tab, i) =>
        i === activeIndex 
          ? { ...tab, leftFile: rightFile, rightFile: leftFile, title, hasChanges: true }
          : tab
      )
    })
  },

  updateActiveTabContent: (side, content) => {
    const { activeIndex, tabs } = get()
    const activeTab = tabs[activeIndex]
    if (!activeTab) return

    const fileKey = side === 'left' ? 'leftFile' : 'rightFile'
    const currentFile = activeTab[fileKey]
    if (!currentFile) return

    // 检查内容是否真的变化了
    if (currentFile.content === content) return

    set({
      tabs: tabs.map((tab, i) =>
        i === activeIndex 
          ? { 
              ...tab, 
              [fileKey]: { ...currentFile, content },
              hasChanges: true,
              isDirty: true
            }
          : tab
      )
    })
  },

  markActiveTabAsSaved: () => {
    const { activeIndex, tabs } = get()
    set({
      tabs: tabs.map((tab, i) =>
        i === activeIndex 
          ? { ...tab, hasChanges: false, isDirty: false }
          : tab
      )
    })
  },

  markTabAsSaved: (index: number) => {
    const { tabs } = get()
    set({
      tabs: tabs.map((tab, i) =>
        i === index 
          ? { ...tab, hasChanges: false, isDirty: false }
          : tab
      )
    })
  },

  markTabAsNotDirty: (index: number) => {
    const { tabs } = get()
    set({
      tabs: tabs.map((tab, i) =>
        i === index 
          ? { ...tab, isDirty: false }
          : tab
      )
    })
  },

  getDirtyTabs: () => {
    const { tabs } = get()
    return tabs
      .map((tab, index) => ({ index, tab }))
      .filter(({ tab }) => tab.isDirty && !tab.isDirectoryView && (tab.leftFile?.path || tab.rightFile?.path))
  }
}))
