import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import {
  DEFAULT_ADMIN_PORTAL_NAME,
  DEFAULT_EMAIL_FROM_ADDRESS,
  DEFAULT_EMAIL_FROM_NAME,
  DEFAULT_PRODUCT_NAME,
} from '../../common/product-branding';
import { resolveDocsUrl } from '../../common/public-urls';
import {
  ALL_EMAIL_TEMPLATE_IDS,
  EmailContentContext,
  renderAdminInviteEmail,
  renderClientGracePeriodNotification,
  renderEmailTemplatePreview,
  renderFamilyInviteEmail,
  renderGracePeriodDailyReminder,
  renderGracePeriodNotification,
  renderInviteUserEmail,
  renderMfaResetNotification,
  renderMspWelcomeEmail,
  renderPaymentFailedEmail,
  renderScheduledReportEmail,
  renderSuspensionNotification,
  renderWelcomeEmail,
  type EmailTemplateId,
} from './email-content.builder';
import {
  wrapTransactionalFragment,
  type TransactionalEmailLayoutOptions,
} from './transactional-email-layout';
import type {
  AdminInviteEmailData,
  ClientGracePeriodNotificationData,
  FamilyInviteEmailData,
  GracePeriodDailyReminderData,
  GracePeriodNotificationData,
  InviteUserEmailData,
  MfaResetNotificationData,
  MspWelcomeEmailData,
  PaymentFailedEmailData,
  ScheduledReportEmailData,
  SuspensionNotificationData,
  WelcomeEmailData,
} from './email.types';

export type {
  AdminInviteEmailData,
  ClientGracePeriodNotificationData,
  FamilyInviteEmailData,
  GracePeriodDailyReminderData,
  GracePeriodNotificationData,
  InviteUserEmailData,
  MfaResetNotificationData,
  MspWelcomeEmailData,
  PaymentFailedEmailData,
  ScheduledReportEmailData,
  SuspensionNotificationData,
  WelcomeEmailData,
} from './email.types';

export { ALL_EMAIL_TEMPLATE_IDS, type EmailTemplateId } from './email-content.builder';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly docsUrl: string;
  private readonly productName: string;
  private readonly adminPortalName: string;
  private readonly sendgridApiKey: string;
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    this.fromEmail = this.configService.get(
      'EMAIL_FROM_ADDRESS',
      DEFAULT_EMAIL_FROM_ADDRESS,
    );
    this.fromName = this.configService.get(
      'EMAIL_FROM_NAME',
      DEFAULT_EMAIL_FROM_NAME,
    );
    this.productName = this.configService.get(
      'PRODUCT_NAME',
      DEFAULT_PRODUCT_NAME,
    );
    this.adminPortalName = this.configService.get(
      'ADMIN_PORTAL_NAME',
      DEFAULT_ADMIN_PORTAL_NAME,
    );
    this.docsUrl = resolveDocsUrl(this.configService);
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

  private contentContext(): EmailContentContext {
    return {
      productName: this.productName,
      adminPortalName: this.adminPortalName,
      docsUrl: this.docsUrl,
    };
  }

  private stripHtml(html: string): string {
    const capped = html.slice(0, 500_000);
    let withoutStyle = this.removeHtmlTagBlock(capped, 'style');
    withoutStyle = this.removeHtmlTagBlock(withoutStyle, 'script');
    return this.stripRemainingTags(withoutStyle).replace(/\s+/g, ' ').trim();
  }

  private stripRemainingTags(text: string): string {
    let out = '';
    let inTag = false;
    for (const ch of text) {
      if (ch === '<') {
        inTag = true;
        continue;
      }
      if (ch === '>' && inTag) {
        inTag = false;
        continue;
      }
      if (!inTag) {
        out += ch;
      }
    }
    return out;
  }

  private removeHtmlTagBlock(html: string, tagName: string): string {
    const open = `<${tagName}`;
    const close = `</${tagName}>`;
    let result = html;
    let lower = result.toLowerCase();
    let start = lower.indexOf(open);
    while (start !== -1) {
      const end = lower.indexOf(close, start);
      if (end === -1) {
        break;
      }
      result = result.slice(0, start) + result.slice(end + close.length);
      lower = result.toLowerCase();
      start = lower.indexOf(open);
    }
    return result;
  }

  /** Sends content produced by {@link renderTemplatePreview} or email-content builders. */
  async sendRendered(
    to: string,
    rendered: { subject: string; html: string; text: string },
  ): Promise<boolean> {
    return this.sendEmail(to, rendered.subject, rendered.html, rendered.text);
  }

  async sendTransactionalHtml(
    to: string,
    subject: string,
    htmlContent: string,
    layoutOptions?: Omit<TransactionalEmailLayoutOptions, 'bodyHtml'>,
  ): Promise<boolean> {
    const html = layoutOptions
      ? wrapTransactionalFragment(htmlContent, layoutOptions)
      : wrapTransactionalFragment(htmlContent, {
          title: subject,
          preheader: subject,
          productName: this.productName,
        });
    return this.sendEmail(to, subject, html);
  }

  private extractSendGridMessageId(response: unknown): string | undefined {
    if (!response || typeof response !== 'object') {
      return undefined;
    }
    const headers = (response as { headers?: Record<string, string> }).headers;
    if (!headers) {
      return undefined;
    }
    return headers['x-message-id'] ?? headers['X-Message-Id'];
  }

  private async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
  ): Promise<boolean> {
    if (!this.isConfigured) {
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

      const [response] = await sgMail.send(msg);
      const messageId = this.extractSendGridMessageId(response);
      this.logger.log(
        messageId
          ? `Email sent successfully to ${to} (x-message-id: ${messageId})`
          : `Email sent successfully to ${to}`,
      );
      return true;
    } catch (error: any) {
      this.logger.error(
        `Failed to send email to ${to}:`,
        error?.response?.body || error,
      );
      return false;
    }
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    const rendered = renderWelcomeEmail(data, this.contentContext());
    return this.sendEmail(data.to, rendered.subject, rendered.html, rendered.text);
  }

  async sendPaymentFailedEmail(data: PaymentFailedEmailData): Promise<boolean> {
    const rendered = renderPaymentFailedEmail(data, this.contentContext());
    return this.sendEmail(data.to, rendered.subject, rendered.html, rendered.text);
  }

  async sendInviteUserEmail(data: InviteUserEmailData): Promise<boolean> {
    const rendered = renderInviteUserEmail(data, this.contentContext());
    return this.sendEmail(data.to, rendered.subject, rendered.html, rendered.text);
  }

  async sendScheduledReportEmail(
    data: ScheduledReportEmailData,
  ): Promise<boolean> {
    const rendered = renderScheduledReportEmail(data, this.contentContext());
    if (data.attachmentBuffer && data.attachmentFilename) {
      return this.sendEmailWithAttachment(
        data.to,
        rendered.subject,
        rendered.html,
        rendered.text,
        data.attachmentBuffer,
        data.attachmentFilename,
      );
    }
    return this.sendEmail(
      data.to,
      rendered.subject,
      rendered.html,
      rendered.text,
    );
  }

  async sendGracePeriodNotification(
    data: GracePeriodNotificationData,
  ): Promise<boolean> {
    const rendered = renderGracePeriodNotification(data, this.contentContext());
    return this.sendEmail(data.to, rendered.subject, rendered.html, rendered.text);
  }

  async sendGracePeriodDailyReminder(
    data: GracePeriodDailyReminderData,
  ): Promise<boolean> {
    const rendered = renderGracePeriodDailyReminder(data, this.contentContext());
    return this.sendEmail(data.to, rendered.subject, rendered.html, rendered.text);
  }

  async sendClientGracePeriodNotification(
    data: ClientGracePeriodNotificationData,
  ): Promise<boolean> {
    const rendered = renderClientGracePeriodNotification(
      data,
      this.contentContext(),
    );
    return this.sendEmail(data.to, rendered.subject, rendered.html, rendered.text);
  }

  async sendSuspensionNotification(
    data: SuspensionNotificationData,
  ): Promise<boolean> {
    const rendered = renderSuspensionNotification(data, this.contentContext());
    return this.sendEmail(data.to, rendered.subject, rendered.html, rendered.text);
  }

  async sendFamilyInviteEmail(data: FamilyInviteEmailData): Promise<boolean> {
    const rendered = renderFamilyInviteEmail(data, this.contentContext());
    return this.sendEmail(data.to, rendered.subject, rendered.html, rendered.text);
  }

  async sendMspWelcomeEmail(data: MspWelcomeEmailData): Promise<boolean> {
    const rendered = renderMspWelcomeEmail(data, this.contentContext());
    return this.sendEmail(data.to, rendered.subject, rendered.html, rendered.text);
  }

  async sendAdminInviteEmail(data: AdminInviteEmailData): Promise<boolean> {
    const rendered = renderAdminInviteEmail(data, this.contentContext());
    return this.sendEmail(data.to, rendered.subject, rendered.html, rendered.text);
  }

  async sendMfaResetNotification(
    data: MfaResetNotificationData,
  ): Promise<boolean> {
    const rendered = renderMfaResetNotification(data, this.contentContext());
    return this.sendEmail(data.to, rendered.subject, rendered.html, rendered.text);
  }

  /** Used by preview script and unit tests. */
  renderTemplatePreview(templateId: EmailTemplateId) {
    return renderEmailTemplatePreview(templateId, this.contentContext());
  }

  private async sendEmailWithAttachment(
    to: string,
    subject: string,
    htmlContent: string,
    textContent: string,
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
        text: textContent || this.stripHtml(htmlContent),
        attachments: [
          {
            content: attachmentBuffer.toString('base64'),
            filename,
            type: filename.endsWith('.pdf') ? 'application/pdf' : 'text/csv',
            disposition: 'attachment',
          },
        ],
      };

      const [response] = await sgMail.send(msg);
      const messageId = this.extractSendGridMessageId(response);
      this.logger.log(
        messageId
          ? `Email with attachment sent successfully to ${to} (x-message-id: ${messageId})`
          : `Email with attachment sent successfully to ${to}`,
      );
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
