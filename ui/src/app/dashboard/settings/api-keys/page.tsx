'use client';

import { useState } from 'react';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

const mockApiKeys: ApiKey[] = [
  {
    id: '1',
    name: 'Production API Key',
    keyPrefix: 'sk_live_abc1',
    scopes: ['read', 'write'],
    rateLimit: 1000,
    isActive: true,
    lastUsedAt: '2024-03-15T10:30:00Z',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: '2',
    name: 'Reporting Integration',
    keyPrefix: 'sk_live_def2',
    scopes: ['read'],
    rateLimit: 500,
    isActive: true,
    lastUsedAt: '2024-03-14T15:45:00Z',
    expiresAt: '2024-06-01T00:00:00Z',
    createdAt: '2024-02-01T12:00:00Z',
  },
  {
    id: '3',
    name: 'Old Development Key',
    keyPrefix: 'sk_live_ghi3',
    scopes: ['read', 'write', 'admin'],
    rateLimit: 100,
    isActive: false,
    createdAt: '2023-12-01T09:00:00Z',
  },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState(mockApiKeys);
  const [showModal, setShowModal] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    scopes: ['read'] as string[],
    rateLimit: 1000,
    expiresIn: '',
  });

  const handleCreate = () => {
    // Simulate creating a key
    setNewKeyValue('sk_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
  };

  const handleCopyKey = () => {
    if (newKeyValue) {
      navigator.clipboard.writeText(newKeyValue);
    }
  };

  const toggleScope = (scope: string) => {
    if (form.scopes.includes(scope)) {
      setForm({ ...form, scopes: form.scopes.filter(s => s !== scope) });
    } else {
      setForm({ ...form, scopes: [...form.scopes, scope] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-600">Manage API keys for programmatic access to SafeDNS</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Create API Key
        </button>
      </div>

      {/* API Keys Documentation */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-900">Using API Keys</h3>
            <p className="text-sm text-blue-700 mt-1">
              Include your API key in the <code className="bg-blue-100 px-1 rounded">Authorization</code> header: 
              <code className="bg-blue-100 px-1 rounded ml-1">Bearer sk_live_xxx</code>
            </p>
            <a href="/docs/api" className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block">
              View API Documentation →
            </a>
          </div>
        </div>
      </div>

      {/* API Keys Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Key</th>
                <th className="px-6 py-4 font-medium">Scopes</th>
                <th className="px-6 py-4 font-medium">Rate Limit</th>
                <th className="px-6 py-4 font-medium">Last Used</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id} className="border-b last:border-b-0">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{key.name}</div>
                    <div className="text-xs text-gray-500">
                      Created {new Date(key.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {key.keyPrefix}...
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1 flex-wrap">
                      {key.scopes.map((scope) => (
                        <span 
                          key={scope}
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            scope === 'admin' 
                              ? 'bg-red-100 text-red-800' 
                              : scope === 'write'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {key.rateLimit}/min
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {key.lastUsedAt 
                      ? new Date(key.lastUsedAt).toLocaleString()
                      : 'Never'
                    }
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      key.isActive 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {key.isActive ? 'Active' : 'Revoked'}
                    </span>
                    {key.expiresAt && (
                      <div className="text-xs text-gray-500 mt-1">
                        Expires {new Date(key.expiresAt).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="text-sm text-indigo-600 hover:text-indigo-800">
                        Usage
                      </button>
                      {key.isActive ? (
                        <button className="text-sm text-red-600 hover:text-red-800">
                          Revoke
                        </button>
                      ) : (
                        <button className="text-sm text-gray-600 hover:text-gray-800">
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create API Key Modal */}
      {showModal && !newKeyValue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Create API Key</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., Production Integration"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Scopes</label>
                <div className="space-y-2">
                  {['read', 'write', 'admin'].map((scope) => (
                    <label key={scope} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.scopes.includes(scope)}
                        onChange={() => toggleScope(scope)}
                        className="mt-1 rounded"
                      />
                      <div>
                        <div className="font-medium text-gray-900 capitalize">{scope}</div>
                        <div className="text-sm text-gray-500">
                          {scope === 'read' && 'Read-only access to all resources'}
                          {scope === 'write' && 'Create and modify resources'}
                          {scope === 'admin' && 'Full administrative access'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate Limit (requests/minute)</label>
                <input
                  type="number"
                  value={form.rateLimit}
                  onChange={(e) => setForm({ ...form, rateLimit: parseInt(e.target.value) || 1000 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  min={10}
                  max={10000}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiration (optional)</label>
                <select
                  value={form.expiresIn}
                  onChange={(e) => setForm({ ...form, expiresIn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Never expires</option>
                  <option value="30d">30 days</option>
                  <option value="90d">90 days</option>
                  <option value="180d">180 days</option>
                  <option value="1y">1 year</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Create Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show New Key Modal */}
      {newKeyValue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-green-700">API Key Created!</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-yellow-800">
                    Make sure to copy your API key now. You won't be able to see it again!
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your API Key</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKeyValue}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                  />
                  <button
                    onClick={handleCopyKey}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end">
              <button
                onClick={() => {
                  setShowModal(false);
                  setNewKeyValue(null);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
