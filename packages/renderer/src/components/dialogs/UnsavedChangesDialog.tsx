import { useState } from 'react'
import { useI18n } from '../../hooks/useI18n'

export type UnsavedChangesAction = 'save' | 'discard' | 'cancel' | 'save-all' | 'discard-all'

interface UnsavedChangesDialogProps {
  open: boolean
  tabTitle: string
  remainingCount: number
  onAction: (action: UnsavedChangesAction) => void
}

export function UnsavedChangesDialog({ open, tabTitle, remainingCount, onAction }: UnsavedChangesDialogProps) {
  const { t } = useI18n()
  const [applyToAll, setApplyToAll] = useState(false)

  if (!open) return null

  const handleAction = (action: 'save' | 'discard' | 'cancel') => {
    if (action === 'cancel') {
      onAction('cancel')
      return
    }
    if (applyToAll && remainingCount > 0) {
      onAction(action === 'save' ? 'save-all' : 'discard-all')
    } else {
      onAction(action)
    }
  }

  return (
    <div className="overlay" style={{ zIndex: 10000 }}>
      <div className="panel unsaved-changes-panel" style={{ maxWidth: '440px' }}>
        <div className="panel-header">
          <h3 className="panel-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            {t('dialog.unsaved.title')}
          </h3>
        </div>

        <div className="panel-body">
          <p className="unsaved-message">
            {t('dialog.unsaved.message')} <strong>{tabTitle}</strong>
          </p>
          {remainingCount > 0 && (
            <label className="unsaved-apply-all">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
              />
              <span>{t('dialog.unsaved.applyToAll').replace('{count}', String(remainingCount + 1))}</span>
            </label>
          )}
        </div>

        <div className="panel-footer" style={{ gap: '8px' }}>
          <button
            className="btn-secondary"
            onClick={() => handleAction('discard')}
          >
            {applyToAll && remainingCount > 0 ? t('dialog.unsaved.discardAll') : t('dialog.unsaved.discard')}
          </button>
          <button
            className="btn-secondary"
            onClick={() => handleAction('cancel')}
          >
            {t('dialog.cancel')}
          </button>
          <button
            className="btn-primary"
            onClick={() => handleAction('save')}
          >
            {applyToAll && remainingCount > 0 ? t('dialog.unsaved.saveAll') : t('dialog.unsaved.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
