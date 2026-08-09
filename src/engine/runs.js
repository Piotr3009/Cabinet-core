// ─── Runs, and the one piece that sits on top of one (turn 6, CLAUDE.md F4) ───
//
// A RUN is what a joiner means by a run: cabinets standing side by side on one
// wall, at one level, finishing at one height. It matters here because of a
// single sentence in CLAUDE.md — the top infill is **ONE CONTINUOUS ELEMENT
// FOR THE WHOLE RUN**, not a piece per cabinet.
//
// That is not a detail. A 3.6 m kitchen closed with six 600 mm offcuts has five
// joints across the most visible line in the room, all of them at eye level and
// none of them where a cabinet joint is. One length has none. It is also how
// the thing is actually made: you cut it to the run, scribe it once, and mitre
// the corner.
//
// So the geometry cannot be decided by computeCabinet, which only ever sees one
// cabinet. It is decided HERE, from the room, and written onto the run's first
// unit as a parameter; computeCabinet then builds it like any other panel, so
// it reaches the BOM, the CNC sheet and the DXF by exactly the routes that
// already exist. There is no second cut list for "the long bits".
//
// Pure functions — no React, no store imports.

import { getUnitType } from './types.js';

/** Height of a unit's top above the floor — where anything on top of it starts. */
export function unitTop(unit, profile) {
  return unitBase(unit, profile) + (Number(unit.params?.height) || 0);
}

/**
 * How far off the FLOOR a unit's carcass starts: its mounting height when it
 * hangs, its toe kick when it stands.
 *
 * ─── Turn 8 ───
 * The toe kick is the unit's OWN (`params.leg_height`) before it is the
 * profile's. Turn 5 made the toe kick a project height and pushed it onto every
 * unit (BACKLOG #29), and `cabinet.js legHeightOf` has read it ever since — but
 * this function did not, so every consumer of it was 20 mm out on a project
 * with a 120 mm kick: which units are one RUN, how much room is left above one
 * for a top infill, and (turn 8, F5) where a wall unit hangs to line up with
 * the tall cabinet beside it. That last one is how it was noticed.
 */
export function unitBase(unit, profile) {
  const type = getUnitType(unit.type);
  if (type.mount === 'wall') return Number(unit.params?.mount_height) || 0;
  if (!type.legs) return 0;
  const own = Number(unit.params?.leg_height);
  if (Number.isFinite(own) && own >= 0) return own;
  return type.legSource === 'wardrobe' ? profile.wardrobe.legHeight : profile.baseUnit.legHeight;
}

/** How far a unit's own end panels stick out on each side. */
export function endPanelSpread(unit, fallbackThickness = 0) {
  const out = { left: 0, right: 0 };
  for (const ep of unit?.params?.end_panels || []) {
    const t = Number(ep?.thickness) > 0 ? Number(ep.thickness) : Number(fallbackThickness) || 0;
    if (ep?.side === 'R') out.right = Math.max(out.right, t);
    else out.left = Math.max(out.left, t);
  }
  return out;
}

/** The span a unit occupies along its wall, end panels included. */
export function paddedSpan(unit) {
  const pad = endPanelSpread(unit, unit?.params?.front_t);
  const x = Number(unit.position?.x_mm) || 0;
  const w = Number(unit.params?.width) || 0;
  return { left: x - pad.left, right: x + w + pad.right, pad };
}

/**
 * Group units into runs.
 *
 * A run breaks on any of four things, and each of them is a physical fact
 * rather than a convenience:
 *   - a different WALL or a different LEVEL — obviously;
 *   - a TURNED unit, which has no "along the wall" to share;
 *   - a different TOP HEIGHT, because one board cannot lie on two heights;
 *   - a GAP, because a board that bridges nothing is a board hanging in air.
 */
export function buildRuns(units, profile) {
  const groups = new Map();
  for (const unit of units) {
    const rotation = (((Number(unit.position?.rotation_deg) || 0) % 360) + 360) % 360;
    if (rotation !== 0) continue;
    const type = getUnitType(unit.type);
    const wall = unit.position?.wall ?? 0;
    // Rounded to a tenth: two units on the same project height differ by
    // nothing, and floating point should not be able to split a run.
    const top = Math.round(unitTop(unit, profile) * 10) / 10;
    const key = `${wall}|${type.mount}|${top}`;
    const list = groups.get(key);
    if (list) list.push(unit);
    else groups.set(key, [unit]);
  }

  const tolerance = profile.autoParts.topInfill.runGap;
  const runs = [];
  for (const [key, list] of groups) {
    const [wall, mount] = key.split('|');
    const sorted = [...list].sort((a, b) => paddedSpan(a).left - paddedSpan(b).left);
    let current = [sorted[0]];
    for (let i = 1; i < sorted.length; i += 1) {
      const gap = paddedSpan(sorted[i]).left - paddedSpan(current[current.length - 1]).right;
      if (gap <= tolerance) current.push(sorted[i]);
      else { runs.push(makeRun(current, wall, mount, profile)); current = [sorted[i]]; }
    }
    runs.push(makeRun(current, wall, mount, profile));
  }
  return runs;
}

/**
 * Every unit that shares a RUN with this one — itself included.
 *
 * ─── Turn 14 (CLAUDE.md F1.2): "removal must remove" ───
 * The top infill is ONE piece for the whole run and its height is the TALLEST
 * request any member makes (`runTopInfill`, below). So clearing the flag on one
 * cabinet of a run of four changes nothing anybody can see: the other three are
 * still asking for it, and the long piece still runs over this one's head. From
 * the joiner's side that is a menu entry that does nothing — which is exactly
 * what the owner reported, and it is worst on wall units because that is where
 * runs are longest.
 *
 * The piece belongs to the run, so the DECISION belongs to the run. This is the
 * list the store writes to.
 */
export function runMemberIds(units, unitId, profile) {
  for (const run of buildRuns(units, profile)) {
    if (run.units.some((u) => u.id === unitId)) return run.units.map((u) => u.id);
  }
  return unitId ? [unitId] : [];
}

/**
 * Is there a top infill above this cabinet — its own, or the run's?
 *
 * A run MEMBER carries no height of its own (the owner holds the geometry), so
 * a switch that reads `top_infill_mm` alone shows "not fitted" while the piece
 * is plainly there on the screen.
 */
export function hasTopInfill(unit) {
  return (Number(unit?.params?.top_infill_mm) || 0) > 0 || Boolean(unit?.params?.run_top_infill);
}

function makeRun(units, wall, mount, profile) {
  return {
    wall: Number(wall),
    mount,
    units,
    top: unitTop(units[0], profile),
    left: paddedSpan(units[0]).left,
    right: paddedSpan(units[units.length - 1]).right,
  };
}

// ─── The four end conditions (CLAUDE.md F4) ───

/**
 * What the element runs into at one end of the run, and where it therefore
 * stops. The order is the order CLAUDE.md lists them in, and it is the order a
 * joiner checks in: is there a wall? is there a filler taking me to the wall?
 * is there a panel already going all the way up? then it is open, and it turns
 * the corner.
 *
 * @returns {{kind:'wall'|'infill'|'end-panel'|'open', x:number}}
 */
export function runEnd(run, side, { wallWidth, roomHeight }, profile) {
  const unit = side === 'left' ? run.units[0] : run.units[run.units.length - 1];
  const span = paddedSpan(unit);
  const carcassEdge = side === 'left'
    ? (Number(unit.position?.x_mm) || 0)
    : (Number(unit.position?.x_mm) || 0) + (Number(unit.params?.width) || 0);
  const outerEdge = side === 'left' ? span.left : span.right;
  const wallAt = side === 'left' ? 0 : (Number(wallWidth) || 0);
  const tolerance = profile.autoParts.topInfill.runGap;
  // ─── Turn 8 (CLAUDE.md F3) ───
  // A unit never stands hard against a wall any more — the same bowed wall that
  // puts 10 mm behind every cabinet puts 10 mm beside the end one, and with the
  // infill switched off that stop is exactly `room.wallBackClearance`. A run
  // parked there HAS reached the wall: the gap is a scribe, the piece on top
  // runs over it, and calling the end "open" would turn the corner and run a
  // return down a 10 mm slot.
  const atWall = tolerance + Math.max(0, Number(profile.room?.wallBackClearance) || 0);

  // 1 — the wall itself.
  if (Math.abs(outerEdge - wallAt) <= atWall) return { kind: 'wall', x: wallAt };

  // 2 — a vertical L-infill, which closes the gap to the wall. The element runs
  //     over it and finishes on the wall, which is what "ends on it" means for
  //     a piece lying on top.
  const infill = Number(unit.params?.[side === 'left' ? 'side_infill_left_mm' : 'side_infill_right_mm']) || 0;
  if (infill >= profile.autoParts.sideInfill.minWidth) return { kind: 'infill', x: wallAt };

  // 3 — an end panel already taken to the ceiling. The element butts INTO it:
  //     the panel is the finished surface at that end, and running the infill
  //     across its top would put a joint where the eye is.
  const headroom = Math.max(0, (Number(roomHeight) || 0) - run.top);
  const toCeiling = (unit.params?.end_panels || []).some((ep) => {
    const wanted = side === 'left' ? 'L' : 'R';
    if ((ep?.side === 'R' ? 'R' : 'L') !== wanted) return false;
    return headroom > 0 && (Number(ep?.top_mm) || 0) >= headroom - tolerance;
  });
  if (toCeiling) return { kind: 'end-panel', x: carcassEdge };

  // 4 — open. It finishes flush with the outside of the last thing in the run
  //     and turns the corner from there.
  return { kind: 'open', x: outerEdge };
}

// ─── Where a cabinet can be ADDED (turn 9, CLAUDE.md F2) ────────────────────

/**
 * The free gap at one end of a run: how much clear wall there is between the
 * outside of the run and the next thing along — a neighbouring unit at the same
 * level, or the wall itself.
 *
 * Measured off `paddedSpan`, so an END PANEL counts as part of the unit it is
 * screwed to. A gap measured to the carcass would offer the last 18 mm of a
 * slot that is already occupied by a masking panel.
 *
 * @param {object} run       one entry from buildRuns()
 * @param {'left'|'right'} side
 * @param {object} context   { wallWidth, others } — `others` is every unit on
 *                           the same wall at the same level, this run included;
 *                           its own members are skipped here.
 * @returns {{gap:number, from:number, to:number, unit:object}}
 */
export function runEndGap(run, side, { wallWidth = 0, others = [] } = {}) {
  const mine = new Set(run.units.map((u) => u.id));
  const spans = others.filter((u) => !mine.has(u.id)).map(paddedSpan);
  const unit = side === 'left' ? run.units[0] : run.units[run.units.length - 1];

  if (side === 'left') {
    const edge = run.left;
    // The nearest thing standing to the LEFT of this run. Nothing there means
    // the wall, which is at 0.
    const blocked = spans.filter((s) => s.right <= edge + 1e-6).map((s) => s.right);
    const from = blocked.length ? Math.max(...blocked) : 0;
    return { gap: Math.max(0, edge - from), from, to: edge, unit };
  }
  const edge = run.right;
  const blocked = spans.filter((s) => s.left >= edge - 1e-6).map((s) => s.left);
  const to = blocked.length ? Math.min(...blocked) : (Number(wallWidth) || 0);
  return { gap: Math.max(0, to - edge), from: edge, to, unit };
}

/**
 * Every place the canvas offers a "+" (turn 9, CLAUDE.md F2).
 *
 * ─── WHY THIS EXISTS AT ALL ───
 * Turn 8 answered "adding on the left is impossible" with a three-way side
 * picker in the Library panel — ◀ / auto / ▶ — and Piotr's verdict on it is
 * that it is confusing. He is right about the reason: it asks you to describe
 * a place in words, in a panel, before you have said which cabinet you mean.
 *
 * So the question is asked the other way round. Every free end of every run
 * carries a "+", and clicking it says the whole sentence at once — THIS end of
 * THIS run — before the library has even opened. The insertion itself is turn
 * 8's, unchanged: `projectStore.addUnit(typeId, { near, side })`.
 *
 * A plus appears only where a cabinet could actually go: below
 * `profile.ui.addPlusMinGapMm` of clear room the gap is a filler's job, and
 * offering to put a cabinet in it would be an offer the placement refuses a
 * moment later.
 *
 * Pure: units in, anchors out. No React, no store, no three.js.
 *
 * @param {Array} units      every unit in the project
 * @param {object} context   { walls } — engine/room.js roomWalls() output
 * @returns {Array<{unitId:string, side:'left'|'right', wall:number, mount:string,
 *                  x_mm:number, gap:number, top:number}>}
 */
export function addPlusPoints(units, { walls = [] } = {}, profile) {
  const min = profile?.ui?.addPlusMinGapMm ?? 0;
  const out = [];
  for (const run of buildRuns(units, profile)) {
    const wallWidth = walls?.[run.wall]?.width ?? 0;
    // Same wall, same level: a wall unit and a base unit occupy different bands
    // of the same wall and do not block each other.
    const others = units.filter((u) => (u.position?.wall ?? 0) === run.wall
      && getUnitType(u.type).mount === run.mount);
    for (const side of ['left', 'right']) {
      const { gap } = runEndGap(run, side, { wallWidth, others });
      if (gap < min) continue;
      out.push({
        unitId: (side === 'left' ? run.units[0] : run.units[run.units.length - 1]).id,
        side,
        wall: run.wall,
        mount: run.mount,
        // The outside face of the run at that end — where the new cabinet's
        // own edge will land.
        x_mm: side === 'left' ? run.left : run.right,
        gap,
        top: run.top,
      });
    }
  }
  return out;
}

/**
 * The top infill for one run, or null when nobody asked for one.
 *
 * Everything is in the OWNER unit's local frame — x measured from the owner's
 * left carcass edge — because that is the frame computeCabinet builds boxes in.
 *
 * @returns {null | {
 *   role:'owner', offset:number, length:number, faceH:number, shelfDepth:number,
 *   thickness:number|null, ends:{left:string,right:string},
 *   returns:{left:number|null, right:number|null}, unitIds:string[] }}
 */
export function runTopInfill(run, { wallWidth, roomHeight, frontFaceDepth }, profile) {
  const T = profile.autoParts.topInfill;
  // The face height a member asked for. A run is one height: the tallest
  // request wins, because the alternative is a step in the middle of the piece.
  const faceH = run.units.reduce((m, u) => Math.max(m, Number(u.params?.top_infill_mm) || 0), 0);
  if (faceH < T.minHeight) return null;

  const left = runEnd(run, 'left', { wallWidth, roomHeight }, profile);
  const right = runEnd(run, 'right', { wallWidth, roomHeight }, profile);
  const owner = run.units[0];
  const ownerX = Number(owner.position?.x_mm) || 0;

  const length = right.x - left.x;
  if (length <= 0) return null;

  // A return exists only at an OPEN end, and it runs along the side of the
  // cabinet AT THAT END — so its length is that cabinet's own front-face depth,
  // not the run's or the first unit's.
  const depthAt = (side) => {
    const d = Math.max(0, Number(frontFaceDepth?.[side]) || 0);
    return d >= T.minReturn ? d : null;
  };

  return {
    role: 'owner',
    offset: left.x - ownerX,
    length,
    faceH,
    shelfDepth: T.shelfDepth,
    thickness: T.thickness,
    ends: { left: left.kind, right: right.kind },
    returns: {
      left: left.kind === 'open' ? depthAt('left') : null,
      right: right.kind === 'open' ? depthAt('right') : null,
    },
    unitIds: run.units.map((u) => u.id),
  };
}

/**
 * The `run_top_infill` value for EVERY unit: the owner carries the geometry,
 * everyone else carries a note saying the run has it covered. A member with no
 * note at all would fall back to the single-unit path in computeCabinet and put
 * a second, shorter piece inside the long one.
 *
 * @returns {Map<string, object|null>} unit id → the parameter to store
 */
export function runInfillParams(units, { walls, roomHeight, frontFaceDepthOf }, profile) {
  const depthOf = frontFaceDepthOf || (() => 0);
  const out = new Map(units.map((u) => [u.id, null]));
  for (const run of buildRuns(units, profile)) {
    const wallWidth = walls?.[run.wall]?.width ?? 0;
    const element = runTopInfill(run, {
      wallWidth,
      roomHeight,
      frontFaceDepth: {
        left: depthOf(run.units[0]),
        right: depthOf(run.units[run.units.length - 1]),
      },
    }, profile);
    if (!element) {
      for (const u of run.units) out.set(u.id, null);
      continue;
    }
    out.set(run.units[0].id, element);
    for (const u of run.units.slice(1)) out.set(u.id, { role: 'member', ownerId: run.units[0].id });
  }
  return out;
}

// ─── ONE PLINTH ACROSS A RUN (turn 12, CLAUDE.md F8) ────────────────────────
//
// The owner's rule, in his words:
//
//   • no plinth = no plinth (unchanged);
//   • turning plinths on for adjacent units WITHOUT an end panel between them
//     produces ONE continuous plinth across 2, 3, N units — not pieces;
//   • a unit pushed against a plinthed run joins it AUTOMATICALLY;
//   • an end panel or a gap is a boundary — a new segment starts.
//
// He is describing a toe kick as a joiner cuts one: a single length of board
// running the front of the run, mitred or butted at the ends, not one small
// piece per carcass with a joint every 600 mm that shows.
//
// It is the TOP-INFILL pattern, on the other side of the cabinet — the same
// owner/member split, the same "one element per run", the same reasoning about
// why a member has to carry a note rather than nothing. That is deliberate and
// CLAUDE.md asks for it in as many words: "Reuse the top-infill run logic (one
// element per run, T8) rather than a parallel implementation."
//
// The two extra boundaries a plinth has that a top infill does not:
//
//   AN END PANEL. It comes down to the floor and stands in the plane the toe
//   kick occupies, so the kick stops at it — that is what an end panel is FOR.
//   A top infill lives at the top of the cabinet where a floor-height end panel
//   is not in the way, which is why turn 8 did not have to think about it.
//
//   A UNIT WITH NO PLINTH. A cabinet whose plinth is switched off is a hole in
//   the toe kick, and a board that bridges it is a board across a doorway.

/** Does this unit want a plinth of its own? */
function wantsPlinth(unit) {
  return unit?.params?.plinth === true;
}

/**
 * The plinth SEGMENTS of one run: maximal stretches of adjacent plinthed units
 * with no end panel standing between them.
 *
 * @returns {Array<Array<object>>} the units of each segment, left to right
 */
export function plinthSegments(run) {
  const segments = [];
  let current = [];
  const close = () => { if (current.length) segments.push(current); current = []; };

  for (const unit of run.units) {
    if (!wantsPlinth(unit)) { close(); continue; }
    if (current.length) {
      const previous = current[current.length - 1];
      // An end panel on EITHER facing side is a boundary: it is one piece of
      // board standing between the two cabinets, and the kick meets it.
      const between = endPanelSpread(previous, previous.params?.front_t).right > 0
        || endPanelSpread(unit, unit.params?.front_t).left > 0;
      if (between) close();
    }
    current.push(unit);
  }
  close();
  return segments;
}

/**
 * The plinth element for one segment: where it starts, how long it is, and who
 * carries it.
 *
 * Measured on the CARCASSES, not on the padded span. An end panel comes down to
 * the floor and stands in the plane the toe kick occupies — it is the visible
 * end of the run, and the kick meets its inner face rather than running behind
 * it. That is the same fact that makes an end panel a boundary between two
 * cabinets, applied at the ends of the segment.
 *
 * It is also what keeps a SINGLE unit's plinth exactly the width it has always
 * been (`w: W`), so the only export this phase changes is the one it means to:
 * a run of two or more.
 */
export function segmentPlinth(segment) {
  if (!segment.length) return null;
  const first = segment[0];
  const last = segment[segment.length - 1];
  const left = Number(first.position?.x_mm) || 0;
  const right = (Number(last.position?.x_mm) || 0) + (Number(last.params?.width) || 0);
  const length = right - left;
  if (length <= 0) return null;
  const owner = segment[0];
  return {
    role: 'owner',
    offset: left - (Number(owner.position?.x_mm) || 0),
    length,
    unitIds: segment.map((u) => u.id),
  };
}

/**
 * The `run_plinth` value for EVERY unit — the twin of `runInfillParams`.
 *
 * The owner of each segment carries the geometry; everyone else in it carries a
 * note saying the segment has it covered. A member with no note at all would
 * fall back to the single-unit path in computeCabinet and cut a second, shorter
 * plinth inside the long one — which is exactly the trap turn 8 documented for
 * the top infill.
 *
 * @returns {Map<string, object|null>} unit id → the parameter to store
 */
export function runPlinthParams(units, profile) {
  const out = new Map(units.map((u) => [u.id, null]));
  for (const run of buildRuns(units, profile)) {
    for (const segment of plinthSegments(run)) {
      const element = segmentPlinth(segment);
      if (!element) continue;
      out.set(segment[0].id, element);
      for (const u of segment.slice(1)) out.set(u.id, { role: 'member', ownerId: segment[0].id });
    }
  }
  return out;
}
