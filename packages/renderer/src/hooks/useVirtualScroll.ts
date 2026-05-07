/**
 * useVirtualScroll Hook
 * 虚拟滚动 Hook，用于优化大量条目的渲染性能
 * 
 * 增强版：支持对象池和 WeakMap 缓存（参考设计文档 §4.2.3 内存优化）
 */
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// ============================================
// 对象池实现 - 用于复用虚拟滚动项目
// ============================================
class VirtualItemPool {
  private pool: Array<{ item: unknown; index: number; style: React.CSSProperties }> = [];
  private maxSize = 100;

  acquire(): { item: unknown; index: number; style: React.CSSProperties } {
    if (this.pool.length > 0) {
      const item = this.pool.pop()!;
      return item;
    }
    return {
      item: null,
      index: 0,
      style: { position: 'absolute', top: 0, height: 0, left: 0, right: 0 }
    };
  }

  release(item: { item: unknown; index: number; style: React.CSSProperties }): void {
    if (this.pool.length < this.maxSize) {
      item.item = null;
      this.pool.push(item);
    }
  }

  releaseMany(items: Array<{ item: unknown; index: number; style: React.CSSProperties }>): void {
    for (const item of items) {
      this.release(item);
    }
  }
}

const virtualItemPool = new VirtualItemPool();

// ============================================
// 配置选项
// ============================================
export interface VirtualScrollConfig {
  /** 每项高度（像素） */
  itemHeight: number;
  /** 额外渲染数量（上下缓冲区） */
  overscan: number;
  /** 容器高度（像素），0 表示自动计算 */
  containerHeight: number;
  /** 是否启用对象池（默认 true） */
  usePool?: boolean;
  /** 是否启用样式缓存（默认 true） */
  useStyleCache?: boolean;
}

// ============================================
// 返回值
// ============================================
export interface VirtualScrollResult<T> {
  /** 可见条目 */
  visibleItems: Array<{ item: T; index: number; style: React.CSSProperties }>;
  /** 总高度 */
  totalHeight: number;
  /** 容器 ref */
  containerRef: React.RefObject<HTMLDivElement>;
  /** 滚动处理函数 */
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  /** 滚动到指定索引 */
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
  /** 当前滚动位置 */
  scrollTop: number;
}

// ============================================
// Hook 实现
// ============================================
export function useVirtualScroll<T>(
  items: T[],
  config: VirtualScrollConfig
): VirtualScrollResult<T> {
  const {
    itemHeight,
    overscan,
    containerHeight: initialContainerHeight,
    usePool = true,
    useStyleCache = true
  } = config;

  // 容器 ref
  const containerRef = useRef<HTMLDivElement>(null);

  // 滚动位置
  const [scrollTop, setScrollTop] = useState(0);

  // 实际容器高度（支持动态计算）
  const [containerHeight, setContainerHeight] = useState(initialContainerHeight || 0);

  // 之前的可见项，用于对象池回收
  const prevVisibleItemsRef = useRef<Array<{ item: T; index: number; style: React.CSSProperties }>>([]);

  // 使用 ResizeObserver 监听容器高度变化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 如果配置了固定高度，不需要监听
    if (initialContainerHeight > 0) {
      setContainerHeight(initialContainerHeight);
      return;
    }

    // 动态计算容器高度
    const updateHeight = () => {
      if (container.parentElement) {
        setContainerHeight(container.parentElement.clientHeight);
      }
    };

    // 初始计算
    updateHeight();

    // 使用 ResizeObserver 监听尺寸变化
    const resizeObserver = new ResizeObserver(updateHeight);
    if (container.parentElement) {
      resizeObserver.observe(container.parentElement);
    }

    // 监听窗口 resize
    window.addEventListener('resize', updateHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [initialContainerHeight]);

  // 总高度
  const totalHeight = useMemo(() => {
    return items.length * itemHeight;
  }, [items.length, itemHeight]);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    if (containerHeight <= 0) {
      return { start: 0, end: Math.min(overscan * 2, items.length) };
    }

    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);

    const startIndex = Math.max(0, start - overscan);
    const endIndex = Math.min(items.length, start + visibleCount + overscan);

    return { start: startIndex, end: endIndex };
  }, [scrollTop, containerHeight, itemHeight, overscan, items.length]);

  // 获取或创建样式（按 index 缓存，避免同一 item 位置变化时修改只读对象）
  const styleByIndex = useRef<Map<number, React.CSSProperties>>(new Map());
  const prevItemHeightRef = useRef(itemHeight);
  if (prevItemHeightRef.current !== itemHeight) {
    styleByIndex.current.clear();
    prevItemHeightRef.current = itemHeight;
  }

  const getOrCreateStyle = useCallback((_item: T, index: number): React.CSSProperties => {
    if (useStyleCache) {
      const cached = styleByIndex.current.get(index);
      if (cached) {
        // 直接返回缓存，top 不变（index 相同则 top 相同）
        return cached;
      }
      const style: React.CSSProperties = {
        position: 'absolute',
        top: index * itemHeight,
        height: itemHeight,
        left: 0,
        right: 0
      };
      styleByIndex.current.set(index, style);
      return style;
    }

    return {
      position: 'absolute',
      top: index * itemHeight,
      height: itemHeight,
      left: 0,
      right: 0
    };
  }, [itemHeight, useStyleCache]);

  // 可见条目 - 使用对象池
  const visibleItems = useMemo(() => {
    const { start, end } = visibleRange;

    // 回收旧的可见项到对象池
    if (usePool && prevVisibleItemsRef.current.length > 0) {
      virtualItemPool.releaseMany(prevVisibleItemsRef.current as Array<{ item: unknown; index: number; style: React.CSSProperties }>);
    }

    const result: Array<{ item: T; index: number; style: React.CSSProperties }> = [];

    for (let i = start; i < end; i++) {
      const item = items[i];
      const style = getOrCreateStyle(item, i);

      if (usePool) {
        const pooledItem = virtualItemPool.acquire() as { item: T; index: number; style: React.CSSProperties };
        pooledItem.item = item;
        pooledItem.index = i;
        pooledItem.style = style;
        result.push(pooledItem);
      } else {
        result.push({ item, index: i, style });
      }
    }

    // 保存引用以便下次回收
    prevVisibleItemsRef.current = result;

    return result;
  }, [visibleRange, items, getOrCreateStyle, usePool]);

  // 滚动处理
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // 滚动到指定索引
  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const container = containerRef.current?.parentElement;
    if (!container) return;

    const targetScrollTop = index * itemHeight;
    container.scrollTo({
      top: targetScrollTop,
      behavior
    });
  }, [itemHeight]);

  return {
    visibleItems,
    totalHeight,
    containerRef,
    handleScroll,
    scrollToIndex,
    scrollTop
  };
}

// ============================================
// 变体：可变高度虚拟滚动
// ============================================
export interface VariableHeightItem {
  id: string;
  height: number;
}

export interface VariableVirtualScrollConfig {
  overscan: number;
  containerHeight: number;
  estimateHeight: number;
}

export interface VariableVirtualScrollResult<T extends VariableHeightItem> {
  visibleItems: Array<{ item: T; index: number; style: React.CSSProperties }>;
  totalHeight: number;
  containerRef: React.RefObject<HTMLDivElement>;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  scrollToIndex: (index: number) => void;
  measureItem: (index: number, height: number) => void;
}

export function useVariableVirtualScroll<T extends VariableHeightItem>(
  items: T[],
  config: VariableVirtualScrollConfig
): VariableVirtualScrollResult<T> {
  const { overscan, containerHeight, estimateHeight } = config;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [measuredHeights, setMeasuredHeights] = useState<Map<number, number>>(new Map());

  // 获取项目高度
  const getItemHeight = useCallback((index: number) => {
    return measuredHeights.get(index) || items[index]?.height || estimateHeight;
  }, [measuredHeights, items, estimateHeight]);

  // 计算项目位置
  const itemPositions = useMemo(() => {
    const positions: number[] = [];
    let currentPosition = 0;

    for (let i = 0; i < items.length; i++) {
      positions.push(currentPosition);
      currentPosition += getItemHeight(i);
    }

    return positions;
  }, [items.length, getItemHeight]);

  // 总高度
  const totalHeight = useMemo(() => {
    if (items.length === 0) return 0;
    const lastPosition = itemPositions[items.length - 1] || 0;
    const lastHeight = getItemHeight(items.length - 1);
    return lastPosition + lastHeight;
  }, [itemPositions, items.length, getItemHeight]);

  // 查找可见范围
  const visibleRange = useMemo(() => {
    if (containerHeight <= 0) {
      return { start: 0, end: Math.min(overscan * 2, items.length) };
    }

    // 二分查找找到起始索引
    let start = 0;
    let end = items.length;
    while (start < end) {
      const mid = Math.floor((start + end) / 2);
      if (itemPositions[mid] < scrollTop) {
        start = mid + 1;
      } else {
        end = mid;
      }
    }
    const startIndex = Math.max(0, start - overscan);

    // 找到结束索引
    const viewportBottom = scrollTop + containerHeight;
    end = start;
    while (end < items.length && itemPositions[end] < viewportBottom) {
      end++;
    }
    const endIndex = Math.min(items.length, end + overscan);

    return { start: startIndex, end: endIndex };
  }, [scrollTop, containerHeight, itemPositions, items.length, overscan]);

  // 可见条目
  const visibleItems = useMemo(() => {
    const { start, end } = visibleRange;
    const result: Array<{ item: T; index: number; style: React.CSSProperties }> = [];

    for (let i = start; i < end; i++) {
      const height = getItemHeight(i);
      result.push({
        item: items[i],
        index: i,
        style: {
          position: 'absolute',
          top: itemPositions[i],
          height,
          left: 0,
          right: 0
        }
      });
    }

    return result;
  }, [visibleRange, items, itemPositions, getItemHeight]);

  // 滚动处理
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // 滚动到指定索引
  const scrollToIndex = useCallback((index: number) => {
    const container = containerRef.current?.parentElement;
    if (!container || index < 0 || index >= items.length) return;

    container.scrollTo({
      top: itemPositions[index],
      behavior: 'smooth'
    });
  }, [itemPositions, items.length]);

  // 测量项目高度
  const measureItem = useCallback((index: number, height: number) => {
    setMeasuredHeights(prev => {
      if (prev.get(index) === height) return prev;
      const next = new Map(prev);
      next.set(index, height);
      return next;
    });
  }, []);

  return {
    visibleItems,
    totalHeight,
    containerRef,
    handleScroll,
    scrollToIndex,
    measureItem
  };
}

export default useVirtualScroll;
