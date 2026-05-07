/**
 * DiffView 模块导出
 * 
 * §3.2 DiffView 模块 - 组件和 Hooks 统一导出
 */

import { SplitDiffView } from './components/SplitDiffView'
import { UnifiedDiffView } from './components/UnifiedDiffView'
import { useDiffStore } from '@renderer/stores'

/**
 * 主差异视图组件
 * 根据 viewMode 自动切换 Split/Unified 视图
 */
export function DiffView() {
  const { viewMode } = useDiffStore()

  if (viewMode === 'unified') {
    return <UnifiedDiffView />
  }

  return <SplitDiffView />
}

// 组件
export { SplitDiffView } from './components/SplitDiffView'
export { UnifiedDiffView } from './components/UnifiedDiffView'
export { MonacoDiffEditor, type MonacoDiffEditorRef } from './components/MonacoDiffEditor'
// Note: DiffEditorPane 是 Week 3 的自定义实现，Week 4 已被 MonacoDiffEditor 替换
// export { DiffEditorPane, type DiffEditorPaneRef } from './components/DiffEditorPane'
export { DiffLine } from './components/DiffLine'
export { InlineDiff, renderInlineDiff } from './components/InlineDiff'
export { FileInfoBar } from './components/FileInfoBar'
// Note: FoldedLine 组件保留但当前使用 Monaco 内置折叠
export { FoldedLine } from './components/FoldedLine'
export { Minimap } from './components/Minimap'
export { DiffNavigator } from './components/DiffNavigator'

// Hooks
export { useDiff, useTextDiff } from './hooks/useDiff'
export { useDiffNavigation } from './hooks/useDiffNavigation'
export { useSyncScroll, useProportionalScroll } from './hooks/useSyncScroll'

// Monaco 主题
export { configureMonaco, defineMonacoThemes, getLanguageId, setMonacoTheme } from './monaco-theme'
export { configureMonacoWorkers } from './monaco-worker'
