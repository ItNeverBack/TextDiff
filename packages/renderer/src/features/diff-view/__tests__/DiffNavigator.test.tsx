import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { DiffResult } from '@shared/types'
import React from 'react'

// Define mock functions - must be defined before use
const mockFirstChunk = vi.fn()
const mockPrevChunk = vi.fn()
const mockNextChunk = vi.fn()
const mockLastChunk = vi.fn()
const mockNavigateToChunk = vi.fn()

// Mock the hooks before importing component
vi.mock('@renderer/stores', async (importOriginal) => {
  return {
    useDiffStore: vi.fn(() => ({
      isComputing: false
    }))
  }
})

vi.mock('../hooks/useDiffNavigation', async () => {
  return {
    useDiffNavigation: vi.fn(() => ({
      currentChunkIndex: 1,
      totalChunks: 5,
      currentChunk: null,
      firstChunk: mockFirstChunk,
      prevChunk: mockPrevChunk,
      nextChunk: mockNextChunk,
      lastChunk: mockLastChunk,
      goToChunk: mockNavigateToChunk,
      getChunkLineNumber: vi.fn(),
      getCurrentChunkLineNumber: vi.fn(),
      getRevealLineNumber: vi.fn()
    }))
  }
})

// Import the component after mocks
const { DiffNavigator } = await import('../components/DiffNavigator')
import { useDiffStore } from '@renderer/stores'
import { useDiffNavigation } from '../hooks/useDiffNavigation'

describe('DiffNavigator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('显示当前 chunk 位置（如 "2 / 5"）', () => {
    render(<DiffNavigator />)
    
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('处差异')).toBeInTheDocument()
  })

  it('点击第一处按钮触发 firstChunk', () => {
    render(<DiffNavigator />)
    
    const firstButton = screen.getByLabelText('第一处差异')
    fireEvent.click(firstButton)
    
    expect(mockFirstChunk).toHaveBeenCalledTimes(1)
  })

  it('点击上一处按钮触发 prevChunk', () => {
    render(<DiffNavigator />)
    
    const prevButton = screen.getByLabelText('上一处差异')
    fireEvent.click(prevButton)
    
    expect(mockPrevChunk).toHaveBeenCalledTimes(1)
  })

  it('点击下一处按钮触发 nextChunk', () => {
    render(<DiffNavigator />)
    
    const nextButton = screen.getByLabelText('下一处差异')
    fireEvent.click(nextButton)
    
    expect(mockNextChunk).toHaveBeenCalledTimes(1)
  })

  it('点击最后一处按钮触发 lastChunk', () => {
    render(<DiffNavigator />)
    
    const lastButton = screen.getByLabelText('最后一处差异')
    fireEvent.click(lastButton)
    
    expect(mockLastChunk).toHaveBeenCalledTimes(1)
  })

  it('在第一 chunk 时上箭头禁用', () => {
    vi.mocked(useDiffNavigation).mockReturnValue({
      currentChunkIndex: 0,
      totalChunks: 5,
      currentChunk: null,
      firstChunk: mockFirstChunk,
      prevChunk: mockPrevChunk,
      nextChunk: mockNextChunk,
      lastChunk: mockLastChunk,
      goToChunk: vi.fn(),
      getChunkLineNumber: vi.fn(),
      getCurrentChunkLineNumber: vi.fn(),
      getRevealLineNumber: vi.fn()
    })

    render(<DiffNavigator />)
    
    expect(screen.getByLabelText('第一处差异')).toBeDisabled()
    expect(screen.getByLabelText('上一处差异')).toBeDisabled()
  })

  it('在最后 chunk 时下箭头禁用', () => {
    vi.mocked(useDiffNavigation).mockReturnValue({
      currentChunkIndex: 4,
      totalChunks: 5,
      currentChunk: null,
      firstChunk: mockFirstChunk,
      prevChunk: mockPrevChunk,
      nextChunk: mockNextChunk,
      lastChunk: mockLastChunk,
      goToChunk: vi.fn(),
      getChunkLineNumber: vi.fn(),
      getCurrentChunkLineNumber: vi.fn(),
      getRevealLineNumber: vi.fn()
    })

    render(<DiffNavigator />)
    
    expect(screen.getByLabelText('下一处差异')).toBeDisabled()
    expect(screen.getByLabelText('最后一处差异')).toBeDisabled()
  })

  it('当正在计算时所有按钮禁用', () => {
    vi.mocked(useDiffStore).mockReturnValue({
      isComputing: true
    } as any)

    render(<DiffNavigator />)
    
    expect(screen.getByLabelText('第一处差异')).toBeDisabled()
    expect(screen.getByLabelText('上一处差异')).toBeDisabled()
    expect(screen.getByLabelText('下一处差异')).toBeDisabled()
    expect(screen.getByLabelText('最后一处差异')).toBeDisabled()
  })

  it('当没有 chunks 时显示 0/0', () => {
    vi.mocked(useDiffNavigation).mockReturnValue({
      currentChunkIndex: 0,
      totalChunks: 0,
      currentChunk: null,
      firstChunk: mockFirstChunk,
      prevChunk: mockPrevChunk,
      nextChunk: mockNextChunk,
      lastChunk: mockLastChunk,
      goToChunk: vi.fn(),
      getChunkLineNumber: vi.fn(),
      getCurrentChunkLineNumber: vi.fn(),
      getRevealLineNumber: vi.fn()
    })

    render(<DiffNavigator />)
    
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('所有导航按钮都有正确的标题提示', () => {
    render(<DiffNavigator />)
    
    expect(screen.getByLabelText('第一处差异')).toHaveAttribute('title', expect.stringContaining('第一处差异'))
    expect(screen.getByLabelText('上一处差异')).toHaveAttribute('title', expect.stringContaining('上一处差异'))
    expect(screen.getByLabelText('下一处差异')).toHaveAttribute('title', expect.stringContaining('下一处差异'))
    expect(screen.getByLabelText('最后一处差异')).toHaveAttribute('title', expect.stringContaining('最后一处差异'))
  })
})
