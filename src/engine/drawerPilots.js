// ─── THE TWO PILOT HOLES THAT HOLD A DRAWER FACE ON (turn 21, CLAUDE.md F1) ─
//
// A drawer face is screwed to its box through two pilot holes: one pair drilled
// in the FAÇADE and one pair in the BOX FRONT behind it. They have to be at the
// same height or the screw does not go through, and the owner found out that
// they were not — he put a drawer in the exploded editor and read it straight
// off the two rows of drillings.
//
// This is the answer to "where are those two rows", asked of a computed
// cabinet. It exists as ENGINE code rather than as a test helper for one
// reason: a verification that rebuilds the thing it verifies proves nothing
// (CLAUDE.md rule R4). The gate (test/turn21-f1-hole-alignment.test.js) and the
// report (scripts/hole-alignment.mjs) both ask THIS, and this is what the app
// itself knows.
//
// ─── THE LAW, AND WHERE EACH HALF OF IT COMES FROM ─────────────────────────
//
// KIT_BUDR_FULL `drawDRAWER_FRONT` L519-529:
//     (if (= drawerNum 1) (setq holeY (+ y0 96.5 G)) (setq holeY (+ y0 96.5)))
// KIT_BUDR_FULL `drawDRAWER_BOX_FRONT` L499-507:
//     (drawCircle "SCREWS_3MM" (+ x0 50.0) …)      ; x0 runs up the box front
// KIT_WARDROBE_FULL `drawWDR_DRAWER_FRONT` L313-322:
//     "drawerNum = drawer number (1=first, 93.5mm; rest=96.5mm from bottom)"
//
// and KIT_BUDR_FULL L712-714 puts the runner's SCREW row 38 mm above the
// runner's own underside, which is flush with the façade's bottom edge (drawer
// 2 up) or on the carcass floor (drawer 1, whose front runs G lower to cover
// it). Chain the pieces off the runner's underside — side 13.5, bottom board 15
// up its groove, box front standing on that board, pilot 50 up the box front —
// and both rows land on `runner bottom + 96.5`. The LISP was always
// self-consistent; the engine anchored the box on the SCREW row and hung every
// drawer in the app 38 mm high.
//
// WHERE THE ENGINE DRILLS, THIS READS THE DRILLING. The BUDR family's façades
// and box fronts carry real holes and their real coordinates are what comes
// back. The wardrobe's internal drawer front and box front are drilled by the
// LISP and emitted as plain rectangles by the engine (a gap this turn records
// rather than closes — adding holes is a CNC delta and the turn's rule is
// zero), so for those the law above is applied to the panel the engine DID
// place. Every row says which of the two it is.
//
// Pure functions — no React, no store, no fetch (engine rule).

/** Every drawer index this unit has, bottom-up, in the engine's own order. */
function drawerIndices(result) {
  const bottoms = result?.drillSummary?.runner_bottoms_carcass_y || [];
  return bottoms.map((_, i) => i + 1);
}

const panelOf = (result, part, drawer) => (result?.panels || []).find(
  (p) => p.part === part && p.box && Number(p.meta?.drawer) === drawer,
);

/**
 * The world Y of a hole given in a panel's own CNC frame.
 *
 * A drawn part may be ROTATED — a drawer box front is laid out lying down, its
 * height running along the sheet's x — so which of a hole's two coordinates is
 * a height is the panel's own business and is read off the panel.
 */
// ─── LICENSED RETIREMENT OF AN EXPORT, 17.08.2026 (T37-F9, iron rule 4) ────
// Called on line 67 below, inside `oneRow()`. The EXPORT was dead — nothing
// outside this module ever named it — and that is what the owner licensed;
// the function stays, because `drawerPilotRows` is imported by the
// hole-alignment gate (`test/turn21-f1`, `scripts/hole-alignment.mjs`).
function holeWorldY(panel, hole) {
  return panel.box.y + (panel.cnc?.rotated ? hole.x : hole.y);
}

/** The one row a set of pilot holes sits on, or null where they disagree. */
function oneRow(panel, holes) {
  const ys = [...new Set(holes.map((h) => holeWorldY(panel, h)))];
  return ys.length === 1 ? ys[0] : null;
}

/**
 * The façade's pilot row for one drawer, in world mm.
 *
 * @returns {{y:number, source:'drilled'|'law', panel:string}|null}
 */
// ─── LICENSED RETIREMENT OF AN EXPORT, 17.08.2026 (T37-F9, iron rule 4) ────
// Called on line 122 below, by `drawerPilotRows`. Export retired; code kept.
function facadePilotRow(result, drawer, profile) {
  const front = panelOf(result, 'DRAWER-FRONT', drawer);
  if (!front) return null;
  const drilled = (front.cnc?.holes || []).filter((h) => h.kind === 'front_screw');
  if (drilled.length) {
    const y = oneRow(front, drilled);
    if (y != null) return { y, source: 'drilled', panel: front.id };
  }
  const DR = profile.wardrobe.drawers;
  const law = drawer === 1 ? DR.firstFrontScrewFromBottom : DR.frontScrewFromBottom;
  return { y: front.box.y + law, source: 'law', panel: front.id };
}

/**
 * The box front's pilot row for one drawer, in world mm.
 *
 * @returns {{y:number, source:'drilled'|'law', panel:string}|null}
 */
// ─── LICENSED RETIREMENT OF AN EXPORT, 17.08.2026 (T37-F9, iron rule 4) ────
// Called on line 123 below, by `drawerPilotRows`. Export retired; code kept.
function boxPilotRow(result, drawer, profile) {
  const bf = panelOf(result, 'DRAWER-BOX-FRONT', drawer);
  if (!bf) return null;
  // Two pilots, 50 mm in from each END of the box front. Both are the same
  // HEIGHT, which is the only coordinate this question is about.
  const drilled = (bf.cnc?.holes || []).filter((h) => h.kind === 'screw');
  if (drilled.length) {
    const y = oneRow(bf, drilled);
    if (y != null) return { y, source: 'drilled', panel: bf.id };
  }
  return { y: bf.box.y + profile.baseDrawerUnit.boxScrewFromEdge, source: 'law', panel: bf.id };
}

/**
 * Both pilot rows for every drawer of one computed cabinet.
 *
 * The `delta` is the whole point: it is zero when the two drillings meet, and
 * it is what test/turn21-f1-hole-alignment.test.js asserts and what
 * verify/t21/hole-alignment.md prints.
 *
 * @returns {Array<{drawer, runnerBottom, runnerScrewRow, facadeY, facadeSource,
 *                  boxY, boxSource, delta}>}
 */
export function drawerPilotRows(result, profile) {
  const bottoms = result?.drillSummary?.runner_bottoms_carcass_y || [];
  const rows = result?.drillSummary?.runner_rows_carcass_y || [];
  const out = [];
  for (const drawer of drawerIndices(result)) {
    const facade = facadePilotRow(result, drawer, profile);
    const box = boxPilotRow(result, drawer, profile);
    if (!facade || !box) continue;
    out.push({
      drawer,
      runnerBottom: bottoms[drawer - 1],
      runnerScrewRow: rows[drawer - 1],
      facadeY: facade.y,
      facadeSource: facade.source,
      facadePanel: facade.panel,
      boxY: box.y,
      boxSource: box.source,
      boxPanel: box.panel,
      delta: facade.y - box.y,
    });
  }
  return out;
}
