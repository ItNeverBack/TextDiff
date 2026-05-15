import { describe, it, expect, vi, beforeEach } from 'vitest'
import { promises as fsPromises } from 'fs'
import {
  compareDirectories,
  mergeStatus,
  updateDirectoryStatus,
  DEFAULT_SYNC_OPTIONS,
  SyncEngine,
  createSyncEngine,
  executeSync,
  validateSyncOperation,
  validateSyncPlan,
  SyncError
} from '../sync'
import type {
  DirectoryDiffEntry,
  SyncPlan,
  SyncOperation,
  SyncStrategy
} from '@shared/types'

// Mock fs module
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs')
  return {
    ...actual,
    promises: {
      access: vi.fn().mockResolvedValue(undefined),
      stat: vi.fn().mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        mtime: new Date('2024-01-01'),
        size: 1000,
        mode: 0o644
      }),
      copyFile: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined),
      unlink: vi.fn().mockResolvedValue(undefined),
      rm: vi.fn().mockResolvedValue(undefined),
      readdir: vi.fn().mockResolvedValue([]),
      chmod: vi.fn().mockResolvedValue(undefined),
      lstat: vi.fn().mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        mtime: new Date('2024-01-01'),
        size: 1000,
        mode: 0o644
      })
    }
  }
})

describe('SyncEngine', () => {
  let engine: SyncEngine

  beforeEach(() => {
    engine = createSyncEngine()
    vi.clearAllMocks()
  })

  describe('基本操作', () => {
    it('创建引擎实例', () => {
      expect(engine).toBeInstanceOf(SyncEngine)
    })

    it('设置根目录路径', () => {
      engine.setRootPaths('/left', '/right')
      // 验证内部状态已更新
      expect(engine).toBeDefined()
    })

    it('获取当前操作初始为null', () => {
      expect(engine.getCurrentOperation()).toBeNull()
    })

    it('撤销历史初始为空', () => {
      expect(engine.getUndoHistory()).toHaveLength(0)
    })

    it('不能撤销初始状态', () => {
      expect(engine.canUndo()).toBe(false)
    })
  })

  describe('execute', () => {
    const createMockPlan = (operations: SyncOperation[]): SyncPlan => ({
      operations,
      strategy: 'bidirectional' as SyncStrategy,
      createdAt: Date.now()
    })

    const createMockEntry = (name: string): DirectoryDiffEntry => ({
      id: 'test-id',
      relativePath: name,
      name,
      type: 'file',
      status: 'equal',
      depth: 0,
      leftPath: `/left/${name}`,
      rightPath: `/right/${name}`
    })

    it('空计划返回成功', async () => {
      const plan = createMockPlan([])
      const result = await engine.execute(plan)
      expect(result.success).toBe(true)
      expect(result.operations).toHaveLength(0)
    })

    it('执行单个操作', async () => {
      const operation: SyncOperation = {
        entry: createMockEntry('test.txt'),
        action: 'copy-left-to-right',
        status: 'pending'
      }
      const plan = createMockPlan([operation])
      const result = await engine.execute(plan)
      expect(result.success).toBe(true)
      expect(result.operations[0].status).toBe('completed')
    })

    it('报告进度', async () => {
      const onProgress = vi.fn()
      const operations = [
        { entry: createMockEntry('1.txt'), action: 'copy-left-to-right', status: 'pending' },
        { entry: createMockEntry('2.txt'), action: 'copy-left-to-right', status: 'pending' }
      ] as SyncOperation[]

      const plan = createMockPlan(operations)
      await engine.execute(plan, {}, onProgress)

      expect(onProgress).toHaveBeenCalledTimes(2)
      expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({
        completed: 2,
        total: 2,
        percentage: 100
      }))
    })

    it('操作失败时记录错误', async () => {
      const { promises: fsPromises } = await import('fs')
      vi.mocked(fsPromises.stat).mockRejectedValueOnce(new Error('File not found'))

      const operation: SyncOperation = {
        entry: { ...createMockEntry('test.txt'), leftPath: null },
        action: 'copy-left-to-right',
        status: 'pending'
      }
      const plan = createMockPlan([operation])
      const result = await engine.execute(plan)

      expect(result.success).toBe(false)
      expect(result.operations[0].status).toBe('failed')
      expect(result.operations[0].error).toBeDefined()
    })

    it('部分失败时success为false', async () => {
      const { promises: fsPromises } = await import('fs')
      vi.mocked(fsPromises.stat)
        .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true, mtime: new Date(), size: 100, mode: 0o644 } as any)
        .mockRejectedValueOnce(new Error('Error'))

      const operations = [
        { entry: createMockEntry('1.txt'), action: 'copy-left-to-right', status: 'pending' },
        { entry: { ...createMockEntry('2.txt'), leftPath: null }, action: 'copy-left-to-right', status: 'pending' }
      ] as SyncOperation[]

      const plan = createMockPlan(operations)
      const result = await engine.execute(plan)

      expect(result.success).toBe(false)
    })

    it('可被取消', async () => {
      const operation: SyncOperation = {
        entry: createMockEntry('test.txt'),
        action: 'copy-left-to-right',
        status: 'pending'
      }
      const plan = createMockPlan([operation])

      const executePromise = engine.execute(plan)
      engine.cancel()

      await expect(executePromise).rejects.toThrow('cancelled')
    })
  })

  describe('操作类型', () => {
    const createMockEntry = (name: string, leftPath?: string | null, rightPath?: string | null): DirectoryDiffEntry => ({
      id: 'test-id',
      relativePath: name,
      name,
      type: 'file',
      status: leftPath && rightPath ? 'equal' : leftPath ? 'left-only' : 'right-only',
      depth: 0,
      leftPath: leftPath ?? null,
      rightPath: rightPath ?? null
    })

    beforeEach(async () => {
      const { promises: fsPromises } = await import('fs')
      vi.mocked(fsPromises.stat).mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        mtime: new Date(),
        size: 100,
        mode: 0o644
      } as any)
    })

    it('copy-left-to-right 操作', async () => {
      const { promises: fsPromises } = await import('fs')
      const operation: SyncOperation = {
        entry: createMockEntry('test.txt', '/left/test.txt', null),
        action: 'copy-left-to-right',
        status: 'pending'
      }

      await engine.execute({
        operations: [operation],
        strategy: 'left-to-right',
        createdAt: Date.now()
      })

      expect(fsPromises.copyFile).toHaveBeenCalled()
    })

    it('copy-right-to-left 操作', async () => {
      const { promises: fsPromises } = await import('fs')
      const operation: SyncOperation = {
        entry: createMockEntry('test.txt', null, '/right/test.txt'),
        action: 'copy-right-to-left',
        status: 'pending'
      }

      await engine.execute({
        operations: [operation],
        strategy: 'right-to-left',
        createdAt: Date.now()
      })

      expect(fsPromises.copyFile).toHaveBeenCalled()
    })

    it('delete-left 操作', async () => {
      const { promises: fsPromises } = await import('fs')
      const operation: SyncOperation = {
        entry: createMockEntry('test.txt', '/left/test.txt', null),
        action: 'delete-left',
        status: 'pending'
      }

      await engine.execute({
        operations: [operation],
        strategy: 'left-to-right',
        createdAt: Date.now()
      })

      expect(fsPromises.unlink).toHaveBeenCalled()
    })

    it('delete-right 操作', async () => {
      const { promises: fsPromises } = await import('fs')
      const operation: SyncOperation = {
        entry: createMockEntry('test.txt', null, '/right/test.txt'),
        action: 'delete-right',
        status: 'pending'
      }

      await engine.execute({
        operations: [operation],
        strategy: 'left-to-right',
        createdAt: Date.now()
      })

      expect(fsPromises.unlink).toHaveBeenCalled()
    })

    it('ignore 操作跳过执行', async () => {
      const { promises: fsPromises } = await import('fs')
      const operation: SyncOperation = {
        entry: createMockEntry('test.txt'),
        action: 'ignore',
        status: 'pending'
      }

      const result = await engine.execute({
        operations: [operation],
        strategy: 'left-to-right',
        createdAt: Date.now()
      })

      expect(fsPromises.copyFile).not.toHaveBeenCalled()
      expect(result.success).toBe(true)
    })

    it('merge 操作保留较新文件', async () => {
      const { promises: fsPromises } = await import('fs')
      vi.mocked(fsPromises.stat)
        .mockResolvedValueOnce({
          isDirectory: () => false,
          isFile: () => true,
          mtime: new Date('2024-06-01'),
          size: 100,
          mode: 0o644
        } as any)
        .mockResolvedValueOnce({
          isDirectory: () => false,
          isFile: () => true,
          mtime: new Date('2024-01-01'),
          size: 100,
          mode: 0o644
        } as any)

      const operation: SyncOperation = {
        entry: createMockEntry('test.txt', '/left/test.txt', '/right/test.txt'),
        action: 'merge',
        status: 'pending'
      }

      await engine.execute({
        operations: [operation],
        strategy: 'bidirectional',
        createdAt: Date.now()
      })

      expect(fsPromises.copyFile).toHaveBeenCalled()
    })
  })

  describe('选项', () => {
    it('createBackup=true 创建备份', async () => {
      const { promises: fsPromises } = await import('fs')
      vi.mocked(fsPromises.access).mockResolvedValue(undefined)

      const entry: DirectoryDiffEntry = {
        id: 'test',
        relativePath: 'test.txt',
        name: 'test.txt',
        type: 'file',
        status: 'equal',
        depth: 0,
        leftPath: '/left/test.txt',
        rightPath: '/right/test.txt'
      }

      const plan: SyncPlan = {
        operations: [{ entry, action: 'copy-left-to-right', status: 'pending' }],
        strategy: 'left-to-right',
        createdAt: Date.now()
      }

      await engine.execute(plan, { createBackup: true })
      expect(fsPromises.copyFile).toHaveBeenCalledTimes(2) // 一次备份，一次复制
    })

    it('confirmOverwrite=true 时检查较新文件', async () => {
      const { promises: fsPromises } = await import('fs')
      vi.mocked(fsPromises.access).mockResolvedValue(undefined)
      vi.mocked(fsPromises.stat)
        .mockResolvedValueOnce({
          isDirectory: () => false,
          isFile: () => true,
          mtime: new Date('2024-01-01'),
          size: 100,
          mode: 0o644
        } as any)
        .mockResolvedValueOnce({
          isDirectory: () => false,
          isFile: () => true,
          mtime: new Date('2024-06-01'), // 目标更新
          size: 100,
          mode: 0o644
        } as any)

      const entry: DirectoryDiffEntry = {
        id: 'test',
        relativePath: 'test.txt',
        name: 'test.txt',
        type: 'file',
        status: 'equal',
        depth: 0,
        leftPath: '/left/test.txt',
        rightPath: '/right/test.txt'
      }

      const plan: SyncPlan = {
        operations: [{ entry, action: 'copy-left-to-right', status: 'pending' }],
        strategy: 'left-to-right',
        createdAt: Date.now()
      }

      const result = await engine.execute(plan, { confirmOverwrite: true })
      expect(result.success).toBe(false)
    })

    it('preservePermissions=true 保留权限', async () => {
      const { promises: fsPromises } = await import('fs')
      vi.mocked(fsPromises.stat).mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        mtime: new Date(),
        size: 100,
        mode: 0o755
      } as any)

      const entry: DirectoryDiffEntry = {
        id: 'test',
        relativePath: 'test.txt',
        name: 'test.txt',
        type: 'file',
        status: 'equal',
        depth: 0,
        leftPath: '/left/test.txt',
        rightPath: '/right/test.txt'
      }

      const plan: SyncPlan = {
        operations: [{ entry, action: 'copy-left-to-right', status: 'pending' }],
        strategy: 'left-to-right',
        createdAt: Date.now()
      }

      await engine.execute(plan, { preservePermissions: true })
      expect(fsPromises.chmod).toHaveBeenCalled()
    })
  })

  describe('撤销操作', () => {
    it('执行后可用撤销', async () => {
      const entry: DirectoryDiffEntry = {
        id: 'test',
        relativePath: 'test.txt',
        name: 'test.txt',
        type: 'file',
        status: 'equal',
        depth: 0,
        leftPath: '/left/test.txt',
        rightPath: '/right/test.txt'
      }

      const plan: SyncPlan = {
        operations: [{ entry, action: 'copy-left-to-right', status: 'pending' }],
        strategy: 'left-to-right',
        createdAt: Date.now()
      }

      await engine.execute(plan)
      expect(engine.canUndo()).toBe(true)
    })

    it('清空撤销历史', async () => {
      const entry: DirectoryDiffEntry = {
        id: 'test',
        relativePath: 'test.txt',
        name: 'test.txt',
        type: 'file',
        status: 'equal',
        depth: 0,
        leftPath: '/left/test.txt',
        rightPath: '/right/test.txt'
      }

      const plan: SyncPlan = {
        operations: [{ entry, action: 'copy-left-to-right', status: 'pending' }],
        strategy: 'left-to-right',
        createdAt: Date.now()
      }

      await engine.execute(plan)
      engine.clearUndoHistory()
      expect(engine.canUndo()).toBe(false)
      expect(engine.getUndoHistory()).toHaveLength(0)
    })
  })
})

describe('executeSync', () => {
  it('便捷函数执行同步', async () => {
    const entry: DirectoryDiffEntry = {
      id: 'test',
      relativePath: 'test.txt',
      name: 'test.txt',
      type: 'file',
      status: 'equal',
      depth: 0,
      leftPath: '/left/test.txt',
      rightPath: '/right/test.txt'
    }

    const plan: SyncPlan = {
      operations: [{ entry, action: 'copy-left-to-right', status: 'pending' }],
      strategy: 'left-to-right',
      createdAt: Date.now()
    }

    const result = await executeSync(plan)
    expect(result.success).toBe(true)
  })

  it('支持根目录路径', async () => {
    const entry: DirectoryDiffEntry = {
      id: 'test',
      relativePath: 'test.txt',
      name: 'test.txt',
      type: 'file',
      status: 'equal',
      depth: 0,
      leftPath: null,
      rightPath: null
    }

    const plan: SyncPlan = {
      operations: [{ entry, action: 'copy-left-to-right', status: 'pending' }],
      strategy: 'left-to-right',
      createdAt: Date.now()
    }

    const result = await executeSync(plan, {}, undefined, { left: '/left', right: '/right' })
    expect(result).toBeDefined()
  })
})

describe('validateSyncOperation', () => {
  const createMockEntry = (name: string, leftPath?: string, rightPath?: string): DirectoryDiffEntry => ({
    id: 'test',
    relativePath: name,
    name,
    type: 'file',
    status: 'equal',
    depth: 0,
    leftPath: leftPath ?? null,
    rightPath: rightPath ?? null
  })

  beforeEach(async () => {
    const { promises: fsPromises } = await import('fs')
    vi.clearAllMocks()
    vi.mocked(fsPromises.access).mockResolvedValue(undefined)
  })

  it('验证 copy-left-to-right', async () => {
    const entry = createMockEntry('test.txt', '/left/test.txt', '/right/test.txt')
    const operation: SyncOperation = { entry, action: 'copy-left-to-right', status: 'pending' }

    const result = await validateSyncOperation(operation)
    expect(result.valid).toBe(true)
    expect(result.warnings).toContain(expect.stringContaining('overwrite'))
  })

  it('源文件不存在时警告', async () => {
    const { promises: fsPromises } = await import('fs')
    vi.mocked(fsPromises.access).mockRejectedValue(new Error('Not found'))

    const entry = createMockEntry('test.txt', '/left/test.txt', null)
    const operation: SyncOperation = { entry, action: 'copy-left-to-right', status: 'pending' }

    const result = await validateSyncOperation(operation)
    expect(result.warnings.some(w => w.includes('does not exist'))).toBe(true)
  })

  it('删除操作警告', async () => {
    const entry = createMockEntry('test.txt', '/left/test.txt', null)
    const operation: SyncOperation = { entry, action: 'delete-left', status: 'pending' }

    const result = await validateSyncOperation(operation)
    expect(result.warnings.some(w => w.includes('delete'))).toBe(true)
  })
})

describe('validateSyncPlan', () => {
  it('批量验证所有操作', async () => {
    const entries: DirectoryDiffEntry[] = [
      { id: '1', relativePath: '1.txt', name: '1.txt', type: 'file', status: 'equal', depth: 0, leftPath: '/left/1.txt', rightPath: '/right/1.txt' },
      { id: '2', relativePath: '2.txt', name: '2.txt', type: 'file', status: 'equal', depth: 0, leftPath: '/left/2.txt', rightPath: '/right/2.txt' }
    ]

    const plan: SyncPlan = {
      operations: entries.map(e => ({ entry: e, action: 'copy-left-to-right', status: 'pending' })),
      strategy: 'left-to-right',
      createdAt: Date.now()
    }

    const result = await validateSyncPlan(plan)
    expect(result.valid).toBe(true)
    expect(result.operations).toHaveLength(2)
  })
})

describe('SyncError', () => {
  it('创建同步错误', () => {
    const operation: SyncOperation = {
      entry: { id: 'test', relativePath: 'test.txt', name: 'test.txt', type: 'file', status: 'equal', depth: 0 },
      action: 'copy-left-to-right',
      status: 'pending'
    }

    const error = new SyncError('Test error', operation, 'TEST_CODE')
    expect(error.message).toBe('Test error')
    expect(error.name).toBe('SyncError')
    expect(error.operation).toBe(operation)
    expect(error.code).toBe('TEST_CODE')
  })
})

describe('DEFAULT_SYNC_OPTIONS', () => {
  it('默认选项配置', () => {
    expect(DEFAULT_SYNC_OPTIONS.strategy).toBe('bidirectional')
    expect(DEFAULT_SYNC_OPTIONS.createBackup).toBe(true)
    expect(DEFAULT_SYNC_OPTIONS.confirmOverwrite).toBe(false)
    expect(DEFAULT_SYNC_OPTIONS.preservePermissions).toBe(true)
    expect(DEFAULT_SYNC_OPTIONS.skipEmptyDirs).toBe(false)
  })
})
