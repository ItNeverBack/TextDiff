import type { InlineDiffSegment } from '@shared/types'

interface InlineDiffProps {
  segments: InlineDiffSegment[]
  className?: string
}

/**
 * 行内差异高亮组件
 * 渲染 InlineDiffSegment[]，对 insert/delete 片段添加高亮
 * 
 * §3.2.2 DiffView 模块 - InlineDiff 组件
 */
export function InlineDiff({ segments, className }: InlineDiffProps) {
  return (
    <span className={className}>
      {segments.map((segment, index) => (
        <span
          key={index}
          className={`inline-${segment.type}`}
        >
          {segment.text}
        </span>
      ))}
    </span>
  )
}

/**
 * 根据原始文本和差异片段生成带高亮的渲染内容
 */
export function renderInlineDiff(
  segments: InlineDiffSegment[],
  options?: {
    equalClass?: string
    insertClass?: string
    deleteClass?: string
  }
): JSX.Element {
  const {
    equalClass = 'inline-equal',
    insertClass = 'inline-insert',
    deleteClass = 'inline-delete'
  } = options || {}

  const classMap: Record<string, string> = {
    equal: equalClass,
    insert: insertClass,
    delete: deleteClass
  }

  return (
    <>
      {segments.map((segment, index) => (
        <span key={index} className={classMap[segment.type]}>
          {segment.text}
        </span>
      ))}
    </>
  )
}
