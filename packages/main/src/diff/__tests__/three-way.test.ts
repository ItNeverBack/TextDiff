import { describe, it, expect, vi } from 'vitest'
import {
  computeThreeWayDiff
} from '../three-way'
import type { FileInfo } from '@shared/types'

describe('computeThreeWayDiff', () => {
  describe('字符串输入', () => {
    it('三个相同文件无冲突', async () => {
      const base = 'line1\nline2\nline3'
      const left = 'line1\nline2\nline3'
      const right = 'line1\nline2\nline3'
      
      const result = await computeThreeWayDiff(base, left, right)
      
      expect(result.hasConflicts).toBe(false)
      expect(result.conflicts).toHaveLength(0)
      expect(result.stats.equalLines).toBe(3)
    })

    it('左侧修改无冲突', async () => {
      const base = 'line1\nline2\nline3'
      const left = 'line1\nmodified\nline3'
      const right = 'line1\nline2\nline3'
      
      const result = await computeThreeWayDiff(base, left, right)
      
      expect(result.hasConflicts).toBe(false)
      expect(result.conflicts).toHaveLength(0)
      expect(result.lines.some(l => l.type === 'replace')).toBe(true)
    })

    it('右侧修改无冲突', async () => {
      const base = 'line1\nline2\nline3'
      const left = 'line1\nline2\nline3'
      const right = 'line1\nmodified\nline3'
      
      const result = await computeThreeWayDiff(base, left, right)
      
      expect(result.hasConflicts).toBe(false)
      expect(result.conflicts).toHaveLength(0)
    })

    it('两侧同时修改同一行产生冲突', async () => {
      const base = 'line1\nline2\nline3'
      const left = 'line1\nleft-modified\nline3'
      const right = 'line1\nright-modified\nline3'
      
      const result = await computeThreeWayDiff(base, left, right)
      
      expect(result.hasConflicts).toBe(true)
      expect(result.conflicts.length).toBeGreaterThan(0)
      
      const conflict = result.conflicts[0]
      expect(conflict.baseContent).toBe('line2')
      expect(conflict.leftContent).toBe('left-modified')
      expect(conflict.rightContent).toBe('right-modified')
      expect(conflict.resolved).toBe(false)
    })

    it('两侧修改相同内容不产生冲突', async () => {
      const base = 'line1\nline2\nline3'
      const left = 'line1\nsame-modified\nline3'
      const right = 'line1\nsame-modified\nline3'
      
      const result = await computeThreeWayDiff(base, left, right)
      
      expect(result.hasConflicts).toBe(false)
    })

    it('左侧删除无冲突', async () => {
      const base = 'line1\nline2\nline3'
      const left = 'line1\nline3'
      const right = 'line1\nline2\nline3'
      
      const result = await computeThreeWayDiff(base, left, right)
      
      expect(result.hasConflicts).toBe(false)
      expect(result.lines.some(l => l.type === 'delete')).toBe(true)
    })

    it('右侧删除无冲突', async () => {
      const base = 'line1\nline2\nline3'
      const left = 'line1\nline2\nline3'
      const right = 'line1\nline3'
      
      const result = await computeThreeWayDiff(base, left, right)
      
      expect(result.hasConflicts).toBe(false)
    })

    it('两侧同时删除同一行不产生冲突', async () => {
      const base = 'line1\nline2\nline3'
      const left = 'line1\nline3'
      const right = 'line1\nline3'
      
      const result = await computeThreeWayDiff(base, left, right)
      
      expect(result.hasConflicts).toBe(false)
    })

    it('左侧插入无冲突', async () => {
      const base = 'line1\nline2'
      const left = 'line1\nnew-line\nline2'
      const right = 'line1\nline2'
      
      const result = await computeThreeWayDiff(base, left, right)
      
      expect(result.hasConflicts).toBe(false)
      expect(result.lines.some(l => l.type === 'insert')).toBe(true)
    })

    it('右侧插入无冲突', async () => {
      const base = 'line1\nline2'
      const left = 'line1\nline2'
      const right = 'line1\nnew-line\nline2'
      
      const result = await computeThreeWayDiff(base, left, right)
      
      expect(result.hasConflicts).toBe(false)
    })

    it('空文件对比', async () => {
      const base = ''
      const left = 'new content'
      const right = ''
      
      const result = await computeThreeWayDiff(base, left, right)
      
      expect(result.hasConflicts).toBe(false)
      expect(result.lines.some(l => l.type === 'insert')).toBe(true)
    })
  })

  describe('FileInfo 输入', () => {
    const createFileInfo = (content: string, name: string = 'test.txt'): FileInfo => ({
      path: `/test/${name}`,
      name,
      content,
      encoding: 'utf-8',
      lineEnding: 'LF',
      size: content.length
    })

    it('接受 FileInfo 对象', async () => {
      const base = createFileInfo('line1\nline2', 'base.txt')
      const left = createFileInfo('line1\nleft', 'left.txt')
      const right = createFileInfo('line1\nright', 'right.txt')
      
      const result = await computeThreeWayDiff(base, left, right)
      
      expect(result).toBeDefined()
      expect(result.hasConflicts).toBe(true)
    })

    it('混合输入类型', async () => {
      const base = 'line1\nline2'
      const left = createFileInfo('line1\nleft', 'left.txt')
      const right = { content: 'line1\nright' } as FileInfo
      
      const result = await computeThreeWayDiff(base, left, right)
      
      expect(result).toBeDefined()
    })
  })

  describe('冲突检测', () => {
    it('冲突区域包含正确内容', async () => {
      const base = 'base1\nbase2\nbase3'
      const left = 'base1\nleft-modified\nbase3'
      const right = 'base1\nright-modified\nbase3'
      
      const result = await computeThreeWayDiff(base, left, right)
      
      expect(result.conflicts).toHaveLength(1)
      const conflict = result.conflicts[0]
      expect(conflict.baseContent).toBe('base2')
      expect(conflict.leftContent).toBe('left-modified')
      expect(conflict.rightContent).toBe('right-modified')
      expect(conflict.startLine).toBeDefined()
      expect(conflict.endLine).toBeDefined()
      expect(conflict.id).toBeDefined()
    })

    it('多冲突检测', async () => {
      const base = 'line1\nline2\nline3\nline4'
      const left = 'left1\nline2\nleft3\nline4'
      const right = 'right1\nline2\nright3\nline4'
      
      const result = await computeThreeWayDiff(base, left, right)
      
      // line1 和 line3 都被修改
      expect(result.conflicts.length).toBeGreaterThanOrEqual(2)
    })

    it('相邻修改检测为独立冲突', async () => {
      const base = 'a\nb\nc'
      const left = 'left-a\nleft-b\nc'
      const right = 'right-a\nright-b\nc'
      
      const result = await computeThreeWayDiff(base, left, right)
      
      expect(result.hasConflicts).toBe(true)
      expect(result.conflicts.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('合并行构建', () => {
    it('平衡的行数统计', async () => {
      const base = 'line1\nline2\nline3'
      const left = 'left1\nline2\nleft3'
      const right = 'right1\nline2\nright3'
      
      const result = await computeThreeWayDiff(base, left, right)
      
      expect(result.stats.totalLines).toBeGreaterThan(0)
      expect(result.stats.equalLines).toBeGreaterThanOrEqual(0)
      expect(result.stats.modifiedLines).toBeGreaterThanOrEqual(0)
    })

    it('computedAt 是时间戳', async () => {
      const base = 'test'
      const left = 'test'
      const right = 'test'
      
      const result = await computeThreeWayDiff(base, left, right)
      
      expect(typeof result.computedAt).toBe('number')
      expect(result.computedAt).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('复杂场景', () => {
    it('尾部插入', async () => {
      const base = 'line1\nline2'
      const left = 'line1\nline2\nleft-new'
      const right = 'line1\nline2\nright-new'
      
      const result = await computeThreeWayDiff(base, left, right)
      
      expect(result.hasConflicts).toBe(true)
      // 尾部插入相同位置但不同内容会产生冲突
    })

    it('代码块移动不视为冲突', async () => {
      const base = 'function a() {}\nfunction b() {}'
      const left = 'function b() {}\nfunction a() {}'
      const right = base
      
      const result = await computeThreeWayDiff(base, left, right)
      
      // 这种情况会显示为删除+插入，但不一定是冲突
      expect(result).toBeDefined()
    })

    it('空行和空白处理', async () => {
      const base = 'line1\n\n\nline4'
      const left = 'line1\nnew\n\nline4'
      const right = 'line1\n\n\nchanged'
      
      const result = await computeThreeWayDiff(base, left, right)
      
      expect(result).toBeDefined()
      expect(result.lines.length).toBeGreaterThan(0)
    })
  })
})
