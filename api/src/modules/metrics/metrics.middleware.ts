/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Metrics Middleware - Records HTTP request metrics
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Record response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const path = this.normalizePath(req.path);

      this.metricsService.recordRequest(
        req.method,
        path,
        res.statusCode,
        duration,
      );
    });

    next();
  }

  private normalizePath(path: string): string {
    // Normalize paths to reduce cardinality
    // Replace UUIDs and numeric IDs with placeholders
    return path
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        ':id',
      )
      .replace(/\/\d+/g, '/:num');
  }
}
