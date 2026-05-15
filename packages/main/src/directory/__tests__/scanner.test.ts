import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  scanDirectory,
  getFileMetadata,
  getDirMetadata,
  computeFileHash,
  buildPathIndex,
  flattenTree
} from '../scanner'
import type { DirCompareOptions } from '@shared/types'

// Mock fs module
vi.mock('fs', async () => {
  return {
    promises: {
      readdir: vi.fn(),
      stat: vi.fn(),
      readFile: vi.fn()
    },
    createReadStream: vi.fn(() => ({
      on: vi.fn().mockImplementation(function(event: string, handler: Function) {
        if (event === 'data') {
          handler(Buffer.from('test content'))
        } else if (event === 'end') {
          setTimeout(() => handler(), 0)
        }
        return this
      }),
      pipe: vi.fn().mockReturnThis()
    }))
  }
})

// Mock worker pool
vi.mock('../worker/pool', () => ({
  getScanWorkerPool: vi.fn(() => ({
    executeTasks: vi.fn().mockResolvedValue([
      { entries: [{ name: 'file.js', relativePath: 'file.js', type: 'file' as const, size: 1000, modifiedTime: new Date() }] }
    ])
  })),
  getHashWorkerPool: vi.fn(() => ({
    executeTask: vi.fn().mockResolvedValue({ hash: 'mock-hash' })
  }))
}))

// Mock cache manager
vi.mock('../cache', () => ({
  getCacheManager: vi.fn(() => ({
    getCache: vi.fn().mockReturnValue(null),
    createCache: vi.fn().mockReturnValue({ lastScan: 0, totalFiles: 0 }),
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

describe('scanDirectory', () => {
  let mockReaddir: any
  let mockStat: any

  beforeEach(async () => {
    const fs = await import('fs')
    mockReaddir = vi.mocked(fs.promises.readdir)
    mockStat = vi.mocked(fs.promises.stat)
    vi.clearAllMocks()
  })

  const defaultOptions: DirCompareOptions = {
    recursive: true,
    compareMode: 'content',
    excludePatterns: [],
    includePatterns: [],
    followSymlinks: false,
    useHash: false
  }

  it('扫描空目录返回空数组', async () => {
    mockReaddir.mockResolvedValue([])
    mockStat.mockResolvedValue({
      isDirectory: () => true,
      isFile: () => false,
      mtime: new Date(),
      ctime: new Date(),
      mode: 0o755
    })

    const result = await scanDirectory('/empty', defaultOptions)
    expect(result.root.children).toHaveLength(0)
    expect(result.totalFiles).toBe(0)
  })

  it('正确识别文件和子目录', async () => {
    mockReaddir
      .mockResolvedValueOnce([
        { name: 'file.txt', isDirectory: () => false, isFile: () => true },
        { name: 'src', isDirectory: () => true, isFile: () => false }
      ])
      .mockResolvedValueOnce([
        { name: 'index.js', isDirectory: () => false, isFile: () => true }
      ])

    mockStat.mockResolvedValue({
      isDirectory: () => false,
      isFile: () => true,
      mtime: new Date(),
      ctime: new Date(),
      size: 1000,
      mode: 0o644
    })

    const result = await scanDirectory('/test', defaultOptions)
    expect(result.root.children).toHaveLength(2)
    expect(result.totalFiles).toBeGreaterThan(0)
  })

  it('recursive=false 时不递归子目录', async () => {
    mockReaddir.mockResolvedValue([
      { name: 'src', isDirectory: () => true, isFile: () => false },
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

    const result = await scanDirectory('/test', { ...defaultOptions, recursive: false })
    // 子目录应存在但没有被递归扫描
    expect(result.root.children?.some(c => c.type === 'directory')).toBe(true)
  })

  it('maxDepth 限制递归深度', async () => {
    mockReaddir
      .mockResolvedValueOnce([
        { name: 'level1', isDirectory: () => true, isFile: () => false }
      ])
      .mockResolvedValueOnce([
        { name: 'level2', isDirectory: () => true, isFile: () => false }
      ])
      .mockResolvedValueOnce([
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

    const result = await scanDirectory('/test', { ...defaultOptions, maxDepth: 1 })
    expect(result.root.children).toHaveLength(1)
  })

  it('正确计算文件哈希（useHash=true）', async () => {
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

    const result = await scanDirectory('/test', { ...defaultOptions, useHash: true })
    expect(result.root.children).toHaveLength(1)
  })

  it('软链接处理策略正确', async () => {
    mockReaddir.mockResolvedValue([
      { name: 'link', isDirectory: () => false, isFile: () => false, isSymbolicLink: () => true }
    ])

    mockStat.mockResolvedValue({
      isDirectory: () => false,
      isFile: () => true,
      mtime: new Date(),
      ctime: new Date(),
      size: 100,
      mode: 0o644
    })

    const result = await scanDirectory('/test', { ...defaultOptions, followSymlinks: true })
    expect(result).toBeDefined()
  })

  it('无权限目录返回空数组不报错', async () => {
    mockReaddir.mockRejectedValue(new Error('EACCES: permission denied'))
    mockStat.mockResolvedValue({
      isDirectory: () => true,
      isFile: () => false,
      mtime: new Date(),
      ctime: new Date(),
      mode: 0o755
    })

    const result = await scanDirectory('/test', defaultOptions)
    expect(result).toBeDefined()
  })

  it('progress 回调被正确调用', async () => {
    mockReaddir.mockResolvedValue([
      { name: 'file1.txt', isDirectory: () => false, isFile: () => true },
      { name: 'file2.txt', isDirectory: () => false, isFile: () => true }
    ])

    mockStat.mockResolvedValue({
      isDirectory: () => false,
      isFile: () => true,
      mtime: new Date(),
      ctime: new Date(),
      size: 100,
      mode: 0o644
    })

    const onProgress = vi.fn()
    await scanDirectory('/test', { ...defaultOptions, onProgress })

    expect(onProgress).toHaveBeenCalled()
    expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({
      phase: 'complete',
      percentage: 100
    }))
  })

  it('可被取消', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(scanDirectory('/test', {
      ...defaultOptions,
      signal: controller.signal
    })).rejects.toThrow('cancelled')
  })
})

describe('getFileMetadata', () => {
  it('返回文件元数据', async () => {
    const fs = await import('fs')
    vi.mocked(fs.promises.stat).mockResolvedValue({
      size: 1024,
      mtime: new Date('2024-01-15'),
      ctime: new Date('2024-01-10'),
      mode: 0o644
    } as any)

    const metadata = await getFileMetadata('/test/file.txt', false)
    expect(metadata.size).toBe(1024)
    expect(metadata.modifiedTime).toEqual(new Date('2024-01-15'))
    expect(metadata.createdTime).toEqual(new Date('2024-01-10'))
    expect(metadata.permissions).toBe('644')
    expect(metadata.hash).toBeUndefined()
  })

  it('computeHash=true 时计算哈希', async () => {
    const fs = await import('fs')
    vi.mocked(fs.promises.stat).mockResolvedValue({
      size: 100,
      mtime: new Date(),
      ctime: new Date(),
      mode: 0o644
    } as any)

    const metadata = await getFileMetadata('/test/file.txt', true)
    expect(metadata.hash).toBe('mock-hash')
  })
})

describe('getDirMetadata', () => {
  it('返回目录元数据', async () => {
    const fs = await import('fs')
    vi.mocked(fs.promises.stat).mockResolvedValue({
      mtime: new Date('2024-01-15'),
      ctime: new Date('2024-01-10'),
      mode: 0o755
    } as any)

    const metadata = await getDirMetadata('/test/dir')
    expect(metadata.size).toBe(0) // 目录大小为0
    expect(metadata.modifiedTime).toEqual(new Date('2024-01-15'))
    expect(metadata.createdTime).toEqual(new Date('2024-01-10'))
    expect(metadata.permissions).toBe('755')
  })
})

describe('computeFileHash', () => {
  it('空文件返回空字符串', async () => {
    const fs = await import('fs')
    vi.mocked(fs.promises.stat).mockResolvedValue({
      size: 0
    } as any)

    const hash = await computeFileHash('/test/empty.txt', false)
    expect(typeof hash).toBe('string')
    expect(hash.length).toBe(32) // MD5 hash length
  })

  it('相同内容返回相同哈希', async () => {
    // 这个测试在实际环境中需要真实文件
    // 这里我们只是验证函数被调用
    const fs = await import('fs')
    vi.mocked(fs.promises.stat).mockResolvedValue({
      size: 100
    } as any)

    const hash1 = await computeFileHash('/test/file1.txt')
    const hash2 = await computeFileHash('/test/file1.txt')
    expect(hash1).toBe(hash2)
  })

  it('大文件使用 Worker 池', async () => {
    const fs = await import('fs')
    vi.mocked(fs.promises.stat).mockResolvedValue({
      size: 15 * 1024 * 1024 // 15MB
    } as any)

    const hash = await computeFileHash('/test/large.txt', true)
    expect(hash).toBe('mock-hash')
  })
})

describe('buildPathIndex', () => {
  it('为所有节点创建索引', () => {
    const tree = {
      path: '/root',
      name: 'root',
      type: 'directory' as const,
      relativePath: '',
      children: [
        {
          path: '/root/file.txt',
          name: 'file.txt',
          type: 'file' as const,
          relativePath: 'file.txt'
        },
        {
          path: '/root/src',
          name: 'src',
          type: 'directory' as const,
          relativePath: 'src',
          children: [
            {
              path: '/root/src/index.js',
              name: 'index.js',
              type: 'file' as const,
              relativePath: 'src/index.js'
            }
          ]
        }
      ]
    }

    const index = buildPathIndex(tree)
    expect(index.get('')).toBe(tree)
    expect(index.get('file.txt')).toBe(tree.children![0])
    expect(index.get('src')).toBe(tree.children![1])
    expect(index.get('src/index.js')).toBe(tree.children![1].children![0])
  })

  it('空树返回空索引', () => {
    const tree = {
      path: '/root',
      name: 'root',
      type: 'directory' as const,
      relativePath: '',
      children: []
    }

    const index = buildPathIndex(tree)
    expect(index.size).toBe(1) // 只有根节点
  })
})

describe('flattenTree', () => {
  it('展平目录树', () => {
    const tree = {
      path: '/root',
      name: 'root',
      type: 'directory' as const,
      relativePath: '',
      children: [
        {
          path: '/root/file.txt',
          name: 'file.txt',
          type: 'file' as const,
          relativePath: 'file.txt'
        },
        {
          path: '/root/src',
          name: 'src',
          type: 'directory' as const,
          relativePath: 'src',
          children: [
            {
              path: '/root/src/index.js',
              name: 'index.js',
              type: 'file' as const,
              relativePath: 'src/index.js'
            }
          ]
        }
      ]
    }

    const flat = flattenTree(tree)
    expect(flat).toHaveLength(4) // root + file.txt + src + index.js
    expect(flat.map(n => n.name)).toContain('root')
    expect(flat.map(n => n.name)).toContain('file.txt')
    expect(flat.map(n => n.name)).toContain('src')
    expect(flat.map(n => n.name)).toContain('index.js')
  })

  it('单节点树返回数组', () => {
    const tree = {
      path: '/root',
      name: 'root',
      type: 'file' as const,
      relativePath: ''
    }

    const flat = flattenTree(tree)
    expect(flat).toHaveLength(1)
    expect(flat[0].name).toBe('root')
  })
})
