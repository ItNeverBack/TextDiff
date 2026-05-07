import type { DiffChunk, DiffLine } from '@shared/types'

/**
 * 同步方向
 * - left-to-right: 让右侧内容与左侧一致
 * - right-to-left: 让左侧内容与右侧一致
 */
export type SyncDirection = 'left-to-right' | 'right-to-left'

/**
 * 同步结果
 */
export interface SyncResult {
  /** 修改后的左侧内容 */
  leftContent: string
  /** 修改后的右侧内容 */
  rightContent: string
  /** 应用同步的 chunk IDs */
  appliedChunkIds: string[]
  /** 同步的行数统计 */
  stats: {
    insertedLines: number
    deletedLines: number
    modifiedLines: number
  }
}

/**
 * 同步选项
 */
export interface SyncOptions {
  /** 同步方向 */
  direction: SyncDirection
  /** 要同步的 chunk IDs，如果未指定则同步所有 */
  chunkIds?: string[]
  /** 是否自动保存（在 main process 中处理） */
  autoSave?: boolean
}

/**
 * 将内容按行分割
 */
function splitLines(content: string): string[] {
  if (content === '') return []
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return normalized.split('\n')
}

/**
 * 将行数组合并为内容
 */
function joinLines(lines: string[]): string {
  return lines.join('\n')
}

/**
 * 同步单个 chunk - 从左到右
 * 
 * 逻辑：让右侧变成和左侧一样
 * - 对于 chunk 中的每一行：
 *   - delete 行（左侧有，右侧没有）：在右侧插入左侧的内容
 *   - insert 行（左侧没有，右侧有）：在右侧删除这些行
 *   - replace 行（两边都有但不同）：用左侧内容替换右侧
 */
function syncChunkLeftToRight(
  chunk: DiffChunk,
  lines: DiffLine[],
  rightLines: string[]
): { newRightLines: string[]; stats: { inserted: number; deleted: number; modified: number } } {
  const stats = { inserted: 0, deleted: 0, modified: 0 }
  
  // 从后往前处理 changeIndices，避免索引偏移问题
  const sortedIndices = [...chunk.changeIndices].sort((a, b) => b - a)
  
  let result = [...rightLines]
  
  for (const idx of sortedIndices) {
    const line = lines[idx]
    
    if (line.type === 'delete') {
      // 左侧有，右侧没有 -> 在右侧插入
      // 插入位置：找到这个 delete 行对应的右侧位置
      // 方法：找到前一个非 delete 行的右侧行号，在其后插入
      
      let insertPos = 0
      for (let i = idx - 1; i >= 0; i--) {
        if (lines[i].rightLineNo !== null) {
          insertPos = lines[i].rightLineNo!
          break
        }
      }
      
      // 在当前结果中插入
      result = [
        ...result.slice(0, insertPos),
        line.leftContent,
        ...result.slice(insertPos)
      ]
      stats.inserted++
      
    } else if (line.type === 'insert') {
      // 左侧没有，右侧有 -> 在右侧删除
      // 删除位置：rightLineNo - 1
      const deletePos = line.rightLineNo! - 1
      result = [
        ...result.slice(0, deletePos),
        ...result.slice(deletePos + 1)
      ]
      stats.deleted++
      
    } else if (line.type === 'replace') {
      // 两边都有但不同 -> 用左侧替换右侧
      const replacePos = line.rightLineNo! - 1
      result = [
        ...result.slice(0, replacePos),
        line.leftContent,
        ...result.slice(replacePos + 1)
      ]
      stats.modified++
    }
  }
  
  return { newRightLines: result, stats }
}

/**
 * 同步单个 chunk - 从右到左
 * 
 * 逻辑：让左侧变成和右侧一样
 * - 对于 chunk 中的每一行：
 *   - delete 行（左侧有，右侧没有）：在左侧删除这些行
 *   - insert 行（左侧没有，右侧有）：在左侧插入右侧的内容
 *   - replace 行（两边都有但不同）：用右侧内容替换左侧
 */
function syncChunkRightToLeft(
  chunk: DiffChunk,
  lines: DiffLine[],
  leftLines: string[]
): { newLeftLines: string[]; stats: { inserted: number; deleted: number; modified: number } } {
  const stats = { inserted: 0, deleted: 0, modified: 0 }
  
  // 从后往前处理 changeIndices，避免索引偏移问题
  const sortedIndices = [...chunk.changeIndices].sort((a, b) => b - a)
  
  let result = [...leftLines]
  
  for (const idx of sortedIndices) {
    const line = lines[idx]
    
    if (line.type === 'delete') {
      // 左侧有，右侧没有 -> 在左侧删除
      const deletePos = line.leftLineNo! - 1
      result = [
        ...result.slice(0, deletePos),
        ...result.slice(deletePos + 1)
      ]
      stats.deleted++
      
    } else if (line.type === 'insert') {
      // 左侧没有，右侧有 -> 在左侧插入
      let insertPos = 0
      for (let i = idx - 1; i >= 0; i--) {
        if (lines[i].leftLineNo !== null) {
          insertPos = lines[i].leftLineNo!
          break
        }
      }
      
      result = [
        ...result.slice(0, insertPos),
        line.rightContent,
        ...result.slice(insertPos)
      ]
      stats.inserted++
      
    } else if (line.type === 'replace') {
      // 两边都有但不同 -> 用右侧替换左侧
      const replacePos = line.leftLineNo! - 1
      result = [
        ...result.slice(0, replacePos),
        line.rightContent,
        ...result.slice(replacePos + 1)
      ]
      stats.modified++
    }
  }
  
  return { newLeftLines: result, stats }
}

/**
 * 同步差异 - 将一处差异从一边文本同步到另一边
 */
export function syncDiff(
  leftContent: string,
  rightContent: string,
  lines: DiffLine[],
  chunks: DiffChunk[],
  options: SyncOptions
): SyncResult {
  let leftLines = splitLines(leftContent)
  let rightLines = splitLines(rightContent)
  
  const appliedChunkIds: string[] = []
  const stats = { insertedLines: 0, deletedLines: 0, modifiedLines: 0 }

  // 过滤要同步的 chunks
  const chunksToSync = options.chunkIds 
    ? chunks.filter(c => options.chunkIds!.includes(c.id))
    : chunks

  // 按 chunk 的起始位置倒序处理，避免索引偏移问题
  const sortedChunks = [...chunksToSync].sort((a, b) => b.startIndex - a.startIndex)

  for (const chunk of sortedChunks) {
    if (options.direction === 'left-to-right') {
      const result = syncChunkLeftToRight(chunk, lines, rightLines)
      rightLines = result.newRightLines
      stats.insertedLines += result.stats.inserted
      stats.deletedLines += result.stats.deleted
      stats.modifiedLines += result.stats.modified
    } else {
      const result = syncChunkRightToLeft(chunk, lines, leftLines)
      leftLines = result.newLeftLines
      stats.insertedLines += result.stats.inserted
      stats.deletedLines += result.stats.deleted
      stats.modifiedLines += result.stats.modified
    }
    appliedChunkIds.push(chunk.id)
  }

  return {
    leftContent: joinLines(leftLines),
    rightContent: joinLines(rightLines),
    appliedChunkIds,
    stats
  }
}

/**
 * 同步所有差异（快捷方法）
 */
export function syncAllDiffs(
  leftContent: string,
  rightContent: string,
  lines: DiffLine[],
  chunks: DiffChunk[],
  direction: SyncDirection
): SyncResult {
  return syncDiff(leftContent, rightContent, lines, chunks, { direction })
}
