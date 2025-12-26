'use client';

import { useState } from 'react';
import { useUsers, useInvitations } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'pending';
  lastActive?: string;
  invitedAt?: string;
}

const roleDescriptions: Record<string, { label: string; description: string; color: string }> = {
  owner: {
    label: 'Owner',
    description: 'Full access including billing and team management',
    color: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200',
  },
  admin: {
    label: 'Admin',
    description: 'Manage policies, locations, and users',
    color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
  },
  analyst: {
    label: 'Analyst',
    description: 'View reports and analytics, manage lists',
    color: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
  },
  readonly: {
    label: 'Read Only',
    description: 'View-only access to dashboard',
    color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  },
};

export default function TeamPage() {
  const { data: usersData, isLoading: usersLoading, mutate: mutateUsers } = useUsers();
  const { data: invitationsData, isLoading: invitationsLoading, mutate: mutateInvitations } = useInvitations();
  const { showToast } = useToast();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'analyst',
    message: '',
  });
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkRole, setBulkRole] = useState('analyst');

  // Combine users and pending invitations into a single list
  const users = usersData?.data || [];
  const invitations = invitationsData?.data || [];

  const members: TeamMember[] = [
    ...users.map((u: any) => ({
      id: u.id,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
      email: u.email,
      role: u.role,
      status: 'active' as const,
      lastActive: u.lastLoginAt,
    })),
    ...invitations.filter((i: any) => i.status === 'pending').map((i: any) => ({
      id: i.id,
      name: '',
      email: i.email,
      role: i.role,
      status: 'pending' as const,
      invitedAt: i.createdAt,
    })),
  ];

  const handleInvite = async () => {
    if (!inviteForm.email.trim()) {
      showToast('error', 'Email is required');
      return;
    }

    setSaving(true);
    try {
      await api.sendInvitation({
        email: inviteForm.email,
        role: inviteForm.role,
      });
      showToast('success', 'Invitation sent successfully');
      mutateInvitations();
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'analyst', message: '' });
    } catch (err: any) {
      showToast('error', err.message || 'Failed to send invitation');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkInvite = async () => {
    const emails = bulkEmails.split('\n').map(e => e.trim()).filter(e => e);
    if (emails.length === 0) {
      showToast('error', 'Please enter at least one email address');
      return;
    }

    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const email of emails) {
      try {
        await api.sendInvitation({ email, role: bulkRole });
        successCount++;
      } catch {
        errorCount++;
      }
    }

    if (successCount > 0) {
      showToast('success', `${successCount} invitation(s) sent successfully`);
      mutateInvitations();
    }
    if (errorCount > 0) {
      showToast('error', `${errorCount} invitation(s) failed`);
    }

    setSaving(false);
    setShowBulkInvite(false);
    setBulkEmails('');
  };

  const handleResendInvitation = async (id: string) => {
    try {
      await api.resendInvitation(id);
      showToast('success', 'Invitation resent');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to resend invitation');
    }
  };

  const handleRevokeInvitation = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;

    try {
      await api.revokeInvitation(id);
      showToast('success', 'Invitation revoked');
      mutateInvitations();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to revoke invitation');
    }
  };

  const handleRemoveUser = async (id: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return;

    try {
      await api.deleteUser(id);
      showToast('success', 'User removed');
      mutateUsers();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to remove user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Members</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage who has access to your SafeDNS dashboard</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowBulkInvite(true)}
            className="px-4 py-2 text-indigo-600 dark:text-indigo-400 border border-indigo-600 dark:border-indigo-500 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
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
          <div key={role} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${info.color}`}>
              {info.label}
            </span>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{info.description}</p>
          </div>
        ))}
      </div>

      {/* Team Members List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                <th className="px-6 py-4 font-medium">Member</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Last Active</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b dark:border-gray-700 last:border-b-0">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-medium">
                        {member.name ? member.name.charAt(0) : member.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {member.name || 'Pending Invitation'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{member.email}</div>
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
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded-full text-xs">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 rounded-full text-xs">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
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
                          <button
                            onClick={() => handleResendInvitation(member.id)}
                            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                          >
                            Resend
                          </button>
                          <button
                            onClick={() => handleRevokeInvitation(member.id)}
                            className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                          >
                            Revoke
                          </button>
                        </>
                      ) : member.role !== 'owner' ? (
                        <>
                          <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                            Edit Role
                          </button>
                          <button
                            onClick={() => handleRemoveUser(member.id)}
                            className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                          >
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
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
            <div className="p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold dark:text-white">Invite Team Member</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                  placeholder="colleague@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
                <div className="space-y-2">
                  {Object.entries(roleDescriptions).filter(([role]) => role !== 'owner').map(([role, info]) => (
                    <label
                      key={role}
                      className={`flex items-start gap-3 p-3 border dark:border-gray-600 rounded-lg cursor-pointer transition ${
                        inviteForm.role === role ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
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
                        <div className="font-medium text-gray-900 dark:text-white">{info.label}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{info.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Personal Message (optional)
                </label>
                <textarea
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="Add a personal note to the invitation email..."
                />
              </div>
            </div>

            <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Invite Modal */}
      {showBulkInvite && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg">
            <div className="p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold dark:text-white">Bulk Invite</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Addresses
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Enter one email address per line
                </p>
                <textarea
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm bg-white dark:bg-gray-700 dark:text-white"
                  rows={8}
                  placeholder="user1@company.com
user2@company.com
user3@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Role</label>
                <select
                  value={bulkRole}
                  onChange={(e) => setBulkRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                >
                  <option value="analyst">Analyst</option>
                  <option value="readonly">Read Only</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-400">
                {bulkEmails.split('\n').filter(e => e.trim()).length} email addresses entered
              </div>
            </div>

            <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowBulkInvite(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkInvite}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Sending...' : 'Send Invitations'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
