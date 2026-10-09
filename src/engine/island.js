// ─── T75 · PART B · THE ISLAND: WHAT STANDS WHERE, AND WHAT IS REFUSED ─────
//
// The owner, 9.10.2026: *"twoja droga, plus dodawanie szafek po bokach lub end
// panele, w całości."*  The island's geometry is `engine/room.js`'s (the record,
// its core, its four faces as wall records). This module answers the questions
// a room alone cannot: what an island would stand ON if it moved (Room refuses
// first), and which faces are empty, so the panel automat (F10) and the one
// slab over the whole (F11) read one answer.
//
// Pure. Reads units, never writes them.

import {
  boxCorners, islandCorners, migrateIsland, polygonsOverlap, roomBoxes, roomIslands, roomWalls,
  pointInPolygon, realWalls,
} from './room.js';
import { unitFootprint } from './collision.js';
import { wallGapOf } from './runs.js';
import { getUnitType } from './types.js';

/** The island's numbers, the profile's (`island.defaults`, T75 proposed). */
function islandSpec(profile) {
  const D = profile?.island?.defaults || {};
  return {
    w: Number(D.w) > 0 ? Number(D.w) : 1800,
    d: Number(D.d) > 0 ? Number(D.d) : 900,
  };
}

/** A new island record, centred in the room, at the profile's size. */
export function newIsland(room, profile, id) {
  const walls = realWalls(room);
  const xs = walls.map((w) => w.start.x);
  const ys = walls.map((w) => w.start.y);
  const { w, d } = islandSpec(profile);
  return migrateIsland({
    id,
    cx: (Math.min(...xs) + Math.max(...xs)) / 2,
    cy: (Math.min(...ys) + Math.max(...ys)) / 2,
    w,
    d,
    rotation: 0,
  });
}

/** The plan footprint of one unit, in whatever wall or face it stands on. */
function footprintOf(unit, walls, profile) {
  const wall = walls?.[unit?.position?.wall ?? 0];
  if (!wall) return null;
  return unitFootprint({
    wall,
    x: Number(unit.position?.x_mm) || 0,
    width: Number(unit.params?.width) || 0,
    depth: Number(unit.params?.depth) || 0,
    rotation: Number(unit.position?.rotation_deg) || 0,
    backInset: wallGapOf(unit, profile),
  });
}

/** Is this unit standing on one of this island's faces? */
function onIsland(unit, walls, islandId) {
  return walls?.[unit?.position?.wall ?? 0]?.island === islandId;
}

const labelOf = (u) => u?.params?.unit_num || u?.id || 'a cabinet';

/**
 * ROOM REFUSES FIRST. What the islands of `room` would stand on, as a plain
 * sentence naming the obstacle, or null when every island is clear. `units`
 * must already stand in `room`'s frame (`rehomeIslandUnits`). The core and every
 * cabinet on its faces are measured against every other cabinet, every box of
 * the plan and every other island, and the cabinets on the faces must stand
 * inside the room as the core does.
 */
export function islandClash({ room, units = [], profile }) {
  const walls = roomWalls(room);
  const polygon = realWalls(room).map((w) => w.start);
  const islands = roomIslands(room);
  for (let k = 0; k < islands.length; k += 1) {
    const island = islands[k];
    const name = `Island ${k + 1}`;
    const core = islandCorners(island);
    const mine = units.filter((u) => onIsland(u, walls, island.id) && !getUnitType(u.type)?.freePanel);
    const bodies = [{ poly: core, what: name }, ...mine.map((u) => ({ poly: footprintOf(u, walls, profile), what: labelOf(u) }))]
      .filter((b) => b.poly);
    for (const b of bodies.slice(1)) {
      if (!b.poly.every((c) => pointInPolygon(c, polygon))) {
        return `${name} would carry ${b.what} through a wall of the room: move the island clear first.`;
      }
    }
    const obstacles = [
      ...units
        .filter((u) => !onIsland(u, walls, island.id) && !getUnitType(u.type)?.freePanel)
        .map((u) => ({ poly: footprintOf(u, walls, profile), what: labelOf(u) })),
      ...roomBoxes(room).map((b) => ({ poly: boxCorners(b), what: 'a box in the plan' })),
      ...islands.filter((o) => o.id !== island.id).map((o) => ({
        poly: islandCorners(o), what: `island ${islands.indexOf(o) + 1}`,
      })),
    ].filter((o) => o.poly);
    for (const b of bodies) {
      for (const o of obstacles) {
        if (polygonsOverlap(b.poly, o.poly)) {
          return b.what === name
            ? `${name} would stand on ${o.what}: move it clear first.`
            : `${name} would carry ${b.what} into ${o.what}: move it clear first.`;
        }
      }
    }
  }
  return null;
}

