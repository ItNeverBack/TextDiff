/**
 * TextDiff 国际化 Hook
 * 参考: TextDiff-DevPlan.md Week 13 国际化
 */

import { useCallback } from 'react'
import { useLanguageStore } from '../stores/language.store'
import { t as translate, type TranslationKey, type Language } from '@shared/locales'

interface UseI18nReturn {
  /** 当前语言 */
  language: Language
  /** 设置语言 */
  setLanguage: (lang: Language) => void
  /** 切换语言 */
  toggleLanguage: () => void
  /** 翻译函数 */
  t: (key: TranslationKey) => string
  /** 是否中文 */
  isZhCN: boolean
  /** 是否英文 */
  isEnUS: boolean
}

/**
 * 国际化 Hook
 * @returns 国际化相关方法和状态
 */
export function useI18n(): UseI18nReturn {
  const { language, setLanguage, toggleLanguage } = useLanguageStore()

  const t = useCallback(
    (key: TranslationKey) => {
      return translate(key, language)
    },
    [language]
  )

  return {
    language,
    setLanguage,
    toggleLanguage,
    t,
    isZhCN: language === 'zh-CN',
    isEnUS: language === 'en-US',
  }
}
