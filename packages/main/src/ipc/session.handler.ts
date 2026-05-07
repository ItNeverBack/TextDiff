import { ipcMain } from 'electron'
import type { DiffSession, RecentFile, RecentDirectory, ListOptions } from '@shared/types'
import { sessionRepository, recentFilesRepository, recentDirectoriesRepository } from '../session'

export function registerSessionHandlers(): void {
  ipcMain.handle('session:save', async (_event, session: DiffSession): Promise<void> => {
    sessionRepository.save(session)
  })

  ipcMain.handle('session:load', async (_event, id: string): Promise<DiffSession | null> => {
    return sessionRepository.load(id)
  })

  ipcMain.handle('session:list', async (_event, options?: ListOptions): Promise<DiffSession[]> => {
    return sessionRepository.list(options)
  })

  ipcMain.handle('session:delete', async (_event, id: string): Promise<void> => {
    sessionRepository.delete(id)
  })

  ipcMain.handle('recentFiles:get', async (_event, limit?: number): Promise<RecentFile[]> => {
    return recentFilesRepository.list(limit)
  })

  ipcMain.handle('recentFiles:add', async (_event, filepath: string): Promise<void> => {
    recentFilesRepository.add(filepath)
  })

  ipcMain.handle('recentDirectories:get', async (_event, limit?: number): Promise<RecentDirectory[]> => {
    return recentDirectoriesRepository.list(limit)
  })

  ipcMain.handle('recentDirectories:add', async (_event, dirPath: string): Promise<void> => {
    recentDirectoriesRepository.add(dirPath)
  })
}
