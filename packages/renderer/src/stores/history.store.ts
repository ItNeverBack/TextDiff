import type { HistoryEntry } from '@shared/types'
import { create } from 'zustand'
import { generateSessionId } from '@shared/utils'

/**
 * 历史记录状态
 */
interface HistoryState {
  /** 历史记录栈 */
  entries: HistoryEntry[]
  /** 当前索引（-1 表示没有历史记录） */
  currentIndex: number
  /** 最大历史记录数 */
  maxEntries: number
}

/**
 * 历史记录操作
 */
interface HistoryActions {
  /**
   * 添加历史记录
   * @param type 操作类型
   * @param description 操作描述
   * @param before 操作前的状态
   * @param after 操作后的状态
   */
  addEntry: (
    type: HistoryEntry['type'],
    description: string,
    before: { leftContent: string; rightContent: string },
    after: { leftContent: string; rightContent: string }
  ) => void

  /**
   * 撤销上一个操作
   * @returns 撤销后的状态，如果没有可撤销的则返回 null
   */
  undo: () => { leftContent: string; rightContent: string } | null

  /**
   * 重做下一个操作
   * @returns 重做后的状态，如果没有可重做的则返回 null
   */
  redo: () => { leftContent: string; rightContent: string } | null

  /**
   * 是否可以撤销
   */
  canUndo: () => boolean

  /**
   * 是否可以重做
   */
  canRedo: () => boolean

  /**
   * 获取当前历史记录
   */
  getCurrentEntry: () => HistoryEntry | null

  /**
   * 清空历史记录
   */
  clear: () => void

  /**
   * 设置最大历史记录数
   */
  setMaxEntries: (max: number) => void
}

const MAX_HISTORY_ENTRIES = 50

export const useHistoryStore = create<HistoryState & HistoryActions>((set, get) => ({
  entries: [],
  currentIndex: -1,
  maxEntries: MAX_HISTORY_ENTRIES,

  addEntry: (type, description, before, after) => {
    const { entries, currentIndex, maxEntries } = get()

    // 如果有重做记录，删除当前索引之后的所有记录
    const newEntries = entries.slice(0, currentIndex + 1)

    // 创建新记录
    const newEntry: HistoryEntry = {
      id: generateSessionId(),
      timestamp: Date.now(),
      type,
      description,
      before,
      after
    }

    // 添加新记录
    newEntries.push(newEntry)

    // 如果超过最大记录数，删除最早的记录
    if (newEntries.length > maxEntries) {
      newEntries.shift()
    }

    set({
      entries: newEntries,
      currentIndex: newEntries.length - 1
    })
  },

  undo: () => {
    const { entries, currentIndex } = get()

    if (currentIndex < 0) {
      return null
    }

    const entry = entries[currentIndex]
    const newIndex = currentIndex - 1

    set({ currentIndex: newIndex })

    // 返回撤销后的状态（操作前的状态）
    return entry.before
  },

  redo: () => {
    const { entries, currentIndex } = get()

    if (currentIndex >= entries.length - 1) {
      return null
    }

    const newIndex = currentIndex + 1
    const entry = entries[newIndex]

    set({ currentIndex: newIndex })

    // 返回重做后的状态（操作后的状态）
    return entry.after
  },

  canUndo: () => {
    return get().currentIndex >= 0
  },

  canRedo: () => {
    const { entries, currentIndex } = get()
    return currentIndex < entries.length - 1
  },

  getCurrentEntry: () => {
    const { entries, currentIndex } = get()
    if (currentIndex < 0 || currentIndex >= entries.length) {
      return null
    }
    return entries[currentIndex]
  },

  clear: () => {
    set({
      entries: [],
      currentIndex: -1
    })
  },

  setMaxEntries: (max) => {
    set({ maxEntries: max })
  }
}))

/**
 * 监听键盘事件处理撤销/重做快捷键
 */
export function setupHistoryKeyboardHandlers(
  onUndo: () => void,
  onRedo: () => void
): () => void {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Ctrl+Z / Cmd+Z: 撤销
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault()
      onUndo()
    }

    // Ctrl+Y / Cmd+Shift+Z: 重做
    if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
      event.preventDefault()
      onRedo()
    }
  }

  window.addEventListener('keydown', handleKeyDown)

  return () => {
    window.removeEventListener('keydown', handleKeyDown)
  }
}
