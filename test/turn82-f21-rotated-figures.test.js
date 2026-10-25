/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T82 F21, AFTER THE REVIEW · A VERTICAL FIGURE PRINTS WHERE THE DRAWING PUTS IT
//
// The owner, 25.10.2026, 11:40: *"musze miec dzisiaj profesjonalne rysunki
// dla klientow"*; the law: the drawings are the model. E2 measured it
// (verify/t82/agents/E2.md section 11) and E1 probed it again: the PDF
// writer handed jsPDF `align: 'center'` and `baseline: 'middle'` with an
// `angle`, and jsPDF applies both along the PAGE's axes before it turns the
// text, so a figure up a vertical chain printed 2.97 mm left of its anchor
// and 1.26 mm along its line (a "888" anchored at x 100 inked x 96.2 to 97.9).
// The writer now turns the anchor itself: half the text's width back along
// its line (jsPDF's own getTextWidth), and jsPDF's own middle offset across
// it, so 'middle' and 'center' hold at any angle. Flat text is untouched.
// The SVG needed nothing: text-anchor and dominant-baseline are laid out
// before the rotate transform, and Chromium inks the same "888" centred on
// its anchor (the probe table in verify/t82/agents/E1.md).

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import jsPDFDefault from 'jspdf';

import { bookletDoc, pdfBytes } from '../src/lib/drawingExport.js';
import { sheetToSvg } from '../src/engine/drawings/svg.js';

const jsPDF = jsPDFDefault?.jsPDF || jsPDFDefault;
const W = 200;
const H = 120;
const fig = (x, y, rotate, align = 'centre', s = '888') => ({
  kind: 'text', layer: 'DIMENSIONS', x, y, text: s, height: 2.5, align, ...(rotate ? { rotate } : {}),
});

/**
 * Every text the PDF writes on page 1, read off the page's own content stream
 * (jsPDF writes `BT /F1 size Tf ... a b c d e f Tm (s) Tj ET` for a turned
 * text, `e f Td` for a flat one), in PAPER mm, Y up, as the sheet holds it.
 */
const PT = 72 / 25.4;
const UNIT = new jsPDF({ unit: 'mm' });
function textsOf(doc) {
  const stream = doc.internal.pages[1].join('\n');
  const out = [];
  for (const block of stream.split('BT').slice(1)) {
    const size = Number((/\/F\d+ ([\d.]+) Tf/.exec(block) || [])[1]);
    const s = (/\((.*)\) Tj/.exec(block) || [])[1];
    const tm = /([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) Tm/.exec(block);
    const td = /([-\d.]+) ([-\d.]+) Td/.exec(block);
    const [a, b, e, f] = tm ? [Number(tm[1]), Number(tm[2]), Number(tm[5]), Number(tm[6])] : [1, 0, Number(td[1]), Number(td[2])];
    out.push({ s, size, a, b, x: e / PT, y: f / PT });
  }
  return out;
}
/**
 * Where a text's GLYPHS stand: from its origin, half its width along its line
 * and the figures' half height (0.35 of the size: Helvetica's figures stand
 * 0.7 em) across it. Widths are jsPDF's own font metrics.
 */
function inkOf(t) {
  const w = (UNIT.getStringUnitWidth(t.s) * t.size) / PT;
  const lift = (0.35 * t.size) / PT;
  return { x: t.x + t.a * (w / 2) - t.b * lift, y: t.y + t.b * (w / 2) + t.a * lift, w, start: [t.x, t.y], end: [t.x + t.a * w, t.y + t.b * w] };
}
const near = (v, want, what) => assert.ok(Math.abs(v - want) < 0.02, `${what}: ${v.toFixed(3)} is not ${want}`);

test('F21 after the review · a vertical "888" at x 100 prints centred on x 100, up the page and down it', () => {
  const sheet = { width: W, height: H, entities: [fig(100, 60, -90), fig(150, 60, 90)] };
  const [up, down] = textsOf(bookletDoc([sheet]));
  assert.deepEqual([Math.round(up.b), Math.round(down.b)], [1, -1], 'one reads up the page, the other down it');
  near(inkOf(up).x, 100, 'up: across the line'); near(inkOf(up).y, 60, 'up: along the line');
  near(inkOf(down).x, 150, 'down: across the line'); near(inkOf(down).y, 60, 'down: along the line');
});

test('F21 after the review · a vertical figure anchored left starts at its anchor; anchored right, ends there', () => {
  const sheet = { width: W, height: H, entities: [fig(30, 30, -90, 'left'), fig(170, 30, -90, 'right')] };
  const [left, right] = textsOf(bookletDoc([sheet])).map(inkOf);
  near(left.x, 30, 'left: across'); near(left.start[1], 30, 'left: the line starts at its anchor');
  near(right.x, 170, 'right: across'); near(right.end[1], 30, 'right: the line ends at its anchor');
});

test('F21 after the review · flat text is byte for byte as before (the page stream pinned before the fix)', () => {
  const flat = { width: W, height: H, entities: [
    { kind: 'text', layer: 'DIMENSIONS', x: 50, y: 90, text: '888', height: 2.5, align: 'centre' },
    { kind: 'text', layer: 'FRAME', x: 20, y: 20, text: 'SKYLON JOINERY', height: 4.4, align: 'left', weight: 'bold' },
    { kind: 'text', layer: 'SHEET_MUTED', x: 180, y: 20, text: '1:20 @ A3', height: 1.7, align: 'right' },
    { kind: 'text', layer: 'UNIT_NUMBER', x: 100, y: 50, text: '01', height: 3.4, mask: true },
  ] };
  const stream = bookletDoc([flat]).internal.pages[1].join('\n');
  assert.equal(createHash('sha256').update(stream).digest('hex'),
    'a0608e8b915d554b294f17f24c1e65dabc4d782aaaf8cabbf56cfe4b5a528fe5', 'the flat page stream moved');
  // The flat figure was centred all along, and still is.
  const [t] = textsOf(bookletDoc([{ width: W, height: H, entities: [fig(50, 90, 0)] }]));
  near(inkOf(t).x, 50, 'flat: x'); near(inkOf(t).y, 90, 'flat: y');
});

test('F21 after the review · the SVG is unchanged: a rotated figure keeps its anchor, text-anchor and central baseline', () => {
  const svg = sheetToSvg({ width: W, height: H, entities: [fig(100, 60, -90)] });
  const tag = svg.match(/<text [^>]*>888<\/text>/)[0];
  assert.match(tag, /x="100" y="60"/);
  assert.match(tag, /text-anchor="middle" dominant-baseline="central"/);
  assert.match(tag, /transform="rotate\(-90 100 60\)"/);
});

// The ink itself, where the machine has a PDF rasteriser (poppler): the glyphs
// of each figure, found on a 600 dpi raster of the exported page.
let poppler = false;
try { execFileSync('pdftoppm', ['-v'], { stdio: 'ignore' }); poppler = true; } catch { poppler = false; }

test('F21 after the review · on the printed page, every vertical figure is inked centred on its anchor', { skip: !poppler && 'no pdftoppm on this machine' }, () => {
  const cases = [[100, 60, -90], [150, 60, 90], [50, 90, 0]];
  const sheet = { width: W, height: H, entities: cases.map(([x, y, r]) => fig(x, y, r)) };
  const dir = mkdtempSync(join(tmpdir(), 'cc-rot-'));
  writeFileSync(join(dir, 'p.pdf'), Buffer.from(pdfBytes(bookletDoc([sheet]))));
  execFileSync('pdftoppm', ['-r', '600', '-gray', '-singlefile', join(dir, 'p.pdf'), join(dir, 'p')]);
  // A binary PGM is a header and the bytes: read it without a picture library.
  const pgm = readFileSync(join(dir, 'p.pgm'));
  const head = pgm.toString('latin1', 0, 64).split(/\s+/);
  const w = Number(head[1]); const h = Number(head[2]);
  const start = pgm.length - w * h;
  const px = 600 / 25.4;
  for (const [x, y] of cases) {
    const cx = x * px; const cy = (H - y) * px; const r = Math.round(8 * px);
    let x0 = Infinity; let x1 = -Infinity; let y0 = Infinity; let y1 = -Infinity;
    for (let yy = Math.max(0, Math.round(cy - r)); yy < Math.min(h, Math.round(cy + r)); yy += 1) {
      for (let xx = Math.max(0, Math.round(cx - r)); xx < Math.min(w, Math.round(cx + r)); xx += 1) {
        if (pgm[start + yy * w + xx] < 128) { x0 = Math.min(x0, xx); x1 = Math.max(x1, xx); y0 = Math.min(y0, yy); y1 = Math.max(y1, yy); }
      }
    }
    assert.ok(Number.isFinite(x0), `ink found for the figure at ${x}, ${y}`);
    const ix = (x0 + x1) / 2 / px; const iy = H - (y0 + y1) / 2 / px;
    assert.ok(Math.abs(ix - x) < 0.15, `the figure at x ${x} inks centred on x ${ix.toFixed(2)}`);
    assert.ok(Math.abs(iy - y) < 0.15, `the figure at y ${y} inks centred on y ${iy.toFixed(2)}`);
  }
});
