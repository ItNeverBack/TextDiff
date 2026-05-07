import type { DiffLine, DiffResult, DiffOptions, DiffChunk } from '@shared/types'
import { computeDiff } from './index'

/**
 * 变更区域描述
 */
interface ChangeRegion {
  startLine: number
  endLine: number
  type: 'insert' | 'delete' | 'replace'
}

/**
 * 增量 Diff 配置
 */
export interface IncrementalDiffOptions {
  /**
   * 启用增量 diff
   */
  enabled: boolean
  
  /**
   * 最大变更行数阈值，超过则使用完整 diff
   */
  maxChangedLines: number
  
  /**
   * 上下文保留行数
   */
  contextLines: number
}

/**
 * 计算文本差异（支持增量更新）
 * Week 12 性能优化：增量 diff
 * 
 * @param left 新的左侧内容
 * @param right 新的右侧内容
 * @param previousResult 之前的 diff 结果（可选）
 * @param previousLeft 之前的左侧内容（可选）
 * @param previousRight 之前的右侧内容（可选）
 * @param options diff 选项
 * @returns 新的 diff 结果
 */
export async function computeIncrementalDiff(
  left: string,
  right: string,
  previousResult: DiffResult | null,
  previousLeft: string | null,
  previousRight: string | null,
  options: DiffOptions
): Promise<DiffResult> {
  // 如果没有之前的结果或内容，执行完整 diff
  if (!previousResult || !previousLeft || !previousRight) {
    console.log('[IncrementalDiff] No previous result, computing full diff')
    return computeDiff(left, right, options)
  }

  // 检测变更区域
  const leftChanges = detectChanges(previousLeft, left)
  const rightChanges = detectChanges(previousRight, right)

  // 如果变更区域太大或无法确定，执行完整 diff
  const totalChangedLines = leftChanges.length + rightChanges.length
  if (totalChangedLines > 100) {
    console.log('[IncrementalDiff] Too many changes, computing full diff')
    return computeDiff(left, right, options)
  }

  // 如果没有变更，直接返回之前的结果
  if (leftChanges.length === 0 && rightChanges.length === 0) {
    console.log('[IncrementalDiff] No changes detected')
    return {
      ...previousResult,
      computedAt: Date.now()
    }
  }

  console.log('[IncrementalDiff] Computing incremental diff:', {
    leftChanges: leftChanges.length,
    rightChanges: rightChanges.length
  })

  // 执行增量 diff 计算
  try {
    const result = await performIncrementalDiff(
      left,
      right,
      previousResult,
      leftChanges,
      rightChanges,
      options
    )
    return result
  } catch (error) {
    console.error('[IncrementalDiff] Error, falling back to full diff:', error)
    return computeDiff(left, right, options)
  }
}

/**
 * 检测文本变更
 * 使用简单的行级比较
 */
function detectChanges(oldContent: string, newContent: string): ChangeRegion[] {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  
  const changes: ChangeRegion[] = []
  let i = 0
  let j = 0
  
  while (i < oldLines.length || j < newLines.length) {
    if (i >= oldLines.length) {
      // 末尾新增
      changes.push({
        startLine: j,
        endLine: newLines.length,
        type: 'insert'
      })
      break
    }
    
    if (j >= newLines.length) {
      // 末尾删除
      changes.push({
        startLine: i,
        endLine: oldLines.length,
        type: 'delete'
      })
      break
    }
    
    if (oldLines[i] !== newLines[j]) {
      // 找到变更起点
      const changeStart = j
      
      // 向前查找匹配的结尾
      let oldEnd = i + 1
      let newEnd = j + 1
      
      // 简单的查找：找到下一个匹配的行
      while (oldEnd < oldLines.length && newEnd < newLines.length) {
        if (oldLines[oldEnd] === newLines[newEnd]) {
          break
        }
        oldEnd++
        newEnd++
      }
      
      const changeType: ChangeRegion['type'] = 
        oldEnd - i === newEnd - j ? 'replace' :
        oldEnd - i > newEnd - j ? 'delete' : 'insert'
      
      changes.push({
        startLine: changeStart,
        endLine: newEnd,
        type: changeType
      })
      
      i = oldEnd
      j = newEnd
    } else {
      i++
      j++
    }
  }
  
  return changes
}

/**
 * 执行增量 diff 计算
 */
async function performIncrementalDiff(
  left: string,
  right: string,
  _previousResult: DiffResult,
  leftChanges: ChangeRegion[],
  rightChanges: ChangeRegion[],
  options: DiffOptions
): Promise<DiffResult> {
  const leftLines = left.split('\n')
  const rightLines = right.split('\n')
  
  // 找出需要重新计算的区域
  const affectedLines = new Set<number>()
  
  // 添加变更行及其上下文
  const context = options.contextLines || 3
  
  for (const change of leftChanges) {
    for (let i = Math.max(0, change.startLine - context); 
         i < Math.min(leftLines.length, change.endLine + context); 
         i++) {
      affectedLines.add(i)
    }
  }
  
  for (const change of rightChanges) {
    for (let i = Math.max(0, change.startLine - context); 
         i < Math.min(rightLines.length, change.endLine + context); 
         i++) {
      affectedLines.add(i)
    }
  }
  
  // 重新计算整个 diff（简化实现）
  // 在实际场景中，这里应该只重新计算受影响区域的 diff
  // 并合并到之前的结果中
  
  // 当前采用简化策略：如果变更区域较小，直接计算完整 diff
  // 因为行号变化可能导致复杂的状态更新
  const newResult = await computeDiff(left, right, options)
  
  // 标记这是增量更新
  return {
    ...newResult,
    computedAt: Date.now()
  }
}

/**
 * 智能 diff 计算
 * 根据内容大小和变更情况选择最佳策略
 */
export async function computeSmartDiff(
  left: string,
  right: string,
  options: DiffOptions,
  previousResult?: DiffResult | null,
  previousLeft?: string | null,
  previousRight?: string | null
): Promise<DiffResult> {
  const leftLines = left.split('\n')
  const rightLines = right.split('\n')
  
  // 小文件（< 1000 行）：直接计算完整 diff
  if (leftLines.length < 1000 && rightLines.length < 1000) {
    return computeDiff(left, right, options)
  }
  
  // 大文件且有之前的结果：尝试增量 diff
  if (previousResult && previousLeft && previousRight) {
    return computeIncrementalDiff(
      left, right,
      previousResult,
      previousLeft, previousRight,
      options
    )
  }
  
  // 默认：完整 diff
  return computeDiff(left, right, options)
}

/**
 * 合并局部 diff 结果到全局结果
 * 用于增量更新场景
 */
export function mergePartialDiffResult(
  baseResult: DiffResult,
  partialLines: DiffLine[],
  startIndex: number
): DiffResult {
  const newLines = [...baseResult.lines]
  
  // 替换局部行
  for (let i = 0; i < partialLines.length; i++) {
    const targetIndex = startIndex + i
    if (targetIndex < newLines.length) {
      newLines[targetIndex] = partialLines[i]
    }
  }
  
  // 重新计算 chunks（简化版）
  // 实际场景中可能需要更复杂的合并逻辑
  const newChunks: DiffChunk[] = baseResult.chunks.map((chunk: DiffChunk) => ({
    ...chunk
    // 更新可能受影响的 chunk
  }))
  
  return {
    ...baseResult,
    lines: newLines,
    chunks: newChunks,
    computedAt: Date.now()
  }
}
