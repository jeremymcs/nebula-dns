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
const FONT_STACK =
  "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
const MONO_STACK = "'Geist Mono', Menlo, Consolas, monospace";

export function emailButton(href: string, label: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0 0 0;">
  <tr>
    <td bgcolor="${BRAND_NAVY}" style="background:${BRAND_NAVY}; border-radius:10px;">
      <a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 22px;font-family:${FONT_STACK};font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;">${label} &nbsp;→</a>
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
        bg: '#F7F8FB',
        border: '#EEF0F5',
        text: '#3B4763',
      },
      warning: {
        bg: '#FFF7ED',
        border: BRAND_CORAL,
        text: '#7c2d12',
      },
      danger: {
        bg: '#FFF0EE',
        border: '#FFD9D4',
        text: '#7f1d1d',
      },
    };
  const palette = styles[variant];
  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 26px 0 0 0;">
  <tr>
    <td bgcolor="${palette.bg}" style="background-color:${palette.bg}; border:1px solid ${palette.border}; border-radius:10px; padding:14px 16px; font-family:${FONT_STACK}; font-size:13px; line-height:20px; color:${palette.text};">
      ${innerHtml}
    </td>
  </tr>
</table>`;
}

export function emailGettingStartedSteps(steps: string[]): string {
  const rows = steps
    .map((text, index) => {
      const num = String(index + 1).padStart(2, '0');
      const numColor = index === steps.length - 1 ? BRAND_CORAL : BRAND_BLUE;
      const border =
        index === 0 ? '' : 'border-top:1px solid #F0F2F6;';
      return `<tr>
  <td width="34" valign="top" style="padding:12px 0;${border} font-family:${MONO_STACK}; font-size:12px; color:${numColor};">${num}</td>
  <td style="padding:12px 0;${border} font-family:${FONT_STACK}; font-size:14px; line-height:21px; color:#0B1530;">${text}</td>
</tr>`;
    })
    .join('');
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:${FONT_STACK};">
${rows}
</table>`;
}

export function emailPanel(title: string, innerHtml: string): string {
  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 26px 0 0 0;">
  <tr>
    <td style="background-color: #F7F8FB; border: 1px solid #EEF0F5; border-radius: 10px; padding: 16px 18px; font-family: ${FONT_STACK};">
      <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 500; letter-spacing: 0.2px; color: #7A849B;">${title}</p>
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
  const preheader = options.preheader ?? options.title;
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(options.title)}</title>
</head>
<body style="margin:0;padding:0;background:#F4F5F9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center" bgcolor="#F4F5F9" style="width:100%;max-width:600px;background:#F4F5F9;">
    <tr>
      <td align="center" style="padding:40px 32px 28px;">
        <table role="presentation" width="536" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:536px;">
          <tr>
            <td align="left" style="padding:0 4px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td><img src="${logoUrl}" alt="${escapeHtml(productName)}" width="24" height="24" style="display:block;border:0;" /></td>
                  <td style="padding-left:8px;font-family:${FONT_STACK};font-size:15px;font-weight:600;color:#0B1530;letter-spacing:-0.2px;">${escapeHtml(productName)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" data-flux-email-layout="1" style="background:#ffffff;border-radius:16px;border:1px solid #E6E9F0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:44px 48px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="44" height="3" style="width:44px;height:3px;line-height:3px;font-size:0;border-radius:2px;background:linear-gradient(90deg,${BRAND_NAVY},${BRAND_BLUE} 55%,${BRAND_CORAL});">&nbsp;</td></tr></table>
                  </td>
                </tr>
                <tr>
                  <td class="flux-email-body-text" style="padding:22px 48px 0;font-family:${FONT_STACK};font-size:16px;line-height:1.55;color:#3B4763;">
                    ${options.bodyHtml}
                  </td>
                </tr>
                <tr>
                  <td data-flux-email-footer style="padding:24px 48px 40px;font-family:${FONT_STACK};font-size:12.5px;line-height:19px;color:#7A849B;">
                    &nbsp;
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 0 0;font-family:${FONT_STACK};font-size:12px;line-height:18px;color:#9AA3B8;">
              © ${year} ${escapeHtml(productName)} · Powered by <span style="color:${FLUX_LABS_LINK_COLOR};"><a href="${FLUX_LABS_URL}" style="color:${FLUX_LABS_LINK_COLOR};text-decoration:none;">Flux Labs</a></span>
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
