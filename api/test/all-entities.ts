// Nebula DNS - All TypeORM Entities for Integration Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Provides all entity classes so integration test TypeORM modules satisfy
// the full entity relation graph without needing per-test entity lists.

import { Admin } from '../src/modules/admin/entities/admin.entity';
import { AdminActivityLog } from '../src/modules/admin/entities/admin-activity-log.entity';
import { AdminInvitation } from '../src/modules/admin/entities/admin-invitation.entity';
import { AdminMfa } from '../src/modules/admin/entities/admin-mfa.entity';
import { AgentInstallation } from '../src/modules/agents/entities/agent-installation.entity';
import { AlertConfig } from '../src/modules/alerting/entities/alert-config.entity';
import { ApiKey } from '../src/modules/api-keys/entities/api-key.entity';
import { ApiKeyUsage } from '../src/modules/api-keys/entities/api-key-usage.entity';
import { AuditLog } from '../src/modules/audit-logs/entities/audit-log.entity';
import { DnsPlatformConnection } from '../src/modules/dns-management/entities/dns-platform-connection.entity';
import { DnsZoneAssignment } from '../src/modules/dns-management/entities/dns-zone-assignment.entity';
import { AccessRequest } from '../src/modules/block-pages/entities/access-request.entity';
import { BlockPage } from '../src/modules/block-pages/entities/block-page.entity';
import { FamilyInvitation } from '../src/modules/family/entities/family-invitation.entity';
import { FamilyMember } from '../src/modules/family/entities/family-member.entity';
import { UserGroup } from '../src/modules/groups/entities/group.entity';
import { Invitation } from '../src/modules/invitations/entities/invitation.entity';
import { CustomList } from '../src/modules/lists/entities/custom-list.entity';
import { CustomListEntry } from '../src/modules/lists/entities/custom-list-entry.entity';
import { Location } from '../src/modules/locations/entities/location.entity';
import { LocationToken } from '../src/modules/locations/entities/location-token.entity';
import { MfaBackupCode } from '../src/modules/mfa/entities/mfa-backup-code.entity';
import { UserMfa } from '../src/modules/mfa/entities/user-mfa.entity';
import { MspInvoice } from '../src/modules/msp-billing/entities/msp-invoice.entity';
import { MspPurchase } from '../src/modules/msp-billing/entities/msp-purchase.entity';
import { MspSubscription } from '../src/modules/msp-billing/entities/msp-subscription.entity';
import { MspUsage } from '../src/modules/msp-billing/entities/msp-usage.entity';
import { QueryBundle } from '../src/modules/msp-billing/entities/query-bundle.entity';
import { MspClient } from '../src/modules/msp-clients/entities/msp-client.entity';
import {
  MspTemplate,
  MspTemplateDeployment,
} from '../src/modules/msp/entities/msp-template.entity';
import { MspTemplateVersion } from '../src/modules/msp/entities/msp-template-version.entity';
import { ClientTemplateApplication } from '../src/modules/msp/entities/client-template-application.entity';
import { TemplateApplyJob } from '../src/modules/msp/entities/template-apply-job.entity';
import { OnboardingProgress } from '../src/modules/onboarding/entities/onboarding-progress.entity';
import { Playbook } from '../src/modules/playbooks/entities/playbook.entity';
import { Policy } from '../src/modules/policies/entities/policy.entity';
import { PolicyVersion } from '../src/modules/policies/entities/policy-version.entity';
import { ReportHistory } from '../src/modules/scheduled-reports/entities/report-history.entity';
import { ScheduledReport } from '../src/modules/scheduled-reports/entities/scheduled-report.entity';
import { SiemIntegration } from '../src/modules/siem/entities/siem-integration.entity';
import { SsoConfiguration } from '../src/modules/sso/entities/sso-configuration.entity';
import { SubscriptionPlanLimit } from '../src/modules/subscription-plans/entities/subscription-plan-limit.entity';
import { SignupRequest } from '../src/modules/subscriptions/entities/signup-request.entity';
import { SubscriptionPlan } from '../src/modules/subscriptions/entities/subscription-plan.entity';
import { Subscription } from '../src/modules/subscriptions/entities/subscription.entity';
import { Tenant } from '../src/modules/tenants/entities/tenant.entity';
import { TrialHistory } from '../src/modules/trials/entities/trial-history.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { Webhook } from '../src/modules/webhooks/entities/webhook.entity';
import { WebhookDelivery } from '../src/modules/webhooks/entities/webhook-delivery.entity';
import { WebhookIdempotencyKey } from '../src/modules/webhooks/entities/webhook-idempotency.entity';

export const ALL_TEST_ENTITIES = [
  Admin,
  AdminActivityLog,
  AdminInvitation,
  AdminMfa,
  AgentInstallation,
  AlertConfig,
  ApiKey,
  ApiKeyUsage,
  AuditLog,
  DnsPlatformConnection,
  DnsZoneAssignment,
  AccessRequest,
  BlockPage,
  FamilyInvitation,
  FamilyMember,
  UserGroup,
  Invitation,
  CustomList,
  CustomListEntry,
  Location,
  LocationToken,
  MfaBackupCode,
  UserMfa,
  MspInvoice,
  MspPurchase,
  MspSubscription,
  MspUsage,
  QueryBundle,
  MspClient,
  MspTemplate,
  MspTemplateDeployment,
  MspTemplateVersion,
  ClientTemplateApplication,
  TemplateApplyJob,
  OnboardingProgress,
  Playbook,
  Policy,
  PolicyVersion,
  ReportHistory,
  ScheduledReport,
  SiemIntegration,
  SsoConfiguration,
  SubscriptionPlanLimit,
  SignupRequest,
  SubscriptionPlan,
  Subscription,
  Tenant,
  TrialHistory,
  User,
  Webhook,
  WebhookDelivery,
  WebhookIdempotencyKey,
];
