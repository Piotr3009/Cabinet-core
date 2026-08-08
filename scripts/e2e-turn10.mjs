// ─── Turn 10, the acceptance loop, in a real Chromium ───
//
// Run:  npm run build && npx vite preview --port 4173 &
//       node scripts/e2e-turn10.mjs
//       node scripts/e2e-turn10.mjs --override '{"appearance":{"studio":{"ambient":0.25}}}'
//
// CLAUDE.md turn 10 F4 is the phase this file IS. Turn 9 shipped a contact
// shadow that was never once looked at in a browser and was invisible on every
// GPU; the answer to that is not a better intention, it is a script that builds
// the standard scene through the app's own controls, photographs it, and then
// MEASURES the five things the owner said were missing:
//
//   A  seating       the floor under the run is darker than the open floor
//   B  glint         a highlight patch that moves ACROSS a door as we orbit
//   C  room depth    a readable wall/floor junction, and a wall with a gradient
//   D  colour        the sprayed front is still its RAL, and nothing is blown out
//   E  cost          one bake, at most two shadow casters
//
// The numbers being tuned live in profile.js, and `--override` patches them
// through localStorage (the profile store's own persistence — stores/
// cabinetProfileStore.js) so an iteration is a page load rather than a build.
// The FINAL run is always taken with no override at all, which is how the
// screenshots in verify/t10 are guaranteed to be the shipped numbers.

import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { DEFAULT_CABINET_PROFILE } from '../src/engine/profile.js';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t10/', import.meta.url).pathname);
const OVERRIDE = argOf('--override', null);
const SHEEN_B = Number(argOf('--sheen-b', '90'));
const SHEEN_A = Number(argOf('--sheen-a', '60'));

// RAL 3005 Wine Red, exactly as reference/colors/psw-colors.json spells it —
// the acceptance test compares a rendered pixel against THIS, so it may not be
// retyped from memory anywhere.
const RAL_3005 = '#5e2129';

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  console.log(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};
const note = (label, detail) => console.log(`  ··  ${label} — ${detail}`);

/** Deep-merge an override onto the shipped profile, for the localStorage seed. */
function merge(base, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return patch;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? merge(base?.[k] ?? {}, v) : v;
  }
  return out;
}

// ─── the pixel maths, shipped INTO the page as a string ──────────────────────
//
// It runs in the browser because that is where the canvas is, and it is written
// once here so that every capture in the run is measured the same way.
//
// Everything is classified off the frame itself rather than off the scene
// graph: the run is found as the cluster of WINE RED pixels (the sprayed
// fronts), and the floor, the wall and the carcass are found relative to it.
// That is deliberate — a measurement taken through the renderer's own camera
// could agree with a picture nobody can see.
const ANALYSE = `
const SAMPLE_W = 700;
function hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b); const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2; const d = mx - mn;
  if (d < 1e-6) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h;
  if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
}
/** Shortest distance between two hues, in degrees. */
function hueGap(a, b) { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }

function frame() {
  const c = document.querySelector('canvas');
  const w = SAMPLE_W; const h = Math.round(SAMPLE_W * c.height / c.width);
  const o = document.createElement('canvas'); o.width = w; o.height = h;
  const ctx = o.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(c, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const at = (x, y) => { const i = (y * w + x) * 4; return { r: d[i], g: d[i + 1], b: d[i + 2] }; };
  return { w, h, d, at };
}

/** Is this pixel a sprayed RAL 3005 front? Hue near wine red, and saturated. */
function isDoor(p) {
  const c = hsl(p.r, p.g, p.b);
  return c.s > 0.14 && c.l > 0.04 && c.l < 0.96 && hueGap(c.h, ${'${HUE}'}) < 26;
}
`;

/**
 * The measurement, as an expression evaluated in the page. `hue` is the target
 * hue in degrees, computed node-side from the RAL hex so the two can never
 * drift apart.
 */
function analyseExpression(hue) {
  return `
${ANALYSE.replace('${HUE}', String(hue))}
const F = frame();
const { w, h, at } = F;
const lum = (p) => (p.r * 0.299 + p.g * 0.587 + p.b * 0.114) / 255;
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const median = (a) => {
  if (!a.length) return 0;
  const s = [...a].sort((p, q) => p - q);
  return s[Math.floor(s.length / 2)];
};

// ── one pass, and everything after it reads these arrays ──
const door = new Uint8Array(w * h);
const L = new Float32Array(w * h);
const S = new Float32Array(w * h);
const HU = new Float32Array(w * h);
let minX = w; let maxX = -1; let minY = h; let maxY = -1; let doorN = 0;
for (let y = 0; y < h; y += 1) {
  for (let x = 0; x < w; x += 1) {
    const i = y * w + x;
    const p = at(x, y);
    const c = hsl(p.r, p.g, p.b);
    L[i] = lum(p); S[i] = c.s; HU[i] = c.h;
    if (!isDoor(p)) continue;
    door[i] = 1; doorN += 1;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
}
if (doorN < 200) return { ok: false, why: 'no sprayed fronts found in the frame', doorN };
const box = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };

// The fronts, grown by two pixels. Everything this touches is a BLEND of a
// door and whatever is behind it — an antialiased edge is a pink pixel that
// belongs to neither surface, and it is exactly where a naive white-carcass
// sample finds its imaginary colour cast.
const near = new Uint8Array(w * h);
for (let y = 0; y < h; y += 1) {
  for (let x = 0; x < w; x += 1) {
    if (!door[y * w + x]) continue;
    for (let dy = -2; dy <= 2; dy += 1) {
      const yy = y + dy;
      if (yy < 0 || yy >= h) continue;
      for (let dx = -2; dx <= 2; dx += 1) {
        const xx = x + dx;
        if (xx >= 0 && xx < w) near[yy * w + xx] = 1;
      }
    }
  }
}
// ── C. room depth, and the line the FLOOR starts at ──
// The wall is bounded by TWO steps, not one: the background above it and the
// floor below it. Both are found rather than assumed, because the camera moves
// between captures and a fixed fraction of the frame would be measuring the
// ceiling in one shot and the skirting in the next.
//
// The lower step is also what the seating test needs. Turn 10's first pass
// compared "floor under the run" against "floor beside it" by screen row alone
// and measured a difference of 0.074 with every shadow in the scene switched
// off — because the room's own wall/floor tone step (F3) crosses those rows
// diagonally, so half of "beside it" was WALL. The junction is found per
// column and interpolated across the columns the furniture occludes, and
// nothing above it is called floor.
const junctionAt = new Float32Array(w).fill(-1);
const columns = [];
for (let x = 0; x < w; x += 1) {
  let hasDoor = false;
  for (let y = 0; y < h && !hasDoor; y += 1) if (door[y * w + x]) hasDoor = true;
  if (hasDoor) continue;
  const col = [];
  for (let y = 0; y < h; y += 1) col.push(L[y * w + x]);
  const step = (y) => Math.abs((col[y - 2] + col[y - 1]) / 2 - (col[y + 2] + col[y + 3]) / 2);
  const contrastAt = (y) => median(col.slice(Math.max(0, y - 24), Math.max(1, y - 6)))
    - median(col.slice(Math.min(h - 1, y + 6), Math.min(h, y + 24)));
  // Every local maximum of the step, judged by the CONTRAST across it rather
  // than by the step alone. Once the wall carries a real gradient the brightest
  // edge of a spot pool can out-step the junction, and a detector that takes
  // the biggest step starts reporting the pool as the junction — which is how
  // a scene that had visibly improved measured as 18 % less readable.
  const candidates = [];
  for (let y = Math.round(h * 0.35); y < h - 4; y += 1) {
    const st = step(y);
    if (st > step(y - 1) && st >= step(y + 1) && st > 0.004) candidates.push([st, y]);
  }
  candidates.sort((p, q) => q[0] - p[0]);
  let jStep = 0; let jY = -1; let jContrast = 0;
  for (const [st, y] of candidates.slice(0, 6)) {
    const c = contrastAt(y);
    if (Math.abs(c) > Math.abs(jContrast)) { jContrast = c; jStep = st; jY = y; }
  }
  if (jY < 0) continue;
  junctionAt[x] = jY;
  if (x % 4) continue;                              // every fourth column is enough to judge C
  let tStep = 0; let tY = 2;
  for (let y = 2; y < Math.min(jY - 8, Math.round(h * 0.45)); y += 1) {
    const st = step(y);
    if (st > tStep) { tStep = st; tY = y; }
  }
  const wallH = jY - tY;
  if (wallH < 24) continue;
  const band = Math.max(4, Math.round(wallH * 0.25));
  const hi = mean(col.slice(tY + 3, tY + 3 + band));
  const lo = mean(col.slice(jY - 3 - band, jY - 3));
  columns.push({
    x,
    junctionY: jY,
    junctionStep: jStep,
    junctionContrast: jContrast,
    wallLum: median(col.slice(Math.max(0, jY - 24), Math.max(1, jY - 6))),
    wallTop: tY,
    wallH,
    gradient: hi - lo,
  });
}
// Across the run, where no column could be read: a straight line between the
// last reading on each side. The back wall's junction IS a straight line in
// screen space, so this is interpolation and not invention.
{
  let lastX = -1;
  for (let x = 0; x < w; x += 1) {
    if (junctionAt[x] < 0) continue;
    if (lastX >= 0 && x - lastX > 1) {
      for (let g = lastX + 1; g < x; g += 1) {
        junctionAt[g] = junctionAt[lastX] + ((junctionAt[x] - junctionAt[lastX]) * (g - lastX)) / (x - lastX);
      }
    }
    lastX = x;
  }
  for (let x = 0; x < w; x += 1) if (junctionAt[x] < 0) junctionAt[x] = junctionAt[Math.max(0, x - 1)] || h;
}
const readable = columns.filter((c) => Math.abs(c.junctionContrast) > 0.02);
const depth = {
  columns: columns.length,
  readableFraction: columns.length ? readable.length / columns.length : 0,
  junctionStep: median(columns.map((c) => c.junctionStep)),
  junctionContrast: median(columns.map((c) => c.junctionContrast)),
  junctionContrastAbs: median(columns.map((c) => Math.abs(c.junctionContrast))),
  wallLum: median(columns.map((c) => c.wallLum)),
  gradient: median(columns.map((c) => c.gradient)),
  gradientAbs: median(columns.map((c) => Math.abs(c.gradient))),
};

// ── A. seating ──
// "Every unit sits in a soft shadow; the floor between the legs is visibly
// darker than the OPEN floor." Two numbers, and getting the second one right
// took three attempts:
//
//   1. floor beside the run at the same screen rows — wrong, because the key
//      light lays its own shadow exactly there, so the reference was itself
//      in shadow and the difference cancelled to zero.
//   2. the same, before the junction line existed — wrong twice over, because
//      half of "beside the run" was WALL (F3 gave it its own tone) and the
//      0.074 that measured was the paint, not the light.
//   3. this: the open floor is the 80th percentile of every floor pixel in the
//      frame — the level the floor sits at where nothing is standing on it.
//      The floor is Lambert with no environment probe, so its brightness does
//      not vary with the angle it is seen at; anywhere unshadowed reads the
//      same, and a percentile finds that level without being told where it is.
//
// "under" is the floor at the toe of the run, from the first row where the
// legs have stopped occluding it, over the near half of what is left.
const BG = (() => { const p = at(2, 2); return [p.r, p.g, p.b]; })();
const isFloor = (x, y) => {
  const i = y * w + x;
  if (y <= junctionAt[x] + 3) return false;         // above the junction: that is wall
  if (near[i] || S[i] > 0.18 || L[i] < 0.20) return false;
  const p = at(x, y);
  // Outside the room's own floor polygon there is only the scene background,
  // which is not a surface and is not tone-mapped with the rest of the frame.
  if (Math.abs(p.r - BG[0]) < 3 && Math.abs(p.g - BG[1]) < 3 && Math.abs(p.b - BG[2]) < 3) return false;
  return true;
};
const allFloor = [];
for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if (isFloor(x, y)) allFloor.push(L[y * w + x]);
const sortedFloor = [...allFloor].sort((a, b) => a - b);
const pct = (f) => (sortedFloor.length ? sortedFloor[Math.floor((sortedFloor.length - 1) * f)] : 0);
const openRef = pct(0.80);
// The toe line: for every column the run stands in, the first floor pixel
// BELOW it and the few that follow. A rectangle of rows cannot do this — the
// run is seen at an angle, so the floor beside its left-hand end is metres
// further away than the floor beside its right-hand end, and averaging the two
// mixes one part shadow with six parts open floor. (Measured: 0.006 for a blob
// that is plainly there at 0.065 on its best row.)
const TOE = Math.max(5, Math.round(box.h * 0.16));
const toe = [];
let toeColumns = 0;
for (let x = minX; x <= maxX; x += 1) {
  let bottom = -1;
  for (let y = maxY; y >= minY; y -= 1) if (door[y * w + x]) { bottom = y; break; }
  if (bottom < 0) continue;
  // Down past the legs and the black outline under the carcass, to the floor.
  let y = bottom + 1;
  while (y < h && !isFloor(x, y)) y += 1;
  if (y >= h) continue;
  toeColumns += 1;
  for (let k = 0; k < TOE && y + k < h; k += 1) if (isFloor(x, y + k)) toe.push(L[(y + k) * w + x]);
}
const sortedToe = [...toe].sort((p, q) => p - q);
const seating = {
  toeColumns,
  toePixels: toe.length,
  open: openRef,
  floorFloor: pct(0.05),
  under: mean(toe),
  darkest: sortedToe.length ? sortedToe[Math.floor(sortedToe.length * 0.1)] : 0,
  // How much of the floor is in shadow at all — a blob that bakes to nothing
  // and a key that casts nothing both read 0 here, whatever the average says.
  shadedFraction: allFloor.length
    ? allFloor.filter((v) => v < openRef - 0.03).length / allFloor.length : 0,
};
seating.delta = seating.open - seating.under;

// ── B. the glint: the brightest CELL of the fronts, in door-relative coords ──
const CELL = 14;
const gc = Math.ceil(box.w / CELL); const gr = Math.ceil(box.h / CELL);
const sum = new Float64Array(gc * gr); const cnt = new Float64Array(gc * gr);
for (let y = minY; y <= maxY; y += 1) {
  for (let x = minX; x <= maxX; x += 1) {
    const i = y * w + x;
    if (!door[i]) continue;
    const g = Math.floor((y - minY) / CELL) * gc + Math.floor((x - minX) / CELL);
    sum[g] += L[i]; cnt[g] += 1;
  }
}
let best = -1; let bestG = -1;
const cellMeans = [];
for (let g = 0; g < sum.length; g += 1) {
  if (cnt[g] < CELL * CELL * 0.45) continue;      // a whole cell of door, not an edge
  const m = sum[g] / cnt[g];
  cellMeans.push(m);
  if (m > best) { best = m; bestG = g; }
}
const glint = bestG < 0 ? null : {
  u: ((bestG % gc) + 0.5) / gc,
  v: (Math.floor(bestG / gc) + 0.5) / gr,
  peak: best,
  median: median(cellMeans),
  ratio: median(cellMeans) > 0 ? best / median(cellMeans) : 0,
  cells: cellMeans.length,
};

// ── D. colour ──
const doorL = [];
for (let i = 0; i < door.length; i += 1) if (door[i]) doorL.push(L[i]);
const sorted = [...doorL].sort((a, b) => a - b);
const q1 = sorted[Math.floor(sorted.length * 0.35)];
const q3 = sorted[Math.floor(sorted.length * 0.75)];
let blown = 0; let hueSum = 0; let hueN = 0;
let rSum = 0; let gSum = 0; let bSum = 0;
for (let y = minY; y <= maxY; y += 1) {
  for (let x = minX; x <= maxX; x += 1) {
    const i = y * w + x;
    if (!door[i]) continue;
    // The pink-blowout signature measured at point intensity 45: the surface
    // keeps its hue, goes very bright and loses its saturation with it.
    if (L[i] > 0.72 && S[i] < 0.30) blown += 1;
    if (L[i] < q1 || L[i] > q3) continue;
    const p = at(x, y);
    rSum += p.r; gSum += p.g; bSum += p.b;
    hueSum += HU[i]; hueN += 1;
  }
}
const midRgb = hueN ? [rSum / hueN, gSum / hueN, bSum / hueN] : [0, 0, 0];
const midHsl = hsl(midRgb[0], midRgb[1], midRgb[2]);
// The white pieces: everything inside the run that is not a front and is
// light — the carcass sides, the tops, the visible edges. Measured as CHROMA
// (max channel minus min, 0-1) and not as HSL saturation, because HSL
// saturation goes to 1 for every tint of white and would have called a
// perfectly neutral #fffefd "fully saturated". The carcass board itself is
// #F2F0EC, which is 0.024 of chroma; anything under about 0.06 is the same
// white with a warm light on it, and anything over it is a light that has
// stopped being white.
const white = [];
for (let y = minY; y <= maxY; y += 1) {
  for (let x = minX; x <= maxX; x += 1) {
    const i = y * w + x;
    if (door[i] || near[i] || L[i] < 0.55) continue;
    const p = at(x, y);
    white.push((Math.max(p.r, p.g, p.b) - Math.min(p.r, p.g, p.b)) / 255);
  }
}

return {
  ok: true,
  size: { w, h },
  box,
  doorN,
  seating,
  glint,
  depth,
  colour: {
    midRgb: midRgb.map((v) => Math.round(v)),
    midHue: hueN ? hueSum / hueN : 0,
    midSat: midHsl.s,
    midLum: midHsl.l,
    hueGap: hueGap(hueN ? hueSum / hueN : 0, ${hue}),
    blownFraction: blown / doorN,
    whiteChroma: mean(white),
    whiteN: white.length,
  },
};
`;
}

/** #rrggbb → hue in degrees. */
function hueOf(hex) {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b); const mn = Math.min(r, g, b); const d = mx - mn;
  if (d < 1e-6) return 0;
  let h;
  if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return h * 60;
}

// ─── driving the app ─────────────────────────────────────────────────────────

async function section(page, header, contains) {
  const isOpen = () => page.evaluate(
    `return [...document.querySelectorAll('button')].some((b) => b.offsetParent && b.textContent.includes(${JSON.stringify(contains)}));`,
  );
  for (let i = 0; i < 4; i += 1) {
    if (await isOpen()) return true;
    // The right panel is still laying itself out for a beat after a unit is
    // added, and a header that is not there yet is not a failure — it is a
    // reason to wait and look again.
    await page.click('button', header).catch(() => {});
    await page.sleep(450);
  }
  return isOpen();
}

/** Drag on the canvas, away from the furniture, which is how OrbitControls turns. */
async function orbit(page, dx, dy = 0) {
  const rect = await page.evaluate(`
    const c = document.querySelector('canvas'); const r = c.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };`);
  // Low and to the left: open floor, never a cabinet and never the floating
  // library. A drag that starts on a unit MOVES the unit — every mesh in this
  // app takes the pointer for itself — and one that starts on a panel never
  // reaches the canvas at all, which is how the first pass of this script
  // "orbited" three times to the same picture.
  const x0 = rect.x + rect.w * 0.2;
  const y0 = rect.y + rect.h * 0.86;
  await page.mouse('mousePressed', x0, y0);
  const stepsN = 12;
  for (let i = 1; i <= stepsN; i += 1) {
    await page.mouse('mouseMoved', x0 + (dx * i) / stepsN, y0 + (dy * i) / stepsN);
  }
  await page.mouse('mouseReleased', x0 + dx, y0 + dy);
  await page.sleep(900);           // OrbitControls damping, then a clean frame
}

async function capture(page, hue, file) {
  // A fresh frame before the read-back: `preserveDrawingBuffer` keeps the last
  // one, and the last one may predate the change being measured.
  await page.sleep(250);
  const data = await page.evaluate(analyseExpression(hue));
  if (file) await page.screenshot(file);
  return data;
}

// ─── The bake probe (CLAUDE.md F2.2) ────────────────────────────────────────
//
// CLAUDE.md's warning, in code: drei bakes the contact shadow into a
// WebGLRenderTarget under a scene-wide depth override, and at least one
// software-GL stack renders that bake as pure zeros while drawing everything
// else fine. Believing a screenshot without checking is exactly how turn 9
// shipped an invisible shadow.
//
// The hook this installs is a NO-OP unless drei has been patched locally to
// call it (one line after `gl.setRenderTarget(null)` in
// node_modules/@react-three/drei/core/ContactShadows.js — never committed;
// node_modules is not ours to edit in a diff). When it has been, this reports
// three things a picture cannot: how many times the bake ran, the largest
// alpha it actually wrote, and how many lights in the scene own a shadow map.
const PROBE = `
window.__ccBakes = 0;
window.__ccProbeFired = false;
window.__ccProbe = (gl, rt, scene) => {
  window.__ccProbeFired = true;
  window.__ccBakes += 1;
  try {
    const w = rt.width; const h = rt.height;
    const buf = new Uint8Array(w * h * 4);
    gl.readRenderTargetPixels(rt, 0, 0, w, h, buf);
    let maxAll = 0; let maxCentre = 0;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const a = buf[(y * w + x) * 4 + 3];
        if (a > maxAll) maxAll = a;
        const inCentre = x > w * 0.25 && x < w * 0.75 && y > h * 0.25 && y < h * 0.75;
        if (inCentre && a > maxCentre) maxCentre = a;
      }
    }
    window.__ccMaxAlpha = maxAll;
    window.__ccMaxAlphaCentre = maxCentre;
    window.__ccBakeSize = [w, h];
  } catch (e) { window.__ccProbeError = String(e && e.message); }
  const casters = [];
  scene.traverse((o) => { if (o.isLight && o.castShadow) casters.push(o.type); });
  window.__ccCasters = casters;
};
window.__ccProbeRaw = (gl, rt, scene, cam, width, height) => {
  try {
    const w = rt.width; const h = rt.height;
    const buf = new Uint8Array(w * h * 4);
    gl.readRenderTargetPixels(rt, 0, 0, w, h, buf);
    let maxA = 0; let maxRGB = 0; let nonZero = 0;
    for (let i = 0; i < buf.length; i += 4) {
      if (buf[i + 3] > maxA) maxA = buf[i + 3];
      const m = Math.max(buf[i], buf[i + 1], buf[i + 2]);
      if (m > maxRGB) maxRGB = m;
      if (buf[i + 3] > 0 || m > 0) nonZero += 1;
    }
    let meshes = 0;
    scene.traverse((o) => { if (o.isMesh && o.visible) meshes += 1; });
    window.__ccRaw = {
      maxA, maxRGB, nonZero, meshes, bakeW: width, bakeH: height,
      cam: { left: cam.left, right: cam.right, top: cam.top, bottom: cam.bottom, near: cam.near, far: cam.far },
      camPos: cam.getWorldPosition(new (cam.position.constructor)()).toArray(),
    };
  } catch (e) { window.__ccRawError = String(e && e.message); }
};
window.__ccProbeReport = () => (window.__ccProbeFired ? {
  raw: window.__ccRaw || null,
  rawError: window.__ccRawError || null,
  bakes: window.__ccBakes,
  maxAlpha: window.__ccMaxAlpha,
  maxAlphaCentre: window.__ccMaxAlphaCentre,
  bakeSize: window.__ccBakeSize,
  shadowCasters: (window.__ccCasters || []).length,
  casterTypes: window.__ccCasters || [],
  error: window.__ccProbeError || null,
} : null);
return true;`;

const HUE = hueOf(RAL_3005);
const page = await launch({ width: 1600, height: 1000 });
const captured = [];

try {
  mkdirSync(OUT, { recursive: true });

  // ── 0. the profile under test ──
  await page.goto(BASE);
  if (OVERRIDE) {
    const tuned = merge(DEFAULT_CABINET_PROFILE, JSON.parse(OVERRIDE));
    await page.evaluate(`
      localStorage.setItem('cc.profile.v1', ${JSON.stringify(JSON.stringify(tuned))});
      return true;`);
    note('profile', `overridden — ${OVERRIDE}`);
  } else {
    await page.evaluate("localStorage.removeItem('cc.profile.v1'); return true;");
    note('profile', 'the shipped numbers, no override');
  }
  await page.evaluate("localStorage.removeItem('cc.project.cache.v1'); return true;");
  await page.goto(BASE);
  await page.waitFor('document.body.innerText.includes("NEW PROJECT")');
  await page.evaluate(PROBE);

  // ── 1. the standard scene, through the app's own controls (F4.2) ──
  await page.click('button', 'New project');
  await page.waitFor('/project number/i.test(document.body.innerText)');
  await page.click('button', 'Next', { exact: true });
  await page.sleep(250);
  await page.click('button', 'Kitchen');
  await page.click('button', 'Next', { exact: true });
  await page.sleep(250);
  await page.click('button', 'Whole room');
  await page.sleep(150);
  await page.click('button', 'Next — room setup').catch(async () => {
    await page.click('button', 'Next', { exact: true });
  });
  await page.sleep(500);
  await page.click('button', 'Rectangle').catch(() => {});
  await page.sleep(250);
  await page.click('button', 'Apply');
  await page.sleep(600);
  await page.click('button', 'Start designing');
  await page.waitFor('document.querySelector("canvas")');
  await page.sleep(1800);
  check('the canvas opens with a live 3D context', await page.evaluate(
    'const c = document.querySelector("canvas"); return Boolean(c && c.width > 100);',
  ));

  // Three base units in one run on wall 1, each finished with its doors —
  // doors are the LAST step on a unit (SPEC 4.10), so they go on before the
  // next one is added.
  const doorsFitted = () => page.evaluate(`
    const c = JSON.parse(localStorage.getItem('cc.project.cache.v1'));
    return c.units.filter((u) => u.params.doors && u.params.doors.count).length;`);
  for (let i = 0; i < 3; i += 1) {
    await page.click('button', 'Base unit', { exact: false });
    await page.sleep(800);
    // Twice if need be: the doors section opens on a click that occasionally
    // lands while the panel is still laying itself out, and a run photographed
    // with two doors instead of three is a run that measures something else.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (await doorsFitted() > i) break;
      await section(page, 'Doors', 'Add doors — finish unit');
      await page.click('button', 'Add doors — finish unit').catch(() => {});
      await page.sleep(800);
    }
  }
  const built = await page.evaluate(`
    const c = JSON.parse(localStorage.getItem('cc.project.cache.v1'));
    return {
      n: c.units.length,
      doors: c.units.filter((u) => u.params.doors && u.params.doors.count).length,
      xs: c.units.map((u) => u.position.x_mm),
    };`);
  check('three base units in one run, all with doors fitted',
    built.n === 3 && built.doors === 3, JSON.stringify(built));

  // ── 2. Sprayed RAL 3005 Wine Red, through the Sprayed picker ──
  await page.click('nav[aria-label="Main menu"] > div > button', 'Settings');
  await page.sleep(200);
  await page.click('[role="menu"] button', 'Design settings');
  await page.waitFor('document.body.innerText.includes("Sprayed")');
  await page.sleep(400);
  await page.click('button', 'Sprayed', { exact: true });
  await page.sleep(300);
  const picked = await page.evaluate(`
    const sel = [...document.querySelectorAll('select')]
      .find((s) => [...s.options].some((o) => /3005 Wine Red/.test(o.textContent)));
    if (!sel) return null;
    const opt = [...sel.options].find((o) => /3005 Wine Red/.test(o.textContent));
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    setter.call(sel, opt.value);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return opt.value;`);
  await page.sleep(500);
  check('the fronts are sprayed RAL 3005 Wine Red, picked in the app',
    picked === RAL_3005, `picker returned ${picked}`);

  const setSheen = async (value) => {
    await page.evaluate(`
      const range = [...document.querySelectorAll('input[type=range]')]
        .find((i) => i.max === '100' && i.step === '5');
      if (!range) return null;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(range, '${value}');
      range.dispatchEvent(new Event('change', { bubbles: true }));
      range.dispatchEvent(new Event('input', { bubbles: true }));
      return range.value;`);
    await page.sleep(400);
  };
  const sheenSet = await setSheen(SHEEN_A);
  check(`the project sheen is ${SHEEN_A} %`, sheenSet !== null, `slider reads ${sheenSet}`);
  await page.click('button', 'Close').catch(async () => { await page.click('button', 'Done'); });
  await page.sleep(600);

  // The tool chrome is not what is being judged — the dimension arrows and the
  // wall labels are drawn over the very junction criterion C is about, and the
  // floating library sits on the quarter of the canvas the orbit drag needs.
  await page.click('button', 'Hide dimensions').catch(() => {});
  await page.sleep(300);
  await page.click('button[aria-label="Close the library"]').catch(() => {});
  await page.sleep(400);

  // ── 3. the three-quarter shot (A, C, D) ──
  // OrbitControls turns by 2π × drag ÷ element height, so on a 1000 px canvas a
  // pixel is 0.36°: 95 across and 30 down is a 34° / 11° three-quarter, which is
  // the angle a workshop photographs a run from. (The first pass of this script
  // dragged 260 × 130 and ended up looking into the open BACKS of the cabinets
  // from above — every number it measured was of a picture nobody would take.)
  await orbit(page, 95, 30);
  const a = await capture(page, HUE, `${OUT}A-seating-3-4.png`);
  captured.push(['A', a]);
  if (!a.ok) throw new Error(`the frame could not be read: ${a.why}`);

  check('A · every unit sits in a shadow: the floor under the run is darker than the open floor',
    a.seating.delta > 0.012,
    `open floor ${a.seating.open.toFixed(3)} vs the toe line ${a.seating.under.toFixed(3)} (Δ ${a.seating.delta.toFixed(4)}, darkest tenth ${(a.seating.open - a.seating.darkest).toFixed(4)} down, over ${a.seating.toeColumns} columns / ${a.seating.toePixels} px, ${(a.seating.shadedFraction * 100).toFixed(1)} % of the floor shaded)`);

  check('C · the wall/floor junction is readable across the frame',
    a.depth.readableFraction >= 0.9 && a.depth.junctionContrastAbs > 0.02,
    `${(a.depth.readableFraction * 100).toFixed(0)} % of ${a.depth.columns} columns, wall and floor ${a.depth.junctionContrast.toFixed(3)} apart, edge step ${a.depth.junctionStep.toFixed(3)}`);
  check('C · the wall carries a vertical gradient, not one flat value',
    a.depth.gradientAbs > 0.012,
    `median gradient ${a.depth.gradient >= 0 ? '+' : ''}${a.depth.gradient.toFixed(4)} (|·| ${a.depth.gradientAbs.toFixed(4)}) top-of-wall to junction`);

  check('D · the sprayed front is still RAL 3005: a mid-lit pixel is within tolerance of its hue',
    a.colour.hueGap < 12,
    `hue ${a.colour.midHue.toFixed(1)}° vs ${HUE.toFixed(1)}° (gap ${a.colour.hueGap.toFixed(1)}°), rgb ${a.colour.midRgb.join(',')}`);
  check('D · nothing is blown out to pink',
    a.colour.blownFraction < 0.005, `${(a.colour.blownFraction * 100).toFixed(2)} % of the front`);
  check('D · the white carcass stays white',
    a.colour.whiteChroma < 0.06,
    `mean chroma ${a.colour.whiteChroma.toFixed(3)} over ${a.colour.whiteN} px (the board's own is 0.024)`);

  // `--quick` is the TUNING loop: one shot, every number printed, no sheen
  // round trip and no orbit sequence. A candidate set of profile numbers is
  // judged in fifty seconds instead of three minutes, and the full run is what
  // signs it off.
  if (args.includes('--quick')) {
    console.log(`\nQUICK  ${JSON.stringify({
      seating: a.seating, depth: a.depth, glint: a.glint, colour: a.colour,
    })}`);
  } else {

  // ── 4. the travelling glint (B) ──
  // At the top of the scale first, where a highlight is unmistakable, then back
  // to the working default to prove a softer gradient survives there.
  await page.click('nav[aria-label="Main menu"] > div > button', 'Settings');
  await page.sleep(200);
  await page.click('[role="menu"] button', 'Design settings');
  await page.sleep(400);
  await setSheen(SHEEN_B);
  await page.click('button', 'Close').catch(async () => { await page.click('button', 'Done'); });
  await page.sleep(700);

  const orbitFrames = [];
  for (let i = 0; i < 3; i += 1) {
    // ~27° of azimuth between frames. 17° was tried first and two of the three
    // highlight positions landed inside one measuring cell of each other: a
    // specular patch does travel at 17°, but by less than the door is wide, and
    // "three different places" has to mean three places a person would call
    // different.
    if (i > 0) await orbit(page, -75);
    const f = await capture(page, HUE, `${OUT}B${i + 1}-glint-sheen${SHEEN_B}.png`);
    orbitFrames.push(f);
    captured.push([`B${i + 1}`, f]);
  }
  const glints = orbitFrames.map((f) => f.glint).filter(Boolean);
  const uv = glints.map((g) => `(${g.u.toFixed(2)}, ${g.v.toFixed(2)})×${g.ratio.toFixed(2)}`);
  // Door-RELATIVE coordinates: the whole frame moves when the camera does, so a
  // highlight that merely moved on screen has proved nothing at all.
  const spread = glints.length < 3 ? 0 : Math.max(
    ...glints.flatMap((g, i) => glints.slice(i + 1).map((o) => Math.hypot(g.u - o.u, g.v - o.v))),
  );
  const distinct = glints.length === 3 && glints.every((g, i) => glints.slice(i + 1)
    .every((o) => Math.hypot(g.u - o.u, g.v - o.v) > 0.06));
  check(`B · at sheen ${SHEEN_B} the highlight patch is in three different places on the same door`,
    distinct && glints.every((g) => g.ratio > 1.06),
    `${uv.join('  ')} — widest separation ${spread.toFixed(3)} of the run`);

  await page.click('nav[aria-label="Main menu"] > div > button', 'Settings');
  await page.sleep(200);
  await page.click('[role="menu"] button', 'Design settings');
  await page.sleep(400);
  await setSheen(SHEEN_A);
  await page.click('button', 'Close').catch(async () => { await page.click('button', 'Done'); });
  await page.sleep(700);
  const soft = await capture(page, HUE, `${OUT}B4-sheen${SHEEN_A}-gradient.png`);
  captured.push(['B4', soft]);
  check(`B · at sheen ${SHEEN_A} a softer sheen gradient is still visible on the front`,
    Boolean(soft.glint) && soft.glint.ratio > 1.03,
    soft.glint ? `peak/median ${soft.glint.ratio.toFixed(3)}` : 'no cell survived');

  // ── 5. the room, from the other quarter (C) ──
  await orbit(page, 140, -22);
  const c = await capture(page, HUE, `${OUT}C-room-depth.png`);
  captured.push(['C', c]);
  check('C · …and it still reads from the second angle',
    c.depth.readableFraction >= 0.9 && c.depth.gradientAbs > 0.012,
    `${(c.depth.readableFraction * 100).toFixed(0)} % of ${c.depth.columns} columns, contrast ${c.depth.junctionContrast.toFixed(3)}, gradient ${c.depth.gradient.toFixed(4)}`);
  }

  // ── 5b. the STILL, from the same rig (iron rule 16) ──
  // The working view and the render share one set of lights, one tone mapping
  // and one exposure, so a joiner can judge from the screen what the customer
  // will be sent. This turn moved the room half a millimetre and re-anchored
  // the contact shadow, and the render pass looks through a camera of its own
  // and hides walls for itself — so it is photographed here rather than
  // assumed.
  await page.click('nav[aria-label="Main menu"] > div > button', 'Output');
  await page.sleep(200);
  await page.click('[role="menu"] button', 'Render');
  await page.waitFor('document.body.innerText.includes("Render")');
  await page.sleep(500);
  await page.click('button', '3/4 Left').catch(() => {});
  await page.sleep(300);
  await page.click('button', 'Render', { exact: true });
  await page.sleep(6000);
  const still = await page.evaluate(`
    const img = [...document.querySelectorAll('img')].find((i) => (i.src || '').startsWith('data:image/png'));
    if (!img) return null;
    const c = document.createElement('canvas');
    c.width = 480; c.height = Math.round(480 * img.naturalHeight / img.naturalWidth);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let min = 255; let max = 0; let dark = 0; let red = 0;
    for (let i = 0; i < d.length; i += 4) {
      const l = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      if (l < min) min = l;
      if (l > max) max = l;
      if (l < 150) dark += 1;
      if (d[i] > d[i + 1] * 1.6 && d[i] > d[i + 2] * 1.4) red += 1;
    }
    return { w: img.naturalWidth, h: img.naturalHeight, range: Math.round(max - min), dark, red };`);
  check('the still comes back with the working view’s own tonal range in it',
    still && still.w > 800 && still.range > 90 && still.dark > 200 && still.red > 500,
    still ? JSON.stringify(still) : 'no render');
  if (still) await page.screenshot(`${OUT}D-render-still.png`);
  await page.click('button', 'Close').catch(() => {});
  await page.sleep(400);

  // ── 6. cost (E) ──
  // The question is not how many bakes a whole session costs — every layout
  // change legitimately re-keys <ContactShadows> and buys one, and drei's
  // `frames` counter is a plain `let` in the component body, so it resets on
  // every React render too. The question is whether ORBITING costs anything,
  // because orbiting is what a joiner does all day. So: read the counter, turn
  // the scene without touching it, and read it again.
  const bakesBefore = await page.evaluate('return window.__ccProbeFired ? window.__ccBakes : null;');
  await orbit(page, -60, 18);
  await page.sleep(2500);
  await orbit(page, 60, -18);
  await page.sleep(2500);
  const bakesAfter = await page.evaluate('return window.__ccProbeFired ? window.__ccBakes : null;');
  if (bakesBefore !== null) {
    // Only meaningful when drei has been patched to report — in a stock build
    // the counter never moves off zero and "0 → 0" would be a check that
    // passes by knowing nothing.
    check('E · orbiting the scene costs no bake at all',
      bakesAfter === bakesBefore,
      `${bakesBefore} → ${bakesAfter} across two orbits and five idle seconds`);
  }

  // `window.__ccProbe` only exists in a locally patched drei (see BUILD-LOG,
  // F2.2); in a clean build this reports what it can and says so.
  const probe = await page.evaluate('return window.__ccProbeReport ? window.__ccProbeReport() : null;');
  if (probe) {
    // Three units were added, each one a layout change and so one re-key of
    // <ContactShadows frames={1}>; the sprayed colour and the sheen are not
    // layout and must not re-bake. Anything beyond that is a per-frame bake.
    note('E', `${probe.bakes} bakes across the whole run — one per layout change and one per re-render of FloorShadow, which is what drei's frames counter actually means (it is a plain let in the component body, not a ref)`);
    check('E · at most two shadow casters in the whole rig',
      probe.shadowCasters <= 2, `${probe.shadowCasters}: ${probe.casterTypes.join(', ') || 'none'}`);
    check('E · the bake lands non-zero alpha in this environment (CLAUDE.md F2.2)',
      probe.maxAlphaCentre > 4,
      `max alpha ${probe.maxAlpha} overall / ${probe.maxAlphaCentre} in the centre of a ${(probe.bakeSize || []).join('×')} target${probe.error ? ` — ${probe.error}` : ''}`);
  } else {
    note('E', 'no drei probe in this build (node_modules unpatched) — see BUILD-LOG turn 10 F2.2 for the probe run');
  }

  check('nothing wrote an error to the console',
    page.errors.filter(worthComplainingAbout).length === 0,
    page.errors.filter(worthComplainingAbout).slice(0, 3).join(' | '));
} catch (e) {
  check('the run finished', false, e.message);
  await page.screenshot(`${OUT}failure.png`).catch(() => {});
} finally {
  writeFileSync(`${OUT}measurements.json`, `${JSON.stringify(
    { base: BASE, override: OVERRIDE, hue: HUE, steps, captured }, null, 2,
  )}\n`);
  await page.close();
}

function worthComplainingAbout(line) {
  return !/favicon|404 \(Not Found\)/.test(line);
}

const failed = steps.filter((s) => !s.ok);
console.log(`\n${steps.length - failed.length}/${steps.length} checks passed`);
process.exit(failed.length ? 1 : 0);
