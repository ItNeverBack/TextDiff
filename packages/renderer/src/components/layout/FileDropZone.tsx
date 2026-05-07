import type { ReactNode } from 'react'

interface FileDropZoneProps {
  children: ReactNode
}

/**
 * FileDropZone - 全局拖拽容器（已禁用全局遮罩）
 * 
 * 拖拽功能已移至具体组件：
 * - 首页：WelcomeView 的左右 SideView 组件
 * - 对比界面：FileInfoBar 的左右文件信息区域
 */
export function FileDropZone({ children }: FileDropZoneProps) {
  // 全局拖拽遮罩已移除，拖拽功能由具体组件独立处理
  return <>{children}</>
}
