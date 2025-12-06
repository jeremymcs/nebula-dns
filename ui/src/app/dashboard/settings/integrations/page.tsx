'use client';

import { useState } from 'react';

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

const mockSiemIntegrations: SiemIntegration[] = [
  {
    id: '1',
    name: 'Splunk Cloud',
    type: 'splunk',
    isEnabled: true,
    lastSentAt: '2024-03-15T10:30:00Z',
    errorCount: 0,
  },
  {
    id: '2',
    name: 'Elasticsearch Cluster',
    type: 'elastic',
    isEnabled: false,
    errorCount: 3,
    lastError: 'Connection timeout',
  },
];

const mockWebhooks: Webhook[] = [
  {
    id: '1',
    name: 'Slack Notifications',
    url: 'https://hooks.slack.com/services/xxx',
    events: ['threat.detected', 'policy.updated'],
    isEnabled: true,
    lastTriggeredAt: '2024-03-15T09:00:00Z',
    failureCount: 0,
  },
  {
    id: '2',
    name: 'Ticketing System',
    url: 'https://api.ticketing.com/webhook',
    events: ['threat.detected'],
    isEnabled: true,
    lastTriggeredAt: '2024-03-14T15:30:00Z',
    failureCount: 0,
  },
];

const siemTypes = {
  splunk: { name: 'Splunk', icon: '🔶', color: 'bg-orange-100' },
  elastic: { name: 'Elasticsearch', icon: '🟡', color: 'bg-yellow-100' },
  sentinel: { name: 'Microsoft Sentinel', icon: '🔵', color: 'bg-blue-100' },
  syslog: { name: 'Syslog', icon: '📋', color: 'bg-gray-100' },
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
  const [siemIntegrations, setSiemIntegrations] = useState(mockSiemIntegrations);
  const [webhooks, setWebhooks] = useState(mockWebhooks);
  const [showSiemModal, setShowSiemModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [selectedSiemType, setSelectedSiemType] = useState<string | null>(null);

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-600">Connect SafeDNS with your security tools and workflows</p>
      </div>

      {/* SIEM Integrations Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">SIEM Integrations</h2>
            <p className="text-sm text-gray-600">Forward DNS logs to your security platform</p>
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
              <div key={integration.id} className="border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${siemTypes[integration.type].color} rounded-lg flex items-center justify-center text-2xl`}>
                    {siemTypes[integration.type].icon}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{integration.name}</div>
                    <div className="text-sm text-gray-500">{siemTypes[integration.type].name}</div>
                    {integration.lastSentAt && (
                      <div className="text-xs text-gray-400">
                        Last sent: {new Date(integration.lastSentAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {integration.errorCount > 0 && (
                    <div className="text-sm text-red-600">
                      {integration.errorCount} errors
                    </div>
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    integration.isEnabled 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {integration.isEnabled ? 'Active' : 'Disabled'}
                  </span>
                  <div className="flex gap-2">
                    <button className="text-sm text-indigo-600 hover:text-indigo-800">Test</button>
                    <button className="text-sm text-gray-600 hover:text-gray-800">Edit</button>
                    <button className="text-sm text-red-600 hover:text-red-800">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No SIEM integrations configured
          </div>
        )}
      </div>

      {/* Webhooks Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Webhooks</h2>
            <p className="text-sm text-gray-600">Send real-time notifications to external services</p>
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
                <tr className="text-left text-sm text-gray-500 border-b">
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
                  <tr key={webhook.id} className="border-b last:border-b-0">
                    <td className="py-3 font-medium text-gray-900">{webhook.name}</td>
                    <td className="py-3">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded truncate block max-w-xs">
                        {webhook.url}
                      </code>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.slice(0, 2).map((event) => (
                          <span key={event} className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                            {event}
                          </span>
                        ))}
                        {webhook.events.length > 2 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{webhook.events.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        webhook.isEnabled 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {webhook.isEnabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-600">
                      {webhook.lastTriggeredAt 
                        ? new Date(webhook.lastTriggeredAt).toLocaleString()
                        : 'Never'
                      }
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button className="text-sm text-indigo-600 hover:text-indigo-800">Test</button>
                        <button className="text-sm text-gray-600 hover:text-gray-800">Edit</button>
                        <button className="text-sm text-red-600 hover:text-red-800">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No webhooks configured
          </div>
        )}
      </div>

      {/* SIEM Modal */}
      {showSiemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {selectedSiemType ? `Configure ${siemTypes[selectedSiemType as keyof typeof siemTypes].name}` : 'Add SIEM Integration'}
              </h2>
            </div>

            <div className="p-6">
              {!selectedSiemType ? (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(siemTypes).map(([type, info]) => (
                    <button
                      key={type}
                      onClick={() => setSelectedSiemType(type)}
                      className="p-4 border rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
                    >
                      <div className="text-3xl mb-2">{info.icon}</div>
                      <div className="font-medium text-gray-900">{info.name}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={siemForm.name}
                      onChange={(e) => setSiemForm({ ...siemForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Production Splunk"
                    />
                  </div>

                  {selectedSiemType === 'splunk' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">HEC URL</label>
                        <input
                          type="url"
                          value={siemForm.hecUrl}
                          onChange={(e) => setSiemForm({ ...siemForm, hecUrl: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="https://splunk.example.com:8088"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">HEC Token</label>
                        <input
                          type="password"
                          value={siemForm.hecToken}
                          onChange={(e) => setSiemForm({ ...siemForm, hecToken: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </>
                  )}

                  {selectedSiemType === 'elastic' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Elasticsearch URL</label>
                        <input
                          type="url"
                          value={siemForm.url}
                          onChange={(e) => setSiemForm({ ...siemForm, url: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="https://elastic.example.com:9200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                        <input
                          type="password"
                          value={siemForm.apiKey}
                          onChange={(e) => setSiemForm({ ...siemForm, apiKey: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </>
                  )}

                  {selectedSiemType === 'sentinel' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Workspace ID</label>
                        <input
                          type="text"
                          value={siemForm.workspaceId}
                          onChange={(e) => setSiemForm({ ...siemForm, workspaceId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Shared Key</label>
                        <input
                          type="password"
                          value={siemForm.sharedKey}
                          onChange={(e) => setSiemForm({ ...siemForm, sharedKey: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </>
                  )}

                  {selectedSiemType === 'syslog' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                          <input
                            type="text"
                            value={siemForm.host}
                            onChange={(e) => setSiemForm({ ...siemForm, host: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="syslog.example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                          <input
                            type="text"
                            value={siemForm.port}
                            onChange={(e) => setSiemForm({ ...siemForm, port: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="514"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Protocol</label>
                        <select
                          value={siemForm.protocol}
                          onChange={(e) => setSiemForm({ ...siemForm, protocol: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="tcp">TCP</option>
                          <option value="udp">UDP</option>
                          <option value="tls">TLS</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Log Types</label>
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
                          <span className="text-sm capitalize">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-between">
              {selectedSiemType && (
                <button
                  onClick={() => setSelectedSiemType(null)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Back
                </button>
              )}
              <div className="flex gap-3 ml-auto">
                <button
                  onClick={() => {
                    setShowSiemModal(false);
                    setSelectedSiemType(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                {selectedSiemType && (
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    Add Integration
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Add Webhook</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={webhookForm.name}
                  onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., Slack Notifications"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
                <input
                  type="url"
                  value={webhookForm.url}
                  onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://api.example.com/webhook"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secret (optional)
                </label>
                <input
                  type="password"
                  value={webhookForm.secret}
                  onChange={(e) => setWebhookForm({ ...webhookForm, secret: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Used for HMAC signature verification"
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll sign payloads with this secret so you can verify they came from SafeDNS
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Events</label>
                <div className="grid grid-cols-2 gap-2">
                  {webhookEvents.map((event) => (
                    <label key={event.value} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
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
                      <span className="text-sm">{event.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowWebhookModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Add Webhook
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
