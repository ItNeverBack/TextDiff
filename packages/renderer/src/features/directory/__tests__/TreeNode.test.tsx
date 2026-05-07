/**
 * TreeNode 组件测试
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TreeNode } from '../components/TreeNode';
import type { DirectoryDiffEntry } from '@shared/types/directory.types';

describe('TreeNode', () => {
  const mockFileEntry: DirectoryDiffEntry = {
    id: 'file-1',
    relativePath: 'src/index.ts',
    name: 'index.ts',
    type: 'file',
    status: 'modified',
    leftPath: '/left/src/index.ts',
    rightPath: '/right/src/index.ts',
    depth: 1,
    leftMetadata: {
      size: 1024,
      modifiedTime: new Date('2024-01-01'),
      createdTime: new Date('2024-01-01'),
      permissions: '644'
    },
    rightMetadata: {
      size: 2048,
      modifiedTime: new Date('2024-01-02'),
      createdTime: new Date('2024-01-01'),
      permissions: '644'
    }
  };

  const mockDirEntry: DirectoryDiffEntry = {
    id: 'dir-1',
    relativePath: 'src',
    name: 'src',
    type: 'directory',
    status: 'equal',
    leftPath: '/left/src',
    rightPath: '/right/src',
    depth: 0,
    children: [
      {
        id: 'file-2',
        relativePath: 'src/utils.ts',
        name: 'utils.ts',
        type: 'file',
        status: 'equal',
        leftPath: '/left/src/utils.ts',
        rightPath: '/right/src/utils.ts',
        depth: 1
      }
    ]
  };

  it('renders file entry correctly', () => {
    const onToggle = vi.fn();
    const onSelect = vi.fn();

    render(
      <TreeNode
        entry={mockFileEntry}
        side="left"
        isExpanded={false}
        isSelected={false}
        onToggle={onToggle}
        onSelect={onSelect}
      />
    );

    expect(screen.getByText('index.ts')).toBeInTheDocument();
    expect(document.querySelector('[data-status="modified"]')).toBeInTheDocument();
    expect(document.querySelector('[data-type="file"]')).toBeInTheDocument();
  });

  it('renders directory entry correctly', () => {
    const onToggle = vi.fn();
    const onSelect = vi.fn();

    render(
      <TreeNode
        entry={mockDirEntry}
        side="left"
        isExpanded={true}
        isSelected={false}
        onToggle={onToggle}
        onSelect={onSelect}
      />
    );

    expect(screen.getByText('src')).toBeInTheDocument();
    expect(document.querySelector('[data-type="directory"]')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onToggle = vi.fn();
    const onSelect = vi.fn();

    render(
      <TreeNode
        entry={mockFileEntry}
        side="left"
        isExpanded={false}
        isSelected={false}
        onToggle={onToggle}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByText('index.ts'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('shows file size when showSize is true', () => {
    const onToggle = vi.fn();
    const onSelect = vi.fn();

    render(
      <TreeNode
        entry={mockFileEntry}
        side="left"
        isExpanded={false}
        isSelected={false}
        onToggle={onToggle}
        onSelect={onSelect}
        showSize={true}
      />
    );

    expect(screen.getByText('1 KB')).toBeInTheDocument();
  });

  it('shows status label for non-equal entries', () => {
    const onToggle = vi.fn();
    const onSelect = vi.fn();

    render(
      <TreeNode
        entry={mockFileEntry}
        side="left"
        isExpanded={false}
        isSelected={false}
        onToggle={onToggle}
        onSelect={onSelect}
      />
    );

    expect(screen.getByText('修改')).toBeInTheDocument();
  });

  it('applies selected styles when isSelected is true', () => {
    const onToggle = vi.fn();
    const onSelect = vi.fn();

    render(
      <TreeNode
        entry={mockFileEntry}
        side="left"
        isExpanded={false}
        isSelected={true}
        onToggle={onToggle}
        onSelect={onSelect}
      />
    );

    expect(document.querySelector('[data-selected="true"]')).toBeInTheDocument();
  });

  it('calls onToggle when expand button is clicked', () => {
    const onToggle = vi.fn();
    const onSelect = vi.fn();

    render(
      <TreeNode
        entry={mockDirEntry}
        side="left"
        isExpanded={false}
        isSelected={false}
        onToggle={onToggle}
        onSelect={onSelect}
      />
    );

    const expandButton = document.querySelector('button[aria-label="展开"]');
    expect(expandButton).toBeInTheDocument();

    if (expandButton) {
      fireEvent.click(expandButton);
      expect(onToggle).toHaveBeenCalledTimes(1);
    }
  });
});
