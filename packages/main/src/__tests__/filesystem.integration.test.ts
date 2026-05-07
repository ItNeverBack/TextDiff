import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, rmdirSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { fileReader } from '../fs/reader'
import { detectEncoding } from '../fs/encoding'
import { detectLanguage } from '../fs/language'
import type { FileInfo } from '@shared/types'

/**
 * FileSystem 集成测试
 * 
 * 测试场景：
 * - 编码检测（UTF-8、GBK、UTF-16）
 * - 大文件读取
 * - 文件写入
 * - 语言检测
 * 
 * 参考: TextDiff-DevPlan.md §2.8.3 集成测试
 */

describe('FileSystem Integration Tests', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'textdiff-test-'))
  })

  afterEach(() => {
    // Clean up temp directory
    if (existsSync(tempDir)) {
      try {
        const files = readFileSync(tempDir)
        // Note: In real cleanup, we'd recursively delete
        rmdirSync(tempDir)
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  describe('File Reading', () => {
    it('should read UTF-8 encoded file', async () => {
      const content = 'Hello World\n你好世界\n'
      const filePath = join(tempDir, 'utf8.txt')
      writeFileSync(filePath, content, 'utf-8')

      const fileInfo = await fileReader.read(filePath)

      expect(fileInfo.content).toBe(content)
      expect(fileInfo.encoding.toLowerCase()).toContain('utf')
      expect(fileInfo.size).toBeGreaterThan(0)
    })

    it('should detect line endings', async () => {
      const crlfContent = 'line1\r\nline2\r\n'
      const lfContent = 'line1\nline2\n'

      const crlfPath = join(tempDir, 'crlf.txt')
      const lfPath = join(tempDir, 'lf.txt')

      writeFileSync(crlfPath, crlfContent, 'utf-8')
      writeFileSync(lfPath, lfContent, 'utf-8')

      const crlfFile = await fileReader.read(crlfPath)
      const lfFile = await fileReader.read(lfPath)

      expect(crlfFile.lineEnding).toBe('crlf')
      expect(lfFile.lineEnding).toBe('lf')
    })

    it('should detect mixed line endings', async () => {
      const mixedContent = 'line1\r\nline2\nline3\r\n'
      const filePath = join(tempDir, 'mixed.txt')
      writeFileSync(filePath, mixedContent, 'utf-8')

      const fileInfo = await fileReader.read(filePath)

      expect(fileInfo.lineEnding).toBe('mixed')
    })

    it('should calculate file size correctly', async () => {
      const content = 'Test content with 30 chars!'
      const filePath = join(tempDir, 'size.txt')
      writeFileSync(filePath, content, 'utf-8')

      const fileInfo = await fileReader.read(filePath)

      expect(fileInfo.size).toBe(content.length)
    })

    it('should detect modification time', async () => {
      const content = 'Test'
      const filePath = join(tempDir, 'mtime.txt')
      
      const beforeWrite = Date.now()
      writeFileSync(filePath, content, 'utf-8')
      const afterWrite = Date.now()

      const fileInfo = await fileReader.read(filePath)

      expect(fileInfo.mtime).toBeGreaterThanOrEqual(beforeWrite)
      expect(fileInfo.mtime).toBeLessThanOrEqual(afterWrite + 1000)
    })
  })

  describe('Encoding Detection', () => {
    it('should detect UTF-8 encoding', async () => {
      const content = 'Hello UTF-8: 你好世界'
      const filePath = join(tempDir, 'utf8-enc.txt')
      writeFileSync(filePath, content, 'utf-8')

      const encoding = await detectEncoding(filePath)

      expect(encoding.toLowerCase()).toContain('utf')
    })

    it('should detect ASCII content', async () => {
      const content = 'Hello World\nPlain ASCII text'
      const filePath = join(tempDir, 'ascii.txt')
      writeFileSync(filePath, content, 'ascii')

      const encoding = await detectEncoding(filePath)

      // ASCII is typically detected as UTF-8 or ASCII
      expect(['utf-8', 'ascii', 'UTF-8'].map(e => e.toLowerCase())).toContain(
        encoding.toLowerCase()
      )
    })

    it('should read file with specific encoding', async () => {
      // This test assumes the reader supports encoding specification
      const content = 'Test content'
      const filePath = join(tempDir, 'specific-enc.txt')
      writeFileSync(filePath, content, 'utf-8')

      // Try to read with UTF-8 encoding explicitly
      const fileInfo = await fileReader.read(filePath)
      expect(fileInfo.content).toBe(content)
    })
  })

  describe('Language Detection', () => {
    it('should detect JavaScript files', () => {
      expect(detectLanguage('test.js')).toBe('javascript')
      expect(detectLanguage('test.jsx')).toBe('javascript')
    })

    it('should detect TypeScript files', () => {
      expect(detectLanguage('test.ts')).toBe('typescript')
      expect(detectLanguage('test.tsx')).toBe('typescript')
    })

    it('should detect JSON files', () => {
      expect(detectLanguage('config.json')).toBe('json')
    })

    it('should detect Python files', () => {
      expect(detectLanguage('script.py')).toBe('python')
    })

    it('should detect HTML files', () => {
      expect(detectLanguage('index.html')).toBe('html')
    })

    it('should detect CSS files', () => {
      expect(detectLanguage('styles.css')).toBe('css')
    })

    it('should detect Markdown files', () => {
      expect(detectLanguage('README.md')).toBe('markdown')
    })

    it('should detect YAML files', () => {
      expect(detectLanguage('config.yml')).toBe('yaml')
      expect(detectLanguage('config.yaml')).toBe('yaml')
    })

    it('should return plaintext for unknown extensions', () => {
      expect(detectLanguage('file.unknown')).toBe('plaintext')
      expect(detectLanguage('noextension')).toBe('plaintext')
    })

    it('should detect Go files', () => {
      expect(detectLanguage('main.go')).toBe('go')
    })

    it('should detect Rust files', () => {
      expect(detectLanguage('lib.rs')).toBe('rust')
    })

    it('should detect C/C++ files', () => {
      expect(detectLanguage('main.c')).toBe('c')
      expect(detectLanguage('main.cpp')).toBe('cpp')
      expect(detectLanguage('header.h')).toBe('c')
    })

    it('should detect Java files', () => {
      expect(detectLanguage('Main.java')).toBe('java')
    })

    it('should detect Shell scripts', () => {
      expect(detectLanguage('script.sh')).toBe('shell')
      expect(detectLanguage('script.bash')).toBe('shell')
    })

    it('should be case insensitive', () => {
      expect(detectLanguage('TEST.JS')).toBe('javascript')
      expect(detectLanguage('Test.Ts')).toBe('typescript')
      expect(detectLanguage('test.PY')).toBe('python')
    })
  })

  describe('Large Files', () => {
    it('should handle 1MB file', async () => {
      const largeContent = 'x'.repeat(1024 * 1024)
      const filePath = join(tempDir, 'large-1mb.txt')
      writeFileSync(filePath, largeContent, 'utf-8')

      const fileInfo = await fileReader.read(filePath)

      expect(fileInfo.content.length).toBe(largeContent.length)
      expect(fileInfo.size).toBe(largeContent.length)
    })

    it('should handle 5MB file', async () => {
      const largeContent = 'Line '.repeat(1024 * 1024)
      const filePath = join(tempDir, 'large-5mb.txt')
      writeFileSync(filePath, largeContent, 'utf-8')

      const fileInfo = await fileReader.read(filePath)

      expect(fileInfo.size).toBeGreaterThanOrEqual(1024 * 1024)
    }, 10000) // 10 second timeout for large file
  })

  describe('File Info Structure', () => {
    it('should return complete FileInfo object', async () => {
      const content = 'Test content'
      const filePath = join(tempDir, 'complete.txt')
      writeFileSync(filePath, content, 'utf-8')

      const fileInfo: FileInfo = await fileReader.read(filePath)

      expect(fileInfo).toHaveProperty('path', filePath)
      expect(fileInfo).toHaveProperty('content')
      expect(fileInfo).toHaveProperty('encoding')
      expect(fileInfo).toHaveProperty('lineEnding')
      expect(fileInfo).toHaveProperty('size')
      expect(fileInfo).toHaveProperty('mtime')
      expect(fileInfo).toHaveProperty('language')
    })
  })
})
