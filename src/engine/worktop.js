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

import { getUnitType, isVanityKit } from './types.js';
import {
  cornerLAdjacentSpan, paddedSpan, unitBase, unitTop, wallGapOf,
} from './runs.js';
// T75 F5 · the corner rulebook: which two runs meet at a corner, and who is A.
import { cornersOf } from './corners.js';
// T82 F11 · the vanity's wastes, THE ONE SOURCE (KIT_VANITY.lsp D14): the
// basin stands where the trap's U was cut for it, never the other way round.
import { vanitySpec, vanityWastes } from './vanity.js';

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
export function worktopEligible(units, profile, { walls = null, single = false } = {}) {
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
  // T75 F20 · …and so is the one cabinet a SET lays a top on (the Vanity's
  // sink, the Hallway's shoe bench): asked for as one, it is one.
  const loneL = list.length === 1 && (isCornerKit(list[0]) || isDeskUnit(list[0]) || single === true);
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
  // T82 F10 · ...and over a vanity's SERVICE VOID: the carcass stands 80 off
  // the wall for the pipes and the top reaches the wall over them, so the
  // slab's front stands as proud of the vanity's fronts as any slab of the
  // house stands of a kitchen's. Zero for every other unit.
  const reach = (u) => {
    const depth = Number(u.params?.depth) || 0;
    const frontT = Number(u.params?.front_t) || 0;
    const gap = Number(profile?.doors?.gap) || 0;
    return depth + gap + frontT + serviceVoidOf(u, profile);
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
 * T80 F8 · a slab over a FRAMED unit (a type the frame stands on this turn:
 * profile.inframe.unitTypes) stands on the frame: lifted by the rail's 19
 * outside the carcass, its depth over the frame's face (D + 25) plus the
 * overhang where the doors' plane stood. An L slab and an island are never
 * framed this turn (their kits are not), so they are left as they are.
 */
function liftForFrames(slabs, units, profile) {
  const F = profile?.inframe || {};
  const types = new Set(F.unitTypes || []);
  const byId = new Map((units || []).map((u) => [u.id, u]));
  const spec = worktopSpec(profile);
  return slabs.map((slab) => {
    const g = slab.geometry;
    if (!g || g.shape === 'L' || g.shape === 'island' || slab.island) return slab;
    const under = (g.unitIds || slab.unitIds || []).map((id) => byId.get(id)).filter(Boolean);
    const framed = under.filter((u) => types.has(u.type));
    if (!framed.length) return slab;
    const board = (u) => (Number(u.params?.board_t) > 0 ? Number(u.params.board_t) : Number(profile?.board?.thickness) || 18);
    const lift = Math.max(...framed.map((u) => Number(F.rail) - board(u) - (Number(F.stile) - 2 * board(u)) / 2));
    const reachFramed = Math.max(...framed.map((u) => (Number(u.params?.depth) || 0) + Number(F.frameT)));
    const ext = Math.max(0, Number(slab.extendFront ?? g.extensions?.front) || 0);
    const d = Math.max(Number(g.d) || 0, reachFramed + spec.frontOverhang + ext);
    return {
      ...slab,
      geometry: { ...g, y: g.y + lift, d, depth: d, inframe: { lift } },
    };
  });
}

/**
 * Every worktop a project carries, resolved against the units that exist.
 *
 * A record naming a cabinet somebody has since deleted is DROPPED rather than
 * drawn over a hole in the run — the same rule a stale hinge assignment
 * follows.
 */
export function worktopsFor({
  records = [], units = [], profile, walls = null, inframe = false,
}) {
  // ─── T80 F8 · THE WORKTOP SITS ON THE FRAME ───────────────────────────────
  // The owner, 21.10.2026 (22:14): *"stolarz wypelni ta dziure i blat pojdzie
  // na wierzch"*. Under in-frame (the project's design.inframe, handed by the
  // caller) a slab over a run with a frame stands 19 higher, on the frame's
  // top edge (KIT_INFRAME.lsp D15, inframe-worktop-lift), and reaches over the
  // frame's face (D + 25) as it reached over the doors. The 19 under it is the
  // joiner's filler, a note, never a board. Lay-on: not one slab moves.
  if (inframe) return liftForFrames(worktopsFor({ records, units, profile, walls }), units, profile);
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
    // T75 F20 · …and so is the one cabinet a set's record names as a 'top'.
    const loneDesk = mine.length === 1 && (isDeskUnit(mine[0]) || record?.kind === 'top');
    if (mine.length < worktopSpec(profile).minUnits && !loneL && !loneDesk) continue;
    // ─── T75 F4/F5 · ONE SLAB SHAPED LIKE THE L ────────────────────────────
    if (loneL) {
      const geometry = lSlabGeometry({
        unit: mine[0], record, profile, units, walls,
      });
      if (geometry) out.push(withCutouts({ ...record, slabId: `${record.id}`, geometry }, mine, profile));
      continue;
    }
    // ─── T78 F2 · THE L AND THE RUNS ALONG ITS ARMS ────────────────────────
    const theL = mine.find(isCornerKit);
    if (theL) {
      const slabs = lRunSlabs({
        theL, mine, record, profile, units, walls,
      });
      if (slabs) out.push(...slabs);
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
      const pair = cornerSlabs({
        units: mine, record, corner, walls, profile, everyone: units,
      });
      if (pair) out.push(...pair);
      continue;
    }
    const geometry = worktopGeometry({ units: mine, record, profile });
    if (geometry && loneDesk && isDeskUnit(mine[0])) deskSideTrim(geometry, mine[0], units, profile);
    else if (geometry) sideTrim(geometry, mine, units, profile);
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
  sideTrim(geometry, [desk], units, profile);
}

/**
 * Does something stand butted against this end of these units, at the slab's
 * height, on their wall? The other slab's cabinet, a tall unit, an end panel:
 * then the slab's end BUTTS it and takes no side overhang there.
 */
function endMeets(list, side, units, profile, y0, y1) {
  const ids = new Set(list.map((u) => u.id));
  const wall = list[0].position?.wall ?? 0;
  const spans = list.map((u) => paddedSpan(u));
  const edge = side === 'left' ? Math.min(...spans.map((sp) => sp.left)) : Math.max(...spans.map((sp) => sp.right));
  return (units || []).some((u) => {
    if (ids.has(u.id) || (u.position?.wall ?? 0) !== wall) return false;
    // At the slab's height: standing through it (a wardrobe beside a desk)
    // or up to its underside (a base unit carrying a slab of its own).
    if (!(unitBase(u, profile) < y1 && unitTop(u, profile) > y0 - 1)) return false;
    const o = paddedSpan(u);
    return side === 'left' ? Math.abs(o.right - edge) <= 1 : Math.abs(o.left - edge) <= 1;
  });
}

/**
 * T75 · the desk's law (F17) for every straight slab: an end that butts what
 * stands beside it at its height loses the automat's side overhang, so two
 * slabs meeting on one wall, or a slab meeting a tall unit, are never drawn
 * 10 mm into each other (the T75 fixtures measured 20 mm of overlap). A free
 * end keeps its overhang; a length the client typed is his and stays.
 */
function sideTrim(geometry, list, units, profile) {
  const spec = worktopSpec(profile);
  const y0 = geometry.y;
  const y1 = geometry.y + geometry.h;
  if (endMeets(list, 'left', units, profile, y0, y1)) {
    geometry.x += spec.sideOverhang;
    geometry.w -= spec.sideOverhang;
    geometry.overhang = { ...geometry.overhang, left: 0 };
  }
  if (endMeets(list, 'right', units, profile, y0, y1)) {
    geometry.w -= spec.sideOverhang;
    geometry.overhang = { ...geometry.overhang, right: 0 };
  }
}

/**
 * T75 F5 · a slab with the cut-outs it proposes, on the entry AND on its
 * geometry (the drawing set reads geometry alone), and its joint likewise.
 */
function withCutouts(entry, units, profile) {
  // T82 F11 · and only the basins the stone can take (`fitBasins`): a basin
  // that does not fit is never cut, and says so (Check #48).
  const { cutouts, refusals } = fitBasins(cutoutsFor(units, entry.geometry, profile), entry.geometry, units, profile);
  return {
    ...entry,
    cutouts,
    ...(refusals.length ? { basinRefusals: refusals } : {}),
    geometry: {
      ...entry.geometry,
      ...(cutouts.length ? { cutouts } : {}),
      ...(refusals.length ? { basinRefusals: refusals } : {}),
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
  units, record, corner, walls, profile, everyone = units,
}) {
  const spec = worktopSpec(profile);
  const onA = units.filter((u) => (u.position?.wall ?? 0) === corner.wallA);
  const onB = units.filter((u) => (u.position?.wall ?? 0) === corner.wallB);
  const a = worktopGeometry({ units: onA, record: { ...record, extendLeft: 0, extendRight: 0 }, profile });
  const b = worktopGeometry({ units: onB, record: { ...record, extendLeft: 0, extendRight: 0 }, profile });
  if (!a || !b) return null;
  // T75 · the free ends butt what stands beside them (`sideTrim`); the
  // corner ends are set below, to the wall and to slab A's front.
  sideTrim(a, onA, everyone, profile);
  sideTrim(b, onB, everyone, profile);
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
function lSlabGeometry({
  unit, record = null, profile, units = [], walls = null,
}) {
  const spec = worktopSpec(profile);
  const W = Number(unit.params?.width) || 0;
  const D = Number(unit.params?.depth) || 0;
  const arm = Number(unit.params?.arm_mm) || Number(profile?.baseUnit?.defaults?.depth) || 0;
  const frontT = Number(unit.params?.front_t) || 0;
  const gap = Number(profile?.doors?.gap) || 0;
  const x0 = Number(unit.position?.x_mm) || 0;
  const reach = arm + gap + frontT + spec.frontOverhang + Math.max(0, Number(record?.extendFront) || 0);
  const side = spec.sideOverhang;
  const right = unit.params?.corner_side === 'right';
  const top = unitBase(unit, profile) + (Number(unit.params?.height) || 0);
  // T75 · the far end of the L's own arm BUTTS a neighbour standing there
  // (`sideTrim`'s law): no side overhang into its top.
  const thick = slabThickness(record, spec);
  const sideA = endMeets([unit], right ? 'left' : 'right', units, profile, top, top + thick) ? 0 : side;
  // ─── T78 F2 · FLUSH AT BOTH WALLS, AND THE ARM B END BUTTS ITS NEIGHBOUR ─
  //
  // The owner, 11.10.2026: *"worktop nie wycina sie w ksztalcie L."*  The
  // probe (verify/t78/f02-probe.md, rows 4 and 5) found the lone L's slab
  // started at the L's own x (10 mm off wall B, the wall gap left bare) while
  // every straight slab is flush at its wall (`worktopGeometry`: "nothing hangs
  // over a wall", z 0). So the edge along wall B runs to the wall: for the left
  // hand that is x 0; for the right hand the wall's own end (handed in; with no
  // walls the L's gap off it). And the arm B end takes the side overhang only
  // where nothing stands against it on the adjacent wall at the slab's height,
  // the law arm A's end already obeys (`cornerLAdjacentSpan` is the one span
  // the plus, the placement and this read).
  const wallA = Array.isArray(walls) ? walls[unit.position?.wall ?? 0] : null;
  const toWallB = right
    ? (wallA ? Math.max(0, (Number(wallA.width) || 0) - (x0 + W)) : wallGapOf(unit, profile))
    : x0;
  const adj = Array.isArray(walls) ? cornerLAdjacentSpan(unit, walls, profile) : null;
  const armBMet = Boolean(adj) && (units || []).some((u) => {
    if (u.id === unit.id || (u.position?.wall ?? 0) !== adj.wall) return false;
    if (!(unitBase(u, profile) < top + thick && unitTop(u, profile) > top - 1)) return false;
    const o = paddedSpan(u);
    return adj.side === 'left' ? Math.abs(o.right - adj.x_mm) <= 1 : Math.abs(o.left - adj.x_mm) <= 1;
  });
  const sideB = armBMet ? 0 : side;
  // In the unit's frame with the room corner at x = 0 (corner_side 'left'),
  // mirrored for an L whose corner is on its right.
  const local = [
    [-toWallB, 0], [W + sideA, 0], [W + sideA, reach], [reach, reach], [reach, D + sideB], [-toWallB, D + sideB],
  ];
  const outline = local.map(([x, z]) => [Math.round((x0 + (right ? W - x : x)) * 100) / 100, z]);
  const xs = outline.map((p) => p[0]);
  return {
    wall: unit.position?.wall ?? 0,
    x: Math.min(...xs),
    w: Math.max(...xs) - Math.min(...xs),
    y: top,
    h: thick,
    z: 0,
    d: D + sideB,
    depth: D + sideB,
    thickness: slabThickness(record, spec),
    decor: record?.decor ?? null,
    overhang: {
      front: spec.frontOverhang, side: spec.sideOverhang, wall: 0, armA: sideA, armB: sideB,
    },
    extensions: { left: 0, right: 0, front: Math.max(0, Number(record?.extendFront) || 0) },
    unitIds: [unit.id],
    outline: right ? [...outline].reverse() : outline,
    shape: 'L',
    // T78 F2 · where each arm ends along its wall (the L's own stop), for the
    // straight slab that butts it there.
    armEnds: {
      A: { wall: unit.position?.wall ?? 0, x: right ? x0 : x0 + W },
      ...(adj ? { B: { wall: adj.wall, x: adj.x_mm } } : {}),
    },
  };
}

/**
 * T78 F2 · THE L SLAB AND THE RUNS ALONG ITS ARMS: ONE RECORD, SEVERAL SLABS.
 *
 * The owner, 11.10.2026: *"worktop nie wycina sie w ksztalcie L."*  The probe
 * (verify/t78/f02-probe.md, rows 8 to 12): a record over the L and the
 * cabinets beside it fell through to `worktopGeometry`, ONE rectangle as deep
 * as the L (948 over a 558 Standard, the inner corner stone). Now the L is its
 * own slab (its outline), and the cabinets along each arm are a straight slab
 * of their own that BUTTS the L at the arm end with the joint record of T75
 * F5 (a square butt, the connector bolts, the drawing's note); a straight end
 * that does not reach the arm keeps its overhang. The client's left and right
 * extensions are the free ends' (T75's corner pair zeroes them the same way).
 */
function lRunSlabs({
  theL, mine, record, profile, units, walls,
}) {
  const spec = worktopSpec(profile);
  const lGeometry = lSlabGeometry({
    unit: theL, record, profile, units, walls,
  });
  if (!lGeometry) return null;
  const out = [withCutouts({ ...record, slabId: `${record.id}-L`, geometry: lGeometry }, [theL], profile)];
  const rest = mine.filter((u) => u.id !== theL.id);
  const byWall = new Map();
  for (const u of rest) {
    const wi = u.position?.wall ?? 0;
    if (!byWall.has(wi)) byWall.set(wi, []);
    byWall.get(wi).push(u);
  }
  for (const [wi, group] of byWall) {
    const geometry = worktopGeometry({ units: group, record: { ...record, extendLeft: 0, extendRight: 0 }, profile });
    if (!geometry) continue;
    sideTrim(geometry, group, units, profile);
    const arm = Object.entries(lGeometry.armEnds).find(([, end]) => end.wall === wi);
    let joint = null;
    if (arm) {
      const [name, end] = arm;
      const spans = group.map((u) => paddedSpan(u));
      const left = Math.min(...spans.map((s) => s.left));
      const right = Math.max(...spans.map((s) => s.right));
      // The group stands at the arm end on one side or the other: that end is
      // set TO the arm end, overhang and all, and the joint is recorded there.
      if (Math.abs(left - end.x) <= 1) {
        const far = geometry.x + geometry.w;
        geometry.x = end.x;
        geometry.w = far - end.x;
        geometry.overhang = { ...geometry.overhang, left: 0 };
      } else if (Math.abs(right - end.x) <= 1) {
        geometry.w = end.x - geometry.x;
        geometry.overhang = { ...geometry.overhang, right: 0 };
      }
      if (Math.abs(left - end.x) <= 1 || Math.abs(right - end.x) <= 1) {
        joint = {
          kind: spec.joint.kind,
          boltCount: spec.joint.boltCount,
          at: { wall: wi, x: end.x, depth: geometry.d },
          arm: name,
          readiness: 'manual',
          note: `Worktop joint: square butt, slab ${record.id}-w${wi} into the L slab ${record.id}-L at the arm ${name} end, `
            + `${spec.joint.boltCount} connector bolts; bolt pockets cut by hand on site.`,
        };
      }
    }
    out.push(withCutouts({
      ...record,
      slabId: `${record.id}-w${wi}`,
      geometry: { ...geometry, ...(joint ? { butts: 'L' } : {}) },
      ...(joint ? { joint } : {}),
    }, group, profile));
  }
  return out;
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
    // T82 F11 · a vanity's basins: an oval each, never machined.
    if (isVanityKit(u.type)) {
      out.push(...basinCutoutsOf(u, profile));
      continue;
    }
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

// ─── T82 F10, F11, F12 · THE VANITY'S TOP, ITS BASINS, ITS VOID ─────────────
//
// The owner, 25.10.2026 (12:57): *"dodanie blat grubosc do wyboru"*, *"dodanie
// 1 sink or 2 sink? dodajesz tylko do widoku"*, *"nastepnie to bedzie miejsce
// z tylu na rurki minimum potrzebujemy okolo 80 mm do 100 mm"*; and at 13:03:
// *"3 - 80"*, *"5 - blat osobny element jak worktop"*. The vanity's top is
// this module's slab (the store lays it at birth, `kind: 'top'`), reaching the
// wall over the void; the basins are what the eye sees set into it and the
// worktop's cut-outs on the plan; the void is a note and a hatch. None of it
// is a board: the basin is supplied by others, as appliances are.

/**
 * T82 F10 / F12 · the SERVICE VOID behind a vanity: how far its carcass stands
 * off the wall beyond the house's clearance (`vanity.serviceVoidMm`, 80, by the
 * kit's own `wall_gap` at birth; a gap typed since is the unit's and is read as
 * it stands). 0 for every unit that is not a vanity. The slab's depth, the
 * plan's hatch, the section's band and Check #45 all read this one number.
 */
export function serviceVoidOf(unit, profile) {
  if (!unit || !isVanityKit(unit.type)) return 0;
  const clearance = Math.max(0, Number(profile?.room?.wallBackClearance) || 0);
  return Math.max(0, wallGapOf(unit, profile) - clearance);
}

/** T82 F11 · the basin to the eye (`vanity.basin`, PROPOSED oval 520 x 400 x 150). */
export function basinSpec(profile) {
  const b = profile?.vanity?.basin || {};
  const num = (v, fallback) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fallback);
  return {
    shape: b.shape || 'oval',
    w: num(b.widthMm, 520),
    d: num(b.depthMm, 400),
    h: num(b.heightMm, 150),
    colour: b.colour || null,
  };
}

/**
 * T82 F11 · where a vanity's basins stand, in the UNIT's frame: `x` from the
 * carcass's left outer face, `z` from the carcass back. Read, never derived:
 * the x is `engine/vanity.js vanityWastes` (the LISP's `vanity-wastes`, D14:
 * one centred; two at the column centres on two columns, at a third and two
 * thirds on one), the z its `wasteFromBackMm`. The waste IS the basin's
 * centre, so the trap's U and the basin cannot stand apart.
 */
export function basinCentresOf(unit, profile) {
  if (!unit || !isVanityKit(unit.type)) return [];
  const W = Number(unit.params?.width) || 0;
  const columns = Number(unit.params?.columns) === 2 ? 2 : 1;
  const z = vanitySpec(profile).wasteFromBackMm;
  return vanityWastes({ W, columns, sinks: unit.params?.sinks }).map((x) => ({ x, z }));
}

/**
 * T82 F11 · the worktop's cut-out for each basin, in the slab's frame (along
 * the wall, out from it): an OVAL of the basin's own size centred on its
 * waste, its box in `x / z / w / d` so every reader of a cut-out finds it.
 * Never machined and never a part: the basin is supplied by others and its
 * hole is cut on site to its own template (the BOM carries it as a NOTE under
 * the worktop, as the sink's; Check #30 lists it as manual).
 */
function basinCutoutsOf(u, profile) {
  const b = basinSpec(profile);
  const x0 = Number(u.position?.x_mm) || 0;
  const back = wallGapOf(u, profile);
  const r2 = (v) => Math.round(v * 100) / 100;
  const num = u.params?.unit_num || u.id;
  return basinCentresOf(u, profile).map((c, i) => ({
    kind: 'basin',
    shape: b.shape,
    unitId: u.id,
    unitNum: u.params?.unit_num || null,
    basin: i + 1,
    x: r2(x0 + c.x - b.w / 2),
    z: r2(back + c.z - b.d / 2),
    w: b.w,
    d: b.d,
    r: null,
    cx: r2(x0 + c.x),
    cz: r2(back + c.z),
    depthMm: b.h,
    machined: false,
    readiness: 'manual',
    note: `Basin cut-out ${Math.round(b.w)} x ${Math.round(b.d)} oval over ${num}: cut on site to the basin's template.`,
  }));
}

// ─── T82 F11 · THE BASINS THE STONE CAN TAKE, AND THE ONES IT CANNOT ───────
//
// CLAUDE.md T82's law: *"The room refuses in words, the engine never
// squashes"*. Two 520 basins on one 900 column overlap; on two columns they
// pass the slab's ends. Nothing is moved or shrunk to make them fit: a basin is
// cut into the slab only where its oval lies wholly inside the slab with the
// house's cut-out margin to the edge (`worktop.cutout.insetMm`, 20) and clear
// of the ovals already cut by the same margin, in the order the LISP's wastes
// stand (the rule the room's slab keeps, 3d/Scene.jsx). A basin that does not
// fit is not cut, not drawn, not listed; the vanity says why and what would
// let it in (Check #48). The trap's U is the LISP's cut and follows `sinks`.

/** Two ovals clear of each other by the margin: each grown by half of it, the centres one scaled diameter apart. */
function ovalsClear(a, b, m) {
  const rx = (a.w + b.w) / 4 + m / 2;
  const rz = (a.d + b.d) / 4 + m / 2;
  const dx = (a.x + a.w / 2) - (b.x + b.w / 2);
  const dz = (a.z + a.d / 2) - (b.z + b.d / 2);
  return (dx / rx) ** 2 + (dz / rz) ** 2 >= 4 - 1e-9;
}

/**
 * The basin ovals (their boxes `x z w d`) laid into a slab's box `{ x0, x1,
 * z0, z1 }` in order: each one cut where it lies inside with the margin and
 * clear of those cut before it. Per oval: `{ ok, inX, inZ, clear }`.
 */
function basinSequence(ovals, box, m) {
  const cut = [];
  return ovals.map((o) => {
    const e = 1e-6;
    const inX = o.x >= box.x0 + m - e && o.x + o.w <= box.x1 - m + e;
    const inZ = o.z >= box.z0 + m - e && o.z + o.d <= box.z1 - m + e;
    const clear = cut.every((k) => ovalsClear(o, k, m));
    const ok = inX && inZ && clear;
    if (ok) cut.push(o);
    return {
      ok, inX, inZ, clear,
    };
  });
}

/**
 * T82 F11 · a slab's cut-outs with only the basins it can take, and for each
 * vanity that lost one the refusal in words: what was asked, why, and the
 * width (or depth) that would let it in, worked out from the basin's spec,
 * the margin and the slab's own reach past the vanity.
 *
 * @returns {{ cutouts: object[], refusals: object[] }}
 */
function fitBasins(cutouts, geometry, units, profile) {
  const basins = (cutouts || []).filter((c) => c.kind === 'basin');
  if (!basins.length || !geometry) return { cutouts: cutouts || [], refusals: [] };
  const m = worktopSpec(profile).cutout.insetMm;
  const gz = Number(geometry.z) || 0;
  const box = {
    x0: Number(geometry.x) || 0, x1: (Number(geometry.x) || 0) + (Number(geometry.w) || 0), z0: gz, z1: gz + (Number(geometry.d) || 0),
  };
  const verdict = basinSequence(basins, box, m);
  const refused = new Set(basins.filter((c, i) => !verdict[i].ok));
  const kept = (cutouts || []).filter((c) => !refused.has(c));
  const byUnit = new Map();
  for (const c of refused) {
    if (!byUnit.has(c.unitId)) byUnit.set(c.unitId, []);
    byUnit.get(c.unitId).push(c);
  }
  const refusals = [];
  for (const [unitId, lost] of byUnit) {
    const u = (units || []).find((x) => x.id === unitId);
    if (u) refusals.push(basinRefusal(u, lost, geometry, profile));
  }
  return { cutouts: kept, refusals };
}

/** The refusal of one vanity's basins, in its own frame: why, and the size that would let them in. */
function basinRefusal(u, lost, geometry, profile) {
  const spec = worktopSpec(profile);
  const m = spec.cutout.insetMm;
  const b = basinSpec(profile);
  const W = Number(u.params?.width) || 0;
  const D = Number(u.params?.depth) || 0;
  const x0 = Number(u.position?.x_mm) || 0;
  const back = wallGapOf(u, profile);
  const columns = Number(u.params?.columns) === 2 ? 2 : 1;
  const sinks = u.params?.sinks;
  const z = vanitySpec(profile).wasteFromBackMm;
  // The slab's reach past this vanity, in the vanity's own frame: the slab's
  // own where it lies on the vanity's wall (every straight slab), else the
  // slab the vanity would carry alone (an island's face).
  const own = Number(geometry.wall ?? 0) === Number(u.position?.wall ?? 0) && geometry.shape !== 'island'
    ? geometry : worktopGeometry({ units: [u], profile });
  const left = (Number(own.x) || 0) - x0;
  const right = (Number(own.x) || 0) + (Number(own.w) || 0) - (x0 + W);
  const zBack = (Number(own.z) || 0) - back;
  const zFront = (Number(own.z) || 0) + (Number(own.d) || 0) - back;
  const lay = (w, frontGrow = 0) => basinSequence(
    vanityWastes({ W: w, columns, sinks }).map((x) => ({
      x: x - b.w / 2, z: z - b.d / 2, w: b.w, d: b.d,
    })),
    {
      x0: left, x1: w + right, z0: zBack, z1: zFront + frontGrow,
    },
    m,
  );
  const now = lay(W);
  const asked = now.length;
  const unitNum = u.params?.unit_num || u.id;
  const lostCount = lost.length;
  const base = {
    unitId: u.id, unitNum: u.params?.unit_num || null, asked, cut: asked - lostCount, basinW: b.w, basinD: b.d,
  };
  // Too deep for the top: the depth that lets the oval in, front edge and margin.
  if (now.some((v) => !v.inZ)) {
    const backShort = zBack + m - (z - b.d / 2);
    if (backShort > 1e-6) {
      return {
        ...base,
        why: 'depth',
        need: null,
        message: `${unitNum}: A basin ${b.d} deep does not fit the top of a ${D} deep vanity: its waste stands ${z} from the carcass back; take a smaller basin.`,
      };
    }
    const over = (z + b.d / 2) + m - zFront;
    const need = Math.ceil((D + over) / 10) * 10;
    return {
      ...base,
      why: 'depth',
      need: { depth: need },
      message: `${unitNum}: A basin ${b.d} deep does not fit the top of a ${D} deep vanity: make the vanity ${need} deep${asked > 1 ? ' or take one basin' : ''}.`,
    };
  }
  // Too wide for the top, or two that meet: the width that lets every one in.
  let need = null;
  for (let w = Math.ceil((W + 1) / 10) * 10; w <= W + 6000; w += 10) {
    if (lay(w).every((v) => v.ok)) { need = w; break; }
  }
  const what = asked > 1 ? `${asked === 2 ? 'Two' : String(asked)} basins ${b.w} wide do not` : `A basin ${b.w} wide does not`;
  const fix = [need ? `make the vanity ${need} wide` : null, asked > 1 ? 'take one basin' : null].filter(Boolean).join(' or ');
  return {
    ...base,
    why: 'width',
    need: need ? { width: need } : null,
    message: `${unitNum}: ${what} fit the top of a ${W} vanity${fix ? `: ${fix}` : ''}.`,
  };
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
      // T82 F11 · a basin's centre rides into A's frame with its box (the hole and the bowl read it).
      const centre = c.cx != null ? toA(plan(wall, c.cx, c.cz)) : null;
      cutouts.push({
        ...c,
        x: r2(Math.min(...cu)),
        z: r2(Math.min(...cv)),
        w: r2(Math.max(...cu) - Math.min(...cu)),
        d: r2(Math.max(...cv) - Math.min(...cv)),
        ...(centre ? { cx: r2(centre[0]), cz: r2(centre[1]) } : {}),
      });
    }
  }
  // T82 F11 · the basins the island's slab can take, in its own frame.
  const fit = fitBasins(cutouts, geometry, units, profile);
  return {
    ...record,
    slabId: `${record.id}`,
    cutouts: fit.cutouts,
    ...(fit.refusals.length ? { basinRefusals: fit.refusals } : {}),
    geometry: {
      ...geometry,
      ...(fit.cutouts.length ? { cutouts: fit.cutouts } : {}),
      ...(fit.refusals.length ? { basinRefusals: fit.refusals } : {}),
    },
  };
}
