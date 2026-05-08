import React, { useState, useEffect } from 'react'
import type {
  SyncPlan,
  SyncAction
} from '@shared/types'
import { STATUS_COLORS } from '@shared/types'

/**
 * 同步确认对话框属性
 */
export interface SyncConfirmDialogProps {
  isOpen: boolean
  plan: SyncPlan | null
  strategy: 'left-to-right' | 'right-to-left' | 'bidirectional'
  onClose: () => void
  onConfirm: (options: {
    createBackup: boolean
    confirmOverwrite: boolean
    preservePermissions: boolean
  }) => void
  onCancel: () => void
}

/**
 * 同步确认对话框
 *
 * 显示同步计划的统计信息和警告，让用户确认是否执行
 */
export const SyncConfirmDialog: React.FC<SyncConfirmDialogProps> = ({
  isOpen,
  plan,
  strategy,
  onClose,
  onConfirm,
  onCancel
}) => {
  const [createBackup, setCreateBackup] = useState(true)
  const [confirmOverwrite, setConfirmOverwrite] = useState(true)
  const [preservePermissions, setPreservePermissions] = useState(true)
  const [showDetails, setShowDetails] = useState(false)

  // 重置状态当对话框打开
  useEffect(() => {
    if (isOpen) {
      setCreateBackup(true)
      setConfirmOverwrite(true)
      setPreservePermissions(true)
      setShowDetails(false)
    }
  }, [isOpen])

  if (!isOpen || !plan) return null

  const { stats, warnings, operations } = plan

  // 获取策略标签
  const getStrategyLabel = () => {
    switch (strategy) {
      case 'left-to-right':
        return '将左侧同步到右侧'
      case 'right-to-left':
        return '将右侧同步到左侧'
      case 'bidirectional':
        return '双向同步'
      default:
        return '同步'
    }
  }

  // 获取操作类型统计
  const getOperationStats = () => {
    const copyLeftToRight = operations.filter(o => o.action === 'copy-left-to-right').length
    const copyRightToLeft = operations.filter(o => o.action === 'copy-right-to-left').length
    const deleteLeft = operations.filter(o => o.action === 'delete-left').length
    const deleteRight = operations.filter(o => o.action === 'delete-right').length
    const merge = operations.filter(o => o.action === 'merge').length

    return { copyLeftToRight, copyRightToLeft, deleteLeft, deleteRight, merge }
  }

  const opStats = getOperationStats()

  // 格式化文件大小
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 获取状态图标
  const getActionIcon = (action: SyncAction): string => {
    switch (action) {
      case 'copy-left-to-right':
        return '→'
      case 'copy-right-to-left':
        return '←'
      case 'delete-left':
        return '🗑️ (左)'
      case 'delete-right':
        return '🗑️ (右)'
      case 'merge':
        return '⇄'
      case 'ignore':
        return '⊘'
      default:
        return '?'
    }
  }

  // 获取操作颜色
  const getActionColor = (action: SyncAction): string => {
    switch (action) {
      case 'copy-left-to-right':
      case 'copy-right-to-left':
        return '#3b82f6'
      case 'delete-left':
      case 'delete-right':
        return '#ef4444'
      case 'merge':
        return '#f59e0b'
      case 'ignore':
        return '#9ca3af'
      default:
        return '#6b7280'
    }
  }

  const handleConfirm = () => {
    onConfirm({
      createBackup,
      confirmOverwrite,
      preservePermissions
    })
    onClose()
  }

  const handleCancel = () => {
    onCancel()
    onClose()
  }

  return (
    <div className="sync-confirm-overlay" onClick={onClose}>
      <div className="sync-confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="sync-confirm-header">
          <span className="warning-icon">⚠️</span>
          <h2>即将执行同步操作</h2>
        </div>

        <div className="sync-confirm-content">
          <div className="sync-target">
            <strong>目标:</strong> {getStrategyLabel()}
          </div>

          <div className="sync-stats">
            <h3>📊 操作统计</h3>
            <div className="stats-grid">
              {(strategy === 'left-to-right' || strategy === 'bidirectional') && opStats.copyLeftToRight > 0 && (
                <div className="stat-item copy">
                  <span className="stat-value">{opStats.copyLeftToRight}</span>
                  <span className="stat-label">复制到右侧</span>
                </div>
              )}
              {(strategy === 'right-to-left' || strategy === 'bidirectional') && opStats.copyRightToLeft > 0 && (
                <div className="stat-item copy">
                  <span className="stat-value">{opStats.copyRightToLeft}</span>
                  <span className="stat-label">复制到左侧</span>
                </div>
              )}
              {opStats.merge > 0 && (
                <div className="stat-item merge">
                  <span className="stat-value">{opStats.merge}</span>
                  <span className="stat-label">合并</span>
                </div>
              )}
              {opStats.deleteLeft > 0 && (
                <div className="stat-item delete">
                  <span className="stat-value">{opStats.deleteLeft}</span>
                  <span className="stat-label">删除左侧</span>
                </div>
              )}
              {opStats.deleteRight > 0 && (
                <div className="stat-item delete">
                  <span className="stat-value">{opStats.deleteRight}</span>
                  <span className="stat-label">删除右侧</span>
                </div>
              )}
              <div className="stat-item size">
                <span className="stat-value">{formatSize(stats.totalBytes)}</span>
                <span className="stat-label">总数据量</span>
              </div>
            </div>
          </div>

          {warnings.length > 0 && (
            <div className="sync-warnings">
              <h3>⚠️ 警告</h3>
              <ul>
                {warnings.map((warning, index) => (
                  <li key={index} className="warning-item">{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="sync-options">
            <h3>⚙️ 选项</h3>
            <label className="option-item">
              <input
                type="checkbox"
                checked={createBackup}
                onChange={(e) => setCreateBackup(e.target.checked)}
              />
              <span>创建备份 (.backup)</span>
            </label>
            <label className="option-item">
              <input
                type="checkbox"
                checked={confirmOverwrite}
                onChange={(e) => setConfirmOverwrite(e.target.checked)}
              />
              <span>确认覆盖较新文件</span>
            </label>
            <label className="option-item">
              <input
                type="checkbox"
                checked={preservePermissions}
                onChange={(e) => setPreservePermissions(e.target.checked)}
              />
              <span>保留文件权限</span>
            </label>
          </div>

          <div className="sync-details-toggle">
            <button
              className="toggle-btn"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? '隐藏详细列表 ▲' : '预览详细列表 ▼'}
            </button>
          </div>

          {showDetails && (
            <div className="sync-details">
              <div className="operations-list">
                <table>
                  <thead>
                    <tr>
                      <th>操作</th>
                      <th>文件</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations.slice(0, 50).map((op) => (
                      <tr key={op.id} className={`operation-row ${op.action}`}>
                        <td>
                          <span
                            className="action-icon"
                            style={{ color: getActionColor(op.action) }}
                          >
                            {getActionIcon(op.action)}
                          </span>
                        </td>
                        <td className="file-name" title={op.entry.relativePath}>
                          {op.entry.name}
                        </td>
                        <td>
                          <span
                            className="status-badge"
                            style={{
                              backgroundColor: STATUS_COLORS[op.entry.status]?.color || '#6b7280'
                            }}
                          >
                            {op.entry.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {operations.length > 50 && (
                  <p className="more-operations">
                    还有 {operations.length - 50} 个操作...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="sync-confirm-actions">
          <button className="btn-cancel" onClick={handleCancel}>
            取消
          </button>
          <button className="btn-confirm" onClick={handleConfirm}>
            确认同步 ▶
          </button>
        </div>
      </div>
    </div>
  )
}

export default SyncConfirmDialog
