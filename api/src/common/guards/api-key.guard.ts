// Nebula DNS - API Key IP Allowlisting
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// API Key Authentication Guard with Rate Limiting and IP Allowlisting

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeysService } from '@/modules/api-keys/api-keys.service';
import { ApiKeyScope } from '@/modules/api-keys/entities/api-key.entity';
import { isIpAllowed, normalizeIp } from '@/common/utils/ip-validator.util';
import { AuditLogsService } from '@/modules/audit-logs/audit-logs.service';

export const API_KEY_SCOPES_KEY = 'api_key_scopes';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly reflector: Reflector,
    @Optional()
    @Inject(AuditLogsService)
    private readonly auditLogsService?: AuditLogsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get API key from header
    const apiKey = this.extractApiKey(request);
    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Validate API key
    const result = await this.apiKeysService.validateApiKey(apiKey);
    if (!result) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    const { apiKey: keyEntity, tenantId } = result;

    // Get client IP address
    const clientIp = this.getClientIp(request);

    // Check IP allowlist if configured
    if (!isIpAllowed(clientIp, keyEntity.allowedIps, keyEntity.allowedCidrs)) {
      this.logger.warn(
        `API key ${keyEntity.keyPrefix}... denied for IP ${clientIp} - not in allowlist`,
      );

      // Log IP violation to audit log
      await this.logIpViolation(
        tenantId,
        keyEntity.id,
        keyEntity.keyPrefix,
        clientIp,
        request,
      );

      throw new ForbiddenException(
        'Access denied: IP address not in API key allowlist',
      );
    }

    // Check required scopes
    const requiredScopes = this.reflector.get<ApiKeyScope[]>(
      API_KEY_SCOPES_KEY,
      context.getHandler(),
    ) || ['read'];

    for (const scope of requiredScopes) {
      if (!this.apiKeysService.hasScope(keyEntity, scope)) {
        throw new UnauthorizedException(
          `API key does not have required scope: ${scope}`,
        );
      }
    }

    // Check rate limit
    const rateLimitResult = await this.apiKeysService.checkRateLimit(
      keyEntity.id,
      keyEntity.rateLimit,
    );

    // Set rate limit headers
    response.setHeader('X-RateLimit-Limit', keyEntity.rateLimit.toString());
    response.setHeader(
      'X-RateLimit-Remaining',
      rateLimitResult.remaining.toString(),
    );
    response.setHeader(
      'X-RateLimit-Reset',
      Math.ceil(rateLimitResult.resetAt.getTime() / 1000).toString(),
    );

    if (!rateLimitResult.allowed) {
      const retryAfter = Math.ceil(
        (rateLimitResult.resetAt.getTime() - Date.now()) / 1000,
      );
      response.setHeader('Retry-After', retryAfter.toString());
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'API key rate limit exceeded',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Attach API key info to request
    request.apiKey = keyEntity;
    request.tenantId = tenantId;

    // Record usage asynchronously (don't wait)
    const startTime = Date.now();
    response.on('finish', () => {
      const responseTime = Date.now() - startTime;
      this.apiKeysService
        .recordUsage(
          keyEntity.id,
          request.path,
          request.method,
          response.statusCode,
          responseTime,
          request.ip,
          request.headers['user-agent'],
        )
        .catch(() => {
          // Ignore usage recording errors
        });
    });

    return true;
  }

  private extractApiKey(request: any): string | null {
    // Check Authorization header (Bearer token)
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check X-API-Key header
    const apiKeyHeader = request.headers['x-api-key'];
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    // Check query parameter (less secure, but sometimes needed)
    if (request.query?.api_key) {
      return request.query.api_key;
    }

    return null;
  }

  /**
   * Extracts the client IP address from the request.
   * Checks proxy headers first, then falls back to direct connection.
   */
  private getClientIp(request: any): string {
    // Check for proxy headers
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = (
        typeof forwardedFor === 'string' ? forwardedFor : forwardedFor[0]
      )
        .split(',')
        .map((ip: string) => ip.trim());
      return ips[0];
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return typeof realIp === 'string' ? realIp : realIp[0];
    }

    return request.ip || request.socket?.remoteAddress || '';
  }

  /**
   * Logs an IP violation to the audit log.
   * This is called when an API key is used from an IP not in the allowlist.
   */
  private async logIpViolation(
    tenantId: string,
    apiKeyId: string,
    keyPrefix: string,
    clientIp: string,
    request: any,
  ): Promise<void> {
    if (!this.auditLogsService) {
      return;
    }

    try {
      await this.auditLogsService.log({
        tenantId,
        userId: null,
        action: 'api_key_revoke', // Using existing action type for security events
        resourceType: 'api_key',
        resourceId: apiKeyId,
        resourceName: `${keyPrefix}...`,
        oldValue: null,
        newValue: null,
        ipAddress: clientIp,
        userAgent: request.headers['user-agent'] || null,
        metadata: {
          event: 'ip_allowlist_violation',
          clientIp: normalizeIp(clientIp),
          originalIp: clientIp,
          endpoint: request.path,
          method: request.method,
          message: 'API key access denied - IP not in allowlist',
        },
      });
    } catch (error) {
      // Don't fail the request if audit logging fails
      this.logger.error('Failed to log IP violation to audit log', error);
    }
  }
}
