/**
 * export-og-image.mjs
 *
 * Screenshots og-image.html (1200 × 630) and writes it to public/og-image.jpg,
 * which the landing page references in its og:image / twitter:image tags.
 *
 * Usage:
 *   node export-og-image.mjs
 */

import puppeteer from 'puppeteer';
import path from 'path';

const URL = `file://${path.resolve('og-image.html')}`;
const OUT = './public/og-image.jpg';

(async () => {
  console.log('🍙 Launching browser…');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  const page = await browser.newPage();

  // Render at 2× and let the JPEG downscale happen on the platform side —
  // keeps text and card art crisp in link previews.
  await page.setViewport({ width: 1300, height: 720, deviceScaleFactor: 2 });

  console.log(`📄 Loading ${URL}`);
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });

  const og = await page.$('.og');
  if (!og) {
    console.error('❌ No .og element found in og-image.html');
    process.exit(1);
  }

  await og.screenshot({ path: OUT, type: 'jpeg', quality: 88 });
  console.log(`  ✅  ${OUT}  →  2400 × 1260 px (2× of 1200 × 630)`);

  await browser.close();
  console.log('🎉 Done!');
})();
