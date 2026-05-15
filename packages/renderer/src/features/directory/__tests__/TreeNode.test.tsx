import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TreeNode, TreeNodePlaceholder, TreeNodeEmpty, TreeNodeLoading, TreeNodeError } from '../components/TreeNode'
import type { DirectoryDiffEntry } from '@shared/types/directory.types'

// Mock FileIcon component
vi.mock('../components/FileIcon', () => ({
  FileIcon: vi.fn(({ type, name }: { type: string; name: string }) => (
    <span data-testid="file-icon" data-type={type} data-name={name}>
      {type === 'directory' ? '📁' : '📄'}
    </span>
  )),
  StatusIcon: vi.fn(({ status }: { status: string }) => (
    <span data-testid="status-icon" data-status={status}>
      {status}
    </span>
  ))
}))

describe('TreeNode', () => {
  const mockOnToggle = vi.fn()
  const mockOnSelect = vi.fn()
  const mockOnDoubleClick = vi.fn()
  const mockOnContextMenu = vi.fn()

  const createMockEntry = (overrides: Partial<DirectoryDiffEntry> = {}): DirectoryDiffEntry => ({
    name: 'test-file.ts',
    relativePath: 'src/test-file.ts',
    type: 'file',
    status: 'equal',
    depth: 1,
    ...overrides
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('文件类型显示文件图标', () => {
    const entry = createMockEntry({ type: 'file', name: 'test.ts' })
    render(
      <TreeNode
        entry={entry}
        side="left"
        isExpanded={false}
        isSelected={false}
        onToggle={mockOnToggle}
        onSelect={mockOnSelect}
      />
    )
    
    expect(screen.getByTestId('file-icon')).toHaveAttribute('data-type', 'file')
  })

  it('目录类型显示文件夹图标', () => {
    const entry = createMockEntry({ type: 'directory', name: 'src' })
    render(
      <TreeNode
        entry={entry}
        side="left"
        isExpanded={false}
        isSelected={false}
        onToggle={mockOnToggle}
        onSelect={mockOnSelect}
      />
    )
    
    expect(screen.getByTestId('file-icon')).toHaveAttribute('data-type', 'directory')
  })

  it('点击展开按钮触发 onToggle', () => {
    const entry = createMockEntry({
      type: 'directory',
      name: 'src',
      children: [createMockEntry({ name: 'child.ts', relativePath: 'src/child.ts' })]
    })
    render(
      <TreeNode
        entry={entry}
        side="left"
        isExpanded={false}
        isSelected={false}
        onToggle={mockOnToggle}
        onSelect={mockOnSelect}
      />
    )
    
    const expandButton = screen.getByLabelText('展开')
    fireEvent.click(expandButton)
    
    expect(mockOnToggle).toHaveBeenCalledTimes(1)
  })

  it('点击节点触发 onSelect', () => {
    const entry = createMockEntry({ name: 'test.ts' })
    render(
      <TreeNode
        entry={entry}
        side="left"
        isExpanded={false}
        isSelected={false}
        onToggle={mockOnToggle}
        onSelect={mockOnSelect}
      />
    )
    
    const node = screen.getByText('test.ts')
    fireEvent.click(node)
    
    expect(mockOnSelect).toHaveBeenCalledTimes(1)
  })

  it('双击节点触发 onDoubleClick', () => {
    const entry = createMockEntry({ name: 'test.ts' })
    render(
      <TreeNode
        entry={entry}
        side="left"
        isExpanded={false}
        isSelected={false}
        onToggle={mockOnToggle}
        onSelect={mockOnSelect}
        onDoubleClick={mockOnDoubleClick}
      />
    )
    
    const node = screen.getByText('test.ts')
    fireEvent.doubleClick(node)
    
    expect(mockOnDoubleClick).toHaveBeenCalledTimes(1)
  })

  it('选中状态显示高亮', () => {
    const entry = createMockEntry({ name: 'test.ts' })
    const { container } = render(
      <TreeNode
        entry={entry}
        side="left"
        isExpanded={false}
        isSelected={true}
        onToggle={mockOnToggle}
        onSelect={mockOnSelect}
      />
    )
    
    const treeNode = container.querySelector('.tree-node')
    expect(treeNode).toHaveAttribute('data-selected', 'true')
  })

  it('不同状态显示对应颜色标签', () => {
    const entry = createMockEntry({ name: 'test.ts', status: 'modified' })
    render(
      <TreeNode
        entry={entry}
        side="left"
        isExpanded={false}
        isSelected={false}
        onToggle={mockOnToggle}
        onSelect={mockOnSelect}
      />
    )
    
    expect(screen.getByTestId('status-icon')).toHaveAttribute('data-status', 'modified')
  })

  it('equal 状态不显示差异标签', () => {
    const entry = createMockEntry({ name: 'test.ts', status: 'equal' })
    render(
      <TreeNode
        entry={entry}
        side="left"
        isExpanded={false}
        isSelected={false}
        onToggle={mockOnToggle}
        onSelect={mockOnSelect}
      />
    )
    
    // 状态为 equal 时不应显示状态标签文本
    expect(screen.queryByText('修改')).not.toBeInTheDocument()
    expect(screen.queryByText('新增')).not.toBeInTheDocument()
    expect(screen.queryByText('删除')).not.toBeInTheDocument()
  })

  it('显示文件大小（当 showSize=true 且元数据存在）', () => {
    const entry = createMockEntry({
      name: 'test.ts',
      leftMetadata: { size: 1024, modifiedTime: new Date() }
    })
    render(
      <TreeNode
        entry={entry}
        side="left"
        isExpanded={false}
        isSelected={false}
        onToggle={mockOnToggle}
        onSelect={mockOnSelect}
        showSize={true}
      />
    )
    
    expect(screen.getByText('1 KB')).toBeInTheDocument()
  })

  it('显示修改日期（当 showDate=true 且元数据存在）', () => {
    const testDate = new Date('2024-01-15T10:30:00')
    const entry = createMockEntry({
      name: 'test.ts',
      leftMetadata: { size: 1024, modifiedTime: testDate }
    })
    render(
      <TreeNode
        entry={entry}
        side="left"
        isExpanded={false}
        isSelected={false}
        onToggle={mockOnToggle}
        onSelect={mockOnSelect}
        showDate={true}
      />
    )
    
    // 检查日期是否被格式化显示
    expect(screen.getByText(/2024年/)).toBeInTheDocument()
  })

  it('right side 显示右元数据', () => {
    const entry = createMockEntry({
      name: 'test.ts',
      rightMetadata: { size: 2048, modifiedTime: new Date() }
    })
    render(
      <TreeNode
        entry={entry}
        side="right"
        isExpanded={false}
        isSelected={false}
        onToggle={mockOnToggle}
        onSelect={mockOnSelect}
        showSize={true}
      />
    )
    
    expect(screen.getByText('2 KB')).toBeInTheDocument()
  })

  it('空目录不显示展开按钮', () => {
    const entry = createMockEntry({
      type: 'directory',
      name: 'empty-dir',
      children: []
    })
    render(
      <TreeNode
        entry={entry}
        side="left"
        isExpanded={false}
        isSelected={false}
        onToggle={mockOnToggle}
        onSelect={mockOnSelect}
      />
    )
    
    expect(screen.queryByLabelText('展开')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('折叠')).not.toBeInTheDocument()
  })

  it('显示相对路径作为标题提示', () => {
    const entry = createMockEntry({ name: 'test.ts', relativePath: 'src/components/test.ts' })
    render(
      <TreeNode
        entry={entry}
        side="left"
        isExpanded={false}
        isSelected={false}
        onToggle={mockOnToggle}
        onSelect={mockOnSelect}
      />
    )
    
    expect(screen.getByText('test.ts')).toHaveAttribute('title', 'src/components/test.ts')
  })

  it('根据深度设置左边距', () => {
    const entry = createMockEntry({ name: 'test.ts', depth: 3 })
    const { container } = render(
      <TreeNode
        entry={entry}
        side="left"
        isExpanded={false}
        isSelected={false}
        onToggle={mockOnToggle}
        onSelect={mockOnSelect}
      />
    )
    
    const treeNode = container.querySelector('.tree-node')
    // depth 3 * 16px + 8px base padding = 56px
    expect(treeNode).toHaveStyle({ paddingLeft: '56px' })
  })
})

describe('TreeNodePlaceholder', () => {
  it('渲染占位符组件', () => {
    const { container } = render(<TreeNodePlaceholder height={40} depth={2} />)
    
    const placeholder = container.querySelector('.tree-node-placeholder')
    expect(placeholder).toBeInTheDocument()
  })

  it('应用正确的高度样式', () => {
    const { container } = render(<TreeNodePlaceholder height={50} />)
    
    const placeholder = container.querySelector('.tree-node-placeholder')
    expect(placeholder).toHaveStyle({ height: '50px' })
  })
})

describe('TreeNodeEmpty', () => {
  it('渲染空状态组件', () => {
    render(<TreeNodeEmpty />)
    
    expect(screen.getByText('没有可显示的内容')).toBeInTheDocument()
  })

  it('显示自定义消息', () => {
    render(<TreeNodeEmpty message="Custom empty message" />)
    
    expect(screen.getByText('Custom empty message')).toBeInTheDocument()
  })
})

describe('TreeNodeLoading', () => {
  it('渲染加载状态组件', () => {
    render(<TreeNodeLoading />)
    
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })
})

describe('TreeNodeError', () => {
  it('渲染错误状态组件', () => {
    render(<TreeNodeError message="Something went wrong" />)
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('显示重试按钮（当提供 onRetry 回调）', () => {
    const mockRetry = vi.fn()
    render(<TreeNodeError message="Error occurred" onRetry={mockRetry} />)
    
    const retryButton = screen.getByText('重试')
    expect(retryButton).toBeInTheDocument()
    
    fireEvent.click(retryButton)
    expect(mockRetry).toHaveBeenCalledTimes(1)
  })

  it('没有 onRetry 时不显示重试按钮', () => {
    render(<TreeNodeError message="Error occurred" />)
    
    expect(screen.queryByText('重试')).not.toBeInTheDocument()
  })
})
