import type { ThreeWayDiffResult, DiffLine, ConflictRegion, DiffStats, FileInfo } from '@shared/types'
import { generateConflictId } from '@shared/utils'
import { computeDiff } from './index'

/**
 * 计算三路差异（字符串版本）
 */
export async function computeThreeWayDiff(
  base: string,
  left: string,
  right: string
): Promise<ThreeWayDiffResult>

/**
 * 计算三路差异（FileInfo 版本）- 用于 CLI 和 IPC 调用
 */
export async function computeThreeWayDiff(
  base: FileInfo,
  left: FileInfo,
  right: FileInfo
): Promise<ThreeWayDiffResult>

export async function computeThreeWayDiff(
  base: string | FileInfo,
  left: string | FileInfo,
  right: string | FileInfo
): Promise<ThreeWayDiffResult> {
  // 统一处理 FileInfo 和 string 输入
  const baseContent = typeof base === 'string' ? base : base.content
  const leftContent = typeof left === 'string' ? left : left.content
  const rightContent = typeof right === 'string' ? right : right.content

  return computeThreeWayDiffInternal(baseContent, leftContent, rightContent)
}

async function computeThreeWayDiffInternal(
  base: string,
  left: string,
  right: string
): Promise<ThreeWayDiffResult> {
  const baseLines = base.split('\n')
  const leftLines = left.split('\n')
  const rightLines = right.split('\n')

  const baseVsLeft = await findChanges(baseLines, leftLines)
  const baseVsRight = await findChanges(baseLines, rightLines)

  const conflicts = detectConflicts(baseVsLeft, baseVsRight, baseLines, leftLines, rightLines)

  const lines = buildMergedLines(baseLines, leftLines, rightLines, baseVsLeft, baseVsRight, conflicts)

  const stats: DiffStats = {
    totalLines: lines.length,
    equalLines: lines.filter(l => l.type === 'equal').length,
    insertedLines: lines.filter(l => l.type === 'insert').length,
    deletedLines: lines.filter(l => l.type === 'delete').length,
    modifiedLines: lines.filter(l => l.type === 'replace').length,
    chunkCount: conflicts.length
  }

  return {
    lines,
    conflicts,
    hasConflicts: conflicts.some(c => !c.resolved),
    stats,
    computedAt: Date.now()
  }
}

interface ChangeInfo {
  lineNo: number
  type: 'insert' | 'delete' | 'replace'
  content?: string
}

async function findChanges(base: string[], modified: string[]): Promise<Map<number, ChangeInfo>> {
  const diffResult = await computeDiff(base.join('\n'), modified.join('\n'), { ignoreLineEndings: true })
  const changes = new Map<number, ChangeInfo>()

  for (const line of diffResult.lines) {
    if (line.type === 'delete') {
      changes.set(line.leftLineNo! - 1, { lineNo: line.leftLineNo! - 1, type: 'delete' })
    } else if (line.type === 'insert') {
      const baseLineNo = findPrecedingBaseLine(diffResult.lines, line.rightLineNo! - 1)
      changes.set(baseLineNo + 0.5, {
        lineNo: baseLineNo + 0.5,
        type: 'insert',
        content: line.rightContent
      })
    } else if (line.type === 'replace') {
      changes.set(line.leftLineNo! - 1, {
        lineNo: line.leftLineNo! - 1,
        type: 'replace',
        content: line.rightContent
      })
    }
  }

  return changes
}

function findPrecedingBaseLine(lines: DiffLine[], targetLineNo: number): number {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    if (line.rightLineNo === targetLineNo && line.leftLineNo !== null) {
      return line.leftLineNo - 1
    }
  }
  return 0
}

function detectConflicts(
  leftChanges: Map<number, ChangeInfo>,
  rightChanges: Map<number, ChangeInfo>,
  baseLines: string[],
  _leftLines: string[],
  _rightLines: string[]
): ConflictRegion[] {
  const conflicts: ConflictRegion[] = []
  const allKeys = new Set([...leftChanges.keys(), ...rightChanges.keys()])

  for (const key of allKeys) {
    const leftChange = leftChanges.get(key)
    const rightChange = rightChanges.get(key)

    // 只有两侧都修改了同一位置才是冲突
    if (leftChange && rightChange) {
      const leftContent = leftChange.type === 'delete' ? '' : (leftChange.content || '')
      const rightContent = rightChange.type === 'delete' ? '' : (rightChange.content || '')

      // 两侧修改内容相同则不是冲突，自动采用
      if (leftContent === rightContent) continue

      conflicts.push({
        id: generateConflictId(),
        startLine: Math.floor(key),
        endLine: Math.floor(key),
        baseContent: baseLines[Math.floor(key)] || '',
        leftContent,
        rightContent,
        resolved: false
      })
    }
  }

  return conflicts
}

function buildMergedLines(
  baseLines: string[],
  leftLines: string[],
  rightLines: string[],
  leftChanges: Map<number, ChangeInfo>,
  rightChanges: Map<number, ChangeInfo>,
  conflicts: ConflictRegion[]
): DiffLine[] {
  const lines: DiffLine[] = []
  const conflictKeys = new Set(conflicts.map(c => c.startLine))

  // 收集所有需要处理的行索引（包括 insert 的小数 key）
  const allKeys = new Set([
    ...Array.from({ length: baseLines.length }, (_, i) => i),
    ...Array.from(leftChanges.keys()),
    ...Array.from(rightChanges.keys())
  ])

  const sortedKeys = Array.from(allKeys).sort((a, b) => a - b)
  let lineNo = 1

  for (const key of sortedKeys) {
    const isInsert = !Number.isInteger(key)
    const baseIdx = Math.floor(key)

    if (isInsert) {
      // 纯插入行（key 是小数，如 2.5 表示在 base 第2行后插入）
      const leftChange = leftChanges.get(key)
      const rightChange = rightChanges.get(key)

      if (leftChange && rightChange) {
        // 两侧都在同位置插入 — 内容相同则自动合并，否则冲突（已在 detectConflicts 处理）
        const content = leftChange.content || ''
        lines.push({ leftLineNo: lineNo, rightLineNo: lineNo, type: 'insert', leftContent: '', rightContent: content })
      } else if (leftChange) {
        lines.push({ leftLineNo: lineNo, rightLineNo: lineNo, type: 'insert', leftContent: '', rightContent: leftChange.content || '' })
      } else if (rightChange) {
        lines.push({ leftLineNo: lineNo, rightLineNo: lineNo, type: 'insert', leftContent: '', rightContent: rightChange.content || '' })
      }
      lineNo++
      continue
    }

    // 整数 key — 对应 base 中的一行
    if (baseIdx >= baseLines.length) continue

    const leftChange = leftChanges.get(key)
    const rightChange = rightChanges.get(key)

    if (conflictKeys.has(key)) {
      // 冲突行：输出为 replace，内容由 ConflictRegion 决定
      const conflict = conflicts.find(c => c.startLine === key)!
      lines.push({
        leftLineNo: lineNo,
        rightLineNo: lineNo,
        type: 'replace',
        leftContent: conflict.leftContent,
        rightContent: conflict.rightContent
      })
    } else if (leftChange && !rightChange) {
      // 只有左侧修改 — 自动采用左侧
      if (leftChange.type === 'delete') {
        lines.push({ leftLineNo: lineNo, rightLineNo: null, type: 'delete', leftContent: baseLines[baseIdx], rightContent: '' })
      } else {
        lines.push({ leftLineNo: lineNo, rightLineNo: lineNo, type: 'replace', leftContent: baseLines[baseIdx], rightContent: leftChange.content || '' })
      }
    } else if (!leftChange && rightChange) {
      // 只有右侧修改 — 自动采用右侧
      if (rightChange.type === 'delete') {
        lines.push({ leftLineNo: null, rightLineNo: lineNo, type: 'delete', leftContent: baseLines[baseIdx], rightContent: '' })
      } else {
        lines.push({ leftLineNo: lineNo, rightLineNo: lineNo, type: 'replace', leftContent: baseLines[baseIdx], rightContent: rightChange.content || '' })
      }
    } else {
      // 两侧都未修改 — equal
      lines.push({ leftLineNo: lineNo, rightLineNo: lineNo, type: 'equal', leftContent: baseLines[baseIdx], rightContent: baseLines[baseIdx] })
    }
    lineNo++
  }

  // 补充 leftLines / rightLines 中超出 base 长度的尾部插入
  const maxLeft = leftLines.length
  const maxRight = rightLines.length
  const maxBase = baseLines.length
  if (maxLeft > maxBase) {
    for (let i = maxBase; i < maxLeft; i++) {
      lines.push({ leftLineNo: lineNo, rightLineNo: lineNo, type: 'insert', leftContent: '', rightContent: leftLines[i] })
      lineNo++
    }
  } else if (maxRight > maxBase) {
    for (let i = maxBase; i < maxRight; i++) {
      lines.push({ leftLineNo: lineNo, rightLineNo: lineNo, type: 'insert', leftContent: '', rightContent: rightLines[i] })
      lineNo++
    }
  }

  return lines
}
