import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ipcMain } from 'electron'
import type { DiffSession, RecentFile, RecentDirectory, ListOptions } from '@shared/types'

// Mock Electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}))

// Mock session repository
const mockSessionSave = vi.fn()
const mockSessionLoad = vi.fn()
const mockSessionList = vi.fn()
const mockSessionDelete = vi.fn()
const mockRecentFilesList = vi.fn()
const mockRecentFilesAdd = vi.fn()
const mockRecentDirsList = vi.fn()
const mockRecentDirsAdd = vi.fn()

vi.mock('../session', () => ({
  sessionRepository: {
    save: (session: DiffSession) => mockSessionSave(session),
    load: (id: string) => mockSessionLoad(id),
    list: (options?: ListOptions) => mockSessionList(options),
    delete: (id: string) => mockSessionDelete(id),
  },
  recentFilesRepository: {
    list: (limit?: number) => mockRecentFilesList(limit),
    add: (filepath: string) => mockRecentFilesAdd(filepath),
  },
  recentDirectoriesRepository: {
    list: (limit?: number) => mockRecentDirsList(limit),
    add: (dirPath: string) => mockRecentDirsAdd(dirPath),
  },
}))

describe('Session Handler', () => {
  const mockSession: DiffSession = {
    id: 'session-1',
    name: 'Test Session',
    leftPath: '/test/left.txt',
    rightPath: '/test/right.txt',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  const mockRecentFile: RecentFile = {
    path: '/test/file.txt',
    name: 'file.txt',
    lastOpened: Date.now(),
  }

  const mockRecentDir: RecentDirectory = {
    path: '/test/dir',
    name: 'dir',
    lastOpened: Date.now(),
  }

  let registeredHandlers: Map<string, Function> = new Map()

  beforeEach(() => {
    vi.clearAllMocks()
    registeredHandlers.clear()

    // Capture registered handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: Function) => {
      registeredHandlers.set(channel, handler)
    })

    // Import and register handlers
    return import('../session.handler').then(({ registerSessionHandlers }) => {
      registerSessionHandlers()
    })
  })

  describe('Handler Registration', () => {
    it('should register all session handlers', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith('session:save', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('session:load', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('session:list', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('session:delete', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('recentFiles:get', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('recentFiles:add', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('recentDirectories:get', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('recentDirectories:add', expect.any(Function))
    })
  })

  describe('session:save', () => {
    it('should save session', async () => {
      mockSessionSave.mockResolvedValue(undefined)

      const handler = registeredHandlers.get('session:save')
      await handler({}, mockSession)

      expect(mockSessionSave).toHaveBeenCalledWith(mockSession)
    })
  })

  describe('session:load', () => {
    it('should load session by id', async () => {
      mockSessionLoad.mockReturnValue(mockSession)

      const handler = registeredHandlers.get('session:load')
      const result = await handler({}, 'session-1')

      expect(mockSessionLoad).toHaveBeenCalledWith('session-1')
      expect(result).toEqual(mockSession)
    })

    it('should return null for non-existent session', async () => {
      mockSessionLoad.mockReturnValue(null)

      const handler = registeredHandlers.get('session:load')
      const result = await handler({}, 'non-existent')

      expect(result).toBeNull()
    })
  })

  describe('session:list', () => {
    it('should list all sessions', async () => {
      const mockSessions = [mockSession]
      mockSessionList.mockReturnValue(mockSessions)

      const handler = registeredHandlers.get('session:list')
      const result = await handler({}, undefined)

      expect(mockSessionList).toHaveBeenCalledWith(undefined)
      expect(result).toEqual(mockSessions)
    })

    it('should pass options to list', async () => {
      const options: ListOptions = { limit: 10, offset: 0 }
      mockSessionList.mockReturnValue([])

      const handler = registeredHandlers.get('session:list')
      await handler({}, options)

      expect(mockSessionList).toHaveBeenCalledWith(options)
    })
  })

  describe('session:delete', () => {
    it('should delete session', async () => {
      mockSessionDelete.mockResolvedValue(undefined)

      const handler = registeredHandlers.get('session:delete')
      await handler({}, 'session-1')

      expect(mockSessionDelete).toHaveBeenCalledWith('session-1')
    })
  })

  describe('recentFiles:get', () => {
    it('should get recent files', async () => {
      const mockFiles = [mockRecentFile]
      mockRecentFilesList.mockReturnValue(mockFiles)

      const handler = registeredHandlers.get('recentFiles:get')
      const result = await handler({}, undefined)

      expect(mockRecentFilesList).toHaveBeenCalledWith(undefined)
      expect(result).toEqual(mockFiles)
    })

    it('should pass limit to list', async () => {
      mockRecentFilesList.mockReturnValue([])

      const handler = registeredHandlers.get('recentFiles:get')
      await handler({}, 10)

      expect(mockRecentFilesList).toHaveBeenCalledWith(10)
    })
  })

  describe('recentFiles:add', () => {
    it('should add recent file', async () => {
      mockRecentFilesAdd.mockResolvedValue(undefined)

      const handler = registeredHandlers.get('recentFiles:add')
      await handler({}, '/test/file.txt')

      expect(mockRecentFilesAdd).toHaveBeenCalledWith('/test/file.txt')
    })
  })

  describe('recentDirectories:get', () => {
    it('should get recent directories', async () => {
      const mockDirs = [mockRecentDir]
      mockRecentDirsList.mockReturnValue(mockDirs)

      const handler = registeredHandlers.get('recentDirectories:get')
      const result = await handler({}, undefined)

      expect(mockRecentDirsList).toHaveBeenCalledWith(undefined)
      expect(result).toEqual(mockDirs)
    })

    it('should pass limit to list', async () => {
      mockRecentDirsList.mockReturnValue([])

      const handler = registeredHandlers.get('recentDirectories:get')
      await handler({}, 10)

      expect(mockRecentDirsList).toHaveBeenCalledWith(10)
    })
  })

  describe('recentDirectories:add', () => {
    it('should add recent directory', async () => {
      mockRecentDirsAdd.mockResolvedValue(undefined)

      const handler = registeredHandlers.get('recentDirectories:add')
      await handler({}, '/test/dir')

      expect(mockRecentDirsAdd).toHaveBeenCalledWith('/test/dir')
    })
  })
})
