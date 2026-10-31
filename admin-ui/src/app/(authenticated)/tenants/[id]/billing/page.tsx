/**
 * Nebula DNS - Tenant Billing Page (Admin UI)
 * Admin interface for viewing and managing tenant billing
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import {
  ArrowLeftIcon,
  CheckBadgeIcon,
  CalendarIcon,
  CreditCardIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { Card, Badge, Skeleton } from '@/components/ui'
import {
  useAdminSubscriptionStatus,
  useAdminPaymentMethods,
  useAdminInvoices,
  SubscriptionStatus,
  CreditAppliedResponse,
  TierChangeResponse,
  ExtensionResponse,
} from '@/hooks/useAdminBilling'
import { PaymentMethodList } from '@/components/billing/PaymentMethodList'
import { AddPaymentMethodModal } from '@/components/billing/AddPaymentMethodModal'
import { InvoiceTable } from '@/components/billing/InvoiceTable'
import { ApplyCreditModal } from '@/components/billing/ApplyCreditModal'
import { ChangeTierModal } from '@/components/billing/ChangeTierModal'
import { ExtendTrialModal } from '@/components/billing/ExtendTrialModal'
import { ExtendGraceModal } from '@/components/billing/ExtendGraceModal'
import { useToast } from '@/components/Toast'

interface BillingPageProps {
  params: Promise<{ id: string }>
}

// Modal types
type ActiveModal = 'payment' | 'credit' | 'tier' | 'trial' | 'grace' | null

/**
 * Get Badge variant based on subscription status
 */
function getStatusBadgeVariant(
  status: SubscriptionStatus['status']
): 'success' | 'warning' | 'danger' | 'primary' | 'neutral' {
  switch (status) {
    case 'active':
      return 'success'
    case 'trialing':
      return 'primary'
    case 'past_due':
      return 'warning'
    case 'canceled':
    case 'paused':
      return 'danger'
    default:
      return 'neutral'
  }
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
 * Format currency amount (cents to dollars)
 */
function formatCurrency(cents: number, currency: string = 'USD'): string {
  const amount = cents / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)
}

/**
 * Check if trial is still active (not expired)
 */
function isTrialActive(trialEnd?: string): boolean {
  if (!trialEnd) return false
  return new Date(trialEnd) > new Date()
}

/**
 * Loading skeleton for stat cards
 */
function StatCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} variant="glass" padding="md">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

/**
 * Date info row skeleton
 */
function DateInfoSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i} variant="glass" padding="md">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

export default function BillingPage({ params }: BillingPageProps) {
  const { id: tenantId } = use(params)
  const { showToast } = useToast()

  // Modal state
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)

  // Data fetching
  const { data: subscription, isLoading, error, mutate } = useAdminSubscriptionStatus(tenantId)
  const {
    data: paymentMethodsData,
    isLoading: isLoadingPaymentMethods,
    mutate: mutatePaymentMethods,
  } = useAdminPaymentMethods(tenantId)
  const { mutate: mutateInvoices } = useAdminInvoices(tenantId)

  /**
   * Handle successful credit application
   */
  const handleCreditSuccess = (response: CreditAppliedResponse) => {
    showToast('success', `Credit of ${formatCurrency(response.amountApplied)} applied successfully`)
    mutate() // Refresh subscription data to show new balance
    setActiveModal(null)
  }

  /**
   * Handle successful tier change
   */
  const handleTierSuccess = (response: TierChangeResponse) => {
    showToast(
      'success',
      `Tier changed from ${response.previousTier} to ${response.newTier}. Effective ${response.effectiveAt === 'immediate' ? 'immediately' : 'at end of billing period'}.`
    )
    mutate() // Refresh subscription data
    setActiveModal(null)
  }

  /**
   * Handle successful trial extension
   */
  const handleTrialSuccess = (response: ExtensionResponse) => {
    showToast('success', `Trial extended by ${response.daysAdded} days. New end date: ${formatDate(response.newEndDate)}`)
    mutate() // Refresh subscription data
    setActiveModal(null)
  }

  /**
   * Handle successful grace period extension
   */
  const handleGraceSuccess = (response: ExtensionResponse) => {
    showToast('success', `Grace period extended by ${response.daysAdded} days. New end date: ${formatDate(response.newEndDate)}`)
    mutate() // Refresh subscription data
    setActiveModal(null)
  }

  /**
   * Determine if we should show an alert banner
   */
  const shouldShowAlert = subscription && (
    subscription.status === 'canceled' ||
    subscription.status === 'paused' ||
    subscription.status === 'past_due' ||
    subscription.gracePeriod
  )

  /**
   * Determine alert severity
   */
  const alertSeverity: 'danger' | 'warning' =
    subscription?.status === 'canceled' || subscription?.status === 'paused'
      ? 'danger'
      : 'warning'

  /**
   * Generate alert message based on status
   */
  const getAlertMessage = (): string => {
    if (!subscription) return ''

    if (subscription.status === 'canceled') {
      return 'This subscription has been canceled. Service will end at the current period end.'
    }
    if (subscription.status === 'paused') {
      return 'This subscription is paused. The tenant has limited access.'
    }
    if (subscription.gracePeriod) {
      return `Payment is overdue. Grace period ends in ${subscription.gracePeriod.daysRemaining} days.`
    }
    if (subscription.status === 'past_due') {
      return 'Payment is past due. The tenant may lose access if not resolved.'
    }
    return ''
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back Link */}
        <Link
          href="/msps"
          className="inline-flex items-center gap-2 text-space-500 dark:text-space-400 hover:text-space-700 dark:hover:text-space-200 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to MSPs
        </Link>

        <Card
          variant="solid"
          padding="lg"
          className="border-red-200 dark:border-red-800 bg-danger-50 dark:bg-danger-900/20"
        >
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-danger-600 dark:text-danger-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-danger-800 dark:text-danger-200">
                Failed to load billing information
              </h3>
              <p className="mt-1 text-sm text-danger-700 dark:text-danger-300">
                {error.message ||
                  'Billing data could not be loaded. This is expected when Stripe is disabled at launch or billing tables are still being migrated.'}
              </p>
              <p className="mt-2 text-sm text-space-600 dark:text-space-400">
                You can still manage the tenant from MSP details. Configure Stripe and run database migrations to enable full billing operations.
              </p>
              <button
                onClick={() => mutate()}
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-danger-600 dark:text-danger-400 hover:underline"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Try again
              </button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back Link */}
      <Link
        href="/msps"
        className="inline-flex items-center gap-2 text-space-500 dark:text-space-400 hover:text-space-700 dark:hover:text-space-200 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to MSPs
      </Link>

      {/* Breadcrumb */}
      <nav className="text-sm text-space-500 dark:text-space-400">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="hover:text-space-700 dark:hover:text-space-200">
              Dashboard
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/msps" className="hover:text-space-700 dark:hover:text-space-200">
              MSPs
            </Link>
          </li>
          <li>/</li>
          <li>
            {isLoading ? (
              <Skeleton className="h-4 w-32 inline-block" />
            ) : (
              <Link
                href={`/msps/${tenantId}`}
                className="hover:text-space-700 dark:hover:text-space-200"
              >
                {subscription?.tenantName || 'Tenant'}
              </Link>
            )}
          </li>
          <li>/</li>
          <li className="text-space-900 dark:text-white font-medium">Billing</li>
        </ol>
      </nav>

      {/* Page Header */}
      <div>
        {isLoading ? (
          <Skeleton className="h-9 w-80" />
        ) : (
          <h1 className="text-3xl font-bold text-space-900 dark:text-white">
            {subscription?.tenantName} - Billing
          </h1>
        )}
        {isLoading ? (
          <Skeleton className="h-4 w-48 mt-2" />
        ) : (
          <p className="mt-2 text-space-500 dark:text-space-400">
            Tenant ID: {tenantId.slice(0, 8)}...{tenantId.slice(-4)}
          </p>
        )}
      </div>

      {/* Alert Banner */}
      {shouldShowAlert && (
        <div
          className={clsx(
            'rounded-xl p-4 flex items-start gap-3',
            alertSeverity === 'danger'
              ? 'bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800'
              : 'bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800'
          )}
        >
          <ExclamationTriangleIcon
            className={clsx(
              'h-6 w-6 flex-shrink-0',
              alertSeverity === 'danger'
                ? 'text-danger-600 dark:text-danger-400'
                : 'text-warning-600 dark:text-warning-400'
            )}
          />
          <div className="flex-1">
            <p
              className={clsx(
                'font-medium',
                alertSeverity === 'danger'
                  ? 'text-danger-800 dark:text-danger-200'
                  : 'text-warning-800 dark:text-warning-200'
              )}
            >
              {getAlertMessage()}
            </p>
            {/* Extension buttons in alert banner */}
            {subscription?.gracePeriod && (
              <button
                onClick={() => setActiveModal('grace')}
                className="mt-2 text-sm font-medium text-warning-700 dark:text-warning-300 hover:underline"
              >
                Extend Grace Period
              </button>
            )}
          </div>
        </div>
      )}

      {/* No Billing Configured State */}
      {!isLoading && subscription && !subscription.stripeCustomerId && (
        <Card variant="solid" padding="lg" className="border-space-200 dark:border-space-700">
          <div className="text-center py-8">
            <CreditCardIcon className="mx-auto h-12 w-12 text-space-400" />
            <h3 className="mt-4 text-lg font-semibold text-space-900 dark:text-white">
              No billing configured
            </h3>
            <p className="mt-2 text-space-500 dark:text-space-400 max-w-md mx-auto">
              This tenant does not have a Stripe customer set up. Billing operations are not available.
            </p>
          </div>
        </Card>
      )}

      {/* Stat Cards */}
      {isLoading ? (
        <StatCardsSkeleton />
      ) : subscription && subscription.stripeCustomerId ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Current Tier Card */}
          <Card variant="glass" padding="md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                  <CheckBadgeIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-xs text-space-500 dark:text-space-400">Current Tier</p>
                  <p className="text-lg font-semibold text-space-900 dark:text-white uppercase">
                    {subscription.tier}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal('tier')}
                className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                Change
              </button>
            </div>
          </Card>

          {/* Status Card */}
          <Card variant="glass" padding="md">
            <div className="flex items-center gap-3">
              <div
                className={clsx(
                  'p-2 rounded-lg',
                  subscription.status === 'active' && 'bg-success-100 dark:bg-success-900/30',
                  subscription.status === 'trialing' && 'bg-primary-100 dark:bg-primary-900/30',
                  subscription.status === 'past_due' && 'bg-warning-100 dark:bg-warning-900/30',
                  (subscription.status === 'canceled' || subscription.status === 'paused') &&
                    'bg-danger-100 dark:bg-danger-900/30'
                )}
              >
                <ArrowPathIcon
                  className={clsx(
                    'h-5 w-5',
                    subscription.status === 'active' && 'text-success-600 dark:text-success-400',
                    subscription.status === 'trialing' && 'text-primary-600 dark:text-primary-400',
                    subscription.status === 'past_due' && 'text-warning-600 dark:text-warning-400',
                    (subscription.status === 'canceled' || subscription.status === 'paused') &&
                      'text-danger-600 dark:text-danger-400'
                  )}
                />
              </div>
              <div>
                <p className="text-xs text-space-500 dark:text-space-400">Status</p>
                <Badge variant={getStatusBadgeVariant(subscription.status)} size="sm">
                  {subscription.status}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Billing Cycle Card */}
          <Card variant="glass" padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent-100 dark:bg-accent-900/30">
                <CalendarIcon className="h-5 w-5 text-accent-600 dark:text-accent-400" />
              </div>
              <div>
                <p className="text-xs text-space-500 dark:text-space-400">Billing Cycle</p>
                <p className="text-lg font-semibold text-space-900 dark:text-white capitalize">
                  {subscription.billingCycle}
                </p>
              </div>
            </div>
          </Card>

          {/* Credit Balance Card */}
          <Card variant="glass" padding="md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success-100 dark:bg-success-900/30">
                  <BanknotesIcon className="h-5 w-5 text-success-600 dark:text-success-400" />
                </div>
                <div>
                  <p className="text-xs text-space-500 dark:text-space-400">Credit Balance</p>
                  <p className="text-lg font-semibold text-space-900 dark:text-white">
                    {formatCurrency(subscription.creditBalance || 0)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal('credit')}
                className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                Add
              </button>
            </div>
          </Card>
        </div>
      ) : null}

      {/* Date Info Row */}
      {isLoading ? (
        <DateInfoSkeleton />
      ) : subscription && subscription.stripeCustomerId ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Current Period End */}
          <Card variant="glass" padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-space-100 dark:bg-space-800">
                <CalendarIcon className="h-5 w-5 text-space-600 dark:text-space-400" />
              </div>
              <div>
                <p className="text-xs text-space-500 dark:text-space-400">Current Period Ends</p>
                <p className="text-sm font-medium text-space-900 dark:text-white">
                  {subscription.currentPeriodEnd
                    ? formatDate(subscription.currentPeriodEnd)
                    : 'N/A'}
                </p>
              </div>
            </div>
          </Card>

          {/* Trial End */}
          <Card variant="glass" padding="md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    'p-2 rounded-lg',
                    subscription.trialEnd
                      ? 'bg-primary-100 dark:bg-primary-900/30'
                      : 'bg-space-100 dark:bg-space-800'
                  )}
                >
                  <ClockIcon
                    className={clsx(
                      'h-5 w-5',
                      subscription.trialEnd
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-space-400'
                    )}
                  />
                </div>
                <div>
                  <p className="text-xs text-space-500 dark:text-space-400">Trial Ends</p>
                  <p className="text-sm font-medium text-space-900 dark:text-white">
                    {subscription.trialEnd ? formatDate(subscription.trialEnd) : 'No trial'}
                  </p>
                </div>
              </div>
              {isTrialActive(subscription.trialEnd) && (
                <button
                  onClick={() => setActiveModal('trial')}
                  className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Extend
                </button>
              )}
            </div>
          </Card>

          {/* Grace Period */}
          <Card variant="glass" padding="md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    'p-2 rounded-lg',
                    subscription.gracePeriod
                      ? 'bg-warning-100 dark:bg-warning-900/30'
                      : 'bg-space-100 dark:bg-space-800'
                  )}
                >
                  <ExclamationTriangleIcon
                    className={clsx(
                      'h-5 w-5',
                      subscription.gracePeriod
                        ? 'text-warning-600 dark:text-warning-400'
                        : 'text-space-400'
                    )}
                  />
                </div>
                <div>
                  <p className="text-xs text-space-500 dark:text-space-400">Grace Period</p>
                  <p className="text-sm font-medium text-space-900 dark:text-white">
                    {subscription.gracePeriod
                      ? `${subscription.gracePeriod.daysRemaining} days remaining`
                      : 'None'}
                  </p>
                </div>
              </div>
              {subscription.gracePeriod && (
                <button
                  onClick={() => setActiveModal('grace')}
                  className="text-xs font-medium text-warning-600 dark:text-warning-400 hover:underline"
                >
                  Extend
                </button>
              )}
            </div>
          </Card>
        </div>
      ) : null}

      {/* Additional Info Section */}
      {!isLoading && subscription && subscription.stripeCustomerId && (
        <Card variant="solid" padding="md">
          <h3 className="text-sm font-semibold text-space-900 dark:text-white mb-4">
            Additional Details
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs text-space-500 dark:text-space-400">Billing Email</p>
              <p className="text-sm text-space-900 dark:text-white mt-1">
                {subscription.billingEmail || 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-xs text-space-500 dark:text-space-400">Payment Method</p>
              <p className="text-sm text-space-900 dark:text-white mt-1">
                {subscription.paymentMethodLast4
                  ? `•••• ${subscription.paymentMethodLast4}`
                  : 'No payment method'}
              </p>
            </div>
            <div>
              <p className="text-xs text-space-500 dark:text-space-400">Cancel at Period End</p>
              <p className="text-sm text-space-900 dark:text-white mt-1">
                {subscription.cancelAtPeriodEnd ? 'Yes' : 'No'}
              </p>
            </div>
            {subscription.stripeCustomerLink && (
              <div>
                <p className="text-xs text-space-500 dark:text-space-400">Stripe Dashboard</p>
                <a
                  href={subscription.stripeCustomerLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline mt-1 inline-block"
                >
                  View in Stripe
                </a>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Invoice History Section */}
      {!isLoading && subscription && subscription.stripeCustomerId && (
        <div>
          <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-4">
            Invoice History
          </h2>
          <InvoiceTable tenantId={tenantId} />
        </div>
      )}

      {/* Payment Methods Section */}
      {!isLoading && subscription && (
        <PaymentMethodList
          tenantId={tenantId}
          paymentMethods={paymentMethodsData?.data || []}
          isLoading={isLoadingPaymentMethods}
          onAddClick={() => setActiveModal('payment')}
          onRefresh={() => {
            mutatePaymentMethods()
            mutate() // Also refresh subscription to update default payment method last4
          }}
        />
      )}

      {/* Modals */}
      {/* Add Payment Method Modal */}
      <AddPaymentMethodModal
        isOpen={activeModal === 'payment'}
        onClose={() => setActiveModal(null)}
        tenantId={tenantId}
        tenantName={subscription?.tenantName || 'Tenant'}
        onSuccess={() => {
          showToast('success', 'Payment method added successfully')
          mutatePaymentMethods()
          mutate() // Refresh subscription data
        }}
      />

      {/* Apply Credit Modal */}
      <ApplyCreditModal
        isOpen={activeModal === 'credit'}
        onClose={() => setActiveModal(null)}
        tenantId={tenantId}
        tenantName={subscription?.tenantName || 'Tenant'}
        onSuccess={handleCreditSuccess}
      />

      {/* Change Tier Modal */}
      <ChangeTierModal
        isOpen={activeModal === 'tier'}
        onClose={() => setActiveModal(null)}
        tenantId={tenantId}
        tenantName={subscription?.tenantName || 'Tenant'}
        currentTier={subscription?.tier || 'home'}
        onSuccess={handleTierSuccess}
      />

      {/* Extend Trial Modal */}
      <ExtendTrialModal
        isOpen={activeModal === 'trial'}
        onClose={() => setActiveModal(null)}
        tenantId={tenantId}
        tenantName={subscription?.tenantName || 'Tenant'}
        currentTrialEnd={subscription?.trialEnd}
        onSuccess={handleTrialSuccess}
      />

      {/* Extend Grace Period Modal */}
      <ExtendGraceModal
        isOpen={activeModal === 'grace'}
        onClose={() => setActiveModal(null)}
        tenantId={tenantId}
        tenantName={subscription?.tenantName || 'Tenant'}
        currentGraceEnd={subscription?.gracePeriod?.startDate}
        daysRemaining={subscription?.gracePeriod?.daysRemaining}
        onSuccess={handleGraceSuccess}
      />
    </div>
  )
}
