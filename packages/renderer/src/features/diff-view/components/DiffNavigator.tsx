import { useDiffStore } from '@renderer/stores'
import { useDiffNavigation } from '../hooks/useDiffNavigation'

/**
 * 差异导航组件
 * 
 * §2.4.3 Diff 导航 - DiffNavigator.tsx
 * 当前位置 / 总数显示（如 1/12）
 * 上一处 / 下一处 / 第一处 / 最后一处按钮
 */
export function DiffNavigator() {
  const { isComputing } = useDiffStore()
  const {
    currentChunkIndex,
    totalChunks,
    firstChunk,
    prevChunk,
    nextChunk,
    lastChunk
  } = useDiffNavigation()

  const hasChunks = totalChunks > 0
  const current = hasChunks ? currentChunkIndex + 1 : 0

  return (
    <div className="flex items-center gap-1 bg-[var(--bg-surface)] rounded-md px-2 py-1 border border-[var(--border-light)]">
      {/* 第一处差异 */}
      <button
        className="nav-btn icon-only"
        onClick={firstChunk}
        disabled={!hasChunks || currentChunkIndex === 0 || isComputing}
        title="第一处差异 (Alt+Home)"
        aria-label="第一处差异"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/>
        </svg>
      </button>

      {/* 上一处差异 */}
      <button
        className="nav-btn icon-only"
        onClick={prevChunk}
        disabled={!hasChunks || currentChunkIndex === 0 || isComputing}
        title="上一处差异 (F6 / Alt+↑)"
        aria-label="上一处差异"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 15l-6-6-6 6"/>
        </svg>
      </button>

      {/* 差异计数器 */}
      <div className="flex items-center gap-1 px-2 min-w-[80px] justify-center">
        <span className="font-medium text-[var(--text-primary)]">
          {current}
        </span>
        <span className="text-[var(--text-muted)]">/</span>
        <span className="text-[var(--text-secondary)]">
          {totalChunks}
        </span>
        <span className="text-[var(--text-muted)] text-xs ml-1">处差异</span>
      </div>

      {/* 下一处差异 */}
      <button
        className="nav-btn icon-only"
        onClick={nextChunk}
        disabled={!hasChunks || currentChunkIndex >= totalChunks - 1 || isComputing}
        title="下一处差异 (F7 / Alt+↓)"
        aria-label="下一处差异"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {/* 最后一处差异 */}
      <button
        className="nav-btn icon-only"
        onClick={lastChunk}
        disabled={!hasChunks || currentChunkIndex >= totalChunks - 1 || isComputing}
        title="最后一处差异 (Alt+End)"
        aria-label="最后一处差异"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 17l5-5-5-5M6 17l5-5-5-5"/>
        </svg>
      </button>
    </div>
  )
}
