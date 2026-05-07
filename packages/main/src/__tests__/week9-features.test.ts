import { describe, it, expect } from 'vitest'
import { computeThreeWayDiff } from '../diff/three-way'

describe('Week 9 — 三路合并功能', () => {
  describe('computeThreeWayDiff — 无冲突场景', () => {
    it('三方完全相同时无冲突，全部为 equal 行', async () => {
      const content = 'line1\nline2\nline3'
      const result = await computeThreeWayDiff(content, content, content)
      expect(result.hasConflicts).toBe(false)
      expect(result.conflicts).toHaveLength(0)
      expect(result.lines.every(l => l.type === 'equal')).toBe(true)
    })

    it('只有左侧修改时自动合并，无冲突', async () => {
      const base = 'line1\nline2\nline3'
      const left = 'line1\nLINE2_MODIFIED\nline3'
      const right = 'line1\nline2\nline3'
      const result = await computeThreeWayDiff(base, left, right)
      expect(result.hasConflicts).toBe(false)
      expect(result.conflicts).toHaveLength(0)
      // 修改行应为 replace，内容为左侧修改后的值
      const replaceLine = result.lines.find(l => l.type === 'replace')
      expect(replaceLine).toBeDefined()
      expect(replaceLine!.rightContent).toBe('LINE2_MODIFIED')
    })

    it('只有右侧修改时自动合并，无冲突', async () => {
      const base = 'line1\nline2\nline3'
      const left = 'line1\nline2\nline3'
      const right = 'line1\nLINE2_RIGHT\nline3'
      const result = await computeThreeWayDiff(base, left, right)
      expect(result.hasConflicts).toBe(false)
      expect(result.conflicts).toHaveLength(0)
      const replaceLine = result.lines.find(l => l.type === 'replace')
      expect(replaceLine).toBeDefined()
      expect(replaceLine!.rightContent).toBe('LINE2_RIGHT')
    })

    it('两侧修改相同内容时自动合并，无冲突', async () => {
      const base = 'line1\nline2\nline3'
      const left = 'line1\nSAME_CHANGE\nline3'
      const right = 'line1\nSAME_CHANGE\nline3'
      const result = await computeThreeWayDiff(base, left, right)
      expect(result.hasConflicts).toBe(false)
      expect(result.conflicts).toHaveLength(0)
    })
  })

  describe('computeThreeWayDiff — 冲突场景', () => {
    it('两侧修改同一行且内容不同时产生冲突', async () => {
      const base = 'line1\nline2\nline3'
      const left = 'line1\nLEFT_CHANGE\nline3'
      const right = 'line1\nRIGHT_CHANGE\nline3'
      const result = await computeThreeWayDiff(base, left, right)
      expect(result.hasConflicts).toBe(true)
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0].leftContent).toBe('LEFT_CHANGE')
      expect(result.conflicts[0].rightContent).toBe('RIGHT_CHANGE')
      expect(result.conflicts[0].baseContent).toBe('line2')
    })

    it('冲突区域包含正确的 id 和 resolved=false', async () => {
      const base = 'a\nb'
      const left = 'a\nLEFT'
      const right = 'a\nRIGHT'
      const result = await computeThreeWayDiff(base, left, right)
      const conflict = result.conflicts[0]
      expect(conflict.id).toBeTruthy()
      expect(conflict.resolved).toBe(false)
    })
  })

  describe('computeThreeWayDiff — stats', () => {
    it('stats.chunkCount 等于冲突数量', async () => {
      const base = 'a\nb\nc'
      const left = 'X\nb\nY'
      const right = 'Z\nb\nW'
      const result = await computeThreeWayDiff(base, left, right)
      expect(result.stats.chunkCount).toBe(result.conflicts.length)
    })

    it('空内容三方合并不报错', async () => {
      const result = await computeThreeWayDiff('', '', '')
      expect(result).toBeDefined()
      expect(result.hasConflicts).toBe(false)
    })
  })
})
