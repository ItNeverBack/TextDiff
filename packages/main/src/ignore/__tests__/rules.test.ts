import { describe, it, expect } from 'vitest'
import { 
  normalizeWhitespace,
  applyCaseIgnore,
  applyLineEndingIgnore,
  filterLinesByPatterns
} from '../index'

describe('Whitespace 规则', () => {
  describe('normalizeWhitespace', () => {
    it('将连续空白替换为单个空格并trim', () => {
      expect(normalizeWhitespace('  hello  ')).toBe('hello')
      expect(normalizeWhitespace('hello\tworld')).toBe('hello world')
    })

    it('空字符串处理', () => {
      expect(normalizeWhitespace('')).toBe('')
    })

    it('只有空白字符返回空字符串', () => {
      expect(normalizeWhitespace('   ')).toBe('')
      expect(normalizeWhitespace('\t\n\r')).toBe('')
    })

    it('多行文本处理', () => {
      const multiLine = '  line1  \n  line2  '
      expect(normalizeWhitespace(multiLine)).toBe('line1 line2')
    })
  })
})

describe('Case 规则', () => {
  describe('applyCaseIgnore', () => {
    it('大写转小写', () => {
      expect(applyCaseIgnore('HELLO')).toBe('hello')
      expect(applyCaseIgnore('Hello World')).toBe('hello world')
    })

    it('小写保持不变', () => {
      expect(applyCaseIgnore('hello')).toBe('hello')
      expect(applyCaseIgnore('already lowercase')).toBe('already lowercase')
    })

    it('混合大小写', () => {
      expect(applyCaseIgnore('HeLLo WoRLd')).toBe('hello world')
    })

    it('空字符串', () => {
      expect(applyCaseIgnore('')).toBe('')
    })

    it('Unicode字符', () => {
      expect(applyCaseIgnore('ÄÖÜ')).toBe('äöü')
      expect(applyCaseIgnore('Привет')).toBe('привет')
    })

    it('数字和符号不变', () => {
      expect(applyCaseIgnore('123 ABC!@#')).toBe('123 abc!@#')
    })
  })
})

describe('LineEnding 规则', () => {
  describe('applyLineEndingIgnore', () => {
    it('CRLF 转换为 LF', () => {
      expect(applyLineEndingIgnore('line1\r\nline2')).toBe('line1\nline2')
      expect(applyLineEndingIgnore('a\r\nb\r\nc')).toBe('a\nb\nc')
    })

    it('CR 转换为 LF', () => {
      expect(applyLineEndingIgnore('line1\rline2')).toBe('line1\nline2')
    })

    it('LF 保持不变', () => {
      expect(applyLineEndingIgnore('line1\nline2')).toBe('line1\nline2')
    })

    it('混合行尾符', () => {
      const mixed = 'line1\r\nline2\nline3\rline4'
      expect(applyLineEndingIgnore(mixed)).toBe('line1\nline2\nline3\nline4')
    })

    it('空字符串', () => {
      expect(applyLineEndingIgnore('')).toBe('')
    })

    it('单行无换行符', () => {
      expect(applyLineEndingIgnore('hello')).toBe('hello')
    })

    it('末尾换行符', () => {
      expect(applyLineEndingIgnore('hello\n')).toBe('hello\n')
      expect(applyLineEndingIgnore('hello\r\n')).toBe('hello\n')
    })
  })
})

describe('Pattern 规则', () => {
  describe('filterLinesByPatterns', () => {
    it('空模式列表不过滤', () => {
      const lines = ['line1', 'line2', 'line3']
      const result = filterLinesByPatterns(lines, [])
      expect(result.filtered).toEqual(lines)
      expect(result.ignoredCount).toBe(0)
    })

    it('正则匹配行被移除', () => {
      const lines = ['const x = 5;', '// comment', 'function foo() {}']
      const patterns = ['^\\s*//']
      const result = filterLinesByPatterns(lines, patterns)
      expect(result.filtered).toEqual(['const x = 5;', 'function foo() {}'])
      expect(result.ignoredCount).toBe(1)
    })

    it('多个模式按 OR 逻辑', () => {
      const lines = ['# comment', '// comment', 'code', '-- sql']
      const patterns = ['^\\s*#', '^\\s*//']
      const result = filterLinesByPatterns(lines, patterns)
      expect(result.filtered).toEqual(['code', '-- sql'])
      expect(result.ignoredCount).toBe(2)
    })

    it('无匹配时保留所有行', () => {
      const lines = ['line1', 'line2', 'line3']
      const patterns = ['^import']
      const result = filterLinesByPatterns(lines, patterns)
      expect(result.filtered).toEqual(lines)
      expect(result.ignoredCount).toBe(0)
    })

    it('全部匹配时返回空数组', () => {
      const lines = ['# comment1', '# comment2']
      const patterns = ['^#']
      const result = filterLinesByPatterns(lines, patterns)
      expect(result.filtered).toEqual([])
      expect(result.ignoredCount).toBe(2)
    })

    it('空行数组', () => {
      const result = filterLinesByPatterns([], ['pattern'])
      expect(result.filtered).toEqual([])
      expect(result.indices).toEqual([])
    })

    it('特殊字符正则', () => {
      const lines = ['console.log("test")', 'debug.log']
      const patterns = ['console\\.log']
      const result = filterLinesByPatterns(lines, patterns)
      expect(result.filtered).toEqual(['debug.log'])
    })

    it('返回正确的索引映射', () => {
      const lines = ['line1', '// comment', 'line2']
      const result = filterLinesByPatterns(lines, ['^\\s*//'])
      expect(result.indices).toEqual([0, 2])
    })
  })
})
