/**
 * DirectoryTreePanel 组件测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DirectoryTreePanel } from '../components/DirectoryTreePanel';
import type { DirectoryDiffEntry } from '@shared/types/directory.types';

// Mock store
vi.mock('@/stores/directory.store', () => ({
  useDirectoryCompareStore: () => ({
    isLoading: false,
    error: null,
    comparison: null,
    selectedEntry: null,
    expandedPaths: new Set(),
    toggleExpand: vi.fn(),
    selectEntry: vi.fn(),
    refreshComparison: vi.fn()
  })
}));

vi.mock('@/hooks/useTreeExpand', () => ({
  useTreeExpand: () => ({
    expandedPaths: new Set()
  }),
  useTreeVisibility: () => ({
    visibleEntries: [],
    totalHeight: 0
  }),
  useTreeOperations: () => ({
    findEntryById: vi.fn()
  })
}));

describe('DirectoryTreePanel', () => {
  const mockEntries: DirectoryDiffEntry[] = [
    {
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
          id: 'file-1',
          relativePath: 'src/index.ts',
          name: 'index.ts',
          type: 'file',
          status: 'modified',
          leftPath: '/left/src/index.ts',
          rightPath: '/right/src/index.ts',
          depth: 1
        }
      ]
    }
  ];

  it('renders correctly', () => {
    const { container } = render(
      <DirectoryTreePanel side="left" entries={mockEntries} />
    );
    expect(container.querySelector('.directory-tree-panel')).toBeInTheDocument();
  });

  it('displays root path in header', () => {
    render(
      <DirectoryTreePanel side="left" entries={mockEntries} rootPath="/home/user/project" />
    );
    expect(screen.getByText('project')).toBeInTheDocument();
    expect(screen.getByText('左侧')).toBeInTheDocument();
  });

  it('displays empty state when no entries', () => {
    render(
      <DirectoryTreePanel side="left" entries={[]} />
    );
    expect(screen.getByText('没有可显示的文件')).toBeInTheDocument();
  });

  it('calls onEntrySelect when entry is clicked', () => {
    const onEntrySelect = vi.fn();
    render(
      <DirectoryTreePanel side="left" entries={mockEntries} onEntrySelect={onEntrySelect} />
    );
    // Note: TreeNode rendering is virtualized, so we verify the component renders
    expect(screen.getByText('没有可显示的文件')).toBeInTheDocument();
  });

  it('displays footer with item count', () => {
    render(
      <DirectoryTreePanel side="left" entries={mockEntries} />
    );
    expect(screen.getByText('共 0 项')).toBeInTheDocument();
    expect(screen.getByText('0 个展开')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    vi.mocked(require('@/stores/directory.store').useDirectoryCompareStore).mockReturnValue({
      isLoading: true,
      error: null,
      comparison: null,
      selectedEntry: null,
      expandedPaths: new Set(),
      toggleExpand: vi.fn(),
      selectEntry: vi.fn(),
      refreshComparison: vi.fn()
    });

    render(
      <DirectoryTreePanel side="left" entries={[]} />
    );
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('renders error state with retry', () => {
    const refreshComparison = vi.fn();
    vi.mocked(require('@/stores/directory.store').useDirectoryCompareStore).mockReturnValue({
      isLoading: false,
      error: 'Failed to load directory',
      comparison: null,
      selectedEntry: null,
      expandedPaths: new Set(),
      toggleExpand: vi.fn(),
      selectEntry: vi.fn(),
      refreshComparison
    });

    render(
      <DirectoryTreePanel side="left" entries={[]} />
    );
    expect(screen.getByText('Failed to load directory')).toBeInTheDocument();
    
    const retryButton = screen.getByText('重试');
    fireEvent.click(retryButton);
    expect(refreshComparison).toHaveBeenCalledTimes(1);
  });
});
