/**
 * Nebula DNS - Invoice Table Component
 * Expandable invoice list with PDF download
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState, useCallback } from 'react'
import clsx from 'clsx'
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { Badge, Card, Skeleton } from '@/components/ui'
import {
  useAdminInvoices,
  Invoice,
  InvoiceListPagination,
} from '@/hooks/useAdminBilling'
import { API_URL } from '@/lib/api'

interface InvoiceTableProps {
  tenantId: string
  onLoadMore?: () => void
}

/**
 * Format currency amount (cents to dollars)
 */
function formatCurrency(cents: number, currency: string = 'usd'): string {
  const amount = cents / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Get badge variant based on invoice status
 */
function getStatusBadgeVariant(
  status: string
): 'success' | 'primary' | 'danger' | 'neutral' {
  switch (status) {
    case 'paid':
      return 'success'
    case 'open':
      return 'primary'
    case 'void':
    case 'uncollectible':
      return 'danger'
    default:
      return 'neutral'
  }
}

/**
 * Download invoice PDF using blob fetch pattern
 */
async function downloadInvoicePdf(tenantId: string, invoiceId: string): Promise<void> {
  const token = localStorage.getItem('admin_token')
  if (!token) {
    throw new Error('Admin authentication required')
  }

  const response = await fetch(
    `${API_URL}/admin/tenants/${tenantId}/billing/invoices/${invoiceId}/pdf`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error('Failed to download invoice PDF')
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `invoice-${invoiceId}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * Open invoice PDF in new tab
 */
async function viewInvoicePdf(tenantId: string, invoiceId: string): Promise<void> {
  const token = localStorage.getItem('admin_token')
  if (!token) {
    throw new Error('Admin authentication required')
  }

  const response = await fetch(
    `${API_URL}/admin/tenants/${tenantId}/billing/invoices/${invoiceId}/pdf`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error('Failed to load invoice PDF')
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  window.open(url, '_blank')
}

/**
 * Skeleton loader for invoice table
 */
function InvoiceTableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-space-200 dark:border-space-700">
            <th className="py-3 px-4 text-left text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider w-8"></th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider">Invoice #</th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider">Date</th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider">Amount</th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider">Status</th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-space-100 dark:divide-space-800">
          {[...Array(5)].map((_, i) => (
            <tr key={i}>
              <td className="py-4 px-4"><Skeleton className="h-4 w-4" /></td>
              <td className="py-4 px-4"><Skeleton className="h-4 w-24" /></td>
              <td className="py-4 px-4"><Skeleton className="h-4 w-20" /></td>
              <td className="py-4 px-4"><Skeleton className="h-4 w-16" /></td>
              <td className="py-4 px-4"><Skeleton className="h-5 w-12 rounded-full" /></td>
              <td className="py-4 px-4"><Skeleton className="h-8 w-20" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Empty state for no invoices
 */
function EmptyState() {
  return (
    <div className="text-center py-12">
      <DocumentTextIcon className="mx-auto h-12 w-12 text-space-400" />
      <h3 className="mt-4 text-lg font-semibold text-space-900 dark:text-white">
        No invoices yet
      </h3>
      <p className="mt-2 text-sm text-space-500 dark:text-space-400">
        Invoices will appear here once the tenant has billing activity.
      </p>
    </div>
  )
}

/**
 * Expanded row showing additional invoice details
 */
function InvoiceExpandedDetails({ invoice }: { invoice: Invoice }) {
  return (
    <tr className="bg-space-50 dark:bg-space-800/50">
      <td colSpan={6} className="py-4 px-4 pl-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-space-500 dark:text-space-400">Amount Paid</p>
            <p className="font-medium text-space-900 dark:text-white mt-1">
              {formatCurrency(invoice.amountPaid, invoice.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-space-500 dark:text-space-400">Currency</p>
            <p className="font-medium text-space-900 dark:text-white mt-1 uppercase">
              {invoice.currency}
            </p>
          </div>
          <div>
            <p className="text-xs text-space-500 dark:text-space-400">Due Date</p>
            <p className="font-medium text-space-900 dark:text-white mt-1">
              {invoice.dueDate ? formatDate(invoice.dueDate) : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-space-500 dark:text-space-400">Paid At</p>
            <p className="font-medium text-space-900 dark:text-white mt-1">
              {invoice.paidAt ? formatDate(invoice.paidAt) : 'Not paid'}
            </p>
          </div>
        </div>
      </td>
    </tr>
  )
}

/**
 * Invoice Table Component
 * Displays invoices with expandable rows and PDF download functionality
 */
export function InvoiceTable({ tenantId }: InvoiceTableProps) {
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const { data, isLoading, error } = useAdminInvoices(tenantId, { cursor })

  // Merge new data into all invoices when data changes
  const invoices = cursor ? allInvoices : (data?.data || [])
  const pagination: InvoiceListPagination = data?.pagination || { cursor: null, hasMore: false }

  /**
   * Toggle row expansion
   */
  const toggleExpand = (invoiceId: string) => {
    setExpandedInvoice(prev => (prev === invoiceId ? null : invoiceId))
  }

  /**
   * Load more invoices
   */
  const handleLoadMore = useCallback(async () => {
    if (!pagination.cursor || isLoadingMore) return
    setIsLoadingMore(true)
    setAllInvoices(prev => [...prev, ...(data?.data || [])])
    setCursor(pagination.cursor)
    setIsLoadingMore(false)
  }, [pagination.cursor, isLoadingMore, data?.data])

  /**
   * Handle PDF download
   */
  const handleDownload = async (e: React.MouseEvent, invoiceId: string) => {
    e.stopPropagation()
    setDownloadingId(invoiceId)
    try {
      await downloadInvoicePdf(tenantId, invoiceId)
    } catch (err) {
      console.error('Failed to download PDF:', err)
    } finally {
      setDownloadingId(null)
    }
  }

  /**
   * Handle PDF view in new tab
   */
  const handleView = async (e: React.MouseEvent, invoiceId: string) => {
    e.stopPropagation()
    try {
      await viewInvoicePdf(tenantId, invoiceId)
    } catch (err) {
      console.error('Failed to view PDF:', err)
    }
  }

  // Loading state
  if (isLoading && !cursor) {
    return (
      <Card variant="solid" padding="none">
        <InvoiceTableSkeleton />
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card variant="solid" padding="lg" className="border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-900/20">
        <p className="text-danger-700 dark:text-danger-300">
          Failed to load invoices: {error.message}
        </p>
      </Card>
    )
  }

  // Empty state
  if (!invoices || invoices.length === 0) {
    return (
      <Card variant="solid" padding="lg">
        <EmptyState />
      </Card>
    )
  }

  return (
    <Card variant="solid" padding="none">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-space-200 dark:border-space-700">
              <th className="py-3 px-4 text-left text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider w-8"></th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider">Invoice #</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider">Date</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider">Amount</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider">Status</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-space-100 dark:divide-space-800">
            {invoices.map((invoice) => (
              <>
                <tr
                  key={invoice.id}
                  onClick={() => toggleExpand(invoice.id)}
                  className={clsx(
                    'cursor-pointer transition-colors',
                    'hover:bg-space-50 dark:hover:bg-space-800/50',
                    expandedInvoice === invoice.id && 'bg-space-50 dark:bg-space-800/50'
                  )}
                >
                  <td className="py-4 px-4">
                    {expandedInvoice === invoice.id ? (
                      <ChevronDownIcon className="h-4 w-4 text-space-500" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-space-500" />
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-medium text-space-900 dark:text-white">
                      {invoice.number}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-space-600 dark:text-space-300">
                      {formatDate(invoice.created)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-medium text-space-900 dark:text-white">
                      {formatCurrency(invoice.amountDue, invoice.currency)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <Badge
                      variant={getStatusBadgeVariant(invoice.status)}
                      size="sm"
                    >
                      {invoice.status}
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {invoice.hasPdf && (
                        <>
                          <button
                            onClick={(e) => handleDownload(e, invoice.id)}
                            disabled={downloadingId === invoice.id}
                            className={clsx(
                              'p-1.5 rounded-lg transition-colors',
                              'text-space-500 hover:text-space-700 dark:text-space-400 dark:hover:text-space-200',
                              'hover:bg-space-100 dark:hover:bg-space-700',
                              downloadingId === invoice.id && 'opacity-50 cursor-not-allowed'
                            )}
                            title="Download PDF"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => handleView(e, invoice.id)}
                            className={clsx(
                              'text-sm font-medium transition-colors',
                              'text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300'
                            )}
                          >
                            View
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedInvoice === invoice.id && (
                  <InvoiceExpandedDetails key={`${invoice.id}-details`} invoice={invoice} />
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Load More Button */}
      {pagination.hasMore && (
        <div className="p-4 border-t border-space-200 dark:border-space-700">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className={clsx(
              'w-full py-2 px-4 text-sm font-medium rounded-lg transition-colors',
              'text-primary-600 dark:text-primary-400',
              'hover:bg-primary-50 dark:hover:bg-primary-900/20',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </Card>
  )
}
