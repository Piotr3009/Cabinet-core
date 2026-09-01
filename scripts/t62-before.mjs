// ─── THE "BEFORE" HALF OF F4'S PAIR ────────────────────────────────────────
//
// CLAUDE.md, F4: *"`verify/t62/f4-*.png` — YOUR SPACE before/after in the same
// viewport, with the row count visible."*
//
// BEFORE MEANS BEFORE — the build at `origin/main`, served on its own port
// from its own git worktree, photographed at the same 1920 × 1200 as the after
// frame by the same code. Not a reconstruction, not last night's screenshot
// found in `verify/t61/`, and certainly not this build with a stylesheet
// commented out. A before/after pair whose "before" was staged proves whatever
// the person staging it wanted to prove.
//
//   git worktree add /tmp/before origin/main
//   (cd /tmp/before && npx vite build && npx vite preview --port 4174)
//   node scripts/t62-before.mjs
//
// It also COUNTS what it photographs, because the owner's complaint was a
// number — *"duże, rozwalone po całości"* — and two pictures side by side are
// an opinion until one of them says 18 lines and the other says 3.

import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.BEFORE_URL || 'http://127.0.0.1:4174/';
const SHOTS = new URL('../verify/t62/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const page = await launch({ width: 1920, height: 1200, port: 9880 + (process.pid % 90) });
await page.send('Network.enable', {});
await page.send('Network.setCacheDisabled', { cacheDisabled: true });
const ask = (expr) => page.evaluate(`return (${expr});`);

try {
  await page.goto(`${BASE}retail.html#/design`);
  await page.waitFor('window.__cc && window.__cc.pbi && window.__cc.pbi.render', { timeout: 45000 });
  await page.waitFor('window.__cc.pbi.render.bounds() !== null', { timeout: 45000 });
  await page.sleep(3500);

  // WHAT THE COLUMN COSTS, in the units the eye actually pays in: how tall
  // YOUR SPACE is, and how many separate lines of type stand in it.
  const measure = await ask(
    '(() => { const col = document.querySelector(\'[data-testid="column-options"]\');'
    + ' if (!col) return null;'
    + ' const panel = col.querySelector(".pbi-panel") || col;'
    + ' const lines = [...panel.querySelectorAll("span, p, label")]'
    + '   .filter((el) => (el.textContent || "").trim()'
    + '     && el.getBoundingClientRect().height > 0'
    + '     && ![...el.children].some((c) => (c.textContent || "").trim()));'
    + ' const fields = panel.querySelectorAll("input").length;'
    + ' const sliders = panel.querySelectorAll(\'input[type="range"]\').length;'
    + ' return { height: Math.round(panel.getBoundingClientRect().height),'
    + '   scrolls: panel.scrollHeight > col.clientHeight + 4,'
    + '   lines: lines.length, fields, sliders }; })()',
  );
  process.stdout.write(`BEFORE (origin/main) — YOUR SPACE: ${JSON.stringify(measure)}\n`);
  await page.screenshot(`${SHOTS}f4-your-space-before.png`);
  writeFileSync(`${SHOTS}f4-before.json`, `${JSON.stringify(measure, null, 1)}\n`);
} finally {
  await page.close?.();
}
