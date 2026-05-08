import { ipcMain, dialog, BrowserWindow } from 'electron'
import * as fs from 'fs'
import type {
  DirectoryComparison,
  ReportFormat,
  ReportOptions
} from '@shared/types'
import {
  generateReport,
  DEFAULT_REPORT_OPTIONS
} from '../directory/report'

/**
 * 报告 IPC Handlers
 *
 * 报告导出功能：
 * - 生成 HTML 报告
 * - 生成 JSON 报告
 * - 生成 CSV 报告
 * - 生成 XML 报告
 * - 保存报告到文件
 */

export function registerReportHandlers(): void {
  // 生成报告
  ipcMain.handle('report:generate', async (
    _event,
    comparison: DirectoryComparison,
    options?: Partial<ReportOptions>
  ): Promise<string> => {
    const mergedOptions = { ...DEFAULT_REPORT_OPTIONS, ...options }
    return generateReport(comparison, mergedOptions)
  })

  // 保存报告
  ipcMain.handle('report:save', async (
    event,
    content: string,
    format: ReportFormat,
    defaultFileName?: string
  ): Promise<{ success: boolean; filePath?: string; error?: string }> => {
    try {
      const extension = getFileExtension(format)
      const fileName = defaultFileName || `comparison-report-${Date.now()}`
      const fullFileName = `${fileName}.${extension}`

      const win = BrowserWindow.fromWebContents(event.sender)!
      const result = await dialog.showSaveDialog(win, {
        title: '保存对比报告',
        defaultPath: fullFileName,
        filters: getFileFilters(format)
      })

      if (result.canceled || !result.filePath) {
        return { success: false }
      }

      // 写入文件
      await fs.promises.writeFile(result.filePath, content, 'utf-8')

      return { success: true, filePath: result.filePath }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 生成并保存报告（一步完成）
  ipcMain.handle('report:generateAndSave', async (
    event,
    comparison: DirectoryComparison,
    options?: Partial<ReportOptions>
  ): Promise<{ success: boolean; filePath?: string; error?: string }> => {
    try {
      const mergedOptions = { ...DEFAULT_REPORT_OPTIONS, ...options }
      const content = generateReport(comparison, mergedOptions)
      const win = BrowserWindow.fromWebContents(event.sender)!

      return await saveReport(content, mergedOptions.format, comparison.id, win)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 预览 HTML 报告
  ipcMain.handle('report:preview', async (
    _event,
    comparison: DirectoryComparison,
    options?: Partial<Omit<ReportOptions, 'format'>>
  ): Promise<string> => {
    const previewOptions: ReportOptions = {
      ...DEFAULT_REPORT_OPTIONS,
      ...options,
      format: 'html'
    }
    return generateReport(comparison, previewOptions)
  })
}

/**
 * 获取文件扩展名
 */
function getFileExtension(format: ReportFormat): string {
  switch (format) {
    case 'html':
      return 'html'
    case 'json':
      return 'json'
    case 'csv':
      return 'csv'
    case 'xml':
      return 'xml'
    default:
      return 'txt'
  }
}

/**
 * 获取文件过滤器
 */
function getFileFilters(format: ReportFormat) {
  switch (format) {
    case 'html':
      return [
        { name: 'HTML 文件', extensions: ['html', 'htm'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    case 'json':
      return [
        { name: 'JSON 文件', extensions: ['json'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    case 'csv':
      return [
        { name: 'CSV 文件', extensions: ['csv'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    case 'xml':
      return [
        { name: 'XML 文件', extensions: ['xml'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    default:
      return [{ name: '所有文件', extensions: ['*'] }]
  }
}

/**
 * 保存报告
 */
async function saveReport(
  content: string,
  format: ReportFormat,
  comparisonId?: string,
  parentWindow?: InstanceType<typeof BrowserWindow> | null
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const extension = getFileExtension(format)
    const fileName = `comparison-report-${comparisonId || Date.now()}.${extension}`

    const result = await dialog.showSaveDialog(parentWindow!, {
      title: '保存对比报告',
      defaultPath: fileName,
      filters: getFileFilters(format)
    })

    if (result.canceled || !result.filePath) {
      return { success: false }
    }

    await fs.promises.writeFile(result.filePath, content, 'utf-8')

    return { success: true, filePath: result.filePath }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
