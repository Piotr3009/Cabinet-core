// ─── FRONT DIMENSIONS (turn 25, CLAUDE.md F13) ──────────────────────────────
//
// "A toggle — Show front dimensions — in the door modal and in the View menu,
// scoped to the WHOLE PROJECT (the owner's choice), state remembered. On: every
// front's width and height, plus the gaps — between doors, between drawer
// fronts, to sides, to the top, to the floor. Off: clean scene."
//
// ─── WHAT A "GAP" IS, AND WHY IT IS MEASURED THIS WAY ───────────────────────
//
// Between FACES, never between centre lines. A joiner looking at a run asks
// "is that three or is it four" about the slot he can see, and the slot he can
// see is the clear air between two boards. Every number here is therefore a
// clear opening, and a gap of zero means two fronts touching — which is a
// fault, and is reported as a zero rather than dropped.
//
// The FRAME is the cabinet's own millimetres, the frame every panel box is in:
// x across the width, y up from the carcass base. The renderer flips nothing.
//
// Pure functions — no React, no three.js, no store (engine rule).

/**
 * Every front of one cabinet, as a rectangle in the cabinet's own frame.
 *
 * Read off the engine's panels, so a leaf hung on a partition is in the list
 * exactly as a face door is (F5) and a front the joiner has just re-cut is
 * measured where the engine has just put it.
 */
export function frontRects(result) {
  const outer = outerFrontZ(result);
  return (result?.panels || [])
    .filter((p) => p?.role === 'front' && p.box)
    .map((p) => ({
      id: p.id,
      x: p.box.x,
      y: p.box.y,
      w: p.box.w,
      h: p.box.h,
      z: p.box.z + p.box.d,
      kind: p.part === 'DRAWER-FRONT' ? 'drawer' : 'door',
      // ─── TURN 36 (CLAUDE.md F10): IS THIS FRONT INSIDE THE CABINET? ──────
      // Not "is it a drawer front" — that was T35-F11's question and it is the
      // one the shoe box walked straight past. A front is INTERIOR when it
      // stands BEHIND the outermost front plane of its own cabinet, which is
      // a fact about where the board is rather than a list of part names, and
      // therefore answers "anything future" as well.
      interior: isInteriorFront(p, outer),
    }))
    .sort((a, b) => (a.y - b.y) || (a.x - b.x));
}

/**
 * ─── TURN 36 (CLAUDE.md F10): THE LAW COVERS EVERY INTERIOR FRONT ───────────
 *
 * The owner: *"front shoe boxa nadal widoczne wymiary przy zamkniętych
 * drzwiach."* T35-F11 hid a DRAWER front behind a shut door by NAMING drawer
 * fronts; the shoe box's face is `role: 'front'` too, is not a `DRAWER-FRONT`,
 * and so was neither hidden by the rule nor excluded from the doors that
 * decide it — a doorless wardrobe with a shoe box in it counted as "having
 * doors" because of its own shoe box.
 *
 * The generalisation is geometric and is the honest question: is this board
 * INSIDE the cabinet? The outermost front plane is where the leaves are; a
 * board materially behind it is a piece you cannot see until something opens.
 * A cabinet whose fronts are all on one plane — a drawer bank, a doorless
 * wardrobe — has no interior front at all, hides nothing, and reads exactly
 * as it did before this turn.
 */
const INTERIOR_TOLERANCE_MM = 1;

/**
 * The plane a DOOR stands on: the carcass's own front face.
 *
 * Not "the frontmost front in this cabinet", which was the first shape of
 * this rule and is circular — a wardrobe whose ONLY front is a shoe-box face
 * would make that face its own outer plane and therefore a door. The carcass
 * is the fixed thing: a leaf hangs in FRONT of it (`doorZ = D + doors.gap`),
 * and a piece you have to open something to see stands BEHIND it.
 */
function outerFrontZ(result) {
  const d = Number(result?.params?.depth);
  return Number.isFinite(d) && d > 0 ? d : null;
}

/** Does this front stand behind the carcass's own front face? */
export function isInteriorFront(panel, outer = null) {
  if (!panel?.box || panel?.meta?.appliance) return false;
  if (outer === null || !Number.isFinite(outer)) return false;
  return (panel.box.z + panel.box.d) < outer - INTERIOR_TOLERANCE_MM;
}

const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;

/**
 * The gaps a cabinet's fronts leave, in the cabinet's own frame.
 *
 * Five kinds, and the owner named all five:
 *
 *   'between-doors'   two fronts side by side, at the same height
 *   'between-drawers' two fronts one above the other
 *   'to-side'         from a front's outer edge to the carcass's own side
 *   'to-top'          from the topmost front to the top of the carcass
 *   'to-floor'        from the lowest front to the carcass's base
 *
 * @param {object} result  computeCabinet() output
 * @returns {Array<{kind:string, axis:'h'|'v', mm:number, from:number, to:number,
 *                  at:number, a:string|null, b:string|null}>}
 *   `from`/`to` are the two faces the number spans on its own axis, and `at` is
 *   where the dimension sits on the other one.
 */
export function frontGaps(result) {
  const fronts = frontRects(result);
  const out = [];
  if (!fronts.length) return out;
  const W = Number(result?.params?.width) || 0;
  const H = Number(result?.params?.height) || 0;

  // ── side by side: same band of height, one beside the other ──
  for (let i = 0; i < fronts.length; i += 1) {
    for (let j = i + 1; j < fronts.length; j += 1) {
      const a = fronts[i];
      const b = fronts[j];
      // They share a run of height, and one is to the left of the other.
      const overlaps = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1;
      if (!overlaps) continue;
      const [left, right] = a.x <= b.x ? [a, b] : [b, a];
      const gap = right.x - (left.x + left.w);
      if (gap < -1) continue;                       // overlapping: not a gap
      // …and nothing standing between them.
      const blocked = fronts.some((o) => o !== left && o !== right
        && o.x > left.x + left.w - 1 && o.x + o.w < right.x + 1
        && Math.min(o.y + o.h, right.y + right.h) - Math.max(o.y, right.y) > 1);
      if (blocked) continue;
      out.push({
        kind: 'between-doors',
        axis: 'h',
        mm: round(gap),
        from: left.x + left.w,
        to: right.x,
        at: Math.max(left.y, right.y) + Math.min(left.h, right.h) / 2,
        a: left.id,
        b: right.id,
      });
    }
  }

  // ── one above the other: same band of width ──
  for (let i = 0; i < fronts.length; i += 1) {
    for (let j = i + 1; j < fronts.length; j += 1) {
      const a = fronts[i];
      const b = fronts[j];
      const overlaps = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1;
      if (!overlaps) continue;
      const [low, high] = a.y <= b.y ? [a, b] : [b, a];
      const gap = high.y - (low.y + low.h);
      if (gap < -1) continue;
      const blocked = fronts.some((o) => o !== low && o !== high
        && o.y > low.y + low.h - 1 && o.y + o.h < high.y + 1
        && Math.min(o.x + o.w, high.x + high.w) - Math.max(o.x, high.x) > 1);
      if (blocked) continue;
      out.push({
        kind: 'between-drawers',
        axis: 'v',
        mm: round(gap),
        from: low.y + low.h,
        to: high.y,
        at: Math.max(low.x, high.x) + Math.min(low.w, high.w) / 2,
        a: low.id,
        b: high.id,
      });
    }
  }

  // ── to the sides ──
  const leftMost = fronts.reduce((m, f) => (f.x < m.x ? f : m), fronts[0]);
  const rightMost = fronts.reduce((m, f) => (f.x + f.w > m.x + m.w ? f : m), fronts[0]);
  out.push({
    kind: 'to-side',
    axis: 'h',
    mm: round(leftMost.x),
    from: 0,
    to: leftMost.x,
    at: leftMost.y + leftMost.h / 2,
    a: null,
    b: leftMost.id,
  });
  out.push({
    kind: 'to-side',
    axis: 'h',
    mm: round(W - (rightMost.x + rightMost.w)),
    from: rightMost.x + rightMost.w,
    to: W,
    // ─── TURN 32 (CLAUDE.md F3): THE FACING FIGURES STAND APART ────────────
    // The owner's fault, 15.08: two gap figures overlap when they sit close —
    // and the classic case is two ADJACENT CABINETS, whose facing to-side
    // figures both sat at mid-height, three millimetres apart in the room.
    // The RIGHT figure steps down one label height, deterministically, so any
    // pair of neighbours reads as two numbers rather than one smudge. A
    // per-unit collision pass cannot see the neighbour; this asymmetry needs
    // no sight at all.
    at: rightMost.y + rightMost.h / 2 - LABEL_STEP_MM,
    a: rightMost.id,
    b: null,
  });

  // ── to the top, and to the floor ──
  const top = fronts.reduce((m, f) => (f.y + f.h > m.y + m.h ? f : m), fronts[0]);
  const bottom = fronts.reduce((m, f) => (f.y < m.y ? f : m), fronts[0]);
  out.push({
    kind: 'to-top',
    axis: 'v',
    mm: round(H - (top.y + top.h)),
    from: top.y + top.h,
    to: H,
    at: top.x + top.w / 2,
    a: top.id,
    b: null,
  });
  out.push({
    kind: 'to-floor',
    axis: 'v',
    mm: round(bottom.y),
    from: 0,
    to: bottom.y,
    at: bottom.x + bottom.w / 2,
    a: null,
    b: bottom.id,
  });

  // A gap the eye cannot see is a gap the drawing should not carry: a front
  // that finishes flush with the carcass leaves a 0 that is a FACT, and one
  // that is a rounding artefact is not. Anything under a tenth is dropped.
  return out.filter((g) => g.mm > 0.1 || near(g.mm, 0, 0.0001));
}

/**
 * ─── WHERE A FRONT'S OWN TWO LABELS SIT (turn 28, CLAUDE.md F8.3/F8.4) ──────
 *
 * The owner, with the toggle on: both numbers sat on the front's centre lines,
 * so they crossed each other in the middle of every leaf — and the middle is
 * also where the add (+) buttons stand, which covered whatever was left.
 *
 * They move apart, and both moves are his:
 *
 *   F8.3  the WIDTH label sits at a QUARTER of the front's height from its
 *         BOTTOM, off the centre where the labels crossed;
 *   F8.4  the HEIGHT label moves clear to the RIGHT of the centre line, out
 *         from under the buttons.
 *
 * The numbers are the profile's (`hoverDimensions.frontLabels`) rather than
 * literals here, and the right-hand shift is clamped to a share of the front's
 * own width so a narrow drawer front cannot carry its number off its edge.
 */
function labelSpec(profile) {
  const L = profile?.hoverDimensions?.frontLabels || {};
  const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
  return {
    widthFromBottom: num(L.widthFromBottom, 0.25),
    heightOffsetMm: num(L.heightOffsetMm, 75),
    heightOffsetMaxShare: num(L.heightOffsetMaxShare, 0.4),
  };
}

/**
 * Every front's own size, as a dimension row apiece.
 *
 * @param {object} result   computeCabinet() output
 * @param {object} [profile]  where the two label placements come from; without
 *   one the same defaults answer, so a caller with no profile in its hand (a
 *   test, an old cached view) draws the same picture.
 */
export function frontSizes(result, profile = null) {
  const L = labelSpec(profile);
  return frontRects(result).flatMap((f) => {
    // F8.4: to the RIGHT of centre, never past the piece's own edge.
    const shift = Math.min(L.heightOffsetMm, f.w * L.heightOffsetMaxShare);
    return [
      {
        kind: 'front-w',
        axis: 'h',
        mm: round(f.w),
        from: f.x,
        to: f.x + f.w,
        // F8.3: a quarter of the way up from the bottom.
        at: f.y + f.h * L.widthFromBottom,
        a: f.id,
        b: f.id,
      },
      {
        kind: 'front-h',
        axis: 'v',
        mm: round(f.h),
        from: f.y,
        to: f.y + f.h,
        at: f.x + f.w / 2 + shift,
        a: f.id,
        b: f.id,
      },
    ];
  });
}

/**
 * ─── TURN 32 (CLAUDE.md F3): TWO FIGURES MUST NOT SIT ON EACH OTHER ─────────
 *
 * The owner's fault, 15.08: "dimension labels overlap when two gap figures
 * sit close." Every row used to render at offset 0, so a 3 mm between-doors
 * figure and the to-side figure beside it landed their plates in the same
 * air. This pass gives each row a LABEL ANCHOR (the middle of its span, at
 * its `at`) and, when two anchors would stand closer than one plate, bumps
 * the later row's chain out by one step — the same per-row `offset` the
 * dimension component has always taken, decided here in the pure layer.
 *
 * The step and the reach are drawing ergonomics, not workshop numbers: one
 * label plate is ~40 mm of world at the zooms a front is read at, and a step
 * of 18 mm clears one plate height. They are parameters, so a caller with a
 * bigger typeface can say so.
 */
/** One label plate's height of world, the rung the spread pass climbs by. */
export const LABEL_STEP_MM = 18;

export function spreadOverlappingRows(rows, { labelMm = 40, stepMm = LABEL_STEP_MM } = {}) {
  const placed = [];
  return (rows || []).map((row) => {
    const cx = row.axis === 'h' ? (row.from + row.to) / 2 : row.at;
    const cy = row.axis === 'h' ? row.at : (row.from + row.to) / 2;
    let offsetMm = 0;
    // Climb until this label stands clear of every one already placed at its
    // own rung. Bounded: each collision moves it one step further out.
    while (placed.some((p) => Math.abs(p.cx - cx) < labelMm
      && Math.abs(p.cy - cy) < stepMm && p.offsetMm === offsetMm)) {
      offsetMm += stepMm;
    }
    placed.push({ cx, cy, offsetMm });
    return offsetMm ? { ...row, offsetMm } : row;
  });
}

/**
 * ─── TURN 35 (CLAUDE.md F11): A DRAWER FRONT BEHIND A SHUT DOOR ────────────
 *
 * The owner, 16.08.2026: *"jeśli są szuflady w szafie, to nie pokazuj wymiarów
 * frontów szuflad, dopóki nie otworzysz szafy — w innym przypadku to nie ma
 * sensu."*
 *
 * A wardrobe's internal drawers stand BEHIND its door — z 518 against the
 * door's 596 on a stock 600 carcass — so with the door shut the client is
 * looking at one leaf and the scene was writing six more figures across it
 * for boards nobody can see. The drawer fronts' own numbers wait for the door.
 *
 * TWO QUESTIONS, kept apart because they are two different things:
 *
 *   `unitHasDoors`  is there anything IN THE WAY? A drawer bank with no door
 *                   (BUDR) has nothing to wait for and hides nothing, ever.
 *                   An APPLIANCE face is not a door in this sense — it is the
 *                   machine's own front, arriving fitted as one of the three
 *                   pieces the kit is, and there are no drawers of ours behind
 *                   it to hide.
 *   `doorsAreOpen`  is one of those doors standing open? The threshold is the
 *                   store's own `> 0.5` (`uiStore toggleAllFronts`), so a door
 *                   part-way through its swing already counts — the same
 *                   ruling F6.7 made for the ironmongery.
 *
 * WHAT COUNTS AS "a drawer front dimension", exactly: the figures that are
 * ABOUT a drawer front and nothing else — its own width, its own height, and
 * the gap between two drawer fronts. A figure with a CARCASS edge at one end
 * (`to-side`, `to-top`, `to-floor`) is the cabinet's own clearance and is read
 * off the leaf that is on show, so it stays; and no door figure moves.
 */

/** The fronts that are DOORS: not a drawer front, and not an appliance's face. */
function doorPanels(result) {
  const outer = outerFrontZ(result);
  return (result?.panels || []).filter((p) => p?.role === 'front' && p.box
    && p.part !== 'DRAWER-FRONT' && !p?.meta?.appliance
    // T36 F10: …and not an INTERIOR front. A shoe box's face is not a door,
    // and a doorless wardrobe with one in it must not count as doored — that
    // would have hidden its drawer fronts with nothing standing in the way.
    && !isInteriorFront(p, outer));
}

/** Has this cabinet anything that has to be opened before you see inside it? */
export function unitHasDoors(result) {
  return doorPanels(result).length > 0;
}

/**
 * Is one of this cabinet's doors open?
 * @param {object} result
 * @param {object|null} openFronts  uiStore's `openFronts[unitId]`, `{ [panelId]: 0..1 }`
 */
export function doorsAreOpen(result, openFronts = null) {
  if (!openFronts) return false;
  return doorPanels(result).some((p) => Number(openFronts[p.id]) > 0.5);
}

/**
 * THE LAW: does this cabinet draw its drawer fronts' own figures right now?
 *
 * No doors → always (a drawer bank is exactly what it was). Doors → only
 * while one of them is open.
 */
export function drawerFrontDimsVisible(result, openFronts = null) {
  return unitHasDoors(result) ? doorsAreOpen(result, openFronts) : true;
}

/** Every interior front in this cabinet, by panel id — the F10 set. */
export function interiorFrontIds(result) {
  return frontRects(result).filter((f) => f.interior).map((f) => f.id);
}

/** Is this row ABOUT an interior front and nothing else? */
function isDrawerFrontRow(row, drawerIds) {
  if (row.kind === 'front-w' || row.kind === 'front-h') return drawerIds.has(row.a);
  if (row.kind === 'between-drawers') return drawerIds.has(row.a) && drawerIds.has(row.b);
  return false;
}

/**
 * The same rows, with the drawer fronts' own figures taken out.
 *
 * Runs BEFORE `spreadOverlappingRows`, so the labels that remain climb only
 * over each other: a door figure never keeps a rung it was pushed onto by a
 * figure that is no longer drawn.
 */
export function withoutDrawerFrontRows(rows, result) {
  // T36 F10: the set is every INTERIOR front now, not only the drawer fronts
  // — "the front dimensions of ANY interior element … render only while the
  // doors are open". The name stays: it is what UnitView and turn 35's tests
  // call, and the law it applies has widened rather than moved.
  const drawerIds = new Set(frontRects(result).filter((f) => f.interior).map((f) => f.id));
  if (!drawerIds.size) return rows || [];
  return (rows || []).filter((row) => !isDrawerFrontRow(row, drawerIds));
}

/**
 * Sizes and gaps together — what the scene draws when the toggle is on.
 *
 * ─── TURN 34 (CLAUDE.md F5): ONE FIGURE AT A MEETING LINE ─────────────────
 *
 * The owner, 16.08.2026: *"czasami pokazuje 2 wymiary 1.5 i 1.5, a mi zależało
 * żeby zawsze pokazywało jeden — przy dojechaniu do szafki żeby się sumowały i
 * pokazywało 3"*.
 *
 * A `to-side` figure is this cabinet's own edge clearance, and it is the
 * truth — except where the cabinet next door is TOUCHING, in which case the
 * client sees ONE gap and the scene draws one leaf-to-leaf dimension in place
 * of the pair (`engine/meetingDimensions.js`). `suppress` is the set of
 * `panelId|side` keys that dimension replaces; it is decided at ROOM level,
 * because a cabinet cannot see the one beside it.
 *
 * Nothing else moves: every other row this function has ever produced — the
 * sizes, the door-to-door and drawer-to-drawer gaps, to-top, to-floor — is
 * exactly what it was, and an empty set is turn 25's own answer to the byte.
 *
 * ─── TURN 35 (CLAUDE.md F11) ──────────────────────────────────────────────
 *
 * `opts.drawerFronts: false` is the one new thing, and it is opt-in: a call
 * with three arguments — every caller written before tonight, `unitCard.js`
 * among them — is turn 34's own answer to the byte, because the option is
 * `undefined` and the branch is not taken. The DECISION is
 * `drawerFrontDimsVisible`; this only carries it out.
 *
 * @param {{drawerFronts?: boolean}|null} [opts]
 */
export function frontDimensionRows(result, profile = null, suppress = null, opts = null) {
  const gaps = frontGaps(result);
  const kept = suppress instanceof Set && suppress.size
    ? gaps.filter((row) => {
      if (row.kind !== 'to-side') return true;
      // The LEFT figure runs to `b`'s left edge; the RIGHT one from `a`'s.
      const panelId = row.a || row.b;
      const side = row.a ? 'right' : 'left';
      return !suppress.has(`${panelId}|${side}`);
    })
    : gaps;
  const rows = [...frontSizes(result, profile), ...kept];
  return spreadOverlappingRows(
    opts?.drawerFronts === false ? withoutDrawerFrontRows(rows, result) : rows,
  );
}

const round = (v) => Math.round((Number(v) || 0) * 100) / 100;
