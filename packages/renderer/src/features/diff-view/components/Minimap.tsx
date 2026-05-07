import { useRef, useEffect, useCallback } from 'react'
import type { DiffLine } from '@shared/types'
import { useTheme } from '../../theme'

interface MinimapProps {
  lines: DiffLine[]
  height?: number
  scrollPosition?: number
  viewportHeight?: number
  scrollHeight?: number
  onScrollTo?: (ratio: number) => void
}

interface MinimapColors {
  equal: string
  insert: string
  delete: string
  replace: string
}

function getMinimapColors(): MinimapColors {
  const root = getComputedStyle(document.documentElement)
  return {
    equal: root.getPropertyValue('--diff-equal-line').trim() || '#e9ecef',
    insert: root.getPropertyValue('--diff-added-line').trim() || '#acf2bd',
    delete: root.getPropertyValue('--diff-deleted-line').trim() || '#fdb8c0',
    replace: root.getPropertyValue('--diff-modified-line').trim() || '#ffdf5d'
  }
}

export function Minimap({ lines, height, scrollPosition = 0, viewportHeight = 0, scrollHeight = 0, onScrollTo }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { resolvedTheme } = useTheme()

  const drawMinimap = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || lines.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const containerHeight = canvas.parentElement?.clientHeight || 200
    const minimapHeight = height || containerHeight

    canvas.height = minimapHeight
    canvas.width = 32

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 从 CSS 变量获取颜色，确保与主题系统一致
    const themeColors = getMinimapColors()
    const scale = Math.max(1, Math.floor(minimapHeight / lines.length))

    // 绘制差异行
    lines.forEach((line, idx) => {
      const y = idx * scale
      const h = Math.max(1, scale - 0.5)

      ctx.fillStyle = themeColors[line.type as keyof typeof themeColors] || themeColors.equal
      ctx.fillRect(4, y, 20, h)
    })

    // §2.7.4 绘制可视区域高亮
    if (viewportHeight > 0 && scrollHeight > 0) {
      const viewportRatio = Math.min(1, viewportHeight / scrollHeight)
      const viewportHeightOnMinimap = Math.max(20, minimapHeight * viewportRatio)
      // 使用 scrollHeight 计算准确的滚动比例
      const scrollRatio = Math.min(1, Math.max(0, scrollPosition / (scrollHeight - viewportHeight)))
      const viewportY = scrollRatio * (minimapHeight - viewportHeightOnMinimap)

      // 绘制视口边框
      ctx.strokeStyle = resolvedTheme === 'dark' ? '#ffffff' : '#000000'
      ctx.lineWidth = 1
      ctx.strokeRect(2, viewportY, 24, viewportHeightOnMinimap)

      // 填充半透明背景
      ctx.fillStyle = resolvedTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
      ctx.fillRect(2, viewportY, 24, viewportHeightOnMinimap)
    }
  }, [lines, height, resolvedTheme, scrollPosition, viewportHeight, scrollHeight])

  useEffect(() => {
    drawMinimap()
  }, [drawMinimap])

  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !onScrollTo) return

    const rect = canvas.getBoundingClientRect()
    const y = event.clientY - rect.top
    const ratio = y / canvas.height

    onScrollTo(Math.max(0, Math.min(1, ratio)))
  }, [onScrollTo])

  return (
    <div className="diff-minimap">
      <canvas
        ref={canvasRef}
        width={32}
        onClick={handleClick}
        style={{ cursor: onScrollTo ? 'pointer' : 'default' }}
      />
    </div>
  )
}
