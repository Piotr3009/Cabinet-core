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
  const next = units.map((u) => {
    const type = getUnitType(u.type);
    if (!type.ridesOn) return u;
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
      params: { ...u.params, rides_on: host.id, depth, mount_height: top },
    };
  });
  return touched ? next : units;
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

