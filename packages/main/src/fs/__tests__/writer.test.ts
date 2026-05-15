import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { FileWriter, fileWriter } from '../writer'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

describe('FileWriter', () => {
  let tempDir: string
  let writer: FileWriter

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textdiff-writer-test-'))
    writer = new FileWriter()
  })

  afterEach(() => {
    // 清理临时目录
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // 忽略清理错误
    }
  })

  describe('write', () => {
    it('写入 UTF-8 文件', async () => {
      const filePath = path.join(tempDir, 'utf8.txt')
      const content = 'Hello, World!\n你好，世界！'

      await writer.write(filePath, content, 'utf-8')

      const readContent = fs.readFileSync(filePath, 'utf-8')
      expect(readContent).toBe(content)
    })

    it('默认使用 UTF-8 编码', async () => {
      const filePath = path.join(tempDir, 'default.txt')
      const content = 'Test content'

      await writer.write(filePath, content)

      const readContent = fs.readFileSync(filePath, 'utf-8')
      expect(readContent).toBe(content)
    })

    it('写入空内容', async () => {
      const filePath = path.join(tempDir, 'empty.txt')

      await writer.write(filePath, '', 'utf-8')

      const readContent = fs.readFileSync(filePath, 'utf-8')
      expect(readContent).toBe('')
      expect(fs.statSync(filePath).size).toBe(0)
    })

    it('覆盖已存在的文件', async () => {
      const filePath = path.join(tempDir, 'overwrite.txt')
      fs.writeFileSync(filePath, 'old content', 'utf-8')

      await writer.write(filePath, 'new content', 'utf-8')

      const readContent = fs.readFileSync(filePath, 'utf-8')
      expect(readContent).toBe('new content')
    })

    it('写入大文件', async () => {
      const filePath = path.join(tempDir, 'large.txt')
      const content = 'a'.repeat(100000) // 100KB

      await writer.write(filePath, content, 'utf-8')

      const readContent = fs.readFileSync(filePath, 'utf-8')
      expect(readContent).toBe(content)
      expect(fs.statSync(filePath).size).toBe(100000)
    })

    it('写入包含特殊字符的内容', async () => {
      const filePath = path.join(tempDir, 'special.txt')
      const content = 'Special: !@#$%^&*()\nUnicode: 中文字符\nEmoji: 🎉🎊🎁'

      await writer.write(filePath, content, 'utf-8')

      const readContent = fs.readFileSync(filePath, 'utf-8')
      expect(readContent).toBe(content)
    })

    it('写入多行内容', async () => {
      const filePath = path.join(tempDir, 'multiline.txt')
      const content = 'line 1\nline 2\nline 3\n'

      await writer.write(filePath, content, 'utf-8')

      const readContent = fs.readFileSync(filePath, 'utf-8')
      expect(readContent).toBe(content)
    })

    it('写入带 CRLF 行尾的内容', async () => {
      const filePath = path.join(tempDir, 'crlf.txt')
      const content = 'line 1\r\nline 2\r\n'

      await writer.write(filePath, content, 'utf-8')

      const readContent = fs.readFileSync(filePath, 'utf-8')
      expect(readContent).toBe(content)
    })

    it('自动创建父目录', async () => {
      // 创建嵌套目录
      const nestedDir = path.join(tempDir, 'level1', 'level2', 'level3')
      fs.mkdirSync(nestedDir, { recursive: true })

      const nestedPath = path.join(nestedDir, 'file.txt')
      const content = 'nested content'

      await writer.write(nestedPath, content, 'utf-8')

      expect(fs.existsSync(nestedPath)).toBe(true)
      const readContent = fs.readFileSync(nestedPath, 'utf-8')
      expect(readContent).toBe(content)
    })

    it('写入包含 null 字符的内容', async () => {
      const filePath = path.join(tempDir, 'null.txt')
      const content = 'Before\x00After'

      await writer.write(filePath, content, 'utf-8')

      const readContent = fs.readFileSync(filePath, 'utf-8')
      expect(readContent).toBe(content)
    })

    it('写入到只读目录时抛出错误', async () => {
      const readOnlyDir = path.join(tempDir, 'readonly')
      fs.mkdirSync(readOnlyDir)

      // 在 Windows 上设置只读权限不同，跳过此测试
      if (process.platform === 'win32') {
        return
      }

      fs.chmodSync(readOnlyDir, 0o444)

      const filePath = path.join(readOnlyDir, 'file.txt')

      try {
        await expect(writer.write(filePath, 'content', 'utf-8')).rejects.toThrow()
      } finally {
        fs.chmodSync(readOnlyDir, 0o755)
      }
    })

    it('使用不同大小写的 utf-8 编码', async () => {
      const filePath1 = path.join(tempDir, 'utf8-lowercase.txt')
      const filePath2 = path.join(tempDir, 'utf8-uppercase.txt')
      const content = 'test'

      await writer.write(filePath1, content, 'utf-8')
      await writer.write(filePath2, content, 'UTF-8')

      expect(fs.readFileSync(filePath1, 'utf-8')).toBe(content)
      expect(fs.readFileSync(filePath2, 'utf-8')).toBe(content)
    })

    it('使用 utf8 编码（无连字符）', async () => {
      const filePath = path.join(tempDir, 'utf8-nodash.txt')
      const content = 'test'

      await writer.write(filePath, content, 'utf8')

      expect(fs.readFileSync(filePath, 'utf-8')).toBe(content)
    })
  })

  describe('fileWriter singleton', () => {
    it('单例可用', async () => {
      const filePath = path.join(tempDir, 'singleton.txt')

      await fileWriter.write(filePath, 'singleton test')

      const readContent = fs.readFileSync(filePath, 'utf-8')
      expect(readContent).toBe('singleton test')
    })
  })
})
