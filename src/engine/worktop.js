// ─── THE WORKTOP (turn 30, CLAUDE.md F8) ────────────────────────────────────
//
// The owner: select two or more base cabinets and one worktop covers the run
// **"od ściany aż do paneli"** — from the wall right out to the end panels.
//
// ─── THREE OVERHANGS, AND EACH ONE IS A DIFFERENT SENTENCE ──────────────────
//
//   FRONT   20 mm proud of the door plane. A worktop that finished flush with
//           the doors would drip down them.
//   SIDES   10 mm PAST AN END PANEL — past the panel, not past the carcass.
//           A run that ends in an end panel is a run whose visible edge is the
//           panel's face, and the slab has to cover it and stand a little
//           proud. Where a run simply ends in air the same 10 mm is measured
//           off the carcass, which is the same rule with nothing in the way.
//   WALL    FLUSH. Nothing hangs over a wall; the scribe closes that side and
//           `paddedSpan` already knows where the panels are.
//
// ─── WHAT IT IS, IN THIS APP'S TERMS ────────────────────────────────────────
//
// A DESIGN-LAYER AUTO-PART, exactly like the end panels: it is a decision a
// person makes about a job, it is stored with the project, and **it reaches no
// hole and no fixture**. `computeCabinet()` neither knows nor asks about it, so
// every golden fixture is untouched by construction rather than by care.
//
// ─── THE THREE DECIDED NUMBERS ──────────────────────────────────────────────
//
// CLAUDE.md decides them so this turn does not have to: thickness **38 mm**
// (UK standard — 770 carcass + 100 legs + 38 lands on the 900 line), the
// material is the PROJECT's worktop decor by default, and a per-worktop
// override is a later chat-fix rather than tonight's problem. All three live in
// `profile.autoParts.worktop` and in the design record, so the day the owner
// wants 40 mm nothing here is edited.
//
// EXTENSIONS are drawable afterwards, in the same interaction family as an end
// panel edit: the record carries `extendLeft` / `extendRight` / `extendFront`
// and the geometry adds them on. Nothing is computed from them that a person
// has not typed.
//
// Pure functions and pure data. No React, no store, no three.js.

import { getUnitType } from './types.js';
import { paddedSpan, unitBase, unitTop, wallGapOf } from './runs.js';
// T75 F5 · the corner rulebook: which two runs meet at a corner, and who is A.
import { cornersOf } from './corners.js';

/**
 * Does this kit take a worktop at all?
 *
 * The app already draws this line and draws it the other way round: a type
 * whose `supports.topInfill` is FALSE is one where *"what goes on top of a base
 * cabinet is a worktop, so there is no gap to the ceiling"* — the sentence
 * `components/RightPanel.jsx` has printed since turn 8. A TALL unit, a wardrobe
 * and a fridge housing all run up to a top infill instead, and a wall unit
 * hangs. So this is that existing distinction read forwards rather than a
 * second list that could disagree with it.
 */
export function takesWorktop(typeId) {
  const type = getUnitType(typeId);
  // T75 F17 · *"`takesWorktop` admits a wall-mounted kit that declares
  // `desk: true`"*: a desk hangs, and its top is a worktop all the same.
  if (type && type.mount === 'wall' && type.desk === true) return true;
  return Boolean(type && type.mount === 'floor' && type.supports?.topInfill === false);
}

/** The workshop's numbers, defensively read. */
export function worktopSpec(profile) {
  const W = profile?.autoParts?.worktop || {};
  const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
  return {
    thickness: num(W.thickness, 38),
    frontOverhang: num(W.frontOverhang, 20),
    sideOverhang: num(W.sideOverhang, 10),
    minUnits: num(W.minUnits, 2),
    // ─── T75 F5 · the corner joint, the cut-outs, the upstand ──────────────
    joint: {
      kind: W.joint?.kind === 'mitre' ? 'mitre' : 'butt',
      boltCount: num(W.joint?.boltCount, 3),
    },
    cutout: { insetMm: num(W.cutout?.insetMm, 20), radiusMm: num(W.cutout?.radiusMm, 10) },
    cnc: W.cnc === true,
  };
}

/** T75 F4/F5 · is this the L corner kit, which takes a worktop of its own? */
function isCornerKit(unit) {
  return Boolean(getUnitType(unit?.type)?.corner);
}

/** T75 F17 · …and a desk takes one of its own too: one unit is enough. */
function isDeskUnit(unit) {
  return Boolean(getUnitType(unit?.type)?.desk);
}

/**
 * T75 F17 · THE PER-WORKTOP THICKNESS the T30 comment above deferred: the
 * record's own (a desk or a sideboard top is 25), else the profile's (38).
 */
export function slabThickness(record, spec) {
  const own = Number(record?.thickness);
  return Number.isFinite(own) && own > 0 ? own : spec.thickness;
}

/**
 * Can these cabinets take ONE worktop between them?
 *
 * The four things that break a RUN break a worktop too, and for the same
 * physical reason (`engine/runs.js buildRuns`): a different wall, a turned
 * unit, a different top height — one slab cannot lie on two heights — and a
 * gap, because a slab that bridges nothing is a slab hanging in air. This is
 * that test asked of a SELECTION rather than of the whole room, because the
 * gesture is "these ones".
 *
 * @returns {{ok:boolean, why:string|null}}
 */
export function worktopEligible(units, profile, { walls = null } = {}) {
  const spec = worktopSpec(profile);
  const list = units || [];
  // ─── T75 F11 · ONE WORKTOP OVER THE WHOLE ISLAND ─────────────────────────
  // *"`worktopsFor` on an island returns ONE slab: the bounding rectangle of
  // every unit and panel on the island."*  A selection standing wholly on one
  // island's faces asks for that slab: one cabinet is enough, any face goes.
  const isle = islandOfSelection(list, walls);
  if (isle) {
    if (!list.every((u) => takesWorktop(u.type))) {
      return { ok: false, why: 'A worktop lies on base cabinets: a wall unit has nothing to lie on.' };
    }
    return { ok: true, why: null, island: isle };
  }
  // T75 F4/F5 · *"The L kit's worktop is one slab shaped like the L."*  An L
  // corner unit is a run of its own: one is enough.
  const loneL = list.length === 1 && (isCornerKit(list[0]) || isDeskUnit(list[0]));
  if (list.length < spec.minUnits && !loneL) {
    return { ok: false, why: `A worktop covers a run: select ${spec.minUnits} or more base cabinets.` };
  }
  if (!list.every((u) => takesWorktop(u.type))) {
    return { ok: false, why: 'A worktop lies on base cabinets — a wall unit has nothing to lie on.' };
  }
  const wall = list[0].position?.wall ?? 0;
  if (!list.every((u) => (u.position?.wall ?? 0) === wall)) {
    // ─── T75 F5 · THE WORKTOP TURNS THE CORNER ────────────────────────────
    // *"`worktopsFor` accepts two runs on adjacent walls: two slabs and ONE
    // JOINT RECORD at the corner."*  Two walls, and they must MEET: asked of
    // the corner rulebook, which says which of the two is A (it runs through
    // to the wall) and which is B (it butts A).
    const corner = walls ? cornerOfSelection(list, walls, profile) : null;
    if (!corner) {
      return { ok: false, why: 'These cabinets are on walls that do not meet at a corner: one slab cannot join them.' };
    }
  }
  if (!list.every((u) => !((Number(u.position?.rotation_deg) || 0) % 360))) {
    return { ok: false, why: 'A turned cabinet has no "along the wall" to share.' };
  }
  const top = (u) => Math.round((unitBase(u, profile) + (Number(u.params?.height) || 0)) * 10) / 10;
  if (!list.every((u) => top(u) === top(list[0]))) {
    return { ok: false, why: 'One slab cannot lie on two heights — level the run first.' };
  }
  return { ok: true, why: null };
}

/**
 * T75 F5 · the internal corner a selection on two walls turns, or null: the
 * selection holds units on exactly two walls, and the rulebook reports a
 * corner between them whose two end units are both selected.
 */
function cornerOfSelection(list, walls, profile) {
  const onWalls = [...new Set(list.map((u) => u.position?.wall ?? 0))];
  if (onWalls.length !== 2) return null;
  const ids = new Set(list.map((u) => u.id));
  return cornersOf({ units: list, walls, profile }).find((c) => c.kind === 'internal'
    && ids.has(c.runA.unitId) && ids.has(c.runB.unitId)
    && onWalls.includes(c.wallA) && onWalls.includes(c.wallB)) || null;
}

/**
 * THE SLAB, in the wall's own frame.
 *
 * `x`/`w` run along the wall, `y`/`h` are height off the floor, `z`/`d` run out
 * from the wall — the same frame `paddedSpan` and the room view already use.
 *
 * @param {object} args
 *   units    the selected cabinets, in any order
 *   record   the design-layer worktop — its extensions and its decor
 *   profile
 * @returns {{x:number, y:number, z:number, w:number, h:number, d:number,
 *            depth:number, decor:string|null, wall:number, span:object}|null}
 */
export function worktopGeometry({ units, record = null, profile }) {
  const list = [...(units || [])];
  if (!list.length) return null;
  const spec = worktopSpec(profile);
  const ext = {
    left: Math.max(0, Number(record?.extendLeft) || 0),
    right: Math.max(0, Number(record?.extendRight) || 0),
    front: Math.max(0, Number(record?.extendFront) || 0),
  };

  // ALONG THE WALL: from the outermost padded edge — `paddedSpan` is what
  // already knows where an end panel stands — plus the side overhang. That is
  // "od ściany aż do paneli" in one line: the span reaches the panels and the
  // overhang steps 10 mm past them.
  const spans = list.map((u) => paddedSpan(u));
  const left = Math.min(...spans.map((s) => s.left)) - spec.sideOverhang - ext.left;
  const right = Math.max(...spans.map((s) => s.right)) + spec.sideOverhang + ext.right;

  // OUT FROM THE WALL: the deepest carcass, plus its door and the door's gap,
  // plus the front overhang. Flush at the wall — nothing hangs over a wall.
  const reach = (u) => {
    const depth = Number(u.params?.depth) || 0;
    const frontT = Number(u.params?.front_t) || 0;
    const gap = Number(profile?.doors?.gap) || 0;
    return depth + gap + frontT;
  };
  const depth = Math.max(...list.map(reach)) + spec.frontOverhang + ext.front;

  // AND HOW HIGH: on top of the carcasses, which all stand at one height —
  // `worktopEligible` is what guarantees that and says so when they do not.
  const top = unitBase(list[0], profile) + (Number(list[0].params?.height) || 0);

  const thick = slabThickness(record, spec);
  return {
    wall: list[0].position?.wall ?? 0,
    x: left,
    w: right - left,
    y: top,
    h: thick,
    z: 0,
    d: depth,
    depth,
    thickness: thick,
    decor: record?.decor ?? null,
    overhang: { front: spec.frontOverhang, side: spec.sideOverhang, wall: 0 },
    extensions: ext,
    unitIds: list.map((u) => u.id),
  };
}

/**
 * Every worktop a project carries, resolved against the units that exist.
 *
 * A record naming a cabinet somebody has since deleted is DROPPED rather than
 * drawn over a hole in the run — the same rule a stale hinge assignment
 * follows.
 */
export function worktopsFor({
  records = [], units = [], profile, walls = null,
}) {
  const byId = new Map((units || []).map((u) => [u.id, u]));
  const out = [];
  for (const record of records || []) {
    // ─── T75 F11 · AN ISLAND'S RECORD IS THE ISLAND'S, WHATEVER STANDS ON IT ─
    if (record?.island) {
      if (!walls) continue;
      const slab = islandSlab({ record, units, walls, profile });
      if (slab) out.push(slab);
      continue;
    }
    const mine = (record?.unitIds || []).map((id) => byId.get(id)).filter(Boolean);
    const loneL = mine.length === 1 && isCornerKit(mine[0]);
    // T75 F17 · one desk is a run of its own: its slab is the straight one.
    const loneDesk = mine.length === 1 && isDeskUnit(mine[0]);
    if (mine.length < worktopSpec(profile).minUnits && !loneL && !loneDesk) continue;
    // ─── T75 F4/F5 · ONE SLAB SHAPED LIKE THE L ────────────────────────────
    if (loneL) {
      const geometry = lSlabGeometry({ unit: mine[0], record, profile });
      if (geometry) out.push(withCutouts({ ...record, slabId: `${record.id}`, geometry }, mine, profile));
      continue;
    }
    // ─── T75 F5 · TWO WALLS: TWO SLABS AND ONE JOINT ───────────────────────
    const onWalls = [...new Set(mine.map((u) => u.position?.wall ?? 0))];
    if (onWalls.length === 2) {
      if (!walls) continue;
      const corner = cornerOfSelection(mine, walls, profile);
      if (!corner) {
        // ─── T75 F8 · THE CAUSE WENT, THE JOINT GOES, THE SLABS STAY ──────────
        // *"Everything the corner automat adds (post, hinge flip, blank size,
        // worktop joint, plinth butt, cornice return) is undone when the cause
        // goes."*  A run pulled out of the corner leaves each wall's cabinets
        // under a straight slab of their own, with no joint between them; put
        // back on the corner, the joint returns.
        for (const wi of onWalls) {
          const group = mine.filter((u) => (u.position?.wall ?? 0) === wi);
          const geometry = worktopGeometry({ units: group, record, profile });
          if (geometry) out.push(withCutouts({ ...record, slabId: `${record.id}-w${wi}`, geometry }, group, profile));
        }
        continue;
      }
      const pair = cornerSlabs({ units: mine, record, corner, walls, profile });
      if (pair) out.push(...pair);
      continue;
    }
    const geometry = worktopGeometry({ units: mine, record, profile });
    if (geometry && loneDesk) deskSideTrim(geometry, mine[0], units, profile);
    if (geometry) out.push(withCutouts({ ...record, slabId: `${record.id}`, geometry }, mine, profile));
  }
  return out;
}

/**
 * T75 F17 · a desk's top BUTTS what stands beside it at its height (the
 * wardrobe it hangs beside, that wardrobe's end panel): the automat's side
 * overhang is taken off that end, so the slab is never drawn 10 mm into a
 * board it could not be fitted through. A free end keeps its overhang, and a
 * length the client typed (`extendLeft` / `extendRight`) is his and stays.
 */
function deskSideTrim(geometry, desk, units, profile) {
  const spec = worktopSpec(profile);
  const wall = desk.position?.wall ?? 0;
  const mine = paddedSpan(desk);
  const y0 = geometry.y;
  const y1 = geometry.y + geometry.h;
  const meets = (side) => (units || []).some((u) => {
    if (u.id === desk.id || (u.position?.wall ?? 0) !== wall) return false;
    if (!(unitBase(u, profile) < y1 && unitTop(u, profile) > y0)) return false;
    const o = paddedSpan(u);
    return side === 'left' ? Math.abs(o.right - mine.left) <= 1 : Math.abs(o.left - mine.right) <= 1;
  });
  if (meets('left')) {
    geometry.x += spec.sideOverhang;
    geometry.w -= spec.sideOverhang;
    geometry.overhang = { ...geometry.overhang, left: 0 };
  }
  if (meets('right')) {
    geometry.w -= spec.sideOverhang;
    geometry.overhang = { ...geometry.overhang, right: 0 };
  }
}

/**
 * T75 F5 · a slab with the cut-outs it proposes, on the entry AND on its
 * geometry (the drawing set reads geometry alone), and its joint likewise.
 */
function withCutouts(entry, units, profile) {
  const cutouts = cutoutsFor(units, entry.geometry, profile);
  return {
    ...entry,
    cutouts,
    geometry: {
      ...entry.geometry,
      ...(cutouts.length ? { cutouts } : {}),
      ...(entry.joint ? { joint: entry.joint } : {}),
    },
  };
}

/**
 * T75 F5 · the corner's two slabs. Slab A lies on the occupant's wall and runs
 * THROUGH to wall B (no side overhang at the corner: it meets the plaster);
 * slab B lies on the other wall and BUTTS slab A's front edge. One joint
 * record between them: a square butt, three connector bolts (an order line),
 * their pockets a NOTE on the drawing, fixed by the joiner (readiness manual,
 * never CNC).
 */
function cornerSlabs({
  units, record, corner, walls, profile,
}) {
  const spec = worktopSpec(profile);
  const onA = units.filter((u) => (u.position?.wall ?? 0) === corner.wallA);
  const onB = units.filter((u) => (u.position?.wall ?? 0) === corner.wallB);
  const a = worktopGeometry({ units: onA, record: { ...record, extendLeft: 0, extendRight: 0 }, profile });
  const b = worktopGeometry({ units: onB, record: { ...record, extendLeft: 0, extendRight: 0 }, profile });
  if (!a || !b) return null;
  const wallA = walls[corner.wallA];
  // A runs through to wall B on its corner end; B stops on A's front edge.
  if (corner.runA.side === 'right') {
    a.w = Number(wallA?.width || 0) - a.x;
  } else {
    a.w += a.x;
    a.x = 0;
  }
  if (corner.runB.side === 'left') {
    const right = b.x + b.w;
    b.x = a.d;
    b.w = right - b.x;
  } else {
    const wallB = walls[corner.wallB];
    b.w = Number(wallB?.width || 0) - a.d - b.x;
  }
  const joint = {
    kind: spec.joint.kind,
    boltCount: spec.joint.boltCount,
    at: { wall: corner.wallB, x: corner.runB.side === 'left' ? b.x : b.x + b.w, depth: b.d },
    corner: { x: corner.corner.x, y: corner.corner.y },
    readiness: 'manual',
    note: `Worktop joint: square butt, slab ${record.id}-B into slab ${record.id}-A, `
      + `${spec.joint.boltCount} connector bolts; bolt pockets cut by hand on site.`,
  };
  return [
    withCutouts({ ...record, slabId: `${record.id}-A`, geometry: a, joint }, onA, profile),
    withCutouts({ ...record, slabId: `${record.id}-B`, geometry: { ...b, butts: 'A' }, joint }, onB, profile),
  ];
}

/**
 * T75 F4/F5 · the L kit's slab: ONE piece shaped like the L, the front
 * overhang along both fronts, the side overhang past both arm ends, flush at
 * both walls. `x/w/d` stay its bounding box (a reader that is not upgraded
 * still draws something true) and `outline` is the L, in the wall's frame.
 */
function lSlabGeometry({ unit, record = null, profile }) {
  const spec = worktopSpec(profile);
  const W = Number(unit.params?.width) || 0;
  const D = Number(unit.params?.depth) || 0;
  const arm = Number(unit.params?.arm_mm) || Number(profile?.baseUnit?.defaults?.depth) || 0;
  const frontT = Number(unit.params?.front_t) || 0;
  const gap = Number(profile?.doors?.gap) || 0;
  const x0 = Number(unit.position?.x_mm) || 0;
  const reach = arm + gap + frontT + spec.frontOverhang + Math.max(0, Number(record?.extendFront) || 0);
  const side = spec.sideOverhang;
  // In the unit's frame with the room corner at x = 0 (corner_side 'left'),
  // mirrored for an L whose corner is on its right.
  const local = [[0, 0], [W + side, 0], [W + side, reach], [reach, reach], [reach, D + side], [0, D + side]];
  const right = unit.params?.corner_side === 'right';
  const outline = local.map(([x, z]) => [Math.round((x0 + (right ? W - x : x)) * 100) / 100, z]);
  const xs = outline.map((p) => p[0]);
  const top = unitBase(unit, profile) + (Number(unit.params?.height) || 0);
  return {
    wall: unit.position?.wall ?? 0,
    x: Math.min(...xs),
    w: Math.max(...xs) - Math.min(...xs),
    y: top,
    h: slabThickness(record, spec),
    z: 0,
    d: D + side,
    depth: D + side,
    thickness: slabThickness(record, spec),
    decor: record?.decor ?? null,
    overhang: { front: spec.frontOverhang, side: spec.sideOverhang, wall: 0 },
    extensions: { left: 0, right: 0, front: Math.max(0, Number(record?.extendFront) || 0) },
    unitIds: [unit.id],
    outline: right ? [...outline].reverse() : outline,
    shape: 'L',
  };
}

/**
 * T75 F5 · THE CUT-OUTS a slab proposes. *"a SINK unit under the slab
 * proposes a sink cut-out (rectangle = the carcass opening inset
 * `worktop.cutout.insetMm` each way, corner radius ...); a drawer unit flagged
 * `hob: true` (F14) proposes a hob cut-out the same way. A record is drawn on
 * the worktop sheet ... and listed as a BOM note; it is machined only when the
 * worktop is a CNC part."*  The carcass opening is the space between the two
 * sides and from the back board to the carcass front; in the slab's own frame
 * (along the wall, out from the wall).
 */
export function cutoutsFor(units, geometry, profile) {
  const spec = worktopSpec(profile);
  const out = [];
  for (const u of units || []) {
    const type = getUnitType(u.type);
    const kind = type.id === 'SINK' ? 'sink' : ((u.params?.hob === true || type.hob) ? 'hob' : null);
    if (!kind) continue;
    const W = Number(u.params?.width) || 0;
    const D = Number(u.params?.depth) || 0;
    const G = Number(u.params?.board_t) || Number(profile?.board?.thickness) || 18;
    const x0 = Number(u.position?.x_mm) || 0;
    const back = wallGapOf(u, profile);
    const inset = spec.cutout.insetMm;
    const w = W - 2 * G - 2 * inset;
    const d = D - G - 2 * inset;
    if (!(w > 0 && d > 0)) continue;
    out.push({
      kind,
      unitId: u.id,
      unitNum: u.params?.unit_num || null,
      x: Math.round((x0 + G + inset) * 100) / 100,
      z: Math.round((back + G + inset) * 100) / 100,
      w: Math.round(w * 100) / 100,
      d: Math.round(d * 100) / 100,
      r: spec.cutout.radiusMm,
      machined: spec.cnc,
      readiness: spec.cnc ? 'cut' : 'manual',
      note: `${kind === 'sink' ? 'Sink' : 'Hob'} cut-out ${Math.round(w)} x ${Math.round(d)}, R${spec.cutout.radiusMm}, `
        + `over ${u.params?.unit_num || u.id}${spec.cnc ? '' : ': cut on site'}.`,
    });
  }
  return out;
}

// ─── T75 F11 · THE ISLAND'S ONE SLAB ────────────────────────────────────────
//
// *"`worktopsFor` on an island returns ONE slab: the bounding rectangle of
// every unit and panel on the island plus the front overhang law on every face
// (20 mm), plus a per-face `extend` the client sets (the existing `extendFront`
// record, now per face; a seating overhang of `profile.worktop.seatingMm =
// 300` offered as one click on a face with no units). The slab is one BOM
// line, one cut list line, one sheet in the T71 set with the cut-outs of F5."*
//
// The slab is drawn in FACE A's frame (along A, out from A, so the core and
// face B lie at negative "out"), as an `outline`, which every slab reader
// already draws for the L (F4/F5). Its cut-outs are each face's own, carried
// into that frame.

/** The island every unit of a selection stands on, or null. */
function islandOfSelection(list, walls) {
  if (!walls || !list.length) return null;
  const ids = new Set(list.map((u) => walls[u.position?.wall ?? 0]?.island || null));
  if (ids.size !== 1 || ids.has(null)) return null;
  return [...ids][0];
}

const ISLAND_FACE_KEYS = ['A', 'B', 'E1', 'E2'];

/** One record's per-face extensions, made real. */
function islandExtend(record) {
  const e = record?.extend || {};
  return Object.fromEntries(ISLAND_FACE_KEYS.map((k) => [k, Math.max(0, Number(e[k]) || 0)]));
}

function islandSlab({ record, units, walls, profile }) {
  const spec = worktopSpec(profile);
  const faces = Object.fromEntries(walls.filter((w) => w.island === record.island).map((w) => [w.face, w]));
  const A = faces.A;
  if (!A || !faces.E1) return null;
  const toA = (p) => [
    (p.x - A.start.x) * A.along.x + (p.y - A.start.y) * A.along.y,
    (p.x - A.start.x) * A.inward.x + (p.y - A.start.y) * A.inward.y,
  ];
  const plan = (wall, u, v) => ({
    x: wall.start.x + wall.along.x * u + wall.inward.x * v,
    y: wall.start.y + wall.along.y * u + wall.inward.y * v,
  });
  const gap = Number(profile?.doors?.gap) || 0;
  const onIsland = (units || []).filter((u) => walls[u.position?.wall ?? 0]?.island === record.island);
  const cabinets = onIsland.filter((u) => takesWorktop(u.type));
  // The core itself, then every thing on a face out to its front.
  const pts = [[0, 0], [A.width, 0], [A.width, -faces.E1.width], [0, -faces.E1.width]];
  for (const u of onIsland) {
    const wall = walls[u.position?.wall ?? 0];
    const x = Number(u.position?.x_mm) || 0;
    const w = Number(u.params?.width) || 0;
    const reach = getUnitType(u.type)?.freePanel
      ? wallGapOf(u, profile) + (Number(u.params?.depth) || 0)
      : wallGapOf(u, profile) + (Number(u.params?.depth) || 0) + gap + (Number(u.params?.front_t) || 0);
    for (const [pu, pv] of [[x, 0], [x + w, 0], [x + w, reach], [x, reach]]) pts.push(toA(plan(wall, pu, pv)));
  }
  const ext = islandExtend(record);
  const over = spec.frontOverhang;
  const us = pts.map((p) => p[0]);
  const vs = pts.map((p) => p[1]);
  // In A's frame: A is "out" (+v), B is behind the core (-v), E1 lies at the
  // far end of A (+u), E2 at its start (-u).
  const u0 = Math.min(...us) - over - ext.E2;
  const u1 = Math.max(...us) + over + ext.E1;
  const v0 = Math.min(...vs) - over - ext.B;
  const v1 = Math.max(...vs) + over + ext.A;
  const r2 = (v) => Math.round(v * 100) / 100;
  const tops = cabinets.map((u) => unitBase(u, profile) + (Number(u.params?.height) || 0));
  const panels = onIsland.filter((u) => getUnitType(u.type)?.freePanel);
  const top = tops.length ? Math.max(...tops) : Math.max(0, ...panels.map((u) => Number(u.params?.height) || 0));
  const outline = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => [r2(u), r2(v)]);
  const geometry = {
    wall: A.index,
    x: r2(u0),
    w: r2(u1 - u0),
    y: top,
    h: spec.thickness,
    z: r2(v0),
    d: r2(v1 - v0),
    depth: r2(v1 - v0),
    thickness: spec.thickness,
    decor: record?.decor ?? null,
    overhang: { front: over, side: over, wall: 0 },
    extensions: ext,
    unitIds: onIsland.map((u) => u.id),
    outline,
    shape: 'island',
    island: record.island,
  };
  // Each face's cut-outs, carried from that face's frame into A's.
  const cutouts = [];
  for (const u of cabinets) {
    const wall = walls[u.position?.wall ?? 0];
    for (const c of cutoutsFor([u], geometry, profile)) {
      const corners = [[c.x, c.z], [c.x + c.w, c.z], [c.x + c.w, c.z + c.d], [c.x, c.z + c.d]]
        .map(([pu, pv]) => toA(plan(wall, pu, pv)));
      const cu = corners.map((p) => p[0]); const cv = corners.map((p) => p[1]);
      cutouts.push({
        ...c,
        x: r2(Math.min(...cu)),
        z: r2(Math.min(...cv)),
        w: r2(Math.max(...cu) - Math.min(...cu)),
        d: r2(Math.max(...cv) - Math.min(...cv)),
      });
    }
  }
  return {
    ...record,
    slabId: `${record.id}`,
    cutouts,
    geometry: { ...geometry, ...(cutouts.length ? { cutouts } : {}) },
  };
}
