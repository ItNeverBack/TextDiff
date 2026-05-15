import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Worker } from 'worker_threads'
import { getWorkerPool, computeDiffWithWorkerPool } from '../index'
import type { DiffWorkerPool } from '../index'
import { computeDiff } from '../../index'
import type { DiffOptions, DiffResult } from '@shared/types'

// Mock worker_threads
vi.mock('worker_threads', () => ({
  Worker: vi.fn(),
}))

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  promises: {
    rm: vi.fn(),
    mkdir: vi.fn(),
    copyFile: vi.fn(),
  },
}))

// Mock the computeDiff function
vi.mock('../../index', () => ({
  computeDiff: vi.fn(),
}))

describe('DiffWorkerPool', () => {
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

  let mockWorker: any
  let messageHandler: Function

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock worker
    mockWorker = {
      on: vi.fn((event: string, handler: Function) => {
        if (event === 'message') {
          messageHandler = handler
        }
      }),
      postMessage: vi.fn(),
      terminate: vi.fn(),
    }

    vi.mocked(Worker).mockImplementation(() => mockWorker)
    vi.mocked(computeDiff).mockResolvedValue(mockDiffResult)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getWorkerPool', () => {
    it('should return singleton instance', () => {
      const pool1 = getWorkerPool()
      const pool2 = getWorkerPool()

      expect(pool1).toBe(pool2)
    })
  })

  describe('computeDiff', () => {
    it('should use main thread for small files', async () => {
      const pool = new DiffWorkerPool()
      const smallContent = 'small content'

      await pool.computeDiff(smallContent, smallContent, mockOptions)

      expect(computeDiff).toHaveBeenCalledWith(smallContent, smallContent, mockOptions)
      expect(Worker).not.toHaveBeenCalled()
    })

    it('should use Worker for large files', async () => {
      const { existsSync } = await import('fs')
      vi.mocked(existsSync).mockReturnValue(true)

      const pool = new DiffWorkerPool()
      const largeContent = 'x'.repeat(3 * 1024 * 1024) // 3MB

      const promise = pool.computeDiff(largeContent, largeContent, mockOptions)

      // Simulate worker completion
      messageHandler({
        type: 'result',
        taskId: 'task-1-1234567890',
        result: mockDiffResult,
      })

      const result = await promise

      expect(Worker).toHaveBeenCalled()
      expect(result).toEqual(mockDiffResult)
    })

    it('should fallback to main thread if Worker script not found', async () => {
      const { existsSync } = await import('fs')
      vi.mocked(existsSync).mockReturnValue(false)

      const pool = new DiffWorkerPool()
      const largeContent = 'x'.repeat(3 * 1024 * 1024)

      await pool.computeDiff(largeContent, largeContent, mockOptions)

      expect(Worker).not.toHaveBeenCalled()
      expect(computeDiff).toHaveBeenCalled()
    })

    it('should handle worker errors', async () => {
      const { existsSync } = await import('fs')
      vi.mocked(existsSync).mockReturnValue(true)

      const pool = new DiffWorkerPool()
      const largeContent = 'x'.repeat(3 * 1024 * 1024)

      const promise = pool.computeDiff(largeContent, largeContent, mockOptions)

      // Simulate worker error
      messageHandler({
        type: 'error',
        taskId: 'task-1-1234567890',
        error: 'Worker computation failed',
      })

      await expect(promise).rejects.toThrow('Worker computation failed')
    })

    it('should report progress via callback', async () => {
      const { existsSync } = await import('fs')
      vi.mocked(existsSync).mockReturnValue(true)

      const pool = new DiffWorkerPool()
      const largeContent = 'x'.repeat(3 * 1024 * 1024)
      const onProgress = vi.fn()

      const promise = pool.computeDiff(largeContent, largeContent, mockOptions, onProgress)

      // Simulate progress update
      messageHandler({
        type: 'progress',
        taskId: 'task-1-1234567890',
        stage: 'processing',
        percent: 50,
        message: 'Processing...',
      })

      // Simulate completion
      messageHandler({
        type: 'result',
        taskId: 'task-1-1234567890',
        result: mockDiffResult,
      })

      await promise

      expect(onProgress).toHaveBeenCalledWith({
        stage: 'processing',
        percent: 50,
        message: 'Processing...',
      })
    })
  })

  describe('computeDiffWithWorkerPool', () => {
    it('should export convenience function', async () => {
      const smallContent = 'small'
      vi.mocked(computeDiff).mockResolvedValue(mockDiffResult)

      const result = await computeDiffWithWorkerPool(smallContent, smallContent, mockOptions)

      expect(result).toEqual(mockDiffResult)
    })
  })

  describe('Worker pool management', () => {
    it('should create multiple workers', async () => {
      const { existsSync } = await import('fs')
      vi.mocked(existsSync).mockReturnValue(true)

      const pool = new DiffWorkerPool()
      const largeContent = 'x'.repeat(3 * 1024 * 1024)

      // Trigger initialization
      await pool.computeDiff(largeContent, largeContent, mockOptions)

      // Should create 2 workers
      expect(Worker).toHaveBeenCalledTimes(2)
    })

    it('should recycle workers after task completion', async () => {
      const { existsSync } = await import('fs')
      vi.mocked(existsSync).mockReturnValue(true)

      const pool = new DiffWorkerPool()
      const largeContent = 'x'.repeat(3 * 1024 * 1024)

      const promise1 = pool.computeDiff(largeContent, largeContent, mockOptions)

      // Complete first task
      messageHandler({
        type: 'result',
        taskId: 'task-1-1234567890',
        result: mockDiffResult,
      })

      await promise1

      // Start second task - should reuse worker
      const promise2 = pool.computeDiff(largeContent, largeContent, mockOptions)

      messageHandler({
        type: 'result',
        taskId: 'task-2-1234567890',
        result: mockDiffResult,
      })

      await promise2

      // Workers should be recycled, not recreated
      expect(Worker).toHaveBeenCalledTimes(2)
    })

    it('should handle worker exit', async () => {
      const { existsSync } = await import('fs')
      vi.mocked(existsSync).mockReturnValue(true)

      let exitHandler: Function
      const mockWorkerWithExit = {
        on: vi.fn((event: string, handler: Function) => {
          if (event === 'message') {
            messageHandler = handler
          } else if (event === 'exit') {
            exitHandler = handler
          }
        }),
        postMessage: vi.fn(),
        terminate: vi.fn(),
      }

      vi.mocked(Worker).mockImplementation(() => mockWorkerWithExit)

      const pool = new DiffWorkerPool()
      const largeContent = 'x'.repeat(3 * 1024 * 1024)

      await pool.computeDiff(largeContent, largeContent, mockOptions)

      // Simulate worker crash
      exitHandler(1)

      // Should create replacement worker
      expect(Worker).toHaveBeenCalledTimes(3)
    })

    it('should terminate all workers', async () => {
      const { existsSync } = await import('fs')
      vi.mocked(existsSync).mockReturnValue(true)

      const pool = new DiffWorkerPool()
      const largeContent = 'x'.repeat(3 * 1024 * 1024)

      await pool.computeDiff(largeContent, largeContent, mockOptions)

      pool.terminate()

      expect(mockWorker.terminate).toHaveBeenCalled()
    })
  })
})
