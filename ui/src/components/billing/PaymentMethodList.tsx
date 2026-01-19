/**
 * Nebula DNS - Payment Method List Component
 * Displays payment methods with card tiles and action buttons
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState } from 'react'
import clsx from 'clsx'
import {
  CreditCardIcon,
  EllipsisVerticalIcon,
  CheckCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { Menu } from '@headlessui/react'
import { Card, Button, ConfirmDialog, EmptyState, Skeleton } from '@/components/ui'
import { PaymentMethod, adminBillingRequest } from '@/hooks/useAdminBilling'
import { useToast } from '@/components/Toast'

interface PaymentMethodListProps {
  tenantId: string
  paymentMethods: PaymentMethod[]
  isLoading: boolean
  onAddClick: () => void
  onRefresh: () => void
}

/**
 * Get card brand display configuration
 */
function getBrandConfig(brand: string): { name: string; color: string } {
  switch (brand.toLowerCase()) {
    case 'visa':
      return { name: 'Visa', color: 'text-blue-600 dark:text-blue-400' }
    case 'mastercard':
      return { name: 'Mastercard', color: 'text-orange-600 dark:text-orange-400' }
    case 'amex':
    case 'american_express':
      return { name: 'Amex', color: 'text-blue-700 dark:text-blue-300' }
    case 'discover':
      return { name: 'Discover', color: 'text-orange-500 dark:text-orange-400' }
    case 'diners':
      return { name: 'Diners', color: 'text-space-600 dark:text-space-400' }
    case 'jcb':
      return { name: 'JCB', color: 'text-green-600 dark:text-green-400' }
    case 'unionpay':
      return { name: 'UnionPay', color: 'text-red-600 dark:text-red-400' }
    default:
      return { name: brand || 'Card', color: 'text-space-600 dark:text-space-400' }
  }
}

/**
 * Format expiry date
 */
function formatExpiry(month: number, year: number): string {
  const monthStr = month.toString().padStart(2, '0')
  const yearStr = year.toString().slice(-2)
  return `${monthStr}/${yearStr}`
}

/**
 * Loading skeleton for payment method cards
 */
function PaymentMethodSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(2)].map((_, i) => (
        <Card key={i} variant="glass" padding="md">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </Card>
      ))}
    </div>
  )
}

export function PaymentMethodList({
  tenantId,
  paymentMethods,
  isLoading,
  onAddClick,
  onRefresh,
}: PaymentMethodListProps) {
  const { showToast } = useToast()
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'setDefault' | 'delete'
    paymentMethod: PaymentMethod
  } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  /**
   * Handle set as default payment method
   */
  const handleSetDefault = async () => {
    if (!confirmDialog || confirmDialog.type !== 'setDefault') return

    const pm = confirmDialog.paymentMethod
    setIsProcessing(true)

    try {
      await adminBillingRequest(
        'PATCH',
        `/admin/tenants/${tenantId}/billing/payment-methods/default`,
        { paymentMethodId: pm.id }
      )
      showToast('success', `Card ending in ${pm.last4} is now the default payment method`)
      onRefresh()
      setConfirmDialog(null)
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to set default payment method')
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Handle delete payment method
   */
  const handleDelete = async () => {
    if (!confirmDialog || confirmDialog.type !== 'delete') return

    const pm = confirmDialog.paymentMethod
    setIsProcessing(true)

    try {
      await adminBillingRequest(
        'DELETE',
        `/admin/tenants/${tenantId}/billing/payment-methods/${pm.id}`
      )
      showToast('success', `Payment method ending in ${pm.last4} has been removed`)
      onRefresh()
      setConfirmDialog(null)
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to delete payment method')
    } finally {
      setIsProcessing(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white">
            Payment Methods
          </h3>
          <Skeleton className="h-9 w-40" />
        </div>
        <PaymentMethodSkeleton />
      </div>
    )
  }

  // Empty state
  if (!paymentMethods || paymentMethods.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white">
            Payment Methods
          </h3>
          <Button variant="primary" size="sm" onClick={onAddClick}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Payment Method
          </Button>
        </div>
        <Card variant="solid" padding="lg">
          <EmptyState
            icon={<CreditCardIcon className="h-12 w-12" />}
            title="No payment methods"
            description="Add a payment method to enable billing for this tenant."
            action={
              <Button variant="primary" onClick={onAddClick}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-space-900 dark:text-white">
          Payment Methods
        </h3>
        <Button variant="primary" size="sm" onClick={onAddClick}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Payment Method
        </Button>
      </div>

      {/* Payment Method Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paymentMethods.map((pm) => {
          const brandConfig = getBrandConfig(pm.brand)

          return (
            <Card
              key={pm.id}
              variant="glass"
              padding="md"
              className={clsx(
                'relative transition-all',
                pm.isDefault && 'ring-2 ring-primary-500 dark:ring-primary-400'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Card Icon */}
                  <div className="p-2 rounded-lg bg-space-100 dark:bg-space-700">
                    <CreditCardIcon className={clsx('h-6 w-6', brandConfig.color)} />
                  </div>

                  {/* Card Details */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={clsx('font-semibold', brandConfig.color)}>
                        {brandConfig.name}
                      </span>
                      {pm.isDefault && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                          <CheckCircleIcon className="h-3 w-3" />
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-space-600 dark:text-space-400 mt-0.5">
                      •••• •••• •••• {pm.last4}
                    </p>
                    <p className="text-xs text-space-500 dark:text-space-500 mt-1">
                      Expires {formatExpiry(pm.expMonth, pm.expYear)}
                    </p>
                  </div>
                </div>

                {/* Action Menu */}
                <Menu as="div" className="relative">
                  <Menu.Button className="p-1.5 rounded-lg text-space-400 hover:text-space-600 dark:hover:text-space-300 hover:bg-space-100 dark:hover:bg-space-700 transition-colors">
                    <EllipsisVerticalIcon className="h-5 w-5" />
                  </Menu.Button>
                  <Menu.Items className="absolute right-0 mt-1 w-48 origin-top-right rounded-lg bg-white dark:bg-space-800 shadow-lg ring-1 ring-space-200 dark:ring-space-700 focus:outline-none z-10">
                    <div className="py-1">
                      {!pm.isDefault && (
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() =>
                                setConfirmDialog({ type: 'setDefault', paymentMethod: pm })
                              }
                              className={clsx(
                                'w-full text-left px-4 py-2 text-sm',
                                active
                                  ? 'bg-space-100 dark:bg-space-700 text-space-900 dark:text-white'
                                  : 'text-space-700 dark:text-space-300'
                              )}
                            >
                              Set as Default
                            </button>
                          )}
                        </Menu.Item>
                      )}
                      {!pm.isDefault && (
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() =>
                                setConfirmDialog({ type: 'delete', paymentMethod: pm })
                              }
                              className={clsx(
                                'w-full text-left px-4 py-2 text-sm',
                                active
                                  ? 'bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300'
                                  : 'text-danger-600 dark:text-danger-400'
                              )}
                            >
                              Delete
                            </button>
                          )}
                        </Menu.Item>
                      )}
                      {pm.isDefault && (
                        <div className="px-4 py-2 text-sm text-space-400 dark:text-space-500">
                          Default payment method
                        </div>
                      )}
                    </div>
                  </Menu.Items>
                </Menu>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Set Default Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog?.type === 'setDefault'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handleSetDefault}
        title="Set Default Payment Method"
        message={`Set the card ending in ${confirmDialog?.paymentMethod.last4} as the default payment method for this tenant?`}
        confirmText="Set Default"
        variant="info"
        isLoading={isProcessing}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog?.type === 'delete'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handleDelete}
        title="Delete Payment Method"
        message={`Are you sure you want to delete the card ending in ${confirmDialog?.paymentMethod.last4}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isProcessing}
      />
    </div>
  )
}
