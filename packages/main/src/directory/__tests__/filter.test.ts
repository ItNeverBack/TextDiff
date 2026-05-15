import { describe, it, expect } from 'vitest'
import {
  applyFilters,
  matchGlob,
  shouldExcludePath,
  createDefaultFilters,
  createExtensionFilter,
  createGlobFilter,
  createRegexFilter,
  validateFilter,
  mergeFilters
} from '../filter'
import type {
  DirectoryDiffEntry,
  ExtensionFilter,
  GlobFilter,
  RegexFilter,
  SizeFilter,
  DateFilter
} from '@shared/types'

describe('applyFilters', () => {
  const createMockEntry = (
    name: string,
    relativePath: string,
    type: 'file' | 'directory' = 'file',
    status: string = 'equal',
    size: number = 100
  ): DirectoryDiffEntry => ({
    id: 'test-id',
    relativePath,
    name,
    type,
    status,
    depth: 0,
    leftPath: `/left/${relativePath}`,
    rightPath: `/right/${relativePath}`,
    leftMetadata: { size, modifiedTime: new Date('2024-01-15') },
    rightMetadata: { size, modifiedTime: new Date('2024-01-15') }
  })

  it('空过滤器返回全部条目', () => {
    const entries = [
      createMockEntry('file1.txt', 'file1.txt'),
      createMockEntry('file2.js', 'file2.js')
    ]
    const result = applyFilters(entries, [])
    expect(result).toHaveLength(2)
  })

  it('禁用过滤器返回全部条目', () => {
    const entries = [createMockEntry('file.txt', 'file.txt')]
    const filters: GlobFilter[] = [{
      id: 'test',
      type: 'glob',
      enabled: false,
      invert: false,
      patterns: ['*.txt']
    }]
    const result = applyFilters(entries, filters)
    expect(result).toHaveLength(1)
  })

  describe('扩展名过滤器', () => {
    it('只保留指定扩展名的文件', () => {
      const entries = [
        createMockEntry('file1.js', 'file1.js'),
        createMockEntry('file2.txt', 'file2.txt'),
        createMockEntry('file3.js', 'file3.js')
      ]
      const filter = createExtensionFilter(['.js'])
      const result = applyFilters(entries, [filter])
      expect(result).toHaveLength(2)
      expect(result.every(e => e.name.endsWith('.js'))).toBe(true)
    })

    it('支持多个扩展名', () => {
      const entries = [
        createMockEntry('file1.js', 'file1.js'),
        createMockEntry('file2.txt', 'file2.txt'),
        createMockEntry('file3.css', 'file3.css')
      ]
      const filter = createExtensionFilter(['.js', '.css'])
      const result = applyFilters(entries, [filter])
      expect(result).toHaveLength(2)
    })

    it('目录不检查扩展名', () => {
      const entries = [
        createMockEntry('src', 'src', 'directory'),
        createMockEntry('file.js', 'file.js')
      ]
      const filter = createExtensionFilter(['.js'])
      const result = applyFilters(entries, [filter])
      expect(result).toHaveLength(2)
    })

    it('大小写敏感匹配', () => {
      const entries = [
        createMockEntry('file.JS', 'file.JS'),
        createMockEntry('file.js', 'file.js')
      ]
      const filter: ExtensionFilter = {
        id: 'test',
        type: 'extension',
        enabled: true,
        invert: false,
        extensions: ['.js'],
        caseSensitive: true
      }
      const result = applyFilters(entries, [filter])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('file.js')
    })

    it('反转匹配(invert)', () => {
      const entries = [
        createMockEntry('file.js', 'file.js'),
        createMockEntry('file.txt', 'file.txt')
      ]
      const filter: ExtensionFilter = {
        id: 'test',
        type: 'extension',
        enabled: true,
        invert: true,
        extensions: ['.js'],
        caseSensitive: false
      }
      const result = applyFilters(entries, [filter])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('file.txt')
    })
  })

  describe('Glob过滤器', () => {
    it('简单glob匹配 *.js', () => {
      const entries = [
        createMockEntry('src/file.js', 'src/file.js'),
        createMockEntry('src/file.txt', 'src/file.txt')
      ]
      const filter = createGlobFilter(['*.js'])
      const result = applyFilters(entries, [filter])
      expect(result).toHaveLength(1)
    })

    it('双星 ** 匹配多级目录', () => {
      const entries = [
        createMockEntry('file.js', 'src/components/file.js'),
        createMockEntry('file.txt', 'src/components/file.txt')
      ]
      const filter = createGlobFilter(['**/*.js'])
      const result = applyFilters(entries, [filter])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('file.js')
    })

    it('匹配路径部分', () => {
      const entries = [
        createMockEntry('file.js', 'node_modules/pkg/file.js'),
        createMockEntry('file.js', 'src/file.js')
      ]
      const filter = createGlobFilter(['**/node_modules/**'])
      const result = applyFilters(entries, [filter])
      expect(result).toHaveLength(1)
      expect(result[0].relativePath).toBe('node_modules/pkg/file.js')
    })

    it('反转glob匹配', () => {
      const entries = [
        createMockEntry('test.js', 'test.js'),
        createMockEntry('main.js', 'main.js')
      ]
      const filter: GlobFilter = {
        id: 'test',
        type: 'glob',
        enabled: true,
        invert: true,
        patterns: ['test*']
      }
      const result = applyFilters(entries, [filter])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('main.js')
    })
  })

  describe('正则过滤器', () => {
    it('正则匹配文件名', () => {
      const entries = [
        createMockEntry('file_2024.txt', 'file_2024.txt'),
        createMockEntry('data.json', 'data.json')
      ]
      const filter = createRegexFilter('file_\\d+\\.txt', '')
      const result = applyFilters(entries, [filter])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('file_2024.txt')
    })

    it('正则匹配完整路径', () => {
      const entries = [
        createMockEntry('file.js', 'src/components/file.js'),
        createMockEntry('file.js', 'lib/file.js')
      ]
      const filter = createRegexFilter('src/.*\\.js$', '')
      const result = applyFilters(entries, [filter])
      expect(result).toHaveLength(1)
      expect(result[0].relativePath).toBe('src/components/file.js')
    })

    it('大小写不敏感匹配(i标志)', () => {
      const entries = [
        createMockEntry('FILE.txt', 'FILE.txt'),
        createMockEntry('file.txt', 'file.txt')
      ]
      const filter = createRegexFilter('\\.TXT$', 'i')
      const result = applyFilters(entries, [filter])
      expect(result).toHaveLength(2)
    })

    it('反转正则匹配', () => {
      const entries = [
        createMockEntry('test.js', 'test.js'),
        createMockEntry('main.js', 'main.js')
      ]
      const filter: RegexFilter = {
        id: 'test',
        type: 'regex',
        enabled: true,
        invert: true,
        pattern: '^test',
        flags: ''
      }
      const result = applyFilters(entries, [filter])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('main.js')
    })
  })

  describe('大小过滤器', () => {
    it('按最小大小过滤', () => {
      const entries = [
        createMockEntry('small.txt', 'small.txt', 'file', 'equal', 100),
        createMockEntry('large.txt', 'large.txt', 'file', 'equal', 10000)
      ]
      const filter: SizeFilter = {
        id: 'test',
        type: 'size',
        enabled: true,
        invert: false,
        minSize: 1000
      }
      const result = applyFilters(entries, [filter])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('large.txt')
    })

    it('按最大大小过滤', () => {
      const entries = [
        createMockEntry('small.txt', 'small.txt', 'file', 'equal', 100),
        createMockEntry('large.txt', 'large.txt', 'file', 'equal', 10000)
      ]
      const filter: SizeFilter = {
        id: 'test',
        type: 'size',
        enabled: true,
        invert: false,
        maxSize: 1000
      }
      const result = applyFilters(entries, [filter])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('small.txt')
    })

    it('按大小范围过滤', () => {
      const entries = [
        createMockEntry('tiny.txt', 'tiny.txt', 'file', 'equal', 100),
        createMockEntry('medium.txt', 'medium.txt', 'file', 'equal', 5000),
        createMockEntry('huge.txt', 'huge.txt', 'file', 'equal', 100000)
      ]
      const filter: SizeFilter = {
        id: 'test',
        type: 'size',
        enabled: true,
        invert: false,
        minSize: 1000,
        maxSize: 10000
      }
      const result = applyFilters(entries, [filter])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('medium.txt')
    })
  })

  describe('日期过滤器', () => {
    it('按修改日期之后过滤', () => {
      const entries = [
        createMockEntry('old.txt', 'old.txt', 'file', 'equal', 100),
        createMockEntry('new.txt', 'new.txt', 'file', 'equal', 100)
      ]
      entries[0].leftMetadata = { size: 100, modifiedTime: new Date('2024-01-01') }
      entries[1].leftMetadata = { size: 100, modifiedTime: new Date('2024-06-01') }

      const filter: DateFilter = {
        id: 'test',
        type: 'date',
        enabled: true,
        invert: false,
        modifiedAfter: '2024-03-01'
      }
      const result = applyFilters(entries, [filter])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('new.txt')
    })

    it('按修改日期之前过滤', () => {
      const entries = [
        createMockEntry('old.txt', 'old.txt', 'file', 'equal', 100),
        createMockEntry('new.txt', 'new.txt', 'file', 'equal', 100)
      ]
      entries[0].leftMetadata = { size: 100, modifiedTime: new Date('2024-01-01') }
      entries[1].leftMetadata = { size: 100, modifiedTime: new Date('2024-06-01') }

      const filter: DateFilter = {
        id: 'test',
        type: 'date',
        enabled: true,
        invert: false,
        modifiedBefore: '2024-03-01'
      }
      const result = applyFilters(entries, [filter])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('old.txt')
    })
  })

  describe('组合过滤器', () => {
    it('多个过滤器按AND逻辑组合', () => {
      const entries = [
        createMockEntry('file.js', 'src/file.js'),
        createMockEntry('file.txt', 'src/file.txt'),
        createMockEntry('file.js', 'lib/file.js')
      ]
      const filters = [
        createExtensionFilter(['.js']),
        createGlobFilter(['src/**'])
      ]
      const result = applyFilters(entries, filters)
      expect(result).toHaveLength(1)
      expect(result[0].relativePath).toBe('src/file.js')
    })

    it('递归过滤子目录', () => {
      const entries: DirectoryDiffEntry[] = [
        {
          id: '1',
          relativePath: 'src',
          name: 'src',
          type: 'directory',
          status: 'equal',
          depth: 0,
          children: [
            createMockEntry('file.js', 'src/file.js'),
            createMockEntry('file.txt', 'src/file.txt')
          ]
        }
      ]
      const filter = createExtensionFilter(['.js'])
      const result = applyFilters(entries, [filter])
      expect(result).toHaveLength(1)
      expect(result[0].children).toHaveLength(1)
      expect(result[0].children![0].name).toBe('file.js')
    })

    it('空子目录被排除', () => {
      const entries: DirectoryDiffEntry[] = [
        {
          id: '1',
          relativePath: 'src',
          name: 'src',
          type: 'directory',
          status: 'equal',
          depth: 0,
          children: [
            createMockEntry('file.txt', 'src/file.txt')
          ]
        }
      ]
      const filter = createExtensionFilter(['.js'])
      const result = applyFilters(entries, [filter])
      expect(result).toHaveLength(0)
    })
  })
})

describe('matchGlob', () => {
  it('精确匹配', () => {
    expect(matchGlob('file.txt', 'file.txt')).toBe(true)
    expect(matchGlob('file.txt', 'other.txt')).toBe(false)
  })

  it('* 匹配任意字符', () => {
    expect(matchGlob('file.txt', '*.txt')).toBe(true)
    expect(matchGlob('data.js', '*.txt')).toBe(false)
    expect(matchGlob('src/file.js', 'src/*.js')).toBe(true)
    expect(matchGlob('src/components/file.js', 'src/*.js')).toBe(false)
  })

  it('? 匹配单个字符', () => {
    expect(matchGlob('file1.txt', 'file?.txt')).toBe(true)
    expect(matchGlob('file12.txt', 'file?.txt')).toBe(false)
    expect(matchGlob('fileA.txt', 'file?.txt')).toBe(true)
  })

  it('** 匹配任意层级', () => {
    expect(matchGlob('file.js', '**')).toBe(true)
    expect(matchGlob('src/file.js', '**/*.js')).toBe(true)
    expect(matchGlob('src/components/file.js', '**/*.js')).toBe(true)
    expect(matchGlob('deep/nested/path/file.js', '**/*.js')).toBe(true)
  })

  it('**/prefix 匹配任意层级的后缀', () => {
    expect(matchGlob('test.js', '**/test.js')).toBe(true)
    expect(matchGlob('src/test.js', '**/test.js')).toBe(true)
    expect(matchGlob('src/components/test.js', '**/test.js')).toBe(true)
    expect(matchGlob('other.js', '**/test.js')).toBe(true)
  })

  it('prefix/** 匹配前缀目录下的所有内容', () => {
    expect(matchGlob('src/file.js', 'src/**')).toBe(true)
    expect(matchGlob('src/components/file.js', 'src/**')).toBe(true)
    expect(matchGlob('lib/file.js', 'src/**')).toBe(false)
  })

  it('方括号 [] 匹配字符集', () => {
    expect(matchGlob('file1.txt', 'file[0-9].txt')).toBe(true)
    expect(matchGlob('fileA.txt', 'file[0-9].txt')).toBe(false)
  })

  it('大小写不敏感', () => {
    expect(matchGlob('FILE.TXT', '*.txt')).toBe(true)
    expect(matchGlob('File.Js', '*.js')).toBe(true)
  })

  it('转义特殊字符', () => {
    expect(matchGlob('file.test.js', '*.test.js')).toBe(true)
    expect(matchGlob('file.js', '*.test.js')).toBe(false)
  })
})

describe('shouldExcludePath', () => {
  it('匹配名称时排除', () => {
    expect(shouldExcludePath('node_modules/pkg/file.js', 'node_modules', ['node_modules'])).toBe(true)
    expect(shouldExcludePath('src/file.js', 'file.js', ['node_modules'])).toBe(false)
  })

  it('匹配完整路径时排除', () => {
    expect(shouldExcludePath('dist/bundle.js', 'bundle.js', ['dist/*'])).toBe(true)
    expect(shouldExcludePath('src/file.js', 'file.js', ['dist/*'])).toBe(false)
  })

  it('匹配路径任何部分时排除', () => {
    expect(shouldExcludePath('src/__pycache__/file.js', 'file.js', ['__pycache__'])).toBe(true)
    expect(shouldExcludePath('src/components/file.js', 'file.js', ['__pycache__'])).toBe(false)
  })

  it('多个排除模式', () => {
    const patterns = ['node_modules', '.git', '*.log']
    expect(shouldExcludePath('node_modules/pkg/file.js', 'node_modules', patterns)).toBe(true)
    expect(shouldExcludePath('.git/config', 'config', patterns)).toBe(true)
    expect(shouldExcludePath('debug.log', 'debug.log', patterns)).toBe(true)
    expect(shouldExcludePath('src/file.js', 'file.js', patterns)).toBe(false)
  })
})

describe('createDefaultFilters', () => {
  it('创建默认过滤器列表', () => {
    const filters = createDefaultFilters()
    expect(filters).toHaveLength(1)
    expect(filters[0].type).toBe('glob')
    expect((filters[0] as GlobFilter).patterns.length).toBeGreaterThan(0)
    expect(filters[0].enabled).toBe(true)
  })
})

describe('createExtensionFilter', () => {
  it('创建扩展名过滤器', () => {
    const filter = createExtensionFilter(['.js', '.ts'])
    expect(filter.type).toBe('extension')
    expect(filter.extensions).toEqual(['.js', '.ts'])
    expect(filter.enabled).toBe(true)
    expect(filter.caseSensitive).toBe(false)
  })

  it('支持大小写敏感', () => {
    const filter = createExtensionFilter(['.JS'], true)
    expect(filter.caseSensitive).toBe(true)
  })
})

describe('createGlobFilter', () => {
  it('创建glob过滤器', () => {
    const filter = createGlobFilter(['**/*.js', 'dist/**'])
    expect(filter.type).toBe('glob')
    expect(filter.patterns).toEqual(['**/*.js', 'dist/**'])
    expect(filter.enabled).toBe(true)
    expect(filter.invert).toBe(false)
  })

  it('支持反转匹配', () => {
    const filter = createGlobFilter(['src/**'], true)
    expect(filter.invert).toBe(true)
  })
})

describe('createRegexFilter', () => {
  it('创建正则过滤器', () => {
    const filter = createRegexFilter('\\.test\\.js$', 'i')
    expect(filter.type).toBe('regex')
    expect(filter.pattern).toBe('\\.test\\.js$')
    expect(filter.flags).toBe('i')
    expect(filter.enabled).toBe(true)
  })

  it('默认flags为空', () => {
    const filter = createRegexFilter('test')
    expect(filter.flags).toBe('i')
  })
})

describe('validateFilter', () => {
  it('验证有效过滤器', () => {
    const filter = createExtensionFilter(['.js'])
    const result = validateFilter(filter)
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('空对象验证失败', () => {
    const result = validateFilter({} as DirectoryDiffEntry)
    expect(result.valid).toBe(false)
  })

  it('缺少类型验证失败', () => {
    const result = validateFilter({ id: 'test' } as DirectoryDiffEntry)
    expect(result.valid).toBe(false)
  })

  it('扩展名过滤器需要至少一个扩展名', () => {
    const filter: ExtensionFilter = {
      id: 'test',
      type: 'extension',
      enabled: true,
      invert: false,
      extensions: [],
      caseSensitive: false
    }
    const result = validateFilter(filter)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('扩展名')
  })

  it('glob过滤器需要至少一个模式', () => {
    const filter: GlobFilter = {
      id: 'test',
      type: 'glob',
      enabled: true,
      invert: false,
      patterns: []
    }
    const result = validateFilter(filter)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Glob')
  })

  it('无效正则表达式验证失败', () => {
    const filter = createRegexFilter('[invalid')
    const result = validateFilter(filter)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('正则')
  })

  it('大小过滤器验证负数', () => {
    const filter: SizeFilter = {
      id: 'test',
      type: 'size',
      enabled: true,
      invert: false,
      minSize: -1
    }
    const result = validateFilter(filter)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('负数')
  })

  it('大小过滤器验证范围', () => {
    const filter: SizeFilter = {
      id: 'test',
      type: 'size',
      enabled: true,
      invert: false,
      minSize: 1000,
      maxSize: 100
    }
    const result = validateFilter(filter)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('最小大小不能大于')
  })

  it('日期过滤器验证范围', () => {
    const filter: DateFilter = {
      id: 'test',
      type: 'date',
      enabled: true,
      invert: false,
      modifiedAfter: '2024-12-31',
      modifiedBefore: '2024-01-01'
    }
    const result = validateFilter(filter)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('日期')
  })

  it('未知类型验证失败', () => {
    const filter = { id: 'test', type: 'unknown' } as DirectoryFilter
    const result = validateFilter(filter)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('未知')
  })
})

describe('mergeFilters', () => {
  it('合并多个过滤器列表', () => {
    const list1 = [createExtensionFilter(['.js'])]
    const list2 = [createGlobFilter(['**/*.ts'])]
    const result = mergeFilters(list1, list2)
    expect(result).toHaveLength(2)
  })

  it('相同ID的过滤器被覆盖', () => {
    const filter1 = createExtensionFilter(['.js'])
    filter1.id = 'same-id'
    const filter2 = createGlobFilter(['**/*.ts'])
    filter2.id = 'same-id'

    const result = mergeFilters([filter1], [filter2])
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('glob')
  })

  it('空列表合并', () => {
    const result = mergeFilters([], [createExtensionFilter(['.js'])])
    expect(result).toHaveLength(1)
  })
})
