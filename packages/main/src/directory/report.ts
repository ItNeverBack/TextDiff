import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import type {
  DirectoryComparison,
  DirectoryDiffEntry,
  ReportOptions,
  DirDiffStatistics
} from '@shared/types'
import { STATUS_COLORS, STATUS_DETAILS } from '@shared/types'

/**
 * 默认报告选项
 */
export const DEFAULT_REPORT_OPTIONS: ReportOptions = {
  format: 'html',
  includeEqual: false,
  includeContent: false,
  maxContentLength: 1000
}

/**
 * 获取模板文件路径
 */
function getTemplatePath(): string {
  // 在 ESM 中获取当前文件目录
  const currentFilePath = fileURLToPath(import.meta.url)
  const currentDir = path.dirname(currentFilePath)
  return path.join(currentDir, 'templates', 'html-report.hbs')
}

/**
 * 简单的模板替换函数
 * 替换 {{variable}} 和 {{{variable}}} 格式的模板变量
 */
function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{\{?(\w+)\}?\}\}/g, (match, key) => {
    const value = data[key]
    if (value === undefined || value === null) {
      return ''
    }
    // 三个花括号表示不转义，两个花括号需要转义HTML
    if (match.startsWith('{{{')) {
      return String(value)
    }
    return escapeHtml(String(value))
  })
}

/**
 * 转义HTML特殊字符
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * 报告生成器类
 */
export class ReportGenerator {
  private options: ReportOptions

  constructor(options: Partial<ReportOptions> = {}) {
    this.options = { ...DEFAULT_REPORT_OPTIONS, ...options }
  }

  /**
   * 生成报告
   * @param comparison 目录对比结果
   * @returns 报告内容字符串
   */
  generate(comparison: DirectoryComparison): string {
    switch (this.options.format) {
      case 'html':
        return this.generateHtmlReport(comparison)
      case 'json':
        return this.generateJsonReport(comparison)
      case 'csv':
        return this.generateCsvReport(comparison)
      case 'xml':
        return this.generateXmlReport(comparison)
      default:
        throw new Error(`Unsupported report format: ${this.options.format}`)
    }
  }

  /**
   * 生成 HTML 报告
   * 使用模板文件 html-report.hbs
   */
  private generateHtmlReport(comparison: DirectoryComparison): string {
    const { leftRoot, rightRoot, entries, statistics, completedAt } = comparison

    const filteredEntries = this.filterEntries(entries)
    const entriesHtml = this.generateEntriesHtml(filteredEntries)

    try {
      // 读取模板文件
      const templatePath = getTemplatePath()
      const template = fs.readFileSync(templatePath, 'utf-8')

      // 准备模板数据
      const templateData = {
        title: `目录对比报告 - ${leftRoot.name} vs ${rightRoot.name}`,
        headerTitle: '目录对比报告',
        leftPath: leftRoot.path,
        rightPath: rightRoot.path,
        generatedAt: completedAt.toLocaleString(),
        summaryHtml: this.generateSummaryHtml(statistics),
        chartHtml: this.generateChartHtml(statistics),
        entryCount: filteredEntries.length,
        includeEqual: this.options.includeEqual,
        entriesHtml: entriesHtml
      }

      // 渲染模板
      return renderTemplate(template, templateData)
    } catch (error) {
      console.warn('Failed to load template file, falling back to inline generation:', error)
      // 如果模板加载失败，使用内联生成（备用方案）
      return this.generateHtmlReportInline(comparison, filteredEntries, entriesHtml)
    }
  }

  /**
   * 内联生成 HTML 报告（备用方案）
   */
  private generateHtmlReportInline(
    comparison: DirectoryComparison,
    filteredEntries: DirectoryDiffEntry[],
    entriesHtml: string
  ): string {
    const { leftRoot, rightRoot, statistics, completedAt } = comparison

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>目录对比报告 - ${leftRoot.name} vs ${rightRoot.name}</title>
  <style>
    ${this.getHtmlStyles()}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>目录对比报告</h1>
      <div class="meta">
        <p><strong>左侧目录:</strong> ${leftRoot.path}</p>
        <p><strong>右侧目录:</strong> ${rightRoot.path}</p>
        <p><strong>生成时间:</strong> ${completedAt.toLocaleString()}</p>
      </div>
    </header>

    <section class="summary">
      <h2>统计概览</h2>
      ${this.generateSummaryHtml(statistics)}
    </section>

    <section class="chart">
      <h2>差异分布</h2>
      ${this.generateChartHtml(statistics)}
    </section>

    <section class="entries">
      <h2>文件列表 (${filteredEntries.length} 个文件)</h2>
      <div class="filter-info">
        ${this.options.includeEqual ? '<span class="badge">包含相同文件</span>' : '<span class="badge hidden">隐藏相同文件</span>'}
      </div>
      <div class="tree">
        ${entriesHtml}
      </div>
    </section>

    <footer>
      <p>由 TextDiff 生成</p>
    </footer>
  </div>
  <script>
    ${this.getHtmlScripts()}
  </script>
</body>
</html>`
  }

  /**
   * 生成 JSON 报告
   */
  private generateJsonReport(comparison: DirectoryComparison): string {
    const filteredEntries = this.filterEntries(comparison.entries)

    const report = {
      meta: {
        title: '目录对比报告',
        leftPath: comparison.leftRoot.path,
        rightPath: comparison.rightRoot.path,
        generatedAt: comparison.completedAt.toISOString()
      },
      statistics: comparison.statistics,
      entries: filteredEntries.map(entry => this.simplifyEntry(entry)),
      options: this.options
    }

    return JSON.stringify(report, null, 2)
  }

  /**
   * 生成 CSV 报告
   */
  private generateCsvReport(comparison: DirectoryComparison): string {
    const filteredEntries = this.filterEntries(comparison.entries)

    // CSV 头部
    const headers = [
      'Relative Path',
      'Name',
      'Type',
      'Status',
      'Left Size',
      'Right Size',
      'Left Modified',
      'Right Modified'
    ]

    // CSV 行
    const rows = filteredEntries.map(entry => {
      return [
        entry.relativePath,
        entry.name,
        entry.type,
        entry.status,
        entry.leftMetadata?.size ?? '',
        entry.rightMetadata?.size ?? '',
        entry.leftMetadata?.modifiedTime?.toISOString() ?? '',
        entry.rightMetadata?.modifiedTime?.toISOString() ?? ''
      ].map(field => this.escapeCsv(field)).join(',')
    })

    return [headers.join(','), ...rows].join('\n')
  }

  /**
   * 生成 XML 报告
   */
  private generateXmlReport(comparison: DirectoryComparison): string {
    const filteredEntries = this.filterEntries(comparison.entries)

    const entriesXml = filteredEntries.map(entry => `
    <entry>
      <path>${this.escapeXml(entry.relativePath)}</path>
      <name>${this.escapeXml(entry.name)}</name>
      <type>${entry.type}</type>
      <status>${entry.status}</status>
      ${entry.leftMetadata ? `
      <left>
        <size>${entry.leftMetadata.size}</size>
        <modified>${entry.leftMetadata.modifiedTime.toISOString()}</modified>
      </left>` : ''}
      ${entry.rightMetadata ? `
      <right>
        <size>${entry.rightMetadata.size}</size>
        <modified>${entry.rightMetadata.modifiedTime.toISOString()}</modified>
      </right>` : ''}
    </entry>`).join('')

    return `<?xml version="1.0" encoding="UTF-8"?>
<directoryComparison>
  <meta>
    <leftPath>${this.escapeXml(comparison.leftRoot.path)}</leftPath>
    <rightPath>${this.escapeXml(comparison.rightRoot.path)}</rightPath>
    <generatedAt>${comparison.completedAt.toISOString()}</generatedAt>
  </meta>
  <statistics>
    <totalFiles>${comparison.statistics.totalFiles}</totalFiles>
    <totalDirectories>${comparison.statistics.totalDirectories}</totalDirectories>
    <leftOnly>${comparison.statistics.leftOnly}</leftOnly>
    <rightOnly>${comparison.statistics.rightOnly}</rightOnly>
    <modified>${comparison.statistics.modified}</modified>
    <equal>${comparison.statistics.equal}</equal>
  </statistics>
  <entries>
    ${entriesXml}
  </entries>
</directoryComparison>`
  }

  /**
   * 过滤条目
   */
  private filterEntries(entries: DirectoryDiffEntry[]): DirectoryDiffEntry[] {
    const filterRecursive = (entryList: DirectoryDiffEntry[]): DirectoryDiffEntry[] => {
      const result: DirectoryDiffEntry[] = []

      for (const entry of entryList) {
        // 递归过滤子项
        let filteredChildren: DirectoryDiffEntry[] | undefined
        if (entry.children) {
          filteredChildren = filterRecursive(entry.children)
        }

        // 决定是否包含此条目
        const shouldInclude = this.shouldIncludeEntry(entry)

        if (shouldInclude) {
          result.push({
            ...entry,
            children: filteredChildren
          })
        } else if (filteredChildren && filteredChildren.length > 0) {
          // 如果子项被包含，父目录也要包含
          result.push({
            ...entry,
            children: filteredChildren
          })
        }
      }

      return result
    }

    return filterRecursive(entries)
  }

  /**
   * 决定是否包含条目
   */
  private shouldIncludeEntry(entry: DirectoryDiffEntry): boolean {
    // 始终包含非 equal 的条目
    if (entry.status !== 'equal') {
      return true
    }

    // equal 条目根据选项决定是否包含
    return this.options.includeEqual
  }

  /**
   * 简化条目（用于 JSON 导出）
   */
  private simplifyEntry(entry: DirectoryDiffEntry): object {
    const simplified: Record<string, unknown> = {
      relativePath: entry.relativePath,
      name: entry.name,
      type: entry.type,
      status: entry.status,
      depth: entry.depth
    }

    if (entry.leftPath) {
      simplified.leftPath = entry.leftPath
    }

    if (entry.rightPath) {
      simplified.rightPath = entry.rightPath
    }

    if (entry.leftMetadata) {
      simplified.leftMetadata = {
        size: entry.leftMetadata.size,
        modifiedTime: entry.leftMetadata.modifiedTime.toISOString()
      }
    }

    if (entry.rightMetadata) {
      simplified.rightMetadata = {
        size: entry.rightMetadata.size,
        modifiedTime: entry.rightMetadata.modifiedTime.toISOString()
      }
    }

    if (entry.children && entry.children.length > 0) {
      simplified.children = entry.children.map(child => this.simplifyEntry(child))
    }

    return simplified
  }

  /**
   * 生成统计概览 HTML
   */
  private generateSummaryHtml(stats: DirDiffStatistics): string {
    return `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.totalFiles}</div>
          <div class="stat-label">总文件数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.totalDirectories}</div>
          <div class="stat-label">总目录数</div>
        </div>
        <div class="stat-card equal">
          <div class="stat-value">${stats.equal}</div>
          <div class="stat-label">相同</div>
        </div>
        <div class="stat-card modified">
          <div class="stat-value">${stats.modified}</div>
          <div class="stat-label">修改</div>
        </div>
        <div class="stat-card left-only">
          <div class="stat-value">${stats.leftOnly}</div>
          <div class="stat-label">仅左侧</div>
        </div>
        <div class="stat-card right-only">
          <div class="stat-value">${stats.rightOnly}</div>
          <div class="stat-label">仅右侧</div>
        </div>
      </div>
      <div class="stats-detail">
        <p><strong>左侧总大小:</strong> ${this.formatFileSize(stats.totalSizeLeft)}</p>
        <p><strong>右侧总大小:</strong> ${this.formatFileSize(stats.totalSizeRight)}</p>
        <p><strong>扫描耗时:</strong> ${stats.duration}ms</p>
      </div>
    `
  }

  /**
   * 生成图表 HTML
   */
  private generateChartHtml(stats: DirDiffStatistics): string {
    const total = stats.equal + stats.modified + stats.leftOnly + stats.rightOnly
    if (total === 0) return '<p>暂无数据</p>'

    const getPercentage = (value: number) => ((value / total) * 100).toFixed(1)

    return `
      <div class="chart-container">
        <div class="bar-chart">
          ${stats.equal > 0 ? `
            <div class="bar equal" style="width: ${getPercentage(stats.equal)}%" title="相同: ${stats.equal}">
              ${parseFloat(getPercentage(stats.equal)) > 10 ? stats.equal : ''}
            </div>
          ` : ''}
          ${stats.modified > 0 ? `
            <div class="bar modified" style="width: ${getPercentage(stats.modified)}%" title="修改: ${stats.modified}">
              ${parseFloat(getPercentage(stats.modified)) > 10 ? stats.modified : ''}
            </div>
          ` : ''}
          ${stats.leftOnly > 0 ? `
            <div class="bar left-only" style="width: ${getPercentage(stats.leftOnly)}%" title="仅左侧: ${stats.leftOnly}">
              ${parseFloat(getPercentage(stats.leftOnly)) > 10 ? stats.leftOnly : ''}
            </div>
          ` : ''}
          ${stats.rightOnly > 0 ? `
            <div class="bar right-only" style="width: ${getPercentage(stats.rightOnly)}%" title="仅右侧: ${stats.rightOnly}">
              ${parseFloat(getPercentage(stats.rightOnly)) > 10 ? stats.rightOnly : ''}
            </div>
          ` : ''}
        </div>
        <div class="legend">
          <div class="legend-item"><span class="dot equal"></span> 相同 (${stats.equal})</div>
          <div class="legend-item"><span class="dot modified"></span> 修改 (${stats.modified})</div>
          <div class="legend-item"><span class="dot left-only"></span> 仅左侧 (${stats.leftOnly})</div>
          <div class="legend-item"><span class="dot right-only"></span> 仅右侧 (${stats.rightOnly})</div>
        </div>
      </div>
    `
  }

  /**
   * 生成条目列表 HTML
   */
  private generateEntriesHtml(entries: DirectoryDiffEntry[]): string {
    if (entries.length === 0) {
      return '<p>没有符合条件的文件</p>'
    }

    const generateEntry = (entry: DirectoryDiffEntry, level: number): string => {
      const indent = level * 20
      const statusColor = STATUS_COLORS[entry.status].color
      const statusLabel = STATUS_DETAILS[entry.status].label

      let html = `
        <div class="entry" style="padding-left: ${indent}px" data-status="${entry.status}">
          <div class="entry-row" onclick="toggleEntry(this)">
            <span class="entry-icon" style="color: ${statusColor}">
              ${entry.type === 'directory' ? '📁' : '📄'}
            </span>
            <span class="entry-name">${entry.name}</span>
            <span class="entry-status" style="background-color: ${statusColor}">
              ${statusLabel}
            </span>
          </div>
      `

      if (entry.children && entry.children.length > 0) {
        html += `<div class="entry-children">`
        for (const child of entry.children) {
          html += generateEntry(child, level + 1)
        }
        html += `</div>`
      }

      html += `</div>`

      return html
    }

    return entries.map(entry => generateEntry(entry, 0)).join('')
  }

  /**
   * 获取 HTML 样式
   */
  private getHtmlStyles(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background: #f5f5f5;
        color: #333;
        line-height: 1.6;
      }

      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }

      header {
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        margin-bottom: 20px;
      }

      h1 {
        color: #2563eb;
        margin-bottom: 20px;
      }

      h2 {
        color: #374151;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 2px solid #e5e7eb;
      }

      .meta p {
        margin: 5px 0;
        color: #6b7280;
      }

      section {
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        margin-bottom: 20px;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }

      .stat-card {
        background: #f9fafb;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        border-left: 4px solid #9ca3af;
      }

      .stat-card.equal { border-left-color: #22c55e; }
      .stat-card.modified { border-left-color: #f59e0b; }
      .stat-card.left-only { border-left-color: #3b82f6; }
      .stat-card.right-only { border-left-color: #ef4444; }

      .stat-value {
        font-size: 2em;
        font-weight: bold;
        color: #111827;
      }

      .stat-label {
        color: #6b7280;
        font-size: 0.9em;
        margin-top: 5px;
      }

      .stats-detail {
        color: #6b7280;
      }

      .stats-detail p {
        margin: 5px 0;
      }

      .chart-container {
        margin-top: 20px;
      }

      .bar-chart {
        display: flex;
        height: 40px;
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 15px;
      }

      .bar {
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 0.9em;
        min-width: 30px;
      }

      .bar.equal { background: #22c55e; }
      .bar.modified { background: #f59e0b; }
      .bar.left-only { background: #3b82f6; }
      .bar.right-only { background: #ef4444; }

      .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }

      .dot.equal { background: #22c55e; }
      .dot.modified { background: #f59e0b; }
      .dot.left-only { background: #3b82f6; }
      .dot.right-only { background: #ef4444; }

      .filter-info {
        margin-bottom: 15px;
      }

      .badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 0.85em;
        background: #e5e7eb;
        color: #374151;
      }

      .badge.hidden {
        background: #fef3c7;
        color: #92400e;
      }

      .tree {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        overflow: hidden;
      }

      .entry {
        border-bottom: 1px solid #f3f4f6;
      }

      .entry:last-child {
        border-bottom: none;
      }

      .entry-row {
        display: flex;
        align-items: center;
        padding: 12px 15px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .entry-row:hover {
        background: #f9fafb;
      }

      .entry-icon {
        margin-right: 10px;
        font-size: 1.1em;
      }

      .entry-name {
        flex: 1;
        font-weight: 500;
      }

      .entry-status {
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 0.8em;
        color: white;
      }

      .entry-children {
        display: none;
      }

      .entry-children.expanded {
        display: block;
      }

      .entry-row.has-children::before {
        content: '▶';
        margin-right: 8px;
        font-size: 0.8em;
        transition: transform 0.2s;
      }

      .entry-row.has-children.expanded::before {
        transform: rotate(90deg);
      }

      footer {
        text-align: center;
        color: #6b7280;
        padding: 20px;
      }

      @media (max-width: 768px) {
        .container {
          padding: 10px;
        }

        header, section {
          padding: 20px;
        }

        .stats-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `
  }

  /**
   * 获取 HTML 脚本
   */
  private getHtmlScripts(): string {
    return `
      function toggleEntry(element) {
        const entry = element.parentElement;
        const children = entry.querySelector('.entry-children');
        
        if (children) {
          children.classList.toggle('expanded');
          element.classList.toggle('expanded');
        }
      }

      // 添加 has-children 类
      document.querySelectorAll('.entry').forEach(entry => {
        const children = entry.querySelector('.entry-children');
        const row = entry.querySelector('.entry-row');
        if (children && row) {
          row.classList.add('has-children');
        }
      });
    `
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'

    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const k = 1024
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i]
  }

  /**
   * 转义 CSV 字段
   */
  private escapeCsv(field: unknown): string {
    const str = String(field ?? '')
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"'
    }
    return str
  }

  /**
   * 转义 XML 字符串
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}

/**
 * 生成报告（便捷函数）
 */
export function generateReport(
  comparison: DirectoryComparison,
  options: Partial<ReportOptions> = {}
): string {
  const generator = new ReportGenerator(options)
  return generator.generate(comparison)
}

/**
 * 生成 HTML 报告
 */
export function generateHtmlReport(
  comparison: DirectoryComparison,
  options?: Omit<Partial<ReportOptions>, 'format'>
): string {
  return generateReport(comparison, { ...options, format: 'html' })
}

/**
 * 生成 JSON 报告
 */
export function generateJsonReport(
  comparison: DirectoryComparison,
  options?: Omit<Partial<ReportOptions>, 'format'>
): string {
  return generateReport(comparison, { ...options, format: 'json' })
}

/**
 * 生成 CSV 报告
 */
export function generateCsvReport(
  comparison: DirectoryComparison,
  options?: Omit<Partial<ReportOptions>, 'format'>
): string {
  return generateReport(comparison, { ...options, format: 'csv' })
}

/**
 * 生成 XML 报告
 */
export function generateXmlReport(
  comparison: DirectoryComparison,
  options?: Omit<Partial<ReportOptions>, 'format'>
): string {
  return generateReport(comparison, { ...options, format: 'xml' })
}
