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
// T82 F21, after the review: three small segments in a row (a HAWA pocket's
// 1.5 · 25 · 3, its panel A between two gaps) lift three figures, and two
// levels cannot hold the first and the third apart. A lifted figure whose
// level is already taken at its spot takes the other level; where both are
// taken it stands just off the line beside its own arrows (the row), when no
// figure of the chain's row is there and no extension line strikes it; a
// third level out only where none of these is free. Where nothing stood in
// the way, every figure stands where T71 put it.
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

/**
 * How far off its line, in paper mm, a lifted figure set on the row stands:
 * its box clears the line by this much and clears the first lifted level
 * (4.0 out) as well, so the row and the two levels are three spots apart.
 */
const ROW_CLEAR = 0.2;

/**
 * The spans, along the chain, of the figures that fit their own segments:
 * the chain's figure row, as the loop below will set it.
 */
function rowSpans(ends, labels, T, ctx) {
  const out = [];
  for (let i = 0; i < ends.length - 1; i += 1) {
    const a = Math.min(ends[i], ends[i + 1]); const b = Math.max(ends[i], ends[i + 1]);
    const caption = labels ? labels[i] : formatMm(b - a);
    if (caption == null || caption === '') continue;
    const w = figureWidth(caption, T);
    if (w + ctx.mm(1.6) <= b - a) out.push({ lo: (a + b) / 2 - w / 2, hi: (a + b) / 2 + w / 2 });
  }
  return out;
}

/**
 * Where a lifted figure stands: T71's alternating level, unless a figure
 * already lifted in this chain stands on it at this spot; then the other
 * level; then the chain's own figure row (`'row'`) where `row` allows it and
 * no figure of the row is there; then a third level out. `taken` is the
 * chain's own list of { lo, hi, level } along the chain's axis.
 */
function liftLevel(taken, alternate, lo, hi, row, rowFirst = false) {
  const clear = (level) => !taken.some((o) => o.level === level && o.lo < hi && lo < o.hi);
  const onRow = row && row.every((o) => !(o.lo < hi && lo < o.hi)) && clear('row');
  const level = (rowFirst && onRow) ? 'row' : ([alternate, 1 - alternate].find(clear) ?? (onRow ? 'row' : 2));
  taken.push({ lo, hi, level });
  return level;
}

/**
 * T82 F21, after the review: the paper a chain stepped in needs between its
 * outermost figure and the next line out.
 */
export const LINE_CLEAR = 0.4;

/**
 * How far out a built chain reaches along x, in its own drawing mm: its
 * lines, its arrowheads and its figures' boxes (a figure read up the sheet
 * is the text height wide).
 */
export function chainReachX(chain, textHeight) {
  let max = -Infinity;
  for (const e of chain) {
    if (e.kind === 'line') max = Math.max(max, e.x1, e.x2);
    else if (e.kind === 'poly') for (const [px] of e.pts || []) max = Math.max(max, px);
    else if (e.kind === 'text') max = Math.max(max, e.x + (e.rotate ? textHeight / 2 : figureWidth(e.text, textHeight) / 2));
  }
  return max;
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
  const taken = [];
  // The figure row is free to a lifted figure only where no extension line strikes it.
  const row = yObj == null ? rowSpans(xs, labels, T, ctx) : null;
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
      const level = liftLevel(taken, lift, mid - w / 2, mid + w / 2, row);
      if (level === 'row') {
        // Beside its own arrows, just off the line: no leader to draw.
        const ry = y + dir * (T / 2 + ctx.mm(ROW_CLEAR));
        out.push({ ...text(LAYER, mid, ry, caption, T), paperHeight: T / ctx.scale });
        figures.push({ caption, x: mid, y: ry, lifted: true, axis: 'x', a, b, row: true });
        continue;
      }
      const ty = y + dir * (ctx.mm(4.0) + level * ctx.mm(3.2));
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
 *   compact T82 F21, after the review: a chain stepped in to stay inside its
 *           band. A figure too small for its segment stands just off the line
 *           beside its own arrows (the row) where the row is free there, and
 *           takes the lifted levels only where it is not; a figure that fits
 *           stands where T71 sets it. Needs no extension lines (`xObj` null).
 */
export function chainV({ edges, x, xObj = null, labels = null, left = true, ctx, compact = false }) {
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
  const taken = [];
  const row = xObj == null ? rowSpans(ys, labels, T, ctx) : null;
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
      const level = liftLevel(taken, lift, mid - w / 2, mid + w / 2, row, compact);
      if (level === 'row') {
        const rx = x + dir * (T / 2 + ctx.mm(ROW_CLEAR));
        out.push({ ...text(LAYER, rx, mid, caption, T), paperHeight: T / ctx.scale, rotate: -90 });
        figures.push({ caption, x: rx, y: mid, lifted: true, axis: 'y', a, b, row: true });
        continue;
      }
      const tx = x + dir * (ctx.mm(4.0) + level * ctx.mm(3.2));
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
