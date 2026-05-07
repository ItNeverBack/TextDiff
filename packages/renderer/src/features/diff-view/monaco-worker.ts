/**
 * §2.4.1 Monaco Editor 集成 - Worker 配置
 *
 * 配置 MonacoEnvironment 确保 Worker 正确加载
 * 使用内联 Worker 方式避免构建问题
 */

import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

// 标记是否已经初始化
let isMonacoConfigured = false

/**
 * 配置 Monaco Editor 环境
 *
 * 使用内联 Worker 导入，确保在 Vite 环境中正确加载
 */
export function configureMonacoWorkers(): void {
  if (isMonacoConfigured) return
  if (typeof window === 'undefined') return

  // 配置 Monaco 环境
  self.MonacoEnvironment = {
    getWorker(_: unknown, label: string): Worker {
      switch (label) {
        case 'json':
          return new JsonWorker()
        case 'css':
        case 'scss':
        case 'less':
          return new CssWorker()
        case 'html':
        case 'handlebars':
        case 'razor':
          return new HtmlWorker()
        case 'typescript':
        case 'javascript':
          return new TsWorker()
        default:
          return new EditorWorker()
      }
    }
  }

  isMonacoConfigured = true
}

/**
 * 设置 Monaco 主题
 * 与全局主题系统同步
 */
export function setMonacoTheme(theme: 'light' | 'dark'): void {
  const themeId = theme === 'dark' ? 'textdiff-dark' : 'textdiff-light'
  monaco.editor.setTheme(themeId)
}

/**
 * 获取语言 ID 映射
 */
export function getLanguageId(filename: string): string {
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
