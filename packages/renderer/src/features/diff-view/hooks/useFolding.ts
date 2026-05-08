import { useCallback, useRef, useEffect } from 'react'
import * as monaco from 'monaco-editor'
import type { DiffResult } from '@shared/types'

/**
 * §2.4.4 折叠相同区域 Hook
 *
 * 使用 Monaco Editor 的 `hideUnchangedRegions` 选项折叠 diff 中相同的区域。
 * Monaco 0.55+ 原生支持此功能，自带折叠占位符（显示 "N hidden lines"）。
 *
 * 关键：Monaco 的 hideUnchangedRegions 在 _unchangedRegions 计算后才会生效，
 * _unchangedRegions 在内部 diff 计算完成时更新。所以需要：
 * 1. 初始化时就设置 enabled: true（确保 _unchangedRegions 被计算）
 * 2. 通过 contextLineCount: 0 让最少上下文为 0，使更多区域可折叠
 * 3. 通过 minimumLineCount: 0 让折叠阈值最低
 */
export function useFolding(
  editorRef: React.RefObject<monaco.editor.IStandaloneDiffEditor | null>,
  diffResult: DiffResult | null,
  isCollapsed: boolean,
  _isLargeFile: boolean
) {
  const isCollapsedRef = useRef(isCollapsed)
  const appliedRef = useRef<boolean | null>(null)

  useEffect(() => {
    isCollapsedRef.current = isCollapsed
  }, [isCollapsed])

  const applyFolding = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return

    const enabled = isCollapsedRef.current
    if (appliedRef.current === enabled) return
    appliedRef.current = enabled

    try {
      editor.updateOptions({
        hideUnchangedRegions: {
          enabled,
          revealLineCount: 3,
          minimumLineCount: 0,
          contextLineCount: 0
        }
      })
    } catch (error) {
      console.warn('[useFolding] Error applying folding:', error)
    }
  }, [editorRef])

  useEffect(() => {
    applyFolding()
  }, [isCollapsed, applyFolding])

  useEffect(() => {
    if (!diffResult) return
    appliedRef.current = null
    const timer = setTimeout(() => {
      applyFolding()
    }, 200)
    return () => clearTimeout(timer)
  }, [diffResult, applyFolding])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const disposable = editor.onDidUpdateDiff(() => {
      appliedRef.current = null
      applyFolding()
    })
    return () => disposable.dispose()
  }, [editorRef, applyFolding])

  return { updateFolding: applyFolding }
}
