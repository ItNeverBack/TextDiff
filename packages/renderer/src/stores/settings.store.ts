import type { AppSettings } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'
import { create } from 'zustand'
import { api } from '../lib/api'

interface SettingsState {
  settings: AppSettings
  isLoading: boolean
  error: string | null
}

interface SettingsActions {
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>
  resetSettings: () => Promise<void>
  loadFromBackend: () => Promise<void>
  clearError: () => void
}

export const useSettingsStore = create<SettingsState & SettingsActions>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  isLoading: false,
  error: null,

  updateSettings: async (updates) => {
    set({ isLoading: true, error: null })
    try {
      // 先更新本地状态（乐观更新）
      const newSettings = {
        ...get().settings,
        ...updates,
        diff: updates.diff ? { ...get().settings.diff, ...updates.diff } : get().settings.diff,
        editor: updates.editor ? { ...get().settings.editor, ...updates.editor } : get().settings.editor,
        keyBindings: updates.keyBindings ? { ...get().settings.keyBindings, ...updates.keyBindings } : get().settings.keyBindings
      }
      set({ settings: newSettings })

      // 同步到后端
      await api.updateSettings(updates)
    } catch (error) {
      set({ error: String(error), isLoading: false })
      // 错误时回滚到之前的设置
      get().loadFromBackend()
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  resetSettings: async () => {
    set({ isLoading: true, error: null })
    try {
      set({ settings: { ...DEFAULT_SETTINGS } })
      await api.updateSettings(DEFAULT_SETTINGS)
    } catch (error) {
      set({ error: String(error) })
    } finally {
      set({ isLoading: false })
    }
  },

  loadFromBackend: async () => {
    set({ isLoading: true, error: null })
    try {
      const settings = await api.getSettings()
      set({ settings, isLoading: false })
    } catch (error) {
      console.error('Failed to load settings:', error)
      set({ error: String(error), isLoading: false })
      // 如果后端加载失败，使用默认设置
      set({ settings: { ...DEFAULT_SETTINGS } })
    }
  },

  clearError: () => {
    set({ error: null })
  }
}))

if (typeof window !== 'undefined') {
  useSettingsStore.subscribe((state, prevState) => {
    if (state.settings.diff !== prevState.settings.diff) {
      import('./diff.store').then(({ useDiffStore }) => {
        useDiffStore.getState().resetToSettingsDefaults()
      })
    }
  })

  useSettingsStore.getState().loadFromBackend()
}
