// ─── THE GROOVE UNDER EVERY PLACED LINE (turn 45, CLAUDE.md F9-CNC) ─────────
//
//   *"The groove under every placed line: born in `reference/lisp/` (rule 3),
//   then the app's CNC export cuts it — width = 4 mm or the channel width, on
//   the panel the line sits on. Gated on lines existing; six configs
//   untouched."*
//
// The LISP came first and is the law: `reference/lisp/KIT_LED_GROOVE.lsp`
// declares the LED_GROOVE layer at ACI 44 and draws the slot as a closed
// rectangle CENTRED on the line. This file cuts exactly that rectangle, on
// exactly that layer, and `test/turn45-f9-cnc-the-groove.test.js` holds the two
// to each other — it reads the .lsp and checks the numbers agree.
//
// ─── WHY IT IS A LIB AND NOT AN ENGINE PASS ─────────────────────────────────
//
// Iron rule 2: *"Engine untouched EXCEPT F9-CNC, which is additive and gated on
// LED lines existing — none of the six configs carries one, so `t45-classify`:
// six IDENTICAL, UNNAMED=0."*
//
// The safest way to keep that promise is not to write the gate into
// `computeCabinet()` and trust it; it is to put the cut where `computeCabinet()`
// cannot reach at all. So the groove is added AFTER the engine has finished, on
// the way to the DXF writer, through `panel.cnc.paths` — the extension point
// T38 F10 opened with "everything drawn exports", the same road a user's own
// drawn rectangle already travels. A cabinet with no line is handed back the
// object it came in as, identity included.
//
// ─── THE FRAME ──────────────────────────────────────────────────────────────
//
// A strip is a box in the UNIT's millimetre frame — x across, y up, z back to
// front — which is the frame `panel.box` is in and the frame the 3D draws.
// A panel's CNC drawing is its own 2D frame, the board lying on the bed, and
// which way round that is depends on which axis carries its THICKNESS:
//
//   thickness in Y  a horizontal board (top, bottom, shelf)  → (z, x)
//   thickness in X  a vertical side                          → (z, y)
//   thickness in Z  a back or a front                        → (x, y)
//
// That is not a rule this file invented: it is what `panel.cnc.outline`
// actually spans for every part `computeCabinet()` produces, and the test
// asserts it against a real result rather than against this comment.
//
// Pure — no React, no store, no engine import beyond the strip reader the
// scene and the BOM already ask.

import { grooveWidthMm } from './ledSpec.js';

/** The layer the LISP declares, and the colour it declares it at. */
export const LED_GROOVE_LAYER = Object.freeze({
  name: 'LED_GROOVE', aci: 44, label: 'LED groove', kind: 'pocket',
});

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const round3 = (v) => Math.round(v * 1e3) / 1e3;

/**
 * Which two of the unit's axes a panel's CNC drawing is in.
 *
 * @returns {null|{x:'x'|'y'|'z', y:'x'|'y'|'z'}} the unit axis each CNC axis
 *   maps to — null for a part with no box the rule can read.
 */
export function panelPlane(panel) {
  const b = panel?.box;
  if (!b) return null;
  const t = num(panel.thickness) > 0 ? num(panel.thickness) : Math.min(num(b.w), num(b.h), num(b.d));
  const close = (v) => Math.abs(num(v) - t) < 0.51;
  if (close(b.h)) return { x: 'z', y: 'x' };   // horizontal: top, bottom, shelf
  if (close(b.w)) return { x: 'z', y: 'y' };   // vertical side
  if (close(b.d)) return { x: 'x', y: 'y' };   // back, front
  return null;
}

/** One unit-frame coordinate, in the panel's own CNC frame. */
function toPanel(panel, plane, axis, mm) {
  const b = panel.box;
  const origin = { x: num(b.x), y: num(b.y), z: num(b.z) }[axis];
  return round3(num(mm) - origin);
}

/**
 * WHICH PANEL a strip is cut into.
 *
 * A shelf line names its shelf outright — `ref` is the panel id, and that is
 * what "click a shelf, then add the strip under it" writes. It is on the ITEM
 * rather than on the computed strip (`engine/ledStrips.js` hands back geometry
 * and keeps the placement on the design), so the item comes in beside it: a
 * groove is cut in the board somebody pointed at, never in a board this file
 * guessed from a coordinate.
 *
 * Every other kind names a place rather than a board, so the board is found by
 * PART:
 *
 *   side        the interior face of BUL / BUR — the side the `ref` names
 *   top_under   the underside of the top board
 *   top         the top board, lit upward off its face
 *   bottom      the plinth line — cut in the BOTTOM board
 *
 * A kind that names no board this cabinet has cuts nothing, which is the
 * honest answer: a groove in a board that is not there is a hole in the file.
 */
export function panelForStrip(strip, panels = [], item = null) {
  const list = Array.isArray(panels) ? panels : [];
  const byId = (id) => list.find((p) => p.id === id) || null;
  const byPart = (...parts) => list.find((p) => parts.includes(p.part)) || null;
  if (!strip) return null;
  const ref = item?.ref ?? strip.ref ?? null;
  if (strip.kind === 'shelf') return byId(ref);
  if (strip.kind === 'side') return byPart(ref === 'R' ? 'BUR' : 'BUL');
  if (strip.kind === 'top' || strip.kind === 'top_under') return byPart('TOP');
  if (strip.kind === 'bottom') return byPart('BOTTOM');
  return null;                                  // a spot is not a run
}

/**
 * The groove one strip cuts in one panel — a closed rectangle, in the panel's
 * own CNC frame, CENTRED on the line exactly as the LISP draws it.
 *
 * @returns {null|{layer, closed, pts, kind, mm}}
 */
export function grooveForStrip(strip, panel, widthMm) {
  if (!strip || strip.kind === 'spot' || !panel) return null;
  const plane = panelPlane(panel);
  if (!plane) return null;
  const w = num(widthMm);
  if (!(w > 0)) return null;
  const b = strip.box;
  if (!b) return null;

  // The strip's own extent on each of the panel's two axes.
  const span = (axis) => {
    const from = { x: num(b.x), y: num(b.y), z: num(b.z) }[axis];
    const size = { x: num(b.w), y: num(b.h), z: num(b.d) }[axis];
    return [toPanel(panel, plane, axis, from), toPanel(panel, plane, axis, from + size)];
  };
  const [x1, x2] = span(plane.x);
  const [y1, y2] = span(plane.y);
  const runX = Math.abs(x2 - x1);
  const runY = Math.abs(y2 - y1);
  // A line runs the LONG way; the short way is where the strip is thin, and
  // that is the axis the slot's own width replaces — centred, as the LISP
  // says, so an 80 mm inset puts the light at 80 rather than at 82.
  const half = w / 2;
  const rect = runX >= runY
    ? {
      x1: Math.min(x1, x2), x2: Math.max(x1, x2), c: (y1 + y2) / 2, along: 'x',
    }
    : {
      y1: Math.min(y1, y2), y2: Math.max(y1, y2), c: (x1 + x2) / 2, along: 'y',
    };

  const pts = rect.along === 'x'
    ? [
      [rect.x1, round3(rect.c - half)], [rect.x2, round3(rect.c - half)],
      [rect.x2, round3(rect.c + half)], [rect.x1, round3(rect.c + half)],
    ]
    : [
      [round3(rect.c - half), rect.y1], [round3(rect.c + half), rect.y1],
      [round3(rect.c + half), rect.y2], [round3(rect.c - half), rect.y2],
    ];

  return {
    layer: LED_GROOVE_LAYER.name,
    closed: true,
    pts,
    kind: strip.kind,
    mm: round3(rect.along === 'x' ? rect.x2 - rect.x1 : rect.y2 - rect.y1),
  };
}

/**
 * A computeCabinet result with the grooves cut into it — or the very object it
 * was handed, when there is nothing to cut.
 *
 * THE GATE, and it is the first thing this function does: no strips, no
 * change. Not a copy with no paths added; the SAME object, so a caller that
 * compares by identity sees what iron rule 2 promises.
 *
 * @param {object} args
 *   result   computeCabinet() output
 *   strips   the placed strips of THIS unit (engine/ledStrips.js stripsForUnit)
 *   items    the lighting items behind them — where a shelf line's board is
 *            named. `design.lighting.items`, filtered to this unit or not; the
 *            match is by id, so an item of another unit simply never matches.
 *   ledSpec  the project's LED spec (lib/ledSpec.js)
 */
export function withLedGrooves({
  result, strips = [], items = [], ledSpec = null,
} = {}) {
  const runs = (Array.isArray(strips) ? strips : []).filter((s) => s && s.kind !== 'spot');
  if (!result || !runs.length) return result;

  const itemById = new Map((Array.isArray(items) ? items : []).map((i) => [i.id, i]));
  const width = grooveWidthMm(ledSpec);
  const byPanel = new Map();
  for (const strip of runs) {
    const panel = panelForStrip(strip, result.panels, itemById.get(strip.id) || null);
    if (!panel) continue;
    const groove = grooveForStrip(strip, panel, width);
    if (!groove) continue;
    byPanel.set(panel.id, [...(byPanel.get(panel.id) || []), groove]);
  }
  if (!byPanel.size) return result;

  return {
    ...result,
    panels: result.panels.map((p) => {
      const grooves = byPanel.get(p.id);
      if (!grooves) return p;
      return {
        ...p,
        cnc: {
          ...(p.cnc || {}),
          // `cnc.paths` is T38 F10's own extension point — "everything drawn
          // exports" — so the DXF writer needs no new branch and the groove
          // arrives as a closed polyline on its own layer, like every pocket.
          paths: [...(p.cnc?.paths || []), ...grooves],
        },
      };
    }),
  };
}

/** How many grooves a result carries — what a proof counts. */
export function grooveCount(result) {
  let n = 0;
  for (const p of result?.panels || []) {
    for (const path of p.cnc?.paths || []) if (path.layer === LED_GROOVE_LAYER.name) n += 1;
  }
  return n;
}
