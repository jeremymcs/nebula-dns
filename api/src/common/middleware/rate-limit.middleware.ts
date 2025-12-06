/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Rate Limiting Middleware
 * Implements sliding window rate limiting with in-memory storage
 */

import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly store: Map<string, RateLimitEntry> = new Map();
  private readonly defaultConfig: RateLimitConfig;
  private readonly endpointConfigs: Map<string, RateLimitConfig> = new Map();

  constructor(private readonly configService: ConfigService) {
    // Default rate limit: 100 requests per minute
    this.defaultConfig = {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
    };

    // Configure specific endpoint limits
    this.configureEndpointLimits();

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private configureEndpointLimits() {
    // Auth endpoints - stricter limits to prevent brute force
    this.endpointConfigs.set('POST:/auth/login', { windowMs: 60000, maxRequests: 5 });
    this.endpointConfigs.set('POST:/auth/refresh', { windowMs: 60000, maxRequests: 20 });
    this.endpointConfigs.set('POST:/auth/forgot-password', { windowMs: 300000, maxRequests: 3 });
    
    // MFA endpoints
    this.endpointConfigs.set('POST:/mfa/verify', { windowMs: 60000, maxRequests: 10 });
    this.endpointConfigs.set('POST:/mfa/setup', { windowMs: 300000, maxRequests: 5 });
    
    // Report generation - expensive operations
    this.endpointConfigs.set('GET:/reports', { windowMs: 60000, maxRequests: 30 });
    this.endpointConfigs.set('POST:/scheduled-reports/:id/run', { windowMs: 60000, maxRequests: 5 });
    
    // Webhook testing
    this.endpointConfigs.set('POST:/webhooks/:id/test', { windowMs: 60000, maxRequests: 10 });
    
    // SIEM integration testing
    this.endpointConfigs.set('POST:/siem/:id/test', { windowMs: 60000, maxRequests: 5 });
    
    // Bulk operations
    this.endpointConfigs.set('POST:/lists/:id/entries/bulk', { windowMs: 60000, maxRequests: 10 });
    this.endpointConfigs.set('POST:/invitations/bulk', { windowMs: 60000, maxRequests: 5 });
    
    // Health/metrics endpoints - higher limits for monitoring
    this.endpointConfigs.set('GET:/health', { windowMs: 60000, maxRequests: 300 });
    this.endpointConfigs.set('GET:/health/detailed', { windowMs: 60000, maxRequests: 60 });
    this.endpointConfigs.set('GET:/metrics', { windowMs: 60000, maxRequests: 300 });
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Skip rate limiting for local/internal requests
    const clientIp = this.getClientIp(req);
    if (clientIp === '127.0.0.1' || clientIp === '::1') {
      return next();
    }

    const endpoint = `${req.method}:${this.normalizeEndpoint(req.path)}`;
    const config = this.getConfig(endpoint);
    const key = `${clientIp}:${endpoint}`;

    const now = Date.now();
    let entry = this.store.get(key);

    // Create new entry or reset if window expired
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
    }

    entry.count++;
    this.store.set(key, entry);

    // Set rate limit headers
    const remaining = Math.max(0, config.maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetSeconds.toString());

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      res.setHeader('Retry-After', resetSeconds.toString());
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests, please try again later',
          retryAfter: resetSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }

  private getClientIp(req: Request): string {
    // Check various headers for the real IP (behind proxies/load balancers)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor).split(',');
      return ips[0].trim();
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private normalizeEndpoint(path: string): string {
    // Replace UUIDs and numeric IDs with placeholders
    return path
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/\d+/g, '/:num');
  }

  private getConfig(endpoint: string): RateLimitConfig {
    // Check for exact match first
    const exactMatch = this.endpointConfigs.get(endpoint);
    if (exactMatch) {
      return exactMatch;
    }

    // Check for pattern matches (with :id or :num placeholders)
    for (const [pattern, config] of this.endpointConfigs) {
      const regexPattern = pattern.replace(/:id/g, '[^/]+').replace(/:num/g, '\\d+');
      const regex = new RegExp(`^${regexPattern}$`);
      if (regex.test(endpoint)) {
        return config;
      }
    }

    return this.defaultConfig;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}
