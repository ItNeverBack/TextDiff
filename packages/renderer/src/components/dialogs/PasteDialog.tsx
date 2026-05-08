import { useState, useEffect } from 'react'
import type { FileInfo } from '@shared/types'
import { useTabStore } from '../../stores'
import { useI18n } from '../../hooks/useI18n'

interface PasteDialogProps {
  open: boolean
  onClose: () => void
}

export function PasteDialog({ open, onClose }: PasteDialogProps) {
  const [leftText, setLeftText] = useState('')
  const [rightText, setRightText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { addTab, closeTab, setActiveTabFiles, updateTabTitle } = useTabStore()
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

    // 记录当前 tab 是否为空欢迎界面（无文件、非目录、非合并视图）
    const currentState = useTabStore.getState()
    const currentTabIndex = currentState.activeIndex
    const currentTab = currentState.tabs[currentTabIndex]
    const isWelcomeTab =
      currentTab &&
      !currentTab.leftFile &&
      !currentTab.rightFile &&
      !currentTab.isDirectoryView &&
      !currentTab.isMergeView

    // 创建新 tab（会自动切换 viewMode 为 split，清除目录/合并状态）
    addTab()
    // 如果之前是欢迎界面 tab，关闭它（addTab 后至少有两个 tab）
    if (isWelcomeTab) {
      closeTab(currentTabIndex)
    }
    // addTab 后 activeIndex 已更新，此时设置文件和标题
    // setActiveTabFiles 会同步更新 diff store，SplitDiffView 会自动触发 diff 计算
    setActiveTabFiles(leftFile, rightFile)
    // 覆盖自动生成的空标题
    const newActiveIndex = useTabStore.getState().activeIndex
    updateTabTitle(newActiveIndex, t('dialog.paste.title'))

    // 关闭对话框
    onClose()
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
            />
            <div className="paste-stats">
              {rightText.length > 0 && `${rightText.length} ${t('common.characters')} · ${rightText.split('\n').length} ${t('file.lines')}`}
            </div>
          </div>
        </div>
        
        <div className="panel-footer">
          <button className="btn-secondary" onClick={handleClose}>{t('dialog.cancel')}</button>
          <button
            className="btn-primary"
            onClick={handleCompare}
            disabled={!leftText.trim() || !rightText.trim()}
          >
            {t('dialog.paste.compare')}
          </button>
        </div>
      </div>
    </div>
  )
}
