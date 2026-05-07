import { useState, useEffect, useCallback } from 'react'
import { useTabStore, useDiffStore } from '../../stores'
import { api } from '../../lib/api'
import { useI18n } from '../../hooks/useI18n'
import type { FileInfo, RecentFile } from '@shared/types'

interface WelcomeViewProps {
  onPasteDialog: () => void
}

interface RecentSession {
  id: string
  name: string
  leftPath: string | null
  rightPath: string | null
  timestamp: number
}

// 从 DataTransfer 中提取文件路径
async function getDroppedFilePaths(dataTransfer: DataTransfer): Promise<string[]> {
  const paths: string[] = []
  
  if (dataTransfer.items) {
    for (let i = 0; i < dataTransfer.items.length; i++) {
      const item = dataTransfer.items[i]
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          const electronFile = file as File & { path?: string }
          if (electronFile.path) {
            paths.push(electronFile.path)
          }
        }
      }
    }
  }

  if (paths.length === 0 && dataTransfer.files) {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const file = dataTransfer.files[i] as File & { path?: string }
      if (file.path) {
        paths.push(file.path)
      }
    }
  }

  return paths
}

// 单侧视图组件
interface SideViewProps {
  side: 'left' | 'right'
  currentFile: FileInfo | null
  onSelectFile: () => void
  onDropFile?: (filePath: string) => void
  recentFiles: RecentFile[]
  onSelectRecentFile: (file: RecentFile) => void
  isLoading: boolean
  title: string
}

function SideView({
  side,
  currentFile,
  onSelectFile,
  onDropFile,
  recentFiles,
  onSelectRecentFile,
  isLoading,
  title
}: SideViewProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  // 处理拖拽进入
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer?.types.includes('Files')) {
      setIsDragOver(true)
    }
  }, [])

  // 处理拖拽离开 - 检查是否真的离开了元素
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const currentTarget = e.currentTarget as HTMLElement
    const relatedTarget = e.relatedTarget as HTMLElement
    
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      setIsDragOver(false)
    }
  }, [])

  // 处理拖拽悬停
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  // 处理放置
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    if (!e.dataTransfer || !onDropFile) return

    const filePaths = await getDroppedFilePaths(e.dataTransfer)
    if (filePaths.length > 0) {
      onDropFile(filePaths[0])
    }
  }, [onDropFile])

  const { t } = useI18n()

  const getFileName = (path: string): string => {
    return path.split(/[/\\]/).pop() || path
  }

  const formatTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(diff / 3600000)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(diff / 86400000)
    if (days < 30) return `${days}d ago`
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
      className="welcome-drop-zone"
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
        position: 'relative'
      }}
    >
      {/* 拖拽指示层 */}
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
            松开以在{side === 'left' ? '左侧' : '右侧'}打开
          </span>
        </div>
      )}
      {/* 标题 */}
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
        {currentFile && (
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

      {/* 文件选择区域 */}
      {currentFile ? (
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
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={accentColor}
              strokeWidth="2"
              style={{ flexShrink: 0 }}
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            <span
              style={{
                fontWeight: 500,
                color: textColor,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={currentFile.path}
            >
              {getFileName(currentFile.path)}
            </span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <button
              onClick={onSelectFile}
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
              Change File
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onSelectFile}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '32px 16px',
            border: `2px dashed ${borderColor}`,
            borderRadius: '12px',
            backgroundColor: 'transparent',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            color: textMuted,
            marginBottom: '16px'
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            <line x1="12" y1="11" x2="12" y2="17" />
            <line x1="9" y1="14" x2="15" y2="14" />
          </svg>
          <span style={{ fontWeight: 500, color: textColor }}>
            打开文件
          </span>
          <span style={{ fontSize: '12px' }}>Click to select file</span>
        </button>
      )}

      {/* 最近文件列表 */}
      {recentFiles.length > 0 && (
        <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
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
            Recent Files
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              maxHeight: '160px',
              overflowY: 'auto'
            }}
          >
            {recentFiles.slice(0, 5).map((file) => (
              <button
                key={file.path}
                onClick={() => onSelectRecentFile(file)}
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
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
                  title={file.path}
                >
                  {getFileName(file.path)}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    color: textMuted,
                    flexShrink: 0
                  }}
                >
                  {formatTime(file.accessedAt)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function WelcomeView({ onPasteDialog }: WelcomeViewProps) {
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { t } = useI18n()
  const { tabs, activeIndex, setActiveTabFiles } = useTabStore()
  const {
    leftFile,
    rightFile,
    setLeftFile,
    setRightFile,
    setDiffResult,
    options,
    setIsComputing,
    setViewMode,
    reset
  } = useDiffStore()

  const currentTab = tabs[activeIndex]
  const currentLeftFile = currentTab?.leftFile ?? leftFile
  const currentRightFile = currentTab?.rightFile ?? rightFile

  const loadRecentFiles = useCallback(async () => {
    try {
      const files = await api.getRecentFiles(10)
      setRecentFiles(files)
    } catch (error) {
      console.error('Failed to load recent files:', error)
    }
  }, [])

  const loadRecentSessions = useCallback(() => {
    const stored = localStorage.getItem('textdiff-recent-sessions')
    if (stored) {
      try {
        const sessions = JSON.parse(stored) as RecentSession[]
        setRecentSessions(sessions.slice(0, 5))
      } catch {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    loadRecentFiles()
    loadRecentSessions()
  }, [loadRecentFiles, loadRecentSessions])

  const saveToRecentSessions = async (left: FileInfo | null, right: FileInfo | null) => {
    if (!left && !right) return
    const leftName = left?.path?.split(/[/\\]/).pop() || t('tab.untitled')
    const rightName = right?.path?.split(/[/\\]/).pop() || t('tab.untitled')
    const session: RecentSession = {
      id: Date.now().toString(),
      name: left && right ? `${leftName} vs ${rightName}` : left ? leftName : rightName,
      leftPath: left?.path || null,
      rightPath: right?.path || null,
      timestamp: Date.now()
    }
    setRecentSessions((prev) => {
      const filtered = prev.filter((s) => s.name !== session.name)
      const updated = [session, ...filtered].slice(0, 10)
      localStorage.setItem('textdiff-recent-sessions', JSON.stringify(updated))
      return updated.slice(0, 5)
    })
    if (left?.path) {
      try {
        await api.addRecentFile(left.path)
      } catch (error) {
        console.error('Failed to add recent file:', error)
      }
    }
    if (right?.path) {
      try {
        await api.addRecentFile(right.path)
      } catch (error) {
        console.error('Failed to add recent file:', error)
      }
    }
    loadRecentFiles()
  }

  // 处理拖拽文件到指定侧
  const handleDropFile = async (filePath: string, side: 'left' | 'right') => {
    setIsLoading(true)
    try {
      const fileInfo = await api.readFile(filePath)
      if (side === 'left') {
        setLeftFile(fileInfo)
      } else {
        setRightFile(fileInfo)
      }
      setActiveTabFiles(
        side === 'left' ? fileInfo : currentLeftFile,
        side === 'right' ? fileInfo : currentRightFile
      )
      if (fileInfo.path) {
        try {
          await api.addRecentFile(fileInfo.path)
          loadRecentFiles()
        } catch (error) {
          console.error('Failed to add recent file:', error)
        }
      }
      const newLeftFile = side === 'left' ? fileInfo : currentLeftFile
      const newRightFile = side === 'right' ? fileInfo : currentRightFile
      if (newLeftFile && newRightFile) {
        await saveToRecentSessions(newLeftFile, newRightFile)
        setIsComputing(true)
        try {
          const result = await api.computeDiff(newLeftFile, newRightFile, options)
          setDiffResult(result)
          useTabStore.getState().setActiveTabDiffResult(result)
          setViewMode('split')
        } catch (error) {
          console.error('Failed to compute diff:', error)
        } finally {
          setIsComputing(false)
        }
      }
    } catch (error) {
      console.error('Failed to open dropped file:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectFile = async (side: 'left' | 'right') => {
    setIsLoading(true)
    try {
      const file = await api.openFile(side)
      if (!file) {
        setIsLoading(false)
        return
      }
      if (side === 'left') {
        setLeftFile(file)
      } else {
        setRightFile(file)
      }
      setActiveTabFiles(
        side === 'left' ? file : currentLeftFile,
        side === 'right' ? file : currentRightFile
      )
      if (file.path) {
        try {
          await api.addRecentFile(file.path)
          loadRecentFiles()
        } catch (error) {
          console.error('Failed to add recent file:', error)
        }
      }
      const newLeftFile = side === 'left' ? file : currentLeftFile
      const newRightFile = side === 'right' ? file : currentRightFile
      if (newLeftFile && newRightFile) {
        await saveToRecentSessions(newLeftFile, newRightFile)
        setIsComputing(true)
        try {
          const result = await api.computeDiff(newLeftFile, newRightFile, options)
          setDiffResult(result)
          useTabStore.getState().setActiveTabDiffResult(result)
          setViewMode('split')
        } catch (error) {
          console.error('Failed to compute diff:', error)
        } finally {
          setIsComputing(false)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectRecentFile = async (file: RecentFile, side: 'left' | 'right') => {
    setIsLoading(true)
    try {
      const fileInfo = await api.readFile(file.path)
      if (side === 'left') {
        setLeftFile(fileInfo)
      } else {
        setRightFile(fileInfo)
      }
      setActiveTabFiles(
        side === 'left' ? fileInfo : currentLeftFile,
        side === 'right' ? fileInfo : currentRightFile
      )
      try {
        await api.addRecentFile(file.path)
        loadRecentFiles()
      } catch (error) {
        console.error('Failed to update recent file:', error)
      }
      const newLeftFile = side === 'left' ? fileInfo : currentLeftFile
      const newRightFile = side === 'right' ? fileInfo : currentRightFile
      if (newLeftFile && newRightFile) {
        await saveToRecentSessions(newLeftFile, newRightFile)
        setIsComputing(true)
        try {
          const result = await api.computeDiff(newLeftFile, newRightFile, options)
          setDiffResult(result)
          useTabStore.getState().setActiveTabDiffResult(result)
          setViewMode('split')
        } catch (error) {
          console.error('Failed to compute diff:', error)
        } finally {
          setIsComputing(false)
        }
      }
    } catch (error) {
      console.error('Failed to open recent file:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadRecentSession = async (session: RecentSession) => {
    setIsLoading(true)
    try {
      let newLeftFile: FileInfo | null = null
      let newRightFile: FileInfo | null = null
      if (session.leftPath) {
        newLeftFile = await api.readFile(session.leftPath)
      }
      if (session.rightPath) {
        newRightFile = await api.readFile(session.rightPath)
      }
      if (newLeftFile || newRightFile) {
        if (currentLeftFile || currentRightFile) {
          const { addTab, selectTab, tabs } = useTabStore.getState()
          addTab()
          selectTab(tabs.length)
        }
        setLeftFile(newLeftFile)
        setRightFile(newRightFile)
        setActiveTabFiles(newLeftFile, newRightFile)
        if (newLeftFile && newRightFile) {
          setIsComputing(true)
          try {
            const result = await api.computeDiff(newLeftFile, newRightFile, options)
            setDiffResult(result)
            useTabStore.getState().setActiveTabDiffResult(result)
            setViewMode('split')
          } catch (error) {
            console.error('Failed to compute diff:', error)
          } finally {
            setIsComputing(false)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load recent session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearAll = () => {
    reset()
    setActiveTabFiles(null, null)
  }

  const bgColor = 'var(--bg-app)'
  const textColor = 'var(--text-primary)'
  const textSecondary = 'var(--text-secondary)'
  const accentColor = 'var(--accent-primary)'
  const borderColor = 'var(--border-color)'

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
      {/* 顶部标题 */}
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
            {t('welcome.title')}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(currentLeftFile || currentRightFile) && (
            <button
              onClick={handleClearAll}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: 'var(--bg-surface)',
                color: textColor,
                border: `1px solid ${borderColor}`
              }}
            >
              Clear All
            </button>
          )}
          <button
            onClick={onPasteDialog}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              backgroundColor: accentColor,
              color: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
            Paste Text
          </button>
        </div>
      </div>

      {/* 两侧视图 - 使用固定两列布局 */}
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
        <SideView
          side="left"
          currentFile={currentLeftFile}
          onSelectFile={() => handleSelectFile('left')}
          onDropFile={(path) => handleDropFile(path, 'left')}
          recentFiles={recentFiles}
          onSelectRecentFile={(file) => handleSelectRecentFile(file, 'left')}
          isLoading={isLoading}
          title="Left File"
        />
        <SideView
          side="right"
          currentFile={currentRightFile}
          onSelectFile={() => handleSelectFile('right')}
          onDropFile={(path) => handleDropFile(path, 'right')}
          recentFiles={recentFiles}
          onSelectRecentFile={(file) => handleSelectRecentFile(file, 'right')}
          isLoading={isLoading}
          title="Right File"
        />
      </div>

      {/* 最近会话列表 */}
      {recentSessions.length > 0 && (
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '24px',
            borderTop: `1px solid ${borderColor}`,
            flexShrink: 0
          }}
        >
          <h3
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px',
              marginTop: 0
            }}
          >
            {t('welcome.recentSessions')}
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '8px'
            }}
          >
            {recentSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => loadRecentSession(session)}
                disabled={isLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-surface)',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  textAlign: 'left'
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={accentColor}
                  strokeWidth="2"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 500,
                      color: textColor,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {session.name}
                  </div>
                  <div style={{ fontSize: '11px', color: textSecondary }}>
                    {new Date(session.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
