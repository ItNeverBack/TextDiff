import { useState, useEffect } from 'react'
import type { AppSettings, WhitespaceMode } from '@shared/types'
import { useSettingsStore, useLanguageStore } from '../../stores'
import { useI18n } from '../../hooks/useI18n'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

type TabType = 'general' | 'editor' | 'diff' | 'shortcuts'

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { settings, updateSettings, resetSettings, loadFromBackend } = useSettingsStore()
  const { setLanguage } = useLanguageStore()
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings)

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

  if (!open) return null

  const handleSave = () => {
    // 同步语言设置
    if (localSettings.language) {
      setLanguage(localSettings.language)
    }
    updateSettings({
      theme: localSettings.theme,
      language: localSettings.language,
      diff: localSettings.diff,
      editor: localSettings.editor
    })
    onClose()
  }

  const handleReset = () => {
    if (confirm(t('dialog.confirm'))) {
      resetSettings()
      setLocalSettings(useSettingsStore.getState().settings)
    }
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
                      <input
                        type="text"
                        className="settings-input"
                        value={localSettings.diff.defaultCommentPrefixes?.join(', ') || ''}
                        onChange={(e) => updateDiffSettings({ 
                          defaultCommentPrefixes: e.target.value.split(',').map(p => p.trim()).filter(Boolean) 
                        })}
                        placeholder="//, #, --, ;, %"
                      />
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
                <h4 className="settings-section-title">{t('dialog.shortcuts.title')}</h4>
                <p className="settings-description">
                  {t('shortcuts.available')}
                </p>

                <div className="shortcuts-preview">
                  <div className="shortcut-category">
                    <h5>{t('shortcuts.group.fileOps')}</h5>
                    <div className="shortcut-item">
                      <span>{t('menu.file.openPair')}</span>
                      <kbd>Ctrl + O</kbd>
                    </div>
                    <div className="shortcut-item">
                      <span>{t('menu.file.saveSession')}</span>
                      <kbd>Ctrl + S</kbd>
                    </div>
                  </div>

                  <div className="shortcut-category">
                    <h5>{t('shortcuts.group.diffNavigation')}</h5>
                    <div className="shortcut-item">
                      <span>{t('toolbar.nextDiff')}</span>
                      <kbd>F7 / Alt + ↓</kbd>
                    </div>
                    <div className="shortcut-item">
                      <span>{t('toolbar.prevDiff')}</span>
                      <kbd>F6 / Alt + ↑</kbd>
                    </div>
                    <div className="shortcut-item">
                      <span>{t('toolbar.firstDiff')}</span>
                      <kbd>Alt + Home</kbd>
                    </div>
                    <div className="shortcut-item">
                      <span>{t('toolbar.lastDiff')}</span>
                      <kbd>Alt + End</kbd>
                    </div>
                  </div>

                  <div className="shortcut-category">
                    <h5>{t('shortcuts.group.viewMode')}</h5>
                    <div className="shortcut-item">
                      <span>{t('toolbar.splitView')}</span>
                      <kbd>Ctrl + 1</kbd>
                    </div>
                    <div className="shortcut-item">
                      <span>{t('toolbar.unifiedView')}</span>
                      <kbd>Ctrl + 2</kbd>
                    </div>
                    <div className="shortcut-item">
                      <span>{t('toolbar.collapseUnchanged')}</span>
                      <kbd>Ctrl + Shift + C</kbd>
                    </div>
                  </div>
                </div>
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
    </div>
  )
}
