import { useCallback, useEffect } from 'react'
import { useHistoryStore, useTabStore, setupHistoryKeyboardHandlers } from '@renderer/stores'

export interface UseUndoRedoOptions {
  onStateRestored?: () => void
}

export interface UseUndoRedoReturn {
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

export function useUndoRedo({ onStateRestored }: UseUndoRedoOptions = {}): UseUndoRedoReturn {
  const undo = useHistoryStore((s) => s.undo)
  const redo = useHistoryStore((s) => s.redo)
  const canUndo = useHistoryStore((s) => s.currentIndex >= 0)
  const canRedo = useHistoryStore((s) => s.currentIndex < s.entries.length - 1)
  const { updateActiveTabContent } = useTabStore()

  const handleUndo = useCallback(() => {
    const state = undo()
    if (state) {
      updateActiveTabContent('left', state.leftContent)
      updateActiveTabContent('right', state.rightContent)
      onStateRestored?.()
    }
  }, [undo, updateActiveTabContent, onStateRestored])

  const handleRedo = useCallback(() => {
    const state = redo()
    if (state) {
      updateActiveTabContent('left', state.leftContent)
      updateActiveTabContent('right', state.rightContent)
      onStateRestored?.()
    }
  }, [redo, updateActiveTabContent, onStateRestored])

  useEffect(() => {
    const cleanup = setupHistoryKeyboardHandlers(handleUndo, handleRedo)
    return cleanup
  }, [handleUndo, handleRedo])

  return {
    undo: handleUndo,
    redo: handleRedo,
    canUndo,
    canRedo
  }
}
