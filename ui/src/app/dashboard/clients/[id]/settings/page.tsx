/**
 * Nebula DNS - Client Settings Page
 * Settings and configuration for a specific client
 */

'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMspClient } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useToast } from '@/components/Toast'
import {
  PencilSquareIcon,
  Cog6ToothIcon,
  BellIcon,
  KeyIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

export default function ClientSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  const { data: client, isLoading } = useMspClient(clientId)
  const { showToast } = useToast()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [notifications, setNotifications] = useState({
    threatAlerts: true,
    weeklyReports: true,
    usageAlerts: false,
  })

  const handleDeleteClient = async () => {
    if (confirmName !== client?.name) {
      showToast('error', 'Client name does not match')
      return
    }
    setDeleting(true)
    try {
      await api.deleteMspClient(clientId)
      showToast('success', 'Client deleted successfully')
      router.push('/dashboard/clients')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete client')
    } finally {
      setDeleting(false)
    }
  }

  const handleSaveNotifications = () => {
    showToast('success', 'Notification preferences saved')
    setShowNotificationModal(false)
  }

  const settingsSections = [
    {
      title: 'General Settings',
      description: 'Basic client information and configuration',
      icon: Cog6ToothIcon,
      action: { label: 'Edit Client', href: `/dashboard/clients/${clientId}/edit` },
      onClick: undefined,
    },
    {
      title: 'Notifications',
      description: 'Configure alert and notification preferences',
      icon: BellIcon,
      action: { label: 'Configure', href: '#' },
      onClick: () => setShowNotificationModal(true),
    },
    {
      title: 'API Access',
      description: 'Manage API keys and integrations for this client',
      icon: KeyIcon,
      action: { label: 'Manage Keys', href: '#' },
      onClick: () => showToast('info', 'API key management coming soon'),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Client Info Card */}
      <div className="bg-white dark:bg-space-800 rounded-2xl p-6 ring-1 ring-space-200 dark:ring-space-700">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-space-900 dark:text-white">Client Information</h3>
            <p className="text-sm text-space-500 dark:text-space-400 mt-1">Basic details about this client</p>
          </div>
          <Link
            href={`/dashboard/clients/${clientId}/edit`}
            className="flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-xl text-sm font-medium hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
          >
            <PencilSquareIcon className="h-4 w-4" />
            Edit
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 w-20 bg-space-200 dark:bg-space-700 rounded mb-2" />
                <div className="h-5 w-32 bg-space-200 dark:bg-space-700 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm text-space-500 dark:text-space-400">Name</p>
              <p className="font-medium text-space-900 dark:text-white">{client?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-space-500 dark:text-space-400">Slug</p>
              <p className="font-medium text-space-900 dark:text-white font-mono">{client?.slug || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-space-500 dark:text-space-400">Status</p>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                client?.status === 'active'
                  ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300'
                  : 'bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-400'
              }`}>
                {client?.status || 'Unknown'}
              </span>
            </div>
            <div>
              <p className="text-sm text-space-500 dark:text-space-400">Contact Email</p>
              <p className="font-medium text-space-900 dark:text-white">{client?.contactEmail || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-space-500 dark:text-space-400">Contact Phone</p>
              <p className="font-medium text-space-900 dark:text-white">{client?.contactPhone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-space-500 dark:text-space-400">Industry</p>
              <p className="font-medium text-space-900 dark:text-white">{client?.industry || '-'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Settings Sections */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingsSections.map((section) => {
          const Icon = section.icon
          return (
            <div
              key={section.title}
              className="bg-white dark:bg-space-800 rounded-2xl p-6 ring-1 ring-space-200 dark:ring-space-700"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-space-100 dark:bg-space-700">
                  <Icon className="h-6 w-6 text-space-600 dark:text-space-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-space-900 dark:text-white">{section.title}</h4>
                  <p className="text-sm text-space-500 dark:text-space-400 mt-1">{section.description}</p>
                  {section.onClick ? (
                    <button
                      onClick={section.onClick}
                      className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium mt-3"
                    >
                      {section.action.label}
                      <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <Link
                      href={section.action.href}
                      className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium mt-3"
                    >
                      {section.action.label}
                      <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Danger Zone */}
      <div className="bg-danger-50 dark:bg-danger-900/20 rounded-2xl p-6 ring-1 ring-danger-200 dark:ring-danger-800">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-danger-100 dark:bg-danger-900/30">
            <TrashIcon className="h-6 w-6 text-danger-600 dark:text-danger-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-danger-900 dark:text-danger-100">Danger Zone</h4>
            <p className="text-sm text-danger-700 dark:text-danger-300 mt-1">
              Permanently delete this client and all associated data. This action cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="mt-4 px-4 py-2 bg-danger-600 text-white rounded-xl text-sm font-medium hover:bg-danger-700 transition-colors"
            >
              Delete Client
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-space-800 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-space-100 dark:border-space-700">
              <h3 className="text-lg font-semibold text-danger-600">Delete Client</h3>
              <button onClick={() => { setShowDeleteModal(false); setConfirmName('') }} className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 p-4 bg-danger-50 dark:bg-danger-900/20 rounded-xl mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-danger-600 flex-shrink-0" />
                <p className="text-sm text-danger-700 dark:text-danger-300">
                  This will permanently delete <strong>{client?.name}</strong> and all associated data including zones, policies, and users.
                </p>
              </div>
              <p className="text-sm text-space-600 dark:text-space-400 mb-3">
                To confirm, type <strong className="text-space-900 dark:text-white">{client?.name}</strong> below:
              </p>
              <input
                type="text"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder="Type client name to confirm"
                className="w-full px-4 py-2.5 bg-space-50 dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-danger-500 outline-none"
              />
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-space-100 dark:border-space-700">
              <button onClick={() => { setShowDeleteModal(false); setConfirmName('') }} className="px-4 py-2 text-space-700 dark:text-space-300 hover:bg-space-100 dark:hover:bg-space-700 rounded-xl">Cancel</button>
              <button
                onClick={handleDeleteClient}
                disabled={deleting || confirmName !== client?.name}
                className="px-4 py-2 bg-danger-600 text-white rounded-xl font-medium hover:bg-danger-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Settings Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-space-800 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-space-100 dark:border-space-700">
              <h3 className="text-lg font-semibold text-space-900 dark:text-white">Notification Preferences</h3>
              <button onClick={() => setShowNotificationModal(false)} className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: 'threatAlerts', label: 'Threat Alerts', description: 'Get notified when threats are detected' },
                { key: 'weeklyReports', label: 'Weekly Reports', description: 'Receive weekly summary emails' },
                { key: 'usageAlerts', label: 'Usage Alerts', description: 'Alert when usage exceeds thresholds' },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between p-4 bg-space-50 dark:bg-space-900 rounded-xl cursor-pointer">
                  <div>
                    <p className="font-medium text-space-900 dark:text-white">{item.label}</p>
                    <p className="text-sm text-space-500">{item.description}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications[item.key as keyof typeof notifications]}
                    onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                    className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
                  />
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-space-100 dark:border-space-700">
              <button onClick={() => setShowNotificationModal(false)} className="px-4 py-2 text-space-700 dark:text-space-300 hover:bg-space-100 dark:hover:bg-space-700 rounded-xl">Cancel</button>
              <button onClick={handleSaveNotifications} className="px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700">
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

