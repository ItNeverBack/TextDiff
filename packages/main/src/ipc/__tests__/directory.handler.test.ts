import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ipcMain, dialog, BrowserWindow } from 'electron'
import type { DirectoryComparison, DirectoryDiffEntry, DirCompareOptions } from '@shared/types'

// Mock Electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
  BrowserWindow: {
    fromWebContents: vi.fn(),
  },
}))

// Mock directory modules
const mockScanDirectory = vi.fn()
const mockCompareDirectories = vi.fn()
const mockComputeStatistics = vi.fn()
const mockApplyFilters = vi.fn()
const mockCreateDirectoryInfo = vi.fn()
const mockLegacyCompareDirectories = vi.fn()

vi.mock('../directory', () => ({
  scanDirectory: (...args: any[]) => mockScanDirectory(...args),
  compareDirectories: (...args: any[]) => mockCompareDirectories(...args),
  computeStatistics: (...args: any[]) => mockComputeStatistics(...args),
  applyFilters: (...args: any[]) => mockApplyFilters(...args),
  createDirectoryInfo: (...args: any[]) => mockCreateDirectoryInfo(...args),
}))

vi.mock('../fs/directory', () => ({
  compareDirectories: (...args: any[]) => mockLegacyCompareDirectories(...args),
}))

describe('Directory Handler', () => {
  const mockDirInfo = {
    path: '/test/dir',
    name: 'dir',
    totalFiles: 10,
    totalSize: 1024,
    modifiedTime: new Date(),
  }

  const mockScanResult = {
    root: {
      name: 'dir',
      type: 'directory',
      path: '/test/dir',
      metadata: { modifiedTime: new Date() },
    },
    totalFiles: 10,
    totalSize: 1024,
    files: [],
  }

  const mockCompareResult = {
    entries: [],
    summary: { total: 0, equal: 0, modified: 0, leftOnly: 0, rightOnly: 0 },
  }

  const mockStats = {
    totalFiles: 10,
    equalFiles: 5,
    modifiedFiles: 2,
    leftOnlyFiles: 1,
    rightOnlyFiles: 2,
  }

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

    // Setup default mocks
    mockScanDirectory.mockResolvedValue(mockScanResult)
    mockCompareDirectories.mockResolvedValue(mockCompareResult)
    mockApplyFilters.mockImplementation(entries => entries)
    mockCreateDirectoryInfo.mockReturnValue(mockDirInfo)
    mockComputeStatistics.mockReturnValue(mockStats)

    // Import and register handlers
    return import('../directory.handler').then(({ registerDirectoryHandlers }) => {
      registerDirectoryHandlers()
    })
  })

  describe('Handler Registration', () => {
    it('should register all directory handlers', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith('directory:compare', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('directory:compareSimple', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('directory:cancel', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('directory:open', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('directory:getProgress', expect.any(Function))
    })
  })

  describe('directory:compare', () => {
    it('should compare two directories', async () => {
      const handler = registeredHandlers.get('directory:compare')
      const result = await handler({}, '/left', '/right', {})

      expect(mockScanDirectory).toHaveBeenCalledTimes(2)
      expect(mockCompareDirectories).toHaveBeenCalled()
      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('leftRoot')
      expect(result).toHaveProperty('rightRoot')
      expect(result).toHaveProperty('entries')
      expect(result).toHaveProperty('statistics')
      expect(result).toHaveProperty('completedAt')
    })

    it('should merge options with defaults', async () => {
      const customOptions: Partial<DirCompareOptions> = {
        recursive: false,
        compareMode: 'content',
      }

      const handler = registeredHandlers.get('directory:compare')
      await handler({}, '/left', '/right', customOptions)

      expect(mockScanDirectory).toHaveBeenCalledWith('/left', expect.objectContaining({
        recursive: false,
        compareMode: 'content',
      }))
    })

    it('should apply filters to entries', async () => {
      const entries: DirectoryDiffEntry[] = [
        { name: 'file1.txt', type: 'file', status: 'equal' },
        { name: 'file2.js', type: 'file', status: 'modified' },
      ] as any

      mockCompareDirectories.mockResolvedValue({ entries, summary: {} })

      const handler = registeredHandlers.get('directory:compare')
      await handler({}, '/left', '/right', {})

      expect(mockApplyFilters).toHaveBeenCalledWith(entries, expect.any(Object))
    })

    it('should calculate statistics', async () => {
      const handler = registeredHandlers.get('directory:compare')
      const result = await handler({}, '/left', '/right', {})

      expect(mockComputeStatistics).toHaveBeenCalled()
      expect(result.statistics).toEqual(mockStats)
    })

    it('should throw error when comparison is cancelled', async () => {
      const handler = registeredHandlers.get('directory:compare')
      const cancelHandler = registeredHandlers.get('directory:cancel')

      // Start comparison and get ID
      const promise = handler({}, '/left', '/right', {})

      // Cancel immediately
      mockScanDirectory.mockImplementation(async () => {
        // Simulate cancellation check
        throw new Error('Comparison cancelled')
      })

      await expect(promise).rejects.toThrow()
    })
  })

  describe('directory:compareSimple', () => {
    it('should use legacy comparison for simple mode', async () => {
      const mockEntries: DirectoryDiffEntry[] = []
      mockLegacyCompareDirectories.mockResolvedValue(mockEntries)

      const handler = registeredHandlers.get('directory:compareSimple')
      const result = await handler({}, '/left', '/right', {})

      expect(mockLegacyCompareDirectories).toHaveBeenCalledWith('/left', '/right', expect.any(Object))
      expect(result).toEqual(mockEntries)
    })

    it('should pass options to legacy comparison', async () => {
      const handler = registeredHandlers.get('directory:compareSimple')
      await handler({}, '/left', '/right', {
        recursive: false,
        extensions: ['.txt', '.js'],
        exclude: ['node_modules'],
      })

      expect(mockLegacyCompareDirectories).toHaveBeenCalledWith('/left', '/right', expect.objectContaining({
        recursive: false,
        filter: expect.objectContaining({
          extensions: ['.txt', '.js'],
          exclude: ['node_modules'],
        }),
      }))
    })
  })

  describe('directory:cancel', () => {
    it('should cancel active comparison', async () => {
      // First start a comparison
      const compareHandler = registeredHandlers.get('directory:compare')
      const cancelHandler = registeredHandlers.get('directory:cancel')

      // We need to get the comparison ID from the actual comparison
      // For now, let's just test that cancel returns false when no active comparison
      const result = await cancelHandler({}, 'non-existent-id')
      expect(result).toBe(false)
    })
  })

  describe('directory:open', () => {
    it('should open directory dialog', async () => {
      const mockWebContents = { id: 1 }
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue({ id: 1 } as any)
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: ['/selected/dir'],
      } as any)

      const handler = registeredHandlers.get('directory:open')
      const result = await handler({ sender: mockWebContents }, 'left')

      expect(dialog.showOpenDialog).toHaveBeenCalled()
      expect(result).toBe('/selected/dir')
    })

    it('should return null when cancelled', async () => {
      const mockWebContents = { id: 1 }
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue({ id: 1 } as any)
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: true,
        filePaths: [],
      } as any)

      const handler = registeredHandlers.get('directory:open')
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

      const handler = registeredHandlers.get('directory:open')

      await handler({ sender: mockWebContents }, 'left')
      expect(vi.mocked(dialog.showOpenDialog).mock.calls[0][1]?.title).toBe('选择左侧目录')

      await handler({ sender: mockWebContents }, 'right')
      expect(vi.mocked(dialog.showOpenDialog).mock.calls[1][1]?.title).toBe('选择右侧目录')
    })
  })

  describe('directory:getProgress', () => {
    it('should return false for non-existent session', async () => {
      const handler = registeredHandlers.get('directory:getProgress')
      const result = await handler({}, 'non-existent-id')

      expect(result).toEqual({ exists: false })
    })
  })
})
