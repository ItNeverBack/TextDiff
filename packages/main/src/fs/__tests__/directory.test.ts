import { describe, it, expect } from 'vitest'
import { 
  ensureDir, 
  removeDir, 
  copyDir, 
  listDir,
  isDirectory,
  getDirSize,
  type DirEntry
} from '../directory'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

describe('directory', () => {
  const createTempDir = () => {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'textdiff-test-'))
  }

  const cleanup = (dir: string) => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }

  describe('ensureDir', () => {
    it('should create directory if it does not exist', () => {
      const tempDir = createTempDir()
      const newDir = path.join(tempDir, 'new-directory')
      
      ensureDir(newDir)
      
      expect(fs.existsSync(newDir)).toBe(true)
      expect(fs.statSync(newDir).isDirectory()).toBe(true)
      
      cleanup(tempDir)
    })

    it('should not throw if directory already exists', () => {
      const tempDir = createTempDir()
      
      expect(() => ensureDir(tempDir)).not.toThrow()
      expect(fs.existsSync(tempDir)).toBe(true)
      
      cleanup(tempDir)
    })

    it('should create nested directories', () => {
      const tempDir = createTempDir()
      const nestedDir = path.join(tempDir, 'a', 'b', 'c')
      
      ensureDir(nestedDir)
      
      expect(fs.existsSync(nestedDir)).toBe(true)
      
      cleanup(tempDir)
    })
  })

  describe('removeDir', () => {
    it('should remove directory and its contents', () => {
      const tempDir = createTempDir()
      fs.writeFileSync(path.join(tempDir, 'file.txt'), 'content')
      
      removeDir(tempDir)
      
      expect(fs.existsSync(tempDir)).toBe(false)
    })

    it('should not throw if directory does not exist', () => {
      const nonExistentDir = path.join(os.tmpdir(), 'non-existent-' + Date.now())
      
      expect(() => removeDir(nonExistentDir)).not.toThrow()
    })
  })

  describe('copyDir', () => {
    it('should copy directory with all contents', () => {
      const sourceDir = createTempDir()
      const destDir = path.join(os.tmpdir(), 'dest-' + Date.now())
      
      fs.writeFileSync(path.join(sourceDir, 'file1.txt'), 'content1')
      fs.mkdirSync(path.join(sourceDir, 'subdir'))
      fs.writeFileSync(path.join(sourceDir, 'subdir', 'file2.txt'), 'content2')
      
      copyDir(sourceDir, destDir)
      
      expect(fs.existsSync(destDir)).toBe(true)
      expect(fs.existsSync(path.join(destDir, 'file1.txt'))).toBe(true)
      expect(fs.readFileSync(path.join(destDir, 'file1.txt'), 'utf-8')).toBe('content1')
      expect(fs.existsSync(path.join(destDir, 'subdir', 'file2.txt'))).toBe(true)
      
      cleanup(sourceDir)
      cleanup(destDir)
    })

    it('should overwrite existing files', () => {
      const sourceDir = createTempDir()
      const destDir = createTempDir()
      
      fs.writeFileSync(path.join(sourceDir, 'file.txt'), 'new')
      fs.writeFileSync(path.join(destDir, 'file.txt'), 'old')
      
      copyDir(sourceDir, destDir)
      
      expect(fs.readFileSync(path.join(destDir, 'file.txt'), 'utf-8')).toBe('new')
      
      cleanup(sourceDir)
      cleanup(destDir)
    })
  })

  describe('listDir', () => {
    it('should list all entries in directory', () => {
      const tempDir = createTempDir()
      fs.writeFileSync(path.join(tempDir, 'file1.txt'), 'a')
      fs.writeFileSync(path.join(tempDir, 'file2.txt'), 'b')
      fs.mkdirSync(path.join(tempDir, 'subdir'))
      
      const entries = listDir(tempDir)
      
      expect(entries).toHaveLength(3)
      expect(entries.map(e => e.name).sort()).toEqual(['file1.txt', 'file2.txt', 'subdir'])
      
      cleanup(tempDir)
    })

    it('should include file stats', () => {
      const tempDir = createTempDir()
      fs.writeFileSync(path.join(tempDir, 'file.txt'), 'content')
      
      const entries = listDir(tempDir)
      
      expect(entries[0].isDirectory).toBe(false)
      expect(entries[0].isFile).toBe(true)
      expect(typeof entries[0].size).toBe('number')
      expect(entries[0].mtime).toBeInstanceOf(Date)
      
      cleanup(tempDir)
    })

    it('should filter entries with pattern', () => {
      const tempDir = createTempDir()
      fs.writeFileSync(path.join(tempDir, 'test.txt'), 'a')
      fs.writeFileSync(path.join(tempDir, 'test.js'), 'b')
      fs.writeFileSync(path.join(tempDir, 'other.txt'), 'c')
      
      const entries = listDir(tempDir, { pattern: '*.txt' })
      
      expect(entries).toHaveLength(2)
      expect(entries.map(e => e.name)).toContain('test.txt')
      expect(entries.map(e => e.name)).toContain('other.txt')
      
      cleanup(tempDir)
    })

    it('should exclude hidden files when option is set', () => {
      const tempDir = createTempDir()
      fs.writeFileSync(path.join(tempDir, 'visible.txt'), 'a')
      fs.writeFileSync(path.join(tempDir, '.hidden'), 'b')
      
      const entries = listDir(tempDir, { excludeHidden: true })
      
      expect(entries).toHaveLength(1)
      expect(entries[0].name).toBe('visible.txt')
      
      cleanup(tempDir)
    })

    it('should return empty array for empty directory', () => {
      const tempDir = createTempDir()
      
      const entries = listDir(tempDir)
      
      expect(entries).toEqual([])
      
      cleanup(tempDir)
    })

    it('should throw for non-existent directory', () => {
      const nonExistentDir = path.join(os.tmpdir(), 'does-not-exist-' + Date.now())
      
      expect(() => listDir(nonExistentDir)).toThrow()
    })
  })

  describe('isDirectory', () => {
    it('should return true for directory', () => {
      const tempDir = createTempDir()
      
      expect(isDirectory(tempDir)).toBe(true)
      
      cleanup(tempDir)
    })

    it('should return false for file', () => {
      const tempDir = createTempDir()
      const filePath = path.join(tempDir, 'file.txt')
      fs.writeFileSync(filePath, 'content')
      
      expect(isDirectory(filePath)).toBe(false)
      
      cleanup(tempDir)
    })

    it('should return false for non-existent path', () => {
      const nonExistentPath = path.join(os.tmpdir(), 'does-not-exist-' + Date.now())
      
      expect(isDirectory(nonExistentPath)).toBe(false)
    })
  })

  describe('getDirSize', () => {
    it('should calculate total size of directory', () => {
      const tempDir = createTempDir()
      fs.writeFileSync(path.join(tempDir, 'file1.txt'), 'a'.repeat(100))
      fs.writeFileSync(path.join(tempDir, 'file2.txt'), 'b'.repeat(200))
      
      const size = getDirSize(tempDir)
      
      expect(size).toBe(300)
      
      cleanup(tempDir)
    })

    it('should include subdirectories', () => {
      const tempDir = createTempDir()
      fs.mkdirSync(path.join(tempDir, 'subdir'))
      fs.writeFileSync(path.join(tempDir, 'file.txt'), 'a'.repeat(50))
      fs.writeFileSync(path.join(tempDir, 'subdir', 'nested.txt'), 'b'.repeat(50))
      
      const size = getDirSize(tempDir)
      
      expect(size).toBe(100)
      
      cleanup(tempDir)
    })

    it('should return 0 for empty directory', () => {
      const tempDir = createTempDir()
      
      const size = getDirSize(tempDir)
      
      expect(size).toBe(0)
      
      cleanup(tempDir)
    })
  })
})
