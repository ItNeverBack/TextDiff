/**
 * DirectoryView 组件测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DirectoryView } from '../DirectoryView';

// Mock hooks
vi.mock('@/hooks/useDirectoryCompare', () => ({
  useDirectoryCompare: () => ({
    comparison: null,
    isLoading: false,
    error: null,
    filteredEntries: [],
    refresh: vi.fn(),
    clear: vi.fn(),
    selectEntry: vi.fn(),
    viewMode: 'all',
    setViewMode: vi.fn(),
    showEqualFiles: true,
    toggleShowEqualFiles: vi.fn(),
    hiddenCount: 0
  }),
  useDirectoryStats: () => ({
    visibleTotal: 0,
    visibleModified: 0,
    visibleLeftOnly: 0,
    visibleRightOnly: 0,
    visibleEqual: 0
  })
}));

vi.mock('@/hooks/useTreeExpand', () => ({
  useTreeExpand: () => ({
    expandedPaths: new Set(),
    expandAll: vi.fn(),
    collapseAll: vi.fn(),
    expandToDiffs: vi.fn()
  })
}));

describe('DirectoryView', () => {
  it('renders empty state when no comparison data', () => {
    render(<DirectoryView />);

    expect(screen.getByText('未选择对比目录')).toBeInTheDocument();
    expect(screen.getByText('请选择两个目录进行对比')).toBeInTheDocument();
  });

  it('renders correctly', () => {
    const { container } = render(<DirectoryView />);
    expect(container.querySelector('.directory-view')).toBeInTheDocument();
  });
});
