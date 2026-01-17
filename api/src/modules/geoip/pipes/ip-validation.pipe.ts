// Nebula DNS - IP Address Validation Pipe
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

/**
 * Custom pipe to validate IP address format (IPv4 and IPv6)
 */
@Injectable()
export class IpValidationPipe implements PipeTransform<string, string> {
  // IPv4 regex pattern
  private readonly ipv4Pattern =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6 regex pattern (supports full, compressed, and mixed formats)
  private readonly ipv6Pattern =
    /^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(?::[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+|::(?:ffff(?::0{1,4})?:)?(?:(?:25[0-5]|(?:2[0-4]|1?[0-9])?[0-9])\.){3}(?:25[0-5]|(?:2[0-4]|1?[0-9])?[0-9])|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|(?:2[0-4]|1?[0-9])?[0-9])\.){3}(?:25[0-5]|(?:2[0-4]|1?[0-9])?[0-9]))$/;

  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value) {
      throw new BadRequestException('IP address is required');
    }

    const trimmedValue = value.trim();

    if (!this.isValidIp(trimmedValue)) {
      throw new BadRequestException(
        `Invalid IP address format: ${trimmedValue}. Must be a valid IPv4 or IPv6 address.`,
      );
    }

    return trimmedValue;
  }

  /**
   * Validates if the given string is a valid IPv4 or IPv6 address
   */
  isValidIp(ip: string): boolean {
    return this.isValidIPv4(ip) || this.isValidIPv6(ip);
  }

  /**
   * Validates IPv4 address format
   */
  isValidIPv4(ip: string): boolean {
    return this.ipv4Pattern.test(ip);
  }

  /**
   * Validates IPv6 address format
   */
  isValidIPv6(ip: string): boolean {
    return this.ipv6Pattern.test(ip);
  }

  /**
   * Determines the IP version
   */
  getIpVersion(ip: string): 4 | 6 | null {
    if (this.isValidIPv4(ip)) return 4;
    if (this.isValidIPv6(ip)) return 6;
    return null;
  }
}
