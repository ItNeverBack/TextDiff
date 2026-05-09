import { useState, useEffect, useCallback } from 'react'
import type { AppSettings, WhitespaceMode, KeyBindingMap } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'
import { useSettingsStore, useLanguageStore, useThemeStore } from '../../stores'
import { useI18n } from '../../hooks/useI18n'
import { ShortcutEditor } from './ShortcutEditor'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

type TabType = 'general' | 'editor' | 'diff' | 'shortcuts'

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { settings, updateSettings, loadFromBackend } = useSettingsStore()
  const { setLanguage } = useLanguageStore()
  const { setTheme } = useThemeStore()
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [resetConfirmType, setResetConfirmType] = useState<TabType>('general')
  const [newPrefix, setNewPrefix] = useState('')
  const [prefixError, setPrefixError] = useState<string | null>(null)

  // 当对话框打开时加载最新设置
  useEffect(() => {
    if (open) {
      loadFromBackend()
      setLocalSettings(settings)
    }
  }, [open, loadFromBackend])

  // 同步本地设置
  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const addPrefix = useCallback(() => {
    const trimmed = newPrefix.trim()
    if (!trimmed) return

    const prefixes = localSettings.diff.defaultCommentPrefixes || []
    if (prefixes.includes(trimmed)) {
      setPrefixError(t('dialog.ignorePanel.prefixExists'))
      return
    }

    updateDiffSettings({ defaultCommentPrefixes: [...prefixes, trimmed] })
    setNewPrefix('')
    setPrefixError(null)
  }, [newPrefix, localSettings.diff.defaultCommentPrefixes, t])

  const removePrefix = useCallback((prefix: string) => {
    const prefixes = localSettings.diff.defaultCommentPrefixes || []
    updateDiffSettings({ defaultCommentPrefixes: prefixes.filter(p => p !== prefix) })
  }, [localSettings.diff.defaultCommentPrefixes])

  if (!open) return null

  const handleSave = () => {
    if (localSettings.theme) {
      setTheme(localSettings.theme)
    }
    if (localSettings.language) {
      setLanguage(localSettings.language)
    }
    updateSettings({
      theme: localSettings.theme,
      language: localSettings.language,
      diff: localSettings.diff,
      editor: localSettings.editor,
      keyBindings: localSettings.keyBindings
    })
    onClose()
  }

  const handleReset = () => {
    setResetConfirmType(activeTab)
    setResetConfirmOpen(true)
  }

  const handleResetConfirm = () => {
    switch (resetConfirmType) {
      case 'general':
        updateLocalSettings({
          theme: DEFAULT_SETTINGS.theme,
          language: DEFAULT_SETTINGS.language,
        })
        break
      case 'editor':
        updateLocalSettings({ editor: DEFAULT_SETTINGS.editor })
        break
      case 'diff':
        updateLocalSettings({ diff: DEFAULT_SETTINGS.diff })
        break
      case 'shortcuts':
        updateLocalSettings({ keyBindings: {} })
        break
    }
    setResetConfirmOpen(false)
  }

  const updateLocalSettings = (updates: Partial<AppSettings>) => {
    setLocalSettings(prev => ({ ...prev, ...updates }))
  }

  const updateDiffSettings = (updates: Partial<AppSettings['diff']>) => {
    setLocalSettings(prev => ({
      ...prev,
      diff: { ...prev.diff, ...updates }
    }))
  }

  const updateEditorSettings = (updates: Partial<AppSettings['editor']>) => {
    setLocalSettings(prev => ({
      ...prev,
      editor: { ...prev.editor, ...updates }
    }))
  }

  return (
    <div className="overlay">
      <div className="panel settings-panel">
        <div className="panel-header">
          <h3 className="panel-title">{t('dialog.settings.title')}</h3>
          <button className="panel-close" onClick={onClose}>×</button>
        </div>

        <div className="settings-body">
          {/* 左侧标签栏 */}
          <div className="settings-tabs">
            <button
              className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2"/>
              </svg>
              {t('dialog.settings.theme')}
            </button>
            <button
              className={`settings-tab ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4 7 4 4 20 4 20 7"/>
                <line x1="9" y1="20" x2="15" y2="20"/>
                <line x1="12" y1="4" x2="12" y2="20"/>
              </svg>
              {t('dialog.settings.editor')}
            </button>
            <button
              className={`settings-tab ${activeTab === 'diff' ? 'active' : ''}`}
              onClick={() => setActiveTab('diff')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <path d="M8 13h8M8 17h5"/>
              </svg>
              {t('dialog.settings.diff')}
            </button>
            <button
              className={`settings-tab ${activeTab === 'shortcuts' ? 'active' : ''}`}
              onClick={() => setActiveTab('shortcuts')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 0 0 6.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 0 0 6.001 0M18 7l3 9m-3-9l-6-2"/>
              </svg>
              {t('dialog.shortcuts.title')}
            </button>
          </div>

          {/* 右侧内容区 */}
          <div className="settings-content">
            {activeTab === 'general' && (
              <div className="settings-section">
                <h4 className="settings-section-title">{t('dialog.settings.theme')}</h4>
                
                <div className="settings-item">
                  <label className="settings-label">{t('dialog.settings.theme')}</label>
                  <div className="settings-control">
                    <select
                      className="settings-select"
                      value={localSettings.theme}
                      onChange={(e) => updateLocalSettings({ theme: e.target.value as 'light' | 'dark' | 'system' })}
                    >
                      <option value="light">{t('dialog.settings.themeLight')}</option>
                      <option value="dark">{t('dialog.settings.themeDark')}</option>
                      <option value="system">{t('dialog.settings.themeSystem')}</option>
                    </select>
                  </div>
                </div>

                <div className="settings-item">
                  <label className="settings-label">{t('dialog.settings.language')}</label>
                  <div className="settings-control">
                    <select
                      className="settings-select"
                      value={localSettings.language}
                      onChange={(e) => updateLocalSettings({ language: e.target.value as 'zh-CN' | 'en-US' })}
                    >
                      <option value="zh-CN">{t('dialog.settings.language')} (zh-CN)</option>
                      <option value="en-US">English (en-US)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="settings-section">
                <h4 className="settings-section-title">{t('dialog.settings.fontFamily')}</h4>
                
                <div className="settings-item">
                  <label className="settings-label">{t('dialog.settings.fontSize')}</label>
                  <div className="settings-control">
                    <input
                      type="number"
                      className="settings-input number"
                      min={8}
                      max={32}
                      value={localSettings.editor.fontSize}
                      onChange={(e) => updateEditorSettings({ fontSize: parseInt(e.target.value, 10) })}
                    />
                    <span className="settings-unit">px</span>
                  </div>
                </div>

                <div className="settings-item">
                  <label className="settings-label">{t('dialog.settings.fontFamily')}</label>
                  <div className="settings-control">
                    <select
                      className="settings-select"
                      value={localSettings.editor.fontFamily}
                      onChange={(e) => updateEditorSettings({ fontFamily: e.target.value })}
                    >
                      <option value="'Geist Mono', monospace">Geist Mono</option>
                      <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                      <option value="'Fira Code', monospace">Fira Code</option>
                      <option value="'Consolas', monospace">Consolas</option>
                      <option value="'Monaco', monospace">Monaco</option>
                    </select>
                  </div>
                </div>

                <div className="settings-item">
                  <label className="settings-label">{t('dialog.settings.tabSize')}</label>
                  <div className="settings-control">
                    <input
                      type="number"
                      className="settings-input number"
                      min={2}
                      max={8}
                      value={localSettings.editor.tabSize}
                      onChange={(e) => updateEditorSettings({ tabSize: parseInt(e.target.value, 10) })}
                    />
                    <span className="settings-unit">spaces</span>
                  </div>
                </div>

                <h4 className="settings-section-title">{t('dialog.settings.display')}</h4>

                <div className="settings-item">
                  <label className="settings-label">{t('dialog.settings.showInvisibleChars')}</label>
                  <div className="settings-control">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={localSettings.editor.showInvisibleCharacters}
                        onChange={(e) => updateEditorSettings({ showInvisibleCharacters: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'diff' && (
              <div className="settings-section">
                <h4 className="settings-section-title">{t('dialog.settings.diff')}</h4>
                
                <div className="settings-item">
                  <label className="settings-label">{t('dialog.settings.defaultIgnoreWhitespace')}</label>
                  <div className="settings-control">
                    <select
                      className="settings-select"
                      value={localSettings.diff.defaultIgnoreWhitespace}
                      onChange={(e) => updateDiffSettings({ defaultIgnoreWhitespace: e.target.value as WhitespaceMode })}
                    >
                      <option value="none">{t('dialog.ignorePanel.whitespaceNone')}</option>
                      <option value="leading-trailing">{t('dialog.ignorePanel.whitespaceLeadingTrailing')}</option>
                      <option value="all">{t('dialog.ignorePanel.whitespaceAll')}</option>
                    </select>
                  </div>
                </div>

                <div className="settings-item">
                  <label className="settings-label">{t('dialog.settings.defaultIgnoreCase')}</label>
                  <div className="settings-control">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={localSettings.diff.defaultIgnoreCase}
                        onChange={(e) => updateDiffSettings({ defaultIgnoreCase: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="settings-item">
                  <label className="settings-label">{t('dialog.settings.defaultIgnoreLineEnding')}</label>
                  <div className="settings-control">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={localSettings.diff.defaultIgnoreLineEndings}
                        onChange={(e) => updateDiffSettings({ defaultIgnoreLineEndings: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="settings-item">
                  <label className="settings-label">{t('dialog.ignorePanel.ignoreComments')}</label>
                  <div className="settings-control">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={localSettings.diff.defaultIgnoreComments}
                        onChange={(e) => updateDiffSettings({ defaultIgnoreComments: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                {localSettings.diff.defaultIgnoreComments && (
                  <div className="settings-item">
                    <label className="settings-label">{t('dialog.settings.commentPrefixes')}</label>
                    <div className="settings-control">
                      <div className="prefix-tags">
                        {(localSettings.diff.defaultCommentPrefixes || []).map((prefix) => (
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
                  </div>
                )}

                <h4 className="settings-section-title">{t('dialog.ignorePanel.algorithm')}</h4>
                
                <div className="settings-item">
                  <label className="settings-label">{t('dialog.settings.defaultAlgorithm')}</label>
                  <div className="settings-control">
                    <div className="algorithm-options">
                      {(['myers', 'patience', 'histogram'] as const).map((algo) => (
                        <label key={algo} className="radio-card">
                          <input
                            type="radio"
                            name="algorithm"
                            value={algo}
                            checked={localSettings.diff.defaultAlgorithm === algo}
                            onChange={() => updateDiffSettings({ defaultAlgorithm: algo })}
                          />
                          <span className="radio-card-label">
                            {algo === 'myers' && 'Myers'}
                            {algo === 'patience' && 'Patience'}
                            {algo === 'histogram' && 'Histogram'}
                          </span>
                          <span className="radio-card-desc">
                            {algo === 'myers' && t('dialog.ignorePanel.myers')}
                            {algo === 'patience' && t('dialog.ignorePanel.patience')}
                            {algo === 'histogram' && t('dialog.ignorePanel.histogram')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="settings-item">
                  <label className="settings-label">{t('dialog.settings.contextLines')}</label>
                  <div className="settings-control">
                    <input
                      type="number"
                      className="settings-input number"
                      min={0}
                      max={10}
                      value={localSettings.diff.contextLines}
                      onChange={(e) => updateDiffSettings({ contextLines: parseInt(e.target.value, 10) })}
                    />
                  </div>
                </div>

                <div className="settings-item">
                  <label className="settings-label">{t('dialog.settings.foldUnchanged')}</label>
                  <div className="settings-control">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={localSettings.diff.foldUnchanged}
                        onChange={(e) => updateDiffSettings({ foldUnchanged: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'shortcuts' && (
              <div className="settings-section">
                <ShortcutEditor
                  keyBindings={localSettings.keyBindings}
                  onChange={(keyBindings: KeyBindingMap) => updateLocalSettings({ keyBindings })}
                />
              </div>
            )}
          </div>
        </div>

        <div className="panel-footer settings-footer">
          <button className="btn-secondary" onClick={handleReset}>
            {t('dialog.reset')}
          </button>
          <div className="panel-footer-right">
            <button className="btn-secondary" onClick={onClose}>
              {t('dialog.cancel')}
            </button>
            <button className="btn-primary" onClick={handleSave}>
              {t('dialog.save')}
            </button>
          </div>
        </div>
      </div>

      {resetConfirmOpen && (
        <div className="confirm-overlay" onClick={() => setResetConfirmOpen(false)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="confirm-dialog-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning-color, #f59e0b)" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <h4 className="confirm-dialog-title">{t('dialog.resetConfirm.title')}</h4>
            </div>
            <div className="confirm-dialog-body">
              <p className="confirm-dialog-message">
                {t(`dialog.resetConfirm.${resetConfirmType}` as const)}
              </p>
            </div>
            <div className="confirm-dialog-footer">
              <button className="btn-secondary" onClick={() => setResetConfirmOpen(false)}>
                {t('dialog.cancel')}
              </button>
              <button className="btn-primary btn-danger" onClick={handleResetConfirm}>
                {t('dialog.reset')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
