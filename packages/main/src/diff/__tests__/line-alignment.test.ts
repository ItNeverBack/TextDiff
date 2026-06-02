import { describe, it, expect } from 'vitest'
import { myersDiff } from '../myers'
import { computeDiff } from '../index'

describe('行对齐问题', () => {
  describe('重复内容导致的对齐偏移', () => {
    it('当删除末尾重复内容时，应正确对齐到末尾', async () => {
      // 场景：原始文本有6行，其中行2=行5，行3=行6
      // 删除行4、5、6后，应显示删除的是第4、5、6行，而不是第2、3、4行
      const left = ['A', 'B', 'C', 'D', 'B', 'C']  // 行1-6
      const right = ['A', 'B', 'C']                 // 删除行4、5、6后剩行1、2、3

      const result = myersDiff(left, right)

      // 打印结果以便调试
      console.log('Raw diff result:')
      result.forEach((op, i) => {
        console.log(`  ${i}: type=${op.type}, leftIndex=${op.leftIndex}, rightIndex=${op.rightIndex}`)
      })

      // 期望结果：
      // - A=A (equal, left=0, right=0)
      // - B=B (equal, left=1, right=1)
      // - C=C (equal, left=2, right=2)
      // - D deleted (left=3)
      // - B deleted (left=4)
      // - C deleted (left=5)

      // 验证结果
      const equalOps = result.filter(op => op.type === 'equal')
      const deleteOps = result.filter(op => op.type === 'delete')

      expect(equalOps).toHaveLength(3)
      expect(deleteOps).toHaveLength(3)

      // 验证equal的行是前3行
      expect(equalOps[0].leftIndex).toBe(0) // A
      expect(equalOps[1].leftIndex).toBe(1) // B
      expect(equalOps[2].leftIndex).toBe(2) // C

      // 验证删除的是后3行
      expect(deleteOps[0].leftIndex).toBe(3) // D
      expect(deleteOps[1].leftIndex).toBe(4) // B
      expect(deleteOps[2].leftIndex).toBe(5) // C
    })

    it('computeDiff应正确处理重复内容的行对齐', async () => {
      const leftText = 'A\nB\nC\nD\nB\nC'
      const rightText = 'A\nB\nC'

      const result = await computeDiff(leftText, rightText)

      console.log('Diff lines:')
      result.lines.forEach((line, i) => {
        console.log(`  ${i}: type=${line.type}, leftLineNo=${line.leftLineNo}, rightLineNo=${line.rightLineNo}, content="${line.leftContent}"`)
      })

      // 验证前3行是equal，对应行号1、2、3
      expect(result.lines[0].type).toBe('equal')
      expect(result.lines[0].leftLineNo).toBe(1)
      expect(result.lines[0].rightLineNo).toBe(1)

      expect(result.lines[1].type).toBe('equal')
      expect(result.lines[1].leftLineNo).toBe(2)
      expect(result.lines[1].rightLineNo).toBe(2)

      expect(result.lines[2].type).toBe('equal')
      expect(result.lines[2].leftLineNo).toBe(3)
      expect(result.lines[2].rightLineNo).toBe(3)

      // 验证后3行是delete，对应行号4、5、6
      expect(result.lines[3].type).toBe('delete')
      expect(result.lines[3].leftLineNo).toBe(4)

      expect(result.lines[4].type).toBe('delete')
      expect(result.lines[4].leftLineNo).toBe(5)

      expect(result.lines[5].type).toBe('delete')
      expect(result.lines[5].leftLineNo).toBe(6)
    })

    it('多个重复块的行对齐', async () => {
      // 更复杂的场景：多个重复块
      const left = ['X', 'A', 'B', 'A', 'B', 'Y']
      const right = ['X', 'A', 'B', 'Y']

      const result = myersDiff(left, right)

      console.log('Multiple duplicate blocks:')
      result.forEach((op, i) => {
        console.log(`  ${i}: type=${op.type}, leftIndex=${op.leftIndex}, rightIndex=${op.rightIndex}`)
      })

      // 期望删除中间重复的A、B（索引2、3），保留后面的A、B（索引3、4）
      // 或者另一种合理对齐：删除后面的A、B（索引4、5）
      // 关键是应该保持一致性

      const equalOps = result.filter(op => op.type === 'equal')
      const deleteOps = result.filter(op => op.type === 'delete')

      expect(equalOps.length + deleteOps.length).toBe(left.length)
      expect(equalOps.length).toBe(right.length)
    })
  })
})
