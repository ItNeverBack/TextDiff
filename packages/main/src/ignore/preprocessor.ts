/**
 * 忽略规则预处理器组合模块
 * 
 * 组合所有忽略规则处理器，提供统一的预处理接口
 * 作为 DiffEngine 的前置处理步骤
 * Week 11: 增强注释行忽略功能
 */

import type { WhitespaceMode } from '@shared/types'
import { applyWhitespaceIgnore } from './whitespace'
import { applyCaseIgnore } from './case'
import { applyLineEndingIgnore } from './line-ending'
import { shouldIgnoreLine } from './pattern'
import { isCommentLine, DEFAULT_COMMENT_PREFIXES } from './index'

export interface PreprocessOptions {
  /** 空白符处理模式 */
  ignoreWhitespace: WhitespaceMode
  /** 是否忽略大小写 */
  ignoreCase: boolean
  /** 是否忽略行尾符差异 */
  ignoreLineEndings: boolean
  /** 要忽略的正则表达式模式列表 */
  ignorePatterns: string[]
  /** 是否忽略注释行 */
  ignoreComments?: boolean
  /** 注释前缀列表 */
  commentPrefixes?: string[]
}

export interface PreprocessResult {
  /** 原始行数组（未处理） */
  originalLines: string[]
  /** 预处理后的行数组（用于比较） */
  processedLines: string[]
  /** 过滤后保留的行（原始内容） */
  filtered: string[]
  /** 保留的行索引（过滤后的原始索引） */
  indices: number[]
  /** 被过滤的行数 */
  ignoredLineCount: number
}

/**
 * 对单行应用预处理
 * @param line 要处理的行内容
 * @param options 预处理选项
 * @returns 处理后的行内容
 */
export function preprocessLine(line: string, options: Partial<PreprocessOptions>): string {
  const {
    ignoreWhitespace = 'none',
    ignoreCase = false,
    // 注意：行尾符已经在 split 之前处理了，这里不需要再次处理
    // ignoreLineEndings = true
  } = options

  let processed = line

  // 1. 处理空白符
  if (ignoreWhitespace !== 'none') {
    processed = applyWhitespaceIgnore(processed, ignoreWhitespace)
  }

  // 2. 处理大小写
  if (ignoreCase) {
    processed = applyCaseIgnore(processed)
  }

  return processed
}

/**
 * 对整个文本内容应用预处理
 * @param content 要处理的文本内容
 * @param options 预处理选项
 * @returns 预处理结果
 */
export function preprocessContent(
  content: string,
  options: PreprocessOptions
): PreprocessResult {
  // 如果需要忽略行尾符，在 split 之前先统一处理
  let processedContent = content
  if (options.ignoreLineEndings) {
    processedContent = processedContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  }

  // 处理空内容的边界情况：''.split('\n') 返回 ['']，但我们想要 []
  // 同时处理文件以换行符结尾的情况：移除末尾的空行
  let originalLines: string[]
  if (processedContent.length === 0) {
    originalLines = []
  } else {
    originalLines = processedContent.split('\n')
    // 如果文件以换行符结尾，split 会产生一个末尾空字符串，需要移除
    if (originalLines.length > 0 && originalLines[originalLines.length - 1] === '') {
      originalLines.pop()
    }
  }
  const processedLines: string[] = []
  const filtered: string[] = []
  const indices: number[] = []
  let ignoredLineCount = 0

  const {
    ignoreComments = false,
    commentPrefixes = DEFAULT_COMMENT_PREFIXES
  } = options

  for (let i = 0; i < originalLines.length; i++) {
    const line = originalLines[i]

    // 检查是否需要忽略该行（基于正则模式）
    if (shouldIgnoreLine(line, options.ignorePatterns)) {
      ignoredLineCount++
      continue
    }

    // 检查是否是注释行
    if (ignoreComments && commentPrefixes.length > 0) {
      if (isCommentLine(line, commentPrefixes)) {
        ignoredLineCount++
        continue
      }
    }

    // 保存过滤后的原始行
    filtered.push(line)

    // 应用其他预处理规则
    const processed = preprocessLine(line, options)

    processedLines.push(processed)
    indices.push(i)
  }

  return {
    originalLines,
    processedLines,
    filtered,
    indices,
    ignoredLineCount
  }
}

/**
 * 仅应用比较相关的预处理（不包括正则过滤）
 * 用于 DiffEngine 内部的行级比较
 * @param lines 行数组
 * @param options 预处理选项
 * @returns 处理后的行数组
 */
export function preprocessLinesForComparison(
  lines: string[],
  options: Partial<Omit<PreprocessOptions, 'ignorePatterns'>>
): string[] {
  const {
    ignoreWhitespace = 'none',
    ignoreCase = false,
    ignoreLineEndings = true
  } = options

  return lines.map(line => {
    let processed = line

    if (ignoreLineEndings) {
      processed = applyLineEndingIgnore(processed)
    }

    if (ignoreWhitespace !== 'none') {
      processed = applyWhitespaceIgnore(processed, ignoreWhitespace)
    }

    if (ignoreCase) {
      processed = applyCaseIgnore(processed)
    }

    return processed
  })
}
