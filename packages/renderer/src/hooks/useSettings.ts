import { useCallback } from 'react'
import { useSettingsStore } from '../stores'
import type { AppSettings, WhitespaceMode } from '@shared/types'

export function useSettings() {
  const {
    settings,
    isLoading,
    error,
    updateSettings,
    resetSettings,
    loadFromBackend,
    clearError
  } = useSettingsStore()

  // 便捷方法：更新主题
  const setTheme = useCallback((theme: AppSettings['theme']) => {
    return updateSettings({ theme })
  }, [updateSettings])

  // 便捷方法：更新语言
  const setLanguage = useCallback((language: AppSettings['language']) => {
    return updateSettings({ language })
  }, [updateSettings])

  // 便捷方法：更新 Diff 设置
  const setDiffSettings = useCallback((diffSettings: Partial<AppSettings['diff']>) => {
    return updateSettings({
      diff: { ...settings.diff, ...diffSettings }
    })
  }, [updateSettings, settings.diff])

  // 便捷方法：更新编辑器设置
  const setEditorSettings = useCallback((editorSettings: Partial<AppSettings['editor']>) => {
    return updateSettings({
      editor: { ...settings.editor, ...editorSettings }
    })
  }, [updateSettings, settings.editor])

  // 便捷方法：设置忽略空白符
  const setIgnoreWhitespace = useCallback((mode: WhitespaceMode) => {
    return setDiffSettings({ defaultIgnoreWhitespace: mode })
  }, [setDiffSettings])

  // 便捷方法：设置忽略大小写
  const setIgnoreCase = useCallback((ignore: boolean) => {
    return setDiffSettings({ defaultIgnoreCase: ignore })
  }, [setDiffSettings])

  // 便捷方法：设置忽略行尾符
  const setIgnoreLineEndings = useCallback((ignore: boolean) => {
    return setDiffSettings({ defaultIgnoreLineEndings: ignore })
  }, [setDiffSettings])

  // 便捷方法：设置字体大小
  const setFontSize = useCallback((size: number) => {
    return setEditorSettings({ fontSize: size })
  }, [setEditorSettings])

  // 便捷方法：设置字体
  const setFontFamily = useCallback((family: string) => {
    return setEditorSettings({ fontFamily: family })
  }, [setEditorSettings])

  // 便捷方法：设置 Tab 大小
  const setTabSize = useCallback((size: number) => {
    return setEditorSettings({ tabSize: size })
  }, [setEditorSettings])

  // 便捷方法：设置差异算法
  const setAlgorithm = useCallback((algorithm: AppSettings['diff']['defaultAlgorithm']) => {
    return setDiffSettings({ defaultAlgorithm: algorithm })
  }, [setDiffSettings])

  return {
    // 状态
    settings,
    isLoading,
    error,
    
    // 基础操作
    updateSettings,
    resetSettings,
    loadFromBackend,
    clearError,
    
    // 便捷方法
    setTheme,
    setLanguage,
    setDiffSettings,
    setEditorSettings,
    setIgnoreWhitespace,
    setIgnoreCase,
    setIgnoreLineEndings,
    setFontSize,
    setFontFamily,
    setTabSize,
    setAlgorithm
  }
}
