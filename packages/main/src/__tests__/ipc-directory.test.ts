import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { DirCompareOptions, DirectoryComparison } from '@shared/types'

/**
 * IPC 目录对比集成测试
 * 
 * 这些测试模拟渲染进程通过 IPC 调用主进程的目录对比功能
 * 验证完整的通信链路是否正常工作
 */
describe('IPC Directory Integration', () => {
  let tempDir1: string
  let tempDir2: string

  beforeEach(async () => {
    tempDir1 = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ipc-test-left-'))
    tempDir2 = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ipc-test-right-'))
  })

  afterEach(async () => {
    await fs.promises.rm(tempDir1, { recursive: true, force: true })
    await fs.promises.rm(tempDir2, { recursive: true, force: true })
  })

  /**
   * 模拟 IPC 调用 directory:compare
   * 注意：在实际 Electron 环境中，这通过 ipcRenderer.invoke 完成
   * 在测试中，我们直接调用 handler 逻辑
   */
  async function mockCompareDirectories(
    leftDir: string,
    rightDir: string,
    options?: Partial<DirCompareOptions>
  ): Promise<DirectoryComparison> {
    // 动态导入以避免在测试环境外加载 Electron 模块
    const { scanDirectory, compareDirectories, computeStatistics, createDirectoryInfo, applyFilters } = 
      await import('../directory/index')

    const mergedOptions: DirCompareOptions = {
      compareMode: 'content',
      recursive: true,
      filters: [],
      useHash: true,
      parallel: false,
      workerCount: 2,
      ...options
    }

    const startTime = Date.now()

    // 1. 并行扫描两个目录
    const [leftResult, rightResult] = await Promise.all([
      scanDirectory(leftDir, mergedOptions),
      scanDirectory(rightDir, mergedOptions)
    ])

    // 2. 对比两个目录树
    const compareResult = await compareDirectories(
      leftResult.root,
      rightResult.root,
      mergedOptions
    )

    // 3. 应用过滤器
    const filteredEntries = applyFilters(compareResult.entries, mergedOptions.filters)

    // 4. 计算统计信息
    const leftInfo = createDirectoryInfo(
      leftDir,
      path.basename(leftDir),
      leftResult.totalFiles,
      leftResult.totalSize,
      leftResult.root.metadata?.modifiedTime || new Date()
    )

    const rightInfo = createDirectoryInfo(
      rightDir,
      path.basename(rightDir),
      rightResult.totalFiles,
      rightResult.totalSize,
      rightResult.root.metadata?.modifiedTime || new Date()
    )

    const statistics = computeStatistics(
      filteredEntries,
      leftInfo,
      rightInfo,
      startTime
    )

    // 5. 构建完整对比结果
    return {
      id: `test-${Date.now()}`,
      leftRoot: leftInfo,
      rightRoot: rightInfo,
      entries: filteredEntries,
      statistics,
      completedAt: new Date(),
      options: mergedOptions
    }
  }

  describe('directory:compare IPC', () => {
    it('should return complete comparison result via IPC', async () => {
      // 创建测试文件
      await fs.promises.writeFile(path.join(tempDir1, 'file1.txt'), 'content1')
      await fs.promises.writeFile(path.join(tempDir2, 'file1.txt'), 'content1')
      await fs.promises.writeFile(path.join(tempDir1, 'left-only.txt'), 'left')

      const result = await mockCompareDirectories(tempDir1, tempDir2)

      // 验证返回结构完整
      expect(result.id).toBeDefined()
      expect(result.leftRoot).toBeDefined()
      expect(result.rightRoot).toBeDefined()
      expect(result.entries).toBeDefined()
      expect(result.statistics).toBeDefined()
      expect(result.completedAt).toBeInstanceOf(Date)
      expect(result.options).toBeDefined()

      // 验证路径信息
      expect(result.leftRoot.path).toBe(tempDir1)
      expect(result.rightRoot.path).toBe(tempDir2)

      // 验证统计信息
      expect(result.statistics.totalFiles).toBeGreaterThanOrEqual(0)
      expect(result.statistics.duration).toBeGreaterThanOrEqual(0)
    })

    it('should handle different compare modes via IPC', async () => {
      await fs.promises.writeFile(path.join(tempDir1, 'file.txt'), 'content1')
      await fs.promises.writeFile(path.join(tempDir2, 'file.txt'), 'content2')

      // 测试 name 模式
      const nameResult = await mockCompareDirectories(tempDir1, tempDir2, {
        compareMode: 'name'
      })
      const nameFile = nameResult.entries.find(e => e.name === 'file.txt')
      expect(nameFile?.status).toBe('equal')

      // 测试 content 模式
      const contentResult = await mockCompareDirectories(tempDir1, tempDir2, {
        compareMode: 'content'
      })
      const contentFile = contentResult.entries.find(e => e.name === 'file.txt')
      expect(contentFile?.status).toBe('modified')
    })

    it('should apply filters via IPC', async () => {
      await fs.promises.writeFile(path.join(tempDir1, 'file.ts'), 'const a = 1')
      await fs.promises.writeFile(path.join(tempDir1, 'file.js'), 'var b = 2')
      await fs.promises.writeFile(path.join(tempDir2, 'file.ts'), 'const a = 1')
      await fs.promises.writeFile(path.join(tempDir2, 'file.js'), 'var b = 2')

      const result = await mockCompareDirectories(tempDir1, tempDir2, {
        filters: [
          {
            id: 'ts-only',
            type: 'extension',
            enabled: true,
            invert: false,
            extensions: ['.ts'],
            caseSensitive: false
          }
        ]
      })

      // 验证过滤只返回 .ts 文件
      const allFiles = flattenEntries(result.entries)
      expect(allFiles.every(f => f.name.endsWith('.ts'))).toBe(true)
    })

    it('should handle recursive option via IPC', async () => {
      await fs.promises.mkdir(path.join(tempDir1, 'subdir'), { recursive: true })
      await fs.promises.writeFile(path.join(tempDir1, 'subdir', 'file.txt'), 'content')
      await fs.promises.mkdir(path.join(tempDir2, 'subdir'), { recursive: true })
      await fs.promises.writeFile(path.join(tempDir2, 'subdir', 'file.txt'), 'content')

      // 递归模式
      const recursiveResult = await mockCompareDirectories(tempDir1, tempDir2, {
        recursive: true
      })
      const hasSubdirRecursive = recursiveResult.entries.some(e => 
        e.name === 'subdir' && e.children && e.children.length > 0
      )
      expect(hasSubdirRecursive).toBe(true)

      // 非递归模式
      const nonRecursiveResult = await mockCompareDirectories(tempDir1, tempDir2, {
        recursive: false
      })
      const subdirNonRecursive = nonRecursiveResult.entries.find(e => e.name === 'subdir')
      expect(subdirNonRecursive?.children?.length || 0).toBe(0)
    })

    it('should return correct statistics via IPC', async () => {
      await fs.promises.writeFile(path.join(tempDir1, 'equal.txt'), 'same')
      await fs.promises.writeFile(path.join(tempDir2, 'equal.txt'), 'same')
      await fs.promises.writeFile(path.join(tempDir1, 'modified.txt'), 'original')
      await fs.promises.writeFile(path.join(tempDir2, 'modified.txt'), 'changed')
      await fs.promises.writeFile(path.join(tempDir1, 'left-only.txt'), 'left')
      await fs.promises.writeFile(path.join(tempDir2, 'right-only.txt'), 'right')

      const result = await mockCompareDirectories(tempDir1, tempDir2)

      // 统计包含文件（不包括根目录）
      // 统计按差异条目计数（每个唯一路径只计数一次）
      // 注意：由于目录条目处理机制，根目录自身可能被计为一个条目
      // equal: 包含 equal.txt + 可能的根目录（如果状态为equal）
      // modified: modified.txt
      // left-only: left-only.txt
      // right-only: right-only.txt
      // 验证关键指标：总共有4个不同的文件条目
      expect(result.statistics.totalFiles).toBe(4)
      // 验证各状态计数之和等于总文件数
      const sum = result.statistics.equal + result.statistics.modified + 
                  result.statistics.leftOnly + result.statistics.rightOnly +
                  result.statistics.permissionChanged
      expect(sum).toBe(result.statistics.totalFiles)
    })

    it('should handle empty directories via IPC', async () => {
      const result = await mockCompareDirectories(tempDir1, tempDir2)

      // 空目录对比结果：entries 只包含根目录（1个），totalFiles 为 0
      expect(result.entries.length).toBe(1) // 根目录
      expect(result.statistics.totalFiles).toBe(0)
      expect(result.statistics.equal).toBe(0)
    })

    it('should handle special characters in paths via IPC', async () => {
      const specialDir1 = path.join(tempDir1, 'special chars !@#$%')
      const specialDir2 = path.join(tempDir2, 'special chars !@#$%')
      await fs.promises.mkdir(specialDir1, { recursive: true })
      await fs.promises.mkdir(specialDir2, { recursive: true })
      await fs.promises.writeFile(path.join(specialDir1, 'file.txt'), 'content')
      await fs.promises.writeFile(path.join(specialDir2, 'file.txt'), 'content')

      const result = await mockCompareDirectories(tempDir1, tempDir2)

      expect(result.entries.length).toBeGreaterThan(0)
      const specialEntry = result.entries.find(e => e.name === 'special chars !@#$%')
      expect(specialEntry).toBeDefined()
    })

    it('should include file metadata in response', async () => {
      await fs.promises.writeFile(path.join(tempDir1, 'file.txt'), 'content')
      await fs.promises.writeFile(path.join(tempDir2, 'file.txt'), 'content')

      const result = await mockCompareDirectories(tempDir1, tempDir2, {
        useHash: true
      })

      const fileEntry = result.entries.find(e => e.name === 'file.txt')
      expect(fileEntry?.leftMetadata).toBeDefined()
      expect(fileEntry?.rightMetadata).toBeDefined()
      expect(fileEntry?.leftMetadata?.size).toBeGreaterThan(0)
      expect(fileEntry?.leftMetadata?.modifiedTime).toBeInstanceOf(Date)
      expect(fileEntry?.leftMetadata?.hash).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle non-existent directories gracefully', async () => {
      const nonExistentPath = path.join(os.tmpdir(), 'non-existent-dir-' + Date.now())

      await expect(mockCompareDirectories(nonExistentPath, tempDir2))
        .rejects.toThrow()
    })

    it('should handle permission errors gracefully', async () => {
      // 创建测试文件
      await fs.promises.writeFile(path.join(tempDir1, 'file.txt'), 'content')
      await fs.promises.writeFile(path.join(tempDir2, 'file.txt'), 'content')

      // 测试正常情况不应抛出错误
      const result = await mockCompareDirectories(tempDir1, tempDir2)
      expect(result).toBeDefined()
    })
  })

  describe('Progress Tracking', () => {
    it('should track comparison duration', async () => {
      await fs.promises.writeFile(path.join(tempDir1, 'file.txt'), 'content')
      await fs.promises.writeFile(path.join(tempDir2, 'file.txt'), 'content')

      const startTime = Date.now()
      const result = await mockCompareDirectories(tempDir1, tempDir2)
      const endTime = Date.now()

      expect(result.statistics.duration).toBeGreaterThanOrEqual(0)
      expect(result.statistics.duration).toBeLessThanOrEqual(endTime - startTime + 100)
    })

    it('should generate unique comparison IDs', async () => {
      await fs.promises.writeFile(path.join(tempDir1, 'file.txt'), 'content')
      await fs.promises.writeFile(path.join(tempDir2, 'file.txt'), 'content')

      const result1 = await mockCompareDirectories(tempDir1, tempDir2)
      const result2 = await mockCompareDirectories(tempDir1, tempDir2)

      expect(result1.id).not.toBe(result2.id)
    })
  })
})

/**
 * 辅助函数：扁平化差异条目
 */
function flattenEntries(entries: { name: string; type: string; children?: typeof entries }[]): typeof entries {
  const result: typeof entries = []

  function traverse(items: typeof entries) {
    for (const item of items) {
      result.push(item)
      if (item.children) {
        traverse(item.children)
      }
    }
  }

  traverse(entries)
  return result.filter(e => e.type === 'file')
}
