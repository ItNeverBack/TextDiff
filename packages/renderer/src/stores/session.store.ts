import type { DiffSession, ListOptions } from '@shared/types'
import { create } from 'zustand'
import { api } from '../lib/api'

interface SessionState {
  sessions: DiffSession[]
  currentSession: DiffSession | null
  isLoading: boolean
  error: string | null
}

interface SessionActions {
  loadSessions: (options?: ListOptions) => Promise<void>
  saveSession: (session: Omit<DiffSession, 'id' | 'createdAt' | 'updatedAt'>) => Promise<DiffSession>
  updateSession: (id: string, updates: Partial<DiffSession>) => Promise<DiffSession | null>
  loadSession: (id: string) => Promise<DiffSession | null>
  deleteSession: (id: string) => Promise<void>
  setCurrentSession: (session: DiffSession | null) => void
  clearError: () => void
}

export const useSessionStore = create<SessionState & SessionActions>((set, get) => ({
  sessions: [],
  currentSession: null,
  isLoading: false,
  error: null,

  loadSessions: async (options) => {
    set({ isLoading: true, error: null })
    try {
      const sessions = await api.listSessions(options)
      set({ sessions, isLoading: false })
    } catch (error) {
      set({ error: String(error), isLoading: false })
    }
  },

  updateSession: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const existing = get().sessions.find((s: DiffSession) => s.id === id)
      if (!existing) {
        set({ error: 'Session not found', isLoading: false })
        return null
      }

      const updated: DiffSession = {
        ...existing,
        ...updates,
        id: existing.id, // 确保 id 不被修改
        createdAt: existing.createdAt, // 确保创建时间不被修改
        updatedAt: Date.now()
      }

      await api.saveSession(updated)

      set((state) => ({
        sessions: state.sessions.map(s => s.id === id ? updated : s),
        currentSession: state.currentSession?.id === id ? updated : state.currentSession,
        isLoading: false
      }))

      return updated
    } catch (error) {
      set({ error: String(error), isLoading: false })
      return null
    }
  },

  saveSession: async (sessionData) => {
    const now = Date.now()
    const session: DiffSession = {
      id: `session_${now}`,
      createdAt: now,
      updatedAt: now,
      ...sessionData
    }
    
    await api.saveSession(session)
    
    set((state) => ({
      sessions: [session, ...state.sessions],
      currentSession: session
    }))
    
    return session
  },

  loadSession: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const session = await api.loadSession(id)
      if (session) {
        set({ currentSession: session, isLoading: false })
      }
      return session
    } catch (error) {
      set({ error: String(error), isLoading: false })
      return null
    }
  },

  deleteSession: async (id) => {
    await api.deleteSession(id)
    
    set((state) => ({
      sessions: state.sessions.filter(s => s.id !== id),
      currentSession: state.currentSession?.id === id ? null : state.currentSession
    }))
  },

  setCurrentSession: (session) => {
    set({ currentSession: session })
  },

  clearError: () => {
    set({ error: null })
  }
}))
