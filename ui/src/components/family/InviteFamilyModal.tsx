// Nebula DNS - Invite Family Modal Component
// Modal for inviting new family members
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { EnvelopeIcon, UserIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface InviteFamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, displayName?: string) => Promise<void>;
  remainingSlots: number;
}

export function InviteFamilyModal({
  isOpen,
  onClose,
  onInvite,
  remainingSlots,
}: InviteFamilyModalProps) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email address is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    if (remainingSlots === 0) {
      setError('Family member limit reached. Remove a member to invite someone new.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onInvite(email.trim(), displayName.trim() || undefined);
      // Reset form on success
      setEmail('');
      setDisplayName('');
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setEmail('');
      setDisplayName('');
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite Family Member"
      description="Send an invitation to add a new member to your family account"
      size="md"
    >
      <form onSubmit={handleSubmit}>
        {remainingSlots === 0 && (
          <div className="mb-4 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-danger-800 dark:text-danger-200">
              <strong>Family member limit reached.</strong> You need to remove an existing member before you can invite someone new.
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1"
            >
              Email Address <span className="text-danger-500">*</span>
            </label>
            <div className="relative">
              <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-space-400" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                className="w-full pl-10 pr-4 py-2.5 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 text-space-900 dark:text-white placeholder:text-space-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="family.member@example.com"
                disabled={isSubmitting || remainingSlots === 0}
              />
            </div>
          </div>

          {/* Display Name Field (Optional) */}
          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1"
            >
              Display Name <span className="text-space-400">(optional)</span>
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-space-400" />
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 text-space-900 dark:text-white placeholder:text-space-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="e.g., John, Mom, Dad"
                disabled={isSubmitting || remainingSlots === 0}
              />
            </div>
            <p className="mt-1 text-xs text-space-500 dark:text-space-400">
              A friendly name to help identify this family member
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg text-sm text-danger-800 dark:text-danger-200">
              {error}
            </div>
          )}

          {/* Info Box */}
          <div className="p-3 bg-space-50 dark:bg-space-700/50 rounded-lg text-sm text-space-600 dark:text-space-400">
            <p>
              An email will be sent with a link to accept the invitation. The link expires in 7 days.
            </p>
            <p className="mt-2">
              <strong>Remaining slots:</strong> {remainingSlots} of 5
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-space-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-space-700 dark:text-space-300 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || remainingSlots === 0}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <EnvelopeIcon className="w-4 h-4" />
                Send Invitation
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
