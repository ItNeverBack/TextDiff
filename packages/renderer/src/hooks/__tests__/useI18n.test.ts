import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useI18n } from '../useI18n'
import type { TranslationKey } from '@shared/types/i18n.types'

// Mock zustand store
vi.mock('../language.store', () => ({
  useLanguageStore: () => ({
    language: 'zh-CN',
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.ok': '确定',
        'common.cancel': '取消',
        'dialog.save.title': '保存文件',
        'welcome.title': '欢迎使用 TextDiff',
        'file.open': '打开文件',
        'diff.compare': '比较差异',
      }
      return translations[key] || key
    },
    setLanguage: vi.fn(),
    isChinese: () => true,
    isEnglish: () => false,
    getDirection: () => 'ltr',
  }),
}))

describe('useI18n', () => {
  it('should return translation function', () => {
    const { result } = renderHook(() => useI18n())
    
    expect(typeof result.current.t).toBe('function')
  })

  it('should translate simple key', () => {
    const { result } = renderHook(() => useI18n())
    
    expect(result.current.t('common.ok')).toBe('确定')
  })

  it('should translate nested key', () => {
    const { result } = renderHook(() => useI18n())
    
    expect(result.current.t('dialog.save.title')).toBe('保存文件')
  })

  it('should return key if translation not found', () => {
    const { result } = renderHook(() => useI18n())
    
    expect(result.current.t('nonexistent.key' as TranslationKey)).toBe('nonexistent.key')
  })

  it('should provide current language', () => {
    const { result } = renderHook(() => useI18n())
    
    expect(result.current.language).toBe('zh-CN')
  })

  it('should provide language info', () => {
    const { result } = renderHook(() => useI18n())
    
    expect(result.current.isChinese).toBe(true)
    expect(result.current.isEnglish).toBe(false)
  })

  it('should provide text direction', () => {
    const { result } = renderHook(() => useI18n())
    
    expect(result.current.direction).toBe('ltr')
  })

  it('should memoize translation function', () => {
    const { result, rerender } = renderHook(() => useI18n())
    
    const firstT = result.current.t
    rerender()
    const secondT = result.current.t
    
    expect(firstT).toBe(secondT)
  })

  it('should handle interpolation in translations', () => {
    // Mock with interpolation support
    vi.doMock('../language.store', () => ({
      useLanguageStore: () => ({
        language: 'en-US',
        t: (key: string, params?: Record<string, string>) => {
          let text = key
          if (params) {
            Object.entries(params).forEach(([k, v]) => {
              text = text.replace(`{{${k}}}`, v)
            })
          }
          return text
        },
      }),
    }))
    
    const { result } = renderHook(() => useI18n())
    
    expect(result.current.t('Hello {{name}}', { name: 'World' })).toBe('Hello World')
  })

  it('should switch language function', () => {
    const { result } = renderHook(() => useI18n())
    
    expect(typeof result.current.setLanguage).toBe('function')
  })
})
