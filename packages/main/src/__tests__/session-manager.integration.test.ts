import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SessionRepository } from '../session/session.repository'
import { RecentFilesRepository } from '../session/recent-files.repository'
import { initDatabase, closeDatabase } from '../session/database'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'
import type { DiffSession, FileInfo } from '@shared/types'

/**
 * SessionManager 集成测试
 * 
 * 测试场景：
 * - 会话 CRUD 操作
 * - 最近文件列表管理
 * - 数据库持久化
 * 
 * 参考: TextDiff-DevPlan.md §2.8.3 集成测试
 */

describe('SessionManager Integration Tests', () => {
  let sessionRepo: SessionRepository
  let recentFilesRepo: RecentFilesRepository
  let testSessionIds: string[] = []
  let testDbPath: string

  beforeAll(() => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textdiff-test-'))
    testDbPath = path.join(tmpDir, 'test.db')
    initDatabase(testDbPath)

    sessionRepo = new SessionRepository()
    recentFilesRepo = new RecentFilesRepository()
  })

  afterAll(() => {
    for (const id of testSessionIds) {
      try {
        sessionRepo.delete(id)
      } catch {
        // Ignore cleanup errors
      }
    }
    testSessionIds = []

    closeDatabase()

    try {
      const tmpDir = path.dirname(testDbPath)
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  const createTestFileInfo = (path: string, content: string): FileInfo => ({
    path,
    content,
    encoding: 'utf-8',
    lineEnding: 'lf',
    size: content.length,
    mtime: Date.now(),
    language: 'plaintext'
  })

  const createTestSession = (name: string): DiffSession => ({
    id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    left: createTestFileInfo('/test/left.txt', 'Left content'),
    right: createTestFileInfo('/test/right.txt', 'Right content'),
    options: {
      ignoreWhitespace: 'none',
      ignoreCase: false,
      ignoreLineEndings: true,
      ignorePatterns: [],
      ignoreComments: false,
      commentPrefixes: [],
      algorithm: 'myers',
      contextLines: 3
    },
    scrollPosition: { left: 0, right: 0 },
    activeChunkIndex: 0
  })

  describe('Session CRUD', () => {
    it('should save a new session', async () => {
      const session = createTestSession('Test Session')
      testSessionIds.push(session.id)

      await sessionRepo.save(session)

      const loaded = await sessionRepo.load(session.id)
      expect(loaded).toBeDefined()
      expect(loaded?.name).toBe('Test Session')
    })

    it('should load a saved session', async () => {
      const session = createTestSession('Load Test Session')
      testSessionIds.push(session.id)
      await sessionRepo.save(session)

      const loaded = await sessionRepo.load(session.id)

      expect(loaded).toBeDefined()
      expect(loaded?.id).toBe(session.id)
      expect(loaded?.name).toBe(session.name)
      expect(loaded?.left.path).toBe(session.left.path)
      expect(loaded?.right.path).toBe(session.right.path)
    })

    it('should update an existing session', async () => {
      const session = createTestSession('Update Test Session')
      testSessionIds.push(session.id)
      await sessionRepo.save(session)

      const updates = {
        name: 'Updated Session Name',
        updatedAt: Date.now(),
        activeChunkIndex: 5
      }

      await sessionRepo.update(session.id, updates)

      const loaded = await sessionRepo.load(session.id)
      expect(loaded?.name).toBe('Updated Session Name')
      expect(loaded?.activeChunkIndex).toBe(5)
    })

    it('should delete a session', async () => {
      const session = createTestSession('Delete Test Session')
      testSessionIds.push(session.id)
      await sessionRepo.save(session)

      await sessionRepo.delete(session.id)

      const loaded = await sessionRepo.load(session.id)
      expect(loaded).toBeNull()

      // Remove from cleanup list
      testSessionIds = testSessionIds.filter(id => id !== session.id)
    })

    it('should return null for non-existent session', async () => {
      const loaded = await sessionRepo.load('non-existent-id')
      expect(loaded).toBeNull()
    })

    it('should list all sessions', async () => {
      // Create multiple sessions
      const sessions = [
        createTestSession('Session 1'),
        createTestSession('Session 2'),
        createTestSession('Session 3')
      ]

      for (const session of sessions) {
        testSessionIds.push(session.id)
        await sessionRepo.save(session)
      }

      const list = await sessionRepo.list()

      expect(list.length).toBeGreaterThanOrEqual(3)
      const testSessions = list.filter(s => s.name.startsWith('Session '))
      expect(testSessions.length).toBeGreaterThanOrEqual(3)
    })

    it('should list sessions with limit', async () => {
      const list = await sessionRepo.list({ limit: 5 })
      expect(list.length).toBeLessThanOrEqual(5)
    })

    it('should list sessions sorted by updatedAt', async () => {
      const session1 = createTestSession('Sort Session 1')
      const session2 = createTestSession('Sort Session 2')
      
      testSessionIds.push(session1.id, session2.id)
      
      await sessionRepo.save(session1)
      await new Promise(r => setTimeout(r, 100)) // Small delay
      await sessionRepo.save(session2)

      const list = await sessionRepo.list()
      const testSessions = list.filter(s => s.name.startsWith('Sort Session'))
      
      // Should be sorted by updatedAt desc (newest first)
      expect(testSessions[0].updatedAt).toBeGreaterThanOrEqual(
        testSessions[testSessions.length - 1].updatedAt
      )
    })
  })

  describe('Session Data Integrity', () => {
    it('should preserve file content in session', async () => {
      const leftContent = 'Line 1\nLine 2\nLine 3'
      const rightContent = 'Line 1\nModified\nLine 3'
      
      const session = createTestSession('Content Test')
      session.left = createTestFileInfo('/test/left.txt', leftContent)
      session.right = createTestFileInfo('/test/right.txt', rightContent)
      
      testSessionIds.push(session.id)
      await sessionRepo.save(session)

      const loaded = await sessionRepo.load(session.id)
      
      expect(loaded?.left.content).toBe(leftContent)
      expect(loaded?.right.content).toBe(rightContent)
    })

    it('should preserve diff options in session', async () => {
      const session = createTestSession('Options Test')
      session.options = {
        ignoreWhitespace: 'all',
        ignoreCase: true,
        ignoreLineEndings: false,
        ignorePatterns: ['^\\s*//', '^\\s*#'],
        ignoreComments: false,
        commentPrefixes: [],
        algorithm: 'patience',
        contextLines: 5
      }
      
      testSessionIds.push(session.id)
      await sessionRepo.save(session)

      const loaded = await sessionRepo.load(session.id)
      
      expect(loaded?.options.ignoreWhitespace).toBe('all')
      expect(loaded?.options.ignoreCase).toBe(true)
      expect(loaded?.options.ignoreLineEndings).toBe(false)
      expect(loaded?.options.ignorePatterns).toEqual(['^\\s*//', '^\\s*#'])
      expect(loaded?.options.algorithm).toBe('patience')
      expect(loaded?.options.contextLines).toBe(5)
    })
  })

  describe('Recent Files', () => {
    it('should add a file to recent files', async () => {
      const path = '/test/path/file1.txt'
      await recentFilesRepo.add(path)

      const recent = await recentFilesRepo.list(10)
      const found = recent.find(f => f.path === path)
      
      expect(found).toBeDefined()
      expect(found?.path).toBe(path)
      expect(found?.accessedAt).toBeGreaterThan(0)
    })

    it('should update existing recent file timestamp', async () => {
      const path = '/test/path/file2.txt'
      
      await recentFilesRepo.add(path)
      const before = Date.now()
      await new Promise(r => setTimeout(r, 50))
      await recentFilesRepo.add(path)
      const after = Date.now()

      const recent = await recentFilesRepo.list(10)
      const found = recent.find(f => f.path === path)
      
      expect(found?.accessedAt).toBeGreaterThanOrEqual(before)
      expect(found?.accessedAt).toBeLessThanOrEqual(after)
    })

    it('should list recent files sorted by accessedAt desc', async () => {
      // Clear existing
      await recentFilesRepo.clear()
      
      const paths = ['/test/file1.txt', '/test/file2.txt', '/test/file3.txt']
      
      for (const path of paths) {
        await recentFilesRepo.add(path)
        await new Promise(r => setTimeout(r, 50))
      }

      const recent = await recentFilesRepo.list(10)
      
      // Should be sorted with newest first
      for (let i = 0; i < recent.length - 1; i++) {
        expect(recent[i].accessedAt).toBeGreaterThanOrEqual(
          recent[i + 1].accessedAt
        )
      }
    })

    it('should respect limit parameter', async () => {
      const recent = await recentFilesRepo.list(3)
      expect(recent.length).toBeLessThanOrEqual(3)
    })

    it('should clear all recent files', async () => {
      await recentFilesRepo.add('/test/clear1.txt')
      await recentFilesRepo.add('/test/clear2.txt')
      
      await recentFilesRepo.clear()
      
      const recent = await recentFilesRepo.list(10)
      expect(recent.length).toBe(0)
    })
  })

  describe('Session with Special Characters', () => {
    it('should handle unicode in session names', async () => {
      const session = createTestSession('会话测试 📝 émojis')
      testSessionIds.push(session.id)
      
      await sessionRepo.save(session)
      const loaded = await sessionRepo.load(session.id)
      
      expect(loaded?.name).toBe('会话测试 📝 émojis')
    })

    it('should handle unicode in file paths', async () => {
      const session = createTestSession('Unicode Path Test')
      session.left.path = '/测试/文件.txt'
      session.right.path = '/文件/📄.txt'
      
      testSessionIds.push(session.id)
      await sessionRepo.save(session)

      const loaded = await sessionRepo.load(session.id)
      
      expect(loaded?.left.path).toBe('/测试/文件.txt')
      expect(loaded?.right.path).toBe('/文件/📄.txt')
    })

    it('should handle unicode in file content', async () => {
      const session = createTestSession('Unicode Content Test')
      session.left.content = 'Hello 你好 👋'
      session.right.content = 'World 世界 🌍'
      
      testSessionIds.push(session.id)
      await sessionRepo.save(session)

      const loaded = await sessionRepo.load(session.id)
      
      expect(loaded?.left.content).toBe('Hello 你好 👋')
      expect(loaded?.right.content).toBe('World 世界 🌍')
    })
  })
})
