import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useHistoryStore } from '../history.store'

describe('useHistoryStore', () => {
  beforeEach(() => {
    useHistoryStore.setState(useHistoryStore.getInitialState())
  })

  it('should have correct initial state', () => {
    const state = useHistoryStore.getState()
    expect(state.past).toEqual([])
    expect(state.future).toEqual([])
    expect(state.canUndo).toBe(false)
    expect(state.canRedo).toBe(false)
  })

  it('should add state to past when pushing', () => {
    const operation = { type: 'edit', path: 'file.txt', content: 'new content' }
    useHistoryStore.getState().push(operation)
    
    expect(useHistoryStore.getState().past).toEqual([operation])
    expect(useHistoryStore.getState().canUndo).toBe(true)
  })

  it('should clear future when pushing new operation', () => {
    const op1 = { type: 'edit', path: 'file1.txt' }
    const op2 = { type: 'edit', path: 'file2.txt' }
    const op3 = { type: 'edit', path: 'file3.txt' }
    
    const store = useHistoryStore.getState()
    store.push(op1)
    store.push(op2)
    store.undo()
    
    expect(useHistoryStore.getState().future).toEqual([op2])
    
    store.push(op3)
    expect(useHistoryStore.getState().future).toEqual([])
    expect(useHistoryStore.getState().past).toEqual([op1, op3])
  })

  it('should pop from past and push to future when undoing', () => {
    const op1 = { type: 'edit', path: 'file1.txt' }
    const op2 = { type: 'edit', path: 'file2.txt' }
    
    const store = useHistoryStore.getState()
    store.push(op1)
    store.push(op2)
    
    const undone = store.undo()
    
    expect(undone).toEqual(op2)
    expect(useHistoryStore.getState().past).toEqual([op1])
    expect(useHistoryStore.getState().future).toEqual([op2])
    expect(useHistoryStore.getState().canUndo).toBe(true)
    expect(useHistoryStore.getState().canRedo).toBe(true)
  })

  it('should return null when undoing with empty past', () => {
    const result = useHistoryStore.getState().undo()
    expect(result).toBeNull()
  })

  it('should pop from future and push to past when redoing', () => {
    const op1 = { type: 'edit', path: 'file1.txt' }
    const op2 = { type: 'edit', path: 'file2.txt' }
    
    const store = useHistoryStore.getState()
    store.push(op1)
    store.push(op2)
    store.undo()
    
    const redone = store.redo()
    
    expect(redone).toEqual(op2)
    expect(useHistoryStore.getState().past).toEqual([op1, op2])
    expect(useHistoryStore.getState().future).toEqual([])
  })

  it('should return null when redoing with empty future', () => {
    const result = useHistoryStore.getState().redo()
    expect(result).toBeNull()
  })

  it('should clear all history', () => {
    const store = useHistoryStore.getState()
    store.push({ type: 'edit', path: 'file1.txt' })
    store.push({ type: 'edit', path: 'file2.txt' })
    store.undo()
    
    store.clear()
    
    expect(useHistoryStore.getState().past).toEqual([])
    expect(useHistoryStore.getState().future).toEqual([])
    expect(useHistoryStore.getState().canUndo).toBe(false)
    expect(useHistoryStore.getState().canRedo).toBe(false)
  })

  it('should get current state', () => {
    const op1 = { type: 'edit', path: 'file1.txt' }
    const op2 = { type: 'edit', path: 'file2.txt' }
    
    const store = useHistoryStore.getState()
    store.push(op1)
    store.push(op2)
    
    expect(useHistoryStore.getState().getCurrent()).toEqual(op2)
  })

  it('should return null for current when no history', () => {
    expect(useHistoryStore.getState().getCurrent()).toBeNull()
  })

  it('should limit history size', () => {
    const store = useHistoryStore.getState()
    
    // Push more than 50 operations (default limit)
    for (let i = 0; i < 55; i++) {
      store.push({ type: 'edit', path: `file${i}.txt` })
    }
    
    const past = useHistoryStore.getState().past
    expect(past.length).toBeLessThanOrEqual(50)
  })

  it('should maintain correct canUndo state', () => {
    const store = useHistoryStore.getState()
    
    expect(store.canUndo).toBe(false)
    
    store.push({ type: 'edit', path: 'file.txt' })
    expect(useHistoryStore.getState().canUndo).toBe(true)
    
    store.undo()
    expect(useHistoryStore.getState().canUndo).toBe(false)
  })

  it('should maintain correct canRedo state', () => {
    const store = useHistoryStore.getState()
    
    expect(store.canRedo).toBe(false)
    
    store.push({ type: 'edit', path: 'file.txt' })
    expect(useHistoryStore.getState().canRedo).toBe(false)
    
    store.undo()
    expect(useHistoryStore.getState().canRedo).toBe(true)
    
    store.redo()
    expect(useHistoryStore.getState().canRedo).toBe(false)
  })

  it('should handle complex undo/redo sequence', () => {
    const store = useHistoryStore.getState()
    
    // Push operations
    store.push({ type: 'edit', data: 'A' })
    store.push({ type: 'edit', data: 'B' })
    store.push({ type: 'edit', data: 'C' })
    
    // Undo twice
    expect(store.undo()).toEqual({ type: 'edit', data: 'C' })
    expect(store.undo()).toEqual({ type: 'edit', data: 'B' })
    
    expect(useHistoryStore.getState().past).toHaveLength(1)
    expect(useHistoryStore.getState().future).toHaveLength(2)
    
    // Redo once
    expect(store.redo()).toEqual({ type: 'edit', data: 'B' })
    
    expect(useHistoryStore.getState().past).toHaveLength(2)
    expect(useHistoryStore.getState().future).toHaveLength(1)
  })
})
