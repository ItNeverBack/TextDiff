import { ipcMain, dialog } from 'electron'
import type { FileInfo } from '@shared/types'
import { readFile, writeFile } from '../fs'
import { recentFilesRepository } from '../session'
import { watchFile } from '../fs/watcher'

// 存储活跃的文件监听器，key 为文件路径
const activeWatchers = new Map<string, () => void>()

export function registerFileHandlers(): void {
  ipcMain.handle('file:open', async (_event, side: 'left' | 'right'): Promise<FileInfo | null> => {
    const result = await dialog.showOpenDialog({
      title: side === 'left' ? '打开左侧文件' : '打开右侧文件',
      properties: ['openFile'],
      filters: [
        { name: '所有文件', extensions: ['*'] },
        { name: '文本文件', extensions: ['txt', 'json', 'yml', 'yaml', 'xml'] },
        { name: '代码文件', extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'go', 'rs', 'java', 'c', 'cpp'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const filepath = result.filePaths[0]
    recentFilesRepository.add(filepath)
    return await readFile(filepath)
  })

  ipcMain.handle('file:read', async (_event, filepath: string): Promise<FileInfo> => {
    return await readFile(filepath)
  })

  ipcMain.handle('file:write', async (_event, filepath: string, content: string): Promise<void> => {
    return await writeFile(filepath, content)
  })

  // watchFile 使用 ipcMain.on（非 invoke）因为需要推送事件回渲染进程
  ipcMain.on('file:watch:start', (event, filepath: string) => {
    // 若已有监听器则先停止
    const existing = activeWatchers.get(filepath)
    if (existing) existing()

    const channel = `file:watch:${filepath}`
    const stop = watchFile(filepath, (watchEvent) => {
      // 向发起监听的渲染进程推送事件
      if (!event.sender.isDestroyed()) {
        event.sender.send(channel, watchEvent)
      }
    })
    activeWatchers.set(filepath, stop)
  })

  ipcMain.on('file:watch:stop', (_event, filepath: string) => {
    const stop = activeWatchers.get(filepath)
    if (stop) {
      stop()
      activeWatchers.delete(filepath)
    }
  })
}
