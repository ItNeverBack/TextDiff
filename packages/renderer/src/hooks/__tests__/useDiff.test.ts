import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDiff } from '../useDiff'
import type { DiffResult } from '@shared/types/diff.types'

// Mock window.api
const mockComputeDiff = vi.fn()
vi.stubGlobal('api', {
  computeDiff: mockComputeDiff,
})

describe('useDiff', () => {
  const mockDiffResult: DiffResult = {
    lines: [],
    chunks: [],
    stats: {
      equalLines: 0,
      insertedLines: 0,
      deletedLines: 0,
      modifiedLines: 0,
      totalLines: 0,
      chunkCount: 0,
    },
    computedAt: Date.now(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockComputeDiff.mockResolvedValue(mockDiffResult)
  })

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useDiff())
    
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.diffResult).toBeNull()
    expect(result.current.computeTime).toBe(0)
  })

  it('should compute diff successfully', async () => {
    const { result } = renderHook(() => useDiff())
    
    await act(async () => {
      await result.current.computeDiff('/left.txt', '/right.txt')
    })
    
    expect(mockComputeDiff).toHaveBeenCalledWith('/left.txt', '/right.txt', expect.any(Object))
    expect(result.current.diffResult).toEqual(mockDiffResult)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should set loading state during computation', async () => {
    let resolvePromise: (value: DiffResult) => void
    mockComputeDiff.mockReturnValue(new Promise((resolve) => {
      resolvePromise = resolve
    }))
    
    const { result } = renderHook(() => useDiff())
    
    act(() => {
      result.current.computeDiff('/left.txt', '/right.txt')
    })
    
    expect(result.current.isLoading).toBe(true)
    
    await act(async () => {
      resolvePromise!(mockDiffResult)
      await Promise.resolve()
    })
    
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle computation error', async () => {
    const error = new Error('Computation failed')
    mockComputeDiff.mockRejectedValue(error)
    
    const { result } = renderHook(() => useDiff())
    
    await act(async () => {
      await result.current.computeDiff('/left.txt', '/right.txt')
    })
    
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(error)
    expect(result.current.diffResult).toBeNull()
  })

  it('should reset state', async () => {
    const { result } = renderHook(() => useDiff())
    
    await act(async () => {
      await result.current.computeDiff('/left.txt', '/right.txt')
    })
    
    expect(result.current.diffResult).not.toBeNull()
    
    act(() => {
      result.current.reset()
    })
    
    expect(result.current.diffResult).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.computeTime).toBe(0)
  })

  it('should pass options to computeDiff', async () => {
    const { result } = renderHook(() => useDiff())
    const options = { ignoreWhitespace: true, ignoreCase: true }
    
    await act(async () => {
      await result.current.computeDiff('/left.txt', '/right.txt', options)
    })
    
    expect(mockComputeDiff).toHaveBeenCalledWith('/left.txt', '/right.txt', expect.objectContaining(options))
  })

  it('should track compute time', async () => {
    const { result } = renderHook(() => useDiff())
    
    await act(async () => {
      await result.current.computeDiff('/left.txt', '/right.txt')
    })
    
    expect(result.current.computeTime).toBeGreaterThanOrEqual(0)
  })

  it('should prevent concurrent computations', async () => {
    let resolveFirst: () => void
    mockComputeDiff.mockReturnValue(new Promise((resolve) => {
      resolveFirst = () => resolve(mockDiffResult)
    }))
    
    const { result } = renderHook(() => useDiff())
    
    act(() => {
      result.current.computeDiff('/left.txt', '/right.txt')
    })
    
    // Try to start second computation while first is running
    const secondResult = await act(async () => {
      return result.current.computeDiff('/other.txt', '/other2.txt')
    })
    
    // Second call should be ignored or queued
    expect(mockComputeDiff).toHaveBeenCalledTimes(1)
    
    await act(async () => {
      resolveFirst!()
      await Promise.resolve()
    })
  })

  it('should cancel ongoing computation', async () => {
    const { result } = renderHook(() => useDiff())
    
    act(() => {
      result.current.computeDiff('/left.txt', '/right.txt')
    })
    
    act(() => {
      result.current.cancel()
    })
    
    expect(result.current.isLoading).toBe(false)
  })

  it('should recompute with same files', async () => {
    const { result } = renderHook(() => useDiff())
    
    await act(async () => {
      await result.current.computeDiff('/left.txt', '/right.txt')
    })
    
    await act(async () => {
      await result.current.recompute()
    })
    
    expect(mockComputeDiff).toHaveBeenCalledTimes(2)
  })

  it('should not recompute without files', async () => {
    const { result } = renderHook(() => useDiff())
    
    await act(async () => {
      await result.current.recompute()
    })
    
    expect(mockComputeDiff).not.toHaveBeenCalled()
  })
})
