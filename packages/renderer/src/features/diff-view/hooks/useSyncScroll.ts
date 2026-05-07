import { useRef, useCallback, useEffect } from 'react'
import type * as monaco from 'monaco-editor'

/**
 * Monaco Editor 同步滚动 Hook
 * 
 * §2.4.2 同步滚动 - hooks/useSyncScroll.ts
 * 监听 Monaco editor 的 onDidScrollChange 事件
 * 
 * 注意：Monaco DiffEditor 已内置同步滚动功能，此 hook 用于自定义扩展
 */

interface UseSyncScrollOptions {
  enabled?: boolean
  onScroll?: (scrollTop: number) => void
}

export function useSyncScroll(
  editorRef: React.RefObject<monaco.editor.IStandaloneDiffEditor | null>,
  options: UseSyncScrollOptions = {}
) {
  const { enabled = true, onScroll } = options
  const isScrolling = useRef(false)
  const lastScrollTop = useRef(0)

  const handleScroll = useCallback((scrollTop: number) => {
    if (!enabled || isScrolling.current) return

    isScrolling.current = true
    lastScrollTop.current = scrollTop

    if (onScroll) {
      onScroll(scrollTop)
    }

    requestAnimationFrame(() => {
      isScrolling.current = false
    })
  }, [enabled, onScroll])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !enabled) return

    const originalEditor = editor.getOriginalEditor()
    const modifiedEditor = editor.getModifiedEditor()

    // 监听原始编辑器的滚动
    const originalDisposable = originalEditor.onDidScrollChange((e) => {
      handleScroll(e.scrollTop)
    })

    // 监听修改编辑器的滚动
    const modifiedDisposable = modifiedEditor.onDidScrollChange((e) => {
      handleScroll(e.scrollTop)
    })

    return () => {
      originalDisposable.dispose()
      modifiedDisposable.dispose()
    }
  }, [editorRef, enabled, handleScroll])

  /**
   * 滚动到指定位置
   */
  const scrollToPosition = useCallback((lineNumber: number, column: number = 1) => {
    const editor = editorRef.current
    if (!editor) return

    const originalEditor = editor.getOriginalEditor()
    originalEditor.revealLineInCenter(lineNumber)
    originalEditor.setPosition({ lineNumber, column })
  }, [editorRef])

  /**
   * 获取当前滚动位置
   */
  const getScrollPosition = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return { scrollTop: 0, scrollLeft: 0 }

    const originalEditor = editor.getOriginalEditor()
    return {
      scrollTop: originalEditor.getScrollTop(),
      scrollLeft: originalEditor.getScrollLeft()
    }
  }, [editorRef])

  return {
    scrollToPosition,
    getScrollPosition,
    isScrolling: isScrolling.current,
    lastScrollTop: lastScrollTop.current
  }
}

/**
 * 使用比例同步滚动（用于 Minimap 等组件）
 */
export function useProportionalScroll(
  totalLines: number,
  _visibleLines: number,
  onScrollToLine?: (lineNumber: number) => void
) {
  const scrollToRatio = useCallback((ratio: number) => {
    if (totalLines <= 0) return

    const targetLine = Math.max(1, Math.min(
      Math.floor(ratio * totalLines),
      totalLines
    ))

    if (onScrollToLine) {
      onScrollToLine(targetLine)
    }
  }, [totalLines, onScrollToLine])

  const getCurrentRatio = useCallback((currentLine: number) => {
    if (totalLines <= 0) return 0
    return currentLine / totalLines
  }, [totalLines])

  return {
    scrollToRatio,
    getCurrentRatio
  }
}
