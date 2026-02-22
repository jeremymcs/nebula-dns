// Nebula DNS - MSP Managed By Badge Component (US-027)
// Shows MSP info badge for clients managed by an MSP
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client';

import { useState, useEffect, useRef } from 'react';
import { ShieldCheckIcon, EnvelopeIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

export interface MspManagedInfo {
  isMspManaged: boolean;
  mspName?: string;
  mspDisplayName?: string;
  mspContactEmail?: string;
  mspSupportUrl?: string;
}

interface ManagedByBadgeProps {
  mspInfo: MspManagedInfo | null;
  className?: string;
}

export function ManagedByBadge({ mspInfo, className = '' }: ManagedByBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't render if not MSP managed
  if (!mspInfo?.isMspManaged) {
    return null;
  }

  const displayName = mspInfo.mspDisplayName || mspInfo.mspName || 'Your Provider';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                   bg-indigo-50 dark:bg-indigo-900/30
                   text-indigo-700 dark:text-indigo-300
                   text-sm font-medium
                   hover:bg-indigo-100 dark:hover:bg-indigo-900/50
                   transition-colors duration-150
                   focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <ShieldCheckIcon className="h-4 w-4" />
        <span>Managed by {displayName}</span>
      </button>

      {/* Dropdown popover */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-72
                     bg-white dark:bg-gray-800
                     rounded-lg shadow-lg
                     border border-gray-200 dark:border-gray-700
                     z-50"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span className="font-semibold text-gray-900 dark:text-white">
                Managed Service
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Your DNS security is managed by an external provider.
            </p>
          </div>

          {/* Provider info */}
          <div className="px-4 py-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Service Provider
              </label>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {displayName}
              </p>
            </div>

            {/* Contact email */}
            {mspInfo.mspContactEmail && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Contact
                </label>
                <a
                  href={`mailto:${mspInfo.mspContactEmail}`}
                  className="mt-1 inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <EnvelopeIcon className="h-4 w-4" />
                  {mspInfo.mspContactEmail}
                </a>
              </div>
            )}

            {/* Support URL */}
            {mspInfo.mspSupportUrl && (
              <a
                href={mspInfo.mspSupportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-2
                           bg-indigo-600 hover:bg-indigo-700
                           text-white text-sm font-medium
                           rounded-md transition-colors duration-150"
              >
                <span>Contact Support</span>
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              </a>
            )}
          </div>

          {/* Footer note */}
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Contact your provider for policy changes or billing questions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagedByBadge;
