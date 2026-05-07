import * as fs from 'fs'
import { encodeString } from './encoding'

/**
 * §2.2.3 FileWriter 接口实现
 */
export class FileWriter {
  async write(filepath: string, content: string, encoding = 'utf-8'): Promise<void> {
    if (encoding.toLowerCase() === 'utf-8' || encoding.toLowerCase() === 'utf8') {
      await fs.promises.writeFile(filepath, content, 'utf-8')
    } else {
      const buffer = encodeString(content, encoding)
      await fs.promises.writeFile(filepath, buffer)
    }
  }
}

export const fileWriter = new FileWriter()
