import type { AppSettings } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'
import { getDatabase } from '../session/database'

export class SettingsManager {
  private settings: AppSettings

  constructor() {
    this.settings = { ...DEFAULT_SETTINGS }
    this.load()
  }

  private load(): void {
    try {
      const db = getDatabase()
      const stmt = db.prepare('SELECT key, value FROM settings')
      const rows = stmt.all() as { key: string; value: string }[]

      const storedSettings: Partial<AppSettings> = {}

      for (const row of rows) {
        try {
          storedSettings[row.key as keyof AppSettings] = JSON.parse(row.value)
        } catch {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(storedSettings as Record<string, unknown>)[row.key] = row.value
        }
      }

      this.settings = {
        ...DEFAULT_SETTINGS,
        ...storedSettings,
        diff: { ...DEFAULT_SETTINGS.diff, ...storedSettings.diff },
        editor: { ...DEFAULT_SETTINGS.editor, ...storedSettings.editor }
      }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS }
    }
  }

  get(): AppSettings {
    return { ...this.settings }
  }

  update(updates: Partial<AppSettings>): void {
    this.settings = {
      ...this.settings,
      ...updates,
      diff: updates.diff ? { ...this.settings.diff, ...updates.diff } : this.settings.diff,
      editor: updates.editor ? { ...this.settings.editor, ...updates.editor } : this.settings.editor,
      keyBindings: updates.keyBindings ? { ...this.settings.keyBindings, ...updates.keyBindings } : this.settings.keyBindings
    }

    this.save()
  }

  private save(): void {
    try {
      const db = getDatabase()
      const stmt = db.prepare(`
        INSERT INTO settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `)

      const saveValue = (key: string, value: unknown) => {
        stmt.run(key, JSON.stringify(value))
      }

      saveValue('theme', this.settings.theme)
      saveValue('language', this.settings.language)
      saveValue('diff', this.settings.diff)
      saveValue('editor', this.settings.editor)
      saveValue('keyBindings', this.settings.keyBindings)
    } catch {
      // Handle error silently
    }
  }

  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS }
    this.save()
  }
}

export const settingsManager = new SettingsManager()
