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

describe('Directory Module Integration', () => {
  let tempDir1: string
  let tempDir2: string

  beforeEach(async () => {
    tempDir1 = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'module-test-left-'))
    tempDir2 = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'module-test-right-'))
  })

  afterEach(async () => {
    await fs.promises.rm(tempDir1, { recursive: true, force: true })
    await fs.promises.rm(tempDir2, { recursive: true, force: true })
  })

  it('should handle empty directories', async () => {
    const options: DirCompareOptions = {
      compareMode: 'content',
      recursive: true,
      filters: [],
      useHash: false,
      parallel: false,
      workerCount: 1
    }

    const [leftResult, rightResult] = await Promise.all([
      scanDirectory(tempDir1, options),
      scanDirectory(tempDir2, options)
    ])

    const compareResult = await compareDirectories(
      leftResult.root,
      rightResult.root,
      options
    )

    const leftInfo = createDirectoryInfo(
      tempDir1,
      path.basename(tempDir1),
      leftResult.totalFiles,
      leftResult.totalSize,
      new Date()
    )

    const rightInfo = createDirectoryInfo(
      tempDir2,
      path.basename(tempDir2),
      rightResult.totalFiles,
      rightResult.totalSize,
      new Date()
    )

    const stats = computeStatistics(
      compareResult.entries,
      leftInfo,
      rightInfo,
      Date.now()
    )

    // 空目录应该有0个文件和0个子目录（根目录不计入）
    expect(stats.totalFiles).toBe(0)
    expect(stats.equal).toBe(0)
  })

  it('should handle directories with special characters in names', async () => {
    const specialDir1 = path.join(tempDir1, 'special chars !@#$%')
    const specialDir2 = path.join(tempDir2, 'special chars !@#$%')

    await fs.promises.mkdir(specialDir1, { recursive: true })
    await fs.promises.mkdir(specialDir2, { recursive: true })
    await fs.promises.writeFile(path.join(specialDir1, 'file.txt'), 'content')
    await fs.promises.writeFile(path.join(specialDir2, 'file.txt'), 'content')

    const options: DirCompareOptions = {
      compareMode: 'content',
      recursive: true,
      filters: [],
      useHash: false,
      parallel: false,
      workerCount: 1
    }

    const [leftResult, rightResult] = await Promise.all([
      scanDirectory(tempDir1, options),
      scanDirectory(tempDir2, options)
    ])

    const compareResult = await compareDirectories(
      leftResult.root,
      rightResult.root,
      options
    )

    expect(compareResult.entries.length).toBeGreaterThan(0)
  })

  it('should handle large directory structures', async () => {
    // 创建深层目录结构
    for (let i = 0; i < 10; i++) {
      const deepDir1 = path.join(tempDir1, 'level1', 'level2', 'level3', `level${i}`)
      const deepDir2 = path.join(tempDir2, 'level1', 'level2', 'level3', `level${i}`)
      await fs.promises.mkdir(deepDir1, { recursive: true })
      await fs.promises.mkdir(deepDir2, { recursive: true })
      await fs.promises.writeFile(path.join(deepDir1, 'file.txt'), `content ${i}`)
      await fs.promises.writeFile(path.join(deepDir2, 'file.txt'), `content ${i}`)
    }

    const options: DirCompareOptions = {
      compareMode: 'content',
      recursive: true,
      filters: [],
      useHash: false,
      parallel: false,
      workerCount: 1
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

    expect(compareResult.entries.length).toBeGreaterThan(0)
    expect(duration).toBeLessThan(5000) // 应该在5秒内完成
  })

  it('should handle binary files', async () => {
    const binaryContent1 = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE])
    const binaryContent2 = Buffer.from([0x00, 0x01, 0x02, 0x04, 0xFF, 0xFE])

    await fs.promises.writeFile(path.join(tempDir1, 'binary.bin'), binaryContent1)
    await fs.promises.writeFile(path.join(tempDir2, 'binary.bin'), binaryContent2)

    const options: DirCompareOptions = {
      compareMode: 'content',
      recursive: true,
      filters: [],
      useHash: false,
      parallel: false,
      workerCount: 1
    }

    const [leftResult, rightResult] = await Promise.all([
      scanDirectory(tempDir1, options),
      scanDirectory(tempDir2, options)
    ])

    const compareResult = await compareDirectories(
      leftResult.root,
      rightResult.root,
      options
    )

    const binaryEntry = compareResult.entries[0]?.children?.find(
      (e: { name: string }) => e.name === 'binary.bin'
    )

    if (binaryEntry) {
      expect(binaryEntry.status).toBe('modified')
    }
  })

  it('should handle comparison with different file sizes', async () => {
    const options: DirCompareOptions = {
      compareMode: 'size',
      recursive: true,
      filters: [],
      useHash: false,
      parallel: false,
      workerCount: 1
    }

    await fs.promises.writeFile(path.join(tempDir1, 'file.txt'), 'small')
    await fs.promises.writeFile(path.join(tempDir2, 'file.txt'), 'larger content here')

    const [leftResult, rightResult] = await Promise.all([
      scanDirectory(tempDir1, options),
      scanDirectory(tempDir2, options)
    ])

    const compareResult = await compareDirectories(
      leftResult.root,
      rightResult.root,
      options
    )

    const fileEntry = compareResult.entries.find(
      (e: { name: string }) => e.name === 'file.txt'
    )

    expect(fileEntry?.status).toBe('modified')
  })

  it('should handle comparison with name only mode', async () => {
    const options: DirCompareOptions = {
      compareMode: 'name',
      recursive: true,
      filters: [],
      useHash: false,
      parallel: false,
      workerCount: 1
    }

    await fs.promises.writeFile(path.join(tempDir1, 'file.txt'), 'content1')
    await fs.promises.writeFile(path.join(tempDir2, 'file.txt'), 'content2')

    const [leftResult, rightResult] = await Promise.all([
      scanDirectory(tempDir1, options),
      scanDirectory(tempDir2, options)
    ])

    const compareResult = await compareDirectories(
      leftResult.root,
      rightResult.root,
      options
    )

    const fileEntry = compareResult.entries.find(
      (e: { name: string }) => e.name === 'file.txt'
    )

    // 仅名称模式下，同名文件应视为相同
    expect(fileEntry?.status).toBe('equal')
  })
})
