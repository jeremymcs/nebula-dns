/**
 * Opens a print-only view for MFA backup / recovery codes (no network, no URL params).
 */

export const FLUX_SHIELD_PRINT_COLORS = {
  navy: '#1E3B78',
  blue: '#4B7CBB',
  coral: '#FF6E62',
} as const

export const FLUX_SHIELD_PRODUCT_NAME = 'Flux Shield' as const
export const FLUX_LABS_POWERED_BY = 'Powered by Flux Labs' as const

export type MfaBackupCodesPrintOptions = {
  codes: readonly string[]
  accountLabel: string
  generatedAt?: Date
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatGeneratedDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date)
}

export function buildMfaBackupCodesPrintHtml(options: MfaBackupCodesPrintOptions): string {
  const generatedAt = options.generatedAt ?? new Date()
  const account = escapeHtml(options.accountLabel.trim() || 'Account')
  const codeCells = options.codes
    .map(
      (code) =>
        `<li class="code-item"><span class="code">${escapeHtml(code)}</span></li>`,
    )
    .join('')

  const { navy, blue, coral } = FLUX_SHIELD_PRINT_COLORS

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(FLUX_SHIELD_PRODUCT_NAME)} — Backup codes</title>
  <style>
    :root {
      color-scheme: light;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 2rem;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      color: ${navy};
      background: #fff;
    }
    .brand {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: ${navy};
      margin: 0 0 0.25rem;
    }
    .brand-accent {
      color: ${blue};
    }
    .powered {
      margin: 0 0 1.75rem;
      font-size: 0.8125rem;
      color: ${blue};
    }
    .meta {
      margin: 0 0 0.35rem;
      font-size: 0.9375rem;
    }
    .meta strong { font-weight: 600; }
    .codes {
      list-style: none;
      padding: 0;
      margin: 1.25rem 0 0;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.5rem 1rem;
      max-width: 28rem;
    }
    .code-item {
      padding: 0.5rem 0.75rem;
      border: 1px solid ${blue};
      border-radius: 6px;
      background: #f8fafc;
    }
    .code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.9375rem;
      letter-spacing: 0.04em;
    }
    .note {
      margin-top: 1.5rem;
      max-width: 32rem;
      font-size: 0.875rem;
      line-height: 1.5;
      color: #334155;
      border-left: 3px solid ${coral};
      padding-left: 0.75rem;
    }
    @media print {
      body { padding: 0.5in; }
      .note { break-inside: avoid; }
      .codes { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1 class="brand">${escapeHtml(FLUX_SHIELD_PRODUCT_NAME)}</h1>
  <p class="powered">${escapeHtml(FLUX_LABS_POWERED_BY)}</p>
  <p class="meta"><strong>Account:</strong> ${account}</p>
  <p class="meta"><strong>Generated:</strong> ${escapeHtml(formatGeneratedDate(generatedAt))}</p>
  <ul class="codes" aria-label="Backup codes">${codeCells}</ul>
  <p class="note">Each backup code works only once. Store these codes in a secure place (password manager or safe). Do not share them.</p>
</body>
</html>`
}

export function printMfaBackupCodes(options: MfaBackupCodesPrintOptions): void {
  if (typeof window === 'undefined') {
    return
  }
  if (!options.codes.length) {
    return
  }

  const html = buildMfaBackupCodesPrintHtml(options)
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=640,height=720')
  if (!printWindow) {
    throw new Error('Pop-up blocked. Allow pop-ups for this site to print backup codes.')
  }

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()

  const triggerPrint = () => {
    printWindow.print()
  }

  if (printWindow.document.readyState === 'complete') {
    triggerPrint()
  } else {
    printWindow.addEventListener('load', triggerPrint, { once: true })
  }
}
