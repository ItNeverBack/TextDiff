const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, char => HTML_ESCAPE_MAP[char])
}

export function unescapeHtml(html: string): string {
  const HTML_UNESCAPE_MAP: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'"
  }
  
  return html.replace(/&(?:amp|lt|gt|quot|#39);/g, entity => HTML_UNESCAPE_MAP[entity] || entity)
}
