#!/usr/bin/env node
/**
 * Generates block page screenshot HTML artifacts (open in browser or convert to PNG).
 */
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'screenshots');
fs.mkdirSync(outDir, { recursive: true });

const samples = [
  {
    file: 'block-page-default-desktop.html',
    title: 'Flux Shield — Platform default (desktop)',
    primary: '#1E3B78',
    secondary: '#4B7CBB',
    accent: '#FF6E62',
    footer: 'Powered by Flux Labs',
    domain: 'blocked.example.com',
  },
  {
    file: 'block-page-custom-brand-mobile.html',
    title: 'Custom MSP brand (mobile)',
    primary: '#0f766e',
    secondary: '#14b8a6',
    accent: '#FF6E62',
    footer: 'Protected by Contoso MSP',
    domain: 'social.example.com',
    mobile: true,
  },
];

for (const s of samples) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${s.title}</title>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:#eef2ff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:${s.mobile ? '12px' : '24px'}}
.card{max-width:${s.mobile ? '360px' : '520px'};width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(30,59,120,.15)}
.head{background:linear-gradient(135deg,${s.primary},${s.secondary});color:#fff;padding:24px;text-align:center}
.head h1{margin:0;font-size:${s.mobile ? '20px' : '24px'}}
.body{padding:22px}
.btn{display:block;width:100%;padding:12px;background:${s.accent};color:#fff;border:0;border-radius:8px;font-weight:600}
.foot{padding:16px;text-align:center;font-size:13px;color:#6b7280;background:#f9fafb}
</style></head><body><div class="card"><div class="head"><h1>Access Blocked</h1></div><div class="body"><p>This site has been blocked by your organization's security policy.</p><p><strong>${s.domain}</strong></p><button class="btn">Request unblock</button></div><div class="foot">${s.footer}</div></div></body></html>`;
  fs.writeFileSync(path.join(outDir, s.file), html);
}

fs.writeFileSync(
  path.join(outDir, 'README.md'),
  '# Block page screenshots\n\nPhase 1 reference renders. Open the `.html` files in a browser at desktop and mobile widths for visual QA.\n',
);

console.log('Wrote samples to', outDir);
