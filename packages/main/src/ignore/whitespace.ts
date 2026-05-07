/**
 * 空白符处理模块
 * 
 * 提供空白符相关的预处理功能
 */

import type { WhitespaceMode } from '@shared/types'

/**
 * 应用空白符忽略规则
 * @param line 要处理的行内容
 * @param mode 空白符处理模式
 * @returns 处理后的行内容
 */
export function applyWhitespaceIgnore(line: string, mode: WhitespaceMode): string {
  switch (mode) {
    case 'all':
      // 移除所有空白字符
      return line.replace(/\s+/g, '')
    case 'leading-trailing':
      // 移除首尾空白字符
      return line.trim()
    case 'none':
    default:
      // 不处理
      return line
  }
}

/**
 * 标准化空白字符
 * 将多种空白字符统一为空格，连续空格合并为单个空格
 * @param line 要处理的行内容
 * @returns 标准化后的行内容
 */
export function normalizeWhitespace(line: string): string {
  return line.replace(/\s+/g, ' ').trim()
}

/**
 * 移除行尾空白字符
 * @param line 要处理的行内容
 * @returns 处理后的行内容
 */
export function trimTrailingWhitespace(line: string): string {
  return line.replace(/[ \t]+$/g, '')
}

/**
 * 移除行首空白字符
 * @param line 要处理的行内容
 * @returns 处理后的行内容
 */
export function trimLeadingWhitespace(line: string): string {
  return line.replace(/^[ \t]+/g, '')
}
