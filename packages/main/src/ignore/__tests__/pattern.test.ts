import { describe, it, expect } from 'vitest'
import { filterByPatterns, createPatternMatcher } from '../pattern'

describe('pattern', () => {
  describe('createPatternMatcher', () => {
    it('should create regex from simple string', () => {
      const matcher = createPatternMatcher('test')
      expect(matcher.test('This is a test')).toBe(true)
      expect(matcher.test('No match here')).toBe(false)
    })

    it('should create regex from regex string', () => {
      const matcher = createPatternMatcher('/\\d+/')
      expect(matcher.test('Number 123')).toBe(true)
      expect(matcher.test('No numbers')).toBe(false)
    })

    it('should handle special regex characters', () => {
      const matcher = createPatternMatcher('\\[test\\]')
      expect(matcher.test('[test]')).toBe(true)
    })

    it('should handle empty pattern', () => {
      const matcher = createPatternMatcher('')
      expect(matcher.test('anything')).toBe(false)
    })
  })

  describe('filterByPatterns', () => {
    it('should return all lines when no patterns provided', () => {
      const lines = ['hello', 'world', 'test']
      const result = filterByPatterns(lines, [])
      expect(result).toEqual(lines)
    })

    it('should filter lines matching single pattern', () => {
      const lines = ['hello world', 'test line', 'goodbye world']
      const result = filterByPatterns(lines, ['test'])
      expect(result).toEqual(['hello world', 'goodbye world'])
    })

    it('should filter lines matching any of multiple patterns (OR logic)', () => {
      const lines = ['hello', 'world', 'test', 'foo', 'bar']
      const result = filterByPatterns(lines, ['test', 'foo'])
      expect(result).toEqual(['hello', 'world', 'bar'])
    })

    it('should filter using regex patterns', () => {
      const lines = ['line 1', 'line 10', 'line 2', 'no match']
      const result = filterByPatterns(lines, ['/\\d{2}/'])
      expect(result).toEqual(['line 1', 'line 2', 'no match'])
    })

    it('should handle empty lines array', () => {
      expect(filterByPatterns([], ['test'])).toEqual([])
    })

    it('should handle comment patterns', () => {
      const lines = [
        'const x = 1;',
        '// This is a comment',
        'const y = 2;',
        '  // Indented comment',
        '/* Block comment start',
        '   Block comment end */',
        'const z = 3;',
      ]
      const result = filterByPatterns(lines, ['^\\s*//', '^\\s*/\\*'])
      expect(result).toEqual([
        'const x = 1;',
        'const y = 2;',
        'const z = 3;',
      ])
    })

    it('should handle whitespace patterns', () => {
      const lines = ['hello  world', 'no  extra  spaces', 'test']
      const result = filterByPatterns(lines, ['/\\s{2,}/'])
      expect(result).toEqual(['test'])
    })

    it('should handle import/include patterns', () => {
      const lines = [
        "import React from 'react';",
        'const x = 1;',
        "import { useState } from 'react';",
        'function test() {}',
      ]
      const result = filterByPatterns(lines, ['^import\\s'])
      expect(result).toEqual([
        'const x = 1;',
        'function test() {}',
      ])
    })

    it('should not mutate original array', () => {
      const lines = ['hello', 'test', 'world']
      const original = [...lines]
      filterByPatterns(lines, ['test'])
      expect(lines).toEqual(original)
    })

    it('should filter empty lines when pattern matches empty', () => {
      const lines = ['hello', '', 'world', '   ', 'test']
      const result = filterByPatterns(lines, ['^\\s*$'])
      expect(result).toEqual(['hello', 'world', 'test'])
    })

    it('should handle case sensitive matching by default', () => {
      const lines = ['HELLO', 'hello', 'Hello']
      const result = filterByPatterns(lines, ['hello'])
      expect(result).toEqual(['HELLO', 'Hello'])
    })

    it('should handle unicode characters in patterns', () => {
      const lines = ['comment: 你好', 'code: test', 'comment: 世界']
      const result = filterByPatterns(lines, ['comment:'])
      expect(result).toEqual(['code: test'])
    })
  })
})
