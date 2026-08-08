// ─── Interior items: ONE order, ONE auto-placement rule ───
//
// There are two real orders and turn 3 wrote down neither of them, which is
// exactly how BACKLOG #1 happened: the panel sorted drawers ascending and
// called the first row "the top one".
//
//   ENGINE order  — bottom-up. D1 is the drawer nearest the floor and SHELF-1
//                   is the lowest shelf. That is what the cut list, the runner
//                   rows, the drill rows and the golden fixtures mean, so it
//                   cannot move.
//   LIST order    — top-down. What a human reads in the right panel, and what
//                   the 3D view shows: the first row is the piece nearest the
//                   ceiling.
//
// This module is the single place that says so. The view never sorts; it asks
// here. The engine never asks; it keeps its own bottom-up numbering, and each
// row carries that number so "D2" in the panel is "D2" in the workshop.
//
// Pure functions — no React, no store imports (CLAUDE.md rule 2).

/** Drawers in ENGINE order: index ascending, so [0] is the bottom drawer. */
export function drawersInEngineOrder(items = []) {
  return items
    .filter((i) => i.kind === 'drawer')
    .sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0));
}

/** Shelves in ENGINE order: position ascending, so [0] is the lowest shelf. */
export function shelvesInEngineOrder(items = []) {
  return items
    .filter((i) => i.kind === 'shelf')
    .sort((a, b) => (Number(a.pos_mm) || 0) - (Number(b.pos_mm) || 0));
}

export function hangerOf(items = []) {
  return items.find((i) => i.kind === 'hanger') || null;
}

/**
 * The rows the right panel shows, TOP-DOWN — the same order the 3D view stacks
 * them in. Each row keeps the engine's own number, because that is the number
 * on the cut list: a three-drawer stack reads D3 / D2 / D1 from the top, and
 * D1 is still the bottom drawer everywhere else in the system.
 *
 * @returns {Array<{item:object, num:number, label:string}>}
 */
export function drawerRows(items = []) {
  const engine = drawersInEngineOrder(items);
  return engine
    .map((item, i) => ({ item, num: i + 1, label: `D${i + 1}` }))
    .reverse();
}

/** The same, for shelves: SHELF-1 is the lowest, the list starts at the top. */
export function shelfRows(items = []) {
  const engine = shelvesInEngineOrder(items);
  return engine
    .map((item, i) => ({ item, num: i + 1, label: `S${i + 1}` }))
    .reverse();
}

// ─── Auto-placement (CLAUDE.md turn 4, F5 / BACKLOG #12) ───
// Adding an item must never land it on top of one that is already there.
// Shelves fill from the TOP down, drawers from the bottom up (the engine
// stacks them there anyway) and the hanger rail takes what is left between
// the two — as high under the lowest shelf as its partitioner allows.

/**
 * Where the next shelf goes: below the lowest shelf already fitted, one
 * `itemStackPitch` down, never closer than `minShelfGap` and never outside the
 * band. When a full pitch does not fit any more it takes the tightest legal
 * slot instead; when even that is gone it returns null, so the caller reports
 * "no room" rather than stacking two shelves in one slot.
 *
 * ─── Turn 11 (CLAUDE.md F2.3) ───
 * This is no longer what the "Add shelves" button uses — Piotr's verdict on the
 * top-down rule was that the shelf "lands wrong", and it does: a single shelf
 * added to an empty wardrobe went to the very top of the drag band, 40 mm under
 * the wieniec, which is a shelf nobody would fit there. `centredShelfPos` below
 * is what the button calls now.
 *
 * The rule is KEPT because it is a different question with a different answer —
 * "pack them in from the top" is what a run of six shelves in a pantry wants —
 * and because throwing away a tested placement rule to add another one is how
 * a codebase ends up with neither.
 *
 * @param {{band:{min:number,max:number}, positions:number[]}} args
 */
export function nextShelfPos({ band, positions = [] }, profile) {
  const E = profile.editor;
  const taken = positions.filter((p) => Number.isFinite(p)).sort((a, b) => a - b);
  if (!taken.length) return band.max >= band.min ? band.max : null;
  const lowest = taken[0];
  // The closest a shelf may ever sit under the one above it.
  const tightest = lowest - E.minShelfGap;
  if (tightest < band.min) return null;
  const wanted = Math.min(band.max, lowest - E.itemStackPitch);
  return Math.min(Math.max(wanted, band.min), tightest);
}

/**
 * ─── Where an ADDED shelf lands (turn 11, CLAUDE.md F2.3) ───
 *
 * "Adding a shelf defaults to centred in its zone." Owner verdict, and the
 * reason is what a joiner does with the first shelf in an empty carcass: he
 * halves the opening. Turn 4's rule filled from the TOP, so shelf one went 40 mm
 * under the top panel and every one after it walked down in 350 mm steps — a
 * ladder nobody asked for that had to be corrected with the Even button every
 * single time.
 *
 * "Its zone" is the OPENING the shelf goes into, not the whole carcass: with two
 * shelves already fitted there are three openings, and the new one halves the
 * biggest of them. On an empty carcass that is the whole zone, which is the
 * simple case the verdict is about.
 *
 * Measured between FACES, exactly as `shelfGapLadder` measures — the shelf has a
 * thickness, and centring its BOTTOM face in a clear opening leaves the piece
 * one board low. What is centred is the board.
 *
 * @param {object} args
 *   band       shelfBand(): { min, max, floor, ceiling }
 *   positions  the shelves already fitted, as bottom faces
 *   boardT     the new shelf's thickness
 * @returns {number|null} the bottom face, or null when nothing fits
 */
export function centredShelfPos({ band, positions = [], boardT = 0 }, profile) {
  const E = profile.editor;
  const t = Math.max(0, Number(boardT) || 0);
  const taken = positions.filter((p) => Number.isFinite(p)).sort((a, b) => a - b);
  // floor → S1 underside, S1 top → S2 underside, … Sn top → ceiling.
  const faces = [band.floor, ...taken.flatMap((y) => [y, y + t]), band.ceiling];

  let best = null;
  for (let i = 0; i < faces.length - 1; i += 2) {
    const size = faces[i + 1] - faces[i];
    if (!best || size > best.size) best = { from: faces[i], size };
  }
  // A shelf and the two clear openings it leaves. Below this the piece would be
  // fitted tighter than the workshop's own minimum and the caller says "no room"
  // rather than the clamp quietly stacking it on its neighbour.
  if (!best || best.size < t + 2 * E.minShelfGap) return null;
  const pos = best.from + (best.size - t) / 2;
  return Math.min(Math.max(pos, band.min), band.max);
}

/**
 * ─── Even shelf spacing — the KIT's formula, verbatim (turn 9, CLAUDE.md F3) ──
 *
 * Piotr's verdict on turn 8's "Even" button: after centring, the gaps are not
 * equal. He was right, and the cause is that turn 8 spread the shelves across
 * the DRAG BAND rather than across the shelf ZONE.
 *
 * The band is the zone pulled in by `editor.minShelfEdgeGap` at each end — it is
 * how close a shelf may be dragged to the top or to the base, which is a
 * different question from where an evenly-spaced shelf goes. Spreading over it
 * puts the first and last shelves 40 mm nearer their neighbours than the rule
 * intends, so the top and bottom openings come out different from the middle
 * ones by exactly that much. Nobody invented that; it was never checked.
 *
 * What replaces it is the AutoLISP's own arithmetic, traced from
 * KIT_WARDROBE_FULL.lsp `drawWardrobeShelvesFront` (lines 133-142):
 *
 *     spacing  = (shelfZoneTop − shelfZoneBottom) / (numShelves + 1)
 *     shelfY_i = shelfZoneBottom + spacing · i          for i = 1..numShelves
 *
 * N shelves divide the zone into N+1 equal steps. The zone bounds are the ones
 * the kit uses and the ones `engine/collision.js shelfBand` already computes:
 * the TOP FACE of whatever closes the space below (the drawer partition, the
 * rail partitioner, or the base panel) and the UNDERSIDE of the top panel —
 * lines 687-692 of the same file, in the same order.
 *
 * `shelfY` is the shelf's BOTTOM FACE and not its centre line, and that is not
 * an assumption: the LISP draws the board from `shelfY` to `shelfY + G`
 * (line 143) and drills its pin cluster at `shelfY − 50 / shelfY / shelfY + 50`
 * (lines 411-416) — the row the shelf SITS ON. It is the same convention
 * `pos_mm` has carried here since turn 1, so the two already agree.
 *
 * Pure arithmetic on four numbers: no profile, no clamp, no store. The caller
 * clamps, because the caller is the one that knows what else is in the cabinet.
 *
 * ─── TURN 11 (CLAUDE.md F2): THE BOTTOM GAP ───
 *
 * Piotr's screenshot after turn 9: 226.5 / 227 / 244.5. The bottom opening is
 * still wrong, and the difference is 18 — one board thickness, which is the
 * whole answer.
 *
 * The zone bounds are right (they are the LISP's own, re-checked against
 * KIT_WARDROBE_FULL L684-692 and KIT_LOW_CABINET_FULL L253-259: the top face of
 * whatever closes the space below, up to the underside of the top panel). The
 * FORMULA is what is one-sided. It spaces BOTTOM FACES evenly, which is exactly
 * what the AutoLISP does — and a shelf is not a line, it is 18 mm of board. So
 * every opening ABOVE a shelf loses that board and the lowest one, which has no
 * shelf under it, does not:
 *
 *     floor → S1        = spacing                 ← one board too big
 *     S1+G  → S2        = spacing − G
 *     Sn+G  → ceiling   = spacing − G
 *
 * `boardT` is what closes it. With `boardT` the shelves are spaced so the CLEAR
 * OPENINGS are equal, which is the thing a joiner measures and the thing the
 * owner verdict is about:
 *
 *     gap      = (zoneTop − zoneBottom − n·G) / (n + 1)
 *     shelfY_i = zoneBottom + i·gap + (i − 1)·G
 *
 * It DEFAULTS TO ZERO, and that is not laziness: with `boardT` left out this is
 * the AutoLISP's formula to the last decimal, which is what the engine's own
 * even-spacing fallback (`assemblies.shelves`, and through it the pin drilling
 * and every golden fixture) must keep computing. The DESIGN layer — the Even
 * button, the store — passes the thickness; the kit does not.
 *
 * @param {{zoneBottom:number, zoneTop:number, count:number, boardT?:number}} zone
 * @returns {number[]} bottom faces, bottom-up, one per shelf
 */
export function evenShelfPositions({
  zoneBottom, zoneTop, count, boardT = 0,
}) {
  const n = Math.max(0, Math.trunc(Number(count) || 0));
  if (n <= 0) return [];
  const bottom = Number(zoneBottom) || 0;
  const top = Number(zoneTop) || 0;
  const t = Math.max(0, Number(boardT) || 0);
  const gap = (top - bottom - n * t) / (n + 1);
  return Array.from({ length: n }, (_, i) => bottom + gap * (i + 1) + t * i);
}

/**
 * Every CLEAR OPENING in a column of shelves (turn 8, CLAUDE.md F4).
 *
 * The question a joiner asks about a set of shelves is "are they even?", and
 * that cannot be answered one gap at a time — so hovering any shelf measures
 * all of them: floor to the first, shelf to shelf, and the last one to the
 * underside of the top.
 *
 * Measured between FACES, not centre lines. A joiner asking whether the toaster
 * goes in there is asking about the clear space, and a ladder of centre-line
 * distances is a ladder of numbers that are all one board thickness wrong.
 *
 * `even` marks the gaps that are as big as the biggest — so a stack that is 3 mm
 * out says which one is the odd one, instead of leaving six similar numbers to
 * be compared by eye, which is the thing the readout exists to replace.
 *
 * @param {object} args
 *   positions  each shelf's underside, in cabinet mm
 *   floor      the top face of whatever closes the space below
 *   ceiling    the underside of the top panel
 *   boardT     shelf thickness
 * @returns {Array<{from:number, to:number, size:number, even:boolean}>}
 */
export function shelfGapLadder({
  positions = [], floor = 0, ceiling = 0, boardT = 18,
}, tolerance = 0.5) {
  const shelves = positions.filter(Number.isFinite).sort((a, b) => a - b);
  if (!shelves.length) return [];
  const faces = [floor, ...shelves.flatMap((y) => [y, y + boardT]), ceiling];
  const gaps = [];
  for (let i = 0; i < faces.length - 1; i += 2) {
    const size = faces[i + 1] - faces[i];
    if (size > tolerance) gaps.push({ from: faces[i], to: faces[i + 1], size });
  }
  if (!gaps.length) return [];
  const largest = Math.max(...gaps.map((g) => g.size));
  const smallest = Math.min(...gaps.map((g) => g.size));
  const allEven = largest - smallest <= tolerance;
  return gaps.map((g) => ({ ...g, even: allEven || Math.abs(g.size - largest) <= tolerance }));
}

/**
 * The hanger rail's offset above the zone it hangs in (the drawer partition
 * when there is a stack, otherwise the base panel) — which is what the engine
 * means by `rail_offset`.
 *
 * The type's own default offset is used whenever it FITS under the lowest
 * shelf, clear of the rail's partitioner; otherwise the rail is pulled down to
 * the highest position that does.
 */
export function nextHangerOffset({ band, positions = [], zoneBase, fallback }, profile) {
  const RL = profile.wardrobe.rail;
  const E = profile.editor;
  const taken = positions.filter((p) => Number.isFinite(p)).sort((a, b) => a - b);
  const ceiling = taken.length ? taken[0] : band.ceiling;
  const highest = ceiling - RL.partitionAbove - E.minShelfGap - (Number(zoneBase) || 0);
  // `fallback == null` is "no default for this type" — and NOT zero, which is
  // what Number(null) would quietly make it.
  const want = fallback == null || !Number.isFinite(Number(fallback)) ? highest : Number(fallback);
  return Math.max(E.minShelfGap, Math.min(want, highest));
}
