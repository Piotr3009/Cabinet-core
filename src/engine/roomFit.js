// ─── NOTHING IS BUILT BIGGER THAN THE ROOM (turn 50, CLAUDE.md F3) ──────────
//
// The owner, 25.08.2026: *"dlaczego pozwala system dodawać top box powyżej
// rozmiaru pokoju? to powinno być blokada."*
//
// He is right, and the top box is the case that makes it obvious: a box is a
// RIDER — it stands on a wardrobe's own top — so its ceiling is the room's
// height less whatever it is standing on, and nothing in the app was asking
// that question at the moment a number was accepted.
//
// ─── WHY THIS IS A REFUSAL AND NOT A CLAMP ──────────────────────────────────
//
// CLAUDE.md: *"The guard sits where the number is ACCEPTED (the parameter panel
// and the size modal), so it can refuse with a reason, and the reason names the
// room's figure."*  A clamp is the right answer for a number the APP moved — a
// project-wide height push, a drag against a neighbour — and `clampUnitHeight`
// keeps doing exactly that, untouched. This is the other case: a joiner has
// TYPED 2600 into a 2400 room, and quietly building him a 2300 cabinet is the
// app answering a question he did not ask.
//
// So: the value is not applied, and the sentence names the room's own figure.
//
// ─── AND AN EXISTING PROJECT OPENS UNCHANGED ────────────────────────────────
//
// *"An existing project that already contains such a unit opens unchanged and
// says so in Check, rather than being silently resized under the owner's
// hands."*  `roomFitFaults` is that half: it REPORTS, it never re-cuts, and
// `engine/checks.js` rule #20 is where the joiner reads it.
//
// Pure functions — no React, no store, no three.js.

import { getUnitType } from './types.js';
import { roomWalls } from './room.js';
import { maxDepthOnWall } from './collision.js';
import { unitTop, standsOnLegHeight, impliedLegHeight } from './runs.js';

const round1 = (v) => Math.round(Number(v) || 0);

/**
 * How far off the floor this unit's carcass starts — the same derivation
 * `projectStore.floorYOf` makes, and for the same three cases.
 *
 * A RIDER is the case the owner found: a top box hangs at its host's own top
 * (`topBox.settleRiders` writes `mount_height` from it), so the ceiling over it
 * is the room less that. Handing the host in is how this stays a pure function
 * — the caller knows the units, this knows the rule.
 */
export function floorOf(unit, profile, { host = null, patch = null } = {}) {
  const type = getUnitType(unit?.type);
  if (type.mount === 'wall') {
    // A rider's mounting height IS its host's top and is re-derived on every
    // settle, so the host wins over a stored number that may be one edit stale.
    if (type.ridesOn && host) return Math.max(0, unitTop(host, profile));
    const said = patch?.mount_height ?? unit?.params?.mount_height;
    return Math.max(0, Number(said) || Number(profile?.wallUnit?.defaults?.mountHeight) || 0);
  }
  if (!standsOnLegHeight(type)) return 0;
  return Math.max(0, impliedLegHeight(
    { leg_height: patch?.leg_height ?? unit?.params?.leg_height },
    type,
    profile,
  ));
}

/**
 * The tallest this unit may be, standing where it stands.
 *
 * `Infinity` where there is no room to measure against, which is a bare
 * `computeCabinet` and every fixture: a rule with nothing to compare to does
 * not get to refuse anything.
 */
export function headroomMm(unit, room, profile, { host = null, patch = null } = {}) {
  const roomH = Number(room?.height) || 0;
  if (!(roomH > 0)) return Infinity;
  return Math.max(0, roomH - floorOf(unit, profile, { host, patch }));
}

/**
 * What is wrong with the size this unit is being GIVEN — or null.
 *
 * One shape for all three dimensions, because the sentence is the same shape:
 * the room's own figure, then what will not fit in it.
 *
 * @param {object} args
 *   unit    the unit as it stands
 *   patch   what is being typed into it — { width?, height?, depth? }
 *   room    project.room
 *   host    the cabinet a rider stands on, when it is one
 *   profile
 * @returns {{ key:'height'|'width'|'depth', limit:number, wanted:number,
 *             message:string }|null}
 */
export function roomFitRefusal({
  unit, patch = {}, room = null, host = null, profile = null,
} = {}) {
  if (!unit || !room) return null;
  const label = unit.params?.unit_num ? `${unit.params.unit_num}: ` : '';

  // ── HEIGHT ──
  if (patch.height != null) {
    const wanted = Number(patch.height) || 0;
    const head = headroomMm(unit, room, profile, { host, patch });
    if (Number.isFinite(head) && wanted > head + 1e-6) {
      const roomH = round1(room.height);
      const stands = round1(floorOf(unit, profile, { host, patch }));
      return {
        key: 'height',
        limit: round1(head),
        wanted: round1(wanted),
        message: stands > 0
          ? `${label}the room is ${roomH} mm and this stands ${stands} mm off the floor — ${round1(wanted)} mm will not fit. ${round1(head)} mm is what is left.`
          : `${label}the room is ${roomH} mm — a ${round1(wanted)} mm unit will not fit.`,
      };
    }
  }

  // ── WIDTH ──
  //
  // The wall it stands on, and only that wall: a cabinet is not "too wide for
  // the room", it is too wide for the wall it is against.
  if (patch.width != null) {
    const walls = roomWalls(room);
    const wall = walls[unit.position?.wall ?? 0] || walls[0];
    const wallW = Number(wall?.width) || 0;
    const wanted = Number(patch.width) || 0;
    if (wallW > 0 && wanted > wallW + 1e-6) {
      return {
        key: 'width',
        limit: round1(wallW),
        wanted: round1(wanted),
        message: `${label}wall ${(unit.position?.wall ?? 0) + 1} is ${round1(wallW)} mm — a ${round1(wanted)} mm unit will not fit on it.`,
      };
    }
  }

  // ── DEPTH ──
  //
  // How far the room reaches back from this wall, which for an L-shaped room is
  // not the same number on every wall. `maxDepthOnWall` is the collision
  // module's own and is what the drag already stops at.
  if (patch.depth != null) {
    const walls = roomWalls(room);
    const wall = walls[unit.position?.wall ?? 0] || walls[0];
    const wanted = Number(patch.depth) || 0;
    const reach = wall
      ? maxDepthOnWall({
        wall,
        walls,
        x: Number(unit.position?.x_mm) || 0,
        width: Number(patch.width ?? unit.params?.width) || 0,
      })
      : Infinity;
    if (Number.isFinite(reach) && reach > 0 && wanted > reach + 1e-6) {
      return {
        key: 'depth',
        limit: round1(reach),
        wanted: round1(wanted),
        message: `${label}the room reaches ${round1(reach)} mm back from wall ${(unit.position?.wall ?? 0) + 1} — a ${round1(wanted)} mm deep unit will not fit.`,
      };
    }
  }

  return null;
}

/**
 * Every unit that is ALREADY bigger than its room — for Check, never for a
 * resize.
 *
 * The list is built by asking `roomFitRefusal` the same question about the size
 * a unit already HAS, so an existing project and a typed number are judged by
 * one rule and can never disagree.
 *
 * @param {Array} units
 * @param {object} room
 * @param {object} profile
 * @returns {Array<{unit, key, limit, wanted, message}>}
 */
export function roomFitFaults(units, room, profile) {
  const byId = new Map((units || []).map((u) => [u.id, u]));
  const out = [];
  for (const unit of units || []) {
    const host = unit.params?.rides_on ? byId.get(unit.params.rides_on) || null : null;
    const patch = {
      height: unit.params?.height,
      width: unit.params?.width,
      depth: unit.params?.depth,
    };
    const fault = roomFitRefusal({
      unit, patch, room, host, profile,
    });
    if (fault) out.push({ unit, ...fault });
  }
  return out;
}

/**
 * A rider BORN into the room it is going into (CLAUDE.md F3, the owner's own
 * case).
 *
 * A top box has never been typed when it is placed — it arrives with the
 * profile's 500 — so refusing the add outright would refuse a cabinet nobody
 * asked a bad question about. It is BORN FITTED instead, exactly as T37 made it
 * born matched to its host's width, and the add is refused only when what is
 * left will not hold the type's own minimum.
 *
 * @returns {{ height:number|null, refuse:string|null }}
 */
export function riderBornHeight({
  unit, host, room, profile, minHeight = 0,
}) {
  const head = headroomMm(unit, room, profile, { host });
  if (!Number.isFinite(head)) return { height: null, refuse: null };
  const wanted = Number(unit?.params?.height) || 0;
  if (wanted <= head + 1e-6) return { height: null, refuse: null };
  const floor = Math.max(0, Number(minHeight) || 0);
  if (head < floor) {
    return {
      height: null,
      refuse: `The room is ${round1(room?.height)} mm and this stands ${round1(floorOf(unit, profile, { host }))} mm off the floor — there is only ${round1(head)} mm left, and a top box needs ${round1(floor)}.`,
    };
  }
  return { height: round1(head), refuse: null };
}
