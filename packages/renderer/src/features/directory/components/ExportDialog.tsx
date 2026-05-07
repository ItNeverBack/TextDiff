import React, { useState, useCallback } from 'react'
import type {
  DirectoryComparison,
  ReportFormat,
  ReportOptions
} from '@shared/types'

/**
 * 导出对话框属性
 */
export interface ExportDialogProps {
  isOpen: boolean
  comparison: DirectoryComparison | null
  onClose: () => void
  onExport: (format: ReportFormat, options: ReportOptions) => void
}

/**
 * 导出对话框
 *
 * 允许用户选择报告格式和选项，导出目录对比结果
 */
export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  comparison,
  onClose,
  onExport
}) => {
  const [format, setFormat] = useState<ReportFormat>('html')
  const [includeEqual, setIncludeEqual] = useState(false)
  const [includeContent, setIncludeContent] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  if (!isOpen || !comparison) return null

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      const options: ReportOptions = {
        format,
        includeEqual,
        includeContent,
        maxContentLength: includeContent ? 1000 : undefined
      }
      onExport(format, options)
    } finally {
      setIsExporting(false)
    }
  }, [format, includeEqual, includeContent, onExport])

  const formatOptions: { value: ReportFormat; label: string; description: string; icon: string }[] = [
    {
      value: 'html',
      label: 'HTML 报告',
      description: '包含统计图表的完整网页报告，可在浏览器中打开',
      icon: '🌐'
    },
    {
      value: 'json',
      label: 'JSON 数据',
      description: '结构化的 JSON 格式数据，便于程序处理',
      icon: '📋'
    },
    {
      value: 'csv',
      label: 'CSV 表格',
      description: '逗号分隔值文件，可用 Excel 打开',
      icon: '📊'
    },
    {
      value: 'xml',
      label: 'XML 文档',
      description: '标准 XML 格式，便于与其他系统集成',
      icon: '📄'
    }
  ]

  return (
    <div className="export-dialog-overlay" onClick={onClose}>
      <div className="export-dialog" onClick={e => e.stopPropagation()}>
        <div className="export-dialog-header">
          <span className="export-icon">📤</span>
          <h2>导出对比报告</h2>
        </div>

        <div className="export-dialog-content">
          {/* 格式选择 */}
          <div className="format-section">
            <h3>选择格式</h3>
            <div className="format-options">
              {formatOptions.map((option) => (
                <label
                  key={option.value}
                  className={`format-option ${format === option.value ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="format"
                    value={option.value}
                    checked={format === option.value}
                    onChange={() => setFormat(option.value)}
                  />
                  <div className="format-option-content">
                    <span className="format-icon">{option.icon}</span>
                    <div className="format-info">
                      <span className="format-label">{option.label}</span>
                      <span className="format-description">{option.description}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 选项设置 */}
          <div className="options-section">
            <h3>导出选项</h3>
            <div className="export-options">
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={includeEqual}
                  onChange={(e) => setIncludeEqual(e.target.checked)}
                />
                <div className="option-content">
                  <span className="option-label">包含相同的文件</span>
                  <span className="option-hint">
                    导出所有文件，包括内容相同的文件
                  </span>
                </div>
              </label>

              <label className="option-item">
                <input
                  type="checkbox"
                  checked={includeContent}
                  onChange={(e) => setIncludeContent(e.target.checked)}
                  disabled={format === 'csv' || format === 'xml'}
                />
                <div className="option-content">
                  <span className="option-label">包含内容差异</span>
                  <span className="option-hint">
                    包含文件内容的详细差异（仅支持 HTML/JSON 格式）
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* 预览信息 */}
          <div className="preview-section">
            <h3>导出预览</h3>
            <div className="preview-info">
              <div className="preview-item">
                <span className="preview-label">文件总数:</span>
                <span className="preview-value">{comparison.statistics.totalFiles}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">导出文件数:</span>
                <span className="preview-value">
                  {includeEqual
                    ? comparison.statistics.totalFiles
                    : comparison.statistics.totalFiles - comparison.statistics.equal}
                </span>
              </div>
              <div className="preview-item">
                <span className="preview-label">格式:</span>
                <span className="preview-value">.{format}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="export-dialog-actions">
          <button className="btn-cancel" onClick={onClose} disabled={isExporting}>
            取消
          </button>
          <button
            className="btn-export"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <span className="spinner"></span>
                导出中...
              </>
            ) : (
              '>> 导出报告'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportDialog
