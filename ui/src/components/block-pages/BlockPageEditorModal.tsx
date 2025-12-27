/**
 * Nebula DNS - Block Page Editor Modal
 * Comprehensive block page creation and editing with live preview
 */

'use client'

import { useState, useEffect } from 'react'
import { Modal, Button, Input, Textarea, Tabs } from '@/components/ui'
import {
  PaintBrushIcon,
  Cog6ToothIcon,
  CodeBracketIcon,
  EyeIcon,
  PhotoIcon,
  SwatchIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ShieldExclamationIcon,
  XCircleIcon,
  ClockIcon,
  TagIcon,
  GlobeAltIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

export interface BlockPageFormData {
  name: string
  title: string
  message: string
  backgroundColor: string
  primaryColor: string
  textColor: string
  logoUrl: string
  showCategory: boolean
  showDomain: boolean
  showTimestamp: boolean
  showRequestAccess: boolean
  footerText: string
  supportEmail: string
  customHtml: string
  customCss: string
  useCustomHtml: boolean
}

export interface BlockPageEditorModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: BlockPageFormData) => Promise<void>
  initialData?: Partial<BlockPageFormData>
  isEditing?: boolean
  isSaving?: boolean
}

const DEFAULT_FORM_DATA: BlockPageFormData = {
  name: '',
  title: 'Access Blocked',
  message: "This website has been blocked by your organization's security policy.",
  backgroundColor: '#ffffff',
  primaryColor: '#4f46e5',
  textColor: '#111827',
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
}

// Preset color themes - optimized for readability with high contrast
const COLOR_PRESETS = [
  { name: 'Default', bg: '#ffffff', primary: '#4f46e5', text: '#111827', description: 'Clean white background' },
  { name: 'Slate', bg: '#f1f5f9', primary: '#475569', text: '#0f172a', description: 'Professional grey tones' },
  { name: 'Blue', bg: '#eff6ff', primary: '#2563eb', text: '#1e3a5f', description: 'Calm and trustworthy' },
  { name: 'Green', bg: '#f0fdf4', primary: '#16a34a', text: '#14532d', description: 'Success oriented' },
  { name: 'Amber', bg: '#fffbeb', primary: '#d97706', text: '#78350f', description: 'Warning emphasis' },
  { name: 'Red', bg: '#fef2f2', primary: '#dc2626', text: '#7f1d1d', description: 'Strong block signal' },
  { name: 'Dark', bg: '#18181b', primary: '#a78bfa', text: '#fafafa', description: 'Modern dark mode' },
  { name: 'Navy', bg: '#0f172a', primary: '#60a5fa', text: '#f1f5f9', description: 'Professional dark' },
]

export function BlockPageEditorModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isEditing = false,
  isSaving = false,
}: BlockPageEditorModalProps) {
  const [activeTab, setActiveTab] = useState('design')
  const [form, setForm] = useState<BlockPageFormData>(DEFAULT_FORM_DATA)
  const [errors, setErrors] = useState<Partial<Record<keyof BlockPageFormData, string>>>({})
  const [showPreviewPanel, setShowPreviewPanel] = useState(true)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm(initialData ? { ...DEFAULT_FORM_DATA, ...initialData } : DEFAULT_FORM_DATA)
      setErrors({})
      setActiveTab('design')
    }
  }, [isOpen, initialData])

  const updateForm = <K extends keyof BlockPageFormData>(key: K, value: BlockPageFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: undefined }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof BlockPageFormData, string>> = {}
    
    if (!form.name.trim()) {
      newErrors.name = 'Name is required'
    }
    if (!form.title.trim()) {
      newErrors.title = 'Title is required'
    }
    if (form.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.supportEmail)) {
      newErrors.supportEmail = 'Invalid email format'
    }
    if (form.logoUrl && !form.logoUrl.startsWith('http')) {
      newErrors.logoUrl = 'Logo URL must start with http:// or https://'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) {
      // Switch to the tab with the first error
      if (errors.name) setActiveTab('design')
      return
    }
    await onSave(form)
  }

  const applyColorPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setForm(prev => ({
      ...prev,
      backgroundColor: preset.bg,
      primaryColor: preset.primary,
      textColor: preset.text,
    }))
  }

  const tabs = [
    { id: 'design', label: 'Design', icon: PaintBrushIcon },
    { id: 'content', label: 'Content', icon: DocumentTextIcon },
    { id: 'options', label: 'Options', icon: Cog6ToothIcon },
    { id: 'advanced', label: 'Advanced', icon: CodeBracketIcon },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Block Page' : 'Create Block Page'}
      size="full"
    >
      <div className="flex gap-6 -mx-6 -mb-6 h-[calc(100vh-200px)] min-h-[600px]">
        {/* Left Panel - Form */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-space-200 dark:border-space-700">
          {/* Tabs */}
          <div className="flex gap-1 px-6 py-3 border-b border-space-200 dark:border-space-700 bg-space-50 dark:bg-space-800/50">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  activeTab === tab.id
                    ? 'bg-nebula-500 text-white shadow-lg shadow-nebula-500/25'
                    : 'text-space-600 dark:text-space-400 hover:bg-space-100 dark:hover:bg-space-700'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Design Tab */}
            {activeTab === 'design' && (
              <div className="space-y-6">
                {/* Name Input */}
                <div>
                  <Input
                    label="Block Page Name"
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    placeholder="e.g., Corporate Block Page"
                    required
                    error={errors.name}
                  />
                </div>

                {/* Color Presets */}
                <div>
                  <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-3">
                    Color Theme
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => applyColorPreset(preset)}
                        className={clsx(
                          'group relative p-3 rounded-xl border-2 transition-all hover:scale-[1.02]',
                          form.backgroundColor === preset.bg && form.primaryColor === preset.primary
                            ? 'border-nebula-500 ring-2 ring-nebula-500/20 shadow-md'
                            : 'border-space-200 dark:border-space-700 hover:border-space-300 dark:hover:border-space-600'
                        )}
                        style={{ backgroundColor: preset.bg }}
                        title={preset.description}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-5 h-5 rounded-full flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: preset.primary }}
                          />
                          <span
                            className="text-sm font-semibold"
                            style={{ color: preset.text }}
                          >
                            {preset.name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Colors */}
                <div>
                  <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-3">
                    Custom Colors
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-space-500 dark:text-space-400 mb-1.5">Background</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={form.backgroundColor}
                          onChange={(e) => updateForm('backgroundColor', e.target.value)}
                          className="h-10 w-12 rounded-lg cursor-pointer border border-space-200 dark:border-space-600"
                        />
                        <Input
                          value={form.backgroundColor}
                          onChange={(e) => updateForm('backgroundColor', e.target.value)}
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-space-500 dark:text-space-400 mb-1.5">Primary</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={form.primaryColor}
                          onChange={(e) => updateForm('primaryColor', e.target.value)}
                          className="h-10 w-12 rounded-lg cursor-pointer border border-space-200 dark:border-space-600"
                        />
                        <Input
                          value={form.primaryColor}
                          onChange={(e) => updateForm('primaryColor', e.target.value)}
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-space-500 dark:text-space-400 mb-1.5">Text</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={form.textColor}
                          onChange={(e) => updateForm('textColor', e.target.value)}
                          className="h-10 w-12 rounded-lg cursor-pointer border border-space-200 dark:border-space-600"
                        />
                        <Input
                          value={form.textColor}
                          onChange={(e) => updateForm('textColor', e.target.value)}
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logo */}
                <div>
                  <Input
                    label="Logo URL"
                    value={form.logoUrl}
                    onChange={(e) => updateForm('logoUrl', e.target.value)}
                    placeholder="https://example.com/logo.png"
                    error={errors.logoUrl}
                    helperText="Enter a URL to your company logo (recommended: 200x50px)"
                  />
                  {form.logoUrl && !errors.logoUrl && (
                    <div className="mt-2 p-3 rounded-lg bg-space-100 dark:bg-space-800 flex items-center gap-3">
                      <img
                        src={form.logoUrl}
                        alt="Logo preview"
                        className="h-8 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      <span className="text-xs text-space-500">Logo preview</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content Tab */}
            {activeTab === 'content' && (
              <div className="space-y-6">
                <Input
                  label="Page Title"
                  value={form.title}
                  onChange={(e) => updateForm('title', e.target.value)}
                  placeholder="Access Blocked"
                  required
                  error={errors.title}
                />

                <div>
                  <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                    Block Message
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => updateForm('message', e.target.value)}
                    placeholder="Explain why the content was blocked..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-space-200 dark:border-space-600 bg-white dark:bg-space-800 text-space-900 dark:text-white placeholder-space-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all resize-none"
                  />
                  <p className="mt-1 text-xs text-space-500 dark:text-space-400">
                    This message will be displayed to users when they encounter a blocked page
                  </p>
                </div>

                <div>
                  <Input
                    label="Footer Text"
                    value={form.footerText}
                    onChange={(e) => updateForm('footerText', e.target.value)}
                    placeholder="e.g., © 2024 Your Company. All rights reserved."
                    helperText="Optional text displayed at the bottom of the block page"
                  />
                </div>

                <div>
                  <Input
                    label="Support Email"
                    type="email"
                    value={form.supportEmail}
                    onChange={(e) => updateForm('supportEmail', e.target.value)}
                    placeholder="support@company.com"
                    error={errors.supportEmail}
                    helperText="Users can contact this email for support"
                  />
                </div>
              </div>
            )}

            {/* Options Tab */}
            {activeTab === 'options' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-space-700 dark:text-space-300 mb-4">
                    Display Options
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 rounded-xl border border-space-200 dark:border-space-700 hover:bg-space-50 dark:hover:bg-space-800/50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={form.showDomain}
                        onChange={(e) => updateForm('showDomain', e.target.checked)}
                        className="h-4 w-4 rounded border-space-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <GlobeAltIcon className="h-4 w-4 text-space-500" />
                          <span className="text-sm font-medium text-space-700 dark:text-space-300">Show Blocked Domain</span>
                        </div>
                        <p className="text-xs text-space-500 dark:text-space-400 mt-0.5">
                          Display the domain that was blocked
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl border border-space-200 dark:border-space-700 hover:bg-space-50 dark:hover:bg-space-800/50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={form.showCategory}
                        onChange={(e) => updateForm('showCategory', e.target.checked)}
                        className="h-4 w-4 rounded border-space-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <TagIcon className="h-4 w-4 text-space-500" />
                          <span className="text-sm font-medium text-space-700 dark:text-space-300">Show Category</span>
                        </div>
                        <p className="text-xs text-space-500 dark:text-space-400 mt-0.5">
                          Display the category that triggered the block
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl border border-space-200 dark:border-space-700 hover:bg-space-50 dark:hover:bg-space-800/50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={form.showTimestamp}
                        onChange={(e) => updateForm('showTimestamp', e.target.checked)}
                        className="h-4 w-4 rounded border-space-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <ClockIcon className="h-4 w-4 text-space-500" />
                          <span className="text-sm font-medium text-space-700 dark:text-space-300">Show Timestamp</span>
                        </div>
                        <p className="text-xs text-space-500 dark:text-space-400 mt-0.5">
                          Display when the block occurred
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="border-t border-space-200 dark:border-space-700 pt-6">
                  <h3 className="text-sm font-medium text-space-700 dark:text-space-300 mb-4">
                    User Actions
                  </h3>
                  <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-space-200 dark:border-space-700 hover:border-nebula-400 dark:hover:border-nebula-500 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={form.showRequestAccess}
                      onChange={(e) => updateForm('showRequestAccess', e.target.checked)}
                      className="h-5 w-5 rounded border-space-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <EnvelopeIcon className="h-5 w-5 text-nebula-500" />
                        <span className="font-medium text-space-800 dark:text-white">Allow Access Requests</span>
                      </div>
                      <p className="text-sm text-space-500 dark:text-space-400 mt-1">
                        Let users submit a request to access blocked content. Requests will appear in your Access Requests queue.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                  <div className="flex gap-3">
                    <InformationCircleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">Advanced Customization</h4>
                      <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                        Use custom HTML and CSS for complete control over the block page appearance. This overrides the design settings above.
                      </p>
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.useCustomHtml}
                    onChange={(e) => updateForm('useCustomHtml', e.target.checked)}
                    className="h-4 w-4 rounded border-space-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-space-700 dark:text-space-300">
                    Use custom HTML template
                  </span>
                </label>

                {form.useCustomHtml && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                        Custom HTML Template
                      </label>
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        <span className="text-xs text-space-500">Available placeholders:</span>
                        {['{{domain}}', '{{category}}', '{{timestamp}}', '{{title}}', '{{message}}', '{{client_ip}}'].map(p => (
                          <code key={p} className="px-1.5 py-0.5 text-xs rounded bg-space-100 dark:bg-space-800 text-nebula-600 dark:text-nebula-400">
                            {p}
                          </code>
                        ))}
                      </div>
                      <textarea
                        value={form.customHtml}
                        onChange={(e) => updateForm('customHtml', e.target.value)}
                        placeholder={`<!DOCTYPE html>
<html>
<head>
  <title>{{title}}</title>
</head>
<body>
  <div class="container">
    <h1>{{title}}</h1>
    <p>{{message}}</p>
    <p>Blocked: {{domain}}</p>
    <p>Category: {{category}}</p>
  </div>
</body>
</html>`}
                        rows={16}
                        className="w-full px-4 py-3 rounded-xl border border-space-200 dark:border-space-600 bg-white dark:bg-space-800 text-space-900 dark:text-white placeholder-space-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-mono text-sm resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                        Additional CSS
                      </label>
                      <textarea
                        value={form.customCss}
                        onChange={(e) => updateForm('customCss', e.target.value)}
                        placeholder={`.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px;
}

h1 {
  color: #333;
  font-size: 24px;
}`}
                        rows={10}
                        className="w-full px-4 py-3 rounded-xl border border-space-200 dark:border-space-600 bg-white dark:bg-space-800 text-space-900 dark:text-white placeholder-space-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-mono text-sm resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="w-[480px] flex flex-col bg-space-100 dark:bg-space-900 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-space-200 dark:border-space-700 bg-white dark:bg-space-800">
            <div className="flex items-center gap-2">
              <EyeIcon className="h-4 w-4 text-space-500" />
              <span className="text-sm font-medium text-space-700 dark:text-space-300">Live Preview</span>
            </div>
            <button
              onClick={() => setShowPreviewPanel(!showPreviewPanel)}
              className="text-xs text-space-500 hover:text-space-700 dark:hover:text-space-300"
            >
              {showPreviewPanel ? 'Hide' : 'Show'}
            </button>
          </div>

          {showPreviewPanel && (
            <div className="flex-1 overflow-auto p-4">
              <div
                className="rounded-xl overflow-hidden shadow-lg min-h-[500px]"
                style={{ backgroundColor: form.backgroundColor }}
              >
                <div className="p-8 flex items-center justify-center min-h-[500px]">
                  <div className="w-full max-w-md">
                    {/* Preview card - uses selected colors directly */}
                    <div
                      className="rounded-xl shadow-xl p-8 text-center"
                      style={{ backgroundColor: form.backgroundColor }}
                    >
                      {/* Logo */}
                      {form.logoUrl && (
                        <img
                          src={form.logoUrl}
                          alt="Logo"
                          className="h-12 mx-auto mb-6 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      )}

                      {/* Icon */}
                      <div
                        className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center shadow-lg"
                        style={{ backgroundColor: form.primaryColor }}
                      >
                        <ShieldExclamationIcon className="h-8 w-8 text-white" />
                      </div>

                      {/* Title */}
                      <h2
                        className="text-2xl font-bold mb-3 leading-tight"
                        style={{ color: form.textColor }}
                      >
                        {form.title || 'Access Blocked'}
                      </h2>

                      {/* Message */}
                      <p
                        className="mb-6 text-base leading-relaxed"
                        style={{ color: form.textColor }}
                      >
                        {form.message || 'This content has been blocked.'}
                      </p>

                      {/* Info Section */}
                      {(form.showDomain || form.showCategory || form.showTimestamp) && (
                        <div
                          className="text-sm space-y-2 mb-6 p-4 rounded-xl border"
                          style={{
                            backgroundColor: form.backgroundColor === '#18181b' || form.backgroundColor === '#0f172a'
                              ? 'rgba(255,255,255,0.05)'
                              : 'rgba(0,0,0,0.03)',
                            borderColor: form.backgroundColor === '#18181b' || form.backgroundColor === '#0f172a'
                              ? 'rgba(255,255,255,0.1)'
                              : 'rgba(0,0,0,0.08)'
                          }}
                        >
                          {form.showDomain && (
                            <div className="flex items-center justify-between" style={{ color: form.textColor }}>
                              <span className="font-medium">Domain:</span>
                              <span className="font-mono">blocked-site.com</span>
                            </div>
                          )}
                          {form.showCategory && (
                            <div className="flex items-center justify-between" style={{ color: form.textColor }}>
                              <span className="font-medium">Category:</span>
                              <span>Social Media</span>
                            </div>
                          )}
                          {form.showTimestamp && (
                            <div className="flex items-center justify-between" style={{ color: form.textColor }}>
                              <span className="font-medium">Time:</span>
                              <span>{new Date().toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Request Access Button */}
                      {form.showRequestAccess && (
                        <button
                          className="w-full py-3.5 px-6 rounded-xl text-white font-semibold transition-all hover:opacity-90 shadow-md"
                          style={{ backgroundColor: form.primaryColor }}
                        >
                          Request Access
                        </button>
                      )}

                      {/* Support Email */}
                      {form.supportEmail && (
                        <p className="mt-5 text-sm" style={{ color: form.textColor }}>
                          Need help? Contact{' '}
                          <a
                            href={`mailto:${form.supportEmail}`}
                            className="underline font-medium"
                            style={{ color: form.primaryColor }}
                          >
                            {form.supportEmail}
                          </a>
                        </p>
                      )}

                      {/* Footer */}
                      {form.footerText && (
                        <p
                          className="mt-6 pt-4 text-xs"
                          style={{
                            color: form.textColor,
                            borderTop: `1px solid ${form.backgroundColor === '#18181b' || form.backgroundColor === '#0f172a' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
                          }}
                        >
                          {form.footerText}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-space-200 dark:border-space-700 bg-space-50 dark:bg-space-800/50 -mx-6 -mb-6 mt-6">
        <Button variant="secondary" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
          {isEditing ? 'Save Changes' : 'Create Block Page'}
        </Button>
      </div>
    </Modal>
  )
}

