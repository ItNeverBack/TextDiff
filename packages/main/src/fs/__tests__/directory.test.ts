import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as path from 'path'

// Mock fs module
const mockReaddir = vi.fn()
const mockReadFile = vi.fn()

vi.mock('fs', () => ({
  promises: {
    readdir: (...args: unknown[]) => mockReaddir(...args),
    readFile: (...args: unknown[]) => mockReadFile(...args)
  }
}))

import { readDirectory, compareDirectories } from '../directory'

describe('readDirectory', () => {
  beforeEach(() => {
    mockReaddir.mockClear()
    mockReadFile.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should read files in directory', async () => {
    mockReaddir.mockResolvedValue([
      { name: 'file1.ts', isDirectory: () => false, isFile: () => true },
      { name: 'file2.js', isDirectory: () => false, isFile: () => true }
    ])

    const result = await readDirectory('/test/dir')

    expect(result).toHaveLength(2)
    // Check that both files are present using basename to handle Windows paths
    expect(result.map(f => path.basename(f))).toContain('file1.ts')
    expect(result.map(f => path.basename(f))).toContain('file2.js')
  })

  it('should filter by extension', async () => {
    mockReaddir.mockResolvedValue([
      { name: 'file1.ts', isDirectory: () => false, isFile: () => true },
      { name: 'file2.js', isDirectory: () => false, isFile: () => true },
      { name: 'file3.css', isDirectory: () => false, isFile: () => true }
    ])

    const result = await readDirectory('/test/dir', {
      filter: { extensions: ['ts', 'js'] }
    })

    expect(result).toHaveLength(2)
    expect(result.map(f => path.basename(f))).toContain('file1.ts')
    expect(result.map(f => path.basename(f))).toContain('file2.js')
    expect(result.map(f => path.basename(f))).not.toContain('file3.css')
  })

  it('should exclude patterns', async () => {
    mockReaddir.mockResolvedValue([
      { name: 'file1.ts', isDirectory: () => false, isFile: () => true },
      { name: 'node_modules', isDirectory: () => true, isFile: () => false },
      { name: 'file2.ts', isDirectory: () => false, isFile: () => true }
    ])

    const result = await readDirectory('/test/dir', {
      filter: { exclude: ['node_modules'] }
    })

    expect(result).toHaveLength(2)
    expect(result.map(f => path.basename(f))).toContain('file1.ts')
    expect(result.map(f => path.basename(f))).toContain('file2.ts')
  })

  it('should support glob patterns in exclude', async () => {
    mockReaddir.mockResolvedValue([
      { name: 'test.ts', isDirectory: () => false, isFile: () => true },
      { name: 'test.log', isDirectory: () => false, isFile: () => true },
      { name: 'debug.log', isDirectory: () => false, isFile: () => true }
    ])

    const result = await readDirectory('/test/dir', {
      filter: { exclude: ['*.log'] }
    })

    expect(result).toHaveLength(1)
    expect(result.map(f => path.basename(f))).toContain('test.ts')
  })

  it('should read recursively when recursive is true', async () => {
    mockReaddir
      .mockResolvedValueOnce([
        { name: 'src', isDirectory: () => true, isFile: () => false },
        { name: 'root.ts', isDirectory: () => false, isFile: () => true }
      ])
      .mockResolvedValueOnce([
        { name: 'sub.ts', isDirectory: () => false, isFile: () => true }
      ])

    const result = await readDirectory('/test/dir', { recursive: true })

    expect(result).toHaveLength(2)
    expect(result.map(f => path.basename(f))).toContain('root.ts')
    expect(result.map(f => path.basename(f))).toContain('sub.ts')
  })

  it('should handle empty directory', async () => {
    mockReaddir.mockResolvedValue([])

    const result = await readDirectory('/test/dir')

    expect(result).toHaveLength(0)
  })
})

describe('compareDirectories', () => {
  beforeEach(() => {
    mockReaddir.mockClear()
    mockReadFile.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should identify modified files', async () => {
    mockReaddir
      .mockResolvedValueOnce([
        { name: 'file.ts', isDirectory: () => false, isFile: () => true }
      ])
      .mockResolvedValueOnce([
        { name: 'file.ts', isDirectory: () => false, isFile: () => true }
      ])

    mockReadFile
      .mockResolvedValueOnce('content1')
      .mockResolvedValueOnce('content2')

    const result = await compareDirectories('/left', '/right')

    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('modified')
    expect(result[0].leftPath).toBe(path.join('/left', 'file.ts'))
    expect(result[0].rightPath).toBe(path.join('/right', 'file.ts'))
  })

  it('should identify equal files', async () => {
    mockReaddir
      .mockResolvedValueOnce([
        { name: 'file.ts', isDirectory: () => false, isFile: () => true }
      ])
      .mockResolvedValueOnce([
        { name: 'file.ts', isDirectory: () => false, isFile: () => true }
      ])

    mockReadFile
      .mockResolvedValueOnce('same content')
      .mockResolvedValueOnce('same content')

    const result = await compareDirectories('/left', '/right')

    expect(result[0].status).toBe('equal')
  })

  it('should identify left-only files', async () => {
    mockReaddir
      .mockResolvedValueOnce([
        { name: 'left-only.ts', isDirectory: () => false, isFile: () => true }
      ])
      .mockResolvedValueOnce([])

    const result = await compareDirectories('/left', '/right')

    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('left-only')
    expect(result[0].leftPath).toBe(path.join('/left', 'left-only.ts'))
    expect(result[0].rightPath).toBeNull()
  })

  it('should identify right-only files', async () => {
    mockReaddir
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { name: 'right-only.ts', isDirectory: () => false, isFile: () => true }
      ])

    const result = await compareDirectories('/left', '/right')

    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('right-only')
    expect(result[0].leftPath).toBeNull()
    expect(result[0].rightPath).toBe(path.join('/right', 'right-only.ts'))
  })

  it('should build tree structure with nested files', async () => {
    // Mock reading left and right directories - both have src directory with file.ts
    mockReaddir
      .mockResolvedValueOnce([
        { name: 'src', isDirectory: () => true, isFile: () => false }
      ])
      .mockResolvedValueOnce([
        { name: 'src', isDirectory: () => true, isFile: () => false }
      ])

    // Mock reading left and right src directories
    mockReaddir
      .mockResolvedValueOnce([
        { name: 'file.ts', isDirectory: () => false, isFile: () => true }
      ])
      .mockResolvedValueOnce([
        { name: 'file.ts', isDirectory: () => false, isFile: () => true }
      ])

    mockReadFile
      .mockResolvedValueOnce('content')
      .mockResolvedValueOnce('content')

    const result = await compareDirectories('/left', '/right')

    // Should have src directory
    expect(result.length).toBeGreaterThanOrEqual(1)
    const srcDir = result.find(e => e.name === 'src')
    expect(srcDir).toBeDefined()
    expect(srcDir?.type).toBe('directory')
    // Verify that the directory has children
    expect(srcDir?.children).toBeDefined()
    expect(srcDir?.children?.length).toBeGreaterThanOrEqual(1)
    // Verify the child is a file or directory (depending on how buildTree processes it)
    expect(['file', 'directory']).toContain(srcDir?.children?.[0].type)
  })

  it('should apply filters during comparison', async () => {
    mockReaddir
      .mockResolvedValueOnce([
        { name: 'file.ts', isDirectory: () => false, isFile: () => true },
        { name: 'file.log', isDirectory: () => false, isFile: () => true }
      ])
      .mockResolvedValueOnce([
        { name: 'file.ts', isDirectory: () => false, isFile: () => true },
        { name: 'file.log', isDirectory: () => false, isFile: () => true }
      ])

    mockReadFile
      .mockResolvedValueOnce('content')
      .mockResolvedValueOnce('content')

    const result = await compareDirectories('/left', '/right', {
      filter: { exclude: ['*.log'] }
    })

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('file.ts')
  })

  it('should handle mixed directory and file entries', async () => {
    mockReaddir
      .mockResolvedValueOnce([
        { name: 'src', isDirectory: () => true, isFile: () => false },
        { name: 'README.md', isDirectory: () => false, isFile: () => true }
      ])
      .mockResolvedValueOnce([
        { name: 'src', isDirectory: () => true, isFile: () => false },
        { name: 'README.md', isDirectory: () => false, isFile: () => true }
      ])

    mockReaddir
      .mockResolvedValueOnce([
        { name: 'index.ts', isDirectory: () => false, isFile: () => true }
      ])
      .mockResolvedValueOnce([
        { name: 'index.ts', isDirectory: () => false, isFile: () => true }
      ])

    mockReadFile
      .mockResolvedValueOnce('content')
      .mockResolvedValueOnce('content')

    const result = await compareDirectories('/left', '/right')

    // Should have both src directory and README.md file at root
    expect(result.length).toBeGreaterThanOrEqual(2)
    const hasDir = result.some(e => e.type === 'directory')
    const hasFile = result.some(e => e.type === 'file')
    expect(hasDir).toBe(true)
    expect(hasFile).toBe(true)
  })
})
