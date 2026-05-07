import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {
  scanDirectory,
  getFileMetadata,
  getDirMetadata,
  computeFileHash,
  buildPathIndex,
  flattenTree
} from '../scanner'
import type { DirCompareOptions } from '@shared/types'

describe('Directory Scanner', () => {
  let tempDir: string

  beforeEach(async () => {
    // 创建临时测试目录
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'scanner-test-'))

    // 创建测试文件结构
    await fs.promises.mkdir(path.join(tempDir, 'src'))
    await fs.promises.mkdir(path.join(tempDir, 'src', 'components'))
    await fs.promises.mkdir(path.join(tempDir, 'node_modules', 'test-pkg'), { recursive: true })

    // 创建测试文件
    await fs.promises.writeFile(path.join(tempDir, 'package.json'), '{"name": "test"}')
    await fs.promises.writeFile(path.join(tempDir, 'src', 'index.ts'), 'export const a = 1')
    await fs.promises.writeFile(path.join(tempDir, 'src', 'components', 'Button.tsx'), 'export const Button = () => {}')
    await fs.promises.writeFile(path.join(tempDir, 'node_modules', 'test-pkg', 'index.js'), 'module.exports = {}')
  })

  afterEach(async () => {
    // 清理临时目录
    await fs.promises.rm(tempDir, { recursive: true, force: true })
  })

  describe('scanDirectory', () => {
    it('should scan directory recursively', async () => {
      const options: DirCompareOptions = {
        compareMode: 'content',
        recursive: true,
        filters: [],
        useHash: false,
        parallel: false,
        workerCount: 1
      }

      const result = await scanDirectory(tempDir, options)

      expect(result.root).toBeDefined()
      expect(result.root.name).toBe(path.basename(tempDir))
      expect(result.root.type).toBe('directory')
      expect(result.root.children).toBeDefined()
      expect(result.root.children!.length).toBeGreaterThan(0)
    })

    it('should collect file metadata', async () => {
      const options: DirCompareOptions = {
        compareMode: 'content',
        recursive: true,
        filters: [],
        useHash: false,
        parallel: false,
        workerCount: 1
      }

      const result = await scanDirectory(tempDir, options)

      // 查找 package.json
      const packageJson = result.root.children?.find(
        child => child.name === 'package.json'
      )

      expect(packageJson).toBeDefined()
      expect(packageJson?.type).toBe('file')
      expect(packageJson?.metadata).toBeDefined()
      expect(packageJson?.metadata?.size).toBeGreaterThan(0)
      expect(packageJson?.metadata?.modifiedTime).toBeInstanceOf(Date)
      expect(packageJson?.metadata?.createdTime).toBeInstanceOf(Date)
    })

    it('should respect non-recursive option', async () => {
      const options: DirCompareOptions = {
        compareMode: 'content',
        recursive: false,
        filters: [],
        useHash: false,
        parallel: false,
        workerCount: 1
      }

      const result = await scanDirectory(tempDir, options)

      // 非递归模式下不应该扫描子目录
      const srcDir = result.root.children?.find(child => child.name === 'src')
      expect(srcDir).toBeDefined()
      expect(srcDir?.children?.length || 0).toBe(0)
    })

    it('should compute hash when enabled', async () => {
      const options: DirCompareOptions = {
        compareMode: 'content',
        recursive: true,
        filters: [],
        useHash: true,
        parallel: false,
        workerCount: 1
      }

      const result = await scanDirectory(tempDir, options)

      const packageJson = result.root.children?.find(
        child => child.name === 'package.json'
      )

      expect(packageJson?.metadata?.hash).toBeDefined()
      expect(packageJson?.metadata?.hash?.length).toBe(32) // MD5 hash length
    })

    it('should apply extension filters', async () => {
      const options: DirCompareOptions = {
        compareMode: 'content',
        recursive: true,
        filters: [
          {
            id: 'ts-only',
            type: 'extension',
            enabled: true,
            invert: false,
            extensions: ['.ts'],
            caseSensitive: false
          }
        ],
        useHash: false,
        parallel: false,
        workerCount: 1
      }

      const result = await scanDirectory(tempDir, options)

      // 递归查找所有文件
      const files = flattenTree(result.root).filter(n => n.type === 'file')
      const tsFiles = files.filter(f => f.name.endsWith('.ts'))
      const jsonFiles = files.filter(f => f.name.endsWith('.json'))

      expect(tsFiles.length).toBeGreaterThan(0)
      // 应用扩展名过滤后，只有 .ts 文件
      expect(files.length).toBe(tsFiles.length)
      expect(jsonFiles.length).toBe(0)
    })
  })

  describe('getFileMetadata', () => {
    it('should return file metadata', async () => {
      const filePath = path.join(tempDir, 'package.json')
      const metadata = await getFileMetadata(filePath, false)

      expect(metadata).toBeDefined()
      expect(metadata.size).toBeGreaterThan(0)
      expect(metadata.modifiedTime).toBeInstanceOf(Date)
      expect(metadata.createdTime).toBeInstanceOf(Date)
      expect(metadata.permissions).toBeDefined()
    })

    it('should compute hash when requested', async () => {
      const filePath = path.join(tempDir, 'package.json')
      const metadata = await getFileMetadata(filePath, true)

      expect(metadata.hash).toBeDefined()
      expect(metadata.hash?.length).toBe(32)
    })
  })

  describe('getDirMetadata', () => {
    it('should return directory metadata', async () => {
      const metadata = await getDirMetadata(tempDir)

      expect(metadata).toBeDefined()
      expect(metadata.size).toBe(0) // Directories have size 0 initially
      expect(metadata.modifiedTime).toBeInstanceOf(Date)
      expect(metadata.createdTime).toBeInstanceOf(Date)
    })
  })

  describe('computeFileHash', () => {
    it('should compute MD5 hash of file content', async () => {
      const filePath = path.join(tempDir, 'package.json')
      const hash = await computeFileHash(filePath)

      expect(hash).toBeDefined()
      expect(hash.length).toBe(32)
      expect(/^[a-f0-9]{32}$/.test(hash)).toBe(true)
    })

    it('should return consistent hash for same content', async () => {
      const filePath = path.join(tempDir, 'package.json')
      const hash1 = await computeFileHash(filePath)
      const hash2 = await computeFileHash(filePath)

      expect(hash1).toBe(hash2)
    })

    it('should return different hash for different content', async () => {
      const file1 = path.join(tempDir, 'package.json')
      const file2 = path.join(tempDir, 'src', 'index.ts')

      const hash1 = await computeFileHash(file1)
      const hash2 = await computeFileHash(file2)

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('buildPathIndex', () => {
    it('should build path to node mapping', async () => {
      const options: DirCompareOptions = {
        compareMode: 'content',
        recursive: true,
        filters: [],
        useHash: false,
        parallel: false,
        workerCount: 1
      }

      const result = await scanDirectory(tempDir, options)
      const index = buildPathIndex(result.root)

      expect(index.size).toBeGreaterThan(0)
      expect(index.has('')).toBe(true) // Root
      expect(index.has('src')).toBe(true)
      expect(index.has('package.json')).toBe(true)
    })
  })

  describe('flattenTree', () => {
    it('should flatten tree to array', async () => {
      const options: DirCompareOptions = {
        compareMode: 'content',
        recursive: true,
        filters: [],
        useHash: false,
        parallel: false,
        workerCount: 1
      }

      const result = await scanDirectory(tempDir, options)
      const flat = flattenTree(result.root)

      expect(flat.length).toBeGreaterThan(1)
      expect(flat.some(n => n.name === 'package.json')).toBe(true)
      expect(flat.some(n => n.type === 'directory')).toBe(true)
      expect(flat.some(n => n.type === 'file')).toBe(true)
    })
  })
})
