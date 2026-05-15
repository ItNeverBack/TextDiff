import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InlineDiff } from '../components/InlineDiff'
import type { InlineDiff as InlineDiffType } from '@shared/types/diff.types'

describe('InlineDiff', () => {
  it('should render equal parts without highlighting', () => {
    const diffs: InlineDiffType[] = [
      { type: 'equal', value: 'hello world' },
    ]
    
    render(<InlineDiff diffs={diffs} />)
    
    expect(screen.getByText('hello world')).toBeInTheDocument()
  })

  it('should render delete parts with red background', () => {
    const diffs: InlineDiffType[] = [
      { type: 'delete', value: 'deleted' },
    ]
    
    const { container } = render(<InlineDiff diffs={diffs} />)
    
    const deleteElem = container.querySelector('.inline-diff-delete')
    expect(deleteElem).toBeInTheDocument()
    expect(screen.getByText('deleted')).toBeInTheDocument()
  })

  it('should render insert parts with green background', () => {
    const diffs: InlineDiffType[] = [
      { type: 'insert', value: 'inserted' },
    ]
    
    const { container } = render(<InlineDiff diffs={diffs} />)
    
    const insertElem = container.querySelector('.inline-diff-insert')
    expect(insertElem).toBeInTheDocument()
    expect(screen.getByText('inserted')).toBeInTheDocument()
  })

  it('should render mixed diff parts', () => {
    const diffs: InlineDiffType[] = [
      { type: 'equal', value: 'prefix ' },
      { type: 'delete', value: 'old' },
      { type: 'insert', value: 'new' },
      { type: 'equal', value: ' suffix' },
    ]
    
    render(<InlineDiff diffs={diffs} />)
    
    expect(screen.getByText('prefix')).toBeInTheDocument()
    expect(screen.getByText('old')).toBeInTheDocument()
    expect(screen.getByText('new')).toBeInTheDocument()
    expect(screen.getByText('suffix')).toBeInTheDocument()
  })

  it('should handle empty diffs array', () => {
    const { container } = render(<InlineDiff diffs={[]} />)
    
    expect(container.querySelector('.inline-diff')).toBeInTheDocument()
  })

  it('should handle special characters', () => {
    const diffs: InlineDiffType[] = [
      { type: 'equal', value: '<script>alert("xss")' },
    ]
    
    render(<InlineDiff diffs={diffs} />)
    
    // Should be escaped, not rendered as HTML
    const content = screen.getByText(/\u003cscript\u003e/)
    expect(content).toBeInTheDocument()
  })

  it('should handle whitespace', () => {
    const diffs: InlineDiffType[] = [
      { type: 'equal', value: '  spaces  ' },
    ]
    
    const { container } = render(<InlineDiff diffs={diffs} showWhitespace={true} />)
    
    const whitespaceElems = container.querySelectorAll('.whitespace-char')
    expect(whitespaceElems.length).toBeGreaterThan(0)
  })

  it('should apply custom className', () => {
    const diffs: InlineDiffType[] = [
      { type: 'equal', value: 'test' },
    ]
    
    const { container } = render(<InlineDiff diffs={diffs} className="custom-class" />)
    
    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('should handle Unicode characters', () => {
    const diffs: InlineDiffType[] = [
      { type: 'equal', value: '你好世界 🎉' },
    ]
    
    render(<InlineDiff diffs={diffs} />)
    
    expect(screen.getByText('你好世界 🎉')).toBeInTheDocument()
  })

  it('should handle very long content', () => {
    const diffs: InlineDiffType[] = [
      { type: 'equal', value: 'a'.repeat(1000) },
    ]
    
    const { container } = render(<InlineDiff diffs={diffs} maxLength={100} />)
    
    // Should truncate
    const content = container.textContent
    expect(content!.length).toBeLessThanOrEqual(100)
  })

  it('should render with correct styling for each type', () => {
    const diffs: InlineDiffType[] = [
      { type: 'equal', value: 'E' },
      { type: 'delete', value: 'D' },
      { type: 'insert', value: 'I' },
    ]
    
    const { container } = render(<InlineDiff diffs={diffs} />)
    
    expect(container.querySelector('.inline-diff-equal')).toBeInTheDocument()
    expect(container.querySelector('.inline-diff-delete')).toBeInTheDocument()
    expect(container.querySelector('.inline-diff-insert')).toBeInTheDocument()
  })

  it('should handle null or undefined values gracefully', () => {
    const diffs: InlineDiffType[] = [
      { type: 'equal', value: null as unknown as string },
      { type: 'insert', value: undefined as unknown as string },
    ]
    
    const { container } = render(<InlineDiff diffs={diffs} />)
    
    expect(container.querySelector('.inline-diff')).toBeInTheDocument()
  })
})
