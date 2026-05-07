import type { FileInfo, DiffOptions, DiffResult, ViewMode } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'
import { create } from 'zustand'
import { api } from '../lib/api'

interface DiffState {
  leftFile: FileInfo | null
  rightFile: FileInfo | null
  diffResult: DiffResult | null
  options: DiffOptions
  viewMode: ViewMode
  isComputing: boolean
  activeChunkIndex: number
  isCollapsed: boolean
  scrollSyncEnabled: boolean
  computeTime: number
}

interface DiffActions {
  setLeftFile: (file: FileInfo | null) => void
  setRightFile: (file: FileInfo | null) => void
  setOptions: (options: Partial<DiffOptions>) => void
  setViewMode: (mode: ViewMode) => void
  setDiffResult: (result: DiffResult | null) => void
  setIsComputing: (computing: boolean) => void
  navigateToChunk: (index: number) => void
  nextChunk: () => void
  prevChunk: () => void
  firstChunk: () => void
  lastChunk: () => void
  toggleCollapse: () => void
  toggleScrollSync: () => void
  swapFiles: () => void
  reset: () => void
}

const defaultOptions: DiffOptions = {
  ignoreWhitespace: DEFAULT_SETTINGS.diff.defaultIgnoreWhitespace,
  ignoreCase: DEFAULT_SETTINGS.diff.defaultIgnoreCase,
  ignoreLineEndings: DEFAULT_SETTINGS.diff.defaultIgnoreLineEndings,
  ignorePatterns: [],
  ignoreComments: DEFAULT_SETTINGS.diff.defaultIgnoreComments,
  commentPrefixes: DEFAULT_SETTINGS.diff.defaultCommentPrefixes,
  algorithm: DEFAULT_SETTINGS.diff.defaultAlgorithm,
  contextLines: DEFAULT_SETTINGS.diff.contextLines
}

const initialState: DiffState = {
  leftFile: null,
  rightFile: null,
  diffResult: null,
  options: defaultOptions,
  viewMode: 'split',
  isComputing: false,
  activeChunkIndex: -1,  // 初始值为 -1，表示没有选中任何 chunk，避免默认高亮
  isCollapsed: DEFAULT_SETTINGS.diff.foldUnchanged,
  scrollSyncEnabled: true,
  computeTime: 0
}

export const useDiffStore = create<DiffState & DiffActions>((set, get) => ({
  ...initialState,

  setLeftFile: (file) => set({ leftFile: file }),
  
  setRightFile: (file) => set({ rightFile: file }),
  
  setOptions: (options) => set((state) => ({
    options: { ...state.options, ...options }
  })),
  
  setViewMode: (mode) => set({ viewMode: mode }),
  
  setDiffResult: (result) => set({ diffResult: result }),
  
  setIsComputing: (computing) => set({ isComputing: computing }),
  
  navigateToChunk: (index) => {
    const { diffResult } = get()
    if (!diffResult || index < 0 || index >= diffResult.chunks.length) return
    set({ activeChunkIndex: index })
  },
  
  nextChunk: () => {
    const { diffResult, activeChunkIndex } = get()
    if (!diffResult) return
    const nextIndex = Math.min(activeChunkIndex + 1, diffResult.chunks.length - 1)
    set({ activeChunkIndex: nextIndex })
  },
  
  prevChunk: () => {
    const { activeChunkIndex } = get()
    const prevIndex = Math.max(activeChunkIndex - 1, 0)
    set({ activeChunkIndex: prevIndex })
  },
  
  firstChunk: () => set({ activeChunkIndex: 0 }),
  
  lastChunk: () => {
    const { diffResult } = get()
    if (!diffResult) return
    set({ activeChunkIndex: diffResult.chunks.length - 1 })
  },
  
  toggleCollapse: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  
  toggleScrollSync: () => set((state) => ({ scrollSyncEnabled: !state.scrollSyncEnabled })),
  
  swapFiles: () => set((state) => ({
    leftFile: state.rightFile,
    rightFile: state.leftFile
  })),

  reset: () => set(initialState)
}))

export function useComputeDiff() {
  const { leftFile, rightFile, options, setDiffResult, setIsComputing } = useDiffStore()

  return async () => {
    // 只有两侧都有文件时才计算 diff
    if (!leftFile || !rightFile) {
      setDiffResult(null)
      return
    }

    setIsComputing(true)

    try {
      const result = await api.computeDiff(leftFile, rightFile, options)
      setDiffResult(result)
    } catch (error) {
      console.error('Failed to compute diff:', error)
    } finally {
      setIsComputing(false)
    }
  }
}
