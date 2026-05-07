import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVirtualScroll, useVariableVirtualScroll } from '../useVirtualScroll';

describe('useVirtualScroll', () => {
  const defaultConfig = {
    itemHeight: 30,
    overscan: 5,
    containerHeight: 300
  };

  const createItems = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ id: i, name: `Item ${i}` }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct default values', () => {
    const items = createItems(100);
    const { result } = renderHook(() =>
      useVirtualScroll(items, defaultConfig)
    );

    expect(result.current.totalHeight).toBe(3000); // 100 * 30
    expect(result.current.scrollTop).toBe(0);
    expect(result.current.containerRef.current).toBeNull();
  });

  it('should calculate visible items correctly', () => {
    const items = createItems(100);
    const { result } = renderHook(() =>
      useVirtualScroll(items, defaultConfig)
    );

    // With containerHeight=300 and itemHeight=30, we can see 10 items
    // Plus overscan of 5 on each side = 20 items
    expect(result.current.visibleItems.length).toBeLessThanOrEqual(20);
  });

  it('should handle scroll events', () => {
    const items = createItems(100);
    const { result } = renderHook(() =>
      useVirtualScroll(items, defaultConfig)
    );

    act(() => {
      result.current.handleScroll({
        currentTarget: { scrollTop: 150 }
      } as React.UIEvent<HTMLDivElement>);
    });

    expect(result.current.scrollTop).toBe(150);
  });

  it('should update visible items on scroll', () => {
    const items = createItems(100);
    const { result } = renderHook(() =>
      useVirtualScroll(items, defaultConfig)
    );

    const initialItems = result.current.visibleItems;

    act(() => {
      result.current.handleScroll({
        currentTarget: { scrollTop: 600 }
      } as React.UIEvent<HTMLDivElement>);
    });

    // After scrolling to 600, we should see different items
    expect(result.current.visibleItems).not.toEqual(initialItems);
  });

  it('should calculate correct item styles', () => {
    const items = createItems(10);
    const { result } = renderHook(() =>
      useVirtualScroll(items, { ...defaultConfig, containerHeight: 0 })
    );

    const firstItem = result.current.visibleItems[0];
    expect(firstItem.style).toEqual({
      position: 'absolute',
      top: 0,
      height: 30,
      left: 0,
      right: 0
    });

    if (result.current.visibleItems.length > 1) {
      const secondItem = result.current.visibleItems[1];
      expect(secondItem.style.top).toBe(30);
    }
  });

  it('should handle empty items array', () => {
    const { result } = renderHook(() =>
      useVirtualScroll([], defaultConfig)
    );

    expect(result.current.totalHeight).toBe(0);
    expect(result.current.visibleItems).toHaveLength(0);
  });

  it('should handle single item', () => {
    const items = createItems(1);
    const { result } = renderHook(() =>
      useVirtualScroll(items, defaultConfig)
    );

    expect(result.current.totalHeight).toBe(30);
    expect(result.current.visibleItems.length).toBeGreaterThanOrEqual(1);
  });

  it('should maintain item index correctness', () => {
    const items = createItems(50);
    const { result } = renderHook(() =>
      useVirtualScroll(items, defaultConfig)
    );

    result.current.visibleItems.forEach((item, idx) => {
      expect(item.index).toBe(item.item.id);
    });

    // Scroll down
    act(() => {
      result.current.handleScroll({
        currentTarget: { scrollTop: 450 }
      } as React.UIEvent<HTMLDivElement>);
    });

    result.current.visibleItems.forEach(item => {
      expect(item.index).toBe(item.item.id);
    });
  });

  it('should not exceed total items when calculating visible range', () => {
    const items = createItems(10);
    const { result } = renderHook(() =>
      useVirtualScroll(items, defaultConfig)
    );

    act(() => {
      result.current.handleScroll({
        currentTarget: { scrollTop: 1000 }
      } as React.UIEvent<HTMLDivElement>);
    });

    const maxIndex = Math.max(...result.current.visibleItems.map(i => i.index));
    expect(maxIndex).toBeLessThan(10);
  });

  describe('scrollToIndex', () => {
    it('should scroll to specified index', () => {
      const items = createItems(100);
      const { result } = renderHook(() =>
        useVirtualScroll(items, defaultConfig)
      );

      const scrollToMock = vi.fn();
      const mockContainer = {
        parentElement: {
          scrollTo: scrollToMock
        }
      };

      // Set the ref manually
      (result.current.containerRef as any).current = mockContainer;

      act(() => {
        result.current.scrollToIndex(10, 'auto');
      });

      expect(scrollToMock).toHaveBeenCalledWith({
        top: 300, // 10 * 30
        behavior: 'auto'
      });
    });
  });
});

describe('useVariableVirtualScroll', () => {
  const defaultConfig = {
    overscan: 5,
    containerHeight: 300,
    estimateHeight: 30
  };

  const createItems = (count: number, height = 30) =>
    Array.from({ length: count }, (_, i) => ({
      id: `item-${i}`,
      height,
      name: `Item ${i}`
    }));

  it('should initialize with correct default values', () => {
    const items = createItems(100);
    const { result } = renderHook(() =>
      useVariableVirtualScroll(items, defaultConfig)
    );

    expect(result.current.totalHeight).toBe(3000); // 100 * 30
    expect(result.current.containerRef.current).toBeNull();
  });

  it('should calculate visible items with variable heights', () => {
    const items = [
      { id: '1', height: 50 },
      { id: '2', height: 30 },
      { id: '3', height: 80 },
      { id: '4', height: 40 }
    ];

    const { result } = renderHook(() =>
      useVariableVirtualScroll(items, { ...defaultConfig, containerHeight: 100 })
    );

    // Should show items that fit in viewport plus overscan
    expect(result.current.visibleItems.length).toBeGreaterThan(0);
  });

  it('should update positions when item heights are measured', () => {
    const items = createItems(10, 30);
    const { result } = renderHook(() =>
      useVariableVirtualScroll(items, defaultConfig)
    );

    const initialHeight = result.current.totalHeight;

    act(() => {
      result.current.measureItem(0, 100); // Make first item taller
    });

    // Total height should increase
    expect(result.current.totalHeight).toBe(initialHeight + 70);
  });

  it('should calculate correct positions for variable heights', () => {
    const items = [
      { id: '1', height: 50 },
      { id: '2', height: 30 },
      { id: '3', height: 80 }
    ];

    const { result } = renderHook(() =>
      useVariableVirtualScroll(items, { ...defaultConfig, containerHeight: 0 })
    );

    const positions = result.current.visibleItems.map(i => i.style.top);
    expect(positions[0]).toBe(0);
    expect(positions[1]).toBe(50);  // After first item (height 50)
    expect(positions[2]).toBe(80);  // After second item (height 30)
  });

  it('should handle empty items array', () => {
    const { result } = renderHook(() =>
      useVariableVirtualScroll([], defaultConfig)
    );

    expect(result.current.totalHeight).toBe(0);
    expect(result.current.visibleItems).toHaveLength(0);
  });
});
