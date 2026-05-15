import { ipcMain, dialog, BrowserWindow } from 'electron'
import type { OpenDialogOptions, SaveDialogOptions } from '@shared/types/ipc.types'

export function registerDialogHandlers(): void {
  ipcMain.handle('dialog:open', async (event, options: OpenDialogOptions): Promise<string[] | null> => {
    const win = BrowserWindow.fromWebContents(event.sender)!

    // §修复 Linux 下对话框可能显示在主窗口下层的问题
    // 使用 moveTop() 而不是 focus()，避免触发 "窗口已就绪" 的系统通知
    if (process.platform === 'linux') {
      win.moveTop()
    }

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

    // §修复 Linux 下对话框可能显示在主窗口下层的问题
    if (process.platform === 'linux') {
      win.focus()
    }

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
