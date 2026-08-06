// ─── Procedural wood decors → public/textures/*.png ───
//
// Run:  node scripts/gen-textures.mjs
//
// Why a script and not a download: CLAUDE.md rule "zero new dependencies", and
// a decor image pulled off the internet is somebody else's licence sitting in a
// commercial app (BACKLOG #19 is exactly that question). These two PNGs are
// generated here from a seeded noise field, so they are ours, they are
// deterministic — same bytes on every run — and they cost the project nothing.
//
// No image library either: node's own zlib plus ~40 lines of PNG chunking.
// The maths is a wood grain, not a work of art: long streaks along the grain
// direction, growth rings across it, a little fine noise on top.

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'public', 'textures');

const SIZE = 512;                 // tileable, so a 2 m panel takes a few repeats

// ─── PNG (8-bit RGB, no interlace) ───

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  const body = out.subarray(4, 8 + data.length);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
}

function encodePng(width, height, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;      // bit depth
  ihdr[9] = 2;      // colour type: truecolour
  // Per-scanline "up" filter (2): a wood grain changes slowly down the image,
  // so the row-to-row delta compresses far better than raw bytes.
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const at = y * (stride + 1);
    raw[at] = 2;
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

// ─── Seeded, TILEABLE value noise ───

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (t) => t * t * (3 - 2 * t);

/** A lattice of random values that WRAPS — which is what makes the tile seamless. */
function lattice(rand, gx, gy) {
  const v = new Float32Array(gx * gy);
  for (let i = 0; i < v.length; i += 1) v[i] = rand();
  return { v, gx, gy };
}

function sample({ v, gx, gy }, x, y) {
  const xi = Math.floor(x); const yi = Math.floor(y);
  const fx = smooth(x - xi); const fy = smooth(y - yi);
  const x0 = ((xi % gx) + gx) % gx; const x1 = (x0 + 1) % gx;
  const y0 = ((yi % gy) + gy) % gy; const y1 = (y0 + 1) % gy;
  const a = v[y0 * gx + x0]; const b = v[y0 * gx + x1];
  const c = v[y1 * gx + x0]; const d = v[y1 * gx + x1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

/** Fractal sum. `px`/`py` are the periods in tile units, so every octave wraps. */
function fbm(rand, px, py, octaves) {
  const layers = [];
  for (let o = 0; o < octaves; o += 1) {
    const k = 2 ** o;
    layers.push({ grid: lattice(rand, px * k, py * k), k, amp: 0.5 ** o });
  }
  const norm = layers.reduce((s, l) => s + l.amp, 0);
  return (u, v) => layers.reduce((s, l) => s + l.amp * sample(l.grid, u * l.grid.gx, v * l.grid.gy), 0) / norm;
}

// ─── The decors ───
// `grainAlong` is the axis the grain runs down (rings cross it). Everything
// else is colour: two extremes and how hard the rings cut between them.

const DECORS = [
  {
    file: 'dark-walnut.png',
    seed: 0x5AF3D1,
    dark: [38, 25, 18],
    light: [124, 88, 60],
    rings: 9,               // wide, soft cathedral figure
    ringWobble: 0.75,
    ringStrength: 0.7,
    ringSharpness: 2.2,     // > 1 narrows the dark band into a LINE
    grainStrength: 0.5,
    poreLines: 46,          // fine dark pores along the grain — walnut is open
    poreStrength: 0.3,
    fineStrength: 0.08,
  },
  {
    file: 'light-oak.png',
    seed: 0x1B7E44,
    dark: [158, 122, 82],
    light: [232, 209, 174],
    rings: 13,
    ringWobble: 0.45,
    ringStrength: 0.55,
    ringSharpness: 3.2,     // oak rings are tight and hard-edged
    grainStrength: 0.4,
    poreLines: 64,
    poreStrength: 0.24,
    fineStrength: 0.07,
  },
];

function render(decor) {
  const rand = mulberry32(decor.seed);
  // Long, stretched features ALONG the grain (x), tight variation across it (y).
  const grain = fbm(rand, 2, 12, 4);
  const wobble = fbm(rand, 3, 5, 3);
  // Pores: very long in x, very tight in y — the hairline streaks that make a
  // wood photograph read as wood rather than as a gradient.
  const pores = fbm(rand, 4, decor.poreLines, 2);
  const fine = fbm(rand, 48, 96, 2);
  const rgb = Buffer.alloc(SIZE * SIZE * 3);

  for (let y = 0; y < SIZE; y += 1) {
    const v = y / SIZE;
    for (let x = 0; x < SIZE; x += 1) {
      const u = x / SIZE;
      // Growth rings: a periodic band across the grain, pushed about by noise
      // so they are never a stack of straight lines. Raised to a power so the
      // dark side is a narrow line and the light side is broad — which is the
      // difference between "wood" and "corduroy".
      const phase = v * decor.rings + (wobble(u, v) - 0.5) * decor.ringWobble;
      const ring = (0.5 + 0.5 * Math.cos(phase * Math.PI * 2)) ** decor.ringSharpness;
      // Pores only ever DARKEN, and only where the noise is already dark.
      const pore = Math.max(0, 0.5 - pores(u, v)) * 2;
      const t = clamp01(
        0.42
        + (ring - 0.5) * decor.ringStrength
        + (grain(u, v) - 0.5) * decor.grainStrength
        - pore * decor.poreStrength
        + (fine(u, v) - 0.5) * decor.fineStrength * 2,
      );
      const at = (y * SIZE + x) * 3;
      for (let c = 0; c < 3; c += 1) {
        rgb[at + c] = Math.round(decor.dark[c] + (decor.light[c] - decor.dark[c]) * t);
      }
    }
  }
  return rgb;
}

const clamp01 = (v) => (v < 0 ? 0 : (v > 1 ? 1 : v));

mkdirSync(OUT, { recursive: true });
for (const decor of DECORS) {
  const png = encodePng(SIZE, SIZE, render(decor));
  writeFileSync(join(OUT, decor.file), png);
  console.log(`${decor.file} — ${SIZE}×${SIZE}, ${(png.length / 1024).toFixed(0)} kB`);
}
