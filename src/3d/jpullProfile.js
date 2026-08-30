// ─── THE J-PULL, AS A SHAPE (turn 57, CLAUDE.md F3) ─────────────────────────
//
// The owner, 30.08.2026: *"nie zapomnij o cieniowaniu po routerowaniu, zeby
// bylo widac cien."*
//
// So the J renders as GEOMETRY, the shaker school: a real depression with real
// walls, so it reads at a grazing angle and throws a shadow — not a dark
// stripe painted along an edge, which vanishes the moment the camera moves.
//
// ─── WHICH HOME, AND WHY IT IS THIS ONE ─────────────────────────────────────
//
// The code has TWO front-solid builders and they never meet: `shakerSolid.js`
// serves every panel with `meta.frontType === 'S'` and `panelSolid.js` serves
// everything else, dispatched by one line in `UnitView.jsx`. Neither can cover
// the other, so "extend panelSolid's machined path OR the tray builder" has no
// single answer — and the honest one is that the PROFILE is the home, stated
// once here as a pure producer of outlines, and CALLED by the builder that
// owns the board. This file computes no meshes and imports no three: it hands
// back polygons and z-ranges, which is the one thing both builders speak.
//
// ─── HOW A J IS ACTUALLY CUT, AND THEREFORE HOW IT IS DRAWN ─────────────────
//
// The owner's section, across an 18 mm board, measured from the machined face
// (z = 0, the face you look at) inward:
//
//   z 0 … 4.212        THE LIP. Full board, right out to the edge. This is the
//                      visible hook of the J.
//   z 4.212 … 14.212   THE SLOT. Material gone for 40 mm in from the edge —
//                      the finger slot, and what your hand goes into.
//   z 14.212 … 18      THE REAR LEG, set back 30 mm from the edge. That 30 is
//                      the relief, and it is why the lip stands 30 proud.
//
// So the board is drawn as THREE SLABS stacked through its own thickness, each
// extruded from its own outline: the lip's outline is the board's, the slot's
// is the board's with the J edge pulled back 40, the leg's with it pulled back
// 30. The material is genuinely absent, the walls are real surfaces with real
// normals, and the shadow the owner asked for is the one the renderer already
// draws for every other cut in the project.
//
// ─── AND THE ENDS RAMP ON AN ARC ────────────────────────────────────────────
//
// *"wjazd po luku, nie ostre, lukowate."* On a TALL door the run is stopped —
// 500 mm starting 700 up — and a form tool plunged square at 700 leaves a wall
// across the whole profile. The cutter is walked in along a radius instead, so
// the pull-back grows from nothing to its full depth over `rampR` and dies
// back again at the far end. `rampDepths` below is that quarter circle, and it
// is TANGENT to the edge at the start, which is what makes it a lead-in rather
// than a chamfer.
//
// Pure functions — no three.js, no store. Millimetres, in the panel's own 2-D
// cut frame (origin bottom-left, y up), which is the frame every outline in
// this project is written in.

/** How many segments a lead-in arc is drawn with. */
const RAMP_SEGMENTS = 8;
const EPS = 1e-6;

/**
 * The pull-back at each sample of one lead-in, tangent to the edge at s = 0.
 *
 * A circle of radius `r` rolled into the corner: at `s` along the edge the
 * cutter has reached `d(s) = depth · sqrt(1 − ((r − s)/r)²)`. At s = 0 that is
 * 0 and its tangent is along the edge; at s = r it is the full depth. Square
 * ends would be `d = depth` from the first millimetre, which is the thing the
 * owner said not to do.
 *
 * @returns {Array<{s:number, d:number}>} s = along the edge from the run's end
 */
export function rampDepths(depth, r, segments = RAMP_SEGMENTS) {
  const out = [];
  if (!(r > 0)) return [{ s: 0, d: depth }];
  for (let i = 0; i <= segments; i += 1) {
    const s = (r * i) / segments;
    const k = (r - s) / r;
    out.push({ s, d: depth * Math.sqrt(Math.max(0, 1 - k * k)) });
  }
  return out;
}

/** Sutherland–Hodgman against `y <= limit` — used for a TOP-edge pull-back. */
function clipBelow(pts, limit) {
  const out = [];
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const aIn = a[1] <= limit + EPS;
    const bIn = b[1] <= limit + EPS;
    if (aIn) out.push(a);
    if (aIn !== bIn) {
      const t = (limit - a[1]) / (b[1] - a[1]);
      out.push([a[0] + (b[0] - a[0]) * t, limit]);
    }
  }
  return out;
}

/**
 * The board's outline with a NOTCH cut along one vertical edge.
 *
 * The J edge is always a straight vertical segment of a front's outline — a
 * rake lands on the TOP, never on a stile, which is the law's own "NEVER on a
 * diagonal" said in geometry. So the notch is spliced into that one segment
 * and every other vertex of the board, knees and all, is left exactly where it
 * was.
 *
 * @param {Array<[number,number]>} pts  the board's outline
 * @param {number} atX  0 for the sheet's LEFT edge, w for its RIGHT
 * @param {number} into  +1 where the material lies to the right of the edge
 */
function notchVertical(pts, atX, into, from, to, depth, rampR) {
  if (!(depth > 0) || !(to > from)) return pts;
  // A run shorter than two lead-ins gets the lead-ins it has room for, so a
  // clamped run on a short leaf still eases in and out rather than snapping to
  // square ends the moment it is shortened.
  const r = Math.min(rampR, (to - from) / 2);
  const ramp = rampDepths(depth, r);
  const out = [];
  let spliced = false;
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    out.push(a);
    const onEdge = Math.abs(a[0] - atX) < 1e-4 && Math.abs(b[0] - atX) < 1e-4;
    if (spliced || !onEdge) continue;
    const up = b[1] > a[1];
    const lo = Math.max(from, Math.min(a[1], b[1]));
    const hi = Math.min(to, Math.max(a[1], b[1]));
    if (!(hi > lo)) continue;
    // Walked in the direction this edge is actually travelled, so the winding
    // of the whole polygon is untouched — a notch spliced backwards is a
    // self-crossing outline the triangulator is entitled to refuse.
    const path = [];
    for (const k of ramp) path.push([atX + into * k.d, lo + k.s]);
    for (const k of [...ramp].reverse()) path.push([atX + into * k.d, hi - k.s]);
    for (const p of (up ? path : [...path].reverse())) out.push(p);
    spliced = true;
  }
  return out;
}

/**
 * The three slabs a J-pull front is built from, outermost face first.
 *
 * @param {object} args
 *   outline    the board's own outline, in its 2-D cut frame
 *   w, h       the board
 *   thickness  the board's thickness
 *   edge       'TOP' | 'L' | 'R' — in the SHEET's frame, which is where it is
 *              cut. `engine/handles.js jpullSheetEdge` is what mirrors the
 *              room's letter into this one; nothing here mirrors anything.
 *   from, to   the run's span up the leaf, or null for a full edge
 *   profile    the resolved `cnc.jpull.profile` block
 * @returns {Array<{pts:Array,z0:number,depth:number}>|null}
 *   null where the front carries no J, or where the section does not fit the
 *   board it is asked to cut — a profile deeper than its own board is a hole,
 *   and drawing one would be worse than drawing nothing.
 */
export function jpullLayers({
  outline, w, h, thickness, edge, from = null, to = null, profile,
}) {
  if (!edge || !profile || !Array.isArray(outline) || outline.length < 3) return null;
  const lip = Number(profile.lipT) || 0;
  const slot = Number(profile.slotW) || 0;
  const leg = Number(profile.rearLeg) || 0;
  const slotDepth = Number(profile.slotDepth) || 0;
  const relief = Number(profile.reliefMm) || 0;
  const rampR = Number(profile.rampR) || 0;
  if (!(lip > 0) || !(slot > 0) || !(leg > 0)) return null;
  // The section is measured on an 18 mm board. On a thicker one the leg simply
  // grows — the lip and the slot are the hand's business and do not scale —
  // and on a board too thin to hold lip + slot there is no J to draw.
  const legT = thickness - lip - slot;
  if (!(legT > 0)) return null;

  const pull = (depth) => {
    if (!(depth > 0)) return outline;
    if (edge === 'TOP') return clipBelow(outline, h - depth);
    if (edge === 'L') return notchVertical(outline, 0, +1, from ?? 0, to ?? h, depth, rampR);
    if (edge === 'R') return notchVertical(outline, w, -1, from ?? 0, to ?? h, depth, rampR);
    return outline;
  };

  return [
    // THE LIP — the board, out to its own edge. Nothing is taken off it.
    { pts: outline, z0: 0, depth: lip },
    // THE SLOT — 40 mm of material gone, and the hand goes in here.
    { pts: pull(slotDepth), z0: lip, depth: slot },
    // THE REAR LEG — set back by the relief, which is why the lip stands proud.
    { pts: pull(relief), z0: lip + slot, depth: legT },
  ];
}

/** Everything about a panel's J that changes its SHAPE, as one cache token. */
export function jpullKey(jp) {
  if (!jp?.edge) return '';
  const p = jp.profile || {};
  return `jpull:${jp.edge}:${jp.from ?? ''}:${jp.to ?? ''}:`
    + `${p.lipT}:${p.slotW}:${p.slotDepth}:${p.rearLeg}:${p.reliefMm}:${p.rampR}`;
}
