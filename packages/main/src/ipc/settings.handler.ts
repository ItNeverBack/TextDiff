import { ipcMain } from 'electron'
import type { AppSettings } from '@shared/types'
import { settingsManager } from '../settings'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', async (): Promise<AppSettings> => {
    return settingsManager.get()
  })

  ipcMain.handle('settings:update', async (_event, updates: Partial<AppSettings>): Promise<void> => {
    settingsManager.update(updates)
  })
}
