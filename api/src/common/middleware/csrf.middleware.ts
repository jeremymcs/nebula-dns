/**
 * Nebula DNS - Enterprise DNS Security Platform
 * CSRF Protection Middleware
 * 
 * Uses double-submit cookie pattern for stateless CSRF protection
 */

import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

const CSRF_TOKEN_HEADER = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_TOKEN_LENGTH = 32;

// Methods that require CSRF protection
const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Paths exempt from CSRF (e.g., API endpoints using API keys/JWT only)
const EXEMPT_PATHS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/webhooks/',
  '/sso/saml/callback',
  '/sso/oidc/callback',
  '/health',
  '/metrics',
];

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Generate or validate CSRF token
    if (this.isExemptPath(req.path)) {
      return next();
    }

    if (!PROTECTED_METHODS.includes(req.method)) {
      // For safe methods, ensure a CSRF token cookie exists
      this.ensureTokenCookie(req, res);
      return next();
    }

    // For protected methods, validate the token
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_TOKEN_HEADER] as string;

    if (!cookieToken || !headerToken) {
      throw new ForbiddenException('CSRF token missing');
    }

    if (!this.validateToken(cookieToken, headerToken)) {
      throw new ForbiddenException('CSRF token invalid');
    }

    // Rotate the token after successful validation
    this.rotateToken(res);
    next();
  }

  private isExemptPath(path: string): boolean {
    return EXEMPT_PATHS.some(exempt => 
      path === exempt || path.startsWith(exempt)
    );
  }

  private generateToken(): string {
    return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  }

  private ensureTokenCookie(req: Request, res: Response): void {
    if (!req.cookies?.[CSRF_COOKIE_NAME]) {
      const token = this.generateToken();
      this.setTokenCookie(res, token);
    }
  }

  private rotateToken(res: Response): void {
    const token = this.generateToken();
    this.setTokenCookie(res, token);
  }

  private setTokenCookie(res: Response, token: string): void {
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Must be readable by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }

  private validateToken(cookieToken: string, headerToken: string): boolean {
    if (cookieToken.length !== headerToken.length) {
      return false;
    }
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken)
    );
  }
}

/**
 * Helper function to get CSRF token for response
 * Can be used by controllers to include token in response body
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

