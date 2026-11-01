'use client';

import { useState } from 'react';
import { useSiemIntegrations, useWebhooks } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { TierFeatureGate } from '@/components/tiers/TierFeatureGate';

interface SiemIntegration {
  id: string;
  name: string;
  type: 'splunk' | 'elastic' | 'sentinel' | 'syslog';
  isEnabled: boolean;
  lastSentAt?: string;
  errorCount: number;
  lastError?: string;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  isEnabled: boolean;
  lastTriggeredAt?: string;
  failureCount: number;
}

const siemTypes = {
  splunk: { name: 'Splunk', icon: '🔶', color: 'bg-orange-100 dark:bg-orange-900/50' },
  elastic: { name: 'Elasticsearch', icon: '🟡', color: 'bg-warning-100 dark:bg-warning-900/50' },
  sentinel: { name: 'Microsoft Sentinel', icon: '🔵', color: 'bg-blue-100 dark:bg-blue-900/50' },
  syslog: { name: 'Syslog', icon: '📋', color: 'bg-space-100 dark:bg-space-700' },
};

const webhookEvents = [
  { value: 'policy.created', label: 'Policy Created' },
  { value: 'policy.updated', label: 'Policy Updated' },
  { value: 'policy.deleted', label: 'Policy Deleted' },
  { value: 'location.created', label: 'Location Created' },
  { value: 'location.updated', label: 'Location Updated' },
  { value: 'user.invited', label: 'User Invited' },
  { value: 'threat.detected', label: 'Threat Detected' },
  { value: 'report.generated', label: 'Report Generated' },
];

export default function IntegrationsPage() {
  const { data: siemData, isLoading: siemLoading, mutate: mutateSiem } = useSiemIntegrations();
  const { data: webhooksData, isLoading: webhooksLoading, mutate: mutateWebhooks } = useWebhooks();
  const { showToast } = useToast();

  const [showSiemModal, setShowSiemModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [selectedSiemType, setSelectedSiemType] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingSiemId, setEditingSiemId] = useState<string | null>(null);
  const [editingWebhookId, setEditingWebhookId] = useState<string | null>(null);

  const siemIntegrations: SiemIntegration[] = siemData?.data || [];
  const webhooks: Webhook[] = webhooksData?.data || [];

  const [siemForm, setSiemForm] = useState({
    name: '',
    hecUrl: '',
    hecToken: '',
    url: '',
    apiKey: '',
    workspaceId: '',
    sharedKey: '',
    host: '',
    port: '',
    protocol: 'tcp',
    logTypes: ['blocked', 'threats'],
  });

  const [webhookForm, setWebhookForm] = useState({
    name: '',
    url: '',
    secret: '',
    events: [] as string[],
  });

  const resetSiemForm = () => {
    setSiemForm({
      name: '',
      hecUrl: '',
      hecToken: '',
      url: '',
      apiKey: '',
      workspaceId: '',
      sharedKey: '',
      host: '',
      port: '',
      protocol: 'tcp',
      logTypes: ['blocked', 'threats'],
    });
    setSelectedSiemType(null);
  };

  const resetWebhookForm = () => {
    setWebhookForm({
      name: '',
      url: '',
      secret: '',
      events: [],
    });
  };

  const handleCreateSiem = async () => {
    if (!siemForm.name.trim() || !selectedSiemType) {
      showToast('error', 'Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: siemForm.name,
        logTypes: siemForm.logTypes,
      };

      if (selectedSiemType === 'splunk') {
        payload.hecUrl = siemForm.hecUrl;
        payload.hecToken = siemForm.hecToken;
      } else if (selectedSiemType === 'elastic') {
        payload.url = siemForm.url;
        payload.apiKey = siemForm.apiKey;
      } else if (selectedSiemType === 'sentinel') {
        payload.workspaceId = siemForm.workspaceId;
        payload.sharedKey = siemForm.sharedKey;
      } else if (selectedSiemType === 'syslog') {
        payload.host = siemForm.host;
        payload.port = parseInt(siemForm.port) || 514;
        payload.protocol = siemForm.protocol;
      }

      await api.createSiemIntegration(selectedSiemType, payload);
      showToast('success', 'SIEM integration created successfully');
      mutateSiem();
      setShowSiemModal(false);
      resetSiemForm();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to create SIEM integration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSiem = async (id: string) => {
    try {
      const result = await api.testSiemIntegration(id);
      if (result.success) {
        showToast('success', 'SIEM connection test successful');
      } else {
        showToast('error', result.message || 'SIEM connection test failed');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to test SIEM integration');
    }
  };

  const handleCreateWebhook = async () => {
    if (!webhookForm.name.trim() || !webhookForm.url.trim()) {
      showToast('error', 'Name and URL are required');
      return;
    }

    if (webhookForm.events.length === 0) {
      showToast('error', 'At least one event must be selected');
      return;
    }

    setSaving(true);
    try {
      await api.createWebhook({
        url: webhookForm.url,
        events: webhookForm.events,
        secret: webhookForm.secret || undefined,
      });
      showToast('success', 'Webhook created successfully');
      mutateWebhooks();
      setShowWebhookModal(false);
      resetWebhookForm();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to create webhook');
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async (id: string) => {
    try {
      const result = await api.testWebhook(id);
      if (result.success) {
        showToast('success', `Webhook test successful (HTTP ${result.statusCode})`);
      } else {
        showToast('error', `Webhook test failed (HTTP ${result.statusCode})`);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to test webhook');
    }
  };

  const handleEditSiem = (integration: SiemIntegration) => {
    setEditingSiemId(integration.id);
    setSelectedSiemType(integration.type);
    setSiemForm({
      ...siemForm,
      name: integration.name,
    });
    setShowSiemModal(true);
  };

  const handleDeleteSiem = async (integration: SiemIntegration) => {
    if (!confirm(`Are you sure you want to delete the "${integration.name}" integration?`)) {
      return;
    }

    try {
      await api.deleteSiemIntegration(integration.id);
      showToast('success', 'SIEM integration deleted');
      mutateSiem();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete SIEM integration');
    }
  };

  const handleUpdateSiem = async () => {
    if (!siemForm.name.trim() || !selectedSiemType || !editingSiemId) {
      showToast('error', 'Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: siemForm.name,
        logTypes: siemForm.logTypes,
      };

      if (selectedSiemType === 'splunk') {
        payload.hecUrl = siemForm.hecUrl;
        payload.hecToken = siemForm.hecToken;
      } else if (selectedSiemType === 'elastic') {
        payload.url = siemForm.url;
        payload.apiKey = siemForm.apiKey;
      } else if (selectedSiemType === 'sentinel') {
        payload.workspaceId = siemForm.workspaceId;
        payload.sharedKey = siemForm.sharedKey;
      } else if (selectedSiemType === 'syslog') {
        payload.host = siemForm.host;
        payload.port = parseInt(siemForm.port) || 514;
        payload.protocol = siemForm.protocol;
      }

      await api.updateSiemIntegration(editingSiemId, payload);
      showToast('success', 'SIEM integration updated successfully');
      mutateSiem();
      setShowSiemModal(false);
      resetSiemForm();
      setEditingSiemId(null);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update SIEM integration');
    } finally {
      setSaving(false);
    }
  };

  const handleEditWebhook = (webhook: Webhook) => {
    setEditingWebhookId(webhook.id);
    setWebhookForm({
      name: webhook.name,
      url: webhook.url,
      secret: '',
      events: webhook.events,
    });
    setShowWebhookModal(true);
  };

  const handleDeleteWebhook = async (webhook: Webhook) => {
    if (!confirm(`Are you sure you want to delete the "${webhook.name}" webhook?`)) {
      return;
    }

    try {
      await api.deleteWebhook(webhook.id);
      showToast('success', 'Webhook deleted');
      mutateWebhooks();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete webhook');
    }
  };

  const handleUpdateWebhook = async () => {
    if (!webhookForm.name.trim() || !webhookForm.url.trim() || !editingWebhookId) {
      showToast('error', 'Name and URL are required');
      return;
    }

    if (webhookForm.events.length === 0) {
      showToast('error', 'At least one event must be selected');
      return;
    }

    setSaving(true);
    try {
      await api.updateWebhook(editingWebhookId, {
        url: webhookForm.url,
        events: webhookForm.events,
        secret: webhookForm.secret || undefined,
      });
      showToast('success', 'Webhook updated successfully');
      mutateWebhooks();
      setShowWebhookModal(false);
      resetWebhookForm();
      setEditingWebhookId(null);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update webhook');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TierFeatureGate feature="integrations">
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-space-900 dark:text-white">Integrations</h1>
        <p className="text-space-600 dark:text-space-400">Connect Nebula DNS with your security tools and workflows</p>
      </div>

      {/* SIEM Integrations Section */}
      <div className="bg-white dark:bg-space-800 rounded-xl shadow-sm border border-space-200 dark:border-space-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-space-900 dark:text-white">SIEM Integrations</h2>
            <p className="text-sm text-space-600 dark:text-space-400">Forward DNS logs to your security platform</p>
          </div>
          <button
            onClick={() => setShowSiemModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Add SIEM
          </button>
        </div>

        {siemIntegrations.length > 0 ? (
          <div className="space-y-4">
            {siemIntegrations.map((integration) => (
              <div key={integration.id} className="border dark:border-space-700 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${siemTypes[integration.type].color} rounded-lg flex items-center justify-center text-2xl`}>
                    {siemTypes[integration.type].icon}
                  </div>
                  <div>
                    <div className="font-medium text-space-900 dark:text-white">{integration.name}</div>
                    <div className="text-sm text-space-500 dark:text-space-400">{siemTypes[integration.type].name}</div>
                    {integration.lastSentAt && (
                      <div className="text-xs text-space-400">
                        Last sent: {new Date(integration.lastSentAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {integration.errorCount > 0 && (
                    <div className="text-sm text-danger-600 dark:text-danger-400">
                      {integration.errorCount} errors
                    </div>
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    integration.isEnabled
                      ? 'bg-success-100 dark:bg-success-900/50 text-success-800 dark:text-success-200'
                      : 'bg-space-100 dark:bg-space-700 text-space-800 dark:text-space-200'
                  }`}>
                    {integration.isEnabled ? 'Active' : 'Disabled'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTestSiem(integration.id)}
                      className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => handleEditSiem(integration)}
                      className="text-sm text-space-600 dark:text-space-400 hover:text-space-800 dark:hover:text-space-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSiem(integration)}
                      className="text-sm text-danger-600 dark:text-danger-400 hover:text-danger-800 dark:hover:text-danger-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-space-500 dark:text-space-400">
            {siemLoading ? 'Loading...' : 'No SIEM integrations configured'}
          </div>
        )}
      </div>

      {/* Webhooks Section */}
      <div className="bg-white dark:bg-space-800 rounded-xl shadow-sm border border-space-200 dark:border-space-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-space-900 dark:text-white">Webhooks</h2>
            <p className="text-sm text-space-600 dark:text-space-400">Send real-time notifications to external services</p>
          </div>
          <button
            onClick={() => setShowWebhookModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Add Webhook
          </button>
        </div>

        {webhooks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-space-500 dark:text-space-400 border-b dark:border-space-700">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">URL</th>
                  <th className="pb-3 font-medium">Events</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Last Triggered</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((webhook) => (
                  <tr key={webhook.id} className="border-b dark:border-space-700 last:border-b-0">
                    <td className="py-3 font-medium text-space-900 dark:text-white">{webhook.name}</td>
                    <td className="py-3">
                      <code className="text-sm bg-space-100 dark:bg-space-700 px-2 py-1 rounded truncate block max-w-xs dark:text-space-300">
                        {webhook.url}
                      </code>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.slice(0, 2).map((event) => (
                          <span key={event} className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 text-xs rounded-full">
                            {event}
                          </span>
                        ))}
                        {webhook.events.length > 2 && (
                          <span className="px-2 py-0.5 bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-400 text-xs rounded-full">
                            +{webhook.events.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        webhook.isEnabled
                          ? 'bg-success-100 dark:bg-success-900/50 text-success-800 dark:text-success-200'
                          : 'bg-space-100 dark:bg-space-700 text-space-800 dark:text-space-200'
                      }`}>
                        {webhook.isEnabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-space-600 dark:text-space-400">
                      {webhook.lastTriggeredAt
                        ? new Date(webhook.lastTriggeredAt).toLocaleString()
                        : 'Never'
                      }
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTestWebhook(webhook.id)}
                          className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                        >
                          Test
                        </button>
                        <button
                          onClick={() => handleEditWebhook(webhook)}
                          className="text-sm text-space-600 dark:text-space-400 hover:text-space-800 dark:hover:text-space-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteWebhook(webhook)}
                          className="text-sm text-danger-600 dark:text-danger-400 hover:text-danger-800 dark:hover:text-danger-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-space-500 dark:text-space-400">
            {webhooksLoading ? 'Loading...' : 'No webhooks configured'}
          </div>
        )}
      </div>

      {/* SIEM Modal */}
      {showSiemModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-space-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b dark:border-space-700">
              <h2 className="text-xl font-semibold dark:text-white">
                {editingSiemId
                  ? `Edit ${siemTypes[selectedSiemType as keyof typeof siemTypes]?.name || 'SIEM'} Integration`
                  : selectedSiemType
                    ? `Configure ${siemTypes[selectedSiemType as keyof typeof siemTypes].name}`
                    : 'Add SIEM Integration'}
              </h2>
            </div>

            <div className="p-6">
              {!selectedSiemType ? (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(siemTypes).map(([type, info]) => (
                    <button
                      key={type}
                      onClick={() => setSelectedSiemType(type)}
                      className="p-4 border dark:border-space-600 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition text-left"
                    >
                      <div className="text-3xl mb-2">{info.icon}</div>
                      <div className="font-medium text-space-900 dark:text-white">{info.name}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">Name</label>
                    <input
                      type="text"
                      value={siemForm.name}
                      onChange={(e) => setSiemForm({ ...siemForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 dark:text-white"
                      placeholder="e.g., Production Splunk"
                    />
                  </div>

                  {selectedSiemType === 'splunk' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">HEC URL</label>
                        <input
                          type="url"
                          value={siemForm.hecUrl}
                          onChange={(e) => setSiemForm({ ...siemForm, hecUrl: e.target.value })}
                          className="w-full px-3 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 dark:text-white"
                          placeholder="https://splunk.example.com:8088"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">HEC Token</label>
                        <input
                          type="password"
                          value={siemForm.hecToken}
                          onChange={(e) => setSiemForm({ ...siemForm, hecToken: e.target.value })}
                          className="w-full px-3 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 dark:text-white"
                        />
                      </div>
                    </>
                  )}

                  {selectedSiemType === 'elastic' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">Elasticsearch URL</label>
                        <input
                          type="url"
                          value={siemForm.url}
                          onChange={(e) => setSiemForm({ ...siemForm, url: e.target.value })}
                          className="w-full px-3 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 dark:text-white"
                          placeholder="https://elastic.example.com:9200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">API Key</label>
                        <input
                          type="password"
                          value={siemForm.apiKey}
                          onChange={(e) => setSiemForm({ ...siemForm, apiKey: e.target.value })}
                          className="w-full px-3 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 dark:text-white"
                        />
                      </div>
                    </>
                  )}

                  {selectedSiemType === 'sentinel' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">Workspace ID</label>
                        <input
                          type="text"
                          value={siemForm.workspaceId}
                          onChange={(e) => setSiemForm({ ...siemForm, workspaceId: e.target.value })}
                          className="w-full px-3 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">Shared Key</label>
                        <input
                          type="password"
                          value={siemForm.sharedKey}
                          onChange={(e) => setSiemForm({ ...siemForm, sharedKey: e.target.value })}
                          className="w-full px-3 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 dark:text-white"
                        />
                      </div>
                    </>
                  )}

                  {selectedSiemType === 'syslog' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">Host</label>
                          <input
                            type="text"
                            value={siemForm.host}
                            onChange={(e) => setSiemForm({ ...siemForm, host: e.target.value })}
                            className="w-full px-3 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 dark:text-white"
                            placeholder="syslog.example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">Port</label>
                          <input
                            type="text"
                            value={siemForm.port}
                            onChange={(e) => setSiemForm({ ...siemForm, port: e.target.value })}
                            className="w-full px-3 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 dark:text-white"
                            placeholder="514"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">Protocol</label>
                        <select
                          value={siemForm.protocol}
                          onChange={(e) => setSiemForm({ ...siemForm, protocol: e.target.value })}
                          className="w-full px-3 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 dark:text-white"
                        >
                          <option value="tcp">TCP</option>
                          <option value="udp">UDP</option>
                          <option value="tls">TLS</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">Log Types</label>
                    <div className="flex flex-wrap gap-2">
                      {['blocked', 'threats', 'allowed'].map((type) => (
                        <label key={type} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={siemForm.logTypes.includes(type)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSiemForm({ ...siemForm, logTypes: [...siemForm.logTypes, type] });
                              } else {
                                setSiemForm({ ...siemForm, logTypes: siemForm.logTypes.filter(t => t !== type) });
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm capitalize dark:text-space-300">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t dark:border-space-700 flex justify-between">
              {selectedSiemType && (
                <button
                  onClick={() => setSelectedSiemType(null)}
                  className="px-4 py-2 text-space-700 dark:text-space-300 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg"
                >
                  Back
                </button>
              )}
              <div className="flex gap-3 ml-auto">
                <button
                  onClick={() => {
                    setShowSiemModal(false);
                    resetSiemForm();
                    setEditingSiemId(null);
                  }}
                  className="px-4 py-2 text-space-700 dark:text-space-300 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg"
                >
                  Cancel
                </button>
                {selectedSiemType && (
                  <button
                    onClick={editingSiemId ? handleUpdateSiem : handleCreateSiem}
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving
                      ? (editingSiemId ? 'Updating...' : 'Adding...')
                      : (editingSiemId ? 'Update Integration' : 'Add Integration')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-space-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b dark:border-space-700">
              <h2 className="text-xl font-semibold dark:text-white">
                {editingWebhookId ? 'Edit Webhook' : 'Add Webhook'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">Name</label>
                <input
                  type="text"
                  value={webhookForm.name}
                  onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 dark:text-white"
                  placeholder="e.g., Slack Notifications"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">Webhook URL</label>
                <input
                  type="url"
                  value={webhookForm.url}
                  onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                  className="w-full px-3 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 dark:text-white"
                  placeholder="https://api.example.com/webhook"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
                  Secret (optional)
                </label>
                <input
                  type="password"
                  value={webhookForm.secret}
                  onChange={(e) => setWebhookForm({ ...webhookForm, secret: e.target.value })}
                  className="w-full px-3 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 dark:text-white"
                  placeholder="Used for HMAC signature verification"
                />
                <p className="text-xs text-space-500 dark:text-space-400 mt-1">
                  We'll sign payloads with this secret so you can verify they came from Nebula DNS
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">Events</label>
                <div className="grid grid-cols-2 gap-2">
                  {webhookEvents.map((event) => (
                    <label key={event.value} className="flex items-center gap-2 p-2 border dark:border-space-600 rounded-lg hover:bg-space-50 dark:hover:bg-space-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={webhookForm.events.includes(event.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setWebhookForm({ ...webhookForm, events: [...webhookForm.events, event.value] });
                          } else {
                            setWebhookForm({ ...webhookForm, events: webhookForm.events.filter(ev => ev !== event.value) });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm dark:text-space-300">{event.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t dark:border-space-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowWebhookModal(false);
                  resetWebhookForm();
                  setEditingWebhookId(null);
                }}
                className="px-4 py-2 text-space-700 dark:text-space-300 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={editingWebhookId ? handleUpdateWebhook : handleCreateWebhook}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving
                  ? (editingWebhookId ? 'Updating...' : 'Adding...')
                  : (editingWebhookId ? 'Update Webhook' : 'Add Webhook')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </TierFeatureGate>
  );
}
