/**
 * SafeDNS - Enterprise DNS Security Platform
 * Request Signing for Inter-Service Communication
 * 
 * Uses HMAC-SHA256 signatures to authenticate internal service requests
 */

import * as crypto from 'crypto';

const SIGNATURE_HEADER = 'x-safedns-signature';
const TIMESTAMP_HEADER = 'x-safedns-timestamp';
const SERVICE_HEADER = 'x-safedns-service';
const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000; // 5 minutes

export interface SignedRequest {
  method: string;
  path: string;
  body?: string;
  timestamp: number;
  service: string;
}

/**
 * Generate HMAC signature for a request
 */
export function signRequest(
  request: SignedRequest,
  secretKey: string,
): string {
  const payload = [
    request.method.toUpperCase(),
    request.path,
    request.timestamp.toString(),
    request.service,
    request.body || '',
  ].join('\n');

  return crypto
    .createHmac('sha256', secretKey)
    .update(payload)
    .digest('hex');
}

/**
 * Verify HMAC signature for a request
 */
export function verifySignature(
  request: SignedRequest,
  signature: string,
  secretKey: string,
): boolean {
  // Check timestamp to prevent replay attacks
  const now = Date.now();
  if (Math.abs(now - request.timestamp) > MAX_TIMESTAMP_DRIFT_MS) {
    return false;
  }

  const expectedSignature = signRequest(request, secretKey);
  
  // Constant-time comparison
  if (signature.length !== expectedSignature.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Create signed headers for outgoing internal requests
 */
export function createSignedHeaders(
  method: string,
  path: string,
  body: string | undefined,
  serviceName: string,
  secretKey: string,
): Record<string, string> {
  const timestamp = Date.now();
  
  const signature = signRequest(
    { method, path, body, timestamp, service: serviceName },
    secretKey,
  );

  return {
    [SIGNATURE_HEADER]: signature,
    [TIMESTAMP_HEADER]: timestamp.toString(),
    [SERVICE_HEADER]: serviceName,
  };
}

/**
 * Validate incoming signed request
 */
export function validateSignedRequest(
  method: string,
  path: string,
  body: string | undefined,
  headers: Record<string, string | undefined>,
  secretKey: string,
): { valid: boolean; service?: string; error?: string } {
  const signature = headers[SIGNATURE_HEADER];
  const timestamp = headers[TIMESTAMP_HEADER];
  const service = headers[SERVICE_HEADER];

  if (!signature || !timestamp || !service) {
    return { valid: false, error: 'Missing required signing headers' };
  }

  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum)) {
    return { valid: false, error: 'Invalid timestamp' };
  }

  const isValid = verifySignature(
    { method, path, body, timestamp: timestampNum, service },
    signature,
    secretKey,
  );

  if (!isValid) {
    return { valid: false, error: 'Invalid signature or expired request' };
  }

  return { valid: true, service };
}

// Service names for internal communication
export const INTERNAL_SERVICES = {
  API: 'safedns-api',
  POLICY_SVC: 'safedns-policy-svc',
  DNSDIST: 'safedns-dnsdist',
  WORKERS: 'safedns-workers',
} as const;

