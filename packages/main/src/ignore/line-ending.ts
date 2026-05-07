/**
 * 行尾符处理模块
 * 
 * 提供行尾符（Line Endings）相关的预处理功能
 * 处理 CRLF (\r\n)、CR (\r)、LF (\n) 之间的差异
 */

/**
 * 标准化行尾符为 LF (\n)
 * @param line 要处理的行内容
 * @returns 标准化后的行内容
 */
export function applyLineEndingIgnore(line: string): string {
  return line.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

/**
 * 将行尾符统一为 CRLF (\r\n)
 * @param line 要处理的行内容
 * @returns 处理后的行内容
 */
export function toCRLF(line: string): string {
  return line.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n')
}

/**
 * 将行尾符统一为 CR (\r)
 * @param line 要处理的行内容
 * @returns 处理后的行内容
 */
export function toCR(line: string): string {
  return line.replace(/\r\n/g, '\r').replace(/\n/g, '\r')
}

/**
 * 将行尾符统一为 LF (\n)
 * @param line 要处理的行内容
 * @returns 处理后的行内容
 */
export function toLF(line: string): string {
  return line.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

/**
 * 检测文本的行尾符类型
 * @param content 要检测的文本内容
 * @returns 检测到的行尾符类型
 */
export function detectLineEnding(content: string): 'lf' | 'crlf' | 'cr' | 'mixed' {
  const hasCRLF = content.includes('\r\n')
  const hasCR = content.includes('\r')
  const hasLF = content.includes('\n')

  if (hasCRLF && !hasCR && !hasLF) {
    // 实际上 hasCRLF 也意味着 hasCR 和 hasLF，所以需要更精确的检查
    const crlfCount = (content.match(/\r\n/g) || []).length
    const crCount = (content.match(/\r/g) || []).length
    const lfCount = (content.match(/\n/g) || []).length

    if (crlfCount === crCount && crlfCount === lfCount) {
      return 'crlf'
    }
  }

  if (hasCR && !hasLF) return 'cr'
  if (hasLF && !hasCR) return 'lf'
  if (hasCR || hasLF) return 'mixed'

  return 'lf' // 默认
}
