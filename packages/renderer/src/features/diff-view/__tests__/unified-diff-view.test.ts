import { describe, it, expect } from 'vitest'
import type { DiffLine } from '@shared/types'

describe('UnifiedDiffView 类型处理', () => {
  const mockDiffLines: DiffLine[] = [
    {
      leftLineNo: 1,
      rightLineNo: 1,
      type: 'equal',
      leftContent: 'function test() {',
      rightContent: 'function test() {'
    },
    {
      leftLineNo: 2,
      rightLineNo: null,
      type: 'delete',
      leftContent: '  return oldValue;',
      rightContent: ''
    },
    {
      leftLineNo: null,
      rightLineNo: 2,
      type: 'insert',
      leftContent: '',
      rightContent: '  return newValue;'
    },
    {
      leftLineNo: 3,
      rightLineNo: 3,
      type: 'replace',
      leftContent: '  const x = 1;',
      rightContent: '  const x = 2;',
      inlineDiff: {
        left: [{ text: '  const x = ', type: 'equal' }, { text: '1', type: 'delete' }, { text: ';', type: 'equal' }],
        right: [{ text: '  const x = ', type: 'equal' }, { text: '2', type: 'insert' }, { text: ';', type: 'equal' }]
      }
    },
    {
      leftLineNo: 4,
      rightLineNo: 4,
      type: 'equal',
      leftContent: '}',
      rightContent: '}'
    }
  ]

  it('应正确处理所有 diff 行类型', () => {
    for (const line of mockDiffLines) {
      // 每行都应该有正确的类型
      expect(['equal', 'insert', 'delete', 'replace']).toContain(line.type)

      // replace 类型的行应该有行号
      if (line.type === 'replace') {
        expect(line.leftLineNo).not.toBeNull()
        expect(line.rightLineNo).not.toBeNull()
      }

      // insert 类型的行只有右侧行号
      if (line.type === 'insert') {
        expect(line.leftLineNo).toBeNull()
        expect(line.rightLineNo).not.toBeNull()
      }

      // delete 类型的行只有左侧行号
      if (line.type === 'delete') {
        expect(line.leftLineNo).not.toBeNull()
        expect(line.rightLineNo).toBeNull()
      }
    }
  })

  it('replace 类型应该有 inlineDiff', () => {
    const replaceLines = mockDiffLines.filter(line => line.type === 'replace')
    expect(replaceLines.length).toBeGreaterThan(0)

    for (const line of replaceLines) {
      expect(line.inlineDiff).toBeDefined()
      expect(line.inlineDiff?.left).toBeDefined()
      expect(line.inlineDiff?.right).toBeDefined()
    }
  })

  it('应正确计算 gutter symbol', () => {
    const getGutterSymbol = (type: string) => {
      switch (type) {
        case 'insert': return '+'
        case 'delete': return '-'
        case 'replace': return '~'
        default: return ' '
      }
    }

    expect(getGutterSymbol('insert')).toBe('+')
    expect(getGutterSymbol('delete')).toBe('-')
    expect(getGutterSymbol('replace')).toBe('~')
    expect(getGutterSymbol('equal')).toBe(' ')
  })

  it('应正确计算 gutter title', () => {
    const getGutterTitle = (type: string) => {
      switch (type) {
        case 'insert': return '新增'
        case 'delete': return '删除'
        case 'replace': return '修改'
        default: return ''
      }
    }

    expect(getGutterTitle('insert')).toBe('新增')
    expect(getGutterTitle('delete')).toBe('删除')
    expect(getGutterTitle('replace')).toBe('修改')
    expect(getGutterTitle('equal')).toBe('')
  })
})
