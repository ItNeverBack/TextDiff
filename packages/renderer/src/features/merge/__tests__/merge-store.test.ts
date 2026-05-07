import { describe, it, expect, beforeEach } from 'vitest'
import { useMergeStore } from '../stores/merge.store'
import type { ThreeWayDiffResult } from '@shared/types'

// 构造一个最小的 ThreeWayDiffResult 用于测试
function makeMergeResult(overrides?: Partial<ThreeWayDiffResult>): ThreeWayDiffResult {
  return {
    lines: [],
    conflicts: [],
    hasConflicts: false,
    stats: { totalLines: 0, equalLines: 0, insertedLines: 0, deletedLines: 0, modifiedLines: 0, chunkCount: 0 },
    computedAt: Date.now(),
    ...overrides
  }
}

describe('useMergeStore — 基础状态管理', () => {
  beforeEach(() => {
    useMergeStore.getState().reset()
  })

  it('初始状态：无文件、无结果、无冲突', () => {
    const state = useMergeStore.getState()
    expect(state.baseFile).toBeNull()
    expect(state.leftFile).toBeNull()
    expect(state.rightFile).toBeNull()
    expect(state.mergeResult).toBeNull()
    expect(state.isComputing).toBe(false)
    expect(state.activeConflictIndex).toBe(0)
    expect(state.resolutions.size).toBe(0)
  })

  it('reset 后恢复初始状态', () => {
    const store = useMergeStore.getState()
    store.setMergeResult(makeMergeResult())
    store.resolveConflict('c1', { type: 'left' })
    store.reset()
    const state = useMergeStore.getState()
    expect(state.mergeResult).toBeNull()
    expect(state.resolutions.size).toBe(0)
  })
})

describe('useMergeStore — 冲突解决', () => {
  beforeEach(() => {
    useMergeStore.getState().reset()
  })

  it('resolveConflict 记录 resolution', () => {
    useMergeStore.getState().resolveConflict('c1', { type: 'left' })
    expect(useMergeStore.getState().resolutions.get('c1')).toEqual({ type: 'left' })
  })

  it('resolveConflict 可覆盖已有 resolution', () => {
    useMergeStore.getState().resolveConflict('c1', { type: 'left' })
    useMergeStore.getState().resolveConflict('c1', { type: 'right' })
    expect(useMergeStore.getState().resolutions.get('c1')).toEqual({ type: 'right' })
  })

  it('resolveConflict manual 保存内容', () => {
    useMergeStore.getState().resolveConflict('c1', { type: 'manual', content: 'custom content' })
    expect(useMergeStore.getState().resolutions.get('c1')).toEqual({ type: 'manual', content: 'custom content' })
  })
})

describe('useMergeStore — 冲突导航', () => {
  beforeEach(() => {
    useMergeStore.getState().reset()
    useMergeStore.getState().setMergeResult(makeMergeResult({
      conflicts: [
        { id: 'c1', startLine: 0, endLine: 0, baseContent: 'base', leftContent: 'left1', rightContent: 'right1', resolved: false },
        { id: 'c2', startLine: 2, endLine: 2, baseContent: 'base2', leftContent: 'left2', rightContent: 'right2', resolved: false }
      ],
      hasConflicts: true
    }))
  })

  it('nextConflict 递增 activeConflictIndex', () => {
    useMergeStore.getState().nextConflict()
    expect(useMergeStore.getState().activeConflictIndex).toBe(1)
  })

  it('nextConflict 不超过最后一个冲突', () => {
    useMergeStore.getState().nextConflict()
    useMergeStore.getState().nextConflict()
    expect(useMergeStore.getState().activeConflictIndex).toBe(1)
  })

  it('prevConflict 递减 activeConflictIndex', () => {
    useMergeStore.getState().nextConflict()
    useMergeStore.getState().prevConflict()
    expect(useMergeStore.getState().activeConflictIndex).toBe(0)
  })

  it('prevConflict 不低于 0', () => {
    useMergeStore.getState().prevConflict()
    expect(useMergeStore.getState().activeConflictIndex).toBe(0)
  })
})

describe('useMergeStore — buildResult', () => {
  beforeEach(() => {
    useMergeStore.getState().reset()
  })

  it('无合并结果时返回空字符串', () => {
    expect(useMergeStore.getState().buildResult()).toBe('')
  })

  it('全 equal 行直接输出 leftContent', () => {
    useMergeStore.getState().setMergeResult(makeMergeResult({
      lines: [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'line1', rightContent: 'line1' },
        { leftLineNo: 2, rightLineNo: 2, type: 'equal', leftContent: 'line2', rightContent: 'line2' }
      ]
    }))
    expect(useMergeStore.getState().buildResult()).toBe('line1\nline2')
  })

  it('insert 行输出 rightContent', () => {
    useMergeStore.getState().setMergeResult(makeMergeResult({
      lines: [
        { leftLineNo: 1, rightLineNo: 1, type: 'insert', leftContent: '', rightContent: 'new line' }
      ]
    }))
    expect(useMergeStore.getState().buildResult()).toBe('new line')
  })

  it('delete 行跳过（不输出）', () => {
    useMergeStore.getState().setMergeResult(makeMergeResult({
      lines: [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal', leftContent: 'keep', rightContent: 'keep' },
        { leftLineNo: 2, rightLineNo: null, type: 'delete', leftContent: 'removed', rightContent: '' }
      ]
    }))
    expect(useMergeStore.getState().buildResult()).toBe('keep')
  })

  it('非冲突 replace 行输出 rightContent', () => {
    useMergeStore.getState().setMergeResult(makeMergeResult({
      lines: [
        { leftLineNo: 1, rightLineNo: 1, type: 'replace', leftContent: 'old', rightContent: 'new' }
      ],
      conflicts: [] // 无冲突
    }))
    expect(useMergeStore.getState().buildResult()).toBe('new')
  })

  it('冲突行采用左侧时输出 leftContent', () => {
    const store = useMergeStore.getState()
    store.setMergeResult(makeMergeResult({
      lines: [
        { leftLineNo: 1, rightLineNo: 1, type: 'replace', leftContent: 'LEFT', rightContent: 'RIGHT' }
      ],
      conflicts: [
        { id: 'c1', startLine: 0, endLine: 0, baseContent: 'BASE', leftContent: 'LEFT', rightContent: 'RIGHT', resolved: false }
      ],
      hasConflicts: true
    }))
    store.resolveConflict('c1', { type: 'left' })
    expect(useMergeStore.getState().buildResult()).toBe('LEFT')
  })

  it('冲突行采用右侧时输出 rightContent', () => {
    const store = useMergeStore.getState()
    store.setMergeResult(makeMergeResult({
      lines: [
        { leftLineNo: 1, rightLineNo: 1, type: 'replace', leftContent: 'LEFT', rightContent: 'RIGHT' }
      ],
      conflicts: [
        { id: 'c1', startLine: 0, endLine: 0, baseContent: 'BASE', leftContent: 'LEFT', rightContent: 'RIGHT', resolved: false }
      ],
      hasConflicts: true
    }))
    store.resolveConflict('c1', { type: 'right' })
    expect(useMergeStore.getState().buildResult()).toBe('RIGHT')
  })

  it('冲突行采用 base 时输出 baseContent', () => {
    const store = useMergeStore.getState()
    store.setMergeResult(makeMergeResult({
      lines: [
        { leftLineNo: 1, rightLineNo: 1, type: 'replace', leftContent: 'LEFT', rightContent: 'RIGHT' }
      ],
      conflicts: [
        { id: 'c1', startLine: 0, endLine: 0, baseContent: 'BASE', leftContent: 'LEFT', rightContent: 'RIGHT', resolved: false }
      ],
      hasConflicts: true
    }))
    store.resolveConflict('c1', { type: 'base' })
    expect(useMergeStore.getState().buildResult()).toBe('BASE')
  })

  it('冲突行手动编辑时输出 manual content', () => {
    const store = useMergeStore.getState()
    store.setMergeResult(makeMergeResult({
      lines: [
        { leftLineNo: 1, rightLineNo: 1, type: 'replace', leftContent: 'LEFT', rightContent: 'RIGHT' }
      ],
      conflicts: [
        { id: 'c1', startLine: 0, endLine: 0, baseContent: 'BASE', leftContent: 'LEFT', rightContent: 'RIGHT', resolved: false }
      ],
      hasConflicts: true
    }))
    store.resolveConflict('c1', { type: 'manual', content: 'CUSTOM' })
    expect(useMergeStore.getState().buildResult()).toBe('CUSTOM')
  })

  it('未解决冲突行输出 git 冲突标记', () => {
    const store = useMergeStore.getState()
    store.setMergeResult(makeMergeResult({
      lines: [
        { leftLineNo: 1, rightLineNo: 1, type: 'replace', leftContent: 'LEFT', rightContent: 'RIGHT' }
      ],
      conflicts: [
        { id: 'c1', startLine: 0, endLine: 0, baseContent: 'BASE', leftContent: 'LEFT', rightContent: 'RIGHT', resolved: false }
      ],
      hasConflicts: true
    }))
    // 不调用 resolveConflict，保持未解决
    const result = useMergeStore.getState().buildResult()
    expect(result).toContain('<<<<<<< LEFT')
    expect(result).toContain('LEFT')
    expect(result).toContain('=======')
    expect(result).toContain('RIGHT')
    expect(result).toContain('>>>>>>> RIGHT')
  })
})
