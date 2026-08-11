// ─── EVERY CUT, AS AN ABSENCE (turn 20, CLAUDE.md F8) ───────────────────────
//
// Owner: today only the dog bones are truly cut; every drilling and pocket must
// read as REMOVED material, the cut faces a medium-dark grey.
//
// He is right, and the reason is worth writing down: turn 11 cuts a SOCKET out
// of the panel's solid because a socket is part of the outline, and turn 17
// draws every other feature as a LINE lying on the face. A line on a face is a
// drawing of a hole, and a joiner looking at a board wants to see the hole.
//
// This module answers the only question that needs answering before a view can
// cut one: WHERE, HOW BIG and HOW DEEP is every feature, in the part's own CNC
// frame? It is the same two records the DXF is written from — `panel.cnc` and
// the unit's `drills` — read once, so a recess in the picture cannot end up
// somewhere the machine will not cut.
//
// ─── THE ONE JUDGEMENT IN HERE ──────────────────────────────────────────────
//
// A pocket runs `pocketOvershoot` PAST the board's edge so the cutter enters
// and leaves off the work. Clipped to the board it therefore touches the edge
// exactly, and a hole that touches its own outline is not a hole — it is a
// notch, and a triangulator is entitled to refuse it. So a feature is clipped
// to the board and INSET by a hair (`EDGE_KEEP`), which leaves a rim of
// material a fifth of a millimetre wide where the cut runs off the end.
//
// That is a drawing decision and it reaches nothing: the DXF still carries the
// overshoot, because the DXF is what the machine reads.
//
// Pure functions — no three.js, no React (engine rule).

import { cncRect } from './socketFace.js';

/** How much material is left at an edge a cut runs off, in mm. */
export const EDGE_KEEP = 0.2;

/**
 * Every feature of one panel, as a recess.
 *
 * @param {object} panel   an engine panel record
 * @param {Array} drills   the unit's drills (the whole list; filtered here)
 * @param {object} opts
 *   thickness   the board's own thickness, mm — a feature deeper than the
 *               board is a THROUGH cut whatever its record says
 *   skipLayers  layers already cut by the outline (the socket, whose pocket IS
 *               the outline since turn 11 — cutting it twice would punch a
 *               hole through a notch)
 * @returns {Array<{kind:'round'|'rect', layer:string, depth:number|null,
 *                  through:boolean, x:number, y:number, r?:number,
 *                  w?:number, h?:number}>}
 *   `x, y` is the CENTRE for both kinds. `depth` null means "the record does
 *   not say", which for a drill means through and for a pocket means it is not
 *   cut at all rather than cut to a guess.
 */
export function panelRecesses(panel, drills = [], { thickness = 0, skipLayers = [] } = {}) {
  const cnc = panel?.cnc;
  if (!cnc) return [];
  const { w, h } = cncRect(panel);
  if (!(w > 0) || !(h > 0)) return [];
  const skip = new Set(skipLayers.filter(Boolean));
  const out = [];

  for (const p of cnc.pockets || []) {
    if (skip.has(p.layer)) continue;
    const depth = Number(p.depth);
    // A pocket with no stated depth is NOT cut. Every pocket the engine states
    // a depth for is cut to it; inventing one for the rest would be a picture
    // that disagrees with the machine, which is the whole thing this must not
    // do. (They are still drawn as lines by 3d/PartMachining.jsx in the two
    // windows that show a part on a bench.)
    if (!(depth > 0)) continue;
    const clipped = clipRect(
      Math.min(p.x1, p.x2), Math.min(p.y1, p.y2),
      Math.abs(p.x2 - p.x1), Math.abs(p.y2 - p.y1),
      w, h,
    );
    if (!clipped) continue;
    out.push({
      kind: 'rect',
      layer: p.layer,
      depth: Math.min(depth, thickness || depth),
      through: thickness > 0 && depth >= thickness - 1e-6,
      ...clipped,
    });
  }

  for (const hole of drills) {
    if (hole.panel !== panel.id) continue;
    const r = (Number(hole.d) || 0) / 2;
    if (!(r > 0)) continue;
    // Off the board, or so near the edge that a hole would break the outline:
    // the machine drills it, the picture leaves it out rather than producing a
    // shape a triangulator will refuse.
    if (hole.x - r < EDGE_KEEP || hole.y - r < EDGE_KEEP) continue;
    if (hole.x + r > w - EDGE_KEEP || hole.y + r > h - EDGE_KEEP) continue;
    const depth = Number(hole.depth);
    out.push({
      kind: 'round',
      layer: hole.layer,
      // The LISP carries no drill depth, and a drill with no depth goes
      // through — which is what every hole in these kits does except a hinge
      // cup, and the day the catalogue states a cup's depth this reads it.
      depth: depth > 0 ? Math.min(depth, thickness || depth) : null,
      through: !(depth > 0) || (thickness > 0 && depth >= thickness - 1e-6),
      x: hole.x,
      y: hole.y,
      r,
    });
  }

  return out;
}

/**
 * A feature rectangle, clipped to the board and held off its edges.
 *
 * @returns {{x:number, y:number, w:number, h:number}|null} centre and size, or
 *   null where nothing of it is left
 */
export function clipRect(x, y, width, height, boardW, boardH) {
  const lo = EDGE_KEEP;
  const x1 = Math.max(x, lo);
  const y1 = Math.max(y, lo);
  const x2 = Math.min(x + width, boardW - lo);
  const y2 = Math.min(y + height, boardH - lo);
  if (x2 - x1 <= 1e-6 || y2 - y1 <= 1e-6) return null;
  return {
    x: (x1 + x2) / 2, y: (y1 + y2) / 2, w: x2 - x1, h: y2 - y1,
  };
}

/**
 * A stable key for a panel's recesses — what the geometry cache is keyed on.
 *
 * Two panels with the same board and the same cuts share one solid, which is
 * what keeps a kitchen of fourteen identical base units at two side geometries.
 */
export function recessKey(recesses = []) {
  return recesses
    .map((f) => (f.kind === 'round'
      ? `o${f.x},${f.y},${f.r},${f.depth ?? 'T'}`
      : `r${f.x},${f.y},${f.w},${f.h},${f.depth ?? 'T'}`))
    .join('|');
}
