/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * PDF Export Modal - Branded PDF report generation for investigations
 */

'use client'

import { useState } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { InvestigationData } from './types'
import {
  XMarkIcon,
  DocumentArrowDownIcon,
  PhotoIcon,
  SwatchIcon,
  BuildingOffice2Icon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

interface PdfExportModalProps {
  isOpen: boolean
  onClose: () => void
  investigation: InvestigationData
}

interface BrandingOptions {
  companyName: string
  logoUrl: string
  primaryColor: string
  includeHeader: boolean
  includeFooter: boolean
  includeThreatDetails: boolean
  includeNetworkActivity: boolean
  includeTimeline: boolean
  includeRecommendations: boolean
}

const defaultBranding: BrandingOptions = {
  companyName: 'Nebula DNS',
  logoUrl: '',
  primaryColor: '#667eea',
  includeHeader: true,
  includeFooter: true,
  includeThreatDetails: true,
  includeNetworkActivity: true,
  includeTimeline: true,
  includeRecommendations: true,
}

const colorPresets = [
  { name: 'Nebula', color: '#667eea' },
  { name: 'Ocean', color: '#0ea5e9' },
  { name: 'Forest', color: '#22c55e' },
  { name: 'Sunset', color: '#f97316' },
  { name: 'Berry', color: '#ec4899' },
  { name: 'Slate', color: '#64748b' },
]

export function PdfExportModal({ isOpen, onClose, investigation }: PdfExportModalProps) {
  const [branding, setBranding] = useState<BrandingOptions>(defaultBranding)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<'branding' | 'content'>('branding')

  if (!isOpen) return null

  const getThreatLevel = () => {
    const hasMalicious = investigation.threats.some(t => t.status === 'malicious')
    const hasSuspicious = investigation.threats.some(t => t.status === 'suspicious')
    if (hasMalicious) return { level: 'High', color: '#ef4444' }
    if (hasSuspicious) return { level: 'Medium', color: '#f59e0b' }
    return { level: 'Low', color: '#22c55e' }
  }

  const generatePdf = async () => {
    setIsGenerating(true)
    
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 20
      let yPos = margin
      const threat = getThreatLevel()

      // Header with branding
      if (branding.includeHeader) {
        // Header background
        doc.setFillColor(branding.primaryColor)
        doc.rect(0, 0, pageWidth, 45, 'F')

        // Company name
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(20)
        doc.setFont('helvetica', 'bold')
        doc.text(branding.companyName, margin, 20)

        // Report title
        doc.setFontSize(12)
        doc.setFont('helvetica', 'normal')
        doc.text('Domain Investigation Report', margin, 32)

        // Date on right side
        doc.setFontSize(10)
        doc.text(new Date().toLocaleDateString('en-US', { 
          year: 'numeric', month: 'long', day: 'numeric' 
        }), pageWidth - margin, 20, { align: 'right' })

        yPos = 60
      }

      // Domain and threat summary
      doc.setTextColor(30, 41, 59)
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text(investigation.domain, margin, yPos)
      yPos += 12

      // Threat level badge
      doc.setFillColor(threat.color)
      const badgeWidth = doc.getTextWidth(`Threat Level: ${threat.level}`) + 16
      doc.roundedRect(margin, yPos - 6, badgeWidth, 10, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(`Threat Level: ${threat.level}`, margin + 8, yPos + 1)
      yPos += 20

      // Domain Intelligence section
      doc.setTextColor(30, 41, 59)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Domain Intelligence', margin, yPos)
      yPos += 8

      const intelData = [
        ['Registrar', investigation.intel.registrar || 'Unknown'],
        ['Registration Date', investigation.intel.registrationDate || 'Unknown'],
        ['Domain Age', investigation.intel.domainAge || 'Unknown'],
        ['Hosting Provider', investigation.intel.hostingProvider || 'Unknown'],
        ['Country', investigation.intel.country || 'Unknown'],
        ['ASN', investigation.intel.asn || 'Unknown'],
        ['IP Addresses', investigation.intel.ipAddresses.join(', ') || 'Unknown'],
      ]

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: intelData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 50, textColor: [100, 116, 139] },
          1: { cellWidth: 'auto' },
        },
        margin: { left: margin, right: margin },
      })

      yPos = (doc as any).lastAutoTable.finalY + 15

      // Threat indicators section
      if (branding.includeThreatDetails) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Threat Intelligence', margin, yPos)
        yPos += 8

        const threatData = investigation.threats.map(t => [
          t.source,
          `${t.score}/${t.maxScore}`,
          t.status.charAt(0).toUpperCase() + t.status.slice(1),
          t.details || '-',
        ])

        autoTable(doc, {
          startY: yPos,
          head: [['Source', 'Score', 'Status', 'Details']],
          body: threatData,
          theme: 'striped',
          headStyles: { fillColor: branding.primaryColor, fontSize: 10 },
          styles: { fontSize: 9, cellPadding: 3 },
          margin: { left: margin, right: margin },
        })

        yPos = (doc as any).lastAutoTable.finalY + 15
      }

      // Network activity section
      if (branding.includeNetworkActivity && yPos < pageHeight - 80) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Network Activity', margin, yPos)
        yPos += 8

        const activityData = [
          ['First Seen', new Date(investigation.activity.firstSeen).toLocaleString()],
          ['Last Seen', new Date(investigation.activity.lastSeen).toLocaleString()],
          ['Total Queries', investigation.activity.totalQueries.toLocaleString()],
          ['Unique Clients', investigation.activity.uniqueClients.toString()],
          ['Zones', investigation.activity.zones.join(', ')],
        ]

        autoTable(doc, {
          startY: yPos,
          head: [],
          body: activityData,
          theme: 'plain',
          styles: { fontSize: 10, cellPadding: 3 },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50, textColor: [100, 116, 139] },
            1: { cellWidth: 'auto' },
          },
          margin: { left: margin, right: margin },
        })

        yPos = (doc as any).lastAutoTable.finalY + 15
      }

      // Timeline section
      if (branding.includeTimeline && investigation.timeline.length > 0 && yPos < pageHeight - 60) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Activity Timeline', margin, yPos)
        yPos += 8

        const timelineData = investigation.timeline.map(event => [
          new Date(event.timestamp).toLocaleString(),
          event.event.replace('_', ' ').toUpperCase(),
          event.details,
          event.zone || '-',
        ])

        autoTable(doc, {
          startY: yPos,
          head: [['Timestamp', 'Event', 'Details', 'Zone']],
          body: timelineData,
          theme: 'striped',
          headStyles: { fillColor: branding.primaryColor, fontSize: 10 },
          styles: { fontSize: 9, cellPadding: 3 },
          margin: { left: margin, right: margin },
        })

        yPos = (doc as any).lastAutoTable.finalY + 15
      }

      // Recommendations section
      if (branding.includeRecommendations) {
        if (yPos > pageHeight - 60) {
          doc.addPage()
          yPos = margin
        }

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Recommendations', margin, yPos)
        yPos += 10

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(71, 85, 105)

        const recommendations = threat.level === 'High'
          ? [
              '• Immediately block this domain across all policies',
              '• Investigate any clients that accessed this domain',
              '• Check for indicators of compromise on affected systems',
              '• Consider reporting to relevant threat intelligence feeds',
            ]
          : threat.level === 'Medium'
          ? [
              '• Monitor this domain for suspicious activity',
              '• Consider adding to a watchlist for further analysis',
              '• Review access patterns from your network',
            ]
          : [
              '• No immediate action required',
              '• Continue monitoring as part of normal operations',
            ]

        recommendations.forEach((rec, i) => {
          doc.text(rec, margin, yPos + (i * 6))
        })
      }

      // Footer
      if (branding.includeFooter) {
        const footerY = pageHeight - 15
        doc.setDrawColor(200, 200, 200)
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)

        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        doc.text(
          `Generated by ${branding.companyName} • ${new Date().toLocaleString()}`,
          pageWidth / 2,
          footerY,
          { align: 'center' }
        )
        doc.text('Confidential - For Internal Use Only', pageWidth / 2, footerY + 4, { align: 'center' })
      }

      // Save the PDF
      doc.save(`investigation-${investigation.domain}-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-space-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-space-200 dark:border-space-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-nebula-100 dark:bg-nebula-900/30">
              <DocumentArrowDownIcon className="h-5 w-5 text-nebula-600 dark:text-nebula-400" />
            </div>
            <div>
              <h3 className="font-semibold text-space-900 dark:text-white">Export PDF Report</h3>
              <p className="text-sm text-space-500">{investigation.domain}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg">
            <XMarkIcon className="h-5 w-5 text-space-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-space-200 dark:border-space-700">
          {[
            { id: 'branding' as const, label: 'Branding', icon: SwatchIcon },
            { id: 'content' as const, label: 'Content', icon: DocumentArrowDownIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'text-nebula-600 dark:text-nebula-400 border-b-2 border-nebula-500'
                  : 'text-space-500 hover:text-space-700 dark:hover:text-space-300'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 max-h-[50vh] overflow-y-auto">
          {activeTab === 'branding' && (
            <>
              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
                  Company Name
                </label>
                <div className="relative">
                  <BuildingOffice2Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-space-400" />
                  <input
                    type="text"
                    value={branding.companyName}
                    onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-900 text-space-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
                  Logo URL (optional)
                </label>
                <div className="relative">
                  <PhotoIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-space-400" />
                  <input
                    type="text"
                    value={branding.logoUrl}
                    onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-900 text-space-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Color Presets */}
              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                  Brand Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => setBranding({ ...branding, primaryColor: preset.color })}
                      className={clsx(
                        'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
                        branding.primaryColor === preset.color
                          ? 'border-nebula-500 ring-2 ring-nebula-500/30'
                          : 'border-space-200 dark:border-space-700 hover:border-space-300'
                      )}
                    >
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.color }} />
                      <span className="text-sm text-space-700 dark:text-space-300">{preset.name}</span>
                    </button>
                  ))}
                </div>
                {/* Custom color picker */}
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="color"
                    value={branding.primaryColor}
                    onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer"
                  />
                  <span className="text-sm text-space-500">Custom color</span>
                </div>
              </div>
            </>
          )}

          {activeTab === 'content' && (
            <div className="space-y-3">
              {[
                { key: 'includeHeader', label: 'Include branded header' },
                { key: 'includeFooter', label: 'Include footer with timestamp' },
                { key: 'includeThreatDetails', label: 'Include threat intelligence details' },
                { key: 'includeNetworkActivity', label: 'Include network activity' },
                { key: 'includeTimeline', label: 'Include activity timeline' },
                { key: 'includeRecommendations', label: 'Include recommendations' },
              ].map((option) => (
                <label
                  key={option.key}
                  className="flex items-center gap-3 p-3 rounded-lg border border-space-200 dark:border-space-700 hover:bg-space-50 dark:hover:bg-space-700/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={branding[option.key as keyof BrandingOptions] as boolean}
                    onChange={(e) => setBranding({ ...branding, [option.key]: e.target.checked })}
                    className="w-4 h-4 rounded border-space-300 text-nebula-600 focus:ring-nebula-500"
                  />
                  <span className="text-sm text-space-700 dark:text-space-300">{option.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-space-200 dark:border-space-700 bg-space-50 dark:bg-space-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-space-600 dark:text-space-400 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={generatePdf}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-2 bg-nebula-500 text-white rounded-lg hover:bg-nebula-600 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <DocumentArrowDownIcon className="h-5 w-5" />
                Generate PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
