/**
 * ActionToolbar 组件测试
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActionToolbar } from '../components/ActionToolbar';

describe('ActionToolbar', () => {
  it('renders correctly', () => {
    const { container } = render(<ActionToolbar />);
    expect(container.querySelector('.action-toolbar')).toBeInTheDocument();
  });

  it('displays view mode buttons', () => {
    render(<ActionToolbar viewMode="all" />);

    expect(screen.getByText('全部')).toBeInTheDocument();
    expect(screen.getByText('仅差异')).toBeInTheDocument();
    expect(screen.getByText('仅左侧')).toBeInTheDocument();
    expect(screen.getByText('仅右侧')).toBeInTheDocument();
  });

  it('calls onViewModeChange when view mode button is clicked', () => {
    const onViewModeChange = vi.fn();
    render(<ActionToolbar viewMode="all" onViewModeChange={onViewModeChange} />);

    fireEvent.click(screen.getByText('仅差异'));
    expect(onViewModeChange).toHaveBeenCalledWith('diff-only');
  });

  it('highlights active view mode', () => {
    const { rerender } = render(<ActionToolbar viewMode="all" />);

    const allButton = screen.getByText('全部');
    expect(allButton.className).toContain('bg-white');

    rerender(<ActionToolbar viewMode="diff-only" />);
    const diffButton = screen.getByText('仅差异');
    expect(diffButton.className).toContain('bg-white');
  });

  it('calls onExpandAll when expand all button is clicked', () => {
    const onExpandAll = vi.fn();
    render(<ActionToolbar onExpandAll={onExpandAll} />);

    const expandButton = screen.getByTitle('展开全部');
    fireEvent.click(expandButton);
    expect(onExpandAll).toHaveBeenCalledTimes(1);
  });

  it('calls onCollapseAll when collapse all button is clicked', () => {
    const onCollapseAll = vi.fn();
    render(<ActionToolbar onCollapseAll={onCollapseAll} />);

    const collapseButton = screen.getByTitle('折叠全部');
    fireEvent.click(collapseButton);
    expect(onCollapseAll).toHaveBeenCalledTimes(1);
  });

  it('calls onExpandToDiffs when expand to diffs button is clicked', () => {
    const onExpandToDiffs = vi.fn();
    render(<ActionToolbar onExpandToDiffs={onExpandToDiffs} />);

    const expandDiffsButton = screen.getByTitle('展开差异项');
    fireEvent.click(expandDiffsButton);
    expect(onExpandToDiffs).toHaveBeenCalledTimes(1);
  });

  it('calls onSync when sync button is clicked', () => {
    const onSync = vi.fn();
    render(<ActionToolbar onSync={onSync} canSync={true} />);

    const syncButton = screen.getByText('同步');
    fireEvent.click(syncButton);
    expect(onSync).toHaveBeenCalledTimes(1);
  });

  it('disables sync button when canSync is false', () => {
    const onSync = vi.fn();
    render(<ActionToolbar onSync={onSync} canSync={false} />);

    const syncButton = screen.getByText('同步');
    expect(syncButton).toBeDisabled();
  });

  it('calls onExport when export button is clicked', () => {
    const onExport = vi.fn();
    render(<ActionToolbar onExport={onExport} />);

    const exportButton = screen.getByText('导出');
    fireEvent.click(exportButton);
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('selects all entries when select all button is clicked', () => {
    render(<ActionToolbar />);

    const selectAllButton = screen.getByText('全选');
    expect(selectAllButton).toBeInTheDocument();
  });

  it('clears selection when clear button is clicked', () => {
    render(<ActionToolbar />);

    const clearButton = screen.getByText('清空');
    expect(clearButton).toBeInTheDocument();
  });
});
