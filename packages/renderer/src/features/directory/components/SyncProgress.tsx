import React from 'react'
import type { SyncProgress, SyncOperation, SyncAction } from '@shared/types'

/**
 * 同步进度显示组件属性
 */
export interface SyncProgressProps {
  progress: SyncProgress | null
  isVisible: boolean
  onCancel?: () => void
}

/**
 * 同步进度显示组件
 *
 * 显示同步操作的实时进度
 */
export const SyncProgressView: React.FC<SyncProgressProps> = ({
  progress,
  isVisible,
  onCancel
}) => {
  if (!isVisible || !progress) return null

  const { completed, total, current, percentage } = progress

  // 获取操作标签
  const getActionLabel = (action: SyncAction): string => {
    switch (action) {
      case 'copy-left-to-right':
        return '复制到右侧'
      case 'copy-right-to-left':
        return '复制到左侧'
      case 'delete-left':
        return '删除左侧'
      case 'delete-right':
        return '删除右侧'
      case 'merge':
        return '合并'
      case 'ignore':
        return '忽略'
      default:
        return action
    }
  }

  // 获取操作图标
  const getActionIcon = (action: SyncAction): string => {
    switch (action) {
      case 'copy-left-to-right':
        return '→'
      case 'copy-right-to-left':
        return '←'
      case 'delete-left':
      case 'delete-right':
        return '🗑️'
      case 'merge':
        return '⇄'
      case 'ignore':
        return '⊘'
      default:
        return '•'
    }
  }

  // 格式化文件大小
  const formatSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 获取文件大小
  const getFileSize = (op: SyncOperation): string => {
    const size = op.entry.leftMetadata?.size || op.entry.rightMetadata?.size
    return formatSize(size)
  }

  // 计算估计剩余时间
  const getEstimatedTimeRemaining = (): string => {
    if (completed === 0) return '计算中...'
    const elapsedRatio = completed / total
    const totalEstimated = elapsedRatio > 0 ? (Date.now() - (Date.now() * (1 - elapsedRatio))) : 0
    const remaining = Math.max(0, (totalEstimated * (1 - elapsedRatio)) / elapsedRatio / 1000)

    if (remaining < 60) {
      return `${Math.ceil(remaining)} 秒`
    } else {
      return `${Math.ceil(remaining / 60)} 分钟`
    }
  }

  return (
    <div className="sync-progress-overlay">
      <div className="sync-progress-dialog">
        <div className="sync-progress-header">
          <div className="spinner"></div>
          <h3>正在同步...</h3>
        </div>

        <div className="sync-progress-content">
          {/* 进度条 */}
          <div className="progress-section">
            <div className="progress-info">
              <span>{completed} / {total}</span>
              <span>{percentage}%</span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="progress-meta">
              <span>剩余时间: {getEstimatedTimeRemaining()}</span>
            </div>
          </div>

          {/* 当前操作 */}
          {current && (
            <div className="current-operation">
              <div className="operation-label">当前操作</div>
              <div className="operation-card">
                <div className="operation-icon">
                  {getActionIcon(current.action)}
                </div>
                <div className="operation-details">
                  <div className="operation-name" title={current.entry.relativePath}>
                    {current.entry.name}
                  </div>
                  <div className="operation-info">
                    <span className="action-label">{getActionLabel(current.action)}</span>
                    <span className="file-size">{getFileSize(current)}</span>
                  </div>
                </div>
                <div className={`operation-status ${current.status}`}>
                  {current.status === 'in-progress' && <div className="mini-spinner" />}
                  {current.status === 'completed' && '✓'}
                  {current.status === 'failed' && '✗'}
                  {current.status === 'pending' && '○'}
                </div>
              </div>
            </div>
          )}

          {/* 统计信息 */}
          <div className="sync-stats">
            <div className="stat-item">
              <span className="stat-label">已完成</span>
              <span className="stat-value">{completed}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">总数</span>
              <span className="stat-value">{total}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">进度</span>
              <span className="stat-value">{percentage}%</span>
            </div>
          </div>
        </div>

        {onCancel && (
          <div className="sync-progress-actions">
            <button className="btn-cancel" onClick={onCancel}>
              取消同步
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default SyncProgressView
