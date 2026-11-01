import {
  BRAND_BLUE,
  BRAND_CORAL,
  BRAND_NAVY,
  DEFAULT_EMAIL_LOGO_URL,
  DEFAULT_PRODUCT_NAME,
  FLUX_LABS_LINK_COLOR,
} from '../../common/product-branding';

export type EmailCalloutVariant = 'info' | 'warning' | 'danger';

export interface TransactionalEmailLayoutOptions {
  title: string;
  preheader?: string;
  bodyHtml: string;
  productName?: string;
  logoUrl?: string;
  headerTitle?: string;
}

const FLUX_LABS_URL = 'https://fluxlabs.net';

export function emailButton(href: string, label: string): string {
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 28px auto;">
  <tr>
    <td style="border-radius: 6px; background-color: ${BRAND_BLUE};">
      <a href="${href}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 28px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 16px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 6px;">
        ${label}
      </a>
    </td>
  </tr>
</table>`;
}

export function emailCallout(
  variant: EmailCalloutVariant,
  innerHtml: string,
): string {
  const styles: Record<EmailCalloutVariant, { bg: string; border: string; text: string }> =
    {
      info: {
        bg: '#eff6ff',
        border: BRAND_BLUE,
        text: '#1e3a5f',
      },
      warning: {
        bg: '#fff7ed',
        border: BRAND_CORAL,
        text: '#7c2d12',
      },
      danger: {
        bg: '#fef2f2',
        border: BRAND_CORAL,
        text: '#7f1d1d',
      },
    };
  const palette = styles[variant];
  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
  <tr>
    <td style="background-color: ${palette.bg}; border: 1px solid ${palette.border}; border-left: 4px solid ${palette.border}; border-radius: 8px; padding: 16px 18px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 15px; line-height: 1.55; color: ${palette.text};">
      ${innerHtml}
    </td>
  </tr>
</table>`;
}

export function emailPanel(title: string, innerHtml: string): string {
  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
  <tr>
    <td style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: ${BRAND_BLUE};">${title}</p>
      ${innerHtml}
    </td>
  </tr>
</table>`;
}

export function buildTransactionalEmailHtml(
  options: TransactionalEmailLayoutOptions,
): string {
  const productName = options.productName ?? DEFAULT_PRODUCT_NAME;
  const logoUrl = options.logoUrl ?? DEFAULT_EMAIL_LOGO_URL;
  const headerTitle = options.headerTitle ?? productName;
  const preheader = options.preheader ?? options.title;
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(options.title)}</title>
  <style>
    :root { color-scheme: light dark; }
    body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    @media (prefers-color-scheme: dark) {
      .flux-email-bg { background-color: #0c111d !important; }
      .flux-email-card { background-color: #151b2b !important; }
      .flux-email-body-text { color: #e5e7eb !important; }
      .flux-email-muted { color: #9ca3af !important; }
      .flux-email-panel { background-color: #1c2438 !important; border-color: #2d3748 !important; }
    }
  </style>
</head>
<body class="flux-email-bg" style="margin: 0; padding: 0; background-color: #f3f4f6;">
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent; mso-hide: all;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="flux-email-bg" style="background-color: #f3f4f6; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" class="flux-email-card" data-flux-email-layout="1" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #e5e7eb;">
          <tr>
            <td style="background-color: ${BRAND_NAVY}; padding: 24px 28px; text-align: center;">
              <a href="${logoUrl.replace(/\/favicon\.svg.*/, '')}" style="text-decoration: none;">
                <img src="${logoUrl}" width="40" height="40" alt="${escapeHtml(productName)}" style="display: block; margin: 0 auto 10px auto; width: 40px; height: 40px;">
                <span style="display: block; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">${escapeHtml(headerTitle)}</span>
              </a>
            </td>
          </tr>
          <tr>
            <td style="height: 3px; background-color: ${BRAND_BLUE}; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <tr>
            <td class="flux-email-body-text" style="padding: 28px 28px 8px 28px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 16px; line-height: 1.6; color: #374151;">
              ${options.bodyHtml}
            </td>
          </tr>
          <tr>
            <td data-flux-email-footer style="padding: 8px 28px 24px 28px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p class="flux-email-muted" style="margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; color: #9ca3af;">
                © ${year} · Powered by <a href="${FLUX_LABS_URL}" style="color: ${FLUX_LABS_LINK_COLOR}; text-decoration: none; font-weight: 600;">Flux Labs</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function wrapTransactionalFragment(
  bodyHtml: string,
  layoutOptions: Omit<TransactionalEmailLayoutOptions, 'bodyHtml'>,
): string {
  if (bodyHtml.includes('data-flux-email-layout')) {
    return bodyHtml;
  }
  return buildTransactionalEmailHtml({ ...layoutOptions, bodyHtml });
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
