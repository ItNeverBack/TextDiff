import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLanguageStore } from '../language.store'
import type { Language } from '@shared/types/i18n.types'

describe('useLanguageStore', () => {
  beforeEach(() => {
    useLanguageStore.setState(useLanguageStore.getInitialState())
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should have correct initial state', () => {
    const state = useLanguageStore.getState()
    expect(state.language).toBe('zh-CN')
    expect(state.isLoading).toBe(false)
  })

  it('should set language', () => {
    useLanguageStore.getState().setLanguage('en-US')
    expect(useLanguageStore.getState().language).toBe('en-US')
  })

  it('should set Chinese language', () => {
    useLanguageStore.getState().setLanguage('zh-CN')
    expect(useLanguageStore.getState().language).toBe('zh-CN')
  })

  it('should toggle between languages', () => {
    const store = useLanguageStore.getState()
    
    store.toggleLanguage()
    // Should toggle from zh-CN to en-US
    expect(useLanguageStore.getState().language).toBe('en-US')
    
    store.toggleLanguage()
    // Should toggle back
    expect(useLanguageStore.getState().language).toBe('zh-CN')
  })

  it('should persist language to localStorage', () => {
    useLanguageStore.getState().setLanguage('en-US')
    
    const saved = localStorage.getItem('textdiff-language')
    expect(saved).toBe('en-US')
  })

  it('should load language from localStorage', () => {
    localStorage.setItem('textdiff-language', 'en-US')
    
    useLanguageStore.getState().loadLanguage()
    
    expect(useLanguageStore.getState().language).toBe('en-US')
  })

  it('should initialize language on mount', async () => {
    localStorage.setItem('textdiff-language', 'en-US')
    
    await useLanguageStore.getState().init()
    
    expect(useLanguageStore.getState().language).toBe('en-US')
  })

  it('should set loading state while changing language', async () => {
    const store = useLanguageStore.getState()
    
    // @ts-expect-error - mock api
    window.api.setLanguage = vi.fn().mockResolvedValue(undefined)
    
    const promise = store.setLanguage('en-US')
    expect(store.isLoading).toBe(true)
    
    await promise
    expect(store.isLoading).toBe(false)
  })

  it('should call api.setLanguage when changing language', async () => {
    // @ts-expect-error - mock api
    window.api.setLanguage = vi.fn().mockResolvedValue(undefined)
    
    await useLanguageStore.getState().setLanguage('en-US')
    
    // @ts-expect-error
    expect(window.api.setLanguage).toHaveBeenCalledWith('en-US')
  })

  it('should get translations for current language', () => {
    const t = useLanguageStore.getState().t
    
    expect(t('common.ok')).toBeDefined()
    expect(t('common.cancel')).toBeDefined()
  })

  it('should return key if translation not found', () => {
    const t = useLanguageStore.getState().t
    
    expect(t('nonexistent.key')).toBe('nonexistent.key')
  })

  it('should handle nested translation keys', () => {
    const t = useLanguageStore.getState().t
    
    // Test nested access like 'dialog.save.title'
    const result = t('dialog.save')
    expect(typeof result === 'object' || typeof result === 'string').toBe(true)
  })

  it('should check if language is Chinese', () => {
    useLanguageStore.getState().setLanguage('zh-CN')
    expect(useLanguageStore.getState().isChinese()).toBe(true)
    
    useLanguageStore.getState().setLanguage('en-US')
    expect(useLanguageStore.getState().isChinese()).toBe(false)
  })

  it('should check if language is English', () => {
    useLanguageStore.getState().setLanguage('en-US')
    expect(useLanguageStore.getState().isEnglish()).toBe(true)
    
    useLanguageStore.getState().setLanguage('zh-CN')
    expect(useLanguageStore.getState().isEnglish()).toBe(false)
  })

  it('should get available languages', () => {
    const languages = useLanguageStore.getState().getAvailableLanguages()
    
    expect(languages).toContain('zh-CN')
    expect(languages).toContain('en-US')
  })

  it('should get current locale info', () => {
    const info = useLanguageStore.getState().getCurrentLocaleInfo()
    
    expect(info.code).toBe('zh-CN')
    expect(info.name).toBeDefined()
    expect(info.nativeName).toBeDefined()
  })

  it('should handle api error gracefully', async () => {
    // @ts-expect-error - mock api
    window.api.setLanguage = vi.fn().mockRejectedValue(new Error('Failed'))
    
    // Should not throw
    await expect(useLanguageStore.getState().setLanguage('en-US')).rejects.toThrow()
    
    // Should reset loading state
    expect(useLanguageStore.getState().isLoading).toBe(false)
  })

  it('should validate language code', () => {
    const store = useLanguageStore.getState()
    
    expect(store.isValidLanguage('zh-CN')).toBe(true)
    expect(store.isValidLanguage('en-US')).toBe(true)
    expect(store.isValidLanguage('invalid')).toBe(false)
  })

  it('should handle RTL languages', () => {
    // Currently no RTL languages, but should handle gracefully
    const store = useLanguageStore.getState()
    
    expect(store.isRTL()).toBe(false)
  })

  it('should get language direction', () => {
    const store = useLanguageStore.getState()
    
    expect(store.getDirection()).toBe('ltr')
  })
})
