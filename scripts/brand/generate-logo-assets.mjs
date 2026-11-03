#!/usr/bin/env node
// Builds every Flux Shield logo file (favicons, app icons, email logo, OG image,
// mobile icons) from the one master mark in shared/brand/flux-shield-mark.svg.
//
//   node scripts/brand/generate-logo-assets.mjs
//
// Change the logo by editing the master SVG, then rerun this script.
// Needs Playwright with Chromium (preinstalled in CI images and cloud sandboxes).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const MASTER = join(ROOT, 'shared/brand/flux-shield-mark.svg')
const mark = readFileSync(MASTER, 'utf8')

// Single-color silhouette for Android themed icons: shield with the core and
// the gap around the dot cut out, so it still reads as the same mark.
const monoMark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><mask id="m">
    <rect width="64" height="64" fill="#fff"/>
    <path d="M32 18L42 22V31C42 38 37.5 43 32 45.5C26.5 43 22 38 22 31V22Z" fill="#000"/>
    <circle cx="50" cy="12" r="8" fill="#000"/>
  </mask></defs>
  <path mask="url(#m)" d="M32 4L54 12V30C54 44 44.5 54.5 32 60C19.5 54.5 10 44 10 30V12Z" fill="#fff"/>
  <circle cx="50" cy="12" r="6.5" fill="#fff"/>
</svg>`

const WEB_APPS = ['ui', 'www', 'admin-ui']
const MOBILE = 'apps/mobile/assets/images'

/** Square icon: the mark scaled to `scale` of the canvas, on `bg` (null = transparent). */
const square = (size, { scale = 1, bg = null, svg = mark } = {}) => ({
  width: size,
  height: size,
  transparent: !bg,
  html: `<body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:${bg ?? 'transparent'}">
    <div style="width:${size * scale}px;height:${size * scale}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body>`,
})

const ogImage = {
  width: 1200,
  height: 630,
  transparent: false,
  html: `<body style="margin:0;width:1200px;height:630px;background:#F6F7FA;font-family:Inter,'Helvetica Neue',Arial,sans-serif;color:#0B1530;position:relative;overflow:hidden">
    <div style="position:absolute;left:96px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:36px">
      <div style="display:flex;align-items:center;gap:28px">
        <div style="width:132px;height:132px">${mark.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
        <div style="font-size:92px;font-weight:600;letter-spacing:-2.5px">Flux Shield</div>
      </div>
      <div style="font-size:34px;line-height:1.35;color:#3B4763;max-width:900px">DNS filtering and threat protection,<br/>managed by Flux Labs.</div>
    </div>
    <div style="position:absolute;left:0;right:0;bottom:0;height:10px;background:linear-gradient(90deg,#1E3B78,#4B7CBB 55%,#FF6E62)"></div>
  </body>`,
}

const outputs = []
for (const app of WEB_APPS) {
  const pub = join(app, 'public')
  outputs.push([join(pub, 'icon-192.png'), square(192)])
  outputs.push([join(pub, 'icon-512.png'), square(512)])
  outputs.push([join(pub, 'apple-touch-icon.png'), square(180, { scale: 0.78, bg: '#FFFFFF' })])
  // Email header logo (shown at 24px; 96px keeps it sharp on retina).
  outputs.push([join(pub, 'flux-shield-logo.png'), square(96)])
}
outputs.push(['www/public/og-image.png', ogImage])
outputs.push(['ui/public/og-image.png', ogImage])
outputs.push([join(MOBILE, 'icon.png'), square(1024, { scale: 0.72, bg: '#FFFFFF' })])
outputs.push([join(MOBILE, 'favicon.png'), square(48)])
outputs.push([join(MOBILE, 'splash-icon.png'), square(1024, { scale: 0.9 })])
// Android adaptive icon: keep the mark inside the 66% safe zone.
outputs.push([join(MOBILE, 'android-icon-foreground.png'), square(512, { scale: 0.56 })])
outputs.push([join(MOBILE, 'android-icon-background.png'), square(512, { scale: 0, bg: '#FFFFFF' })])
outputs.push([join(MOBILE, 'android-icon-monochrome.png'), square(432, { scale: 0.56, svg: monoMark })])

const browser = await chromium.launch()
const page = await browser.newPage()
for (const [rel, spec] of outputs) {
  await page.setViewportSize({ width: spec.width, height: spec.height })
  await page.setContent(`<!doctype html><html>${spec.html}</html>`)
  await page.evaluate(() => document.fonts.ready)
  const buf = await page.screenshot({ omitBackground: spec.transparent, type: 'png' })
  mkdirSync(dirname(join(ROOT, rel)), { recursive: true })
  writeFileSync(join(ROOT, rel), buf)
  console.log(`wrote ${rel} (${spec.width}x${spec.height})`)
}
await browser.close()

for (const app of WEB_APPS) {
  writeFileSync(join(ROOT, app, 'public/favicon.svg'), mark)
  console.log(`wrote ${app}/public/favicon.svg`)
}
