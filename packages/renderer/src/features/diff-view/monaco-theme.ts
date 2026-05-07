import * as monaco from 'monaco-editor'

/**
 * Monaco Editor 主题配置
 *
 * §2.4.1 Monaco Editor 集成 - 配置差异装饰器颜色
 * 使用 PRD 规定的颜色方案
 */

// 标记主题是否已定义
let themesDefined = false

/**
 * 定义 Monaco 主题
 * 确保主题只被定义一次
 */
export const defineMonacoThemes = () => {
  if (themesDefined) return
  // 亮色主题
  monaco.editor.defineTheme('textdiff-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#ffffff',
      'editor.lineHighlightBackground': '#f1f3f5',
      'editor.selectionBackground': '#e7f5ff',
      'editor.inactiveSelectionBackground': '#f1f3f5',
      'editorLineNumber.foreground': '#adb5bd',
      'editorLineNumber.activeForeground': '#6c757d',
      'editorGutter.background': '#f8f9fa',
      'editorGutter.modifiedBackground': '#ffdf5d',
      'editorGutter.addedBackground': '#acf2bd',
      'editorGutter.deletedBackground': '#fdb8c0',
      'diffEditor.insertedTextBackground': '#00000000',
      'diffEditor.insertedTextBorder': '#00000000',
      'diffEditor.removedTextBackground': '#00000000',
      'diffEditor.removedTextBorder': '#00000000',
      'diffEditor.border': '#e9ecef',
      'diffEditor.unchangedCodeBackground': '#ffffff',
      'diffEditor.unchangedRegionBackground': '#ffffff',
      'diffEditor.unchangedRegionForeground': '#6c757d',
      'scrollbar.shadow': 'transparent',
      'scrollbarSlider.background': '#ced4da',
      'scrollbarSlider.hoverBackground': '#adb5bd',
      'scrollbarSlider.activeBackground': '#6c757d',
      'editorOverviewRuler.border': '#e9ecef'
    }
  })

  // 暗色主题
  monaco.editor.defineTheme('textdiff-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#242424',
      'editor.lineHighlightBackground': '#363636',
      'editor.selectionBackground': '#1a3a4a',
      'editor.inactiveSelectionBackground': '#363636',
      'editorLineNumber.foreground': '#6b6b6b',
      'editorLineNumber.activeForeground': '#a0a0a0',
      'editorGutter.background': '#2d2d2d',
      'editorGutter.modifiedBackground': '#d4a017',
      'editorGutter.addedBackground': '#2ea043',
      'editorGutter.deletedBackground': '#f85149',
      'diffEditor.insertedTextBackground': '#00000000',
      'diffEditor.insertedTextBorder': '#00000000',
      'diffEditor.removedTextBackground': '#00000000',
      'diffEditor.removedTextBorder': '#00000000',
      'diffEditor.border': '#333333',
      'diffEditor.unchangedCodeBackground': '#242424',
      'diffEditor.unchangedRegionBackground': '#242424',
      'diffEditor.unchangedRegionForeground': '#a0a0a0',
      'scrollbar.shadow': 'transparent',
      'scrollbarSlider.background': '#4a4a4a',
      'scrollbarSlider.hoverBackground': '#6b6b6b',
      'scrollbarSlider.activeBackground': '#a0a0a0',
      'editorOverviewRuler.border': '#333333'
    }
  })

  themesDefined = true
}

/**
 * 设置 Monaco Editor 主题
 * 与全局主题系统同步
 */
export const setMonacoTheme = (theme: 'light' | 'dark'): void => {
  const themeId = theme === 'dark' ? 'textdiff-dark' : 'textdiff-light'
  monaco.editor.setTheme(themeId)
}

/**
 * 设置 Monaco Editor 全局配置
 */
export const configureMonaco = () => {
  // 定义主题
  defineMonacoThemes()

  // 根据当前 data-theme 属性设置 Monaco 主题
  const currentTheme = document.documentElement.getAttribute('data-theme')
  monaco.editor.setTheme(currentTheme === 'dark' ? 'textdiff-dark' : 'textdiff-light')

  // 设置默认编辑器选项 - 使用 editor.setOptions 方法
  // minimap 和 overviewRuler 需要在创建编辑器时单独配置

  // 添加自定义 CSS 类样式
  const style = document.createElement('style')
  style.textContent = `
    .monaco-diff-editor-container .monaco-editor {
      --vscode-editor-font-family: var(--font-mono);
    }
    
    .active-chunk-highlight {
      background-color: var(--accent-primary-light) !important;
      box-shadow: inset 0 0 0 1px var(--accent-primary);
    }
    
    /* 差异高亮已禁用 - 保持透明 */
    
    .monaco-editor .margin-view-overlays .line-numbers {
      font-family: var(--font-mono);
      font-size: 11px;
    }
    
    .monaco-diff-editor .diffViewportZoom {
      background: var(--bg-app);
    }
  `
  document.head.appendChild(style)
}

/**
 * 获取语言 ID
 */
export const getLanguageId = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'jsx': 'javascript',
    'json': 'json',
    'yml': 'yaml',
    'yaml': 'yaml',
    'md': 'markdown',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'py': 'python',
    'go': 'go',
    'rs': 'rust',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'java': 'java',
    'xml': 'xml',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'ps1': 'powershell',
    'php': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'kt': 'kotlin',
    'dart': 'dart',
    'vue': 'vue',
    'svelte': 'svelte',
    'dockerfile': 'dockerfile'
  }
  return languageMap[ext] || 'plaintext'
}
