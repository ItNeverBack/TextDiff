import { describe, it, expect } from 'vitest'
import type { DirectoryDiffEntry, DirectoryFilter } from '@shared/types'
import {
  applyFilters,
  matchGlob,
  shouldExcludePath,
  createDefaultFilters,
  createExtensionFilter,
  createGlobFilter,
  createRegexFilter,
  validateFilter
} from '../filter'

describe('Directory Filter', () => {
  describe('matchGlob', () => {
    it('should match simple patterns', () => {
      expect(matchGlob('file.txt', '*.txt')).toBe(true)
      expect(matchGlob('file.js', '*.txt')).toBe(false)
    })

    it('should match single character wildcard', () => {
      expect(matchGlob('file1.txt', 'file?.txt')).toBe(true)
      expect(matchGlob('file12.txt', 'file?.txt')).toBe(false)
    })

    it('should match double asterisk for any depth', () => {
      expect(matchGlob('src/components/Button.tsx', '**/*.tsx')).toBe(true)
      expect(matchGlob('Button.tsx', '**/*.tsx')).toBe(true)
    })

    it('should handle directory patterns', () => {
      expect(matchGlob('node_modules/package/file.js', 'node_modules/**')).toBe(true)
      expect(matchGlob('src/node_modules/file.js', '**/node_modules/**')).toBe(true)
    })
  })

  describe('shouldExcludePath', () => {
    it('should exclude matching patterns', () => {
      expect(shouldExcludePath('node_modules/lodash/index.js', 'node_modules', ['node_modules'])).toBe(true)
      expect(shouldExcludePath('src/index.ts', 'src', ['node_modules'])).toBe(false)
    })

    it('should exclude by glob patterns', () => {
      expect(shouldExcludePath('file.tmp', 'file.tmp', ['*.tmp'])).toBe(true)
      expect(shouldExcludePath('file.txt', 'file.txt', ['*.tmp'])).toBe(false)
    })
  })

  describe('createDefaultFilters', () => {
    it('should create default exclude filters', () => {
      const filters = createDefaultFilters()
      expect(filters.length).toBeGreaterThan(0)
      expect(filters[0].type).toBe('glob')
      expect(filters[0].enabled).toBe(true)
    })
  })

  describe('createExtensionFilter', () => {
    it('should create extension filter', () => {
      const filter = createExtensionFilter(['ts', 'tsx'])
      expect(filter.type).toBe('extension')
      expect(filter.extensions).toEqual(['ts', 'tsx'])
      expect(filter.enabled).toBe(true)
    })

    it('should respect case sensitivity', () => {
      const filter = createExtensionFilter(['TS'], true)
      expect(filter.caseSensitive).toBe(true)
    })
  })

  describe('createGlobFilter', () => {
    it('should create glob filter', () => {
      const filter = createGlobFilter(['*.test.ts', '*.spec.ts'])
      expect(filter.type).toBe('glob')
      expect(filter.patterns).toEqual(['*.test.ts', '*.spec.ts'])
    })

    it('should support invert option', () => {
      const filter = createGlobFilter(['*.test.ts'], true)
      expect(filter.invert).toBe(true)
    })
  })

  describe('createRegexFilter', () => {
    it('should create regex filter', () => {
      const filter = createRegexFilter('test\\.ts$', 'i')
      expect(filter.type).toBe('regex')
      expect(filter.pattern).toBe('test\\.ts$')
      expect(filter.flags).toBe('i')
    })
  })

  describe('validateFilter', () => {
    it('should validate valid extension filter', () => {
      const filter = createExtensionFilter(['ts'])
      const result = validateFilter(filter)
      expect(result.valid).toBe(true)
    })

    it('should reject invalid extension filter', () => {
      const filter = {
        id: 'test',
        type: 'extension',
        enabled: true,
        invert: false,
        extensions: [],
        caseSensitive: false
      } as DirectoryFilter
      const result = validateFilter(filter)
      expect(result.valid).toBe(false)
    })

    it('should validate valid regex filter', () => {
      const filter = createRegexFilter('test\\.ts$')
      const result = validateFilter(filter)
      expect(result.valid).toBe(true)
    })

    it('should reject invalid regex filter', () => {
      const filter = {
        id: 'test',
        type: 'regex',
        enabled: true,
        invert: false,
        pattern: '[invalid',
        flags: ''
      } as DirectoryFilter
      const result = validateFilter(filter)
      expect(result.valid).toBe(false)
    })
  })

  describe('applyFilters', () => {
    function createMockEntry(
      name: string,
      type: 'file' | 'directory',
      relativePath: string
    ): DirectoryDiffEntry {
      return {
        id: `test-${name}`,
        relativePath,
        name,
        type,
        status: 'equal',
        leftPath: `/left/${relativePath}`,
        rightPath: `/right/${relativePath}`,
        depth: relativePath.split('/').length - 1
      }
    }

    it('should filter by extension', () => {
      const entries = [
        createMockEntry('file.ts', 'file', 'file.ts'),
        createMockEntry('file.js', 'file', 'file.js'),
        createMockEntry('file.txt', 'file', 'file.txt')
      ]

      const filters: DirectoryFilter[] = [
        createExtensionFilter(['.ts', '.js'])
      ]

      const result = applyFilters(entries, filters)
      expect(result.length).toBe(2)
      expect(result.every(e => e.name.endsWith('.ts') || e.name.endsWith('.js'))).toBe(true)
    })

    it('should filter by glob pattern', () => {
      const entries = [
        createMockEntry('test.spec.ts', 'file', 'test.spec.ts'),
        createMockEntry('test.ts', 'file', 'test.ts'),
        createMockEntry('utils.ts', 'file', 'utils.ts')
      ]

      const filters: DirectoryFilter[] = [
        createGlobFilter(['*.spec.ts'])
      ]

      const result = applyFilters(entries, filters)
      expect(result.length).toBe(1)
      expect(result[0].name).toBe('test.spec.ts')
    })

    it('should filter by regex pattern', () => {
      const entries = [
        createMockEntry('Button.tsx', 'file', 'Button.tsx'),
        createMockEntry('button.tsx', 'file', 'button.tsx'),
        createMockEntry('index.ts', 'file', 'index.ts')
      ]

      const filters: DirectoryFilter[] = [
        createRegexFilter('^[A-Z].*\\.tsx$', '')
      ]

      const result = applyFilters(entries, filters)
      expect(result.length).toBe(1)
      expect(result[0].name).toBe('Button.tsx')
    })

    it('should handle inverted filters', () => {
      const entries = [
        createMockEntry('node_modules', 'directory', 'node_modules'),
        createMockEntry('src', 'directory', 'src'),
        createMockEntry('dist', 'directory', 'dist')
      ]

      const filters: DirectoryFilter[] = [
        {
          ...createGlobFilter(['node_modules', 'dist']),
          invert: true
        }
      ]

      const result = applyFilters(entries, filters)
      expect(result.length).toBe(1)
      expect(result[0].name).toBe('src')
    })

    it('should preserve directory structure when filtering', () => {
      const entries: DirectoryDiffEntry[] = [
        {
          ...createMockEntry('src', 'directory', 'src'),
          children: [
            createMockEntry('test.ts', 'file', 'src/test.ts'),
            createMockEntry('utils.ts', 'file', 'src/utils.ts')
          ]
        }
      ]

      const filters: DirectoryFilter[] = [
        createGlobFilter(['test.*'], true) // 排除 test 文件
      ]

      const result = applyFilters(entries, filters)
      expect(result.length).toBe(1)
      expect(result[0].children?.length).toBe(1)
      expect(result[0].children?.[0].name).toBe('utils.ts')
    })

    it('should return all entries when no filters', () => {
      const entries = [
        createMockEntry('file1.ts', 'file', 'file1.ts'),
        createMockEntry('file2.ts', 'file', 'file2.ts')
      ]

      const result = applyFilters(entries, [])
      expect(result.length).toBe(2)
    })

    it('should skip disabled filters', () => {
      const entries = [
        createMockEntry('file.ts', 'file', 'file.ts'),
        createMockEntry('file.js', 'file', 'file.js')
      ]

      const filters: DirectoryFilter[] = [
        { ...createExtensionFilter(['.ts']), enabled: false }
      ]

      const result = applyFilters(entries, filters)
      expect(result.length).toBe(2)
    })
  })
})
