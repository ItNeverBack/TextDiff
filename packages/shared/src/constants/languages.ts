export const LANGUAGE_MAP: Record<string, string> = {
  'js': 'javascript',
  'ts': 'typescript',
  'tsx': 'typescript',
  'jsx': 'javascript',
  'json': 'json',
  'yml': 'yaml',
  'yaml': 'yaml',
  'md': 'markdown',
  'html': 'html',
  'css': 'css',
  'scss': 'scss',
  'less': 'less',
  'py': 'python',
  'go': 'go',
  'rs': 'rust',
  'c': 'c',
  'cpp': 'cpp',
  'h': 'c',
  'hpp': 'cpp',
  'java': 'java',
  'xml': 'xml',
  'sql': 'sql',
  'sh': 'shell',
  'bash': 'shell',
  'vue': 'vue',
  'svelte': 'svelte',
  'dockerfile': 'dockerfile',
  'makefile': 'makefile',
  'toml': 'toml',
  'ini': 'ini',
  'env': 'dotenv'
} as const

export function getLanguageFromExtension(ext: string): string {
  const normalized = ext.toLowerCase().replace(/^\./, '')
  return LANGUAGE_MAP[normalized] || 'plaintext'
}

export function getLanguageFromFilepath(filepath: string): string {
  const ext = filepath.split('.').pop()
  return ext ? getLanguageFromExtension(ext) : 'plaintext'
}
