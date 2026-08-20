// ─── THE VERTICAL SECTION (turn 43, CLAUDE.md F5) ───────────────────────────
//
// The owner, 20.08.2026: *"Nie widzę przekroju w pionie ani w poziomie."*
//
// ─── WHAT WAS MEASURED ──────────────────────────────────────────────────────
//
// The HORIZONTAL section exists — it is the last sheet of the wall set, and it
// renders (`wallElevation.js buildHorizontalSection`, turn 40). The VERTICAL
// one does not exist at all: there is no builder anywhere under
// `src/engine/drawings/`. It was never written; it was not regressed.
//
// He has asked for it twice, and both times for BOTH: a section sheet per wall
// AND an A-A through a chosen cabinet. This module is both, because they are
// one grammar applied at two stations:
//
//   F5a  `Wall A /3`          the wall's own section, cut at the centreline of
//                             the LEFTMOST FLOOR-BAND member; every member of
//                             every band whose x-range contains that station is
//                             drawn cut, and a member that does not reach the
//                             station is OMITTED. A section is not a collage.
//   F5b  `Section A-A — unit 02`   the same grammar through ONE cabinet at its
//                             own centreline, plus that unit's own height and
//                             depth dimensions.
//
// ─── THE FRAME ──────────────────────────────────────────────────────────────
//
// A vertical section is the ZY projection: x runs along the cabinet's DEPTH
// with 0 at the wall and +x toward the room, y is height above the FLOOR. Every
// carcass in a job stands back to the same wall, so a wall unit and a base unit
// share the x = 0 datum and read as one drawing without anything being aligned
// by hand.
//
// ─── WHERE EVERY NUMBER COMES FROM (iron rule 2) ────────────────────────────
//
// Every rectangle below is a PUBLISHED panel box of `computeCabinet()` —
// `p.box.z`, `p.box.d`, `p.box.y`, `p.box.h` — projected on ZY, exactly as the
// front elevation is the XY projection and the plan is the XZ one. The engine
// is not taught one new word and gains no field. The only number that does not
// come from a box is the runner's NOMINAL LENGTH, and that is asked of the
// module that has owned it since T42-F2 (`engine/runners.js runnerAskFor`),
// never re-derived here.
//
// ─── ONE READING NAMED, BECAUSE THE BRIEF IS AMBIGUOUS ──────────────────────
//
// CLAUDE.md asks for *"the carcass profile depth × height at its base — sides,
// top and bottom boards as CUT bars of `board_t`"*. In a plane parallel to the
// sides, a SIDE is not cut by the knife: it is the face you look at beyond it.
// What makes the drawing read as a section is that the carcass PROFILE is the
// heaviest line on the sheet, so the side's own profile is drawn at `PEN.CUT`
// and the top, bottom, back and plinth are drawn as CUT bars of their real
// thickness inside it. That is the reading; it is stated here so the next
// person does not have to guess which sentence was followed.
//
// Pure functions — no React, no store imports, no jsPDF.

import {
  boundsOf, entLine as line, entRect as rect, entText as text,
} from './primitives.js';
import { chainDimensions, dimensionEntities } from './frontElevation.js';
import { heightChains, mountingBands } from './wallElevation.js';
import { runnerAskFor } from '../runners.js';

/** Two coordinates a joiner could not measure between. */
const SAME = 0.5;

/**
 * WHERE THE KNIFE GOES on a wall sheet: the centreline of the leftmost member
 * of the FLOOR band.
 *
 * The floor band and not the leftmost cabinet on the wall — a wall unit hung
 * over the end of a run is not what a section of that run is about, and
 * `mountingBands` already answers "which cabinets stand at the same height"
 * for the chains.
 *
 * @returns {{x:number, member:object}|null}
 */
export function sectionStation(group) {
  const bands = mountingBands(group?.members || []);
  const floor = bands[0];
  if (!floor || !floor.members.length) return null;
  const member = floor.members[0];
  return { x: member.x + (Number(member.width) || 0) / 2, member };
}

/** Every member the knife actually passes through, in any band, bottom first. */
export function cutMembers(group, station) {
  const at = Number(station);
  return (group?.members || [])
    .filter((m) => at >= m.x - SAME && at <= m.x + (Number(m.width) || 0) + SAME)
    .sort((a, b) => a.base - b.base);
}

/**
 * ONE CABINET, CUT — the grammar both sheets are written in.
 *
 * @param {object} member  a `wallGroups()` member: { unit, result, base, … }
 * @param {object} profile
 * @returns {Array} entities in DRAWING millimetres, Y up, at the member's own
 *   height above the floor
 */
export function cutCabinet(member, profile) {
  const out = [];
  const { result } = member;
  const base = Number(member.base) || 0;
  const D = Number(result.params.depth) || 0;
  const H = Number(result.params.height) || 0;

  /** A panel's ZY box, lifted to the floor. */
  const zy = (p) => ({ x: p.box.z, y: base + p.box.y, w: p.box.d, h: p.box.h });
  const bar = (layer, p, pen = 'CUT') => {
    const b = zy(p);
    return { ...rect(layer, b.x, b.y, b.w, b.h), pen, solid: true };
  };

  // ── THE CARCASS PROFILE, and it is the heaviest line on the sheet ────────
  // Read off the SIDE's own box, so a cabinet whose back is recessed or whose
  // sides are shorter than its carcass draws what the saw cut, not a rectangle
  // this file assembled from two params.
  const sides = result.panels.filter((p) => p.role === 'side' && p.box);
  if (sides.length) {
    const zs = Math.min(...sides.map((p) => p.box.z));
    const ze = Math.max(...sides.map((p) => p.box.z + p.box.d));
    const ys = Math.min(...sides.map((p) => p.box.y));
    const ye = Math.max(...sides.map((p) => p.box.y + p.box.h));
    out.push({ ...rect('CARCASE', zs, base + ys, ze - zs, ye - ys), pen: 'CUT' });
  } else {
    out.push({ ...rect('CARCASE', 0, base, D, H), pen: 'CUT' });
  }

  // ── the boards the knife really does pass through ───────────────────────
  for (const p of result.panels) {
    if (!p.box) continue;
    if (p.role === 'top' || p.role === 'bottom') out.push(bar('CARCASE', p));
    else if (p.role === 'back') out.push(bar('CARCASE', p));
    // THE PLINTH RECESS: the plinth stands on the floor, set back from the
    // front by however much the engine set it back. That setback IS the recess
    // and it is the thing a fitter measures on a section.
    else if (p.role === 'plinth') out.push(bar('CARCASE', p));
    // Shelves: cut bars at their own y and their own depth setback.
    else if (p.role === 'shelf') out.push(bar('SHELVES', p));
    // The front leaf, standing at the front plane and cut through.
    else if (p.part === 'FRONT' || p.part === 'DRAWER-FRONT') out.push(bar('DOORS', p));
  }

  // ── the drawer boxes, as SIDE PROFILES ──────────────────────────────────
  //
  // Seen, not cut: the knife runs parallel to a box side, so what a section
  // shows is the side's own outline. The geometry is the engine's published
  // DRAWER-SIDE box; what `runnerAskFor` answers is the NOMINAL the box runs
  // on, and that is drawn as the runner under it — the same question T42-F2
  // made the view ask, asked here so the section cannot contradict either.
  const boxes = new Map();
  for (const p of result.panels) {
    if (p.part !== 'DRAWER-SIDE' || !p.box) continue;
    const key = p.meta?.drawer ?? p.id;
    if (!boxes.has(key)) boxes.set(key, p);
  }
  for (const p of [...boxes.values()].sort((a, b) => a.box.y - b.box.y)) {
    const b = zy(p);
    out.push({ ...rect('SHELVES', b.x, b.y, b.w, b.h), pen: 'VISIBLE', solid: true });
    // The runner: from the back of the box forward by the ladder's nominal for
    // this row. It is the one number on this sheet that is not a panel box, and
    // it is asked of the module that owns it.
    const nominal = runnerAskFor(p.box.d, profile) ?? p.box.d;
    out.push({ ...line('RUNNERS', b.x, b.y, b.x + nominal, b.y), pen: 'THIN' });
  }

  // ── the legs, as the symbol /2 draws them, turned into this frame ───────
  const legs = result.assemblies?.legs;
  const legHeight = Number(result.assemblies?.carcass?.legHeight) || 0;
  if (legs && legHeight > 0) {
    // In SECTION a leg is seen at its own z, not at its x — the plan positions
    // are `{ x, z }` and this frame's x IS z.
    const zs = [...new Set(legs.positions.map((p) => Math.round(Number(p.z) || 0)))];
    for (const z of zs) {
      const x0 = z - legs.width / 2;
      const x1 = z + legs.width / 2;
      out.push(line('LEG_BLOCK', x0, base, x1, base));
      out.push(line('LEG_BLOCK', z, base, z, base - legHeight));
      out.push(line('LEG_BLOCK', x0, base - legHeight, x1, base - legHeight));
    }
  }

  return out;
}

/** How deep the deepest thing on this section reaches. */
const deepestOf = (members) => Math.max(0, ...members.map((m) => Number(m.result.params.depth) || 0));

/**
 * The shared body of both sheets: the cut cabinets, the building fabric, the
 * chains, and the sentence that says where the knife went.
 */
function sectionDrawing(members, {
  room = null, profile, station = null, caption = '', ownDims = false,
}) {
  const W = profile.drawings.wallDrawing;
  const T = W.textHeight;
  const entities = [];

  for (const m of members) entities.push(...cutCabinet(m, profile));

  const solid = boundsOf(entities);
  const deepest = deepestOf(members);
  const pad = W.fabricOverhang;
  const from = Math.min(0, solid.x) - pad;
  const to = Math.max(deepest, solid.x + solid.w) + pad;

  // ── THE BUILDING FABRIC, IN RED — the floor, and the ceiling over it ────
  entities.push(line('BUILDING', from, 0, to, 0));
  const ceiling = Number(room?.height) || 0;
  const top = Math.max(...members.map((m) => m.top));
  if (ceiling > top) entities.push(line('BUILDING', from, ceiling, to, ceiling));

  // ── HEIGHTS UP THE RIGHT: the bands, which is what a section is read for ──
  const right = Math.max(deepest, solid.x + solid.w);
  const { bandEdges } = heightChains(members, { floorMm: Number(profile?.doors?.gap) || 0 });
  if (bandEdges.length > 1) {
    entities.push(...chainDimensions({
      edges: bandEdges, at: right, direction: 'v', offset: W.chainFirst, textHeight: T,
    }));
  }

  // ── ONE DEPTH CHAIN, along the bottom of the deepest cut member ─────────
  const floor = Math.min(0, solid.y);
  if (deepest > 0) {
    entities.push(...dimensionEntities({
      from: [0, floor], to: [deepest, floor], direction: 'h', offset: W.chainFirst, value: deepest, textHeight: T,
    }));
  }

  // ── F5b's own pair: this cabinet's height and depth, said once ──────────
  if (ownDims && members.length === 1) {
    const m = members[0];
    const h = Number(m.result.params.height) || 0;
    entities.push(...dimensionEntities({
      from: [0, m.base], to: [0, m.base + h], direction: 'v', offset: -W.chainFirst, value: h, textHeight: T,
    }));
  }

  // ── and the sentence: WHERE the knife went ──────────────────────────────
  if (caption) {
    const b = boundsOf(entities);
    entities.push(text('VIEW_TITLE', b.x, b.y - W.noteHeight * 1.6, caption, W.noteHeight, 'left'));
  }

  return {
    entities,
    bounds: boundsOf(entities),
    solid,
    members: members.length,
    station,
  };
}

/**
 * F5a — `Wall X /3`: THE WALL'S OWN SECTION.
 *
 * @returns {object|null} null where the wall has no floor-band member to cut
 *   through, which is the same "no sheet rather than an empty one" rule
 *   `wallGroups` already makes true by construction.
 */
export function buildWallSection(group, { room = null, profile } = {}) {
  const at = sectionStation(group);
  if (!at) return null;
  const members = cutMembers(group, at.x);
  if (!members.length) return null;
  const num = String(at.member.unit?.params?.unit_num ?? at.member.result?.unitNum ?? '');
  return {
    ...sectionDrawing(members, {
      room, profile, station: at.x, caption: `section at unit ${num}`,
    }),
    unitNum: num,
  };
}

/**
 * F5b — `Section A-A — unit NN`: THROUGH THE CABINET THE OWNER POINTS AT.
 *
 * One member, at its OWN centreline, with its own height and depth dimensions
 * beside the grammar every section shares.
 */
export function buildUnitSection(member, { room = null, profile } = {}) {
  if (!member) return null;
  const num = String(member.unit?.params?.unit_num ?? member.result?.unitNum ?? '');
  return {
    ...sectionDrawing([member], {
      room,
      profile,
      station: member.x + (Number(member.width) || 0) / 2,
      caption: `Section A-A at unit ${num}, on its own centreline`,
      ownDims: true,
    }),
    unitNum: num,
  };
}

/**
 * EVERY CABINET THE A-A DROPDOWN MAY OFFER — the census the modal lists.
 *
 * It is the drawable set and nothing else: a cabinet that no elevation can draw
 * is a cabinet no section can be taken through either, and offering it would be
 * a menu entry that produces an empty sheet.
 */
export function sectionableUnits(groups = []) {
  const out = [];
  for (const group of groups) {
    for (const m of group.members) {
      out.push({
        id: m.unit.id,
        unitNum: String(m.unit.params?.unit_num ?? m.result?.unitNum ?? ''),
        wall: group.wall,
        wallLabel: group.label,
        member: m,
      });
    }
  }
  return out;
}
