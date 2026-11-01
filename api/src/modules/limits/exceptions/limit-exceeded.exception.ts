// Nebula DNS - Limit Exceeded Exception
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { HttpException, HttpStatus } from '@nestjs/common';

export interface LimitExceededDetails {
  /** Type of resource that hit the limit */
  resourceType:
    | 'location'
    | 'client'
    | 'family_member'
    | 'user'
    | 'policy'
    | 'custom_list'
    | 'dns_zone';
  /** Current count */
  current: number;
  /** Maximum allowed */
  limit: number;
  /** Current subscription tier */
  tier: string;
  /** Suggested upgrade path */
  upgradeMessage: string;
  /** URL to upgrade page */
  upgradeUrl?: string;
}

/**
 * Exception thrown when a tenant exceeds their plan limits
 */
export class LimitExceededException extends HttpException {
  constructor(details: LimitExceededDetails) {
    const message = LimitExceededException.buildMessage(details);
    super(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        error: 'Limit Exceeded',
        message,
        details,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  private static buildMessage(details: LimitExceededDetails): string {
    const resourceNames: Record<string, string> = {
      location: 'locations',
      client: 'client organizations',
      family_member: 'family members',
      user: 'users',
      policy: 'policies',
      custom_list: 'custom lists',
      dns_zone: 'DNS zones',
    };

    const resourceName =
      resourceNames[details.resourceType] || details.resourceType;
    return `You have reached the maximum number of ${resourceName} (${details.limit}) allowed on your ${details.tier} plan. ${details.upgradeMessage}`;
  }

  /**
   * Get the details of the limit exceeded error
   */
  getDetails(): LimitExceededDetails {
    const response = this.getResponse() as { details: LimitExceededDetails };
    return response.details;
  }
}
