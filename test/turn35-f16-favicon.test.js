// ─── Turn 35, CLAUDE.md F16: THE FAVICON ────────────────────────────────────
//
// The spec, in full: *"The 404 goes: a simple original mark (the app's own
// square/monogram — nothing licensed), `favicon.ico` + the link tag."*
//
// Four things have to be true. The FILE exists and is a real icon, not an
// empty placeholder that answers 200 and draws nothing — so the ICO magic
// `00 00 01 00` is read and the directory it promises is walked. The PAGE
// asks for it, by the name the spec gives. The MARK is the app's own, in the
// app's own palette, and the .svg beside it is the same four rectangles rather
// than a second drawing that could drift. And nothing that stood in
// index.html before tonight has moved.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const ICO = new URL('public/favicon.ico', ROOT);
const SVG = new URL('public/favicon.svg', ROOT);
const HTML = readFileSync(new URL('index.html', ROOT), 'utf8');

// ─── the file the spec names ───────────────────────────────────────────────

test('public/favicon.ico exists and is not empty', () => {
  const stat = statSync(ICO);
  assert.ok(stat.isFile(), 'it is a file');
  assert.ok(stat.size > 0, 'and it has something in it');
});

test('it is a REAL icon: the ICO header, and a directory that adds up', () => {
  const b = readFileSync(ICO);
  assert.deepEqual([...b.subarray(0, 4)], [0x00, 0x00, 0x01, 0x00],
    'reserved 0, type 1 — the ICO magic');

  const count = b.readUInt16LE(4);
  assert.ok(count >= 1, 'at least one image');
  const sizes = [];
  for (let i = 0; i < count; i += 1) {
    const at = 6 + 16 * i;
    // 0 in the width byte is ICO's way of saying 256; nothing here is that big.
    const w = b.readUInt8(at);
    const h = b.readUInt8(at + 1);
    const bytes = b.readUInt32LE(at + 8);
    const offset = b.readUInt32LE(at + 12);
    assert.equal(w, h, 'square');
    assert.ok(bytes > 0, 'the image has bytes');
    assert.ok(offset + bytes <= b.length, `image ${i} lies inside the file`);
    // …and where it points is a BITMAPINFOHEADER, twice as tall as it is wide
    // because an ICO carries its AND mask under its pixels.
    assert.equal(b.readUInt32LE(offset), 40, `image ${i} is a BITMAPINFOHEADER`);
    assert.equal(b.readInt32LE(offset + 4), w, `image ${i} width agrees`);
    assert.equal(b.readInt32LE(offset + 8), h * 2, `image ${i} height + mask`);
    sizes.push(w);
  }
  assert.deepEqual(sizes, [16, 32], 'a 16 and a 32 — plenty, and both crisp');
});

// ─── the link tag ──────────────────────────────────────────────────────────

test('index.html asks for it, by the name the spec gives', () => {
  assert.match(HTML, /<link\s+rel="icon"[^>]*href="\/favicon\.ico"/,
    'rel="icon" pointing at /favicon.ico');
  // Vite serves public/ from the site root, so the href and the file agree.
  assert.match(HTML, /<link\s+rel="icon"\s+href="\/favicon\.ico"\s+sizes="16x16 32x32"\s*\/>/);
});

test('the 404 is what goes, and nothing else in the page moves', () => {
  assert.match(HTML, /<title>Cabinet Core<\/title>/);
  assert.match(HTML, /<div id="root"><\/div>/);
  assert.match(HTML, /<script type="module" src="\/src\/main\.jsx"><\/script>/);
  assert.match(HTML, /<meta name="viewport" content="width=device-width, initial-scale=1\.0" \/>/);
});

// ─── the mark itself ───────────────────────────────────────────────────────

test('the MARK is the app’s own — its own palette, and its own four rectangles', () => {
  const svg = readFileSync(SVG, 'utf8');
  const tw = readFileSync(new URL('tailwind.config.js', ROOT), 'utf8');
  // Gold and shell-900 are read out of the workshop's own config rather than
  // trusted: a repaint of the app repaints its mark or this says so.
  const gold = /DEFAULT: '(#[0-9A-Fa-f]{6})'/.exec(tw)[1].toLowerCase();
  const shell = /900: '(#[0-9A-Fa-f]{6})',\s*\/\/ deepest bg/.exec(tw)[1].toLowerCase();
  assert.ok(svg.toLowerCase().includes(gold), `the mark is drawn in ${gold}`);
  assert.ok(svg.toLowerCase().includes(shell), `on ${shell}`);

  // Four rectangles on a 16-unit grid: the C's spine, its two arms, and the
  // knob standing in its mouth.
  const rects = [...svg.matchAll(/<rect[^>]*x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g)]
    .map((m) => m.slice(1, 5).map(Number));
  assert.deepEqual(rects, [
    [3, 2, 3, 12],
    [3, 2, 10, 3],
    [3, 11, 10, 3],
    [10, 7, 2, 2],
  ], 'the mark is exactly these four');
  assert.match(svg, /viewBox="0 0 16 16"/);
});

test('the .svg and the .ico are ONE drawing, pixel for pixel', () => {
  const svg = readFileSync(SVG, 'utf8');
  const gold = [...svg.matchAll(/<rect[^>]*x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g)]
    .map((m) => m.slice(1, 5).map(Number));
  const isGold = (x, y, k) => gold.some(([rx, ry, rw, rh]) => (
    x >= rx * k && x < (rx + rw) * k && y >= ry * k && y < (ry + rh) * k));

  const b = readFileSync(ICO);
  for (let i = 0; i < b.readUInt16LE(4); i += 1) {
    const at = 6 + 16 * i;
    const size = b.readUInt8(at);
    const px = b.readUInt32LE(at + 12) + 40;   // past the BITMAPINFOHEADER
    let painted = 0;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        // BMP rows run bottom-up, and the samples are BGRA.
        const p = px + ((size - 1 - y) * size + x) * 4;
        const wanted = isGold(x, y, size / 16);
        assert.equal(b[p + 2] === 0xAA && b[p + 1] === 0x8E && b[p] === 0x68, wanted,
          `${size}px: pixel ${x},${y}`);
        assert.equal(b[p + 3], 0xFF, `${size}px: pixel ${x},${y} is opaque`);
        if (wanted) painted += 1;
      }
    }
    assert.ok(painted > 0, `${size}px: the mark is actually drawn`);
  }
});
