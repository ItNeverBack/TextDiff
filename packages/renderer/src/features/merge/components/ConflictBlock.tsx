import { useState } from 'react'
import type { ConflictRegion } from '@shared/types'
import type { Resolution } from '../stores/merge.store'

interface ConflictBlockProps {
  conflict: ConflictRegion
  onResolve: (resolution: Resolution) => void
  index?: number
  isActive?: boolean
  resolution?: Resolution
  onSelect?: () => void
}

export function ConflictBlock({
  conflict,
  onResolve,
  index = 0,
  isActive = false,
  resolution,
  onSelect
}: ConflictBlockProps) {
  const isResolved = !!resolution
  const [showManualEditor, setShowManualEditor] = useState(false)
  const [manualContent, setManualContent] = useState(
    resolution?.type === 'manual' ? resolution.content : conflict.leftContent
  )

  const getResolutionLabel = () => {
    if (!resolution) return null
    if (resolution.type === 'base') return '已采用 Base'
    if (resolution.type === 'left') return '已采用左侧'
    if (resolution.type === 'right') return '已采用右侧'
    if (resolution.type === 'manual') return '已手动编辑'
    return null
  }

  const handleManualSave = (e: React.MouseEvent) => {
    e.stopPropagation()
    onResolve({ type: 'manual', content: manualContent })
    setShowManualEditor(false)
  }

  const handleManualCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowManualEditor(false)
  }

  const handleOpenManualEditor = (e: React.MouseEvent) => {
    e.stopPropagation()
    // 预填当前已选择的内容，或默认用左侧
    if (resolution?.type === 'manual') {
      setManualContent(resolution.content)
    } else if (resolution?.type === 'left') {
      setManualContent(conflict.leftContent)
    } else if (resolution?.type === 'right') {
      setManualContent(conflict.rightContent)
    } else if (resolution?.type === 'base') {
      setManualContent(conflict.baseContent)
    } else {
      setManualContent(conflict.leftContent)
    }
    setShowManualEditor(true)
  }

  return (
    <div
      className={`conflict-block ${isActive ? 'active' : ''} ${isResolved ? 'resolved' : ''}`}
      onClick={onSelect}
      style={{
        border: `1px solid ${isActive ? 'var(--accent-primary)' : isResolved ? 'var(--diff-added-line)' : 'var(--diff-conflict-line, #ffc107)'}`,
        borderRadius: 4,
        marginBottom: 8,
        overflow: 'hidden',
        cursor: 'pointer'
      }}
    >
      {/* 冲突块标题 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 8px',
          background: isActive ? 'var(--accent-primary-light, rgba(59,130,246,0.1))' : 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-light)',
          fontSize: 12
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
          冲突 #{index + 1}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
          第 {conflict.startLine + 1} 行
        </span>
        {isResolved && (
          <span style={{
            marginLeft: 'auto',
            color: 'var(--diff-added-text)',
            fontSize: 11,
            fontWeight: 500
          }}>
            ✓ {getResolutionLabel()}
          </span>
        )}
        {!isResolved && (
          <span style={{
            marginLeft: 'auto',
            color: 'var(--diff-conflict-line, #ffc107)',
            fontSize: 11
          }}>
            未解决
          </span>
        )}
      </div>

      {/* 手动编辑区域 */}
      {showManualEditor && (
        <div
          style={{ padding: 8, background: 'var(--bg-app)', borderBottom: '1px solid var(--border-light)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
            手动编辑合并结果
          </div>
          <textarea
            value={manualContent}
            onChange={(e) => setManualContent(e.target.value)}
            style={{
              width: '100%',
              minHeight: 80,
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 12,
              padding: '6px 8px',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 3,
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
            <button
              className="btn-secondary"
              style={{ fontSize: 11, padding: '2px 10px' }}
              onClick={handleManualCancel}
            >
              取消
            </button>
            <button
              className="btn-primary"
              style={{ fontSize: 11, padding: '2px 10px' }}
              onClick={handleManualSave}
            >
              确认
            </button>
          </div>
        </div>
      )}

      {/* 三方内容对比 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
        {/* Base */}
        <div style={{ borderRight: '1px solid var(--border-light)' }}>
          <div style={{
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-light)'
          }}>
            Base（公共祖先）
          </div>
          <pre style={{
            margin: 0,
            padding: '6px 8px',
            fontSize: 12,
            fontFamily: 'var(--font-mono, monospace)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            background: resolution?.type === 'base' ? 'var(--diff-added-bg)' : 'transparent',
            minHeight: 32,
            color: 'var(--text-primary)'
          }}>
            {conflict.baseContent || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>(空)</span>}
          </pre>
          <div style={{ padding: '4px 8px', borderTop: '1px solid var(--border-light)' }}>
            <button
              className="btn-secondary"
              style={{ fontSize: 11, padding: '2px 8px' }}
              onClick={(e) => { e.stopPropagation(); onResolve({ type: 'base' }) }}
            >
              采用 Base
            </button>
          </div>
        </div>

        {/* Left */}
        <div style={{ borderRight: '1px solid var(--border-light)' }}>
          <div style={{
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--diff-added-text)',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-light)'
          }}>
            左侧（Local）
          </div>
          <pre style={{
            margin: 0,
            padding: '6px 8px',
            fontSize: 12,
            fontFamily: 'var(--font-mono, monospace)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            background: resolution?.type === 'left' ? 'var(--diff-added-bg)' : 'transparent',
            minHeight: 32,
            color: 'var(--text-primary)'
          }}>
            {conflict.leftContent || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>(空)</span>}
          </pre>
          <div style={{ padding: '4px 8px', borderTop: '1px solid var(--border-light)' }}>
            <button
              className="btn-primary"
              style={{ fontSize: 11, padding: '2px 8px' }}
              onClick={(e) => { e.stopPropagation(); onResolve({ type: 'left' }) }}
            >
              采用左侧
            </button>
          </div>
        </div>

        {/* Right */}
        <div>
          <div style={{
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--diff-deleted-text)',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-light)'
          }}>
            右侧（Remote）
          </div>
          <pre style={{
            margin: 0,
            padding: '6px 8px',
            fontSize: 12,
            fontFamily: 'var(--font-mono, monospace)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            background: resolution?.type === 'right' ? 'var(--diff-deleted-bg)' : 'transparent',
            minHeight: 32,
            color: 'var(--text-primary)'
          }}>
            {conflict.rightContent || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>(空)</span>}
          </pre>
          <div style={{ padding: '4px 8px', borderTop: '1px solid var(--border-light)' }}>
            <button
              className="btn-secondary"
              style={{ fontSize: 11, padding: '2px 8px' }}
              onClick={(e) => { e.stopPropagation(); onResolve({ type: 'right' }) }}
            >
              采用右侧
            </button>
          </div>
        </div>
      </div>

      {/* 手动编辑按钮 */}
      <div style={{
        padding: '4px 8px',
        borderTop: '1px solid var(--border-light)',
        background: 'var(--bg-surface)',
        display: 'flex',
        justifyContent: 'flex-end'
      }}>
        <button
          className="btn-secondary"
          style={{ fontSize: 11, padding: '2px 10px' }}
          onClick={handleOpenManualEditor}
        >
          手动编辑
        </button>
      </div>
    </div>
  )
}
