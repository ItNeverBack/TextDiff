import { useCallback, useEffect } from 'react'
import { useHistoryStore, useTabStore, setupHistoryKeyboardHandlers } from '@renderer/stores'

export interface UseUndoRedoOptions {
  onStateRestored?: () => void
}

export interface UseUndoRedoReturn {
  /** 撤销 */
  undo: () => void
  /** 重做 */
  redo: () => void
  /** 是否可以撤销 */
  canUndo: boolean
  /** 是否可以重做 */
  canRedo: boolean
}

/**
 * 撤销/重做 Hook
 * 
 * 功能：
 * - 管理撤销/重做状态
 * - 自动设置键盘快捷键监听（Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z）
 * - 恢复状态时更新当前标签页的内容
 */
export function useUndoRedo({ onStateRestored }: UseUndoRedoOptions = {}): UseUndoRedoReturn {
  const { undo, redo, canUndo: historyCanUndo, canRedo: historyCanRedo } = useHistoryStore()
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

  // 设置键盘快捷键监听
  useEffect(() => {
    const cleanup = setupHistoryKeyboardHandlers(handleUndo, handleRedo)
    return cleanup
  }, [handleUndo, handleRedo])

  return {
    undo: handleUndo,
    redo: handleRedo,
    canUndo: historyCanUndo(),
    canRedo: historyCanRedo()
  }
}
