'use client';

import { useState } from 'react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'pending';
  lastActive?: string;
  invitedAt?: string;
}

const mockTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'John Admin',
    email: 'john@company.com',
    role: 'owner',
    status: 'active',
    lastActive: '2024-03-15T10:30:00Z',
  },
  {
    id: '2',
    name: 'Sarah Security',
    email: 'sarah@company.com',
    role: 'admin',
    status: 'active',
    lastActive: '2024-03-14T15:45:00Z',
  },
  {
    id: '3',
    name: 'Mike Analyst',
    email: 'mike@company.com',
    role: 'analyst',
    status: 'active',
    lastActive: '2024-03-13T09:00:00Z',
  },
  {
    id: '4',
    name: '',
    email: 'pending@company.com',
    role: 'readonly',
    status: 'pending',
    invitedAt: '2024-03-10T12:00:00Z',
  },
];

const roleDescriptions: Record<string, { label: string; description: string; color: string }> = {
  owner: {
    label: 'Owner',
    description: 'Full access including billing and team management',
    color: 'bg-purple-100 text-purple-800',
  },
  admin: {
    label: 'Admin',
    description: 'Manage policies, locations, and users',
    color: 'bg-blue-100 text-blue-800',
  },
  analyst: {
    label: 'Analyst',
    description: 'View reports and analytics, manage lists',
    color: 'bg-green-100 text-green-800',
  },
  readonly: {
    label: 'Read Only',
    description: 'View-only access to dashboard',
    color: 'bg-gray-100 text-gray-800',
  },
};

export default function TeamPage() {
  const [members, setMembers] = useState(mockTeamMembers);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'analyst',
    message: '',
  });
  const [bulkEmails, setBulkEmails] = useState('');

  const handleInvite = () => {
    // Invite logic
    setShowInviteModal(false);
    setInviteForm({ email: '', role: 'analyst', message: '' });
  };

  const handleBulkInvite = () => {
    // Bulk invite logic
    setShowBulkInvite(false);
    setBulkEmails('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="text-gray-600">Manage who has access to your SafeDNS dashboard</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowBulkInvite(true)}
            className="px-4 py-2 text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50"
          >
            Bulk Invite
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Invite Member
          </button>
        </div>
      </div>

      {/* Role Permissions Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(roleDescriptions).map(([role, info]) => (
          <div key={role} className="bg-white rounded-xl border border-gray-200 p-4">
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${info.color}`}>
              {info.label}
            </span>
            <p className="text-sm text-gray-600 mt-2">{info.description}</p>
          </div>
        ))}
      </div>

      {/* Team Members List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                <th className="px-6 py-4 font-medium">Member</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Last Active</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b last:border-b-0">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-medium">
                        {member.name ? member.name.charAt(0) : member.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {member.name || 'Pending Invitation'}
                        </div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleDescriptions[member.role].color}`}>
                      {roleDescriptions[member.role].label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {member.status === 'active' ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {member.lastActive 
                      ? new Date(member.lastActive).toLocaleString()
                      : member.invitedAt
                      ? `Invited ${new Date(member.invitedAt).toLocaleDateString()}`
                      : '-'
                    }
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {member.status === 'pending' ? (
                        <>
                          <button className="text-sm text-indigo-600 hover:text-indigo-800">
                            Resend
                          </button>
                          <button className="text-sm text-red-600 hover:text-red-800">
                            Revoke
                          </button>
                        </>
                      ) : member.role !== 'owner' ? (
                        <>
                          <button className="text-sm text-indigo-600 hover:text-indigo-800">
                            Edit Role
                          </button>
                          <button className="text-sm text-red-600 hover:text-red-800">
                            Remove
                          </button>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Invite Team Member</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="colleague@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <div className="space-y-2">
                  {Object.entries(roleDescriptions).filter(([role]) => role !== 'owner').map(([role, info]) => (
                    <label 
                      key={role} 
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition ${
                        inviteForm.role === role ? 'border-indigo-500 bg-indigo-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role}
                        checked={inviteForm.role === role}
                        onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{info.label}</div>
                        <div className="text-sm text-gray-500">{info.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personal Message (optional)
                </label>
                <textarea
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Add a personal note to the invitation email..."
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Invite Modal */}
      {showBulkInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Bulk Invite</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Addresses
                </label>
                <p className="text-sm text-gray-500 mb-2">
                  Enter one email address per line
                </p>
                <textarea
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  rows={8}
                  placeholder="user1@company.com
user2@company.com
user3@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Role</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="analyst">Analyst</option>
                  <option value="readonly">Read Only</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                {bulkEmails.split('\n').filter(e => e.trim()).length} email addresses entered
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowBulkInvite(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkInvite}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Send Invitations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
