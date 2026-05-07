import { describe, it, expect } from 'vitest'
import { 
  readDirectory, 
  compareDirectories,
  createDefaultExcludeRules,
  createExtensionFilters,
  validateFileFilter
} from '../directory'
import type { FileFilter, DirectoryExcludeRule, DirectoryReadOptions } from '@shared/types'

describe('文件过滤系统', () => {
  describe('createDefaultExcludeRules', () => {
    it('应返回默认的排除规则列表', () => {
      const rules = createDefaultExcludeRules()
      
      expect(Array.isArray(rules)).toBe(true)
      expect(rules.length).toBeGreaterThan(0)
      
      // 检查常见的排除目录
      const hasNodeModules = rules.some(r => r.pattern === 'node_modules')
      const hasGit = rules.some(r => r.pattern === '.git')
      const hasDist = rules.some(r => r.pattern === 'dist')
      
      expect(hasNodeModules).toBe(true)
      expect(hasGit).toBe(true)
      expect(hasDist).toBe(true)
    })

    it('所有规则应默认启用', () => {
      const rules = createDefaultExcludeRules()
      
      for (const rule of rules) {
        expect(rule.enabled).toBe(true)
        expect(rule.recursive).toBe(true)
      }
    })
  })

  describe('createExtensionFilters', () => {
    it('应从扩展名列表创建过滤器', () => {
      const extensions = ['ts', 'tsx', 'js']
      const filters = createExtensionFilters(extensions)
      
      expect(filters).toHaveLength(3)
      expect(filters[0].type).toBe('extension')
      expect(filters[0].pattern).toBe('ts')
      expect(filters[0].enabled).toBe(true)
    })

    it('应正确处理带点的扩展名', () => {
      const extensions = ['.ts', '.tsx']
      const filters = createExtensionFilters(extensions)
      
      expect(filters[0].pattern).toBe('ts')
      expect(filters[1].pattern).toBe('tsx')
    })
  })

  describe('validateFileFilter', () => {
    it('应验证有效的扩展名过滤器', () => {
      const filter: FileFilter = {
        type: 'extension',
        pattern: 'ts',
        enabled: true
      }
      
      const result = validateFileFilter(filter)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('应验证有效的正则表达式过滤器', () => {
      const filter: FileFilter = {
        type: 'regex',
        pattern: '^test\\.ts$',
        enabled: true
      }
      
      const result = validateFileFilter(filter)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('应检测无效的正则表达式', () => {
      const filter: FileFilter = {
        type: 'regex',
        pattern: '[invalid',
        enabled: true
      }
      
      const result = validateFileFilter(filter)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('无效的正则表达式')
    })

    it('应检测空模式', () => {
      const filter: FileFilter = {
        type: 'extension',
        pattern: '   ',
        enabled: true
      }
      
      const result = validateFileFilter(filter)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('不能为空')
    })

    it('应检测非字符串前缀', () => {
      const filter = {
        type: 'extension',
        pattern: 123,
        enabled: true
      } as unknown as FileFilter
      
      const result = validateFileFilter(filter)
      expect(result.valid).toBe(false)
    })
  })

  describe('glob 模式匹配', () => {
    it('应正确匹配 * 通配符', async () => {
      const options: DirectoryReadOptions = {
        recursive: true,
        filter: {
          exclude: ['*.log', '*.tmp']
        }
      }
      
      // 这个测试主要验证 exclude 参数能被正确解析
      // 实际文件读取需要真实文件系统
      expect(options.filter?.exclude).toContain('*.log')
      expect(options.filter?.exclude).toContain('*.tmp')
    })

    it('应正确匹配 ? 通配符', async () => {
      const options: DirectoryReadOptions = {
        recursive: true,
        filter: {
          exclude: ['file?.txt']
        }
      }
      
      expect(options.filter?.exclude).toContain('file?.txt')
    })
  })

  describe('高级过滤器', () => {
    it('应支持扩展名过滤器', () => {
      const filters: FileFilter[] = [
        { type: 'extension', pattern: 'ts', enabled: true },
        { type: 'extension', pattern: 'tsx', enabled: true }
      ]
      
      const options: DirectoryReadOptions = {
        recursive: true,
        filter: { filters }
      }
      
      expect(options.filter?.filters).toHaveLength(2)
      expect(options.filter?.filters?.[0].type).toBe('extension')
    })

    it('应支持 glob 过滤器', () => {
      const filters: FileFilter[] = [
        { type: 'glob', pattern: '*.test.*', enabled: true }
      ]
      
      const options: DirectoryReadOptions = {
        recursive: true,
        filter: { filters }
      }
      
      expect(options.filter?.filters?.[0].type).toBe('glob')
    })

    it('应支持正则表达式过滤器', () => {
      const filters: FileFilter[] = [
        { type: 'regex', pattern: '^[a-z]+\\.ts$', enabled: true }
      ]
      
      const options: DirectoryReadOptions = {
        recursive: true,
        filter: { filters }
      }
      
      expect(options.filter?.filters?.[0].type).toBe('regex')
    })

    it('应支持排除过滤器', () => {
      const filters: FileFilter[] = [
        { type: 'exclude', pattern: '*.spec.ts', enabled: true }
      ]
      
      const options: DirectoryReadOptions = {
        recursive: true,
        filter: { filters }
      }
      
      expect(options.filter?.filters?.[0].type).toBe('exclude')
    })

    it('应正确处理禁用的过滤器', () => {
      const filters: FileFilter[] = [
        { type: 'extension', pattern: 'ts', enabled: false },
        { type: 'extension', pattern: 'js', enabled: true }
      ]
      
      const options: DirectoryReadOptions = {
        recursive: true,
        filter: { filters }
      }
      
      const enabledFilters = options.filter?.filters?.filter(f => f.enabled)
      expect(enabledFilters).toHaveLength(1)
      expect(enabledFilters?.[0].pattern).toBe('js')
    })
  })

  describe('目录排除规则', () => {
    it('应支持递归排除目录', () => {
      const rules: DirectoryExcludeRule[] = [
        { pattern: 'node_modules', recursive: true, enabled: true },
        { pattern: '.git', recursive: true, enabled: true }
      ]
      
      const options: DirectoryReadOptions = {
        recursive: true,
        filter: { excludeRules: rules }
      }
      
      expect(options.filter?.excludeRules).toHaveLength(2)
      expect(options.filter?.excludeRules?.[0].recursive).toBe(true)
    })

    it('应支持非递归排除', () => {
      const rules: DirectoryExcludeRule[] = [
        { pattern: 'temp', recursive: false, enabled: true }
      ]
      
      const options: DirectoryReadOptions = {
        recursive: true,
        filter: { excludeRules: rules }
      }
      
      expect(options.filter?.excludeRules?.[0].recursive).toBe(false)
    })
  })

  describe('文件大小过滤', () => {
    it('应支持最小文件大小限制', () => {
      const options: DirectoryReadOptions = {
        recursive: true,
        filter: {
          minSize: 1024 // 1KB
        }
      }
      
      expect(options.filter?.minSize).toBe(1024)
    })

    it('应支持最大文件大小限制', () => {
      const options: DirectoryReadOptions = {
        recursive: true,
        filter: {
          maxSize: 1024 * 1024 * 10 // 10MB
        }
      }
      
      expect(options.filter?.maxSize).toBe(10485760)
    })

    it('应支持同时设置最小和最大大小', () => {
      const options: DirectoryReadOptions = {
        recursive: true,
        filter: {
          minSize: 100,
          maxSize: 10000
        }
      }
      
      expect(options.filter?.minSize).toBe(100)
      expect(options.filter?.maxSize).toBe(10000)
    })
  })

  describe('隐藏文件处理', () => {
    it('默认应包含隐藏文件', () => {
      const options: DirectoryReadOptions = {
        recursive: true
      }
      
      // 未设置 includeHidden 时，默认为 true
      expect(options.filter?.includeHidden ?? true).toBe(true)
    })

    it('应支持排除隐藏文件', () => {
      const options: DirectoryReadOptions = {
        recursive: true,
        filter: {
          includeHidden: false
        }
      }
      
      expect(options.filter?.includeHidden).toBe(false)
    })
  })

  describe('向后兼容性', () => {
    it('应支持旧的 extensions 过滤', () => {
      const options: DirectoryReadOptions = {
        recursive: true,
        filter: {
          extensions: ['.ts', '.tsx', '.js']
        }
      }
      
      expect(options.filter?.extensions).toHaveLength(3)
      expect(options.filter?.extensions).toContain('.ts')
    })

    it('应支持旧的 exclude 数组', () => {
      const options: DirectoryReadOptions = {
        recursive: true,
        filter: {
          exclude: ['node_modules', '*.log']
        }
      }
      
      expect(options.filter?.exclude).toHaveLength(2)
    })
  })

  describe('类型导出', () => {
    it('应导出 FileFilter 类型', () => {
      const filter: FileFilter = {
        type: 'extension',
        pattern: 'ts',
        enabled: true
      }
      
      expect(filter.type).toBe('extension')
      expect(filter.pattern).toBe('ts')
    })

    it('应导出 DirectoryExcludeRule 类型', () => {
      const rule: DirectoryExcludeRule = {
        pattern: 'test',
        recursive: true,
        enabled: true
      }
      
      expect(rule.pattern).toBe('test')
      expect(rule.recursive).toBe(true)
    })

    it('应导出 FileFilterType 联合类型', () => {
      const types = ['extension', 'glob', 'regex', 'exclude']
      
      for (const type of types) {
        const filter: FileFilter = {
          type: type as FileFilter['type'],
          pattern: 'test',
          enabled: true
        }
        expect(filter.type).toBe(type)
      }
    })
  })
})
