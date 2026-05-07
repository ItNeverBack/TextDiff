/**
 * Utility functions
 * 工具函数
 */

/**
 * 合并多个类名
 * 简单实现 - 过滤 falsy 值并用空格连接
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export default { cn }