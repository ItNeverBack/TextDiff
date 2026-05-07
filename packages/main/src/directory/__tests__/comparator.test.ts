import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { compareDirectories, mergeStatus, updateDirectoryStatus } from '../comparator'
import type { DirTreeNode, DirCompareOptions, DirectoryDiffEntry } from '@shared/types'

describe('Directory Comparator', () => {
  let tempDir1: string
  let tempDir2: string

  beforeEach(async () => {
    tempDir1 = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'compare-test-left-'))
    tempDir2 = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'compare-test-right-'))

    // 创建左侧目录结构
    await fs.promises.mkdir(path.join(tempDir1, 'src'))
    await fs.promises.writeFile(path.join(tempDir1, 'package.json'), '{"name": "left"}')
    await fs.promises.writeFile(path.join(tempDir1, 'src', 'index.ts'), 'export const a = 1')

    // 创建右侧目录结构（部分相同，部分不同）
    await fs.promises.mkdir(path.join(tempDir2, 'src'))
    await fs.promises.writeFile(path.join(tempDir2, 'package.json'), '{"name": "left"}') // 相同
    await fs.promises.writeFile(path.join(tempDir2, 'src', 'index.ts'), 'export const a = 2') // 不同
    await fs.promises.writeFile(path.join(tempDir2, 'README.md'), '# Right Only') // 仅右侧
  })

  afterEach(async () => {
    await fs.promises.rm(tempDir1, { recursive: true, force: true })
    await fs.promises.rm(tempDir2, { recursive: true, force: true })
  })

  function createTreeNode(
    filePath: string,
    type: 'file' | 'directory',
    children?: DirTreeNode[]
  ): DirTreeNode {
    return {
      path: filePath,
      name: path.basename(filePath),
      type,
      children,
      metadata: type === 'file'
        ? { size: 100, modifiedTime: new Date(), createdTime: new Date(), permissions: '644' }
        : { size: 0, modifiedTime: new Date(), createdTime: new Date(), permissions: '755' }
    }
  }

  describe('compareDirectories', () => {
    it('should compare two directories', async () => {
      const options: DirCompareOptions = {
        compareMode: 'name',
        recursive: true,
        filters: [],
        useHash: false,
        parallel: false,
        workerCount: 1
      }

      const leftTree = createTreeNode(tempDir1, 'directory', [
        createTreeNode(path.join(tempDir1, 'file1.txt'), 'file'),
        createTreeNode(path.join(tempDir1, 'file2.txt'), 'file')
      ])

      const rightTree = createTreeNode(tempDir2, 'directory', [
        createTreeNode(path.join(tempDir2, 'file1.txt'), 'file'),
        createTreeNode(path.join(tempDir2, 'file3.txt'), 'file')
      ])

      const result = await compareDirectories(leftTree, rightTree, options)

      expect(result.entries).toBeDefined()
      expect(result.entries.length).toBeGreaterThan(0)
    })

    it('should detect left-only files', async () => {
      const options: DirCompareOptions = {
        compareMode: 'name',
        recursive: false,
        filters: [],
        useHash: false,
        parallel: false,
        workerCount: 1
      }

      const leftTree = createTreeNode(tempDir1, 'directory', [
        createTreeNode(path.join(tempDir1, 'only-left.txt'), 'file')
      ])

      const rightTree = createTreeNode(tempDir2, 'directory', [])

      const result = await compareDirectories(leftTree, rightTree, options)

      const onlyLeft = result.entries.find(e => e.name === 'only-left.txt')
      expect(onlyLeft).toBeDefined()
      expect(onlyLeft?.status).toBe('left-only')
    })

    it('should detect right-only files', async () => {
      const options: DirCompareOptions = {
        compareMode: 'name',
        recursive: false,
        filters: [],
        useHash: false,
        parallel: false,
        workerCount: 1
      }

      const leftTree = createTreeNode(tempDir1, 'directory', [])

      const rightTree = createTreeNode(tempDir2, 'directory', [
        createTreeNode(path.join(tempDir2, 'only-right.txt'), 'file')
      ])

      const result = await compareDirectories(leftTree, rightTree, options)

      const onlyRight = result.entries.find(e => e.name === 'only-right.txt')
      expect(onlyRight).toBeDefined()
      expect(onlyRight?.status).toBe('right-only')
    })

    it('should detect equal files', async () => {
      const options: DirCompareOptions = {
        compareMode: 'name',
        recursive: false,
        filters: [],
        useHash: false,
        parallel: false,
        workerCount: 1
      }

      const leftTree = createTreeNode(tempDir1, 'directory', [
        createTreeNode(path.join(tempDir1, 'same.txt'), 'file')
      ])

      const rightTree = createTreeNode(tempDir2, 'directory', [
        createTreeNode(path.join(tempDir2, 'same.txt'), 'file')
      ])

      const result = await compareDirectories(leftTree, rightTree, options)

      const sameFile = result.entries.find(e => e.name === 'same.txt')
      expect(sameFile).toBeDefined()
      expect(sameFile?.status).toBe('equal')
    })

    it('should detect type changes', async () => {
      const options: DirCompareOptions = {
        compareMode: 'name',
        recursive: false,
        filters: [],
        useHash: false,
        parallel: false,
        workerCount: 1
      }

      const leftTree = createTreeNode(tempDir1, 'directory', [
        createTreeNode(path.join(tempDir1, 'item'), 'file')
      ])

      const rightTree = createTreeNode(tempDir2, 'directory', [
        createTreeNode(path.join(tempDir2, 'item'), 'directory')
      ])

      const result = await compareDirectories(leftTree, rightTree, options)

      const item = result.entries.find(e => e.name === 'item')
      expect(item).toBeDefined()
      expect(item?.status).toBe('type-changed')
    })

    it('should respect compareMode size', async () => {
      const options: DirCompareOptions = {
        compareMode: 'size',
        recursive: false,
        filters: [],
        useHash: false,
        parallel: false,
        workerCount: 1
      }

      const leftTree = createTreeNode(tempDir1, 'directory', [
        {
          path: path.join(tempDir1, 'file.txt'),
          name: 'file.txt',
          type: 'file',
          metadata: { size: 100, modifiedTime: new Date(), createdTime: new Date(), permissions: '644' }
        }
      ])

      const rightTree = createTreeNode(tempDir2, 'directory', [
        {
          path: path.join(tempDir2, 'file.txt'),
          name: 'file.txt',
          type: 'file',
          metadata: { size: 200, modifiedTime: new Date(), createdTime: new Date(), permissions: '644' }
        }
      ])

      const result = await compareDirectories(leftTree, rightTree, options)

      const file = result.entries.find(e => e.name === 'file.txt')
      expect(file?.status).toBe('modified')
    })
  })

  describe('mergeStatus', () => {
    it('should return same status if both are equal', () => {
      expect(mergeStatus('equal', 'equal')).toBe('equal')
    })

    it('should return non-equal status', () => {
      expect(mergeStatus('equal', 'modified')).toBe('modified')
      expect(mergeStatus('modified', 'equal')).toBe('modified')
    })

    it('should return modified for different non-equal statuses', () => {
      expect(mergeStatus('left-only', 'right-only')).toBe('modified')
    })
  })

  describe('updateDirectoryStatus', () => {
    it('should update parent status based on children', () => {
      const entries: DirectoryDiffEntry[] = [
        {
          id: '1',
          relativePath: 'parent',
          name: 'parent',
          type: 'directory',
          status: 'equal',
          leftPath: null,
          rightPath: null,
          depth: 0,
          children: [
            {
              id: '2',
              relativePath: 'parent/child.txt',
              name: 'child.txt',
              type: 'file',
              status: 'modified',
              leftPath: null,
              rightPath: null,
              depth: 1
            }
          ]
        }
      ]

      updateDirectoryStatus(entries)

      expect(entries[0].status).toBe('modified')
    })

    it('should keep equal status if all children are equal', () => {
      const entries: DirectoryDiffEntry[] = [
        {
          id: '1',
          relativePath: 'parent',
          name: 'parent',
          type: 'directory',
          status: 'equal',
          leftPath: null,
          rightPath: null,
          depth: 0,
          children: [
            {
              id: '2',
              relativePath: 'parent/child.txt',
              name: 'child.txt',
              type: 'file',
              status: 'equal',
              leftPath: null,
              rightPath: null,
              depth: 1
            }
          ]
        }
      ]

      updateDirectoryStatus(entries)

      expect(entries[0].status).toBe('equal')
    })
  })
})
