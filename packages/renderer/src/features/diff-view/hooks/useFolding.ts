import { useCallback, useRef, useEffect } from 'react'
import * as monaco from 'monaco-editor'
import type { DiffResult } from '@shared/types'

/**
 * §2.4.4 折叠相同区域 Hook
 *
 * 使用 Monaco Editor 的 `hideUnchangedRegions` 选项折叠 diff 中相同的区域。
 * Monaco 0.55+ 原生支持此功能，自带折叠占位符（显示 "N hidden lines"）。
 *
 * 关键问题：当文件完全相同时，Monaco 不会触发 onDidUpdateDiff 事件，
 * 且 hideUnchangedRegions 可能不会立即生效。
 *
 * 解决方案：
 * 1. 在 diffResult 变化后多次尝试应用折叠设置
 * 2. 使用递增的延迟时间来确保 Monaco 完成内部初始化
 * 3. 尝试使用 Monaco 命令触发折叠
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

  const applyFolding = useCallback((force = false) => {
    const editor = editorRef.current
    if (!editor) return

    const enabled = isCollapsedRef.current

    // 如果不是强制模式且状态已应用，则跳过
    if (!force && appliedRef.current === enabled) return

    try {
      // 应用 Monaco 的原生折叠
      editor.updateOptions({
        hideUnchangedRegions: {
          enabled,
          revealLineCount: 3,
          minimumLineCount: 0,
          contextLineCount: 0
        }
      })

      appliedRef.current = enabled
    } catch (error) {
      console.warn('[useFolding] Error applying folding:', error)
    }
  }, [editorRef])

  // 当 isCollapsed 状态变化时应用折叠
  useEffect(() => {
    applyFolding()
  }, [isCollapsed, applyFolding])

  // 当 diffResult 变化时，重置并重新应用折叠
  useEffect(() => {
    if (!diffResult) return

    // 重置应用状态
    appliedRef.current = null

    // §修复：文件完全相同时，Monaco 不会触发 onDidUpdateDiff
    // 需要使用多个延迟时间点来尝试应用折叠
    const delays = [50, 150, 300, 500, 800, 1200]
    const timers: ReturnType<typeof setTimeout>[] = []

    delays.forEach(delay => {
      timers.push(setTimeout(() => applyFolding(true), delay))
    })

    return () => timers.forEach(clearTimeout)
  }, [diffResult, applyFolding])

  // 监听 Monaco 的 diff 更新事件
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const disposable = editor.onDidUpdateDiff(() => {
      appliedRef.current = null
      applyFolding()
    })

    return () => disposable.dispose()
  }, [editorRef, applyFolding])

  // 暴露更新折叠的方法
  return { updateFolding: () => applyFolding(true) }
}
