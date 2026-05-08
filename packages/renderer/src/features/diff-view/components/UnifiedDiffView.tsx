import { useRef, useCallback, useMemo, useState, useEffect } from 'react'
import { useTabStore, useSearchStore, useSettingsStore, useDiffStore } from '@renderer/stores'
import type { DiffLine } from '@shared/types'
import { InlineDiff } from './InlineDiff'
import { FoldedLine } from './FoldedLine'
import { useI18n } from '@renderer/hooks/useI18n'
import './DiffView.css'

const CONTEXT_LINES = 3

const BASE_FONT_SIZE = 13
const BASE_LINE_HEIGHT = 21
const OVERSCAN = 10 // 上下额外渲染的行数

/** 虚拟滚动中的显示项：普通行或折叠占位符 */
type DisplayItem =
  | { kind: 'line'; line: DiffLine; lineIndex: number }
  | { kind: 'folded'; count: number }

/**
 * 统一差异视图中的单行组件
 */
interface UnifiedDiffLineProps {
  line: DiffLine
  style?: React.CSSProperties
  isSearchHighlighted?: boolean
  searchRanges?: Array<{ start: number; end: number }>
}

function UnifiedDiffLine({ line, style, isSearchHighlighted, searchRanges }: UnifiedDiffLineProps) {
  const { t } = useI18n()
  const className = `unified-line ${
    line.type === 'insert' ? 'unified-added' :
    line.type === 'delete' ? 'unified-deleted' :
    line.type === 'replace' ? 'unified-replaced' :
    ''
  } ${isSearchHighlighted ? 'search-highlight-current' : ''}`

  const getGutterSymbol = () => {
    switch (line.type) {
      case 'insert': return '+'
      case 'delete': return '-'
      case 'replace': return '~'
      default: return ' '
    }
  }

  const getGutterTitle = () => {
    switch (line.type) {
      case 'insert': return t('diff.type.insert')
      case 'delete': return t('diff.type.delete')
      case 'replace': return t('diff.type.replace')
      default: return ''
    }
  }

  // §Week 12: 高亮搜索匹配文本
  const renderHighlightedContent = (content: string) => {
    if (!isSearchHighlighted || !searchRanges || searchRanges.length === 0) {
      return content
    }

    // 按位置排序范围
    const sortedRanges = [...searchRanges].sort((a, b) => a.start - b.start)
    const parts: React.ReactNode[] = []
    let lastEnd = 0

    sortedRanges.forEach((range, index) => {
      // 添加匹配前的文本
      if (range.start > lastEnd) {
        parts.push(content.slice(lastEnd, range.start))
      }
      // 添加高亮的匹配文本
      parts.push(
        <mark key={index} className="search-highlight-match">
          {content.slice(range.start, range.end)}
        </mark>
      )
      lastEnd = range.end
    })

    // 添加剩余文本
    if (lastEnd < content.length) {
      parts.push(content.slice(lastEnd))
    }

    return parts
  }

  const renderContent = () => {
    if (line.type === 'replace' && line.inlineDiff) {
      // 在统一视图中，显示修改后的内容（右侧）及其内联差异
      return <InlineDiff segments={line.inlineDiff.right} />
    }

    const content = (line.type === 'delete' ? line.leftContent : line.rightContent) || '\u00A0'

    // §Week 12: 如果有搜索高亮，渲染高亮内容
    if (isSearchHighlighted) {
      return renderHighlightedContent(content)
    }

    return content
  }

  return (
    <div className={className} style={style}>
      <div className="unified-gutter" title={getGutterTitle()}>{getGutterSymbol()}</div>
      <div className="unified-line-nums">
        <span>{line.leftLineNo || ''}</span>
        <span>{line.rightLineNo || ''}</span>
      </div>
      <div className="line-content">{renderContent()}</div>
    </div>
  )
}

/**
 * 统一差异视图（Unified Diff View）- 带虚拟滚动
 *
 * §3.2.2 DiffView 模块 - UnifiedDiffView 组件
 * §2.4.1 大文件虚拟滚动优化
 *
 * 单栏显示，左侧显示 +/- gutter，显示双侧行号
 * 使用虚拟滚动处理大文件
 */
export function UnifiedDiffView() {
  const { tabs, activeIndex } = useTabStore()
  const activeTab = tabs[activeIndex]
  const containerRef = useRef<HTMLDivElement>(null)
  const { t } = useI18n()

  // §Week 12: 搜索高亮状态
  const { highlightedLineIndex, highlightedRanges, matches, currentMatchIndex } = useSearchStore()

  // 折叠状态
  const { isCollapsed, toggleCollapse } = useDiffStore()

  // 字体设置
  const { settings } = useSettingsStore()
  const { fontSize } = settings.editor

  // 根据字体大小计算行高
  const lineHeight = useMemo(() => {
    return (fontSize / BASE_FONT_SIZE) * BASE_LINE_HEIGHT
  }, [fontSize])

  const lines = activeTab?.diffResult?.lines || []
  const stats = activeTab?.diffResult?.stats

  // §2.4.4 折叠处理：将连续的 equal 行折叠为占位符
  const displayItems = useMemo((): DisplayItem[] => {
    if (!isCollapsed) {
      return lines.map((line, i) => ({ kind: 'line' as const, line, lineIndex: i }))
    }

    const result: DisplayItem[] = []
    let foldStart = -1
    let foldCount = 0

    const flushFold = (nextIdx: number) => {
      if (foldStart === -1) return
      if (foldCount > CONTEXT_LINES * 2) {
        // 保留前 CONTEXT_LINES 行
        for (let j = foldStart; j < foldStart + CONTEXT_LINES; j++) {
          result.push({ kind: 'line', line: lines[j], lineIndex: j })
        }
        // 折叠占位符
        result.push({ kind: 'folded', count: foldCount - CONTEXT_LINES * 2 })
        // 保留后 CONTEXT_LINES 行
        for (let j = nextIdx - CONTEXT_LINES; j < nextIdx; j++) {
          result.push({ kind: 'line', line: lines[j], lineIndex: j })
        }
      } else {
        for (let j = foldStart; j < nextIdx; j++) {
          result.push({ kind: 'line', line: lines[j], lineIndex: j })
        }
      }
      foldStart = -1
      foldCount = 0
    }

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].type === 'equal') {
        if (foldStart === -1) foldStart = i
        foldCount++
      } else {
        flushFold(i)
        result.push({ kind: 'line', line: lines[i], lineIndex: i })
      }
    }
    // 处理末尾的 equal 区域
    flushFold(lines.length)

    return result
  }, [lines, isCollapsed])

  // 虚拟滚动状态
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  // 计算可视范围（基于 displayItems）
  const visibleRange = useMemo(() => {
    const startIdx = Math.max(0, Math.floor(scrollTop / lineHeight) - OVERSCAN)
    const visibleCount = Math.ceil(containerHeight / lineHeight) + OVERSCAN * 2
    const endIdx = Math.min(displayItems.length, startIdx + visibleCount)
    return { startIdx, endIdx }
  }, [scrollTop, containerHeight, displayItems.length, lineHeight])

  // 处理滚动事件
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    setScrollTop(containerRef.current.scrollTop)
  }, [])

  // 监听容器大小变化
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height)
      }
    })

    resizeObserver.observe(containerRef.current)
    setContainerHeight(containerRef.current.clientHeight)

    return () => resizeObserver.disconnect()
  }, [])

  // §Week 12: 搜索高亮 - 滚动到高亮行
  useEffect(() => {
    if (highlightedLineIndex === null || highlightedLineIndex < 0 || !containerRef.current) return

    // 在 displayItems 中找到对应的显示位置
    const displayIdx = displayItems.findIndex(
      (item) => item.kind === 'line' && item.lineIndex === highlightedLineIndex
    )
    if (displayIdx < 0) return

    const targetScrollTop = displayIdx * lineHeight
    const containerH = containerRef.current.clientHeight
    const currentScrollTop = containerRef.current.scrollTop

    // 如果高亮行不在可视区域内，滚动到中间
    if (targetScrollTop < currentScrollTop || targetScrollTop > currentScrollTop + containerH - lineHeight) {
      containerRef.current.scrollTo({
        top: targetScrollTop - containerH / 2 + lineHeight / 2,
        behavior: 'smooth'
      })
    }
  }, [highlightedLineIndex, lineHeight, displayItems])

  // 总高度（基于 displayItems 数量）
  const totalHeight = displayItems.length * lineHeight

  // 可视区域的项
  const visibleItems = useMemo(() => {
    return displayItems.slice(visibleRange.startIdx, visibleRange.endIdx).map((item, index) => ({
      item,
      displayIdx: visibleRange.startIdx + index,
      offset: (visibleRange.startIdx + index) * lineHeight
    }))
  }, [displayItems, visibleRange, lineHeight])

  if (lines.length === 0) {
    return (
      <div className="unified-view-container">
        <div className="unified-header">
          <span className="unified-title">{t('unifiedView.title')}</span>
        </div>
        <div className="unified-content">
          <div className="diff-empty">
            <p>{t('common.noDiffData')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="unified-view-container">
      <div className="unified-header">
        <span className="unified-title">{t('unifiedView.title')}</span>
        <div className="file-meta">
          <span className="meta-chip">{activeTab?.title}</span>
          {stats && (
            <>
              <span className="meta-chip diff-added">+{stats.insertedLines} {t('file.lines')}</span>
              <span className="meta-chip diff-deleted">-{stats.deletedLines} {t('file.lines')}</span>
              {stats.modifiedLines > 0 && (
                <span className="meta-chip">~{stats.modifiedLines} {t('file.lines')}</span>
              )}
            </>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="unified-content"
        onScroll={handleScroll}
        style={{ overflow: 'auto', position: 'relative' }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleItems.map(({ item, displayIdx, offset }) => {
            if (item.kind === 'folded') {
              return (
                <FoldedLine
                  key={`fold-${displayIdx}`}
                  count={item.count}
                  onClick={toggleCollapse}
                  style={{
                    position: 'absolute',
                    top: offset,
                    height: lineHeight,
                    left: 0,
                    right: 0
                  }}
                />
              )
            }

            const { line, lineIndex } = item
            // §Week 12: 检查当前行是否是高亮行
            const isSearchHighlighted = highlightedLineIndex === lineIndex

            // 获取当前匹配的范围（如果是高亮行）
            const currentMatch = currentMatchIndex >= 0 ? matches[currentMatchIndex] : null
            const isCurrentMatch = Boolean(isSearchHighlighted && currentMatch && currentMatch.lineIndex === lineIndex)

            return (
              <UnifiedDiffLine
                key={lineIndex}
                line={line}
                style={{
                  position: 'absolute',
                  top: offset,
                  height: lineHeight,
                  left: 0,
                  right: 0
                }}
                isSearchHighlighted={isCurrentMatch}
                searchRanges={isCurrentMatch && highlightedRanges.length > 0 ? highlightedRanges : undefined}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
