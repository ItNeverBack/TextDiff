import { describe, it, expect } from 'vitest'
import { normalizeCase } from '../case'

describe('case', () => {
  describe('normalizeCase', () => {
    it('should convert uppercase to lowercase when enabled', () => {
      const lines = ['HELLO', 'WORLD']
      const result = normalizeCase(lines, true)
      expect(result).toEqual(['hello', 'world'])
    })

    it('should keep lowercase unchanged when enabled', () => {
      const lines = ['hello', 'world']
      const result = normalizeCase(lines, true)
      expect(result).toEqual(['hello', 'world'])
    })

    it('should return original lines when disabled', () => {
      const lines = ['HELLO', 'World']
      const result = normalizeCase(lines, false)
      expect(result).toEqual(['HELLO', 'World'])
    })

    it('should handle mixed case content', () => {
      const lines = ['Hello', 'WORLD', 'Test123']
      const result = normalizeCase(lines, true)
      expect(result).toEqual(['hello', 'world', 'test123'])
    })

    it('should handle empty string', () => {
      const lines = ['']
      const result = normalizeCase(lines, true)
      expect(result).toEqual([''])
    })

    it('should handle Unicode characters', () => {
      const lines = ['ÜBER', 'CAFÉ', 'ÑOÑO']
      const result = normalizeCase(lines, true)
      expect(result).toEqual(['über', 'café', 'ñoño'])
    })

    it('should handle Chinese characters (no case change)', () => {
      const lines = ['你好世界', '中文测试']
      const result = normalizeCase(lines, true)
      expect(result).toEqual(['你好世界', '中文测试'])
    })

    it('should handle mixed ASCII and Unicode', () => {
      const lines = ['HELLO世界', 'Über123']
      const result = normalizeCase(lines, true)
      expect(result).toEqual(['hello世界', 'über123'])
    })

    it('should handle empty array', () => {
      expect(normalizeCase([], true)).toEqual([])
      expect(normalizeCase([], false)).toEqual([])
    })

    it('should not mutate original array', () => {
      const lines = ['HELLO']
      const original = [...lines]
      normalizeCase(lines, true)
      expect(lines).toEqual(original)
    })

    it('should handle special characters and numbers', () => {
      const lines = ['TEST_123', 'ABC-XYZ', 'UPPER.lower']
      const result = normalizeCase(lines, true)
      expect(result).toEqual(['test_123', 'abc-xyz', 'upper.lower'])
    })
  })
})
