import * as path from 'path'
import { getLanguageFromExtension } from '@shared/constants/languages'

export function detectLanguage(filepath: string): string {
  const ext = path.extname(filepath)
  if (!ext) return 'plaintext'
  
  return getLanguageFromExtension(ext)
}

export interface LanguageDefinition {
  id: string
  extensions: string[]
  aliases?: string[]
}

export const SUPPORTED_LANGUAGES: LanguageDefinition[] = [
  { id: 'javascript', extensions: ['.js', '.jsx', '.mjs'] },
  { id: 'typescript', extensions: ['.ts', '.tsx'] },
  { id: 'json', extensions: ['.json'] },
  { id: 'yaml', extensions: ['.yml', '.yaml'] },
  { id: 'markdown', extensions: ['.md', '.markdown'] },
  { id: 'html', extensions: ['.html', '.htm'] },
  { id: 'css', extensions: ['.css'] },
  { id: 'scss', extensions: ['.scss', '.sass'] },
  { id: 'python', extensions: ['.py'] },
  { id: 'go', extensions: ['.go'] },
  { id: 'rust', extensions: ['.rs'] },
  { id: 'c', extensions: ['.c', '.h'] },
  { id: 'cpp', extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.hxx'] },
  { id: 'java', extensions: ['.java'] },
  { id: 'xml', extensions: ['.xml'] },
  { id: 'sql', extensions: ['.sql'] },
  { id: 'shell', extensions: ['.sh', '.bash'] },
]

export function findLanguageById(id: string): LanguageDefinition | undefined {
  return SUPPORTED_LANGUAGES.find(lang => 
    lang.id === id || lang.aliases?.includes(id)
  )
}
