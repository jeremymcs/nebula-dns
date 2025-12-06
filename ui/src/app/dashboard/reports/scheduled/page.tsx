/**
 * Scheduled Reports Management Page
 */

'use client'

import { useState, useEffect } from 'react'
import { 
  PlusIcon, 
  CalendarDaysIcon,
  EnvelopeIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'

interface ScheduledReport {
  id: string
  name: string
  description?: string
  reportType: 'summary' | 'threats' | 'top_blocked' | 'activity' | 'compliance'
  scheduleType: 'daily' | 'weekly' | 'monthly'
  scheduleDay?: number
  scheduleTime: string
  timezone: string
  recipients: string[]
  format: 'pdf' | 'csv' | 'html'
  isEnabled: boolean
  lastSentAt?: string
  nextRunAt?: string
}

const reportTypeLabels: Record<string, string> = {
  summary: 'Summary Report',
  threats: 'Threat Report',
  top_blocked: 'Top Blocked Domains',
  activity: 'Activity Report',
  compliance: 'Compliance Report',
}

const scheduleTypeLabels: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function ScheduledReportsPage() {
  const [reports, setReports] = useState<ScheduledReport[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    reportType: 'summary' as const,
    scheduleType: 'weekly' as const,
    scheduleDay: 1,
    scheduleTime: '08:00',
    timezone: 'UTC',
    recipients: '',
    format: 'pdf' as const,
  })

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scheduled-reports`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setReports(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch reports')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const token = localStorage.getItem('token')
      const url = editingReport
        ? `${process.env.NEXT_PUBLIC_API_URL}/scheduled-reports/${editingReport.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/scheduled-reports`
      
      const res = await fetch(url, {
        method: editingReport ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          recipients: formData.recipients.split(',').map(e => e.trim()).filter(Boolean),
        }),
      })

      if (res.ok) {
        setShowModal(false)
        setEditingReport(null)
        resetForm()
        fetchReports()
      }
    } catch (err) {
      console.error('Failed to save report')
    }
  }

  const toggleReport = async (report: ScheduledReport) => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scheduled-reports/${report.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isEnabled: !report.isEnabled }),
      })
      fetchReports()
    } catch (err) {
      console.error('Failed to toggle report')
    }
  }

  const deleteReport = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled report?')) return
    
    try {
      const token = localStorage.getItem('token')
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scheduled-reports/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchReports()
    } catch (err) {
      console.error('Failed to delete report')
    }
  }

  const runNow = async (id: string) => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scheduled-reports/${id}/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      alert('Report generation started!')
    } catch (err) {
      console.error('Failed to run report')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      reportType: 'summary',
      scheduleType: 'weekly',
      scheduleDay: 1,
      scheduleTime: '08:00',
      timezone: 'UTC',
      recipients: '',
      format: 'pdf',
    })
  }

  const openEditModal = (report: ScheduledReport) => {
    setEditingReport(report)
    setFormData({
      name: report.name,
      description: report.description || '',
      reportType: report.reportType,
      scheduleType: report.scheduleType,
      scheduleDay: report.scheduleDay || 1,
      scheduleTime: report.scheduleTime,
      timezone: report.timezone,
      recipients: report.recipients.join(', '),
      format: report.format,
    })
    setShowModal(true)
  }

  const formatSchedule = (report: ScheduledReport) => {
    let schedule = `${scheduleTypeLabels[report.scheduleType]} at ${report.scheduleTime}`
    if (report.scheduleType === 'weekly' && report.scheduleDay !== undefined) {
      schedule = `Every ${dayNames[report.scheduleDay]} at ${report.scheduleTime}`
    } else if (report.scheduleType === 'monthly' && report.scheduleDay !== undefined) {
      schedule = `Day ${report.scheduleDay} of each month at ${report.scheduleTime}`
    }
    return schedule
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scheduled Reports</h1>
          <p className="text-gray-600 mt-1">Automate report delivery to your team</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setEditingReport(null)
            setShowModal(true)
          }}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Scheduled Report
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CalendarDaysIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled reports</h3>
          <p className="text-gray-600 mb-6">Create a scheduled report to automatically receive insights via email.</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
          >
            Create Your First Report
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipients</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Run</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{report.name}</div>
                    <div className="text-sm text-gray-500">{reportTypeLabels[report.reportType]}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-gray-600">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {formatSchedule(report)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-gray-600">
                      <EnvelopeIcon className="h-4 w-4 mr-1" />
                      {report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {report.isEnabled ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        <XCircleIcon className="h-4 w-4 mr-1" />
                        Paused
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {report.nextRunAt 
                      ? new Date(report.nextRunAt).toLocaleString()
                      : '-'
                    }
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => runNow(report.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Run Now"
                      >
                        <PlayIcon className="h-5 w-5 text-gray-500" />
                      </button>
                      <button
                        onClick={() => toggleReport(report)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title={report.isEnabled ? 'Pause' : 'Enable'}
                      >
                        {report.isEnabled ? (
                          <PauseIcon className="h-5 w-5 text-gray-500" />
                        ) : (
                          <PlayIcon className="h-5 w-5 text-green-500" />
                        )}
                      </button>
                      <button
                        onClick={() => openEditModal(report)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5 text-gray-500" />
                      </button>
                      <button
                        onClick={() => deleteReport(report.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingReport ? 'Edit Scheduled Report' : 'New Scheduled Report'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Weekly Security Summary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Optional description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Type *
                </label>
                <select
                  name="reportType"
                  value={formData.reportType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {Object.entries(reportTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency *
                  </label>
                  <select
                    name="scheduleType"
                    value={formData.scheduleType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {formData.scheduleType === 'weekly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Day of Week
                    </label>
                    <select
                      name="scheduleDay"
                      value={formData.scheduleDay}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {dayNames.map((day, index) => (
                        <option key={index} value={index}>{day}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.scheduleType === 'monthly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Day of Month
                    </label>
                    <select
                      name="scheduleDay"
                      value={formData.scheduleDay}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {Array.from({ length: 28 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    name="scheduleTime"
                    value={formData.scheduleTime}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Format
                  </label>
                  <select
                    name="format"
                    value={formData.format}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="pdf">PDF</option>
                    <option value="csv">CSV</option>
                    <option value="html">HTML</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipients *
                </label>
                <input
                  type="text"
                  name="recipients"
                  value={formData.recipients}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="email1@example.com, email2@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                >
                  {editingReport ? 'Save Changes' : 'Create Report'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingReport(null)
                    resetForm()
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
