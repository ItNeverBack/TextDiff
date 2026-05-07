import { describe, it, expect, beforeEach } from 'vitest'
import { useSearchStore, type SearchMatch } from '../stores/search.store'

describe('Week 12 - Search Enhancement', () => {
  beforeEach(() => {
    // 重置搜索 store
    useSearchStore.setState({
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
    })
  })

  describe('Search Store', () => {
    it('should set search query', () => {
      const store = useSearchStore.getState()
      store.setQuery('test query')
      
      expect(useSearchStore.getState().query).toBe('test query')
    })

    it('should toggle regex mode', () => {
      const store = useSearchStore.getState()
      
      expect(store.isRegex).toBe(false)
      store.setIsRegex(true)
      expect(useSearchStore.getState().isRegex).toBe(true)
    })

    it('should toggle case sensitivity', () => {
      const store = useSearchStore.getState()
      
      expect(store.caseSensitive).toBe(false)
      store.setCaseSensitive(true)
      expect(useSearchStore.getState().caseSensitive).toBe(true)
    })

    it('should toggle whole word matching', () => {
      const store = useSearchStore.getState()
      
      expect(store.wholeWord).toBe(false)
      store.setWholeWord(true)
      expect(useSearchStore.getState().wholeWord).toBe(true)
    })

    it('should set search sides', () => {
      const store = useSearchStore.getState()
      
      store.setSearchInLeft(false)
      expect(useSearchStore.getState().searchInLeft).toBe(false)
      
      store.setSearchInRight(false)
      expect(useSearchStore.getState().searchInRight).toBe(false)
    })

    it('should set matches and reset current index', () => {
      const store = useSearchStore.getState()
      const matches: SearchMatch[] = [
        {
          lineIndex: 0,
          leftLineNo: 1,
          rightLineNo: 1,
          content: 'test line',
          matchStart: 0,
          matchEnd: 4,
          side: 'both'
        },
        {
          lineIndex: 1,
          leftLineNo: 2,
          rightLineNo: 2,
          content: 'another test',
          matchStart: 8,
          matchEnd: 12,
          side: 'left'
        }
      ]
      
      store.setMatches(matches)
      
      const state = useSearchStore.getState()
      expect(state.matches).toEqual(matches)
      expect(state.currentMatchIndex).toBe(0)
    })

    it('should navigate to next match', () => {
      const store = useSearchStore.getState()
      const matches: SearchMatch[] = [
        { lineIndex: 0, leftLineNo: 1, rightLineNo: 1, content: 'a', matchStart: 0, matchEnd: 1, side: 'both' },
        { lineIndex: 1, leftLineNo: 2, rightLineNo: 2, content: 'b', matchStart: 0, matchEnd: 1, side: 'both' },
        { lineIndex: 2, leftLineNo: 3, rightLineNo: 3, content: 'c', matchStart: 0, matchEnd: 1, side: 'both' }
      ]
      
      store.setMatches(matches)
      expect(useSearchStore.getState().currentMatchIndex).toBe(0)
      
      store.nextMatch()
      expect(useSearchStore.getState().currentMatchIndex).toBe(1)
      
      store.nextMatch()
      expect(useSearchStore.getState().currentMatchIndex).toBe(2)
      
      store.nextMatch()
      expect(useSearchStore.getState().currentMatchIndex).toBe(0) // wrap around
    })

    it('should navigate to previous match', () => {
      const store = useSearchStore.getState()
      const matches: SearchMatch[] = [
        { lineIndex: 0, leftLineNo: 1, rightLineNo: 1, content: 'a', matchStart: 0, matchEnd: 1, side: 'both' },
        { lineIndex: 1, leftLineNo: 2, rightLineNo: 2, content: 'b', matchStart: 0, matchEnd: 1, side: 'both' }
      ]
      
      store.setMatches(matches)
      store.setCurrentMatchIndex(1)
      
      store.prevMatch()
      expect(useSearchStore.getState().currentMatchIndex).toBe(0)
      
      store.prevMatch()
      expect(useSearchStore.getState().currentMatchIndex).toBe(1) // wrap around
    })

    it('should navigate to first match', () => {
      const store = useSearchStore.getState()
      const matches: SearchMatch[] = [
        { lineIndex: 0, leftLineNo: 1, rightLineNo: 1, content: 'a', matchStart: 0, matchEnd: 1, side: 'both' },
        { lineIndex: 1, leftLineNo: 2, rightLineNo: 2, content: 'b', matchStart: 0, matchEnd: 1, side: 'both' }
      ]
      
      store.setMatches(matches)
      store.setCurrentMatchIndex(1)
      
      store.firstMatch()
      expect(useSearchStore.getState().currentMatchIndex).toBe(0)
    })

    it('should navigate to last match', () => {
      const store = useSearchStore.getState()
      const matches: SearchMatch[] = [
        { lineIndex: 0, leftLineNo: 1, rightLineNo: 1, content: 'a', matchStart: 0, matchEnd: 1, side: 'both' },
        { lineIndex: 1, leftLineNo: 2, rightLineNo: 2, content: 'b', matchStart: 0, matchEnd: 1, side: 'both' }
      ]
      
      store.setMatches(matches)
      
      store.lastMatch()
      expect(useSearchStore.getState().currentMatchIndex).toBe(1)
    })

    it('should reset all state', () => {
      const store = useSearchStore.getState()
      
      store.setQuery('test')
      store.setIsRegex(true)
      store.setCaseSensitive(true)
      store.setMatches([{ lineIndex: 0, leftLineNo: 1, rightLineNo: 1, content: 'a', matchStart: 0, matchEnd: 1, side: 'both' }])
      
      store.reset()
      
      const state = useSearchStore.getState()
      expect(state.query).toBe('')
      expect(state.isRegex).toBe(false)
      expect(state.caseSensitive).toBe(false)
      expect(state.matches).toEqual([])
      expect(state.currentMatchIndex).toBe(-1)
    })

    it('should update highlighted line when setting current match index', () => {
      const store = useSearchStore.getState()
      const matches: SearchMatch[] = [
        { 
          lineIndex: 5, 
          leftLineNo: 6, 
          rightLineNo: 6, 
          content: 'test line', 
          matchStart: 0, 
          matchEnd: 4, 
          side: 'both' 
        }
      ]
      
      store.setMatches(matches)
      store.setCurrentMatchIndex(0)
      
      const state = useSearchStore.getState()
      expect(state.highlightedLineIndex).toBe(5)
      expect(state.highlightedRanges).toEqual([{ start: 0, end: 4 }])
    })

    it('should not update index for invalid match index', () => {
      const store = useSearchStore.getState()
      const matches: SearchMatch[] = [
        { lineIndex: 0, leftLineNo: 1, rightLineNo: 1, content: 'a', matchStart: 0, matchEnd: 1, side: 'both' }
      ]
      
      store.setMatches(matches)
      store.setCurrentMatchIndex(0)
      
      store.setCurrentMatchIndex(-1)
      expect(useSearchStore.getState().currentMatchIndex).toBe(0)
      
      store.setCurrentMatchIndex(10)
      expect(useSearchStore.getState().currentMatchIndex).toBe(0)
    })
  })

  describe('Search Pattern Matching', () => {
    it('should perform regex search', () => {
      const searchPattern = /test\d+/gi
      const content = ['test123', 'hello', 'test456', 'world']
      
      const matches: Array<{ line: number; match: string }> = []
      
      content.forEach((line, index) => {
        const lineMatches = [...line.matchAll(searchPattern)]
        lineMatches.forEach(match => {
          if (match[0]) {
            matches.push({ line: index, match: match[0] })
          }
        })
      })
      
      expect(matches).toHaveLength(2)
      expect(matches[0].match).toBe('test123')
      expect(matches[1].match).toBe('test456')
    })

    it('should perform case-sensitive search', () => {
      const content = ['Test', 'TEST', 'test', 'TeSt']
      const query = 'test'
      
      // Case insensitive
      const insensitiveMatches = content.filter(line => 
        line.toLowerCase().includes(query.toLowerCase())
      )
      expect(insensitiveMatches).toHaveLength(4)
      
      // Case sensitive
      const sensitiveMatches = content.filter(line => 
        line.includes(query)
      )
      expect(sensitiveMatches).toHaveLength(1)
    })

    it('should perform whole word search', () => {
      const content = ['test', 'testing', 'my test', 'testable', 'best test ever']
      const query = 'test'
      
      // Whole word matching using regex
      const wholeWordPattern = new RegExp(`\\b${query}\\b`, 'g')
      const matches = content.filter(line => wholeWordPattern.test(line))
      
      expect(matches).toContain('test')
      expect(matches).toContain('my test')
      expect(matches).toContain('best test ever')
      expect(matches).not.toContain('testing')
      expect(matches).not.toContain('testable')
    })
  })
})
