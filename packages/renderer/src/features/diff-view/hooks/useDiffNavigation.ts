import { useCallback } from 'react'
import { useDiffStore } from '@renderer/stores'
import type { DiffChunk } from '@shared/types'

/**
 * 差异导航 Hook
 * 
 * §2.4.3 Diff 导航 - hooks/useDiffNavigation.ts
 * 维护 activeChunkIndex 状态
 * nextChunk / prevChunk / firstChunk / lastChunk 方法
 * 参考：原型 main.js 中 navigateDiff 函数
 */
export function useDiffNavigation() {
  const { diffResult, activeChunkIndex, navigateToChunk, nextChunk, prevChunk, firstChunk, lastChunk } = useDiffStore()

  const goToChunk = useCallback((index: number) => {
    if (!diffResult || index < 0 || index >= diffResult.chunks.length) return
    navigateToChunk(index)
  }, [diffResult, navigateToChunk])

  /**
   * 获取 chunk 在编辑器中的行号
   */
  const getChunkLineNumber = useCallback((chunk: DiffChunk, side: 'left' | 'right' = 'left'): number => {
    if (side === 'left') {
      return chunk.leftLineRange[0]
    }
    return chunk.rightLineRange[0]
  }, [])

  /**
   * 获取当前 chunk 的行号
   */
  const getCurrentChunkLineNumber = useCallback((side: 'left' | 'right' = 'left'): number | null => {
    const currentChunk = diffResult?.chunks[activeChunkIndex]
    if (!currentChunk) return null
    return getChunkLineNumber(currentChunk, side)
  }, [diffResult, activeChunkIndex, getChunkLineNumber])

  /**
   * 计算 Monaco revealLineInCenter 需要的行号
   */
  const getRevealLineNumber = useCallback((chunkIndex: number, side: 'left' | 'right' = 'left'): number | null => {
    const chunk = diffResult?.chunks[chunkIndex]
    if (!chunk) return null
    return getChunkLineNumber(chunk, side)
  }, [diffResult, getChunkLineNumber])

  const currentChunk = diffResult?.chunks[activeChunkIndex] || null
  const totalChunks = diffResult?.chunks.length || 0

  return {
    currentChunkIndex: activeChunkIndex,
    currentChunk,
    totalChunks,
    goToChunk,
    nextChunk,
    prevChunk,
    firstChunk,
    lastChunk,
    getChunkLineNumber,
    getCurrentChunkLineNumber,
    getRevealLineNumber
  }
}
