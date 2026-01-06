import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogsService } from './audit-logs.service';
import { AuditAction, AuditResourceType } from './entities/audit-log.entity';

export const AUDIT_LOG_KEY = 'audit_log';

export interface AuditLogMetadata {
  action: AuditAction;
  resourceType: AuditResourceType;
  getResourceId?: (req: any, result: any) => string | null;
  getResourceName?: (req: any, result: any) => string | null;
  getOldValue?: (req: any) => Record<string, any> | null;
  getNewValue?: (req: any, result: any) => Record<string, any> | null;
}

// Decorator to mark controllers/methods for audit logging
export const AuditLog = (metadata: AuditLogMetadata) => SetMetadata(AUDIT_LOG_KEY, metadata);

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly auditLogsService: AuditLogsService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = this.reflector.get<AuditLogMetadata>(AUDIT_LOG_KEY, context.getHandler());

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;
    const userId = request.user?.id;
    const ipAddress = request.ip || request.connection?.remoteAddress;
    const userAgent = request.headers['user-agent'];

    // Capture old value before the action (for updates/deletes)
    const oldValue = metadata.getOldValue ? metadata.getOldValue(request) : null;

    return next.handle().pipe(
      tap(async (result) => {
        try {
          const resourceId = metadata.getResourceId
            ? metadata.getResourceId(request, result)
            : request.params?.id || result?.data?.id || result?.id;

          const resourceName = metadata.getResourceName
            ? metadata.getResourceName(request, result)
            : result?.data?.name || result?.name;

          const newValue = metadata.getNewValue
            ? metadata.getNewValue(request, result)
            : metadata.action === 'create' || metadata.action === 'update'
              ? request.body
              : null;

          await this.auditLogsService.log({
            tenantId,
            userId,
            action: metadata.action,
            resourceType: metadata.resourceType,
            resourceId,
            resourceName,
            oldValue,
            newValue,
            ipAddress,
            userAgent,
          });
        } catch (error) {
          // Don't fail the request if audit logging fails
          console.error('Audit logging failed:', error);
        }
      }),
    );
  }
}

