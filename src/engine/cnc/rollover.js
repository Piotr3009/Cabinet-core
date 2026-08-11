// ─── WHAT IS THAT HOLE? (turn 20, CLAUDE.md F7) ─────────────────────────────
//
// Owner: hover any hole, pocket or groove on the CNC sheet and be told what it
// is — like AutoCAD's rollover. Leave, and it goes.
//
// The DERIVATION is here and the tooltip is presentation. That split is the
// whole of F7.2: "the data derivation is a pure function over the part's `cnc`
// block (unit-tested); the tooltip is presentation only. Nothing here edits,
// ticks or exports — the sheet after a thousand hovers is byte-for-byte the
// sheet before." A module with no React in it cannot break that promise by
// accident.
//
// It reads the SAME records the DXF is written from — `panel.cnc.pockets`,
// `panel.cnc.marks` and the unit's own `drills` — through
// `drawings/partDetail.js → partMachinings`, which has produced exactly that
// list with stable ids since turn 14. There is no second reading of a pocket in
// this app and there must not be one.
//
// ─── WHICH EDGES ───────────────────────────────────────────────────────────
// "the distances from the feature's centre (drills) or nearest edges (pockets)
// to the PART'S own X and Y edges."
//
// The part's own frame is its CNC frame — `drawn_w`/`drawn_h` where the part is
// nested turned — because that is the rectangle the machine works in and the
// rectangle the sheet draws. A joiner reading "38 from the left" wants it
// measured off the board in front of him.
//
// Pure functions — no React, no store, no three.js (engine rule).

import { cncLayer } from './layers.js';
import { partSize, partMachinings } from '../drawings/partDetail.js';
import { formatMm } from '../format.js';

/** The four edges, in the order a draughtsman reads them off a board. */
export const EDGE_LABELS = { left: 'Left', right: 'Right', bottom: 'Bottom', top: 'Top' };

/**
 * Every hoverable feature of one part, with its readout already worked out.
 *
 * @param {object} panel   an engine panel record
 * @param {Array} drills   the unit's drills (the whole list; filtered here)
 * @param {object} profile
 * @returns {Array} one entry per feature: the geometry the sheet draws it with,
 *                  plus `readout` — what the tooltip says about it
 */
export function partRollovers(panel, drills = [], profile = null) {
  const { machinings } = partMachinings(panel, drills, profile);
  return machinings.map((m) => ({ ...m, readout: featureReadout(panel, m, profile) }));
}

/**
 * What one feature IS, as rows of label and value.
 *
 * @param {object} panel     the part it is cut into
 * @param {object} feature   one entry of `partMachinings().machinings`
 * @param {object} profile
 * @returns {{
 *   id:string, kind:string, layer:string, title:string, subtitle:string,
 *   rows:Array<{label:string, value:string}>, edges:object, span:object
 * }}
 */
export function featureReadout(panel, feature, profile = null) {
  const size = partSize(panel);
  const layer = cncLayer(feature?.layer);
  const span = featureSpan(feature);
  const edges = edgeDistances(span, size, feature?.kind === 'hole');

  const rows = [];
  if (feature?.kind === 'hole') {
    rows.push({ label: '⌀', value: `${formatMm(feature.d)} mm` });
  } else {
    rows.push({ label: 'Size', value: `${formatMm(span.w)} × ${formatMm(span.h)} mm` });
  }

  // DEPTH. Where the engine states one it is said; where it does not, the
  // honest answer is that this record does not carry it, and inventing a
  // number for a cut is exactly what a rollover must not do. A drill's depth
  // is the machine's own decision (the LISP carries none), so a THROUGH hole
  // says so and a pocket without a stated depth says nothing at all.
  const depth = Number(feature?.depth);
  if (depth > 0) {
    rows.push({ label: 'Depth', value: `${formatMm(depth)} mm` });
  } else if (feature?.kind === 'hole') {
    rows.push({ label: 'Depth', value: 'through' });
  }

  // THE CORNER THE TOOL LEAVES. An internal pocket corner comes out filleted at
  // the cutter's radius, never square (turn 11, CLAUDE.md F6) — so it is stated
  // for a pocket and only for a pocket: a drilled hole has no corner and a
  // cutter pass leaves none either.
  const radius = toolRadius(profile);
  if (feature?.kind === 'pocket' && radius > 0) {
    rows.push({ label: 'Corner R', value: `${formatMm(radius)} mm` });
  }

  if (feature?.kind === 'mark') {
    rows.push({
      label: 'Pass',
      value: `${formatMm(Math.hypot(feature.to[0] - feature.from[0], feature.to[1] - feature.from[1]))} mm`,
    });
  }

  // …and where it is, off the part's OWN four edges. A drill is measured from
  // its centre, everything else from its nearest edge — which is how a joiner
  // sets a fence.
  rows.push({ label: 'From X edges', value: `${edgeText(edges.left)} / ${edgeText(edges.right)}` });
  rows.push({ label: 'From Y edges', value: `${edgeText(edges.bottom)} / ${edgeText(edges.top)}` });

  return {
    id: feature?.id || '',
    kind: feature?.kind || 'hole',
    layer: layer.name,
    // "kind + layer name" — the layer's own words, so the tooltip and the
    // legend a joiner has already learnt say the same thing.
    title: `${KIND_WORDS[feature?.kind] || 'Feature'} · ${layer.label}`,
    subtitle: layer.name,
    rows,
    edges,
    span,
  };
}

const KIND_WORDS = { hole: 'Drill', pocket: 'Pocket', mark: 'Cutter pass' };

/**
 * A distance to an edge, in the words a joiner would use.
 *
 * A cut that runs OFF the board — a dog bone, a socket, a groove with its
 * overshoot — is a negative distance, and "−18 mm from the right edge" is a
 * number nobody reads twice. It says "18 mm past" instead, which is what it is
 * and what the cutter does.
 */
function edgeText(value) {
  return value < 0 ? `${formatMm(-value)} mm past` : `${formatMm(value)} mm`;
}

/** The cutter's radius, or 0 where no profile says. */
export function toolRadius(profile) {
  return Math.max(0, (Number(profile?.cnc?.toolDiameter) || 0) / 2);
}

/** A feature's rectangle in the part's own CNC frame. */
export function featureSpan(feature) {
  if (!feature) return { x: 0, y: 0, w: 0, h: 0 };
  if (feature.kind === 'hole') {
    const r = (Number(feature.d) || 0) / 2;
    return { x: feature.x - r, y: feature.y - r, w: r * 2, h: r * 2, cx: feature.x, cy: feature.y };
  }
  if (feature.kind === 'mark') {
    const x = Math.min(feature.from[0], feature.to[0]);
    const y = Math.min(feature.from[1], feature.to[1]);
    return {
      x,
      y,
      w: Math.abs(feature.to[0] - feature.from[0]),
      h: Math.abs(feature.to[1] - feature.from[1]),
      cx: (feature.from[0] + feature.to[0]) / 2,
      cy: (feature.from[1] + feature.to[1]) / 2,
    };
  }
  return {
    x: feature.x, y: feature.y, w: feature.w, h: feature.h, cx: feature.x + feature.w / 2, cy: feature.y + feature.h / 2,
  };
}

/**
 * How far this feature stands off each of the part's own edges.
 *
 * `fromCentre` — a drill is measured from its centre, which is what a drilling
 * schedule states and what the DXF writes. Everything else is measured from the
 * NEAREST edge of the cut, because that is where the material actually stops.
 */
export function edgeDistances(span, size, fromCentre = false) {
  const left = fromCentre ? span.cx : span.x;
  const right = fromCentre ? span.cx : span.x + span.w;
  const bottom = fromCentre ? span.cy : span.y;
  const top = fromCentre ? span.cy : span.y + span.h;
  return {
    left,
    right: size.w - right,
    bottom,
    top: size.h - top,
  };
}
