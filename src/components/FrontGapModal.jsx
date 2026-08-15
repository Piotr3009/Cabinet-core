import { useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import {
  NARROW_WARNING, hingeAdjustMm, labelOf, narrowingPlan,
} from '../engine/frontClearance.js';
import { formatMm } from '../engine/format.js';

// ─── RULE 15: THE MODAL, AND ITS TWO OPTIONS ────────────────────────────────
//
// The owner, verbatim: "Gap < 3 mm → RED; the modal offers TWO options, each
// with its number: [Narrow the front(s)] (default; halves of the shortfall,
// asymmetry law applies, cups ride the edge) / [Insert/fix an infill]."
//
// EACH WITH ITS NUMBER is the part that matters and the part an ordinary
// confirm dialog gets wrong. "Do you want to narrow the fronts?" is a question
// nobody can answer; "narrow both fronts by 0.75 mm on the meeting edge" is a
// decision a joiner makes in a second, because he knows what 0.75 costs him and
// what 2 mm of filler costs him.
//
// ─── AND RULE 17 IS SAID BEFORE IT ACTS, NOT AFTER ──────────────────────────
//
// "Narrowing a front warns 'changes BOM and drilling' before it acts." It is on
// the screen beside the button, in the moment the choice is being made — not a
// message afterwards, which is a receipt rather than a warning.
//
// ─── WHAT THIS COMPONENT DOES NOT DECIDE ────────────────────────────────────
//
// Not the millimetres (engine/frontClearance.js `narrowingPlan` — halves of the
// shortfall, the asymmetry law, the hinge-adjustment flag), not which edge
// (the rulebook), and not what happens to the cups (engine/cabinet.js, where
// the trim runs before the drilling). It shows numbers and takes an answer.

export default function FrontGapModal() {
  const args = useUiStore((s) => s.modalArgs);
  const closeModal = useUiStore((s) => s.closeModal);
  const notify = useUiStore((s) => s.notify);
  const profile = useCabinetProfileStore((s) => s.profile);
  const narrowFronts = useProjectStore((s) => s.narrowFronts);
  const setSideInfill = useProjectStore((s) => s.setSideInfillEnabled);
  const [acted, setActed] = useState(false);

  const row = args?.row || null;
  const plan = useMemo(() => (row?.shortfallMm > 0
    ? narrowingPlan({ fronts: row.fronts, shortfallMm: row.shortfallMm, profile })
    : null), [row, profile]);

  if (!row) return null;
  const adjust = hingeAdjustMm(profile);

  const narrow = () => {
    if (!plan) return;
    narrowFronts(plan.trims);
    setActed(true);
    // Rule 11: a correction bigger than the hinge can absorb is a YELLOW, said
    // once, with the number — not a silent re-cut.
    if (plan.beyondHingeAdjust) {
      notify(
        `${formatMm(plan.eachMm)} mm is beyond the hinge's own ±${adjust} mm side adjustment — check.`,
        'warn',
      );
    }
    closeModal();
  };

  const infill = () => {
    // Rule 15's second option. The filler is a per-unit auto-part and the app
    // already knows how to cut one; what this does is turn it ON for the side
    // the gap is on, which is the "insert / fix an infill" the owner asked for.
    const first = row.fronts[0];
    setSideInfill(first.unitId, true);
    setActed(true);
    closeModal();
  };

  return (
    <Modal
      name="front-gap"
      title={`Front gap · ${formatMm(row.mm)} mm`}
      anchor={args?.anchor || null}
      width="w-[460px]"
      onClose={closeModal}
      footer={(
        <button type="button" className="cc-btn" onClick={closeModal}>Leave it</button>
      )}
    >
      <div className="space-y-3">
        <p className="text-sm text-ink-100" data-front-gap-subject>
          {row.message}
        </p>
        <p className="text-[11px] text-ink-400">
          Measured front to {labelOf(row.kind)} — what a client sees, never front to its own carcass.
        </p>

        {plan && (
          <div className="rounded border border-shell-600 p-2 space-y-1.5">
            <div className="text-xs uppercase tracking-wide text-ink-200">Option 1 — narrow the front(s)</div>
            <p className="text-sm text-ink-50" data-front-gap-plan={plan.eachMm}>
              {plan.message}
            </p>
            <p className="text-[11px] text-ink-400">
              {row.fronts.length > 1
                ? `Half the ${formatMm(row.shortfallMm)} mm shortfall each — only the meeting edge moves.`
                : `The whole ${formatMm(row.shortfallMm)} mm — only that edge moves.`}
              {' '}
              The cups travel with the edge; the plates on the carcass do not move.
            </p>
            {plan.beyondHingeAdjust && (
              <p className="text-[11px] text-status-warn" data-front-gap-beyond-adjust="1">
                Beyond the hinge’s own ±{adjust} mm side adjustment — check.
              </p>
            )}
            {/* RULE 17, BEFORE IT ACTS. */}
            <p className="text-[11px] text-status-warn" data-front-gap-cost>{NARROW_WARNING}</p>
            <button
              type="button"
              className="cc-btn-gold w-full"
              data-front-gap-narrow="1"
              disabled={acted}
              onClick={narrow}
            >
              Narrow the front{row.fronts.length > 1 ? 's' : ''} by {formatMm(plan.eachMm)} mm
            </button>
          </div>
        )}

        <div className="rounded border border-shell-600 p-2 space-y-1.5">
          <div className="text-xs uppercase tracking-wide text-ink-200">Option 2 — insert / fix an infill</div>
          <p className="text-[11px] text-ink-400">
            A filler in the gap instead of a re-cut front. Nothing about the fronts changes,
            and the BOM gains a board.
          </p>
          <button
            type="button"
            className="cc-btn w-full"
            data-front-gap-infill="1"
            disabled={acted}
            onClick={infill}
          >
            Insert an infill
          </button>
        </div>

        <p className="text-[11px] text-ink-400">
          Cabinets are never moved to fix a front gap — a gap between carcasses is its own
          fault, with its own fix.
        </p>
      </div>
    </Modal>
  );
}
