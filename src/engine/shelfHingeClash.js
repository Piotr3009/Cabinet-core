// ─── A SHELF AND A HINGE AT THE SAME HEIGHT (turn 30, CLAUDE.md F7) ─────────
//
// The owner's case: a shelf row and a hinge cup land level with each other, and
// the cabinet is cut anyway. Two things then go wrong at once on the same board
// — the ⌀7.5 sleeve cluster and the hinge's plate pattern share a patch of the
// side panel, and the shelf's front edge stands where the arm swings.
//
// ─── THE WINDOW IS DERIVED, AND HERE IS THE DERIVATION ──────────────────────
//
// CLAUDE.md: "collision window: derive from the geometry — cup ⌀35 + the sleeve
// pattern's ±50 — and write the number down, don't feel it." So it is written
// down as an ARITHMETIC rather than as a constant, and every term is a profile
// number that already exists for its own reasons:
//
//     cup half          hardware.hinge.cupDiameter / 2        17.5
//   + cluster reach     max |shelfHoles.clusterOffsets|       50
//   + sleeve half       shelfHoles.diameter / 2                3.75
//   ────────────────────────────────────────────────────────────────
//   = 71.25 mm
//
// A hinge centre nearer than that to a shelf row means the topmost (or
// bottommost) sleeve of the shelf's own cluster reaches into the circle the cup
// occupies. Re-measure the cup — the owner did, in turn 26 — and the window
// moves with it, which is the whole reason this is not a 70 somebody typed.
//
// ─── IT REPORTS. IT DOES NOT FIX ────────────────────────────────────────────
//
// "No silent auto-fix." Nothing here moves a shelf, drops a sleeve or nudges a
// hinge: it returns the pairs and names the two editors that can settle them,
// and a person decides. That is the same grammar turn 25's warnings use and the
// same grammar the shaker frame's refusal uses.
//
// Pure functions and pure data. No React, no store, no three.js.

/** The numbers, defensively read, so a partial profile cannot produce NaN. */
function settings(profile) {
  const H = profile?.hardware?.hinge || {};
  const S = profile?.shelfHoles || {};
  const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
  const offsets = Array.isArray(S.clusterOffsets) && S.clusterOffsets.length
    ? S.clusterOffsets.map((v) => Math.abs(Number(v) || 0))
    : [50];
  return {
    cupDiameter: num(H.cupDiameter, 35),
    clusterReach: Math.max(...offsets),
    sleeveDiameter: num(S.diameter, 7.5),
  };
}

/**
 * HOW NEAR IS TOO NEAR, in millimetres.
 *
 * The one number this module is about, and it is a sum rather than a constant.
 */
export function shelfHingeClashWindowMm(profile) {
  const s = settings(profile);
  return s.cupDiameter / 2 + s.clusterReach + s.sleeveDiameter / 2;
}

/**
 * The pairs that foul each other, on one cabinet.
 *
 * Read off the ENGINE's own published answers — `drillSummary.hinge_centers`
 * (the rows the machine actually drills) and the PIN rows, which is
 * deliberately not every shelf: a FIX shelf has no sleeve cluster at all
 * (turn 24 F7, "jak fix, to nie ma 3 poziomów 7,5") and therefore nothing to
 * foul a cup with. That is not an exception, it is the fix a joiner would make.
 *
 * @param {object} args
 *   result   computeCabinet() output
 *   profile
 * @returns {Array<{shelfY:number, hingeY:number, gapMm:number, windowMm:number,
 *                  shelfPanelId:string|null, shelfItemId:string|null,
 *                  hingeIndex:number, doorPanelId:string|null, message:string}>}
 */
export function shelfHingeClashes({ result, profile }) {
  const windowMm = shelfHingeClashWindowMm(profile);
  const centres = result?.drillSummary?.hinge_centers || [];
  const rows = result?.drillSummary?.shelf_pin_row_y || [];
  if (!centres.length || !rows.length) return [];

  const shelves = (result.panels || []).filter((p) => p.part === 'SHELF' && p.box);
  const doors = (result.panels || []).filter((p) => p.part === 'FRONT' && p.role === 'front'
    && !p.meta?.appliance);

  const out = [];
  for (const shelfY of rows) {
    // The shelf whose UNDERSIDE is this row — the one the pins carry.
    const shelf = shelves.find((p) => Math.abs(p.box.y - shelfY) < 0.5) || null;
    for (let i = 0; i < centres.length; i += 1) {
      const hingeY = Number(centres[i]);
      const gap = Math.abs(hingeY - shelfY);
      if (!(gap < windowMm)) continue;
      // WHICH DOOR. A hinge row belongs to the cabinet — both leaves are
      // drilled as a set — so the clash is reported against the leaf whose own
      // span contains the row, and against the first leaf where a cabinet has
      // only one answer.
      const door = doors.find((p) => hingeY >= p.box.y - 1e-6 && hingeY <= p.box.y + p.box.h + 1e-6)
        || doors[0] || null;
      out.push({
        shelfY,
        hingeY,
        gapMm: Math.round(gap * 100) / 100,
        windowMm,
        shelfPanelId: shelf?.id || null,
        shelfItemId: shelf?.meta?.itemId || null,
        hingeIndex: i,
        doorPanelId: door?.id || null,
        message: `A shelf at ${Math.round(shelfY)} mm and a hinge at ${Math.round(hingeY)} mm are `
          + `${Math.round(gap)} mm apart — closer than the ${Math.round(windowMm * 100) / 100} mm `
          + 'the cup and the shelf’s own sleeves need between them.',
      });
    }
  }
  return out;
}
