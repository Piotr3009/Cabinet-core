/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── THE SITE-TRIM ALLOWANCE (chat fix 19.10.2026, KIT_SITE_TRIM.lsp) ────────
//
// The owner, 19.10.2026: *"side panele powinny byc wieksze o 20 mm, to samo z
// plinth, panele 20mm gora + dol + bok (nie przod, 0 to zawsze powinno byc
// ok)"*.
//
// An END PANEL and a PLINTH are scribed on site: to a floor that is not level,
// a ceiling that is not flat, a wall that is not plumb. Until tonight both were
// cut to the millimetre the room drew and the joiner had nothing to take off.
// The side infill has had its allowance since T53 (`autoParts.fillerOversize`,
// one edge, the nominal stated, the label says TRIM ON SITE); this file gives
// the end panel and the plinth theirs, by the same idiom and ONE law:
//
//   the CUT is bigger by `siteTrim` on the edges named (KIT_SITE_TRIM.lsp
//   section 1: an end panel on its top, its bottom and its back, never its
//   front; a plinth on its top, its bottom and each end that is not a
//   machine-cut join); the outline grows BY ITS EDGES (a vertex on a growing
//   edge moves out with it, every other vertex stays, so a notch keeps its
//   size from the FINAL edges); the holes, the pockets and the marks move with
//   the origin; `panel.w / h` and the DXF carry the cut size; `panel.box` and
//   the scene keep the NOMINAL (`meta.oversize.nominal`, read by
//   `3d/panelSolid.js` through `sceneBoard`); the label says
//   OVERSIZE +20 TOP/BOTTOM/BACK - TRIM ON SITE (NOM 596 x 2250).
//
// Pure arithmetic in section A; one pass over a computed cabinet's panels in
// section B, run by `cabinet.js` after `endPanelsFollowSides` so the end panel
// that followed its side into a notch or a recess grows the shape it was cut
// to. Numbers: `profile.autoParts.endPanel.siteTrim`,
// `profile.autoParts.plinth.siteTrim` (20, PROPOSED). 0 switches it off and
// every board is byte for byte what it was.

import { roundTo } from './format.js';
import { polygonArea } from './notch.js';

const EPS = 1e-6;

// ═══════════════════════════════════════════════════════════════════════════
// A. THE ARITHMETIC (KIT_SITE_TRIM.lsp section 3)
// ═══════════════════════════════════════════════════════════════════════════

/** The allowance for a part, off the profile: a number >= 0. */
export function siteTrimMm(profile, part) {
  const AP = profile?.autoParts || {};
  const block = part === 'PLINTH' ? AP.plinth : part === 'END-PANEL' ? AP.endPanel : null;
  const v = Number(block?.siteTrim);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/** What the four edges grow by: { dl, dr, dt, db }. */
export function trimDeltas(t, edges) {
  const has = (e) => Array.isArray(edges) && edges.includes(e);
  return {
    dl: has('L') ? t : 0, dr: has('R') ? t : 0, dt: has('T') ? t : 0, db: has('B') ? t : 0,
  };
}

/**
 * site-trim-grow: the outline of a `w x h` board grown by `t` on `edges`
 * (letters of L R T B), in the grown board's own frame (its corner at 0, 0).
 * A vertex ON a growing edge (to EPS) moves out with that edge; every other
 * vertex moves by the origin shift only.
 */
export function growOutline(pts, w, h, t, edges) {
  const { dl, dr, dt, db } = trimDeltas(t, edges);
  return (pts || []).map(([x, y]) => {
    // On the left or bottom edge: stays (the edge itself moved out and the
    // origin with it). Inside: the origin shift. On the right or top edge:
    // the origin shift and that edge's own growth.
    const nx = x < EPS ? x : x + dl + (x > w - EPS ? dr : 0);
    const ny = y < EPS ? y : y + db + (y > h - EPS ? dt : 0);
    return [roundTo(nx, 4), roundTo(ny, 4)];
  });
}

/** site-trim-size: the grown board's size and its origin shift. */
export function grownSize(w, h, t, edges) {
  const { dl, dr, dt, db } = trimDeltas(t, edges);
  return {
    w: roundTo(w + dl + dr, 4), h: roundTo(h + db + dt, 4), dx: dl, dy: db,
  };
}

/**
 * The end panel's growing edges in its DRAWN frame: END-L is drawn as BUL (x
 * from the FRONT, so the back is R), END-R as BUR (x from the BACK, so the
 * back is L); the top is T, the bottom B. The front never grows (D2).
 */
export function endPanelTrimEdges(hand) {
  return hand === 'R' ? ['L', 'T', 'B'] : ['R', 'T', 'B'];
}

/** A plinth's growing edges: the top, the bottom, and each end that is open (not a join). */
export function plinthTrimEdges({ leftOpen = true, rightOpen = true } = {}) {
  return [...(leftOpen ? ['L'] : []), ...(rightOpen ? ['R'] : []), 'T', 'B'];
}

const JOIN_SPANS = new Set(['corner-butt', 'corner-mitre']);

/**
 * Which ends of a plinth board are open (D3: a machine-cut join never grows).
 *   PLINTH        the run's own ends, less a corner butt (T75 F6) or a mitre
 *                 (T75 F10) at that side;
 *   PLINTH-n      a strip: the run's left end on the first, its right end on
 *                 the last, the joins between strips never; a corner grown onto
 *                 the run rides the strip as a `corner-*` span id;
 *   PLINTH-A/B    an L's arm: the end at the corner is the butt (A's end face
 *                 is flush with B's face, B's end butts A), the far end is open.
 */
export function plinthOpenEnds(panel) {
  const m = panel?.meta || {};
  if (m.arm) return { leftOpen: false, rightOpen: true, far: true };
  const joins = new Set();
  if (m.corner?.side) joins.add(m.corner.side);
  for (const mt of m.mitres || []) if (mt?.side) joins.add(mt.side);
  if (m.strip) {
    const ids = Array.isArray(m.unitIds) ? m.unitIds : [];
    const first = Number(m.strip.index) === 1;
    const last = Number(m.strip.index) === Number(m.strip.of);
    return {
      leftOpen: first && !JOIN_SPANS.has(ids[0]) && !joins.has('left'),
      rightOpen: last && !JOIN_SPANS.has(ids[ids.length - 1]) && !joins.has('right'),
    };
  }
  return { leftOpen: !joins.has('left'), rightOpen: !joins.has('right') };
}

/** The words the label says for the grown edges, by part. */
export function trimEdgeWords(part, edges, hand = 'L', { far = false } = {}) {
  if (part === 'PLINTH' && edges.length === 4) return ['all edges'];
  const words = [];
  for (const e of edges) {
    if (e === 'T') words.push('top');
    else if (e === 'B') words.push('bottom');
    else if (part === 'END-PANEL') words.push('back');
    else if (far) words.push('far end');
    else words.push(e === 'L' ? 'L end' : 'R end');
  }
  void hand;
  return words;
}

// ═══════════════════════════════════════════════════════════════════════════
// B. ONE PASS OVER THE PANELS
// ═══════════════════════════════════════════════════════════════════════════

const shiftPt = (p, dx, dy) => (Array.isArray(p) ? [roundTo(p[0] + dx, 4), roundTo(p[1] + dy, 4)] : p);

function shiftCnc(cnc, dx, dy) {
  const out = { ...cnc };
  if (Array.isArray(cnc.pockets)) {
    out.pockets = cnc.pockets.map((k) => ({
      ...k,
      ...(Number.isFinite(k.x1) ? { x1: roundTo(k.x1 + dx, 4), x2: roundTo(k.x2 + dx, 4) } : {}),
      ...(Number.isFinite(k.y1) ? { y1: roundTo(k.y1 + dy, 4), y2: roundTo(k.y2 + dy, 4) } : {}),
      ...(Array.isArray(k.pts) ? { pts: k.pts.map((p) => shiftPt(p, dx, dy)) } : {}),
    }));
  }
  if (Array.isArray(cnc.holes)) {
    out.holes = cnc.holes.map((k) => ({ ...k, x: roundTo(k.x + dx, 4), y: roundTo(k.y + dy, 4) }));
  }
  if (Array.isArray(cnc.marks)) {
    out.marks = cnc.marks.map((k) => ({
      ...k,
      ...(k.from ? { from: shiftPt(k.from, dx, dy) } : {}),
      ...(k.to ? { to: shiftPt(k.to, dx, dy) } : {}),
      ...(Array.isArray(k.pts) ? { pts: k.pts.map((p) => shiftPt(p, dx, dy)) } : {}),
    }));
  }
  if (cnc.bite && typeof cnc.bite === 'object') {
    out.bite = {
      ...cnc.bite,
      x0: roundTo(cnc.bite.x0 + dx, 4), x1: roundTo(cnc.bite.x1 + dx, 4),
      y0: roundTo(cnc.bite.y0 + dy, 4), y1: roundTo(cnc.bite.y1 + dy, 4),
    };
  }
  return out;
}

/** The corner record (`cnc.notch`: fc, nw, nh, also) grown where its corner sits on a growing edge. */
export function growNotchRecord(rec, t, edges) {
  if (!rec || typeof rec !== 'object') return rec;
  const { dl, dr, dt, db } = trimDeltas(t, edges);
  // `fc` names the corner on the board's rectangle (engine/notch.js
  // edgeNotchCorners): x0 is the left edge, x1 the right, y0 the bottom, y1 the top.
  const fc = String(rec.fc || '');
  const gw = fc.includes('x0') ? dl : fc.includes('x1') ? dr : 0;
  const gh = fc.includes('y0') ? db : fc.includes('y1') ? dt : 0;
  return {
    ...rec,
    nw: roundTo(Number(rec.nw) + gw, 4),
    nh: roundTo(Number(rec.nh) + gh, 4),
    ...(rec.also ? { also: growNotchRecord(rec.also, t, edges) } : {}),
  };
}

/**
 * Grow one panel in place. `edges` in its drawn frame. Returns the record it
 * wrote, or null where nothing grew.
 */
export function growPanel(panel, t, edges, { words = [] } = {}) {
  if (!(t > 0) || !edges?.length || !panel?.cnc) return null;
  const cnc = panel.cnc;
  const w = Number(cnc.drawn_w) > 0 ? Number(cnc.drawn_w) : Number(panel.w) || 0;
  const h = Number(cnc.drawn_h) > 0 ? Number(cnc.drawn_h) : Number(panel.h) || 0;
  if (!(w > 0) || !(h > 0)) return null;
  const outline = Array.isArray(cnc.outline) && cnc.outline.length >= 3
    ? cnc.outline
    : [[0, 0], [w, 0], [w, h], [0, h]];
  const size = grownSize(w, h, t, edges);
  const grown = growOutline(outline, w, h, t, edges);
  // The NOMINAL, kept beside the cut: what the room draws (`sceneBoard`), what
  // the label states, what a law written before tonight is read against.
  const nominal = {
    w: roundTo(w, 4),
    h: roundTo(h, 4),
    ...(Number.isFinite(panel.area_m2) ? { area_m2: panel.area_m2 } : {}),
    ...(panel.edging ? { edging: { ...panel.edging } } : {}),
    cnc: {
      outline: cnc.outline,
      ...(Number(cnc.drawn_w) > 0 ? { drawn_w: cnc.drawn_w, drawn_h: cnc.drawn_h } : {}),
      ...('notch' in cnc ? { notch: cnc.notch } : {}),
      ...('bite' in cnc ? { bite: cnc.bite } : {}),
      ...(Array.isArray(cnc.marks) ? { marks: cnc.marks } : {}),
    },
  };
  const shifted = shiftCnc(cnc, size.dx, size.dy);
  panel.cnc = {
    ...shifted,
    outline: grown,
    ...(Number(cnc.drawn_w) > 0 ? { drawn_w: size.w, drawn_h: size.h } : {}),
    ...('notch' in cnc ? { notch: growNotchRecord(cnc.notch, t, edges) } : {}),
  };
  // The record's size is the CUT; the box stays the nominal (the room's board).
  const sw = Number(panel.w) || 0;
  const sh = Number(panel.h) || 0;
  const drawnIsRecord = Math.abs(w - sw) < 0.5 && Math.abs(h - sh) < 0.5;
  if (drawnIsRecord) {
    panel.w = size.w;
    panel.h = size.h;
  } else {
    // A board drawn TURNED: its record is the drawn frame's other way round.
    panel.w = roundTo(sw + (size.h - h), 4);
    panel.h = roundTo(sh + (size.w - w), 4);
  }
  panel.area_m2 = roundTo(polygonArea(grown) / 1e6, 6);
  // The banding runs along the CUT board's edges (it leaves the workshop
  // banded, the joiner trims on site): the coded edges at their cut lengths,
  // `<` and `>` a height each, `^` and `v` a width each (profile.csv.codes).
  const code = typeof panel.edging?.code === 'string' ? panel.edging.code : '';
  if (code) {
    const ups = (code.match(/[<>]/g) || []).length;
    const acrosses = (code.match(/[\^v]/g) || []).length;
    panel.edging = { ...panel.edging, len_m: roundTo((ups * panel.h + acrosses * panel.w) / 1000, 6) };
  }
  const record = {
    mm: t,
    frame: [...edges],
    edges: words,
    nominal,
  };
  panel.meta = { ...(panel.meta || {}), oversize: record };
  return record;
}

/**
 * Every END PANEL and PLINTH of a computed cabinet, grown by the profile's
 * allowance. Mutates `panels`; returns { id: record } for what grew, or null.
 */
export function applySiteTrim({ panels, profile }) {
  const said = {};
  const tEnd = siteTrimMm(profile, 'END-PANEL');
  const tPl = siteTrimMm(profile, 'PLINTH');
  if (!(tEnd > 0) && !(tPl > 0)) return null;
  for (const p of panels || []) {
    if (!p || !p.cnc) continue;
    if (p.part === 'END-PANEL' && tEnd > 0) {
      const hand = p.meta?.side === 'right' ? 'R' : 'L';
      const edges = endPanelTrimEdges(hand);
      const rec = growPanel(p, tEnd, edges, { words: trimEdgeWords('END-PANEL', edges, hand) });
      if (rec) said[p.id] = rec;
    } else if (p.part === 'PLINTH' && tPl > 0) {
      const ends = plinthOpenEnds(p);
      const edges = plinthTrimEdges(ends);
      const rec = growPanel(p, tPl, edges, { words: trimEdgeWords('PLINTH', edges, 'L', { far: Boolean(ends.far) }) });
      if (rec) said[p.id] = rec;
    }
  }
  return Object.keys(said).length ? said : null;
}

/**
 * The board as the ROOM sees it: the nominal where a site-trim allowance grew
 * the cut (`3d/panelSolid.js`). Any other panel comes back as itself.
 */
export function sceneBoard(panel) {
  const nom = panel?.meta?.oversize?.nominal;
  if (!nom || typeof nom !== 'object' || !nom.cnc) return panel;
  return {
    ...panel,
    w: nom.w,
    h: nom.h,
    ...(Number.isFinite(nom.area_m2) ? { area_m2: nom.area_m2 } : {}),
    ...(nom.edging ? { edging: nom.edging } : {}),
    cnc: {
      ...panel.cnc,
      outline: nom.cnc.outline,
      drawn_w: nom.cnc.drawn_w,
      drawn_h: nom.cnc.drawn_h,
      ...('notch' in nom.cnc ? { notch: nom.cnc.notch } : {}),
      ...('bite' in nom.cnc ? { bite: nom.cnc.bite } : {}),
      ...(nom.cnc.marks ? { marks: nom.cnc.marks } : {}),
    },
  };
}
