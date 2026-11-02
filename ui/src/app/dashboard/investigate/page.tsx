/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Domain Investigation - Deep-dive domain intelligence
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { DomainInvestigationPanel, InvestigationData, PdfExportModal } from '@/components/investigation'
import { useToast } from '@/components/Toast'
import { useLists } from '@/hooks/useApi'
import { api } from '@/lib/api'
import {
  MagnifyingGlassIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  ListBulletIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  ArrowPathIcon,
  NoSymbolIcon,
  XMarkIcon,
  PlusIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

interface RecentInvestigation {
  domain: string
  timestamp: Date
  status: 'clean' | 'suspicious' | 'malicious'
  threatScore: number
}

interface DomainList {
  id: string
  name: string
  type: 'allowlist' | 'blocklist'
  entryCount: number
}

export default function InvestigatePage() {
  const { showToast } = useToast()
  const { data: listsData, mutate: mutateLists } = useLists()
  const [domain, setDomain] = useState('')
  const [investigation, setInvestigation] = useState<InvestigationData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showListModal, setShowListModal] = useState(false)
  const [showPdfExport, setShowPdfExport] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ action: string; domain: string } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [monitoredDomains, setMonitoredDomains] = useState<string[]>([])

  const lists: DomainList[] = listsData?.data || []
  const blocklists = lists.filter(l => l.type === 'blocklist')
  const allowlists = lists.filter(l => l.type === 'allowlist')

  // Initialize recent investigations from localStorage or use demo data
  const [recentInvestigations, setRecentInvestigations] = useState<RecentInvestigation[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('recentInvestigations')
        if (stored) {
          const parsed = JSON.parse(stored)
          // Convert timestamp strings back to Date objects
          return parsed.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }))
        }
      } catch {
        // Fall through to default
      }
    }
    // Default demo data for new users
    return [
      { domain: 'example.com', timestamp: new Date(Date.now() - 3600000), status: 'clean' as const, threatScore: 0 },
      { domain: 'suspicious-site.net', timestamp: new Date(Date.now() - 7200000), status: 'suspicious' as const, threatScore: 35 },
      { domain: 'malware-c2.bad', timestamp: new Date(Date.now() - 86400000), status: 'malicious' as const, threatScore: 85 },
    ]
  })

  // Persist recent investigations to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('recentInvestigations', JSON.stringify(recentInvestigations))
      } catch {
        // Silently fail if localStorage is full or unavailable
      }
    }
  }, [recentInvestigations])
  const [bulkDomains, setBulkDomains] = useState('')
  const [activeTab, setActiveTab] = useState<'search' | 'recent' | 'bulk'>('search')

  const handleInvestigate = async (domainToInvestigate?: string) => {
    const targetDomain = domainToInvestigate || domain
    if (!targetDomain) return

    setIsLoading(true)
    setDomain(targetDomain)

    try {
      // Call real API
      const result = await api.investigateDomain(targetDomain)
      setInvestigation(result)

      // Add to recent investigations based on API response
      const status: RecentInvestigation['status'] =
        result.riskScore >= 70 ? 'malicious' :
        result.riskScore >= 30 ? 'suspicious' : 'clean'

      const newRecent: RecentInvestigation = {
        domain: targetDomain,
        timestamp: new Date(),
        status,
        threatScore: result.riskScore || 0,
      }
      setRecentInvestigations((prev) => [newRecent, ...prev.filter(r => r.domain !== targetDomain)].slice(0, 10))
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to investigate domain. Please try again.')
      setInvestigation(null)
    }

    setIsLoading(false)
  }

  const handleAction = (action: string, targetDomain: string) => {
    if (action === 'block' || action === 'allowlist') {
      // Show list selection modal
      setPendingAction({ action, domain: targetDomain })
      setShowListModal(true)
    } else if (action === 'monitor') {
      // Toggle monitoring
      if (monitoredDomains.includes(targetDomain)) {
        setMonitoredDomains(prev => prev.filter(d => d !== targetDomain))
        showToast('info', 'Monitoring Stopped', `No longer monitoring ${targetDomain}`)
      } else {
        setMonitoredDomains(prev => [...prev, targetDomain])
        showToast('success', 'Monitoring Started', `Now monitoring ${targetDomain} for changes`)
      }
    }
  }

  const handleAddToList = async (listId: string) => {
    if (!pendingAction) return

    setActionLoading(true)
    try {
      await api.addListEntry(listId, {
        domain: pendingAction.domain,
        comment: `Added from investigation on ${new Date().toLocaleDateString()}`
      })

      const list = lists.find(l => l.id === listId)
      showToast(
        'success',
        pendingAction.action === 'block' ? 'Domain Blocked' : 'Domain Allowed',
        `${pendingAction.domain} added to ${list?.name || 'list'}`
      )
      mutateLists()
      setShowListModal(false)
      setPendingAction(null)
    } catch (err: any) {
      showToast('error', 'Failed to add domain', err.message || 'Please try again')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateListAndAdd = async (type: 'blocklist' | 'allowlist') => {
    if (!pendingAction) return

    setActionLoading(true)
    try {
      // Create a new quick list
      const listName = type === 'blocklist'
        ? 'Investigation Blocklist'
        : 'Investigation Allowlist'

      const newList = await api.createList({
        name: listName,
        description: `Auto-created from domain investigation`,
        type,
      })

      // Add the domain to it
      await api.addListEntry(newList.id, {
        domain: pendingAction.domain,
        comment: `Added from investigation on ${new Date().toLocaleDateString()}`
      })

      showToast(
        'success',
        type === 'blocklist' ? 'Domain Blocked' : 'Domain Allowed',
        `${pendingAction.domain} added to new ${listName}`
      )
      mutateLists()
      setShowListModal(false)
      setPendingAction(null)
    } catch (err: any) {
      showToast('error', 'Failed to create list', err.message || 'Please try again')
    } finally {
      setActionLoading(false)
    }
  }

  const handleBulkInvestigate = async () => {
    const domains = bulkDomains.split('\n').map(d => d.trim()).filter(Boolean)
    if (domains.length === 0) return

    setIsLoading(true)
    for (const d of domains) {
      await handleInvestigate(d)
    }
    setIsLoading(false)
    setBulkDomains('')
    setActiveTab('recent')
  }

  const handleExport = () => {
    if (!investigation) return
    const data = JSON.stringify(investigation, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `investigation-${investigation.domain}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getStatusIcon = (status: RecentInvestigation['status']) => {
    switch (status) {
      case 'malicious':
        return <ShieldExclamationIcon className="h-5 w-5 text-danger-500" />
      case 'suspicious':
        return <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
      default:
        return <CheckCircleIcon className="h-5 w-5 text-success-500" />
    }
  }

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-500">
            <MagnifyingGlassIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-space-900 dark:text-white">Domain Investigation</h1>
            <p className="text-space-500">Deep-dive into domain intelligence and threat analysis</p>
          </div>
        </div>
        {investigation && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 text-space-600 dark:text-space-400 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg border border-space-200 dark:border-space-700"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              JSON
            </button>
            <button
              onClick={() => setShowPdfExport(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white hover:bg-primary-600 rounded-lg"
            >
              <DocumentTextIcon className="h-5 w-5" />
              Export PDF
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-space-100 dark:bg-space-800 rounded-lg w-fit">
        {[
          { id: 'search' as const, label: 'Search', icon: MagnifyingGlassIcon },
          { id: 'recent' as const, label: 'Recent', icon: ClockIcon },
          { id: 'bulk' as const, label: 'Bulk', icon: ListBulletIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-white dark:bg-space-700 text-space-900 dark:text-white shadow-sm'
                : 'text-space-500 hover:text-space-700 dark:hover:text-space-300'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-space-400" />
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvestigate()}
                placeholder="Enter domain to investigate (e.g., suspicious-domain.com)"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-900 text-space-900 dark:text-white text-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => handleInvestigate()}
              disabled={!domain || isLoading}
              className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 font-medium flex items-center gap-2"
            >
              {isLoading && <ArrowPathIcon className="h-5 w-5 animate-spin" />}
              {isLoading ? 'Investigating...' : 'Investigate'}
            </button>
          </div>

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-sm text-space-500">Try:</span>
            {['malware-c2.bad', 'phishing-site.xyz', 'tracker.adnetwork.com', 'google.com'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleInvestigate(suggestion)}
                className="px-3 py-1 text-sm bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-400 rounded-full hover:bg-space-200 dark:hover:bg-space-600"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Tab */}
      {activeTab === 'recent' && (
        <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700">
          <div className="p-4 border-b border-space-200 dark:border-space-700 flex items-center justify-between">
            <h3 className="font-medium text-space-900 dark:text-white">Recent Investigations</h3>
            {recentInvestigations.length > 0 && (
              <button
                onClick={() => setRecentInvestigations([])}
                className="text-sm text-space-500 hover:text-danger-500 flex items-center gap-1"
              >
                <TrashIcon className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
          {recentInvestigations.length === 0 ? (
            <div className="p-8 text-center text-space-500">
              No recent investigations
            </div>
          ) : (
            <div className="divide-y divide-space-200 dark:divide-space-700">
              {recentInvestigations.map((item) => (
                <button
                  key={item.domain}
                  onClick={() => {
                    setActiveTab('search')
                    handleInvestigate(item.domain)
                  }}
                  className="w-full p-4 flex items-center gap-4 hover:bg-space-50 dark:hover:bg-space-700/50 transition-colors text-left"
                >
                  {getStatusIcon(item.status)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-space-900 dark:text-white truncate">{item.domain}</p>
                    <p className="text-sm text-space-500">{formatTimeAgo(item.timestamp)}</p>
                  </div>
                  <div className={clsx(
                    'px-2 py-1 rounded text-xs font-medium',
                    item.status === 'malicious' && 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400',
                    item.status === 'suspicious' && 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
                    item.status === 'clean' && 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400'
                  )}>
                    {item.threatScore}% threat
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bulk Tab */}
      {activeTab === 'bulk' && (
        <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-6">
          <h3 className="font-medium text-space-900 dark:text-white mb-4">Bulk Domain Investigation</h3>
          <textarea
            value={bulkDomains}
            onChange={(e) => setBulkDomains(e.target.value)}
            placeholder="Enter domains (one per line)&#10;example1.com&#10;example2.com&#10;example3.com"
            rows={8}
            className="w-full p-4 rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-900 text-space-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-space-500">
              {bulkDomains.split('\n').filter(d => d.trim()).length} domains
            </p>
            <button
              onClick={handleBulkInvestigate}
              disabled={!bulkDomains.trim() || isLoading}
              className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 font-medium flex items-center gap-2"
            >
              {isLoading && <ArrowPathIcon className="h-5 w-5 animate-spin" />}
              Investigate All
            </button>
          </div>
        </div>
      )}

      {/* Investigation Results */}
      {investigation && (
        <DomainInvestigationPanel
          investigation={investigation}
          onAction={handleAction}
        />
      )}

      {/* Empty State */}
      {!investigation && !isLoading && activeTab === 'search' && (
        <div className="text-center py-16 bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700">
          <MagnifyingGlassIcon className="h-16 w-16 text-space-300 dark:text-space-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-space-900 dark:text-white mb-2">
            No Domain Selected
          </h3>
          <p className="text-space-500 max-w-md mx-auto">
            Enter a domain above to investigate its reputation, hosting details, WHOIS information, and threat intelligence.
          </p>
        </div>
      )}

      {/* List Selection Modal */}
      {showListModal && pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowListModal(false)
              setPendingAction(null)
            }}
          />
          <div className="relative bg-white dark:bg-space-800 rounded-xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-space-200 dark:border-space-700">
              <div className="flex items-center gap-3">
                {pendingAction.action === 'block' ? (
                  <div className="p-2 rounded-lg bg-danger-100 dark:bg-danger-900/30">
                    <NoSymbolIcon className="h-5 w-5 text-danger-600 dark:text-danger-400" />
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-success-100 dark:bg-success-900/30">
                    <CheckCircleIcon className="h-5 w-5 text-success-600 dark:text-success-400" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-space-900 dark:text-white">
                    {pendingAction.action === 'block' ? 'Block Domain' : 'Allow Domain'}
                  </h3>
                  <p className="text-sm text-space-500 font-mono">{pendingAction.domain}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowListModal(false)
                  setPendingAction(null)
                }}
                className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5 text-space-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              <p className="text-sm text-space-600 dark:text-space-400">
                Select a list to add this domain to:
              </p>

              {/* Existing Lists */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(pendingAction.action === 'block' ? blocklists : allowlists).length === 0 ? (
                  <p className="text-sm text-space-500 py-4 text-center">
                    No {pendingAction.action === 'block' ? 'blocklists' : 'allowlists'} found
                  </p>
                ) : (
                  (pendingAction.action === 'block' ? blocklists : allowlists).map((list) => (
                    <button
                      key={list.id}
                      onClick={() => handleAddToList(list.id)}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-space-200 dark:border-space-700 hover:bg-space-50 dark:hover:bg-space-700/50 transition-colors text-left disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        {pendingAction.action === 'block' ? (
                          <NoSymbolIcon className="h-5 w-5 text-danger-500" />
                        ) : (
                          <CheckCircleIcon className="h-5 w-5 text-success-500" />
                        )}
                        <div>
                          <p className="font-medium text-space-900 dark:text-white">{list.name}</p>
                          <p className="text-xs text-space-500">{list.entryCount} entries</p>
                        </div>
                      </div>
                      {actionLoading && (
                        <ArrowPathIcon className="h-4 w-4 animate-spin text-space-400" />
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Create New List */}
              <div className="pt-4 border-t border-space-200 dark:border-space-700">
                <button
                  onClick={() => handleCreateListAndAdd(pendingAction.action === 'block' ? 'blocklist' : 'allowlist')}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-space-300 dark:border-space-600 hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-space-600 dark:text-space-400 hover:text-primary-600 dark:hover:text-primary-400 disabled:opacity-50"
                >
                  <PlusIcon className="h-5 w-5" />
                  Create new {pendingAction.action === 'block' ? 'blocklist' : 'allowlist'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Export Modal */}
      {investigation && (
        <PdfExportModal
          isOpen={showPdfExport}
          onClose={() => setShowPdfExport(false)}
          investigation={investigation}
        />
      )}
    </div>
  )
}
