import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ipcMain, dialog, BrowserWindow } from 'electron'
import type { OpenDialogOptions, SaveDialogOptions } from '@shared/types/ipc.types'

// Mock Electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
  },
  BrowserWindow: {
    fromWebContents: vi.fn(),
  },
}))

describe('Dialog Handler', () => {
  let registeredHandlers: Map<string, Function> = new Map()

  beforeEach(() => {
    vi.clearAllMocks()
    registeredHandlers.clear()

    // Capture registered handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: Function) => {
      registeredHandlers.set(channel, handler)
    })

    // Mock BrowserWindow.fromWebContents
    vi.mocked(BrowserWindow.fromWebContents).mockReturnValue({ id: 1 } as any)

    // Import and register handlers
    return import('../dialog.handler').then(({ registerDialogHandlers }) => {
      registerDialogHandlers()
    })
  })

  describe('Handler Registration', () => {
    it('should register all dialog handlers', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith('dialog:open', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('dialog:save', expect.any(Function))
    })
  })

  describe('dialog:open', () => {
    it('should open file dialog', async () => {
      const mockOptions: OpenDialogOptions = {
        title: 'Select File',
        defaultPath: '/home',
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
        properties: ['openFile'],
      }

      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: ['/home/file.txt'],
      } as any)

      const handler = registeredHandlers.get('dialog:open')
      const result = await handler({ sender: { id: 1 } }, mockOptions)

      expect(dialog.showOpenDialog).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        title: 'Select File',
        defaultPath: '/home',
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
        properties: ['openFile'],
      }))
      expect(result).toEqual(['/home/file.txt'])
    })

    it('should return null when cancelled', async () => {
      const mockOptions: OpenDialogOptions = {
        title: 'Select File',
      }

      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: true,
        filePaths: [],
      } as any)

      const handler = registeredHandlers.get('dialog:open')
      const result = await handler({ sender: { id: 1 } }, mockOptions)

      expect(result).toBeNull()
    })

    it('should handle multiple file selection', async () => {
      const mockOptions: OpenDialogOptions = {
        title: 'Select Files',
        properties: ['openFile', 'multiSelections'],
      }

      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: ['/home/file1.txt', '/home/file2.txt'],
      } as any)

      const handler = registeredHandlers.get('dialog:open')
      const result = await handler({ sender: { id: 1 } }, mockOptions)

      expect(result).toEqual(['/home/file1.txt', '/home/file2.txt'])
    })

    it('should use default properties', async () => {
      const mockOptions: OpenDialogOptions = {
        title: 'Select File',
      }

      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: true,
        filePaths: [],
      } as any)

      const handler = registeredHandlers.get('dialog:open')
      await handler({ sender: { id: 1 } }, mockOptions)

      expect(dialog.showOpenDialog).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        properties: ['openFile'],
      }))
    })
  })

  describe('dialog:save', () => {
    it('should open save dialog', async () => {
      const mockOptions: SaveDialogOptions = {
        title: 'Save File',
        defaultPath: '/home/file.txt',
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
      }

      vi.mocked(dialog.showSaveDialog).mockResolvedValue({
        canceled: false,
        filePath: '/home/file.txt',
      } as any)

      const handler = registeredHandlers.get('dialog:save')
      const result = await handler({ sender: { id: 1 } }, mockOptions)

      expect(dialog.showSaveDialog).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        title: 'Save File',
        defaultPath: '/home/file.txt',
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
      }))
      expect(result).toBe('/home/file.txt')
    })

    it('should return null when cancelled', async () => {
      const mockOptions: SaveDialogOptions = {
        title: 'Save File',
      }

      vi.mocked(dialog.showSaveDialog).mockResolvedValue({
        canceled: true,
        filePath: undefined,
      } as any)

      const handler = registeredHandlers.get('dialog:save')
      const result = await handler({ sender: { id: 1 } }, mockOptions)

      expect(result).toBeNull()
    })
  })
})
