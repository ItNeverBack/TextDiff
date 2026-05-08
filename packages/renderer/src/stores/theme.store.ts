import type { Theme } from '@shared/types'
import { create } from 'zustand'

type ResolvedTheme = 'light' | 'dark'

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolve(theme: Theme): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme
}

interface ThemeState {
  theme: Theme
  resolvedTheme: ResolvedTheme
}

interface ThemeActions {
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  syncSystemTheme: () => void
}

export const useThemeStore = create<ThemeState & ThemeActions>()((set, get) => ({
  theme: 'system',
  resolvedTheme: resolve('system'),

  setTheme: (theme) => {
    set({ theme, resolvedTheme: resolve(theme) })
  },

  toggleTheme: () => {
    const current = get()
    let next: Theme
    if (current.theme === 'system') {
      next = current.resolvedTheme === 'light' ? 'dark' : 'light'
    } else {
      next = current.theme === 'light' ? 'dark' : 'light'
    }
    set({ theme: next, resolvedTheme: resolve(next) })
  },

  syncSystemTheme: () => {
    if (get().theme === 'system') {
      set({ resolvedTheme: getSystemTheme() })
    }
  },
}))
