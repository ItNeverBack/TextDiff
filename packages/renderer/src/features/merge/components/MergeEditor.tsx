import type React from 'react'
import type { FileInfo, ThreeWayDiffResult, DiffLine } from '@shared/types'
import type { Resolution } from '../stores/merge.store'
import { ConflictBlock } from './ConflictBlock'
import { MergePane } from './MergePane'
import { useConflictResolution } from '../hooks/useConflictResolution'

interface MergeEditorProps {
  baseFile: FileInfo | null
  leftFile: FileInfo | null
  rightFile: FileInfo | null
  mergeResult: ThreeWayDiffResult | null
  onResolve?: (conflictId: string, resolution: Resolution) => void
}

const PANE_HEADERS = [
  { label: 'Base（公共祖先）', color: 'var(--text-secondary)' },
  { label: '左侧（Local）', color: 'var(--diff-added-text)' },
  { label: '右侧（Remote）', color: 'var(--diff-deleted-text)' }
]

/** 单行渲染：行号 + 内容 */
function LineRow({ lineNo, content, bg }: { lineNo: number | null; content: string; bg?: string }) {
  return (
    <div style={{ display: 'flex', background: bg }}>
      <span style={{
        minWidth: 36,
        padding: '0 6px',
        color: 'var(--text-muted)',
        userSelect: 'none',
        textAlign: 'right',
        borderRight: '1px solid var(--border-light)',
        fontSize: 11,
        flexShrink: 0
      }}>
        {lineNo ?? ''}
      </span>
      <span style={{ padding: '0 8px', whiteSpace: 'pre', fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: 'var(--text-primary)' }}>
        {content}
      </span>
    </div>
  )
}

/** 根据 DiffLine 类型返回背景色 */
function lineBg(line: DiffLine, side: 'left' | 'right'): string | undefined {
  if (line.type === 'insert') return 'var(--diff-added-bg)'
  if (line.type === 'delete') return 'var(--diff-deleted-bg)'
  if (line.type === 'replace') {
    return side === 'left' ? 'var(--diff-deleted-bg)' : 'var(--diff-added-bg)'
  }
  return undefined
}

/**
 * 有合并结果时，按行对齐渲染三栏。
 * 冲突行（replace 且在 conflicts 中）跨三栏显示 ConflictBlock。
 */
function AlignedMergeContent({
  mergeResult,
  onResolve
}: {
  mergeResult: ThreeWayDiffResult
  onResolve: (conflictId: string, resolution: Resolution) => void
}) {
  const { resolutions, activeConflictIndex, selectConflict } = useConflictResolution()
  // 用 leftContent+rightContent 复合 key 匹配冲突行，避免 lineIndex 与 startLine 语义错位
  const conflictByContent = new Map(
    mergeResult.conflicts.map((c, i) => [`${c.leftContent}\0${c.rightContent}`, { conflict: c, index: i }])
  )

  const rows: React.ReactNode[] = []

  for (let lineIndex = 0; lineIndex < mergeResult.lines.length; lineIndex++) {
    const line = mergeResult.lines[lineIndex]
    const conflictKey = line.type === 'replace' ? `${line.leftContent}\0${line.rightContent}` : null
    const conflictEntry = conflictKey ? conflictByContent.get(conflictKey) : undefined

    if (conflictEntry) {
      const { conflict, index } = conflictEntry
      const isActive = index === activeConflictIndex
      rows.push(
        <div key={`conflict-${conflict.id}`} style={{ gridColumn: '1 / -1' }}>
          <ConflictBlock
            conflict={conflict}
            index={index}
            isActive={isActive}
            resolution={resolutions.get(conflict.id)}
            onResolve={(res) => onResolve(conflict.id, res)}
            onSelect={() => selectConflict(index)}
          />
        </div>
      )
    } else {
      // 普通行：三栏对齐
      const bg = lineBg(line, 'left')
      const bgRight = lineBg(line, 'right')
      rows.push(
        <div key={`line-${lineIndex}`} style={{ display: 'contents' }}>
          {/* Base 列 */}
          <div style={{ borderRight: '1px solid var(--border-light)' }}>
            <LineRow
              lineNo={line.type === 'insert' ? null : line.leftLineNo}
              content={line.type === 'insert' ? '' : line.leftContent}
              bg={bg}
            />
          </div>
          {/* Left 列 */}
          <div style={{ borderRight: '1px solid var(--border-light)' }}>
            <LineRow
              lineNo={line.type === 'delete' ? null : line.leftLineNo}
              content={line.type === 'delete' ? '' : (line.type === 'replace' ? line.leftContent : line.leftContent)}
              bg={bg}
            />
          </div>
          {/* Right 列 */}
          <div>
            <LineRow
              lineNo={line.type === 'delete' ? null : line.rightLineNo}
              content={line.type === 'delete' ? '' : line.rightContent}
              bg={bgRight}
            />
          </div>
        </div>
      )
    }
  }

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
        {rows}
      </div>
    </div>
  )
}

export function MergeEditor({ baseFile, leftFile, rightFile, mergeResult, onResolve }: MergeEditorProps) {
  const { resolveWithBase, resolveWithLeft, resolveWithRight, resolveManual } = useConflictResolution()

  const handleResolve = (conflictId: string, resolution: Resolution) => {
    if (onResolve) {
      onResolve(conflictId, resolution)
    } else {
      if (resolution.type === 'base') resolveWithBase(conflictId)
      else if (resolution.type === 'left') resolveWithLeft(conflictId)
      else if (resolution.type === 'right') resolveWithRight(conflictId)
      else if (resolution.type === 'manual') resolveManual(conflictId, resolution.content)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* 三栏列头 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', flexShrink: 0 }}>
        {PANE_HEADERS.map(({ label, color }, i) => (
          <div key={i} style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            color,
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
            borderRight: i < 2 ? '1px solid var(--border)' : undefined
          }}>
            {label}
          </div>
        ))}
      </div>

      {/* 内容区 */}
      {!mergeResult ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', flex: 1, overflow: 'hidden' }}>
          <div style={{ borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
            <MergePane label="Base（公共祖先）" file={baseFile} color="var(--text-secondary)" hideHeader />
          </div>
          <div style={{ borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
            <MergePane label="左侧（Local）" file={leftFile} color="var(--diff-added-text)" hideHeader />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <MergePane label="右侧（Remote）" file={rightFile} color="var(--diff-deleted-text)" hideHeader />
          </div>
        </div>
      ) : (
        <AlignedMergeContent mergeResult={mergeResult} onResolve={handleResolve} />
      )}
    </div>
  )
}
