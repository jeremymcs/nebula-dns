/** Jest stub — production uses the real sanitize-html package. */
export default function sanitizeHtml(dirty: string, _options?: unknown): string {
  return dirty
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
}
