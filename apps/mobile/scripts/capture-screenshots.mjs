#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, '../dist-web');
const outDir = path.join(__dirname, '../../../docs/mobile/screenshots');

const shots = [
  { file: 'login.html', name: '01-login.png' },
  { file: '(auth)/login.html', name: '01-login-mode.png' },
  { file: '(admin)/(tabs)/index.html', name: '02-admin-dashboard.png' },
  { file: '(msp)/(tabs)/index.html', name: '03-msp-dashboard.png' },
  { file: '(admin)/(tabs)/tenants.html', name: '04-admin-tenants.png' },
  { file: '(msp)/(tabs)/devices.html', name: '05-msp-devices.png' },
  { file: '(msp)/(tabs)/logs.html', name: '07-query-logs.png' },
  { file: '(msp)/(tabs)/dns.html', name: '09-dns-zones.png' },
  { file: '(admin)/(tabs)/settings.html', name: '10-settings.png' },
];

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

for (const shot of shots) {
  const target = path.join(webRoot, shot.file);
  const url = `file://${target}`;
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, shot.name), fullPage: true });
    console.log('saved', shot.name);
  } catch (e) {
    console.warn('skip', shot.name, String(e));
  }
}

await browser.close();
