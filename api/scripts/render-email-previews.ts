#!/usr/bin/env ts-node
/**
 * Render all Flux Shield transactional email templates to HTML files for preview.
 *
 * Usage: npm run email:previews -- [--out=path]
 */
import * as fs from 'fs';
import * as path from 'path';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ALL_EMAIL_TEMPLATE_IDS,
  EmailService,
} from '../src/modules/email/email.service';
import { DEFAULT_DOCS_URL } from '../src/common/product-branding';

async function main() {
  const outArg = process.argv.find((arg) => arg.startsWith('--out='));
  const outDir = outArg
    ? outArg.split('=')[1]
    : path.join(process.cwd(), 'artifacts', 'email-previews');

  fs.mkdirSync(outDir, { recursive: true });

  const moduleRef = await Test.createTestingModule({
    providers: [
      EmailService,
      {
        provide: ConfigService,
        useValue: {
          get: (key: string, defaultValue?: string) => {
            const values: Record<string, string> = {
              PRODUCT_NAME: 'Flux Shield',
              ADMIN_PORTAL_NAME: 'Admin Console',
              DOCS_URL: DEFAULT_DOCS_URL,
            };
            return values[key] ?? defaultValue ?? '';
          },
        },
      },
    ],
  }).compile();

  const emailService = moduleRef.get(EmailService);
  emailService.onModuleInit();

  const indexLines: string[] = ['# Flux Shield email previews', ''];

  for (const templateId of ALL_EMAIL_TEMPLATE_IDS) {
    const rendered = emailService.renderTemplatePreview(templateId);
    const filename = `${templateId}.html`;
    fs.writeFileSync(path.join(outDir, filename), rendered.html, 'utf8');
    indexLines.push(`- [${templateId}](./${filename}) — ${rendered.subject}`);
  }

  fs.writeFileSync(path.join(outDir, 'README.md'), `${indexLines.join('\n')}\n`);
  console.log(`Wrote ${ALL_EMAIL_TEMPLATE_IDS.length} templates to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
