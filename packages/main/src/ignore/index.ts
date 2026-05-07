/**
 * IgnoreRuleEngine 模块
 * 
 * 管理差异忽略规则，包括空白符、大小写、行尾符、正则表达式、注释行等。
 * 
 * §2.4 IgnoreRuleEngine 模块设计
 * Week 11: 增强 - 添加注释行忽略支持
 */

import type { WhitespaceMode } from '@shared/types'

export type { WhitespaceMode }

/**
 * 忽略规则选项
 */
export interface IgnoreRuleOptions {
  /** 空白符处理模式 */
  ignoreWhitespace: WhitespaceMode
  /** 是否忽略大小写 */
  ignoreCase: boolean
  /** 是否忽略行尾符差异 */
  ignoreLineEndings: boolean
  /** 正则表达式忽略模式列表 */
  ignorePatterns: string[]
  /** 是否忽略注释行 */
  ignoreComments?: boolean
  /** 注释前缀列表（如 ['//', '#', '--']） */
  commentPrefixes?: string[]
}

/**
 * 默认注释前缀列表
 * 支持多种编程语言的注释风格
 */
export const DEFAULT_COMMENT_PREFIXES: string[] = [
  '//',   // C/C++, Java, JavaScript, TypeScript, Go 等
  '#',    // Python, Ruby, Shell, YAML 等
  '--',   // SQL, Lua, Haskell 等
  ';',    // Lisp, Clojure, Assembly 等
  '%',    // Prolog, Erlang, LaTeX 等
  '*',    // 块注释中间行（如 /* ... */ 中的 * 开头行）
  '/*',   // C 风格块注释开始
  '/**',  // JSDoc 风格注释
  '*/',   // 块注释结束
  "'''",  // Python 文档字符串
  '"""',  // Python 文档字符串
  '<!--', // HTML/XML 注释
  '-->'   // HTML/XML 注释结束
]

/**
 * 检查行是否是注释行
 * @param line 要检查的行内容
 * @param prefixes 注释前缀列表
 * @returns 如果是注释行返回 true
 */
export function isCommentLine(line: string, prefixes: string[] = DEFAULT_COMMENT_PREFIXES): boolean {
  const trimmed = line.trim()
  if (trimmed.length === 0) return false

  for (const prefix of prefixes) {
    if (trimmed.startsWith(prefix)) {
      return true
    }
  }
  return false
}

/**
 * 创建语言特定的注释前缀
 * @param language 编程语言
 * @returns 注释前缀列表
 */
export function getCommentPrefixesForLanguage(language: string): string[] {
  const lang = language.toLowerCase()

  switch (lang) {
    case 'javascript':
    case 'typescript':
    case 'java':
    case 'c':
    case 'cpp':
    case 'csharp':
    case 'go':
    case 'kotlin':
    case 'swift':
    case 'rust':
      return ['//', '/*', '/**', '*', '*/']
    case 'python':
      return ['#', "'''", '"""']
    case 'sql':
    case 'mysql':
    case 'postgresql':
      return ['--', '/*', '*', '*/']
    case 'shell':
    case 'bash':
    case 'zsh':
    case 'powershell':
      return ['#']
    case 'ruby':
    case 'perl':
      return ['#']
    case 'lisp':
    case 'clojure':
    case 'scheme':
      return [';']
    case 'html':
    case 'xml':
    case 'svg':
      return ['<!--', '-->']
    case 'yaml':
    case 'yml':
      return ['#']
    case 'ini':
    case 'toml':
      return ['#', ';']
    case 'erlang':
    case 'prolog':
      return ['%']
    case 'lua':
      return ['--']
    case 'haskell':
      return ['--', '{-']
    case 'matlab':
      return ['%']
    case 'fortran':
      return ['!', 'C', 'c', '*']
    case 'assembly':
    case 'asm':
      return [';', '#', '//', '*']
    default:
      return DEFAULT_COMMENT_PREFIXES
  }
}

/**
 * 验证注释前缀配置
 * @param prefixes 注释前缀列表
 * @returns 验证结果
 */
export function validateCommentPrefixes(prefixes: string[]): { valid: boolean; error?: string } {
  if (!Array.isArray(prefixes)) {
    return { valid: false, error: '注释前缀必须是数组' }
  }

  for (const prefix of prefixes) {
    if (typeof prefix !== 'string') {
      return { valid: false, error: '注释前缀必须是字符串' }
    }
    if (prefix.trim().length === 0) {
      return { valid: false, error: '注释前缀不能为空' }
    }
  }

  return { valid: true }
}

// 导出子模块
export * from './whitespace'
export * from './case'
export * from './line-ending'
export * from './pattern'
export * from './preprocessor'
