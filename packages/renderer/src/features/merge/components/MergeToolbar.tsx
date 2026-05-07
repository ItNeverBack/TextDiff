interface MergeToolbarProps {
  conflictTotal: number
  conflictResolved: number
  activeConflictIndex: number
  isComputing: boolean
  hasFiles: boolean
  onPrevConflict: () => void
  onNextConflict: () => void
  onAutoMerge: () => void
  onSaveResult: () => void
}

export function MergeToolbar({
  conflictTotal,
  conflictResolved,
  activeConflictIndex,
  isComputing,
  hasFiles,
  onPrevConflict,
  onNextConflict,
  onAutoMerge,
  onSaveResult
}: MergeToolbarProps) {
  const allResolved = conflictTotal > 0 && conflictResolved === conflictTotal

  return (
    <div
      className="toolbar"
      role="toolbar"
      aria-label="合并工具栏"
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 40 }}
    >
      {/* 冲突导航 */}
      <div className="toolbar-group nav-group" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          className="toolbar-btn icon-only"
          onClick={onPrevConflict}
          disabled={!hasFiles || conflictTotal === 0 || activeConflictIndex === 0}
          title="上一个冲突"
          aria-label="上一个冲突"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 15l-6-6-6 6"/>
          </svg>
        </button>

        <div
          className="diff-counter"
          aria-live="polite"
          style={{ minWidth: 80, textAlign: 'center', fontSize: 12 }}
        >
          {conflictTotal > 0 ? (
            <>
              <span style={{ fontWeight: 600 }}>{activeConflictIndex + 1}</span>
              <span style={{ color: 'var(--text-muted)' }}>/{conflictTotal}</span>
              <span style={{ marginLeft: 4, color: 'var(--text-muted)' }}>处冲突</span>
            </>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>无冲突</span>
          )}
        </div>

        <button
          className="toolbar-btn icon-only"
          onClick={onNextConflict}
          disabled={!hasFiles || conflictTotal === 0 || activeConflictIndex >= conflictTotal - 1}
          title="下一个冲突"
          aria-label="下一个冲突"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
      </div>

      <div className="toolbar-separator" />

      {/* 解决进度 */}
      {conflictTotal > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ color: 'var(--text-muted)' }}>已解决：</span>
          <span style={{
            fontWeight: 600,
            color: allResolved ? 'var(--diff-added-text)' : 'var(--text-primary)'
          }}>
            {conflictResolved}/{conflictTotal}
          </span>
          {allResolved && (
            <span style={{ color: 'var(--diff-added-text)', fontSize: 11 }}>✓ 全部解决</span>
          )}
        </div>
      )}

      {conflictTotal > 0 && <div className="toolbar-separator" />}

      {/* 自动合并 */}
      <button
        className="toolbar-btn"
        onClick={onAutoMerge}
        disabled={!hasFiles || isComputing}
        title="自动合并非冲突部分"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 6l4-4 4 4M12 2v10.3M8 18l4 4 4-4M12 22v-4"/>
          <path d="M4 12h4M16 12h4"/>
        </svg>
        自动合并
      </button>

      <div style={{ flex: 1 }} />

      {/* 保存结果 */}
      <button
        className="btn-primary"
        style={{ fontSize: 12, padding: '4px 12px' }}
        onClick={onSaveResult}
        disabled={!hasFiles || isComputing}
        title="保存合并结果"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        保存结果
      </button>
    </div>
  )
}
