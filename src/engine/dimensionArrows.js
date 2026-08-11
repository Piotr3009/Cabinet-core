// ─── HOVER DIMENSIONS ARE DRAWINGS, NOT CAPTIONS (turn 23, CLAUDE.md F8) ────
//
// Owner: the corner caption is not what he asked for. He wants thin, small,
// beautiful BLUE dimension arrows that appear on hover and vanish on leave —
// like a drawing.
//
// So this is a DIMENSION, drawn the way a drawing office draws one, as pure
// geometry that two very different surfaces can both render:
//
//   the CNC part detail   an SVG, in the part's own millimetres (F8.1)
//   the 3-D scene         meshes, in the cabinet's own millimetres (F8.2)
//
// ONE STYLE (F8.3), `profile.hoverDimensions`, consumed by both. One shape of
// answer, so neither surface invents an arrowhead.
//
// ─── WHAT A DIMENSION IS ───────────────────────────────────────────────────
//
//        ┌ extension line              ┌ extension line
//        │                             │
//        ├──────────◄── 348 ──►────────┤   ← the dimension line, offset clear
//        │                             │     of the thing it measures
//      the feature                  the edge
//
// Four parts, and each is a list of plain segments so a renderer needs nothing
// but "draw a line from A to B":
//
//   extensions   from each measured point out past the dimension line
//   line         between the two, along the offset
//   arrows       two strokes per end, meeting AT the measured point, open —
//                nothing filled in, which is what "thin" means on a drawing
//   text         the value, on the line, in the middle
//
// Pure functions and pure data. No React, no store, no three.js.

/** The style, defensively read, so a partial profile cannot produce NaN. */
export function dimensionStyle(profile) {
  const S = profile?.hoverDimensions || {};
  const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
  return {
    colour: S.colour || '#3B82F6',
    strokeMm: num(S.strokeMm, 0.8),
    arrowMm: num(S.arrowMm, 6),
    arrowAngle: num(S.arrowAngle, 20),
    textMm: num(S.textMm, 11),
    offsetMm: num(S.offsetMm, 14),
    extensionMm: num(S.extensionMm, 4),
    gapMm: num(S.gapMm, 2),
    minSpanMm: num(S.minSpanMm, 0.5),
  };
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const scale = (a, k) => [a[0] * k, a[1] * k];
const len = (a) => Math.hypot(a[0], a[1]);

/**
 * ONE dimension between two points.
 *
 * @param {object} args
 *   from, to   [x, y] — the two points being measured, in the caller's own mm
 *   offset     how far the dimension line stands off the measured line, along
 *              its own normal. 0 draws it straight through them, which is what
 *              a measurement BETWEEN two features wants.
 *   style      dimensionStyle() output
 *   label      the text; the rounded distance where it is left out
 * @returns {{value:number, segments:number[][][], text:{at:number[], angle:number,
 *            value:string}}|null}  null where the two points are the same
 */
export function dimensionEntities({
  from, to, offset = 0, style, label = null,
}) {
  const S = style;
  const along = sub(to, from);
  const value = len(along);
  if (!(value > S.minSpanMm)) return null;

  const unit = scale(along, 1 / value);
  // The normal the dimension line is pushed out along. A drawing pushes it to
  // ONE side and keeps it there; which side is the caller's `offset` sign.
  const normal = [-unit[1], unit[0]];
  const push = scale(normal, offset);

  const a = add(from, push);
  const b = add(to, push);

  const segments = [];

  // The extension lines — from just clear of each measured point, out past the
  // dimension line. A drawing leaves a small gap at the feature so the two do
  // not touch; that gap is `gapMm`.
  if (offset !== 0) {
    const sign = offset >= 0 ? 1 : -1;
    for (const [point, at] of [[from, a], [to, b]]) {
      segments.push([
        add(point, scale(normal, sign * S.gapMm)),
        add(at, scale(normal, sign * S.extensionMm)),
      ]);
    }
  }

  // The dimension line itself.
  segments.push([a, b]);

  // Two OPEN arrowheads, meeting at the measured points. Open — two strokes and
  // nothing filled in — is what a thin drawing arrow is; a filled triangle at
  // this size reads as a blob.
  const theta = (S.arrowAngle * Math.PI) / 180;
  const head = (at, dir) => {
    for (const sign of [1, -1]) {
      const rotated = [
        dir[0] * Math.cos(sign * theta) - dir[1] * Math.sin(sign * theta),
        dir[0] * Math.sin(sign * theta) + dir[1] * Math.cos(sign * theta),
      ];
      segments.push([at, add(at, scale(rotated, S.arrowMm))]);
    }
  };
  head(a, unit);
  head(b, scale(unit, -1));

  // The value, ON the line and reading along it. Never upside down: a
  // dimension read from the left is turned back over rather than mirrored.
  let angle = (Math.atan2(unit[1], unit[0]) * 180) / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;

  return {
    value,
    segments,
    text: {
      // Just off the line, on the side the offset pushed it — a value sitting
      // ON its own line is a value with a stroke through it.
      at: add(scale(add(a, b), 0.5), scale(normal, (offset >= 0 ? 1 : -1) * S.textMm * 0.45)),
      angle,
      value: label ?? String(Math.round(value)),
    },
  };
}

/**
 * A SET of dimensions, offset so they do not sit on top of one another.
 *
 * The part detail hovers one feature and asks for four measurements at once
 * (two edges, two neighbours); stacking them at one offset would draw four
 * lines through each other.
 *
 * @param {Array} rows  [{ from, to, offset?, label? }]
 * @param {object} style
 */
export function dimensionSet(rows, style) {
  const out = [];
  for (const row of rows || []) {
    const d = dimensionEntities({ ...row, style });
    if (d) out.push({ ...d, key: row.key ?? out.length });
  }
  return out;
}

/**
 * WHAT A HOVERED FEATURE IS MEASURED TO (F8.1).
 *
 * "…dimension arrows from the feature to the part's nearest edges and to the
 * nearest neighbouring feature."
 *
 * Nearest EDGES, plural and in both axes: a hole is set out by an x and a y,
 * and a drawing that gave only one of them would be a drawing you cannot cut
 * from. Nearest NEIGHBOUR, singular: the one other feature whose centre is
 * closest, which is the number a joiner checks a pattern by.
 *
 * @param {object} args
 *   feature    { x, y } in the part's own CNC frame
 *   size       { w, h } — the part as the sheet lays it
 *   others     [{ id, x, y }] — every other feature on this part
 * @returns {Array<{key:string, from:number[], to:number[], offset:number}>}
 */
export function featureDimensionRows({
  feature, size, others = [], style,
}) {
  const S = style;
  const x = Number(feature?.x);
  const y = Number(feature?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
  const w = Number(size?.w) || 0;
  const h = Number(size?.h) || 0;

  const rows = [];
  // The nearer edge on each axis, and the dimension is drawn OUTSIDE the part
  // on that side — where a draughtsman puts it, and where it cannot be confused
  // with a cut.
  const leftIsNearer = x <= w - x;
  rows.push({
    key: 'x',
    from: leftIsNearer ? [0, y] : [w, y],
    to: [x, y],
    offset: 0,
  });
  const bottomIsNearer = y <= h - y;
  rows.push({
    key: 'y',
    from: [x, bottomIsNearer ? 0 : h],
    to: [x, y],
    offset: 0,
  });

  // …and the nearest neighbour, measured centre to centre.
  let nearest = null;
  let best = Infinity;
  for (const other of others) {
    const d = Math.hypot(Number(other.x) - x, Number(other.y) - y);
    if (!(d > S.minSpanMm) || d >= best) continue;
    best = d;
    nearest = other;
  }
  if (nearest) {
    rows.push({
      key: `n:${nearest.id}`, from: [x, y], to: [Number(nearest.x), Number(nearest.y)], offset: S.offsetMm,
    });
  }
  return rows;
}

// ─── AND THE BAY WIDTHS? NOT HERE ──────────────────────────────────────────
//
// F8.2's arrows measure the CLEAR BAYS either side of a partition, and F10.1
// says in as many words that the field and the arrows come from ONE function.
// That function is `engine/partitionPositions.js bayGapsAround` — the same
// derivation the right-hand panel's P rows read — so this module draws
// dimensions and does not also have an opinion about where a bay begins.
