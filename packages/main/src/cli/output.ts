import type { DiffResult } from '@shared/types'

/**
 * 输出格式化模块
 * 支持 unified diff 和 side-by-side 格式
 * 
 * 参考: TextDiff-DevPlan.md §2.8.1 CLI 模块
 */

/**
 * 生成 Unified Diff 格式输出
 * 符合标准 unified diff 格式，可被 patch 命令使用
 */
export function outputUnifiedDiff(
  result: DiffResult,
  leftPath: string,
  rightPath: string
): string {
  const lines: string[] = []
  
  // 文件头
  lines.push(`--- ${leftPath}`)
  lines.push(`+++ ${rightPath}`)

  for (const chunk of result.chunks) {
    // 计算 hunk 范围
    const oldStart = chunk.leftLineRange[0]
    const oldCount = chunk.leftLineRange[1] - chunk.leftLineRange[0] + 1
    const newStart = chunk.rightLineRange[0]
    const newCount = chunk.rightLineRange[1] - chunk.rightLineRange[0] + 1

    // Hunk 头
    const oldRange = oldCount === 0 ? `${oldStart},0` : `${oldStart},${oldCount}`
    const newRange = newCount === 0 ? `${newStart},0` : `${newStart},${newCount}`
    lines.push(`@@ -${oldRange} +${newRange} @@`)

    // Hunk 内容
    for (let i = chunk.startIndex; i <= chunk.endIndex; i++) {
      const line = result.lines[i]
      if (!line) continue

      switch (line.type) {
        case 'equal':
          lines.push(` ${line.leftContent}`)
          break
        case 'delete':
          lines.push(`-${line.leftContent}`)
          break
        case 'insert':
          lines.push(`+${line.rightContent}`)
          break
        case 'replace':
          // Replace 在 unified diff 中表示为先删除后插入
          lines.push(`-${line.leftContent}`)
          lines.push(`+${line.rightContent}`)
          break
      }
    }
  }

  return lines.join('\n')
}

/**
 * 生成 Side-by-Side Diff 格式输出
 * 类似传统 diff 工具的并排显示
 */
export function outputSideBySideDiff(
  result: DiffResult,
  leftPath: string,
  rightPath: string
): string {
  const lines: string[] = []
  const maxLineNoWidth = 6
  const contentWidth = 60

  // 标题行
  lines.push(formatSideBySideHeader(leftPath, rightPath, contentWidth))
  lines.push('─'.repeat(maxLineNoWidth + contentWidth + maxLineNoWidth + contentWidth + 6))

  for (const line of result.lines) {
    const formatted = formatSideBySideLine(line, maxLineNoWidth, contentWidth)
    lines.push(formatted)
  }

  // 统计信息
  lines.push('')
  lines.push('统计信息:')
  lines.push(`  差异块: ${result.stats.chunkCount}`)
  lines.push(`  新增行: ${result.stats.insertedLines}`)
  lines.push(`  删除行: ${result.stats.deletedLines}`)
  lines.push(`  修改行: ${result.stats.modifiedLines}`)

  return lines.join('\n')
}

/**
 * 格式化并排 diff 的标题行
 */
function formatSideBySideHeader(leftPath: string, rightPath: string, width: number): string {
  const leftTitle = truncate(leftPath, width)
  const rightTitle = truncate(rightPath, width)
  return `  ${padRight(leftTitle, width)} |   ${padRight(rightTitle, width)}`
}

/**
 * 格式化单行的并排显示
 */
function formatSideBySideLine(
  line: DiffLine,
  lineNoWidth: number,
  contentWidth: number
): string {
  const leftLineNo = line.leftLineNo?.toString() ?? ''
  const rightLineNo = line.rightLineNo?.toString() ?? ''
  
  const leftContent = truncate(line.leftContent, contentWidth)
  const rightContent = truncate(line.rightContent, contentWidth)

  const marker = getDiffMarker(line.type)

  return `${padLeft(leftLineNo, lineNoWidth)} ${padRight(leftContent, contentWidth)} ${marker} ${padLeft(rightLineNo, lineNoWidth)} ${padRight(rightContent, contentWidth)}`
}

/**
 * 获取差异类型标记
 */
function getDiffMarker(type: string): string {
  switch (type) {
    case 'equal':
      return '│'
    case 'delete':
      return '◀'
    case 'insert':
      return '▶'
    case 'replace':
      return '≠'
    default:
      return '│'
  }
}

/**
 * 截断字符串到指定长度
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength - 3) + '...'
}

/**
 * 右填充字符串
 */
function padRight(str: string, length: number): string {
  if (str.length >= length) return str
  return str + ' '.repeat(length - str.length)
}

/**
 * 左填充字符串
 */
function padLeft(str: string, length: number): string {
  if (str.length >= length) return str
  return ' '.repeat(length - str.length) + str
}

// 类型定义
interface DiffLine {
  leftLineNo: number | null
  rightLineNo: number | null
  type: string
  leftContent: string
  rightContent: string
}
