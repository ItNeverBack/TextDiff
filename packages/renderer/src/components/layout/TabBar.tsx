import { useEffect } from 'react'
import { useTabStore, useDiffStore } from '../../stores'

export function TabBar() {
  const { tabs, activeIndex, selectTab, closeTab, addTab } = useTabStore()
  const { setLeftFile, setRightFile, setDiffResult, setViewMode } = useDiffStore()

  // 当活跃标签页变化时，同步 diffStore 状态
  useEffect(() => {
    const activeTab = tabs[activeIndex]
    if (activeTab) {
      setLeftFile(activeTab.leftFile)
      setRightFile(activeTab.rightFile)
      setDiffResult(activeTab.diffResult)
      // 根据标签类型设置视图模式
      if (activeTab.isDirectoryView) {
        setViewMode('directory')
      } else {
        setViewMode('split')
      }
    }
  }, [activeIndex, tabs, setLeftFile, setRightFile, setDiffResult, setViewMode])

  return (
    <div className="tab-bar">
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          className={`tab ${index === activeIndex ? 'active' : ''}`}
          onClick={() => selectTab(index)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          </svg>
          <span className="tab-title">{tab.title}</span>
          {tab.diffResult && (
            <span className="tab-badge">{tab.diffResult.stats.chunkCount}</span>
          )}
          {tabs.length > 1 && (
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation()
                closeTab(index)
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button className="tab-add" onClick={addTab} title="新建对比 (Ctrl+T)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>
    </div>
  )
}
