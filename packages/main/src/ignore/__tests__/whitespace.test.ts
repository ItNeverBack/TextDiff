import { describe, it, expect } from 'vitest'
import { normalizeWhitespace, removeLeadingTrailingWhitespace, removeAllWhitespace } from '../whitespace'

describe('whitespace', () => {
  describe('removeLeadingTrailingWhitespace', () => {
    it('should remove leading spaces', () => {
      expect(removeLeadingTrailingWhitespace('  hello')).toBe('hello')
      expect(removeLeadingTrailingWhitespace('\thello')).toBe('hello')
    })

    it('should remove trailing spaces', () => {
      expect(removeLeadingTrailingWhitespace('hello  ')).toBe('hello')
      expect(removeLeadingTrailingWhitespace('hello\t')).toBe('hello')
    })

    it('should remove both leading and trailing spaces', () => {
      expect(removeLeadingTrailingWhitespace('  hello  ')).toBe('hello')
      expect(removeLeadingTrailingWhitespace('\t hello \t')).toBe('hello')
    })

    it('should preserve internal spaces', () => {
      expect(removeLeadingTrailingWhitespace('  hello world  ')).toBe('hello world')
    })

    it('should handle empty string', () => {
      expect(removeLeadingTrailingWhitespace('')).toBe('')
    })

    it('should handle string with only whitespace', () => {
      expect(removeLeadingTrailingWhitespace('   ')).toBe('')
      expect(removeLeadingTrailingWhitespace('\t\n\r ')).toBe('')
    })

    it('should handle string without whitespace', () => {
      expect(removeLeadingTrailingWhitespace('hello')).toBe('hello')
    })
  })

  describe('removeAllWhitespace', () => {
    it('should remove all spaces', () => {
      expect(removeAllWhitespace('h e l l o')).toBe('hello')
    })

    it('should remove all tabs', () => {
      expect(removeAllWhitespace('h\te\tl\tl\to')).toBe('hello')
    })

    it('should remove all newlines', () => {
      expect(removeAllWhitespace('hello\nworld')).toBe('helloworld')
    })

    it('should remove mixed whitespace', () => {
      expect(removeAllWhitespace('  h\te l\nl\to  ')).toBe('hello')
    })

    it('should handle empty string', () => {
      expect(removeAllWhitespace('')).toBe('')
    })

    it('should handle string with only whitespace', () => {
      expect(removeAllWhitespace('   \t\n')).toBe('')
    })
  })

  describe('normalizeWhitespace', () => {
    it('should return original line when mode is none', () => {
      const lines = ['  hello  ', 'world']
      const result = normalizeWhitespace(lines, 'none')
      expect(result).toEqual(lines)
    })

    it('should remove leading-trailing whitespace when mode is leading-trailing', () => {
      const lines = ['  hello  ', '\tworld\t', '  test  ']
      const result = normalizeWhitespace(lines, 'leading-trailing')
      expect(result).toEqual(['hello', 'world', 'test'])
    })

    it('should remove all whitespace when mode is all', () => {
      const lines = ['  h e l l o  ', 'w o r l d']
      const result = normalizeWhitespace(lines, 'all')
      expect(result).toEqual(['hello', 'world'])
    })

    it('should handle empty lines array', () => {
      expect(normalizeWhitespace([], 'all')).toEqual([])
      expect(normalizeWhitespace([], 'leading-trailing')).toEqual([])
      expect(normalizeWhitespace([], 'none')).toEqual([])
    })

    it('should handle mixed content with empty lines', () => {
      const lines = ['  hello  '', '\t', 'world  ']
      const result = normalizeWhitespace(lines, 'leading-trailing')
      expect(result).toEqual(['hello', '', '', 'world'])
    })

    it('should not mutate original array', () => {
      const lines = ['  hello  ']
      const original = [...lines]
      normalizeWhitespace(lines, 'leading-trailing')
      expect(lines).toEqual(original)
    })
  })
})
