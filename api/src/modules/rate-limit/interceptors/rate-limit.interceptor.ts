// Nebula DNS - Rate Limit Response Headers Interceptor
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  RateLimitResult,
  RateLimitOptions,
} from '../interfaces/rate-limit.interface';

/**
 * Interceptor to add rate limit headers to responses.
 *
 * Headers added:
 * - X-RateLimit-Limit: The maximum number of requests allowed in the window
 * - X-RateLimit-Remaining: The number of requests remaining in the current window
 * - X-RateLimit-Reset: Unix timestamp when the rate limit resets
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      tap(() => {
        const result: RateLimitResult | undefined = request.rateLimitResult;
        const options: RateLimitOptions | undefined = request.rateLimitOptions;

        if (result && options) {
          // Set standard rate limit headers
          response.setHeader('X-RateLimit-Limit', result.limit.toString());
          response.setHeader(
            'X-RateLimit-Remaining',
            result.remaining.toString(),
          );
          response.setHeader(
            'X-RateLimit-Reset',
            Math.ceil(result.resetAt.getTime() / 1000).toString(),
          );

          // Set additional informational headers
          response.setHeader('X-RateLimit-Policy', options.type);

          // If using fallback (in-memory), indicate it
          if (request.rateLimitFallback) {
            response.setHeader('X-RateLimit-Fallback', 'true');
          }
        }
      }),
    );
  }
}
