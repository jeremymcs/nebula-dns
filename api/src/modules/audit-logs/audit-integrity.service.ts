// Nebula DNS - Audit Integrity Service
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogsService } from './audit-logs.service';
import { AuditLog } from './entities/audit-log.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

export interface IntegrityCheckResult {
  tenantId: string;
  tenantName?: string;
  valid: boolean;
  totalRecords: number;
  verifiedRecords: number;
  brokenAt?: {
    id: string;
    expectedHash: string;
    actualHash: string;
  };
  checkDuration: number;
  checkedAt: Date;
}

export interface IntegrityReportSummary {
  totalTenants: number;
  tenantsChecked: number;
  tenantsWithValidChain: number;
  tenantsWithBrokenChain: number;
  totalRecordsVerified: number;
  totalDuration: number;
  completedAt: Date;
  results: IntegrityCheckResult[];
}

@Injectable()
export class AuditIntegrityService implements OnModuleInit {
  private readonly logger = new Logger(AuditIntegrityService.name);
  private lastVerificationReport: IntegrityReportSummary | null = null;

  constructor(
    private readonly auditLogsService: AuditLogsService,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  onModuleInit() {
    this.logger.log('Audit Integrity Service initialized');
    this.logger.log('Daily hash chain verification scheduled for 3:00 AM');
  }

  /**
   * Daily integrity verification job
   * Runs at 3:00 AM every day to verify hash chain integrity for all tenants
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runDailyIntegrityCheck(): Promise<void> {
    this.logger.log('Starting daily audit log integrity verification');

    try {
      const report = await this.verifyAllTenants();
      this.lastVerificationReport = report;

      if (report.tenantsWithBrokenChain > 0) {
        this.logger.error(
          `AUDIT INTEGRITY ALERT: ${report.tenantsWithBrokenChain} tenant(s) have broken hash chains!`,
        );

        // Log details for each broken chain
        for (const result of report.results) {
          if (!result.valid) {
            this.logger.error(
              `Tenant ${result.tenantId} (${result.tenantName || 'unknown'}): ` +
                `Hash chain broken at record ${result.brokenAt?.id}. ` +
                `Expected: ${result.brokenAt?.expectedHash}, ` +
                `Actual: ${result.brokenAt?.actualHash}`,
            );
          }
        }

        // Emit event for external alerting systems
        this.emitIntegrityAlert(report);
      } else {
        this.logger.log(
          `Daily integrity check completed successfully. ` +
            `${report.tenantsChecked} tenants verified, ` +
            `${report.totalRecordsVerified} records checked in ${report.totalDuration}ms`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to complete daily integrity check', error);
    }
  }

  /**
   * Verify hash chain integrity for all tenants
   */
  async verifyAllTenants(): Promise<IntegrityReportSummary> {
    const startTime = Date.now();
    const results: IntegrityCheckResult[] = [];

    // Get all tenants
    const tenants = await this.tenantRepository.find({
      select: ['id', 'name'],
    });

    let totalRecordsVerified = 0;
    let tenantsWithValidChain = 0;
    let tenantsWithBrokenChain = 0;

    for (const tenant of tenants) {
      const checkStart = Date.now();
      const result = await this.auditLogsService.verifyIntegrity(tenant.id);
      const checkDuration = Date.now() - checkStart;

      const checkResult: IntegrityCheckResult = {
        tenantId: tenant.id,
        tenantName: tenant.name,
        valid: result.valid,
        totalRecords: result.totalRecords,
        verifiedRecords: result.verifiedRecords,
        brokenAt: result.brokenAt,
        checkDuration,
        checkedAt: new Date(),
      };

      results.push(checkResult);
      totalRecordsVerified += result.verifiedRecords;

      if (result.valid) {
        tenantsWithValidChain++;
      } else {
        tenantsWithBrokenChain++;
      }
    }

    const totalDuration = Date.now() - startTime;

    return {
      totalTenants: tenants.length,
      tenantsChecked: tenants.length,
      tenantsWithValidChain,
      tenantsWithBrokenChain,
      totalRecordsVerified,
      totalDuration,
      completedAt: new Date(),
      results,
    };
  }

  /**
   * Verify hash chain integrity for a specific tenant
   */
  async verifyTenantChain(
    tenantId: string,
    startId?: string,
    endId?: string,
  ): Promise<IntegrityCheckResult> {
    const startTime = Date.now();

    // Get tenant name for reporting
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      select: ['id', 'name'],
    });

    const result = await this.auditLogsService.verifyIntegrity(
      tenantId,
      startId,
      endId,
    );

    const checkDuration = Date.now() - startTime;

    return {
      tenantId,
      tenantName: tenant?.name,
      valid: result.valid,
      totalRecords: result.totalRecords,
      verifiedRecords: result.verifiedRecords,
      brokenAt: result.brokenAt,
      checkDuration,
      checkedAt: new Date(),
    };
  }

  /**
   * Get the last verification report
   */
  getLastVerificationReport(): IntegrityReportSummary | null {
    return this.lastVerificationReport;
  }

  /**
   * Emit an integrity alert for external systems to consume
   * This can be extended to send notifications via webhooks, SIEM, etc.
   */
  private emitIntegrityAlert(report: IntegrityReportSummary): void {
    // Log as a structured alert that can be picked up by log aggregators
    this.logger.error(
      JSON.stringify({
        alertType: 'AUDIT_LOG_INTEGRITY_FAILURE',
        severity: 'CRITICAL',
        tenantsAffected: report.tenantsWithBrokenChain,
        totalTenantsChecked: report.tenantsChecked,
        timestamp: report.completedAt.toISOString(),
        brokenChains: report.results
          .filter((r) => !r.valid)
          .map((r) => ({
            tenantId: r.tenantId,
            tenantName: r.tenantName,
            brokenAtId: r.brokenAt?.id,
          })),
      }),
    );

    // TODO: In production, this could also:
    // - Send webhook notifications
    // - Create SIEM alerts
    // - Send email to security team
    // - Create incident tickets
  }

  /**
   * Get audit log statistics for monitoring
   */
  async getAuditLogStats(): Promise<{
    totalRecords: number;
    recordsByTenant: { tenantId: string; count: number }[];
    oldestRecord: Date | null;
    newestRecord: Date | null;
  }> {
    const totalRecords = await this.auditLogRepository.count();

    const recordsByTenant = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.tenantId', 'tenantId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.tenantId')
      .getRawMany();

    const oldestRecord = await this.auditLogRepository.findOne({
      order: { createdAt: 'ASC' },
      select: ['createdAt'],
    });

    const newestRecord = await this.auditLogRepository.findOne({
      order: { createdAt: 'DESC' },
      select: ['createdAt'],
    });

    return {
      totalRecords,
      recordsByTenant: recordsByTenant.map((r) => ({
        tenantId: r.tenantId,
        count: parseInt(r.count, 10),
      })),
      oldestRecord: oldestRecord?.createdAt || null,
      newestRecord: newestRecord?.createdAt || null,
    };
  }
}
