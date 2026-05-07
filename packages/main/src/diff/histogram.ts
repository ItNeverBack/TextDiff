/**
 * Histogram Diff 算法实现
 * 
 * Histogram 算法是 Patience 算法的改进版本，由 Git 开发。
 * 主要改进：
 * 1. 不只考虑唯一行（出现1次），也考虑出现次数较少的行（可配置阈值）
 * 2. 使用直方图分析找到最可能的匹配锚点
 * 3. 在处理大文件时通常比 Patience 算法更快
 * 4. 对于某些类型的代码变更产生更清晰的 diff
 * 
 * §2.1.2 DiffEngine 子模块 - histogram.ts
 * 
 * 算法步骤：
 * 1. 计算两侧文件中每行出现的次数
 * 2. 选择出现次数低于阈值的行作为候选匹配
 * 3. 优先选择两侧出现次数相近的候选行
 * 4. 计算最长公共子序列（LCS）
 * 5. 以匹配的锚点分割文件，递归处理子区域
 * 6. 对未匹配区域使用 Myers 算法
 */

import type { DiffLineType } from '@shared/types'
import { myersDiff } from './myers'

interface DiffOp {
  type: DiffLineType
  leftIndex: number
  rightIndex: number
}

interface LineFrequency {
  count: number
  indices: number[]
}

// 默认阈值：行出现次数超过此值则不参与直方图匹配
const DEFAULT_MAX_FREQUENCY = 100

/**
 * Histogram Diff 主入口
 * @param a 左侧文件行数组
 * @param b 右侧文件行数组
 * @param maxFreq 最大频率阈值（可选，默认100）
 * @returns 差异操作数组
 */
export function histogramDiff(
  a: string[],
  b: string[],
  maxFreq: number = DEFAULT_MAX_FREQUENCY
): DiffOp[] {
  if (a.length === 0 && b.length === 0) return []
  if (a.length === 0) {
    return b.map((_, i) => ({ type: 'insert' as const, leftIndex: -1, rightIndex: i }))
  }
  if (b.length === 0) {
    return a.map((_, i) => ({ type: 'delete' as const, leftIndex: i, rightIndex: -1 }))
  }

  return histogramDiffInternal(a, b, 0, 0, maxFreq)
}

/**
 * 内部递归函数
 */
function histogramDiffInternal(
  a: string[],
  b: string[],
  aOffset: number,
  bOffset: number,
  maxFreq: number
): DiffOp[] {
  // 计算频率直方图
  const freqA = computeFrequency(a)
  const freqB = computeFrequency(b)

  // 找到候选匹配行（出现次数较少且在两侧都存在的行）
  const candidates: Array<[number, number, number]> = [] // [aIdx, bIdx, score]

  for (const [line, freqAInfo] of freqA.entries()) {
    const freqBInfo = freqB.get(line)
    if (!freqBInfo) continue

    // 只考虑出现次数在阈值内的行
    if (freqAInfo.count > maxFreq || freqBInfo.count > maxFreq) continue

    // 计算匹配分数：出现次数越接近，分数越高
    const frequencyDiff = Math.abs(freqAInfo.count - freqBInfo.count)
    const score = maxFreq - frequencyDiff

    // 为每一对可能的匹配添加候选
    for (const aIdx of freqAInfo.indices) {
      for (const bIdx of freqBInfo.indices) {
        candidates.push([aIdx, bIdx, score])
      }
    }
  }

  // 按分数降序排序，分数相同则按索引升序
  candidates.sort((x, y) => {
    if (y[2] !== x[2]) return y[2] - x[2]
    if (x[0] !== y[0]) return x[0] - y[0]
    return x[1] - y[1]
  })

  // 如果没有候选匹配，回退到 Myers 算法
  if (candidates.length === 0) {
    const ops = myersDiff(a, b)
    return ops.map(op => ({
      type: op.type,
      leftIndex: op.leftIndex !== -1 ? op.leftIndex + aOffset : -1,
      rightIndex: op.rightIndex !== -1 ? op.rightIndex + bOffset : -1
    }))
  }

  // 选择不冲突的匹配（类似最长公共子序列）
  const selectedMatches = selectNonConflictingMatches(candidates)

  // 按左侧索引排序
  selectedMatches.sort((a, b) => a[0] - b[0])

  const result: DiffOp[] = []
  let lastA = -1
  let lastB = -1

  for (const [aIdx, bIdx] of selectedMatches) {
    // 确保匹配是有序的（bIdx 必须递增）
    if (bIdx <= lastB) continue

    // 处理当前匹配前的区域
    if (aIdx > lastA + 1 || bIdx > lastB + 1) {
      const subA = a.slice(lastA + 1, aIdx)
      const subB = b.slice(lastB + 1, bIdx)

      if (subA.length > 0 || subB.length > 0) {
        const subOps = histogramDiffInternal(
          subA,
          subB,
          aOffset + lastA + 1,
          bOffset + lastB + 1,
          maxFreq
        )
        result.push(...subOps)
      }
    }

    // 添加当前匹配
    result.push({
      type: 'equal',
      leftIndex: aIdx + aOffset,
      rightIndex: bIdx + bOffset
    })

    lastA = aIdx
    lastB = bIdx
  }

  // 处理最后一个匹配后的区域
  if (lastA < a.length - 1 || lastB < b.length - 1) {
    const subA = a.slice(lastA + 1)
    const subB = b.slice(lastB + 1)

    if (subA.length > 0 || subB.length > 0) {
      const subOps = histogramDiffInternal(
        subA,
        subB,
        aOffset + lastA + 1,
        bOffset + lastB + 1,
        maxFreq
      )
      result.push(...subOps)
    }
  }

  return mergeReplaceOperations(result)
}

/**
 * 计算数组中每行的出现频率
 * @param lines 行数组
 * @returns Map<行内容, 频率信息>
 */
function computeFrequency(lines: string[]): Map<string, LineFrequency> {
  const freq = new Map<string, LineFrequency>()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const info = freq.get(line)
    if (info) {
      info.count++
      info.indices.push(i)
    } else {
      freq.set(line, { count: 1, indices: [i] })
    }
  }

  return freq
}

/**
 * 从候选匹配中选择不冲突的匹配
 * 使用贪心算法：按分数排序，选择不冲突的匹配
 * @param candidates 候选匹配数组 [aIdx, bIdx, score]
 * @returns 选中的匹配数组
 */
function selectNonConflictingMatches(
  candidates: Array<[number, number, number]>
): Array<[number, number]> {
  const selected: Array<[number, number]> = []
  const usedA = new Set<number>()
  const usedB = new Set<number>()

  for (const [aIdx, bIdx, _score] of candidates) {
    // 检查是否与已选匹配冲突
    if (usedA.has(aIdx) || usedB.has(bIdx)) continue

    // 检查顺序约束：新匹配的 aIdx 和 bIdx 必须都大于之前所有匹配的对应索引
    let valid = true
    for (const [selA, selB] of selected) {
      if ((aIdx > selA && bIdx < selB) || (aIdx < selA && bIdx > selB)) {
        valid = false
        break
      }
    }

    if (valid) {
      selected.push([aIdx, bIdx])
      usedA.add(aIdx)
      usedB.add(bIdx)
    }
  }

  return selected
}

/**
 * 合并相邻的 delete + insert 为 replace
 */
function mergeReplaceOperations(ops: DiffOp[]): DiffOp[] {
  const result: DiffOp[] = []

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]

    if (op.type === 'delete') {
      const nextOp = ops[i + 1]
      if (nextOp && nextOp.type === 'insert') {
        result.push({
          type: 'replace',
          leftIndex: op.leftIndex,
          rightIndex: nextOp.rightIndex
        })
        i++
        continue
      }
    }

    result.push(op)
  }

  return result
}
