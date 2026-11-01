// Nebula DNS - Family Settings Page
// Manage family members and invitations for Home tier accounts
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client';

import { useState } from 'react';
import { useFamilyOverview } from '@/hooks/useFamily';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { FamilyMembersList } from '@/components/family/FamilyMembersList';
import { PendingInvitations } from '@/components/family/PendingInvitations';
import { InviteFamilyModal } from '@/components/family/InviteFamilyModal';
import { UserPlusIcon, UsersIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

export default function FamilySettingsPage() {
  const { data, isLoading, mutate } = useFamilyOverview();
  const { showToast } = useToast();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');

  const overview = data?.data;
  const members = overview?.members || [];
  const pendingInvitations = overview?.pendingInvitations || [];
  const totalMembers = overview?.totalMembers || 0;
  const maxMembers = overview?.maxMembers || 5;
  const remainingSlots = overview?.remainingSlots || 0;

  const handleInvite = async (email: string, displayName?: string) => {
    try {
      await api.createFamilyInvitation({ email, displayName });
      showToast('success', 'Invitation sent successfully');
      mutate();
      setShowInviteModal(false);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to send invitation');
      throw err;
    }
  };

  const handleCancelInvitation = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;

    try {
      await api.cancelFamilyInvitation(id);
      showToast('success', 'Invitation cancelled');
      mutate();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to cancel invitation');
    }
  };

  const handleResendInvitation = async (id: string) => {
    try {
      await api.resendFamilyInvitation(id);
      showToast('success', 'Invitation resent');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to resend invitation');
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (!confirm('Are you sure you want to remove this family member? They will lose access to your family account.')) return;

    try {
      await api.removeFamilyMember(id);
      showToast('success', 'Family member removed');
      mutate();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to remove family member');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-space-200 dark:bg-space-700 rounded mb-2"></div>
          <div className="h-4 w-96 bg-space-200 dark:bg-space-700 rounded"></div>
        </div>
        <div className="animate-pulse bg-white dark:bg-space-800 rounded-xl p-6">
          <div className="h-32 bg-space-200 dark:bg-space-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Family Members</h1>
          <p className="text-space-600 dark:text-space-400">
            Manage who has access to your family&apos;s Flux Shield protection
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          disabled={remainingSlots === 0}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <UserPlusIcon className="w-5 h-5" />
          Invite Family Member
        </button>
      </div>

      {/* Capacity Overview */}
      <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
              <UsersIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="font-semibold text-space-900 dark:text-white">Family Capacity</h3>
              <p className="text-sm text-space-600 dark:text-space-400">
                {totalMembers} of {maxMembers} family members
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-space-900 dark:text-white">
              {remainingSlots}
            </div>
            <div className="text-sm text-space-500 dark:text-space-400">slots available</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-2 bg-space-100 dark:bg-space-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                remainingSlots === 0
                  ? 'bg-danger-500'
                  : remainingSlots <= 1
                  ? 'bg-warning-500'
                  : 'bg-primary-500'
              }`}
              style={{ width: `${(totalMembers / maxMembers) * 100}%` }}
            />
          </div>
        </div>

        {remainingSlots === 0 && (
          <div className="mt-4 p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
            <p className="text-sm text-warning-800 dark:text-warning-200">
              Family member limit reached ({totalMembers}/{maxMembers}). Remove a member to invite someone new.
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-space-200 dark:border-space-700">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-space-500 hover:text-space-700 dark:text-space-400 dark:hover:text-space-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <UsersIcon className="w-4 h-4" />
              Family Members ({members.length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'invitations'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-space-500 hover:text-space-700 dark:text-space-400 dark:hover:text-space-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <EnvelopeIcon className="w-4 h-4" />
              Pending Invitations ({pendingInvitations.length})
            </span>
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'members' ? (
        <FamilyMembersList
          members={members}
          onRemove={handleRemoveMember}
        />
      ) : (
        <PendingInvitations
          invitations={pendingInvitations}
          onCancel={handleCancelInvitation}
          onResend={handleResendInvitation}
        />
      )}

      {/* Member Role Info */}
      <div className="bg-space-50 dark:bg-space-800/50 rounded-xl border border-space-200 dark:border-space-700 p-6">
        <h3 className="font-semibold text-space-900 dark:text-white mb-3">What can family members do?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-success-600 dark:text-success-400 mb-2">Can do:</h4>
            <ul className="text-sm text-space-600 dark:text-space-400 space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-success-500 rounded-full"></span>
                View the family dashboard
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-success-500 rounded-full"></span>
                View current policies and locations
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-success-500 rounded-full"></span>
                View reports and activity
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-success-500 rounded-full"></span>
                Edit safe search settings
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-danger-600 dark:text-danger-400 mb-2">Cannot do:</h4>
            <ul className="text-sm text-space-600 dark:text-space-400 space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-danger-500 rounded-full"></span>
                Create or delete locations
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-danger-500 rounded-full"></span>
                Change billing settings
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-danger-500 rounded-full"></span>
                Invite other family members
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-danger-500 rounded-full"></span>
                Manage API keys
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      <InviteFamilyModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
        remainingSlots={remainingSlots}
      />
    </div>
  );
}
