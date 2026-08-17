// ─── THE TOP BOX (turn 36, CLAUDE.md F7) ────────────────────────────────────
//
// The owner's reason, verbatim: *"wysokie szafy nie wejdą do domu"* — a 2600
// mm wardrobe cannot be carried up a staircase and through a door, so it is
// BUILT as two: a main carcass, and a small one that rides on top of it.
//
// This module is the RELATIONSHIP and nothing else. The top box's carcass, its
// doors, its BOM and its CNC are the wardrobe kit's, unchanged — `WARDROBE_TOP`
// in engine/types.js is a wardrobe that does not stand on legs. What it needs
// that no other unit does is a link to the cabinet it stands on, and this is
// where that link is resolved, kept and audited.
//
// Pure functions — no store, no React, no three.js. The store calls
// `settleRiders` after anything that could have moved a main; `checks.js`
// calls `riderIsOrphaned` for rule #14.

import { getUnitType } from './types.js';
import { unitSpan } from './collision.js';
import { unitTop } from './runs.js';

/**
 * ─── TURN 36 (CLAUDE.md F7): THE TOP BOX SETTLES ON ITS MAIN ────────────────
 *
 * The owner's reason, verbatim: *"wysokie szafy nie wejdą do domu"* — a 2600
 * wardrobe cannot be carried up a staircase, so it is BUILT as two.
 *
 * A rider (`UNIT_TYPES[...].ridesOn`) does not have a position of its own to
 * defend: it takes its main's WALL, its main's X and its main's DEPTH, and it
 * hangs at exactly its main's TOP. So this is a pure re-derivation, run after
 * anything that could have moved a main, and it is idempotent — a settled
 * floor settles to itself.
 *
 * `params.rides_on` is the LINK and it is read first. Only a rider that has
 * never had one goes looking for a main by overlap; a rider whose main has
 * been deleted is ORPHANED and is left EXACTLY WHERE IT IS, because a box
 * that silently jumped to another cabinet when its own was removed would be
 * the app deciding something the joiner has to see. Check #14 says so in red.
 *
 * @returns {Array} the next units array — the same one when nothing moved.
 */
export function settleRiders(units, profile) {
  const byId = new Map(units.map((u) => [u.id, u]));
  let touched = false;
  // ─── TURN 37 (CLAUDE.md F5c/F5e): WHO IS CARRYING WHOM ────────────────────
  // Resolved ONCE, before anything is rewritten, because two of this turn's
  // corrections are about the HOST rather than the rider: the door under a top
  // box shortens (F5e) and the box may never intersect the carcass it stands
  // on (F5c). Both need the link read from the host's side, and a second pass
  // that walked the riders again would be a second answer to the same
  // question.
  const riddenBy = new Map();
  for (const u of units) {
    const type = getUnitType(u.type);
    if (!type.ridesOn) continue;
    const host = hostForRider(u, units, byId, type);
    if (host) riddenBy.set(host.id, u.id);
  }
  const next = units.map((u) => {
    const type = getUnitType(u.type);
    if (!type.ridesOn) {
      // A HOST. It carries the stamp that tells `doors.js topNeighbourDemand`
      // there is a carcass on its top edge — and loses it the moment the box
      // is taken away, which is F5e's "grows back" in one line.
      const rider = riddenBy.get(u.id) || null;
      if ((u.params?.ridden_by ?? null) === rider) return u;
      touched = true;
      const params = { ...u.params };
      if (rider) params.ridden_by = rider;
      // ABSENT, not null: a `ridden_by: null` on every cabinet in the app
      // would be a param nobody set, saved into every project file.
      else delete params.ridden_by;
      return { ...u, params };
    }
    const host = hostForRider(u, units, byId, type);
    if (!host) return u;                       // orphaned — left where it is
    const top = Math.round(unitTop(host, profile) * 100) / 100;
    const wall = host.position?.wall ?? 0;
    const x = host.position?.x_mm ?? 0;
    const depth = Number(host.params?.depth) || Number(u.params?.depth) || 0;
    const same = (u.params?.rides_on === host.id)
      && (u.position?.wall ?? 0) === wall
      && (u.position?.x_mm ?? 0) === x
      && Number(u.params?.depth) === depth
      && Number(u.params?.mount_height) === top;
    if (same) return u;
    touched = true;
    return {
      ...u,
      position: { ...u.position, wall, x_mm: x },
      // ─── T37-F5c: NO OVERLAP, EVER ────────────────────────────────────────
      // The owner: *"nakładają się jedna na drugą, a to jest niedopuszczalne w
      // naszym programie."* `mount_height` IS the clamp: it is written from
      // the host's own top on every settle, so the box's underside is the
      // main's top face and cannot be anywhere else. What T36 left open was
      // the SIDEWAYS case — a box that had been dragged off its main — and
      // that is closed by the same line, because x and wall are taken from
      // the host too. There is no state in which the two intersect.
      params: { ...u.params, rides_on: host.id, depth, mount_height: top },
    };
  });
  return touched ? next : units;
}

/**
 * T37-F5c: does this rider stand exactly on its host, or is it through it?
 *
 * `settleRiders` guarantees it never is — but a guard that only exists inside
 * the thing it guards cannot be reported, and the house grammar is that an
 * impossible placement goes RED and says so (check #14's own pattern). So the
 * question is asked separately, of the units as they stand, and check #15
 * answers it in the panel.
 *
 * @returns {{overlap:boolean, mm:number}} how far THROUGH the host it is
 */
export function riderOverlapMm(unit, units, profile) {
  const type = getUnitType(unit?.type);
  if (!type?.ridesOn) return { overlap: false, mm: 0 };
  const byId = new Map((units || []).map((u) => [u.id, u]));
  const host = hostForRider(unit, units || [], byId, type);
  if (!host) return { overlap: false, mm: 0 };
  const top = unitTop(host, profile);
  const base = Number(unit.params?.mount_height);
  if (!Number.isFinite(base)) return { overlap: false, mm: 0 };
  const through = top - base;
  return { overlap: through > 0.5, mm: Math.round(through * 100) / 100 };
}

/** The cabinet a rider stands on: its stored link, or the best overlap. */
function hostForRider(rider, units, byId, type) {
  const said = rider.params?.rides_on;
  if (said) {
    const named = byId.get(said);
    // A link that names a unit of the right family is the answer, moved or not.
    return named && getUnitType(named.type).family === type.ridesOn && !getUnitType(named.type).ridesOn
      ? named
      : null;
  }
  const span = unitSpan(rider);
  let best = null;
  let most = 0;
  for (const u of units) {
    if (u.id === rider.id) continue;
    const t = getUnitType(u.type);
    if (t.family !== type.ridesOn || t.ridesOn) continue;
    if ((u.position?.wall ?? 0) !== (rider.position?.wall ?? 0)) continue;
    const other = unitSpan(u);
    const overlap = Math.min(span.right, other.right) - Math.max(span.left, other.left);
    if (overlap > most) { most = overlap; best = u; }
  }
  return most > 0 ? best : null;
}

/** Is this rider standing on nothing? (Check #14's own question.) */
export function riderIsOrphaned(unit, units) {
  const type = getUnitType(unit?.type);
  if (!type?.ridesOn) return false;
  const said = unit.params?.rides_on;
  if (!said) return true;
  const host = (units || []).find((u) => u.id === said);
  return !host || getUnitType(host.type).family !== type.ridesOn;
}

