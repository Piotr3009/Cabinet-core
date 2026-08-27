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
/**
 * ─── TURN 53 (CLAUDE.md F5): ONE MAIN CARRIES A LIST ───────────────────────
 *
 * The owner, 27.08.2026: *"top box łamią zasadę — nakłada się jeden na drugi,
 * a nie może. poza tym jak dodaję plusik po lewej, to on się nie pojawia po
 * lewej, tylko jeden w drugim."*
 *
 * The model was 1 MAIN = 1 RIDER AT THE MAIN'S OWN X, and every symptom he
 * describes is one of its three clauses:
 *
 *   `settleRiders` wrote the rider `x = host.x_mm`, hard — so a box placed
 *   beside another snapped back onto the host's x on the very next settle;
 *   `riddenBy` was a Map host → ONE rider, so a second silently shadowed the
 *   first and the door under the main was told about only one of them;
 *   `hostForRider` handed every box on the span the same host — so two boxes
 *   got one x and stood EXACTLY INSIDE EACH OTHER.
 *
 * The model turns over. A rider keeps ITS OWN X, clamped inside the host's
 * span; a host carries a LIST; and rider–rider overlap is forbidden by the
 * same clamp discipline cabinets already have — the house law, 27.08: *"nie
 * pozwalamy na nachodzenie się materiałów na siebie."*  `settleRiders` still
 * snaps Y to the host's top and rides the host's moves. It stops confiscating
 * x, and that one line is the whole of *"jeden w drugim"*.
 */

/** The stretch of wall a host's riders may stand on: its own carcass span. */
export function hostSpan(host) {
  const x = Number(host?.position?.x_mm) || 0;
  const w = Math.max(0, Number(host?.params?.width) || 0);
  return { left: x, right: x + w, width: w };
}

/**
 * Where this host's riders end up, left to right, none overlapping and none
 * hanging past an edge.
 *
 * Deterministic and IDEMPOTENT, which is what lets `settleRiders` run on every
 * mutation: the riders are taken in the order they already stand in (ties
 * broken by id), each is put no further left than the one before it, and each
 * is clamped inside the host. Settled riders settle to themselves.
 *
 * @returns {Map<string, number>} rider id → its x on the wall
 */
/**
 * Where this box stands ON its main — the number that IS its position.
 *
 * Module-local on purpose: the offset is this file's own state and every reader
 * of it is in this file. A second module that computed one would be the very
 * two-sources fault F5 is about.
 */
function riderOffset(host, rider) {
  const said = Number(rider?.params?.rides_offset_mm);
  if (Number.isFinite(said)) return Math.max(0, said);
  // A project saved before tonight has no offset — its box's own x against the
  // host it is standing on IS the offset, which is what opens a T52 file with
  // the box exactly where it was.
  const x = Number(rider?.position?.x_mm);
  return Number.isFinite(x) ? Math.max(0, x - hostSpan(host).left) : 0;
}

export function riderLayout(host, riders) {
  const span = hostSpan(host);
  const order = [...riders].sort((a, b) => {
    const av = riderOffset(host, a);
    const bv = riderOffset(host, b);
    return av - bv || String(a.id).localeCompare(String(b.id));
  });
  const out = new Map();
  let cursor = 0;
  for (const r of order) {
    const w = Math.max(0, Number(r.params?.width) || 0);
    // Inside the host, and never back over the box already placed. A host too
    // narrow for what stands on it packs them from the left and lets check #15
    // do the talking — the house way: refuse and report, never silently stack.
    const highest = Math.max(cursor, span.width - w);
    const off = Math.min(Math.max(riderOffset(host, r), cursor), Math.max(cursor, highest));
    out.set(r.id, {
      offset: Math.round(off * 100) / 100,
      x: Math.round((span.left + off) * 100) / 100,
    });
    cursor = off + w;
  }
  return out;
}

/** 'L' or 'left' — both conventions reach this module (the plus says one, the
 * Library the other), and a comparison that knew only one silently ignored the
 * side it was asked for. */
export const isLeftSide = (side) => side === 'L' || side === 'left';

/** Is there room for one more box of `width` on this host, beside `beside`? */
export function riderSlot(host, riders, width, { beside = null, side = null } = {}) {
  const span = hostSpan(host);
  const w = Math.max(0, Number(width) || 0);
  const placed = [...riders]
    .map((r) => ({
      id: r.id,
      left: Number(r.position?.x_mm) || span.left,
      right: (Number(r.position?.x_mm) || span.left) + (Number(r.params?.width) || 0),
    }))
    .sort((a, b) => a.left - b.left);
  // The gaps on this host, left to right — including the two at its ends.
  const gaps = [];
  let cursor = span.left;
  for (const p of placed) {
    if (p.left - cursor > 1e-6) gaps.push({ from: cursor, to: p.left });
    cursor = Math.max(cursor, p.right);
  }
  if (span.right - cursor > 1e-6) gaps.push({ from: cursor, to: span.right });

  const anchor = beside
    ? placed.find((p) => p.id === beside.id) || null
    : null;
  const wanted = anchor && side
    ? gaps.filter((g) => (isLeftSide(side)
      ? Math.abs(g.to - anchor.left) < 1e-6
      : Math.abs(g.from - anchor.right) < 1e-6))
    : gaps;
  const fits = (wanted.length ? wanted : []).find((g) => g.to - g.from >= w - 1e-6);
  if (!fits) return null;
  // Snug against the box it was asked for: on its left, hard up to it.
  return Math.round((isLeftSide(side) ? fits.to - w : fits.from) * 100) / 100;
}

/** How wide the free stretch on this host is, on the asked-for side. */
export function riderFreeWidth(host, riders, { beside = null, side = null } = {}) {
  const span = hostSpan(host);
  const placed = [...riders]
    .map((r) => ({
      id: r.id,
      left: Number(r.position?.x_mm) || span.left,
      right: (Number(r.position?.x_mm) || span.left) + (Number(r.params?.width) || 0),
    }))
    .sort((a, b) => a.left - b.left);
  const gaps = [];
  let cursor = span.left;
  for (const p of placed) {
    if (p.left - cursor > 1e-6) gaps.push({ from: cursor, to: p.left });
    cursor = Math.max(cursor, p.right);
  }
  if (span.right - cursor > 1e-6) gaps.push({ from: cursor, to: span.right });
  const anchor = beside ? placed.find((p) => p.id === beside.id) || null : null;
  const wanted = anchor && side
    ? gaps.filter((g) => (isLeftSide(side)
      ? Math.abs(g.to - anchor.left) < 1e-6
      : Math.abs(g.from - anchor.right) < 1e-6))
    : gaps;
  const best = (wanted.length ? wanted : gaps)
    .reduce((m, g) => Math.max(m, g.to - g.from), 0);
  return Math.round(best * 100) / 100;
}

/** The narrowest box a workshop will hang doors on (`wardrobe.topBox.minWidth`). */
export function minRiderWidth(profile) {
  return Math.max(0, Number(profile?.wardrobe?.topBox?.minWidth) || 0);
}

/** Everything `ridden_by` may be, as the list it is now. */
export function riddenList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  // T53: a project saved before tonight carries ONE id as a bare string.
  return value ? [String(value)] : [];
}

const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

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
  //
  // T53 (F5): a LIST, because one main may carry several boxes side by side. A
  // Map that held one silently shadowed the second, and the door under the
  // main was told about only one of them.
  const riddenBy = new Map();
  for (const u of units) {
    const type = getUnitType(u.type);
    if (!type.ridesOn) continue;
    const host = hostForRider(u, units, byId, type);
    if (!host) continue;
    const list = riddenBy.get(host.id) || [];
    list.push(u);
    riddenBy.set(host.id, list);
  }
  // …and where each host's boxes stand, resolved once for the whole host so no
  // two of them can be given the same millimetre.
  const placement = new Map();
  for (const [hostId, riders] of riddenBy) {
    const host = byId.get(hostId);
    if (!host) continue;
    for (const [id, at] of riderLayout(host, riders)) placement.set(id, at);
  }

  const next = units.map((u) => {
    const type = getUnitType(u.type);
    if (!type.ridesOn) {
      // A HOST. It carries the stamp that tells `doors.js topNeighbourDemand`
      // there is a carcass on its top edge — and loses it the moment the box
      // is taken away, which is F5e's "grows back" in one line.
      const riders = (riddenBy.get(u.id) || []).map((r) => r.id);
      if (sameList(riddenList(u.params?.ridden_by), riders)) return u;
      touched = true;
      const params = { ...u.params };
      if (riders.length) params.ridden_by = riders;
      // ABSENT, not null: a `ridden_by: null` on every cabinet in the app
      // would be a param nobody set, saved into every project file.
      else delete params.ridden_by;
      return { ...u, params };
    }
    const host = hostForRider(u, units, byId, type);
    if (!host) return u;                       // orphaned — left where it is
    const top = Math.round(unitTop(host, profile) * 100) / 100;
    const wall = host.position?.wall ?? 0;
    // ─── T53 (F5): ITS OWN X, CLAMPED — NOT THE HOST'S ────────────────────
    // *"jak dodaję plusik po lewej, to on się nie pojawia po lewej, tylko
    // jeden w drugim."*  This line used to read `host.position.x_mm`, so every
    // settle dragged every box back onto the main's own left edge and two
    // boxes stood exactly inside each other. The clamp is `riderLayout`'s and
    // it is the same discipline a cabinet's own move already keeps: inside the
    // thing it stands on, and never over its neighbour.
    //
    // …and the OFFSET is the state, not the absolute x. A box keeps its place
    // ON its main: move the main and the box goes with it, at the same offset;
    // drag the box and the offset is what the drag wrote. Two readings of one
    // number were what let a settle undo a move.
    const at = placement.get(u.id) || {
      offset: riderOffset(host, u),
      x: (host.position?.x_mm ?? 0) + riderOffset(host, u),
    };
    const x = at.x;
    const depth = Number(host.params?.depth) || Number(u.params?.depth) || 0;
    const same = (u.params?.rides_on === host.id)
      && (u.position?.wall ?? 0) === wall
      && (u.position?.x_mm ?? 0) === x
      && Number(u.params?.rides_offset_mm) === at.offset
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
      // main's top face and cannot be anywhere else.
      //
      // T53 (F5) keeps that vertical clamp exactly and adds the HORIZONTAL one
      // beside it: the box stands inside its main's span and never over
      // another box. What T36 wrote instead — the host's own x, hard — was not
      // a clamp at all: it was a confiscation, and it is what made two boxes
      // one box.
      params: {
        ...u.params, rides_on: host.id, depth, mount_height: top, rides_offset_mm: at.offset,
      },
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

