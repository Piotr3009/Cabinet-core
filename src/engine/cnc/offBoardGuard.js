/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── THE OFF-BOARD GUARD (chat fix 19.10.2026) ──────────────────────────────
//
// The owner, 19.10.2026: *"czasami cnc rysuje items jak 3 mm drills czy cos
// takiego czy litery poza elementami, czy mozesz sie upewnic na milion procent
// ze wszystkie elementy sa zamkniete?"*
//
// Turn 25's guard (`edgeGuard.js`) asks whether a loop is well formed and
// which way it runs; turn 31's (`drillGuard.js`) whether two holes land in
// one place. Neither asks the question the owner is asking: IS IT ON THE
// BOARD. This guard asks it of the DXF ENTITIES themselves, the very list the
// writer serialises (`cnc/dxf.js panelEntities`), so what is checked is what
// the machine gets and not a second opinion about it:
//
//   OUTLINE   the panel's outline polyline is one closed loop (the R12
//             closed flag), at least three points, finite numbers;
//   CIRCLE    a hole's whole disc lies inside the outline and inside no
//             through pocket (a window the cutter takes out), to a
//             tolerance of EPS;
//   TEXT      the insertion point of every label and note is inside the
//             outline and in no through pocket;
//   OPEN POLY every point of every open polyline (a biscuit mark, a corner
//             mark, the EDGE arrow) is inside or on the outline;
//   POCKET    a closed pocket may break the edge by design (a puzzle socket
//             runs past it, a dog bone sits half off it) but never lies
//             wholly off the board.
//
// Rule 4: it SPEAKS, it never fixes. Pure: entities in, findings out.

import { CABINEO_LAYERS } from '../cabineo.js';

const EPS = 0.01;

/** Even-odd point in polygon; a point ON an edge counts as inside (`onEdge`). */
export function pointInPolygon(x, y, poly, tol = EPS) {
  if (!Array.isArray(poly) || poly.length < 3) return false;
  if (onEdge(x, y, poly, tol)) return true;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Distance from a point to a segment. */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function onEdge(x, y, poly, tol = EPS) {
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if (segDist(x, y, poly[j][0], poly[j][1], poly[i][0], poly[i][1]) <= tol) return true;
  }
  return false;
}

/** The least distance from a point to the polygon's edges. */
function edgeClearance(x, y, poly) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    best = Math.min(best, segDist(x, y, poly[j][0], poly[j][1], poly[i][0], poly[i][1]));
  }
  return best;
}

const finite = (pts) => pts.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
const fmt = (v) => Math.round(v * 10) / 10;

/**
 * One panel's DXF entities, asked whether everything drawn is on the board.
 *
 * @param {Array} entities   the writer's own list ({type, layer, ...})
 * @param {object} opts      { panelId, outlineLayer, throughPocketLayers: Set, edgeOpenLayers: Set }
 * @returns {Array<{panel, layer, code, message}>}
 */
export function entityFindings(entities, {
  panelId = '', outlineLayer = 'OUTLINE', throughPocketLayers = new Set(), edgeOpenLayers = new Set(),
} = {}) {
  const out = [];
  const say = (layer, code, message) => out.push({ panel: panelId, layer, code, message: `${panelId}: ${message}` });
  const polys = (entities || []).filter((e) => e.type === 'poly');
  const outlines = polys.filter((e) => e.layer === outlineLayer);
  if (outlines.length !== 1) {
    say(outlineLayer, 'outline-count', `${outlines.length} outline loop(s) on ${outlineLayer}: a board has exactly one`);
    return out;
  }
  const [ol] = outlines;
  const pts = ol.pts || [];
  if (!ol.closed) say(outlineLayer, 'outline-open', 'the outline is not written closed (R12 flag 70 = 0)');
  if (pts.length < 3) { say(outlineLayer, 'outline-too-few-points', `${pts.length} point(s)`); return out; }
  if (!finite(pts)) { say(outlineLayer, 'outline-nan', 'a point of the outline is not a number'); return out; }
  // A through pocket is a hole in the board: a window the cutter takes out.
  const windows = polys.filter((e) => e !== ol && e.closed && throughPocketLayers.has(e.layer)).map((e) => e.pts || []);
  const onBoard = (x, y) => pointInPolygon(x, y, pts) && !windows.some((w) => pointInPolygon(x, y, w) && !onEdge(x, y, w));

  for (const e of entities || []) {
    if (e === ol) continue;
    if (e.type === 'circle') {
      const r = Number(e.r) || 0;
      if (!Number.isFinite(e.cx) || !Number.isFinite(e.cy)) { say(e.layer, 'hole-nan', `a hole on ${e.layer} is not a number`); continue; }
      const centreOn = onBoard(e.cx, e.cy);
      const clear = edgeClearance(e.cx, e.cy, pts) + EPS >= r
        && windows.every((w) => edgeClearance(e.cx, e.cy, w) + EPS >= r || !pointInPolygon(e.cx, e.cy, w));
      if (!centreOn) say(e.layer, 'hole-off-board', `a dia ${fmt(2 * r)} hole on ${e.layer} at (${fmt(e.cx)}, ${fmt(e.cy)}) is off the board`);
      // A Cabineo pocket is OPEN at the board's end by its own law
      // (SKYLON_JOINTS_CABINEO.lsp A.2: the channel runs out of the end), and
      // the drill15 machining mills it as lobes, the first of them breaking
      // the edge: on the board, by design, like a socket (edgeOpenLayers).
      else if (!clear && !edgeOpenLayers.has(e.layer)) say(e.layer, 'hole-breaks-edge', `a dia ${fmt(2 * r)} hole on ${e.layer} at (${fmt(e.cx)}, ${fmt(e.cy)}) breaks the board's edge`);
      continue;
    }
    if (e.type === 'arc') {
      if (!onBoard(e.cx, e.cy)) say(e.layer, 'arc-off-board', `an arc on ${e.layer} centred at (${fmt(e.cx)}, ${fmt(e.cy)}) is off the board`);
      continue;
    }
    if (e.type === 'text') {
      if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) { say(e.layer, 'text-nan', `a text on ${e.layer} is not placed`); continue; }
      if (!onBoard(e.x, e.y)) say(e.layer, 'text-off-board', `the text "${String(e.str).slice(0, 24)}" on ${e.layer} at (${fmt(e.x)}, ${fmt(e.y)}) is off the board`);
      continue;
    }
    if (e.type === 'poly') {
      const p = e.pts || [];
      if (!finite(p)) { say(e.layer, 'poly-nan', `a polyline on ${e.layer} has a point that is not a number`); continue; }
      if (e.closed && throughPocketLayers.has(e.layer)) {
        // A window: every corner on the board (it may break the edge: a bite).
        const off = p.filter(([x, y]) => !pointInPolygon(x, y, pts));
        if (off.length) say(e.layer, 'pocket-off-board', `a pocket on ${e.layer} has ${off.length} corner(s) off the board, first (${fmt(off[0][0])}, ${fmt(off[0][1])})`);
        continue;
      }
      const off = p.filter(([x, y]) => !onBoard(x, y));
      if (e.closed) {
        // A pocket may BREAK the edge by design (a puzzle socket runs
        // `socketOvershoot` past the edge, a dog bone sits half off it, a
        // drawer side's groove runs off BOTH ends: the cutter runs off the
        // board so it leaves no step); what it may not do is lie wholly off
        // the board: no corner on it, its centre not on it, and no corner of
        // the board inside it.
        const cx = p.reduce((a, [x]) => a + x, 0) / p.length;
        const cy = p.reduce((a, [, y]) => a + y, 0) / p.length;
        const touches = off.length < p.length || onBoard(cx, cy) || pts.some(([x, y]) => pointInPolygon(x, y, p));
        if (!touches) say(e.layer, 'pocket-off-board', `a pocket on ${e.layer} lies wholly off the board, first corner (${fmt(p[0][0])}, ${fmt(p[0][1])})`);
        continue;
      }
      if (off.length) say(e.layer, 'line-off-board', `a line on ${e.layer} has ${off.length} point(s) off the board, first (${fmt(off[0][0])}, ${fmt(off[0][1])})`);
    }
  }
  return out;
}

/**
 * Every DXF file of a unit, through `entityFindings`. The outline layer and
 * the through-pocket layers are read off the profile the files were written
 * with (`puzzle.layers.outline`; a through pocket is one whose depth is the
 * board's thickness: today the recess window, `RECESS_WINDOW`).
 *
 * @param {Array} files   buildUnitDxfFiles() output ({panelId, entities, ...})
 * @param {object} result computeCabinet() output (for each panel's pockets)
 */
/** The layers whose pockets are open at the board's end by their own law: the Cabineo pocket's three machinings. */
function edgeOpenLayersOf(profile) {
  const pocket = profile?.joints?.cabineo?.layers?.pocket || CABINEO_LAYERS.pocket;
  return new Set(Object.values(pocket || {}).filter((v) => typeof v === 'string'));
}

export function offBoardFindings(files, result, { outlineLayer = 'OUTLINE', profile = null } = {}) {
  const out = [];
  const edgeOpen = edgeOpenLayersOf(profile);
  for (const f of files || []) {
    if (!Array.isArray(f.entities)) continue;
    const panel = result?.panels?.find((p) => p.id === f.panelId) || null;
    const thick = Number(panel?.thickness) || 0;
    const through = new Set((panel?.cnc?.pockets || [])
      .filter((k) => thick > 0 && Number(k.depth) >= thick - EPS).map((k) => k.layer));
    out.push(...entityFindings(f.entities, {
      panelId: f.panelId, outlineLayer: panel?.cnc?.layer || outlineLayer, throughPocketLayers: through, edgeOpenLayers: edgeOpen,
    }));
  }
  return out;
}

/**
 * The gate's own entry (chat fix 19.10.2026): every panel of a computed
 * cabinet, through the DXF writer's own entity builder (`panelEntities`, the
 * very list the file is written from, without writing it) and
 * `entityFindings`, in the export gate's finding shape (Check #9's family: the
 * OUTLINE and what is drawn on the board).
 */
export function offBoardGateFindings(result, { profile, unitId = null, unitNum = null, panelEntities: entitiesOf, labels = null } = {}) {
  if (typeof entitiesOf !== 'function' || !result?.panels) return [];
  const num = unitNum || result.unitNum || '';
  const edgeOpen = edgeOpenLayersOf(profile);
  const out = [];
  for (const panel of result.panels) {
    if (!panel?.cnc?.outline || panel.cnc.outline.length < 3) continue;
    let entities;
    try {
      entities = entitiesOf(panel, result.drills || [], { unitNum: num, profile, label: labels ? labels[panel.id] : null });
    } catch { continue; }
    const thick = Number(panel.thickness) || 0;
    const through = new Set((panel.cnc.pockets || []).filter((k) => thick > 0 && Number(k.depth) >= thick - EPS).map((k) => k.layer));
    for (const f of entityFindings(entities, {
      panelId: panel.id, outlineLayer: panel.cnc.layer || profile?.puzzle?.layers?.outline || 'OUTLINE', throughPocketLayers: through, edgeOpenLayers: edgeOpen,
    })) {
      out.push({
        check: 9, level: 'red', unitId, unitNum: num, panel: panel.id, part: panel.part, layer: f.layer, code: f.code,
        message: `${num ? `${num} ` : ''}${f.message}`,
      });
    }
  }
  return out;
}
