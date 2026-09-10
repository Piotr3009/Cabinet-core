#!/usr/bin/env node
// ─── T66 F11 · IS ANY LABEL CLIPPED, OR BROKEN WORD BY WORD? ───────────────
//
// CLAUDE.md F11: *"Measured BEFORE, not after (the T65 script): every label in
// the copied MaterialChoicePanel and FrontStyleGallery at 1280 and 1440. A clip
// or a word-by-word break is a number."*
//
// It is T65's script with the one thing that made it read zero labels put
// right: the design room WAITS on the hardware bucket, this container's egress
// answers ERR_TUNNEL to the real one, and so the page never finished *"Setting
// the room out…"* — the measure ran against an empty column and reported it
// clean. The walk has served the SILENT SHOWROOM since T65 (T23 R8); this does
// the same, through the one documented `localStorage['cc.hardwareBase']` knob.
//
//   node scripts/t66-f11-measure.mjs          both widths
//   node scripts/t66-f11-measure.mjs 1280     one of them

import { launch } from './cdp.mjs';
import { startFixtureServer } from './fixture-server.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const widths = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const WIDTHS = widths.length ? widths : [1280, 1440];
const showroom = await startFixtureServer({ port: 4470 + (process.pid % 60) });

const OPTIONS = '[data-testid="column-options"]';

// Only what CLAUDE.md names: the two COPIED surfaces, and every text leaf in
// them. A leaf that is not on screen (zero box) is not a label.
const PROBE = `(() => {
  const roots = [...document.querySelectorAll(
    '[data-testid="inside-material"], [data-testid="fronts-material"],'
    + ' [data-testid="fronts-style-gallery"], [data-testid="extras-hardware"]',
  )];
  const rows = [];
  const seen = new Set();
  for (const root of roots) {
    for (const el of [root, ...root.querySelectorAll('*')]) {
      if (seen.has(el) || el.children.length) continue;
      seen.add(el);
      const text = (el.textContent || '').trim();
      if (!text) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const words = text.split(/\\s+/).length;
      // HOW MANY LINES THE BROWSER ACTUALLY MADE — one client rect per line
      // over the text itself. Dividing the BOX's height by the line height
      // counts an element's own padding as a second line, which is how T65's
      // probe reported a one-line button as two.
      const range = document.createRange();
      range.selectNodeContents(el);
      const lines = Math.max(1, range.getClientRects().length);
      rows.push({
        text: text.slice(0, 48),
        w: Math.round(r.width),
        clipped: el.scrollWidth > el.clientWidth + 1,
        words,
        lines,
        wordByWord: words > 1 && lines >= words,
      });
    }
  }
  return rows;
})()`;

let bad = 0;
let seq = 0;
for (const width of WIDTHS) {
  seq += 1;
  const page = await launch({ width, height: 900, port: 9740 + ((process.pid + seq * 13) % 200) });
  page.ask = (expr) => page.evaluate(`return (${expr});`);
  const tap = async (sel) => {
    await page.evaluate(`document.querySelector(${JSON.stringify(sel)})?.click(); return true;`);
    await page.sleep(900);
  };
  // THE SILENT SHOWROOM (T23 R8), exactly as the walk serves it.
  await page.goto(`${BASE}retail.html#/design`);
  await page.evaluate(`try { localStorage.setItem('cc.hardwareBase', ${JSON.stringify(showroom.url)}); } catch (e) {} return true;`);
  await page.evaluate('location.reload(); return true;');
  await page.sleep(1800);
  await page.waitFor('window.__cc && window.__cc.pbi && window.__cc.pbi.render', { timeout: 45000 });
  await page.sleep(2600);
  // A wardrobe has to exist before INSIDE shows the carcass slot (T65 F1).
  await tap('[data-testid="cat-where"]');
  await tap('[data-testid="where-add-wardrobe"]');

  for (const step of ['inside', 'fronts']) {
    await tap(`[data-testid="cat-${step}"]`);
    await page.sleep(400);
    const col = await page.ask(
      `(() => { const el = document.querySelector(${JSON.stringify(OPTIONS)});`
      + ' return el ? Math.round(el.getBoundingClientRect().width) : null; })()',
    );
    const rows = await page.ask(PROBE);
    const clipped = rows.filter((r) => r.clipped);
    const wbw = rows.filter((r) => r.wordByWord);
    bad += clipped.length + wbw.length;
    process.stdout.write(
      `${width}px · ${step.toUpperCase().padEnd(7)} options column ${String(col).padStart(4)}px  `
      + `· ${String(rows.length).padStart(3)} labels · clipped ${clipped.length} · word-by-word ${wbw.length}\n`,
    );
    for (const r of [...clipped, ...wbw].slice(0, 8)) {
      process.stdout.write(`      ${r.clipped ? 'CLIP' : 'WORD'}  "${r.text}"  ${r.w}px, ${r.words} words on ${r.lines} lines\n`);
    }
  }
  await page.close();
}
await showroom.close?.();
process.stdout.write(`\n${bad === 0 ? 'CLEAN — no label clips and none breaks word by word.' : `${bad} label(s) in trouble.`}\n`);
process.exit(0);
