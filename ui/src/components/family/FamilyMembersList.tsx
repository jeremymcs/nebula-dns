// Nebula DNS - Family Members List Component
// Displays list of family members with management actions
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client';

import { TrashIcon, ShieldCheckIcon, UserIcon } from '@heroicons/react/24/outline';

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

interface FamilyMembersListProps {
  members: FamilyMember[];
  onRemove: (id: string) => void;
}

const roleConfig: Record<string, { label: string; color: string; description: string }> = {
  owner: {
    label: 'Owner',
    color: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200',
    description: 'Full access to all settings',
  },
  member: {
    label: 'Member',
    color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
    description: 'View access with safe search control',
  },
};

export function FamilyMembersList({ members, onRemove }: FamilyMembersListProps) {
  if (members.length === 0) {
    return (
      <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-space-100 dark:bg-space-700 flex items-center justify-center mb-4">
          <UserIcon className="w-6 h-6 text-space-400" />
        </div>
        <h3 className="text-lg font-medium text-space-900 dark:text-white mb-2">
          No Family Members Yet
        </h3>
        <p className="text-space-600 dark:text-space-400 max-w-md mx-auto">
          Invite family members to give them access to view your DNS protection dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-space-800 rounded-xl shadow-sm border border-space-200 dark:border-space-700">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-space-500 dark:text-space-400 border-b dark:border-space-700">
              <th className="px-6 py-4 font-medium">Member</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Last Active</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const config = roleConfig[member.role] || roleConfig.member;
              const isOwner = member.role === 'owner';

              return (
                <tr
                  key={member.id}
                  className="border-b dark:border-space-700 last:border-b-0 hover:bg-space-50 dark:hover:bg-space-700/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-medium">
                        {member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-space-900 dark:text-white flex items-center gap-2">
                          {member.name || 'Unnamed'}
                          {isOwner && (
                            <ShieldCheckIcon className="w-4 h-4 text-purple-500" title="Family Owner" />
                          )}
                        </div>
                        <div className="text-sm text-space-500 dark:text-space-400">
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
                      {config.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {member.status === 'active' ? (
                      <span className="inline-flex items-center px-2.5 py-1 bg-success-100 dark:bg-success-900/50 text-success-800 dark:text-success-200 rounded-full text-xs font-medium">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-400 rounded-full text-xs font-medium">
                        {member.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-space-600 dark:text-space-400">
                    {member.lastLoginAt
                      ? new Date(member.lastLoginAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4">
                    {!isOwner ? (
                      <button
                        onClick={() => onRemove(member.id)}
                        className="flex items-center gap-1 text-sm text-danger-600 dark:text-danger-400 hover:text-danger-800 dark:hover:text-danger-300 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Remove
                      </button>
                    ) : (
                      <span className="text-sm text-space-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
