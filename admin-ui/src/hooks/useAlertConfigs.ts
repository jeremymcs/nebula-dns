/**
 * Nebula DNS - Alert Configuration Hooks
 * SWR hooks and mutation functions for alerting API
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import useSWR, { SWRConfiguration } from 'swr';
import { adminFetcher } from './useApi';
import type {
  AlertConfigResponse,
  CreateSlackConfigRequest,
  CreatePagerDutyConfigRequest,
  UpdateAlertConfigRequest,
  TestAlertResponse,
  MessageResponse,
} from '@/types/alerting';

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4010';

// Default SWR config with optimized caching
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  errorRetryCount: 2,
  errorRetryInterval: 5000,
  dedupingInterval: 10000,
  focusThrottleInterval: 30000,
  keepPreviousData: true,
};

// ============================================
// Alert Configuration Hook
// ============================================

/**
 * Fetch all alert configurations
 * @returns SWR response with alert configuration list
 */
export function useAlertConfigs() {
  return useSWR<AlertConfigResponse[]>(
    '/admin/alerting',
    adminFetcher,
    defaultConfig
  );
}

// ============================================
// Mutation Functions
// ============================================

/**
 * Create a new Slack webhook configuration
 * @param data - Slack configuration data including webhook URL
 * @returns Created alert configuration
 * @throws Error if not authenticated or creation fails
 */
export async function createSlackConfig(
  data: CreateSlackConfigRequest
): Promise<AlertConfigResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  if (!token) throw new Error('Admin authentication required');

  const res = await fetch(`${API_URL}/admin/alerting/slack`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Request failed (${res.status})`);
  }

  return res.json();
}

/**
 * Create a new PagerDuty configuration
 * @param data - PagerDuty configuration data including routing key
 * @returns Created alert configuration
 * @throws Error if not authenticated or creation fails
 */
export async function createPagerDutyConfig(
  data: CreatePagerDutyConfigRequest
): Promise<AlertConfigResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  if (!token) throw new Error('Admin authentication required');

  const res = await fetch(`${API_URL}/admin/alerting/pagerduty`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Request failed (${res.status})`);
  }

  return res.json();
}

/**
 * Update an existing alert configuration
 * @param id - Configuration UUID
 * @param data - Fields to update (name, isEnabled, severityFilter, eventTypes)
 * @returns Updated alert configuration
 * @throws Error if not authenticated or update fails
 */
export async function updateAlertConfig(
  id: string,
  data: UpdateAlertConfigRequest
): Promise<AlertConfigResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  if (!token) throw new Error('Admin authentication required');

  const res = await fetch(`${API_URL}/admin/alerting/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Request failed (${res.status})`);
  }

  return res.json();
}

/**
 * Enable an alert configuration
 * Resets error count when enabled
 * @param id - Configuration UUID
 * @returns Success message
 * @throws Error if not authenticated or enable fails
 */
export async function enableAlertConfig(id: string): Promise<MessageResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  if (!token) throw new Error('Admin authentication required');

  const res = await fetch(`${API_URL}/admin/alerting/${id}/enable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Request failed (${res.status})`);
  }

  return res.json();
}

/**
 * Disable an alert configuration
 * Stops sending alerts via this configuration
 * @param id - Configuration UUID
 * @returns Success message
 * @throws Error if not authenticated or disable fails
 */
export async function disableAlertConfig(id: string): Promise<MessageResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  if (!token) throw new Error('Admin authentication required');

  const res = await fetch(`${API_URL}/admin/alerting/${id}/disable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Request failed (${res.status})`);
  }

  return res.json();
}

/**
 * Test an alert configuration
 * Sends a test alert to verify the configuration works
 * For PagerDuty, creates and immediately resolves a test incident
 * @param id - Configuration UUID
 * @returns Test result with success status and response time
 * @throws Error if not authenticated or test fails
 */
export async function testAlertConfig(id: string): Promise<TestAlertResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  if (!token) throw new Error('Admin authentication required');

  const res = await fetch(`${API_URL}/admin/alerting/${id}/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Request failed (${res.status})`);
  }

  return res.json();
}

/**
 * Delete an alert configuration
 * Permanently removes the configuration
 * @param id - Configuration UUID
 * @throws Error if not authenticated or deletion fails
 */
export async function deleteAlertConfig(id: string): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  if (!token) throw new Error('Admin authentication required');

  const res = await fetch(`${API_URL}/admin/alerting/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Request failed (${res.status})`);
  }

  // 204 No Content - no JSON body to parse
}
