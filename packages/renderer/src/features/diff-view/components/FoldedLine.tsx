/**
 * 折叠行组件
 *
 * §2.4.4 折叠相同区域 - FoldedLine.tsx
 *
 * 注意：当前版本使用 Monaco Editor 的内置折叠功能，此组件保留用于：
 * 1. 未来可能需要自定义折叠 UI 的场景
 * 2. 统一视图（UnifiedDiffView）中可能使用
 * 3. 作为参考实现
 *
 * 当前 MonacoDiffEditor 使用内置折叠命令：
 * - editor.fold - 折叠选定区域
 * - editor.unfoldAll - 展开所有区域
 */

interface FoldedLineProps {
  /** 折叠的行数 */
  count: number
  /** 点击回调 */
  onClick?: () => void
}

/**
 * 折叠行组件
 * 显示被折叠的相同内容行数和展开按钮
 */
export function FoldedLine({ count, onClick }: FoldedLineProps) {
  return (
    <div className="diff-line folded" onClick={onClick}>
      <div className="line-number">...</div>
      <div className="line-gutter"></div>
      <div className="folded-placeholder">
        <span className="folded-count">{count} 行相同</span> — 点击展开
      </div>
    </div>
  )
}
