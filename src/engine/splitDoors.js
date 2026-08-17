// ─── SPLIT DOORS (turn 36, CLAUDE.md F6) ────────────────────────────────────
//
// THE KIT IS LAW. T35 merged `;; --- SPLIT DOORS (T35)` into
// `reference/lisp/KIT_WARDROBE_FULL.lsp` and shipped the paren-balance test
// that guards it; the engine half never landed. This module is that half, and
// it MATCHES the section rather than interpreting it — every constant and
// every formula below is the kit's own, named the kit's own way, so the two
// can be read side by side.
//
// The owner, 16.08.2026, as the kit records him: *"podzial drzwi na dolne i
// gorne - wystarcza 2 segmenty; wpisywanie GORNEJ czesci; i zawsze musi byc
// przedzielone polka FIX, ktora NIE MA cofniecia 20 mm (automatycznie)."*
// Confirmed the same evening: the divider shelf is FULL DEPTH, flush with the
// front, so BOTH segments have something to close against.
//
// THE LAW, in the order the kit works the numbers out:
//
//   1. OPENING — what the pair of segments has to close between them. The kit
//      writes it `wysSzafki − topDemand`, and that demand is T35-F12's, not a
//      standing 3. In this engine the leaf's own cut height IS that number:
//      `frontH = H − topDemandMm(params, P) + doorExtend − hoodAperture`, and
//      on the wardrobe — the one kit that carries this section — `doorExtend`
//      is false and `hoodAperture` is 0, so the two agree to the millimetre.
//      Taking the LEAF's height as the opening is also the honest datum for a
//      handleless kit, where the two segments must still add up to the one
//      leaf they replaced.
//   2. TOP is the number the owner types. 0 = no split, and the bay keeps
//      exactly the one door it has today.
//   3. BOTTOM = OPENING − TOP − 3. That 3 is the front matrix's own gap
//      between two fronts — the same 3 that stands between a side-by-side
//      pair.
//   4. The DIVIDER is a FIX shelf on the split line and is NOT an ordinary
//      one: full width between the sides, FULL DEPTH to the back panel, so
//      its front edge lands flush with the carcase front. "NIE MA cofniecia
//      20 mm (automatycznie)" — the zero is not an option offered to the
//      user, it is what a divider IS.
//   5. HINGES are counted PER SEGMENT, from that segment's own height and
//      weight. A split is two doors, not one door with a line drawn on it,
//      and it is never the full-height count halved.
//   6. BOM/CNC: two fronts and one divider, each segment drilled from its own
//      hinge edge exactly as a whole door is.
//   7. Side clearances unchanged; the top edge is F12's; mirrors and handles
//      are asked per segment.
//
// This module is PURE: no store, no profile mutation, no panels. Everything
// that needs a cabinet is done by the caller.

// The SAME published table check #4 reads, imported directly rather than
// through `engine/checks.js`: the engine may not import the CHECK layer (the
// turn-31 layering law — `cabinet.js` takes millimetres, it does not take
// rulebooks), and this module is imported BY the engine.
import HINGE_COUNT from '../../reference/hardware/cliptop-hinge-count.json' with { type: 'json' };

/** mm between the top and the bottom segment — the kit's `SPLIT_SEG_GAP`. */
export const SPLIT_SEG_GAP = 3;

/** The divider's setback — ZERO. The kit's `SPLIT_SHELF_BACK`. */
export const SPLIT_SHELF_BACK = 0;

/** A segment shorter than this is a mistyped number. The kit's `SPLIT_SEG_MIN`. */
export const SPLIT_SEG_MIN = 100;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * The opening the two segments close between them.
 * The kit's `splitDoorOpening`: `(- wysSzafki topDemand)`.
 */
export function splitDoorOpening(cabinetHeight, topDemand) {
  return num(cabinetHeight) - num(topDemand);
}

/**
 * BOTTOM = OPENING − TOP − 3. The kit's `splitDoorBottomH`.
 *
 * The arithmetic the tests pin, in one line: `top + SPLIT_SEG_GAP + bottom =
 * opening`, exactly, at every height.
 */
export function splitDoorBottomH(opening, topH) {
  return num(opening) - num(topH) - SPLIT_SEG_GAP;
}

/**
 * 0 = no split. The kit's `splitDoorActive`: T only when BOTH segments come
 * out real — a 40 mm "door" is a mistyped number and not a request, and the
 * bay keeps its single door.
 */
export function splitDoorActive(opening, topH) {
  const top = Number(topH);
  if (!Number.isFinite(top) || top <= 0) return false;
  if (top < SPLIT_SEG_MIN) return false;
  return splitDoorBottomH(opening, top) >= SPLIT_SEG_MIN;
}

/**
 * The split line, measured from the same datum as the door's bottom edge: the
 * UNDERSIDE of the divider is where the bottom segment stops.
 * The kit's `splitDoorLineY`.
 */
export function splitDoorLineY(opening, topH) {
  return splitDoorBottomH(opening, topH);
}

/**
 * The divider, cut to the PARTITION PANEL's law and NOT the shelf's.
 * The kit's `splitDoorShelfW` / `splitDoorShelfD`.
 *
 * Compare the kit's `szerPART`/`wysPART` — identical — against
 * `szerSHELF`/`wysSHELF`, which take 4 off the width and 20 off the depth.
 */
export function splitDoorShelfW(width, boardT) {
  return num(width) - 2 * num(boardT);
}
export function splitDoorShelfD(depth, boardT) {
  return num(depth) - num(boardT) - SPLIT_SHELF_BACK;
}

/**
 * HINGES PER SEGMENT. The kit's `splitDoorHingeCount`.
 *
 * The kit's `cond` walks 900/9 → 2, 1600/13 → 3, 2000/19 → 4, 2400/24 → 5,
 * else 6. That is `reference/hardware/cliptop-hinge-count.json` BAND FOR BAND
 * — checked, and no divergence to report (iron rule 3) — so this walks the
 * JSON rather than restating six numbers a third time. The walk is the same
 * one `checks.js hingesRequired` does; it is repeated here rather than
 * imported because the engine may not import the check layer.
 *
 * @param {number} segH   this segment's own height, mm
 * @param {number} segKg  this segment's own weight, kg. The engine layer has
 *                        no board weight (that lives with the material
 *                        assignment, which is why check #4 is the layer that
 *                        audits it), so cabinet.js passes 0 and the HEIGHT
 *                        band decides. A caller that knows the weight passes
 *                        it and gets the kit's full answer.
 */
export function splitDoorHingeCount(segH, segKg = 0) {
  const h = num(segH);
  const kg = num(segKg);
  for (const band of HINGE_COUNT.bands) {
    if (h <= band.maxHeightMm && kg <= band.maxWeightKg) return band.hinges;
  }
  return HINGE_COUNT._beyond_the_table.hinges;
}

/**
 * The two segments, TOP FIRST — the order the owner reads them in and the
 * order the modal lists them in. The kit's `splitDoorSegments`.
 *
 * `y` is each segment's own bottom edge in the leaf's frame (0 = the leaf's
 * bottom edge), so a caller adds the leaf's own `box.y` and nothing else.
 *
 * @returns {Array<{id:string,label:string,h:number,y:number,hinges:number}>|null}
 *          null when the split is not active — which is every door in every
 *          project that has not asked for one.
 */
export function splitDoorSegments({ opening, topH, segKg = 0 } = {}) {
  if (!splitDoorActive(opening, topH)) return null;
  const top = num(topH);
  const bottom = splitDoorBottomH(opening, top);
  return [
    {
      id: 'T', label: 'Top', h: top, y: bottom + SPLIT_SEG_GAP, hinges: splitDoorHingeCount(top, segKg),
    },
    {
      id: 'B', label: 'Bottom', h: bottom, y: 0, hinges: splitDoorHingeCount(bottom, segKg),
    },
  ];
}

/**
 * Where a segment's own hinges go, in the SEGMENT's frame.
 *
 * The kit counts them (`splitDoorHingeCount`) and says they come from the
 * segment's own height; it does not restate the LADDER, because the house
 * already has one — `calcHingePositionsTall` in SKYLON_COMMON, whose outer
 * pair is `endOffset` off each end with the rest spread evenly between. That
 * is what this returns, ASCENDING, so a segment of 900 gets [100, 800] and a
 * segment of 1400 gets [100, 700, 1300].
 *
 * Ascending because every ladder in this engine is ascending — the display
 * order is the LIST layer's business (engine/items.js), not the drill's.
 */
export function splitSegmentHingeRows(segH, count, endOffset = 100) {
  const h = num(segH);
  const n = Math.max(0, Math.trunc(Number(count) || 0));
  const end = Math.max(0, num(endOffset));
  if (!(h > 0) || n <= 0) return [];
  if (n === 1) return [h / 2];
  const from = Math.min(end, h / 2);
  const to = Math.max(h - end, h / 2);
  const step = (to - from) / (n - 1);
  return Array.from({ length: n }, (_, i) => from + step * i);
}

/**
 * The top-segment height asked of ONE leaf.
 *
 * Two ways of saying it, one answer, and both are ADDITIVE — a bare
 * `computeCabinet()` passes neither and gets the door it has always had:
 *
 *   `split_top_mm: 600`               the whole unit's leaves split at 600
 *   `bay_doors[i].split_top_mm: 600`  that bay's leaf, overriding the unit's
 *
 * @param {{unit:(number|null), bays:(object|null)}} said
 * @param {number|null} bay  the leaf's bay index, or null for a face door
 */
export function splitTopFor(said, bay = null) {
  const bays = said?.bays;
  if (bay != null && Number.isFinite(Number(bay)) && bays && typeof bays === 'object') {
    const own = bays[Math.trunc(Number(bay))];
    const v = Number(own?.split_top_mm ?? own);
    if (Number.isFinite(v) && v > 0) return v;
    // An explicit 0 on the bay means "not this one", even where the unit says split.
    if (own && (own.split_top_mm === 0 || own === 0)) return 0;
  }
  const v = Number(said?.unit);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/**
 * The rows a SPLIT LEAF's segments read, for a surface that lists them.
 *
 * TOP FIRST — the owner's order, the kit's `splitDoorSegments` order, and the
 * same law `engine/items.js` applies to shelves and drawers: the engine counts
 * from the floor, a human reads from the ceiling.
 */
export function splitSegmentRows(panels, baseId) {
  const of = (suffix) => (panels || []).find((p) => p.id === `${baseId}-${suffix}`) || null;
  return [
    { id: 'T', label: 'Top', panel: of('T') },
    { id: 'B', label: 'Bottom', panel: of('B') },
  ].filter((r) => r.panel);
}
