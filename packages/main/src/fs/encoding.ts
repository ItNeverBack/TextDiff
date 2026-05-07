import chardet from 'chardet'
import iconv from 'iconv-lite'
import { DEFAULT_ENCODING } from '@shared/constants/encoding'

export function detectEncoding(buffer: Buffer): string {
  try {
    const detected = chardet.detect(buffer)
    
    if (!detected) {
      return DEFAULT_ENCODING
    }
    
    const normalized = normalizeEncodingName(detected)
    
    if (iconv.encodingExists(normalized)) {
      return normalized
    }
    
    return DEFAULT_ENCODING
  } catch {
    return DEFAULT_ENCODING
  }
}

function normalizeEncodingName(encoding: string): string {
  const lower = encoding.toLowerCase().replace(/[-_]/g, '')
  
  const mapping: Record<string, string> = {
    'utf8': 'utf-8',
    'utf16le': 'utf-16le',
    'utf16be': 'utf-16be',
    'gb2312': 'gbk',
    'gb18030': 'gb18030',
    'big5': 'big5',
    'iso88591': 'iso-8859-1',
    'latin1': 'iso-8859-1',
    'windows1252': 'windows-1252',
    'ascii': 'utf-8'
  }
  
  return mapping[lower] || encoding
}

export function decodeBuffer(buffer: Buffer, encoding: string): string {
  if (encoding.toLowerCase() === 'utf-8' || encoding.toLowerCase() === 'utf8') {
    return buffer.toString('utf-8')
  }
  
  try {
    return iconv.decode(buffer, encoding)
  } catch {
    return buffer.toString('utf-8')
  }
}

export function encodeString(content: string, encoding: string): Buffer {
  if (encoding.toLowerCase() === 'utf-8' || encoding.toLowerCase() === 'utf8') {
    return Buffer.from(content, 'utf-8')
  }
  
  try {
    return iconv.encode(content, encoding)
  } catch {
    return Buffer.from(content, 'utf-8')
  }
}
