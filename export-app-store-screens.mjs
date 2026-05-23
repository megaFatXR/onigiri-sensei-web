/**
 * export-app-store-screens.mjs
 *
 * Screenshots all 5 app store screens at 1290×2796 px
 * (iPhone 6.7" — accepted by App Store Connect for all iPhone sizes).
 *
 * Usage:
 *   1. Make sure the static server is running:
 *        python3 -m http.server 4444
 *   2. Run this script:
 *        node export-app-store-screens.mjs
 *   3. Find the PNGs in ./app-store-export/
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// ─── Config ───────────────────────────────────────────────────────────────────
const URL       = 'http://localhost:4444/app-store-screens.html';
const OUT_DIR   = './app-store-export';

// Target: 1290 × 2796 (iPhone 6.7" App Store requirement)
// CSS screen size: 390 × 844  →  scale factor: 1290/390 ≈ 3.308
const CSS_W     = 390;
const CSS_H     = 844;
const TARGET_W  = 1290;
const SCALE     = TARGET_W / CSS_W;   // 3.3077

const NAMES = [
  '01-hero',
  '02-vocabulary',
  '03-conjugation',
  '04-quiz',
  '05-progress',
];
// ──────────────────────────────────────────────────────────────────────────────

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

(async () => {
  console.log('🍙 Launching browser…');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  const page    = await browser.newPage();

  // Wide enough to lay out all 5 screens side-by-side without wrapping.
  await page.setViewport({
    width:             Math.ceil((CSS_W * 5 + 24 * 4 + 200)),
    height:            CSS_H + 200,
    deviceScaleFactor: SCALE,
  });

  console.log(`📄 Loading ${URL}`);
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });

  const screens = await page.$$('.screen');

  if (screens.length === 0) {
    console.error('❌ No .screen elements found — is the server running on port 4444?');
    process.exit(1);
  }

  console.log(`📸 Exporting ${screens.length} screens at ${TARGET_W}×${Math.round(CSS_H * SCALE)} px…\n`);

  for (let i = 0; i < screens.length; i++) {
    const name    = NAMES[i] ?? `screen-${i + 1}`;
    const outPath = path.join(OUT_DIR, `${name}.png`);

    await screens[i].screenshot({ path: outPath, type: 'png' });

    const { width, height } = await screens[i].evaluate(el => ({
      width:  el.offsetWidth,
      height: el.offsetHeight,
    }));

    const pxW = Math.round(width  * SCALE);
    const pxH = Math.round(height * SCALE);

    console.log(`  ✅  ${name}.png  →  ${pxW} × ${pxH} px`);
  }

  // ── Splash Screen (1284 × 2778) ───────────────────────────────────────────
  console.log('\n📱 Exporting splash screen at 1284 × 2778 px…');

  const splashPath = `file://${path.resolve('splash-screen.html')}`;
  await page.setViewport({ width: 428, height: 926, deviceScaleFactor: 3 });
  await page.goto(splashPath, { waitUntil: 'networkidle0', timeout: 30000 });

  const splash = await page.$('.splash');
  if (splash) {
    const outSplash = path.join(OUT_DIR, 'splash-screen.png');
    await splash.screenshot({ path: outSplash, type: 'png' });
    console.log(`  ✅  splash-screen.png  →  1284 × 2778 px`);
  }

  // ── Feature Graphic (1024 × 500) ──────────────────────────────────────────
  console.log('\n📐 Exporting feature graphic at 1024 × 500 px…');

  const fgPath = `file://${path.resolve('feature-graphic.html')}`;
  await page.setViewport({ width: 1100, height: 600, deviceScaleFactor: 1 });
  await page.goto(fgPath, { waitUntil: 'networkidle0', timeout: 30000 });

  const fg = await page.$('.fg');
  if (fg) {
    const outFg = path.join(OUT_DIR, 'feature-graphic.png');
    await fg.screenshot({ path: outFg, type: 'png' });
    console.log(`  ✅  feature-graphic.png  →  1024 × 500 px`);
  }

  await browser.close();
  console.log(`\n🎉 Done! Files saved to ${OUT_DIR}/`);
})();
