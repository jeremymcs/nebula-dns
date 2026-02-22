// Nebula DNS - Encryption Alert Service Unit Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  EncryptionAlertService,
  DecryptionFailureContext,
} from './encryption-alert.service';
import { EncryptionError } from '../utils/encryption.util';

describe('EncryptionAlertService', () => {
  let service: EncryptionAlertService;

  beforeEach(() => {
    service = new EncryptionAlertService();
  });

  afterEach(() => {
    service.resetStats();
  });

  describe('reportDecryptionFailure', () => {
    it('should log and track decryption failures', () => {
      const error = new Error('Decryption failed');
      const context: DecryptionFailureContext = {
        service: 'MfaService',
        operation: 'verifyMfaCode',
        entityType: 'mfa_secret',
        entityId: 'user-123',
      };

      service.reportDecryptionFailure(error, context);

      const stats = service.getStats();
      expect(stats.totalAlerts).toBe(1);
      expect(stats.alertsByService['MfaService']).toBe(1);
      expect(stats.alertsBySeverity['error']).toBe(1);
      expect(stats.alertsByEntityType['mfa_secret']).toBe(1);
      expect(stats.lastAlertAt).not.toBeNull();
    });

    it('should handle EncryptionError with context', () => {
      const error = new EncryptionError(
        'Data may be corrupted',
        'decrypt',
        false,
      );
      const context: DecryptionFailureContext = {
        service: 'SsoService',
        operation: 'decryptClientSecret',
        entityType: 'oidc_client_secret',
        entityId: 'tenant-456',
      };

      service.reportDecryptionFailure(error, context);

      const stats = service.getStats();
      expect(stats.totalAlerts).toBe(1);
      expect(stats.alertsByService['SsoService']).toBe(1);
    });

    it('should respect custom severity levels', () => {
      const error = new Error('Test error');
      const context: DecryptionFailureContext = {
        service: 'TestService',
        operation: 'testOp',
        entityType: 'test_entity',
      };

      service.reportDecryptionFailure(error, context, 'warning');

      const stats = service.getStats();
      expect(stats.alertsBySeverity['warning']).toBe(1);
      expect(stats.alertsBySeverity['error']).toBe(0);
    });

    it('should include metadata in context', () => {
      const handlerMock = jest.fn();
      service.registerAlertHandler(handlerMock);

      const error = new Error('Test error');
      const context: DecryptionFailureContext = {
        service: 'SiemService',
        operation: 'testSplunk',
        entityType: 'siem_credential',
        entityId: 'integration-789',
        metadata: {
          integrationType: 'splunk',
          retryCount: 3,
        },
      };

      service.reportDecryptionFailure(error, context);

      expect(handlerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            metadata: {
              integrationType: 'splunk',
              retryCount: 3,
            },
          }),
        }),
      );
    });
  });

  describe('reportMigrationFailure', () => {
    it('should log migration failures with warning severity', () => {
      const error = new Error('Migration failed');
      const context: DecryptionFailureContext = {
        service: 'MfaService',
        operation: 'reEncryptIfLegacy',
        entityType: 'mfa_secret',
        entityId: 'user-123',
      };

      service.reportMigrationFailure(error, context);

      const stats = service.getStats();
      expect(stats.totalAlerts).toBe(1);
      expect(stats.alertsBySeverity['warning']).toBe(1);
    });

    it('should set isLegacyFormat flag', () => {
      const handlerMock = jest.fn();
      service.registerAlertHandler(handlerMock);

      const error = new Error('Migration failed');
      const context: DecryptionFailureContext = {
        service: 'MfaService',
        operation: 'reEncryptIfLegacy',
        entityType: 'mfa_secret',
      };

      service.reportMigrationFailure(error, context);

      expect(handlerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          alertType: 'migration_failure',
          context: expect.objectContaining({
            isLegacyFormat: true,
          }),
        }),
      );
    });
  });

  describe('reportKeyError', () => {
    it('should log key errors with critical severity', () => {
      const error = new Error('Encryption key not configured');

      service.reportKeyError(error, 'MfaService');

      const stats = service.getStats();
      expect(stats.totalAlerts).toBe(1);
      expect(stats.alertsBySeverity['critical']).toBe(1);
      expect(stats.alertsByService['MfaService']).toBe(1);
    });

    it('should set correct alert type', () => {
      const handlerMock = jest.fn();
      service.registerAlertHandler(handlerMock);

      const error = new Error('Key error');
      service.reportKeyError(error, 'SsoService');

      expect(handlerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          alertType: 'key_error',
          severity: 'critical',
        }),
      );
    });
  });

  describe('registerAlertHandler', () => {
    it('should call registered handlers on alert', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      service.registerAlertHandler(handler1);
      service.registerAlertHandler(handler2);

      const error = new Error('Test error');
      service.reportDecryptionFailure(error, {
        service: 'TestService',
        operation: 'test',
        entityType: 'test',
      });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should pass correct payload to handlers', () => {
      const handler = jest.fn();
      service.registerAlertHandler(handler);

      const error = new Error('Test error message');
      const context: DecryptionFailureContext = {
        service: 'MfaService',
        operation: 'verifyMfaCode',
        entityType: 'mfa_secret',
        entityId: 'user-123',
      };

      service.reportDecryptionFailure(error, context, 'error');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          alertType: 'decryption_failure',
          errorMessage: 'Test error message',
          context: expect.objectContaining({
            service: 'MfaService',
            operation: 'verifyMfaCode',
            entityType: 'mfa_secret',
            entityId: 'user-123',
          }),
        }),
      );
    });

    it('should continue if a handler throws an error', () => {
      const failingHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler failed');
      });
      const successHandler = jest.fn();

      service.registerAlertHandler(failingHandler);
      service.registerAlertHandler(successHandler);

      const error = new Error('Test');
      service.reportDecryptionFailure(error, {
        service: 'Test',
        operation: 'test',
        entityType: 'test',
      });

      expect(failingHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return a copy of stats', () => {
      const error = new Error('Test');
      service.reportDecryptionFailure(error, {
        service: 'Test',
        operation: 'test',
        entityType: 'test',
      });

      const stats1 = service.getStats();
      const stats2 = service.getStats();

      expect(stats1).toEqual(stats2);
      expect(stats1).not.toBe(stats2); // Should be a copy
    });

    it('should track multiple services separately', () => {
      const error = new Error('Test');

      service.reportDecryptionFailure(error, {
        service: 'MfaService',
        operation: 'test',
        entityType: 'mfa_secret',
      });
      service.reportDecryptionFailure(error, {
        service: 'SsoService',
        operation: 'test',
        entityType: 'oidc_client_secret',
      });
      service.reportDecryptionFailure(error, {
        service: 'MfaService',
        operation: 'test',
        entityType: 'mfa_secret',
      });

      const stats = service.getStats();
      expect(stats.totalAlerts).toBe(3);
      expect(stats.alertsByService['MfaService']).toBe(2);
      expect(stats.alertsByService['SsoService']).toBe(1);
    });
  });

  describe('resetStats', () => {
    it('should reset all statistics', () => {
      const error = new Error('Test');
      service.reportDecryptionFailure(error, {
        service: 'Test',
        operation: 'test',
        entityType: 'test',
      });

      service.resetStats();

      const stats = service.getStats();
      expect(stats.totalAlerts).toBe(0);
      expect(stats.alertsByService).toEqual({});
      expect(stats.alertsBySeverity).toEqual({
        warning: 0,
        error: 0,
        critical: 0,
      });
      expect(stats.alertsByEntityType).toEqual({});
      expect(stats.lastAlertAt).toBeNull();
    });
  });
});
