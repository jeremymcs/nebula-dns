'use client'

import { useState } from 'react'
import { Card, StatCard, Button, Badge, Tabs, Modal } from '@/components/ui'
import { useMspBillingOverview, useMspBundles, useMspRealTimeUsage, useMspInvoices, useMspPurchases } from '@/hooks/useApi'
import { UsageBreakdown } from '@/components/billing/UsageBreakdown'
import { UsageChart } from '@/components/billing/UsageChart'
import { UsageExport } from '@/components/billing/UsageExport'
import { api } from '@/lib/api'
import {
  CreditCardIcon,
  CubeIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  BoltIcon
} from '@heroicons/react/24/outline'

// Simple date formatting helper
const formatDistanceToNow = (date: Date | string) => {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

export default function BillingPage() {
  const { data: overview, mutate: mutateOverview } = useMspBillingOverview()
  const { data: bundles } = useMspBundles()
  const { data: realTimeUsage } = useMspRealTimeUsage()
  const { data: invoicesData } = useMspInvoices({ limit: 10 })
  const { data: purchasesData } = useMspPurchases({ limit: 10 })

  const [selectedBundle, setSelectedBundle] = useState<any>(null)
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  const [activeTab, setActiveTab] = useState('bundles')

  const handlePurchaseBundle = async () => {
    if (!selectedBundle) return

    setPurchasing(true)
    try {
      await api.purchaseMspBundle(selectedBundle.id)
      mutateOverview()
      setPurchaseDialogOpen(false)
      setSelectedBundle(null)
    } catch (error) {
      console.error('Failed to purchase bundle:', error)
    } finally {
      setPurchasing(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const tabItems = [
    { id: 'overview', label: 'Usage Overview' },
    { id: 'bundles', label: 'Query Bundles' },
    { id: 'purchases', label: 'Purchase History' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'usage', label: 'Usage by Client' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Billing & Usage</h1>
          <p className="text-space-400">Manage your query bundles and view usage</p>
        </div>
        <UsageExport />
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Query Balance"
          value={formatNumber(overview?.queryBalance || 0)}
          icon={<CubeIcon className="h-5 w-5" />}
        />
        <StatCard
          title="Today's Usage"
          value={formatNumber(realTimeUsage?.todayQueries || 0)}
          icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
        />
        <StatCard
          title="This Month"
          value={formatNumber(overview?.usageThisMonth || 0)}
          icon={<CreditCardIcon className="h-5 w-5" />}
        />
        <StatCard
          title="Overage"
          value={formatNumber(overview?.currentOverage || 0)}
          icon={(overview?.currentOverage || 0) > 0 ? <ExclamationTriangleIcon className="h-5 w-5 text-warning-500" /> : <CheckCircleIcon className="h-5 w-5 text-success-500" />}
          variant={(overview?.currentOverage || 0) > 0 ? 'warning' : 'success'}
        />
      </div>

      <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <UsageBreakdown />
            <UsageChart />
          </div>
        )}

        {activeTab === 'bundles' && (
              <div className="grid gap-4 md:grid-cols-3">
                {(Array.isArray(bundles) ? bundles : []).map((bundle) => (
                  <Card key={bundle.id} className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <BoltIcon className="h-5 w-5 text-primary-400" />
                      <h3 className="text-lg font-semibold text-white">{bundle.name}</h3>
                    </div>
                    <p className="text-space-400 text-sm mb-4">{bundle.description}</p>
                    <div className="mb-4">
                      <div className="text-3xl font-bold text-white">${bundle.price}</div>
                      <p className="text-sm text-space-400">
                        {formatNumber(parseInt(bundle.queryCount))} queries
                      </p>
                      <p className="text-xs text-space-500">
                        ${bundle.pricePerMillion}/million • Valid {bundle.validityDays} days
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedBundle(bundle)
                        setPurchaseDialogOpen(true)
                      }}
                    >
                      Purchase Bundle
                    </Button>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === 'purchases' && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Purchase History</h3>
                <div className="space-y-4">
                  {purchasesData?.purchases?.map((purchase: any) => (
                    <div key={purchase.id} className="flex items-center justify-between border-b border-space-700 pb-4 last:border-0">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary-500/10 rounded-lg">
                          <CubeIcon className="h-5 w-5 text-primary-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{purchase.bundleName}</p>
                          <p className="text-sm text-space-400">
                            {formatNumber(purchase.queryCount)} queries
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-white">${purchase.amount}</p>
                        <p className="text-sm text-space-400">
                          {formatDistanceToNow(purchase.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!purchasesData?.purchases || purchasesData.purchases.length === 0) && (
                    <p className="text-center text-space-400 py-8">No purchases yet</p>
                  )}
                </div>
              </Card>
            )}

            {activeTab === 'invoices' && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Invoices</h3>
                <div className="space-y-4">
                  {invoicesData?.invoices?.map((invoice: any) => (
                    <div key={invoice.id} className="flex items-center justify-between border-b border-space-700 pb-4 last:border-0">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-space-700 rounded-lg">
                          <CreditCardIcon className="h-5 w-5 text-space-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">Invoice #{invoice.invoiceNumber}</p>
                          <p className="text-sm text-space-400">
                            {new Date(invoice.periodStart).toLocaleDateString()} - {new Date(invoice.periodEnd).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium text-white">${invoice.totalAmount}</p>
                          <Badge variant={invoice.status === 'paid' ? 'success' : 'neutral'}>
                            {invoice.status}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm">
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!invoicesData?.invoices || invoicesData.invoices.length === 0) && (
                    <p className="text-center text-space-400 py-8">No invoices yet</p>
                  )}
                </div>
              </Card>
            )}

            {activeTab === 'usage' && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Usage by Client</h3>
                <div className="space-y-4">
                  {realTimeUsage?.byTenant?.map((tenant) => (
                    <div key={tenant.tenantId} className="flex items-center justify-between">
                      <p className="font-medium text-white">{tenant.tenantName}</p>
                      <div className="flex items-center gap-4">
                        <div className="w-32 h-2 bg-space-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full"
                            style={{ width: `${(tenant.queries / (realTimeUsage.todayQueries || 1)) * 100}%` }}
                          />
                        </div>
                        <p className="text-sm font-medium text-white w-20 text-right">
                          {formatNumber(tenant.queries)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!realTimeUsage?.byTenant || realTimeUsage.byTenant.length === 0) && (
                    <p className="text-center text-space-400 py-8">No usage data yet</p>
                  )}
                </div>
              </Card>
            )}
      </div>

      {/* Purchase Confirmation Dialog */}
      <Modal
        isOpen={purchaseDialogOpen}
        onClose={() => setPurchaseDialogOpen(false)}
        title="Confirm Purchase"
      >
        <p className="text-space-400 mb-4">
          You are about to purchase the {selectedBundle?.name} bundle.
        </p>
        <div className="bg-space-800 p-4 rounded-lg space-y-2 mb-6">
          <div className="flex justify-between text-space-300">
            <span>Bundle</span>
            <span className="font-medium text-white">{selectedBundle?.name}</span>
          </div>
          <div className="flex justify-between text-space-300">
            <span>Queries</span>
            <span className="font-medium text-white">{formatNumber(parseInt(selectedBundle?.queryCount || '0'))}</span>
          </div>
          <div className="flex justify-between text-space-300">
            <span>Validity</span>
            <span className="font-medium text-white">{selectedBundle?.validityDays} days</span>
          </div>
          <div className="flex justify-between border-t border-space-700 pt-2 mt-2">
            <span className="font-medium text-white">Total</span>
            <span className="font-bold text-lg text-primary-400">${selectedBundle?.price}</span>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setPurchaseDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handlePurchaseBundle} disabled={purchasing}>
            {purchasing ? 'Processing...' : 'Confirm Purchase'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
