// ─── T71 · CHAINS WITH A HOME, AND THE COLLISION RULE ──────────────────────
//
// The set's dimension grammar. A chain is a run of consecutive figures on ONE
// line with closed arrowheads at every tick, drawn in DRAWING millimetres at a
// known scale, so its text is exactly `set.textHeight` on paper and its offset
// from the object is exactly `set.chainFirst` / `chainSecond` on paper. That
// is what lets the sheet reserve a band for it and know the band is enough.
//
// THE COLLISION RULE. A figure that does not fit its own segment (a 25 mm
// scribe at 1:20 is 1.25 mm of paper) is not printed across its arrows and is
// not dropped: it is LIFTED clear of the line on a leader, and two lifted
// neighbours alternate between two levels. Every figure on the sheet is
// printed, and no two of them share a spot. `test/turn71-*` measures both.
//
// Pure functions: no React, no store imports.

import { formatMm } from '../format.js';
import { entLine as line, entPoly as poly, entText as text } from './primitives.js';
import { DRAWING_LAYERS } from './layers.js';

const LAYER = 'DIMENSIONS';

/** How wide a figure prints, in the same millimetres the chain is drawn in. */
export function figureWidth(caption, textHeight) {
  return String(caption).length * textHeight * 0.55;
}

function arrow(x, y, dir, size) {
  const l = size * 0.72; const h = size * 0.22;
  const pts = dir === 'r' ? [[x, y], [x - l, y - h], [x - l, y + h]]
    : dir === 'l' ? [[x, y], [x + l, y - h], [x + l, y + h]]
      : dir === 'u' ? [[x, y], [x - h, y - l], [x + h, y - l]]
        : [[x, y], [x - h, y + l], [x + h, y + l]];
  return { ...poly(LAYER, pts, { fill: DRAWING_LAYERS.DIMENSIONS.colour }), pen: 'FINE', noStroke: true };
}

/**
 * A HORIZONTAL chain.
 *
 * @param {object} args
 *   edges     the tick positions along x, in drawing mm (n + 1 for n figures)
 *   y         the dimension line
 *   yObj      the object edge the extension lines start from (null: none)
 *   labels    one caption per segment; null takes the segment's own length
 *   above     true: figures above the line (a chain over the object)
 *   ctx       drawingContext()
 * @returns {Array} entities, and `.figures` for a test to read
 */
export function chainH({ edges, y, yObj = null, labels = null, above = true, ctx }) {
  const xs = [...edges];
  const T = ctx.textHeight;
  const out = [];
  const dir = above ? 1 : -1;
  const overshoot = ctx.mm(1.5);
  if (yObj != null) {
    for (const x of xs) {
      const gap = ctx.mm(1.0);
      const from = yObj + (y > yObj ? gap : -gap);
      out.push({ ...line(LAYER, x, from, x, y + (y > yObj ? overshoot : -overshoot)), pen: 'FINE' });
    }
  }
  out.push({ ...line(LAYER, xs[0], y, xs[xs.length - 1], y), pen: 'FINE' });
  let lift = 0;
  const figures = [];
  for (let i = 0; i < xs.length - 1; i += 1) {
    const a = xs[i]; const b = xs[i + 1];
    out.push(arrow(a, y, 'l', T), arrow(b, y, 'r', T));
    const caption = labels ? labels[i] : formatMm(b - a);
    if (caption == null || caption === '') continue;
    const w = figureWidth(caption, T);
    const seg = b - a;
    const mid = (a + b) / 2;
    if (w + ctx.mm(1.6) <= seg) {
      out.push({ ...text(LAYER, mid, y + dir * T * 0.7, caption, T), paperHeight: T / ctx.scale });
      figures.push({ caption, x: mid, y: y + dir * T * 0.7, lifted: false, axis: 'x', a, b });
      lift = 0;
    } else {
      lift = lift ? 0 : 1;
      const ty = y + dir * (ctx.mm(4.0) + lift * ctx.mm(3.2));
      out.push({ ...line(LAYER, mid, y, mid, ty - dir * T * 0.55), pen: 'FINE' });
      out.push({ ...text(LAYER, mid, ty, caption, T), paperHeight: T / ctx.scale });
      figures.push({ caption, x: mid, y: ty, lifted: true, axis: 'x', a, b });
    }
  }
  out.figures = figures;
  return out;
}

/**
 * A VERTICAL chain, figures rotated to read up the sheet.
 *   edges   tick positions along y; x the line; xObj the object edge
 *   left    true: figures to the left of the line
 */
export function chainV({ edges, x, xObj = null, labels = null, left = true, ctx }) {
  const ys = [...edges];
  const T = ctx.textHeight;
  const out = [];
  const dir = left ? -1 : 1;
  const overshoot = ctx.mm(1.5);
  if (xObj != null) {
    for (const y of ys) {
      const gap = ctx.mm(1.0);
      const from = xObj + (x > xObj ? gap : -gap);
      out.push({ ...line(LAYER, from, y, x + (x > xObj ? overshoot : -overshoot), y), pen: 'FINE' });
    }
  }
  out.push({ ...line(LAYER, x, ys[0], x, ys[ys.length - 1]), pen: 'FINE' });
  let lift = 0;
  const figures = [];
  for (let i = 0; i < ys.length - 1; i += 1) {
    const a = Math.min(ys[i], ys[i + 1]); const b = Math.max(ys[i], ys[i + 1]);
    out.push(arrow(x, a, 'd', T), arrow(x, b, 'u', T));
    const caption = labels ? labels[i] : formatMm(b - a);
    if (caption == null || caption === '') continue;
    const w = figureWidth(caption, T);
    const seg = b - a;
    const mid = (a + b) / 2;
    if (w + ctx.mm(1.6) <= seg) {
      out.push({ ...text(LAYER, x + dir * T * 0.7, mid, caption, T), paperHeight: T / ctx.scale, rotate: -90 });
      figures.push({ caption, x: x + dir * T * 0.7, y: mid, lifted: false, axis: 'y', a, b });
      lift = 0;
    } else {
      lift = lift ? 0 : 1;
      const tx = x + dir * (ctx.mm(4.0) + lift * ctx.mm(3.2));
      out.push({ ...line(LAYER, x, mid, tx - dir * T * 0.55, mid), pen: 'FINE' });
      out.push({ ...text(LAYER, tx, mid, caption, T), paperHeight: T / ctx.scale, rotate: -90 });
      figures.push({ caption, x: tx, y: mid, lifted: true, axis: 'y', a, b });
    }
  }
  out.figures = figures;
  return out;
}

/**
 * THE INVARIANT A TEST READS: do any two figures of these chains stand on the
 * same spot? Two figures collide when their text boxes (width from
 * `figureWidth`, height the text height) overlap. Rotated figures are measured
 * rotated.
 */
export function figureCollisions(chains, textHeight) {
  const boxes = [];
  for (const ch of chains) {
    for (const f of ch.figures || []) {
      const w = figureWidth(f.caption, textHeight);
      const rot = ch.some((e) => e.kind === 'text' && e.rotate);
      boxes.push(rot
        ? { x0: f.x - textHeight / 2, x1: f.x + textHeight / 2, y0: f.y - w / 2, y1: f.y + w / 2, f }
        : { x0: f.x - w / 2, x1: f.x + w / 2, y0: f.y - textHeight / 2, y1: f.y + textHeight / 2, f });
    }
  }
  const hits = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]; const b = boxes[j];
      if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) hits.push([a.f, b.f]);
    }
  }
  return hits;
}
