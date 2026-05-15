import { describe, it, expect, vi, beforeEach } from 'vitest'
import { scanDirectory } from '../scanner'
import { compareDirectories } from '../comparator'
import { applyFilters } from '../filter'
import { SyncEngine } from '../sync'
import type { DirCompareOptions, DirectoryDiffEntry, SyncPlan } from '@shared/types'

// Mock fs module
vi.mock('fs', async () => {
  return {
    promises: {
      readdir: vi.fn(),
      stat: vi.fn(),
      readFile: vi.fn().mockResolvedValue(Buffer.from('content')),
      copyFile: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined),
      unlink: vi.fn().mockResolvedValue(undefined),
      rm: vi.fn().mockResolvedValue(undefined),
      access: vi.fn().mockResolvedValue(undefined)
    },
    createReadStream: vi.fn()
  }
})

// Mock worker pool
vi.mock('../worker/pool', () => ({
  getScanWorkerPool: vi.fn(() => ({
    executeTasks: vi.fn().mockResolvedValue([])
  })),
  getHashWorkerPool: vi.fn(() => ({
    executeTask: vi.fn().mockResolvedValue({ hash: 'mock-hash' })
  }))
}))

// Mock cache manager
vi.mock('../cache', () => ({
  getCacheManager: vi.fn(() => ({
    getCache: vi.fn().mockReturnValue(null),
    createCache: vi.fn().mockReturnValue({}),
    setEntry: vi.fn()
  }))
}))

// Mock incremental scanner
vi.mock('../incremental', () => ({
  incrementalScan: vi.fn().mockResolvedValue({
    usedCache: false,
    changes: [],
    added: [],
    timeSaved: 0
  })
}))

describe('Directory Comparison Integration', () => {
  let mockReaddir: any
  let mockStat: any

  beforeEach(async () => {
    const fs = await import('fs')
    mockReaddir = vi.mocked(fs.promises.readdir)
    mockStat = vi.mocked(fs.promises.stat)
    vi.clearAllMocks()
  })

  const createMockFsStructure = () => {
    // 模拟文件系统结构
    mockReaddir
      .mockResolvedValueOnce([
        { name: 'src', isDirectory: () => true, isFile: () => false },
        { name: 'docs', isDirectory: () => true, isFile: () => false },
        { name: 'README.md', isDirectory: () => false, isFile: () => true },
        { name: 'package.json', isDirectory: () => false, isFile: () => true }
      ])
      .mockResolvedValueOnce([
        { name: 'index.js', isDirectory: () => false, isFile: () => true },
        { name: 'utils', isDirectory: () => true, isFile: () => false }
      ])
      .mockResolvedValueOnce([
        { name: 'helper.js', isDirectory: () => false, isFile: () => true }
      ])
      .mockResolvedValueOnce([
        { name: 'API.md', isDirectory: () => false, isFile: () => true }
      ])

    mockStat.mockResolvedValue({
      isDirectory: () => false,
      isFile: () => true,
      mtime: new Date('2024-01-15'),
      ctime: new Date('2024-01-10'),
      size: 1000,
      mode: 0o644
    })
  }

  const defaultOptions: DirCompareOptions = {
    recursive: true,
    compareMode: 'name',
    excludePatterns: [],
    includePatterns: [],
    followSymlinks: false,
    useHash: false
  }

  it('完整流程：扫描 → 对比 → 过滤', async () => {
    createMockFsStructure()

    // 1. 扫描两个目录
    const [leftResult, rightResult] = await Promise.all([
      scanDirectory('/left', defaultOptions),
      scanDirectory('/right', defaultOptions)
    ])

    expect(leftResult.root.children).toBeDefined()
    expect(rightResult.root.children).toBeDefined()

    // 2. 对比目录
    const comparison = await compareDirectories(
      leftResult.root,
      rightResult.root,
      defaultOptions
    )

    expect(comparison.entries).toBeDefined()
    expect(comparison.totalFiles).toBeGreaterThan(0)

    // 3. 应用过滤器
    const filtered = applyFilters(comparison.entries, [])
    expect(filtered).toEqual(comparison.entries)
  })

  it('扫描 → 对比 → 应用扩展名过滤', async () => {
    createMockFsStructure()

    // 1. 扫描
    const [leftResult, rightResult] = await Promise.all([
      scanDirectory('/left', defaultOptions),
      scanDirectory('/right', defaultOptions)
    ])

    // 2. 对比
    const comparison = await compareDirectories(
      leftResult.root,
      rightResult.root,
      defaultOptions
    )

    // 3. 应用扩展名过滤
    const jsFilter = {
      id: 'js-filter',
      type: 'extension' as const,
      enabled: true,
      invert: false,
      extensions: ['.js'],
      caseSensitive: false
    }
    const filtered = applyFilters(comparison.entries, [jsFilter])

    // 应该只保留 .js 文件
    const jsFiles = filtered.filter(e => e.name.endsWith('.js'))
    const nonJsFiles = filtered.filter(e => !e.name.endsWith('.js') && e.type === 'file')
    expect(nonJsFiles).toHaveLength(0)
  })

  it('扫描 → 对比 → 应用 glob 过滤', async () => {
    createMockFsStructure()

    // 1. 扫描
    const [leftResult, rightResult] = await Promise.all([
      scanDirectory('/left', defaultOptions),
      scanDirectory('/right', defaultOptions)
    ])

    // 2. 对比
    const comparison = await compareDirectories(
      leftResult.root,
      rightResult.root,
      defaultOptions
    )

    // 3. 应用 glob 过滤（排除 docs 目录）
    const globFilter = {
      id: 'docs-filter',
      type: 'glob' as const,
      enabled: true,
      invert: true,
      patterns: ['**/docs/**']
    }
    const filtered = applyFilters(comparison.entries, [globFilter])

    // 不应该有 docs 目录下的文件
    expect(filtered.some(e => e.relativePath.includes('docs'))).toBe(false)
  })

  it('扫描 → 对比 → 同步计划', async () => {
    createMockFsStructure()

    // 1. 扫描
    const [leftResult, rightResult] = await Promise.all([
      scanDirectory('/left', defaultOptions),
      scanDirectory('/right', defaultOptions)
    ])

    // 2. 对比
    const comparison = await compareDirectories(
      leftResult.root,
      rightResult.root,
      defaultOptions
    )

    // 3. 创建同步计划
    const plan: SyncPlan = {
      strategy: 'left-to-right',
      operations: comparison.entries
        .filter(e => e.status === 'left-only' || e.status === 'modified')
        .map(e => ({
          entry: e,
          action: e.status === 'left-only' ? 'copy-left-to-right' : 'merge',
          status: 'pending' as const
        })),
      createdAt: Date.now()
    }

    expect(plan.operations).toBeDefined()

    // 4. 执行同步
    const engine = new SyncEngine()
    const result = await engine.execute(plan)

    expect(result).toBeDefined()
  })

  it('带进度回调的完整流程', async () => {
    createMockFsStructure()

    const scanProgress: number[] = []

    // 1. 扫描带进度
    await scanDirectory('/left', {
      ...defaultOptions,
      onProgress: (p) => scanProgress.push(p.percentage)
    })

    expect(scanProgress.length).toBeGreaterThan(0)
    expect(scanProgress[scanProgress.length - 1]).toBe(100)
  })

  it('大文件对比流程', async () => {
    // 模拟大文件
    mockReaddir.mockResolvedValue([
      { name: 'large-file.dat', isDirectory: () => false, isFile: () => true }
    ])

    mockStat.mockResolvedValue({
      isDirectory: () => false,
      isFile: () => true,
      mtime: new Date(),
      ctime: new Date(),
      size: 100 * 1024 * 1024, // 100MB
      mode: 0o644
    })

    // 使用 size 模式（不读取内容）
    const [leftResult, rightResult] = await Promise.all([
      scanDirectory('/left', { ...defaultOptions, useHash: false }),
      scanDirectory('/right', { ...defaultOptions, useHash: false })
    ])

    const comparison = await compareDirectories(
      leftResult.root,
      rightResult.root,
      { ...defaultOptions, compareMode: 'size' }
    )

    expect(comparison.entries).toHaveLength(1)
  })

  it('排除模式在扫描阶段应用', async () => {
    mockReaddir
      .mockResolvedValueOnce([
        { name: 'src', isDirectory: () => true, isFile: () => false },
        { name: 'node_modules', isDirectory: () => true, isFile: () => false },
        { name: 'file.js', isDirectory: () => false, isFile: () => true }
      ])
      .mockResolvedValueOnce([
        { name: 'index.js', isDirectory: () => false, isFile: () => true }
      ])

    mockStat.mockResolvedValue({
      isDirectory: () => false,
      isFile: () => true,
      mtime: new Date(),
      ctime: new Date(),
      size: 100,
      mode: 0o644
    })

    // 扫描时排除 node_modules
    const result = await scanDirectory('/project', {
      ...defaultOptions,
      excludePatterns: ['node_modules']
    })

    // node_modules 应该被排除
    expect(result.root.children?.some(c => c.name === 'node_modules')).toBe(false)
    expect(result.root.children?.some(c => c.name === 'src')).toBe(true)
  })

  it('内容对比模式完整流程', async () => {
    const fs = await import('fs')

    mockReaddir.mockResolvedValue([
      { name: 'file.txt', isDirectory: () => false, isFile: () => true }
    ])

    mockStat.mockResolvedValue({
      isDirectory: () => false,
      isFile: () => true,
      mtime: new Date(),
      ctime: new Date(),
      size: 100,
      mode: 0o644
    })

    // 模拟不同的文件内容
    vi.mocked(fs.promises.readFile)
      .mockResolvedValueOnce(Buffer.from('Hello World'))
      .mockResolvedValueOnce(Buffer.from('Hello Universe'))

    const [leftResult, rightResult] = await Promise.all([
      scanDirectory('/left', { ...defaultOptions, useHash: false }),
      scanDirectory('/right', { ...defaultOptions, useHash: false })
    ])

    const comparison = await compareDirectories(
      leftResult.root,
      rightResult.root,
      { ...defaultOptions, compareMode: 'content' }
    )

    // 内容不同，应该标记为 modified
    expect(comparison.entries[0].status).toBe('modified')
  })

  it('递归目录结构处理', async () => {
    // 创建深层嵌套结构
    mockReaddir
      .mockResolvedValueOnce([{ name: 'level1', isDirectory: () => true, isFile: () => false }])
      .mockResolvedValueOnce([{ name: 'level2', isDirectory: () => true, isFile: () => false }])
      .mockResolvedValueOnce([{ name: 'level3', isDirectory: () => true, isFile: () => false }])
      .mockResolvedValueOnce([{ name: 'file.txt', isDirectory: () => false, isFile: () => true }])

    mockStat.mockResolvedValue({
      isDirectory: () => false,
      isFile: () => true,
      mtime: new Date(),
      ctime: new Date(),
      size: 100,
      mode: 0o644
    })

    const result = await scanDirectory('/deep', defaultOptions)

    // 应该正确扫描深层结构
    expect(result).toBeDefined()
  })

  it('取消操作处理', async () => {
    mockReaddir.mockResolvedValue([
      { name: 'file.txt', isDirectory: () => false, isFile: () => true }
    ])

    mockStat.mockResolvedValue({
      isDirectory: () => false,
      isFile: () => true,
      mtime: new Date(),
      ctime: new Date(),
      size: 100,
      mode: 0o644
    })

    const controller = new AbortController()
    controller.abort()

    await expect(scanDirectory('/test', {
      ...defaultOptions,
      signal: controller.signal
    })).rejects.toThrow()
  })
})

describe('Error Handling Integration', () => {
  it('扫描权限错误处理', async () => {
    const fs = await import('fs')
    vi.mocked(fs.promises.readdir).mockRejectedValue(new Error('EACCES'))
    vi.mocked(fs.promises.stat).mockResolvedValue({
      isDirectory: () => true,
      isFile: () => false,
      mtime: new Date(),
      ctime: new Date(),
      mode: 0o755
    } as any)

    // 不应该抛出错误，应该返回空结果
    const result = await scanDirectory('/protected', {
      recursive: true,
      compareMode: 'name',
      excludePatterns: [],
      includePatterns: [],
      followSymlinks: false,
      useHash: false
    })

    expect(result).toBeDefined()
    expect(result.totalFiles).toBe(0)
  })

  it('对比空目录处理', async () => {
    mockReaddir.mockResolvedValue([])
    mockStat.mockResolvedValue({
      isDirectory: () => true,
      isFile: () => false,
      mtime: new Date(),
      ctime: new Date(),
      mode: 0o755
    })

    const [leftResult, rightResult] = await Promise.all([
      scanDirectory('/empty1', {
        recursive: true,
        compareMode: 'name',
        excludePatterns: [],
        includePatterns: [],
        followSymlinks: false,
        useHash: false
      }),
      scanDirectory('/empty2', {
        recursive: true,
        compareMode: 'name',
        excludePatterns: [],
        includePatterns: [],
        followSymlinks: false,
        useHash: false
      })
    ])

    const comparison = await compareDirectories(
      leftResult.root,
      rightResult.root,
      {
        recursive: true,
        compareMode: 'name',
        excludePatterns: [],
        includePatterns: [],
        followSymlinks: false,
        useHash: false
      }
    )

    expect(comparison.entries).toHaveLength(0)
  })
})
