import { ipcMain, dialog } from 'electron'
import type { OpenDialogOptions, SaveDialogOptions } from '@shared/types/ipc.types'

export function registerDialogHandlers(): void {
  ipcMain.handle('dialog:open', async (_event, options: OpenDialogOptions): Promise<string[] | null> => {
    const result = await dialog.showOpenDialog({
      title: options.title,
      defaultPath: options.defaultPath,
      filters: options.filters,
      properties: options.properties || ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths
  })

  ipcMain.handle('dialog:save', async (_event, options: SaveDialogOptions): Promise<string | null> => {
    const result = await dialog.showSaveDialog({
      title: options.title,
      defaultPath: options.defaultPath,
      filters: options.filters
    })

    if (result.canceled || !result.filePath) {
      return null
    }

    return result.filePath
  })
}
