import { useState, useCallback, useEffect } from 'react'
import { useDiffStore, useSettingsStore } from '../../stores'
import { useI18n } from '../../hooks/useI18n'

interface IgnorePanelProps {
  open: boolean
  onClose: () => void
  onApply?: () => void
}

export function IgnorePanel({ open, onClose, onApply }: IgnorePanelProps) {
  const { options, setOptions } = useDiffStore()
  const { t } = useI18n()
  const [localOptions, setLocalOptions] = useState(options)
  const [newPattern, setNewPattern] = useState('')
  const [patternError, setPatternError] = useState<string | null>(null)
  const [newPrefix, setNewPrefix] = useState('')
  const [prefixError, setPrefixError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setLocalOptions(options)
      setNewPattern('')
      setPatternError(null)
      setNewPrefix('')
      setPrefixError(null)
    }
  }, [open, options])

  const addPattern = useCallback(() => {
    if (!newPattern.trim()) return

    // 验证正则表达式
    try {
      new RegExp(newPattern)
      setPatternError(null)
    } catch {
      setPatternError('Invalid regex pattern')
      return
    }

    if (localOptions.ignorePatterns.includes(newPattern)) {
      setPatternError('Rule already exists')
      return
    }

    setLocalOptions({
      ...localOptions,
      ignorePatterns: [...localOptions.ignorePatterns, newPattern]
    })
    setNewPattern('')
  }, [newPattern, localOptions])

  const removePattern = useCallback((patternToRemove: string) => {
    setLocalOptions({
      ...localOptions,
      ignorePatterns: localOptions.ignorePatterns.filter(p => p !== patternToRemove)
    })
  }, [localOptions])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addPattern()
    }
  }

  const addPrefix = useCallback(() => {
    const trimmed = newPrefix.trim()
    if (!trimmed) return

    const prefixes = localOptions.commentPrefixes || []
    if (prefixes.includes(trimmed)) {
      setPrefixError(t('dialog.ignorePanel.prefixExists'))
      return
    }

    setLocalOptions({
      ...localOptions,
      commentPrefixes: [...prefixes, trimmed]
    })
    setNewPrefix('')
    setPrefixError(null)
  }, [newPrefix, localOptions, t])

  const removePrefix = useCallback((prefix: string) => {
    setLocalOptions({
      ...localOptions,
      commentPrefixes: (localOptions.commentPrefixes || []).filter(p => p !== prefix)
    })
  }, [localOptions])

  const handleApply = () => {
    setOptions(localOptions)
    if (onApply) {
      onApply()
    } else {
      onClose()
    }
  }

  const handleReset = () => {
    const { settings } = useSettingsStore.getState()
    setLocalOptions({
      ignoreWhitespace: settings.diff.defaultIgnoreWhitespace,
      ignoreCase: settings.diff.defaultIgnoreCase,
      ignoreLineEndings: settings.diff.defaultIgnoreLineEndings,
      ignoreComments: settings.diff.defaultIgnoreComments,
      commentPrefixes: settings.diff.defaultCommentPrefixes,
      algorithm: settings.diff.defaultAlgorithm,
      contextLines: settings.diff.contextLines,
      ignorePatterns: []
    })
    setNewPattern('')
    setPatternError(null)
  }

  if (!open) return null

  return (
    <div className="overlay">
      <div className="panel ignore-panel">
        <div className="panel-header">
          <h3 className="panel-title">{t('dialog.ignorePanel.title')}</h3>
          <button className="panel-close" onClick={onClose}>×</button>
        </div>
        <div className="panel-body">
          <div className="setting-group">
            <div className="setting-title">{t('dialog.ignorePanel.whitespace')}</div>
            <label className="radio-option">
              <input
                type="radio"
                name="ws"
                value="none"
                checked={localOptions.ignoreWhitespace === 'none'}
                onChange={() => setLocalOptions({ ...localOptions, ignoreWhitespace: 'none' })}
              />
              {t('dialog.ignorePanel.whitespaceNone')}
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="ws"
                value="leading-trailing"
                checked={localOptions.ignoreWhitespace === 'leading-trailing'}
                onChange={() => setLocalOptions({ ...localOptions, ignoreWhitespace: 'leading-trailing' })}
              />
              {t('dialog.ignorePanel.whitespaceLeadingTrailing')}
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="ws"
                value="all"
                checked={localOptions.ignoreWhitespace === 'all'}
                onChange={() => setLocalOptions({ ...localOptions, ignoreWhitespace: 'all' })}
              />
              {t('dialog.ignorePanel.whitespaceAll')}
            </label>
          </div>

          <div className="setting-group">
            <div className="setting-title">Other Options</div>
            <label className="check-option">
              <input
                type="checkbox"
                checked={localOptions.ignoreCase}
                onChange={(e) => setLocalOptions({ ...localOptions, ignoreCase: e.target.checked })}
              />
              {t('dialog.ignorePanel.ignoreCase')}
            </label>
            <label className="check-option">
              <input
                type="checkbox"
                checked={localOptions.ignoreLineEndings}
                onChange={(e) => setLocalOptions({ ...localOptions, ignoreLineEndings: e.target.checked })}
              />
              {t('dialog.ignorePanel.ignoreLineEnding')}
            </label>
            <label className="check-option">
              <input
                type="checkbox"
                checked={localOptions.ignoreComments}
                onChange={(e) => setLocalOptions({ ...localOptions, ignoreComments: e.target.checked })}
              />
              {t('dialog.ignorePanel.ignoreComments')}
            </label>
            {localOptions.ignoreComments && (
              <div className="comment-prefixes-section">
                <div className="prefix-tags">
                  {(localOptions.commentPrefixes || []).map((prefix) => (
                    <span key={prefix} className="prefix-tag">
                      <code>{prefix}</code>
                      <button
                        className="prefix-tag-remove"
                        onClick={() => removePrefix(prefix)}
                        aria-label="Remove prefix"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                      </button>
                    </span>
                  ))}
                  <div className="prefix-add-inline">
                    <input
                      type="text"
                      className={`prefix-add-input ${prefixError ? 'error' : ''}`}
                      placeholder={t('dialog.ignorePanel.addPrefixPlaceholder')}
                      value={newPrefix}
                      onChange={(e) => {
                        setNewPrefix(e.target.value)
                        setPrefixError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addPrefix()
                        }
                      }}
                    />
                    <button className="prefix-add-btn" onClick={addPrefix} aria-label="Add prefix">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                    </button>
                  </div>
                </div>
                {prefixError && (
                  <div className="regex-error">{prefixError}</div>
                )}
              </div>
            )}
          </div>

          <div className="setting-group">
            <div className="setting-title">{t('dialog.ignorePanel.customRules')}</div>
            <div className="regex-list">
              {localOptions.ignorePatterns.map((pattern) => (
                <div key={pattern} className="regex-item">
                  <input
                    type="text"
                    className="regex-input"
                    value={pattern}
                    readOnly
                  />
                  <button
                    className="regex-remove"
                    onClick={() => removePattern(pattern)}
                    aria-label="Delete rule"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ))}
              <div className="regex-item">
                <input
                  type="text"
                  className={`regex-input ${patternError ? 'error' : ''}`}
                  placeholder="Example: ^\\s*#.*$ (ignore comment lines)"
                  value={newPattern}
                  onChange={(e) => {
                    setNewPattern(e.target.value)
                    setPatternError(null)
                  }}
                  onKeyDown={handleKeyDown}
                />
                <button
                  className="regex-add"
                  onClick={addPattern}
                  aria-label="Add rule"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                </button>
              </div>
              {patternError && (
                <div className="regex-error">{patternError}</div>
              )}
            </div>
          </div>

          <div className="setting-group">
            <div className="setting-title">{t('dialog.ignorePanel.algorithm')}</div>
            <div className="algo-selector">
              <label className="algo-opt">
                <input
                  type="radio"
                  name="algo"
                  value="myers"
                  checked={localOptions.algorithm === 'myers'}
                  onChange={() => setLocalOptions({ ...localOptions, algorithm: 'myers' })}
                />
                <div className="algo-card">
                  <div className="algo-name">Myers</div>
                  <div className="algo-desc">{t('dialog.ignorePanel.myers')}</div>
                </div>
              </label>
              <label className="algo-opt">
                <input
                  type="radio"
                  name="algo"
                  value="patience"
                  checked={localOptions.algorithm === 'patience'}
                  onChange={() => setLocalOptions({ ...localOptions, algorithm: 'patience' })}
                />
                <div className="algo-card">
                  <div className="algo-name">Patience</div>
                  <div className="algo-desc">{t('dialog.ignorePanel.patience')}</div>
                </div>
              </label>
              <label className="algo-opt">
                <input
                  type="radio"
                  name="algo"
                  value="histogram"
                  checked={localOptions.algorithm === 'histogram'}
                  onChange={() => setLocalOptions({ ...localOptions, algorithm: 'histogram' })}
                />
                <div className="algo-card">
                  <div className="algo-name">Histogram</div>
                  <div className="algo-desc">{t('dialog.ignorePanel.histogram')}</div>
                </div>
              </label>
            </div>
          </div>
        </div>
        <div className="panel-footer">
          <button className="btn-secondary" onClick={handleReset}>{t('dialog.reset')}</button>
          <button className="btn-primary" onClick={handleApply}>{t('dialog.apply')}</button>
        </div>
      </div>
    </div>
  )
}
