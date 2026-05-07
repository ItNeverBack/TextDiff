import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFileDiff } from '../useFileDiff';
import type { DirectoryDiffEntry } from '@shared/types/directory.types';

// Mock window.api
const mockReadFile = vi.fn();
(Object.defineProperty as any)(window, 'api', {
  value: {
    readFile: mockReadFile
  },
  writable: true
});

describe('useFileDiff', () => {
  const mockEntry: DirectoryDiffEntry = {
    id: 'test-1',
    relativePath: 'test.txt',
    name: 'test.txt',
    type: 'file',
    status: 'modified',
    leftPath: '/left/test.txt',
    rightPath: '/right/test.txt',
    depth: 0
  };

  beforeEach(() => {
    mockReadFile.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('基本功能', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useFileDiff());

      expect(result.current.leftFile).toBeNull();
      expect(result.current.rightFile).toBeNull();
      expect(result.current.diffLines).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should load files for modified entry', async () => {
      const leftContent = 'line1\nline2\nline3';
      const rightContent = 'line1\nmodified\nline3';

      mockReadFile
        .mockResolvedValueOnce({ content: leftContent, path: '/left/test.txt' })
        .mockResolvedValueOnce({ content: rightContent, path: '/right/test.txt' });

      const { result } = renderHook(() => useFileDiff());

      await act(async () => {
        await result.current.loadFiles(mockEntry);
      });

      expect(result.current.leftFile).toBeDefined();
      expect(result.current.rightFile).toBeDefined();
      expect(result.current.diffLines.length).toBeGreaterThan(0);
    });

    it('should handle left-only entry', async () => {
      const leftOnlyEntry: DirectoryDiffEntry = {
        ...mockEntry,
        status: 'left-only',
        rightPath: null
      };

      mockReadFile.mockResolvedValueOnce({
        content: 'left content',
        path: '/left/test.txt'
      });

      const { result } = renderHook(() => useFileDiff());

      await act(async () => {
        await result.current.loadFiles(leftOnlyEntry);
      });

      expect(result.current.leftFile).toBeDefined();
      expect(result.current.rightFile).toBeNull();
    });

    it('should handle right-only entry', async () => {
      const rightOnlyEntry: DirectoryDiffEntry = {
        ...mockEntry,
        status: 'right-only',
        leftPath: null
      };

      mockReadFile.mockResolvedValueOnce({
        content: 'right content',
        path: '/right/test.txt'
      });

      const { result } = renderHook(() => useFileDiff());

      await act(async () => {
        await result.current.loadFiles(rightOnlyEntry);
      });

      expect(result.current.leftFile).toBeNull();
      expect(result.current.rightFile).toBeDefined();
    });

    it('should handle directory entry', async () => {
      const dirEntry: DirectoryDiffEntry = {
        ...mockEntry,
        type: 'directory'
      };

      const { result } = renderHook(() => useFileDiff());

      await act(async () => {
        await result.current.loadFiles(dirEntry);
      });

      expect(result.current.error).toBe('只能预览文件类型的差异');
    });
  });

  describe('加载状态', () => {
    it('should set loading state during file load', async () => {
      mockReadFile
        .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ content: 'test', path: '' }), 100)));

      const { result } = renderHook(() => useFileDiff());

      act(() => {
        result.current.loadFiles(mockEntry);
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('should clear loading state on error', async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));

      const { result } = renderHook(() => useFileDiff());

      await act(async () => {
        await result.current.loadFiles(mockEntry);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('File not found');
    });
  });

  describe('文件大小限制', () => {
    it('should reject files larger than maxFileSize', async () => {
      const largeContent = 'x'.repeat(1024 * 1024 * 11); // 11MB

      mockReadFile.mockResolvedValue({
        content: largeContent,
        path: '/left/test.txt'
      });

      const { result } = renderHook(() => useFileDiff({ maxFileSize: 10 * 1024 * 1024 }));

      await act(async () => {
        await result.current.loadFiles(mockEntry);
      });

      expect(result.current.error).toContain('文件过大');
    });
  });

  describe('回调函数', () => {
    it('should call onLoad on successful load', async () => {
      const onLoad = vi.fn();
      mockReadFile.mockResolvedValue({ content: 'test', path: '' });

      const { result } = renderHook(() => useFileDiff({ onLoad }));

      await act(async () => {
        await result.current.loadFiles(mockEntry);
      });

      expect(onLoad).toHaveBeenCalled();
    });

    it('should call onError on failed load', async () => {
      const onError = vi.fn();
      mockReadFile.mockRejectedValue(new Error('Load failed'));

      const { result } = renderHook(() => useFileDiff({ onError }));

      await act(async () => {
        await result.current.loadFiles(mockEntry);
      });

      expect(onError).toHaveBeenCalledWith('Load failed');
    });
  });

  describe('清除和重载', () => {
    it('should clear state', async () => {
      mockReadFile.mockResolvedValue({ content: 'test', path: '' });

      const { result } = renderHook(() => useFileDiff());

      await act(async () => {
        await result.current.loadFiles(mockEntry);
      });

      act(() => {
        result.current.clear();
      });

      expect(result.current.leftFile).toBeNull();
      expect(result.current.rightFile).toBeNull();
      expect(result.current.diffLines).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should reload current entry', async () => {
      mockReadFile
        .mockResolvedValueOnce({ content: 'v1', path: '' })
        .mockResolvedValueOnce({ content: 'v2', path: '' });

      const { result } = renderHook(() => useFileDiff());

      await act(async () => {
        await result.current.loadFiles(mockEntry);
      });

      await act(async () => {
        await result.current.reload();
      });

      expect(mockReadFile).toHaveBeenCalledTimes(4); // 2次初始 + 2次重载
    });
  });

  describe('差异计算', () => {
    it('should compute diff for modified files', async () => {
      mockReadFile
        .mockResolvedValueOnce({ content: 'a\nb\nc', path: '' })
        .mockResolvedValueOnce({ content: 'a\nB\nc', path: '' });

      const { result } = renderHook(() => useFileDiff());

      await act(async () => {
        await result.current.loadFiles(mockEntry);
      });

      expect(result.current.diffLines).toContainEqual(
        expect.objectContaining({
          type: 'equal',
          leftLineNo: 1,
          rightLineNo: 1
        })
      );

      expect(result.current.diffLines).toContainEqual(
        expect.objectContaining({
          type: 'delete',
          leftLineNo: 2
        })
      );

      expect(result.current.diffLines).toContainEqual(
        expect.objectContaining({
          type: 'insert',
          rightLineNo: 2
        })
      );
    });

    it('should handle empty files', async () => {
      mockReadFile
        .mockResolvedValueOnce({ content: '', path: '' })
        .mockResolvedValueOnce({ content: '', path: '' });

      const { result } = renderHook(() => useFileDiff());

      await act(async () => {
        await result.current.loadFiles(mockEntry);
      });

      expect(result.current.diffLines).toHaveLength(0);
    });

    it('should handle added lines', async () => {
      mockReadFile
        .mockResolvedValueOnce({ content: 'line1', path: '' })
        .mockResolvedValueOnce({ content: 'line1\nline2', path: '' });

      const { result } = renderHook(() => useFileDiff());

      await act(async () => {
        await result.current.loadFiles(mockEntry);
      });

      const insertLines = result.current.diffLines.filter(l => l.type === 'insert');
      expect(insertLines).toHaveLength(1);
      expect(insertLines[0].rightContent).toBe('line2');
    });

    it('should handle deleted lines', async () => {
      mockReadFile
        .mockResolvedValueOnce({ content: 'line1\nline2', path: '' })
        .mockResolvedValueOnce({ content: 'line1', path: '' });

      const { result } = renderHook(() => useFileDiff());

      await act(async () => {
        await result.current.loadFiles(mockEntry);
      });

      const deleteLines = result.current.diffLines.filter(l => l.type === 'delete');
      expect(deleteLines).toHaveLength(1);
      expect(deleteLines[0].leftContent).toBe('line2');
    });
  });
});
