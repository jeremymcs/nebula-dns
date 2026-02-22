// Nebula DNS - Grace Period Banner Component (US-028)
// Warning banner shown during MSP subscription grace period
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client';

import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export interface GracePeriodInfo {
  daysRemaining: number;
  mspName?: string;
  mspContactEmail?: string;
}

interface GracePeriodBannerProps {
  gracePeriodInfo: GracePeriodInfo;
  onDismiss?: () => void;
  showDismiss?: boolean;
}

export function GracePeriodBanner({
  gracePeriodInfo,
  onDismiss,
  showDismiss = true,
}: GracePeriodBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  const { daysRemaining, mspName, mspContactEmail } = gracePeriodInfo;

  // Determine urgency level based on days remaining
  const isUrgent = daysRemaining <= 7;
  const isCritical = daysRemaining <= 3;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={`
        w-full px-4 py-3
        ${isCritical
          ? 'bg-red-600 dark:bg-red-700'
          : isUrgent
            ? 'bg-amber-500 dark:bg-amber-600'
            : 'bg-yellow-400 dark:bg-yellow-500'
        }
      `}
      role="alert"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Warning content */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ExclamationTriangleIcon
            className={`h-6 w-6 flex-shrink-0 ${
              isCritical || isUrgent
                ? 'text-white'
                : 'text-yellow-800'
            }`}
          />

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
            <span
              className={`font-semibold ${
                isCritical || isUrgent
                  ? 'text-white'
                  : 'text-yellow-900'
              }`}
            >
              Service ending in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
            </span>

            <span
              className={`text-sm ${
                isCritical || isUrgent
                  ? 'text-white/90'
                  : 'text-yellow-800'
              }`}
            >
              {mspName
                ? `Contact ${mspName} to resolve this issue.`
                : 'Contact your service provider to resolve this issue.'}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {mspContactEmail && (
            <a
              href={`mailto:${mspContactEmail}`}
              className={`
                hidden sm:inline-flex items-center px-3 py-1.5
                text-sm font-medium rounded-md
                transition-colors duration-150
                ${isCritical || isUrgent
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
                }
              `}
            >
              Contact Provider
            </a>
          )}

          {showDismiss && (
            <button
              onClick={handleDismiss}
              className={`
                p-1.5 rounded-md
                transition-colors duration-150
                ${isCritical || isUrgent
                  ? 'text-white/80 hover:text-white hover:bg-white/10'
                  : 'text-yellow-800 hover:text-yellow-900 hover:bg-yellow-500/50'
                }
              `}
              aria-label="Dismiss warning"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile contact link */}
      {mspContactEmail && (
        <div className="sm:hidden max-w-7xl mx-auto mt-2 pl-9">
          <a
            href={`mailto:${mspContactEmail}`}
            className={`
              text-sm underline
              ${isCritical || isUrgent
                ? 'text-white/90 hover:text-white'
                : 'text-yellow-800 hover:text-yellow-900'
              }
            `}
          >
            Contact your provider
          </a>
        </div>
      )}
    </div>
  );
}

export default GracePeriodBanner;
