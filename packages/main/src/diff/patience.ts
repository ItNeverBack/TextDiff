/**
 * Patience Diff 算法实现
 * 
 * Patience Diff 是一种基于最长递增子序列（LIS）的 diff 算法。
 * 它的特点是：
 * 1. 优先匹配唯一的、有序的行，产生更清晰的 diff
 * 2. 对于代码文件通常比 Myers 算法产生更好的结果
 * 3. 是 Git 中 patience 算法的参考实现
 * 
 * §2.1.2 DiffEngine 子模块 - patience.ts
 * 
 * 算法步骤：
 * 1. 找出两侧文件中都只出现一次的行（unique lines）
 * 2. 在这些唯一行上计算最长公共子序列（LCS）
 * 3. 以这些匹配的锚点将文件分割成更小的区域
 * 4. 对每个子区域递归应用相同算法
 * 5. 对于无法匹配的行，使用 Myers 算法处理
 */

import type { DiffLineType } from '@shared/types'
import { myersDiff } from './myers'

interface DiffOp {
  type: DiffLineType
  leftIndex: number
  rightIndex: number
}

/**
 * Patience Diff 主入口
 * @param a 左侧文件行数组
 * @param b 右侧文件行数组
 * @returns 差异操作数组
 */
export function patienceDiff(a: string[], b: string[]): DiffOp[] {
  if (a.length === 0 && b.length === 0) return []
  if (a.length === 0) {
    return b.map((_, i) => ({ type: 'insert' as const, leftIndex: -1, rightIndex: i }))
  }
  if (b.length === 0) {
    return a.map((_, i) => ({ type: 'delete' as const, leftIndex: i, rightIndex: -1 }))
  }

  return patienceDiffInternal(a, b, 0, 0)
}

/**
 * 内部递归函数
 * @param a 左侧文件行数组
 * @param b 右侧文件行数组
 * @param aOffset 左侧起始偏移
 * @param bOffset 右侧起始偏移
 */
function patienceDiffInternal(
  a: string[],
  b: string[],
  aOffset: number,
  bOffset: number
): DiffOp[] {
  // 找到两侧都只出现一次的行
  const uniqueA = findUniqueLines(a)
  const uniqueB = findUniqueLines(b)

  // 找到两侧都存在的唯一行的索引
  const commonUnique: Array<[number, number]> = []
  for (const [line, indexA] of uniqueA.entries()) {
    const indexB = uniqueB.get(line)
    if (indexB !== undefined) {
      commonUnique.push([indexA, indexB])
    }
  }

  // 如果没有共同唯一行，回退到 Myers 算法
  if (commonUnique.length === 0) {
    const ops = myersDiff(a, b)
    // 调整索引偏移
    return ops.map(op => ({
      type: op.type,
      leftIndex: op.leftIndex !== -1 ? op.leftIndex + aOffset : -1,
      rightIndex: op.rightIndex !== -1 ? op.rightIndex + bOffset : -1
    }))
  }

  // 计算最长递增子序列（基于右侧索引）
  const lis = computeLIS(commonUnique.map(([_, bIdx]) => bIdx))
  const matches = new Set(lis)
  const sortedMatches = commonUnique.filter((_, i) => matches.has(i))
    .sort((a, b) => a[0] - b[0])

  const result: DiffOp[] = []
  let lastA = -1
  let lastB = -1

  for (const [aIdx, bIdx] of sortedMatches) {
    // 处理当前匹配前的区域
    if (aIdx > lastA + 1 || bIdx > lastB + 1) {
      const subA = a.slice(lastA + 1, aIdx)
      const subB = b.slice(lastB + 1, bIdx)

      if (subA.length > 0 || subB.length > 0) {
        // 递归处理子区域
        const subOps = patienceDiffInternal(
          subA,
          subB,
          aOffset + lastA + 1,
          bOffset + lastB + 1
        )
        result.push(...subOps)
      }
    }

    // 添加当前匹配（equal）
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
      const subOps = patienceDiffInternal(
        subA,
        subB,
        aOffset + lastA + 1,
        bOffset + lastB + 1
      )
      result.push(...subOps)
    }
  }

  return mergeReplaceOperations(result)
}

/**
 * 找出数组中只出现一次的行及其索引
 * @param lines 行数组
 * @returns Map<行内容, 索引>
 */
function findUniqueLines(lines: string[]): Map<string, number> {
  const count = new Map<string, number>()
  const firstIndex = new Map<string, number>()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    count.set(line, (count.get(line) || 0) + 1)
    if (!firstIndex.has(line)) {
      firstIndex.set(line, i)
    }
  }

  const unique = new Map<string, number>()
  for (const [line, cnt] of count.entries()) {
    if (cnt === 1) {
      unique.set(line, firstIndex.get(line)!)
    }
  }

  return unique
}

/**
 * 计算最长递增子序列（LIS）
 * 使用耐心排序的 O(n log n) 算法
 * @param arr 数组
 * @returns LIS 中元素的原数组索引集合
 */
function computeLIS(arr: number[]): Set<number> {
  if (arr.length === 0) return new Set()

  // tails[i] = 长度为 i+1 的递增子序列的最小结尾值
  const tails: number[] = []
  // tailsIndex[i] = 上述序列在原始数组中的索引
  const tailsIndex: number[] = []
  // prev[i] = 以 arr[i] 结尾的 LIS 中，前一个元素的索引
  const prev: number[] = new Array(arr.length).fill(-1)

  for (let i = 0; i < arr.length; i++) {
    const x = arr[i]
    // 二分查找 tails 中第一个 >= x 的位置
    let left = 0
    let right = tails.length

    while (left < right) {
      const mid = Math.floor((left + right) / 2)
      if (tails[mid] < x) {
        left = mid + 1
      } else {
        right = mid
      }
    }

    if (left === tails.length) {
      tails.push(x)
      tailsIndex.push(i)
    } else {
      tails[left] = x
      tailsIndex[left] = i
    }

    if (left > 0) {
      prev[i] = tailsIndex[left - 1]
    }
  }

  // 重建 LIS
  const lis = new Set<number>()
  let curr = tailsIndex[tailsIndex.length - 1]
  while (curr !== -1) {
    lis.add(curr)
    curr = prev[curr]
  }

  return lis
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
