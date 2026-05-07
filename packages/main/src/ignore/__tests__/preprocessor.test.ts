import { describe, it, expect } from 'vitest'
import { preprocessContent } from '../preprocessor'

describe('preprocessContent - trailing newline handling', () => {
  it('should remove trailing empty line when file ends with newline', () => {
    const content = '123\n321\n1\n3\n4'  // test1.txt - no trailing newline
    const contentWithNewline = '123\r\n3\r\n4\r\n3\r\n'  // test2.txt - with trailing newline

    const result1 = preprocessContent(content, {
      ignoreWhitespace: 'none',
      ignoreCase: false,
      ignoreLineEndings: true,
      ignorePatterns: []
    })

    const result2 = preprocessContent(contentWithNewline, {
      ignoreWhitespace: 'none',
      ignoreCase: false,
      ignoreLineEndings: true,
      ignorePatterns: []
    })

    console.log('test1.txt (no trailing newline):', result1.filtered)
    console.log('test2.txt (with trailing newline):', result2.filtered)

    // Both should have 5 lines after processing
    expect(result1.filtered.length).toBe(5)
    expect(result2.filtered.length).toBe(4)

    // Content should match (ignoring line endings)
    expect(result1.filtered[0]).toBe('123')
    expect(result2.filtered[0]).toBe('123')
    expect(result1.filtered[3]).toBe('3')
    expect(result2.filtered[1]).toBe('3')
  })

  it('should handle empty content', () => {
    const result = preprocessContent('', {
      ignoreWhitespace: 'none',
      ignoreCase: false,
      ignoreLineEndings: true,
      ignorePatterns: []
    })

    expect(result.filtered.length).toBe(0)
    expect(result.originalLines.length).toBe(0)
  })

  it('should handle single line without newline', () => {
    const result = preprocessContent('single line', {
      ignoreWhitespace: 'none',
      ignoreCase: false,
      ignoreLineEndings: true,
      ignorePatterns: []
    })

    expect(result.filtered.length).toBe(1)
    expect(result.filtered[0]).toBe('single line')
  })

  it('should handle single line with newline', () => {
    const result = preprocessContent('single line\n', {
      ignoreWhitespace: 'none',
      ignoreCase: false,
      ignoreLineEndings: true,
      ignorePatterns: []
    })

    expect(result.filtered.length).toBe(1)
    expect(result.filtered[0]).toBe('single line')
  })
})
