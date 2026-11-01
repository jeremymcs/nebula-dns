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
    .replace(/javascript:/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/url\s*\(\s*['"]*\s*data:/gi, 'url(')
    .replace(/@import/gi, '');
}

export function sanitizeCustomHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '');
}

export function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/\.$/, '').trim();
}
