import { describe, it, expect } from 'vitest'
import { 
  generateId,
  generateChunkId,
  generateSessionId,
  generateConflictId
} from '../id'

describe('ID 生成工具', () => {
  describe('generateId', () => {
    it('生成唯一 ID', () => {
      const ids = new Set()
      for (let i = 0; i < 100; i++) {
        ids.add(generateId())
      }
      expect(ids.size).toBe(100)
    })

    it('返回字符串', () => {
      const id = generateId()
      expect(typeof id).toBe('string')
    })

    it('包含分隔符', () => {
      const id = generateId()
      expect(id).toContain('-')
    })

    it('非空字符串', () => {
      const id = generateId()
      expect(id.length).toBeGreaterThan(0)
    })
  })

  describe('generateChunkId', () => {
    it('以 chunk- 开头', () => {
      const id = generateChunkId()
      expect(id.startsWith('chunk-')).toBe(true)
    })

    it('生成唯一 ID', () => {
      const ids = new Set()
      for (let i = 0; i < 100; i++) {
        ids.add(generateChunkId())
      }
      expect(ids.size).toBe(100)
    })
  })

  describe('generateSessionId', () => {
    it('以 session- 开头', () => {
      const id = generateSessionId()
      expect(id.startsWith('session-')).toBe(true)
    })

    it('生成唯一 ID', () => {
      const ids = new Set()
      for (let i = 0; i < 100; i++) {
        ids.add(generateSessionId())
      }
      expect(ids.size).toBe(100)
    })
  })

  describe('generateConflictId', () => {
    it('以 conflict- 开头', () => {
      const id = generateConflictId()
      expect(id.startsWith('conflict-')).toBe(true)
    })

    it('生成唯一 ID', () => {
      const ids = new Set()
      for (let i = 0; i < 100; i++) {
        ids.add(generateConflictId())
      }
      expect(ids.size).toBe(100)
    })
  })
})
