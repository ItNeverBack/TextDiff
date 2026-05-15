import { describe, it, expect, beforeEach } from 'vitest'
import {
  useFilterStore,
  createFilterFunction,
  COMMON_FILTER_PRESETS
} from '../filter.store'
import type { DirectoryFilter, ExtensionFilter, GlobFilter, RegexFilter } from '@shared/types/directory.types'

describe('useFilterStore', () => {
  beforeEach(() => {
    // 重置 store 状态
    useFilterStore.setState({
      filters: [],
      searchQuery: '',
      isRegexSearch: false,
      caseSensitive: false,
      showFiles: true,
      showDirectories: true,
      showEqual: true,
      showModified: true,
      showLeftOnly: true,
      showRightOnly: true,
      minSize: undefined,
      maxSize: undefined,
      modifiedAfter: undefined,
      modifiedBefore: undefined
    })
  })

  describe('初始状态', () => {
    it('初始 filters 为空数组', () => {
      expect(useFilterStore.getState().filters).toEqual([])
    })

    it('初始搜索为空', () => {
      expect(useFilterStore.getState().searchQuery).toBe('')
      expect(useFilterStore.getState().isRegexSearch).toBe(false)
    })

    it('初始快速过滤器全部为true', () => {
      const state = useFilterStore.getState()
      expect(state.showFiles).toBe(true)
      expect(state.showDirectories).toBe(true)
      expect(state.showEqual).toBe(true)
      expect(state.showModified).toBe(true)
      expect(state.showLeftOnly).toBe(true)
      expect(state.showRightOnly).toBe(true)
    })
  })

  describe('addFilter', () => {
    it('添加过滤器', () => {
      const newFilter: Omit<DirectoryFilter, 'id'> = {
        type: 'extension',
        enabled: true,
        invert: false,
        extensions: ['.js', '.ts']
      } as Omit<ExtensionFilter, 'id'>

      useFilterStore.getState().addFilter(newFilter)

      expect(useFilterStore.getState().filters).toHaveLength(1)
      expect(useFilterStore.getState().filters[0].type).toBe('extension')
      expect(useFilterStore.getState().filters[0].id).toBeDefined()
    })

    it('添加多个过滤器', () => {
      useFilterStore.getState().addFilter({
        type: 'extension',
        enabled: true,
        invert: false,
        extensions: ['.js']
      } as Omit<ExtensionFilter, 'id'>)

      useFilterStore.getState().addFilter({
        type: 'glob',
        enabled: true,
        invert: false,
        patterns: ['**/*.test.js']
      } as Omit<GlobFilter, 'id'>)

      expect(useFilterStore.getState().filters).toHaveLength(2)
    })
  })

  describe('updateFilter', () => {
    it('更新过滤器属性', () => {
      useFilterStore.getState().addFilter({
        type: 'extension',
        enabled: true,
        invert: false,
        extensions: ['.js']
      } as Omit<ExtensionFilter, 'id'>)

      const filter = useFilterStore.getState().filters[0]
      useFilterStore.getState().updateFilter(filter.id, { enabled: false })

      expect(useFilterStore.getState().filters[0].enabled).toBe(false)
    })

    it('更新不存在的过滤器不报错', () => {
      useFilterStore.getState().addFilter({
        type: 'extension',
        enabled: true,
        invert: false,
        extensions: ['.js']
      } as Omit<ExtensionFilter, 'id'>)

      useFilterStore.getState().updateFilter('non-existent', { enabled: false })

      expect(useFilterStore.getState().filters[0].enabled).toBe(true)
    })
  })

  describe('removeFilter', () => {
    it('移除过滤器', () => {
      useFilterStore.getState().addFilter({
        type: 'extension',
        enabled: true,
        invert: false,
        extensions: ['.js']
      } as Omit<ExtensionFilter, 'id'>)

      const filterId = useFilterStore.getState().filters[0].id
      useFilterStore.getState().removeFilter(filterId)

      expect(useFilterStore.getState().filters).toHaveLength(0)
    })

    it('移除不存在的过滤器不报错', () => {
      useFilterStore.getState().addFilter({
        type: 'extension',
        enabled: true,
        invert: false,
        extensions: ['.js']
      } as Omit<ExtensionFilter, 'id'>)

      useFilterStore.getState().removeFilter('non-existent')

      expect(useFilterStore.getState().filters).toHaveLength(1)
    })
  })

  describe('toggleFilter', () => {
    it('切换过滤器启用状态', () => {
      useFilterStore.getState().addFilter({
        type: 'extension',
        enabled: true,
        invert: false,
        extensions: ['.js']
      } as Omit<ExtensionFilter, 'id'>)

      const filterId = useFilterStore.getState().filters[0].id

      useFilterStore.getState().toggleFilter(filterId)
      expect(useFilterStore.getState().filters[0].enabled).toBe(false)

      useFilterStore.getState().toggleFilter(filterId)
      expect(useFilterStore.getState().filters[0].enabled).toBe(true)
    })
  })

  describe('clearFilters', () => {
    it('清空所有过滤器', () => {
      useFilterStore.getState().addFilter({
        type: 'extension',
        enabled: true,
        invert: false,
        extensions: ['.js']
      } as Omit<ExtensionFilter, 'id'>)

      useFilterStore.getState().setSearchQuery('test')
      useFilterStore.getState().setSizeRange(100, 1000)

      useFilterStore.getState().clearFilters()

      expect(useFilterStore.getState().filters).toHaveLength(0)
      expect(useFilterStore.getState().searchQuery).toBe('')
      expect(useFilterStore.getState().minSize).toBeUndefined()
      expect(useFilterStore.getState().maxSize).toBeUndefined()
    })
  })

  describe('addExtensionFilter', () => {
    it('添加扩展名过滤器', () => {
      useFilterStore.getState().addExtensionFilter(['.js', '.ts'])

      const filter = useFilterStore.getState().filters[0] as ExtensionFilter
      expect(filter.type).toBe('extension')
      expect(filter.extensions).toContain('.js')
      expect(filter.extensions).toContain('.ts')
    })

    it('合并现有扩展名过滤器', () => {
      useFilterStore.getState().addExtensionFilter(['.js'])
      useFilterStore.getState().addExtensionFilter(['.ts'])

      expect(useFilterStore.getState().filters).toHaveLength(1)
      const filter = useFilterStore.getState().filters[0] as ExtensionFilter
      expect(filter.extensions).toContain('.js')
      expect(filter.extensions).toContain('.ts')
    })

    it('去重扩展名', () => {
      useFilterStore.getState().addExtensionFilter(['.js'])
      useFilterStore.getState().addExtensionFilter(['.js', '.ts'])

      const filter = useFilterStore.getState().filters[0] as ExtensionFilter
      expect(filter.extensions).toHaveLength(2)
    })
  })

  describe('removeExtensionFilter', () => {
    it('移除指定扩展名', () => {
      useFilterStore.getState().addExtensionFilter(['.js', '.ts', '.vue'])
      useFilterStore.getState().removeExtensionFilter(['.ts'])

      const filter = useFilterStore.getState().filters[0] as ExtensionFilter
      expect(filter.extensions).not.toContain('.ts')
      expect(filter.extensions).toContain('.js')
      expect(filter.extensions).toContain('.vue')
    })

    it('移除所有扩展名后删除过滤器', () => {
      useFilterStore.getState().addExtensionFilter(['.js'])
      useFilterStore.getState().removeExtensionFilter(['.js'])

      expect(useFilterStore.getState().filters).toHaveLength(0)
    })
  })

  describe('addGlobFilter', () => {
    it('添加 glob 过滤器', () => {
      useFilterStore.getState().addGlobFilter(['**/*.test.js', '**/node_modules/**'])

      const filter = useFilterStore.getState().filters[0] as GlobFilter
      expect(filter.type).toBe('glob')
      expect(filter.patterns).toContain('**/*.test.js')
      expect(filter.invert).toBe(true)
    })
  })

  describe('搜索操作', () => {
    it('setSearchQuery 设置搜索关键词', () => {
      useFilterStore.getState().setSearchQuery('test')
      expect(useFilterStore.getState().searchQuery).toBe('test')
    })

    it('toggleRegexSearch 切换正则搜索', () => {
      expect(useFilterStore.getState().isRegexSearch).toBe(false)

      useFilterStore.getState().toggleRegexSearch()
      expect(useFilterStore.getState().isRegexSearch).toBe(true)

      useFilterStore.getState().toggleRegexSearch()
      expect(useFilterStore.getState().isRegexSearch).toBe(false)
    })

    it('toggleCaseSensitive 切换大小写敏感', () => {
      expect(useFilterStore.getState().caseSensitive).toBe(false)

      useFilterStore.getState().toggleCaseSensitive()
      expect(useFilterStore.getState().caseSensitive).toBe(true)
    })

    it('clearSearch 清空搜索', () => {
      useFilterStore.getState().setSearchQuery('test')
      useFilterStore.getState().toggleRegexSearch()

      useFilterStore.getState().clearSearch()

      expect(useFilterStore.getState().searchQuery).toBe('')
    })
  })

  describe('快速过滤器', () => {
    it('toggleShowEqual 切换显示相同文件', () => {
      expect(useFilterStore.getState().showEqual).toBe(true)
      useFilterStore.getState().toggleShowEqual()
      expect(useFilterStore.getState().showEqual).toBe(false)
    })

    it('toggleShowModified 切换显示修改文件', () => {
      expect(useFilterStore.getState().showModified).toBe(true)
      useFilterStore.getState().toggleShowModified()
      expect(useFilterStore.getState().showModified).toBe(false)
    })

    it('toggleShowLeftOnly 切换显示左独有文件', () => {
      expect(useFilterStore.getState().showLeftOnly).toBe(true)
      useFilterStore.getState().toggleShowLeftOnly()
      expect(useFilterStore.getState().showLeftOnly).toBe(false)
    })

    it('toggleShowRightOnly 切换显示右独有文件', () => {
      expect(useFilterStore.getState().showRightOnly).toBe(true)
      useFilterStore.getState().toggleShowRightOnly()
      expect(useFilterStore.getState().showRightOnly).toBe(false)
    })

    it('setShowFiles 设置显示文件', () => {
      useFilterStore.getState().setShowFiles(false)
      expect(useFilterStore.getState().showFiles).toBe(false)
    })

    it('setShowDirectories 设置显示目录', () => {
      useFilterStore.getState().setShowDirectories(false)
      expect(useFilterStore.getState().showDirectories).toBe(false)
    })
  })

  describe('大小过滤', () => {
    it('setSizeRange 设置大小范围', () => {
      useFilterStore.getState().setSizeRange(100, 1000)

      expect(useFilterStore.getState().minSize).toBe(100)
      expect(useFilterStore.getState().maxSize).toBe(1000)
    })

    it('只设置最小大小', () => {
      useFilterStore.getState().setSizeRange(100, undefined)

      expect(useFilterStore.getState().minSize).toBe(100)
      expect(useFilterStore.getState().maxSize).toBeUndefined()
    })

    it('只设置最大大小', () => {
      useFilterStore.getState().setSizeRange(undefined, 1000)

      expect(useFilterStore.getState().minSize).toBeUndefined()
      expect(useFilterStore.getState().maxSize).toBe(1000)
    })

    it('clearSizeFilter 清除大小过滤', () => {
      useFilterStore.getState().setSizeRange(100, 1000)
      useFilterStore.getState().clearSizeFilter()

      expect(useFilterStore.getState().minSize).toBeUndefined()
      expect(useFilterStore.getState().maxSize).toBeUndefined()
    })
  })

  describe('日期过滤', () => {
    it('setDateRange 设置日期范围', () => {
      const after = new Date('2024-01-01')
      const before = new Date('2024-12-31')

      useFilterStore.getState().setDateRange(after, before)

      expect(useFilterStore.getState().modifiedAfter).toEqual(after)
      expect(useFilterStore.getState().modifiedBefore).toEqual(before)
    })

    it('clearDateFilter 清除日期过滤', () => {
      useFilterStore.getState().setDateRange(new Date('2024-01-01'), new Date('2024-12-31'))
      useFilterStore.getState().clearDateFilter()

      expect(useFilterStore.getState().modifiedAfter).toBeUndefined()
      expect(useFilterStore.getState().modifiedBefore).toBeUndefined()
    })
  })

  describe('applyPreset', () => {
    it('应用预设过滤器', () => {
      const preset = COMMON_FILTER_PRESETS[0] // 源代码文件

      useFilterStore.getState().applyPreset(preset)

      expect(useFilterStore.getState().filters).toHaveLength(1)
      expect(useFilterStore.getState().filters[0].type).toBe('extension')
    })

    it('预设覆盖现有过滤器', () => {
      useFilterStore.getState().addExtensionFilter(['.txt'])

      const preset = COMMON_FILTER_PRESETS[0]
      useFilterStore.getState().applyPreset(preset)

      expect(useFilterStore.getState().filters).toHaveLength(1)
      const filter = useFilterStore.getState().filters[0] as ExtensionFilter
      expect(filter.extensions).not.toContain('.txt')
    })
  })
})

describe('createFilterFunction', () => {
  it('类型过滤 - 不显示文件', () => {
    const filterFn = createFilterFunction({
      showFiles: false,
      showDirectories: true,
      showEqual: true,
      showModified: true,
      showLeftOnly: true,
      showRightOnly: true,
      filters: [],
      searchQuery: '',
      isRegexSearch: false,
      caseSensitive: false
    } as any)

    expect(filterFn({ name: 'test.txt', type: 'file', status: 'equal', relativePath: 'test.txt' })).toBe(false)
    expect(filterFn({ name: 'src', type: 'directory', status: 'equal', relativePath: 'src' })).toBe(true)
  })

  it('类型过滤 - 不显示目录', () => {
    const filterFn = createFilterFunction({
      showFiles: true,
      showDirectories: false,
      showEqual: true,
      showModified: true,
      showLeftOnly: true,
      showRightOnly: true,
      filters: [],
      searchQuery: '',
      isRegexSearch: false,
      caseSensitive: false
    } as any)

    expect(filterFn({ name: 'test.txt', type: 'file', status: 'equal', relativePath: 'test.txt' })).toBe(true)
    expect(filterFn({ name: 'src', type: 'directory', status: 'equal', relativePath: 'src' })).toBe(false)
  })

  it('状态过滤 - 不显示相同', () => {
    const filterFn = createFilterFunction({
      showFiles: true,
      showDirectories: true,
      showEqual: false,
      showModified: true,
      showLeftOnly: true,
      showRightOnly: true,
      filters: [],
      searchQuery: '',
      isRegexSearch: false,
      caseSensitive: false
    } as any)

    expect(filterFn({ name: 'same.txt', type: 'file', status: 'equal', relativePath: 'same.txt' })).toBe(false)
    expect(filterFn({ name: 'diff.txt', type: 'file', status: 'modified', relativePath: 'diff.txt' })).toBe(true)
  })

  it('状态过滤 - 不显示修改', () => {
    const filterFn = createFilterFunction({
      showFiles: true,
      showDirectories: true,
      showEqual: true,
      showModified: false,
      showLeftOnly: true,
      showRightOnly: true,
      filters: [],
      searchQuery: '',
      isRegexSearch: false,
      caseSensitive: false
    } as any)

    expect(filterFn({ name: 'same.txt', type: 'file', status: 'equal', relativePath: 'same.txt' })).toBe(true)
    expect(filterFn({ name: 'diff.txt', type: 'file', status: 'modified', relativePath: 'diff.txt' })).toBe(false)
  })

  it('文本搜索', () => {
    const filterFn = createFilterFunction({
      showFiles: true,
      showDirectories: true,
      showEqual: true,
      showModified: true,
      showLeftOnly: true,
      showRightOnly: true,
      filters: [],
      searchQuery: 'test',
      isRegexSearch: false,
      caseSensitive: false
    } as any)

    expect(filterFn({ name: 'test.txt', type: 'file', status: 'equal', relativePath: 'test.txt' })).toBe(true)
    expect(filterFn({ name: 'other.txt', type: 'file', status: 'equal', relativePath: 'other.txt' })).toBe(false)
  })

  it('正则搜索', () => {
    const filterFn = createFilterFunction({
      showFiles: true,
      showDirectories: true,
      showEqual: true,
      showModified: true,
      showLeftOnly: true,
      showRightOnly: true,
      filters: [],
      searchQuery: '^test\\.',
      isRegexSearch: true,
      caseSensitive: false
    } as any)

    expect(filterFn({ name: 'test.js', type: 'file', status: 'equal', relativePath: 'test.js' })).toBe(true)
    expect(filterFn({ name: 'my-test.js', type: 'file', status: 'equal', relativePath: 'my-test.js' })).toBe(false)
  })

  it('无效正回落到文本搜索', () => {
    const filterFn = createFilterFunction({
      showFiles: true,
      showDirectories: true,
      showEqual: true,
      showModified: true,
      showLeftOnly: true,
      showRightOnly: true,
      filters: [],
      searchQuery: '[invalid',
      isRegexSearch: true,
      caseSensitive: false
    } as any)

    // 应该回落到普通文本搜索
    expect(filterFn({ name: '[invalid', type: 'file', status: 'equal', relativePath: '[invalid' })).toBe(true)
  })

  it('大小写敏感搜索', () => {
    const filterFn = createFilterFunction({
      showFiles: true,
      showDirectories: true,
      showEqual: true,
      showModified: true,
      showLeftOnly: true,
      showRightOnly: true,
      filters: [],
      searchQuery: 'TEST',
      isRegexSearch: false,
      caseSensitive: true
    } as any)

    expect(filterFn({ name: 'TEST.txt', type: 'file', status: 'equal', relativePath: 'TEST.txt' })).toBe(true)
    expect(filterFn({ name: 'test.txt', type: 'file', status: 'equal', relativePath: 'test.txt' })).toBe(false)
  })

  it('扩展名过滤', () => {
    const filterFn = createFilterFunction({
      showFiles: true,
      showDirectories: true,
      showEqual: true,
      showModified: true,
      showLeftOnly: true,
      showRightOnly: true,
      filters: [{
        id: '1',
        type: 'extension',
        enabled: true,
        invert: false,
        extensions: ['.js', '.ts'],
        caseSensitive: false
      } as ExtensionFilter],
      searchQuery: '',
      isRegexSearch: false,
      caseSensitive: false
    } as any)

    expect(filterFn({ name: 'file.js', type: 'file', status: 'equal', relativePath: 'file.js' })).toBe(true)
    expect(filterFn({ name: 'file.txt', type: 'file', status: 'equal', relativePath: 'file.txt' })).toBe(false)
  })

  it('glob 过滤', () => {
    const filterFn = createFilterFunction({
      showFiles: true,
      showDirectories: true,
      showEqual: true,
      showModified: true,
      showLeftOnly: true,
      showRightOnly: true,
      filters: [{
        id: '1',
        type: 'glob',
        enabled: true,
        invert: true,
        patterns: ['**/node_modules/**']
      } as GlobFilter],
      searchQuery: '',
      isRegexSearch: false
    } as any)

    expect(filterFn({ name: 'file.js', type: 'file', status: 'equal', relativePath: 'src/file.js' })).toBe(true)
    expect(filterFn({ name: 'file.js', type: 'file', status: 'equal', relativePath: 'node_modules/pkg/file.js' })).toBe(false)
  })

  it('大小过滤', () => {
    const filterFn = createFilterFunction({
      showFiles: true,
      showDirectories: true,
      showEqual: true,
      showModified: true,
      showLeftOnly: true,
      showRightOnly: true,
      filters: [],
      searchQuery: '',
      isRegexSearch: false,
      caseSensitive: false,
      minSize: 1000
    } as any)

    expect(filterFn({
      name: 'small.txt',
      type: 'file',
      status: 'equal',
      relativePath: 'small.txt',
      leftMetadata: { size: 500 }
    })).toBe(false)

    expect(filterFn({
      name: 'large.txt',
      type: 'file',
      status: 'equal',
      relativePath: 'large.txt',
      leftMetadata: { size: 2000 }
    })).toBe(true)
  })

  it('日期过滤', () => {
    const filterFn = createFilterFunction({
      showFiles: true,
      showDirectories: true,
      showEqual: true,
      showModified: true,
      showLeftOnly: true,
      showRightOnly: true,
      filters: [],
      searchQuery: '',
      isRegexSearch: false,
      caseSensitive: false,
      modifiedAfter: new Date('2024-06-01')
    } as any)

    expect(filterFn({
      name: 'old.txt',
      type: 'file',
      status: 'equal',
      relativePath: 'old.txt',
      leftMetadata: { modifiedTime: new Date('2024-01-01') }
    })).toBe(false)

    expect(filterFn({
      name: 'new.txt',
      type: 'file',
      status: 'equal',
      relativePath: 'new.txt',
      leftMetadata: { modifiedTime: new Date('2024-08-01') }
    })).toBe(true)
  })
})

describe('COMMON_FILTER_PRESETS', () => {
  it('源代码文件预设', () => {
    const preset = COMMON_FILTER_PRESETS.find(p => p.name === '源代码文件')
    expect(preset).toBeDefined()
    expect(preset!.filters[0].type).toBe('extension')
    expect((preset!.filters[0] as ExtensionFilter).extensions).toContain('.ts')
    expect((preset!.filters[0] as ExtensionFilter).extensions).toContain('.js')
  })

  it('排除Node模块预设', () => {
    const preset = COMMON_FILTER_PRESETS.find(p => p.name === '排除Node模块')
    expect(preset).toBeDefined()
    expect(preset!.filters[0].type).toBe('glob')
    expect((preset!.filters[0] as GlobFilter).patterns).toContain('**/node_modules/**')
  })

  it('只显示差异预设', () => {
    const preset = COMMON_FILTER_PRESETS.find(p => p.name === '只显示差异')
    expect(preset).toBeDefined()
    expect(preset!.filters).toHaveLength(0)
  })

  it('大文件预设', () => {
    const preset = COMMON_FILTER_PRESETS.find(p => p.name === '大文件')
    expect(preset).toBeDefined()
    expect(preset!.filters[0].type).toBe('size')
    expect((preset!.filters[0] as any).minSize).toBe(1024 * 1024)
  })
})
