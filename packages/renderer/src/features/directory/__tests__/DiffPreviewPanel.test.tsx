import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DiffPreviewPanel } from '../DiffPreviewPanel';
import type { DirectoryDiffEntry } from '@shared/types/directory.types';
import type { FileInfo } from '@shared/types/file.types';

// Mock the SplitDiffView component
vi.mock('@renderer/features/diff-view', () => ({
  SplitDiffView: ({ leftFile, rightFile }: { leftFile: FileInfo; rightFile: FileInfo }) => (
    <div data-testid="split-diff-view">
      SplitDiff: {leftFile.path} vs {rightFile.path}
    </div>
  )
}));

// Mock the window.api
const mockReadFile = vi.fn();
Object.defineProperty(window, 'api', {
  value: {
    file: {
      read: mockReadFile
    }
  },
  writable: true
});

describe('DiffPreviewPanel', () => {
  const mockFileInfo = (path: string, content: string): FileInfo => ({
    path,
    name: path.split('/').pop() || '',
    content,
    encoding: 'utf8',
    size: content.length,
    modifiedTime: new Date(),
    extension: path.split('.').pop() || ''
  });

  const mockEntry = (overrides: Partial<DirectoryDiffEntry> = {}): DirectoryDiffEntry => ({
    id: 'test-id',
    relativePath: 'test/file.ts',
    name: 'file.ts',
    type: 'file',
    status: 'modified',
    leftPath: '/left/test/file.ts',
    rightPath: '/right/test/file.ts',
    depth: 1,
    ...overrides
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no entry is provided', () => {
    render(<DiffPreviewPanel entry={null} />);

    expect(screen.getByText('选择一个文件查看差异')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<DiffPreviewPanel entry={mockEntry()} isLoading={true} />);

    expect(screen.getByText('加载文件中...')).toBeInTheDocument();
  });

  it('should show error state', () => {
    render(<DiffPreviewPanel entry={mockEntry()} error="Failed to load" />);

    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('should load and display left-only file', async () => {
    const leftContent = 'console.log("left")';
    mockReadFile.mockResolvedValueOnce(mockFileInfo('/left/test.ts', leftContent));

    const entry = mockEntry({
      status: 'left-only',
      rightPath: null
    });

    render(<DiffPreviewPanel entry={entry} />);

    await waitFor(() => {
      expect(screen.getByText('仅存在于左侧:')).toBeInTheDocument();
    });

    expect(screen.getByText(leftContent)).toBeInTheDocument();
  });

  it('should load and display right-only file', async () => {
    const rightContent = 'console.log("right")';
    mockReadFile.mockResolvedValueOnce(mockFileInfo('/right/test.ts', rightContent));

    const entry = mockEntry({
      status: 'right-only',
      leftPath: null
    });

    render(<DiffPreviewPanel entry={entry} />);

    await waitFor(() => {
      expect(screen.getByText('仅存在于右侧:')).toBeInTheDocument();
    });

    expect(screen.getByText(rightContent)).toBeInTheDocument();
  });

  it('should display SplitDiffView for modified files', async () => {
    const leftContent = 'console.log("old")';
    const rightContent = 'console.log("new")';

    mockReadFile
      .mockResolvedValueOnce(mockFileInfo('/left/test.ts', leftContent))
      .mockResolvedValueOnce(mockFileInfo('/right/test.ts', rightContent));

    const entry = mockEntry({ status: 'modified' });

    render(<DiffPreviewPanel entry={entry} />);

    await waitFor(() => {
      expect(screen.getByTestId('split-diff-view')).toBeInTheDocument();
    });
  });

  it('should show empty file message for empty files', async () => {
    mockReadFile.mockResolvedValueOnce(mockFileInfo('/left/empty.ts', ''));

    const entry = mockEntry({
      status: 'left-only',
      rightPath: null
    });

    render(<DiffPreviewPanel entry={entry} />);

    await waitFor(() => {
      expect(screen.getByText('(空文件)')).toBeInTheDocument();
    });
  });

  it('should display correct status label', () => {
    const { rerender } = render(<DiffPreviewPanel entry={mockEntry({ status: 'modified' })} />);

    expect(screen.getByText('已修改')).toBeInTheDocument();

    rerender(<DiffPreviewPanel entry={mockEntry({ status: 'left-only', rightPath: null })} />);

    expect(screen.getByText('仅左侧')).toBeInTheDocument();
  });

  it('should call onLoad callback when files load successfully', async () => {
    const onLoad = vi.fn();
    mockReadFile
      .mockResolvedValueOnce(mockFileInfo('/left/test.ts', 'left'))
      .mockResolvedValueOnce(mockFileInfo('/right/test.ts', 'right'));

    render(<DiffPreviewPanel entry={mockEntry()} onLoad={onLoad} />);

    await waitFor(() => {
      expect(onLoad).toHaveBeenCalled();
    });
  });

  it('should call onError callback when file load fails', async () => {
    const onError = vi.fn();
    mockReadFile.mockRejectedValueOnce(new Error('Read error'));

    render(<DiffPreviewPanel entry={mockEntry()} onError={onError} />);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Read error');
    });
  });

  it('should display file path in header', () => {
    const entry = mockEntry({ relativePath: 'src/components/Button.tsx' });
    render(<DiffPreviewPanel entry={entry} />);

    expect(screen.getByText(/src\/components\/Button.tsx/)).toBeInTheDocument();
  });

  it('should handle directory entries gracefully', () => {
    const entry = mockEntry({
      type: 'directory',
      status: 'modified'
    });

    const { container } = render(<DiffPreviewPanel entry={entry} />);

    // Should show folder icon
    expect(container.textContent).toContain('📁');
  });
});
