export interface ShortcutDefinition {
  key: string
  action: string
  description: string
}

export const SHORTCUTS: ShortcutDefinition[] = [
  { key: 'Ctrl+O', action: 'openFilePair', description: '打开文件对' },
  { key: 'Ctrl+Shift+D', action: 'openDirectoryDiff', description: '打开目录对比' },
  { key: 'Ctrl+S', action: 'saveSession', description: '保存会话' },
  { key: 'Ctrl+H', action: 'showSessionHistory', description: '会话历史' },
  { key: 'Ctrl+T', action: 'newTab', description: '新建对比标签' },
  { key: 'Ctrl+W', action: 'closeTab', description: '关闭当前标签' },
  { key: 'Ctrl+F', action: 'search', description: '搜索' },
  { key: 'Ctrl+1', action: 'viewSplit', description: '双栏视图' },
  { key: 'Ctrl+2', action: 'viewUnified', description: '统一视图' },
  { key: 'Ctrl+3', action: 'viewDirectory', description: '目录视图' },
  { key: 'Ctrl+4', action: 'viewMerge', description: '三路合并视图' },
  { key: 'Ctrl+Shift+C', action: 'toggleCollapse', description: '折叠相同区域' },
  { key: 'Ctrl+Shift+T', action: 'toggleTheme', description: '切换主题' },
  { key: 'Ctrl+Shift+V', action: 'pasteText', description: '粘贴文本对比' },
  { key: 'Ctrl+Shift+X', action: 'swapFiles', description: '交换左右文件' },
  { key: 'Ctrl+,', action: 'openSettings', description: '首选项' },
  // Directory comparison shortcuts
  { key: 'ArrowUp', action: 'navigateUp', description: '向上导航' },
  { key: 'ArrowDown', action: 'navigateDown', description: '向下导航' },
  { key: 'ArrowLeft', action: 'collapse', description: '折叠目录' },
  { key: 'ArrowRight', action: 'expand', description: '展开目录' },
  { key: 'Enter', action: 'viewDiff', description: '查看差异' },
  { key: 'Space', action: 'quickPreview', description: '快速预览' },
  { key: 'F5', action: 'refresh', description: '刷新对比' },
  { key: 'F7', action: 'nextDiff', description: '下一处差异' },
  { key: 'F6', action: 'prevDiff', description: '上一处差异' },
  { key: 'Alt+ArrowDown', action: 'nextDiff', description: '下一处差异' },
  { key: 'Alt+ArrowUp', action: 'prevDiff', description: '上一处差异' },
  { key: 'Alt+Home', action: 'firstDiff', description: '第一处差异' },
  { key: 'Alt+End', action: 'lastDiff', description: '最后一处差异' },
  { key: 'Escape', action: 'closeOverlay', description: '关闭浮层/搜索' }
]
