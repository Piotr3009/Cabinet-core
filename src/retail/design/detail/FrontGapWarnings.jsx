import { useMemo } from 'react';
import { useProjectStore } from '../../../stores/projectStore.js';
import { useUiStore } from '../../../stores/uiStore.js';
import { useCabinetProfileStore } from '../../../stores/cabinetProfileStore.js';
import { LAYER_CLASS } from '../../../lib/modalLayer.js';
import { frontGapRows } from '../../../engine/frontClearance.js';
import { anchorOfEvent } from '../../../lib/modalAnchor.js';

// ─── RULE 14: WHAT A CLIENT SEES (turn 31, CLAUDE.md F4) ────────────────────
//
// Turn 30 wrote this overlay for front↔FRONT gaps across a run, and it was
// right about the gaps it could see. It could only see one kind. The owner's
// rulebook is about what stands beside a door — another door, an end panel, an
// infill, an appliance, a bare wall, nothing — and each of those wants a
// different number.
//
// So the list is now the RULEBOOK's (`engine/frontClearance.js frontGapRows`),
// measured front↔NEIGHBOUR and never front↔own carcass, and it says what the
// neighbour IS as well as how far away it is. Every joint appears ONCE: a
// front-to-front gap is seen from both leaves and reporting it twice is a
// joiner counting faults that are not there.
//
// ─── AND IT IS NOW A DOOR, NOT JUST A NOTICE (rule 15) ──────────────────────
//
// Turn 30's overlay had no buttons on purpose — it was a warning about a
// layout nobody could repair from here. Rule 15 gives it a repair, with two
// numbered options, so a row is a BUTTON: clicking it opens the modal beside
// the click, through F1's shell.
//
// A YELLOW row (rule 16 — too wide; rule 5 — a bare wall wants an infill) is
// the same grammar in the other colour, and a PARKED row (rule 7 — the L-shape
// corner) says parked rather than passing silently.

const TONE = {
  red: 'pbi-re-bad pbi-re-hair-bad',
  yellow: 'pbi-re-warn pbi-re-hair-warn',
  parked: 'pbi-re-ink-2 pbi-re-hair',
};

export default function FrontGapWarnings() {
  const units = useProjectStore((s) => s.units);
  const design = useProjectStore((s) => s.project.design);
  const clearances = useProjectStore((s) => s.frontClearances);
  const carcassGapWarnings = useProjectStore((s) => s.carcassGapWarnings);
  const openModal = useUiStore((s) => s.openModal);
  const profile = useCabinetProfileStore((s) => s.profile);

  // Recomputed when the cabinets move, not per frame.
  const rows = useMemo(
    () => frontGapRows(clearances(), profile),
    [units, design, clearances, profile],
  );
  // Rule 13, said in the same place: a gap between CARCASSES is a different
  // fault with a different fix, and showing it beside the front gaps is what
  // stops a joiner narrowing a door to cure a cabinet that is 2 mm off its line.
  const carcass = useMemo(() => carcassGapWarnings(), [units, carcassGapWarnings]);

  if (!rows.length && !carcass.length) return null;

  return (
    <div
      className={`pbi-re-abs pbi-re-left3 pbi-re-bottom3 ${LAYER_CLASS.panel} pbi-re-maxw30 pbi-re-stack-1`}
      data-front-gap-warnings={rows.length}
      data-carcass-gap-warnings={carcass.length}
    >
      {carcass.map((c) => (
        <div
          key={`${c.leftUnitId}-${c.rightUnitId}`}
          data-carcass-gap-mm={c.mm}
          className="pbi-re-row pbi-re-top pbi-re-gap-15 pbi-re-round pbi-re-line pbi-re-fill-ground-85 pbi-re-px2 pbi-re-py1 pbi-re-t11
            pbi-re-lead-snug pbi-re-blur pbi-re-bad pbi-re-hair-bad"
        >
          <span aria-hidden className="pbi-re-nogrow">■</span>
          <span>{c.message}</span>
        </div>
      ))}
      {rows.map((r) => (
        <button
          key={r.key}
          type="button"
          data-front-gap-mm={r.mm}
          data-front-gap-kind={r.kind}
          data-front-gap-level={r.level}
          disabled={r.parked}
          title={r.parked ? 'Parked with the L-shape unit' : 'What to do about it — two options, each with its number'}
          className={`pbi-re-row pbi-re-wfull pbi-re-top pbi-re-gap-15 pbi-re-round pbi-re-line pbi-re-fill-ground-85 pbi-re-px2 pbi-re-py1 pbi-re-left
            pbi-re-t11 pbi-re-lead-snug pbi-re-blur ${TONE[r.level] || TONE.yellow}
            ${r.parked ? 'pbi-re-cursor-default pbi-re-dim80' : 'pbi-re-fill-hover'}`}
          onClick={(e) => {
            if (r.parked) return;
            openModal('front-gap', { row: r, anchor: anchorOfEvent(e) });
          }}
        >
          <span aria-hidden className="pbi-re-nogrow">{r.level === 'red' ? '▲' : '·'}</span>
          <span>{r.message}</span>
        </button>
      ))}
    </div>
  );
}
