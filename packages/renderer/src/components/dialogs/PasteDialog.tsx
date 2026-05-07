import { useState, useEffect } from 'react'
import type { FileInfo } from '@shared/types'
import { useDiffStore, useTabStore } from '../../stores'
import { api } from '../../lib/api'
import { useI18n } from '../../hooks/useI18n'

interface PasteDialogProps {
  open: boolean
  onClose: () => void
}

export function PasteDialog({ open, onClose }: PasteDialogProps) {
  const [leftText, setLeftText] = useState('')
  const [rightText, setRightText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { options, setLeftFile, setRightFile, setDiffResult, setIsComputing } = useDiffStore()
  const { setActiveTabFiles, setActiveTabDiffResult } = useTabStore()
  const { t } = useI18n()

  useEffect(() => {
    if (open) {
      setLeftText('')
      setRightText('')
      setError(null)
    }
  }, [open])

  if (!open) return null

  const handleCompare = async () => {
    // 重置错误状态
    setError(null)

    // 验证输入
    if (!leftText.trim() && !rightText.trim()) {
      setError(t('dialog.paste.errorBothEmpty'))
      return
    }

    if (!leftText.trim()) {
      setError(t('dialog.paste.errorLeftEmpty'))
      return
    }

    if (!rightText.trim()) {
      setError(t('dialog.paste.errorRightEmpty'))
      return
    }

    setIsLoading(true)

    // 标准化换行符为 LF，确保与 Monaco 编辑器一致
    const normalizedLeftText = leftText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const normalizedRightText = rightText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    const leftFile: FileInfo = {
      path: null,
      content: normalizedLeftText,
      encoding: 'UTF-8',
      lineEnding: 'lf',
      size: normalizedLeftText.length,
      mtime: null,
      language: 'plaintext'
    }
    const rightFile: FileInfo = {
      path: null,
      content: normalizedRightText,
      encoding: 'UTF-8',
      lineEnding: 'lf',
      size: normalizedRightText.length,
      mtime: null,
      language: 'plaintext'
    }

    setLeftFile(leftFile)
    setRightFile(rightFile)
    setActiveTabFiles(leftFile, rightFile)
    
    // 关闭对话框
    onClose()

    setIsComputing(true)
    try {
      const result = await api.computeDiff(leftFile, rightFile, options)
      setDiffResult(result)
      setActiveTabDiffResult(result)
    } catch (error) {
      console.error('Failed to compute diff:', error)
      setError(t('dialog.paste.compareFailed'))
    } finally {
      setIsComputing(false)
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setError(null)
    setLeftText('')
    setRightText('')
    onClose()
  }

  const handleClear = (side: 'left' | 'right') => {
    if (side === 'left') {
      setLeftText('')
    } else {
      setRightText('')
    }
    setError(null)
  }

  return (
    <div className="overlay">
      <div className="panel paste-panel">
        <div className="panel-header">
          <h3 className="panel-title">{t('dialog.paste.title')}</h3>
          <button className="panel-close" onClick={handleClose}>×</button>
        </div>
        
        {error && (
          <div className="paste-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <div className="panel-body paste-body">
          <div className="paste-col">
            <div className="paste-header">
              <label className="paste-label">{t('dialog.paste.leftText')}</label>
              <button
                className="paste-clear-btn"
                onClick={() => handleClear('left')}
                disabled={!leftText}
              >
                {t('common.clear')}
              </button>
            </div>
            <textarea
              className="paste-textarea"
              placeholder={t('dialog.paste.leftPlaceholder')}
              value={leftText}
              onChange={(e) => {
                setLeftText(e.target.value)
                setError(null)
              }}
              disabled={isLoading}
            />
            <div className="paste-stats">
              {leftText.length > 0 && `${leftText.length} ${t('common.characters')} · ${leftText.split('\n').length} ${t('file.lines')}`}
            </div>
          </div>
          
          <div className="paste-col">
            <div className="paste-header">
              <label className="paste-label">{t('dialog.paste.rightText')}</label>
              <button
                className="paste-clear-btn"
                onClick={() => handleClear('right')}
                disabled={!rightText}
              >
                {t('common.clear')}
              </button>
            </div>
            <textarea
              className="paste-textarea"
              placeholder={t('dialog.paste.rightPlaceholder')}
              value={rightText}
              onChange={(e) => {
                setRightText(e.target.value)
                setError(null)
              }}
              disabled={isLoading}
            />
            <div className="paste-stats">
              {rightText.length > 0 && `${rightText.length} ${t('common.characters')} · ${rightText.split('\n').length} ${t('file.lines')}`}
            </div>
          </div>
        </div>
        
        <div className="panel-footer">
          <button className="btn-secondary" onClick={handleClose} disabled={isLoading}>{t('dialog.cancel')}</button>
          <button
            className="btn-primary"
            onClick={handleCompare}
            disabled={isLoading || (!leftText.trim() && !rightText.trim())}
          >
            {isLoading ? (
              <>
                <svg className="spinner" width="16" height="16" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeLinecap="round"/>
                </svg>
                {t('common.processing')}
              </>
            ) : t('dialog.paste.compare')}
          </button>
        </div>
      </div>
    </div>
  )
}
