import { ipcMain, dialog, BrowserWindow } from 'electron'
import type { OpenDialogOptions, SaveDialogOptions } from '@shared/types/ipc.types'

export function registerDialogHandlers(): void {
  ipcMain.handle('dialog:open', async (event, options: OpenDialogOptions): Promise<string[] | null> => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showOpenDialog(win, {
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

  ipcMain.handle('dialog:save', async (event, options: SaveDialogOptions): Promise<string | null> => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showSaveDialog(win, {
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
