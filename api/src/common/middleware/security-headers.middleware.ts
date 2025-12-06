/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Security Headers Middleware
 * Implements various security headers for HTTP responses
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get('NODE_ENV') === 'production';
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Strict-Transport-Security (HSTS)
    // Only set in production to avoid issues with local development
    if (this.isProduction) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }

    // Content-Security-Policy
    // Strict CSP that prevents XSS and data injection attacks
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for some UI frameworks
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
    res.setHeader('Content-Security-Policy', csp);

    // X-Content-Type-Options
    // Prevents browsers from MIME-type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // X-Frame-Options
    // Prevents clickjacking attacks
    res.setHeader('X-Frame-Options', 'DENY');

    // X-XSS-Protection
    // Legacy XSS protection for older browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer-Policy
    // Controls how much referrer information is included with requests
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions-Policy (formerly Feature-Policy)
    // Controls which browser features can be used
    const permissions = [
      'accelerometer=()',
      'camera=()',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'payment=()',
      'usb=()',
    ].join(', ');
    res.setHeader('Permissions-Policy', permissions);

    // X-DNS-Prefetch-Control
    // Controls DNS prefetching
    res.setHeader('X-DNS-Prefetch-Control', 'off');

    // X-Download-Options
    // Prevents IE from executing downloads in your site's context
    res.setHeader('X-Download-Options', 'noopen');

    // X-Permitted-Cross-Domain-Policies
    // Restricts Adobe Flash and PDF cross-domain policies
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // Cache-Control for API responses
    // Prevents caching of sensitive data
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }

    next();
  }
}
