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
  if (!standsOnLegHeight(type)) return 0;
  return impliedLegHeight(unit?.params, type, profile);
}

/**
 * ─── TURN 22 (CLAUDE.md F4): ONE DERIVATION OF "HOW HIGH DOES IT STAND" ─────
 *
 * The owner, from the eye test: the D/W panel rightly has no legs — the
 * machine lives where they would be — but its HEIGHT must behave exactly as if
 * the run's legs were under it. Enter 50 on the run, get 50.
 *
 * It did not, and there were two halves to that. The first is
 * `engine/cabinet.js`'s old `legHeightForPlinth = cfg.legHeight || (type.plinth
 * && !type.legs ? P.baseUnit.legHeight : 0)`: a leg-less plinth type fell back
 * to the PROFILE CONSTANT — 100, always — instead of the leg height the
 * project actually set. The second is this function, which returned 0 for a
 * leg-less type, so a D/W's `unitTop` was 100 mm below its legged neighbours'
 * and `buildRuns` put it in a run of its own: the toe kick could not be one
 * length across BUD + D/W, because the app did not think they were in the same
 * run at all.
 *
 * Both halves are one sentence — *a plinth-bearing type stands as high as the
 * legs its neighbours stand on, whether or not it has any* — and this is the
 * one place it is written. `cabinet.js`, `projectStore.floorYOf` and this
 * module all read it, so no D/W-special constant exists anywhere.
 */
export function standsOnLegHeight(type) {
  if (!type) return false;
  if (type.mount === 'wall') return false;
  // A plinth without legs is the D/W panel today and whatever the next
  // appliance front is tomorrow: the piece stands in a run of legged cabinets
  // and finishes flush with them.
  return Boolean(type.legs) || Boolean(type.plinth);
}

/**
 * The leg height a unit is built to: its own (the project's toe kick, pushed
 * onto every unit when a project height changes) before the profile's.
 *
 * The profile is the LAST fallback and never a floor — CLAUDE.md F4.3: "the
 * 100 mm leg minimum is a bug: a default, never a floor". A stored 0 is a real
 * answer and is honoured; only "nobody has said" reaches the profile.
 */
export function impliedLegHeight(params, type, profile) {
  const stated = params?.leg_height;
  // `Number(null)` is 0, not NaN, so "nobody has said" has to be asked BEFORE
  // the number is read — the same trap `maskDepthExtra` names below. Without
  // it a stored null reads as a cabinet standing flat on the floor with no toe
  // kick, which is a real answer to a question nobody asked.
  if (stated != null && stated !== '') {
    const own = Number(stated);
    if (Number.isFinite(own) && own >= 0) return own;
  }
  return type?.legSource === 'wardrobe'
    ? profile.wardrobe.legHeight
    : profile.baseUnit.legHeight;
}

/** How far a unit's own end panels stick out on each side. */
function endPanelSpread(unit, fallbackThickness = 0) {
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
 * The units of one WALL at one LEVEL, keyed `wall|mount|top`.
 *
 * The first half of `buildRuns` — the part that is about where a cabinet
 * STANDS rather than about what board could lie across it. Split out in turn 52
 * so the share-out can borrow the level and refuse the gap (`buildWallRuns`).
 */
function levelGroups(units, profile) {
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
  return groups;
}

// ─── TURN 52 (CLAUDE.md F1a): THE SHARE-OUT GETS ITS OWN SCOPE ──────────────
//
// The owner, walking T51: *"jak robie po prawej, to proponuje tylko 1 lub 2
// szafki i nadal nie moze przesunac reszty."*
//
// The diagnosis is `buildRuns` above, and the number is `runGap` — ONE
// MILLIMETRE. That number is right for what it was written for: whether two
// cabinets share ONE top filler, where a board that bridges a 2 mm shadow is a
// board hanging in air. It is far too tight for the question the share-out
// asks, and six cabinets with one 2 mm shadow between them are TWO runs — so
// the share-out divides the one the hand touched and refuses to move the rest.
//
// So the share-out gets its OWN definition of scope, and it is the owner's own
// sentence: **every cabinet on this wall at this level, wall to wall**,
// whatever millimetre shadows stand between them. `runGap` IS NOT CHANGED and
// nothing else may inherit this — `buildRuns` is still what decides where a
// top infill, a cornice, a masking panel or a plinth is one length, and all
// four of those are boards that really cannot bridge a hole.
//
// The LEVEL is the same fact `buildRuns` uses (`wall|mount|top`): one shelf
// line, one stretch of wall. Only the GAP break is dropped.
/**
 * The runs of a room with the GAP RULE DROPPED — one run per wall per level.
 *
 * Same shape as `buildRuns`' entries, so every consumer of a run —
 * `runEndGap`, `paddedSpan`, `shareOutPlan` — takes one unchanged.
 */
export function buildWallRuns(units, profile) {
  const runs = [];
  for (const [key, list] of levelGroups(units, profile)) {
    const [wall, mount] = key.split('|');
    const sorted = [...list].sort((a, b) => paddedSpan(a).left - paddedSpan(b).left);
    runs.push(makeRun(sorted, wall, mount, profile));
  }
  return runs;
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
  const groups = levelGroups(units, profile);

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

/**
 * Is there a masking panel under this cabinet — its own, or the run's?
 *
 * The twin of `hasTopInfill`, and it exists for the same reason: a member of a
 * run carries the flag but the GEOMETRY is the owner's, and a switch that reads
 * only one of the two can show "not fitted" under a board that is there.
 */
export function hasBottomMask(unit) {
  return unit?.params?.bottom_mask === true || Boolean(unit?.params?.run_mask);
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

// ─── What stands in the way, floor to ceiling (turn 14, CLAUDE.md F3) ───────
//
// #55, parked at turn 8 and now live, plus one case the owner found using it:
//
//   1. a wall-unit run's top infill stops AT an end panel that runs to the
//      ceiling — a TALL cabinet's panel, standing beside and below the run,
//      belonging to a unit that is not in the run and never could be (it is at
//      another mounting level);
//   2. a tall unit's top infill ends ON a side infill instead of cutting
//      through it.
//
// CLAUDE.md asks for ONE termination rule covering both, in the run logic the
// top infill already owns. They are the same sentence: *between this run and
// the wall, is there anything standing all the way up?* Turn 8's `runEnd` could
// only ask it of the run's OWN end unit, which is exactly why neither case
// worked — in both of them the thing in the way belongs to somebody else.
//
// So the question is asked of the ROOM. This function is the room's answer: the
// verticals that reach the ceiling, wherever they come from, as spans along
// their wall. A piece that stops at the top of its own carcass is not in this
// list, which is what keeps turn 8's behaviour — a run wraps over its own
// carcass-height end panel — exactly as it was.

/**
 * Every floor-to-ceiling vertical in the plan, as `{wall, from, to, kind, top}`.
 *
 * `from`/`to` are along the wall, in the same frame `paddedSpan` uses. `kind`
 * is what the end condition will be called: 'end-panel' or 'infill'.
 */
export function unitVerticals(units, profile) {
  const minInfill = profile.autoParts.sideInfill.minWidth;
  const out = [];

  for (const unit of units || []) {
    // A TURNED unit has no "along the wall" span to speak of, exactly as
    // `buildRuns` says: whatever it blocks, it does not block like a panel.
    const rotation = (((Number(unit.position?.rotation_deg) || 0) % 360) + 360) % 360;
    if (rotation !== 0) continue;
    const wall = unit.position?.wall ?? 0;
    const x = Number(unit.position?.x_mm) || 0;
    const w = Number(unit.params?.width) || 0;
    const carcassTop = unitTop(unit, profile);
    // Where the piece STARTS. The carcass's own underside is the honest answer
    // for both kinds: an end panel may drop to the floor and a filler certainly
    // does, and both only make the piece a bigger obstacle at heights nothing
    // hangs at. What decides anything is the TOP.
    const bottom = Math.max(0, carcassTop - (Number(unit.params?.height) || 0));
    const add = (side, thickness, above, kind, id) => {
      const t = Number(thickness) || 0;
      if (t <= 0) return;
      out.push({
        wall,
        from: side === 'L' ? x - t : x + w,
        to: side === 'L' ? x : x + w + t,
        bottom,
        top: carcassTop + Math.max(0, Number(above) || 0),
        // How far above its own carcass the piece has been taken. 0 is a piece
        // that finishes with the cabinet and blocks nothing new.
        above: Math.max(0, Number(above) || 0),
        depth: Number(unit.params?.depth) || 0,
        kind,
        unitId: unit.id,
        pieceId: id,
      });
    };

    for (const ep of unit.params?.end_panels || []) {
      const side = ep?.side === 'R' ? 'R' : 'L';
      const t = Number(ep?.thickness) > 0 ? Number(ep.thickness) : Number(unit.params?.front_t) || 0;
      add(side, t, ep?.top_mm, 'end-panel', ep?.id || null);
    }
    for (const [side, key, topKey] of [
      ['L', 'side_infill_left_mm', 'side_infill_left_top_mm'],
      ['R', 'side_infill_right_mm', 'side_infill_right_top_mm'],
    ]) {
      const width = Number(unit.params?.[key]) || 0;
      if (width < minInfill) continue;
      add(side, width, unit.params?.[topKey], 'infill', `${side}-infill`);
    }
  }
  return out;
}

/**
 * The attached verticals that reach a given LEVEL above the floor.
 *
 * ─── Turn 22 (CLAUDE.md F1.3) ───────────────────────────────────────────────
 * `ceilingVerticals` asked this question of the ceiling and only of the
 * ceiling, because until this turn the only thing that ran along the top of a
 * run was the top infill, and a top infill goes to the ceiling or stops short
 * of everything. A CORNICE stops at 2300 in a 2500 room: a filler taken to the
 * ceiling is in its way, one that finishes with its carcass is a metre below
 * it and is simply run over. So the level is a PARAMETER, `ceilingVerticals`
 * is the roomHeight case of it, and there is one obstacle rule rather than
 * two.
 */
export function verticalsReaching(units, level, profile) {
  const tolerance = profile.autoParts.topInfill.runGap;
  const height = Number(level) || 0;
  if (height <= 0) return [];
  return unitVerticals(units, profile)
    .filter((v) => v.top >= height - tolerance)
    .map(({ bottom, above, depth, ...rest }) => ({ ...rest, top: rest.top }));
}

export function ceilingVerticals(units, { roomHeight }, profile) {
  return verticalsReaching(units, roomHeight, profile);
}

// ─── A PANEL IS A WALL (turn 15, CLAUDE.md F7) ─────────────────────────────
//
// The owner's bug: take a base or tall unit's end panel up to the ceiling, and
// the hanging units drive straight through it — and the run dimensions do not
// see it either.
//
// It is turn 12's F7 bug one layer down. That one was "a wall unit ignores a
// TALL unit", and the fix was to stop asking about mounting level and start
// asking about HEIGHTS. This is the same question asked of a piece that is not
// a cabinet: a base unit's band stops at 900 and it is quite right that a wall
// unit may hang above it — but the panel screwed to its side has been taken to
// 2400, and 2400 is squarely in the band the wall units hang in.
//
// So the panel joins the obstacle set ON ITS OWN, over its own span of wall and
// nowhere else. Not the unit it belongs to: a 600 mm cabinet with an 18 mm
// panel blocks 18 mm at that height, and blocking 618 would stop a wall unit
// that has a clear 582 to hang in.

/**
 * The attached verticals that reach into a band of heights.
 *
 * @param {Array} verticals   from `unitVerticals`
 * @param {{from:number,to:number}} band   the band the moving piece occupies
 * @param {number} minOverlap  what merely TOUCHING is worth — the same profile
 *                             number two cabinets are judged by
 *                             (`editor.levelOverlapMm`), so a wall unit hung
 *                             exactly on top of a panel is a run finished flush
 *                             rather than a collision.
 */
export function verticalsInBand(verticals, band, minOverlap = 0) {
  const from = Number(band?.from) || 0;
  const to = Number(band?.to) || 0;
  return (verticals || []).filter((v) => {
    // A piece that stops with its own cabinet is not a NEW obstacle: the
    // cabinet is already in the set, panels and all (`footprintPads`).
    if (!(v.above > 0)) return false;
    return Math.min(v.top, to) - Math.max(v.bottom, from) > (Number(minOverlap) || 0);
  });
}

/**
 * The nearest ceiling-height vertical between a run's end and the wall.
 *
 * "Between" is measured from the run's CARCASS edge outward, so a run's own end
 * panel — which stands exactly there — is found by the same search as a tall
 * cabinet's panel three metres away. The element stops at its NEAR face, which
 * is the face the eye sees: running across the top of a finished surface would
 * put a joint at eye level, and running past it would put the piece in front of
 * something that is already the end of the run.
 */
function nearestVertical(verticals, side, { wall, carcassEdge, tolerance }) {
  let best = null;
  for (const v of verticals || []) {
    if (v.wall !== wall) continue;
    if (side === 'left') {
      if (v.to > carcassEdge + tolerance) continue;         // not on this side
      if (!best || v.to > best.face) best = { ...v, face: v.to };
    } else {
      if (v.from < carcassEdge - tolerance) continue;
      if (!best || v.from < best.face) best = { ...v, face: v.from };
    }
  }
  return best;
}

// ─── THE MITRED CORNER (turn 15, CLAUDE.md F6 / BACKLOG #51) ────────────────
//
// Owner: "the side infill still meets the top infill SQUARE."
//
// It does, and where it happens the two pieces are the two legs of a FRAME.
// A vertical filler running to the ceiling and the horizontal filler over the
// units beside it stand in ONE plane — the door plane, the same plane the end
// panels are in — and two flat members meeting at a right angle in one plane
// are mitred. That is the whole of it, and it is the same 45° the top infill's
// own corners have owned since turn 8; this extends it to the vertical member
// rather than forking it (engine/mitre.js `infillMitre`).
//
// ─── WHY THE SIZE IS THE TOP INFILL'S OWN HEIGHT ────────────────────────────
//
// A 45° cut has two equal legs. At this corner one leg runs down the side
// infill's inner edge and the other runs along the top infill's bottom edge, so
// the mitre is exactly `faceH` on both — the top infill is cut corner to corner
// and comes to a point, and the side infill loses a triangle with legs `faceH`
// from its top inner corner.
//
// AND THEREFORE IT NEEDS ROOM. The cut runs `faceH` ACROSS the side infill, so
// a filler narrower than the top infill is tall has no 45° to give: the cut
// would run off the far edge of it and out into the wall. That is a real
// constraint in a workshop and not a shortcut here — a 30 mm scribe filler
// under a 250 mm ceiling gap is butted, because the alternative is not a mitre,
// it is a very shallow angle. So the corner is mitred when the filler is at
// least as wide as the gap is tall, and butted otherwise, and a test holds both.

/**
 * The 45° mitre at one end of a top infill, or 0 for a square corner.
 *
 * THREE things have to be true, and each of them is a joiner's reason:
 *
 *   1. the thing in the way is a SIDE INFILL. `blockedBy` is what separates the
 *      two answers that both call themselves 'infill': a ceiling-height filler
 *      the element STOPS at (this one) and a short one it simply runs over on
 *      its way to the wall (`runEnd` case 3), which is a lap, not a corner.
 *   2. the two FINISH FLUSH. A filler standing 200 mm proud of a 40 mm top
 *      strip is a T and not the corner of anything; mitring it would cut a 45°
 *      into the filler nowhere near the piece it is supposed to be joining.
 *   3. there is ROOM for the cut — see the note above.
 *
 * @param {object} end          one `runEnd` answer
 * @param {number} faceH        the top infill's face height
 * @param {number} elementTop   where the top infill finishes, above the floor
 * @param {number} tolerance    how far out of flush still counts as flush
 */
export function infillCornerMitre(end, faceH, elementTop, tolerance = 0) {
  const h = Math.max(0, Number(faceH) || 0);
  if (h <= 0) return 0;
  if (!end || end.kind !== 'infill' || !end.blockedBy) return 0;
  const flush = Math.abs((Number(end.blockerTop) || 0) - (Number(elementTop) || 0))
    <= Math.max(0, Number(tolerance) || 0);
  if (!flush) return 0;
  return (Math.max(0, Number(end.blockerWidth) || 0) >= h) ? h : 0;
}

// ─── The four end conditions (CLAUDE.md F4) ───

/**
 * What the element runs into at one end of the run, and where it therefore
 * stops. The order is the order CLAUDE.md lists them in, and it is the order a
 * joiner checks in: is there a wall? is there anything standing all the way up
 * between me and it? is there a filler taking me to the wall? then it is open,
 * and it turns the corner.
 *
 * `verticals` (turn 14, F3) is the room's own list — `ceilingVerticals`. Left
 * out, the run answers from its own units, which is what every caller before
 * this turn effectively asked and is what keeps a bare call honest.
 *
 * @returns {{kind:'wall'|'infill'|'end-panel'|'open', x:number, blockedBy?:string}}
 */
export function runEnd(run, side, { wallWidth, roomHeight, verticals = null }, profile) {
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

  // 2 — ANYTHING standing all the way up between this end and the wall
  //     (turn 14, CLAUDE.md F3; #55). The element butts into its near face:
  //     that face is the finished surface at this end of the run, so running
  //     across its top would put a joint where the eye is and running past it
  //     would put the piece in front of the thing that finishes the run.
  //
  //     It is ONE rule and it covers both of the owner's cases, because in both
  //     of them the obstacle belongs to somebody else: the tall cabinet's
  //     ceiling-height end panel beside a run of wall units, and the scribe
  //     filler a tall unit's own infill used to cut straight through.
  const blocker = nearestVertical(
    verticals || ceilingVerticals(run.units, { roomHeight }, profile),
    side,
    { wall: run.wall, carcassEdge, tolerance },
  );
  if (blocker) {
    return {
      kind: blocker.kind,
      x: blocker.face,
      blockedBy: blocker.unitId,
      // How WIDE the thing in the way is, and how high it goes. Turn 15 (F6)
      // needs both: a 45° mitre runs `faceH` across the piece it is cut into,
      // so the corner can only be mitred when there is that much of it — and it
      // is only a CORNER at all when the two pieces finish flush.
      blockerWidth: Math.max(0, blocker.to - blocker.from),
      blockerTop: blocker.top,
    };
  }

  // 3 — a vertical L-infill that stops short of the ceiling: a scribe strip
  //     closing the gap. The element runs OVER it and finishes on the wall,
  //     which is what "ends on it" means for a piece lying on top. (One that
  //     DOES reach the ceiling was caught above, and is stood on rather than
  //     covered.)
  const infill = Number(unit.params?.[side === 'left' ? 'side_infill_left_mm' : 'side_infill_right_mm']) || 0;
  if (infill >= profile.autoParts.sideInfill.minWidth) return { kind: 'infill', x: wallAt };

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

  // ─── TURN 51 (CLAUDE.md F4): TWO EDGES, BECAUSE THERE ARE TWO QUESTIONS ──
  //
  // *"`runEndGap` measures from `paddedSpan`, which includes the fillers — so
  // the engine reads zero where the owner sees a gap … The gap is measured from
  // the CABINET BODY to the wall, ignoring the scribe filler that stands in it:
  // at a 40 filler and a 300 shadow, the bar says 340, and the filler returns
  // to its 40 once the run is shared out."*
  //
  // CAN A CABINET GO HERE?  That is measured to the PADDED edge, and it has to
  // be: a run's own end panel is a real board and nothing may stand in it.
  // `addPlusPoints` asks exactly this and `test/add-plus.test.js` holds it to
  // the answer — *"an END PANEL is part of the unit, so it eats into the gap"*.
  // `gap` / `from` / `to` are that measurement and are untouched.
  //
  // WHAT IS LEFT OVER?  That is measured from the CABINET BODY. What the joiner
  // sees at the end of a run is carcass to wall, and the scribe filler standing
  // in it is not a shadow — it is a piece that gets re-cut the moment the run
  // is shared out. Read off the padded edge instead, the app was short by
  // whatever board hung off the end unit, and at a panel taken right to the
  // wall it read ZERO where he could see forty.
  //
  // So both come back and each caller reads the one it means. `bodyGap` is the
  // share-out's, and nothing else's.
  const body = side === 'left'
    ? (Number(unit.position?.x_mm) || 0)
    : (Number(unit.position?.x_mm) || 0) + (Number(unit.params?.width) || 0);

  if (side === 'left') {
    const edge = run.left;
    // The nearest thing standing to the LEFT of this run. Nothing there means
    // the wall, which is at 0.
    const blocked = spans.filter((s) => s.right <= edge + 1e-6).map((s) => s.right);
    const from = blocked.length ? Math.max(...blocked) : 0;
    return {
      gap: Math.max(0, edge - from),
      from,
      to: edge,
      bodyGap: Math.max(0, body - from),
      bodyTo: body,
      bodyFrom: from,
      unit,
    };
  }
  const edge = run.right;
  const blocked = spans.filter((s) => s.left >= edge - 1e-6).map((s) => s.left);
  const to = blocked.length ? Math.min(...blocked) : (Number(wallWidth) || 0);
  return {
    gap: Math.max(0, to - edge),
    from: edge,
    to,
    bodyGap: Math.max(0, to - body),
    bodyFrom: body,
    bodyTo: to,
    unit,
  };
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
function runTopInfill(run, {
  wallWidth, roomHeight, frontFaceDepth, verticals = null, runCutOf = null,
}, profile) {
  const T = profile.autoParts.topInfill;
  // The face height a member asked for. A run is one height: the tallest
  // request wins, because the alternative is a step in the middle of the piece.
  const faceH = run.units.reduce((m, u) => Math.max(m, Number(u.params?.top_infill_mm) || 0), 0);
  if (faceH < T.minHeight) return null;

  const left = runEnd(run, 'left', { wallWidth, roomHeight, verticals }, profile);
  const right = runEnd(run, 'right', { wallWidth, roomHeight, verticals }, profile);
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
    // Turn 15 (CLAUDE.md F6): how far the 45° runs at each end, 0 for a square
    // corner. It travels with the run element because the piece that carries
    // the other half of the joint — the side infill — belongs to a DIFFERENT
    // unit at the far end of the run, and this is the one description of the
    // run every one of them already receives.
    mitre: {
      left: infillCornerMitre(left, faceH, run.top + faceH, T.runGap),
      right: infillCornerMitre(right, faceH, run.top + faceH, T.runGap),
    },
    // ─── TURN 53 (CLAUDE.md F3b): THE RUN'S OWN CEILING ────────────────────
    //
    // *"top infill po skosie w ogóle nie działa … jakoś dziwnie się rysuje
    // gdzieś poza ścianami."*
    //
    // The engine used to take its ceiling from the OWNER unit's own slope cut,
    // and the owner of a run is its FIRST cabinet — so a run whose rake falls
    // over the LAST one was drawn flat at room height for the whole length of
    // the slope, standing outside the wall. The line belongs to the RUN, so it
    // travels with the run element, exactly as the mitres above do and for the
    // same stated reason.
    //
    // It is the caller's `runCutOf` — the store's `slopeCutLine`, which is the
    // one function every other slope-cut piece in this app is cut from — asked
    // over this run's own span. `null` where the wall has no slope, which is
    // the gate: `computeCabinet` then reads nothing new and cuts what it cut.
    //
    // Points are in the OWNER's frame on x (the same datum `offset` uses) and
    // clear millimetres above the carcass floor on y, so `cabinet.js` needs no
    // conversion and cannot invent a second one.
    ceiling: runCutOf
      ? (runCutOf({
        run, from: left.x, to: right.x, owner, length,
      })?.pts || null)
      : null,
    unitIds: run.units.map((u) => u.id),
    // T53 (F6): the cabinets under the run, in the OWNER's frame, so a board
    // too long for the sheet can be split on a cabinet line and never in the
    // middle of one. `from`/`to` rather than a bare width, because the run
    // element's own x0 is `offset` and a piece may start before its first
    // cabinet (the reserved filler) — the boundaries are what a joint may land
    // on, and they are stated as boundaries.
    spans: run.units.map((u) => ({
      id: u.id,
      width: Number(u.params?.width) || 0,
      from: (Number(u.position?.x_mm) || 0) - ownerX,
    })),
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
export function runInfillParams(units, {
  walls, roomHeight, frontFaceDepthOf, runCutOf = null,
}, profile) {
  const depthOf = frontFaceDepthOf || (() => 0);
  const out = new Map(units.map((u) => [u.id, null]));
  // Worked out ONCE for the room and handed to every run (turn 14, F3): the
  // thing that stops a run of wall units is usually a TALL cabinet's panel, and
  // a tall cabinet is never in a wall-unit run.
  const verticals = ceilingVerticals(units, { roomHeight }, profile);
  for (const run of buildRuns(units, profile)) {
    const wallWidth = walls?.[run.wall]?.width ?? 0;
    const element = runTopInfill(run, {
      wallWidth,
      roomHeight,
      verticals,
      // T53 (F3b): the run's own stretch of the ceiling line, from the caller
      // that owns the room. Absent — every caller that predates tonight — the
      // element carries no ceiling and nothing downstream changes.
      runCutOf,
      frontFaceDepth: {
        left: depthOf(run.units[0]),
        right: depthOf(run.units[run.units.length - 1]),
      },
    }, profile);
    if (!element) {
      for (const u of run.units) out.set(u.id, null);
      continue;
    }
    // ─── Turn 15 (CLAUDE.md F6) ───
    // The other half of the mitre is cut into a SIDE INFILL, and a side infill
    // belongs to the unit at that END of the run — which is the owner at the
    // left and somebody else entirely at the right. So each end unit is told
    // about its own corner, and everyone in the middle is told about neither.
    const first = run.units[0];
    const last = run.units[run.units.length - 1];
    const sideMitreFor = (u) => ({
      left: u.id === first.id ? element.mitre.left : 0,
      right: u.id === last.id ? element.mitre.right : 0,
    });
    out.set(first.id, { ...element, sideMitre: sideMitreFor(first) });
    for (const u of run.units.slice(1)) {
      out.set(u.id, { role: 'member', ownerId: first.id, sideMitre: sideMitreFor(u) });
    }
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
    // ─── TURN 53 (CLAUDE.md F6): THE CABINETS UNDER IT, WITH THEIR WIDTHS ──
    //
    // *"dziel tak, żeby się równo z szafką którąś … łączenie zawsze równo z
    // szafką, a nie na środku szafki."*
    //
    // A joint may only land on a cabinet edge, so the piece has to know where
    // those edges are. The ids were already here; the WIDTHS travel with them
    // now, which is the whole of what `engine/strips.js` needs and is one more
    // field on a record the engine already receives.
    spans: segment.map((u) => ({ id: u.id, width: Number(u.params?.width) || 0 })),
  };
}

// ─── THE BOTTOM MASKING PANEL (turn 14, CLAUDE.md F5 / BACKLOG #45) ─────────
//
// What it is, in the owner's words: one continuous panel under a RUN of wall
// units, its length the sum of the run's cabinets and its depth the unit depth
// plus ten millimetres — the ten that every cabinet in this application stands
// off the wall (`profile.room.wallBackClearance`), so the panel hides the slot
// instead of stopping at the edge of it.
//
// It is the PLINTH, on the other end of the kitchen, and CLAUDE.md says so in
// as many words: "run-based like the plinth… reuse the run logic". So it is
// literally the same three functions with two differences a joiner would name:
//
//   IT IS FOR HANGING CABINETS. A wall unit has an underside somebody looks up
//   at from across the room; a base unit has a worktop on it and a plinth under
//   it, and neither is this piece.
//
//   IT HAS A DEPTH RATHER THAN A HEIGHT. A toe kick is a face standing on the
//   floor; this lies flat, so the number that is not its length is how far back
//   it reaches.
//
// Everything else is the plinth's: a decision per cabinet, adjacent decisions
// merged into one length, an end panel or a gap ending the segment.

/** Does this unit want a masking panel under it? */
function wantsMask(unit) {
  return unit?.params?.bottom_mask === true;
}

/**
 * How far PAST the carcass the panel reaches at the back.
 *
 * The workshop's own number, defaulting to the wall standoff — which is what
 * CLAUDE.md F5 asks for ("depth = unit depth + 10 mm") and why the ten is not
 * written anywhere. Two decisions that agree today: how far a cabinet stands
 * off a bowed wall, and how far past it this board reaches.
 */
export function maskDepthExtra(profile) {
  const stated = profile?.autoParts?.mask?.depthExtra;
  // `Number(null)` is 0, not NaN — so "nobody has said" has to be asked before
  // the number is read, or the default silently becomes zero and the piece
  // stops hiding the one thing it exists to hide.
  if (stated != null && Number.isFinite(Number(stated)) && Number(stated) >= 0) return Number(stated);
  return Math.max(0, Number(profile?.room?.wallBackClearance) || 0);
}

/**
 * The masking SEGMENTS of one run — the twin of `plinthSegments`.
 *
 * An end panel between two cabinets is a boundary for exactly the reason it is
 * one for the toe kick: it is a piece of board standing between them, and the
 * panel meets its inner face rather than running behind it.
 */
export function maskSegments(run) {
  if (run.mount !== 'wall') return [];
  const segments = [];
  let current = [];
  const close = () => { if (current.length) segments.push(current); current = []; };

  for (const unit of run.units) {
    if (!wantsMask(unit)) { close(); continue; }
    if (current.length) {
      const previous = current[current.length - 1];
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
 * The masking element for one segment: where it starts, how long it is, how
 * deep, and who carries it.
 *
 * Measured on the CARCASSES, like the plinth and for the same reason — an end
 * panel is the visible end of the run and the piece meets its inner face. The
 * DEPTH is the deepest cabinet in the segment plus the wall standoff: a segment
 * whose cabinets are not all one depth is closed by one board, and a board that
 * is short at the back leaves the slot the piece exists to hide.
 */
function segmentMask(segment, { backClearance = 0 } = {}) {
  if (!segment.length) return null;
  const first = segment[0];
  const last = segment[segment.length - 1];
  const left = Number(first.position?.x_mm) || 0;
  const right = (Number(last.position?.x_mm) || 0) + (Number(last.params?.width) || 0);
  const length = right - left;
  if (length <= 0) return null;
  const depth = segment.reduce((m, u) => Math.max(m, Number(u.params?.depth) || 0), 0)
    + Math.max(0, Number(backClearance) || 0);
  if (depth <= 0) return null;
  const owner = segment[0];
  return {
    role: 'owner',
    offset: left - (Number(owner.position?.x_mm) || 0),
    length,
    depth,
    unitIds: segment.map((u) => u.id),
  };
}

/**
 * The `run_mask` value for EVERY unit — the twin of `runPlinthParams`.
 *
 * The owner of each segment carries the geometry; everyone else carries a note.
 * A member with no note at all would fall back to a single-unit path and cut a
 * second, shorter panel inside the long one, which is the trap turn 8
 * documented for the top infill and turn 12 met again for the plinth.
 */
export function runMaskParams(units, profile) {
  const clearance = maskDepthExtra(profile);
  const out = new Map(units.map((u) => [u.id, null]));
  for (const run of buildRuns(units, profile)) {
    for (const segment of maskSegments(run)) {
      const element = segmentMask(segment, { backClearance: clearance });
      if (!element) continue;
      out.set(segment[0].id, element);
      for (const u of segment.slice(1)) out.set(u.id, { role: 'member', ownerId: segment[0].id });
    }
  }
  return out;
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
