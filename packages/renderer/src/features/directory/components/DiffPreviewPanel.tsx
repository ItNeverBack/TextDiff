/**
 * DiffPreviewPanel 组件
 * 文件差异预览面板 - 显示两个文件的差异对比
 * 
 * 使用 MonacoDiffEditor 复用现有的 diff 展示组件
 * §7.3 复用现有的 SplitDiffView 组件 - 使用 MonacoDiffEditor 作为核心差异展示
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { cn } from '@renderer/lib/utils';
import type { DirectoryDiffEntry } from '@shared/types/directory.types';
import type { FileInfo, DiffResult } from '@shared/types';
import { MonacoDiffEditor, type MonacoDiffEditorRef } from '@renderer/features/diff-view/components/MonacoDiffEditor';

// ============================================
// 组件属性
// ============================================
export interface DiffPreviewPanelProps {
  /** 选中的目录差异条目 */
  entry: DirectoryDiffEntry | null;
  /** 是否显示加载状态 */
  isLoading?: boolean;
  /** 错误信息 */
  error?: string | null;
  /** 自定义类名 */
  className?: string;
  /** 内容区域样式 */
  contentClassName?: string;
  /** 加载完成回调 */
  onLoad?: () => void;
  /** 加载错误回调 */
  onError?: (error: string) => void;
}

// ============================================
// DiffPreviewPanel 组件
// ============================================
export const DiffPreviewPanel: React.FC<DiffPreviewPanelProps> = ({
  entry,
  isLoading: externalLoading,
  error: externalError,
  className,
  contentClassName,
  onLoad,
  onError
}) => {
  const [leftFile, setLeftFile] = useState<FileInfo | null>(null);
  const [rightFile, setRightFile] = useState<FileInfo | null>(null);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<MonacoDiffEditorRef>(null);

  // 加载文件内容并计算差异
  useEffect(() => {
    if (!entry) {
      setLeftFile(null);
      setRightFile(null);
      setDiffResult(null);
      setError(null);
      return;
    }

    const loadFiles = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [leftResult, rightResult] = await Promise.all([
          entry.leftPath ? window.api.readFile(entry.leftPath).catch(() => null) : null,
          entry.rightPath ? window.api.readFile(entry.rightPath).catch(() => null) : null
        ]);

        setLeftFile(leftResult);
        setRightFile(rightResult);

        // 如果是修改的文件，计算完整差异
        if (entry.status === 'modified' && leftResult && rightResult) {
          const result = await window.api.computeDiff(leftResult, rightResult, {
            algorithm: 'myers',
            ignoreWhitespace: 'none',
            ignoreCase: false,
            ignoreLineEndings: false,
            ignorePatterns: [],
            ignoreComments: false,
            commentPrefixes: [],
            contextLines: 3
          });
          setDiffResult(result);
        }

        onLoad?.();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '加载文件失败';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
  }, [entry, onLoad, onError]);

  // 获取状态标签
  const getStatusLabel = useCallback((status: string): string => {
    const labels: Record<string, string> = {
      'equal': '相同',
      'modified': '已修改',
      'left-only': '仅左侧',
      'right-only': '仅右侧',
      'type-changed': '类型变更',
      'permission-changed': '权限变更'
    };
    return labels[status] || status;
  }, []);

  // 获取状态样式
  const getStatusStyles = useCallback((status: string): string => {
    const styles: Record<string, string> = {
      'equal': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'modified': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      'left-only': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'right-only': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'type-changed': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'permission-changed': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  }, []);

  // 如果没有条目，显示空状态
  if (!entry) {
    return (
      <div
        className={cn(
          'diff-preview-panel',
          'flex items-center justify-center',
          'h-full p-8',
          'text-gray-500 dark:text-gray-400',
          className
        )}
      >
        <div className="text-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="mx-auto mb-3 opacity-50"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p className="text-sm">选择一个文件查看差异</p>
        </div>
      </div>
    );
  }

  const loading = externalLoading !== undefined ? externalLoading : isLoading;
  const errorMessage = externalError !== undefined ? externalError : error;

  return (
    <div
      className={cn(
        'diff-preview-panel',
        'flex flex-col h-full',
        className
      )}
    >
      {/* 文件信息头部 */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {entry.type === 'file' ? '📄' : '📁'} {entry.relativePath}
        </span>
        <span className={cn(
          'text-xs px-2 py-0.5 rounded flex-shrink-0',
          getStatusStyles(entry.status)
        )}>
          {getStatusLabel(entry.status)}
        </span>
      </div>

      {/* 内容区域 */}
      <div className={cn('flex-1 overflow-hidden', contentClassName)}>
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3" />
            <span>加载文件中...</span>
          </div>
        ) : errorMessage ? (
          <div className="flex flex-col items-center justify-center h-full text-red-500 p-4">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-center">{errorMessage}</span>
          </div>
        ) : entry.status === 'left-only' ? (
          <SingleFileView
            file={leftFile}
            label="仅存在于左侧"
            bgColor="bg-blue-50 dark:bg-blue-900/10"
          />
        ) : entry.status === 'right-only' ? (
          <SingleFileView
            file={rightFile}
            label="仅存在于右侧"
            bgColor="bg-red-50 dark:bg-red-900/10"
          />
        ) : entry.status === 'equal' ? (
          <SingleFileView
            file={leftFile || rightFile}
            label="文件内容相同"
            bgColor="bg-green-50 dark:bg-green-900/10"
          />
        ) : entry.status === 'modified' ? (
          <div className="h-full w-full overflow-hidden">
            <MonacoDiffEditor
              ref={editorRef}
              leftFile={leftFile}
              rightFile={rightFile}
              diffResult={diffResult}
              activeChunkIndex={-1}
              isCollapsed={false}
              readOnly={true}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            无法加载文件内容
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// 单文件视图组件
// ============================================
interface SingleFileViewProps {
  file: FileInfo | null;
  label: string;
  bgColor: string;
}

const SingleFileView: React.FC<SingleFileViewProps> = ({ file, label, bgColor }) => {
  return (
    <div className={cn('h-full overflow-auto p-4', bgColor)}>
      <div className="text-sm text-gray-500 mb-2 font-medium">{label}:</div>
      {file?.content ? (
        <pre className="text-sm font-mono whitespace-pre-wrap text-gray-800 dark:text-gray-200">
          {file.content}
        </pre>
      ) : (
        <div className="text-sm text-gray-400 italic">(空文件)</div>
      )}
    </div>
  );
};

export default DiffPreviewPanel;
