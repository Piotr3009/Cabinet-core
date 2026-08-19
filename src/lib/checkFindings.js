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
import { useUiStore } from '../stores/uiStore.js';
import { anchorOfEvent } from './modalAnchor.js';
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


// ─── TURN 40 (CLAUDE.md F4c): "TAKE ME THERE", AS ONE GESTURE ───────────────
//
// The owner: *"super, teraz tak robi, ale nie bierze nas dokładnie do tego
// miejsca… jeśli to ta półka, powinno nas wziąć do tej półki, jakby najechać
// kamerą na nią, lub na zawias który jest problemem. Jeśli drzwi zamknięte, to
// otwiera program drzwi i nas tam zabiera."*
//
// Four things in one order, and the order matters:
//
//   1. OPEN THE DOORS, if the piece is behind them. A camera that flies into a
//      shut wardrobe shows a door. Doors opened for this reason STAY OPEN —
//      *"do not fight the user by closing them again"* is CLAUDE.md's own line
//      and nothing here ever closes one.
//   2. SELECT the piece, which is what rings it (`3d/SelectionOutline.jsx`).
//   3. FLY to it — `focusOnPanel`, resolved by the view that owns the frame.
//   4. OPEN the editor the finding names.
//
// It is a hook rather than four calls copied into two components, because two
// copies of this order is how one surface ends up flying before it opens.

/**
 * The one "take me there" gesture, for any surface that lists findings.
 *
 * @returns {(subject:object|null, e:object|null) => void}
 */
export function useGoToSubject() {
  const selectUnit = useUiStore((s) => s.selectUnit);
  const selectElement = useUiStore((s) => s.selectElement);
  const openModal = useUiStore((s) => s.openModal);
  const focusOnPanel = useUiStore((s) => s.focusOnPanel);
  const openFrontsFor = useUiStore((s) => s.openFrontsFor);
  const unitResult = useProjectStore((s) => s.unitResult);

  return (subject, e = null) => {
    if (!subject?.unitId) return;
    const { unitId, panelId } = subject;
    if (panelId) {
      // 1 — IS IT BEHIND A CLOSED DOOR? A piece is, unless it IS one: a front
      // stands outside the carcass and swings, and flying at an opening door
      // is a way to see nothing (`3d/UnitView.jsx` has refused to focus a front
      // since turn 5, for the same reason).
      const result = unitResult(unitId);
      const piece = result?.panels?.find((p) => p.id === panelId) || null;
      const isFront = piece?.role === 'front' || piece?.part === 'FRONT' || piece?.part === 'DRAWER-FRONT';
      if (piece && !isFront) {
        const fronts = (result.panels || [])
          .filter((p) => p.part === 'FRONT' && p.role === 'front' && !p.meta?.appliance)
          .map((p) => p.id);
        if (fronts.length) openFrontsFor(unitId, fronts);
      }
      // 2 — select it, which rings it.
      selectElement(unitId, panelId);
      // 3 — and fly. `atMm` centres on the hinge's own row where the finding
      // named one.
      focusOnPanel(unitId, panelId, { atMm: subject.atMm ?? null });
    } else {
      selectUnit(unitId);
    }
    // 4 — the window the finding names.
    openModal(subject.editor || 'cabinet', {
      unitId,
      panelId: panelId || undefined,
      ...(subject.section ? { section: subject.section } : {}),
      ...(subject.hingeIndex != null ? { hingeIndex: subject.hingeIndex } : {}),
      anchor: anchorOfEvent(e),
    });
  };
}
