import type { DiffLineType } from '@shared/types'

interface DiffOp {
  type: DiffLineType
  leftIndex: number
  rightIndex: number
}

/**
 * Myers Diff 算法实现
 * 
 * 基于 Eugene Myers 的论文 "An O(ND) Difference Algorithm and Its Variations"
 * 时间复杂度: O((N+M)D)，其中 D 是编辑距离
 */

export function myersDiff(a: string[], b: string[]): DiffOp[] {
  const m = a.length
  const n = b.length

  // 边界情况
  if (m === 0 && n === 0) return []
  if (m === 0) {
    return b.map((_, i) => ({ type: 'insert' as const, leftIndex: -1, rightIndex: i }))
  }
  if (n === 0) {
    return a.map((_, i) => ({ type: 'delete' as const, leftIndex: i, rightIndex: -1 }))
  }

  // 检查是否完全相同
  if (m === n && a.every((line, i) => line === b[i])) {
    return a.map((_, i) => ({ type: 'equal' as const, leftIndex: i, rightIndex: i }))
  }

  const max = m + n
  const size = 2 * max + 1
  
  // v[k] = 在当前对角线 k 上最远到达的 x 坐标
  const v: number[] = new Array(size).fill(-1)
  
  // 记录每一步的 v 数组状态，用于回溯
  const trace: number[][] = []

  // 主循环：逐渐增加编辑距离 d
  for (let d = 0; d <= max; d++) {
    // 保存当前状态
    trace.push([...v])

    for (let k = -d; k <= d; k += 2) {
      // 决定是向下移动（插入）还是向右移动（删除）
      let x: number
      
      if (k === -d || (k !== d && v[k - 1 + max] < v[k + 1 + max])) {
        // 向下移动：来自 k+1 对角线（插入）
        x = v[k + 1 + max]
      } else {
        // 向右移动：来自 k-1 对角线（删除）
        x = v[k - 1 + max] + 1
      }

      // 计算对应的 y 坐标
      let y = x - k

      // 沿着对角线（相等的行）前进
      while (x < m && y < n && a[x] === b[y]) {
        x++
        y++
      }

      // 更新当前 k 对角线的最远 x 坐标
      v[k + max] = x

      // 如果到达终点，开始回溯
      if (x >= m && y >= n) {
        return backtrack(trace, a, b, max, d)
      }
    }
  }

  return []
}

function backtrack(
  trace: number[][], 
  a: string[], 
  b: string[], 
  max: number, 
  finalD: number
): DiffOp[] {
  const edits: Array<{ type: 'equal' | 'insert' | 'delete'; x: number; y: number }> = []
  
  let x = a.length
  let y = b.length

  // 从最后一个 d 开始回溯
  for (let d = finalD; d > 0; d--) {
    const v = trace[d]
    const k = x - y
    
    // 确定是从哪个对角线移动过来的
    const prevK = v[k - 1 + max] < v[k + 1 + max] ? k + 1 : k - 1
    const prevX = v[prevK + max]
    const prevY = prevX - prevK

    // 回溯通过对角线（相等的元素）
    while (x > prevX && y > prevY) {
      x--
      y--
      edits.unshift({ type: 'equal', x, y })
    }

    // 记录编辑操作
    if (x === prevX) {
      // y 减少了，说明是插入
      edits.unshift({ type: 'insert', x: prevX, y: prevY })
      y = prevY
    } else {
      // x 减少了，说明是删除
      edits.unshift({ type: 'delete', x: prevX, y: prevY })
      x = prevX
    }
  }

  // 处理 d=0 时的对角线（初始的相等部分）
  while (x > 0 && y > 0) {
    x--
    y--
    edits.unshift({ type: 'equal', x, y })
  }

  // 转换为 DiffOp 格式
  return edits.map(edit => {
    switch (edit.type) {
      case 'equal':
        return { type: 'equal' as const, leftIndex: edit.x, rightIndex: edit.y }
      case 'insert':
        return { type: 'insert' as const, leftIndex: -1, rightIndex: edit.y }
      case 'delete':
        return { type: 'delete' as const, leftIndex: edit.x, rightIndex: -1 }
    }
  })
}
