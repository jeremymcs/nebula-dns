// Nebula DNS - Suspended Service Banner Component (US-028, US-029)
// Full-width banner shown when service is suspended
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client';

import { XCircleIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';

export interface SuspendedInfo {
  mspName?: string;
  mspContactEmail?: string;
  mspSupportUrl?: string;
}

interface SuspendedBannerProps {
  suspendedInfo?: SuspendedInfo;
  isFullPage?: boolean;
}

export function SuspendedBanner({
  suspendedInfo,
  isFullPage = false,
}: SuspendedBannerProps) {
  if (isFullPage) {
    return <SuspendedFullPage suspendedInfo={suspendedInfo} />;
  }

  return (
    <div
      className="w-full px-4 py-4 bg-red-600 dark:bg-red-700"
      role="alert"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Warning content */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <XCircleIcon className="h-6 w-6 flex-shrink-0 text-white" />

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
            <span className="font-bold text-white text-lg">
              Service Suspended
            </span>

            <span className="text-white/90 text-sm">
              DNS protection is currently disabled.
              {suspendedInfo?.mspName
                ? ` Contact ${suspendedInfo.mspName} to restore service.`
                : ' Contact your service provider to restore service.'}
            </span>
          </div>
        </div>

        {/* Contact button */}
        {suspendedInfo?.mspContactEmail && (
          <a
            href={`mailto:${suspendedInfo.mspContactEmail}`}
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2
                       bg-white text-red-600
                       text-sm font-semibold rounded-md
                       hover:bg-red-50 transition-colors duration-150"
          >
            <EnvelopeIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Contact Provider</span>
            <span className="sm:hidden">Contact</span>
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Full page suspended state - for blocking access to dashboard
 */
function SuspendedFullPage({ suspendedInfo }: { suspendedInfo?: SuspendedInfo }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full">
        {/* Error icon */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
            <XCircleIcon className="h-16 w-16 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
          Service Suspended
        </h1>

        {/* Description */}
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Your DNS security service has been suspended due to a billing issue with your service provider.
        </p>

        {/* Info card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
            What this means:
          </h2>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">-</span>
              <span>DNS queries are not being filtered</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">-</span>
              <span>Security policies are not active</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">-</span>
              <span>Your network may be at risk</span>
            </li>
          </ul>
        </div>

        {/* Provider info */}
        {suspendedInfo?.mspName && (
          <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-6 mb-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Your Service Provider
            </h3>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {suspendedInfo.mspName}
            </p>
          </div>
        )}

        {/* Contact options */}
        <div className="space-y-3">
          {suspendedInfo?.mspContactEmail && (
            <a
              href={`mailto:${suspendedInfo.mspContactEmail}`}
              className="flex items-center justify-center gap-2 w-full px-4 py-3
                         bg-red-600 hover:bg-red-700
                         text-white font-semibold rounded-lg
                         transition-colors duration-150"
            >
              <EnvelopeIcon className="h-5 w-5" />
              Contact {suspendedInfo.mspName || 'Provider'}
            </a>
          )}

          {suspendedInfo?.mspSupportUrl && (
            <a
              href={suspendedInfo.mspSupportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-3
                         bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
                         text-gray-900 dark:text-white font-semibold rounded-lg
                         transition-colors duration-150"
            >
              <PhoneIcon className="h-5 w-5" />
              Visit Support Portal
            </a>
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-8">
          Service will be restored automatically once the billing issue is resolved.
        </p>
      </div>
    </div>
  );
}

export default SuspendedBanner;
