import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.api（contextBridge 在测试环境不可用）
const mockApi = {
  openFile: vi.fn(),
  openFilePair: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  computeDiff: vi.fn(),
  computeThreeWayDiff: vi.fn(),
  syncDiff: vi.fn(),
  checkFileSize: vi.fn(),
  clearCache: vi.fn(),
  clearSessionCache: vi.fn(),
  getDiffCacheStats: vi.fn(),
  directory: {
    compare: vi.fn(),
    compareSimple: vi.fn(),
    open: vi.fn(),
    cancel: vi.fn(),
    getProgress: vi.fn(),
  },
  sync: {
    generatePlan: vi.fn(),
    generatePlanWithConfig: vi.fn(),
    validate: vi.fn(),
    analyze: vi.fn(),
    execute: vi.fn(),
    cancel: vi.fn(),
    getProgress: vi.fn(),
  },
  report: {
    generate: vi.fn(),
    save: vi.fn(),
    generateAndSave: vi.fn(),
    preview: vi.fn(),
  },
  saveSession: vi.fn(),
  loadSession: vi.fn(),
  listSessions: vi.fn(),
  deleteSession: vi.fn(),
  getRecentFiles: vi.fn(),
  addRecentFile: vi.fn(),
  getRecentDirectories: vi.fn(),
  addRecentDirectory: vi.fn(),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  onDiffProgress: vi.fn(),
  onDiffComplete: vi.fn(),
  onDiffError: vi.fn(),
  onSyncProgress: vi.fn(),
  onCliOpenFiles: vi.fn(),
  showSaveDialog: vi.fn(),
  showOpenDialog: vi.fn(),
  setLanguage: vi.fn(),
  checkUnsavedChanges: vi.fn(),
  confirmClose: vi.fn(),
}

// @ts-expect-error - Mocking window.api for tests
global.window = { api: mockApi }

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}))

// RequestAnimationFrame mock
global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  return setTimeout(callback, 0) as unknown as number
})

global.cancelAnimationFrame = vi.fn((id: number) => {
  clearTimeout(id)
})

// MatchMedia mock
global.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))
