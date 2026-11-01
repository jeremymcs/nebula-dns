/** Jest stub — production uses the real sanitize-html package. */
export default function sanitizeHtml(dirty: string): string {
  if (dirty.includes('<script')) {
    return dirty.replace(/<script[\s\S]*?<\/script>/gi, '');
  }
  return dirty;
}
