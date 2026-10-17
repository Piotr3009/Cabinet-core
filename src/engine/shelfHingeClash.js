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

// TURN 40 (CLAUDE.md F1): the ONE post-split reader. See its own header for the
// walk of the whole chain and for the measurement that told the two fault
// classes apart.
import { drilledHingeRows, hingeRowOwner } from './hingeLadder.js';

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
 * ─── TURN 40 (CLAUDE.md F1): AND POST-SPLIT, WHICH IS THE WHOLE FAULT ──────
 *
 * This read `drillSummary.hinge_centers` — the cabinet's WHOLE-DOOR ladder,
 * which T36-F6 deliberately left where it was when a split leaf started boring
 * its own rows. So on a split wardrobe the rule measured shelves against six
 * hinges that no longer exist and never against the five that do: the owner's
 * *"widzą clash… jakby w starym miejscu przed podzieleniem na top i bottom"*.
 * It now reads `engine/hingeLadder.js`, the one post-split answer, so the y it
 * reports is the y the scene draws and the machine bores. A cabinet with no
 * split reads exactly what it read yesterday — `drilledHingeRows` IS
 * `hinge_centers` there.
 *
 * Read off the ENGINE's own published answers — the rows the machine actually
 * drills (post-split) and the PIN rows, which is
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
  const { cupDiameter, sleeveDiameter } = settings(profile);
  // CHAT FIX 17.10.2026: THE WINDOW IS DERIVED FROM THE ROWS THAT ARE BORED.
  // The owner: *"zeby po nacisnieciu remove sleeve ten jeden rzad sleeve
  // usunac ale nie wszystkie 3 rzedy tylko ten jeden ktory koliduje"*. A shelf
  // whose owner dropped one row of its cluster (`sleeves_dropped`, cabinet.js)
  // publishes a shorter cluster in `shelf_cluster_y`, and the reach is read
  // off THAT, in the hinge's own direction: up to the highest remaining row
  // above the shelf, down to the lowest below it. An untouched cluster reaches
  // 50 both ways and the window is the 71.25 it has been since turn 30, so
  // every record on every cabinet before this day is byte for byte the same.
  const cupR = cupDiameter / 2;
  const sleeveR = sleeveDiameter / 2;
  // TURN 40 (F1): the rows the machine ACTUALLY bores — a split leaf's own two
  // sets where there is one, `hinge_centers` where there is not.
  const centres = drilledHingeRows(result);
  const rows = result?.drillSummary?.shelf_pin_row_y || [];
  const clusters = result?.drillSummary?.shelf_cluster_y || [];
  if (!centres.length || !rows.length) return [];

  const shelves = (result.panels || []).filter((p) => p.part === 'SHELF' && p.box);
  const doors = (result.panels || []).filter((p) => p.part === 'FRONT' && p.role === 'front'
    && !p.meta?.appliance);

  const out = [];
  for (let r = 0; r < rows.length; r += 1) {
    const shelfY = rows[r];
    // The shelf whose UNDERSIDE is this row — the one the pins carry.
    const shelf = shelves.find((p) => Math.abs(p.box.y - shelfY) < 0.5) || null;
    // The offsets still bored at this row (the whole profile cluster where the
    // summary carries none, which is a result older than the key).
    const bored = Array.isArray(clusters[r]) && clusters[r].length
      ? clusters[r].map((y) => Math.round((y - shelfY) * 100) / 100)
      : (profile?.shelfHoles?.clusterOffsets || [-50, 0, 50]).map(Number);
    const reachUp = Math.max(0, ...bored.filter((dy) => dy > 0));
    const reachDown = Math.max(0, ...bored.filter((dy) => dy < 0).map((dy) => -dy));
    for (let i = 0; i < centres.length; i += 1) {
      const hingeY = Number(centres[i]);
      const gap = Math.abs(hingeY - shelfY);
      const windowMm = (hingeY >= shelfY ? reachUp : reachDown) + cupR + sleeveR;
      if (!(gap < windowMm)) continue;
      // Which bored rows the cup itself reaches (the sleeve's circle and the
      // cup's touching): the action's business, not the window's. An edge row
      // alone is a row the owner may drop; the 0 row is the shelf's own seat.
      const offendingOffsets = bored.filter((dy) => Math.abs(hingeY - (shelfY + dy)) < cupR + sleeveR);
      // WHICH DOOR, AND WHICH OF ITS OWN HINGES. A whole door's rows belong to
      // the cabinet — both leaves are drilled as a set — so the clash is
      // reported against the leaf whose own span contains the row, exactly as
      // it always was. A SPLIT leaf's rows belong to ONE SEGMENT, and the
      // index is that segment's own, so "Move the hinge" opens the window the
      // hinge is actually in.
      const owner = hingeRowOwner(result, hingeY);
      const door = (owner && doors.find((p) => p.id === owner.panelId))
        || doors.find((p) => hingeY >= p.box.y - 1e-6 && hingeY <= p.box.y + p.box.h + 1e-6)
        || doors[0] || null;
      out.push({
        shelfY,
        hingeY,
        gapMm: Math.round(gap * 100) / 100,
        windowMm,
        shelfPanelId: shelf?.id || null,
        shelfItemId: shelf?.meta?.itemId || null,
        hingeIndex: owner ? owner.hingeIndex : i,
        doorPanelId: door?.id || null,
        // CHAT FIX 17.10.2026: the rows the cup reaches, and the one the owner
        // may drop with one click (an edge row, alone); null where the seat
        // row (0) is among them or no single row is: "move the shelf or the
        // hinge". Two new keys on every record; the gap and the window are
        // what they were on an untouched shelf.
        offendingOffsets,
        droppableOffset: offendingOffsets.length === 1 && offendingOffsets[0] !== 0 ? offendingOffsets[0] : null,
        // Which leaf of a split this is. ABSENT on a whole door, which is the
        // house rule for a key that would otherwise say nothing on every
        // cabinet in the app — and is what keeps a clash record on an
        // unsplit cabinet byte-for-byte the record it was.
        ...(owner?.split ? { splitSegment: owner.split } : {}),
        message: `A shelf at ${Math.round(shelfY)} mm and a hinge at ${Math.round(hingeY)} mm are `
          + `${Math.round(gap)} mm apart — closer than the ${Math.round(windowMm * 100) / 100} mm `
          + 'the cup and the shelf’s own sleeves need between them.',
      });
    }
  }
  return out;
}
