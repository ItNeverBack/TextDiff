/**
 * 正则模式匹配忽略模块
 * 
 * 提供基于正则表达式的行过滤功能
 * 允许用户定义自定义正则规则来忽略特定行
 */

/**
 * 检查单行是否匹配任何忽略模式
 * @param line 要检查的行内容
 * @param patterns 正则表达式模式列表
 * @returns 如果匹配则返回 true（应该忽略该行）
 */
export function shouldIgnoreLine(line: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern)
      if (regex.test(line)) {
        return true
      }
    } catch {
      // 无效的正则表达式，跳过
      continue
    }
  }
  return false
}

/**
 * 验证正则表达式是否有效
 * @param pattern 正则表达式字符串
 * @returns 是否有效
 */
export function isValidPattern(pattern: string): boolean {
  try {
    new RegExp(pattern)
    return true
  } catch {
    return false
  }
}

/**
 * 过滤掉匹配模式的行
 * @param lines 原始行数组
 * @param patterns 正则表达式模式列表
 * @returns 过滤后的结果
 */
export function filterLinesByPatterns(
  lines: string[],
  patterns: string[]
): {
  /** 过滤后的行 */
  filtered: string[]
  /** 保留的行的原始索引 */
  indices: number[]
  /** 被过滤掉的行的数量 */
  ignoredCount: number
} {
  const filtered: string[] = []
  const indices: number[] = []
  let ignoredCount = 0

  for (let i = 0; i < lines.length; i++) {
    if (!shouldIgnoreLine(lines[i], patterns)) {
      filtered.push(lines[i])
      indices.push(i)
    } else {
      ignoredCount++
    }
  }

  return { filtered, indices, ignoredCount }
}

/**
 * 常用的正则表达式预设规则
 */
export const COMMON_PATTERNS = {
  /** 单行注释 */
  singleLineComment: {
    '//': '^\\s*//.*$',
    '#': '^\\s*#.*$',
    '--': '^\\s*--.*$',
    ';': '^\\s*;.*$',
    '%': '^\\s*%.*$'
  },
  /** 空白行 */
  emptyLine: '^\\s*$',
  /** 仅包含空格或制表符的行 */
  whitespaceOnly: '^[ \\t]+$',
  /** XML/HTML 注释 */
  xmlComment: '<!--[\\s\\S]*?-->',
  /** 多行注释开始（简化版） */
  blockCommentStart: '^\\s*/\\*',
  /** 多行注释结束 */
  blockCommentEnd: '\\*/\\s*$'
} as const

/**
 * 获取预设规则列表
 * @returns 预设的正则表达式列表
 */
export function getPresetPatterns(): string[] {
  return [
    COMMON_PATTERNS.emptyLine,
    COMMON_PATTERNS.whitespaceOnly
  ]
}
