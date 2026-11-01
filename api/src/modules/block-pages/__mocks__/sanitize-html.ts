/** Jest stub — production uses the real sanitize-html package. */
export default function sanitizeHtml(dirty: string): string {
  return dirty;
}
