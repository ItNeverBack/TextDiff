import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useDiffStore } from '../../stores'
import { useSearchStore, type SearchMatch } from '../../stores/search.store'
import { useI18n } from '../../hooks/useI18n'

interface SearchDialogProps {
  open: boolean
  onClose: () => void
}

// 图标组件
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
)

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
)

const ChevronUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 15l-6-6-6 6"/>
  </svg>
)

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6"/>
  </svg>
)

const CaseSensitiveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    <path d="M12 7v5"/>
    <path d="M9 10h6"/>
  </svg>
)

const RegexIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 3v18"/>
    <path d="M7 12l5-5 5 5-5 5-5-5z"/>
    <path d="M7 3v18"/>
    <path d="M17 12l-5-5-5 5 5 5 5-5z"/>
  </svg>
)

const WholeWordIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 12h8"/>
  </svg>
)

const LeftPanelIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M12 3v18"/>
    <path d="M3 12h9"/>
  </svg>
)

const RightPanelIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M12 3v18"/>
    <path d="M12 12h9"/>
  </svg>
)

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const { t } = useI18n()

  const [localQuery, setLocalQuery] = useState('')

  const {
    isRegex,
    caseSensitive,
    wholeWord,
    searchInLeft,
    searchInRight,
    matches,
    currentMatchIndex,
    setIsRegex,
    setCaseSensitive,
    setWholeWord,
    setSearchInLeft,
    setSearchInRight,
    setMatches,
    setCurrentMatchIndex,
    nextMatch,
    prevMatch,
    reset: resetSearch
  } = useSearchStore()

  const { diffResult, navigateToChunk } = useDiffStore()

  useEffect(() => {
    useSearchStore.setState({ query: localQuery })
  }, [localQuery])

  const searchPattern = useMemo(() => {
    if (!localQuery.trim()) return null

    try {
      if (isRegex) {
        const flags = caseSensitive ? 'g' : 'gi'
        return new RegExp(localQuery, flags)
      } else {
        const escapedQuery = localQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const pattern = wholeWord ? `\\b${escapedQuery}\\b` : escapedQuery
        const flags = caseSensitive ? 'g' : 'gi'
        return new RegExp(pattern, flags)
      }
    } catch {
      return null
    }
  }, [localQuery, isRegex, caseSensitive, wholeWord])

  useEffect(() => {
    if (!searchPattern || !diffResult?.lines) {
      setMatches([])
      return
    }

    const results: SearchMatch[] = []
    const lines = diffResult.lines

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (searchInLeft && line.leftContent) {
        const leftMatches = [...line.leftContent.matchAll(searchPattern)]
        for (const match of leftMatches) {
          if (match.index !== undefined) {
            results.push({
              lineIndex: i,
              leftLineNo: line.leftLineNo,
              rightLineNo: line.rightLineNo,
              content: line.leftContent,
              matchStart: match.index,
              matchEnd: match.index + match[0].length,
              side: 'left'
            })
          }
        }
      }

      if (searchInRight && line.rightContent) {
        const rightMatches = [...line.rightContent.matchAll(searchPattern)]
        for (const match of rightMatches) {
          if (match.index !== undefined) {
            results.push({
              lineIndex: i,
              leftLineNo: line.leftLineNo,
              rightLineNo: line.rightLineNo,
              content: line.rightContent,
              matchStart: match.index,
              matchEnd: match.index + match[0].length,
              side: 'right'
            })
          }
        }
      }
    }

    setMatches(results)
  }, [searchPattern, diffResult?.lines, searchInLeft, searchInRight, setMatches])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setLocalQuery('')
      resetSearch()
    }
  }, [open, resetSearch])

  // 滚动到当前结果
  useEffect(() => {
    if (currentMatchIndex >= 0 && resultsRef.current) {
      const activeElement = resultsRef.current.querySelector('.search-result-item.active')
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [currentMatchIndex])

  const navigateToResult = useCallback((index: number) => {
    if (index < 0 || index >= matches.length) return

    setCurrentMatchIndex(index)
    const result = matches[index]

    if (diffResult?.chunks) {
      const chunkIndex = diffResult.chunks.findIndex(
        chunk => result.lineIndex >= chunk.startIndex && result.lineIndex < chunk.endIndex
      )
      if (chunkIndex !== -1) {
        navigateToChunk(chunkIndex)
      }
    }

    useSearchStore.setState({
      highlightedLineIndex: result.lineIndex,
      highlightedRanges: [{ start: result.matchStart, end: result.matchEnd }]
    })
  }, [matches, diffResult?.chunks, navigateToChunk, setCurrentMatchIndex])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case 'Enter':
        e.preventDefault()
        if (e.shiftKey) {
          prevMatch()
          navigateToResult(useSearchStore.getState().currentMatchIndex)
        } else {
          nextMatch()
          navigateToResult(useSearchStore.getState().currentMatchIndex)
        }
        break
      case 'F3':
        e.preventDefault()
        if (e.shiftKey) {
          prevMatch()
        } else {
          nextMatch()
        }
        navigateToResult(useSearchStore.getState().currentMatchIndex)
        break
    }
  }, [onClose, nextMatch, prevMatch, navigateToResult])

  const goToResult = useCallback((index: number) => {
    navigateToResult(index)
    // 点击搜索结果后自动关闭搜索框
    onClose()
  }, [navigateToResult, onClose])

  const highlightMatch = (content: string, start: number, end: number) => {
    return (
      <>
        {content.substring(0, start)}
        <mark className="search-highlight">{content.substring(start, end)}</mark>
        {content.substring(end)}
      </>
    )
  }

  if (!open) return null

  const hasResults = matches.length > 0
  const showNoResults = localQuery && !hasResults

  return (
    <div className="overlay overlay-search" onClick={onClose}>
      <div className="search-dialog-v2" onClick={(e) => e.stopPropagation()}>
        {/* 头部搜索区域 */}
        <div className="search-header-v2">
          <div className="search-input-container">
            <div className="search-input-icon">
              <SearchIcon />
            </div>
            <input
              ref={inputRef}
              type="text"
              className="search-input-v2"
              placeholder={t('toolbar.search')}
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {localQuery && (
              <button
                className="search-input-clear"
                onClick={() => {
                  setLocalQuery('')
                  inputRef.current?.focus()
                }}
                title={t('common.clear')}
              >
                <CloseIcon />
              </button>
            )}
          </div>

          {/* 匹配计数和导航 */}
          {hasResults && (
            <div className="search-counter">
              <span className="search-counter-current">{currentMatchIndex + 1}</span>
              <span className="search-counter-separator">/</span>
              <span className="search-counter-total">{matches.length}</span>
            </div>
          )}

          {/* 导航按钮 */}
          <div className="search-nav">
            <button
              className="search-nav-btn"
              onClick={() => {
                prevMatch()
                navigateToResult(useSearchStore.getState().currentMatchIndex)
              }}
              disabled={!hasResults}
              title={`${t('search.prevMatch')} (Shift+Enter)`}
            >
              <ChevronUpIcon />
            </button>
            <button
              className="search-nav-btn"
              onClick={() => {
                nextMatch()
                navigateToResult(useSearchStore.getState().currentMatchIndex)
              }}
              disabled={!hasResults}
              title={`${t('search.nextMatch')} (Enter)`}
            >
              <ChevronDownIcon />
            </button>
          </div>

          <button className="search-close-btn" onClick={onClose} title={t('common.close')}>
            <CloseIcon />
          </button>
        </div>

        {/* 选项栏 */}
        <div className="search-options-v2">
          <div className="search-options-group">
            <button
              className={`search-option-btn ${caseSensitive ? 'active' : ''}`}
              onClick={() => setCaseSensitive(!caseSensitive)}
              title={t('search.caseSensitive')}
            >
              <CaseSensitiveIcon />
            </button>
            <button
              className={`search-option-btn ${wholeWord ? 'active' : ''}`}
              onClick={() => setWholeWord(!wholeWord)}
              title={t('search.wholeWord')}
            >
              <WholeWordIcon />
            </button>
            <button
              className={`search-option-btn ${isRegex ? 'active' : ''}`}
              onClick={() => setIsRegex(!isRegex)}
              title={t('search.regex')}
            >
              <RegexIcon />
            </button>
          </div>

          <div className="search-options-divider" />

          <div className="search-options-group">
            <button
              className={`search-option-btn ${searchInLeft ? 'active' : ''}`}
              onClick={() => setSearchInLeft(!searchInLeft)}
              title={t('search.searchInLeft')}
            >
              <LeftPanelIcon />
            </button>
            <button
              className={`search-option-btn ${searchInRight ? 'active' : ''}`}
              onClick={() => setSearchInRight(!searchInRight)}
              title={t('search.searchInRight')}
            >
              <RightPanelIcon />
            </button>
          </div>
        </div>

        {/* 结果区域 */}
        {hasResults && (
          <div className="search-results-v2" ref={resultsRef}>
            {matches.map((result, index) => (
              <div
                key={`${result.lineIndex}-${result.matchStart}-${result.side}`}
                className={`search-result-item-v2 ${index === currentMatchIndex ? 'active' : ''}`}
                onClick={() => goToResult(index)}
              >
                <span className={`result-side-badge result-side-${result.side}`}>
                  {result.side === 'left' ? t('common.left') : t('common.right')}
                </span>
                <span className="result-line-number">
                  {result.leftLineNo || result.rightLineNo || '-'}
                </span>
                <span className="result-content-v2" title={result.content}>
                  {highlightMatch(result.content, result.matchStart, result.matchEnd)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 无结果提示 */}
        {showNoResults && (
          <div className="search-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
              <line x1="8" y1="8" x2="14" y2="14"/>
              <line x1="14" y1="8" x2="8" y2="14"/>
            </svg>
            <p>{t('search.noResults')}</p>
          </div>
        )}

        {/* 底部提示 */}
        <div className="search-footer-v2">
          <div className="search-shortcuts-hint">
            <kbd>Enter</kbd> / <kbd>Shift+Enter</kbd> {t('search.navigate')}
            <span className="shortcut-dot">·</span>
            <kbd>Esc</kbd> {t('common.close')}
          </div>
        </div>
      </div>
    </div>
  )
}
