import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSession } from '../useSession'
import type { Session } from '@shared/types/session.types'

// Mock window.api
const mockSaveSession = vi.fn()
const mockLoadSession = vi.fn()
const mockListSessions = vi.fn()
const mockDeleteSession = vi.fn()

vi.stubGlobal('api', {
  saveSession: mockSaveSession,
  loadSession: mockLoadSession,
  listSessions: mockListSessions,
  deleteSession: mockDeleteSession,
})

describe('useSession', () => {
  const mockSession: Session = {
    id: 'session-1',
    name: 'Test Session',
    leftFile: { path: '/left.txt', content: 'left content' },
    rightFile: { path: '/right.txt', content: 'right content' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockListSessions.mockResolvedValue([])
    mockSaveSession.mockResolvedValue(mockSession)
    mockLoadSession.mockResolvedValue(mockSession)
    mockDeleteSession.mockResolvedValue(true)
  })

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useSession())
    
    expect(result.current.sessions).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.currentSession).toBeNull()
  })

  it('should load sessions on mount', async () => {
    const sessions = [mockSession]
    mockListSessions.mockResolvedValue(sessions)
    
    const { result } = renderHook(() => useSession())
    
    // Wait for initial load
    await vi.waitFor(() => {
      expect(mockListSessions).toHaveBeenCalled()
    })
    
    expect(result.current.sessions).toEqual(sessions)
  })

  it('should save session', async () => {
    const { result } = renderHook(() => useSession())
    
    await act(async () => {
      await result.current.save(mockSession)
    })
    
    expect(mockSaveSession).toHaveBeenCalledWith(mockSession)
    expect(result.current.isLoading).toBe(false)
  })

  it('should load specific session', async () => {
    const { result } = renderHook(() => useSession())
    
    await act(async () => {
      await result.current.load('session-1')
    })
    
    expect(mockLoadSession).toHaveBeenCalledWith('session-1')
    expect(result.current.currentSession).toEqual(mockSession)
  })

  it('should delete session', async () => {
    const sessions = [mockSession]
    mockListSessions.mockResolvedValue(sessions)
    
    const { result } = renderHook(() => useSession())
    
    await act(async () => {
      await result.current.delete('session-1')
    })
    
    expect(mockDeleteSession).toHaveBeenCalledWith('session-1')
  })

  it('should set loading state during operations', async () => {
    let resolveSave: () => void
    mockSaveSession.mockReturnValue(new Promise((resolve) => {
      resolveSave = () => resolve(mockSession)
    }))
    
    const { result } = renderHook(() => useSession())
    
    act(() => {
      result.current.save(mockSession)
    })
    
    expect(result.current.isLoading).toBe(true)
    
    await act(async () => {
      resolveSave!()
      await Promise.resolve()
    })
    
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle save error', async () => {
    const error = new Error('Save failed')
    mockSaveSession.mockRejectedValue(error)
    
    const { result } = renderHook(() => useSession())
    
    await act(async () => {
      await result.current.save(mockSession)
    })
    
    expect(result.current.error).toBe(error)
    expect(result.current.isLoading).toBe(false)
  })

  it('should create new session', async () => {
    const { result } = renderHook(() => useSession())
    
    const newSessionData = {
      name: 'New Session',
      leftFile: { path: '/left.txt', content: 'left' },
      rightFile: { path: '/right.txt', content: 'right' },
    }
    
    await act(async () => {
      await result.current.create(newSessionData)
    })
    
    expect(mockSaveSession).toHaveBeenCalledWith(expect.objectContaining(newSessionData))
  })

  it('should rename session', async () => {
    const { result } = renderHook(() => useSession())
    
    await act(async () => {
      await result.current.rename('session-1', 'New Name')
    })
    
    expect(mockSaveSession).toHaveBeenCalledWith(expect.objectContaining({
      id: 'session-1',
      name: 'New Name',
    }))
  })

  it('should refresh sessions list', async () => {
    const sessions = [mockSession]
    mockListSessions.mockResolvedValue(sessions)
    
    const { result } = renderHook(() => useSession())
    
    await act(async () => {
      await result.current.refresh()
    })
    
    expect(mockListSessions).toHaveBeenCalledTimes(2) // Once on mount, once on refresh
  })

  it('should clear error', async () => {
    mockSaveSession.mockRejectedValue(new Error('Failed'))
    
    const { result } = renderHook(() => useSession())
    
    await act(async () => {
      await result.current.save(mockSession)
    })
    
    expect(result.current.error).not.toBeNull()
    
    act(() => {
      result.current.clearError()
    })
    
    expect(result.current.error).toBeNull()
  })

  it('should clear current session', async () => {
    mockLoadSession.mockResolvedValue(mockSession)
    
    const { result } = renderHook(() => useSession())
    
    await act(async () => {
      await result.current.load('session-1')
    })
    
    expect(result.current.currentSession).toEqual(mockSession)
    
    act(() => {
      result.current.clearCurrent()
    })
    
    expect(result.current.currentSession).toBeNull()
  })
})
