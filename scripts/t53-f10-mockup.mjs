#!/usr/bin/env node
// ─── THE DRAWN ROOM, AS A MOCKUP FIRST (turn 53, CLAUDE.md F10) ─────────────
//
//   *"He asked for a mockup before code; he then ordered the big night knowing
//   he sleeps. So: the first commit of this feature is the MOCKUP — a static,
//   committed screenshot of the drawing modal in `verify/t53/f10-mockup.png` —
//   and the implementation follows it."*
//
// So this draws the window as it will be, in the app's own colours and at the
// app's own size (2× the one-wall modal), with the four things his sentence
// asks for on it: the ORIGIN at zero, the DIRECTION under the cursor, the
// NUMBER being typed with its ghost segment, and the CATCH lit at the start
// point. Nothing here is the app — it is a picture of the app, which is what a
// mockup is, and the implementation that follows it is held to it.
//
// Zero dependencies: an HTML file and the same Chromium every walk uses.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './cdp.mjs';

export function mockupHtml() {
  return `<!doctype html><meta charset="utf-8"><title>T53 · F10 — Draw room (mockup)</title>
<style>
  :root {
    --shell-900:#14140f; --shell-800:#1c1c15; --shell-700:#2f2f24;
    --ink-100:#e9e4d8; --ink-400:#9a9384; --ink-500:#6f6a5e; --gold:#d8b45a;
    --warn:#e08a2e;
  }
  * { box-sizing:border-box; }
  /* min-height:100vh is not decoration: a document SHORTER than the capture
     surface leaves the bottom band unpainted, and the compositor fills it by
     repeating the layer — the mockup came out showing the window twice. A body
     that paints the whole viewport leaves nothing to repeat. */
  body { margin:0; background:#0d0d0a; color:var(--ink-100); min-height:100vh;
    font:13px/1.4 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; padding:18px; }
  .lede { color:var(--ink-400); font-size:12px; margin:0 0 14px; max-width:96ch; }
  .lede b { color:var(--gold); font-weight:600; }
  .win { width:1000px; background:var(--shell-900); border:1px solid var(--shell-700);
    border-radius:6px; box-shadow:0 18px 50px rgba(0,0,0,.6); }
  .bar { display:flex; align-items:center; gap:8px; padding:8px 10px;
    border-bottom:1px solid var(--shell-700); cursor:grab; }
  .bar .grip { color:var(--ink-500); letter-spacing:2px; }
  .bar h2 { font-size:12px; letter-spacing:.12em; text-transform:uppercase; margin:0; flex:1; }
  .x { color:var(--ink-400); padding:0 6px; }
  .body { display:grid; grid-template-columns:1fr 268px; gap:12px; padding:12px; }
  .plan { background:#111109; border:1px solid var(--shell-700); border-radius:4px; }
  .side { display:flex; flex-direction:column; gap:10px; }
  .field { display:flex; align-items:center; gap:8px; }
  .field label { flex:1; color:var(--ink-100); }
  input.num { width:104px; text-align:right; background:var(--shell-800); color:var(--ink-100);
    border:1px solid var(--gold); border-radius:3px; padding:5px 7px; font:inherit;
    font-variant-numeric:tabular-nums; }
  .hint { color:var(--ink-400); font-size:11px; }
  .rows { border-top:1px solid var(--shell-700); padding-top:8px; }
  .row { display:flex; justify-content:space-between; padding:2px 0; font-size:12px; }
  .row span:last-child { font-variant-numeric:tabular-nums; color:var(--ink-100); }
  .btns { display:flex; gap:6px; margin-top:auto; }
  button { font:inherit; padding:5px 10px; border-radius:3px; border:1px solid var(--shell-700);
    background:var(--shell-800); color:var(--ink-100); }
  button.gold { background:var(--gold); border-color:var(--gold); color:#14140f; font-weight:600; }
  .note { color:var(--warn); font-size:11px; }
</style>
<p class="lede">
  <b>T53 · F10 — MOCKUP.</b> The drawing window as it will be: <b>2×</b> the one-wall modal,
  draggable by its bar, opening beside the trigger. A top view with the origin marked at 0,0;
  the cursor picks the direction and it is always ortho; a number is typed and <b>Enter</b>
  commits the wall. The last one is <b>caught</b> at the start point — <i>"zawsze łączysz,
  taki catch"</i> — and a <b>Close</b> button does the same thing without the hand.
</p>

<div class="win">
  <div class="bar"><span class="grip">⠿</span><h2>Draw room</h2><span class="x">✕</span></div>
  <div class="body">
    <svg class="plan" viewBox="0 0 700 430" width="700" height="430">
      <defs>
        <pattern id="g" width="25" height="25" patternUnits="userSpaceOnUse">
          <path d="M25 0H0V25" fill="none" stroke="#22221a" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="700" height="470" fill="url(#g)"/>

      <!-- the walls already drawn -->
      <polyline points="120,70 520,70 520,350 200,350"
        fill="none" stroke="#e9e4d8" stroke-width="3" stroke-linejoin="miter"/>
      <!-- the ghost of the one being typed -->
      <line x1="200" y1="350" x2="120" y2="350" stroke="#d8b45a" stroke-width="3"
        stroke-dasharray="7 5"/>
      <!-- the catch, lit at the origin -->
      <circle cx="120" cy="70" r="13" fill="none" stroke="#d8b45a" stroke-width="2"/>
      <circle cx="120" cy="70" r="4.5" fill="#d8b45a"/>
      <text x="120" y="54" fill="#d8b45a" font-size="11" text-anchor="middle">catch — Enter closes the room</text>

      <!-- the origin -->
      <text x="104" y="86" fill="#9a9384" font-size="11" text-anchor="end">0,0</text>

      <!-- the run dimensions -->
      <text x="320" y="60" fill="#9a9384" font-size="11" text-anchor="middle">4000</text>
      <text x="534" y="214" fill="#9a9384" font-size="11">3000</text>
      <text x="360" y="370" fill="#9a9384" font-size="11" text-anchor="middle">3200</text>
      <text x="160" y="370" fill="#d8b45a" font-size="11" text-anchor="middle">800 …typing</text>

      <!-- the cursor, on the axis it snapped to -->
      <path d="M120 350 l0 -9 M120 350 l0 9 M120 350 l-9 0 M120 350 l9 0"
        stroke="#d8b45a" stroke-width="1.5"/>
      <text x="112" y="392" fill="#9a9384" font-size="11" text-anchor="middle">← left (ortho)</text>
    </svg>

    <div class="side">
      <div class="field">
        <label for="len">Wall length</label>
        <input class="num" id="len" value="800" readonly>
      </div>
      <p class="hint">
        Point the cursor at a direction — the drawing snaps to the four axes — type the
        millimetres and press <b>Enter</b>. Backspace takes the last wall off.
      </p>

      <div class="rows">
        <div class="row"><span>1 · right</span><span>4000 mm</span></div>
        <div class="row"><span>2 · away</span><span>3000 mm</span></div>
        <div class="row"><span>3 · left</span><span>3200 mm</span></div>
        <div class="row"><span>4 · left</span><span>800 mm ⏎</span></div>
      </div>
      <p class="note">The room is always closed — the last wall is caught to the first.</p>

      <div class="btns">
        <button>Undo wall</button>
        <button>Close</button>
        <button class="gold">Save room</button>
      </div>
    </div>
  </div>
</div>
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2] || 'verify/t53/f10-mockup.png';
  const page404 = `${dirname(out)}/.f10-mockup.html`;
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(page404, mockupHtml());
  const page = await launch({ width: 1080, height: 640, port: 9494 });
  await page.goto(`file://${process.cwd()}/${page404}?v=${process.pid}`);
  await page.waitFor('document.querySelector(".win") !== null', { timeout: 20000 });
  await page.sleep(300);
  // ─── THE CAPTURE IS CLIPPED, AND THAT IS NOT COSMETIC ─────────────────────
  //
  // A plain `Page.captureScreenshot` of this page came out with the whole
  // window drawn TWICE, one under the other, the first copy cut off mid-modal.
  // The raster surface behind the headless page is shorter than the emulated
  // viewport, and the capture is stitched from it by REPEATING the tile — so
  // the second copy is the first 140 rows over again, not a second modal.
  // Nothing in the document is duplicated (`mockupHtml()` emits one `.win`,
  // and the file on disk holds one). A capture with an explicit `clip`
  // re-rasterises at the rect instead of stitching, and the page comes out
  // once, whole, down to the footer buttons. CLAUDE.md rule 5: every
  // screenshot is LOOKED AT before the verdict claims anything about it —
  // this one was, which is how the doubling was caught at all.
  const height = Number(await page.evaluate(
    'return Math.ceil(document.querySelector(".win").getBoundingClientRect().bottom) + 18;',
  ));
  await page.screenshot(out, { x: 0, y: 0, width: 1080, height, scale: 1 });
  await page.close();
  process.stdout.write(`mockup → ${out}\n`);
  process.exit(0);
}
