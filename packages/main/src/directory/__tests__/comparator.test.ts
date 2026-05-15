import { describe, it, expect, vi } from 'vitest'
import {
  compareDirectories,
  mergeStatus,
  updateDirectoryStatus
} from '../comparator'
import type {
  DirTreeNode,
  DirectoryDiffEntry,
  DirCompareOptions,
  DiffStatus
} from '@shared/types'

// Mock fs module
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs')
  return {
    ...actual,
    promises: {
      readFile: vi.fn().mockResolvedValue(Buffer.from('test content')),
      stat: vi.fn().mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        mtime: new Date('2024-01-01'),
        size: 1000,
        mode: 0o644
      })
    }
  }
})

describe('compareDirectories', () => {
  const createMockTree = (
    name: string,
    children: DirTreeNode[] = [],
    type: 'file' | 'directory' = 'directory'
  ): DirTreeNode => ({
    path: `/test/${name}`,
    name,
    type,
    relativePath: name,
    children: type === 'directory' ? children : undefined,
    metadata: type === 'file' ? {
      size: 1000,
      modifiedTime: new Date('2024-01-01'),
      createdTime: new Date('2024-01-01'),
      permissions: '644'
    } : {
      size: 0,
      modifiedTime: new Date('2024-01-01'),
      createdTime: new Date('2024-01-01'),
      permissions: '755'
    }
  })

  const defaultOptions: DirCompareOptions = {
    recursive: true,
    compareMode: 'content',
    useHash: true,
    excludePatterns: [],
    includePatterns: [],
    followSymlinks: false
  }

  it('相同目录返回全 equal 状态', async () => {
    const leftTree = createMockTree('root', [
      createMockTree('file.txt', [], 'file')
    ])
    const rightTree = createMockTree('root', [
      createMockTree('file.txt', [], 'file')
    ])

    const result = await compareDirectories(leftTree, rightTree, defaultOptions)
    expect(result.entries.every(e => e.status === 'equal')).toBe(true)
  })

  it('左独有文件状态为 left-only', async () => {
    const leftTree = createMockTree('root', [
      createMockTree('left-only.txt', [], 'file')
    ])
    const rightTree = createMockTree('root', [])

    const result = await compareDirectories(leftTree, rightTree, defaultOptions)
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].status).toBe('left-only')
  })

  it('右独有文件状态为 right-only', async () => {
    const leftTree = createMockTree('root', [])
    const rightTree = createMockTree('root', [
      createMockTree('right-only.txt', [], 'file')
    ])

    const result = await compareDirectories(leftTree, rightTree, defaultOptions)
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].status).toBe('right-only')
  })

  it('同名不同大小文件状态为 modified', async () => {
    const leftTree = createMockTree('root', [
      { ...createMockTree('file.txt', [], 'file'), metadata: { size: 1000, modifiedTime: new Date(), createdTime: new Date(), permissions: '644' } }
    ])
    const rightTree = createMockTree('root', [
      { ...createMockTree('file.txt', [], 'file'), metadata: { size: 2000, modifiedTime: new Date(), createdTime: new Date(), permissions: '644' } }
    ])

    const result = await compareDirectories(leftTree, rightTree, { ...defaultOptions, compareMode: 'size' })
    expect(result.entries[0].status).toBe('modified')
  })

  it('同名不同修改时间状态为 modified', async () => {
    const leftTree = createMockTree('root', [
      { ...createMockTree('file.txt', [], 'file'), metadata: { size: 1000, modifiedTime: new Date('2024-01-01'), createdTime: new Date(), permissions: '644' } }
    ])
    const rightTree = createMockTree('root', [
      { ...createMockTree('file.txt', [], 'file'), metadata: { size: 1000, modifiedTime: new Date('2024-06-01'), createdTime: new Date(), permissions: '644' } }
    ])

    // 在 content 模式下，大小相同会继续检查内容
    const { promises: fsPromises } = await import('fs')
    vi.mocked(fsPromises.readFile)
      .mockResolvedValueOnce(Buffer.from('content A'))
      .mockResolvedValueOnce(Buffer.from('content B'))

    const result = await compareDirectories(leftTree, rightTree, defaultOptions)
    expect(result.entries[0].status).toBe('modified')
  })

  it('同名不同哈希状态为 modified', async () => {
    const leftTree = createMockTree('root', [
      { ...createMockTree('file.txt', [], 'file'), metadata: { size: 1000, modifiedTime: new Date(), createdTime: new Date(), permissions: '644', hash: 'hash-a' } }
    ])
    const rightTree = createMockTree('root', [
      { ...createMockTree('file.txt', [], 'file'), metadata: { size: 1000, modifiedTime: new Date(), createdTime: new Date(), permissions: '644', hash: 'hash-b' } }
    ])

    const result = await compareDirectories(leftTree, rightTree, defaultOptions)
    expect(result.entries[0].status).toBe('modified')
  })

  it('compareMode=name 时只比较名称', async () => {
    const leftTree = createMockTree('root', [
      { ...createMockTree('file.txt', [], 'file'), metadata: { size: 1000, modifiedTime: new Date('2024-01-01'), createdTime: new Date(), permissions: '644' } }
    ])
    const rightTree = createMockTree('root', [
      { ...createMockTree('file.txt', [], 'file'), metadata: { size: 2000, modifiedTime: new Date('2024-06-01'), createdTime: new Date(), permissions: '644' } }
    ])

    const result = await compareDirectories(leftTree, rightTree, { ...defaultOptions, compareMode: 'name' })
    expect(result.entries[0].status).toBe('equal')
  })

  it('compareMode=size 时比较大小', async () => {
    const leftTree = createMockTree('root', [
      { ...createMockTree('file.txt', [], 'file'), metadata: { size: 1000, modifiedTime: new Date(), createdTime: new Date(), permissions: '644' } }
    ])
    const rightTree = createMockTree('root', [
      { ...createMockTree('file.txt', [], 'file'), metadata: { size: 2000, modifiedTime: new Date(), createdTime: new Date(), permissions: '644' } }
    ])

    const result = await compareDirectories(leftTree, rightTree, { ...defaultOptions, compareMode: 'size' })
    expect(result.entries[0].status).toBe('modified')
  })

  it('compareMode=content 时比较哈希', async () => {
    const leftTree = createMockTree('root', [
      { ...createMockTree('file.txt', [], 'file'), metadata: { size: 1000, modifiedTime: new Date(), createdTime: new Date(), permissions: '644', hash: 'hash-a' } }
    ])
    const rightTree = createMockTree('root', [
      { ...createMockTree('file.txt', [], 'file'), metadata: { size: 1000, modifiedTime: new Date(), createdTime: new Date(), permissions: '644', hash: 'hash-a' } }
    ])

    const result = await compareDirectories(leftTree, rightTree, defaultOptions)
    expect(result.entries[0].status).toBe('equal')
  })

  it('类型变更时状态为 type-changed', async () => {
    const leftTree = createMockTree('root', [
      createMockTree('item', [], 'file')
    ])
    const rightTree = createMockTree('root', [
      createMockTree('item', [], 'directory')
    ])

    const result = await compareDirectories(leftTree, rightTree, defaultOptions)
    expect(result.entries[0].status).toBe('type-changed')
  })

  it('权限变更时状态为 permission-changed', async () => {
    const leftTree = createMockTree('root', [
      { ...createMockTree('file.txt', [], 'file'), metadata: { size: 1000, modifiedTime: new Date(), createdTime: new Date(), permissions: '644', hash: 'same-hash' } }
    ])
    const rightTree = createMockTree('root', [
      { ...createMockTree('file.txt', [], 'file'), metadata: { size: 1000, modifiedTime: new Date(), createdTime: new Date(), permissions: '755', hash: 'same-hash' } }
    ])

    const result = await compareDirectories(leftTree, rightTree, defaultOptions)
    expect(result.entries[0].status).toBe('permission-changed')
  })

  it('递归比较子目录', async () => {
    const leftTree = createMockTree('root', [
      createMockTree('src', [
        createMockTree('file.js', [], 'file')
      ])
    ])
    const rightTree = createMockTree('root', [
      createMockTree('src', [
        createMockTree('file.ts', [], 'file') // 不同文件
      ])
    ])

    const result = await compareDirectories(leftTree, rightTree, defaultOptions)
    expect(result.entries.length).toBeGreaterThan(0)
  })

  it('返回正确的统计信息', async () => {
    const leftTree = createMockTree('root', [
      createMockTree('file1.txt', [], 'file'),
      createMockTree('src', [
        createMockTree('file2.js', [], 'file')
      ])
    ])
    const rightTree = createMockTree('root', [
      createMockTree('file1.txt', [], 'file'),
      createMockTree('src', [
        createMockTree('file2.js', [], 'file')
      ])
    ])

    const result = await compareDirectories(leftTree, rightTree, defaultOptions)
    expect(result.totalFiles).toBeGreaterThan(0)
    expect(result.totalDirectories).toBeGreaterThan(0)
  })

  it('处理内容忽略选项', async () => {
    const leftTree = createMockTree('root', [
      { ...createMockTree('file.txt', [], 'file'), metadata: { size: 100, modifiedTime: new Date(), createdTime: new Date(), permissions: '644' } }
    ])
    const rightTree = createMockTree('root', [
      { ...createMockTree('file.txt', [], 'file'), metadata: { size: 100, modifiedTime: new Date(), createdTime: new Date(), permissions: '644' } }
    ])

    const { promises: fsPromises } = await import('fs')
    vi.mocked(fsPromises.readFile)
      .mockResolvedValueOnce(Buffer.from('Hello World'))
      .mockResolvedValueOnce(Buffer.from('hello world')) // 大小写不同

    const result = await compareDirectories(leftTree, rightTree, {
      ...defaultOptions,
      contentOptions: { ignoreCase: true, ignoreWhitespace: false, ignoreLineEndings: false }
    })

    // 大小写不敏感时应该相等
    expect(result.entries[0].status).toBe('equal')
  })
})

describe('mergeStatus', () => {
  it('equal + equal = equal', () => {
    expect(mergeStatus('equal', 'equal')).toBe('equal')
  })

  it('equal + modified = modified', () => {
    expect(mergeStatus('equal', 'modified')).toBe('modified')
    expect(mergeStatus('modified', 'equal')).toBe('modified')
  })

  it('equal + left-only = left-only', () => {
    expect(mergeStatus('equal', 'left-only')).toBe('left-only')
    expect(mergeStatus('left-only', 'equal')).toBe('left-only')
  })

  it('equal + right-only = right-only', () => {
    expect(mergeStatus('equal', 'right-only')).toBe('right-only')
    expect(mergeStatus('right-only', 'equal')).toBe('right-only')
  })

  it('modified + left-only = modified', () => {
    expect(mergeStatus('modified', 'left-only')).toBe('modified')
    expect(mergeStatus('left-only', 'modified')).toBe('modified')
  })

  it('modified + right-only = modified', () => {
    expect(mergeStatus('modified', 'right-only')).toBe('modified')
    expect(mergeStatus('right-only', 'modified')).toBe('modified')
  })

  it('left-only + right-only = modified', () => {
    expect(mergeStatus('left-only', 'right-only')).toBe('modified')
    expect(mergeStatus('right-only', 'left-only')).toBe('modified')
  })

  it('type-changed + equal = type-changed', () => {
    expect(mergeStatus('type-changed', 'equal')).toBe('type-changed')
  })

  it('permission-changed + equal = permission-changed', () => {
    expect(mergeStatus('permission-changed', 'equal')).toBe('permission-changed')
  })
})

describe('updateDirectoryStatus', () => {
  it('文件条目状态不变', () => {
    const entries: DirectoryDiffEntry[] = [
      {
        id: '1',
        relativePath: 'file.txt',
        name: 'file.txt',
        type: 'file',
        status: 'modified',
        depth: 0
      }
    ]

    updateDirectoryStatus(entries)
    expect(entries[0].status).toBe('modified')
  })

  it('目录状态根据子项更新', () => {
    const entries: DirectoryDiffEntry[] = [
      {
        id: '1',
        relativePath: 'src',
        name: 'src',
        type: 'directory',
        status: 'equal',
        depth: 0,
        children: [
          {
            id: '2',
            relativePath: 'src/file.js',
            name: 'file.js',
            type: 'file',
            status: 'modified',
            depth: 1
          }
        ]
      }
    ]

    updateDirectoryStatus(entries)
    expect(entries[0].status).toBe('modified')
  })

  it('所有子项相等时目录保持equal', () => {
    const entries: DirectoryDiffEntry[] = [
      {
        id: '1',
        relativePath: 'src',
        name: 'src',
        type: 'directory',
        status: 'equal',
        depth: 0,
        children: [
          {
            id: '2',
            relativePath: 'src/file1.js',
            name: 'file1.js',
            type: 'file',
            status: 'equal',
            depth: 1
          },
          {
            id: '3',
            relativePath: 'src/file2.js',
            name: 'file2.js',
            type: 'file',
            status: 'equal',
            depth: 1
          }
        ]
      }
    ]

    updateDirectoryStatus(entries)
    expect(entries[0].status).toBe('equal')
  })

  it('递归更新深层目录', () => {
    const entries: DirectoryDiffEntry[] = [
      {
        id: '1',
        relativePath: 'root',
        name: 'root',
        type: 'directory',
        status: 'equal',
        depth: 0,
        children: [
          {
            id: '2',
            relativePath: 'root/src',
            name: 'src',
            type: 'directory',
            status: 'equal',
            depth: 1,
            children: [
              {
                id: '3',
                relativePath: 'root/src/deep/file.js',
                name: 'file.js',
                type: 'file',
                status: 'modified',
                depth: 2
              }
            ]
          }
        ]
      }
    ]

    updateDirectoryStatus(entries)
    expect(entries[0].status).toBe('modified')
    expect(entries[0].children![0].status).toBe('modified')
  })

  it('空目录保持原状态', () => {
    const entries: DirectoryDiffEntry[] = [
      {
        id: '1',
        relativePath: 'empty',
        name: 'empty',
        type: 'directory',
        status: 'equal',
        depth: 0,
        children: []
      }
    ]

    updateDirectoryStatus(entries)
    expect(entries[0].status).toBe('equal')
  })

  it('多个顶层条目独立更新', () => {
    const entries: DirectoryDiffEntry[] = [
      {
        id: '1',
        relativePath: 'src',
        name: 'src',
        type: 'directory',
        status: 'equal',
        depth: 0,
        children: [
          {
            id: '2',
            relativePath: 'src/file.js',
            name: 'file.js',
            type: 'file',
            status: 'modified',
            depth: 1
          }
        ]
      },
      {
        id: '3',
        relativePath: 'docs',
        name: 'docs',
        type: 'directory',
        status: 'equal',
        depth: 0,
        children: [
          {
            id: '4',
            relativePath: 'docs/readme.md',
            name: 'readme.md',
            type: 'file',
            status: 'equal',
            depth: 1
          }
        ]
      }
    ]

    updateDirectoryStatus(entries)
    expect(entries[0].status).toBe('modified')
    expect(entries[1].status).toBe('equal')
  })
})
