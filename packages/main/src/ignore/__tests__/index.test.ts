import { describe, it, expect } from 'vitest'
import { 
  isCommentLine, 
  getCommentPrefixesForLanguage, 
  validateCommentPrefixes,
  DEFAULT_COMMENT_PREFIXES 
} from '../index'

describe('Ignore 规则引擎', () => {
  describe('isCommentLine', () => {
    it('识别 // 开头的注释行', () => {
      expect(isCommentLine('// this is a comment')).toBe(true)
      expect(isCommentLine('  // indented comment')).toBe(true)
      expect(isCommentLine('\t// tab indented')).toBe(true)
    })

    it('识别 # 开头的注释行', () => {
      expect(isCommentLine('# python comment')).toBe(true)
      expect(isCommentLine('  # shell comment')).toBe(true)
    })

    it('识别 /* 开头的注释行', () => {
      expect(isCommentLine('/* block comment start')).toBe(true)
      expect(isCommentLine('  /* indented')).toBe(true)
    })

    it('识别 * 开头的注释行', () => {
      expect(isCommentLine('* comment line')).toBe(true)
      expect(isCommentLine(' * star comment')).toBe(true)
    })

    it('识别 -- 开头的SQL注释', () => {
      expect(isCommentLine('-- SQL comment')).toBe(true)
      expect(isCommentLine('  -- indented')).toBe(true)
    })

    it('识别 ; 开头的Lisp注释', () => {
      expect(isCommentLine('; lisp comment')).toBe(true)
    })

    it('识别 % 开头的注释', () => {
      expect(isCommentLine('% LaTeX comment')).toBe(true)
    })

    it('识别 HTML/XML 注释', () => {
      expect(isCommentLine('<!-- HTML comment')).toBe(true)
      expect(isCommentLine('-->')).toBe(true)
    })

    it('空字符串不是注释', () => {
      expect(isCommentLine('')).toBe(false)
    })

    it('只有空格不是注释', () => {
      expect(isCommentLine('   ')).toBe(false)
      expect(isCommentLine('\t\t')).toBe(false)
    })

    it('代码行不是注释', () => {
      expect(isCommentLine('const x = 5;')).toBe(false)
      expect(isCommentLine('function foo() {')).toBe(false)
      expect(isCommentLine('print("hello")')).toBe(false)
    })

    it('注释后紧跟代码不是纯注释', () => {
      expect(isCommentLine('const x = 5; // inline comment')).toBe(false)
    })

    it('使用自定义前缀', () => {
      expect(isCommentLine('REM batch file', ['REM'])).toBe(true)
      expect(isCommentLine(':: batch comment', ['::'])).toBe(true)
      expect(isCommentLine('// comment', ['#'])).toBe(false)
    })
  })

  describe('getCommentPrefixesForLanguage', () => {
    it('JavaScript/TypeScript', () => {
      const prefixes = getCommentPrefixesForLanguage('javascript')
      expect(prefixes).toContain('//')
      expect(prefixes).toContain('/*')
      expect(prefixes).toContain('*/')
    })

    it('Java', () => {
      const prefixes = getCommentPrefixesForLanguage('java')
      expect(prefixes).toContain('//')
      expect(prefixes).toContain('/**')
    })

    it('Python', () => {
      const prefixes = getCommentPrefixesForLanguage('python')
      expect(prefixes).toContain('#')
      expect(prefixes).toContain("'''")
      expect(prefixes).toContain('"""')
    })

    it('SQL', () => {
      const prefixes = getCommentPrefixesForLanguage('sql')
      expect(prefixes).toContain('--')
      expect(prefixes).toContain('/*')
    })

    it('Shell/Bash', () => {
      const prefixes = getCommentPrefixesForLanguage('bash')
      expect(prefixes).toContain('#')
      expect(prefixes).not.toContain('//')
    })

    it('HTML', () => {
      const prefixes = getCommentPrefixesForLanguage('html')
      expect(prefixes).toContain('<!--')
      expect(prefixes).toContain('-->')
    })

    it('C/C++', () => {
      const prefixes = getCommentPrefixesForLanguage('cpp')
      expect(prefixes).toContain('//')
      expect(prefixes).toContain('/*')
    })

    it('Go', () => {
      const prefixes = getCommentPrefixesForLanguage('go')
      expect(prefixes).toContain('//')
    })

    it('Rust', () => {
      const prefixes = getCommentPrefixesForLanguage('rust')
      expect(prefixes).toContain('//')
    })

    it('Ruby', () => {
      const prefixes = getCommentPrefixesForLanguage('ruby')
      expect(prefixes).toContain('#')
    })

    it('Lisp/Clojure', () => {
      const prefixes = getCommentPrefixesForLanguage('clojure')
      expect(prefixes).toContain(';')
    })

    it('Lua', () => {
      const prefixes = getCommentPrefixesForLanguage('lua')
      expect(prefixes).toContain('--')
    })

    it('YAML', () => {
      const prefixes = getCommentPrefixesForLanguage('yaml')
      expect(prefixes).toContain('#')
    })

    it('大小写不敏感', () => {
      expect(getCommentPrefixesForLanguage('JavaScript')).toEqual(getCommentPrefixesForLanguage('javascript'))
      expect(getCommentPrefixesForLanguage('PYTHON')).toEqual(getCommentPrefixesForLanguage('python'))
    })

    it('未知语言返回默认前缀', () => {
      const prefixes = getCommentPrefixesForLanguage('unknown-lang')
      expect(prefixes).toEqual(DEFAULT_COMMENT_PREFIXES)
    })
  })

  describe('validateCommentPrefixes', () => {
    it('有效的字符串数组', () => {
      const result = validateCommentPrefixes(['//', '#', '--'])
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('空数组是有效的', () => {
      const result = validateCommentPrefixes([])
      expect(result.valid).toBe(true)
    })

    it('非数组返回错误', () => {
      const result = validateCommentPrefixes('//, #' as unknown as string[])
      expect(result.valid).toBe(false)
      expect(result.error).toBe('注释前缀必须是数组')
    })

    it('包含非字符串元素返回错误', () => {
      const result = validateCommentPrefixes(['//', 123 as unknown as string])
      expect(result.valid).toBe(false)
      expect(result.error).toBe('注释前缀必须是字符串')
    })

    it('包含空字符串返回错误', () => {
      const result = validateCommentPrefixes(['//', ''])
      expect(result.valid).toBe(false)
      expect(result.error).toBe('注释前缀不能为空')
    })

    it('包含纯空格字符串返回错误', () => {
      const result = validateCommentPrefixes(['//', '   '])
      expect(result.valid).toBe(false)
      expect(result.error).toBe('注释前缀不能为空')
    })
  })

  describe('DEFAULT_COMMENT_PREFIXES', () => {
    it('包含所有常见注释前缀', () => {
      expect(DEFAULT_COMMENT_PREFIXES).toContain('//')
      expect(DEFAULT_COMMENT_PREFIXES).toContain('#')
      expect(DEFAULT_COMMENT_PREFIXES).toContain('--')
      expect(DEFAULT_COMMENT_PREFIXES).toContain(';')
      expect(DEFAULT_COMMENT_PREFIXES).toContain('%')
      expect(DEFAULT_COMMENT_PREFIXES).toContain('/*')
      expect(DEFAULT_COMMENT_PREFIXES).toContain('/**')
      expect(DEFAULT_COMMENT_PREFIXES).toContain('*/')
      expect(DEFAULT_COMMENT_PREFIXES).toContain('*')
      expect(DEFAULT_COMMENT_PREFIXES).toContain("'''")
      expect(DEFAULT_COMMENT_PREFIXES).toContain('"""')
      expect(DEFAULT_COMMENT_PREFIXES).toContain('<!--')
      expect(DEFAULT_COMMENT_PREFIXES).toContain('-->')
    })

    it('是一个数组', () => {
      expect(Array.isArray(DEFAULT_COMMENT_PREFIXES)).toBe(true)
    })
  })
})
