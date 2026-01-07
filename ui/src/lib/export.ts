/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Export Service for generating PDF, CSV, and JSON reports
 * Uses dynamic imports for jsPDF to reduce initial bundle size
 */

import Papa from 'papaparse'

// Lazy load jsPDF only when needed (reduces initial bundle by ~200KB)
async function loadJsPdf() {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  return { jsPDF, autoTable }
}

// Type definitions
export interface ReportData {
  summary?: {
    totalQueries?: number
    blockedQueries?: number
    blockRate?: number
    cacheHitRate?: number
    avgResponseTime?: number
  }
  topBlocked?: Array<{
    domain: string
    count: number
    category?: string
  }>
  categoryStats?: Array<{
    category: string
    count: number
  }>
  locationStats?: Array<{
    location: string
    queries: number
    blocked: number
  }>
  queryTrends?: Array<{
    timestamp: string
    total: number
    blocked?: number
  }>
}

export interface ExportOptions {
  dateRange?: string
  reportType?: string
  title?: string
  includeSections?: {
    summary?: boolean
    topBlocked?: boolean
    categories?: boolean
    locations?: boolean
    trends?: boolean
  }
}

// Utility to download a blob
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Format number with commas
function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null) return '0'
  return num.toLocaleString()
}

// Format percentage
function formatPercent(num: number | undefined): string {
  if (num === undefined || num === null) return '0%'
  return `${num.toFixed(1)}%`
}

// Get current date string for filenames
function getDateString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Export report data to PDF format
 */
export async function exportToPdf(data: ReportData, options: ExportOptions = {}): Promise<Blob> {
  const { jsPDF, autoTable } = await loadJsPdf()
  const doc = new jsPDF()
  const title = options.title || 'Nebula DNS Security Report'
  const dateRange = options.dateRange || 'Last 7 days'
  const sections = options.includeSections || {
    summary: true,
    topBlocked: true,
    categories: true,
    locations: true,
    trends: true,
  }

  let yPosition = 20

  // Header
  doc.setFontSize(20)
  doc.setTextColor(59, 130, 246) // Blue
  doc.text(title, 14, yPosition)
  yPosition += 10

  doc.setFontSize(10)
  doc.setTextColor(107, 114, 128) // Gray
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPosition)
  doc.text(`Date Range: ${dateRange}`, 14, yPosition + 5)
  yPosition += 20

  // Summary Section
  if (sections.summary && data.summary) {
    doc.setFontSize(14)
    doc.setTextColor(17, 24, 39) // Dark
    doc.text('Summary Statistics', 14, yPosition)
    yPosition += 8

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: [
        ['Total Queries', formatNumber(data.summary.totalQueries)],
        ['Blocked Queries', formatNumber(data.summary.blockedQueries)],
        ['Block Rate', formatPercent(data.summary.blockRate)],
        ['Cache Hit Rate', formatPercent(data.summary.cacheHitRate)],
        ['Avg Response Time', `${data.summary.avgResponseTime?.toFixed(1) || 0}ms`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14, right: 14 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15
  }

  // Top Blocked Domains
  if (sections.topBlocked && data.topBlocked && data.topBlocked.length > 0) {
    // Check if we need a new page
    if (yPosition > 220) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(14)
    doc.setTextColor(17, 24, 39)
    doc.text('Top Blocked Domains', 14, yPosition)
    yPosition += 8

    autoTable(doc, {
      startY: yPosition,
      head: [['Domain', 'Count', 'Category']],
      body: data.topBlocked.slice(0, 10).map(item => [
        item.domain,
        formatNumber(item.count),
        item.category || 'Unknown',
      ]),
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68] }, // Red for blocked
      margin: { left: 14, right: 14 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15
  }

  // Category Statistics
  if (sections.categories && data.categoryStats && data.categoryStats.length > 0) {
    if (yPosition > 220) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(14)
    doc.setTextColor(17, 24, 39)
    doc.text('Blocks by Category', 14, yPosition)
    yPosition += 8

    autoTable(doc, {
      startY: yPosition,
      head: [['Category', 'Count']],
      body: data.categoryStats.map(item => [
        item.category,
        formatNumber(item.count),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] }, // Purple
      margin: { left: 14, right: 14 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15
  }

  // Location Statistics
  if (sections.locations && data.locationStats && data.locationStats.length > 0) {
    if (yPosition > 220) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(14)
    doc.setTextColor(17, 24, 39)
    doc.text('Statistics by Location', 14, yPosition)
    yPosition += 8

    autoTable(doc, {
      startY: yPosition,
      head: [['Location', 'Queries', 'Blocked']],
      body: data.locationStats.map(item => [
        item.location,
        formatNumber(item.queries),
        formatNumber(item.blocked),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] }, // Green
      margin: { left: 14, right: 14 },
    })
  }

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(156, 163, 175)
    doc.text(
      `Nebula DNS Security Platform | Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }

  return doc.output('blob')
}

/**
 * Export report data to CSV format
 */
export async function exportToCsv(data: ReportData, options: ExportOptions = {}): Promise<Blob> {
  const sections = options.includeSections || {
    summary: true,
    topBlocked: true,
    categories: true,
    locations: true,
    trends: true,
  }

  const csvParts: string[] = []

  // Summary Section
  if (sections.summary && data.summary) {
    csvParts.push('# Summary Statistics')
    const summaryData = [
      { metric: 'Total Queries', value: data.summary.totalQueries },
      { metric: 'Blocked Queries', value: data.summary.blockedQueries },
      { metric: 'Block Rate (%)', value: data.summary.blockRate },
      { metric: 'Cache Hit Rate (%)', value: data.summary.cacheHitRate },
      { metric: 'Avg Response Time (ms)', value: data.summary.avgResponseTime },
    ]
    csvParts.push(Papa.unparse(summaryData))
    csvParts.push('')
  }

  // Top Blocked Domains
  if (sections.topBlocked && data.topBlocked && data.topBlocked.length > 0) {
    csvParts.push('# Top Blocked Domains')
    csvParts.push(Papa.unparse(data.topBlocked))
    csvParts.push('')
  }

  // Category Statistics
  if (sections.categories && data.categoryStats && data.categoryStats.length > 0) {
    csvParts.push('# Blocks by Category')
    csvParts.push(Papa.unparse(data.categoryStats))
    csvParts.push('')
  }

  // Location Statistics
  if (sections.locations && data.locationStats && data.locationStats.length > 0) {
    csvParts.push('# Statistics by Location')
    csvParts.push(Papa.unparse(data.locationStats))
    csvParts.push('')
  }

  // Query Trends
  if (sections.trends && data.queryTrends && data.queryTrends.length > 0) {
    csvParts.push('# Query Trends')
    csvParts.push(Papa.unparse(data.queryTrends))
  }

  const csvContent = csvParts.join('\n')
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
}

/**
 * Export report data to JSON format
 */
export async function exportToJson(data: ReportData, options: ExportOptions = {}): Promise<Blob> {
  const exportData = {
    metadata: {
      generated: new Date().toISOString(),
      dateRange: options.dateRange || 'Last 7 days',
      reportType: options.reportType || 'overview',
      title: options.title || 'Nebula DNS Security Report',
    },
    data,
  }

  const jsonContent = JSON.stringify(exportData, null, 2)
  return new Blob([jsonContent], { type: 'application/json' })
}

/**
 * Main export function that handles all formats
 */
export async function exportReport(
  format: 'pdf' | 'csv' | 'json',
  data: ReportData,
  options: ExportOptions = {}
): Promise<void> {
  let blob: Blob
  let extension: string

  switch (format) {
    case 'pdf':
      blob = await exportToPdf(data, options)
      extension = 'pdf'
      break
    case 'csv':
      blob = await exportToCsv(data, options)
      extension = 'csv'
      break
    case 'json':
      blob = await exportToJson(data, options)
      extension = 'json'
      break
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }

  const filename = `nebula-report-${getDateString()}.${extension}`
  downloadBlob(blob, filename)
}

/**
 * Export any array of objects to CSV and download
 */
export function exportArrayToCsv<T extends Record<string, any>>(
  data: T[],
  filename: string = 'export'
): void {
  if (data.length === 0) return

  const csvContent = Papa.unparse(data)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${filename}-${getDateString()}.csv`)
}

// Export individual functions and utilities
export const exportService = {
  exportToPdf,
  exportToCsv,
  exportToJson,
  exportReport,
  exportArrayToCsv,
  downloadBlob,
}

export default exportService
