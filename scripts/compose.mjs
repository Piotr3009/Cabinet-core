// ─── TWO PICTURES, SIDE BY SIDE (turn 44) ───────────────────────────────────
//
// Three of this turn's named proofs are COMPARISONS and CLAUDE.md asks for them
// as one file each:
//
//   f2-tabs-and-retail.png            "(both modes side by side)"
//   f3-ustawienia-wardrobe-vs-kitchen.png
//   f5-fronts-and-shine.png           "(matte vs shine, same decor)"
//   f6-hardware-factory-vs-retail.png
//
// A DevTools screenshot is one frame, so a comparison has to be composed. That
// is all this file does: decode two PNGs (the decoder is `scripts/png.mjs`,
// turn 16's, unchanged), lay them left and right on one canvas with a gold rule
// between them and a caption strip over each, and encode the result.
//
// Zero dependencies — `zlib` is node's, the decoder is ours, and the encoder is
// the one `scripts/gen-textures.mjs` has used since turn 5, lifted here so both
// of them stop being the only copy. It is a DEVELOPMENT SCRIPT; nothing in it
// ships to the browser.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { deflateSync } from 'node:zlib';
import { decodePng } from './png.mjs';

const CRC = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** 8-bit truecolour PNG from a tightly packed RGB buffer. */
export function encodePng(width, height, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // colour type: truecolour
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const at = y * (stride + 1);
    raw[at] = 2;   // the "up" filter — a screenshot changes slowly downwards
    for (let i = 0; i < stride; i += 1) {
      const here = rgb[y * stride + i];
      const above = y === 0 ? 0 : rgb[(y - 1) * stride + i];
      raw[at + 1 + i] = (here - above) & 0xFF;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── A five-by-seven bitmap alphabet, so a caption needs no font file ───────
// Only the characters the four captions use. A proof that says which half is
// which is worth seven lines of pixels.
const GLYPHS = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '11110', '10001', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '11110', '10000', '10000', '10000', '11111'],
  F: ['11111', '10000', '11110', '10000', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10011', '10001', '10001', '01111'],
  H: ['10001', '10001', '11111', '10001', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '11100', '10010', '10001', '10001', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10001', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '11110', '10000', '10000', '10000', '10000'],
  R: ['11110', '10001', '11110', '10010', '10001', '10001', '10001'],
  S: ['01111', '10000', '01110', '00001', '00001', '10001', '01110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '01010', '00100', '00100', '00100', '01010', '10001'],
  Y: ['10001', '01010', '00100', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00010', '00100', '01000', '10000', '10000', '11111'],
  0: ['01110', '10011', '10101', '10101', '10101', '11001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  3: ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '01110', '10001', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '·': ['00000', '00000', '00000', '00100', '00000', '00000', '00000'],
  '%': ['10001', '00010', '00100', '00100', '01000', '10001', '00000'],
};

const CAPTION_H = 26;
const SCALE = 2;
const GAP = 8;

function put(rgb, width, x, y, colour) {
  if (x < 0 || y < 0 || x >= width) return;
  const at = (y * width + x) * 3;
  if (at + 2 >= rgb.length) return;
  rgb[at] = colour[0]; rgb[at + 1] = colour[1]; rgb[at + 2] = colour[2];
}

function text(rgb, width, string, x0, y0, colour) {
  let x = x0;
  for (const raw of String(string).toUpperCase()) {
    const glyph = GLYPHS[raw] || GLYPHS[' '];
    for (let gy = 0; gy < 7; gy += 1) {
      for (let gx = 0; gx < 5; gx += 1) {
        if (glyph[gy][gx] !== '1') continue;
        for (let sy = 0; sy < SCALE; sy += 1) {
          for (let sx = 0; sx < SCALE; sx += 1) {
            put(rgb, width, x + gx * SCALE + sx, y0 + gy * SCALE + sy, colour);
          }
        }
      }
    }
    x += 6 * SCALE;
  }
}

function blit(rgb, width, png, x0, y0) {
  const ch = png.channels;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const from = (y * png.width + x) * ch;
      const to = ((y0 + y) * width + (x0 + x)) * 3;
      if (to + 2 >= rgb.length) continue;
      rgb[to] = png.data[from];
      rgb[to + 1] = png.data[from + 1];
      rgb[to + 2] = png.data[from + 2];
    }
  }
}

/**
 * Two screenshots on one canvas, captioned, with a gold rule between them.
 *
 * @param {string} leftPath   the file on the left
 * @param {string} rightPath  …and on the right
 * @param {string} outPath    where the composition goes
 * @param {[string,string]} captions
 */
export function sideBySide(leftPath, rightPath, outPath, [leftCaption, rightCaption]) {
  const a = decodePng(readFileSync(leftPath));
  const b = decodePng(readFileSync(rightPath));
  const height = Math.max(a.height, b.height) + CAPTION_H;
  const width = a.width + GAP + b.width;
  const rgb = Buffer.alloc(width * height * 3, 0x14);

  blit(rgb, width, a, 0, CAPTION_H);
  blit(rgb, width, b, a.width + GAP, CAPTION_H);

  // the gold rule, and the two captions above the halves they name
  for (let y = 0; y < height; y += 1) {
    for (let g = 0; g < GAP; g += 1) put(rgb, width, a.width + g, y, [0xAA, 0x8E, 0x68]);
  }
  const gold = [0xC8, 0xA6, 0x78];
  text(rgb, width, leftCaption, 8, 6, gold);
  text(rgb, width, rightCaption, a.width + GAP + 8, 6, gold);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, encodePng(width, height, rgb));
  return {
    path: outPath, width, height, left: leftCaption, right: rightCaption,
  };
}

/** How different two screenshots are, 0…1 — a comparison proof that PROVES. */
export function pixelDifference(leftPath, rightPath) {
  const a = decodePng(readFileSync(leftPath));
  const b = decodePng(readFileSync(rightPath));
  if (a.width !== b.width || a.height !== b.height) return 1;
  let differing = 0;
  const total = a.width * a.height;
  for (let i = 0; i < total; i += 1) {
    const pa = i * a.channels;
    const pb = i * b.channels;
    if (Math.abs(a.data[pa] - b.data[pb]) > 6
      || Math.abs(a.data[pa + 1] - b.data[pb + 1]) > 6
      || Math.abs(a.data[pa + 2] - b.data[pb + 2]) > 6) differing += 1;
  }
  return differing / total;
}
