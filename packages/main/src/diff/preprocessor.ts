export interface PreprocessOptions {
  ignoreWhitespace?: 'none' | 'leading-trailing' | 'all'
  ignoreCase?: boolean
  ignoreLineEndings?: boolean
}

export interface PreprocessResult {
  original: string[]
  processed: string[]
}

export function preprocessLines(
  lines: string[],
  options: PreprocessOptions
): PreprocessResult {
  const {
    ignoreWhitespace = 'none',
    ignoreCase = false,
    ignoreLineEndings = true
  } = options

  const processed = lines.map(line => {
    let result = line

    if (ignoreLineEndings) {
      result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    }

    switch (ignoreWhitespace) {
      case 'leading-trailing':
        result = result.trim()
        break
      case 'all':
        result = result.replace(/\s+/g, '')
        break
    }

    if (ignoreCase) {
      result = result.toLowerCase()
    }

    return result
  })

  return {
    original: lines,
    processed
  }
}
