// ─── Distance measurements on the plan ───
// The numbers a joiner writes on a drawing before ordering board: how far the
// first unit stands from the corner, what the gap between two units is, and how
// much wall is left at the far end (CLAUDE.md turn 3, phase 8).
//
// Pure functions of numbers, like every other engine module: this decides WHAT
// is measured and HOW MUCH it is, and knows nothing about arrowheads, sprites
// or the camera. The 3D layer draws what it is handed.

import { unitPlanSpan } from './collision.js';
import { formatMm } from './format.js';

/**
 * Every gap worth an arrow, for one wall and one mounting level.
 *
 * Units are measured by their FOOTPRINT along the wall (engine/collision.js),
 * so a unit turned side-to-wall is measured across the stretch of wall it
 * really covers, not across its nominal width — the same span the collision
 * clamp uses, so the picture and the rule can never disagree.
 *
 * @param {object} args
 *   wall     the wall being measured, from engine/room.js roomWalls()
 *   units    [{ id, x_mm, width, depth, rotation, label, y }] on THIS wall,
 *            at ONE mounting level (a wall unit hangs above a base unit; the
 *            distance between them is not a gap anyone measures)
 *   minGap   ignore anything narrower — two units butted together are touching,
 *            not spaced, and a 0 mm arrow is noise
 * @returns {Array<{kind:'wall'|'unit', from:number, to:number, mm:number,
 *                  y:number, depth:number, between:[string|null,string|null]}>}
 *          `from`/`to` are distances along the wall from its start corner;
 *          `depth` is how far into the room the deeper neighbour reaches, so
 *          the line can be drawn clear of the units instead of through them.
 */
export function wallDistances({ wall, units = [], minGap = 2 }) {
  if (!wall) return [];
  const spans = units
    .map((u) => {
      const span = unitPlanSpan({
        wall,
        x: Number(u.x_mm) || 0,
        width: Number(u.width) || 0,
        depth: Number(u.depth) || 0,
        rotation: Number(u.rotation) || 0,
        // Turn 7 (CLAUDE.md F5): a unit given a back inset stands off the wall,
        // so the line is drawn clear of where it really is.
        backInset: Number(u.backInset) || 0,
      });
      return { ...span, label: u.label ?? null, y: Number(u.y) || 0, id: u.id };
    })
    .sort((a, b) => a.left - b.left);

  if (!spans.length) return [];

  const out = [];
  const push = (kind, from, to, near) => {
    const width = to - from;
    if (!(width >= minGap)) return;
    const ends = near.filter(Boolean);
    out.push({
      kind,
      from,
      to,
      mm: width,
      y: ends.reduce((sum, s) => sum + s.y, 0) / ends.length,
      depth: Math.max(...ends.map((s) => s.far)),
      between: [near[0]?.label ?? null, near[1]?.label ?? null],
    });
  };

  // Corner → first unit.
  push('wall', 0, spans[0].left, [null, spans[0]]);

  for (let i = 1; i < spans.length; i += 1) {
    const a = spans[i - 1];
    const b = spans[i];
    // Overlapping units are a collision, not a gap — the clamp stops those and
    // unitIssues() reports them; measuring a negative distance would only add
    // a second, quieter complaint.
    push('unit', a.right, b.left, [a, b]);
  }

  // Last unit → far corner.
  const last = spans[spans.length - 1];
  push('wall', last.right, wall.width, [last, null]);

  return out;
}

/**
 * Every measurement in the room: each wall, each mounting level, in one list.
 *
 * @param {object} args
 *   walls  roomWalls(room)
 *   units  [{ id, wall, x_mm, width, depth, rotation, level, label, y }]
 *          `level` separates base units from wall units; `y` is the height the
 *          arrow floats at, which only the viewer can decide.
 */
export function roomDistances({ walls = [], units = [], minGap = 2 }) {
  const out = [];
  for (const wall of walls) {
    const here = units.filter((u) => (Number(u.wall) || 0) === wall.index);
    const levels = [...new Set(here.map((u) => u.level ?? 'floor'))];
    for (const level of levels) {
      const marks = wallDistances({ wall, units: here.filter((u) => (u.level ?? 'floor') === level), minGap });
      for (const m of marks) out.push({ ...m, wall: wall.index, level });
    }
  }
  return out;
}

/**
 * The measurement caption, through the app's one millimetre rule (BACKLOG #33).
 * A 196.5 mm gap says 196.5 — rounding it to 197 on the drawing was how a
 * half-millimetre disappeared between the arrow and the cut list.
 */
export function distanceLabel(mmValue) {
  return formatMm(mmValue, { unit: true });
}
