import { describe, it, expect } from 'vitest'
import { normalizeLineEndings, detectLineEnding, LineEndingType } from '../line-ending'

describe('line-ending', () => {
  describe('normalizeLineEndings', () => {
    it('should convert CRLF to LF', () => {
      const lines = ['hello\r\n', 'world\r\n']
      const result = normalizeLineEndings(lines, 'LF')
      expect(result).toEqual(['hello\n', 'world\n'])
    })

    it('should convert CR to LF', () => {
      const lines = ['hello\r', 'world\r']
      const result = normalizeLineEndings(lines, 'LF')
      expect(result).toEqual(['hello\n', 'world\n'])
    })

    it('should keep LF unchanged', () => {
      const lines = ['hello\n', 'world\n']
      const result = normalizeLineEndings(lines, 'LF')
      expect(result).toEqual(['hello\n', 'world\n'])
    })

    it('should convert LF to CRLF', () => {
      const lines = ['hello\n', 'world\n']
      const result = normalizeLineEndings(lines, 'CRLF')
      expect(result).toEqual(['hello\r\n', 'world\r\n'])
    })

    it('should handle mixed line endings', () => {
      const lines = ['unix\n', 'windows\r\n', 'old-mac\r']
      const result = normalizeLineEndings(lines, 'LF')
      expect(result).toEqual(['unix\n', 'windows\n', 'old-mac\n'])
    })

    it('should handle lines without line endings', () => {
      const lines = ['hello', 'world']
      const result = normalizeLineEndings(lines, 'LF')
      expect(result).toEqual(['hello', 'world'])
    })

    it('should handle empty array', () => {
      expect(normalizeLineEndings([], 'LF')).toEqual([])
    })

    it('should handle empty lines', () => {
      const lines = ['', '\n', '\r\n']
      const result = normalizeLineEndings(lines, 'LF')
      expect(result).toEqual(['', '\n', '\n'])
    })

    it('should not mutate original array', () => {
      const lines = ['hello\r\n']
      const original = [...lines]
      normalizeLineEndings(lines, 'LF')
      expect(lines).toEqual(original)
    })
  })

  describe('detectLineEnding', () => {
    it('should detect CRLF', () => {
      const content = 'line1\r\nline2\r\n'
      expect(detectLineEnding(content)).toBe('CRLF' as LineEndingType)
    })

    it('should detect LF', () => {
      const content = 'line1\nline2\n'
      expect(detectLineEnding(content)).toBe('LF' as LineEndingType)
    })

    it('should detect CR (old Mac style)', () => {
      const content = 'line1\rline2\r'
      expect(detectLineEnding(content)).toBe('CR' as LineEndingType)
    })

    it('should default to LF for empty content', () => {
      expect(detectLineEnding('')).toBe('LF' as LineEndingType)
    })

    it('should default to LF for content without line endings', () => {
      expect(detectLineEnding('single line no ending')).toBe('LF' as LineEndingType)
    })

    it('should prefer LF when both LF and CR present (no CRLF)', () => {
      const content = 'line1\nline2\rline3'
      expect(detectLineEnding(content)).toBe('LF' as LineEndingType)
    })

    it('should detect CRLF when mixed with LF', () => {
      const content = 'line1\r\nline2\n'
      expect(detectLineEnding(content)).toBe('CRLF' as LineEndingType)
    })

    it('should handle single line with CRLF', () => {
      expect(detectLineEnding('hello\r\n')).toBe('CRLF' as LineEndingType)
    })

    it('should handle single line with LF', () => {
      expect(detectLineEnding('hello\n')).toBe('LF' as LineEndingType)
    })

    it('should handle Windows-style file', () => {
      const content = 'function test() {\r\n  return 1;\r\n}\r\n'
      expect(detectLineEnding(content)).toBe('CRLF' as LineEndingType)
    })

    it('should handle Unix-style file', () => {
      const content = 'function test() {\n  return 1;\n}\n'
      expect(detectLineEnding(content)).toBe('LF' as LineEndingType)
    })
  })
})
