import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSettingsStore } from '../settings.store'
import { DEFAULT_SETTINGS } from '@shared/types/settings.types'

describe('useSettingsStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS },
      isLoading: false,
      error: null
    })
    
    // Clear mocks
    vi.clearAllMocks()
  })

  describe('初始状态', () => {
    it('应使用默认设置初始化', () => {
      const state = useSettingsStore.getState()
      expect(state.settings).toEqual(DEFAULT_SETTINGS)
    })

    it('初始 isLoading 应为 false', () => {
      expect(useSettingsStore.getState().isLoading).toBe(false)
    })

    it('初始 error 应为 null', () => {
      expect(useSettingsStore.getState().error).toBeNull()
    })
  })

  describe('updateSettings', () => {
    it('应更新设置中的单个值', async () => {
      const { updateSettings } = useSettingsStore.getState()
      
      await updateSettings({ theme: 'dark' })
      
      expect(useSettingsStore.getState().settings.theme).toBe('dark')
    })

    it('应合并嵌套的 diff 设置', async () => {
      const { updateSettings } = useSettingsStore.getState()
      
      await updateSettings({ 
        diff: { defaultIgnoreWhitespace: 'all' }
      })
      
      const settings = useSettingsStore.getState().settings
      expect(settings.diff.defaultIgnoreWhitespace).toBe('all')
      // Other diff settings should be preserved
      expect(settings.diff.defaultIgnoreCase).toBe(DEFAULT_SETTINGS.diff.defaultIgnoreCase)
    })

    it('应合并嵌套的 editor 设置', async () => {
      const { updateSettings } = useSettingsStore.getState()
      
      await updateSettings({ 
        editor: { fontSize: 16 }
      })
      
      const settings = useSettingsStore.getState().settings
      expect(settings.editor.fontSize).toBe(16)
      expect(settings.editor.tabSize).toBe(DEFAULT_SETTINGS.editor.tabSize)
    })

    it('设置过程中应设置 isLoading 为 true', async () => {
      const { updateSettings } = useSettingsStore.getState()
      
      // Mock the API to delay resolution
      const mockApi = (global as any).api
      let resolvePromise: () => void
      mockApi.updateSettings.mockReturnValue(new Promise(resolve => {
        resolvePromise = resolve as any
      }))
      
      const updatePromise = updateSettings({ theme: 'light' })
      
      expect(useSettingsStore.getState().isLoading).toBe(true)
      
      resolvePromise!()
      await updatePromise
    })

    it('API 错误时应设置 error', async () => {
      const { updateSettings } = useSettingsStore.getState()
      const mockApi = (global as any).api
      mockApi.updateSettings.mockRejectedValue(new Error('API Error'))
      // Make loadFromBackend also fail so error state is preserved
      mockApi.getSettings.mockRejectedValue(new Error('Load failed'))
      
      try {
        await updateSettings({ theme: 'dark' })
      } catch {
        // Expected to throw
      }
      
      const error = useSettingsStore.getState().error
      expect(error && error.includes('API Error')).toBe(true)
    })

    it('API 错误时应回滚到之前的设置', async () => {
      const { updateSettings } = useSettingsStore.getState()
      const mockApi = (global as any).api
      
      // First set a custom value
      useSettingsStore.setState({
        settings: { ...DEFAULT_SETTINGS, theme: 'dark' }
      })
      
      // Then cause an error
      mockApi.updateSettings.mockRejectedValue(new Error('API Error'))
      mockApi.getSettings.mockResolvedValue(DEFAULT_SETTINGS)
      
      try {
        await updateSettings({ theme: 'light' })
      } catch {
        // Expected to throw
      }
      
      // Should rollback via loadFromBackend
      expect(mockApi.getSettings).toHaveBeenCalled()
    })
  })

  describe('resetSettings', () => {
    it('应将设置重置为默认值', async () => {
      const { resetSettings } = useSettingsStore.getState()
      
      // First change some settings
      useSettingsStore.setState({
        settings: { 
          ...DEFAULT_SETTINGS, 
          theme: 'dark',
          diff: { ...DEFAULT_SETTINGS.diff, defaultIgnoreWhitespace: 'all' }
        }
      })
      
      await resetSettings()
      
      expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS)
    })

    it('重置时应设置 isLoading 为 true', async () => {
      const { resetSettings } = useSettingsStore.getState()
      const mockApi = (global as any).api
      
      let resolvePromise: () => void
      mockApi.updateSettings.mockReturnValue(new Promise(resolve => {
        resolvePromise = resolve as any
      }))
      
      const resetPromise = resetSettings()
      expect(useSettingsStore.getState().isLoading).toBe(true)
      
      resolvePromise!()
      await resetPromise
    })

    it('重置失败时应设置 error', async () => {
      const { resetSettings } = useSettingsStore.getState()
      const mockApi = (global as any).api
      mockApi.updateSettings.mockRejectedValue(new Error('Reset failed'))
      
      await resetSettings()
      
      expect(useSettingsStore.getState().error).toContain('Reset failed')
    })
  })

  describe('loadFromBackend', () => {
    it('应从后端加载设置', async () => {
      const customSettings = {
        ...DEFAULT_SETTINGS,
        theme: 'dark' as const,
        language: 'en-US' as const
      }
      
      const mockApi = (global as any).api
      mockApi.getSettings.mockResolvedValue(customSettings)
      
      const { loadFromBackend } = useSettingsStore.getState()
      await loadFromBackend()
      
      expect(useSettingsStore.getState().settings.theme).toBe('dark')
      expect(useSettingsStore.getState().settings.language).toBe('en-US')
    })

    it('加载失败时应使用默认设置', async () => {
      const mockApi = (global as any).api
      mockApi.getSettings.mockRejectedValue(new Error('Load failed'))
      
      // First set custom settings
      useSettingsStore.setState({
        settings: { ...DEFAULT_SETTINGS, theme: 'dark' }
      })
      
      const { loadFromBackend } = useSettingsStore.getState()
      await loadFromBackend()
      
      // Should fallback to defaults
      expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS)
      expect(useSettingsStore.getState().error).toContain('Load failed')
    })

    it('加载过程中应设置 isLoading 为 true', async () => {
      const mockApi = (global as any).api
      let resolvePromise: () => void
      mockApi.getSettings.mockReturnValue(new Promise(resolve => {
        resolvePromise = () => resolve(DEFAULT_SETTINGS)
      }))
      
      const { loadFromBackend } = useSettingsStore.getState()
      const loadPromise = loadFromBackend()
      
      expect(useSettingsStore.getState().isLoading).toBe(true)
      
      resolvePromise!()
      await loadPromise
      
      expect(useSettingsStore.getState().isLoading).toBe(false)
    })
  })

  describe('clearError', () => {
    it('应清除错误状态', () => {
      useSettingsStore.setState({ error: 'Some error' })
      
      const { clearError } = useSettingsStore.getState()
      clearError()
      
      expect(useSettingsStore.getState().error).toBeNull()
    })
  })

  describe('设置结构验证', () => {
    it('应包含所有必需的设置字段', () => {
      const { settings } = useSettingsStore.getState()
      
      // Top-level fields
      expect(settings).toHaveProperty('theme')
      expect(settings).toHaveProperty('language')
      expect(settings).toHaveProperty('diff')
      expect(settings).toHaveProperty('editor')
      expect(settings).toHaveProperty('keyBindings')
    })

    it('diff 设置应包含所有必需字段', () => {
      const { diff } = useSettingsStore.getState().settings
      
      expect(diff).toHaveProperty('defaultIgnoreWhitespace')
      expect(diff).toHaveProperty('defaultIgnoreCase')
      expect(diff).toHaveProperty('defaultIgnoreLineEndings')
      expect(diff).toHaveProperty('defaultIgnoreComments')
      expect(diff).toHaveProperty('defaultCommentPrefixes')
      expect(diff).toHaveProperty('defaultAlgorithm')
      expect(diff).toHaveProperty('contextLines')
      expect(diff).toHaveProperty('foldUnchanged')
    })

    it('editor 设置应包含所有必需字段', () => {
      const { editor } = useSettingsStore.getState().settings
      
      expect(editor).toHaveProperty('fontSize')
      expect(editor).toHaveProperty('fontFamily')
      expect(editor).toHaveProperty('tabSize')
      expect(editor).toHaveProperty('showInvisibleCharacters')
      expect(editor).toHaveProperty('wordWrap')
    })
  })
})
