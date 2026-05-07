import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { DirCompareOptions } from '@shared/types'
import {
  scanDirectory,
  compareDirectories,
  computeStatistics,
  createDirectoryInfo
} from '../index'

/**
 * 性能基准测试
 * 
 * 验证开发计划中的性能指标：
 * - 1000个文件对比 < 3秒
 */
describe('Directory Compare Performance', () => {
  let tempDir1: string
  let tempDir2: string

  beforeEach(async () => {
    tempDir1 = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'perf-test-left-'))
    tempDir2 = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'perf-test-right-'))
  })

  afterEach(async () => {
    await fs.promises.rm(tempDir1, { recursive: true, force: true })
    await fs.promises.rm(tempDir2, { recursive: true, force: true })
  })

  /**
   * 创建测试目录结构
   */
  async function createTestStructure(
    baseDir: string,
    fileCount: number,
    depth: number = 3
  ): Promise<void> {
    const filesPerDir = Math.ceil(fileCount / depth)
    let fileIndex = 0

    for (let d = 0; d < depth && fileIndex < fileCount; d++) {
      const dirPath = path.join(baseDir, `level${d}`)
      await fs.promises.mkdir(dirPath, { recursive: true })

      for (let i = 0; i < filesPerDir && fileIndex < fileCount; i++) {
        const content = `File content for ${fileIndex} with some random data ${Math.random()}`
        await fs.promises.writeFile(
          path.join(dirPath, `file${fileIndex}.txt`),
          content
        )
        fileIndex++
      }
    }
  }

  describe('Small Project (100 files)', () => {
    it('should complete scan + compare in < 1 second', async () => {
      await createTestStructure(tempDir1, 100, 3)
      await createTestStructure(tempDir2, 100, 3)

      const options: DirCompareOptions = {
        compareMode: 'content',
        recursive: true,
        filters: [],
        useHash: true,
        parallel: false,
        workerCount: 2
      }

      const startTime = Date.now()

      const [leftResult, rightResult] = await Promise.all([
        scanDirectory(tempDir1, options),
        scanDirectory(tempDir2, options)
      ])

      const compareResult = await compareDirectories(
        leftResult.root,
        rightResult.root,
        options
      )

      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(1000)
      expect(compareResult.entries.length).toBeGreaterThan(0)

      console.log(`Small project (100 files): ${duration}ms`)
    })
  })

  describe('Medium Project (1000 files) - Week 1 Target', () => {
    it('should complete scan + compare in < 3 seconds (Week 1 target)', async () => {
      await createTestStructure(tempDir1, 1000, 5)
      await createTestStructure(tempDir2, 1000, 5)

      const options: DirCompareOptions = {
        compareMode: 'content',
        recursive: true,
        filters: [],
        useHash: true,
        parallel: false,
        workerCount: 2
      }

      const startTime = Date.now()

      const [leftResult, rightResult] = await Promise.all([
        scanDirectory(tempDir1, options),
        scanDirectory(tempDir2, options)
      ])

      const compareResult = await compareDirectories(
        leftResult.root,
        rightResult.root,
        options
      )

      const duration = Date.now() - startTime

      // Week 1 验收标准：1000个文件对比 < 3秒
      expect(duration).toBeLessThan(3000)
      expect(compareResult.entries.length).toBeGreaterThan(0)

      console.log(`Medium project (1000 files): ${duration}ms`)
    })

    it('should handle different file modifications efficiently', async () => {
      // 创建相同的基础结构
      await createTestStructure(tempDir1, 1000, 5)
      await createTestStructure(tempDir2, 1000, 5)

      // 修改一些文件
      for (let i = 0; i < 100; i++) {
        await fs.promises.writeFile(
          path.join(tempDir2, `level0`, `file${i}.txt`),
          `Modified content ${i}`
        )
      }

      const options: DirCompareOptions = {
        compareMode: 'content',
        recursive: true,
        filters: [],
        useHash: true,
        parallel: false,
        workerCount: 2
      }

      const startTime = Date.now()

      const [leftResult, rightResult] = await Promise.all([
        scanDirectory(tempDir1, options),
        scanDirectory(tempDir2, options)
      ])

      const compareResult = await compareDirectories(
        leftResult.root,
        rightResult.root,
        options
      )

      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(3000)

      // 验证正确检测到修改
      const stats = computeStatistics(
        compareResult.entries,
        createDirectoryInfo(tempDir1, 'left', leftResult.totalFiles, leftResult.totalSize, new Date()),
        createDirectoryInfo(tempDir2, 'right', rightResult.totalFiles, rightResult.totalSize, new Date()),
        startTime
      )

      expect(stats.modified).toBeGreaterThan(0)
      console.log(`Medium project with modifications: ${duration}ms, ${stats.modified} modified files`)
    })
  })

  describe('Large Project (10000 files)', () => {
    it('should complete scan + compare in reasonable time', async () => {
      await createTestStructure(tempDir1, 10000, 8)
      await createTestStructure(tempDir2, 10000, 8)

      const options: DirCompareOptions = {
        compareMode: 'content',
        recursive: true,
        filters: [],
        useHash: true,
        parallel: false,
        workerCount: 2
      }

      const startTime = Date.now()

      const [leftResult, rightResult] = await Promise.all([
        scanDirectory(tempDir1, options),
        scanDirectory(tempDir2, options)
      ])

      const compareResult = await compareDirectories(
        leftResult.root,
        rightResult.root,
        options
      )

      const duration = Date.now() - startTime

      // 大型项目应在30秒内完成（根据开发计划 Week 3 目标）
      expect(duration).toBeLessThan(30000)
      expect(compareResult.entries.length).toBeGreaterThan(0)

      console.log(`Large project (10000 files): ${duration}ms`)
    })
  })

  describe('Compare Mode Performance', () => {
    beforeEach(async () => {
      await createTestStructure(tempDir1, 500, 3)
      await createTestStructure(tempDir2, 500, 3)
    })

    it('name mode should be fastest', async () => {
      const baseOptions = {
        recursive: true,
        filters: [],
        useHash: false,
        parallel: false,
        workerCount: 2
      }

      // Test name mode
      const nameOptions: DirCompareOptions = { ...baseOptions, compareMode: 'name' }
      const [leftName, rightName] = await Promise.all([
        scanDirectory(tempDir1, nameOptions),
        scanDirectory(tempDir2, nameOptions)
      ])
      const nameStart = Date.now()
      await compareDirectories(leftName.root, rightName.root, nameOptions)
      const nameDuration = Date.now() - nameStart

      // Test size mode
      const sizeOptions: DirCompareOptions = { ...baseOptions, compareMode: 'size' }
      const [leftSize, rightSize] = await Promise.all([
        scanDirectory(tempDir1, sizeOptions),
        scanDirectory(tempDir2, sizeOptions)
      ])
      const sizeStart = Date.now()
      await compareDirectories(leftSize.root, rightSize.root, sizeOptions)
      const sizeDuration = Date.now() - sizeStart

      // Test content mode
      const contentOptions: DirCompareOptions = { ...baseOptions, compareMode: 'content' }
      const [leftContent, rightContent] = await Promise.all([
        scanDirectory(tempDir1, contentOptions),
        scanDirectory(tempDir2, contentOptions)
      ])
      const contentStart = Date.now()
      await compareDirectories(leftContent.root, rightContent.root, contentOptions)
      const contentDuration = Date.now() - contentStart

      console.log(`Name mode: ${nameDuration}ms, Size mode: ${sizeDuration}ms, Content mode: ${contentDuration}ms`)

      // Name mode should generally be fastest
      expect(nameDuration).toBeLessThanOrEqual(sizeDuration + 100)
    })

    it('hash comparison should be faster than full content comparison', async () => {
      // Create files with same content
      for (let i = 0; i < 100; i++) {
        const content = `Test content for file ${i}`
        await fs.promises.writeFile(path.join(tempDir1, `level0`, `hashfile${i}.txt`), content)
        await fs.promises.writeFile(path.join(tempDir2, `level0`, `hashfile${i}.txt`), content)
      }

      // With hash
      const withHashOptions: DirCompareOptions = {
        compareMode: 'content',
        recursive: true,
        filters: [],
        useHash: true,
        parallel: false,
        workerCount: 2
      }
      const [leftWithHash, rightWithHash] = await Promise.all([
        scanDirectory(tempDir1, withHashOptions),
        scanDirectory(tempDir2, withHashOptions)
      ])
      const withHashStart = Date.now()
      await compareDirectories(leftWithHash.root, rightWithHash.root, withHashOptions)
      const withHashDuration = Date.now() - withHashStart

      // Without hash (full content comparison)
      const noHashOptions: DirCompareOptions = {
        compareMode: 'content',
        recursive: true,
        filters: [],
        useHash: false,
        parallel: false,
        workerCount: 2
      }
      const [leftNoHash, rightNoHash] = await Promise.all([
        scanDirectory(tempDir1, noHashOptions),
        scanDirectory(tempDir2, noHashOptions)
      ])
      const noHashStart = Date.now()
      await compareDirectories(leftNoHash.root, rightNoHash.root, noHashOptions)
      const noHashDuration = Date.now() - noHashStart

      console.log(`With hash: ${withHashDuration}ms, Without hash: ${noHashDuration}ms`)

      // Hash comparison should generally be faster or comparable
      // (Allow some tolerance for measurement variance)
      expect(withHashDuration).toBeLessThanOrEqual(noHashDuration + 200)
    })
  })

  describe('Memory Usage', () => {
    it('should handle medium project without excessive memory', async () => {
      await createTestStructure(tempDir1, 1000, 5)
      await createTestStructure(tempDir2, 1000, 5)

      const initialMemory = process.memoryUsage().heapUsed

      const options: DirCompareOptions = {
        compareMode: 'content',
        recursive: true,
        filters: [],
        useHash: true,
        parallel: false,
        workerCount: 2
      }

      const [leftResult, rightResult] = await Promise.all([
        scanDirectory(tempDir1, options),
        scanDirectory(tempDir2, options)
      ])

      await compareDirectories(leftResult.root, rightResult.root, options)

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024 // MB

      console.log(`Memory increase for 1000 files: ${memoryIncrease.toFixed(2)} MB`)

      // Should use less than 500MB for medium project (per development plan)
      expect(memoryIncrease).toBeLessThan(500)
    })
  })
})
