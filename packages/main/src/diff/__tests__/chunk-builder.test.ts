import { describe, it, expect } from 'vitest'
import { buildChunks } from '../chunk-builder'
import type { DiffLine } from '@shared/types'

function createDiffLine(type: DiffLine['type'], leftNo: number | null, rightNo: number | null, content: string): DiffLine {
  return {
    type,
    leftLineNo: leftNo,
    rightLineNo: rightNo,
    leftContent: type === 'insert' ? '' : content,
    rightContent: type === 'delete' ? '' : content
  }
}

describe('buildChunks - separated changes should be independent', () => {
  it('should create two chunks when changes are separated by equal lines', () => {
    // Simulate testTxt files diff result:
    // left:  [123, 321, 1, 3, 4]
    // right: [123, 3, 4, 3]
    // diff:  equal, delete, delete, equal, equal, insert
    const lines: DiffLine[] = [
      createDiffLine('equal', 1, 1, '123'),
      createDiffLine('delete', 2, null, '321'),
      createDiffLine('delete', 3, null, '1'),
      createDiffLine('equal', 4, 2, '3'),
      createDiffLine('equal', 5, 3, '4'),
      createDiffLine('insert', null, 4, '3')
    ]

    const chunks = buildChunks(lines, 3)

    console.log('Chunks:', chunks.map(c => ({
      type: c.type,
      startIndex: c.startIndex,
      endIndex: c.endIndex,
      leftRange: c.leftLineRange,
      rightRange: c.rightLineRange
    })))

    // Should have 2 chunks:
    // Chunk 1: delete 321, 1 (with context)
    // Chunk 2: insert 3 (with context)
    expect(chunks.length).toBe(2)

    // First chunk should be delete type
    expect(chunks[0].type).toBe('delete')
    expect(chunks[0].startIndex).toBe(0) // includes context (lines 0-2)
    expect(chunks[0].endIndex).toBe(3)   // ends at line 3 (equal line "3")

    // Second chunk should be insert type
    expect(chunks[1].type).toBe('insert')
    expect(chunks[1].startIndex).toBe(4) // starts from line 4 (equal line "4")
    expect(chunks[1].endIndex).toBe(5)   // includes the insert line
  })

  it('should merge adjacent changes into one chunk', () => {
    // adjacent delete + insert = replace
    const lines: DiffLine[] = [
      createDiffLine('equal', 1, 1, 'line1'),
      createDiffLine('delete', 2, null, 'old'),
      createDiffLine('insert', null, 2, 'new'),
      createDiffLine('equal', 3, 3, 'line3')
    ]

    const chunks = buildChunks(lines, 3)

    // Should have 1 chunk (adjacent changes)
    expect(chunks.length).toBe(1)
    expect(chunks[0].type).toBe('change') // has both delete and insert
  })

  it('should handle multiple separated change groups', () => {
    // delete, equal, insert, equal, delete
    const lines: DiffLine[] = [
      createDiffLine('equal', 1, 1, 'a'),
      createDiffLine('delete', 2, null, 'del1'),
      createDiffLine('equal', 3, 2, 'b'),
      createDiffLine('equal', 4, 3, 'c'),
      createDiffLine('insert', null, 4, 'ins1'),
      createDiffLine('equal', 5, 5, 'd'),
      createDiffLine('equal', 6, 6, 'e'),
      createDiffLine('delete', 7, null, 'del2')
    ]

    const chunks = buildChunks(lines, 2)

    console.log('Multiple groups chunks:', chunks.map(c => ({
      type: c.type,
      start: c.startIndex,
      end: c.endIndex
    })))

    // Should have 3 chunks
    expect(chunks.length).toBe(3)
    expect(chunks[0].type).toBe('delete')
    expect(chunks[1].type).toBe('insert')
    expect(chunks[2].type).toBe('delete')
  })

  it('should return empty array when no changes', () => {
    const lines: DiffLine[] = [
      createDiffLine('equal', 1, 1, 'a'),
      createDiffLine('equal', 2, 2, 'b'),
      createDiffLine('equal', 3, 3, 'c')
    ]

    const chunks = buildChunks(lines, 3)
    expect(chunks.length).toBe(0)
  })
})
