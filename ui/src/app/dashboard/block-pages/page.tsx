'use client';

import { useState } from 'react';

interface BlockPage {
  id: string;
  name: string;
  isDefault: boolean;
  logoUrl?: string;
  backgroundColor: string;
  primaryColor: string;
  title: string;
  message: string;
  showRequestAccess: boolean;
  createdAt: string;
}

const mockBlockPages: BlockPage[] = [
  {
    id: '1',
    name: 'Default Block Page',
    isDefault: true,
    backgroundColor: '#f3f4f6',
    primaryColor: '#4f46e5',
    title: 'Access Blocked',
    message: "This website has been blocked by your organization's security policy.",
    showRequestAccess: true,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Custom Branded',
    isDefault: false,
    logoUrl: 'https://example.com/logo.png',
    backgroundColor: '#1e3a5f',
    primaryColor: '#3b82f6',
    title: 'Site Restricted',
    message: 'Access to this site is restricted. Contact IT if you need access.',
    showRequestAccess: true,
    createdAt: '2024-02-01',
  },
];

export default function BlockPagesPage() {
  const [pages, setPages] = useState(mockBlockPages);
  const [showModal, setShowModal] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editingPage, setEditingPage] = useState<BlockPage | null>(null);

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
  });

  const openNewModal = () => {
    setEditingPage(null);
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
    });
    setShowModal(true);
  };

  const handleSave = () => {
    // Save logic
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Block Pages</h1>
          <p className="text-gray-600">Customize the pages shown when content is blocked</p>
        </div>
        <button
          onClick={openNewModal}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Create Block Page
        </button>
      </div>

      {/* Block Pages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pages.map((page) => (
          <div key={page.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Preview thumbnail */}
            <div 
              className="h-32 relative"
              style={{ backgroundColor: page.backgroundColor }}
            >
              <div 
                className="absolute inset-x-4 top-4 bottom-4 rounded-lg flex flex-col items-center justify-center"
                style={{ backgroundColor: 'white' }}
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
                  onClick={() => setPreviewId(page.id)}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  Preview
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => {
                    setEditingPage(page);
                    setShowModal(true);
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Edit
                </button>
                {!page.isDefault && (
                  <>
                    <span className="text-gray-300">|</span>
                    <button className="text-sm text-green-600 hover:text-green-800">
                      Set Default
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Access Requests Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Access Requests</h2>
        <p className="text-gray-600 mb-4">Review requests from users who need access to blocked sites</p>

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
            <tbody className="text-sm">
              <tr className="border-b">
                <td className="py-3 text-gray-900">social-media.com</td>
                <td className="py-3 text-gray-600">john@company.com</td>
                <td className="py-3 text-gray-600 max-w-xs truncate">Need access for marketing research</td>
                <td className="py-3">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                    Pending
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <button className="text-green-600 hover:text-green-800">Approve</button>
                    <button className="text-red-600 hover:text-red-800">Deny</button>
                  </div>
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 text-gray-900">streaming-site.com</td>
                <td className="py-3 text-gray-600">jane@company.com</td>
                <td className="py-3 text-gray-600 max-w-xs truncate">Training videos hosted here</td>
                <td className="py-3">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                    Approved
                  </span>
                </td>
                <td className="py-3">
                  <button className="text-gray-600 hover:text-gray-800">View</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingPage ? 'Edit Block Page' : 'Create Block Page'}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Page Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="support@company.com"
                />
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
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {editingPage ? 'Save Changes' : 'Create Page'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
