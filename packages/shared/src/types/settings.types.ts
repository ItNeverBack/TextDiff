import type { Theme, WhitespaceMode, DiffAlgorithm } from './diff.types'

export interface DiffSettings {
  defaultIgnoreWhitespace: WhitespaceMode
  defaultIgnoreCase: boolean
  defaultIgnoreLineEndings: boolean
  defaultIgnoreComments: boolean
  defaultCommentPrefixes: string[]
  defaultAlgorithm: DiffAlgorithm
  contextLines: number
  foldUnchanged: boolean
}

export interface EditorSettings {
  fontSize: number
  fontFamily: string
  tabSize: number
  showInvisibleCharacters: boolean
  wordWrap: boolean
}

export interface KeyBindingMap {
  [action: string]: string
}

export interface AppSettings {
  theme: Theme
  language: 'zh-CN' | 'en-US'
  diff: DiffSettings
  editor: EditorSettings
  keyBindings: KeyBindingMap
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  language: 'zh-CN',
  diff: {
    defaultIgnoreWhitespace: 'leading-trailing',
    defaultIgnoreCase: false,
    defaultIgnoreLineEndings: true,
    defaultIgnoreComments: false,
    defaultCommentPrefixes: ['//', '#', '--', ';', '%'],
    defaultAlgorithm: 'myers',
    contextLines: 3,
    foldUnchanged: false
  },
  editor: {
    fontSize: 13,
    fontFamily: "'Geist Mono', 'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
    tabSize: 2,
    showInvisibleCharacters: false,
    wordWrap: false
  },
  keyBindings: {}
}
