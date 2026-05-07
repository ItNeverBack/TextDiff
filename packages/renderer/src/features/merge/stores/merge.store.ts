import type { FileInfo, ThreeWayDiffResult } from '@shared/types'
import { create } from 'zustand'
import { api } from '../../../lib/api'

export type Resolution =
  | { type: 'base' }
  | { type: 'left' }
  | { type: 'right' }
  | { type: 'manual'; content: string }

interface MergeState {
  baseFile: FileInfo | null
  leftFile: FileInfo | null
  rightFile: FileInfo | null
  mergeResult: ThreeWayDiffResult | null
  isComputing: boolean
  activeConflictIndex: number
  resolutions: Map<string, Resolution>
  resultContent: string | null
}

interface MergeActions {
  setBaseFile: (file: FileInfo | null) => void
  setLeftFile: (file: FileInfo | null) => void
  setRightFile: (file: FileInfo | null) => void
  setMergeResult: (result: ThreeWayDiffResult | null) => void
  setIsComputing: (computing: boolean) => void
  setActiveConflictIndex: (index: number) => void
  resolveConflict: (conflictId: string, resolution: Resolution) => void
  nextConflict: () => void
  prevConflict: () => void
  computeMerge: () => Promise<void>
  buildResult: () => string
  reset: () => void
}

const initialState: MergeState = {
  baseFile: null,
  leftFile: null,
  rightFile: null,
  mergeResult: null,
  isComputing: false,
  activeConflictIndex: 0,
  resolutions: new Map(),
  resultContent: null
}

export const useMergeStore = create<MergeState & MergeActions>((set, get) => ({
  ...initialState,

  setBaseFile: (file) => set({ baseFile: file }),
  setLeftFile: (file) => set({ leftFile: file }),
  setRightFile: (file) => set({ rightFile: file }),
  setMergeResult: (result) => set({ mergeResult: result }),
  setIsComputing: (computing) => set({ isComputing: computing }),
  setActiveConflictIndex: (index) => set({ activeConflictIndex: index }),

  resolveConflict: (conflictId, resolution) => {
    const { resolutions } = get()
    const newResolutions = new Map(resolutions)
    newResolutions.set(conflictId, resolution)
    set({ resolutions: newResolutions })
  },

  nextConflict: () => {
    const { mergeResult, activeConflictIndex } = get()
    if (!mergeResult) return
    const next = Math.min(activeConflictIndex + 1, mergeResult.conflicts.length - 1)
    set({ activeConflictIndex: next })
  },

  prevConflict: () => {
    const { activeConflictIndex } = get()
    const prev = Math.max(activeConflictIndex - 1, 0)
    set({ activeConflictIndex: prev })
  },

  computeMerge: async () => {
    const { baseFile, leftFile, rightFile, setIsComputing, setMergeResult } = get()
    if (!baseFile || !leftFile || !rightFile) return

    setIsComputing(true)
    try {
      const result = await api.computeThreeWayDiff(baseFile, leftFile, rightFile)
      setMergeResult(result)
      set({ resolutions: new Map(), activeConflictIndex: 0, resultContent: null })
    } catch (error) {
      console.error('Failed to compute three-way diff:', error)
    } finally {
      setIsComputing(false)
    }
  },

  buildResult: () => {
    const { mergeResult, resolutions } = get()
    if (!mergeResult) return ''

    // 建立冲突内容 → ConflictRegion 的快速查找（用 leftContent+rightContent 作复合 key）
    const conflictByContent = new Map(
      mergeResult.conflicts.map(c => [`${c.leftContent}\0${c.rightContent}`, c])
    )

    const lines: string[] = []

    for (const line of mergeResult.lines) {
      if (line.type === 'equal') {
        lines.push(line.leftContent)
      } else if (line.type === 'insert') {
        // 自动合并的单侧插入行，直接输出
        lines.push(line.rightContent)
      } else if (line.type === 'delete') {
        // 自动合并的单侧删除行，跳过
      } else if (line.type === 'replace') {
        const conflictKey = `${line.leftContent}\0${line.rightContent}`
        const conflict = conflictByContent.get(conflictKey)
        if (conflict) {
          // 冲突行：根据 resolution 决定输出内容
          const resolution = resolutions.get(conflict.id)
          if (resolution) {
            if (resolution.type === 'base') lines.push(conflict.baseContent)
            else if (resolution.type === 'left') lines.push(conflict.leftContent)
            else if (resolution.type === 'right') lines.push(conflict.rightContent)
            else if (resolution.type === 'manual') lines.push(resolution.content)
          } else {
            // 未解决的冲突，保留冲突标记
            lines.push(`<<<<<<< LEFT`)
            lines.push(conflict.leftContent)
            lines.push(`=======`)
            lines.push(conflict.rightContent)
            lines.push(`>>>>>>> RIGHT`)
          }
        } else {
          // 非冲突的 replace（单侧自动合并），输出右侧内容
          lines.push(line.rightContent)
        }
      }
    }

    const result = lines.join('\n')
    set({ resultContent: result })
    return result
  },

  reset: () => set({ ...initialState, resolutions: new Map() })
}))
