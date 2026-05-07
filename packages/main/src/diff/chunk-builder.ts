import type { DiffLine, DiffChunk } from '@shared/types'
import { generateChunkId } from '@shared/utils'

/**
 * 构建差异块（Chunks）
 * 
 * 每个被相同行隔开的差异区域都会成为独立的 chunk
 * 例如：delete -> equal lines -> insert 会被分成两个 chunks
 * 
 * @param lines DiffLine 数组
 * @param contextLines 上下文行数（每个 chunk 包含差异行前后各 contextLines 行）
 * @returns DiffChunk 数组
 */
export function buildChunks(
  lines: DiffLine[],
  contextLines: number = 3
): DiffChunk[] {
  const chunks: DiffChunk[] = []

  // 首先，找出所有差异行的索引
  const changeIndices: number[] = []
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].type !== 'equal') {
      changeIndices.push(i)
    }
  }

  if (changeIndices.length === 0) {
    return []
  }

  // 将连续的变化分组（不被 equal 行隔开的，或间隔很小的）
  const changeGroups: Array<{ start: number; end: number } > = []
  let currentGroupStart = changeIndices[0]
  let currentGroupEnd = changeIndices[0]

  for (let i = 1; i < changeIndices.length; i++) {
    const currentIndex = changeIndices[i]
    const previousIndex = changeIndices[i - 1]

    // 如果当前变化与上一个变化之间没有 equal 行（即连续），则扩展当前组
    if (currentIndex === previousIndex + 1) {
      currentGroupEnd = currentIndex
    } else {
      // 否则，结束当前组，开始新组
      changeGroups.push({ start: currentGroupStart, end: currentGroupEnd })
      currentGroupStart = currentIndex
      currentGroupEnd = currentIndex
    }
  }
  // 添加最后一组
  changeGroups.push({ start: currentGroupStart, end: currentGroupEnd })

  // 为每个变化组创建 chunk，确保不重叠
  for (let g = 0; g < changeGroups.length; g++) {
    const group = changeGroups[g]
    const prevGroup = g > 0 ? changeGroups[g - 1] : null
    const nextGroup = g < changeGroups.length - 1 ? changeGroups[g + 1] : null

    // 计算 chunk 的范围（包含上下文）
    let startIndex = Math.max(0, group.start - contextLines)
    let endIndex = Math.min(lines.length - 1, group.end + contextLines)

    // 确保与上一个 chunk 不重叠
    if (prevGroup) {
      const prevChunkEnd = Math.min(lines.length - 1, prevGroup.end + contextLines)
      // 两个 chunk 之间的边界应该是它们的中点
      const boundary = Math.floor((prevChunkEnd + startIndex) / 2)
      startIndex = Math.max(startIndex, boundary + 1)
    }

    // 确保与下一个 chunk 不重叠
    if (nextGroup) {
      const nextChunkStart = Math.max(0, nextGroup.start - contextLines)
      // 两个 chunk 之间的边界应该是它们的中点
      const boundary = Math.floor((endIndex + nextChunkStart) / 2)
      endIndex = Math.min(endIndex, boundary)
    }

    // 收集该 chunk 中实际发生变化的行索引（从全局 changeIndices 中筛选）
    const groupChangeIndices: number[] = []
    for (const idx of changeIndices) {
      if (idx >= group.start && idx <= group.end) {
        groupChangeIndices.push(idx)
      }
    }

    chunks.push(createChunk(lines, startIndex, endIndex, groupChangeIndices))
  }

  return chunks
}

function createChunk(lines: DiffLine[], startIndex: number, endIndex: number, changeIndices: number[]): DiffChunk {
  let chunkType: 'change' | 'insert' | 'delete' = 'change'
  let leftStart = Infinity
  let leftEnd = -Infinity
  let rightStart = Infinity
  let rightEnd = -Infinity
  let hasInsert = false
  let hasDelete = false

  // 只遍历实际变化的行来计算行号范围（不包含上下文行）
  for (const idx of changeIndices) {
    const line = lines[idx]

    if (line.leftLineNo !== null) {
      leftStart = Math.min(leftStart, line.leftLineNo)
      leftEnd = Math.max(leftEnd, line.leftLineNo)
    }

    if (line.rightLineNo !== null) {
      rightStart = Math.min(rightStart, line.rightLineNo)
      rightEnd = Math.max(rightEnd, line.rightLineNo)
    }

    if (line.type === 'insert') hasInsert = true
    if (line.type === 'delete') hasDelete = true
  }

  if (hasInsert && !hasDelete) {
    chunkType = 'insert'
  } else if (hasDelete && !hasInsert) {
    chunkType = 'delete'
  }

  return {
    id: generateChunkId(),
    startIndex,
    endIndex,
    type: chunkType,
    leftLineRange: [leftStart === Infinity ? 0 : leftStart, leftEnd === -Infinity ? 0 : leftEnd],
    rightLineRange: [rightStart === Infinity ? 0 : rightStart, rightEnd === -Infinity ? 0 : rightEnd],
    changeIndices
  }
}
