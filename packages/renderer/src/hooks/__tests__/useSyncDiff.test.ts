import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSyncDiff } from '../useSyncDiff'
import type { DiffResult, DiffLine } from '@shared/types/diff.types'

// Mock window.api
vi.stubGlobal('api', {
  syncDiff: vi.fn()
})

describe('useSyncDiff', () => {
  const mockDiffResult: DiffResult = {
    lines: [
      { type: 'equal', leftContent: 'line 1', rightContent: 'line 1', leftLineNumber: 1, rightLineNumber: 1 },
      { type: 'insert', leftContent: '', rightContent: 'inserted', leftLineNumber: -1, rightLineNumber: 2 },
      { type: 'delete', leftContent: 'deleted', rightContent: '', leftLineNumber: 2, rightLineNumber: -1 },
    ] as DiffLine[],
    chunks: [],
    stats: {
      equalLines: 1,
      insertedLines: 1,
      deletedLines: 1,
      modifiedLines: 0,
      totalLines: 3,
      chunkCount: 0
    },
    computedAt: Date.now()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // @ts-expect-error - mock
    window.api.syncDiff = vi.fn().mockResolvedValue(mockDiffResult)
  })

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useSyncDiff())
    
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.syncedResult).toBeNull()
  })

  it('should sync diff successfully', async () => {
    const { result } = renderHook(() => useSyncDiff())
    
    result.current.syncDiff(mockDiffResult, 'left')
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.syncedResult).toEqual(mockDiffResult)
    })
  })

  it('should set loading state during sync', async () => {
    const { result } = renderHook(() => useSyncDiff())
    
    let resolvePromise: (value: DiffResult) => void
    const pendingPromise = new Promise<DiffResult>((resolve) => {
      resolvePromise = resolve
    })
    // @ts-expect-error - mock
    window.api.syncDiff = vi.fn().mockReturnValue(pendingPromise)
    
    result.current.syncDiff(mockDiffResult, 'left')
    
    expect(result.current.isLoading).toBe(true)
    
    resolvePromise!(mockDiffResult)
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should handle sync error', async () => {
    const error = new Error('Sync failed')
    // @ts-expect-error - mock
    window.api.syncDiff = vi.fn().mockRejectedValue(error)
    
    const { result } = renderHook(() => useSyncDiff())
    
    result.current.syncDiff(mockDiffResult, 'left')
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(error)
    })
  })

  it('should reset state when reset is called', async () => {
    const { result } = renderHook(() => useSyncDiff())
    
    result.current.syncDiff(mockDiffResult, 'left')
    
    await waitFor(() => {
      expect(result.current.syncedResult).not.toBeNull()
    })
    
    result.current.reset()
    
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.syncedResult).toBeNull()
  })

  it('should pass source parameter to API', async () => {
    const { result } = renderHook(() => useSyncDiff())
    
    result.current.syncDiff(mockDiffResult, 'right')
    
    await waitFor(() => {
      // @ts-expect-error - mock
      expect(window.api.syncDiff).toHaveBeenCalledWith(mockDiffResult, 'right')
    })
  })

  it('should handle null diff result', async () => {
    const { result } = renderHook(() => useSyncDiff())
    
    result.current.syncDiff(null as unknown as DiffResult, 'left')
    
    await waitFor(() => {
      // @ts-expect-error - mock
      expect(window.api.syncDiff).toHaveBeenCalledWith(null, 'left')
    })
  })
})
