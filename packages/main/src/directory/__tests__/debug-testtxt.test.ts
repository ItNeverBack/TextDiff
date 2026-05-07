/**
 * 调试测试：验证 testTxt 目录的扫描结果
 */
import { describe, it, expect } from 'vitest'
import * as path from 'path'
import * as fs from 'fs'
import { scanDirectory } from '../scanner'
import { compareDirectories } from '../comparator'
import { computeStatistics, createDirectoryInfo } from '../stats'
import { applyFilters } from '../filter'
import { DEFAULT_DIR_COMPARE_OPTIONS } from '@shared/types/directory.types'

const TEST_DIR = 'C:\\Users\\m1552\\Desktop\\code\\diffText\\testTxt'

describe('Debug testTxt directory', () => {
  it('testTxt directory exists', () => {
    const exists = fs.existsSync(TEST_DIR)
    console.log('testTxt path:', TEST_DIR)
    console.log('exists:', exists)
    if (exists) {
      const files = fs.readdirSync(TEST_DIR)
      console.log('files:', files)
    }
    expect(exists).toBe(true)
  })

  it('scanDirectory returns correct totalFiles and totalSize', async () => {
    const options = { ...DEFAULT_DIR_COMPARE_OPTIONS }
    const result = await scanDirectory(TEST_DIR, options)

    console.log('scanDirectory result:', {
      totalFiles: result.totalFiles,
      totalSize: result.totalSize,
      rootChildren: result.root.children?.length,
      rootMetadata: result.root.metadata
    })

    expect(result.totalFiles).toBeGreaterThan(0)
    expect(result.totalSize).toBeGreaterThan(0)
  })

  it('full pipeline: scan -> compare -> statistics', async () => {
    const options = { ...DEFAULT_DIR_COMPARE_OPTIONS }

    const [leftResult, rightResult] = await Promise.all([
      scanDirectory(TEST_DIR, options),
      scanDirectory(TEST_DIR, options)
    ])

    console.log('Left scan:', { totalFiles: leftResult.totalFiles, totalSize: leftResult.totalSize })
    console.log('Right scan:', { totalFiles: rightResult.totalFiles, totalSize: rightResult.totalSize })

    const compareResult = await compareDirectories(leftResult.root, rightResult.root, options)
    const filteredEntries = applyFilters(compareResult.entries, options.filters)

    const leftInfo = createDirectoryInfo(
      TEST_DIR,
      path.basename(TEST_DIR),
      leftResult.totalFiles,
      leftResult.totalSize,
      leftResult.root.metadata?.modifiedTime || new Date()
    )
    const rightInfo = createDirectoryInfo(
      TEST_DIR,
      path.basename(TEST_DIR),
      rightResult.totalFiles,
      rightResult.totalSize,
      rightResult.root.metadata?.modifiedTime || new Date()
    )

    console.log('leftInfo:', leftInfo)
    console.log('rightInfo:', rightInfo)

    const statistics = computeStatistics(filteredEntries, leftInfo, rightInfo, Date.now() - 100)

    console.log('statistics:', statistics)

    expect(leftInfo.totalFiles).toBeGreaterThan(0)
    expect(leftInfo.totalSize).toBeGreaterThan(0)
    expect(statistics.totalSizeLeft).toBeGreaterThan(0)
    expect(statistics.totalSizeRight).toBeGreaterThan(0)
  })
})
