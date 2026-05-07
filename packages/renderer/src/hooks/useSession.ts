import { useCallback } from 'react'
import { useSessionStore } from '../stores'
import type { DiffSession, FileInfo, DiffStats } from '@shared/types'

export function useSession() {
  const {
    sessions,
    currentSession,
    isLoading,
    error,
    loadSessions,
    saveSession,
    updateSession,
    loadSession,
    deleteSession,
    setCurrentSession,
    clearError
  } = useSessionStore()

  const saveCurrentSession = useCallback(async (
    name: string,
    leftFile: FileInfo,
    rightFile: FileInfo,
    stats?: DiffStats
  ) => {
    return saveSession({
      name,
      left: leftFile,
      right: rightFile,
      stats,  // 包含差异统计
      options: {
        ignoreWhitespace: 'none',
        ignoreCase: false,
        ignoreLineEndings: true,
        ignorePatterns: [],
        ignoreComments: false,
        commentPrefixes: ['//', '#', '--'],
        algorithm: 'myers',
        contextLines: 3
      }
    })
  }, [saveSession])

  const restoreSession = useCallback(async (session: DiffSession) => {
    setCurrentSession(session)
    return session
  }, [setCurrentSession])

  const hasSessions = sessions.length > 0

  return {
    sessions,
    currentSession,
    isLoading,
    error,
    hasSessions,
    loadSessions,
    saveSession,
    saveCurrentSession,
    updateSession,
    loadSession,
    deleteSession,
    restoreSession,
    setCurrentSession,
    clearError
  }
}
