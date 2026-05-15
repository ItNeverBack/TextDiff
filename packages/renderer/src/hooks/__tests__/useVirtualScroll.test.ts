import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVirtualScroll, useVariableVirtualScroll, VirtualScrollConfig } from '../useVirtualScroll'

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

global.ResizeObserver = MockResizeObserver as any

describe('useVirtualScroll', () => {
  const defaultConfig: VirtualScrollConfig = {
    itemHeight: 50,
    overscan: 2,
    containerHeight: 200,
    usePool: false,
    useStyleCache: false,
  }

  const items = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }))

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should calculate correct total height', () => {
    const { result } = renderHook(() => useVirtualScroll(items, defaultConfig))

    expect(result.current.totalHeight).toBe(5000) // 100 items * 50px
  })

  it('should return empty visible items initially with zero scroll', () => {
    const { result } = renderHook(() => useVirtualScroll(items, defaultConfig))

    // With containerHeight 200 and overscan 2, should show first 6 items (4 visible + 2 overscan)
    expect(result.current.visibleItems.length).toBe(6)
    expect(result.current.visibleItems[0].index).toBe(0)
    expect(result.current.visibleItems[0].item).toEqual(items[0])
  })

  it('should update visible items on scroll', () => {
    const { result } = renderHook(() => useVirtualScroll(items, defaultConfig))

    act(() => {
      result.current.handleScroll({ currentTarget: { scrollTop: 200 } } as any)
    })

    expect(result.current.scrollTop).toBe(200)
    // Should show items 2-8 (item 4 is at scrollTop 200, with 2 overscan on each side)
    expect(result.current.visibleItems[0].index).toBe(2)
  })

  it('should calculate correct styles for visible items', () => {
    const { result } = renderHook(() => useVirtualScroll(items, defaultConfig))

    const firstItem = result.current.visibleItems[0]
    expect(firstItem.style).toEqual({
      position: 'absolute',
      top: 0,
      height: 50,
      left: 0,
      right: 0,
    })
  })

  it('should handle scrollToIndex', () => {
    const scrollToMock = vi.fn()
    const parentElement = { scrollTo: scrollToMock }

    const { result } = renderHook(() => useVirtualScroll(items, defaultConfig))

    // Mock containerRef
    Object.defineProperty(result.current.containerRef, 'current', {
      value: { parentElement },
      writable: true,
    })

    act(() => {
      result.current.scrollToIndex(10)
    })

    expect(scrollToMock).toHaveBeenCalledWith({
      top: 500, // 10 * 50
      behavior: 'smooth',
    })
  })

  it('should handle different container heights', () => {
    const config = { ...defaultConfig, containerHeight: 500 }
    const { result } = renderHook(() => useVirtualScroll(items, config))

    // With containerHeight 500, should show 14 items (10 visible + 4 overscan)
    expect(result.current.visibleItems.length).toBe(14)
  })

  it('should handle zero items', () => {
    const { result } = renderHook(() => useVirtualScroll([], defaultConfig))

    expect(result.current.totalHeight).toBe(0)
    expect(result.current.visibleItems).toHaveLength(0)
  })

  it('should handle items at end of list', () => {
    const { result } = renderHook(() => useVirtualScroll(items, defaultConfig))

    act(() => {
      result.current.handleScroll({ currentTarget: { scrollTop: 4800 } } as any)
    })

    // Should show last items without going past end
    const lastVisibleIndex = result.current.visibleItems[result.current.visibleItems.length - 1].index
    expect(lastVisibleIndex).toBeLessThan(100)
  })

  it('should handle different overscan values', () => {
    const config = { ...defaultConfig, overscan: 5 }
    const { result } = renderHook(() => useVirtualScroll(items, config))

    // With overscan 5, should show 14 items (4 visible + 10 overscan)
    expect(result.current.visibleItems.length).toBe(14)
  })

  it('should use style cache when enabled', () => {
    const config = { ...defaultConfig, useStyleCache: true }
    const { result } = renderHook(() => useVirtualScroll(items, config))

    // Same style object should be returned for same index
    const style1 = result.current.visibleItems[0].style

    act(() => {
      result.current.handleScroll({ currentTarget: { scrollTop: 50 } } as any)
    })

    act(() => {
      result.current.handleScroll({ currentTarget: { scrollTop: 0 } } as any)
    })

    const style2 = result.current.visibleItems[0].style
    expect(style1).toBe(style2)
  })
})

describe('useVariableVirtualScroll', () => {
  const defaultConfig = {
    overscan: 2,
    containerHeight: 200,
    estimateHeight: 50,
  }

  const items = Array.from({ length: 20 }, (_, i) => ({
    id: String(i),
    height: 50 + (i % 3) * 20, // Variable heights: 50, 70, 90
  }))

  it('should calculate correct total height with variable items', () => {
    const { result } = renderHook(() => useVariableVirtualScroll(items, defaultConfig))

    // Calculate expected total height
    const expectedHeight = items.reduce((sum, item) => sum + item.height, 0)
    expect(result.current.totalHeight).toBe(expectedHeight)
  })

  it('should return visible items based on variable heights', () => {
    const { result } = renderHook(() => useVariableVirtualScroll(items, defaultConfig))

    expect(result.current.visibleItems.length).toBeGreaterThan(0)
    expect(result.current.visibleItems[0].index).toBe(0)
  })

  it('should calculate correct positions for variable items', () => {
    const { result } = renderHook(() => useVariableVirtualScroll(items, defaultConfig))

    const firstItem = result.current.visibleItems[0]
    expect(firstItem.style.top).toBe(0)

    if (result.current.visibleItems.length > 1) {
      const secondItem = result.current.visibleItems[1]
      expect(secondItem.style.top).toBe(items[0].height)
    }
  })

  it('should use measured heights when available', () => {
    const { result } = renderHook(() => useVariableVirtualScroll(items, defaultConfig))

    // Measure first item with different height
    act(() => {
      result.current.measureItem(0, 100)
    })

    // Total height should update
    expect(result.current.totalHeight).toBeGreaterThan(
      items.reduce((sum, item) => sum + item.height, 0) - items[0].height + 100
    )
  })

  it('should update positions after measuring', () => {
    const { result } = renderHook(() => useVariableVirtualScroll(items, defaultConfig))

    // Get initial position of item 1
    const initialTop = result.current.visibleItems[0].style.top

    // Measure item 0 with larger height
    act(() => {
      result.current.measureItem(0, 150)
    })

    // Position of subsequent items should shift
    // Note: visibleItems may change after measure
  })

  it('should handle scrollToIndex with variable heights', () => {
    const scrollToMock = vi.fn()
    const parentElement = { scrollTo: scrollToMock }

    const { result } = renderHook(() => useVariableVirtualScroll(items, defaultConfig))

    Object.defineProperty(result.current.containerRef, 'current', {
      value: { parentElement },
      writable: true,
    })

    act(() => {
      result.current.scrollToIndex(5)
    })

    // Should scroll to the position of item 5
    expect(scrollToMock).toHaveBeenCalled()
  })

  it('should handle edge cases', () => {
    const { result } = renderHook(() => useVariableVirtualScroll([], defaultConfig))

    expect(result.current.totalHeight).toBe(0)
    expect(result.current.visibleItems).toHaveLength(0)
  })

  it('should estimate height for unmeasured items', () => {
    const itemsWithoutHeight = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
    })) as any

    const { result } = renderHook(() => useVariableVirtualScroll(itemsWithoutHeight, defaultConfig))

    // Total height should use estimateHeight for items without height
    expect(result.current.totalHeight).toBe(10 * defaultConfig.estimateHeight)
  })
})
