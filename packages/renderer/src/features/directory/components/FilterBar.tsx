/**
 * FilterBar 组件
 * 目录对比过滤器工具栏
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@renderer/lib/utils';
import { useFilterStore, COMMON_FILTER_PRESETS } from '@renderer/stores/filter.store';
import type { DirectoryFilter, ExtensionFilter, GlobFilter, RegexFilter } from '@shared/types/directory.types';
import { generateId } from '@shared/utils/id';

// ============================================
// 组件属性
// ============================================
export interface FilterBarProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

// 常见扩展名列表
const COMMON_EXTENSIONS = [
  { label: 'TypeScript', extensions: ['.ts', '.tsx'] },
  { label: 'JavaScript', extensions: ['.js', '.jsx'] },
  { label: 'Vue', extensions: ['.vue'] },
  { label: 'Python', extensions: ['.py'] },
  { label: 'Java', extensions: ['.java'] },
  { label: 'C/C++', extensions: ['.c', '.cpp', '.h', '.hpp'] },
  { label: 'Go', extensions: ['.go'] },
  { label: 'Rust', extensions: ['.rs'] },
  { label: 'HTML', extensions: ['.html', '.htm'] },
  { label: 'CSS', extensions: ['.css', '.scss', '.sass', '.less'] },
  { label: 'JSON', extensions: ['.json'] },
  { label: 'Markdown', extensions: ['.md', '.mdx'] },
  { label: 'XML', extensions: ['.xml'] },
  { label: 'YAML', extensions: ['.yaml', '.yml'] },
  { label: '图片', extensions: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'] },
  { label: '文档', extensions: ['.pdf', '.doc', '.docx', '.txt'] },
];

// ============================================
// FilterBar 组件
// ============================================
export const FilterBar: React.FC<FilterBarProps> = ({
  onRefresh,
  isRefreshing,
  className
}) => {
  const [showPresets, setShowPresets] = useState(false);
  const [showExtensionFilter, setShowExtensionFilter] = useState(false);
  const [showGlobFilter, setShowGlobFilter] = useState(false);
  const [showRegexFilter, setShowRegexFilter] = useState(false);

  // 本地状态用于临时输入
  const [globInput, setGlobInput] = useState('');
  const [regexInput, setRegexInput] = useState('');
  const [regexFlags, setRegexFlags] = useState('i');
  const [selectedExtensions, setSelectedExtensions] = useState<string[]>([]);

  const {
    searchQuery,
    setSearchQuery,
    clearSearch,
    isRegexSearch,
    toggleRegexSearch,
    caseSensitive,
    toggleCaseSensitive,
    showFiles,
    showDirectories,
    setShowFiles,
    setShowDirectories,
    showEqual,
    showModified,
    showLeftOnly,
    showRightOnly,
    toggleShowEqual,
    toggleShowModified,
    toggleShowLeftOnly,
    toggleShowRightOnly,
    clearFilters,
    applyPreset
  } = useFilterStore();

  // 处理搜索
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, [setSearchQuery]);

  // 处理预设选择
  const handlePresetClick = useCallback((preset: typeof COMMON_FILTER_PRESETS[0]) => {
    applyPreset(preset);
    setShowPresets(false);
  }, [applyPreset]);

  // 是否有过滤器激活
  const hasActiveFilters = searchQuery || !showEqual || !showModified || !showLeftOnly || !showRightOnly;

  return (
    <div
      className={cn(
        'filter-bar',
        'flex flex-wrap items-center gap-3',
        'px-4 py-2.5',
        'bg-gray-50 dark:bg-gray-800/50',
        'border-b border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* 搜索框 */}
      <div className="relative flex-1 min-w-[200px] max-w-[300px]">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>

        <input
          type="text"
          placeholder="搜索文件..."
          value={searchQuery}
          onChange={handleSearchChange}
          className={cn(
            'w-full pl-10 pr-8 py-1.5',
            'bg-white dark:bg-gray-900',
            'border border-gray-300 dark:border-gray-600',
            'rounded-md text-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'placeholder:text-gray-400'
          )}
        />

        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* 搜索选项 */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleRegexSearch}
          className={cn(
            'px-2 py-1.5 text-xs rounded',
            'border transition-colors',
            isRegexSearch
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
          )}
          title="正则表达式"
        >
          .*
        </button>

        <button
          onClick={toggleCaseSensitive}
          className={cn(
            'px-2 py-1.5 text-xs rounded',
            'border transition-colors',
            caseSensitive
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
          )}
          title="区分大小写"
        >
          Aa
        </button>
      </div>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

      {/* 类型过滤 */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setShowFiles(!showFiles)}
          className={cn(
            'px-3 py-1.5 text-xs rounded flex items-center gap-1.5',
            'border transition-colors',
            showFiles
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
          )}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          文件
        </button>

        <button
          onClick={() => setShowDirectories(!showDirectories)}
          className={cn(
            'px-3 py-1.5 text-xs rounded flex items-center gap-1.5',
            'border transition-colors',
            showDirectories
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
          )}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          目录
        </button>
      </div>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

      {/* 状态过滤 */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleShowEqual}
          className={cn(
            'px-2 py-1.5 text-xs rounded',
            'border transition-colors',
            showEqual
              ? 'bg-green-500 text-white border-green-500'
              : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
          )}
        >
          相同
        </button>

        <button
          onClick={toggleShowModified}
          className={cn(
            'px-2 py-1.5 text-xs rounded',
            'border transition-colors',
            showModified
              ? 'bg-yellow-500 text-white border-yellow-500'
              : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
          )}
        >
          修改
        </button>

        <button
          onClick={toggleShowLeftOnly}
          className={cn(
            'px-2 py-1.5 text-xs rounded',
            'border transition-colors',
            showLeftOnly
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
          )}
        >
          仅左侧
        </button>

        <button
          onClick={toggleShowRightOnly}
          className={cn(
            'px-2 py-1.5 text-xs rounded',
            'border transition-colors',
            showRightOnly
              ? 'bg-red-500 text-white border-red-500'
              : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
          )}
        >
          仅右侧
        </button>
      </div>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

      {/* 扩展名过滤 */}
      <div className="relative">
        <button
          onClick={() => setShowExtensionFilter(!showExtensionFilter)}
          className={cn(
            'px-3 py-1.5 text-xs rounded flex items-center gap-1.5',
            'bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600',
            'text-gray-600 dark:text-gray-400',
            'hover:bg-gray-50 transition-colors'
          )}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          扩展名
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: showExtensionFilter ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showExtensionFilter && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowExtensionFilter(false)}
            />
            <div className="absolute top-full left-0 mt-1 w-64 max-h-80 overflow-y-auto bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 py-2"
            >
              <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">选择扩展名</div>
              {COMMON_EXTENSIONS.map((ext) => (
                <label
                  key={ext.label}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 cursor-pointer',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    'transition-colors'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={ext.extensions.every(e => selectedExtensions.includes(e))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedExtensions(prev => [...new Set([...prev, ...ext.extensions])]);
                      } else {
                        setSelectedExtensions(prev => prev.filter(p => !ext.extensions.includes(p)));
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{ext.label}</span>
                  <span className="text-xs text-gray-400 ml-auto">{ext.extensions.join(', ')}</span>
                </label>
              ))}
              {selectedExtensions.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2 px-3">
                  <button
                    onClick={() => {
                      // Add to store filters
                      const filter: ExtensionFilter = {
                        id: generateId(),
                        type: 'extension',
                        enabled: true,
                        invert: false,
                        extensions: selectedExtensions,
                        caseSensitive: false
                      };
                      useFilterStore.getState().addFilter(filter);
                      setShowExtensionFilter(false);
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    应用 ({selectedExtensions.length} 个)
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Glob 过滤 */}
      <div className="relative">
        <button
          onClick={() => setShowGlobFilter(!showGlobFilter)}
          className={cn(
            'px-3 py-1.5 text-xs rounded flex items-center gap-1.5',
            'bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600',
            'text-gray-600 dark:text-gray-400',
            'hover:bg-gray-50 transition-colors'
          )}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
            <path d="M8.5 8.5v.01" />
            <path d="M16 15.5v.01" />
            <path d="M12 12v.01" />
            <path d="M11 17v.01" />
            <path d="M7 14v.01" />
          </svg>
          Glob
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: showGlobFilter ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showGlobFilter && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowGlobFilter(false)}
            />
            <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 p-3"
            >
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Glob 模式</div>
              <input
                type="text"
                placeholder="例如: *.test.ts, node_modules/**"
                value={globInput}
                onChange={(e) => setGlobInput(e.target.value)}
                className={cn(
                  'w-full px-3 py-1.5 text-sm',
                  'bg-white dark:bg-gray-900',
                  'border border-gray-300 dark:border-gray-600',
                  'rounded-md',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500',
                  'placeholder:text-gray-400'
                )}
              />
              <div className="text-xs text-gray-400 mt-1 mb-3">
                支持 * (匹配任意字符) 和 ** (匹配任意目录)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (globInput.trim()) {
                      const filter: GlobFilter = {
                        id: generateId(),
                        type: 'glob',
                        enabled: true,
                        invert: false,
                        patterns: globInput.split(',').map(p => p.trim()).filter(Boolean)
                      };
                      useFilterStore.getState().addFilter(filter);
                      setGlobInput('');
                      setShowGlobFilter(false);
                    }
                  }}
                  disabled={!globInput.trim()}
                  className="flex-1 px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  包含
                </button>
                <button
                  onClick={() => {
                    if (globInput.trim()) {
                      const filter: GlobFilter = {
                        id: generateId(),
                        type: 'glob',
                        enabled: true,
                        invert: true,
                        patterns: globInput.split(',').map(p => p.trim()).filter(Boolean)
                      };
                      useFilterStore.getState().addFilter(filter);
                      setGlobInput('');
                      setShowGlobFilter(false);
                    }
                  }}
                  disabled={!globInput.trim()}
                  className="flex-1 px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  排除
                </button>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 mt-3 pt-2">
                <div className="text-xs text-gray-500 mb-1">快速排除</div>
                <div className="flex flex-wrap gap-1">
                  {['node_modules', '.git', 'dist', 'build', '.idea', '.vscode'].map((dir) => (
                    <button
                      key={dir}
                      onClick={() => {
                        const filter: GlobFilter = {
                          id: generateId(),
                          type: 'glob',
                          enabled: true,
                          invert: true,
                          patterns: [`**/${dir}/**`]
                        };
                        useFilterStore.getState().addFilter(filter);
                        setShowGlobFilter(false);
                      }}
                      className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 正则过滤 */}
      <div className="relative">
        <button
          onClick={() => setShowRegexFilter(!showRegexFilter)}
          className={cn(
            'px-3 py-1.5 text-xs rounded flex items-center gap-1.5',
            'bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600',
            'text-gray-600 dark:text-gray-400',
            'hover:bg-gray-50 transition-colors'
          )}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
            <path d="M8.5 8.5v.01" />
            <path d="M16 15.5v.01" />
            <path d="M12 12v.01" />
            <path d="M11 17v.01" />
            <path d="M7 14v.01" />
          </svg>
          正则
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: showRegexFilter ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showRegexFilter && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowRegexFilter(false)}
            />
            <div className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 p-3"
            >
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">正则表达式</div>
              <input
                type="text"
                placeholder="例如: \\.test\\.(ts|js)$"
                value={regexInput}
                onChange={(e) => setRegexInput(e.target.value)}
                className={cn(
                  'w-full px-3 py-1.5 text-sm font-mono',
                  'bg-white dark:bg-gray-900',
                  'border border-gray-300 dark:border-gray-600',
                  'rounded-md',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500',
                  'placeholder:text-gray-400'
                )}
              />
              <div className="flex items-center gap-2 mt-2 mb-3">
                <span className="text-xs text-gray-500">标志:</span>
                <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regexFlags.includes('i')}
                    onChange={(e) => {
                      setRegexFlags(prev => e.target.checked
                        ? prev + 'i'
                        : prev.replace('i', '')
                      );
                    }}
                    className="rounded"
                  />
                  i (忽略大小写)
                </label>
                <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regexFlags.includes('g')}
                    onChange={(e) => {
                      setRegexFlags(prev => e.target.checked
                        ? prev + 'g'
                        : prev.replace('g', '')
                      );
                    }}
                    className="rounded"
                  />
                  g (全局匹配)
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (regexInput.trim()) {
                      try {
                        new RegExp(regexInput, regexFlags);
                        const filter: RegexFilter = {
                          id: generateId(),
                          type: 'regex',
                          enabled: true,
                          invert: false,
                          pattern: regexInput,
                          flags: regexFlags
                        };
                        useFilterStore.getState().addFilter(filter);
                        setRegexInput('');
                        setShowRegexFilter(false);
                      } catch (e) {
                        // Invalid regex, ignore
                      }
                    }
                  }}
                  disabled={!regexInput.trim()}
                  className="flex-1 px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  包含
                </button>
                <button
                  onClick={() => {
                    if (regexInput.trim()) {
                      try {
                        new RegExp(regexInput, regexFlags);
                        const filter: RegexFilter = {
                          id: generateId(),
                          type: 'regex',
                          enabled: true,
                          invert: true,
                          pattern: regexInput,
                          flags: regexFlags
                        };
                        useFilterStore.getState().addFilter(filter);
                        setRegexInput('');
                        setShowRegexFilter(false);
                      } catch (e) {
                        // Invalid regex, ignore
                      }
                    }
                  }}
                  disabled={!regexInput.trim()}
                  className="flex-1 px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  排除
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

      {/* 预设过滤器 */}
      <div className="relative">
        <button
          onClick={() => setShowPresets(!showPresets)}
          className={cn(
            'px-3 py-1.5 text-xs rounded flex items-center gap-1.5',
            'bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600',
            'text-gray-600 dark:text-gray-400',
            'hover:bg-gray-50 transition-colors'
          )}
        >
          预设
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: showPresets ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showPresets && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowPresets(false)}
            />
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 py-1"
            >
              {COMMON_FILTER_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    'transition-colors'
                  )}
                >
                  <div className="font-medium text-gray-900 dark:text-white">{preset.name}</div>
                  <div className="text-xs text-gray-500">{preset.description}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* 清除过滤器和刷新 */}
      <div className="flex items-center gap-2">
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className={cn(
              'px-3 py-1.5 text-xs rounded flex items-center gap-1.5',
              'text-gray-600 dark:text-gray-400',
              'hover:bg-gray-200 dark:hover:bg-gray-700',
              'transition-colors'
            )}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            清除
          </button>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={cn(
              'px-3 py-1.5 text-xs rounded flex items-center gap-1.5',
              'bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600',
              'text-gray-600 dark:text-gray-400',
              'hover:bg-gray-50 disabled:opacity-50',
              'transition-colors'
            )}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={cn(isRefreshing && 'animate-spin')}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            刷新
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
