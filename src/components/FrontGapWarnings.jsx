import { useMemo } from 'react';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { LAYER_CLASS } from '../lib/modalLayer.js';
import { frontGapRows } from '../engine/frontClearance.js';
import { anchorOfEvent } from '../lib/modalAnchor.js';

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
  red: 'text-status-danger border-status-danger/50',
  yellow: 'text-status-warn border-status-warn/50',
  parked: 'text-ink-200 border-shell-600',
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
      className={`absolute left-3 bottom-3 ${LAYER_CLASS.panel} max-w-[30rem] space-y-1`}
      data-front-gap-warnings={rows.length}
      data-carcass-gap-warnings={carcass.length}
    >
      {carcass.map((c) => (
        <div
          key={`${c.leftUnitId}-${c.rightUnitId}`}
          data-carcass-gap-mm={c.mm}
          className="flex items-start gap-1.5 rounded border bg-shell-900/85 px-2 py-1 text-[11px]
            leading-snug backdrop-blur-sm text-status-danger border-status-danger/50"
        >
          <span aria-hidden className="shrink-0">■</span>
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
          className={`flex w-full items-start gap-1.5 rounded border bg-shell-900/85 px-2 py-1 text-left
            text-[11px] leading-snug backdrop-blur-sm ${TONE[r.level] || TONE.yellow}
            ${r.parked ? 'cursor-default opacity-80' : 'hover:bg-shell-800'}`}
          onClick={(e) => {
            if (r.parked) return;
            openModal('front-gap', { row: r, anchor: anchorOfEvent(e) });
          }}
        >
          <span aria-hidden className="shrink-0">{r.level === 'red' ? '▲' : '·'}</span>
          <span>{r.message}</span>
        </button>
      ))}
    </div>
  );
}
