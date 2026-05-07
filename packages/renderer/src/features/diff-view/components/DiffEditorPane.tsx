import { useRef, forwardRef, useImperativeHandle } from 'react'
import type { DiffLine as DiffLineType, DiffChunk } from '@shared/types'
import { DiffLine } from './DiffLine'
import { FoldedLine } from './FoldedLine'

interface DiffEditorPaneProps {
  lines: DiffLineType[]
  side: 'left' | 'right'
  chunks: DiffChunk[]
  activeChunkIndex: number
  isCollapsed: boolean
  contextLines?: number
  onLineClick?: (index: number) => void
  onFoldToggle?: () => void
}

export interface DiffEditorPaneRef {
  scrollToLine: (lineIndex: number) => void
  getScrollElement: () => HTMLDivElement | null
}

/**
 * 单侧编辑器面板组件
 *
 * §3.2.2 DiffView 模块 - DiffEditorPane 组件
 * 处理折叠逻辑、行渲染和滚动
 *
 * @deprecated Week 4 后已被 MonacoDiffEditor 替换。保留此组件用于参考或未来需要
 * 自定义渲染的场景。当前主应用使用 MonacoDiffEditor 组件。
 *
 * 使用 MonacoDiffEditor 替代此组件的原因：
 * 1. Monaco Editor 提供更强大的语法高亮
 * 2. 内置虚拟滚动支持大文件
 * 3. 内置同步滚动和差异导航
 * 4. 更好的性能和用户体验
 */
export const DiffEditorPane = forwardRef<DiffEditorPaneRef, DiffEditorPaneProps>(
  function DiffEditorPane({
    lines,
    side,
    chunks,
    activeChunkIndex,
    isCollapsed,
    contextLines = 3,
    onLineClick,
    onFoldToggle
  }, ref) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => ({
      scrollToLine: (lineIndex: number) => {
        const lineElements = contentRef.current?.querySelectorAll('.diff-line')
        if (lineElements && lineElements[lineIndex]) {
          lineElements[lineIndex].scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      },
      getScrollElement: () => scrollRef.current
    }))

    // 获取当前活跃 chunk 的行范围
    const getActiveChunkLineRange = (): [number, number] | null => {
      if (chunks.length === 0 || activeChunkIndex < 0 || activeChunkIndex >= chunks.length) {
        return null
      }
      const chunk = chunks[activeChunkIndex]
      return [chunk.startIndex, chunk.endIndex]
    }

    // 处理折叠逻辑
    const processedLines = (() => {
      if (!isCollapsed) {
        return lines.map((line, index) => ({ 
          type: 'line' as const, 
          line, 
          index 
        }))
      }

      const result: Array<{ 
        type: 'line' | 'folded'
        line?: DiffLineType
        index?: number
        count?: number 
      }> = []
      let foldStart = -1
      let foldCount = 0

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const isEqual = line.type === 'equal'

        if (isEqual) {
          if (foldStart === -1) {
            foldStart = i
            foldCount = 1
          } else {
            foldCount++
          }
        } else {
          if (foldStart !== -1) {
            // 结束折叠区域
            if (foldCount > contextLines * 2) {
              // 添加折叠前的上下文
              for (let j = foldStart; j < foldStart + contextLines; j++) {
                result.push({ type: 'line', line: lines[j], index: j })
              }
              // 添加折叠行
              result.push({ type: 'folded', count: foldCount - contextLines * 2 })
              // 添加折叠后的上下文
              for (let j = i - contextLines; j < i; j++) {
                result.push({ type: 'line', line: lines[j], index: j })
              }
            } else {
              // 不需要折叠，直接添加
              for (let j = foldStart; j < i; j++) {
                result.push({ type: 'line', line: lines[j], index: j })
              }
            }
            foldStart = -1
            foldCount = 0
          }
          result.push({ type: 'line', line, index: i })
        }
      }

      // 处理末尾的折叠区域
      if (foldStart !== -1) {
        if (foldCount > contextLines * 2) {
          for (let j = foldStart; j < foldStart + contextLines; j++) {
            result.push({ type: 'line', line: lines[j], index: j })
          }
          result.push({ type: 'folded', count: foldCount - contextLines * 2 })
          for (let j = lines.length - contextLines; j < lines.length; j++) {
            result.push({ type: 'line', line: lines[j], index: j })
          }
        } else {
          for (let j = foldStart; j < lines.length; j++) {
            result.push({ type: 'line', line: lines[j], index: j })
          }
        }
      }

      return result
    })()

    const activeRange = getActiveChunkLineRange()

    return (
      <div className="diff-pane">
        <div className="editor-scroll" ref={scrollRef}>
          <div className="editor-content" ref={contentRef}>
            {processedLines.map((item, key) => {
              if (item.type === 'folded') {
                return (
                  <FoldedLine
                    key={`fold-${key}`}
                    count={item.count || 0}
                    onClick={onFoldToggle}
                  />
                )
              }

              const { line, index } = item
              if (!line || index === undefined) return null

              // 检查当前行是否属于活跃 chunk
              const isActive = !!(activeRange && index >= activeRange[0] && index <= activeRange[1])

              return (
                <DiffLine
                  key={index}
                  line={line}
                  side={side}
                  isActive={isActive}
                  showInlineDiff={line.type === 'replace'}
                  onClick={() => onLineClick?.(index)}
                />
              )
            })}
          </div>
        </div>
      </div>
    )
  }
)
