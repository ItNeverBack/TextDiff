import * as fs from 'fs'
import type { FileInfo } from '@shared/types'
import { detectEncoding, decodeBuffer } from './encoding'
import { detectLineEnding } from './index'
import { getLanguageFromFilepath } from '@shared/constants/languages'

/**
 * §2.2.3 FileReader 接口实现
 */
export class FileReader {
  async read(filepath: string): Promise<FileInfo> {
    const stats = await fs.promises.stat(filepath)
    const buffer = await fs.promises.readFile(filepath)

    const encoding = detectEncoding(buffer)
    const content = decodeBuffer(buffer, encoding)
    const lineEnding = detectLineEnding(content)
    const language = getLanguageFromFilepath(filepath)

    return {
      path: filepath,
      content,
      encoding,
      lineEnding,
      size: stats.size,
      mtime: stats.mtimeMs,
      language
    }
  }

  async readWithEncoding(filepath: string, encoding: string): Promise<FileInfo> {
    const stats = await fs.promises.stat(filepath)
    const buffer = await fs.promises.readFile(filepath)

    const content = decodeBuffer(buffer, encoding)
    const lineEnding = detectLineEnding(content)
    const language = getLanguageFromFilepath(filepath)

    return {
      path: filepath,
      content,
      encoding,
      lineEnding,
      size: stats.size,
      mtime: stats.mtimeMs,
      language
    }
  }
}

export const fileReader = new FileReader()
