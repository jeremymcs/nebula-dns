/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Block Pages Management - Cosmic Security Theme
 */

'use client'

import { useState } from 'react'
import { useBlockPages, useAccessRequests } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useToast } from '@/components/Toast'
import {
  PlusIcon,
  PencilIcon,
  EyeIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { Button, Card, Badge, Input, Modal, EmptyState } from '@/components/ui'

interface BlockPage {
  id: string
  name: string
  isDefault: boolean
  logoUrl?: string
  backgroundColor: string
  primaryColor: string
  title: string
  message: string
  showRequestAccess: boolean
  createdAt: string
}

interface AccessRequest {
  id: string
  domain: string
  reason: string
  requesterEmail?: string
  requesterIp: string
  status: 'pending' | 'approved' | 'denied' | 'expired'
  createdAt: string
}

export default function BlockPagesPage() {
  const { data: pagesData, isLoading: pagesLoading, mutate: mutatePages } = useBlockPages()
  const { data: requestsData, isLoading: requestsLoading, mutate: mutateRequests } = useAccessRequests()
  const { showToast } = useToast()

  const [showModal, setShowModal] = useState(false)
  const [showPreview, setShowPreview] = useState<BlockPage | null>(null)
  const [editingPage, setEditingPage] = useState<BlockPage | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    title: 'Access Blocked',
    message: "This website has been blocked by your organization's security policy.",
    backgroundColor: '#f3f4f6',
    primaryColor: '#4f46e5',
    textColor: '#1f2937',
    logoUrl: '',
    showCategory: true,
    showDomain: true,
    showTimestamp: true,
    showRequestAccess: true,
    footerText: '',
    supportEmail: '',
    customHtml: '',
    customCss: '',
    useCustomHtml: false,
  })

  const pages: BlockPage[] = pagesData?.data || []
  const requests: AccessRequest[] = requestsData?.data || []
  const pendingRequests = requests.filter(r => r.status === 'pending')

  const resetForm = () => {
    setForm({
      name: '',
      title: 'Access Blocked',
      message: "This website has been blocked by your organization's security policy.",
      backgroundColor: '#f3f4f6',
      primaryColor: '#4f46e5',
      textColor: '#1f2937',
      logoUrl: '',
      showCategory: true,
      showDomain: true,
      showTimestamp: true,
      showRequestAccess: true,
      footerText: '',
      supportEmail: '',
      customHtml: '',
      customCss: '',
      useCustomHtml: false,
    })
  }

  const openEditModal = (page: BlockPage) => {
    setEditingPage(page)
    setForm({
      name: page.name,
      title: page.title,
      message: page.message,
      backgroundColor: page.backgroundColor,
      primaryColor: page.primaryColor,
      textColor: '#1f2937',
      logoUrl: page.logoUrl || '',
      showCategory: true,
      showDomain: true,
      showTimestamp: true,
      showRequestAccess: page.showRequestAccess,
      footerText: '',
      supportEmail: '',
      customHtml: '',
      customCss: '',
      useCustomHtml: false,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('error', 'Block page name is required')
      return
    }

    setSaving(true)
    try {
      if (editingPage) {
        await api.updateBlockPage(editingPage.id, form)
        showToast('success', 'Block page updated')
      } else {
        await api.createBlockPage(form)
        showToast('success', 'Block page created')
      }
      mutatePages()
      setShowModal(false)
      resetForm()
      setEditingPage(null)
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save block page')
    } finally {
      setSaving(false)
    }
  }

  const handleReviewRequest = async (request: AccessRequest, action: 'approve' | 'deny') => {
    try {
      await api.reviewAccessRequest(request.id, action)
      showToast('success', `Request ${action === 'approve' ? 'approved' : 'denied'}`)
      mutateRequests()
    } catch (err: any) {
      showToast('error', err.message || 'Failed to review request')
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Block Pages</h1>
          <p className="mt-1 text-space-500 dark:text-space-400">
            Customize the pages shown when content is blocked
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            resetForm()
            setEditingPage(null)
            setShowModal(true)
          }}
          leftIcon={<PlusIcon className="h-5 w-5" />}
        >
          Create Block Page
        </Button>
      </div>

      {/* Block Pages Grid */}
      {pagesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-64 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pages.map((page) => (
            <Card key={page.id} variant="interactive" padding="none" className="overflow-hidden">
              {/* Preview thumbnail */}
              <div
                className="h-32 relative"
                style={{ backgroundColor: page.backgroundColor }}
              >
                <div className="absolute inset-x-4 top-4 bottom-4 rounded-xl flex flex-col items-center justify-center bg-white/90 dark:bg-space-800/90 backdrop-blur-sm">
                  <div
                    className="w-10 h-10 rounded-full mb-2 flex items-center justify-center"
                    style={{ backgroundColor: page.primaryColor }}
                  >
                    <XCircleIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-xs font-semibold text-space-700 dark:text-space-300">{page.title}</div>
                </div>
                {page.isDefault && (
                  <Badge variant="success" size="sm" className="absolute top-2 right-2">
                    Default
                  </Badge>
                )}
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-space-900 dark:text-white">{page.name}</h3>
                <p className="text-sm text-space-500 dark:text-space-400 mt-1 line-clamp-2">{page.message}</p>

                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => setShowPreview(page)}
                    className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 inline-flex items-center font-medium transition-colors"
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    Preview
                  </button>
                  <span className="text-space-300 dark:text-space-600">|</span>
                  <button
                    onClick={() => openEditModal(page)}
                    className="text-sm text-space-600 hover:text-space-800 dark:text-space-400 dark:hover:text-space-300 inline-flex items-center font-medium transition-colors"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                </div>
              </div>
            </Card>
          ))}

          {pages.length === 0 && (
            <div className="col-span-full">
              <EmptyState
                icon={<DocumentTextIcon className="h-12 w-12" />}
                title="No block pages"
                description="Create your first custom block page."
                action={
                  <Button
                    variant="primary"
                    onClick={() => {
                      resetForm()
                      setEditingPage(null)
                      setShowModal(true)
                    }}
                    leftIcon={<PlusIcon className="h-5 w-5" />}
                  >
                    Create Block Page
                  </Button>
                }
              />
            </div>
          )}
        </div>
      )}

      {/* Access Requests Section */}
      <Card variant="solid" padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-space-900 dark:text-white">Access Requests</h2>
          {pendingRequests.length > 0 && (
            <Badge variant="warning">{pendingRequests.length} pending</Badge>
          )}
        </div>
        <p className="text-space-500 dark:text-space-400 mb-4">
          Review requests from users who need access to blocked sites
        </p>

        {requestsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Domain</th>
                  <th className="table-header-cell">Requester</th>
                  <th className="table-header-cell">Reason</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {requests.map((request) => (
                  <tr key={request.id} className="table-row">
                    <td className="table-cell font-mono text-sm">{request.domain}</td>
                    <td className="table-cell">{request.requesterEmail || request.requesterIp}</td>
                    <td className="table-cell max-w-xs truncate">{request.reason}</td>
                    <td className="table-cell">
                      <Badge
                        variant={
                          request.status === 'pending' ? 'warning' :
                          request.status === 'approved' ? 'success' : 'danger'
                        }
                        size="sm"
                      >
                        {request.status}
                      </Badge>
                    </td>
                    <td className="table-cell">
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReviewRequest(request, 'approve')}
                            className="p-2 rounded-lg text-green-500 hover:bg-green-500/10 transition-colors"
                            title="Approve"
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleReviewRequest(request, 'deny')}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Deny"
                          >
                            <XCircleIcon className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="table-cell text-center py-8 text-space-500 dark:text-space-400">
                      No access requests yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingPage ? 'Edit Block Page' : 'Create Block Page'}
        size="lg"
      >
        <div className="space-y-6">
          <Input
            label="Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Corporate Block Page"
          />

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">Background Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.backgroundColor}
                  onChange={(e) => setForm({ ...form, backgroundColor: e.target.value })}
                  className="h-10 w-10 rounded-lg cursor-pointer border border-space-200 dark:border-space-600"
                />
                <Input
                  value={form.backgroundColor}
                  onChange={(e) => setForm({ ...form, backgroundColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="h-10 w-10 rounded-lg cursor-pointer border border-space-200 dark:border-space-600"
                />
                <Input
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">Text Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.textColor}
                  onChange={(e) => setForm({ ...form, textColor: e.target.value })}
                  className="h-10 w-10 rounded-lg cursor-pointer border border-space-200 dark:border-space-600"
                />
                <Input
                  value={form.textColor}
                  onChange={(e) => setForm({ ...form, textColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <Input
            label="Logo URL"
            type="url"
            value={form.logoUrl}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
            placeholder="https://example.com/logo.png"
          />

          <Input
            label="Page Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">Message</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-space-200 dark:border-space-600 bg-white dark:bg-space-800 text-space-900 dark:text-white placeholder-space-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.showCategory}
                onChange={(e) => setForm({ ...form, showCategory: e.target.checked })}
                className="rounded border-space-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-space-700 dark:text-space-300">Show category</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.showDomain}
                onChange={(e) => setForm({ ...form, showDomain: e.target.checked })}
                className="rounded border-space-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-space-700 dark:text-space-300">Show blocked domain</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.showTimestamp}
                onChange={(e) => setForm({ ...form, showTimestamp: e.target.checked })}
                className="rounded border-space-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-space-700 dark:text-space-300">Show timestamp</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.showRequestAccess}
                onChange={(e) => setForm({ ...form, showRequestAccess: e.target.checked })}
                className="rounded border-space-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-space-700 dark:text-space-300">Allow access requests</span>
            </label>
          </div>

          <Input
            label="Support Email"
            type="email"
            value={form.supportEmail}
            onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
            placeholder="support@company.com"
          />

          {/* Custom HTML/CSS Section */}
          <div className="border-t border-space-200 dark:border-space-700 pt-4">
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={form.useCustomHtml}
                onChange={(e) => setForm({ ...form, useCustomHtml: e.target.checked })}
                className="rounded border-space-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-space-700 dark:text-space-300">Use custom HTML template</span>
            </label>

            {form.useCustomHtml && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
                    Custom HTML
                    <span className="text-xs text-space-500 ml-2">
                      Use {'{{domain}}'}, {'{{category}}'}, {'{{timestamp}}'}, {'{{title}}'}, {'{{message}}'} as placeholders
                    </span>
                  </label>
                  <textarea
                    value={form.customHtml}
                    onChange={(e) => setForm({ ...form, customHtml: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-space-200 dark:border-space-600 bg-white dark:bg-space-800 text-space-900 dark:text-white placeholder-space-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-mono text-sm"
                    rows={12}
                    placeholder={`<!DOCTYPE html>
<html>
<head>
  <title>{{title}}</title>
  <style>/* Your CSS here */</style>
</head>
<body>
  <h1>{{title}}</h1>
  <p>{{message}}</p>
  <p>Blocked domain: {{domain}}</p>
  <p>Category: {{category}}</p>
</body>
</html>`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
                    Additional CSS
                    <span className="text-xs text-space-500 ml-2">Appended to the default template styles</span>
                  </label>
                  <textarea
                    value={form.customCss}
                    onChange={(e) => setForm({ ...form, customCss: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-space-200 dark:border-space-600 bg-white dark:bg-space-800 text-space-900 dark:text-white placeholder-space-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-mono text-sm"
                    rows={6}
                    placeholder={`.container { max-width: 600px; }
.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.btn { border-radius: 8px; }`}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-space-200 dark:border-space-700">
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={saving}>
            {editingPage ? 'Save Changes' : 'Create Page'}
          </Button>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={!!showPreview}
        onClose={() => setShowPreview(null)}
        title="Block Page Preview"
        size="lg"
      >
        {showPreview && (
          <div
            className="rounded-xl overflow-hidden -mx-6 -mb-6"
            style={{ backgroundColor: showPreview.backgroundColor }}
          >
            <div className="p-8">
              <div className="bg-white dark:bg-space-800 rounded-xl p-8 text-center shadow-lg">
                {showPreview.logoUrl && (
                  <img src={showPreview.logoUrl} alt="Logo" className="h-12 mx-auto mb-4" />
                )}
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: showPreview.primaryColor }}
                >
                  <XCircleIcon className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-2">{showPreview.title}</h2>
                <p className="text-space-600 dark:text-space-400 mb-6">{showPreview.message}</p>

                <div className="text-sm text-space-500 dark:text-space-400 mb-4">
                  <p><strong>Domain:</strong> example.com</p>
                  <p><strong>Category:</strong> Social Media</p>
                </div>

                {showPreview.showRequestAccess && (
                  <button
                    className="px-6 py-2 rounded-xl text-white font-medium transition-transform hover:scale-105"
                    style={{ backgroundColor: showPreview.primaryColor }}
                  >
                    Request Access
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
