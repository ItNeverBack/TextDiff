/**
 * useFileDiff Hook
 * 点击文件加载差异内容的 Hook
 */
import { useState, useCallback, useEffect } from 'react';
import type { DirectoryDiffEntry } from '@shared/types/directory.types';
import type { FileInfo } from '@shared/types/file.types';
import type { DiffLine } from '@shared/types/diff.types';

// ============================================
// 配置选项
// ============================================
export interface UseFileDiffOptions {
  /** 是否自动加载 */
  autoLoad?: boolean;
  /** 最大文件大小（字节） */
  maxFileSize?: number;
  /** 加载完成回调 */
  onLoad?: () => void;
  /** 加载错误回调 */
  onError?: (error: string) => void;
}

// ============================================
// 返回值
// ============================================
export interface UseFileDiffResult {
  /** 左侧文件 */
  leftFile: FileInfo | null;
  /** 右侧文件 */
  rightFile: FileInfo | null;
  /** 差异行 */
  diffLines: DiffLine[];
  /** 是否加载中 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 加载文件 */
  loadFiles: (entry: DirectoryDiffEntry) => Promise<void>;
  /** 清除状态 */
  clear: () => void;
  /** 重新加载 */
  reload: () => void;
}

// ============================================
// Hook 实现
// ============================================
export function useFileDiff(options: UseFileDiffOptions = {}): UseFileDiffResult {
  const { autoLoad = false, maxFileSize = 10 * 1024 * 1024, onLoad, onError } = options;

  const [currentEntry, setCurrentEntry] = useState<DirectoryDiffEntry | null>(null);
  const [leftFile, setLeftFile] = useState<FileInfo | null>(null);
  const [rightFile, setRightFile] = useState<FileInfo | null>(null);
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载文件内容
  const loadFiles = useCallback(async (entry: DirectoryDiffEntry) => {
    if (!entry) return;

    // 只处理文件类型
    if (entry.type !== 'file') {
      setError('只能预览文件类型的差异');
      return;
    }

    setCurrentEntry(entry);
    setIsLoading(true);
    setError(null);

    try {
      // 并行加载左右文件
      const [leftResult, rightResult] = await Promise.all([
        entry.leftPath ? window.api.readFile(entry.leftPath).catch(() => null) : null,
        entry.rightPath ? window.api.readFile(entry.rightPath).catch(() => null) : null
      ]);

      // 检查文件大小
      if (leftResult && leftResult.content.length > maxFileSize) {
        throw new Error('左侧文件过大，无法预览');
      }
      if (rightResult && rightResult.content.length > maxFileSize) {
        throw new Error('右侧文件过大，无法预览');
      }

      setLeftFile(leftResult);
      setRightFile(rightResult);

      // 如果是修改的文件，计算差异
      if (entry.status === 'modified' && leftResult && rightResult) {
        const lines = computeSimpleDiff(leftResult.content, rightResult.content);
        setDiffLines(lines);
      } else {
        setDiffLines([]);
      }

      onLoad?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载文件失败';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [maxFileSize, onLoad, onError]);

  // 清除状态
  const clear = useCallback(() => {
    setCurrentEntry(null);
    setLeftFile(null);
    setRightFile(null);
    setDiffLines([]);
    setError(null);
    setIsLoading(false);
  }, []);

  // 重新加载
  const reload = useCallback(() => {
    if (currentEntry) {
      loadFiles(currentEntry);
    }
  }, [currentEntry, loadFiles]);

  // 自动加载
  useEffect(() => {
    if (autoLoad && currentEntry) {
      loadFiles(currentEntry);
    }
  }, [autoLoad, currentEntry, loadFiles]);

  return {
    leftFile,
    rightFile,
    diffLines,
    isLoading,
    error,
    loadFiles,
    clear,
    reload
  };
}

// ============================================
// 简单差异计算
// ============================================
function computeSimpleDiff(leftContent: string, rightContent: string): DiffLine[] {
  const leftLines = leftContent.split('\n');
  const rightLines = rightContent.split('\n');
  const result: DiffLine[] = [];

  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < leftLines.length || rightIndex < rightLines.length) {
    const leftLine = leftLines[leftIndex];
    const rightLine = rightLines[rightIndex];

    if (leftIndex >= leftLines.length) {
      // 只有右侧有内容
      result.push({
        type: 'insert',
        leftContent: '',
        rightContent: rightLine,
        leftLineNo: null,
        rightLineNo: rightIndex + 1
      });
      rightIndex++;
    } else if (rightIndex >= rightLines.length) {
      // 只有左侧有内容
      result.push({
        type: 'delete',
        leftContent: leftLine,
        rightContent: '',
        leftLineNo: leftIndex + 1,
        rightLineNo: null
      });
      leftIndex++;
    } else if (leftLine === rightLine) {
      // 相同
      result.push({
        type: 'equal',
        leftContent: leftLine,
        rightContent: rightLine,
        leftLineNo: leftIndex + 1,
        rightLineNo: rightIndex + 1
      });
      leftIndex++;
      rightIndex++;
    } else {
      // 不同 - 简化处理：标记为删除+插入
      result.push({
        type: 'delete',
        leftContent: leftLine,
        rightContent: '',
        leftLineNo: leftIndex + 1,
        rightLineNo: null
      });
      result.push({
        type: 'insert',
        leftContent: '',
        rightContent: rightLine,
        leftLineNo: null,
        rightLineNo: rightIndex + 1
      });
      leftIndex++;
      rightIndex++;
    }
  }

  return result;
}

export default useFileDiff;
