export interface WelcomeEmailData {
  to: string;
  name: string;
  companyName: string;
  planName: string;
  loginUrl: string;
}

export interface PaymentFailedEmailData {
  to: string;
  companyName: string;
  updatePaymentUrl: string;
}

export interface InviteUserEmailData {
  to: string;
  tenantName: string;
  inviterName: string;
  inviterEmail: string;
  role: string;
  message?: string;
  inviteUrl: string;
  expiresAt: Date;
}

export interface ScheduledReportEmailData {
  to: string;
  reportName: string;
  tenantName: string;
  reportPeriod: string;
  summary: {
    totalQueries: number;
    blockedQueries: number;
    threatBlocks: number;
    topBlockedDomains: string[];
  };
  reportUrl: string;
  attachmentBuffer?: Buffer;
  attachmentFilename?: string;
  attachmentContentType?: string;
}

export interface FamilyInviteEmailData {
  to: string;
  familyName: string;
  inviterName: string;
  inviterEmail: string;
  inviteUrl: string;
  expiresAt: Date;
}

export interface MspWelcomeEmailData {
  to: string;
  adminName: string;
  mspName: string;
  tempPassword: string;
  loginUrl: string;
}

export interface AdminInviteEmailData {
  to: string;
  inviterName: string;
  inviterEmail: string;
  role: string;
  inviteUrl: string;
  expiresAt: Date;
}

export interface MfaResetNotificationData {
  to: string;
  name: string;
  resetByEmail: string;
  loginUrl: string;
}

export interface GracePeriodNotificationData {
  to: string;
  companyName: string;
  daysRemaining: number;
  updatePaymentUrl: string;
}

export interface GracePeriodDailyReminderData {
  to: string;
  companyName: string;
  daysRemaining: number;
  clientCount: number;
  updatePaymentUrl: string;
}

export interface ClientGracePeriodNotificationData {
  to: string;
  clientName: string;
  mspName: string;
  mspContactEmail?: string;
  daysRemaining: number;
}

export interface SuspensionNotificationData {
  to: string;
  companyName: string;
  updatePaymentUrl: string;
}
