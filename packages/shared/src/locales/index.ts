/**
 * TextDiff 国际化 (i18n) 入口
 * 参考: TextDiff-DevPlan.md Week 13 国际化
 */

import type { Language, LocaleDictionary, TranslationKey } from '../types/i18n.types'
import { zhCN } from './zh-CN'
import { enUS } from './en-US'

/** 所有语言字典 */
export const locales: LocaleDictionary = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

/** 默认语言 */
export const DEFAULT_LANGUAGE: Language = 'zh-CN'

/** 可用语言列表 */
export const AVAILABLE_LANGUAGES: { code: Language; name: string; nativeName: string }[] = [
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'en-US', name: 'English (US)', nativeName: 'English' },
]

/**
 * 获取翻译文本
 * @param key 翻译键名
 * @param language 语言代码
 * @returns 翻译文本
 */
export function t(key: TranslationKey, language: Language = DEFAULT_LANGUAGE): string {
  const locale = locales[language]
  if (!locale) {
    console.warn(`[i18n] Language '${language}' not found, falling back to default`)
    return locales[DEFAULT_LANGUAGE][key] || key
  }

  const translation = locale[key]
  if (!translation) {
    console.warn(`[i18n] Translation key '${key}' not found in '${language}'`)
    return locales[DEFAULT_LANGUAGE][key] || key
  }

  return translation
}

/**
 * 检查语言是否有效
 * @param lang 语言代码
 * @returns 是否有效
 */
export function isValidLanguage(lang: string): lang is Language {
  return lang in locales
}

/**
 * 获取语言名称
 * @param lang 语言代码
 * @returns 语言名称
 */
export function getLanguageName(lang: Language): string {
  const info = AVAILABLE_LANGUAGES.find(l => l.code === lang)
  return info?.name || lang
}

/**
 * 获取语言本地名称
 * @param lang 语言代码
 * @returns 语言本地名称
 */
export function getLanguageNativeName(lang: Language): string {
  const info = AVAILABLE_LANGUAGES.find(l => l.code === lang)
  return info?.nativeName || lang
}

// 重新导出类型
export type { Language, TranslationKey, TranslationDictionary, LocaleDictionary } from '../types/i18n.types'
