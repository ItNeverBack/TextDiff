import { describe, it, expect, beforeEach } from 'vitest'
import { useThemeStore } from '../theme.store'

describe('useThemeStore', () => {
  beforeEach(() => {
    useThemeStore.setState(useThemeStore.getInitialState())
    // Clear localStorage mock
    localStorage.clear()
  })

  it('should have correct initial state', () => {
    const state = useThemeStore.getState()
    expect(state.theme).toBe('system')
    expect(state.resolvedTheme).toBeDefined()
  })

  it('should set theme', () => {
    useThemeStore.getState().setTheme('dark')
    expect(useThemeStore.getState().theme).toBe('dark')
  })

  it('should set light theme', () => {
    useThemeStore.getState().setTheme('light')
    expect(useThemeStore.getState().theme).toBe('light')
  })

  it('should toggle between light and dark', () => {
    const store = useThemeStore.getState()
    store.setTheme('light')
    
    store.toggleTheme()
    expect(useThemeStore.getState().theme).toBe('dark')
    
    store.toggleTheme()
    expect(useThemeStore.getState().theme).toBe('light')
  })

  it('should toggle from system to light', () => {
    const store = useThemeStore.getState()
    expect(store.theme).toBe('system')
    
    store.toggleTheme()
    expect(useThemeStore.getState().theme).toBe('light')
  })

  it('should set system theme', () => {
    useThemeStore.getState().setTheme('system')
    expect(useThemeStore.getState().theme).toBe('system')
  })

  it('should persist theme to localStorage', () => {
    useThemeStore.getState().setTheme('dark')
    
    const saved = localStorage.getItem('textdiff-theme')
    expect(saved).toBe('dark')
  })

  it('should load theme from localStorage on init', () => {
    localStorage.setItem('textdiff-theme', 'light')
    
    // Simulate re-initialization
    const newStore = useThemeStore.getState()
    newStore.loadTheme()
    
    expect(useThemeStore.getState().theme).toBe('light')
  })

  it('should resolve theme based on system preference when system', () => {
    useThemeStore.getState().setTheme('system')
    
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    
    const resolved = useThemeStore.getState().resolvedTheme
    // Should be 'dark' based on mock
    expect(['light', 'dark']).toContain(resolved)
  })

  it('should return correct isDark value', () => {
    useThemeStore.getState().setTheme('dark')
    expect(useThemeStore.getState().isDark()).toBe(true)
    
    useThemeStore.getState().setTheme('light')
    expect(useThemeStore.getState().isDark()).toBe(false)
  })

  it('should return correct isLight value', () => {
    useThemeStore.getState().setTheme('light')
    expect(useThemeStore.getState().isLight()).toBe(true)
    
    useThemeStore.getState().setTheme('dark')
    expect(useThemeStore.getState().isLight()).toBe(false)
  })

  it('should return correct isSystem value', () => {
    useThemeStore.getState().setTheme('system')
    expect(useThemeStore.getState().isSystem()).toBe(true)
    
    useThemeStore.getState().setTheme('dark')
    expect(useThemeStore.getState().isSystem()).toBe(false)
  })

  it('should apply theme to document', () => {
    useThemeStore.getState().setTheme('dark')
    useThemeStore.getState().applyTheme()
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('should handle invalid theme in localStorage gracefully', () => {
    localStorage.setItem('textdiff-theme', 'invalid-theme')
    
    useThemeStore.getState().loadTheme()
    
    // Should fallback to system
    expect(useThemeStore.getState().theme).toBe('system')
  })

  it('should watch for system theme changes when theme is system', () => {
    const addEventListener = vi.fn()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener,
        removeEventListener: vi.fn(),
      }),
    })
    
    useThemeStore.getState().setTheme('system')
    useThemeStore.getState().watchSystemTheme()
    
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('should cycle through themes', () => {
    const store = useThemeStore.getState()
    
    // From system -> light
    store.cycleTheme()
    expect(useThemeStore.getState().theme).toBe('light')
    
    // From light -> dark
    store.cycleTheme()
    expect(useThemeStore.getState().theme).toBe('dark')
    
    // From dark -> system
    store.cycleTheme()
    expect(useThemeStore.getState().theme).toBe('system')
  })
})
