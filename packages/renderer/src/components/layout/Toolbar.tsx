import { useRef } from 'react'
import { useDiffStore, useTabStore } from '../../stores'
import { api } from '../../lib/api'
import { useI18n } from '../../hooks/useI18n'

interface ToolbarProps {
  onPasteDialog: () => void
  onShowIgnorePanel: () => void
  onShowSearch: () => void
  onShowDirectoryView?: () => void
  onOpenDirectoryPair?: () => void
  onShowMergeView?: () => void
  onSetSplitView?: () => void
  onSetUnifiedView?: () => void
}

export function Toolbar({ onPasteDialog: _onPasteDialog, onShowIgnorePanel, onShowSearch, onShowDirectoryView: _onShowDirectoryView, onOpenDirectoryPair, onShowMergeView, onSetSplitView, onSetUnifiedView }: ToolbarProps) {
  const { 
    diffResult, 
    options, 
    viewMode, 
    activeChunkIndex,
    isCollapsed,
    setOptions, 
    setViewMode, 
    toggleCollapse,
    nextChunk,
    prevChunk,
    firstChunk,
    lastChunk,
    setLeftFile,
    setRightFile
  } = useDiffStore()
  const { setActiveTabFiles } = useTabStore()
  const { t } = useI18n()
  const toolbarRef = useRef<HTMLDivElement>(null)

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && toolbarRef.current) {
      e.preventDefault()
      toolbarRef.current.scrollLeft += e.deltaY
    }
  }

  const handleOpenFilePair = async () => {
    try {
      // 先选择左侧文件
      const leftResult = await api.showOpenDialog({
        title: t('dialog.paste.leftText'),
        properties: ['openFile'],
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'Text Files', extensions: ['txt', 'json', 'yml', 'yaml', 'xml'] },
          { name: 'Code Files', extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'go', 'rs', 'java', 'c', 'cpp'] }
        ]
      })

      if (!leftResult || leftResult.length === 0) return

      const leftPath = leftResult[0]

      // 再选择右侧文件
      const rightResult = await api.showOpenDialog({
        title: t('dialog.paste.rightText'),
        defaultPath: leftPath,
        properties: ['openFile'],
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'Text Files', extensions: ['txt', 'json', 'yml', 'yaml', 'xml'] },
          { name: 'Code Files', extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'go', 'rs', 'java', 'c', 'cpp'] }
        ]
      })

      if (!rightResult || rightResult.length === 0) return

      const rightPath = rightResult[0]

      // 读取两个文件
      const [leftFileInfo, rightFileInfo] = await Promise.all([
        api.readFile(leftPath),
        api.readFile(rightPath)
      ])

      // 更新状态
      setLeftFile(leftFileInfo)
      setRightFile(rightFileInfo)
      setActiveTabFiles(leftFileInfo, rightFileInfo)
    } catch (error) {
      console.error('Failed to open file pair:', error)
    }
  }

  const handleOpenDirectoryPair = async () => {
    try {
      onOpenDirectoryPair?.()
    } catch (error) {
      console.error('Failed to open directory pair:', error)
    }
  }

  const chunkCount = diffResult?.chunks.length || 0
  const hasChanges = chunkCount > 0
  const isSplitView = viewMode === 'split'

  // 判断当前是否在文件对比模式
  const isFileDiffMode = viewMode === 'split' || viewMode === 'unified'

  // §修复：只有在双栏视图且有变化时才启用折叠按钮
  const canCollapse = isSplitView && hasChanges

  return (
    <div className="toolbar" ref={toolbarRef} onWheel={handleWheel}>
      <div className="toolbar-group">
        <button 
          className="toolbar-btn file-btn" 
          onClick={handleOpenFilePair}
          title={`${t('toolbar.openPair')} (Ctrl+O)`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            <path d="M12 11v6M9 14h6" strokeDasharray="2 2"/>
          </svg>
          <span>{t('toolbar.openPair')}</span>
          <kbd>Ctrl+O</kbd>
        </button>
        <button 
          className="toolbar-btn file-btn" 
          onClick={handleOpenDirectoryPair}
          title={`${t('toolbar.openDirectoryPair')} (Ctrl+Shift+D)`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
            <path d="M9 7V5M15 7V5"/>
          </svg>
          <span>{t('toolbar.openDirectoryPair')}</span>
          <kbd>Ctrl+Shift+D</kbd>
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <div className="ignore-group">
          <span className="ignore-label">{t('toolbar.ignore')}</span>
          <label className="toggle-chip" title={t('toolbar.ignoreWhitespace')}>
            <input 
              type="checkbox" 
              checked={options.ignoreWhitespace !== 'none'}
              onChange={(e) => setOptions({ 
                ignoreWhitespace: e.target.checked ? 'leading-trailing' : 'none' 
              })}
            />
            <span>{t('toolbar.ignoreWhitespace')}</span>
          </label>
          <label className="toggle-chip" title={t('toolbar.ignoreCase')}>
            <input 
              type="checkbox" 
              checked={options.ignoreCase}
              onChange={(e) => setOptions({ ignoreCase: e.target.checked })}
            />
            <span>{t('toolbar.ignoreCase')}</span>
          </label>
          <label className="toggle-chip" title={t('toolbar.ignoreLineEnding')}>
            <input 
              type="checkbox" 
              checked={options.ignoreLineEndings}
              onChange={(e) => setOptions({ ignoreLineEndings: e.target.checked })}
            />
            <span>{t('toolbar.ignoreLineEnding')}</span>
          </label>
          <button className="toolbar-btn compact" onClick={onShowIgnorePanel} title={t('toolbar.more')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M5.93 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
            {t('toolbar.more')}
          </button>
        </div>
      </div>

      {isFileDiffMode && (
        <>
          <div className="toolbar-separator" />

          <div className="toolbar-group nav-group">
            <button className="toolbar-btn icon-only" onClick={firstChunk} title={`${t('toolbar.firstDiff')} (Alt+Home)`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/>
              </svg>
            </button>
            <button className="toolbar-btn icon-only" onClick={prevChunk} title={`${t('toolbar.prevDiff')} (F6)`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 15l-6-6-6 6"/>
              </svg>
            </button>
            <div className="diff-counter">
              <span>{chunkCount > 0 && activeChunkIndex >= 0 ? activeChunkIndex + 1 : '-'}</span>/<span>{chunkCount}</span>
              <span className="diff-label">{t('toolbar.diffCount')}</span>
            </div>
            <button className="toolbar-btn icon-only" onClick={nextChunk} title={`${t('toolbar.nextDiff')} (F7)`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            <button className="toolbar-btn icon-only" onClick={lastChunk} title={`${t('toolbar.lastDiff')} (Alt+End)`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 17l5-5-5-5M6 17l5-5-5-5"/>
              </svg>
            </button>
          </div>
        </>
      )}

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={() => _onShowDirectoryView?.()}
          title={t('toolbar.directoryView')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            <path d="M12 11v6M9 14h6"/>
          </svg>
          <span>{t('toolbar.directoryView')}</span>
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onShowMergeView?.()}
          title={t('toolbar.mergeView')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <span>{t('toolbar.mergeView')}</span>
        </button>
      </div>

      {isFileDiffMode && (
        <>
          <div className="toolbar-separator" />

          <div className="toolbar-group">
            <div className="view-mode-group">
              <button
                className={`view-mode-btn ${viewMode === 'split' ? 'active' : ''}`}
                onClick={() => onSetSplitView ? onSetSplitView() : setViewMode('split')}
                title={t('toolbar.splitView')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v18M3 12h18"/>
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                </svg>
                {t('toolbar.splitView')}
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'unified' ? 'active' : ''}`}
                onClick={() => onSetUnifiedView ? onSetUnifiedView() : setViewMode('unified')}
                title={t('toolbar.unifiedView')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
                </svg>
                {t('toolbar.unifiedView')}
              </button>
            </div>
          </div>

          <div className="toolbar-separator" />

          {/* §修复：只在双栏视图且有变化时显示折叠按钮 */}
          {canCollapse && (
            <div className="toolbar-group">
              <button
                className={`toolbar-btn ${isCollapsed ? 'active' : ''}`}
                onClick={toggleCollapse}
                title={`${t('toolbar.collapseUnchanged')} (Ctrl+Shift+C)`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 9l7-7 7 7M5 15l7 7 7-7"/>
                </svg>
                {t('toolbar.collapseUnchanged')}
              </button>
            </div>
          )}
        </>
      )}

      <div className="toolbar-flex-spacer" />

      <div className="toolbar-group">
        <button 
          className="toolbar-btn icon-only" 
          onClick={onShowSearch}
          title={`${t('toolbar.search')} (Ctrl+F)`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </button>
      </div>
    </div>
  )
}