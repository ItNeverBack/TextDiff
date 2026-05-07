import type { FileInfo } from '@shared/types'

interface MergePaneProps {
  label: string
  file: FileInfo | null
  color: string
  hideHeader?: boolean
}

function PaneHeader({ label, file, color }: { label: string; file: FileInfo | null; color: string }) {
  const fileName = file?.path?.split(/[\\/]/).pop() ?? '未选择'
  return (
    <div style={{
      padding: '6px 12px',
      fontSize: 12,
      fontWeight: 600,
      color,
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      </svg>
      <span>{label}</span>
      <span style={{ fontWeight: 400, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {fileName}
      </span>
    </div>
  )
}

export function MergePane({ label, file, color, hideHeader = false }: MergePaneProps) {
  const lines = file?.content?.split('\n') ?? []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {!hideHeader && <PaneHeader label={label} file={file} color={color} />}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {lines.length > 0 ? (
          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>
            {lines.map((line, i) => (
              <div key={i} style={{ display: 'flex' }}>
                <span style={{
                  minWidth: 40,
                  padding: '0 8px',
                  color: 'var(--text-muted)',
                  userSelect: 'none',
                  textAlign: 'right',
                  borderRight: '1px solid var(--border-light)',
                  fontSize: 11,
                  flexShrink: 0
                }}>
                  {i + 1}
                </span>
                <span style={{ padding: '0 8px', whiteSpace: 'pre', color: 'var(--text-primary)' }}>
                  {line}
                </span>
              </div>
            ))}
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
            未选择文件
          </div>
        )}
      </div>
    </div>
  )
}
