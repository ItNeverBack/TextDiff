/**
 * DirectoryStats 组件测试
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DirectoryStats } from '../components/DirectoryStats';
import type { DirDiffStatistics } from '@shared/types/directory.types';

describe('DirectoryStats', () => {
  const mockStats: DirDiffStatistics = {
    totalFiles: 100,
    totalDirectories: 10,
    leftOnly: 5,
    rightOnly: 3,
    modified: 20,
    equal: 72,
    totalSizeLeft: 1024000,
    totalSizeRight: 1024000,
    scannedAt: new Date(),
    duration: 1234
  };

  it('renders correctly', () => {
    const { container } = render(<DirectoryStats stats={mockStats} />);
    expect(container.querySelector('.directory-stats')).toBeInTheDocument();
  });

  it('displays all stat items', () => {
    render(<DirectoryStats stats={mockStats} />);

    expect(screen.getByText('总文件')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();

    expect(screen.getByText('相同')).toBeInTheDocument();
    expect(screen.getByText('72')).toBeInTheDocument();

    expect(screen.getByText('修改')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();

    expect(screen.getByText('仅左侧')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    expect(screen.getByText('仅右侧')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('displays directory count', () => {
    render(<DirectoryStats stats={mockStats} />);
    expect(screen.getByText('10 个目录')).toBeInTheDocument();
  });

  it('displays hidden count when provided', () => {
    render(<DirectoryStats stats={mockStats} hiddenCount={15} />);
    expect(screen.getByText('已隐藏: 15')).toBeInTheDocument();
  });

  it('formats file sizes correctly', () => {
    render(<DirectoryStats stats={mockStats} />);
    expect(screen.getByText(/大小:/)).toBeInTheDocument();
  });

  it('formats duration correctly', () => {
    render(<DirectoryStats stats={mockStats} />);
    expect(screen.getByText('耗时: 1.2s')).toBeInTheDocument();
  });

  it('displays scan time', () => {
    render(<DirectoryStats stats={mockStats} />);
    expect(screen.getByText(/扫描于:/)).toBeInTheDocument();
  });

  it('uses visibleStats when provided', () => {
    const visibleStats = {
      total: 50,
      modified: 10,
      leftOnly: 2,
      rightOnly: 1,
      equal: 37
    };

    render(<DirectoryStats stats={mockStats} visibleStats={visibleStats} />);

    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('handles empty stats gracefully', () => {
    render(<DirectoryStats />);

    expect(screen.getByText('总文件')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
