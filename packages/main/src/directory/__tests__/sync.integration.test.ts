import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {
  SyncEngine,
  SyncOptions,
  executeSync,
  validateSyncPlan
} from '../sync'
import {
  generateSyncPlan,
  generateLeftToRightPlan,
  generateRightToLeftPlan,
  generateBidirectionalPlan,
  analyzeSyncPlan
} from '../sync-plan'
import type {
  DirectoryDiffEntry,
  SyncStrategy
} from '@shared/types'

/**
 * 同步功能集成测试
 */
describe('Sync Engine Integration Tests', () => {
  let tempDir: string
  let leftDir: string
  let rightDir: string
  let engine: SyncEngine

  // 创建测试目录结构
  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sync-test-'))
    leftDir = path.join(tempDir, 'left')
    rightDir = path.join(tempDir, 'right')

    await fs.promises.mkdir(leftDir, { recursive: true })
    await fs.promises.mkdir(rightDir, { recursive: true })

    engine = new SyncEngine()
  })

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true })
  })

  /**
   * 辅助函数：创建测试文件
   */
  async function createFile(dir: string, filePath: string, content: string): Promise<void> {
    const fullPath = path.join(dir, filePath)
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.promises.writeFile(fullPath, content, 'utf-8')
  }

  /**
   * 辅助函数：创建测试条目
   */
  function createTestEntry(
    name: string,
    status: DirectoryDiffEntry['status'],
    leftPath?: string,
    rightPath?: string
  ): DirectoryDiffEntry {
    return {
      id: `test-${name}`,
      relativePath: name,
      name,
      type: 'file',
      status,
      leftPath: leftPath || null,
      rightPath: rightPath || null,
      depth: 0,
      leftMetadata: leftPath ? {
        size: 100,
        modifiedTime: new Date(),
        createdTime: new Date(),
        permissions: '644'
      } : undefined,
      rightMetadata: rightPath ? {
        size: 100,
        modifiedTime: new Date(),
        createdTime: new Date(),
        permissions: '644'
      } : undefined
    }
  }

  describe('Basic Sync Operations', () => {
    it('should copy file from left to right', async () => {
      // 准备测试数据
      await createFile(leftDir, 'test.txt', 'Hello World')

      const entries: DirectoryDiffEntry[] = [
        createTestEntry('test.txt', 'left-only', path.join(leftDir, 'test.txt'))
      ]

      const plan = generateLeftToRightPlan(entries)

      // 执行同步
      const result = await executeSync(plan, undefined, undefined, { left: leftDir, right: rightDir })

      // 验证结果
      expect(result.success).toBe(true)
      expect(result.operations).toHaveLength(1)
      expect(result.operations[0].status).toBe('completed')

      // 验证文件已复制
      const rightFilePath = path.join(rightDir, 'test.txt')
      const exists = await fs.promises.access(rightFilePath)
        .then(() => true)
        .catch(() => false)
      expect(exists).toBe(true)

      const content = await fs.promises.readFile(rightFilePath, 'utf-8')
      expect(content).toBe('Hello World')
    })

    it('should copy file from right to left', async () => {
      await createFile(rightDir, 'test.txt', 'Hello from right')

      const entries: DirectoryDiffEntry[] = [
        createTestEntry('test.txt', 'right-only', undefined, path.join(rightDir, 'test.txt'))
      ]

      const plan = generateRightToLeftPlan(entries)
      const result = await executeSync(plan, undefined, undefined, { left: leftDir, right: rightDir })

      expect(result.success).toBe(true)

      const leftFilePath = path.join(leftDir, 'test.txt')
      const exists = await fs.promises.access(leftFilePath)
        .then(() => true)
        .catch(() => false)
      expect(exists).toBe(true)
    })

    it('should delete file from left', async () => {
      await createFile(leftDir, 'delete-me.txt', 'delete me')

      const entries: DirectoryDiffEntry[] = [
        createTestEntry('delete-me.txt', 'left-only', path.join(leftDir, 'delete-me.txt'))
      ]

      const plan = generateSyncPlan(entries, {
        strategy: 'right-to-left',
        includeLeftOnly: true,
        includeRightOnly: false,
        includeModified: false
      })

      const result = await executeSync(plan, undefined, undefined, { left: leftDir, right: rightDir })

      expect(result.success).toBe(true)

      const fileExists = await fs.promises.access(path.join(leftDir, 'delete-me.txt'))
        .then(() => true)
        .catch(() => false)
      expect(fileExists).toBe(false)
    })
  })

  describe('Sync Plan Generation', () => {
    it('should generate correct plan for left-to-right strategy', () => {
      const entries: DirectoryDiffEntry[] = [
        createTestEntry('file1.txt', 'left-only'),
        createTestEntry('file2.txt', 'right-only'),
        createTestEntry('file3.txt', 'modified'),
        createTestEntry('file4.txt', 'equal')
      ]

      const plan = generateLeftToRightPlan(entries)

      expect(plan.operations).toHaveLength(3) // left-only, right-only, modified

      // left-only should be copied to right
      const leftOnlyOp = plan.operations.find(o => o.entry.name === 'file1.txt')
      expect(leftOnlyOp?.action).toBe('copy-left-to-right')

      // right-only should be deleted from right
      const rightOnlyOp = plan.operations.find(o => o.entry.name === 'file2.txt')
      expect(rightOnlyOp?.action).toBe('delete-right')

      // modified should be copied from left to right
      const modifiedOp = plan.operations.find(o => o.entry.name === 'file3.txt')
      expect(modifiedOp?.action).toBe('copy-left-to-right')
    })

    it('should generate correct plan for bidirectional strategy', () => {
      const entries: DirectoryDiffEntry[] = [
        createTestEntry('file1.txt', 'left-only'),
        createTestEntry('file2.txt', 'right-only'),
        createTestEntry('file3.txt', 'modified')
      ]

      const plan = generateBidirectionalPlan(entries)

      // left-only should be copied to right
      const leftOnlyOp = plan.operations.find(o => o.entry.name === 'file1.txt')
      expect(leftOnlyOp?.action).toBe('copy-left-to-right')

      // right-only should be copied to left
      const rightOnlyOp = plan.operations.find(o => o.entry.name === 'file2.txt')
      expect(rightOnlyOp?.action).toBe('copy-right-to-left')

      // modified should be merged
      const modifiedOp = plan.operations.find(o => o.entry.name === 'file3.txt')
      expect(modifiedOp?.action).toBe('merge')
    })

    it('should include warnings for destructive operations', () => {
      const entries: DirectoryDiffEntry[] = [
        createTestEntry('file1.txt', 'modified')
      ]

      const plan = generateLeftToRightPlan(entries)

      expect(plan.warnings.length).toBeGreaterThan(0)
      expect(plan.warnings.some(w => w.includes('覆盖'))).toBe(true)
    })
  })

  describe('Sync Plan Analysis', () => {
    it('should correctly analyze plan statistics', () => {
      const entries: DirectoryDiffEntry[] = [
        createTestEntry('file1.txt', 'left-only'),
        createTestEntry('file2.txt', 'right-only'),
        createTestEntry('file3.txt', 'modified')
      ]

      const plan = generateBidirectionalPlan(entries)
      const analysis = analyzeSyncPlan(plan)

      expect(analysis.totalOperations).toBe(3)
      expect(analysis.copyCount).toBe(2)
      expect(analysis.mergeCount).toBe(1)
      expect(analysis.deleteCount).toBe(0)
      expect(analysis.ignoreCount).toBe(0)
      expect(analysis.estimatedTime).toBeGreaterThan(0)
    })
  })

  describe('Sync Validation', () => {
    it('should validate plan with missing source files', async () => {
      const entries: DirectoryDiffEntry[] = [
        createTestEntry('missing.txt', 'left-only', '/nonexistent/missing.txt')
      ]

      const plan = generateLeftToRightPlan(entries)
      const validation = await validateSyncPlan(plan)

      expect(validation.valid).toBe(false)
      expect(validation.operations[0].warnings.length).toBeGreaterThan(0)
    })
  })

  describe('Sync with Options', () => {
    it('should create backup when option is enabled', async () => {
      // 创建右侧文件
      await createFile(rightDir, 'test.txt', 'original content')
      await createFile(leftDir, 'test.txt', 'new content')

      const entries: DirectoryDiffEntry[] = [
        createTestEntry(
          'test.txt',
          'modified',
          path.join(leftDir, 'test.txt'),
          path.join(rightDir, 'test.txt')
        )
      ]

      const plan = generateLeftToRightPlan(entries)

      const options: Partial<SyncOptions> = {
        createBackup: true
      }

      const result = await executeSync(plan, options, undefined, { left: leftDir, right: rightDir })

      expect(result.success).toBe(true)

      // 检查备份文件是否创建
      const backupFiles = await fs.promises.readdir(rightDir)
      const hasBackup = backupFiles.some(f => f.includes('.backup-'))
      expect(hasBackup).toBe(true)
    })

    it('should preserve permissions when option is enabled', async () => {
      // 跳过 Windows 权限测试
      if (process.platform === 'win32') {
        return
      }

      await createFile(leftDir, 'test.txt', 'content')
      await fs.promises.chmod(path.join(leftDir, 'test.txt'), 0o755)

      const entries: DirectoryDiffEntry[] = [
        createTestEntry('test.txt', 'left-only', path.join(leftDir, 'test.txt'))
      ]

      const plan = generateLeftToRightPlan(entries)

      const options: Partial<SyncOptions> = {
        preservePermissions: true
      }

      await executeSync(plan, options, undefined, { left: leftDir, right: rightDir })

      const rightStats = await fs.promises.stat(path.join(rightDir, 'test.txt'))
      expect(rightStats.mode & 0o777).toBe(0o755)
    })
  })

  describe('Directory Sync', () => {
    it('should copy directory recursively', async () => {
      await createFile(leftDir, 'subdir/file1.txt', 'content1')
      await createFile(leftDir, 'subdir/file2.txt', 'content2')
      await createFile(leftDir, 'subdir/nested/file3.txt', 'content3')

      const entries: DirectoryDiffEntry[] = [
        {
          ...createTestEntry('subdir', 'left-only', path.join(leftDir, 'subdir')),
          type: 'directory',
          children: [
            createTestEntry('subdir/file1.txt', 'left-only', path.join(leftDir, 'subdir/file1.txt')),
            createTestEntry('subdir/file2.txt', 'left-only', path.join(leftDir, 'subdir/file2.txt')),
            {
              ...createTestEntry('subdir/nested', 'left-only', path.join(leftDir, 'subdir/nested')),
              type: 'directory',
              children: [
                createTestEntry('subdir/nested/file3.txt', 'left-only', path.join(leftDir, 'subdir/nested/file3.txt'))
              ]
            }
          ]
        }
      ]

      const plan = generateLeftToRightPlan(entries)
      const result = await executeSync(plan, undefined, undefined, { left: leftDir, right: rightDir })

      expect(result.success).toBe(true)

      // 验证文件都已复制
      const file1Exists = await fs.promises.access(path.join(rightDir, 'subdir/file1.txt'))
        .then(() => true)
        .catch(() => false)
      expect(file1Exists).toBe(true)

      const file3Exists = await fs.promises.access(path.join(rightDir, 'subdir/nested/file3.txt'))
        .then(() => true)
        .catch(() => false)
      expect(file3Exists).toBe(true)
    })
  })

  describe('Sync Progress', () => {
    it('should report progress during sync', async () => {
      await createFile(leftDir, 'file1.txt', 'content1')
      await createFile(leftDir, 'file2.txt', 'content2')

      const entries: DirectoryDiffEntry[] = [
        createTestEntry('file1.txt', 'left-only', path.join(leftDir, 'file1.txt')),
        createTestEntry('file2.txt', 'left-only', path.join(leftDir, 'file2.txt'))
      ]

      const plan = generateLeftToRightPlan(entries)

      const progressReports: number[] = []

      await executeSync(plan, {}, (progress) => {
        progressReports.push(progress.percentage)
      }, { left: leftDir, right: rightDir })

      expect(progressReports.length).toBe(2)
      expect(progressReports[0]).toBe(50)
      expect(progressReports[1]).toBe(100)
    })
  })
})
