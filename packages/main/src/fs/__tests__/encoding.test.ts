import { describe, it, expect, vi } from 'vitest'
import {
  detectEncoding,
  decodeBuffer,
  encodeString
} from '../encoding'

// Mock chardet and iconv-lite
vi.mock('chardet', () => ({
  default: {
    detect: vi.fn()
  }
}))

vi.mock('iconv-lite', () => ({
  encodingExists: vi.fn().mockReturnValue(true),
  decode: vi.fn((buffer, encoding) => {
    // 简单模拟解码
    if (encoding === 'gbk') return buffer.toString('utf-8')
    return buffer.toString('utf-8')
  }),
  encode: vi.fn((content, encoding) => {
    // 简单模拟编码
    return Buffer.from(content)
  })
}))

describe('detectEncoding', () => {
  it('UTF-8 BOM 识别为 UTF-8', () => {
    const chardet = vi.mocked(await import('chardet')).default
    chardet.detect.mockReturnValue('UTF-8')

    const buffer = Buffer.from([0xEF, 0xBB, 0xBF, 0x48, 0x65, 0x6C, 0x6C, 0x6F])
    const encoding = detectEncoding(buffer)

    expect(encoding).toBe('utf-8')
  })

  it('UTF-16 LE 正确识别', () => {
    const chardet = vi.mocked(await import('chardet')).default
    chardet.detect.mockReturnValue('UTF-16LE')

    const buffer = Buffer.from('Hello', 'utf-16le')
    const encoding = detectEncoding(buffer)

    expect(encoding).toBe('utf-16le')
  })

  it('UTF-16 BE 正确识别', () => {
    const chardet = vi.mocked(await import('chardet')).default
    chardet.detect.mockReturnValue('UTF-16BE')

    const buffer = Buffer.from('Hello', 'utf-16be')
    const encoding = detectEncoding(buffer)

    expect(encoding).toBe('utf-16be')
  })

  it('GBK 文件正确识别', () => {
    const chardet = vi.mocked(await import('chardet')).default
    chardet.detect.mockReturnValue('GB2312')

    const buffer = Buffer.from([0xC4, 0xE3, 0xBA, 0xC3]) // "你好" in GBK
    const encoding = detectEncoding(buffer)

    expect(encoding).toBe('gbk')
  })

  it('纯 ASCII 默认为 UTF-8', () => {
    const chardet = vi.mocked(await import('chardet')).default
    chardet.detect.mockReturnValue('ASCII')

    const buffer = Buffer.from('Hello World')
    const encoding = detectEncoding(buffer)

    expect(encoding).toBe('utf-8')
  })

  it('空文件默认为 UTF-8', () => {
    const chardet = vi.mocked(await import('chardet')).default
    chardet.detect.mockReturnValue(null)

    const buffer = Buffer.from([])
    const encoding = detectEncoding(buffer)

    expect(encoding).toBe('utf-8')
  })

  it('检测失败返回默认编码', () => {
    const chardet = vi.mocked(await import('chardet')).default
    chardet.detect.mockImplementation(() => {
      throw new Error('Detection failed')
    })

    const buffer = Buffer.from('test')
    const encoding = detectEncoding(buffer)

    expect(encoding).toBe('utf-8')
  })

  it('不支持的编码返回 UTF-8', () => {
    const chardet = vi.mocked(await import('chardet')).default
    const iconv = await import('iconv-lite')

    chardet.detect.mockReturnValue('Unknown-Encoding')
    vi.mocked(iconv.encodingExists).mockReturnValue(false)

    const buffer = Buffer.from('test')
    const encoding = detectEncoding(buffer)

    expect(encoding).toBe('utf-8')
  })

  it('规范化编码名称', () => {
    const chardet = vi.mocked(await import('chardet')).default

    const testCases = [
      { input: 'UTF8', expected: 'utf-8' },
      { input: 'utf8', expected: 'utf-8' },
      { input: 'UTF-16LE', expected: 'utf-16le' },
      { input: 'UTF-16BE', expected: 'utf-16be' },
      { input: 'GB2312', expected: 'gbk' },
      { input: 'GB18030', expected: 'gb18030' },
      { input: 'BIG5', expected: 'big5' },
      { input: 'ISO-8859-1', expected: 'iso-8859-1' },
      { input: 'LATIN1', expected: 'iso-8859-1' },
      { input: 'WINDOWS-1252', expected: 'windows-1252' },
      { input: 'ASCII', expected: 'utf-8' }
    ]

    for (const { input, expected } of testCases) {
      chardet.detect.mockReturnValue(input)
      const iconv = await import('iconv-lite')
      vi.mocked(iconv.encodingExists).mockReturnValue(true)

      const buffer = Buffer.from('test')
      const encoding = detectEncoding(buffer)

      expect(encoding).toBe(expected)
    }
  })
})

describe('decodeBuffer', () => {
  it('UTF-8 解码', () => {
    const buffer = Buffer.from('Hello World', 'utf-8')
    const result = decodeBuffer(buffer, 'utf-8')

    expect(result).toBe('Hello World')
  })

  it('UTF-8 大小写不敏感', () => {
    const buffer = Buffer.from('Hello', 'utf-8')

    expect(decodeBuffer(buffer, 'UTF-8')).toBe('Hello')
    expect(decodeBuffer(buffer, 'utf8')).toBe('Hello')
    expect(decodeBuffer(buffer, 'UTF8')).toBe('Hello')
  })

  it('GBK 解码', async () => {
    const iconv = await import('iconv-lite')
    vi.mocked(iconv.decode).mockReturnValue('你好')

    const buffer = Buffer.from([0xC4, 0xE3, 0xBA, 0xC3])
    const result = decodeBuffer(buffer, 'gbk')

    expect(result).toBe('你好')
  })

  it('UTF-16 解码', async () => {
    const iconv = await import('iconv-lite')
    vi.mocked(iconv.decode).mockReturnValue('Hello')

    const buffer = Buffer.from('Hello', 'utf-16le')
    const result = decodeBuffer(buffer, 'utf-16le')

    expect(result).toBe('Hello')
  })

  it('解码失败回退到 UTF-8', async () => {
    const iconv = await import('iconv-lite')
    vi.mocked(iconv.decode).mockImplementation(() => {
      throw new Error('Decode failed')
    })

    const buffer = Buffer.from('Hello', 'utf-8')
    const result = decodeBuffer(buffer, 'invalid-encoding')

    expect(result).toBe('Hello')
  })
})

describe('encodeString', () => {
  it('UTF-8 编码', () => {
    const content = 'Hello World'
    const result = encodeString(content, 'utf-8')

    expect(result).toBeInstanceOf(Buffer)
    expect(result.toString('utf-8')).toBe(content)
  })

  it('UTF-8 大小写不敏感', () => {
    const content = 'Hello'

    const result1 = encodeString(content, 'UTF-8')
    const result2 = encodeString(content, 'utf8')
    const result3 = encodeString(content, 'UTF8')

    expect(result1.toString()).toBe(content)
    expect(result2.toString()).toBe(content)
    expect(result3.toString()).toBe(content)
  })

  it('GBK 编码', async () => {
    const iconv = await import('iconv-lite')
    const mockBuffer = Buffer.from([0xC4, 0xE3, 0xBA, 0xC3])
    vi.mocked(iconv.encode).mockReturnValue(mockBuffer)

    const content = '你好'
    const result = encodeString(content, 'gbk')

    expect(result).toEqual(mockBuffer)
  })

  it('编码失败回退到 UTF-8', async () => {
    const iconv = await import('iconv-lite')
    vi.mocked(iconv.encode).mockImplementation(() => {
      throw new Error('Encode failed')
    })

    const content = 'Hello'
    const result = encodeString(content, 'invalid-encoding')

    expect(result).toBeInstanceOf(Buffer)
    expect(result.toString('utf-8')).toBe(content)
  })
})
