import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ipcMain } from 'electron'
import type { FileInfo, DiffOptions, DiffResult } from '@shared/types'

// Mock Electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
}))

// Mock diff modules
const mockComputeSmartDiff = vi.fn()
const mockComputeDiffWithCache = vi.fn()
const mockComputeDiffWithWorkerPool = vi.fn()
const mockComputeThreeWayDiff = vi.fn()
const mockGetDiffCacheStats = vi.fn()
const mockClearDiffCache = vi.fn()
const mockSyncDiff = vi.fn()

vi.mock('../diff/incremental', () => ({
  computeSmartDiff: (...args: any[]) => mockComputeSmartDiff(...args),
}))

vi.mock('../diff/cache', () => ({
  computeDiffWithCache: (...args: any[]) => mockComputeDiffWithCache(...args),
  getDiffCacheStats: () => mockGetDiffCacheStats(),
  clearDiffCache: () => mockClearDiffCache(),
}))

vi.mock('../diff/worker', () => ({
  computeDiffWithWorkerPool: (...args: any[]) => mockComputeDiffWithWorkerPool(...args),
}))

vi.mock('../diff/three-way', () => ({
  computeThreeWayDiff: (...args: any[]) => mockComputeThreeWayDiff(...args),
}))

vi.mock('../diff/sync', () => ({
  syncDiff: (...args: any[]) => mockSyncDiff(...args),
}))

vi.mock('../fs', () => ({
  writeFile: vi.fn(),
}))

describe('Diff Handler', () => {
  const mockDiffResult: DiffResult = {
    lines: [],
    chunks: [],
    stats: {
      totalLines: 10,
      equalLines: 5,
      insertedLines: 3,
      deletedLines: 2,
      modifiedLines: 0,
      chunkCount: 1,
    },
    computedAt: Date.now(),
  }

  const mockLeftFile: FileInfo = {
    path: '/test/left.txt',
    name: 'left.txt',
    content: 'line1\nline2\nline3',
    encoding: 'utf-8',
    lineEnding: 'LF',
    size: 20,
  }

  const mockRightFile: FileInfo = {
    path: '/test/right.txt',
    name: 'right.txt',
    content: 'line1\nmodified\nline3',
    encoding: 'utf-8',
    lineEnding: 'LF',
    size: 25,
  }

  const mockOptions: DiffOptions = {
    ignoreWhitespace: 'leading-trailing',
    ignoreCase: false,
    ignoreLineEndings: true,
    ignorePatterns: [],
    ignoreComments: false,
    commentPrefixes: [],
    algorithm: 'myers',
    contextLines: 3,
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

    // Import and register handlers
    return import('../diff.handler').then(({ registerDiffHandlers }) => {
      registerDiffHandlers()
    })
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('Handler Registration', () => {
    it('should register all diff handlers', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith('diff:compute', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('diff:computeThreeWay', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('diff:checkFileSize', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('diff:cacheStats', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('diff:clearCache', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('diff:clearSessionCache', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('diff:sync', expect.any(Function))
    })
  })

  describe('diff:compute', () => {
    it('should handle small file diff with smart diff', async () => {
      mockComputeSmartDiff.mockResolvedValue(mockDiffResult)

      const handler = registeredHandlers.get('diff:compute')
      const mockEvent = { sender: { send: vi.fn(), isDestroyed: () => false } }

      const result = await handler(mockEvent, mockLeftFile, mockRightFile, mockOptions)

      expect(mockComputeSmartDiff).toHaveBeenCalledWith(
        mockLeftFile.content,
        mockRightFile.content,
        mockOptions,
        null,
        null,
        null
      )
      expect(result).toEqual(mockDiffResult)
    })

    it('should fall back to cache when smart diff fails', async () => {
      mockComputeSmartDiff.mockRejectedValue(new Error('Smart diff failed'))
      mockComputeDiffWithCache.mockResolvedValue(mockDiffResult)

      const handler = registeredHandlers.get('diff:compute')
      const mockEvent = { sender: { send: vi.fn(), isDestroyed: () => false } }

      const result = await handler(mockEvent, mockLeftFile, mockRightFile, mockOptions)

      expect(mockComputeDiffWithCache).toHaveBeenCalled()
      expect(result).toEqual(mockDiffResult)
    })

    it('should use worker pool for large files', async () => {
      const largeContent = 'x'.repeat(3 * 1024 * 1024) // 3MB
      const largeFile = { ...mockLeftFile, content: largeContent }

      mockComputeDiffWithWorkerPool.mockResolvedValue(mockDiffResult)

      const handler = registeredHandlers.get('diff:compute')
      const mockEvent = { sender: { send: vi.fn(), isDestroyed: () => false } }

      await handler(mockEvent, largeFile, largeFile, mockOptions)

      expect(mockComputeDiffWithWorkerPool).toHaveBeenCalled()
    })

    it('should send progress events for large files', async () => {
      const largeContent = 'x'.repeat(3 * 1024 * 1024)
      const largeFile = { ...mockLeftFile, content: largeContent }

      mockComputeDiffWithWorkerPool.mockImplementation((_, __, ___, onProgress) => {
        onProgress({ stage: 'processing', percent: 50, message: 'Processing' })
        return Promise.resolve(mockDiffResult)
      })

      const handler = registeredHandlers.get('diff:compute')
      const mockSend = vi.fn()
      const mockEvent = { sender: { send: mockSend, isDestroyed: () => false } }

      await handler(mockEvent, largeFile, largeFile, mockOptions)

      expect(mockSend).toHaveBeenCalledWith('diff:progress', expect.objectContaining({
        stage: 'processing',
        percent: 50,
        isLargeFile: true,
      }))
      expect(mockSend).toHaveBeenCalledWith('diff:complete', expect.any(Object))
    })

    it('should send error events when worker fails', async () => {
      const largeContent = 'x'.repeat(3 * 1024 * 1024)
      const largeFile = { ...mockLeftFile, content: largeContent }

      mockComputeDiffWithWorkerPool.mockRejectedValue(new Error('Worker failed'))

      const handler = registeredHandlers.get('diff:compute')
      const mockSend = vi.fn()
      const mockEvent = { sender: { send: mockSend, isDestroyed: () => false } }

      await expect(handler(mockEvent, largeFile, largeFile, mockOptions)).rejects.toThrow('Worker failed')
      expect(mockSend).toHaveBeenCalledWith('diff:error', expect.objectContaining({
        error: 'Worker failed',
      }))
    })
  })

  describe('diff:computeThreeWay', () => {
    it('should compute three-way diff', async () => {
      const mockThreeWayResult = {
        base: mockLeftFile,
        left: mockLeftFile,
        right: mockRightFile,
        result: mockDiffResult,
        conflicts: [],
      }
      mockComputeThreeWayDiff.mockResolvedValue(mockThreeWayResult)

      const handler = registeredHandlers.get('diff:computeThreeWay')
      const mockEvent = {}

      const result = await handler(mockEvent, mockLeftFile, mockLeftFile, mockRightFile)

      expect(mockComputeThreeWayDiff).toHaveBeenCalledWith(mockLeftFile, mockLeftFile, mockRightFile)
      expect(result).toEqual(mockThreeWayResult)
    })
  })

  describe('diff:checkFileSize', () => {
    it('should return false for small files', async () => {
      const handler = registeredHandlers.get('diff:checkFileSize')
      const result = await handler({}, 1000, 2000)

      expect(result.isLargeFile).toBe(false)
    })

    it('should return true for files exceeding threshold', async () => {
      const handler = registeredHandlers.get('diff:checkFileSize')
      const result = await handler({}, 3 * 1024 * 1024, 3 * 1024 * 1024)

      expect(result.isLargeFile).toBe(true)
    })
  })

  describe('diff:cacheStats', () => {
    it('should return cache statistics', async () => {
      const mockStats = { size: 10, maxSize: 100, ttl: 3600000 }
      mockGetDiffCacheStats.mockReturnValue(mockStats)

      const handler = registeredHandlers.get('diff:cacheStats')
      const result = await handler()

      expect(result).toEqual(mockStats)
    })
  })

  describe('diff:clearCache', () => {
    it('should clear diff cache', async () => {
      const handler = registeredHandlers.get('diff:clearCache')
      await handler()

      expect(mockClearDiffCache).toHaveBeenCalled()
    })
  })

  describe('diff:sync', () => {
    it('should sync diff results', async () => {
      const mockSyncResult = {
        leftContent: 'synced left',
        rightContent: 'synced right',
        changedLines: [1, 2],
      }
      mockSyncDiff.mockReturnValue(mockSyncResult)

      const handler = registeredHandlers.get('diff:sync')
      const result = await handler(
        {},
        '/left.txt',
        '/right.txt',
        'left content',
        'right content',
        [],
        [],
        { direction: 'left-to-right', autoSave: false }
      )

      expect(mockSyncDiff).toHaveBeenCalled()
      expect(result).toEqual(mockSyncResult)
    })
  })
})
