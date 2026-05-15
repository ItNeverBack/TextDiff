import { describe, it, expect } from 'vitest'
import { escapeHtml, unescapeHtml } from '../../utils/escape'

describe('escapeHtml', () => {
  it('转义 < 为 &lt;', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;')
  })

  it('转义 > 为 &gt;', () => {
    expect(escapeHtml('test>')).toBe('test&gt;')
  })

  it('转义 & 为 &amp;', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B')
  })

  it('转义 " 为 &quot;', () => {
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;')
  })

  it('转义 \' 为 &#39;', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s')
  })

  it('同时转义多个特殊字符', () => {
    const input = '<script>alert("XSS")</script>'
    const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
    expect(escapeHtml(input)).toBe(expected)
  })

  it('不修改普通文本', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123')
  })

  it('空字符串返回空字符串', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('处理包含换行的文本', () => {
    expect(escapeHtml('line1<br>\nline2')).toBe('line1&lt;br&gt;\nline2')
  })

  it('处理中文和特殊字符', () => {
    expect(escapeHtml('中文<测试>')).toBe('中文&lt;测试&gt;')
  })
})

describe('unescapeHtml', () => {
  it('反转义 &lt; 为 <', () => {
    expect(unescapeHtml('&lt;div>')).toBe('<div>')
  })

  it('反转义 &gt; 为 >', () => {
    expect(unescapeHtml('test&gt;')).toBe('test>')
  })

  it('反转义 &amp; 为 &', () => {
    expect(unescapeHtml('A &amp; B')).toBe('A & B')
  })

  it('反转义 &quot; 为 "', () => {
    expect(unescapeHtml('&quot;quoted&quot;')).toBe('"quoted"')
  })

  it('反转义 &#39; 为 \'', () => {
    expect(unescapeHtml('it&#39;s')).toBe("it's")
  })

  it('同时反转义多个实体', () => {
    const input = '&lt;div class=&quot;test&quot;>A &amp; B&lt;/div&gt;'
    const expected = '<div class="test">A & B</div>'
    expect(unescapeHtml(input)).toBe(expected)
  })

  it('不修改普通文本', () => {
    expect(unescapeHtml('Hello World 123')).toBe('Hello World 123')
  })

  it('空字符串返回空字符串', () => {
    expect(unescapeHtml('')).toBe('')
  })

  it('未知实体保持不变', () => {
    expect(unescapeHtml('&unknown;')).toBe('&unknown;')
  })
})

describe('escape/unescape 双向转换', () => {
  it('先 escape 后 unescape 恢复原始内容', () => {
    const original = '<div class="test">A & B\'s</div>'
    const escaped = escapeHtml(original)
    const unescaped = unescapeHtml(escaped)
    expect(unescaped).toBe(original)
  })

  it('处理复杂嵌套内容', () => {
    const original = '<script>\n  var x = "value" & \'test\';\n</script>'
    const escaped = escapeHtml(original)
    const unescaped = unescapeHtml(escaped)
    expect(unescaped).toBe(original)
  })
})
