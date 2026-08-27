#!/usr/bin/env node
// ─── A DXF, OPENED IN A VIEWER (turn 53, CLAUDE.md F2) ──────────────────────
//
//   *"Commit one sample DXF set under `verify/t53/dxf/` and open at least one
//   in a viewer for a screenshot. A green suite that never opened the file is
//   exactly how this stayed broken for five days."*
//
// So this is the viewer, and the important thing about it is what it does NOT
// know: it reads the file as R12 group-code pairs and draws what it finds.
// It never imports the engine, never imports `engine/cnc/dxf.js`, and could not
// tell you what a cabinet is. Whatever appears on the glass came out of the
// BYTES.
//
// Zero dependencies: an HTML page with an inline SVG, opened in the same
// Chromium `scripts/cdp.mjs` drives for every other acceptance walk.
//
// Usage:
//     node scripts/t53-dxf-view.mjs verify/t53/dxf/01-BUL.dxf [more.dxf …] \
//       --out verify/t53/f2-dxf-in-a-viewer.png

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { launch } from './cdp.mjs';

/** Group-code pairs. Nothing about this file knows what made it. */
function pairs(text) {
  const lines = text.split('\r\n');
  const body = lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines;
  const out = [];
  for (let i = 0; i + 1 < body.length; i += 2) out.push([Number(body[i].trim()), body[i + 1]]);
  return out;
}

/** POLYLINEs, CIRCLEs, ARCs and TEXTs, straight off the pairs. */
export function readEntities(text) {
  const ents = [];
  let section = null;
  let cur = null;
  const push = () => { if (cur) ents.push(cur); cur = null; };
  const p = pairs(text);
  for (let i = 0; i < p.length; i += 1) {
    const [code, value] = p[i];
    if (code === 0) {
      if (value === 'SECTION') { section = p[i + 1]?.[1] || null; continue; }
      if (value === 'ENDSEC') { push(); section = null; continue; }
      if (section !== 'ENTITIES') continue;
      if (value === 'VERTEX') {
        if (cur?.type === 'poly') cur.pending = { x: 0, y: 0 };
        continue;
      }
      if (value === 'SEQEND') continue;
      push();
      if (value === 'POLYLINE') cur = { type: 'poly', layer: '0', pts: [], closed: false };
      else if (value === 'CIRCLE') cur = { type: 'circle', layer: '0' };
      else if (value === 'ARC') cur = { type: 'arc', layer: '0' };
      else if (value === 'TEXT') cur = { type: 'text', layer: '0', str: '' };
      continue;
    }
    if (section !== 'ENTITIES' || !cur) continue;
    if (code === 8) cur.layer = value;
    if (cur.type === 'poly') {
      if (code === 70) cur.closed = Number(value) === 1;
      if (cur.pending && code === 10) cur.pending.x = Number(value);
      if (cur.pending && code === 20) {
        cur.pending.y = Number(value);
        cur.pts.push([cur.pending.x, cur.pending.y]);
      }
    } else if (cur.type === 'circle' || cur.type === 'arc') {
      if (code === 10) cur.cx = Number(value);
      if (code === 20) cur.cy = Number(value);
      if (code === 40) cur.r = Number(value);
      if (code === 50) cur.a0 = Number(value);
      if (code === 51) cur.a1 = Number(value);
    } else if (cur.type === 'text') {
      if (code === 10) cur.x = Number(value);
      if (code === 20) cur.y = Number(value);
      if (code === 40) cur.h = Number(value);
      if (code === 1) cur.str = value;
    }
  }
  push();
  return ents;
}

const INK = {
  OUTLINE: '#e9e4d8',
  UNIT_NUMBER: '#d8b45a',
};
const inkOf = (layer) => INK[layer] || (
  /HOLE|HINGE|SCREW|DOWEL/i.test(layer) ? '#7ec4ff'
    : /POCKET|SOCKET|GROOVE|RUNNER|BONE/i.test(layer) ? '#8fd18a' : '#b9b2a4');

/** One file as an SVG, drawn from its own bytes. */
function svgOf(text, title) {
  const ents = readEntities(text);
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  const hit = (x, y) => {
    if (x < minX) minX = x; if (y < minY) minY = y;
    if (x > maxX) maxX = x; if (y > maxY) maxY = y;
  };
  for (const e of ents) {
    if (e.type === 'poly') for (const [x, y] of e.pts) hit(x, y);
    else if (e.type === 'circle' || e.type === 'arc') { hit(e.cx - e.r, e.cy - e.r); hit(e.cx + e.r, e.cy + e.r); }
    else if (e.type === 'text') hit(e.x, e.y);
  }
  if (!Number.isFinite(minX)) return `<div class="card"><h2>${title}</h2><p class="bad">NOTHING IN THIS FILE</p></div>`;
  const pad = Math.max(6, (maxX - minX) * 0.04);
  const w = (maxX - minX) + pad * 2;
  const h = (maxY - minY) + pad * 2;
  const body = [];
  for (const e of ents) {
    const ink = inkOf(e.layer);
    if (e.type === 'poly' && e.pts.length >= 2) {
      const d = e.pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ') + (e.closed ? ' Z' : '');
      body.push(`<path d="${d}" fill="none" stroke="${ink}" stroke-width="${w / 380}"/>`);
    } else if (e.type === 'circle') {
      body.push(`<circle cx="${e.cx}" cy="${e.cy}" r="${e.r}" fill="none" stroke="${ink}" stroke-width="${w / 500}"/>`);
    } else if (e.type === 'text' && e.str) {
      body.push(`<text x="${e.x}" y="${e.y}" font-size="${e.h}" fill="${ink}"`
        + ` text-anchor="middle" dominant-baseline="middle"`
        + ` transform="scale(1,-1) translate(0,${-2 * e.y})">${e.str.replace(/[<&]/g, '')}</text>`);
    }
  }
  const counts = ents.reduce((m, e) => ({ ...m, [e.type]: (m[e.type] || 0) + 1 }), {});
  return `<div class="card">
  <h2>${title}</h2>
  <svg viewBox="${minX - pad} ${-(maxY + pad)} ${w} ${h}" preserveAspectRatio="xMidYMid meet">
    <g transform="scale(1,-1)">${body.join('')}</g>
  </svg>
  <p class="meta">${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(' · ')}
   · extents ${Math.round(minX)},${Math.round(minY)} → ${Math.round(maxX)},${Math.round(maxY)}</p>
</div>`;
}

export function pageFor(files) {
  return `<!doctype html><meta charset="utf-8"><title>T53 · the DXF, opened</title>
<style>
  body { margin:0; background:#14140f; color:#e9e4d8; font:13px/1.5 ui-monospace,Menlo,Consolas,monospace; padding:22px; }
  h1 { font-size:15px; letter-spacing:.14em; text-transform:uppercase; color:#d8b45a; margin:0 0 4px; }
  .lede { color:#9a9384; margin:0 0 20px; max-width:70ch; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:16px; }
  .card { background:#1c1c15; border:1px solid #2f2f24; border-radius:6px; padding:10px; }
  h2 { font-size:12px; margin:0 0 8px; color:#d8b45a; }
  svg { width:100%; height:230px; display:block; }
  .meta { color:#8b8577; font-size:11px; margin:8px 0 0; }
  .bad { color:#e06c5a; }
</style>
<h1>T53 · F2 — the DXF export, opened</h1>
<p class="lede">Drawn from the FILES in <code>verify/t53/dxf/</code> by a reader that knows only
DXF R12 group codes — it never imports the engine. Whatever is on this page came out of the bytes.</p>
<div class="grid">${files.map((f) => svgOf(f.text, f.name)).join('')}</div>`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const outAt = argv.indexOf('--out');
  const out = outAt >= 0 ? argv[outAt + 1] : 'verify/t53/f2-dxf-in-a-viewer.png';
  const paths = argv.filter((a) => a.endsWith('.dxf'));
  if (!paths.length) {
    process.stdout.write('usage: node scripts/t53-dxf-view.mjs <file.dxf> … [--out shot.png]\n');
    process.exit(2);
  }
  const files = paths.map((p) => ({ name: basename(p), text: readFileSync(p, 'utf8') }));
  const html = pageFor(files);
  const page404 = `${dirname(out)}/.dxf-viewer.html`;
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(page404, html);

  const page = await launch({ width: 1500, height: 1000, port: 9490 });
  await page.goto(`file://${process.cwd()}/${page404}`);
  await page.waitFor('document.querySelectorAll("svg").length > 0', { timeout: 20000 });
  await page.sleep(400);
  // The proof is on the glass: how many paths a reader that never met this
  // engine drew out of the files.
  const drawn = await page.evaluate('return document.querySelectorAll("svg path, svg circle").length;');
  await page.screenshot(out);
  await page.close();
  process.stdout.write(`${files.length} file(s) → ${drawn} shapes drawn from their bytes → ${out}\n`);
  process.exit(drawn > 0 ? 0 : 1);
}
