import { create } from 'zustand'

export interface SearchMatch {
  lineIndex: number
  leftLineNo: number | null
  rightLineNo: number | null
  content: string
  matchStart: number
  matchEnd: number
  side: 'left' | 'right' | 'both'
}

export interface SearchState {
  // 搜索配置
  query: string
  isRegex: boolean
  caseSensitive: boolean
  wholeWord: boolean
  searchInLeft: boolean
  searchInRight: boolean
  
  // 搜索结果
  matches: SearchMatch[]
  currentMatchIndex: number
  
  // 高亮状态
  highlightedLineIndex: number | null
  highlightedRanges: Array<{ start: number; end: number }>
}

interface SearchActions {
  // 设置搜索配置
  setQuery: (query: string) => void
  setIsRegex: (isRegex: boolean) => void
  setCaseSensitive: (caseSensitive: boolean) => void
  setWholeWord: (wholeWord: boolean) => void
  setSearchInLeft: (searchInLeft: boolean) => void
  setSearchInRight: (searchInRight: boolean) => void
  
  // 设置搜索结果
  setMatches: (matches: SearchMatch[]) => void
  setCurrentMatchIndex: (index: number) => void
  
  // 高亮控制
  setHighlightedLine: (lineIndex: number | null, ranges?: Array<{ start: number; end: number }>) => void
  clearHighlight: () => void
  
  // 导航
  nextMatch: () => void
  prevMatch: () => void
  firstMatch: () => void
  lastMatch: () => void
  
  // 重置
  reset: () => void
}

const initialState: SearchState = {
  query: '',
  isRegex: false,
  caseSensitive: false,
  wholeWord: false,
  searchInLeft: true,
  searchInRight: true,
  
  matches: [],
  currentMatchIndex: -1,
  
  highlightedLineIndex: null,
  highlightedRanges: []
}

export const useSearchStore = create<SearchState & SearchActions>((set, get) => ({
  ...initialState,
  
  setQuery: (query) => set({ query }),
  setIsRegex: (isRegex) => set({ isRegex }),
  setCaseSensitive: (caseSensitive) => set({ caseSensitive }),
  setWholeWord: (wholeWord) => set({ wholeWord }),
  setSearchInLeft: (searchInLeft) => set({ searchInLeft }),
  setSearchInRight: (searchInRight) => set({ searchInRight }),
  
  setMatches: (matches) => set({ matches, currentMatchIndex: matches.length > 0 ? 0 : -1 }),
  setCurrentMatchIndex: (index) => {
    const { matches } = get()
    if (index >= 0 && index < matches.length) {
      const match = matches[index]
      set({ 
        currentMatchIndex: index,
        highlightedLineIndex: match.lineIndex,
        highlightedRanges: [{ start: match.matchStart, end: match.matchEnd }]
      })
    }
  },
  
  setHighlightedLine: (lineIndex, ranges = []) => set({ 
    highlightedLineIndex: lineIndex, 
    highlightedRanges: ranges 
  }),
  clearHighlight: () => set({ highlightedLineIndex: null, highlightedRanges: [] }),
  
  nextMatch: () => {
    const { matches, currentMatchIndex } = get()
    if (matches.length === 0) return
    const nextIndex = currentMatchIndex < matches.length - 1 ? currentMatchIndex + 1 : 0
    get().setCurrentMatchIndex(nextIndex)
  },
  
  prevMatch: () => {
    const { matches, currentMatchIndex } = get()
    if (matches.length === 0) return
    const prevIndex = currentMatchIndex > 0 ? currentMatchIndex - 1 : matches.length - 1
    get().setCurrentMatchIndex(prevIndex)
  },
  
  firstMatch: () => {
    const { matches } = get()
    if (matches.length > 0) {
      get().setCurrentMatchIndex(0)
    }
  },
  
  lastMatch: () => {
    const { matches } = get()
    if (matches.length > 0) {
      get().setCurrentMatchIndex(matches.length - 1)
    }
  },
  
  reset: () => set(initialState)
}))

// 搜索钩子
export function useSearch() {
  return {
    // 执行搜索
    executeSearch: (
      content: string[],
      options: {
        query: string
        isRegex: boolean
        caseSensitive: boolean
        wholeWord: boolean
      }
    ): SearchMatch[] => {
      const { query, isRegex, caseSensitive, wholeWord } = options
      
      if (!query.trim()) return []
      
      const matches: SearchMatch[] = []
      
      // 构建搜索正则
      let searchPattern: RegExp
      try {
        if (isRegex) {
          const flags = caseSensitive ? 'g' : 'gi'
          searchPattern = new RegExp(query, flags)
        } else {
          const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const pattern = wholeWord ? `\\b${escapedQuery}\\b` : escapedQuery
          const flags = caseSensitive ? 'g' : 'gi'
          searchPattern = new RegExp(pattern, flags)
        }
      } catch {
        return []
      }
      
      // 在内容中搜索
      for (let i = 0; i < content.length; i++) {
        const line = content[i]
        const lineMatches = [...line.matchAll(searchPattern)]
        
        for (const match of lineMatches) {
          if (match.index !== undefined) {
            matches.push({
              lineIndex: i,
              leftLineNo: i + 1,
              rightLineNo: i + 1,
              content: line,
              matchStart: match.index,
              matchEnd: match.index + match[0].length,
              side: 'both'
            })
          }
        }
      }
      
      return matches
    }
  }
}
