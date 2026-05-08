import React, { useCallback } from 'react'
import type { DirectoryDiffEntry } from '@shared/types'
import { TreeNode } from './TreeNode'

interface DirectoryTreeProps {
  entries: DirectoryDiffEntry[]
  expandedPaths: Set<string>
  selectedPath: string | null
  onToggleExpand: (path: string) => void
  onSelectEntry: (entry: DirectoryDiffEntry) => void
}

/**
 * DirectoryTree - 目录树组件
 * 
 * 递归渲染目录结构，支持：
 * - 展开/折叠状态控制
 * - 节点选择
 * - 递归渲染子目录
 * 
 * 参考: TextDiff-Module-Design.md §3.3.4 DirectoryView 组件结构
 * 参考: TextDiff-DevPlan.md §Week 10.1 组件拆分
 */
export const DirectoryTree: React.FC<DirectoryTreeProps> = ({
  entries,
  expandedPaths,
  selectedPath,
  onToggleExpand,
  onSelectEntry
}) => {
  const renderNode = useCallback((node: DirectoryDiffEntry, depth: number): React.ReactNode => {
    const isExpanded = expandedPaths.has(node.relativePath)
    const isSelected = selectedPath === node.relativePath

    return (
      <React.Fragment key={node.relativePath}>
        <TreeNode
          entry={node}
          side="left"
          isExpanded={isExpanded}
          isSelected={isSelected}
          onToggle={() => onToggleExpand(node.relativePath)}
          onSelect={() => onSelectEntry(node)}
        />
        {/* 递归渲染子节点 */}
        {node.type === 'directory' && isExpanded && node.children && node.children.length > 0 && (
          <div className="tree-node-children" role="group">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </React.Fragment>
    )
  }, [expandedPaths, selectedPath, onToggleExpand, onSelectEntry])

  if (entries.length === 0) {
    return (
      <div className="dir-tree-empty" role="status">
        <p>目录为空或没有匹配的文件</p>
      </div>
    )
  }

  return (
    <div className="dir-tree" role="tree" aria-label="目录对比结果">
      {entries.map(entry => renderNode(entry, 0))}
    </div>
  )
}
