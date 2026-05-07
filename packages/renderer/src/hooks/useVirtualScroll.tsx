/**
 * useVirtualScroll Hook
 * 虚拟滚动Hook，用于优化大量数据的渲染性能
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';

// ============================================
// 虚拟滚动配置
// ============================================
export interface VirtualScrollConfig {
  /** 每项高度（像素） */
  itemHeight: number;
  /** 额外渲染数量（上下缓冲区） */
  overscan: number;
  /** 容器高度（像素） */
  containerHeight: number;
}

// ============================================
// 虚拟滚动结果
// ============================================
export interface VirtualScrollResult<T> {
  /** 当前可见的条目 */
  visibleItems: Array<{
    item: T;
    index: number;
    style: React.CSSProperties;
  }>;
  /** 总高度 */
  totalHeight: number;
  /** 滚动位置 */
  scrollTop: number;
  /** 设置滚动位置 */
  setScrollTop: (scrollTop: number) => void;
  /** 滚动到指定索引 */
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
  /** 滚动到顶部 */
  scrollToTop: (behavior?: ScrollBehavior) => void;
  /** 滚动到底部 */
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  /** 可见范围起始索引 */
  startIndex: number;
  /** 可见范围结束索引 */
  endIndex: number;
  /** 容器ref */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** 处理滚动事件 */
  handleScroll: (event: React.UIEvent<HTMLDivElement>) => void;
}

// ============================================
// useVirtualScroll Hook
// ============================================
export function useVirtualScroll<T>(
  items: T[],
  config: Partial<VirtualScrollConfig> = {}
): VirtualScrollResult<T> {
  const {
    itemHeight = 28,
    overscan = 5,
    containerHeight: initialContainerHeight = 400
  } = config;

  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(initialContainerHeight);
  const containerRef = useRef<HTMLDivElement>(null);

  // 使用 ResizeObserver 监听容器高度变化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };

    // 初始更新
    updateHeight();

    // 创建 ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 计算总高度
  const totalHeight = useMemo(() => {
    return items.length * itemHeight;
  }, [items.length, itemHeight]);

  // 计算可见范围
  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    // 计算起始索引（考虑overscan）
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);

    // 计算可见数量
    const visibleCount = Math.ceil(containerHeight / itemHeight);

    // 计算结束索引（考虑overscan）
    const end = Math.min(items.length, start + visibleCount + overscan * 2);

    // 生成可见项
    const items_slice = items.slice(start, end).map((item, idx) => ({
      item,
      index: start + idx,
      style: {
        position: 'absolute' as const,
        top: (start + idx) * itemHeight,
        left: 0,
        right: 0,
        height: itemHeight
      }
    }));

    return {
      startIndex: start,
      endIndex: end,
      visibleItems: items_slice
    };
  }, [items, scrollTop, itemHeight, overscan, containerHeight]);

  // 处理滚动事件
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  // 滚动到指定索引
  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const container = containerRef.current;
    if (!container) return;

    const targetScrollTop = index * itemHeight;
    container.scrollTo({
      top: targetScrollTop,
      behavior
    });
  }, [itemHeight]);

  // 滚动到顶部
  const scrollToTop = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({
      top: 0,
      behavior
    });
  }, []);

  // 滚动到底部
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({
      top: totalHeight,
      behavior
    });
  }, [totalHeight]);

  return {
    visibleItems,
    totalHeight,
    scrollTop,
    setScrollTop,
    scrollToIndex,
    scrollToTop,
    scrollToBottom,
    startIndex,
    endIndex,
    containerRef,
    handleScroll
  };
}

// ============================================
// 使用虚拟滚动的辅助 Hook
// ============================================
export interface UseVirtualListOptions<T> extends Partial<VirtualScrollConfig> {
  /** 数据项 */
  items: T[];
  /** 渲染函数 */
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  /** 唯一键函数 */
  keyExtractor: (item: T, index: number) => string;
  /** 类名 */
  className?: string;
}

/**
 * 更简单的虚拟列表 Hook
 * 直接返回渲染所需的 props
 */
export function useVirtualList<T>(options: UseVirtualListOptions<T>) {
  const {
    items,
    renderItem,
    keyExtractor,
    itemHeight = 28,
    overscan = 5,
    containerHeight = 400,
    className
  } = options;

  const virtualScroll = useVirtualScroll(items, {
    itemHeight,
    overscan,
    containerHeight
  });

  const { visibleItems, totalHeight, containerRef, handleScroll } = virtualScroll;

  // 渲染虚拟列表
  const virtualListProps = useMemo(() => ({
    ref: containerRef,
    className,
    onScroll: handleScroll,
    style: {
      overflow: 'auto',
      height: '100%'
    } as React.CSSProperties
  }), [containerRef, handleScroll, className]);

  // 内容包装器
  const contentProps = useMemo(() => ({
    style: {
      position: 'relative' as const,
      height: totalHeight
    }
  }), [totalHeight]);

  // 渲染的节点
  const renderedItems = useMemo(() => {
    return visibleItems.map(({ item, index, style }) => (
      <div key={keyExtractor(item, index)} style={style}>
        {renderItem(item, index, style)}
      </div>
    ));
  }, [visibleItems, renderItem, keyExtractor]);

  return {
    virtualScroll,
    virtualListProps,
    contentProps,
    renderedItems,
    containerRef
  };
}

// ============================================
// 动态高度虚拟滚动 Hook（实验性）
// ============================================
export interface DynamicVirtualScrollConfig {
  /** 估计的每项高度 */
  estimatedItemHeight: number;
  /** 额外渲染数量 */
  overscan: number;
  /** 容器高度 */
  containerHeight: number;
}

/**
 * 动态高度虚拟滚动 Hook
 * 用于每项高度不固定的情况
 */
export function useDynamicVirtualScroll<T>(
  items: T[],
  config: Partial<DynamicVirtualScrollConfig> = {}
) {
  const {
    estimatedItemHeight = 28,
    overscan = 5,
    containerHeight: initialContainerHeight = 400
  } = config;

  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(initialContainerHeight);
  const [measuredHeights, setMeasuredHeights] = useState<Map<number, number>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // 监听容器高度变化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // 测量项目高度
  const measureItem = useCallback((index: number) => {
    const element = itemRefs.current.get(index);
    if (element) {
      const height = element.getBoundingClientRect().height;
      setMeasuredHeights(prev => {
        const next = new Map(prev);
        next.set(index, height);
        return next;
      });
      return height;
    }
    return measuredHeights.get(index) || estimatedItemHeight;
  }, [estimatedItemHeight, measuredHeights]);

  // 计算项目位置
  const getItemPosition = useCallback((index: number) => {
    let position = 0;
    for (let i = 0; i < index; i++) {
      position += measuredHeights.get(i) || estimatedItemHeight;
    }
    return position;
  }, [measuredHeights, estimatedItemHeight]);

  // 计算总高度
  const totalHeight = useMemo(() => {
    let height = 0;
    for (let i = 0; i < items.length; i++) {
      height += measuredHeights.get(i) || estimatedItemHeight;
    }
    return height;
  }, [items.length, measuredHeights, estimatedItemHeight]);

  // 查找起始索引
  const findStartIndex = useCallback(() => {
    let position = 0;
    for (let i = 0; i < items.length; i++) {
      const height = measuredHeights.get(i) || estimatedItemHeight;
      if (position + height > scrollTop) {
        return Math.max(0, i - overscan);
      }
      position += height;
    }
    return 0;
  }, [items.length, scrollTop, measuredHeights, estimatedItemHeight, overscan]);

  // 计算可见范围
  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    const start = findStartIndex();
    let position = getItemPosition(start);
    const visibleCount = Math.ceil(containerHeight / estimatedItemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);

    const items_slice = items.slice(start, end).map((item, idx) => {
      const index = start + idx;
      const itemPosition = getItemPosition(index);
      const height = measuredHeights.get(index) || estimatedItemHeight;

      return {
        item,
        index,
        style: {
          position: 'absolute' as const,
          top: itemPosition,
          left: 0,
          right: 0,
          height: height || 'auto'
        },
        ref: (el: HTMLDivElement | null) => {
          if (el) {
            itemRefs.current.set(index, el);
          }
        },
        measure: () => measureItem(index)
      };
    });

    return {
      startIndex: start,
      endIndex: end,
      visibleItems: items_slice
    };
  }, [items, findStartIndex, getItemPosition, measureItem, containerHeight, estimatedItemHeight, overscan, measuredHeights]);

  // 处理滚动
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    scrollTop,
    setScrollTop,
    startIndex,
    endIndex,
    containerRef,
    handleScroll,
    measureItem,
    measuredHeights
  };
}

export default useVirtualScroll;
