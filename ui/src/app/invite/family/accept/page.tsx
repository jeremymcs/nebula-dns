// Nebula DNS - Accept Family Invitation Page
// Public page for accepting family member invitations
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

interface InvitationInfo {
  tenantName: string;
  email: string;
  displayName: string | null;
  invitedByName: string;
  expiresAt: string;
  isExpired: boolean;
}

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    const fetchInvitationInfo = async () => {
      try {
        const response = await api.getFamilyInvitationInfo(token);
        setInvitationInfo(response.data);

        // Pre-fill display name if available
        if (response.data.displayName) {
          setName(response.data.displayName);
        }
      } catch (err: any) {
        setError(err.message || 'Unable to find this invitation');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitationInfo();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!name.trim()) {
      setFormError('Please enter your name');
      return;
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      await api.acceptFamilyInvitation({
        token: token!,
        name: name.trim(),
        password,
      });
      setSuccess(true);
    } catch (err: any) {
      setFormError(err.message || 'Failed to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-space-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-space-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-space-600 dark:text-space-400">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !invitationInfo) {
    return (
      <div className="min-h-screen bg-space-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-space-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-danger-100 dark:bg-danger-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-danger-600 dark:text-danger-400" />
          </div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white mb-2">
            Invalid Invitation
          </h1>
          <p className="text-space-600 dark:text-space-400 mb-6">
            {error || 'This invitation link is invalid or has expired.'}
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (invitationInfo.isExpired) {
    return (
      <div className="min-h-screen bg-space-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-space-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-warning-100 dark:bg-warning-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-warning-600 dark:text-warning-400" />
          </div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white mb-2">
            Invitation Expired
          </h1>
          <p className="text-space-600 dark:text-space-400 mb-6">
            This invitation has expired. Please ask {invitationInfo.invitedByName} to send you a new invitation.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-space-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-space-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-8 h-8 text-success-600 dark:text-success-400" />
          </div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white mb-2">
            Welcome to the Family!
          </h1>
          <p className="text-space-600 dark:text-space-400 mb-6">
            You have successfully joined <strong>{invitationInfo.tenantName}</strong>.
            You can now log in to view the family dashboard.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Log In Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-space-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-space-800 rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheckIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white mb-2">
            Join Your Family
          </h1>
          <p className="text-space-600 dark:text-space-400">
            <strong>{invitationInfo.invitedByName}</strong> has invited you to join the{' '}
            <strong>{invitationInfo.tenantName}</strong> family on Flux Shield.
          </p>
        </div>

        {/* Invitation Details */}
        <div className="bg-space-50 dark:bg-space-700/50 rounded-lg p-4 mb-6">
          <div className="text-sm text-space-600 dark:text-space-400">
            <p>
              <span className="font-medium">Email:</span> {invitationInfo.email}
            </p>
            {invitationInfo.displayName && (
              <p className="mt-1">
                <span className="font-medium">Display Name:</span> {invitationInfo.displayName}
              </p>
            )}
          </div>
        </div>

        {/* Accept Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1"
            >
              Your Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 text-space-900 dark:text-white placeholder:text-space-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="Enter your name"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1"
            >
              Create Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-10 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 text-space-900 dark:text-white placeholder:text-space-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-space-400 hover:text-space-600"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1"
            >
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 text-space-900 dark:text-white placeholder:text-space-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="Confirm your password"
              required
              minLength={8}
            />
          </div>

          {formError && (
            <div className="p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg text-sm text-danger-800 dark:text-danger-200">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
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
                Creating Account...
              </>
            ) : (
              'Accept Invitation'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-space-500 dark:text-space-400">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 dark:text-primary-400 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AcceptFamilyInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-space-950 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-space-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-space-600 dark:text-space-400">Loading...</p>
          </div>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
