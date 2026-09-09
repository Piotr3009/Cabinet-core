#!/usr/bin/env node
// ─── T65 F3 · IS ANY LABEL CLIPPED, OR BROKEN WORD BY WORD? ────────────────
//
// CLAUDE.md F3: *"Check before, not after: at 1280 and 1440, no label in the
// copied `MaterialChoicePanel` or `FrontStyleGallery` may clip or break
// word-by-word."*
//
// A number, not an opinion. For every text node inside the two copies, in the
// real browser at both widths:
//
//   CLIPPED         scrollWidth > clientWidth — the box cannot hold the text.
//   WORD-BY-WORD    the element is taller than N lines AND every line holds
//                   one word — measured by laying the text out and counting
//                   the boxes the browser actually made.
//
//   node scripts/t65-f3-measure.mjs          both widths
//   node scripts/t65-f3-measure.mjs 1280     one of them

import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const widths = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const WIDTHS = widths.length ? widths : [1280, 1440];

const PROBE = `(() => {
  const roots = [
    ...document.querySelectorAll('[data-testid="inside-material"], [data-testid="fronts-style"], .pbi-re-panel, [class*="pbi-re-"]'),
  ];
  const seen = new Set();
  const rows = [];
  for (const root of roots) {
    for (const el of [root, ...root.querySelectorAll('*')]) {
      if (seen.has(el)) continue;
      seen.add(el);
      const text = (el.textContent || '').trim();
      if (!text || text.length < 3) continue;
      // Only leaves — a wrapper's text is its children's.
      if (el.children.length) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const words = text.split(/\\s+/).length;
      // How many LINES the browser made of it.
      const line = parseFloat(getComputedStyle(el).lineHeight) || r.height;
      const lines = Math.max(1, Math.round(r.height / line));
      rows.push({
        text: text.slice(0, 60),
        w: Math.round(r.width),
        clipped: el.scrollWidth > el.clientWidth + 1,
        words,
        lines,
        // WORD-BY-WORD: more than one line, and as many lines as words.
        wordByWord: words > 1 && lines >= words,
      });
    }
  }
  return rows;
})()`;

const OPTIONS = '[data-testid="column-options"], .pbi-options';

let bad = 0;
for (const width of WIDTHS) {
  const page = await launch({ width, height: 900, port: 9700 + (process.pid % 200) + width % 7 });
  await page.goto(`${BASE}retail.html#/design`);
  await page.sleep(4000);
  // INSIDE carries the copied MaterialChoicePanel; FRONTS the style gallery.
  for (const step of ['inside', 'fronts']) {
    await page.evaluate(`document.querySelector('[data-testid="cat-${step}"]')?.click(); return true;`);
    await page.sleep(900);
    const col = await page.evaluate(
      `(() => { const el = document.querySelector(${JSON.stringify(OPTIONS)});`
      + ' return el ? Math.round(el.getBoundingClientRect().width) : null; })()',
    );
    const rows = await page.evaluate(`return ${PROBE};`);
    const clipped = rows.filter((r) => r.clipped);
    const wbw = rows.filter((r) => r.wordByWord);
    bad += clipped.length + wbw.length;
    process.stdout.write(
      `${width}px · ${step.toUpperCase().padEnd(7)} options column ${String(col).padStart(4)}px  `
      + `· ${String(rows.length).padStart(3)} labels · clipped ${clipped.length} · word-by-word ${wbw.length}\n`,
    );
    for (const r of [...clipped, ...wbw].slice(0, 6)) {
      process.stdout.write(`      ${r.clipped ? 'CLIP' : 'WORD'}  "${r.text}"  ${r.w}px, ${r.words} words on ${r.lines} lines\n`);
    }
  }
  await page.close();
}
process.stdout.write(`\n${bad === 0 ? 'CLEAN — no label clips and none breaks word by word.' : `${bad} label(s) in trouble.`}\n`);
process.exit(bad === 0 ? 0 : 1);
