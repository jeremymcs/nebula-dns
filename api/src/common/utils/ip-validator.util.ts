// Nebula DNS - API Key IP Allowlisting
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

/**
 * IP Validation Utility for API Key IP Allowlisting
 *
 * Provides functions to validate client IP addresses against
 * allowlists of exact IPs and CIDR ranges. Supports both IPv4
 * and IPv6 addresses, including IPv6-mapped IPv4 addresses.
 */

/**
 * Normalizes an IP address by handling IPv6-mapped IPv4 addresses
 * Converts addresses like ::ffff:192.168.1.1 to 192.168.1.1
 *
 * @param ip - The IP address to normalize
 * @returns The normalized IP address
 */
export function normalizeIp(ip: string): string {
  if (!ip) {
    return '';
  }

  // Trim whitespace
  let normalized = ip.trim();

  // Handle IPv6-mapped IPv4 addresses (::ffff:x.x.x.x)
  const ipv6MappedPrefix = '::ffff:';
  if (normalized.toLowerCase().startsWith(ipv6MappedPrefix)) {
    normalized = normalized.substring(ipv6MappedPrefix.length);
  }

  // Handle full IPv6-mapped format (0:0:0:0:0:ffff:x.x.x.x)
  const fullMappedRegex = /^0{0,4}:0{0,4}:0{0,4}:0{0,4}:0{0,4}:ffff:(.+)$/i;
  const fullMappedMatch = normalized.match(fullMappedRegex);
  if (fullMappedMatch) {
    normalized = fullMappedMatch[1];
  }

  return normalized;
}

/**
 * Checks if an IP address is a valid IPv4 address
 *
 * @param ip - The IP address to validate
 * @returns True if the IP is a valid IPv4 address
 */
export function isValidIpv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return false;
  }

  return parts.every((part) => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString();
  });
}

/**
 * Checks if an IP address is a valid IPv6 address
 *
 * @param ip - The IP address to validate
 * @returns True if the IP is a valid IPv6 address
 */
export function isValidIpv6(ip: string): boolean {
  // Handle IPv6-mapped IPv4 - check the IPv4 part
  if (ip.includes('::ffff:') || ip.match(/^[0:]+ffff:/i)) {
    const ipv4Part = ip.split(':').pop();
    if (ipv4Part && ipv4Part.includes('.')) {
      return isValidIpv4(ipv4Part);
    }
  }

  // Check for triple colon (invalid)
  if (ip.includes(':::')) {
    return false;
  }

  // Basic IPv6 validation
  const parts = ip.split(':');

  // IPv6 has at most 8 groups
  if (parts.length > 8) {
    return false;
  }

  // Handle :: (consecutive colons)
  const hasDoubleColon = ip.includes('::');
  if (hasDoubleColon) {
    // Only one :: allowed
    if ((ip.match(/::/g) || []).length > 1) {
      return false;
    }
  } else if (parts.length !== 8) {
    return false;
  }

  // Validate each group
  for (const part of parts) {
    if (part === '') continue; // Empty for ::
    if (!/^[0-9a-fA-F]{1,4}$/.test(part)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates if a string is a valid IP address (IPv4 or IPv6)
 *
 * @param ip - The IP address to validate
 * @returns True if the IP is valid
 */
export function isValidIp(ip: string): boolean {
  const normalized = normalizeIp(ip);
  return isValidIpv4(normalized) || isValidIpv6(ip);
}

/**
 * Validates if a string is a valid CIDR notation
 *
 * @param cidr - The CIDR notation to validate (e.g., "192.168.0.0/24")
 * @returns True if the CIDR is valid
 */
export function isValidCidr(cidr: string): boolean {
  if (!cidr || !cidr.includes('/')) {
    return false;
  }

  const [ip, mask] = cidr.split('/');

  // Validate mask
  const maskNum = parseInt(mask, 10);
  if (isNaN(maskNum)) {
    return false;
  }

  // Check if IPv4 or IPv6
  if (isValidIpv4(ip)) {
    // IPv4 mask must be 0-32
    return maskNum >= 0 && maskNum <= 32;
  }

  if (isValidIpv6(ip)) {
    // IPv6 mask must be 0-128
    return maskNum >= 0 && maskNum <= 128;
  }

  return false;
}

/**
 * Converts an IPv4 address to a 32-bit unsigned integer
 *
 * @param ip - The IPv4 address
 * @returns The numeric representation
 */
function ipv4ToNumber(ip: string): number {
  const parts = ip.split('.');
  return (
    parts.reduce((acc, part, i) => {
      return acc + (parseInt(part, 10) << (24 - i * 8));
    }, 0) >>> 0
  );
}

/**
 * Converts an IPv6 address to a BigInt
 *
 * @param ip - The IPv6 address
 * @returns The BigInt representation
 */
function ipv6ToBigInt(ip: string): bigint {
  // Expand :: to full form
  let expanded = ip;

  if (ip.includes('::')) {
    const parts = ip.split('::');
    const left = parts[0] ? parts[0].split(':') : [];
    const right = parts[1] ? parts[1].split(':') : [];
    const missing = 8 - left.length - right.length;
    const zeros = Array(missing).fill('0');
    expanded = [...left, ...zeros, ...right].join(':');
  }

  const groups = expanded.split(':');
  let result = BigInt(0);

  for (let i = 0; i < 8; i++) {
    const group = groups[i] || '0';
    result = (result << BigInt(16)) + BigInt(parseInt(group, 16) || 0);
  }

  return result;
}

/**
 * Checks if an IPv4 address is within a CIDR range
 *
 * @param ip - The IPv4 address to check
 * @param cidr - The CIDR range (e.g., "192.168.0.0/24")
 * @returns True if the IP is within the CIDR range
 */
function isIpv4InCidr(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = parseInt(bits, 10);

  if (isNaN(mask) || mask < 0 || mask > 32) {
    return false;
  }

  try {
    const ipNum = ipv4ToNumber(ip);
    const rangeNum = ipv4ToNumber(range);
    const maskNum = mask === 0 ? 0 : (-1 << (32 - mask)) >>> 0;

    return (ipNum & maskNum) === (rangeNum & maskNum);
  } catch {
    return false;
  }
}

/**
 * Checks if an IPv6 address is within a CIDR range
 *
 * @param ip - The IPv6 address to check
 * @param cidr - The CIDR range (e.g., "2001:db8::/32")
 * @returns True if the IP is within the CIDR range
 */
function isIpv6InCidr(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = parseInt(bits, 10);

  if (isNaN(mask) || mask < 0 || mask > 128) {
    return false;
  }

  try {
    const ipNum = ipv6ToBigInt(ip);
    const rangeNum = ipv6ToBigInt(range);

    if (mask === 0) {
      return true;
    }

    // Create mask by shifting
    const maskNum = (BigInt(1) << BigInt(128 - mask)) - BigInt(1);
    const inverseMask = ~maskNum;

    return (ipNum & inverseMask) === (rangeNum & inverseMask);
  } catch {
    return false;
  }
}

/**
 * Checks if an IP address is within a CIDR range
 * Handles both IPv4 and IPv6
 *
 * @param ip - The IP address to check
 * @param cidr - The CIDR range
 * @returns True if the IP is within the CIDR range
 */
export function isIpInCidr(ip: string, cidr: string): boolean {
  if (!ip || !cidr) {
    return false;
  }

  const normalizedIp = normalizeIp(ip);
  const [cidrIp] = cidr.split('/');

  // Check if both are IPv4
  if (isValidIpv4(normalizedIp) && isValidIpv4(cidrIp)) {
    return isIpv4InCidr(normalizedIp, cidr);
  }

  // Check if both are IPv6
  if (isValidIpv6(ip) && isValidIpv6(cidrIp)) {
    return isIpv6InCidr(ip, cidr);
  }

  return false;
}

/**
 * Checks if a client IP is allowed based on allowlists
 *
 * If both allowedIps and allowedCidrs are empty or null, all IPs are allowed.
 * Otherwise, the IP must match an entry in allowedIps or be within a CIDR range.
 *
 * @param clientIp - The client's IP address
 * @param allowedIps - Array of exact IP addresses to allow (nullable)
 * @param allowedCidrs - Array of CIDR ranges to allow (nullable)
 * @returns True if the IP is allowed
 */
export function isIpAllowed(
  clientIp: string,
  allowedIps: string[] | null | undefined,
  allowedCidrs: string[] | null | undefined,
): boolean {
  // If no allowlist is configured, all IPs are allowed
  const hasIpList = allowedIps && allowedIps.length > 0;
  const hasCidrList = allowedCidrs && allowedCidrs.length > 0;

  if (!hasIpList && !hasCidrList) {
    return true;
  }

  if (!clientIp) {
    return false;
  }

  const normalizedClientIp = normalizeIp(clientIp);

  // Check exact IP matches
  if (hasIpList) {
    for (const allowedIp of allowedIps) {
      const normalizedAllowed = normalizeIp(allowedIp);
      if (normalizedClientIp === normalizedAllowed) {
        return true;
      }
      // Also check original IP against normalized allowed
      if (clientIp === normalizedAllowed) {
        return true;
      }
    }
  }

  // Check CIDR ranges
  if (hasCidrList) {
    for (const cidr of allowedCidrs) {
      if (isIpInCidr(clientIp, cidr)) {
        return true;
      }
      // Also check normalized IP
      if (
        normalizedClientIp !== clientIp &&
        isIpInCidr(normalizedClientIp, cidr)
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Parses and validates a list of IPs, returning only valid ones
 *
 * @param ips - Array of IP addresses to validate
 * @returns Array of valid IP addresses
 */
export function parseAndValidateIps(ips: string[]): string[] {
  if (!ips || !Array.isArray(ips)) {
    return [];
  }

  return ips.filter((ip) => {
    const normalized = normalizeIp(ip);
    return isValidIpv4(normalized) || isValidIpv6(ip);
  });
}

/**
 * Parses and validates a list of CIDRs, returning only valid ones
 *
 * @param cidrs - Array of CIDR notations to validate
 * @returns Array of valid CIDR notations
 */
export function parseAndValidateCidrs(cidrs: string[]): string[] {
  if (!cidrs || !Array.isArray(cidrs)) {
    return [];
  }

  return cidrs.filter((cidr) => isValidCidr(cidr));
}
