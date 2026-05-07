import type { FileInfo } from '@shared/types'

interface FileInfoBarProps {
  leftFile: FileInfo | null
  rightFile: FileInfo | null
  onSwap?: () => void
}

export function FileInfoBar({ leftFile, rightFile, onSwap }: FileInfoBarProps) {
  const formatPath = (path: string | null) => {
    if (!path) return '未选择文件'
    // 简化路径显示
    const parts = path.split(/[\\/]/)
    if (parts.length > 3) {
      return '.../' + parts.slice(-2).join('/')
    }
    return path
  }

  const getLineCount = (content: string) => {
    if (!content) return 0
    return content.split('\n').length
  }

  return (
    <div className="file-info-bar">
      <div className="file-info left">
        <div className="file-info-path">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          </svg>
          <span className="file-path" title={leftFile?.path || ''}>
            {formatPath(leftFile?.path || null)}
          </span>
        </div>
        {leftFile && (
          <div className="file-meta">
            <span className="meta-chip">{leftFile.encoding}</span>
            <span className="meta-chip">{leftFile.lineEnding.toUpperCase()}</span>
            <span className="meta-chip">{leftFile.language}</span>
            <span className="meta-chip lines-chip">{getLineCount(leftFile.content)} 行</span>
          </div>
        )}
      </div>

      <div className="file-info-divider">
        <button className="swap-btn" onClick={onSwap} title="交换左右文件" aria-label="交换左右文件">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
          </svg>
        </button>
      </div>

      <div className="file-info right">
        <div className="file-info-path">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          </svg>
          <span className="file-path" title={rightFile?.path || ''}>
            {formatPath(rightFile?.path || null)}
          </span>
        </div>
        {rightFile && (
          <div className="file-meta">
            <span className="meta-chip">{rightFile.encoding}</span>
            <span className="meta-chip">{rightFile.lineEnding.toUpperCase()}</span>
            <span className="meta-chip">{rightFile.language}</span>
            <span className="meta-chip lines-chip">{getLineCount(rightFile.content)} 行</span>
          </div>
        )}
      </div>
    </div>
  )
}
