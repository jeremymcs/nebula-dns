import type { IOptions } from 'sanitize-html';

// Load via CJS bridge so Jest/API E2E do not transform sanitize-html ESM.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sanitizeHtml = require('./sanitize-html.cjs') as (
  dirty: string,
  options?: IOptions,
) => string;

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

export function sanitizeCss(css: string): string {
  return css
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/data\s*:/gi, '')
    .replace(/file\s*:/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/@import/gi, '');
}

const CUSTOM_HTML_OPTIONS: IOptions = {
  allowedTags: [
    'b',
    'i',
    'em',
    'strong',
    'a',
    'p',
    'br',
    'ul',
    'ol',
    'li',
    'span',
    'div',
    'h1',
    'h2',
    'h3',
    'img',
    'section',
    'article',
    'header',
    'footer',
    'main',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
    '*': ['class', 'id', 'style'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    img: ['http', 'https'],
  },
  disallowedTagsMode: 'discard',
};

export function sanitizeCustomHtml(html: string): string {
  return sanitizeHtml(html, CUSTOM_HTML_OPTIONS);
}

export function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/\.$/, '').trim();
}
