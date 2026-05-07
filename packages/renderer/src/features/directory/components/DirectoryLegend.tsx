import React from 'react'

interface DirectoryLegendProps {
  showEqual?: boolean
  showModified?: boolean
  showLeftOnly?: boolean
  showRightOnly?: boolean
}

/**
 * DirectoryLegend - 目录对比视图的状态图例组件
 * 
 * 显示目录对比状态的图例说明：
 * - 相同：文件内容完全相同
 * - 修改：文件存在但内容不同
 * - 左侧独有：仅在左侧目录存在
 * - 右侧独有：仅在右侧目录存在
 * 
 * 参考: TextDiff-Module-Design.md §3.3.4 DirectoryView 组件结构
 * 参考: prototype/index.html 中 view-directory 区域
 */
export const DirectoryLegend: React.FC<DirectoryLegendProps> = ({
  showEqual = true,
  showModified = true,
  showLeftOnly = true,
  showRightOnly = true
}) => {
  const legendItems = [
    { key: 'equal', label: '相同', show: showEqual, className: 'equal' },
    { key: 'modified', label: '修改', show: showModified, className: 'modified' },
    { key: 'left-only', label: '左侧独有', show: showLeftOnly, className: 'left-only' },
    { key: 'right-only', label: '右侧独有', show: showRightOnly, className: 'right-only' }
  ].filter(item => item.show)

  return (
    <div className="dir-legend" role="group" aria-label="目录对比状态图例">
      {legendItems.map(item => (
        <span key={item.key} className="legend-item">
          <span className={`status-dot ${item.className}`} aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </div>
  )
}
