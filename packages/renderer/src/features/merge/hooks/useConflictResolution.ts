import { useCallback } from 'react'
import { useMergeStore, type Resolution } from '../stores/merge.store'
import type { ConflictRegion } from '@shared/types'

export function useConflictResolution() {
  const { mergeResult, resolutions, resolveConflict, activeConflictIndex, setActiveConflictIndex } = useMergeStore()

  const conflicts = mergeResult?.conflicts ?? []

  const resolveWithBase = useCallback((conflictId: string) => {
    resolveConflict(conflictId, { type: 'base' })
  }, [resolveConflict])

  const resolveWithLeft = useCallback((conflictId: string) => {
    resolveConflict(conflictId, { type: 'left' })
  }, [resolveConflict])

  const resolveWithRight = useCallback((conflictId: string) => {
    resolveConflict(conflictId, { type: 'right' })
  }, [resolveConflict])

  const resolveManual = useCallback((conflictId: string, content: string) => {
    resolveConflict(conflictId, { type: 'manual', content })
  }, [resolveConflict])

  const getResolution = useCallback((conflictId: string): Resolution | undefined => {
    return resolutions.get(conflictId)
  }, [resolutions])

  const isResolved = useCallback((conflictId: string): boolean => {
    return resolutions.has(conflictId)
  }, [resolutions])

  const selectConflict = useCallback((index: number) => {
    setActiveConflictIndex(index)
  }, [setActiveConflictIndex])

  const activeConflict: ConflictRegion | null = conflicts[activeConflictIndex] ?? null

  return {
    conflicts,
    activeConflict,
    activeConflictIndex,
    resolutions,
    resolveWithBase,
    resolveWithLeft,
    resolveWithRight,
    resolveManual,
    getResolution,
    isResolved,
    selectConflict
  }
}
