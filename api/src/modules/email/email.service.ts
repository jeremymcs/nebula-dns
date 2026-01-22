import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

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

export interface PasswordResetEmailData {
  to: string;
  name: string;
  resetUrl: string;
}

export interface EmailVerificationData {
  to: string;
  name: string;
  verificationUrl: string;
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

// Phase 19: Admin User Management Email Data Interfaces
export interface AdminInviteEmailData {
  to: string;                    // Invitee email
  inviterName: string;           // Name of admin who sent invite
  inviterEmail: string;          // Email of admin who sent invite
  role: string;                  // Assigned role (Super Admin, Admin, Viewer)
  inviteUrl: string;             // Full URL with token
  expiresAt: Date;               // When invitation expires
}

export interface MfaResetNotificationData {
  to: string;                    // Admin whose MFA was reset
  name: string;                  // Admin's name
  resetByEmail: string;          // Email of admin who performed reset
  loginUrl: string;              // Admin login URL
}

// US-028: Grace Period Email Data Interfaces
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

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly docsUrl: string;
  private readonly sendgridApiKey: string;
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    this.fromEmail = this.configService.get(
      'EMAIL_FROM_ADDRESS',
      'noreply@nebuladns.com',
    );
    this.fromName = this.configService.get('EMAIL_FROM_NAME', 'Nebula DNS');
    this.docsUrl = this.configService.get(
      'DOCS_URL',
      'https://docs.nebuladns.com',
    );
    this.sendgridApiKey = this.configService.get('SENDGRID_API_KEY', '');
  }

  onModuleInit() {
    if (this.sendgridApiKey) {
      sgMail.setApiKey(this.sendgridApiKey);
      this.isConfigured = true;
      this.logger.log('SendGrid email service initialized');
    } else {
      this.logger.warn(
        'SendGrid API key not configured - emails will be logged only',
      );
    }
  }

  private async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
  ): Promise<boolean> {
    if (!this.isConfigured) {
      // Development mode - log the email
      this.logger.log(`[DEV] Email to: ${to}`);
      this.logger.log(`[DEV] Subject: ${subject}`);
      this.logger.log(
        `[DEV] Content preview: ${(textContent || htmlContent).substring(0, 200)}...`,
      );
      return true;
    }

    try {
      const msg = {
        to,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject,
        text: textContent || this.stripHtml(htmlContent),
        html: htmlContent,
      };

      await sgMail.send(msg);
      this.logger.log(`Email sent successfully to ${to}`);
      return true;
    } catch (error: any) {
      this.logger.error(
        `Failed to send email to ${to}:`,
        error?.response?.body || error,
      );
      return false;
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    const subject = `Welcome to Nebula DNS, ${data.name}!`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Nebula DNS</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Nebula DNS!</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="font-size: 16px;">Hi ${data.name},</p>
    
    <p style="font-size: 16px;">
      Thank you for signing up <strong>${data.companyName}</strong> for Nebula DNS! 
      Your account is now active on the <strong>${data.planName}</strong> plan.
    </p>
    
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #e5e7eb;">
      <h3 style="color: #667eea; margin-top: 0;">Getting Started</h3>
      <ol style="padding-left: 20px;">
        <li style="margin-bottom: 10px;">Log in to your dashboard to configure your DNS security policies</li>
        <li style="margin-bottom: 10px;">Set up your first network location and generate DNS tokens</li>
        <li style="margin-bottom: 10px;">Configure your devices to use Nebula DNS servers</li>
        <li style="margin-bottom: 10px;">Monitor your DNS traffic and security events</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.loginUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Access Your Dashboard
      </a>
    </div>
    
    <div style="background: #eff6ff; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #1e40af;">
        <strong>Need help?</strong> Our documentation is available at <a href="${this.docsUrl}" style="color: #1e40af;">${this.docsUrl}</a>
        or contact our support team for assistance.
      </p>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
    
    <p style="font-size: 14px; color: #6b7280; text-align: center;">
      This email was sent by Nebula DNS<br>
      If you didn't sign up for this account, please ignore this email.
    </p>
  </div>
</body>
</html>`;

    const textContent = `
Welcome to Nebula DNS, ${data.name}!

Thank you for signing up ${data.companyName} for Nebula DNS! 
Your account is now active on the ${data.planName} plan.

Getting Started:
1. Log in to your dashboard to configure your DNS security policies
2. Set up your first network location and generate DNS tokens
3. Configure your devices to use Nebula DNS servers
4. Monitor your DNS traffic and security events

Access your dashboard: ${data.loginUrl}

Need help? Our documentation is available at ${this.docsUrl}

This email was sent by Nebula DNS.
If you didn't sign up for this account, please ignore this email.
`;

    return this.sendEmail(data.to, subject, htmlContent, textContent);
  }

  async sendPaymentFailedEmail(data: PaymentFailedEmailData): Promise<boolean> {
    const subject = `Action Required: Payment Failed for ${data.companyName}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Failed</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 30px;">
    <h2 style="color: #dc2626; margin-top: 0;">Payment Failed</h2>
    
    <p>We were unable to process your payment for <strong>${data.companyName}</strong>'s Nebula DNS subscription.</p>
    
    <p>To avoid any interruption to your service, please update your payment information as soon as possible.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.updatePaymentUrl}" style="background: #dc2626; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Update Payment Method
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280;">
      If you believe this is an error or need assistance, please contact our support team.
    </p>
  </div>
</body>
</html>`;

    return this.sendEmail(data.to, subject, htmlContent);
  }

  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
    const subject = 'Reset Your Nebula DNS Password';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Reset</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 30px;">
    <h2 style="color: #667eea; margin-top: 0;">Reset Your Password</h2>
    
    <p>Hi ${data.name},</p>
    
    <p>We received a request to reset your Nebula DNS password. Click the button below to create a new password:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Reset Password
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280;">
      This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.
    </p>
  </div>
</body>
</html>`;

    return this.sendEmail(data.to, subject, htmlContent);
  }

  async sendEmailVerification(data: EmailVerificationData): Promise<boolean> {
    const subject = 'Verify Your Nebula DNS Email Address';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Email Verification</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 30px;">
    <h2 style="color: #667eea; margin-top: 0;">Verify Your Email</h2>
    
    <p>Hi ${data.name},</p>
    
    <p>Please verify your email address to complete your Nebula DNS account setup:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Verify Email
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280;">
      This link will expire in 24 hours.
    </p>
  </div>
</body>
</html>`;

    return this.sendEmail(data.to, subject, htmlContent);
  }

  async sendInviteUserEmail(data: InviteUserEmailData): Promise<boolean> {
    const subject = `You've been invited to join ${data.tenantName} on Nebula DNS`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Team Invitation</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 30px;">
    <h2 style="color: #667eea; margin-top: 0;">You're Invited!</h2>
    
    <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.tenantName}</strong> on Nebula DNS.</p>
    
    <p>Nebula DNS provides enterprise-grade DNS security and content filtering to protect your network.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.inviteUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Accept Invitation
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280;">
      This invitation will expire in 7 days.
    </p>
  </div>
</body>
</html>`;

    return this.sendEmail(data.to, subject, htmlContent);
  }

  async sendScheduledReportEmail(
    data: ScheduledReportEmailData,
  ): Promise<boolean> {
    const subject = `${data.reportName} - ${data.reportPeriod}`;

    const topBlockedList = data.summary.topBlockedDomains
      .map((d, i) => `<li>${i + 1}. ${d}</li>`)
      .join('');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Scheduled Report</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${data.reportName}</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${data.tenantName} - ${data.reportPeriod}</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
    <h3 style="color: #667eea; margin-top: 0;">Summary</h3>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px;">
      <div style="background: white; border-radius: 8px; padding: 15px; text-align: center; border: 1px solid #e5e7eb;">
        <div style="font-size: 24px; font-weight: bold; color: #667eea;">${data.summary.totalQueries.toLocaleString()}</div>
        <div style="font-size: 12px; color: #6b7280;">Total Queries</div>
      </div>
      <div style="background: white; border-radius: 8px; padding: 15px; text-align: center; border: 1px solid #e5e7eb;">
        <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${data.summary.blockedQueries.toLocaleString()}</div>
        <div style="font-size: 12px; color: #6b7280;">Blocked</div>
      </div>
      <div style="background: white; border-radius: 8px; padding: 15px; text-align: center; border: 1px solid #e5e7eb;">
        <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${data.summary.threatBlocks.toLocaleString()}</div>
        <div style="font-size: 12px; color: #6b7280;">Threats</div>
      </div>
    </div>

    ${
      data.summary.topBlockedDomains.length > 0
        ? `
    <h4 style="color: #374151;">Top Blocked Domains</h4>
    <ol style="padding-left: 20px; margin: 0;">
      ${topBlockedList}
    </ol>
    `
        : ''
    }

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.reportUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        View Full Report
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">

    <p style="font-size: 12px; color: #6b7280; text-align: center;">
      This is an automated report from Nebula DNS.<br>
      To manage your report settings, visit your dashboard.
    </p>
  </div>
</body>
</html>`;

    // If there's an attachment, we need to use a different send method
    if (data.attachmentBuffer && data.attachmentFilename) {
      return this.sendEmailWithAttachment(
        data.to,
        subject,
        htmlContent,
        data.attachmentBuffer,
        data.attachmentFilename,
      );
    }

    return this.sendEmail(data.to, subject, htmlContent);
  }

  // US-028: Grace Period Notification Email
  async sendGracePeriodNotification(
    data: GracePeriodNotificationData,
  ): Promise<boolean> {
    const subject = `Action Required: Your subscription is past due - ${data.daysRemaining} days remaining`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Subscription Grace Period</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #fef3cd; border: 1px solid #ffc107; border-radius: 10px; padding: 30px;">
    <h2 style="color: #856404; margin-top: 0;">Subscription Payment Required</h2>

    <p>Your payment for <strong>${data.companyName}</strong>'s Nebula DNS subscription is past due.</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #ffc107; text-align: center;">
      <div style="font-size: 48px; font-weight: bold; color: #dc3545;">${data.daysRemaining}</div>
      <div style="font-size: 14px; color: #6c757d;">days remaining</div>
    </div>

    <p style="color: #856404;">If payment is not received within <strong>${data.daysRemaining} days</strong>, your account and all managed client accounts will be suspended.</p>

    <p style="color: #856404;">When suspended:</p>
    <ul style="color: #856404;">
      <li>DNS resolution will be blocked for all networks</li>
      <li>Your clients will see a service suspended message</li>
      <li>All policy enforcement will stop</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.updatePaymentUrl}" style="background: #dc3545; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Update Payment Now
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280;">
      If you believe this is an error or need assistance, please contact our support team.
    </p>
  </div>
</body>
</html>`;

    return this.sendEmail(data.to, subject, htmlContent);
  }

  // US-028: Grace Period Daily Reminder Email for MSPs
  async sendGracePeriodDailyReminder(
    data: GracePeriodDailyReminderData,
  ): Promise<boolean> {
    const subject = `Reminder: ${data.daysRemaining} days until service suspension - ${data.companyName}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Grace Period Reminder</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 10px; padding: 30px;">
    <h2 style="color: #856404; margin-top: 0;">Daily Reminder: Payment Required</h2>

    <p>This is your daily reminder that <strong>${data.companyName}</strong>'s subscription payment is overdue.</p>

    <div style="display: flex; justify-content: space-around; margin: 25px 0;">
      <div style="background: white; border-radius: 8px; padding: 20px; text-align: center; border: 1px solid #ffc107; flex: 1; margin: 0 10px;">
        <div style="font-size: 36px; font-weight: bold; color: #dc3545;">${data.daysRemaining}</div>
        <div style="font-size: 12px; color: #6c757d;">Days Remaining</div>
      </div>
      <div style="background: white; border-radius: 8px; padding: 20px; text-align: center; border: 1px solid #ffc107; flex: 1; margin: 0 10px;">
        <div style="font-size: 36px; font-weight: bold; color: #495057;">${data.clientCount}</div>
        <div style="font-size: 12px; color: #6c757d;">Clients Affected</div>
      </div>
    </div>

    <p style="color: #856404;"><strong>Important:</strong> When the grace period ends, DNS protection will be disabled for all ${data.clientCount} client organizations.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.updatePaymentUrl}" style="background: #28a745; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Update Payment Method
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #ffc107; margin: 25px 0;">

    <p style="font-size: 12px; color: #6b7280; text-align: center;">
      This is an automated reminder from Nebula DNS.
    </p>
  </div>
</body>
</html>`;

    return this.sendEmail(data.to, subject, htmlContent);
  }

  // US-028: Client Grace Period Notification
  async sendClientGracePeriodNotification(
    data: ClientGracePeriodNotificationData,
  ): Promise<boolean> {
    const subject = `Notice: DNS service ending in ${data.daysRemaining} days - ${data.clientName}`;

    const contactSection = data.mspContactEmail
      ? `<p style="font-size: 14px; color: #495057;">Contact your service provider: <a href="mailto:${data.mspContactEmail}" style="color: #007bff;">${data.mspContactEmail}</a></p>`
      : '';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Service Notice</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 10px; padding: 30px;">
    <h2 style="color: #856404; margin-top: 0;">Important Service Notice</h2>

    <p>This is a notice regarding your DNS security service for <strong>${data.clientName}</strong>.</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #ffc107;">
      <p style="margin: 0; font-size: 16px; color: #495057;">
        Your managed service provider <strong>${data.mspName}</strong> has a billing issue that may affect your service.
      </p>
      <p style="margin: 15px 0 0 0; font-size: 24px; font-weight: bold; color: #dc3545; text-align: center;">
        Service ending in ${data.daysRemaining} days
      </p>
    </div>

    <p style="color: #856404;">If this issue is not resolved, your DNS security protection will be suspended. Please contact your service provider for more information.</p>

    ${contactSection}

    <hr style="border: none; border-top: 1px solid #ffc107; margin: 25px 0;">

    <p style="font-size: 12px; color: #6b7280; text-align: center;">
      This notice was sent by Nebula DNS on behalf of ${data.mspName}.
    </p>
  </div>
</body>
</html>`;

    return this.sendEmail(data.to, subject, htmlContent);
  }

  // US-028: Suspension Notification
  async sendSuspensionNotification(
    data: SuspensionNotificationData,
  ): Promise<boolean> {
    const subject = `Service Suspended: ${data.companyName}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Service Suspended</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 10px; padding: 30px;">
    <h2 style="color: #721c24; margin-top: 0;">Service Suspended</h2>

    <p>Your Nebula DNS subscription for <strong>${data.companyName}</strong> has been suspended due to non-payment.</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #f5c6cb;">
      <h4 style="color: #721c24; margin-top: 0;">What this means:</h4>
      <ul style="color: #721c24; margin: 0; padding-left: 20px;">
        <li>DNS resolution is blocked for all networks</li>
        <li>All client organizations are suspended</li>
        <li>Users will see a "service suspended" message</li>
        <li>No DNS queries will be processed</li>
      </ul>
    </div>

    <p style="color: #721c24;">To restore service immediately, please update your payment information:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.updatePaymentUrl}" style="background: #28a745; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Restore Service Now
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280;">
      Service will be restored immediately upon successful payment. If you need assistance, please contact our support team.
    </p>
  </div>
</body>
</html>`;

    return this.sendEmail(data.to, subject, htmlContent);
  }

  async sendFamilyInviteEmail(data: FamilyInviteEmailData): Promise<boolean> {
    const subject = `You've been invited to join ${data.familyName} on Nebula DNS`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Family Invitation</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="font-size: 16px;"><strong>${data.inviterName}</strong> has invited you to join the <strong>${data.familyName}</strong> family on Nebula DNS.</p>

    <p style="font-size: 16px;">As a family member, you'll be able to:</p>
    <ul style="font-size: 14px; color: #4b5563;">
      <li>View the family dashboard and protection status</li>
      <li>See current filtering policies</li>
      <li>Manage safe search settings for your devices</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.inviteUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Accept Invitation
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280;">
      This invitation will expire in 7 days.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">

    <p style="font-size: 12px; color: #6b7280; text-align: center;">
      If you didn't expect this invitation, you can safely ignore this email.
    </p>
  </div>
</body>
</html>`;

    return this.sendEmail(data.to, subject, htmlContent);
  }

  async sendMspWelcomeEmail(data: MspWelcomeEmailData): Promise<boolean> {
    const subject = 'Welcome to Nebula DNS - Your MSP Account is Ready';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Nebula DNS</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Nebula DNS!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your MSP Account is Ready</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="font-size: 16px;">Hi ${data.adminName},</p>

    <p style="font-size: 16px;">
      Your MSP account for <strong>${data.mspName}</strong> has been created and is ready to use.
      You can now manage DNS security for all your client organizations from a single dashboard.
    </p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #e5e7eb;">
      <h3 style="color: #667eea; margin-top: 0;">Your Login Credentials</h3>
      <p style="margin: 10px 0;">
        <strong>Email:</strong> ${data.to}
      </p>
      <p style="margin: 10px 0;">
        <strong>Temporary Password:</strong>
        <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${data.tempPassword}</code>
      </p>
      <p style="margin: 15px 0 0 0; font-size: 14px; color: #dc2626; font-weight: 500;">
        You will be required to change this password on first login.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.loginUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Log In to Your Dashboard
      </a>
    </div>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #e5e7eb;">
      <h3 style="color: #667eea; margin-top: 0;">Getting Started</h3>
      <ol style="padding-left: 20px; margin: 0;">
        <li style="margin-bottom: 10px;">Log in and change your password</li>
        <li style="margin-bottom: 10px;">Configure your MSP profile and branding</li>
        <li style="margin-bottom: 10px;">Create your first client organization</li>
        <li style="margin-bottom: 10px;">Set up policy templates for easy client deployment</li>
      </ol>
    </div>

    <div style="background: #eff6ff; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #1e40af;">
        <strong>Need help?</strong> Visit our documentation at <a href="${this.docsUrl}" style="color: #1e40af;">${this.docsUrl}</a>
        or contact our support team for assistance.
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">

    <p style="font-size: 14px; color: #6b7280; text-align: center;">
      <strong>Keep this email secure</strong> - do not share your temporary password.<br>
      This email was sent by Nebula DNS.
    </p>
  </div>
</body>
</html>`;

    const textContent = `
Welcome to Nebula DNS - Your MSP Account is Ready

Hi ${data.adminName},

Your MSP account for ${data.mspName} has been created and is ready to use.
You can now manage DNS security for all your client organizations from a single dashboard.

Your Login Credentials
----------------------
Email: ${data.to}
Temporary Password: ${data.tempPassword}

IMPORTANT: You will be required to change this password on first login.

Log in to your dashboard: ${data.loginUrl}

Getting Started
---------------
1. Log in and change your password
2. Configure your MSP profile and branding
3. Create your first client organization
4. Set up policy templates for easy client deployment

Need help? Visit our documentation at ${this.docsUrl}

Keep this email secure - do not share your temporary password.
This email was sent by Nebula DNS.
`;

    return this.sendEmail(data.to, subject, htmlContent, textContent);
  }

  async sendAdminInviteEmail(data: AdminInviteEmailData): Promise<boolean> {
    const subject = "You've been invited to join Nebula DNS Admin";

    // Format role for display (super_admin -> Super Admin)
    const roleDisplay = data.role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Invitation</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Admin Invitation</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="font-size: 16px;">
      <strong>${data.inviterName}</strong> has invited you to join Nebula DNS as an administrator.
    </p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #e5e7eb;">
      <h3 style="color: #667eea; margin-top: 0;">Your Access Level</h3>
      <p style="margin: 10px 0; font-size: 18px; font-weight: 600; color: #374151;">
        ${roleDisplay}
      </p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #6b7280;">
        You will be able to access Mission Control and manage the Nebula DNS platform.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.inviteUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Accept Invitation
      </a>
    </div>

    <p style="font-size: 14px; color: #dc2626; text-align: center;">
      This invitation expires on ${data.expiresAt.toLocaleDateString()} at ${data.expiresAt.toLocaleTimeString()}.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">

    <p style="font-size: 12px; color: #6b7280; text-align: center;">
      If you didn't expect this invitation, you can safely ignore this email.<br>
      Invited by: ${data.inviterEmail}
    </p>
  </div>
</body>
</html>`;

    const textContent = `
Admin Invitation

${data.inviterName} has invited you to join Nebula DNS as an administrator.

Your Access Level: ${roleDisplay}

Accept your invitation: ${data.inviteUrl}

This invitation expires on ${data.expiresAt.toLocaleDateString()} at ${data.expiresAt.toLocaleTimeString()}.

Invited by: ${data.inviterEmail}
`;

    return this.sendEmail(data.to, subject, htmlContent, textContent);
  }

  async sendMfaResetNotification(data: MfaResetNotificationData): Promise<boolean> {
    const subject = 'Your MFA has been reset - Action Required';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MFA Reset Notification</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #fef3cd; border: 1px solid #ffc107; border-radius: 10px; padding: 30px;">
    <h2 style="color: #856404; margin-top: 0;">MFA Reset Notification</h2>

    <p style="font-size: 16px;">Hi ${data.name},</p>

    <p style="font-size: 16px;">
      Your Multi-Factor Authentication (MFA) has been reset by a Super Admin.
    </p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #ffc107;">
      <h3 style="color: #856404; margin-top: 0;">What this means:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #495057;">
        <li style="margin-bottom: 10px;">Your existing MFA setup has been removed</li>
        <li style="margin-bottom: 10px;">You must set up MFA again on your next login</li>
        <li style="margin-bottom: 10px;">All your active sessions have been ended</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.loginUrl}" style="background: #28a745; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Log In and Set Up MFA
      </a>
    </div>

    <p style="font-size: 14px; color: #856404;">
      <strong>Did you not request this?</strong> If you didn't request an MFA reset,
      please contact your system administrator immediately.
    </p>

    <hr style="border: none; border-top: 1px solid #ffc107; margin: 25px 0;">

    <p style="font-size: 12px; color: #6b7280; text-align: center;">
      Reset performed by: ${data.resetByEmail}<br>
      This is an automated notification from Nebula DNS.
    </p>
  </div>
</body>
</html>`;

    const textContent = `
MFA Reset Notification

Hi ${data.name},

Your Multi-Factor Authentication (MFA) has been reset by a Super Admin.

What this means:
- Your existing MFA setup has been removed
- You must set up MFA again on your next login
- All your active sessions have been ended

Log in and set up MFA: ${data.loginUrl}

Did you not request this? If you didn't request an MFA reset,
please contact your system administrator immediately.

Reset performed by: ${data.resetByEmail}
`;

    return this.sendEmail(data.to, subject, htmlContent, textContent);
  }

  private async sendEmailWithAttachment(
    to: string,
    subject: string,
    htmlContent: string,
    attachmentBuffer: Buffer,
    filename: string,
  ): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.log(`[DEV] Email with attachment to: ${to}`);
      this.logger.log(`[DEV] Subject: ${subject}`);
      this.logger.log(
        `[DEV] Attachment: ${filename} (${attachmentBuffer.length} bytes)`,
      );
      return true;
    }

    try {
      const msg = {
        to,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject,
        html: htmlContent,
        text: this.stripHtml(htmlContent),
        attachments: [
          {
            content: attachmentBuffer.toString('base64'),
            filename,
            type: filename.endsWith('.pdf') ? 'application/pdf' : 'text/csv',
            disposition: 'attachment',
          },
        ],
      };

      await sgMail.send(msg);
      this.logger.log(`Email with attachment sent successfully to ${to}`);
      return true;
    } catch (error: any) {
      this.logger.error(
        `Failed to send email with attachment to ${to}:`,
        error?.response?.body || error,
      );
      return false;
    }
  }
}
