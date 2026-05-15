import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUndoRedo } from '../useUndoRedo'

describe('useUndoRedo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useUndoRedo())
    
    expect(result.current.state).toBeNull()
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('should set initial state', () => {
    const { result } = renderHook(() => useUndoRedo({ initialState: { count: 0 } }))
    
    expect(result.current.state).toEqual({ count: 0 })
  })

  it('should update state and track history', () => {
    const { result } = renderHook(() => useUndoRedo({ initialState: { count: 0 } }))
    
    act(() => {
      result.current.setState({ count: 1 })
    })
    
    expect(result.current.state).toEqual({ count: 1 })
    expect(result.current.canUndo).toBe(true)
  })

  it('should undo state change', () => {
    const { result } = renderHook(() => useUndoRedo({ initialState: { count: 0 } }))
    
    act(() => {
      result.current.setState({ count: 1 })
    })
    
    act(() => {
      result.current.undo()
    })
    
    expect(result.current.state).toEqual({ count: 0 })
    expect(result.current.canRedo).toBe(true)
  })

  it('should redo undone state change', () => {
    const { result } = renderHook(() => useUndoRedo({ initialState: { count: 0 } }))
    
    act(() => {
      result.current.setState({ count: 1 })
    })
    
    act(() => {
      result.current.undo()
    })
    
    act(() => {
      result.current.redo()
    })
    
    expect(result.current.state).toEqual({ count: 1 })
  })

  it('should clear redo history when setting new state after undo', () => {
    const { result } = renderHook(() => useUndoRedo({ initialState: { count: 0 } }))
    
    act(() => {
      result.current.setState({ count: 1 })
    })
    
    act(() => {
      result.current.setState({ count: 2 })
    })
    
    act(() => {
      result.current.undo()
    })
    
    // Now canRedo should be true
    expect(result.current.canRedo).toBe(true)
    
    // Set new state - should clear redo history
    act(() => {
      result.current.setState({ count: 3 })
    })
    
    expect(result.current.canRedo).toBe(false)
    expect(result.current.state).toEqual({ count: 3 })
  })

  it('should reset to initial state', () => {
    const { result } = renderHook(() => useUndoRedo({ initialState: { count: 0 } }))
    
    act(() => {
      result.current.setState({ count: 1 })
      result.current.setState({ count: 2 })
    })
    
    act(() => {
      result.current.reset()
    })
    
    expect(result.current.state).toEqual({ count: 0 })
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('should handle max history limit', () => {
    const { result } = renderHook(() => useUndoRedo({ initialState: 0, maxHistory: 3 }))
    
    act(() => {
      result.current.setState(1)
      result.current.setState(2)
      result.current.setState(3)
      result.current.setState(4)
    })
    
    // Should only keep last 3 states in history
    // Current state is 4, history should have 2, 3 (limited by maxHistory)
    act(() => {
      result.current.undo()
    })
    expect(result.current.state).toBe(3)
    
    act(() => {
      result.current.undo()
    })
    expect(result.current.state).toBe(2)
    
    // Should not be able to undo further (0 was pushed out)
    act(() => {
      result.current.undo()
    })
    expect(result.current.state).toBe(2) // unchanged
  })

  it('should handle complex objects', () => {
    interface ComplexState {
      user: { name: string; age: number }
      settings: { theme: string }
    }
    
    const initialState: ComplexState = {
      user: { name: 'John', age: 30 },
      settings: { theme: 'dark' }
    }
    
    const { result } = renderHook(() => useUndoRedo({ initialState }))
    
    act(() => {
      result.current.setState({
        ...result.current.state!,
        user: { name: 'Jane', age: 25 }
      })
    })
    
    expect(result.current.state?.user.name).toBe('Jane')
    
    act(() => {
      result.current.undo()
    })
    
    expect(result.current.state?.user.name).toBe('John')
  })

  it('should not undo when history is empty', () => {
    const { result } = renderHook(() => useUndoRedo({ initialState: { count: 0 } }))
    
    act(() => {
      result.current.undo()
    })
    
    expect(result.current.state).toEqual({ count: 0 })
  })

  it('should not redo when redo history is empty', () => {
    const { result } = renderHook(() => useUndoRedo({ initialState: { count: 0 } }))
    
    act(() => {
      result.current.redo()
    })
    
    expect(result.current.state).toEqual({ count: 0 })
  })

  it('should call onChange callback when state changes', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useUndoRedo({ 
      initialState: { count: 0 },
      onChange 
    }))
    
    act(() => {
      result.current.setState({ count: 1 })
    })
    
    expect(onChange).toHaveBeenCalledWith({ count: 1 }, { count: 0 })
  })

  it('should handle arrays as state', () => {
    const { result } = renderHook(() => useUndoRedo({ initialState: [1, 2, 3] }))
    
    act(() => {
      result.current.setState([1, 2, 3, 4])
    })
    
    expect(result.current.state).toEqual([1, 2, 3, 4])
    
    act(() => {
      result.current.undo()
    })
    
    expect(result.current.state).toEqual([1, 2, 3])
  })

  it('should handle primitive states', () => {
    const { result } = renderHook(() => useUndoRedo({ initialState: 'initial' }))
    
    act(() => {
      result.current.setState('changed')
    })
    
    expect(result.current.state).toBe('changed')
    
    act(() => {
      result.current.undo()
    })
    
    expect(result.current.state).toBe('initial')
  })
})
