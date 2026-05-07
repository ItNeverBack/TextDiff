/**
 * IgnoreRuleEngine 注释行忽略功能测试
 * Week 11: 增强测试覆盖
 */

import { describe, it, expect } from 'vitest'
import { 
  isCommentLine, 
  getCommentPrefixesForLanguage, 
  validateCommentPrefixes,
  DEFAULT_COMMENT_PREFIXES 
} from '../index'
import { preprocessContent } from '../preprocessor'

describe('IgnoreRuleEngine - 注释行忽略功能', () => {
  describe('isCommentLine', () => {
    it('应识别 // 开头的注释行', () => {
      expect(isCommentLine('// this is a comment', ['//'])).toBe(true)
      expect(isCommentLine('  // indented comment', ['//'])).toBe(true)
      expect(isCommentLine('const x = 1; // inline comment', ['//'])).toBe(false)
    })

    it('应识别 # 开头的注释行', () => {
      expect(isCommentLine('# this is a comment', ['#'])).toBe(true)
      expect(isCommentLine('#!/bin/bash', ['#'])).toBe(true)
    })

    it('应识别 -- 开头的注释行', () => {
      expect(isCommentLine('-- SQL comment', ['--'])).toBe(true)
      expect(isCommentLine('  -- indented', ['--'])).toBe(true)
    })

    it('应识别 ; 开头的注释行', () => {
      expect(isCommentLine('; Lisp comment', [';'])).toBe(true)
    })

    it('应识别 % 开头的注释行', () => {
      expect(isCommentLine('% LaTeX comment', ['%'])).toBe(true)
    })

    it('应识别块注释标记', () => {
      expect(isCommentLine('/* block comment start', ['/*'])).toBe(true)
      expect(isCommentLine('*/ block comment end', ['*/'])).toBe(true)
      expect(isCommentLine('* middle of block', ['*'])).toBe(true)
    })

    it('应识别 JSDoc 注释', () => {
      expect(isCommentLine('/** JSDoc comment', ['/**'])).toBe(true)
    })

    it('应识别 Python 文档字符串', () => {
      expect(isCommentLine("'''docstring'''", ["'''"])).toBe(true)
      expect(isCommentLine('"""docstring"""', ['"""'])).toBe(true)
    })

    it('应识别 HTML 注释', () => {
      expect(isCommentLine('<!-- HTML comment', ['<!--'])).toBe(true)
      expect(isCommentLine('-->', ['-->'])).toBe(true)
    })

    it('不应识别非注释行', () => {
      expect(isCommentLine('const x = 1;', ['//'])).toBe(false)
      expect(isCommentLine('function test() {}', ['//'])).toBe(false)
      expect(isCommentLine('', ['//'])).toBe(false)
      expect(isCommentLine('   ', ['//'])).toBe(false)
    })

    it('应支持多前缀检测', () => {
      const prefixes = ['//', '#', '--']
      expect(isCommentLine('// comment', prefixes)).toBe(true)
      expect(isCommentLine('# comment', prefixes)).toBe(true)
      expect(isCommentLine('-- comment', prefixes)).toBe(true)
    })

    it('应使用默认前缀列表', () => {
      expect(isCommentLine('// comment')).toBe(true)
      expect(isCommentLine('# comment')).toBe(true)
      expect(isCommentLine('-- comment')).toBe(true)
    })
  })

  describe('getCommentPrefixesForLanguage', () => {
    it('应返回 JavaScript/TypeScript 的注释前缀', () => {
      const prefixes = getCommentPrefixesForLanguage('javascript')
      expect(prefixes).toContain('//')
      expect(prefixes).toContain('/*')
      expect(prefixes).toContain('/**')
    })

    it('应返回 TypeScript 的注释前缀', () => {
      const prefixes = getCommentPrefixesForLanguage('typescript')
      expect(prefixes).toContain('//')
      expect(prefixes).toContain('/*')
    })

    it('应返回 Python 的注释前缀', () => {
      const prefixes = getCommentPrefixesForLanguage('python')
      expect(prefixes).toContain('#')
      expect(prefixes).toContain("'''")
      expect(prefixes).toContain('"""')
    })

    it('应返回 Java 的注释前缀', () => {
      const prefixes = getCommentPrefixesForLanguage('java')
      expect(prefixes).toContain('//')
      expect(prefixes).toContain('/*')
    })

    it('应返回 C/C++ 的注释前缀', () => {
      const prefixes = getCommentPrefixesForLanguage('c')
      expect(prefixes).toContain('//')
      expect(prefixes).toContain('/*')
    })

    it('应返回 SQL 的注释前缀', () => {
      const prefixes = getCommentPrefixesForLanguage('sql')
      expect(prefixes).toContain('--')
      expect(prefixes).toContain('/*')
    })

    it('应返回 Shell 的注释前缀', () => {
      const prefixes = getCommentPrefixesForLanguage('shell')
      expect(prefixes).toContain('#')
    })

    it('应返回 HTML 的注释前缀', () => {
      const prefixes = getCommentPrefixesForLanguage('html')
      expect(prefixes).toContain('<!--')
      expect(prefixes).toContain('-->')
    })

    it('应返回 Ruby 的注释前缀', () => {
      const prefixes = getCommentPrefixesForLanguage('ruby')
      expect(prefixes).toContain('#')
    })

    it('应返回 Go 的注释前缀', () => {
      const prefixes = getCommentPrefixesForLanguage('go')
      expect(prefixes).toContain('//')
      expect(prefixes).toContain('/*')
    })

    it('应返回 Rust 的注释前缀', () => {
      const prefixes = getCommentPrefixesForLanguage('rust')
      expect(prefixes).toContain('//')
    })

    it('应返回 YAML 的注释前缀', () => {
      const prefixes = getCommentPrefixesForLanguage('yaml')
      expect(prefixes).toContain('#')
    })

    it('应返回 Lua 的注释前缀', () => {
      const prefixes = getCommentPrefixesForLanguage('lua')
      expect(prefixes).toContain('--')
    })

    it('应返回 Haskell 的注释前缀', () => {
      const prefixes = getCommentPrefixesForLanguage('haskell')
      expect(prefixes).toContain('--')
    })

    it('应不区分大小写', () => {
      const lower = getCommentPrefixesForLanguage('javascript')
      const upper = getCommentPrefixesForLanguage('JAVASCRIPT')
      const mixed = getCommentPrefixesForLanguage('JavaScript')
      
      expect(lower).toEqual(upper)
      expect(lower).toEqual(mixed)
    })

    it('未知语言应返回默认前缀', () => {
      const prefixes = getCommentPrefixesForLanguage('unknown-language')
      expect(prefixes).toEqual(DEFAULT_COMMENT_PREFIXES)
    })
  })

  describe('validateCommentPrefixes', () => {
    it('应验证有效的注释前缀列表', () => {
      const result = validateCommentPrefixes(['//', '#', '--'])
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('应检测非数组输入', () => {
      const result = validateCommentPrefixes('invalid' as unknown as string[])
      expect(result.valid).toBe(false)
      expect(result.error).toContain('数组')
    })

    it('应检测非字符串前缀', () => {
      const result = validateCommentPrefixes(['//', 123 as unknown as string, '--'])
      expect(result.valid).toBe(false)
      expect(result.error).toContain('字符串')
    })

    it('应检测空字符串前缀', () => {
      const result = validateCommentPrefixes(['//', '', '--'])
      expect(result.valid).toBe(false)
      expect(result.error).toContain('不能为空')
    })

    it('应检测空白字符串前缀', () => {
      const result = validateCommentPrefixes(['//', '   ', '--'])
      expect(result.valid).toBe(false)
    })

    it('应接受空数组', () => {
      const result = validateCommentPrefixes([])
      expect(result.valid).toBe(true)
    })
  })

  describe('preprocessContent - 注释行过滤', () => {
    it('应过滤掉注释行', () => {
      const content = `
const x = 1;
// this is a comment
const y = 2;
// another comment
const z = 3;
`.trim()

      const result = preprocessContent(content, {
        ignoreWhitespace: 'none',
        ignoreCase: false,
        ignoreLineEndings: true,
        ignorePatterns: [],
        ignoreComments: true,
        commentPrefixes: ['//']
      })

      // 应该过滤掉以 // 开头的注释行
      expect(result.filtered).toHaveLength(3)
      expect(result.filtered[0]).toBe('const x = 1;')
      expect(result.filtered[1]).toBe('const y = 2;')
      expect(result.filtered[2]).toBe('const z = 3;')
      expect(result.ignoredLineCount).toBe(2)
    })

    it('应正确统计被过滤的注释行数', () => {
      const content = `
// comment 1
const x = 1;
// comment 2
// comment 3
const y = 2;
`.trim()

      const result = preprocessContent(content, {
        ignoreWhitespace: 'none',
        ignoreCase: false,
        ignoreLineEndings: true,
        ignorePatterns: [],
        ignoreComments: true,
        commentPrefixes: ['//']
      })

      expect(result.ignoredLineCount).toBe(3)
    })

    it('不启用注释过滤时不应过滤注释行', () => {
      const content = `
const x = 1;
// comment
const y = 2;
`.trim()

      const result = preprocessContent(content, {
        ignoreWhitespace: 'none',
        ignoreCase: false,
        ignoreLineEndings: true,
        ignorePatterns: [],
        ignoreComments: false,
        commentPrefixes: ['//']
      })

      expect(result.filtered).toHaveLength(3)
      expect(result.ignoredLineCount).toBe(0)
    })

    it('应保留非注释行内的注释标记', () => {
      const content = 'const url = "http://example.com";'

      const result = preprocessContent(content, {
        ignoreWhitespace: 'none',
        ignoreCase: false,
        ignoreLineEndings: true,
        ignorePatterns: [],
        ignoreComments: true,
        commentPrefixes: ['//']
      })

      expect(result.filtered).toHaveLength(1)
      expect(result.filtered[0]).toBe(content)
    })

    it('应正确处理 Python 注释', () => {
      const content = `
def test():
    # this is a comment
    x = 1
    return x
`.trim()

      const result = preprocessContent(content, {
        ignoreWhitespace: 'none',
        ignoreCase: false,
        ignoreLineEndings: true,
        ignorePatterns: [],
        ignoreComments: true,
        commentPrefixes: ['#']
      })

      expect(result.filtered).not.toContain(expect.stringMatching(/^\s*#/))
      expect(result.filtered.some(line => line.includes('x = 1'))).toBe(true)
    })

    it('应正确处理多行注释', () => {
      const content = `
/**
* JSDoc comment
* @param x number
*/
function test(x: number) {
  return x;
}
`.trim()

      const result = preprocessContent(content, {
        ignoreWhitespace: 'none',
        ignoreCase: false,
        ignoreLineEndings: true,
        ignorePatterns: [],
        ignoreComments: true,
        commentPrefixes: ['/**', '*', '*/']
      })

      // 应该过滤掉 JSDoc 注释行
      expect(result.filtered.some(line => line.includes('JSDoc'))).toBe(false)
      expect(result.filtered.some(line => line.includes('function test'))).toBe(true)
    })
  })

  describe('DEFAULT_COMMENT_PREFIXES', () => {
    it('应包含常见的注释前缀', () => {
      expect(DEFAULT_COMMENT_PREFIXES).toContain('//')
      expect(DEFAULT_COMMENT_PREFIXES).toContain('#')
      expect(DEFAULT_COMMENT_PREFIXES).toContain('--')
      expect(DEFAULT_COMMENT_PREFIXES).toContain(';')
      expect(DEFAULT_COMMENT_PREFIXES).toContain('%')
      expect(DEFAULT_COMMENT_PREFIXES).toContain('/*')
      expect(DEFAULT_COMMENT_PREFIXES).toContain('/**')
    })

    it('不应为空数组', () => {
      expect(DEFAULT_COMMENT_PREFIXES.length).toBeGreaterThan(0)
    })

    it('所有前缀应为非空字符串', () => {
      for (const prefix of DEFAULT_COMMENT_PREFIXES) {
        expect(typeof prefix).toBe('string')
        expect(prefix.length).toBeGreaterThan(0)
      }
    })
  })
})
