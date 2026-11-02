// Nebula DNS - Pending Invitations Component
// Displays list of pending family invitations with management actions
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client';

import { EnvelopeIcon, ArrowPathIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

interface Invitation {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface PendingInvitationsProps {
  invitations: Invitation[];
  onCancel: (id: string) => void;
  onResend: (id: string) => void;
}

export function PendingInvitations({
  invitations,
  onCancel,
  onResend,
}: PendingInvitationsProps) {
  const [resendingIds, setResendingIds] = useState<Set<string>>(new Set());

  const handleResend = async (id: string) => {
    setResendingIds((prev) => new Set(prev).add(id));
    try {
      await onResend(id);
    } finally {
      setResendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`;
    return 'Expiring soon';
  };

  if (invitations.length === 0) {
    return (
      <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-space-100 dark:bg-space-700 flex items-center justify-center mb-4">
          <EnvelopeIcon className="w-6 h-6 text-space-400" />
        </div>
        <h3 className="text-lg font-medium text-space-900 dark:text-white mb-2">
          No Pending Invitations
        </h3>
        <p className="text-space-600 dark:text-space-400 max-w-md mx-auto">
          All invitations have been accepted or expired. Click &ldquo;Invite Family Member&rdquo; to send a new invitation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {invitations.map((invitation) => {
        const isResending = resendingIds.has(invitation.id);
        const timeRemaining = getTimeRemaining(invitation.expiresAt);
        const isExpired = timeRemaining === 'Expired';

        return (
          <div
            key={invitation.id}
            className={`bg-white dark:bg-space-800 rounded-xl border p-4 transition-colors ${
              isExpired
                ? 'border-danger-200 dark:border-danger-800 bg-danger-50/50 dark:bg-danger-900/20'
                : 'border-space-200 dark:border-space-700 hover:border-space-300 dark:hover:border-space-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center text-white font-medium">
                  {invitation.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-space-900 dark:text-white">
                    {invitation.displayName || invitation.email}
                  </div>
                  {invitation.displayName && (
                    <div className="text-sm text-space-500 dark:text-space-400">
                      {invitation.email}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-space-500 dark:text-space-400">
                    <span className="flex items-center gap-1">
                      <ClockIcon className="w-3.5 h-3.5" />
                      {timeRemaining}
                    </span>
                    <span>
                      Sent {new Date(invitation.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    isExpired
                      ? 'bg-danger-100 dark:bg-danger-900/50 text-danger-800 dark:text-danger-200'
                      : 'bg-warning-100 dark:bg-warning-900/50 text-warning-800 dark:text-warning-200'
                  }`}
                >
                  {isExpired ? 'Expired' : 'Pending'}
                </span>

                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => handleResend(invitation.id)}
                    disabled={isResending}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <ArrowPathIcon className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
                    {isResending ? 'Sending...' : 'Resend'}
                  </button>
                  <button
                    onClick={() => onCancel(invitation.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/30 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <p className="text-sm text-space-500 dark:text-space-400 mt-4">
        Invitations expire after 7 days. You can resend them to generate a new link.
      </p>
    </div>
  );
}
