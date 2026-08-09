// ─── A PNG, read back into pixels (turn 16, CLAUDE.md F7/F8) ────────────────
//
// Two of this turn's phases are about LIGHT — "serio nic nie widać" in the
// element editor, and wall units that do not shine like the base units — and
// CLAUDE.md says both must be MEASURED and not eyeballed: "measure pixel
// luminance on a detail region before/after", "publish the measurement
// (numbers, not impressions)".
//
// To measure a picture you have to read it, and a WebGL canvas cannot simply be
// asked for its pixels after the frame is composited (the drawing buffer is
// cleared unless the context was made with `preserveDrawingBuffer`, which the
// app does not do and which is not worth turning on for a test). What CAN be
// read is the DevTools screenshot — and that arrives as a PNG.
//
// So this is a PNG decoder, in sixty lines, for exactly the subset Chromium
// emits: 8-bit truecolour with or without alpha, no interlace. `zlib` is
// node's own, so this adds no dependency (rule 4) and it is a DEVELOPMENT
// SCRIPT — nothing here ships to the browser.

import { inflateSync } from 'node:zlib';

/** Decode a PNG buffer to { width, height, channels, data } (8-bit samples). */
export function decodePng(buffer) {
  const buf = Buffer.from(buffer);
  const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < SIG.length; i += 1) {
    if (buf[i] !== SIG[i]) throw new Error('not a PNG');
  }

  let pos = 8;
  let header = null;
  const idat = [];
  while (pos < buf.length) {
    const length = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + length);
    if (type === 'IHDR') {
      header = {
        width: body.readUInt32BE(0),
        height: body.readUInt32BE(4),
        depth: body[8],
        colour: body[9],
        interlace: body[12],
      };
    } else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
    pos += length + 12;                                  // len + type + data + crc
  }
  if (!header) throw new Error('PNG has no header');
  if (header.depth !== 8) throw new Error(`unsupported bit depth ${header.depth}`);
  if (header.interlace) throw new Error('interlaced PNG');
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[header.colour];
  if (!channels) throw new Error(`unsupported colour type ${header.colour}`);

  const raw = inflateSync(Buffer.concat(idat));
  const { width, height } = header;
  const stride = width * channels;
  const out = Buffer.alloc(stride * height);

  // Un-filter, row by row: PNG's five filters, all of which look back one pixel
  // (`a`), up one row (`b`) and up-left (`c`).
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? out[y * stride + x - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = (x >= channels && y > 0) ? out[(y - 1) * stride + x - channels] : 0;
      let value = line[x];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += Math.floor((a + b) / 2);
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      out[y * stride + x] = value & 0xff;
    }
  }
  return {
    width, height, channels, data: out,
  };
}

/** Rec. 709 luminance of one pixel, 0–255. */
function lumaAt(png, i) {
  const { data, channels } = png;
  if (channels <= 2) return data[i];
  return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
}

/**
 * The luminance of a REGION, as the numbers a light test is judged on.
 *
 * `mean` is how bright it is; `p05`/`p95` are the darkest and brightest
 * twentieth, which is what says whether DETAIL reads: a region that is uniformly
 * grey has the same mean as one with a legible dog bone in it, and a different
 * spread. `dark` is the share of pixels under a threshold — the "nearly black"
 * the owner is complaining about, as a number.
 *
 * @param {object} png     from decodePng
 * @param {object} [box]   { x, y, w, h } in pixels; the whole image if omitted
 */
export function regionLuminance(png, box = null, { below = Infinity } = {}) {
  const x0 = Math.max(0, Math.round(box?.x ?? 0));
  const y0 = Math.max(0, Math.round(box?.y ?? 0));
  const x1 = Math.min(png.width, Math.round((box?.x ?? 0) + (box?.w ?? png.width)));
  const y1 = Math.min(png.height, Math.round((box?.y ?? 0) + (box?.h ?? png.height)));
  const values = [];
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const v = lumaAt(png, (y * png.width + x) * png.channels);
      // `below` masks the BACKGROUND out. A window's ground is a flat, very
      // bright colour, and a mean taken over it measures the paper the drawing
      // is on rather than the drawing — which is how a rig can be raised by a
      // quarter and read as "+1 %".
      if (v < below) values.push(v);
    }
  }
  if (!values.length) return null;
  values.sort((a, b) => a - b);
  const at = (q) => values[Math.min(values.length - 1, Math.floor(q * values.length))];
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return {
    pixels: values.length,
    mean: round(mean),
    median: round(at(0.5)),
    p05: round(at(0.05)),
    p95: round(at(0.95)),
    contrast: round(at(0.95) - at(0.05)),
    stdev: round(Math.sqrt(variance)),
    dark: round(values.filter((v) => v < 40).length / values.length, 3),
    max: round(values[values.length - 1]),
  };
}

/**
 * The brightest few per cent of a region — a specular HIGHLIGHT, which is what
 * "gloss" is (F8). A matt door and a gloss door of the same colour have the
 * same mean and very different tops.
 */
export function highlight(png, box = null, share = 0.02) {
  const stats = regionLuminance(png, box);
  if (!stats) return null;
  const x0 = Math.max(0, Math.round(box?.x ?? 0));
  const y0 = Math.max(0, Math.round(box?.y ?? 0));
  const x1 = Math.min(png.width, Math.round((box?.x ?? 0) + (box?.w ?? png.width)));
  const y1 = Math.min(png.height, Math.round((box?.y ?? 0) + (box?.h ?? png.height)));
  const values = [];
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) values.push(lumaAt(png, (y * png.width + x) * png.channels));
  }
  values.sort((a, b) => b - a);
  const top = values.slice(0, Math.max(1, Math.round(values.length * share)));
  return {
    ...stats,
    topShare: share,
    topMean: round(top.reduce((s, v) => s + v, 0) / top.length),
  };
}

function round(v, digits = 1) {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
