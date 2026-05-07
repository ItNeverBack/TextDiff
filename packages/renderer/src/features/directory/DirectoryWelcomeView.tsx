import { useState, useCallback, useEffect } from 'react'
import { api } from '../../lib/api'
import { useI18n } from '../../hooks/useI18n'
import type { DirectoryInfo, RecentDirectory } from '@shared/types'

interface DirectoryWelcomeViewProps {
  onCompare: (leftDir: DirectoryInfo, rightDir: DirectoryInfo) => void
}

interface DirectorySideViewProps {
  side: 'left' | 'right'
  currentDir: DirectoryInfo | null
  onSelectDir: () => void
  onDropDir: (dirPath: string) => void
  recentDirectories: RecentDirectory[]
  onSelectRecentDir: (dir: RecentDirectory) => void
  title: string
  isLoading: boolean
}

function DirectorySideView({
  side,
  currentDir,
  onSelectDir,
  onDropDir,
  recentDirectories,
  onSelectRecentDir,
  title,
  isLoading
}: DirectorySideViewProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const { t } = useI18n()

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer?.types.includes('Files')) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const currentTarget = e.currentTarget as HTMLElement
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      const droppedPath = files[0].path
      if (droppedPath) {
        onDropDir(droppedPath)
      }
    }
  }, [onDropDir])

  const getDirName = (dirPath: string): string => {
    return dirPath.split(/[/\\]/).pop() || dirPath
  }

  const formatTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return t('directory.justNow')
    if (minutes < 60) return `${minutes}${t('directory.minutesAgo')}`
    const hours = Math.floor(diff / 3600000)
    if (hours < 24) return `${hours}${t('directory.hoursAgo')}`
    const days = Math.floor(diff / 86400000)
    if (days < 30) return `${days}${t('directory.daysAgo')}`
    return new Date(timestamp).toLocaleDateString()
  }

  const bgColor = 'var(--bg-surface)'
  const borderColor = 'var(--border-color)'
  const textColor = 'var(--text-primary)'
  const textMuted = 'var(--text-secondary)'
  const textSecondary = 'var(--text-secondary)'
  const accentColor = 'var(--accent-primary)'
  const hoverBg = 'var(--bg-hover)'

  return (
    <div
      className="directory-welcome-drop-zone"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        backgroundColor: isDragOver ? 'var(--accent-primary-light)' : bgColor,
        border: isDragOver ? `2px dashed ${accentColor}` : `2px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '320px',
        boxSizing: 'border-box',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {isDragOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'var(--accent-primary-light)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            zIndex: 10,
            pointerEvents: 'none'
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke={accentColor}
            strokeWidth="1.5"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span style={{ color: accentColor, fontWeight: 500, fontSize: '14px' }}>
            {t('directory.dropHint').replace('{side}', side === 'left' ? t('common.left') : t('common.right'))}
          </span>
        </div>
      )}

      <div
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: textColor,
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>{title}</span>
        {currentDir && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              backgroundColor: hoverBg,
              borderRadius: '4px',
              color: textSecondary
            }}
          >
            {side === 'left' ? 'Left' : 'Right'}
          </span>
        )}
      </div>

      {currentDir ? (
        <div
          style={{
            padding: '12px',
            backgroundColor: 'var(--bg-app)',
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke={accentColor}
              strokeWidth="2"
              style={{ flexShrink: 0 }}
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span
              style={{
                fontWeight: 500,
                color: textColor,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={currentDir.path}
            >
              {currentDir.name}
            </span>
          </div>
          <div
            style={{
              fontSize: '12px',
              color: textMuted,
              marginTop: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={currentDir.path}
          >
            {currentDir.path}
          </div>
          <div style={{ marginTop: '12px' }}>
            <button
              onClick={onSelectDir}
              disabled={isLoading}
              style={{
                fontSize: '12px',
                padding: '4px 12px',
                backgroundColor: hoverBg,
                border: `1px solid ${borderColor}`,
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                color: textColor
              }}
            >
              {t('directory.changeDir')}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onSelectDir}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '40px 16px',
            border: `2px dashed ${borderColor}`,
            borderRadius: '12px',
            backgroundColor: 'transparent',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            color: textMuted,
            marginBottom: '16px',
            flex: '1 1 auto',
            minHeight: 0
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            <line x1="12" y1="11" x2="12" y2="17" />
            <line x1="9" y1="14" x2="15" y2="14" />
          </svg>
          <span style={{ fontWeight: 500, color: textColor, fontSize: '15px' }}>
            {t('directory.selectDir')}
          </span>
          <span style={{ fontSize: '13px' }}>{t('directory.clickToSelect')}</span>
        </button>
      )}

      {currentDir && (
        <div style={{ marginTop: 'auto' }}>
          <div
            style={{
              fontSize: '12px',
              color: textSecondary,
              padding: '12px',
              backgroundColor: 'var(--bg-app)',
              borderRadius: '8px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>{t('directory.fileCount')}:</span>
              <span style={{ fontWeight: 500 }}>{currentDir.totalFiles || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('file.size')}:</span>
              <span style={{ fontWeight: 500 }}>{formatSize(currentDir.totalSize)}</span>
            </div>
          </div>
        </div>
      )}

      {recentDirectories.length > 0 && !currentDir && (
        <div style={{ marginTop: 'auto', paddingTop: '16px', minHeight: 0, overflow: 'hidden', flexShrink: 1 }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}
          >
            {t('directory.recentDirectories')}
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              overflowY: 'auto',
              maxHeight: 'calc(100% - 28px)'
            }}
          >
            {recentDirectories.slice(0, 5).map((dir) => (
              <button
                key={dir.path}
                onClick={() => onSelectRecentDir(dir)}
                disabled={isLoading}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  textAlign: 'left'
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={textMuted}
                  strokeWidth="2"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span
                  style={{
                    flex: 1,
                    fontSize: '13px',
                    color: textColor,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={dir.path}
                >
                  {getDirName(dir.path)}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    color: textMuted,
                    flexShrink: 0
                  }}
                >
                  {formatTime(dir.accessedAt)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

async function getDirectoryInfo(dirPath: string): Promise<DirectoryInfo> {
  const name = dirPath.split(/[/\\]/).pop() || dirPath

  try {
    const result = await api.directory.compare(dirPath, dirPath, {
      compareMode: 'name',
      filters: [],
      recursive: true,
      useHash: false,
      parallel: false,
      workerCount: 0
    })
    return result.leftRoot
  } catch {
    return {
      path: dirPath,
      name,
      totalFiles: 0,
      totalSize: 0,
      lastModified: new Date()
    }
  }
}

export function DirectoryWelcomeView({ onCompare }: DirectoryWelcomeViewProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [leftDir, setLeftDir] = useState<DirectoryInfo | null>(null)
  const [rightDir, setRightDir] = useState<DirectoryInfo | null>(null)
  const [recentDirectories, setRecentDirectories] = useState<RecentDirectory[]>([])
  const { t } = useI18n()

  const loadRecentDirectories = useCallback(async () => {
    try {
      const dirs = await api.getRecentDirectories(10)
      setRecentDirectories(dirs)
    } catch (error) {
      console.error('Failed to load recent directories:', error)
    }
  }, [])

  useEffect(() => {
    loadRecentDirectories()
  }, [loadRecentDirectories])

  const addRecentDir = async (dirPath: string) => {
    try {
      await api.addRecentDirectory(dirPath)
      loadRecentDirectories()
    } catch (error) {
      console.error('Failed to add recent directory:', error)
    }
  }

  const handleSelectDir = async (side: 'left' | 'right') => {
    setIsLoading(true)
    try {
      const dirPath = await api.directory.open(side)
      if (!dirPath) {
        setIsLoading(false)
        return
      }

      const dirInfo = await getDirectoryInfo(dirPath)

      if (side === 'left') {
        setLeftDir(dirInfo)
      } else {
        setRightDir(dirInfo)
      }

      await addRecentDir(dirPath)
    } catch (error) {
      console.error('Failed to open directory:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectRecentDir = async (dir: RecentDirectory, side: 'left' | 'right') => {
    setIsLoading(true)
    try {
      const dirInfo = await getDirectoryInfo(dir.path)

      if (side === 'left') {
        setLeftDir(dirInfo)
      } else {
        setRightDir(dirInfo)
      }

      await addRecentDir(dir.path)
    } catch (error) {
      console.error('Failed to open recent directory:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompare = async () => {
    if (!leftDir || !rightDir) return

    onCompare(leftDir, rightDir)
  }

  const handleClearAll = () => {
    setLeftDir(null)
    setRightDir(null)
  }

  const handleDropDir = async (side: 'left' | 'right', dirPath: string) => {
    setIsLoading(true)
    try {
      const dirInfo = await getDirectoryInfo(dirPath)

      if (side === 'left') {
        setLeftDir(dirInfo)
      } else {
        setRightDir(dirInfo)
      }

      await addRecentDir(dirPath)
    } catch (error) {
      console.error('Failed to drop directory:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const bgColor = 'var(--bg-app)'
  const textColor = 'var(--text-primary)'
  const accentColor = 'var(--accent-primary)'
  const borderColor = 'var(--border-color)'

  const canCompare = leftDir && rightDir

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '32px',
        overflowY: 'auto',
        boxSizing: 'border-box',
        backgroundColor: bgColor
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexShrink: 0
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 600,
              color: textColor,
              margin: 0
            }}
          >
            {t('directory.compareTitle')}
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
            {t('directory.compareDescription')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(leftDir || rightDir) && (
            <button
              onClick={handleClearAll}
              disabled={isLoading}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                backgroundColor: 'var(--bg-surface)',
                color: textColor,
                border: `1px solid ${borderColor}`
              }}
            >
              {t('common.clear')}
            </button>
          )}
          <button
            onClick={handleCompare}
            disabled={!canCompare || isLoading}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              borderRadius: '6px',
              cursor: !canCompare || isLoading ? 'not-allowed' : 'pointer',
              backgroundColor: canCompare ? accentColor : 'var(--bg-active)',
              color: canCompare ? '#ffffff' : 'var(--text-muted)',
              border: 'none',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isLoading ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" style={{ animation: 'spin 1s linear infinite' }}>
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                  </circle>
                </svg>
                {t('common.processing')}
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {t('directory.startCompare')}
              </>
            )}
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          marginBottom: '32px',
          flex: 1,
          minHeight: 0
        }}
      >
        <DirectorySideView
          side="left"
          currentDir={leftDir}
          onSelectDir={() => handleSelectDir('left')}
          onDropDir={(dirPath) => handleDropDir('left', dirPath)}
          recentDirectories={recentDirectories}
          onSelectRecentDir={(dir) => handleSelectRecentDir(dir, 'left')}
          title={t('directory.leftDir')}
          isLoading={isLoading}
        />
        <DirectorySideView
          side="right"
          currentDir={rightDir}
          onSelectDir={() => handleSelectDir('right')}
          onDropDir={(dirPath) => handleDropDir('right', dirPath)}
          recentDirectories={recentDirectories}
          onSelectRecentDir={(dir) => handleSelectRecentDir(dir, 'right')}
          title={t('directory.rightDir')}
          isLoading={isLoading}
        />
      </div>

      <div
        style={{
          marginTop: 'auto',
          padding: '16px 20px',
          backgroundColor: 'var(--accent-primary-light)',
          borderRadius: '8px',
          border: '1px solid var(--accent-primary)',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div>
            <div style={{ fontWeight: 500, color: textColor, marginBottom: '4px' }}>{t('directory.usageTip')}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {t('directory.usageTipContent')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
