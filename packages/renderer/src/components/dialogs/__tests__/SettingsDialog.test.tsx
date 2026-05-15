import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SettingsDialog } from '../dialogs/SettingsDialog'
import type { AppSettings } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'

// Mock stores
const mockUpdateSettings = vi.fn()
const mockLoadFromBackend = vi.fn()
const mockSetLanguage = vi.fn()
const mockSetTheme = vi.fn()

vi.mock('../../stores', () => ({
  useSettingsStore: vi.fn(() => ({
    settings: DEFAULT_SETTINGS,
    updateSettings: mockUpdateSettings,
    loadFromBackend: mockLoadFromBackend
  })),
  useLanguageStore: vi.fn(() => ({
    setLanguage: mockSetLanguage
  })),
  useThemeStore: vi.fn(() => ({
    setTheme: mockSetTheme
  }))
}))

// Mock useI18n hook
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'dialog.settings.title': '设置',
    'dialog.settings.theme': '主题',
    'dialog.settings.language': '语言',
    'dialog.settings.editor': '编辑器',
    'dialog.settings.diff': '对比',
    'dialog.shortcuts.title': '快捷键',
    'dialog.save': '保存',
    'dialog.cancel': '取消',
    'dialog.reset': '重置',
    'dialog.settings.fontSize': '字体大小',
    'dialog.settings.fontFamily': '字体',
    'dialog.settings.tabSize': '制表符大小',
    'dialog.settings.showInvisibleChars': '显示不可见字符',
    'dialog.settings.display': '显示',
    'dialog.settings.defaultIgnoreWhitespace': '忽略空白字符',
    'dialog.settings.defaultIgnoreCase': '忽略大小写',
    'dialog.settings.defaultIgnoreLineEnding': '忽略换行符',
    'dialog.settings.defaultAlgorithm': '对比算法',
    'dialog.settings.contextLines': '上下文行数',
    'dialog.settings.foldUnchanged': '折叠未变更代码',
    'dialog.ignorePanel.whitespaceNone': '不忽略',
    'dialog.ignorePanel.whitespaceLeadingTrailing': '忽略首尾',
    'dialog.ignorePanel.whitespaceAll': '忽略所有',
    'dialog.settings.themeLight': '浅色',
    'dialog.settings.themeDark': '深色',
    'dialog.settings.themeSystem': '跟随系统',
    'dialog.resetConfirm.title': '确认重置',
    'dialog.resetConfirm.general': '确定要重置通用设置吗？',
    'dialog.resetConfirm.editor': '确定要重置编辑器设置吗？',
    'dialog.resetConfirm.diff': '确定要重置对比设置吗？',
    'dialog.resetConfirm.shortcuts': '确定要重置快捷键设置吗？',
    'dialog.ignorePanel.ignoreComments': '忽略注释',
    'dialog.settings.commentPrefixes': '注释前缀',
    'dialog.ignorePanel.addPrefixPlaceholder': '添加前缀',
    'dialog.ignorePanel.prefixExists': '前缀已存在',
    'dialog.ignorePanel.algorithm': '算法设置'
  }
  return translations[key] || key
})

vi.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({ t: mockT })
}))

// Mock ShortcutEditor
vi.mock('./ShortcutEditor', () => ({
  ShortcutEditor: vi.fn(({ keyBindings, onChange }: { keyBindings: any, onChange: (kb: any) => void }) => (
    <div data-testid="shortcut-editor">
      <button onClick={() => onChange({ 'test': 'Ctrl+T' })}>Update Shortcuts</button>
    </div>
  ))
}))

describe('SettingsDialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('打开时显示设置标题', () => {
    render(<SettingsDialog {...defaultProps} />)

    expect(screen.getByText('设置')).toBeInTheDocument()
  })

  it('打开时加载后端设置', () => {
    render(<SettingsDialog {...defaultProps} />)

    expect(mockLoadFromBackend).toHaveBeenCalled()
  })

  it('显示所有设置标签页', () => {
    render(<SettingsDialog {...defaultProps} />)

    expect(screen.getByText('主题')).toBeInTheDocument()
    expect(screen.getByText('编辑器')).toBeInTheDocument()
    expect(screen.getByText('对比')).toBeInTheDocument()
    expect(screen.getByText('快捷键')).toBeInTheDocument()
  })

  it('点击标签页切换内容', () => {
    render(<SettingsDialog {...defaultProps} />)

    // 默认显示通用设置（主题）
    expect(screen.getByLabelText('主题')).toBeInTheDocument()

    // 切换到编辑器标签
    fireEvent.click(screen.getByText('编辑器'))
    expect(screen.getByLabelText('字体大小')).toBeInTheDocument()

    // 切换到对比标签
    fireEvent.click(screen.getByText('对比'))
    expect(screen.getByLabelText('忽略空白字符')).toBeInTheDocument()

    // 切换到快捷键标签
    fireEvent.click(screen.getByText('快捷键'))
    expect(screen.getByTestId('shortcut-editor')).toBeInTheDocument()
  })

  it('修改主题后触发 onUpdate', async () => {
    render(<SettingsDialog {...defaultProps} />)

    const themeSelect = screen.getByLabelText('主题')
    fireEvent.change(themeSelect, { target: { value: 'dark' } })

    // 点击保存
    fireEvent.click(screen.getByText('保存'))

    await waitFor(() => {
      expect(mockSetTheme).toHaveBeenCalledWith('dark')
      expect(mockUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({
        theme: 'dark'
      }))
    })
  })

  it('修改语言后触发 onUpdate', async () => {
    render(<SettingsDialog {...defaultProps} />)

    const languageSelect = screen.getByLabelText('语言')
    fireEvent.change(languageSelect, { target: { value: 'en-US' } })

    // 点击保存
    fireEvent.click(screen.getByText('保存'))

    await waitFor(() => {
      expect(mockSetLanguage).toHaveBeenCalledWith('en-US')
      expect(mockUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({
        language: 'en-US'
      }))
    })
  })

  it('修改字体大小', async () => {
    render(<SettingsDialog {...defaultProps} />)

    // 切换到编辑器标签
    fireEvent.click(screen.getByText('编辑器'))

    const fontSizeInput = screen.getByLabelText('字体大小')
    fireEvent.change(fontSizeInput, { target: { value: '16' } })

    // 点击保存
    fireEvent.click(screen.getByText('保存'))

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({
        editor: expect.objectContaining({
          fontSize: 16
        })
      }))
    })
  })

  it('修改忽略空白字符选项', async () => {
    render(<SettingsDialog {...defaultProps} />)

    // 切换到对比标签
    fireEvent.click(screen.getByText('对比'))

    const whitespaceSelect = screen.getByLabelText('忽略空白字符')
    fireEvent.change(whitespaceSelect, { target: { value: 'all' } })

    // 点击保存
    fireEvent.click(screen.getByText('保存'))

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({
        diff: expect.objectContaining({
          defaultIgnoreWhitespace: 'all'
        })
      }))
    })
  })

  it('切换忽略大小写开关', async () => {
    render(<SettingsDialog {...defaultProps} />)

    // 切换到对比标签
    fireEvent.click(screen.getByText('对比'))

    const ignoreCaseToggle = screen.getByLabelText('忽略大小写')
    fireEvent.click(ignoreCaseToggle)

    // 点击保存
    fireEvent.click(screen.getByText('保存'))

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({
        diff: expect.objectContaining({
          defaultIgnoreCase: true
        })
      }))
    })
  })

  it('选择对比算法', async () => {
    render(<SettingsDialog {...defaultProps} />)

    // 切换到对比标签
    fireEvent.click(screen.getByText('对比'))

    // 选择 Patience 算法
    const patienceRadio = screen.getByDisplayValue('patience')
    fireEvent.click(patienceRadio)

    // 点击保存
    fireEvent.click(screen.getByText('保存'))

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({
        diff: expect.objectContaining({
          defaultAlgorithm: 'patience'
        })
      }))
    })
  })

  it('点击取消不保存更改', () => {
    const onClose = vi.fn()
    render(<SettingsDialog open={true} onClose={onClose} />)

    // 修改一些设置
    const themeSelect = screen.getByLabelText('主题')
    fireEvent.change(themeSelect, { target: { value: 'dark' } })

    // 点击取消
    fireEvent.click(screen.getByText('取消'))

    expect(onClose).toHaveBeenCalled()
    expect(mockUpdateSettings).not.toHaveBeenCalled()
  })

  it('点击确定关闭对话框', () => {
    const onClose = vi.fn()
    render(<SettingsDialog open={true} onClose={onClose} />)

    fireEvent.click(screen.getByText('保存'))

    expect(onClose).toHaveBeenCalled()
  })

  it('点击重置显示确认对话框', () => {
    render(<SettingsDialog {...defaultProps} />)

    fireEvent.click(screen.getByText('重置'))

    expect(screen.getByText('确认重置')).toBeInTheDocument()
  })

  it('确认重置后恢复默认值', async () => {
    render(<SettingsDialog {...defaultProps} />)

    // 点击重置
    fireEvent.click(screen.getByText('重置'))

    // 确认重置
    fireEvent.click(screen.getByText('重置'))

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalled()
    })
  })

  it('取消重置后关闭确认对话框', () => {
    render(<SettingsDialog {...defaultProps} />)

    // 点击重置
    fireEvent.click(screen.getByText('重置'))

    // 取消重置
    fireEvent.click(screen.getAllByText('取消')[1])

    expect(screen.queryByText('确认重置')).not.toBeInTheDocument()
  })

  it('关闭按钮点击后关闭对话框', () => {
    const onClose = vi.fn()
    render(<SettingsDialog open={true} onClose={onClose} />)

    const closeButton = screen.getByText('×')
    fireEvent.click(closeButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('对话框关闭时（open=false）不渲染内容', () => {
    render(<SettingsDialog open={false} onClose={vi.fn()} />)

    expect(screen.queryByText('设置')).not.toBeInTheDocument()
  })

  it('添加快捷键绑定时触发更新', async () => {
    render(<SettingsDialog {...defaultProps} />)

    // 切换到快捷键标签
    fireEvent.click(screen.getByText('快捷键'))

    // 点击更新快捷键按钮（来自 mock）
    fireEvent.click(screen.getByText('Update Shortcuts'))

    // 点击保存
    fireEvent.click(screen.getByText('保存'))

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({
        keyBindings: expect.any(Object)
      }))
    })
  })

  it('修改对比算法为 Histogram', async () => {
    render(<SettingsDialog {...defaultProps} />)

    // 切换到对比标签
    fireEvent.click(screen.getByText('对比'))

    // 选择 Histogram 算法
    const histogramRadio = screen.getByDisplayValue('histogram')
    fireEvent.click(histogramRadio)

    // 点击保存
    fireEvent.click(screen.getByText('保存'))

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({
        diff: expect.objectContaining({
          defaultAlgorithm: 'histogram'
        })
      }))
    })
  })
})
