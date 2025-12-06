/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Block Pages Management
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
  ArrowPathIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

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
    <div className="space-y-6 p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Block Pages</h1>
          <p className="text-gray-600">Customize the pages shown when content is blocked</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setEditingPage(null)
            setShowModal(true)
          }}
          className="btn-primary inline-flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Block Page
        </button>
      </div>

      {/* Block Pages Grid */}
      {pagesLoading ? (
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pages.map((page) => (
            <div key={page.id} className="card overflow-hidden">
              {/* Preview thumbnail */}
              <div 
                className="h-32 relative"
                style={{ backgroundColor: page.backgroundColor }}
              >
                <div 
                  className="absolute inset-x-4 top-4 bottom-4 rounded-lg flex flex-col items-center justify-center bg-white"
                >
                  <div 
                    className="w-8 h-8 rounded-full mb-2"
                    style={{ backgroundColor: page.primaryColor }}
                  />
                  <div className="text-xs font-medium text-gray-700">{page.title}</div>
                </div>
                {page.isDefault && (
                  <span className="absolute top-2 right-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Default
                  </span>
                )}
              </div>

              <div className="p-4">
                <h3 className="font-medium text-gray-900">{page.name}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{page.message}</p>

                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => setShowPreview(page)}
                    className="text-sm text-primary-600 hover:text-primary-800 inline-flex items-center"
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    Preview
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => openEditModal(page)}
                    className="text-sm text-gray-600 hover:text-gray-800 inline-flex items-center"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}

          {pages.length === 0 && (
            <div className="col-span-full text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No block pages</h3>
              <p className="mt-1 text-sm text-gray-500">Create your first custom block page.</p>
            </div>
          )}
        </div>
      )}

      {/* Access Requests Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Access Requests</h2>
          {pendingRequests.length > 0 && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
              {pendingRequests.length} pending
            </span>
          )}
        </div>
        <p className="text-gray-600 mb-4">Review requests from users who need access to blocked sites</p>

        {requestsLoading ? (
          <div className="flex items-center justify-center py-8">
            <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 font-medium">Domain</th>
                  <th className="pb-3 font-medium">Requester</th>
                  <th className="pb-3 font-medium">Reason</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="py-3 text-gray-900 font-mono">{request.domain}</td>
                    <td className="py-3 text-gray-600">{request.requesterEmail || request.requesterIp}</td>
                    <td className="py-3 text-gray-600 max-w-xs truncate">{request.reason}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        request.status === 'pending' 
                          ? 'bg-yellow-100 text-yellow-800'
                          : request.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="py-3">
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleReviewRequest(request, 'approve')}
                            className="text-green-600 hover:text-green-800"
                            title="Approve"
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                          <button 
                            onClick={() => handleReviewRequest(request, 'deny')}
                            className="text-red-600 hover:text-red-800"
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
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No access requests yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowModal(false)} />
            <div className="relative bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {editingPage ? 'Edit Block Page' : 'Create Block Page'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input"
                    placeholder="e.g., Corporate Block Page"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={form.backgroundColor}
                        onChange={(e) => setForm({ ...form, backgroundColor: e.target.value })}
                        className="h-10 w-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={form.backgroundColor}
                        onChange={(e) => setForm({ ...form, backgroundColor: e.target.value })}
                        className="input flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={form.primaryColor}
                        onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                        className="h-10 w-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={form.primaryColor}
                        onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                        className="input flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={form.textColor}
                        onChange={(e) => setForm({ ...form, textColor: e.target.value })}
                        className="h-10 w-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={form.textColor}
                        onChange={(e) => setForm({ ...form, textColor: e.target.value })}
                        className="input flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                  <input
                    type="url"
                    value={form.logoUrl}
                    onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                    className="input"
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Page Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="input"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.showCategory}
                      onChange={(e) => setForm({ ...form, showCategory: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Show category</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.showDomain}
                      onChange={(e) => setForm({ ...form, showDomain: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Show blocked domain</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.showTimestamp}
                      onChange={(e) => setForm({ ...form, showTimestamp: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Show timestamp</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.showRequestAccess}
                      onChange={(e) => setForm({ ...form, showRequestAccess: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Allow access requests</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
                  <input
                    type="email"
                    value={form.supportEmail}
                    onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                    className="input"
                    placeholder="support@company.com"
                  />
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : editingPage ? 'Save Changes' : 'Create Page'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowPreview(null)} />
            <div 
              className="relative w-full max-w-2xl rounded-xl overflow-hidden"
              style={{ backgroundColor: showPreview.backgroundColor }}
            >
              <div className="p-8">
                <div className="bg-white rounded-xl p-8 text-center shadow-lg">
                  {showPreview.logoUrl && (
                    <img src={showPreview.logoUrl} alt="Logo" className="h-12 mx-auto mb-4" />
                  )}
                  <div 
                    className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                    style={{ backgroundColor: showPreview.primaryColor }}
                  >
                    <XCircleIcon className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{showPreview.title}</h2>
                  <p className="text-gray-600 mb-6">{showPreview.message}</p>
                  
                  <div className="text-sm text-gray-500 mb-4">
                    <p><strong>Domain:</strong> example.com</p>
                    <p><strong>Category:</strong> Social Media</p>
                  </div>

                  {showPreview.showRequestAccess && (
                    <button 
                      className="px-6 py-2 rounded-lg text-white"
                      style={{ backgroundColor: showPreview.primaryColor }}
                    >
                      Request Access
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowPreview(null)}
                className="absolute top-4 right-4 text-white hover:text-gray-200"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
