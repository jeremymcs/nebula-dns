import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_ADMIN_URL,
  DEFAULT_APP_URL,
  DEFAULT_DOCS_URL,
  DEFAULT_PRODUCT_NAME,
} from './product-branding';

function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

/** Customer app origin (APP_URL, then FRONTEND_URL, then production default). */
export function resolveAppUrl(
  config: ConfigService | NodeJS.ProcessEnv,
): string {
  const get = (key: string): string | undefined =>
    config instanceof ConfigService
      ? config.get<string>(key)
      : config[key];

  const appUrl = get('APP_URL');
  if (appUrl) {
    return trimTrailingSlash(appUrl);
  }
  const frontendUrl = get('FRONTEND_URL');
  if (frontendUrl) {
    return trimTrailingSlash(frontendUrl);
  }
  return DEFAULT_APP_URL;
}

export function resolveAdminUrl(config: ConfigService): string {
  return trimTrailingSlash(
    config.get<string>('ADMIN_URL', DEFAULT_ADMIN_URL),
  );
}

export function resolveDocsUrl(config: ConfigService): string {
  return trimTrailingSlash(
    config.get<string>('DOCS_URL', DEFAULT_DOCS_URL),
  );
}

export function billingDashboardUrl(appOrigin: string): string {
  return `${appOrigin}/dashboard/billing`;
}

export function defaultTenantDisplayName(): string {
  return DEFAULT_PRODUCT_NAME;
}

export function defaultAdminInviterName(): string {
  return `${DEFAULT_PRODUCT_NAME} Admin`;
}
