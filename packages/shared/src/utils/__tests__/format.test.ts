import { describe, it, expect } from 'vitest'
import { formatBytes, formatTime, formatDuration, formatNumber } from '../../utils/format'

describe('formatBytes', () => {
  it('0 bytes 显示 "0 B"', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('1024 bytes 显示 "1 KB"', () => {
    expect(formatBytes(1024)).toBe('1 KB')
  })

  it('小于 1024 bytes 显示 B', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1023)).toBe('1023 B')
  })

  it('1048576 bytes (1 MB) 显示 "1 MB"', () => {
    expect(formatBytes(1024 * 1024)).toBe('1 MB')
  })

  it('1073741824 bytes (1 GB) 显示 "1 GB"', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB')
  })

  it('保留一位小数', () => {
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(2560)).toBe('2.5 KB')
  })

  it('处理大数值', () => {
    expect(formatBytes(1024 * 1024 * 1024 * 5)).toBe('5 GB')
  })
})

describe('formatTime', () => {
  it('刚刚', () => {
    const now = Date.now()
    expect(formatTime(now)).toBe('刚刚')
  })

  it('几分钟前', () => {
    const minutesAgo = Date.now() - 5 * 60 * 1000
    expect(formatTime(minutesAgo)).toBe('5分钟前')
  })

  it('几小时前', () => {
    const hoursAgo = Date.now() - 3 * 60 * 60 * 1000
    expect(formatTime(hoursAgo)).toBe('3小时前')
  })

  it('几天前', () => {
    const daysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000
    expect(formatTime(daysAgo)).toBe('2天前')
  })

  it('超过一周显示日期', () => {
    const weeksAgo = Date.now() - 10 * 24 * 60 * 60 * 1000
    const result = formatTime(weeksAgo)
    // 应该返回日期字符串，格式可能因地区而异
    expect(result).not.toBe('刚刚')
    expect(result).not.toContain('分钟前')
    expect(result).not.toContain('小时前')
    expect(result).not.toContain('天前')
  })
})

describe('formatDuration', () => {
  it('小于 1000ms 显示毫秒', () => {
    expect(formatDuration(500)).toBe('500ms')
    expect(formatDuration(0)).toBe('0ms')
    expect(formatDuration(999)).toBe('999ms')
  })

  it('1000ms 显示 "1.00s"', () => {
    expect(formatDuration(1000)).toBe('1.00s')
  })

  it('保留两位小数', () => {
    expect(formatDuration(1500)).toBe('1.50s')
    expect(formatDuration(1234)).toBe('1.23s')
    expect(formatDuration(1050)).toBe('1.05s')
  })

  it('大数值显示秒', () => {
    expect(formatDuration(60000)).toBe('60.00s')
  })
})

describe('formatNumber', () => {
  it('整数添加千分位', () => {
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(1234567)).toBe('1,234,567')
  })

  it('小数保留原样', () => {
    expect(formatNumber(1234.56)).toBe('1,234.56')
  })

  it('负数正确格式化', () => {
    expect(formatNumber(-1000)).toBe('-1,000')
  })

  it('零显示为 0', () => {
    expect(formatNumber(0)).toBe('0')
  })

  it('处理大数', () => {
    expect(formatNumber(1234567890)).toBe('1,234,567,890')
  })
})
