import { useEffect, useRef } from 'react'
import { useThemeStore } from '../../stores/theme.store'
import { useSettingsStore } from '../../stores/settings.store'
import { setMonacoTheme } from '../diff-view/monaco-theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, resolvedTheme, setTheme, syncSystemTheme } = useThemeStore()
  const { updateSettings, loadFromBackend } = useSettingsStore()
  const isInitializedRef = useRef(false)

  // Initialize: load settings from backend and apply theme
  useEffect(() => {
    if (isInitializedRef.current) return

    const init = async () => {
      try {
        // Load settings from backend first
        await loadFromBackend()
        // Apply the loaded theme
        const persisted = useSettingsStore.getState().settings.theme
        setTheme(persisted)
        isInitializedRef.current = true
      } catch {
        // If backend fails, keep default theme
        isInitializedRef.current = true
      }
    }

    init()
  }, [loadFromBackend, setTheme])

  // Keep settingsStore in sync when theme changes
  useEffect(() => {
    // Only update backend after initialization
    if (isInitializedRef.current) {
      updateSettings({ theme })
    }
  }, [theme, updateSettings])

  // Sync Monaco Editor theme with global theme
  useEffect(() => {
    setMonacoTheme(resolvedTheme)
  }, [resolvedTheme])

  // Listen for system color scheme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', syncSystemTheme)
    return () => mediaQuery.removeEventListener('change', syncSystemTheme)
  }, [syncSystemTheme])

  return <>{children}</>
}

export function useTheme() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useThemeStore()
  return { theme, resolvedTheme, setTheme, toggleTheme }
}
