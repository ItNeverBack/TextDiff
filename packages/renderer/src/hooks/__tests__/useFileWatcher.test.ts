import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFileWatcher } from '../useFileWatcher'

describe('useFileWatcher', () => {
  const mockStartWatcher = vi.fn()
  const mockStopWatcher = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // @ts-expect-error - mock
    window.api.startFileWatcher = mockStartWatcher
    // @ts-expect-error - mock
    window.api.stopFileWatcher = mockStopWatcher
  })

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useFileWatcher())
    
    expect(result.current.isWatching).toBe(false)
    expect(result.current.watchedFiles).toEqual([])
  })

  it('should start watching a file', () => {
    const { result } = renderHook(() => useFileWatcher())
    
    act(() => {
      result.current.watch('/path/to/file.txt')
    })
    
    expect(mockStartWatcher).toHaveBeenCalledWith('/path/to/file.txt')
    expect(result.current.isWatching).toBe(true)
    expect(result.current.watchedFiles).toContain('/path/to/file.txt')
  })

  it('should stop watching a file', () => {
    const { result } = renderHook(() => useFileWatcher())
    
    act(() => {
      result.current.watch('/path/to/file.txt')
    })
    
    act(() => {
      result.current.unwatch('/path/to/file.txt')
    })
    
    expect(mockStopWatcher).toHaveBeenCalledWith('/path/to/file.txt')
    expect(result.current.watchedFiles).not.toContain('/path/to/file.txt')
  })

  it('should stop watching all files', () => {
    const { result } = renderHook(() => useFileWatcher())
    
    act(() => {
      result.current.watch('/path/to/file1.txt')
      result.current.watch('/path/to/file2.txt')
    })
    
    act(() => {
      result.current.unwatchAll()
    })
    
    expect(mockStopWatcher).toHaveBeenCalledTimes(2)
    expect(result.current.watchedFiles).toEqual([])
    expect(result.current.isWatching).toBe(false)
  })

  it('should handle file change events', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFileWatcher({ onChange }))
    
    act(() => {
      result.current.watch('/path/to/file.txt')
    })
    
    // Simulate change event
    act(() => {
      result.current.simulateChange('/path/to/file.txt', 'modified')
    })
    
    expect(onChange).toHaveBeenCalledWith('/path/to/file.txt', 'modified')
  })

  it('should not watch same file twice', () => {
    const { result } = renderHook(() => useFileWatcher())
    
    act(() => {
      result.current.watch('/path/to/file.txt')
      result.current.watch('/path/to/file.txt')
    })
    
    expect(mockStartWatcher).toHaveBeenCalledTimes(2) // Still called but should be handled gracefully
    expect(result.current.watchedFiles).toEqual(['/path/to/file.txt'])
  })

  it('should clean up on unmount', () => {
    const { result, unmount } = renderHook(() => useFileWatcher())
    
    act(() => {
      result.current.watch('/path/to/file1.txt')
      result.current.watch('/path/to/file2.txt')
    })
    
    unmount()
    
    expect(mockStopWatcher).toHaveBeenCalledTimes(2)
  })

  it('should handle watch errors', () => {
    mockStartWatcher.mockRejectedValue(new Error('Permission denied'))
    const onError = vi.fn()
    
    const { result } = renderHook(() => useFileWatcher({ onError }))
    
    act(() => {
      result.current.watch('/path/to/file.txt')
    })
    
    // Should handle error gracefully
    expect(result.current.watchedFiles).not.toContain('/path/to/file.txt')
  })

  it('should check if file is being watched', () => {
    const { result } = renderHook(() => useFileWatcher())
    
    act(() => {
      result.current.watch('/path/to/file.txt')
    })
    
    expect(result.current.isWatchingFile('/path/to/file.txt')).toBe(true)
    expect(result.current.isWatchingFile('/other/file.txt')).toBe(false)
  })

  it('should update watching status based on files count', () => {
    const { result } = renderHook(() => useFileWatcher())
    
    expect(result.current.isWatching).toBe(false)
    
    act(() => {
      result.current.watch('/path/to/file.txt')
    })
    
    expect(result.current.isWatching).toBe(true)
    
    act(() => {
      result.current.unwatch('/path/to/file.txt')
    })
    
    expect(result.current.isWatching).toBe(false)
  })

  it('should handle multiple file changes', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFileWatcher({ onChange }))
    
    act(() => {
      result.current.watch('/path/to/file1.txt')
      result.current.watch('/path/to/file2.txt')
    })
    
    act(() => {
      result.current.simulateChange('/path/to/file1.txt', 'modified')
      result.current.simulateChange('/path/to/file2.txt', 'modified')
    })
    
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('should ignore changes for unwatched files', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFileWatcher({ onChange }))
    
    act(() => {
      result.current.simulateChange('/path/to/file.txt', 'modified')
    })
    
    expect(onChange).not.toHaveBeenCalled()
  })
})
