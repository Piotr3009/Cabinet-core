// ─── FRONT TO FRONT, ACROSS A RUN (turn 30, CLAUDE.md F12) ──────────────────
//
// CLAUDE.md: "Room level: compute the gap between neighbouring fronts in a run;
// when a gap is **< 3 mm**, paint the pair's meeting edges red and show the
// value. It is a WARNING overlay, not a block. Threshold as a profile number."
//
// ─── WHY THIS IS NOT `frontDimensions.frontGaps` ────────────────────────────
//
// That function is turn 25's and it is right: it measures the gaps INSIDE one
// cabinet — door to door, drawer to drawer, front to side. This is the other
// question, and it is the one a kitchen actually fails at: the gap between the
// last door of one cabinet and the first door of the next. Two cabinets that
// each measure perfectly can still be set out 1.5 mm apart, and nothing in this
// app has ever said so.
//
// ─── WHAT COUNTS AS "NEIGHBOURING" ──────────────────────────────────────────
//
// The same physical facts that break a RUN break this pairing, because they are
// the same facts (`engine/runs.js buildRuns`): a different WALL has no shared
// "along", a TURNED cabinet has no shared axis, and two fronts that do not
// overlap in HEIGHT are not beside each other at all — a wall unit's door and a
// base unit's door share a wall and share nothing else.
//
// So a PAIR is: two fronts on one wall, on unturned cabinets, whose height bands
// overlap, whose front planes are the same plane, with nothing between them.
//
// ─── WHY A WELL-BUILT JOB IS SILENT, AND WHY THAT IS THE POINT ──────────────
//
// Every kit in this engine stands its front `doors.gap / 2` = 1.5 mm inside its
// own carcass, on both edges — measured across the whole type list, and the
// double door and the per-bay doors leave the same 3.00 between leaves. So two
// cabinets standing edge to edge measure exactly 3.00, which is the number, not
// under it. `moveUnit` clamps a slide into the free slot and `updateUnitParams`
// refuses a width that would eat a neighbour ("Width limited to 600 mm by 02"),
// so the editor cannot draw this fault by hand.
//
// What CAN is a job that arrives already laid out — `loadProject` opening a
// saved or imported file, whose positions never passed through `clampUnitX`,
// possibly written by a version of this app that had different numbers. That is
// the layout nothing has ever measured, and it is the one a joiner discovers at
// the wall. An OVERLAP is the same fault worse, so it is reported too, with the
// millimetres it comes out negative.
//
// ─── IT IS A WARNING, AND IT IS NOT A BLOCK ─────────────────────────────────
//
// Nothing here moves a cabinet, re-cuts a door or refuses a layout. It returns
// the pairs and the number, and the room paints them. The cabinet is built
// exactly as it was asked for — the same grammar turn 25's warnings and turn
// 30's own F7 prompt use.
//
// Pure functions and pure data. No React, no store, no three.js.

/** How near two neighbouring fronts may come before it is a fault. */
export function frontGapThresholdMm(profile) {
  const n = Number(profile?.doors?.minNeighbourGapMm);
  return Number.isFinite(n) && n > 0 ? n : 3;
}

/** Is this cabinet in the "along a wall" world at all? */
function alongWall(unit) {
  return !((Number(unit?.position?.rotation_deg) || 0) % 360);
}

/**
 * Every FRONT in the room, placed in its own wall's frame.
 *
 * `x` runs along the wall from its start corner — `unit.position.x_mm` plus the
 * panel's own x — and `y` is height off the floor, which is the cabinet's base
 * plus the panel's own y. Both are the frames the room view already draws in.
 *
 * @param {Array} entries  [{ unit, result }]
 * @param {Function} baseOf  (unit) => how high its carcass starts
 */
export function frontsInRoom(entries, baseOf) {
  const out = [];
  for (const { unit, result } of entries || []) {
    if (!unit || !result || !alongWall(unit)) continue;
    const base = Number(baseOf ? baseOf(unit) : 0) || 0;
    const originX = Number(unit.position?.x_mm) || 0;
    for (const p of result.panels || []) {
      if (p?.role !== 'front' || !p.box) continue;
      out.push({
        unitId: unit.id,
        unitNum: result.unitNum,
        panelId: p.id,
        wall: unit.position?.wall ?? 0,
        x: originX + p.box.x,
        w: p.box.w,
        y: base + p.box.y,
        h: p.box.h,
        // How far the leaf stands off the wall. Two fronts 250 mm apart in
        // DEPTH — a shallow base beside a deep one — are not a joint at all,
        // whatever their x says, so the pairing asks this as well.
        z: p.box.z,
        d: p.box.d,
      });
    }
  }
  return out.sort((a, b) => (a.wall - b.wall) || (a.x - b.x) || (a.y - b.y));
}

/**
 * The pairs of neighbouring fronts that come closer than the threshold.
 *
 * @param {object} args
 *   entries  [{ unit, result }] — the room
 *   baseOf   (unit) => the height its carcass starts at
 *   profile
 * @returns {Array<{a:object, b:object, mm:number, thresholdMm:number,
 *                  wall:number, atX:number, fromY:number, toY:number,
 *                  sameUnit:boolean, message:string}>}
 */
export function frontGapClashes({ entries, baseOf, profile }) {
  const thresholdMm = frontGapThresholdMm(profile);
  const fronts = frontsInRoom(entries, baseOf);
  const out = [];

  for (let i = 0; i < fronts.length; i += 1) {
    for (let j = i + 1; j < fronts.length; j += 1) {
      const a = fronts[i];
      const b = fronts[j];
      if (a.wall !== b.wall) continue;
      // They have to be beside each other in HEIGHT, or they are not a pair:
      // a wall unit's door over a base unit's door shares a wall and nothing
      // else. One millimetre of shared band is the same slack turn 25's own
      // gap reader uses.
      const bandFrom = Math.max(a.y, b.y);
      const bandTo = Math.min(a.y + a.h, b.y + b.h);
      if (bandTo - bandFrom <= 1) continue;
      // …and in the same PLANE. A leaf on a 350 deep cabinet and a leaf on a
      // 600 deep one beside it are 250 mm apart in air; they never meet.
      if (Math.min(a.z + a.d, b.z + b.d) - Math.max(a.z, b.z) <= 0) continue;

      const [left, right] = a.x <= b.x ? [a, b] : [b, a];
      const gap = right.x - (left.x + left.w);
      if (gap >= thresholdMm) continue;

      // …and nothing standing between them, so a run of three doors reports
      // its two REAL joints rather than three pairs including the outer two.
      const blocked = fronts.some((o) => o !== left && o !== right
        && o.wall === left.wall
        && o.x > left.x + left.w - 1e-6 && o.x + o.w < right.x + 1e-6
        && Math.min(o.y + o.h, bandTo) - Math.max(o.y, bandFrom) > 1);
      if (blocked) continue;

      const mm = Math.round(gap * 100) / 100;
      out.push({
        a: left,
        b: right,
        mm,
        thresholdMm,
        wall: left.wall,
        // WHERE the fault is, for the overlay: the meeting line, and the band
        // of height the two actually share.
        atX: (left.x + left.w + right.x) / 2,
        fromY: bandFrom,
        toY: bandTo,
        sameUnit: left.unitId === right.unitId,
        overlap: mm < 0,
        message: (mm < 0
          ? `${left.unitNum || left.unitId}'s ${left.panelId} and ${right.unitNum || right.unitId}'s `
            + `${right.panelId} OVERLAP by ${Math.abs(mm)} mm.`
          : `${mm} mm between ${left.unitNum || left.unitId}'s ${left.panelId} and `
            + `${right.unitNum || right.unitId}'s ${right.panelId} — under the ${thresholdMm} mm minimum.`),
      });
    }
  }
  return out.sort((a, b) => (a.wall - b.wall) || (a.atX - b.atX));
}
