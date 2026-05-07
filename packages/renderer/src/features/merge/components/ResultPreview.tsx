import { useMemo } from 'react'
import { useMergeStore } from '../stores/merge.store'

interface ResultPreviewProps {
  visible: boolean
}

export function ResultPreview({ visible }: ResultPreviewProps) {
  const { mergeResult, resolutions, buildResult } = useMergeStore()

  const content = useMemo(() => {
    if (!mergeResult) return ''
    return buildResult()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergeResult, resolutions])

  if (!visible) return null

  const lines = content.split('\n')

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderLeft: '1px solid var(--border)',
      background: 'var(--bg-app)'
    }}>
      <div style={{
        padding: '6px 12px',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        borderBottom: '1px solid var(--border-light)',
        background: 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6"/>
          <path d="M8 13h8M8 17h5"/>
        </svg>
        合并结果预览
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontWeight: 400 }}>
          {lines.length} 行
        </span>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {content ? (
          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>
            {lines.map((line, i) => {
              const isConflictMarker = line.startsWith('<<<<<<<') || line.startsWith('=======') || line.startsWith('>>>>>>>')
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    background: isConflictMarker ? 'var(--diff-conflict-bg, rgba(255,193,7,0.15))' : 'transparent',
                    borderLeft: isConflictMarker ? '3px solid var(--diff-conflict-line, #ffc107)' : '3px solid transparent'
                  }}
                >
                  <span style={{
                    minWidth: 40,
                    padding: '0 8px',
                    color: 'var(--text-muted)',
                    userSelect: 'none',
                    textAlign: 'right',
                    borderRight: '1px solid var(--border-light)',
                    fontSize: 11
                  }}>
                    {i + 1}
                  </span>
                  <span style={{
                    padding: '0 8px',
                    whiteSpace: 'pre',
                    color: isConflictMarker ? 'var(--diff-conflict-line, #ffc107)' : 'var(--text-primary)'
                  }}>
                    {line}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            fontSize: 13
          }}>
            请先选择文件并计算合并结果
          </div>
        )}
      </div>
    </div>
  )
}
