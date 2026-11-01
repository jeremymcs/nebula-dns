import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ALL_EMAIL_TEMPLATE_IDS,
  EmailService,
} from './email.service';
import {
  BRAND_BLUE,
  BRAND_CORAL,
  BRAND_NAVY,
  DEFAULT_DOCS_URL,
} from '../../common/product-branding';

describe('EmailService templates', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const values: Record<string, string> = {
                PRODUCT_NAME: 'Flux Shield',
                ADMIN_PORTAL_NAME: 'Admin Console',
                EMAIL_FROM_ADDRESS: 'noreply@shield.fluxlabs.net',
                EMAIL_FROM_NAME: 'Flux Shield',
                DOCS_URL: DEFAULT_DOCS_URL,
              };
              return values[key] ?? defaultValue ?? '';
            }),
          },
        },
      ],
    }).compile();

    service = module.get(EmailService);
    service.onModuleInit();
  });

  it.each(ALL_EMAIL_TEMPLATE_IDS)('renders %s without legacy branding', (templateId) => {
    const rendered = service.renderTemplatePreview(templateId);
    const haystack = `${rendered.subject}\n${rendered.html}\n${rendered.text}`.toLowerCase();

    expect(haystack).not.toContain('nebula');
    expect(haystack).not.toContain('localhost');
    expect(rendered.html).toContain(BRAND_NAVY);
    expect(rendered.html).toContain(BRAND_BLUE);
    expect(rendered.html).toContain(BRAND_CORAL);
    expect(rendered.html).toContain('Powered by');
    expect(rendered.html).toContain('Flux Labs');
    expect(rendered.html).toContain('data-flux-email-layout');
  });

  it('admin invite subject interpolates product name', () => {
    const rendered = service.renderTemplatePreview('admin-invite');
    expect(rendered.subject).toBe(
      "You've been invited to join Flux Shield Admin",
    );
    expect(rendered.subject).not.toContain('${');
  });
});
