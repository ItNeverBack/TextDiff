/**
 * TextDiff 语言切换组件
 * 参考: TextDiff-DevPlan.md Week 13 国际化
 */

import { useI18n } from '../../hooks/useI18n'
import { AVAILABLE_LANGUAGES, getLanguageNativeName } from '@shared/locales'
import type { Language } from '@shared/types'

interface LanguageSwitcherProps {
  /** 自定义类名 */
  className?: string
  /** 变化回调 */
  onChange?: (lang: Language) => void
}

export function LanguageSwitcher({ className = '', onChange }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useI18n()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as Language
    setLanguage(newLang)
    onChange?.(newLang)
  }

  return (
    <div className={`language-switcher ${className}`}>
      <label className="language-label">
        {t('dialog.settings.language')}
      </label>
      <select
        className="language-select"
        value={language}
        onChange={handleChange}
      >
        {AVAILABLE_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {getLanguageNativeName(lang.code)}
          </option>
        ))}
      </select>
    </div>
  )
}
