// Nebula DNS - Subscription Status Hook (US-027, US-028, US-029)
// Fetches MSP managed info and grace period status for display in UI
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/lib/api';

export interface MspManagedInfo {
  isMspManaged: boolean;
  mspName?: string;
  mspDisplayName?: string;
  mspContactEmail?: string;
  mspSupportUrl?: string;
}

export interface GracePeriodInfo {
  tenantId: string;
  tenantName: string;
  subscriptionStatus: 'active' | 'grace' | 'suspended';
  graceStartDate: string | null;
  daysRemaining: number | null;
  mspName?: string;
  mspContactEmail?: string;
  mspSupportUrl?: string;
}

export interface SubscriptionStatus {
  status: 'active' | 'grace' | 'suspended';
  canResolve: boolean;
}

interface UseSubscriptionStatusReturn {
  mspInfo: MspManagedInfo | null;
  gracePeriodInfo: GracePeriodInfo | null;
  subscriptionStatus: SubscriptionStatus | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSubscriptionStatus(): UseSubscriptionStatusReturn {
  const { isAuthenticated } = useAuth();
  const [mspInfo, setMspInfo] = useState<MspManagedInfo | null>(null);
  const [gracePeriodInfo, setGracePeriodInfo] = useState<GracePeriodInfo | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch all subscription-related data in parallel
      const [mspResponse, graceResponse, statusResponse] = await Promise.all([
        fetch(`${API_URL}/subscription/msp-info`, { headers }),
        fetch(`${API_URL}/subscription/grace-period`, { headers }),
        fetch(`${API_URL}/subscription/status`, { headers }),
      ]);

      // Parse responses
      if (mspResponse.ok) {
        const mspData = await mspResponse.json();
        setMspInfo(mspData);
      }

      if (graceResponse.ok) {
        const graceData = await graceResponse.json();
        setGracePeriodInfo(graceData);
      }

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setSubscriptionStatus(statusData);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch subscription status'));
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    mspInfo,
    gracePeriodInfo,
    subscriptionStatus,
    isLoading,
    error,
    refetch: fetchData,
  };
}

export default useSubscriptionStatus;
