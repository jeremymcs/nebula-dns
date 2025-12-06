/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Prometheus Metrics Service
 */

import { Injectable, OnModuleInit } from '@nestjs/common';

interface MetricValue {
  value: number;
  labels?: Record<string, string>;
  timestamp?: number;
}

interface MetricDefinition {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  values: MetricValue[];
}

@Injectable()
export class MetricsService implements OnModuleInit {
  private metrics: Map<string, MetricDefinition> = new Map();
  private readonly startTime = Date.now();
  
  // Request tracking
  private requestCount = 0;
  private requestDurations: number[] = [];
  private requestsByStatus: Map<number, number> = new Map();
  private requestsByEndpoint: Map<string, number> = new Map();

  onModuleInit() {
    this.initializeMetrics();
  }

  private initializeMetrics() {
    // Define standard metrics
    this.registerMetric('http_requests_total', 'counter', 'Total number of HTTP requests');
    this.registerMetric('http_request_duration_seconds', 'histogram', 'HTTP request duration in seconds');
    this.registerMetric('http_requests_in_flight', 'gauge', 'Number of HTTP requests currently being processed');
    this.registerMetric('process_uptime_seconds', 'gauge', 'Process uptime in seconds');
    this.registerMetric('process_start_time_seconds', 'gauge', 'Start time of the process since Unix epoch');
    this.registerMetric('nodejs_heap_size_bytes', 'gauge', 'Node.js heap size in bytes');
    this.registerMetric('dns_queries_total', 'counter', 'Total DNS queries processed');
    this.registerMetric('dns_queries_blocked_total', 'counter', 'Total DNS queries blocked');
    this.registerMetric('policy_evaluations_total', 'counter', 'Total policy evaluations');
    this.registerMetric('policy_evaluation_duration_seconds', 'histogram', 'Policy evaluation duration');
    this.registerMetric('active_locations', 'gauge', 'Number of active locations');
    this.registerMetric('active_policies', 'gauge', 'Number of active policies');
    this.registerMetric('cache_hits_total', 'counter', 'Total cache hits');
    this.registerMetric('cache_misses_total', 'counter', 'Total cache misses');
  }

  private registerMetric(name: string, type: MetricDefinition['type'], help: string) {
    this.metrics.set(name, {
      name,
      type,
      help,
      values: [],
    });
  }

  // Track HTTP request
  recordRequest(method: string, path: string, statusCode: number, durationMs: number) {
    this.requestCount++;
    this.requestDurations.push(durationMs / 1000);
    
    // Keep only last 1000 durations for histogram
    if (this.requestDurations.length > 1000) {
      this.requestDurations.shift();
    }

    // Track by status
    const currentStatus = this.requestsByStatus.get(statusCode) || 0;
    this.requestsByStatus.set(statusCode, currentStatus + 1);

    // Track by endpoint
    const endpoint = `${method} ${path}`;
    const currentEndpoint = this.requestsByEndpoint.get(endpoint) || 0;
    this.requestsByEndpoint.set(endpoint, currentEndpoint + 1);
  }

  // Increment a counter metric
  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>) {
    const metric = this.metrics.get(name);
    if (metric && metric.type === 'counter') {
      const existingValue = metric.values.find(v => 
        JSON.stringify(v.labels) === JSON.stringify(labels)
      );
      if (existingValue) {
        existingValue.value += value;
      } else {
        metric.values.push({ value, labels });
      }
    }
  }

  // Set a gauge metric
  setGauge(name: string, value: number, labels?: Record<string, string>) {
    const metric = this.metrics.get(name);
    if (metric && metric.type === 'gauge') {
      const existingValue = metric.values.find(v => 
        JSON.stringify(v.labels) === JSON.stringify(labels)
      );
      if (existingValue) {
        existingValue.value = value;
      } else {
        metric.values.push({ value, labels });
      }
    }
  }

  // Generate Prometheus-format metrics output
  getMetrics(): string {
    const lines: string[] = [];
    
    // Process uptime
    const uptimeSeconds = (Date.now() - this.startTime) / 1000;
    lines.push('# HELP process_uptime_seconds Process uptime in seconds');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds ${uptimeSeconds.toFixed(2)}`);
    
    // Start time
    lines.push('# HELP process_start_time_seconds Start time of the process since Unix epoch');
    lines.push('# TYPE process_start_time_seconds gauge');
    lines.push(`process_start_time_seconds ${Math.floor(this.startTime / 1000)}`);
    
    // Memory usage
    const memUsage = process.memoryUsage();
    lines.push('# HELP nodejs_heap_size_bytes Node.js heap size in bytes');
    lines.push('# TYPE nodejs_heap_size_bytes gauge');
    lines.push(`nodejs_heap_size_total_bytes ${memUsage.heapTotal}`);
    lines.push(`nodejs_heap_size_used_bytes ${memUsage.heapUsed}`);
    lines.push(`nodejs_external_memory_bytes ${memUsage.external}`);
    
    // HTTP requests total
    lines.push('# HELP http_requests_total Total number of HTTP requests');
    lines.push('# TYPE http_requests_total counter');
    lines.push(`http_requests_total ${this.requestCount}`);
    
    // HTTP requests by status
    this.requestsByStatus.forEach((count, status) => {
      lines.push(`http_requests_total{status="${status}"} ${count}`);
    });
    
    // HTTP requests by endpoint (top 20)
    const sortedEndpoints = [...this.requestsByEndpoint.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    
    if (sortedEndpoints.length > 0) {
      lines.push('# HELP http_requests_by_endpoint Total HTTP requests by endpoint');
      lines.push('# TYPE http_requests_by_endpoint counter');
      sortedEndpoints.forEach(([endpoint, count]) => {
        const [method, path] = endpoint.split(' ');
        lines.push(`http_requests_by_endpoint{method="${method}",path="${this.sanitizePath(path)}"} ${count}`);
      });
    }
    
    // Request duration histogram
    if (this.requestDurations.length > 0) {
      const sorted = [...this.requestDurations].sort((a, b) => a - b);
      const buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
      
      lines.push('# HELP http_request_duration_seconds HTTP request duration in seconds');
      lines.push('# TYPE http_request_duration_seconds histogram');
      
      buckets.forEach(bucket => {
        const count = sorted.filter(d => d <= bucket).length;
        lines.push(`http_request_duration_seconds_bucket{le="${bucket}"} ${count}`);
      });
      lines.push(`http_request_duration_seconds_bucket{le="+Inf"} ${sorted.length}`);
      
      const sum = sorted.reduce((a, b) => a + b, 0);
      lines.push(`http_request_duration_seconds_sum ${sum.toFixed(6)}`);
      lines.push(`http_request_duration_seconds_count ${sorted.length}`);
    }
    
    // Custom application metrics
    this.metrics.forEach((metric) => {
      if (metric.values.length > 0) {
        lines.push(`# HELP ${metric.name} ${metric.help}`);
        lines.push(`# TYPE ${metric.name} ${metric.type}`);
        
        metric.values.forEach(v => {
          const labelStr = v.labels 
            ? `{${Object.entries(v.labels).map(([k, val]) => `${k}="${val}"`).join(',')}}`
            : '';
          lines.push(`${metric.name}${labelStr} ${v.value}`);
        });
      }
    });
    
    return lines.join('\n') + '\n';
  }

  private sanitizePath(path: string): string {
    // Replace UUIDs and IDs with placeholders
    return path
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/\d+/g, '/:num');
  }
}
