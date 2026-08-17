// ─── One part, drawn the way the machine will cut it (turn 14, CLAUDE.md F7) ─
//
// The right-hand half of the element DETAIL window: the machined outline, every
// path on it, a layer legend and the overall dimensions.
//
// CLAUDE.md is explicit that this must "reuse the drawings machinery (turn 6)
// … do not fork a second drawing engine", and it does, in the way that matters:
// the DIMENSIONS are `dimensionEntities` — turn 7's own draughtsman's
// dimension, with its extension lines starting clear of the face, its ticks and
// its number shifted outside a gap too small to hold it — and the output is the
// same ENTITY MODEL (`entLine` / `entText` / …) every other drawing in this app
// is built from. What is NOT reused is the SHEET: a detail window is not a
// printed page, it has no frame, no title block and no scale bar, and it is
// interactive. So this produces entities and a list of MACHININGS, and the
// component draws them.
//
// The machinings are the half that is new, and they are why this is a module
// rather than three lines in a component. F7.3 asks for a drawing where
// "hovering a machining (e.g. SCREWS_3MM) highlights it in the drawing and
// shows its note" — so every pocket, mark and hole needs a stable id, the layer
// it belongs to, and a sentence a joiner would say out loud about it. That is a
// question about the CNC record, and it is answered here, once, where a test
// can read the answer.
//
// Pure functions — no React, no store imports, no three.js.

// ─── TURN 38 (CLAUDE.md F3): …AND THE PROJECT'S OWN LAYERS ─────────────────
// A user layer is a NAME and a COLOUR (`engine/partLayers.js`), and the legend
// has to be able to paint one. `resolveLayer` answers built-in and user alike,
// so this module never has to ask which kind it is holding.
import { resolveLayer } from '../partLayers.js';
import { arcSweep } from '../partObjects.js';
import { dimensionEntities } from './frontElevation.js';
import { formatMm } from '../format.js';

/** The rectangle a panel is drawn in: its CNC frame, which may be rotated. */
export function partSize(panel) {
  const cnc = panel?.cnc || {};
  return {
    w: Number(cnc.drawn_w) || Number(panel?.w) || 0,
    h: Number(cnc.drawn_h) || Number(panel?.h) || 0,
    rotated: Boolean(cnc.rotated),
  };
}

/** Every machined path on this part, each with an id, a layer and a note. */
export function partMachinings(panel, drills = [], profile = null, userLayers = []) {
  const cnc = panel?.cnc || {};
  const out = [];
  const outlineLayer = cnc.layer || profile?.puzzle?.layers?.outline || 'OUTLINE';
  const label = (name) => resolveLayer(name, userLayers).label;

  (cnc.pockets || []).forEach((p, i) => {
    const w = Math.abs(p.x2 - p.x1);
    const h = Math.abs(p.y2 - p.y1);
    // Turn 17 (CLAUDE.md F4.3): a pocket is a CUT, and a cut has a depth. Where
    // the engine states one — the drawer box's runner groove at 2 mm and its
    // bottom groove at 7 mm — the note says how deep, because "how deep" is the
    // first thing a joiner asks about a groove and the sheet could not answer.
    const deep = Number(p.depth) > 0 ? ` × ${formatMm(p.depth)} deep` : '';
    out.push({
      id: `pocket-${i}`,
      kind: 'pocket',
      layer: p.layer,
      x: Math.min(p.x1, p.x2),
      y: Math.min(p.y1, p.y2),
      w,
      h,
      depth: Number(p.depth) > 0 ? Number(p.depth) : null,
      at: [Math.min(p.x1, p.x2) + w / 2, Math.min(p.y1, p.y2) + h / 2],
      // What a joiner would say about it: what it is, how big, how deep, where.
      note: `${label(p.layer)} · ${formatMm(w)} × ${formatMm(h)}${deep} pocket at ${formatMm(Math.min(p.x1, p.x2) + w / 2)}, ${formatMm(Math.min(p.y1, p.y2) + h / 2)}`,
    });
  });

  (cnc.marks || []).forEach((m, i) => {
    const length = Math.hypot(m.to[0] - m.from[0], m.to[1] - m.from[1]);
    out.push({
      id: `mark-${i}`,
      kind: 'mark',
      layer: m.layer,
      from: m.from,
      to: m.to,
      at: [(m.from[0] + m.to[0]) / 2, (m.from[1] + m.to[1]) / 2],
      ...(m.opId ? { opId: m.opId } : {}),
      note: `${label(m.layer)} · ${formatMm(length)} cutter pass from ${formatMm(m.from[0])}, ${formatMm(m.from[1])}`,
    });
  });

  // The DRILLS are the unit's, keyed by panel — the same list the CNC view
  // filters, so a hole shown here is a hole that will be drilled.
  (drills || []).filter((d) => d.panel === panel?.id).forEach((d, i) => {
    out.push({
      id: `hole-${i}`,
      kind: 'hole',
      layer: d.layer,
      x: d.x,
      y: d.y,
      d: d.d,
      at: [d.x, d.y],
      // Turn 38 (F6): WHICH manual op drew this, where one did. Engine-computed
      // geometry has no `opId` at all, which is exactly how the editor's verbs
      // tell "the print" from "what a hand put on it" without a second list.
      ...(d.opId ? { opId: d.opId } : {}),
      note: `${label(d.layer)} · ⌀${formatMm(d.d)} at ${formatMm(d.x)}, ${formatMm(d.y)}`,
    });
  });

  // ─── TURN 38 (CLAUDE.md F5): THE DRAWN RUNS ────────────────────────────
  // A polyline and a rectangle arrive on `cnc.paths`; a circle and an arc on
  // `cnc.curves`. Both channels are ABSENT on a part nobody has drawn on, so
  // every print in the app that predates tonight walks the same three loops it
  // always did.
  (cnc.paths || []).forEach((pth, i) => {
    const pts = pth.pts || [];
    let run = 0;
    for (let k = 0; k + 1 < pts.length; k += 1) run += Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]);
    if (pth.closed && pts.length > 2) run += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
    out.push({
      id: `path-${i}`,
      kind: 'path',
      layer: pth.layer,
      pts,
      closed: Boolean(pth.closed),
      at: pts.length ? [pts.reduce((s2, p) => s2 + p[0], 0) / pts.length, pts.reduce((s2, p) => s2 + p[1], 0) / pts.length] : [0, 0],
      ...(pth.opId ? { opId: pth.opId } : {}),
      note: `${label(pth.layer)} · ${pth.closed ? 'closed ' : ''}${pts.length}-point run, ${formatMm(run)} long`,
    });
  });

  (cnc.curves || []).forEach((c, i) => {
    const isArc = c.kind === 'arc';
    const sweep = isArc ? arcSweep(c) : 360;
    out.push({
      id: `curve-${i}`,
      kind: isArc ? 'arc' : 'circle',
      layer: c.layer,
      cx: c.cx,
      cy: c.cy,
      r: c.r,
      ...(isArc ? { start: c.start, end: c.end } : {}),
      at: [c.cx, c.cy],
      ...(c.opId ? { opId: c.opId } : {}),
      note: isArc
        ? `${label(c.layer)} · arc R${formatMm(c.r)}, ${Math.round(sweep)}° at ${formatMm(c.cx)}, ${formatMm(c.cy)}`
        : `${label(c.layer)} · circle ⌀${formatMm(c.r * 2)} at ${formatMm(c.cx)}, ${formatMm(c.cy)}`,
    });
  });

  return { outlineLayer, machinings: out };
}

/**
 * The legend: every layer this part actually uses, with its screen colour and
 * how many paths are on it.
 *
 * Built from what is ON THE PART rather than from the whole table, because a
 * legend listing fourteen layers of which two are present is a legend nobody
 * reads. The outline counts as one entry, which is what it is.
 */
export function partLegend(outlineLayer, machinings, userLayers = []) {
  const counts = new Map([[outlineLayer, 1]]);
  for (const m of machinings) counts.set(m.layer, (counts.get(m.layer) || 0) + 1);
  return [...counts.entries()].map(([name, count]) => {
    const layer = resolveLayer(name, userLayers);
    return {
      name, count, colour: layer.screen, label: layer.label, kind: layer.kind,
    };
  });
}

/**
 * The whole right-hand drawing: outline, machinings, legend and the two
 * dimensions that are ALWAYS visible (F7.3).
 *
 * `textHeight` is in drawing millimetres, like everything else here; the
 * component scales the picture, not the numbers.
 */
export function partDetailDrawing(panel, {
  drills = [], profile = null, textHeight = null, userLayers = [],
} = {}) {
  if (!panel) return null;
  const size = partSize(panel);
  const { outlineLayer, machinings } = partMachinings(panel, drills, profile, userLayers);
  const height = Number(textHeight) || Math.max(8, Math.min(size.w, size.h) * 0.06);
  const offset = height * 2.4;

  // The element's OVERALL dimensions, on the two edges a draughtsman puts them:
  // the width under the part, the height beside it. Always drawn — F7.3 asks
  // for them to be always visible, and a detail with no size on it is a
  // picture rather than a drawing.
  const dimensions = [
    ...dimensionEntities({
      from: [0, 0], to: [size.w, 0], direction: 'h', offset, value: size.w, textHeight: height,
    }),
    ...dimensionEntities({
      from: [size.w, 0], to: [size.w, size.h], direction: 'v', offset, value: size.h, textHeight: height,
    }),
  ];

  return {
    id: panel.id,
    size,
    outline: panel.cnc?.outline || [],
    outlineLayer,
    machinings,
    legend: partLegend(outlineLayer, machinings, userLayers),
    dimensions,
    textHeight: height,
    dimensionOffset: offset,
  };
}
