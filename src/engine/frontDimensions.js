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
    }))
    .sort((a, b) => (a.y - b.y) || (a.x - b.x));
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
 */
export function frontDimensionRows(result, profile = null, suppress = null) {
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
  return spreadOverlappingRows([...frontSizes(result, profile), ...kept]);
}

const round = (v) => Math.round((Number(v) || 0) * 100) / 100;
