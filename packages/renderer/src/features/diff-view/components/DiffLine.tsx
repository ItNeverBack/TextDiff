import type { DiffLine } from '@shared/types'
import { InlineDiff } from './InlineDiff'

interface DiffLineProps {
  line: DiffLine
  side: 'left' | 'right'
  isActive: boolean
  showInlineDiff: boolean
  onClick?: () => void
}

/**
 * 差异行组件（行号 + gutter + 内容）
 * 
 * §3.2.2 DiffView 模块 - DiffLine 组件
 * - 支持 equal / insert / delete / replace 四种类型
 * - 行背景色高亮
 * - 使用 InlineDiff 组件渲染字符级差异
 */
export function DiffLine({ line, side, isActive, showInlineDiff, onClick }: DiffLineProps) {
  const lineNo = side === 'left' ? line.leftLineNo : line.rightLineNo
  const content = side === 'left' ? line.leftContent : line.rightContent
  const inlineDiff = showInlineDiff && line.inlineDiff
    ? (side === 'left' ? line.inlineDiff.left : line.inlineDiff.right)
    : null

  const getGutterSymbol = () => {
    switch (line.type) {
      case 'insert': return '+'
      case 'delete': return '-'
      case 'replace': return '~'
      default: return ' '
    }
  }

  return (
    <div
      className={`diff-line ${line.type} ${isActive ? 'active' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="line-number">{lineNo || ''}</div>
      <div className="line-gutter">{getGutterSymbol()}</div>
      <div className="line-content">
        {inlineDiff ? (
          <InlineDiff segments={inlineDiff} />
        ) : (
          content || '\u00A0'
        )}
      </div>
    </div>
  )
}
