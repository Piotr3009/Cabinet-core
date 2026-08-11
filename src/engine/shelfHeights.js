// ─── ONE TRUTH FOR SHELF HEIGHTS (turn 21, CLAUDE.md F10) ───────────────────
//
// The owner's screenshot: the panel said 860 and the 3-D chip said 842. Both
// were about the same shelf and both were right about something — one measured
// from the cabinet's OUTER bottom, the other the CLEAR LIGHT under the board —
// and nobody thinks in either mix. A joiner thinks in the space between.
//
//   "ONE derivation, two displays: the panel field shows the shelf's underside
//    height above the INTERIOR floor (top face of the carcass bottom); the 3-D
//    chips show the CLEAR LIGHT between neighbours (floor→shelf, shelf→shelf,
//    shelf→top). Both come from the same function; they can never disagree
//    again."
//
// This is that function, and the reason it is one file rather than a helper in
// each view is that there were three answers before it: the "all dims" chip
// printed the raw stored number, the hover ladder printed clear openings from
// the interior floor, and the live drag readout printed the distance to the
// NEIGHBOUR'S STORED FACE — which is one board thickness bigger than the gap it
// was drawn across. Three readouts, three datums, one shelf.
//
// ─── STORAGE DOES NOT MOVE (F10.2) ─────────────────────────────────────────
//
// `pos_mm` still means exactly what it has meant since turn 1: the shelf's
// UNDERSIDE, in the cabinet's own frame, whose zero is the outside of the
// carcass bottom. Every engine formula, every drilling row, every saved project
// is untouched. What this file does is MAP that number in and out for the two
// places a person reads it:
//
//     stored 860  ──fieldFromPos──▶  842  shown in the field
//     typed  842  ──posFromField──▶  860  stored
//
// so an existing project opens with every shelf exactly where it was, and only
// the numbers SHOWN change meaning.
//
// Pure functions — no React, no store, no profile import.

/**
 * The INTERIOR FLOOR: the top face of the carcass bottom, in cabinet mm.
 *
 * It is the board thickness and nothing else, deliberately. A drawer stack or a
 * rail partitioner higher up closes off part of the interior, and the height of
 * a shelf is still measured from the floor of the box — F10.1 says "top face of
 * the carcass bottom" in as many words, and a datum that moved when a drawer
 * was added would be a fourth answer rather than the one.
 */
export function interiorFloor(boardT) {
  return Math.max(0, Number(boardT) || 0);
}

/**
 * What the FIELD shows for a stored position: the underside, above the
 * interior floor.
 *
 * @param {number} pos     the stored `pos_mm`
 * @param {number} boardT
 * @returns {number}
 */
export function fieldFromPos(pos, boardT) {
  return Number(pos) - interiorFloor(boardT);
}

/**
 * …and back: what a person typed into that field, as a stored position.
 *
 * The exact inverse, so the field round-trips. It does NOT clamp: the clamp is
 * the collision rules' job and the field is not a back door round them (turn 8)
 * — this only changes the datum.
 */
export function posFromField(value, boardT) {
  return Number(value) + interiorFloor(boardT);
}

/**
 * The CLEAR LIGHTS in one column: floor→shelf, shelf→shelf, shelf→top.
 *
 * The same faces the field is measured between, which is what makes the first
 * chip and the field the same number. `even` marks the odd one out, so a stack
 * that is 3 mm off says so at a glance rather than leaving six similar numbers
 * to be compared by eye (turn 8, F4).
 *
 * @param {object} args
 *   positions   each shelf's stored `pos_mm`
 *   floor       the face the column starts at — the interior floor, or the top
 *               of a drawer zone where one closes the space below
 *   ceiling     the underside of the top panel
 *   thickness   one number, or a per-shelf list where a joiner has made one
 *               board thicker than the rest (turn 9)
 * @returns {Array<{from:number, to:number, size:number, even:boolean,
 *                  below:number|null, above:number|null}>}
 *   `below`/`above` name the shelf index on each side of the opening (1-based,
 *   bottom-up), or null for the floor and the top.
 */
export function clearLights({
  positions = [], floor = 0, ceiling = 0, thickness = 18,
}, tolerance = 0.5) {
  const shelves = positions
    .map((pos, i) => ({
      pos: Number(pos),
      t: Array.isArray(thickness) ? Number(thickness[i]) || 0 : Number(thickness) || 0,
      index: i + 1,
    }))
    .filter((s) => Number.isFinite(s.pos))
    .sort((a, b) => a.pos - b.pos);

  const out = [];
  let from = Number(floor) || 0;
  let below = null;
  for (const s of shelves) {
    out.push({
      from, to: s.pos, size: s.pos - from, below, above: s.index,
    });
    from = s.pos + s.t;
    below = s.index;
  }
  out.push({
    from, to: Number(ceiling) || 0, size: (Number(ceiling) || 0) - from, below, above: null,
  });

  const real = out.filter((g) => g.size > tolerance);
  if (!real.length) return [];
  const largest = Math.max(...real.map((g) => g.size));
  const smallest = Math.min(...real.map((g) => g.size));
  const allEven = largest - smallest <= tolerance;
  return real.map((g) => ({
    ...g,
    even: allEven || Math.abs(g.size - largest) <= tolerance,
  }));
}

/**
 * The clear light immediately BELOW one shelf — which is the number its own
 * chip carries and the number its field shows.
 *
 * That identity is the whole of F10: `fieldFromPos(pos)` and
 * `lightBelow(pos, …)` are the same distance measured from the same face, so
 * the panel and the 3-D can never disagree about a shelf standing on the floor
 * of an empty cabinet again.
 */
export function lightBelow(pos, lights = []) {
  const p = Number(pos);
  return lights.find((g) => Math.abs(g.to - p) < 1e-6) || null;
}
