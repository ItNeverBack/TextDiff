import * as fs from 'fs'
import type { FileInfo, LineEnding } from '@shared/types'
import { detectEncoding, decodeBuffer } from './encoding'
import { getLanguageFromFilepath } from '@shared/constants/languages'

export { detectEncoding, getLanguageFromFilepath }

export async function readFile(filepath: string): Promise<FileInfo> {
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

export async function writeFile(filepath: string, content: string): Promise<void> {
  await fs.promises.writeFile(filepath, content, 'utf-8')
}

export function detectLineEnding(content: string): LineEnding {
  const crlf = (content.match(/\r\n/g) || []).length
  const lf = (content.match(/(?<!\r)\n/g) || []).length

  // 如果没有发现任何换行符，默认为 lf
  if (crlf === 0 && lf === 0) return 'lf'
  // 如果只有 LF，返回 lf
  if (crlf === 0) return 'lf'
  // 如果只有 CRLF，返回 crlf
  if (lf === 0) return 'crlf'
  // 如果同时存在 CRLF 和单独的 LF，返回 mixed
  return 'mixed'
}

export function normalizeLineEndings(content: string, target: 'lf' | 'crlf' = 'lf'): string {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  
  if (target === 'crlf') {
    return normalized.replace(/\n/g, '\r\n')
  }
  
  return normalized
}

export async function fileExists(filepath: string): Promise<boolean> {
  try {
    await fs.promises.access(filepath, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

export async function getFileSize(filepath: string): Promise<number> {
  const stats = await fs.promises.stat(filepath)
  return stats.size
}
