// ─── ZONES: the inside of a cabinet, as openings (turn 12, CLAUDE.md F5.3) ──
//
// Until now the inside of a carcass was a list of pieces and the openings
// between them were worked out again, differently, wherever somebody needed
// one: `centredShelfPos` builds a face list to find the biggest gap,
// `shelfGapLadder` builds the same list to measure them, `addPartition` builds
// it a third time on the other axis. Three answers to "what openings are in
// this cabinet", and the moment a partition exists there is a fourth question
// none of them answers — "which SIDE of it".
//
// So the model is written down once, here, as the owner asked: "an explicit
// ZONE model in the interior maths — build it in the engine as pure functions
// (it is the foundation the 2×/4× drawer stacks and future interior work will
// stand on), tested."
//
// A ZONE is a clear opening between two faces, on one axis:
//
//     { id, index, from, to, size, centre }
//
// `from`/`to` are FACES — the top of the board below and the underside of the
// board above, or the inner faces of two partitions. Never centre lines: a
// joiner measuring an opening measures the clear space, and a ladder of centre
// distances is a ladder of numbers that are all one board thickness wrong. That
// convention is the one `shelfGapLadder` has used since turn 8 and this keeps it.
//
// Pure functions. No React, no store, no profile import — the callers hand in
// the numbers, because the callers are the ones that know what is in the box.

/**
 * The openings along ONE axis, given the boards crossing it.
 *
 * @param {object} args
 *   from    the face the first opening starts at (top of the base panel, or
 *           the inner face of the left side)
 *   to      the face the last opening ends at
 *   boards  each crossing board's NEAR face, in the same frame — a shelf's
 *           `pos_mm`, a partition's `x_mm`. Order does not matter.
 *   boardT  how thick they are (one number: a cabinet is cut from one board)
 *   axis    'x' | 'y', carried through onto the zone ids so a caller holding
 *           both sets can tell them apart
 * @returns {Array<{id:string,index:number,from:number,to:number,size:number,centre:number}>}
 */
export function zonesBetween({
  from, to, boards = [], boardT = 0, axis = 'y',
}) {
  const lo = Number(from) || 0;
  const hi = Number(to) || 0;
  const t = Math.max(0, Number(boardT) || 0);
  const crossing = boards
    .map((b) => Number(b))
    .filter((b) => Number.isFinite(b) && b >= lo && b + t <= hi)
    .sort((a, b) => a - b);

  const faces = [lo, ...crossing.flatMap((v) => [v, v + t]), hi];
  const out = [];
  for (let i = 0; i < faces.length - 1; i += 2) {
    const a = faces[i];
    const b = faces[i + 1];
    out.push({
      id: `${axis}${out.length + 1}`,
      index: out.length,
      from: a,
      to: b,
      size: b - a,
      centre: (a + b) / 2,
    });
  }
  return out;
}

/**
 * The bays ACROSS a cabinet — left of the first partition, between each pair,
 * right of the last. One zone when there is no partition, which is the case
 * every cabinet starts in and the case that makes "which side" a question that
 * never has to be asked.
 *
 * @param {object} args
 *   width       the carcass width
 *   boardT      board thickness
 *   partitions  the vertical partition items ({ x_mm })
 */
export function widthZones({ width, boardT, partitions = [] }) {
  const t = Math.max(0, Number(boardT) || 0);
  return zonesBetween({
    from: t,
    to: (Number(width) || 0) - t,
    boards: partitions.map((p) => Number(p?.x_mm)),
    boardT: t,
    axis: 'x',
  });
}

/**
 * The openings UP a cabinet — base to the first shelf, shelf to shelf, last
 * shelf to the underside of the top.
 *
 * @param {object} args
 *   floor    the top face of whatever closes the space below (the drawer
 *            partition, the rail partitioner, or the base panel)
 *   ceiling  the underside of the top panel
 *   shelves  the shelf items ({ pos_mm })
 *   boardT   board thickness
 */
export function heightZones({
  floor, ceiling, boardT, shelves = [],
}) {
  return zonesBetween({
    from: floor,
    to: ceiling,
    boards: shelves.map((s) => Number(s?.pos_mm)),
    boardT,
    axis: 'y',
  });
}

/** Which zone a value falls in, or null when it falls on a board. */
export function zoneAt(zones = [], value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return null;
  return zones.find((z) => v >= z.from && v <= z.to) || null;
}

/** The biggest opening — where an added piece goes when nobody has said where. */
export function largestZone(zones = []) {
  return zones.reduce((best, z) => (!best || z.size > best.size ? z : best), null);
}

/**
 * Where a piece of thickness `t` sits when it is CENTRED in a zone.
 *
 * What is centred is the BOARD, not its near face — centring the face leaves
 * the piece one board low, which is the bug turn 11 fixed in `centredShelfPos`
 * and the reason that function measures the way it does.
 *
 * @returns {number|null} the near face, or null when the piece will not fit
 */
export function centreInZone(zone, thickness = 0, clearance = 0) {
  if (!zone) return null;
  const t = Math.max(0, Number(thickness) || 0);
  const c = Math.max(0, Number(clearance) || 0);
  if (zone.size < t + 2 * c) return null;
  return zone.from + (zone.size - t) / 2;
}

// ─── The partition, and the shelf it stands on (CLAUDE.md F5.3) ─────────────
//
// The owner's three rules, exactly as he gave them:
//
//   • a partition may terminate ON a shelf only if that shelf is FIXED;
//   • if that shelf has a depth setback, the partition's max depth FOLLOWS the
//     shelf's — shrink the shelf, the partition shrinks with it;
//   • if the shelf is adjustable, the partition does NOT attach — show the
//     existing collision treatment instead.
//
// The reason each of them is right is the same reason: a partition standing on
// a shelf is CARRIED by it. A fixed shelf is a structural board — it is
// screwed, it is in the cut list as a fixed piece, and something can stand on
// it. An adjustable shelf sits on four pins and is meant to be lifted out; a
// divider landing on one is a divider that falls over the first time the shelf
// is moved. So it does not attach: it runs past, and the collision treatment
// the app already has for two pieces occupying the same space is what says so.
//
// And the DEPTH follows because they are one joint. A shelf set back 40 mm has
// its front edge 40 mm inside the carcass; a partition standing on it and
// reaching further forward is a partition standing on air for its last 40 mm.

/** Is this shelf item a FIXED one — the only kind a partition may stand on? */
export function isFixedShelf(item) {
  return item?.kind === 'shelf' && item?.variant === 'fixed';
}

/**
 * Where one vertical partition starts, stops, and how deep it is.
 *
 * @param {object} args
 *   floor       the top face of whatever closes the space below
 *   ceiling     the underside of the top panel
 *   shelves     the shelf items whose run CROSSES this partition — turn 21
 *               (CLAUDE.md F9.1): a shelf living inside one bay carries
 *               nothing and is not a candidate, and it is the caller (which
 *               knows where every shelf actually runs) that decides
 *   boardT      board thickness
 *   depth       the depth a partition has when nothing constrains it
 *   fullDepth   the carcass's own interior depth, which a setback is measured
 *               back FROM (so a shelf's `front_mm` can be turned into a depth)
 * @returns {{from:number, to:number, height:number, depth:number,
 *            terminatesOn:string|null, front_mm:number}}
 */
export function partitionSpan({
  floor, ceiling, shelves = [], boardT = 0, depth = 0, fullDepth = 0,
}) {
  const lo = Number(floor) || 0;
  const hi = Number(ceiling) || 0;
  const t = Math.max(0, Number(boardT) || 0);
  const full = Number(fullDepth) || 0;
  const own = Number(depth) || 0;

  // The lowest FIXED shelf standing clear above the floor. An adjustable one is
  // not a candidate at all — see the note above — so it is simply not looked at.
  const carrying = shelves
    .filter(isFixedShelf)
    .map((s) => ({ item: s, pos: Number(s.pos_mm) }))
    .filter(({ pos }) => Number.isFinite(pos) && pos > lo + t && pos + t <= hi)
    .sort((a, b) => a.pos - b.pos)[0] || null;

  if (!carrying) {
    return {
      from: lo,
      to: hi,
      height: Math.max(0, hi - lo),
      depth: own,
      terminatesOn: null,
      front_mm: Math.max(0, full - own),
    };
  }

  // COUPLED, AUTOMATIC: the partition can be no deeper than what carries it.
  const shelfSetback = Math.max(0, Number(carrying.item.front_mm) || 0);
  const shelfDepth = full > 0 ? full - shelfSetback : own;
  const coupled = Math.min(own, shelfDepth > 0 ? shelfDepth : own);

  return {
    from: lo,
    to: carrying.pos,
    height: Math.max(0, carrying.pos - lo),
    depth: coupled,
    terminatesOn: carrying.item.id || null,
    front_mm: Math.max(0, full - coupled),
  };
}

/**
 * Does this shelf's RUN cross this partition's plane?
 *
 * ─── TURN 21 (CLAUDE.md F9.1): SPAN DECIDES, NEVER ORDER ───────────────────
 *
 * Owner: "a shelf spanning the section over a partition rightly splits it; a
 * shelf living INSIDE one bay must leave the partition alone — and today the
 * ORDER of adding decides, which is nonsense."
 *
 * It was worse than nonsense: `partitionSpan` was handed EVERY shelf in the
 * cabinet, so the lowest fixed shelf anywhere truncated every partition
 * everywhere — a shelf in the left bay stopped a partition three bays away.
 * The relation is geometric and nothing else, so this is the whole of it: two
 * intervals on the x axis, and they either overlap or they do not.
 *
 * Touching is not crossing. A bay shelf runs from a partition's far face to the
 * next one's near face; it ABUTS the boards on either side of it and carries
 * nothing, which is exactly what a joiner means by "in that bay".
 *
 * @param {object} run   the shelf's own run: { from, to } in cabinet x
 * @param {object} part  the partition: { x, thickness }
 */
export function shelfCrossesPartition(run, part) {
  const from = Number(run?.from);
  const to = Number(run?.to);
  const x = Number(part?.x);
  const t = Math.max(0, Number(part?.thickness) || 0);
  if (![from, to, x].every(Number.isFinite)) return false;
  return from < x + t && to > x;
}

/**
 * Which shelves a partition would COLLIDE with — the adjustable ones it runs
 * past on its way up.
 *
 * The app already has a treatment for two pieces in the same space; this is the
 * list it is applied to, and it is here rather than in the view so that a test
 * can ask the question without mounting anything.
 */
export function partitionCollisions({
  span, shelves = [], boardT = 0,
}) {
  const t = Math.max(0, Number(boardT) || 0);
  return shelves.filter((s) => {
    if (s?.kind !== 'shelf' || isFixedShelf(s)) return false;
    const pos = Number(s.pos_mm);
    if (!Number.isFinite(pos)) return false;
    return pos + t > span.from && pos < span.to;
  });
}
