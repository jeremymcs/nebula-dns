'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_URL } from '@/lib/api';

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<{
    tenantName: string;
    email: string;
    role: string;
    invitedByName: string;
    message?: string;
    isExpired: boolean;
  } | null>(null);

  const [form, setForm] = useState({
    name: '',
    password: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchInviteInfo = async () => {
      if (!token) {
        setError('Invalid invitation link');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/invitations/info?token=${token}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Invalid invitation');
        }
        const data = await res.json();
        setInviteInfo(data.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load invitation details');
      } finally {
        setLoading(false);
      }
    };

    fetchInviteInfo();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/invitations/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: form.name,
          password: form.password,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to accept invitation');
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const roleLabels: Record<string, string> = {
    owner: 'Owner',
    admin: 'Administrator',
    analyst: 'Analyst',
    readonly: 'Read Only',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas dark:bg-space-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-canvas dark:bg-space-950 flex items-center justify-center p-4">
        <div className="fs-card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-success-100 dark:bg-success-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white mb-2">Welcome to {inviteInfo?.tenantName}!</h1>
          <p className="text-space-600 dark:text-space-400 mb-6">
            Your account has been created successfully. You can now log in to access the dashboard.
          </p>
          <Link
            href="/login"
            className="block w-full fs-btn fs-btn-primary fs-btn-lg text-center"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (error && !inviteInfo) {
    return (
      <div className="min-h-screen bg-canvas dark:bg-space-950 flex items-center justify-center p-4">
        <div className="fs-card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-danger-100 dark:bg-danger-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-danger-600 dark:text-danger-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white mb-2">Invalid Invitation</h1>
          <p className="text-space-600 dark:text-space-400 mb-6">{error}</p>
          <Link
            href="/"
            className="text-primary-600 dark:text-primary-400 hover:text-primary-800 font-medium"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (inviteInfo?.isExpired) {
    return (
      <div className="min-h-screen bg-canvas dark:bg-space-950 flex items-center justify-center p-4">
        <div className="fs-card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-warning-100 dark:bg-warning-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-warning-600 dark:text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white mb-2">Invitation Expired</h1>
          <p className="text-space-600 dark:text-space-400 mb-6">
            This invitation has expired. Please contact your administrator to request a new invitation.
          </p>
          <Link
            href="/"
            className="text-primary-600 dark:text-primary-400 hover:text-primary-800 font-medium"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas dark:bg-space-950 flex items-center justify-center p-4">
      <div className="fs-card p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Join {inviteInfo?.tenantName}</h1>
          <p className="text-space-600 dark:text-space-400 mt-2">
            {inviteInfo?.invitedByName} has invited you to join as a{' '}
            <span className="font-medium dark:text-space-300">{roleLabels[inviteInfo?.role || '']}</span>
          </p>
        </div>

        {inviteInfo?.message && (
          <div className="bg-space-50 dark:bg-space-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-space-600 dark:text-space-300 italic">"{inviteInfo.message}"</p>
            <p className="text-sm text-space-500 dark:text-space-400 mt-2">— {inviteInfo.invitedByName}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">Email</label>
            <input
              type="email"
              value={inviteInfo?.email || ''}
              disabled
            className="w-full fs-input bg-space-50 dark:bg-space-800 text-mut"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">Your Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="fs-input"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="fs-input"
              placeholder="Create a password"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">Confirm Password</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="fs-input"
              placeholder="Confirm your password"
              required
            />
          </div>

          {error && (
            <div className="bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="fs-btn fs-btn-primary w-full fs-btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating Account...' : 'Accept Invitation'}
          </button>
        </form>

        <p className="text-center text-sm text-space-500 dark:text-space-400 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 dark:text-primary-400 hover:text-primary-800 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-canvas dark:bg-space-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
