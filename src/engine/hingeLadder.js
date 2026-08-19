// ─── THE HINGE LADDER, POST-SPLIT, SAID ONCE (turn 40, CLAUDE.md F1) ────────
//
// ─── THE INVESTIGATION, BEFORE THE FIX ──────────────────────────────────────
//
// The owner, 18.08.2026: *"jak wstawiam split doors, to zawiasy chyba nie mają
// żadnej logiki… w modalu doors nie można ich przesuwać, nie widzą półek, nie
// są podzielone na top i bottom"* and *"te zawiasy widzą clash ale nie w tym
// miejscu w którym się pokazują, tylko jakby w starym miejscu przed
// podzieleniem na top i bottom."*
//
// The chain, walked end to end (CLAUDE.md F1's four questions, answered):
//
//  1. WHERE SPLIT DOORS ARE PRODUCED. `engine/splitDoors.js` (T36-F6, the kit's
//     `;; --- SPLIT DOORS (T35)` section) and the pass in `engine/cabinet.js`
//     that consumes it. Both are correct and neither is the fault.
//  2. WHETHER THE SPLIT MAKES TWO DOOR RECORDS. IT DOES. The leaf `01-FL` is
//     REPLACED by `01-FL-T` and `01-FL-B`, each with its own height, its own
//     hinge count from its OWN leaf height, and its own two ladders —
//     `meta.cupY` in the segment's frame and `meta.plateY` in the carcass's.
//     They are published as `drillSummary.hinge_rows_by_panel`.
//  3. WHICH READER THE DOORS MODAL USES. `projectStore.hingeRowsOf()` →
//     `drillSummary.hinge_centers`. And THAT is the whole fault: `hinge_centers`
//     is the cabinet's WHOLE-DOOR ladder and T36 deliberately left it where it
//     was ("the old key is untouched"), so on a 2150 wardrobe split at 600 the
//     modal offers [100, 490, 880, 1270, 1660, 2050] — six rows of a door that
//     no longer exists — while the machine bores [100, 772, 1444] and
//     [1647, 2047]. Moving one of the six writes `params.hinge_rows`, which the
//     split pass never reads, so nothing moves. Hence "nie można ich
//     przesuwać".
//  4. WHICH READER THE COLLISION CHECK USES. `engine/shelfHingeClash.js` →
//     `drillSummary.hinge_centers`, the same pre-split list. So this is NOT the
//     T37/T38-F1a fault class: that one was an in-memory MEMO in the UI and a
//     reload cleared it. Measured here, from node, with no UI at all: a
//     wardrobe split at 600 with a shelf at 780 mm has a real hinge at 772 —
//     8 mm away, well inside the 71.25 mm window — and the check reports
//     NOTHING; move the shelf to 900 and it reports a clash with a hinge at
//     880, where no hinge is. A reload cannot change either answer. It is a
//     genuinely different reader looking at pre-split geometry.
//
// ─── THE CAUSE, AND THEREFORE THE FIX ───────────────────────────────────────
//
// One list is published in two versions and the readers disagree about which
// is real. So this module is the ONE reader: given a computed cabinet, it
// answers "which rows is THIS door drilled at" and "which rows does this
// carcass actually carry", post-split, for everybody — the Doors modal, the
// shelf × hinge rule, the drill guard.
//
// It is a READ. Nothing here computes a ladder, moves a hinge or re-cuts
// anything: every number it returns is one the engine already published, which
// is the point — a second derivation is how this fault got in.
//
// Pure functions — no React, no store, no three.js.

/** The doors a cup hinge is actually screwed to. An appliance front is not one. */
export function isHingedFront(panel) {
  return Boolean(panel && panel.part === 'FRONT' && panel.role === 'front' && !panel.meta?.appliance);
}

/** Two rows are the same row when the machine could not tell them apart. */
const near = (a, b) => Math.abs(Number(a) - Number(b)) < 0.5;

/**
 * The rows ONE door is drilled at, in the CARCASS's frame.
 *
 * A split segment answers with its own — the list `engine/cabinet.js` put on
 * `meta.plateY` and published as `hinge_rows_by_panel`. Every other door
 * answers with the cabinet's ladder, exactly as it did before this turn, so a
 * cabinet with no split reads byte-for-byte what it always read.
 */
export function doorHingeRows(result, panelId) {
  const own = result?.drillSummary?.hinge_rows_by_panel?.[panelId];
  if (Array.isArray(own)) return own.map(Number);
  return (result?.drillSummary?.hinge_centers || []).map(Number);
}

/** Is this panel a door whose ladder is its OWN — a split leaf's segment? */
export function hasOwnHingeRows(result, panelId) {
  return Array.isArray(result?.drillSummary?.hinge_rows_by_panel?.[panelId]);
}

/**
 * Every hinged door of this cabinet with the ladder it is actually drilled at.
 *
 * @returns {Array<{panelId:string, panel:object, rows:number[], split:(string|null)}>}
 */
export function hingedDoorLadders(result) {
  return (result?.panels || [])
    .filter(isHingedFront)
    .map((panel) => ({
      panelId: panel.id,
      panel,
      rows: doorHingeRows(result, panel.id),
      split: panel.meta?.split || null,
    }));
}

/**
 * THE ROWS THE CARCASS IS ACTUALLY BORED AT.
 *
 * The union of every door's own ladder, ascending — which is exactly what
 * `engine/cabinet.js platedRowsFor` drills into the side. On a cabinet with no
 * split every door's ladder IS `hinge_centers`, so this returns that list
 * unchanged and every reader that swaps to it keeps yesterday's answer.
 */
export function drilledHingeRows(result) {
  const ladders = hingedDoorLadders(result);
  if (!ladders.some((l) => hasOwnHingeRows(result, l.panelId))) {
    return (result?.drillSummary?.hinge_centers || []).map(Number);
  }
  const out = [];
  for (const l of ladders) {
    for (const y of l.rows) if (!out.some((v) => near(v, y))) out.push(Number(y));
  }
  return out.sort((a, b) => a - b);
}

/** Does this door's own leaf stand across that height? */
function spans(panel, y) {
  const box = panel?.box;
  if (!box) return false;
  return y >= box.y - 1e-6 && y <= box.y + box.h + 1e-6;
}

/**
 * WHOSE HINGE IS THIS ROW, and which of that door's own hinges is it.
 *
 * The row belongs to the door that is drilled at it AND stands across it — for
 * a split leaf that is the segment the hinge is actually screwed to, and for a
 * whole door it is the leaf whose span contains the row, which is the answer
 * `shelfHingeClashes` gave before this turn and still gives.
 *
 * @returns {{panelId:string, hingeIndex:number, split:(string|null)}|null}
 */
export function hingeRowOwner(result, y) {
  const ladders = hingedDoorLadders(result);
  const drilled = ladders.filter((l) => l.rows.some((r) => near(r, y)));
  const pick = drilled.find((l) => spans(l.panel, y)) || drilled[0] || ladders[0] || null;
  if (!pick) return null;
  const at = pick.rows.findIndex((r) => near(r, y));
  return { panelId: pick.panelId, hingeIndex: at < 0 ? 0 : at, split: pick.split };
}
