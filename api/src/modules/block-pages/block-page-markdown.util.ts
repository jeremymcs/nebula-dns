import { escapeHtml } from './block-page-html.util';

const ALLOWED_LINK = /^https?:\/\//i;

export function renderSafeMarkdown(source: string): string {
  let text = escapeHtml(source);
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
    const safeUrl = String(url).trim();
    if (!ALLOWED_LINK.test(safeUrl)) {
      return label;
    }
    return `<a href="${escapeHtml(safeUrl)}" rel="noopener noreferrer">${label}</a>`;
  });
  text = text.replace(/\n/g, '<br />');
  return text;
}
