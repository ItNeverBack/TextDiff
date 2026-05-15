import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DirectoryStats } from '../components/DirectoryStats'
import type { DirDiffStatistics, DirectoryInfo } from '@shared/types/directory.types'

describe('DirectoryStats', () => {
  it('显示总文件数', () => {
    const stats: DirDiffStatistics = {
      totalFiles: 100,
      equal: 80,
      modified: 10,
      leftOnly: 5,
      rightOnly: 5,
      added: 5,
      removed: 5,
      totalSizeLeft: 1024000,
      totalSizeRight: 1024000,
      totalDirectories: 10,
      duration: 1500,
      scannedAt: Date.now()
    }

    render(<DirectoryStats stats={stats} />)

    expect(screen.getByText('总文件')).toBeInTheDocument()
    expect(screen.getAllByText('100')[0]).toBeInTheDocument()
  })

  it('显示差异文件数（修改数量）', () => {
    const stats: DirDiffStatistics = {
      totalFiles: 100,
      equal: 80,
      modified: 10,
      leftOnly: 5,
      rightOnly: 5,
      added: 5,
      removed: 5,
      totalSizeLeft: 1024000,
      totalSizeRight: 1024000,
      totalDirectories: 10,
      duration: 1500,
      scannedAt: Date.now()
    }

    render(<DirectoryStats stats={stats} />)

    expect(screen.getByText('修改')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('显示左侧独有文件数', () => {
    const stats: DirDiffStatistics = {
      totalFiles: 100,
      equal: 80,
      modified: 10,
      leftOnly: 5,
      rightOnly: 5,
      added: 5,
      removed: 5,
      totalSizeLeft: 1024000,
      totalSizeRight: 1024000,
      totalDirectories: 10,
      duration: 1500,
      scannedAt: Date.now()
    }

    render(<DirectoryStats stats={stats} />)

    expect(screen.getByText('仅左侧')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('显示右侧独有文件数', () => {
    const stats: DirDiffStatistics = {
      totalFiles: 100,
      equal: 80,
      modified: 10,
      leftOnly: 5,
      rightOnly: 8,
      added: 5,
      removed: 5,
      totalSizeLeft: 1024000,
      totalSizeRight: 1024000,
      totalDirectories: 10,
      duration: 1500,
      scannedAt: Date.now()
    }

    render(<DirectoryStats stats={stats} />)

    expect(screen.getByText('仅右侧')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('显示相同文件数', () => {
    const stats: DirDiffStatistics = {
      totalFiles: 100,
      equal: 80,
      modified: 10,
      leftOnly: 5,
      rightOnly: 5,
      added: 5,
      removed: 5,
      totalSizeLeft: 1024000,
      totalSizeRight: 1024000,
      totalDirectories: 10,
      duration: 1500,
      scannedAt: Date.now()
    }

    render(<DirectoryStats stats={stats} />)

    expect(screen.getByText('相同')).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument()
  })

  it('显示目录数量', () => {
    const stats: DirDiffStatistics = {
      totalFiles: 100,
      equal: 80,
      modified: 10,
      leftOnly: 5,
      rightOnly: 5,
      added: 5,
      removed: 5,
      totalSizeLeft: 1024000,
      totalSizeRight: 1024000,
      totalDirectories: 15,
      duration: 1500,
      scannedAt: Date.now()
    }

    render(<DirectoryStats stats={stats} />)

    expect(screen.getByText('15 个目录')).toBeInTheDocument()
  })

  it('显示扫描耗时', () => {
    const stats: DirDiffStatistics = {
      totalFiles: 100,
      equal: 80,
      modified: 10,
      leftOnly: 5,
      rightOnly: 5,
      added: 5,
      removed: 5,
      totalSizeLeft: 1024000,
      totalSizeRight: 1024000,
      totalDirectories: 10,
      duration: 1500,
      scannedAt: Date.now()
    }

    render(<DirectoryStats stats={stats} />)

    expect(screen.getByText('耗时: 1.5s')).toBeInTheDocument()
  })

  it('格式化显示文件大小', () => {
    const stats: DirDiffStatistics = {
      totalFiles: 100,
      equal: 80,
      modified: 10,
      leftOnly: 5,
      rightOnly: 5,
      added: 5,
      removed: 5,
      totalSizeLeft: 1024 * 1024 * 5, // 5 MB
      totalSizeRight: 1024 * 1024 * 3, // 3 MB
      totalDirectories: 10,
      duration: 1500,
      scannedAt: Date.now()
    }

    render(<DirectoryStats stats={stats} />)

    expect(screen.getByText(/大小:/)).toBeInTheDocument()
  })

  it('使用 leftRoot 和 rightRoot 计算统计信息', () => {
    const leftRoot: DirectoryInfo = {
      path: '/left',
      totalFiles: 50,
      totalSize: 1024000,
      totalDirectories: 5
    }

    const rightRoot: DirectoryInfo = {
      path: '/right',
      totalFiles: 60,
      totalSize: 2048000,
      totalDirectories: 6
    }

    render(<DirectoryStats leftRoot={leftRoot} rightRoot={rightRoot} />)

    // 总文件数 = 50 + 60 = 110
    expect(screen.getAllByText('110')[0]).toBeInTheDocument()
  })

  it('使用 visibleStats 优先于 stats', () => {
    const stats: DirDiffStatistics = {
      totalFiles: 100,
      equal: 80,
      modified: 10,
      leftOnly: 5,
      rightOnly: 5,
      added: 5,
      removed: 5,
      totalSizeLeft: 1024000,
      totalSizeRight: 1024000,
      totalDirectories: 10,
      duration: 1500,
      scannedAt: Date.now()
    }

    const visibleStats = {
      total: 50,
      modified: 5,
      leftOnly: 2,
      rightOnly: 3,
      equal: 40
    }

    render(<DirectoryStats stats={stats} visibleStats={visibleStats} />)

    // 应该显示 visibleStats 的值
    expect(screen.getAllByText('50')[0]).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('显示隐藏文件数量', () => {
    const stats: DirDiffStatistics = {
      totalFiles: 100,
      equal: 80,
      modified: 10,
      leftOnly: 5,
      rightOnly: 5,
      added: 5,
      removed: 5,
      totalSizeLeft: 1024000,
      totalSizeRight: 1024000,
      totalDirectories: 10,
      duration: 1500,
      scannedAt: Date.now()
    }

    render(<DirectoryStats stats={stats} hiddenCount={20} />)

    expect(screen.getByText('已隐藏: 20')).toBeInTheDocument()
  })

  it('显示扫描时间', () => {
    const scannedAt = new Date('2024-01-15T14:30:00').getTime()
    const stats: DirDiffStatistics = {
      totalFiles: 100,
      equal: 80,
      modified: 10,
      leftOnly: 5,
      rightOnly: 5,
      added: 5,
      removed: 5,
      totalSizeLeft: 1024000,
      totalSizeRight: 1024000,
      totalDirectories: 10,
      duration: 1500,
      scannedAt
    }

    render(<DirectoryStats stats={stats} />)

    expect(screen.getByText(/扫描于:/)).toBeInTheDocument()
  })

  it('格式化毫秒级耗时', () => {
    const stats: DirDiffStatistics = {
      totalFiles: 100,
      equal: 80,
      modified: 10,
      leftOnly: 5,
      rightOnly: 5,
      added: 5,
      removed: 5,
      totalSizeLeft: 1024000,
      totalSizeRight: 1024000,
      totalDirectories: 10,
      duration: 500,
      scannedAt: Date.now()
    }

    render(<DirectoryStats stats={stats} />)

    expect(screen.getByText('耗时: 500ms')).toBeInTheDocument()
  })

  it('格式化分钟级耗时', () => {
    const stats: DirDiffStatistics = {
      totalFiles: 100,
      equal: 80,
      modified: 10,
      leftOnly: 5,
      rightOnly: 5,
      added: 5,
      removed: 5,
      totalSizeLeft: 1024000,
      totalSizeRight: 1024000,
      totalDirectories: 10,
      duration: 90000, // 90 seconds
      scannedAt: Date.now()
    }

    render(<DirectoryStats stats={stats} />)

    expect(screen.getByText('耗时: 1.5m')).toBeInTheDocument()
  })

  it('处理 undefined stats', () => {
    render(<DirectoryStats />)

    // 应该渲染但不会崩溃
    expect(screen.getByText('总文件')).toBeInTheDocument()
  })
})
