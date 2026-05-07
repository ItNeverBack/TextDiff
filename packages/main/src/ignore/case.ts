/**
 * 大小写处理模块
 * 
 * 提供大小写相关的预处理功能
 */

/**
 * 应用大小写忽略规则（转换为小写）
 * @param line 要处理的行内容
 * @returns 转换为小写后的内容
 */
export function applyCaseIgnore(line: string): string {
  return line.toLowerCase()
}

/**
 * 应用大小写敏感比较（原样返回）
 * @param line 要处理的行内容
 * @returns 原样返回
 */
export function preserveCase(line: string): string {
  return line
}
