// ─── THE CHECK LIST, READ ONCE AND READ FRESH (turn 38, CLAUDE.md F1a) ──────
//
// The owner, walking T37: *adding a top box recalculates the host's hinges
// correctly, but a Check rule still reads the OLD hinge positions and reports a
// collision where no hinge is any more. A full page reload clears it.*
//
// ─── THE DIAGNOSIS, MEASURED RATHER THAN GUESSED ────────────────────────────
//
// `projectStore.runChecks()` is NOT stale. Driven from node — a wardrobe, a
// shelf, a door, then `addUnit('WARDROBE_TOP')` — it returns the current
// answer on every call, because `allResults()` re-runs `computeCabinet()` from
// `get().units` each time and nothing between them remembers anything.
//
// What remembers is the UI. TWO components print that list — the Check panel
// and the canvas toolbar's badge — and BOTH memoised it on a hand-written
// dependency list:
//
//     const findings = useMemo(() => runChecks(), [units, design, runChecks]);
//
// That list is INCOMPLETE, and every rule that reads something outside it can
// therefore be printed from an answer that no longer exists:
//
//   the PROFILE     the hinge ladders themselves (`hinges.rules`, `endOffset`,
//                   the standard), the shelf×hinge clash WINDOW, both sheet
//                   sizes, the rail clearance — rules #1, #4, #7, #13.
//   the ROOM        the ceiling rule #5 measures its open gap against.
//   the MATERIALS   what a door WEIGHS, which is how rule #4 decides how many
//                   hinges that door needs.
//
// A reload remounts the panel with no memo at all, which is exactly why a
// reload cleared it — the tell in the owner's own sentence.
//
// ─── ONE HOOK, SO THE TWO CANNOT DISAGREE AGAIN ─────────────────────────────
//
// The fix is not a longer dependency list copied into two files: it is ONE
// reader, whose dependencies are `checkDependencies()` — a pure function that
// names every input `runChecks` consumes, exported so a node test can assert
// that it MOVES when the hinge layout moves. The panel and the badge both call
// this, so a third surface that wants the list gets the same freshness for
// free.

import { useMemo } from 'react';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';

/**
 * EVERY INPUT `runChecks()` READS, as an array a memo can be keyed on.
 *
 * Identity, not depth: this app's stores are immutable by convention — a unit
 * that changed is a new object in a new array — so the same comparison React
 * makes is the right one, and it is O(5) rather than a JSON walk on every
 * frame of a drag.
 *
 * Pure, and exported for the test that pins F1a: the hinge layout is a
 * function of (units, design, profile), so a key carrying all three cannot
 * survive a hinge layout being recomputed.
 *
 * @param {object} state  { units, design, room, profile, materials }
 * @returns {Array} the dependency list, in a fixed order
 */
export function checkDependencies({
  units = null, design = null, room = null, profile = null, materials = null,
} = {}) {
  return [units, design, room, profile, materials];
}

/**
 * The Check's findings, recomputed whenever anything they are made of moves.
 *
 * @returns {Array} `engine/checks.js runChecks()` output
 */
export function useCheckFindings() {
  const runChecks = useProjectStore((s) => s.runChecks);
  const units = useProjectStore((s) => s.units);
  const design = useProjectStore((s) => s.project.design);
  // The ceiling rule #5 measures against — missing from both old memos.
  const room = useProjectStore((s) => s.project.room);
  // The hinge LADDERS themselves, the clash window, the two sheet sizes.
  const profile = useCabinetProfileStore((s) => s.profile);
  // What a door weighs, which is how rule #4 counts its hinges.
  const materials = useMaterialAssignmentStore((s) => s.materials);
  const deps = checkDependencies({
    units, design, room, profile, materials,
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the list IS `deps`, named once above
  return useMemo(() => runChecks(), [runChecks, ...deps]);
}
