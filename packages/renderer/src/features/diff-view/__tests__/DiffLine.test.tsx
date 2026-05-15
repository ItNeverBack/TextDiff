import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DiffLine } from '../components/DiffLine'
import type { DiffLine as DiffLineType, InlineDiff } from '@shared/types/diff.types'

describe('DiffLine', () => {
  it('should render equal line without highlighting', () => {
    const line: DiffLineType = {
      type: 'equal',
      leftContent: 'line content',
      rightContent: 'line content',
      leftLineNumber: 1,
      rightLineNumber: 1,
    }
    
    render(<DiffLine line={line} />)
    
    expect(screen.getByText('line content')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('should render insert line with green background', () => {
    const line: DiffLineType = {
      type: 'insert',
      leftContent: '',
      rightContent: 'inserted line',
      leftLineNumber: -1,
      rightLineNumber: 2,
    }
    
    const { container } = render(<DiffLine line={line} />)
    
    const row = container.querySelector('.diff-line-insert')
    expect(row).toBeInTheDocument()
    expect(screen.getByText('inserted line')).toBeInTheDocument()
  })

  it('should render delete line with red background', () => {
    const line: DiffLineType = {
      type: 'delete',
      leftContent: 'deleted line',
      rightContent: '',
      leftLineNumber: 3,
      rightLineNumber: -1,
    }
    
    const { container } = render(<DiffLine line={line} />)
    
    const row = container.querySelector('.diff-line-delete')
    expect(row).toBeInTheDocument()
    expect(screen.getByText('deleted line')).toBeInTheDocument()
  })

  it('should render replace line', () => {
    const line: DiffLineType = {
      type: 'replace',
      leftContent: 'old content',
      rightContent: 'new content',
      leftLineNumber: 4,
      rightLineNumber: 4,
    }
    
    const { container } = render(<DiffLine line={line} />)
    
    expect(container.querySelector('.diff-line-replace')).toBeInTheDocument()
  })

  it('should display line numbers', () => {
    const line: DiffLineType = {
      type: 'equal',
      leftContent: 'content',
      rightContent: 'content',
      leftLineNumber: 10,
      rightLineNumber: 10,
    }
    
    render(<DiffLine line={line} showLineNumbers={true} />)
    
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('should hide line numbers when showLineNumbers is false', () => {
    const line: DiffLineType = {
      type: 'equal',
      leftContent: 'content',
      rightContent: 'content',
      leftLineNumber: 10,
      rightLineNumber: 10,
    }
    
    const { container } = render(<DiffLine line={line} showLineNumbers={false} />)
    
    const lineNumbers = container.querySelector('.line-numbers')
    expect(lineNumbers).not.toBeInTheDocument()
  })

  it('should render inline diff for replace type', () => {
    const inlineDiff: InlineDiff[] = [
      { type: 'equal', value: 'prefix ' },
      { type: 'delete', value: 'old' },
      { type: 'insert', value: 'new' },
      { type: 'equal', value: ' suffix' },
    ]
    
    const line: DiffLineType = {
      type: 'replace',
      leftContent: 'prefix old suffix',
      rightContent: 'prefix new suffix',
      leftLineNumber: 5,
      rightLineNumber: 5,
      inlineDiff,
    }
    
    render(<DiffLine line={line} showInlineDiff={true} />)
    
    expect(screen.getByText('prefix')).toBeInTheDocument()
    expect(screen.getByText('new')).toBeInTheDocument()
    expect(screen.getByText('suffix')).toBeInTheDocument()
  })

  it('should handle empty content', () => {
    const line: DiffLineType = {
      type: 'equal',
      leftContent: '',
      rightContent: '',
      leftLineNumber: 1,
      rightLineNumber: 1,
    }
    
    const { container } = render(<DiffLine line={line} />)
    
    expect(container.querySelector('.diff-line')).toBeInTheDocument()
  })

  it('should handle whitespace characters', () => {
    const line: DiffLineType = {
      type: 'equal',
      leftContent: '  indented',
      rightContent: '  indented',
      leftLineNumber: 1,
      rightLineNumber: 1,
    }
    
    const { container } = render(<DiffLine line={line} showWhitespace={true} />)
    
    // Whitespace indicators should be present
    const whitespaceElems = container.querySelectorAll('.whitespace-char')
    expect(whitespaceElems.length).toBeGreaterThan(0)
  })

  it('should handle tab characters', () => {
    const line: DiffLineType = {
      type: 'equal',
      leftContent: '\ttabbed',
      rightContent: '\ttabbed',
      leftLineNumber: 1,
      rightLineNumber: 1,
    }
    
    render(<DiffLine line={line} tabSize={4} />)
    
    expect(screen.getByText(/tabbed/)).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const line: DiffLineType = {
      type: 'equal',
      leftContent: 'content',
      rightContent: 'content',
      leftLineNumber: 1,
      rightLineNumber: 1,
    }
    
    const { container } = render(<DiffLine line={line} className="custom-class" />)
    
    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('should call onClick when clicked', () => {
    const line: DiffLineType = {
      type: 'equal',
      leftContent: 'content',
      rightContent: 'content',
      leftLineNumber: 1,
      rightLineNumber: 1,
    }
    
    const onClick = vi.fn()
    const { container } = render(<DiffLine line={line} onClick={onClick} />)
    
    fireEvent.click(container.querySelector('.diff-line')!)
    
    expect(onClick).toHaveBeenCalledWith(line)
  })

  it('should render mark for flagged lines', () => {
    const line: DiffLineType = {
      type: 'equal',
      leftContent: 'content',
      rightContent: 'content',
      leftLineNumber: 1,
      rightLineNumber: 1,
      isMarked: true,
    }
    
    const { container } = render(<DiffLine line={line} />)
    
    expect(container.querySelector('.line-mark')).toBeInTheDocument()
  })

  it('should display ellipsis for very long lines', () => {
    const longContent = 'a'.repeat(1000)
    const line: DiffLineType = {
      type: 'equal',
      leftContent: longContent,
      rightContent: longContent,
      leftLineNumber: 1,
      rightLineNumber: 1,
    }
    
    render(<DiffLine line={line} maxLineLength={100} />)
    
    // Should truncate or show indication
    const content = screen.getByText(/a+/)
    expect(content.textContent!.length).toBeLessThanOrEqual(100)
  })
})
