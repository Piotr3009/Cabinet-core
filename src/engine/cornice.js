// ─── THE CORNICE (turn 22, CLAUDE.md F1) ────────────────────────────────────
//
// Turn 21 shrank from the bottom and this was the piece it dropped. BLOCKERS
// #88 carried the owner's numbers so that this turn is a build rather than a
// re-derivation, and CLAUDE.md F1 restates the whole of it.
//
// ─── THE CONSTRUCTION, AS THE OWNER CORRECTED IT ────────────────────────────
//
//   • the doors finish FLUSH with the top of the carcass top panel;
//   • the 40 mm infill stands ABOVE the top panel, in the door plane;
//   • the cornice mounts ON that infill, its bottom edge flush with the door
//     plane at door-top level, and projects forward from there.
//
// The middle line is the one that matters here and it is already true: the top
// infill's face has been `box.y = H`, `box.z = D + doors.gap + frontT − t`
// since turn 6 — standing on the carcass top, in the plane of the doors. So
// this file adds a piece ON that face and changes nothing under it. The cut
// list, the CNC sheet and every fixture are untouched, which is what makes
// CLAUDE.md F1.4's "fingerprint delta ZERO, fixtures ZERO" a fact rather than
// an intention.
//
// ─── IT IS BOUGHT MOULDING ──────────────────────────────────────────────────
//
// A cornice is ordered by the metre from a supplier, not cut from a sheet by
// this workshop's machine. So it is HARDWARE in the BOM (`engine/cabinet.js`
// `hw('cornice', …)`), it never becomes a panel, and nothing here has a
// thickness, an edge code or a CNC outline. What it does have is a SECTION —
// a polygon — because the 3D has to draw the thing and a joiner has to
// recognise it.
//
// ─── THE SHAPE IS PARAMETRIC BECAUSE THE DXF DOES NOT EXIST YET ─────────────
//
// CLAUDE.md F1.2: "parametric bead-and-cove approximation … a supplier DXF may
// replace the shape 1:1 later without touching the plumbing". `corniceSection`
// is that seam: everything downstream — the run, the mitres, the returns, the
// metres, the 3D — consumes a list of `[projection, height]` points and has no
// opinion about where they came from.
//
// Pure functions. No React, no store, no three.js.

import { getUnitType } from './types.js';
import { paddedSpan, runEnd, unitTop, verticalsReaching } from './runs.js';

/** Does this kit take a cornice at all? Wardrobes and tall units (F1.1). */
export function takesCornice(typeId) {
  return Boolean(getUnitType(typeId).supports?.cornice);
}

/**
 * The per-unit option, resolved: 0 ("none"), or one of the profile's heights.
 *
 * Anything else is 0 rather than an error — a project hand-edited to `cornice:
 * 85` describes a moulding this workshop does not buy, and quietly cutting the
 * 100 for it would be the app inventing an order line.
 */
export function corniceOption(value, profile) {
  const allowed = profile?.autoParts?.cornice?.heights || [];
  if (value == null || value === false || value === 'none') return 0;
  const n = Number(value);
  return allowed.includes(n) ? n : 0;
}

/** How far this height of moulding stands proud of the door plane. */
export function corniceProjection(height, profile) {
  const P = profile?.autoParts?.cornice;
  const n = Number(P?.projection?.[height]);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * How far the cornice rises ABOVE the infill it is fixed to.
 *
 * CLAUDE.md F1.5 spells the stack out: "unit height + infill + cornice rise".
 * The cornice's bottom edge is at door-top level, so a 70 on a 40 infill shows
 * 30 mm of moulding above the infill's top — and a 70 under an infill that has
 * been dragged to 300 rises nothing at all, because the infill is already
 * taller than the piece screwed to it.
 */
export function corniceRise(height, infillHeight) {
  return Math.max(0, (Number(height) || 0) - Math.max(0, Number(infillHeight) || 0));
}

/**
 * Where the top of everything above this carcass is, above the floor.
 *
 * One number for the two pieces that stand on a unit's top — the infill and
 * the cornice — because they are in the same plane and the taller of them is
 * what the ceiling has to clear.
 */
export function corniceStackTop({ unitTop: top = 0, infillHeight = 0, height = 0 }) {
  return (Number(top) || 0) + Math.max(
    Math.max(0, Number(infillHeight) || 0),
    Math.max(0, Number(height) || 0),
  );
}

/**
 * Ceiling honesty (CLAUDE.md F1.5).
 *
 * "so a 2400 wardrobe under a 2400 ceiling WARNS instead of clipping" — a
 * WARNING and not a clamp, deliberately. Clamping would re-cut a cabinet
 * nobody asked to re-cut; what the joiner needs is to be told that the piece
 * he has just specified does not fit under his ceiling.
 *
 * @returns {string|null} the sentence, or null when it fits
 */
export function corniceCeilingNotice({
  unitTop: top = 0, infillHeight = 0, height = 0, roomHeight = 0, label = null,
}, profile) {
  const h = corniceOption(height, profile);
  if (!h) return null;
  const ceiling = Number(roomHeight) || 0;
  if (ceiling <= 0) return null;
  const stack = corniceStackTop({ unitTop: top, infillHeight, height: h });
  const over = stack - ceiling;
  if (over <= 0) return null;
  const who = label ? `${label}: ` : '';
  return `${who}the ${h} mm cornice finishes ${Math.round(over)} mm above the ${Math.round(ceiling)} mm ceiling — `
    + 'lower the unit, or lose the cornice.';
}

/**
 * The moulding's SECTION, as a closed polygon of `[d, y]` points.
 *
 * `d` is how far forward of the door plane the point stands; `y` is how far
 * above the cornice's own bottom edge — which is door-top level, the top of
 * the carcass. Both in millimetres, both non-negative.
 *
 * Bottom to top the members are the ones the owner named: a small convex BEAD,
 * a concave COVE sweeping out to the full projection, and a flat LAND at the
 * top. Then the top surface runs straight back to the infill, and the back
 * face — the one screwed to the infill — closes it.
 *
 * The curves are quarter-sines, which is what makes this an APPROXIMATION and
 * says so: a real bead-and-cove is struck with two radii off a spindle. The
 * supplier's DXF replaces this function and nothing else.
 */
export function corniceSection(height, profile) {
  const h = corniceOption(height, profile);
  if (!h) return [];
  const pr = corniceProjection(h, profile);
  if (!(pr > 0)) return [];
  // ─── TURN 25 (CLAUDE.md F12.2): EACH HEIGHT'S OWN PROPORTIONS ───────────
  // A 100 is not a 70 photocopied at 143 %. The base fractions answer for any
  // height the profile does not speak about, so a workshop that adds a 140
  // gets a sensible shape without having to describe one.
  const base = profile.autoParts.cornice.section;
  const S = { ...base, ...(base.byHeight?.[h] || {}) };
  const steps = Math.max(2, Math.trunc(Number(S.steps) || 2));
  const beadH = h * S.beadHeight;
  const beadD = pr * S.beadProjection;
  const landH = h * S.landHeight;
  const coveTop = h - landH;

  const pts = [];
  // The BEAD: convex, bulging down and forward out of the bottom back corner.
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * (Math.PI / 2);
    pts.push([round(beadD * Math.sin(t)), round(beadH * (1 - Math.cos(t)))]);
  }
  // The COVE: concave, rising almost vertically off the bead and sweeping out
  // to the full projection at the bottom of the land.
  for (let i = 1; i <= steps; i += 1) {
    const t = (i / steps) * (Math.PI / 2);
    pts.push([
      round(beadD + (pr - beadD) * (1 - Math.cos(t))),
      round(beadH + (coveTop - beadH) * Math.sin(t)),
    ]);
  }
  // The LAND: a flat vertical face at the top of the moulding.
  pts.push([round(pr), round(h)]);
  // …and back along the top to the infill, then down the back face.
  pts.push([0, round(h)]);
  return dedupe(pts);
}

const round = (n) => Math.round(n * 1000) / 1000;

function dedupe(points) {
  const out = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.abs(last[0] - p[0]) < 1e-6 && Math.abs(last[1] - p[1]) < 1e-6) continue;
    out.push(p);
  }
  return out;
}

// ─── THE RUN (CLAUDE.md F1.3) ───────────────────────────────────────────────
//
// "one run across horizontally adjacent cornice-bearing units. An end at a
// wall, side panel or side infill STOPS flush against it; an OPEN end mitres
// 45° and returns along the unit's side to the back wall. Corners mitre 45°."
//
// That is the top infill's own sentence, so it is the top infill's own code:
// `engine/runs.js runEnd` answers all four end conditions and this asks it.
// The ONE thing that is asked differently is which verticals count. A top
// infill stops at what reaches the CEILING; a cornice stops at what reaches
// the CORNICE — a side infill taken to 2500 stops the moulding at 2300, and a
// scribe filler that ends with the carcass is below the piece entirely and is
// simply run over. `verticalsReaching` is that generalisation, and
// `ceilingVerticals` is now the roomHeight case of it.

/**
 * The cornice SEGMENTS of one run: maximal stretches of adjacent units asking
 * for the SAME height of moulding.
 *
 * Two boundaries, and each is a length of timber a joiner could not cut:
 *   • a unit with no cornice — a hole in the run;
 *   • a unit asking for the other height — 70 and 100 are two different
 *     mouldings and no single length is both.
 *
 * An end panel is deliberately NOT a boundary, unlike the plinth's: the toe
 * kick meets an end panel's face because both stand on the floor in the same
 * plane, while the cornice runs 2 m up in the air ACROSS the top of a panel
 * that finishes with its carcass. A panel taken up past the cornice is caught
 * where every other obstacle is — `runEnd`, on the verticals.
 */
export function corniceSegments(run, profile) {
  const segments = [];
  let current = [];
  let height = 0;
  const close = () => { if (current.length) segments.push({ units: current, height }); current = []; };

  for (const unit of run.units) {
    const want = takesCornice(unit.type) ? corniceOption(unit.params?.cornice, profile) : 0;
    if (!want) { close(); height = 0; continue; }
    if (current.length && want !== height) close();
    height = want;
    current.push(unit);
  }
  close();
  return segments;
}

/**
 * The cornice element for one segment, in the OWNER unit's local frame.
 *
 * @param {{units:Array, height:number}} segment
 * @param {object} context
 *   wall, mount        the run's own
 *   wallWidth, roomHeight
 *   verticals          every attached vertical in the room (`unitVerticals`)
 *   frontFaceDepth     {left, right} — how far a RETURN has to run to reach
 *                      the wall at each end, the same number the top infill's
 *                      return is given
 *   infillHeightOf     (unit) => the infill face height above that unit
 * @returns {null|object}
 */
export function segmentCornice(segment, {
  wall = 0, mount = 'floor', wallWidth = 0, roomHeight = 0,
  verticals = null, frontFaceDepth = null, infillHeightOf = null,
}, profile) {
  const C = profile.autoParts.cornice;
  const height = corniceOption(segment?.height, profile);
  if (!height || !segment.units?.length) return null;
  const projection = corniceProjection(height, profile);
  if (!(projection > 0)) return null;

  const owner = segment.units[0];
  const ownerX = Number(owner.position?.x_mm) || 0;
  const top = unitTop(owner, profile);
  // The moulding's own top, above the floor — which is what decides WHICH
  // verticals are in its way.
  const stackTop = top + height;
  const reaching = verticals || verticalsReaching(segment.units, stackTop, profile);
  const asRun = {
    wall,
    mount,
    units: segment.units,
    top,
    left: paddedSpan(segment.units[0]).left,
    right: paddedSpan(segment.units[segment.units.length - 1]).right,
  };
  const left = runEnd(asRun, 'left', { wallWidth, roomHeight, verticals: reaching }, profile);
  const right = runEnd(asRun, 'right', { wallWidth, roomHeight, verticals: reaching }, profile);
  const length = right.x - left.x;
  if (length <= 0) return null;

  const depthAt = (side) => {
    const d = Math.max(0, Number(frontFaceDepth?.[side]) || 0);
    return d >= C.minReturn ? d : null;
  };
  const returns = {
    left: left.kind === 'open' ? depthAt('left') : null,
    right: right.kind === 'open' ? depthAt('right') : null,
  };
  // The infill this moulding is fixed to. The tallest request in the segment,
  // exactly as the top infill's own run height is decided — one piece, one
  // height — because the moulding lands on ONE face.
  const infillHeight = segment.units.reduce(
    (m, u) => Math.max(m, Number(infillHeightOf ? infillHeightOf(u) : u.params?.top_infill_mm) || 0),
    0,
  );

  return {
    role: 'owner',
    height,
    projection,
    offset: left.x - ownerX,
    length,
    ends: { left: left.kind, right: right.kind },
    // A 45° corner exists at an OPEN end and nowhere else: every other end
    // condition is a STOP, flush against the thing in the way.
    mitres: {
      left: left.kind === 'open',
      right: right.kind === 'open',
    },
    returns,
    infillHeight,
    rise: corniceRise(height, infillHeight),
    top: stackTop,
    unitIds: segment.units.map((u) => u.id),
  };
}

/**
 * The `run_cornice` value for EVERY unit — the twin of `runPlinthParams`.
 *
 * The owner of each segment carries the geometry; everybody else carries a
 * note. A member with no note at all would fall back to the single-unit path
 * and hang a second, shorter moulding inside the long one, which is the trap
 * turn 8 documented for the top infill and turn 12 met again for the plinth.
 *
 * @returns {Map<string, object|null>}
 */
export function runCorniceParams(runs, {
  walls = [], roomHeight = 0, frontFaceDepthOf = null, infillHeightOf = null, units = [],
}, profile) {
  const out = new Map((units || []).map((u) => [u.id, null]));
  const depthOf = frontFaceDepthOf || (() => 0);
  for (const run of runs) {
    for (const segment of corniceSegments(run, profile)) {
      const first = segment.units[0];
      const last = segment.units[segment.units.length - 1];
      const wallWidth = walls?.[run.wall]?.width ?? 0;
      const element = segmentCornice(segment, {
        wall: run.wall,
        mount: run.mount,
        wallWidth,
        roomHeight,
        frontFaceDepth: { left: depthOf(first), right: depthOf(last) },
        infillHeightOf,
      }, profile);
      if (!element) continue;
      out.set(first.id, element);
      for (const u of segment.units.slice(1)) out.set(u.id, { role: 'member', ownerId: first.id });
    }
  }
  return out;
}

// ─── WHAT IS ORDERED (CLAUDE.md F1.4) ───────────────────────────────────────

/**
 * The linear metres of moulding one element costs.
 *
 * "front + returns + mitre allowance per corner, a profile number" — and the
 * allowance is per CORNER because that is what a joiner loses: a 45° is cut
 * out of a longer length and the offcut is a triangle nobody can use.
 */
export function corniceOrder(element, profile) {
  if (!element || element.role !== 'owner') return null;
  const C = profile.autoParts.cornice;
  const front = Math.max(0, Number(element.length) || 0);
  const returns = ['left', 'right']
    .map((s) => Math.max(0, Number(element.returns?.[s]) || 0))
    .reduce((a, b) => a + b, 0);
  const corners = ['left', 'right'].filter((s) => element.mitres?.[s]).length;
  const allowance = corners * Math.max(0, Number(C.mitreAllowance) || 0);
  const total = front + returns + allowance;
  return {
    front_mm: front,
    returns_mm: returns,
    corners,
    allowance_mm: allowance,
    total_mm: total,
    metres: Math.round((total / 1000) * 1000) / 1000,
  };
}

// ─── WHERE IT IS, IN SPACE ──────────────────────────────────────────────────
//
// The 3D has to draw the moulding, and the drawing must be the same geometry
// the metres are counted from or the picture is a second opinion. So the
// solids are built HERE, as pure arithmetic, and `3d/UnitView.jsx` turns rings
// of points into triangles and nothing else.
//
// A swept member is two RINGS of the same section polygon, one at each end.
// A butt end puts every point of its ring at the same coordinate along the
// sweep; a MITRED end slides each point by its own projection, which is
// exactly what a 45° in plan is — the outer face runs on past the inner one by
// the depth of the piece.

/**
 * The swept solids of one element, in the owner unit's local frame.
 *
 * @param {object} element   a `segmentCornice` answer
 * @param {object} frame
 *   carcassTop   H — where the cornice's bottom edge sits (door-top level)
 *   doorPlane    z of the face it is fixed to (the door/infill plane)
 *   backZ        z of the wall behind, for a return's far end
 * @returns {Array<{id:string, a:Array<[number,number,number]>, b:Array<[number,number,number]>}>}
 */
export function corniceSolids(element, { carcassTop = 0, doorPlane = 0, backZ = 0 }, profile) {
  if (!element || element.role !== 'owner') return [];
  const section = corniceSection(element.height, profile);
  if (section.length < 3) return [];
  const y0 = Number(carcassTop) || 0;
  const x0 = Number(element.offset) || 0;
  const x1 = x0 + (Number(element.length) || 0);
  const out = [];

  // ── the front run ──
  // Along +x. A mitred LEFT end runs on to its long point at x0 − d; a mitred
  // RIGHT end at x1 + d. A stop is square, at x0 or x1 for every point.
  const mL = element.mitres?.left ? 1 : 0;
  const mR = element.mitres?.right ? 1 : 0;
  out.push({
    id: 'front',
    a: section.map(([d, y]) => [x0 - mL * d, y0 + y, doorPlane + d]),
    b: section.map(([d, y]) => [x1 + mR * d, y0 + y, doorPlane + d]),
  });

  // ── the returns ──
  // They exist only at an open end (`segmentCornice`), and they run along the
  // side of the end cabinet to the back wall. The moulding's back face is the
  // cabinet's side; `d` therefore points AWAY from the cabinet, which is −x on
  // the left and +x on the right.
  for (const side of ['left', 'right']) {
    const depth = Number(element.returns?.[side]) || 0;
    if (!(depth > 0)) continue;
    const sign = side === 'left' ? -1 : 1;
    const face = side === 'left' ? x0 : x1;
    const wallEnd = Number(backZ) || 0;
    out.push({
      id: `return-${side}`,
      // The corner end: mitred, so each point starts at its own long point.
      a: section.map(([d, y]) => [face + sign * d, y0 + y, doorPlane + d]),
      // …and the far end butts into the wall, square.
      b: section.map(([d, y]) => [face + sign * d, y0 + y, wallEnd]),
    });
  }
  return out;
}
