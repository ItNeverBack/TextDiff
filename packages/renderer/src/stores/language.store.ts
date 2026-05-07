/**
 * TextDiff 语言状态管理 (Zustand)
 * 参考: TextDiff-DevPlan.md Week 13 国际化
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@shared/types'
import { DEFAULT_LANGUAGE, isValidLanguage } from '@shared/locales'

interface LanguageState {
  /** 当前语言 */
  language: Language
  /** 设置语言 */
  setLanguage: (lang: Language) => void
  /** 切换语言（中英文互换） */
  toggleLanguage: () => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: DEFAULT_LANGUAGE,

      setLanguage: (lang) => {
        if (!isValidLanguage(lang)) {
          console.warn(`[LanguageStore] Invalid language: ${lang}`)
          return
        }
        set({ language: lang })
        // 更新 HTML lang 属性
        document.documentElement.lang = lang
        // 同步到主进程更新菜单
        if (window.api && 'setLanguage' in window.api) {
          window.api.setLanguage(lang).catch((err: Error) => {
            console.warn('[LanguageStore] Failed to update menu language:', err)
          })
        }
      },

      toggleLanguage: () => {
        const current = get().language
        const newLang: Language = current === 'zh-CN' ? 'en-US' : 'zh-CN'
        set({ language: newLang })
        document.documentElement.lang = newLang
        // 同步到主进程更新菜单
        if (window.api && 'setLanguage' in window.api) {
          window.api.setLanguage(newLang).catch((err: Error) => {
            console.warn('[LanguageStore] Failed to update menu language:', err)
          })
        }
      },
    }),
    {
      name: 'textdiff-language',
      version: 1,
    }
  )
)
