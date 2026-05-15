import { describe, it, expect, beforeEach } from 'vitest'
import { useSearchStore } from '../search.store'

describe('useSearchStore', () => {
  beforeEach(() => {
    useSearchStore.setState(useSearchStore.getInitialState())
  })

  it('should have correct initial state', () => {
    const state = useSearchStore.getState()
    expect(state.query).toBe('')
    expect(state.results).toEqual([])
    expect(state.currentMatchIndex).toBe(-1)
    expect(state.isRegex).toBe(false)
    expect(state.caseSensitive).toBe(false)
    expect(state.isOpen).toBe(false)
  })

  it('should set query', () => {
    useSearchStore.getState().setQuery('test')
    expect(useSearchStore.getState().query).toBe('test')
  })

  it('should set results', () => {
    const results = [{ line: 1, content: 'test' }, { line: 5, content: 'hello' }]
    useSearchStore.getState().setResults(results)
    expect(useSearchStore.getState().results).toEqual(results)
  })

  it('should set current match index', () => {
    useSearchStore.getState().setCurrentMatchIndex(2)
    expect(useSearchStore.getState().currentMatchIndex).toBe(2)
  })

  it('should toggle regex mode', () => {
    const initial = useSearchStore.getState().isRegex
    useSearchStore.getState().toggleRegex()
    expect(useSearchStore.getState().isRegex).toBe(!initial)
  })

  it('should toggle case sensitive', () => {
    const initial = useSearchStore.getState().caseSensitive
    useSearchStore.getState().toggleCaseSensitive()
    expect(useSearchStore.getState().caseSensitive).toBe(!initial)
  })

  it('should open search', () => {
    useSearchStore.getState().openSearch()
    expect(useSearchStore.getState().isOpen).toBe(true)
  })

  it('should close search', () => {
    useSearchStore.getState().openSearch()
    useSearchStore.getState().closeSearch()
    expect(useSearchStore.getState().isOpen).toBe(false)
  })

  it('should toggle search', () => {
    useSearchStore.getState().toggleSearch()
    expect(useSearchStore.getState().isOpen).toBe(true)
    useSearchStore.getState().toggleSearch()
    expect(useSearchStore.getState().isOpen).toBe(false)
  })

  it('should go to next match', () => {
    const results = [{ line: 1, content: 'a' }, { line: 2, content: 'b' }, { line: 3, content: 'c' }]
    useSearchStore.getState().setResults(results)
    useSearchStore.getState().setCurrentMatchIndex(0)
    
    useSearchStore.getState().nextMatch()
    expect(useSearchStore.getState().currentMatchIndex).toBe(1)
  })

  it('should go to previous match', () => {
    const results = [{ line: 1, content: 'a' }, { line: 2, content: 'b' }, { line: 3, content: 'c' }]
    useSearchStore.getState().setResults(results)
    useSearchStore.getState().setCurrentMatchIndex(1)
    
    useSearchStore.getState().previousMatch()
    expect(useSearchStore.getState().currentMatchIndex).toBe(0)
  })

  it('should cycle to first match when going next from last', () => {
    const results = [{ line: 1, content: 'a' }, { line: 2, content: 'b' }]
    useSearchStore.getState().setResults(results)
    useSearchStore.getState().setCurrentMatchIndex(1)
    
    useSearchStore.getState().nextMatch()
    expect(useSearchStore.getState().currentMatchIndex).toBe(0)
  })

  it('should cycle to last match when going previous from first', () => {
    const results = [{ line: 1, content: 'a' }, { line: 2, content: 'b' }]
    useSearchStore.getState().setResults(results)
    useSearchStore.getState().setCurrentMatchIndex(0)
    
    useSearchStore.getState().previousMatch()
    expect(useSearchStore.getState().currentMatchIndex).toBe(1)
  })

  it('should clear search', () => {
    useSearchStore.getState().setQuery('test')
    useSearchStore.getState().setResults([{ line: 1, content: 'test' }])
    useSearchStore.getState().setCurrentMatchIndex(0)
    
    useSearchStore.getState().clearSearch()
    
    expect(useSearchStore.getState().query).toBe('')
    expect(useSearchStore.getState().results).toEqual([])
    expect(useSearchStore.getState().currentMatchIndex).toBe(-1)
  })

  it('should get match count', () => {
    const results = [{ line: 1, content: 'a' }, { line: 2, content: 'b' }]
    useSearchStore.getState().setResults(results)
    expect(useSearchStore.getState().getMatchCount()).toBe(2)
  })

  it('should return 0 for empty results', () => {
    expect(useSearchStore.getState().getMatchCount()).toBe(0)
  })

  it('should check if has next match', () => {
    const results = [{ line: 1, content: 'a' }, { line: 2, content: 'b' }]
    useSearchStore.getState().setResults(results)
    useSearchStore.getState().setCurrentMatchIndex(0)
    
    expect(useSearchStore.getState().hasNextMatch()).toBe(true)
    
    useSearchStore.getState().setCurrentMatchIndex(1)
    expect(useSearchStore.getState().hasNextMatch()).toBe(false)
  })

  it('should check if has previous match', () => {
    const results = [{ line: 1, content: 'a' }, { line: 2, content: 'b' }]
    useSearchStore.getState().setResults(results)
    useSearchStore.getState().setCurrentMatchIndex(1)
    
    expect(useSearchStore.getState().hasPreviousMatch()).toBe(true)
    
    useSearchStore.getState().setCurrentMatchIndex(0)
    expect(useSearchStore.getState().hasPreviousMatch()).toBe(false)
  })
})
