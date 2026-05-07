/**
 * FilterBar 组件测试
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FilterBar } from '../components/FilterBar';

// Mock store
vi.mock('@/stores/filter.store', () => ({
  useFilterStore: () => ({
    searchQuery: '',
    setSearchQuery: vi.fn(),
    clearSearch: vi.fn(),
    isRegexSearch: false,
    toggleRegexSearch: vi.fn(),
    caseSensitive: false,
    toggleCaseSensitive: vi.fn(),
    showFiles: true,
    showDirectories: true,
    setShowFiles: vi.fn(),
    setShowDirectories: vi.fn(),
    showEqual: true,
    showModified: true,
    showLeftOnly: true,
    showRightOnly: true,
    toggleShowEqual: vi.fn(),
    toggleShowModified: vi.fn(),
    toggleShowLeftOnly: vi.fn(),
    toggleShowRightOnly: vi.fn(),
    clearFilters: vi.fn(),
    applyPreset: vi.fn()
  }),
  COMMON_FILTER_PRESETS: [
    { name: '源代码文件', description: '只显示源代码文件', filters: [] },
    { name: '排除Node模块', description: '排除 node_modules 目录', filters: [] }
  ]
}));

describe('FilterBar', () => {
  it('renders correctly', () => {
    const { container } = render(<FilterBar />);
    expect(container.querySelector('.filter-bar')).toBeInTheDocument();
  });

  it('displays search input', () => {
    render(<FilterBar />);
    expect(screen.getByPlaceholderText('搜索文件...')).toBeInTheDocument();
  });

  it('displays type filter buttons', () => {
    render(<FilterBar />);
    expect(screen.getByText('文件')).toBeInTheDocument();
    expect(screen.getByText('目录')).toBeInTheDocument();
  });

  it('displays status filter buttons', () => {
    render(<FilterBar />);
    expect(screen.getByText('相同')).toBeInTheDocument();
    expect(screen.getByText('修改')).toBeInTheDocument();
    expect(screen.getByText('仅左侧')).toBeInTheDocument();
    expect(screen.getByText('仅右侧')).toBeInTheDocument();
  });

  it('displays preset dropdown button', () => {
    render(<FilterBar />);
    expect(screen.getByText('预设')).toBeInTheDocument();
  });

  it('calls onRefresh when refresh button is clicked', () => {
    const onRefresh = vi.fn();
    render(<FilterBar onRefresh={onRefresh} />);

    const refreshButton = screen.getByText('刷新');
    fireEvent.click(refreshButton);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows spinner when refreshing', () => {
    render(<FilterBar isRefreshing={true} />);

    const refreshButton = screen.getByText('刷新');
    const svg = refreshButton.querySelector('svg');
    expect(svg?.classList.toString()).toContain('animate-spin');
  });

  it('opens preset dropdown when clicked', async () => {
    render(<FilterBar />);

    const presetButton = screen.getByText('预设');
    fireEvent.click(presetButton);

    await waitFor(() => {
      expect(screen.getByText('源代码文件')).toBeInTheDocument();
      expect(screen.getByText('排除Node模块')).toBeInTheDocument();
    });
  });

  it('displays regex search toggle', () => {
    render(<FilterBar />);
    const regexButton = screen.getByTitle('正则表达式');
    expect(regexButton).toBeInTheDocument();
    expect(regexButton).toHaveTextContent('.*');
  });

  it('displays case sensitive toggle', () => {
    render(<FilterBar />);
    const caseButton = screen.getByTitle('区分大小写');
    expect(caseButton).toBeInTheDocument();
    expect(caseButton).toHaveTextContent('Aa');
  });
});
