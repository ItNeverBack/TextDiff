import { useState, useCallback } from 'react'

interface UseTreeExpandReturn {
  expandedPaths: Set<string>
  toggleExpand: (path: string) => void
  setExpanded: (path: string, expanded: boolean) => void
  expandAll: (paths: string[]) => void
  collapseAll: () => void
  isExpanded: (path: string) => boolean
}

/**
 * useTreeExpand - 树展开/折叠状态管理 Hook
 * 
 * 管理目录树中节点的展开/折叠状态
 * 
 * 参考: TextDiff-DevPlan.md §Week 10.2 独立 Hook
 */
export function useTreeExpand(): UseTreeExpandReturn {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())

  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const setExpanded = useCallback((path: string, expanded: boolean) => {
    setExpandedPaths(prev => {
      const next = new Set(prev)
      if (expanded) {
        next.add(path)
      } else {
        next.delete(path)
      }
      return next
    })
  }, [])

  const expandAll = useCallback((paths: string[]) => {
    setExpandedPaths(new Set(paths))
  }, [])

  const collapseAll = useCallback(() => {
    setExpandedPaths(new Set())
  }, [])

  const isExpanded = useCallback((path: string) => {
    return expandedPaths.has(path)
  }, [expandedPaths])

  return {
    expandedPaths,
    toggleExpand,
    setExpanded,
    expandAll,
    collapseAll,
    isExpanded
  }
}
