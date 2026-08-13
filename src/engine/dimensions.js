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
import { buildRuns } from './runs.js';

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

// ─── A RUN OF IDENTICAL CABINETS DIMENSIONS ONCE (turn 28, CLAUDE.md F8.2) ──
//
// The owner, walking turn 27: six identical base units in a row, six identical
// chains of the same six numbers standing beside each other. A drawing does not
// do that — it dimensions the piece once and lets the run repeat it — and six
// copies of one number is six things to read where there is one thing to know.
//
// The law: *a run of identical cabinets dimensions ONCE, on the outermost unit
// (right or left end of the run), not per cabinet. An END PANEL does NOT break
// the run; a DIFFERENT cabinet does.*
//
// ─── WHAT "IDENTICAL" MEANS, AND WHY IT IS ASKED THIS WAY ──────────────────
//
// Not "the same type", and not a list of params to compare: two cabinets are
// identical FOR THIS PURPOSE when the chain would print the same numbers. So
// the comparison is the numbers themselves — the signature below is exactly
// what the side and floor chains carry — and a kit that gains a number next
// turn is compared on it without anybody remembering to come back here.
//
// The END PANEL is excluded by construction: it is a piece attached to the run
// rather than a fact about the cabinet, which is CLAUDE.md's own sentence.

/**
 * The numbers one cabinet's chains print, as a comparable string.
 *
 * @param {object} result  computeCabinet() output
 * @returns {string}
 */
export function dimensionSignature(result) {
  const p = result?.params || {};
  const a = result?.assemblies || {};
  const n = (v) => Math.round((Number(v) || 0) * 100) / 100;
  const parts = [
    result?.type,
    n(p.width), n(p.height), n(p.depth),
    n(result?.derived?.internal_width),
    n(a.carcass?.legHeight),
    n(a.mountHeight),
    (a.shelves || []).map((s) => `${n(s.y)}:${s.locked ? 'f' : 'a'}`).join(','),
    (a.drawerFronts || []).map((d) => `${n(d.y)}x${n(d.h)}`).join(','),
    // The top infill is a piece of the CABINET and is dimensioned with it; the
    // END PANEL is not, and is left out on purpose (F8.2).
    (result?.panels || [])
      .filter((x) => x.part === 'INFILL' && x.meta?.side === 'top' && x.meta?.piece === 'face')
      .map((x) => n(x.box?.h)).join(','),
  ];
  return parts.join('|');
}

/**
 * WHICH cabinets actually draw their chains.
 *
 * Everything that is not in a run of its own equals draws as it always did; a
 * stretch of neighbours that would print the same numbers draws on ONE of them,
 * and that one is the stretch's outer end — the right-hand cabinet, so the
 * chain stands clear of the run rather than inside it.
 *
 * @param {object} args
 *   results  [{ unit, result }] — every cabinet in the room
 *   wanted   the ids the joiner has switched dimensions on for
 *   profile
 * @returns {Set<string>} the ids that draw
 */
export function dimensionCarriers({ results = [], wanted = [], profile }) {
  const on = new Set(wanted);
  if (on.size < 2) return on;
  const byId = new Map(results.map((e) => [e.unit.id, e]));
  const runs = buildRuns(results.map((e) => e.unit), profile);
  const carriers = new Set(on);
  const seen = new Set();

  for (const run of runs) {
    // The run in its own left-to-right order, narrowed to the cabinets that
    // were asked to show their numbers. A cabinet whose neighbour is switched
    // OFF is not standing beside a duplicate of itself as far as the drawing
    // is concerned, so the stretch is broken there too.
    const here = run.units.filter((u) => on.has(u.id));
    for (const u of here) seen.add(u.id);
    let i = 0;
    while (i < here.length) {
      const sig = dimensionSignature(byId.get(here[i].id)?.result);
      let j = i;
      // …and the stretch has to be CONSECUTIVE in the run: a different cabinet
      // between two identical ones breaks it, which is the owner's own clause.
      while (j + 1 < here.length
        && run.units.indexOf(here[j + 1]) === run.units.indexOf(here[j]) + 1
        && dimensionSignature(byId.get(here[j + 1].id)?.result) === sig) j += 1;
      // One chain for the stretch, on its outer (right-hand) end.
      for (let k = i; k < j; k += 1) carriers.delete(here[k].id);
      i = j + 1;
    }
  }
  // A cabinet no run claimed — turned, or standing on its own — keeps its own.
  for (const id of on) if (!seen.has(id)) carriers.add(id);
  return carriers;
}
