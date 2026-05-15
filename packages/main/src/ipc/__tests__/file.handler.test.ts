import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ipcMain, dialog, BrowserWindow } from 'electron'
import type { FileInfo } from '@shared/types'

// Mock Electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
  BrowserWindow: {
    fromWebContents: vi.fn(),
  },
}))

// Mock fs modules
const mockReadFile = vi.fn()
const mockWriteFile = vi.fn()
const mockWatchFile = vi.fn()

vi.mock('../fs', () => ({
  readFile: (...args: any[]) => mockReadFile(...args),
  writeFile: (...args: any[]) => mockWriteFile(...args),
}))

vi.mock('../fs/watcher', () => ({
  watchFile: (...args: any[]) => mockWatchFile(...args),
}))

// Mock session repository
const mockRecentFilesAdd = vi.fn()

vi.mock('../session', () => ({
  recentFilesRepository: {
    add: (path: string) => mockRecentFilesAdd(path),
  },
}))

describe('File Handler', () => {
  const mockFileInfo: FileInfo = {
    path: '/test/file.txt',
    name: 'file.txt',
    content: 'test content',
    encoding: 'utf-8',
    lineEnding: 'LF',
    size: 12,
  }

  let registeredHandlers: Map<string, Function> = new Map()

  beforeEach(() => {
    vi.clearAllMocks()
    registeredHandlers.clear()

    // Capture registered handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: Function) => {
      registeredHandlers.set(channel, handler)
    })

    vi.mocked(ipcMain.on).mockImplementation((channel: string, handler: Function) => {
      registeredHandlers.set(channel, handler)
    })

    // Mock BrowserWindow.fromWebContents
    vi.mocked(BrowserWindow.fromWebContents).mockReturnValue({
      id: 1,
    } as any)

    // Import and register handlers
    return import('../file.handler').then(({ registerFileHandlers }) => {
      registerFileHandlers()
    })
  })

  describe('Handler Registration', () => {
    it('should register all file handlers', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith('file:open', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('file:read', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('file:write', expect.any(Function))
      expect(ipcMain.on).toHaveBeenCalledWith('file:watch:start', expect.any(Function))
      expect(ipcMain.on).toHaveBeenCalledWith('file:watch:stop', expect.any(Function))
    })
  })

  describe('file:open', () => {
    it('should open file dialog and return file info', async () => {
      const mockWebContents = { id: 1 }
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue({ id: 1 } as any)
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: ['/test/file.txt'],
      } as any)
      mockReadFile.mockResolvedValue(mockFileInfo)

      const handler = registeredHandlers.get('file:open')
      const result = await handler({ sender: mockWebContents }, 'left')

      expect(dialog.showOpenDialog).toHaveBeenCalled()
      expect(mockReadFile).toHaveBeenCalledWith('/test/file.txt')
      expect(mockRecentFilesAdd).toHaveBeenCalledWith('/test/file.txt')
      expect(result).toEqual(mockFileInfo)
    })

    it('should return null when dialog is cancelled', async () => {
      const mockWebContents = { id: 1 }
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue({ id: 1 } as any)
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: true,
        filePaths: [],
      } as any)

      const handler = registeredHandlers.get('file:open')
      const result = await handler({ sender: mockWebContents }, 'left')

      expect(result).toBeNull()
    })

    it('should use different titles for left and right sides', async () => {
      const mockWebContents = { id: 1 }
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue({ id: 1 } as any)
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: true,
        filePaths: [],
      } as any)

      const handler = registeredHandlers.get('file:open')

      // Test left side
      await handler({ sender: mockWebContents }, 'left')
      expect(vi.mocked(dialog.showOpenDialog).mock.calls[0][1]?.title).toBe('打开左侧文件')

      // Test right side
      await handler({ sender: mockWebContents }, 'right')
      expect(vi.mocked(dialog.showOpenDialog).mock.calls[1][1]?.title).toBe('打开右侧文件')
    })
  })

  describe('file:read', () => {
    it('should read file by path', async () => {
      mockReadFile.mockResolvedValue(mockFileInfo)

      const handler = registeredHandlers.get('file:read')
      const result = await handler({}, '/test/file.txt')

      expect(mockReadFile).toHaveBeenCalledWith('/test/file.txt')
      expect(result).toEqual(mockFileInfo)
    })
  })

  describe('file:write', () => {
    it('should write file content', async () => {
      mockWriteFile.mockResolvedValue(undefined)

      const handler = registeredHandlers.get('file:write')
      await handler({}, '/test/file.txt', 'new content')

      expect(mockWriteFile).toHaveBeenCalledWith('/test/file.txt', 'new content')
    })
  })

  describe('file:watch:start', () => {
    it('should start watching file', async () => {
      const mockStop = vi.fn()
      mockWatchFile.mockReturnValue(mockStop)

      const mockSend = vi.fn()
      const mockWebContents = {
        isDestroyed: () => false,
        send: mockSend,
      }

      const handler = registeredHandlers.get('file:watch:start')
      handler({ sender: mockWebContents }, '/test/file.txt')

      expect(mockWatchFile).toHaveBeenCalledWith('/test/file.txt', expect.any(Function))
    })

    it('should send events to renderer when file changes', async () => {
      const mockStop = vi.fn()
      let watchCallback: Function | null = null
      mockWatchFile.mockImplementation((path, callback) => {
        watchCallback = callback
        return mockStop
      })

      const mockSend = vi.fn()
      const mockWebContents = {
        isDestroyed: () => false,
        send: mockSend,
      }

      const handler = registeredHandlers.get('file:watch:start')
      handler({ sender: mockWebContents }, '/test/file.txt')

      // Simulate file change
      const watchEvent = { type: 'change', path: '/test/file.txt' }
      watchCallback?.(watchEvent)

      expect(mockSend).toHaveBeenCalledWith('file:watch:/test/file.txt', watchEvent)
    })

    it('should not send events if webContents is destroyed', async () => {
      const mockStop = vi.fn()
      let watchCallback: Function | null = null
      mockWatchFile.mockImplementation((path, callback) => {
        watchCallback = callback
        return mockStop
      })

      const mockSend = vi.fn()
      const mockWebContents = {
        isDestroyed: () => true,
        send: mockSend,
      }

      const handler = registeredHandlers.get('file:watch:start')
      handler({ sender: mockWebContents }, '/test/file.txt')

      // Simulate file change
      watchCallback?.({ type: 'change', path: '/test/file.txt' })

      expect(mockSend).not.toHaveBeenCalled()
    })
  })

  describe('file:watch:stop', () => {
    it('should stop watching file', async () => {
      const mockStop = vi.fn()
      mockWatchFile.mockReturnValue(mockStop)

      const mockSend = vi.fn()
      const mockWebContents = {
        isDestroyed: () => false,
        send: mockSend,
      }

      // First start watching
      const startHandler = registeredHandlers.get('file:watch:start')
      startHandler({ sender: mockWebContents }, '/test/file.txt')

      // Then stop watching
      const stopHandler = registeredHandlers.get('file:watch:stop')
      stopHandler({}, '/test/file.txt')

      expect(mockStop).toHaveBeenCalled()
    })
  })
})
