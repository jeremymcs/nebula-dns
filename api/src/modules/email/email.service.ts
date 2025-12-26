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

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly sendgridApiKey: string;
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    this.fromEmail = this.configService.get('EMAIL_FROM_ADDRESS', 'noreply@safedns.example.com');
    this.fromName = this.configService.get('EMAIL_FROM_NAME', 'SafeDNS');
    this.sendgridApiKey = this.configService.get('SENDGRID_API_KEY', '');
  }

  onModuleInit() {
    if (this.sendgridApiKey) {
      sgMail.setApiKey(this.sendgridApiKey);
      this.isConfigured = true;
      this.logger.log('SendGrid email service initialized');
    } else {
      this.logger.warn('SendGrid API key not configured - emails will be logged only');
    }
  }

  private async sendEmail(to: string, subject: string, htmlContent: string, textContent?: string): Promise<boolean> {
    if (!this.isConfigured) {
      // Development mode - log the email
      this.logger.log(`[DEV] Email to: ${to}`);
      this.logger.log(`[DEV] Subject: ${subject}`);
      this.logger.log(`[DEV] Content preview: ${(textContent || htmlContent).substring(0, 200)}...`);
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
      this.logger.error(`Failed to send email to ${to}:`, error?.response?.body || error);
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
    const subject = `Welcome to SafeDNS, ${data.name}!`;
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to SafeDNS</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to SafeDNS!</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="font-size: 16px;">Hi ${data.name},</p>
    
    <p style="font-size: 16px;">
      Thank you for signing up <strong>${data.companyName}</strong> for SafeDNS! 
      Your account is now active on the <strong>${data.planName}</strong> plan.
    </p>
    
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #e5e7eb;">
      <h3 style="color: #667eea; margin-top: 0;">Getting Started</h3>
      <ol style="padding-left: 20px;">
        <li style="margin-bottom: 10px;">Log in to your dashboard to configure your DNS security policies</li>
        <li style="margin-bottom: 10px;">Set up your first network location and generate DNS tokens</li>
        <li style="margin-bottom: 10px;">Configure your devices to use SafeDNS servers</li>
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
        <strong>Need help?</strong> Our documentation is available at docs.safedns.example.com 
        or contact our support team for assistance.
      </p>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
    
    <p style="font-size: 14px; color: #6b7280; text-align: center;">
      This email was sent by SafeDNS<br>
      If you didn't sign up for this account, please ignore this email.
    </p>
  </div>
</body>
</html>`;

    const textContent = `
Welcome to SafeDNS, ${data.name}!

Thank you for signing up ${data.companyName} for SafeDNS! 
Your account is now active on the ${data.planName} plan.

Getting Started:
1. Log in to your dashboard to configure your DNS security policies
2. Set up your first network location and generate DNS tokens
3. Configure your devices to use SafeDNS servers
4. Monitor your DNS traffic and security events

Access your dashboard: ${data.loginUrl}

Need help? Our documentation is available at docs.safedns.example.com

This email was sent by SafeDNS.
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
    
    <p>We were unable to process your payment for <strong>${data.companyName}</strong>'s SafeDNS subscription.</p>
    
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
    const subject = 'Reset Your SafeDNS Password';
    
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
    
    <p>We received a request to reset your SafeDNS password. Click the button below to create a new password:</p>
    
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
    const subject = 'Verify Your SafeDNS Email Address';
    
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
    
    <p>Please verify your email address to complete your SafeDNS account setup:</p>
    
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
    const subject = `You've been invited to join ${data.tenantName} on SafeDNS`;
    
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
    
    <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.tenantName}</strong> on SafeDNS.</p>
    
    <p>SafeDNS provides enterprise-grade DNS security and content filtering to protect your network.</p>
    
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

  async sendScheduledReportEmail(data: ScheduledReportEmailData): Promise<boolean> {
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

    ${data.summary.topBlockedDomains.length > 0 ? `
    <h4 style="color: #374151;">Top Blocked Domains</h4>
    <ol style="padding-left: 20px; margin: 0;">
      ${topBlockedList}
    </ol>
    ` : ''}

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.reportUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        View Full Report
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">

    <p style="font-size: 12px; color: #6b7280; text-align: center;">
      This is an automated report from SafeDNS.<br>
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
      this.logger.log(`[DEV] Attachment: ${filename} (${attachmentBuffer.length} bytes)`);
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
      this.logger.error(`Failed to send email with attachment to ${to}:`, error?.response?.body || error);
      return false;
    }
  }
}
