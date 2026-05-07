import React, { useState, useCallback } from 'react'
import type { DirectoryReadOptions } from '@shared/types'

interface DirectoryFilterBarProps {
  onFilterChange: (options: DirectoryReadOptions) => void
  disabled?: boolean
}

/**
 * DirectoryFilterBar - 目录对比过滤工具栏
 * 
 * 支持：
 * - 扩展名过滤（如 .ts,.js）
 * - 通配符/正则排除模式（如 node_modules,*.log）
 * - 目录排除规则（如 node_modules）
 * 
 * 参考: TextDiff-DevPlan.md §Week 10.3 功能完善（过滤）
 */
export const DirectoryFilterBar: React.FC<DirectoryFilterBarProps> = ({
  onFilterChange,
  disabled = false
}) => {
  const [extensions, setExtensions] = useState('')
  const [excludePatterns, setExcludePatterns] = useState('node_modules,.git')

  const applyFilter = useCallback(() => {
    const options: DirectoryReadOptions = {}

    // 解析扩展名
    if (extensions.trim()) {
      options.filter = {
        extensions: extensions
          .split(',')
          .map(ext => ext.trim())
          .filter(Boolean)
          .map(ext => ext.startsWith('.') ? ext.slice(1) : ext)
      }
    }

    // 解析排除模式
    if (excludePatterns.trim()) {
      const patterns = excludePatterns
        .split(',')
        .map(p => p.trim())
        .filter(Boolean)
      
      if (options.filter) {
        options.filter.exclude = patterns
      } else {
        options.filter = { exclude: patterns }
      }
    }

    onFilterChange(options)
  }, [extensions, excludePatterns, onFilterChange])

  const handleExtensionsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setExtensions(e.target.value)
  }, [])

  const handleExcludeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setExcludePatterns(e.target.value)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyFilter()
    }
  }, [applyFilter])

  return (
    <div className={`dir-filter-bar ${disabled ? 'disabled' : ''}`}>
      <div className="filter-group">
        <label className="filter-label">扩展名过滤：</label>
        <input
          type="text"
          className="filter-input"
          placeholder="如: .ts,.js,.json"
          value={extensions}
          onChange={handleExtensionsChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
      </div>
      
      <div className="filter-group">
        <label className="filter-label">排除模式：</label>
        <input
          type="text"
          className="filter-input"
          placeholder="如: node_modules,.git,*.log"
          value={excludePatterns}
          onChange={handleExcludeChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
      </div>
      
      <button 
        className="filter-apply-btn"
        onClick={applyFilter}
        disabled={disabled}
      >
        应用过滤
      </button>
    </div>
  )
}
