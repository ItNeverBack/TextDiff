import { useDiffStore } from '../../stores'
import { useI18n } from '../../hooks/useI18n'

export function StatusBar() {
  const { diffResult, isComputing, options, computeTime } = useDiffStore()
  const { t } = useI18n()

  const stats = diffResult?.stats

  return (
    <div className="status-bar">
      <div className="status-left">
        {stats && (
          <div className="status-item status-diff-summary">
            <span className="status-label">{t('status.diff')}</span>
            <span className="status-chip chip-total">{stats.chunkCount} {t('status.chunks')}</span>
            <span className="status-chip chip-added">+{stats.insertedLines} {t('status.added')}</span>
            <span className="status-chip chip-deleted">-{stats.deletedLines} {t('status.deleted')}</span>
            <span className="status-chip chip-modified">~{stats.modifiedLines} {t('status.modified')}</span>
          </div>
        )}
      </div>
      
      <div className="status-center">
        {isComputing && (
          <div className="status-item">
            <span className="spinner" />
            <span>{t('status.computing')}</span>
          </div>
        )}
      </div>

      <div className="status-right">
        <div className="status-item">
          <span className="status-label">{t('status.algorithm')}</span>
          <span className="status-value">{options.algorithm}</span>
        </div>
        {computeTime > 0 && (
          <div className="status-item">
            <span className="status-label">{t('status.time')}</span>
            <span className="status-value">{computeTime}ms</span>
          </div>
        )}
        <div className="status-item cursor-pos">
          <span>{t('status.line')} 1, {t('status.column')} 1</span>
        </div>
      </div>
    </div>
  )
}
