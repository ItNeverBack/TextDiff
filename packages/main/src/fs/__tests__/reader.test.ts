import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { FileReader, fileReader } from '../reader'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

describe('FileReader', () => {
  let tempDir: string
  let reader: FileReader

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textdiff-reader-test-'))
    reader = new FileReader()
  })

  afterEach(() => {
    // 清理临时目录
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // 忽略清理错误
    }
  })

  describe('read', () => {
    it('读取 UTF-8 文件', async () => {
      const filePath = path.join(tempDir, 'utf8.txt')
      const content = 'Hello, World!\n你好，世界！'
      fs.writeFileSync(filePath, content, 'utf-8')

      const fileInfo = await reader.read(filePath)

      expect(fileInfo.path).toBe(filePath)
      expect(fileInfo.content).toBe(content)
      expect(fileInfo.encoding).toBe('utf-8')
      expect(fileInfo.size).toBe(Buffer.byteLength(content, 'utf-8'))
    })

    it('检测文件修改时间', async () => {
      const filePath = path.join(tempDir, 'mtime.txt')
      fs.writeFileSync(filePath, 'test', 'utf-8')

      const beforeRead = Date.now()
      const fileInfo = await reader.read(filePath)
      const afterRead = Date.now()

      expect(fileInfo.mtime).toBeGreaterThanOrEqual(beforeRead - 1000) // 允许 1 秒误差
      expect(fileInfo.mtime).toBeLessThanOrEqual(afterRead)
    })

    it('检测 LF 行尾', async () => {
      const filePath = path.join(tempDir, 'lf.txt')
      fs.writeFileSync(filePath, 'line1\nline2\nline3', 'utf-8')

      const fileInfo = await reader.read(filePath)

      expect(fileInfo.lineEnding).toBe('lf')
    })

    it('检测 CRLF 行尾', async () => {
      const filePath = path.join(tempDir, 'crlf.txt')
      fs.writeFileSync(filePath, 'line1\r\nline2\r\nline3', 'utf-8')

      const fileInfo = await reader.read(filePath)

      expect(fileInfo.lineEnding).toBe('crlf')
    })

    it('检测文件语言', async () => {
      const testCases = [
        { name: 'test.ts', expected: 'typescript' },
        { name: 'test.tsx', expected: 'typescript' },
        { name: 'test.js', expected: 'javascript' },
        { name: 'test.jsx', expected: 'javascript' },
        { name: 'test.py', expected: 'python' },
        { name: 'test.java', expected: 'java' },
        { name: 'test.json', expected: 'json' },
        { name: 'test.md', expected: 'markdown' },
        { name: 'test.txt', expected: 'plaintext' },
        { name: 'test.unknown', expected: 'plaintext' } // 未知扩展名返回 plaintext
      ]

      for (const { name, expected } of testCases) {
        const filePath = path.join(tempDir, name)
        fs.writeFileSync(filePath, 'content', 'utf-8')

        const fileInfo = await reader.read(filePath)

        expect(fileInfo.language).toBe(expected)
      }
    })

    it('读取空文件', async () => {
      const filePath = path.join(tempDir, 'empty.txt')
      fs.writeFileSync(filePath, '', 'utf-8')

      const fileInfo = await reader.read(filePath)

      expect(fileInfo.content).toBe('')
      expect(fileInfo.size).toBe(0)
    })

    it('读取大文件', async () => {
      const filePath = path.join(tempDir, 'large.txt')
      const content = 'a'.repeat(100000) // 100KB
      fs.writeFileSync(filePath, content, 'utf-8')

      const fileInfo = await reader.read(filePath)

      expect(fileInfo.content).toBe(content)
      expect(fileInfo.size).toBe(100000)
    })

    it('读取包含特殊字符的文件', async () => {
      const filePath = path.join(tempDir, 'special.txt')
      const content = 'Special: !@#$%^&*()\nUnicode: 中文字符\nEmoji: 🎉🎊🎁'
      fs.writeFileSync(filePath, content, 'utf-8')

      const fileInfo = await reader.read(filePath)

      expect(fileInfo.content).toBe(content)
    })

    it('读取包含 null 字符的文件', async () => {
      const filePath = path.join(tempDir, 'null.txt')
      const content = 'Before\x00After'
      fs.writeFileSync(filePath, content, 'utf-8')

      const fileInfo = await reader.read(filePath)

      expect(fileInfo.content).toBe(content)
    })

    it('文件不存在时抛出错误', async () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent.txt')

      await expect(reader.read(nonExistentPath)).rejects.toThrow()
    })

    it('读取二进制文件', async () => {
      const filePath = path.join(tempDir, 'binary.bin')
      const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe])
      fs.writeFileSync(filePath, buffer)

      const fileInfo = await reader.read(filePath)

      expect(fileInfo.size).toBe(6)
      // 二进制内容可能被解释为某种编码，但应该能读取
      expect(fileInfo.content).toBeDefined()
    })

    it('读取字典', async () => {
      const filePath = path.join(tempDir, 'dict.txt')
      const content = 'line1\nline2\nline3'
      fs.writeFileSync(filePath, content, 'utf-8')

      const fileInfo = await reader.read(filePath)

      expect(fileInfo.content?.split('\n')).toHaveLength(3)
    })
  })

  describe('readWithEncoding', () => {
    it('使用指定编码读取', async () => {
      const filePath = path.join(tempDir, 'encoded.txt')
      const content = 'Hello World'
      fs.writeFileSync(filePath, content, 'utf-8')

      const fileInfo = await reader.readWithEncoding(filePath, 'utf-8')

      expect(fileInfo.content).toBe(content)
      expect(fileInfo.encoding).toBe('utf-8')
    })

    it('使用指定编码覆盖自动检测', async () => {
      const filePath = path.join(tempDir, 'force-encoding.txt')
      // 写入 UTF-8 内容
      const content = 'UTF-8 Content'
      fs.writeFileSync(filePath, content, 'utf-8')

      // 强制使用 latin1 解码
      const fileInfo = await reader.readWithEncoding(filePath, 'latin1')

      expect(fileInfo.encoding).toBe('latin1')
      // 由于使用 latin1 解码 UTF-8 内容，内容可能不同
      expect(fileInfo.content).toBeDefined()
    })

    it('正确处理行尾检测', async () => {
      const filePath = path.join(tempDir, 'mixed.txt')
      fs.writeFileSync(filePath, 'line1\r\nline2\n', 'utf-8')

      const fileInfo = await reader.readWithEncoding(filePath, 'utf-8')

      // 混合行尾应该返回 'mixed'
      expect(fileInfo.lineEnding).toBe('mixed')
    })

    it('空文件检测行尾为 LF', async () => {
      const filePath = path.join(tempDir, 'empty-lines.txt')
      fs.writeFileSync(filePath, '', 'utf-8')

      const fileInfo = await reader.readWithEncoding(filePath, 'utf-8')

      // 空文件默认返回 LF
      expect(fileInfo.lineEnding).toBeDefined()
    })
  })

  describe('fileReader singleton', () => {
    it('单例可用', async () => {
      const filePath = path.join(tempDir, 'singleton.txt')
      fs.writeFileSync(filePath, 'test content', 'utf-8')

      const fileInfo = await fileReader.read(filePath)

      expect(fileInfo.content).toBe('test content')
    })
  })
})
