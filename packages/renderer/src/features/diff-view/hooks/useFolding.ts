import { useCallback, useRef, useEffect } from 'react'
import * as monaco from 'monaco-editor'
import type { DiffResult } from '@shared/types'

/**
 * §2.4.4 折叠相同区域 Hook - 优化版本
 *
 * 大文件优化策略：仅处理可视区域的折叠
 * 而不是遍历所有 DiffLine[]，这样可以在大文件时保持良好的性能
 *
 * @param editorRef Monaco Diff Editor 引用
 * @param diffResult 差异结果
 * @param isCollapsed 是否折叠
 * @param isLargeFile 是否大文件（大文件使用优化策略）
 */
export function useFolding(
  editorRef: React.RefObject<monaco.editor.IStandaloneDiffEditor | null>,
  diffResult: DiffResult | null,
  isCollapsed: boolean,
  isLargeFile: boolean
) {
  const foldDecorationsRef = useRef<{ original: string[]; modified: string[] }>({
    original: [],
    modified: []
  })
  const visibleRangeRef = useRef<{ start: number; end: number }>({ start: 1, end: 100 })
  const scrollDisposableRef = useRef<monaco.IDisposable | null>(null)

  /**
   * 获取当前可视区域的行范围
   * 使用 editor.getVisibleRanges() 获取实际可视区域
   */
  const getVisibleRange = useCallback((): { start: number; end: number } | null => {
    const editor = editorRef.current
    if (!editor) return null

    const originalEditor = editor.getOriginalEditor()
    const visibleRanges = originalEditor.getVisibleRanges()

    if (!visibleRanges || visibleRanges.length === 0) return null

    // 获取第一个可见范围（通常是主视口）
    const range = visibleRanges[0]
    const buffer = isLargeFile ? 50 : 100 // 大文件使用更小的缓冲区

    return {
      start: Math.max(1, range.startLineNumber - buffer),
      end: range.endLineNumber + buffer
    }
  }, [editorRef, isLargeFile])

  /**
   * 获取所有可折叠区域（基于 diff chunks）
   * 使用 chunks 而不是遍历所有 lines，性能更好
   */
  const getFoldableRegions = useCallback((): Array<{
    startLine: number
    endLine: number
    isVisible: boolean
  }> => {
    if (!diffResult || !diffResult.chunks || diffResult.chunks.length === 0) return []

    const regions: Array<{ startLine: number; endLine: number; isVisible: boolean }> = []
    const visibleRange = visibleRangeRef.current

    let lastChunkEnd = 0

    for (const chunk of diffResult.chunks) {
      // 两个 chunk 之间的区域是相同的（equal）
      if (lastChunkEnd > 0 && chunk.startIndex > lastChunkEnd + 1) {
        const foldStart = lastChunkEnd + 1
        const foldEnd = chunk.startIndex
        const lineCount = foldEnd - foldStart + 1

        // 只处理足够大的区域（>6 行，保留前后 3 行上下文）
        if (lineCount > 6) {
          // 检查是否与可视区域重叠
          const isVisible = !(
            foldEnd < visibleRange.start || foldStart > visibleRange.end
          )

          regions.push({
            startLine: foldStart + 3, // 跳过前 3 行上下文
            endLine: foldEnd - 3, // 排除后 3 行上下文
            isVisible
          })
        }
      }
      lastChunkEnd = chunk.endIndex
    }

    // 处理最后一个 chunk 之后的区域
    if (diffResult.lines && lastChunkEnd < diffResult.lines.length) {
      const foldStart = lastChunkEnd + 1
      const foldEnd = diffResult.lines.length
      const lineCount = foldEnd - foldStart + 1

      if (lineCount > 6) {
        const isVisible = !(
          foldEnd < visibleRange.start || foldStart > visibleRange.end
        )

        regions.push({
          startLine: foldStart + 3,
          endLine: foldEnd - 3,
          isVisible
        })
      }
    }

    return regions
  }, [diffResult])

  /**
   * §2.4.4 折叠相同区域 - 优化版本
   * 仅处理可视区域，大文件也能保持流畅
   */
  const updateFolding = useCallback(() => {
    const editor = editorRef.current
    if (!editor || !diffResult) return

    const originalEditor = editor.getOriginalEditor()
    const modifiedEditor = editor.getModifiedEditor()
    const originalModel = originalEditor.getModel()
    const modifiedModel = modifiedEditor.getModel()

    if (!originalModel || !modifiedModel) return

    // 更新可视范围
    const visibleRange = getVisibleRange()
    if (visibleRange) {
      visibleRangeRef.current = visibleRange
    }

    if (isCollapsed) {
      const regions = getFoldableRegions()

      // 只处理可视区域内的折叠（大文件优化）
      const visibleRegions = isLargeFile
        ? regions.filter((r) => r.isVisible)
        : regions

      if (visibleRegions.length === 0) return

      // 创建折叠装饰器
      const decorationOptions: monaco.editor.IModelDecorationOptions = {
        isWholeLine: true,
        className: 'folded-region',
        linesDecorationsClassName: 'folded-region-glyph',
        overviewRuler: {
          color: '#888888',
          position: monaco.editor.OverviewRulerLane.Full
        }
      }

      const originalDecorations = visibleRegions.map((region) => ({
        range: {
          startLineNumber: region.startLine,
          startColumn: 1,
          endLineNumber: region.endLine,
          endColumn: 1
        } as monaco.IRange,
        options: decorationOptions
      }))

      const modifiedDecorations = visibleRegions.map((region) => ({
        range: {
          startLineNumber: region.startLine,
          startColumn: 1,
          endLineNumber: region.endLine,
          endColumn: 1
        } as monaco.IRange,
        options: decorationOptions
      }))

      // 应用装饰器
      foldDecorationsRef.current.original = originalEditor.deltaDecorations(
        foldDecorationsRef.current.original,
        originalDecorations
      )
      foldDecorationsRef.current.modified = modifiedEditor.deltaDecorations(
        foldDecorationsRef.current.modified,
        modifiedDecorations
      )

      // 触发 Monaco 内置折叠命令
      visibleRegions.forEach((region) => {
        originalEditor.trigger('fold', 'editor.fold', {
          selectionLines: [region.startLine]
        })
        modifiedEditor.trigger('fold', 'editor.fold', {
          selectionLines: [region.startLine]
        })
      })
    } else {
      // 展开所有 - 清除装饰器并触发展开命令
      foldDecorationsRef.current.original = originalEditor.deltaDecorations(
        foldDecorationsRef.current.original,
        []
      )
      foldDecorationsRef.current.modified = modifiedEditor.deltaDecorations(
        foldDecorationsRef.current.modified,
        []
      )

      // 触发展开所有命令
      editor.trigger('unfold', 'editor.unfoldAll', null)
    }
  }, [editorRef, diffResult, isCollapsed, isLargeFile, getVisibleRange, getFoldableRegions])

  /**
   * 监听滚动事件，动态更新可视区域的折叠
   * 大文件时使用节流优化性能
   */
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !isCollapsed || !diffResult) return

    const originalEditor = editor.getOriginalEditor()

    // 滚动时更新折叠（节流）
    let throttleTimer: ReturnType<typeof setTimeout> | null = null

    const handleScroll = () => {
      if (throttleTimer) return

      throttleTimer = setTimeout(() => {
        const newRange = getVisibleRange()
        if (newRange) {
          const oldRange = visibleRangeRef.current
          // 只有滚动足够远时才更新
          if (
            Math.abs(newRange.start - oldRange.start) > 50 ||
            Math.abs(newRange.end - oldRange.end) > 50
          ) {
            updateFolding()
          }
        }
        throttleTimer = null
      }, isLargeFile ? 300 : 150) // 大文件使用更长的节流时间
    }

    scrollDisposableRef.current = originalEditor.onDidScrollChange(handleScroll)

    return () => {
      scrollDisposableRef.current?.dispose()
      if (throttleTimer) clearTimeout(throttleTimer)
    }
  }, [editorRef, isCollapsed, diffResult, isLargeFile, getVisibleRange, updateFolding])

  return { updateFolding }
}
