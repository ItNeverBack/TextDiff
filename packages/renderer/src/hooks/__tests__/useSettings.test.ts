import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSettings } from '../useSettings'
import type { AppSettings } from '@shared/types/settings.types'

// Mock window.api
const mockGetSettings = vi.fn()
const mockUpdateSettings = vi.fn()

vi.stubGlobal('api', {
  getSettings: mockGetSettings,
  updateSettings: mockUpdateSettings,
})

describe('useSettings', () => {
  const mockSettings: AppSettings = {
    theme: 'system',
    language: 'zh-CN',
    diffAlgorithm: 'myers',
    ignoreWhitespace: 'none',
    ignoreCase: false,
    ignoreLineEndings: false,
    contextLines: 3,
    showLineNumbers: true,
    wordWrap: false,
    fontSize: 14,
    fontFamily: 'monospace',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSettings.mockResolvedValue(mockSettings)
    mockUpdateSettings.mockResolvedValue(mockSettings)
  })

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useSettings())
    
    expect(result.current.settings).toBeNull()
    expect(result.current.isLoading).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('should load settings on mount', async () => {
    const { result } = renderHook(() => useSettings())
    
    await vi.waitFor(() => {
      expect(result.current.settings).toEqual(mockSettings)
    })
    
    expect(mockGetSettings).toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })

  it('should update settings', async () => {
    const { result } = renderHook(() => useSettings())
    
    await vi.waitFor(() => {
      expect(result.current.settings).toEqual(mockSettings)
    })
    
    const updates = { theme: 'dark' as const }
    const updatedSettings = { ...mockSettings, ...updates }
    mockUpdateSettings.mockResolvedValue(updatedSettings)
    
    await act(async () => {
      await result.current.update(updates)
    })
    
    expect(mockUpdateSettings).toHaveBeenCalledWith(updates)
    expect(result.current.settings?.theme).toBe('dark')
  })

  it('should optimistically update local state', async () => {
    const { result } = renderHook(() => useSettings())
    
    await vi.waitFor(() => {
      expect(result.current.settings).toEqual(mockSettings)
    })
    
    const updates = { fontSize: 16 }
    
    // Delay the API response
    mockUpdateSettings.mockReturnValue(new Promise((resolve) => {
      setTimeout(() => resolve({ ...mockSettings, ...updates }), 100)
    }))
    
    act(() => {
      result.current.update(updates)
    })
    
    // Should be optimistically updated
    expect(result.current.settings?.fontSize).toBe(16)
  })

  it('should rollback on API error', async () => {
    const { result } = renderHook(() => useSettings())
    
    await vi.waitFor(() => {
      expect(result.current.settings).toEqual(mockSettings)
    })
    
    const error = new Error('Update failed')
    mockUpdateSettings.mockRejectedValue(error)
    
    await act(async () => {
      await result.current.update({ theme: 'dark' })
    })
    
    // Should rollback to original value
    expect(result.current.settings?.theme).toBe('system')
    expect(result.current.error).toBe(error)
  })

  it('should reset settings to default', async () => {
    const { result } = renderHook(() => useSettings())
    
    await vi.waitFor(() => {
      expect(result.current.settings).toEqual(mockSettings)
    })
    
    const defaultSettings: AppSettings = {
      theme: 'system',
      language: 'zh-CN',
      diffAlgorithm: 'myers',
      ignoreWhitespace: 'none',
      ignoreCase: false,
      ignoreLineEndings: false,
      contextLines: 3,
      showLineNumbers: true,
      wordWrap: false,
      fontSize: 14,
      fontFamily: 'monospace',
    }
    
    mockUpdateSettings.mockResolvedValue(defaultSettings)
    
    await act(async () => {
      await result.current.reset()
    })
    
    expect(mockUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({
      theme: 'system',
    }))
  })

  it('should update a single setting', async () => {
    const { result } = renderHook(() => useSettings())
    
    await vi.waitFor(() => {
      expect(result.current.settings).toEqual(mockSettings)
    })
    
    const updatedSettings = { ...mockSettings, wordWrap: true }
    mockUpdateSettings.mockResolvedValue(updatedSettings)
    
    await act(async () => {
      await result.current.setSetting('wordWrap', true)
    })
    
    expect(mockUpdateSettings).toHaveBeenCalledWith({ wordWrap: true })
  })

  it('should check if settings are loaded', async () => {
    const { result } = renderHook(() => useSettings())
    
    expect(result.current.isLoaded).toBe(false)
    
    await vi.waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })
  })

  it('should clear error', async () => {
    mockGetSettings.mockRejectedValue(new Error('Failed'))
    
    const { result } = renderHook(() => useSettings())
    
    await vi.waitFor(() => {
      expect(result.current.error).not.toBeNull()
    })
    
    act(() => {
      result.current.clearError()
    })
    
    expect(result.current.error).toBeNull()
  })

  it('should refresh settings', async () => {
    const { result } = renderHook(() => useSettings())
    
    await vi.waitFor(() => {
      expect(mockGetSettings).toHaveBeenCalledTimes(1)
    })
    
    await act(async () => {
      await result.current.refresh()
    })
    
    expect(mockGetSettings).toHaveBeenCalledTimes(2)
  })

  it('should export settings', async () => {
    const { result } = renderHook(() => useSettings())
    
    await vi.waitFor(() => {
      expect(result.current.settings).toEqual(mockSettings)
    })
    
    const exported = result.current.export()
    
    expect(exported).toEqual(mockSettings)
  })

  it('should import settings', async () => {
    const { result } = renderHook(() => useSettings())
    
    await vi.waitFor(() => {
      expect(result.current.settings).toEqual(mockSettings)
    })
    
    const newSettings: Partial<AppSettings> = {
      theme: 'light',
      fontSize: 18,
    }
    
    mockUpdateSettings.mockResolvedValue({ ...mockSettings, ...newSettings })
    
    await act(async () => {
      await result.current.import(newSettings)
    })
    
    expect(mockUpdateSettings).toHaveBeenCalledWith(newSettings)
  })
})
