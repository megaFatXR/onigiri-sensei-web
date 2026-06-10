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

// ─── Localized copy ─────────────────────────────────────────────────────────
// Brand name "Onigiri Sensei" is kept as-is in every language.
// Each language renders into ./app-store-export/<lang>/.
const LOCALES = {
  es: {
    screens: {
      s1: { tag: 'Onigiri Sensei', headline: 'Japonés<br>que se queda.',      sub: 'Tarjetas de vocabulario ilustradas<br>con tu adorable maestro bola de arroz.' },
      s2: { tag: 'Vocabulario',    headline: 'Cada palabra,<br>ilustrada.',     sub: 'Escenas vívidas hacen el vocabulario<br>imposible de olvidar.' },
      s3: { tag: 'Conjugación',    headline: 'Más que<br>tarjetas.',            sub: 'Simple, cortés, pasado, te, tai: practica<br>todas las formas que necesitas.' },
      s4: { tag: 'Modo Quiz',      headline: 'Pon a prueba<br>lo que sabes.',   sub: 'Cuatro opciones. Una correcta.<br>Sin hacerte trampas.' },
      s5: { tag: 'Progreso',       headline: 'Mira cómo<br>avanzas.',           sub: 'Sigue tu precisión, dominio de mazos<br>y cada palabra individual.' },
    },
    fg: { tag: 'Onigiri Sensei', headline: 'Japonés<br>que se queda.', bullets: ['Vocabulario', 'Conjugación', 'Quiz'] },
  },
  it: {
    screens: {
      s1: { tag: 'Onigiri Sensei', headline: 'Giapponese<br>che resta.',          sub: 'Carte di vocabolario illustrate<br>con il tuo adorabile maestro pallina di riso.' },
      s2: { tag: 'Vocabolario',    headline: 'Ogni parola,<br>illustrata.',        sub: 'Scene vivide rendono il vocabolario<br>impossibile da dimenticare.' },
      s3: { tag: 'Coniugazione',   headline: 'Più che<br>flashcard.',              sub: 'Piana, cortese, passato, te, tai: allena<br>ogni forma che ti serve davvero.' },
      s4: { tag: 'Modalità Quiz',  headline: 'Metti alla prova<br>ciò che sai.',   sub: 'Quattro scelte. Una giusta.<br>Niente trucchi con te stesso.' },
      s5: { tag: 'Progressi',      headline: 'Guardati<br>migliorare.',            sub: 'Monitora precisione, padronanza dei mazzi<br>e ogni singola parola.' },
    },
    fg: { tag: 'Onigiri Sensei', headline: 'Giapponese<br>che resta.', bullets: ['Vocabolario', 'Coniugazione', 'Quiz'] },
  },
  fr: {
    screens: {
      s1: { tag: 'Onigiri Sensei', headline: 'Le japonais<br>qui reste.',        sub: 'Des cartes de vocabulaire illustrées<br>avec votre adorable maître boule de riz.' },
      s2: { tag: 'Vocabulaire',    headline: 'Chaque mot,<br>illustré.',          sub: 'Des scènes vivantes rendent le vocabulaire<br>impossible à oublier.' },
      s3: { tag: 'Conjugaison',    headline: 'Plus que<br>des cartes.',           sub: 'Neutre, poli, passé, te, tai : révisez<br>toutes les formes utiles.' },
      s4: { tag: 'Mode Quiz',      headline: 'Testez<br>vos acquis.',             sub: 'Quatre choix. Une bonne réponse.<br>Pas de triche avec soi-même.' },
      s5: { tag: 'Progression',    headline: 'Voyez-vous<br>progresser.',         sub: 'Suivez précision, maîtrise des paquets<br>et chaque mot individuellement.' },
    },
    fg: { tag: 'Onigiri Sensei', headline: 'Le japonais<br>qui reste.', bullets: ['Vocabulaire', 'Conjugaison', 'Quiz'] },
  },
};

// Which languages to render this run (default: all). Override with e.g. `node export-app-store-screens.mjs fr`.
const LANGS = process.argv.slice(2).filter(a => LOCALES[a]);
const TARGET_LANGS = LANGS.length ? LANGS : Object.keys(LOCALES);
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

  console.log(`📸 Exporting ${screens.length} screens × ${TARGET_LANGS.length} langs (${TARGET_LANGS.join(', ')}) at ${TARGET_W}×${Math.round(CSS_H * SCALE)} px…\n`);

  // Apply localized copy to the in-page screen text, then screenshot each screen.
  const applyScreenText = (t) => {
    const set = (sel, html) => { const el = document.querySelector(sel); if (el) el.innerHTML = html; };
    for (const s of ['s1', 's2', 's3', 's4', 's5']) {
      set(`.${s}-text .tag`, t[s].tag);
      set(`.${s}-headline`,  t[s].headline);
      set(`.${s}-sub`,       t[s].sub);
    }
  };

  for (const lang of TARGET_LANGS) {
    const langDir = path.join(OUT_DIR, lang);
    if (!fs.existsSync(langDir)) fs.mkdirSync(langDir, { recursive: true });

    await page.evaluate(applyScreenText, LOCALES[lang].screens);
    console.log(`🌐 ${lang}`);

    for (let i = 0; i < screens.length; i++) {
      const name    = NAMES[i] ?? `screen-${i + 1}`;
      const outPath = path.join(langDir, `${name}.png`);

      await screens[i].screenshot({ path: outPath, type: 'png' });

      const { width, height } = await screens[i].evaluate(el => ({
        width:  el.offsetWidth,
        height: el.offsetHeight,
      }));

      const pxW = Math.round(width  * SCALE);
      const pxH = Math.round(height * SCALE);

      console.log(`  ✅  ${lang}/${name}.png  →  ${pxW} × ${pxH} px`);
    }
  }

  // ── Splash Screen (1284 × 2778) ───────────────────────────────────────────
  console.log('\n📱 Exporting splash screen at 1284 × 2778 px…');

  const splashPath = `file://${path.resolve('splash-screen.html')}`;
  await page.setViewport({ width: 428, height: 926, deviceScaleFactor: 3 });
  await page.goto(splashPath, { waitUntil: 'networkidle0', timeout: 30000 });

  const splash = await page.$('.splash');
  if (splash) {
    // Solid background version
    const outSplash = path.join(OUT_DIR, 'splash-screen.png');
    await splash.screenshot({ path: outSplash, type: 'png' });
    console.log(`  ✅  splash-screen.png  →  1284 × 2778 px`);

    // Transparent background version
    await page.evaluate(() => {
      document.documentElement.style.background = 'transparent';
      document.body.style.background = 'transparent';
      document.querySelector('.splash').style.background = 'transparent';
      const s = document.createElement('style');
      s.textContent = `
        .splash::before  { display: none !important; content: none !important; }
        .splash-icon img { filter: none !important; }
        .splash-icon     { box-shadow: none !important; }
      `;
      document.head.appendChild(s);
    });
    const outTransparent = path.join(OUT_DIR, 'splash-screen-transparent.png');
    await splash.screenshot({ path: outTransparent, type: 'png', omitBackground: true });
    console.log(`  ✅  splash-screen-transparent.png  →  1284 × 2778 px (transparent)`);
  }

  // ── Feature Graphic (1024 × 500) ──────────────────────────────────────────
  console.log('\n📐 Exporting feature graphic at 1024 × 500 px…');

  const fgPath = `file://${path.resolve('feature-graphic.html')}`;
  await page.setViewport({ width: 1100, height: 600, deviceScaleFactor: 1 });
  await page.goto(fgPath, { waitUntil: 'networkidle0', timeout: 30000 });

  const applyFgText = (t) => {
    const tag = document.querySelector('.fg-tag');
    if (tag) tag.innerHTML = t.tag;
    const hl = document.querySelector('.fg-headline');
    if (hl) hl.innerHTML = t.headline;
    const bullets = document.querySelector('.fg-bullets');
    if (bullets) {
      bullets.innerHTML = t.bullets
        .map(b => `<span>${b}</span>`)
        .join('<span class="fg-bullet-sep">·</span>');
    }
  };

  const fg = await page.$('.fg');
  if (fg) {
    for (const lang of TARGET_LANGS) {
      const langDir = path.join(OUT_DIR, lang);
      if (!fs.existsSync(langDir)) fs.mkdirSync(langDir, { recursive: true });

      await page.evaluate(applyFgText, LOCALES[lang].fg);
      const outFg = path.join(langDir, 'feature-graphic.png');
      await fg.screenshot({ path: outFg, type: 'png' });
      console.log(`  ✅  ${lang}/feature-graphic.png  →  1024 × 500 px`);
    }
  }

  await browser.close();
  console.log(`\n🎉 Done! Files saved to ${OUT_DIR}/`);
})();
