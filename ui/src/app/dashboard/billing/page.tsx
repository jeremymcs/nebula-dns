'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useMspBillingOverview, useMspBundles, useMspRealTimeUsage, useMspInvoices, useMspPurchases } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { CreditCard, Package, TrendingUp, AlertTriangle, Download, Clock, CheckCircle, Zap } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function BillingPage() {
  const { data: overview, mutate: mutateOverview } = useMspBillingOverview()
  const { data: bundles } = useMspBundles()
  const { data: realTimeUsage } = useMspRealTimeUsage()
  const { data: invoicesData } = useMspInvoices({ limit: 10 })
  const { data: purchasesData } = useMspPurchases({ limit: 10 })
  
  const [selectedBundle, setSelectedBundle] = useState<any>(null)
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false)
  const [purchasing, setPurchasing] = useState(false)

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

  const usagePercentage = overview 
    ? (overview.totalUsed / overview.totalPurchased) * 100 
    : 0

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing & Usage</h1>
          <p className="text-muted-foreground">Manage your query bundles and view usage</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Query Balance</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(overview?.queryBalance || 0)}</div>
            <Progress value={100 - usagePercentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {formatNumber(overview?.totalUsed || 0)} of {formatNumber(overview?.totalPurchased || 0)} used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(realTimeUsage?.todayQueries || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(realTimeUsage?.lastHourQueries || 0)} in the last hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(overview?.usageThisMonth || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Est. cost: ${(overview?.estimatedCost || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overage</CardTitle>
            {(overview?.currentOverage || 0) > 0 ? (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(overview?.currentOverage || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Rate: ${overview?.overageRate || 0}/million queries
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bundles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bundles">Query Bundles</TabsTrigger>
          <TabsTrigger value="purchases">Purchase History</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="usage">Usage by Client</TabsTrigger>
        </TabsList>

        <TabsContent value="bundles" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {bundles?.map((bundle) => (
              <Card key={bundle.id} className="relative">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    {bundle.name}
                  </CardTitle>
                  <CardDescription>{bundle.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold">${bundle.price}</div>
                    <p className="text-sm text-muted-foreground">
                      {formatNumber(parseInt(bundle.queryCount))} queries
                    </p>
                    <p className="text-xs text-muted-foreground">
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
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="purchases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase History</CardTitle>
              <CardDescription>Your recent bundle purchases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {purchasesData?.purchases?.map((purchase: any) => (
                  <div key={purchase.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{purchase.bundleName}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(purchase.queryCount)} queries
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${purchase.amount}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(purchase.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
                {(!purchasesData?.purchases || purchasesData.purchases.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">No purchases yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>Your billing invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoicesData?.invoices?.map((invoice: any) => (
                  <div key={invoice.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Invoice #{invoice.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(invoice.periodStart).toLocaleDateString()} - {new Date(invoice.periodEnd).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">${invoice.totalAmount}</p>
                        <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                          {invoice.status}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(!invoicesData?.invoices || invoicesData.invoices.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">No invoices yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage by Client</CardTitle>
              <CardDescription>Today's query distribution across clients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {realTimeUsage?.byTenant?.map((tenant) => (
                  <div key={tenant.tenantId} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{tenant.tenantName}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <Progress
                          value={(tenant.queries / (realTimeUsage.todayQueries || 1)) * 100}
                        />
                      </div>
                      <p className="text-sm font-medium w-20 text-right">
                        {formatNumber(tenant.queries)}
                      </p>
                    </div>
                  </div>
                ))}
                {(!realTimeUsage?.byTenant || realTimeUsage.byTenant.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">No usage data yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Purchase Confirmation Dialog */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              You are about to purchase the {selectedBundle?.name} bundle.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Bundle</span>
                <span className="font-medium">{selectedBundle?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Queries</span>
                <span className="font-medium">{formatNumber(parseInt(selectedBundle?.queryCount || '0'))}</span>
              </div>
              <div className="flex justify-between">
                <span>Validity</span>
                <span className="font-medium">{selectedBundle?.validityDays} days</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="font-medium">Total</span>
                <span className="font-bold text-lg">${selectedBundle?.price}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePurchaseBundle} disabled={purchasing}>
              {purchasing ? 'Processing...' : 'Confirm Purchase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

