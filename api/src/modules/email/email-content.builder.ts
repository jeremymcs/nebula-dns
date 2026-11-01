import {
  BRAND_BLUE,
  BRAND_CORAL,
  BRAND_NAVY,
  DEFAULT_APP_URL,
} from '../../common/product-branding';
import {
  buildTransactionalEmailHtml,
  emailButton,
  emailCallout,
  emailGettingStartedSteps,
  emailPanel,
  escapeHtml,
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

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface EmailContentContext {
  productName: string;
  adminPortalName: string;
  docsUrl: string;
}

function p(text: string): string {
  return `<p style="margin: 0 0 16px 0;">${text}</p>`;
}

function docsHelpBlock(docsUrl: string): string {
  return emailCallout(
    'info',
    `<strong>Need help?</strong> Visit our documentation at <a href="${escapeHtml(docsUrl)}" style="color: ${BRAND_BLUE}; font-weight: 600;">${escapeHtml(docsUrl)}</a> or contact support.`,
  );
}

export function renderWelcomeEmail(
  data: WelcomeEmailData,
  ctx: EmailContentContext,
): RenderedEmail {
  const subject = `Welcome to ${ctx.productName}, ${data.name}!`;
  const firstName = escapeHtml(data.name.split(/\s+/)[0] ?? data.name);
  const bodyHtml = `
    <div style="font-size:32px;line-height:38px;font-weight:600;letter-spacing:-1.1px;color:#0B1530;margin:0 0 16px 0;">
      Welcome to ${escapeHtml(ctx.productName)}, <span style="font-family:Georgia,'Instrument Serif',serif;font-style:italic;font-weight:400;font-size:36px;letter-spacing:-0.3px;color:${BRAND_NAVY};">${firstName}.</span>
    </div>
    ${p(
      `Thank you for signing up <strong style="color:#0B1530;">${escapeHtml(data.companyName)}</strong> for ${escapeHtml(ctx.productName)}. Your account is now active on the <strong style="color:#0B1530;">${escapeHtml(data.planName)}</strong> plan.`,
    )}
    ${emailButton(data.loginUrl, 'Access your dashboard')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:40px 0 0 0;"><tr><td style="border-top:1px solid #E9ECF2;font-size:0;line-height:0;">&nbsp;</td></tr></table>
    <p style="margin:26px 0 6px;font-family:Geist,-apple-system,'Segoe UI',Arial,sans-serif;font-size:12px;font-weight:500;color:#7A849B;letter-spacing:0.2px;">Getting started</p>
    ${emailGettingStartedSteps([
      'Log in to configure DNS security policies',
      'Set up your first network location and DNS tokens',
      `Point devices to ${ctx.productName} resolvers`,
      'Monitor DNS traffic and security events',
    ])}
    ${docsHelpBlock(ctx.docsUrl)}
    ${p(
      `<span style="font-size:12.5px;color:#7A849B;">If you did not sign up for this account, you can ignore this email.</span>`,
    )}
  `;
  const html = buildTransactionalEmailHtml({
    title: `Welcome to ${ctx.productName}`,
    preheader: subject,
    productName: ctx.productName,
    bodyHtml,
  });
  const text = `${subject}

Thank you for signing up ${data.companyName} on the ${data.planName} plan.

Access your dashboard: ${data.loginUrl}
Documentation: ${ctx.docsUrl}
`;
  return { subject, html, text };
}

export function renderPaymentFailedEmail(
  data: PaymentFailedEmailData,
  ctx: EmailContentContext,
): RenderedEmail {
  const subject = `Action Required: Payment Failed for ${data.companyName}`;
  const bodyHtml = `
    ${emailCallout(
      'danger',
      `<p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">Payment failed</p>
      <p style="margin: 0;">We could not process payment for <strong>${escapeHtml(data.companyName)}</strong> on ${escapeHtml(ctx.productName)}. Update your billing details to avoid service interruption.</p>`,
    )}
    ${emailButton(data.updatePaymentUrl, 'Update Payment Method')}
    ${p(`<span style="font-size: 14px; color: #6b7280;">Contact support if you believe this is an error.</span>`)}
  `;
  const html = buildTransactionalEmailHtml({
    title: subject,
    preheader: subject,
    headerTitle: 'Payment failed',
    productName: ctx.productName,
    bodyHtml,
  });
  return {
    subject,
    html,
    text: `${subject}\n\nUpdate payment: ${data.updatePaymentUrl}`,
  };
}

export function renderInviteUserEmail(
  data: InviteUserEmailData,
  ctx: EmailContentContext,
): RenderedEmail {
  const subject = `You've been invited to join ${data.tenantName} on ${ctx.productName}`;
  const messageBlock = data.message
    ? p(`<em>${escapeHtml(data.message)}</em>`)
    : '';
  const bodyHtml = `
    ${p(`<strong>${escapeHtml(data.inviterName)}</strong> invited you to join <strong>${escapeHtml(data.tenantName)}</strong> on ${escapeHtml(ctx.productName)} as <strong>${escapeHtml(data.role)}</strong>.`)}
    ${messageBlock}
    ${p(`${escapeHtml(ctx.productName)} provides DNS security and content filtering for your organization.`)}
    ${emailButton(data.inviteUrl, 'Accept Invitation')}
    ${p(`<span style="font-size: 14px; color: #6b7280;">This invitation expires on ${escapeHtml(data.expiresAt.toUTCString())}.</span>`)}
  `;
  const html = buildTransactionalEmailHtml({
    title: subject,
    preheader: subject,
    headerTitle: "You're invited!",
    productName: ctx.productName,
    bodyHtml,
  });
  return {
    subject,
    html,
    text: `${subject}\n\nAccept: ${data.inviteUrl}`,
  };
}

export function renderScheduledReportEmail(
  data: ScheduledReportEmailData,
  ctx: EmailContentContext,
): RenderedEmail {
  const subject = `${data.reportName} - ${data.reportPeriod}`;
  const topBlockedList = data.summary.topBlockedDomains
    .map(
      (d, i) =>
        `<li style="margin-bottom: 4px;">${i + 1}. ${escapeHtml(d)}</li>`,
    )
    .join('');
  const topBlockedSection =
    data.summary.topBlockedDomains.length > 0
      ? emailPanel(
          'Top blocked domains',
          `<ol style="margin: 0; padding-left: 20px;">${topBlockedList}</ol>`,
        )
      : '';
  const bodyHtml = `
    ${p(`<strong>${escapeHtml(data.tenantName)}</strong> · ${escapeHtml(data.reportPeriod)}`)}
    ${emailPanel(
      'Summary',
      `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td width="33%" align="center" style="padding: 8px;">
            <div style="font-size: 22px; font-weight: 700; color: ${BRAND_BLUE};">${data.summary.totalQueries.toLocaleString()}</div>
            <div style="font-size: 12px; color: #6b7280;">Total queries</div>
          </td>
          <td width="33%" align="center" style="padding: 8px;">
            <div style="font-size: 22px; font-weight: 700; color: ${BRAND_CORAL};">${data.summary.blockedQueries.toLocaleString()}</div>
            <div style="font-size: 12px; color: #6b7280;">Blocked</div>
          </td>
          <td width="33%" align="center" style="padding: 8px;">
            <div style="font-size: 22px; font-weight: 700; color: ${BRAND_NAVY};">${data.summary.threatBlocks.toLocaleString()}</div>
            <div style="font-size: 12px; color: #6b7280;">Threats</div>
          </td>
        </tr>
      </table>`,
    )}
    ${topBlockedSection}
    ${emailButton(data.reportUrl, 'View Full Report')}
    ${p(`<span style="font-size: 12px; color: #6b7280; text-align: center; display: block;">Automated report from ${escapeHtml(ctx.productName)}.</span>`)}
  `;
  const html = buildTransactionalEmailHtml({
    title: data.reportName,
    preheader: subject,
    headerTitle: data.reportName,
    productName: ctx.productName,
    bodyHtml,
  });
  return { subject, html, text: `${subject}\n\n${data.reportUrl}` };
}

export function renderGracePeriodNotification(
  data: GracePeriodNotificationData,
  ctx: EmailContentContext,
): RenderedEmail {
  const subject = `Action Required: Your subscription is past due - ${data.daysRemaining} days remaining`;
  const bodyHtml = `
    ${emailCallout(
      'warning',
      `<p style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700;">Subscription payment required</p>
      <p style="margin: 0 0 16px 0;">Payment for <strong>${escapeHtml(data.companyName)}</strong> is past due.</p>
      <p style="margin: 0; text-align: center; font-size: 42px; font-weight: 800; color: ${BRAND_CORAL}; line-height: 1;">${data.daysRemaining}</p>
      <p style="margin: 8px 0 0 0; text-align: center; font-size: 13px;">days remaining</p>`,
    )}
    ${p(`If payment is not received within <strong>${data.daysRemaining} days</strong>, your account and managed client accounts will be suspended.`)}
    ${emailButton(data.updatePaymentUrl, 'Update Payment Now')}
  `;
  const html = buildTransactionalEmailHtml({
    title: subject,
    preheader: subject,
    headerTitle: 'Payment required',
    productName: ctx.productName,
    bodyHtml,
  });
  return { subject, html, text: `${subject}\n\n${data.updatePaymentUrl}` };
}

export function renderGracePeriodDailyReminder(
  data: GracePeriodDailyReminderData,
  ctx: EmailContentContext,
): RenderedEmail {
  const subject = `Reminder: ${data.daysRemaining} days until service suspension - ${data.companyName}`;
  const bodyHtml = `
    ${emailCallout(
      'warning',
      `<p style="margin: 0 0 8px 0; font-weight: 700;">Daily reminder: payment required</p>
      <p style="margin: 0;">${escapeHtml(data.companyName)} still has an overdue subscription.</p>`,
    )}
    ${emailPanel(
      'Impact',
      `<table role="presentation" width="100%"><tr>
        <td width="50%" align="center"><div style="font-size: 32px; font-weight: 700; color: ${BRAND_CORAL};">${data.daysRemaining}</div><div style="font-size: 12px; color: #6b7280;">Days remaining</div></td>
        <td width="50%" align="center"><div style="font-size: 32px; font-weight: 700; color: ${BRAND_NAVY};">${data.clientCount}</div><div style="font-size: 12px; color: #6b7280;">Clients affected</div></td>
      </tr></table>`,
    )}
    ${p(`When the grace period ends, DNS protection will be disabled for all ${data.clientCount} client organizations.`)}
    ${emailButton(data.updatePaymentUrl, 'Update Payment Method')}
  `;
  const html = buildTransactionalEmailHtml({
    title: subject,
    preheader: subject,
    headerTitle: 'Grace period reminder',
    productName: ctx.productName,
    bodyHtml,
  });
  return { subject, html, text: `${subject}\n\n${data.updatePaymentUrl}` };
}

export function renderClientGracePeriodNotification(
  data: ClientGracePeriodNotificationData,
  ctx: EmailContentContext,
): RenderedEmail {
  const subject = `Notice: DNS service ending in ${data.daysRemaining} days - ${data.clientName}`;
  const contactSection = data.mspContactEmail
    ? p(
        `Contact your service provider: <a href="mailto:${escapeHtml(data.mspContactEmail)}" style="color: ${BRAND_BLUE};">${escapeHtml(data.mspContactEmail)}</a>`,
      )
    : '';
  const bodyHtml = `
    ${emailCallout(
      'warning',
      `<p style="margin: 0 0 8px 0; font-weight: 700;">Important service notice</p>
      <p style="margin: 0;">Managed service provider <strong>${escapeHtml(data.mspName)}</strong> has a billing issue that may affect DNS protection for <strong>${escapeHtml(data.clientName)}</strong>.</p>
      <p style="margin: 16px 0 0 0; text-align: center; font-size: 22px; font-weight: 700; color: ${BRAND_CORAL};">Service ending in ${data.daysRemaining} days</p>`,
    )}
    ${contactSection}
    ${p(`This notice was sent by ${escapeHtml(ctx.productName)} on behalf of ${escapeHtml(data.mspName)}.`)}
  `;
  const html = buildTransactionalEmailHtml({
    title: subject,
    preheader: subject,
    headerTitle: 'Service notice',
    productName: ctx.productName,
    bodyHtml,
  });
  return { subject, html, text: subject };
}

export function renderSuspensionNotification(
  data: SuspensionNotificationData,
  ctx: EmailContentContext,
): RenderedEmail {
  const subject = `Service Suspended: ${data.companyName}`;
  const bodyHtml = `
    ${emailCallout(
      'danger',
      `<p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">Service suspended</p>
      <p style="margin: 0;">The ${escapeHtml(ctx.productName)} subscription for <strong>${escapeHtml(data.companyName)}</strong> is suspended due to non-payment.</p>`,
    )}
    ${emailPanel(
      'What this means',
      `<ul style="margin: 0; padding-left: 20px; color: #4b5563;">
        <li style="margin-bottom: 6px;">DNS resolution is blocked for all networks</li>
        <li style="margin-bottom: 6px;">Managed client organizations are suspended</li>
        <li style="margin-bottom: 6px;">Users see a service suspended message</li>
        <li>No DNS queries are processed</li>
      </ul>`,
    )}
    ${emailButton(data.updatePaymentUrl, 'Restore Service Now')}
  `;
  const html = buildTransactionalEmailHtml({
    title: subject,
    preheader: subject,
    headerTitle: 'Service suspended',
    productName: ctx.productName,
    bodyHtml,
  });
  return { subject, html, text: `${subject}\n\n${data.updatePaymentUrl}` };
}

export function renderFamilyInviteEmail(
  data: FamilyInviteEmailData,
  ctx: EmailContentContext,
): RenderedEmail {
  const subject = `You've been invited to join ${data.familyName} on ${ctx.productName}`;
  const bodyHtml = `
    ${p(`<strong>${escapeHtml(data.inviterName)}</strong> invited you to join the <strong>${escapeHtml(data.familyName)}</strong> family on ${escapeHtml(ctx.productName)}.`)}
    ${emailPanel(
      'Family access includes',
      `<ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 15px;">
        <li style="margin-bottom: 6px;">Family dashboard and protection status</li>
        <li style="margin-bottom: 6px;">Current filtering policies</li>
        <li>Safe search settings for your devices</li>
      </ul>`,
    )}
    ${emailButton(data.inviteUrl, 'Accept Invitation')}
    ${p(`<span style="font-size: 14px; color: #6b7280;">This invitation expires on ${escapeHtml(data.expiresAt.toUTCString())}.</span>`)}
  `;
  const html = buildTransactionalEmailHtml({
    title: subject,
    preheader: subject,
    headerTitle: "You're invited!",
    productName: ctx.productName,
    bodyHtml,
  });
  return { subject, html, text: `${subject}\n\n${data.inviteUrl}` };
}

export function renderMspWelcomeEmail(
  data: MspWelcomeEmailData,
  ctx: EmailContentContext,
): RenderedEmail {
  const subject = `Welcome to ${ctx.productName} - Your MSP Account is Ready`;
  const bodyHtml = `
    ${p(`Hi ${escapeHtml(data.adminName)},`)}
    ${p(`Your MSP account for <strong>${escapeHtml(data.mspName)}</strong> is ready. Manage DNS security for all client organizations from one dashboard.`)}
    ${emailPanel(
      'Your login credentials',
      `<p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${escapeHtml(data.to)}</p>
       <p style="margin: 0;"><strong>Temporary password:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${escapeHtml(data.tempPassword)}</code></p>
       <p style="margin: 12px 0 0 0; font-size: 14px; color: ${BRAND_CORAL}; font-weight: 600;">You must change this password on first login.</p>`,
    )}
    ${emailButton(data.loginUrl, 'Log In to Your Dashboard')}
    ${emailPanel(
      'Getting started',
      `<ol style="margin: 0; padding-left: 20px; color: #4b5563;">
        <li style="margin-bottom: 6px;">Log in and change your password</li>
        <li style="margin-bottom: 6px;">Configure MSP profile and branding</li>
        <li style="margin-bottom: 6px;">Create your first client organization</li>
        <li>Set up policy templates</li>
      </ol>`,
    )}
    ${docsHelpBlock(ctx.docsUrl)}
    ${p(`<span style="font-size: 14px; color: #6b7280;">Keep this email secure — do not share your temporary password.</span>`)}
  `;
  const html = buildTransactionalEmailHtml({
    title: subject,
    preheader: subject,
    headerTitle: `Welcome to ${ctx.productName}!`,
    productName: ctx.productName,
    bodyHtml,
  });
  const text = `${subject}

Email: ${data.to}
Temporary password: ${data.tempPassword}
Login: ${data.loginUrl}
Docs: ${ctx.docsUrl}
`;
  return { subject, html, text };
}

export function renderAdminInviteEmail(
  data: AdminInviteEmailData,
  ctx: EmailContentContext,
): RenderedEmail {
  const subject = `You've been invited to join ${ctx.productName} Admin`;
  const roleDisplay = data.role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  const bodyHtml = `
    ${p(`<strong>${escapeHtml(data.inviterName)}</strong> invited you to join ${escapeHtml(ctx.productName)} as an administrator.`)}
    ${emailPanel(
      'Your access level',
      `<p style="margin: 0; font-size: 18px; font-weight: 700; color: #111827;">${escapeHtml(roleDisplay)}</p>
       <p style="margin: 10px 0 0 0; font-size: 14px; color: #6b7280;">Access ${escapeHtml(ctx.adminPortalName)} to manage the platform.</p>`,
    )}
    ${emailButton(data.inviteUrl, 'Accept Invitation')}
    ${p(`<span style="font-size: 14px; color: ${BRAND_CORAL}; text-align: center; display: block;">Expires ${escapeHtml(data.expiresAt.toUTCString())}</span>`)}
    ${p(`<span style="font-size: 12px; color: #6b7280;">Invited by ${escapeHtml(data.inviterEmail)}</span>`)}
  `;
  const html = buildTransactionalEmailHtml({
    title: 'Admin invitation',
    preheader: subject,
    headerTitle: 'Admin invitation',
    productName: ctx.productName,
    bodyHtml,
  });
  const text = `${subject}\n\nRole: ${roleDisplay}\nAccept: ${data.inviteUrl}`;
  return { subject, html, text };
}

export function renderMfaResetNotification(
  data: MfaResetNotificationData,
  ctx: EmailContentContext,
): RenderedEmail {
  const subject = 'Your MFA has been reset - Action Required';
  const bodyHtml = `
    ${p(`Hi ${escapeHtml(data.name)},`)}
    ${emailCallout(
      'warning',
      `<p style="margin: 0 0 8px 0; font-weight: 700;">MFA reset notification</p>
      <p style="margin: 0;">Your multi-factor authentication was reset by a Super Admin. Set up MFA again on your next login.</p>`,
    )}
    ${emailPanel(
      'What changed',
      `<ul style="margin: 0; padding-left: 20px; color: #4b5563;">
        <li style="margin-bottom: 6px;">Existing MFA setup was removed</li>
        <li style="margin-bottom: 6px;">Active sessions were ended</li>
        <li>MFA enrollment is required at next login</li>
      </ul>`,
    )}
    ${emailButton(data.loginUrl, 'Log In and Set Up MFA')}
    ${p(`<span style="font-size: 14px; color: #6b7280;">If you did not request this reset, contact your administrator immediately. Reset by ${escapeHtml(data.resetByEmail)}.</span>`)}
  `;
  const html = buildTransactionalEmailHtml({
    title: subject,
    preheader: subject,
    headerTitle: 'MFA reset',
    productName: ctx.productName,
    bodyHtml,
  });
  return { subject, html, text: `${subject}\n\n${data.loginUrl}` };
}

export function renderShieldCaRotationEmail(options: {
  tenantLabel: string;
  expiryUtc: string;
  dashboardUrl: string;
  productName: string;
}): RenderedEmail {
  const subject = `[${options.productName}] Certificate rotation required`;
  const bodyHtml = `
    ${p(`The ${escapeHtml(options.productName)} intermediate CA for <strong>${escapeHtml(options.tenantLabel)}</strong> expires on <strong>${escapeHtml(options.expiryUtc)}</strong>.`)}
    ${p('Redeploy the updated CA to Intune, GPO, RMM, Apple profiles, and Windows agents before expiry so HTTPS block pages keep working.')}
    ${emailButton(options.dashboardUrl, 'Open Shield Certificate')}
  `;
  const html = buildTransactionalEmailHtml({
    title: subject,
    preheader: subject,
    headerTitle: 'Certificate rotation',
    productName: options.productName,
    bodyHtml,
  });
  return { subject, html, text: `${subject}\n\n${options.dashboardUrl}` };
}

export function renderUnblockDecisionEmail(options: {
  domain: string;
  status: 'approved' | 'denied';
  reviewNote?: string;
  productName: string;
}): RenderedEmail {
  const approved = options.status === 'approved';
  const subject = approved
    ? 'Your unblock request was approved'
    : 'Your unblock request was denied';
  const note = options.reviewNote
    ? p(`Note: ${escapeHtml(options.reviewNote)}`)
    : '';
  const bodyHtml = `
    ${p(`Your request for <strong>${escapeHtml(options.domain)}</strong> was <strong>${approved ? 'approved' : 'denied'}</strong>.`)}
    ${note}
  `;
  const html = buildTransactionalEmailHtml({
    title: subject,
    preheader: subject,
    headerTitle: approved ? 'Request approved' : 'Request denied',
    productName: options.productName,
    bodyHtml,
  });
  return { subject, html, text: `${subject}: ${options.domain}` };
}

export type EmailTemplateId =
  | 'welcome'
  | 'payment-failed'
  | 'tenant-invite'
  | 'scheduled-report'
  | 'grace-period'
  | 'grace-daily'
  | 'client-grace'
  | 'suspension'
  | 'family-invite'
  | 'msp-welcome'
  | 'admin-invite'
  | 'mfa-reset'
  | 'shield-ca-rotation'
  | 'unblock-decision';

export function renderEmailTemplatePreview(
  templateId: EmailTemplateId,
  ctx: EmailContentContext,
): RenderedEmail {
  const sampleExpiry = new Date(Date.now() + 7 * 86400000);
  const appUrl = DEFAULT_APP_URL;
  switch (templateId) {
    case 'welcome':
      return renderWelcomeEmail(
        {
          to: 'user@example.com',
          name: 'Alex',
          companyName: 'Acme IT',
          planName: 'Pro',
          loginUrl: `${appUrl}/`,
        },
        ctx,
      );
    case 'payment-failed':
      return renderPaymentFailedEmail(
        {
          to: 'billing@example.com',
          companyName: 'Acme IT',
          updatePaymentUrl: `${appUrl}/dashboard/billing`,
        },
        ctx,
      );
    case 'tenant-invite':
      return renderInviteUserEmail(
        {
          to: 'invitee@example.com',
          tenantName: 'Acme IT',
          inviterName: 'Jordan',
          inviterEmail: 'jordan@example.com',
          role: 'admin',
          inviteUrl: `${appUrl}/invite/accept?token=sample`,
          expiresAt: sampleExpiry,
        },
        ctx,
      );
    case 'scheduled-report':
      return renderScheduledReportEmail(
        {
          to: 'reports@example.com',
          reportName: 'Weekly Security Summary',
          tenantName: 'Acme IT',
          reportPeriod: 'Oct 20 – Oct 27, 2026',
          summary: {
            totalQueries: 1250000,
            blockedQueries: 42000,
            threatBlocks: 890,
            topBlockedDomains: ['bad.example', 'tracker.example'],
          },
          reportUrl: `${appUrl}/dashboard/reports`,
        },
        ctx,
      );
    case 'grace-period':
      return renderGracePeriodNotification(
        {
          to: 'billing@example.com',
          companyName: 'Acme IT',
          daysRemaining: 7,
          updatePaymentUrl: `${appUrl}/dashboard/billing`,
        },
        ctx,
      );
    case 'grace-daily':
      return renderGracePeriodDailyReminder(
        {
          to: 'billing@example.com',
          companyName: 'Acme MSP',
          daysRemaining: 3,
          clientCount: 12,
          updatePaymentUrl: `${appUrl}/dashboard/billing`,
        },
        ctx,
      );
    case 'client-grace':
      return renderClientGracePeriodNotification(
        {
          to: 'client@example.com',
          clientName: 'Client Co',
          mspName: 'Acme MSP',
          mspContactEmail: 'msp@example.com',
          daysRemaining: 3,
        },
        ctx,
      );
    case 'suspension':
      return renderSuspensionNotification(
        {
          to: 'billing@example.com',
          companyName: 'Acme IT',
          updatePaymentUrl: `${appUrl}/dashboard/billing`,
        },
        ctx,
      );
    case 'family-invite':
      return renderFamilyInviteEmail(
        {
          to: 'family@example.com',
          familyName: 'The Example Family',
          inviterName: 'Jordan',
          inviterEmail: 'jordan@example.com',
          inviteUrl: `${appUrl}/invite/family/accept?token=sample`,
          expiresAt: sampleExpiry,
        },
        ctx,
      );
    case 'msp-welcome':
      return renderMspWelcomeEmail(
        {
          to: 'msp-admin@example.com',
          adminName: 'Sam',
          mspName: 'Acme MSP',
          tempPassword: 'Temp-Pass-123!',
          loginUrl: `${appUrl}/`,
        },
        ctx,
      );
    case 'admin-invite':
      return renderAdminInviteEmail(
        {
          to: 'admin@example.com',
          inviterName: 'Jordan',
          inviterEmail: 'jordan@example.com',
          role: 'admin',
          inviteUrl: 'https://admin.shield.fluxlabs.net/invite/accept?token=sample',
          expiresAt: sampleExpiry,
        },
        ctx,
      );
    case 'mfa-reset':
      return renderMfaResetNotification(
        {
          to: 'admin@example.com',
          name: 'Sam',
          resetByEmail: 'super@example.com',
          loginUrl: 'https://admin.shield.fluxlabs.net/login',
        },
        ctx,
      );
    case 'shield-ca-rotation':
      return renderShieldCaRotationEmail({
        tenantLabel: 'Acme IT',
        expiryUtc: sampleExpiry.toUTCString(),
        dashboardUrl: `${appUrl}/dashboard/shield-certificate`,
        productName: ctx.productName,
      });
    case 'unblock-decision':
      return renderUnblockDecisionEmail({
        domain: 'example.com',
        status: 'approved',
        reviewNote: 'Approved for 24 hours',
        productName: ctx.productName,
      });
    default: {
      const never: never = templateId;
      throw new Error(`Unknown template ${never}`);
    }
  }
}

export const ALL_EMAIL_TEMPLATE_IDS: EmailTemplateId[] = [
  'welcome',
  'payment-failed',
  'tenant-invite',
  'scheduled-report',
  'grace-period',
  'grace-daily',
  'client-grace',
  'suspension',
  'family-invite',
  'msp-welcome',
  'admin-invite',
  'mfa-reset',
  'shield-ca-rotation',
  'unblock-decision',
];
