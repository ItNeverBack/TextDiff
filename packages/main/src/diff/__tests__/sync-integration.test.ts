import { describe, it, expect } from 'vitest'
import { computeDiff } from '../index'
import { syncDiff } from '../sync'

describe('Diff Sync Integration', () => {
  it('should sync test1 to test2 correctly - delete chunk at line 4', async () => {
    // 模拟 test1 和 test2 的场景
    // test1 有第4行 "123"，test2 没有这行（被删除了）
    const test1 = '123\n321\n1\n3\n4'  // 左侧 - 有 "123" 在第4行
    const test2 = '123\n3\n4\n3'        // 右侧 - 没有 "321" 和 "1" 

    // 先计算 diff
    const diffResult = await computeDiff(test1, test2, {})
    
    console.log('Diff lines:')
    diffResult.lines.forEach((line, idx) => {
      console.log(`  ${idx}: type=${line.type}, leftNo=${line.leftLineNo}, rightNo=${line.rightLineNo}, left="${line.leftContent}", right="${line.rightContent}"`)
    })
    
    console.log('Chunks:')
    diffResult.chunks.forEach(chunk => {
      console.log(`  ${chunk.id}: type=${chunk.type}, startIndex=${chunk.startIndex}, endIndex=${chunk.endIndex}`)
      console.log(`    leftLineRange=[${chunk.leftLineRange[0]}, ${chunk.leftLineRange[1]}]`)
      console.log(`    rightLineRange=[${chunk.rightLineRange[0]}, ${chunk.rightLineRange[1]}]`)
      console.log(`    changeIndices=[${chunk.changeIndices.join(', ')}]`)
    })

    // 同步第一个 chunk 从左到右
    if (diffResult.chunks.length > 0) {
      const result = syncDiff(test1, test2, diffResult.lines, diffResult.chunks, {
        direction: 'left-to-right',
        chunkIds: [diffResult.chunks[0].id]
      })

      console.log('\nAfter sync:')
      console.log('Left:', result.leftContent)
      console.log('Right:', result.rightContent)
      console.log('Stats:', result.stats)
      
      // 期望右侧变成和左侧一样（至少第一处差异被修复）
      // 这个测试主要是为了调试，看看实际输出是什么
    }
  })

  it('should sync delete chunk - simple case', async () => {
    // 简单场景：左侧有3行，右侧有2行（删除了中间一行）
    const left = 'line1\nline2\nline3'
    const right = 'line1\nline3'

    const diffResult = await computeDiff(left, right, {})
    
    console.log('Simple delete case - Diff lines:')
    diffResult.lines.forEach((line, idx) => {
      console.log(`  ${idx}: type=${line.type}, leftNo=${line.leftLineNo}, rightNo=${line.rightLineNo}`)
    })

    console.log('Chunks:')
    diffResult.chunks.forEach(chunk => {
      console.log(`  ${chunk.id}: type=${chunk.type}`)
      console.log(`    leftLineRange=[${chunk.leftLineRange[0]}, ${chunk.leftLineRange[1]}]`)
      console.log(`    rightLineRange=[${chunk.rightLineRange[0]}, ${chunk.rightLineRange[1]}]`)
    })

    if (diffResult.chunks.length > 0) {
      const result = syncDiff(left, right, diffResult.lines, diffResult.chunks, {
        direction: 'left-to-right'
      })

      console.log('\nAfter sync left-to-right:')
      console.log('Expected right: line1\\nline2\\nline3')
      console.log('Actual right:', result.rightContent)
      
      expect(result.rightContent).toBe('line1\nline2\nline3')
    }
  })

  it('should sync insert chunk - simple case', async () => {
    // 简单场景：左侧有2行，右侧有3行（右侧插入了中间一行）
    const left = 'line1\nline3'
    const right = 'line1\nline2\nline3'

    const diffResult = await computeDiff(left, right, {})
    
    console.log('Simple insert case - Diff lines:')
    diffResult.lines.forEach((line, idx) => {
      console.log(`  ${idx}: type=${line.type}, leftNo=${line.leftLineNo}, rightNo=${line.rightLineNo}`)
    })

    console.log('Chunks:')
    diffResult.chunks.forEach(chunk => {
      console.log(`  ${chunk.id}: type=${chunk.type}`)
      console.log(`    leftLineRange=[${chunk.leftLineRange[0]}, ${chunk.leftLineRange[1]}]`)
      console.log(`    rightLineRange=[${chunk.rightLineRange[0]}, ${chunk.rightLineRange[1]}]`)
    })

    if (diffResult.chunks.length > 0) {
      const result = syncDiff(left, right, diffResult.lines, diffResult.chunks, {
        direction: 'left-to-right'
      })

      console.log('\nAfter sync left-to-right (should remove inserted):')
      console.log('Expected right: line1\\nline3')
      console.log('Actual right:', result.rightContent)
      
      expect(result.rightContent).toBe('line1\nline3')
    }
  })
})
