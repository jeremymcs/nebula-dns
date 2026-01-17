// Nebula DNS - API Key IP Allowlisting
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  normalizeIp,
  isValidIpv4,
  isValidIpv6,
  isValidIp,
  isValidCidr,
  isIpInCidr,
  isIpAllowed,
  parseAndValidateIps,
  parseAndValidateCidrs,
} from './ip-validator.util';

describe('IP Validator Utility', () => {
  describe('normalizeIp', () => {
    it('should return empty string for empty input', () => {
      expect(normalizeIp('')).toBe('');
      expect(normalizeIp(null as any)).toBe('');
      expect(normalizeIp(undefined as any)).toBe('');
    });

    it('should trim whitespace', () => {
      expect(normalizeIp('  192.168.1.1  ')).toBe('192.168.1.1');
    });

    it('should convert IPv6-mapped IPv4 to IPv4', () => {
      expect(normalizeIp('::ffff:192.168.1.1')).toBe('192.168.1.1');
      expect(normalizeIp('::FFFF:10.0.0.1')).toBe('10.0.0.1');
    });

    it('should handle full IPv6-mapped format', () => {
      expect(normalizeIp('0:0:0:0:0:ffff:192.168.1.1')).toBe('192.168.1.1');
    });

    it('should preserve regular IPv4 addresses', () => {
      expect(normalizeIp('192.168.1.1')).toBe('192.168.1.1');
      expect(normalizeIp('10.0.0.1')).toBe('10.0.0.1');
      expect(normalizeIp('127.0.0.1')).toBe('127.0.0.1');
    });

    it('should preserve regular IPv6 addresses', () => {
      expect(normalizeIp('2001:db8::1')).toBe('2001:db8::1');
      expect(normalizeIp('::1')).toBe('::1');
    });
  });

  describe('isValidIpv4', () => {
    it('should validate correct IPv4 addresses', () => {
      expect(isValidIpv4('192.168.1.1')).toBe(true);
      expect(isValidIpv4('10.0.0.0')).toBe(true);
      expect(isValidIpv4('255.255.255.255')).toBe(true);
      expect(isValidIpv4('0.0.0.0')).toBe(true);
      expect(isValidIpv4('127.0.0.1')).toBe(true);
    });

    it('should reject invalid IPv4 addresses', () => {
      expect(isValidIpv4('')).toBe(false);
      expect(isValidIpv4('256.0.0.1')).toBe(false);
      expect(isValidIpv4('192.168.1')).toBe(false);
      expect(isValidIpv4('192.168.1.1.1')).toBe(false);
      expect(isValidIpv4('192.168.1.abc')).toBe(false);
      expect(isValidIpv4('not an ip')).toBe(false);
      expect(isValidIpv4('192.168.01.1')).toBe(false); // Leading zero
    });
  });

  describe('isValidIpv6', () => {
    it('should validate correct IPv6 addresses', () => {
      expect(isValidIpv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
      expect(isValidIpv6('2001:db8:85a3::8a2e:370:7334')).toBe(true);
      expect(isValidIpv6('::1')).toBe(true);
      expect(isValidIpv6('::')).toBe(true);
      expect(isValidIpv6('fe80::')).toBe(true);
      expect(isValidIpv6('::ffff:192.168.1.1')).toBe(true);
    });

    it('should reject invalid IPv6 addresses', () => {
      expect(isValidIpv6('')).toBe(false);
      expect(isValidIpv6('192.168.1.1')).toBe(false);
      expect(isValidIpv6('2001:db8:::1')).toBe(false); // Triple colon
      expect(isValidIpv6('2001:db8:85a3:0000:0000:8a2e:0370:7334:extra')).toBe(
        false,
      );
    });
  });

  describe('isValidIp', () => {
    it('should validate both IPv4 and IPv6 addresses', () => {
      expect(isValidIp('192.168.1.1')).toBe(true);
      expect(isValidIp('2001:db8::1')).toBe(true);
      expect(isValidIp('::ffff:192.168.1.1')).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(isValidIp('')).toBe(false);
      expect(isValidIp('not an ip')).toBe(false);
    });
  });

  describe('isValidCidr', () => {
    it('should validate correct IPv4 CIDR notation', () => {
      expect(isValidCidr('192.168.0.0/24')).toBe(true);
      expect(isValidCidr('10.0.0.0/8')).toBe(true);
      expect(isValidCidr('172.16.0.0/12')).toBe(true);
      expect(isValidCidr('0.0.0.0/0')).toBe(true);
      expect(isValidCidr('192.168.1.1/32')).toBe(true);
    });

    it('should validate correct IPv6 CIDR notation', () => {
      expect(isValidCidr('2001:db8::/32')).toBe(true);
      expect(isValidCidr('fe80::/10')).toBe(true);
      expect(isValidCidr('::/0')).toBe(true);
      expect(isValidCidr('2001:db8::1/128')).toBe(true);
    });

    it('should reject invalid CIDR notation', () => {
      expect(isValidCidr('')).toBe(false);
      expect(isValidCidr('192.168.0.0')).toBe(false); // No mask
      expect(isValidCidr('192.168.0.0/33')).toBe(false); // Mask too large for IPv4
      expect(isValidCidr('192.168.0.0/-1')).toBe(false); // Negative mask
      expect(isValidCidr('not/24')).toBe(false);
    });
  });

  describe('isIpInCidr', () => {
    describe('IPv4 CIDR matching', () => {
      it('should match IPs within /24 range', () => {
        expect(isIpInCidr('192.168.1.1', '192.168.1.0/24')).toBe(true);
        expect(isIpInCidr('192.168.1.254', '192.168.1.0/24')).toBe(true);
        expect(isIpInCidr('192.168.2.1', '192.168.1.0/24')).toBe(false);
      });

      it('should match IPs within /16 range', () => {
        expect(isIpInCidr('192.168.1.1', '192.168.0.0/16')).toBe(true);
        expect(isIpInCidr('192.168.255.255', '192.168.0.0/16')).toBe(true);
        expect(isIpInCidr('192.169.1.1', '192.168.0.0/16')).toBe(false);
      });

      it('should match IPs within /8 range', () => {
        expect(isIpInCidr('10.0.0.1', '10.0.0.0/8')).toBe(true);
        expect(isIpInCidr('10.255.255.255', '10.0.0.0/8')).toBe(true);
        expect(isIpInCidr('11.0.0.1', '10.0.0.0/8')).toBe(false);
      });

      it('should match exact IP with /32', () => {
        expect(isIpInCidr('192.168.1.1', '192.168.1.1/32')).toBe(true);
        expect(isIpInCidr('192.168.1.2', '192.168.1.1/32')).toBe(false);
      });

      it('should match all IPs with /0', () => {
        expect(isIpInCidr('192.168.1.1', '0.0.0.0/0')).toBe(true);
        expect(isIpInCidr('10.0.0.1', '0.0.0.0/0')).toBe(true);
      });
    });

    describe('IPv6 CIDR matching', () => {
      it('should match IPs within IPv6 ranges', () => {
        expect(isIpInCidr('2001:db8::1', '2001:db8::/32')).toBe(true);
        expect(isIpInCidr('2001:db8:ffff::1', '2001:db8::/32')).toBe(true);
        expect(isIpInCidr('2001:db9::1', '2001:db8::/32')).toBe(false);
      });

      it('should match exact IP with /128', () => {
        expect(isIpInCidr('2001:db8::1', '2001:db8::1/128')).toBe(true);
        expect(isIpInCidr('2001:db8::2', '2001:db8::1/128')).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should return false for empty inputs', () => {
        expect(isIpInCidr('', '192.168.0.0/24')).toBe(false);
        expect(isIpInCidr('192.168.1.1', '')).toBe(false);
      });

      it('should return false for mismatched IP versions', () => {
        expect(isIpInCidr('192.168.1.1', '2001:db8::/32')).toBe(false);
        expect(isIpInCidr('2001:db8::1', '192.168.0.0/24')).toBe(false);
      });
    });
  });

  describe('isIpAllowed', () => {
    describe('Empty allowlist behavior', () => {
      it('should allow all IPs when both lists are empty', () => {
        expect(isIpAllowed('192.168.1.1', [], [])).toBe(true);
        expect(isIpAllowed('10.0.0.1', [], [])).toBe(true);
      });

      it('should allow all IPs when both lists are null', () => {
        expect(isIpAllowed('192.168.1.1', null, null)).toBe(true);
        expect(isIpAllowed('10.0.0.1', undefined, undefined)).toBe(true);
      });

      it('should allow all IPs when both lists are undefined', () => {
        expect(isIpAllowed('192.168.1.1', undefined, undefined)).toBe(true);
      });
    });

    describe('Exact IP matching', () => {
      it('should allow IP in allowlist', () => {
        expect(isIpAllowed('192.168.1.1', ['192.168.1.1'], null)).toBe(true);
        expect(
          isIpAllowed('192.168.1.1', ['10.0.0.1', '192.168.1.1'], null),
        ).toBe(true);
      });

      it('should deny IP not in allowlist', () => {
        expect(isIpAllowed('192.168.1.2', ['192.168.1.1'], null)).toBe(false);
        expect(isIpAllowed('10.0.0.2', ['10.0.0.1', '192.168.1.1'], null)).toBe(
          false,
        );
      });

      it('should handle IPv6-mapped IPv4 addresses', () => {
        expect(isIpAllowed('::ffff:192.168.1.1', ['192.168.1.1'], null)).toBe(
          true,
        );
        expect(isIpAllowed('192.168.1.1', ['::ffff:192.168.1.1'], null)).toBe(
          true,
        );
      });
    });

    describe('CIDR matching', () => {
      it('should allow IP in CIDR range', () => {
        expect(isIpAllowed('192.168.1.50', null, ['192.168.1.0/24'])).toBe(
          true,
        );
        expect(isIpAllowed('10.5.5.5', null, ['10.0.0.0/8'])).toBe(true);
      });

      it('should deny IP not in CIDR range', () => {
        expect(isIpAllowed('192.168.2.1', null, ['192.168.1.0/24'])).toBe(
          false,
        );
        expect(isIpAllowed('11.0.0.1', null, ['10.0.0.0/8'])).toBe(false);
      });

      it('should check multiple CIDR ranges', () => {
        const cidrs = ['192.168.1.0/24', '10.0.0.0/8'];
        expect(isIpAllowed('192.168.1.50', null, cidrs)).toBe(true);
        expect(isIpAllowed('10.5.5.5', null, cidrs)).toBe(true);
        expect(isIpAllowed('172.16.0.1', null, cidrs)).toBe(false);
      });
    });

    describe('Combined allowlist and CIDR', () => {
      it('should allow IP if in either list', () => {
        const ips = ['192.168.1.1'];
        const cidrs = ['10.0.0.0/8'];

        expect(isIpAllowed('192.168.1.1', ips, cidrs)).toBe(true);
        expect(isIpAllowed('10.5.5.5', ips, cidrs)).toBe(true);
        expect(isIpAllowed('172.16.0.1', ips, cidrs)).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should deny empty client IP when allowlist is configured', () => {
        expect(isIpAllowed('', ['192.168.1.1'], null)).toBe(false);
      });

      it('should handle IPv6-mapped IPv4 in CIDR checks', () => {
        expect(
          isIpAllowed('::ffff:192.168.1.50', null, ['192.168.1.0/24']),
        ).toBe(true);
      });
    });
  });

  describe('parseAndValidateIps', () => {
    it('should filter out invalid IPs', () => {
      const input = ['192.168.1.1', 'invalid', '10.0.0.1', '2001:db8::1'];
      const result = parseAndValidateIps(input);
      expect(result).toEqual(['192.168.1.1', '10.0.0.1', '2001:db8::1']);
    });

    it('should return empty array for empty input', () => {
      expect(parseAndValidateIps([])).toEqual([]);
      expect(parseAndValidateIps(null as any)).toEqual([]);
      expect(parseAndValidateIps(undefined as any)).toEqual([]);
    });
  });

  describe('parseAndValidateCidrs', () => {
    it('should filter out invalid CIDRs', () => {
      const input = ['192.168.0.0/24', 'invalid', '10.0.0.0/8', '192.168.0.0'];
      const result = parseAndValidateCidrs(input);
      expect(result).toEqual(['192.168.0.0/24', '10.0.0.0/8']);
    });

    it('should return empty array for empty input', () => {
      expect(parseAndValidateCidrs([])).toEqual([]);
      expect(parseAndValidateCidrs(null as any)).toEqual([]);
      expect(parseAndValidateCidrs(undefined as any)).toEqual([]);
    });
  });
});
