import { useState, useEffect } from 'react'
import { useSessionStore } from '../../stores'
import type { DiffSession } from '@shared/types'
import { useI18n } from '../../hooks/useI18n'

interface SessionListDialogProps {
  open: boolean
  onClose: () => void
  onLoadSession?: (session: DiffSession) => void
}

export function SessionListDialog({ open, onClose, onLoadSession }: SessionListDialogProps) {
  const { sessions, isLoading, error, loadSessions, deleteSession, loadSession } = useSessionStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { t } = useI18n()

  useEffect(() => {
    if (open) {
      loadSessions()
      setSearchQuery('')
    }
  }, [open, loadSessions])

  if (!open) return null

  const filteredSessions = sessions.filter(session =>
    session.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleLoadSession = async (id: string) => {
    const session = await loadSession(id)
    if (session && onLoadSession) {
      onLoadSession(session)
    }
    onClose()
  }

  const handleDeleteSession = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (!confirm(t('dialog.session.confirmDelete'))) return

    setDeletingId(id)
    try {
      await deleteSession(id)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDiffSummary = (session: DiffSession) => {
    const leftName = session.left.path?.split(/[\/]/).pop() || t('tab.untitled')
    const rightName = session.right.path?.split(/[\/]/).pop() || t('tab.untitled')
    return `${leftName} vs ${rightName}`
  }



  return (
    <div className="overlay">
      <div className="panel session-list-panel">
        <div className="panel-header">
          <h3 className="panel-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            {t('dialog.session.title')}
          </h3>
          <button className="panel-close" onClick={onClose}>×</button>
        </div>

        <div className="panel-body">
          {/* 搜索框 */}
          <div className="session-search">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder={t('dialog.session.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>
                ×
              </button>
            )}
          </div>

          {/* 会话列表 */}
          <div className="session-list">
            {isLoading ? (
              <div className="session-empty">
                <div className="loading-spinner"></div>
                <p>{t('loading')}</p>
              </div>
            ) : error ? (
              <div className="session-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p>{t('common.loadFailed')}: {error}</p>
                <button className="btn-secondary" onClick={() => loadSessions()}>
                  {t('common.retry')}
                </button>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="session-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                <p>{searchQuery ? t('dialog.session.noSearchResults') : t('dialog.session.noSessions')}</p>
                {searchQuery && (
                  <button className="btn-secondary" onClick={() => setSearchQuery('')}>
                    {t('common.clearSearch')}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="session-count">
                  {t('common.totalCount')} {filteredSessions.length} {t('common.sessionsCount')}
                  {searchQuery && sessions.length !== filteredSessions.length &&
                    ` (${t('common.filteredFrom')} ${sessions.length} ${t('common.sessionsCount')})`
                  }
                </div>
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className="session-item"
                    onClick={() => handleLoadSession(session.id)}
                  >
                    <div className="session-info">
                      <div className="session-name">{session.name}</div>
                      <div className="session-summary">{getDiffSummary(session)}</div>
                      {session.stats && (
                        <div className="session-stats">
                          <span className="stat-added">+{session.stats.insertedLines}</span>
                          <span className="stat-deleted">-{session.stats.deletedLines}</span>
                          <span className="stat-modified">~{session.stats.modifiedLines}</span>
                          <span className="stat-chunks">{session.stats.chunkCount}{t('common.chunks')}</span>
                        </div>
                      )}
                      <div className="session-meta">
                        <span className="session-date">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          {formatDate(session.updatedAt)}
                        </span>
                        {session.options && (
                          <span className="session-algorithm">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                              <polyline points="2 17 12 22 22 17"/>
                              <polyline points="2 12 12 17 22 12"/>
                            </svg>
                            {session.options.algorithm === 'myers' && 'Myers'}
                            {session.options.algorithm === 'patience' && 'Patience'}
                            {session.options.algorithm === 'histogram' && 'Histogram'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="session-actions">
                      <button
                        className="session-btn load"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleLoadSession(session.id)
                        }}
                        title={t('dialog.session.loadTitle')}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                      <button
                        className="session-btn delete"
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        disabled={deletingId === session.id}
                        title={t('dialog.session.deleteTitle')}
                      >
                        {deletingId === session.id ? (
                          <div className="btn-spinner"></div>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="panel-footer">
          <span className="session-hint">
            {t('dialog.session.hint')}
          </span>
          <button className="btn-secondary" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
