import { useMemo } from 'react';
import Modal from '../room/Modal.jsx';
import { useUiStore } from '../../../stores/uiStore.js';
import { useProjectStore } from '../../../stores/projectStore.js';
import { useCabinetProfileStore } from '../../../stores/cabinetProfileStore.js';
import { projectPalette, unitFinishOverride } from '../../../engine/design.js';
import { commonValue } from '../../../lib/selection.js';
import { contrastInk } from '../../../lib/pswColors.js';

// ─── One cabinet's colour (turn 13, CLAUDE.md F3) ───────────────────────────
//
// The owner's bug, in his own words: he set the project colours in step 5, then
// edited ONE cabinet — and the whole job changed colour.
//
// It did, because there was no unit level at all on the front side. The only
// control the right panel could offer was "Design settings…", which opens the
// PROJECT surface; a joiner reaching for "this cabinet's colour" got the
// project's and had no way of knowing. So this window exists, and three things
// about it are the phase:
//
//   IT WRITES THE UNIT (F3.1). `setUnitFinish` puts a pointer on the cabinet's
//   own params. Nothing here can reach `design`.
//
//   IT OFFERS THE PALETTE AND NOTHING ELSE (F3.2). Carcass 1..3 and Front 1..2,
//   exactly what step 5 defined — `projectPalette`, which is a pure function so
//   the list is the same in the picker and in the test. No RAL fan deck, no
//   full decor catalogue: those grow the PALETTE, in Settings, and the hint at
//   the bottom is the way there. A workshop buys board; it does not paint one
//   cabinet a colour it has not bought.
//
//   IT CAN BE UNDONE (F3.3). "Reset to project" clears both pointers, and the
//   window says plainly which of the two levels each swatch is coming from.
//
// It takes a SELECTION rather than one unit, because the same window is what
// the context menu opens over a multi-selection (F5.3) — one modal, one write
// path, and a field the six do not agree on says so instead of lying.

export default function UnitFinishModal() {
  const args = useUiStore((s) => s.modalArgs);
  const closeModal = useUiStore((s) => s.closeModal);
  const openModal = useUiStore((s) => s.openModal);
  const anchor = args?.anchor || null;

  const units = useProjectStore((s) => s.units);
  const design = useProjectStore((s) => s.project.design);
  const setUnitFinish = useProjectStore((s) => s.setUnitFinish);
  const resetUnitFinish = useProjectStore((s) => s.resetUnitFinish);
  const profile = useCabinetProfileStore((s) => s.profile);

  const ids = useMemo(() => {
    const wanted = new Set(args?.unitIds || (args?.unitId ? [args.unitId] : []));
    return units.filter((u) => wanted.has(u.id));
  }, [units, args]);

  const palette = useMemo(() => projectPalette(design, profile), [design, profile]);
  const carcass = palette.filter((p) => p.kind === 'carcass');
  const fronts = palette.filter((p) => p.kind === 'front');

  // What the selection currently wears — one answer if they agree, "mixed" if
  // they do not. Writing is still per-key, so setting the front over six
  // cabinets that disagree about their CARCASS leaves the carcasses alone.
  const chosenCarcass = commonValue(ids, (u) => u.params.carcass_type_id || null);
  const chosenFront = commonValue(ids, (u) => u.params.front_type_id || null);
  const overridden = ids.some((u) => unitFinishOverride(u));

  if (!ids.length) return null;

  const title = ids.length === 1
    ? `${ids[0].params.unit_num} — colour`
    : `${ids.length} cabinets — colour`;

  const write = (patch) => setUnitFinish(ids.map((u) => u.id), patch);

  return (
    <Modal
      name="unit-finish"
      anchor={anchor}
      title={title}
      onClose={closeModal}
      width="pbi-re-w380"
      footer={(
        <>
          <button
            type="button"
            className="pbi-re-btn pbi-re-grow pbi-re-left"
            data-reset-to-project="1"
            disabled={!overridden}
            title="Follow the project's finishes again"
            onClick={() => { resetUnitFinish(ids.map((u) => u.id)); }}
          >
            Reset to project
          </button>
          <button type="button" className="pbi-re-btn-gold" onClick={closeModal}>Done</button>
        </>
      )}
    >
      <div className="pbi-re-stack-3" data-unit-palette="1">
        <Row
          label="Carcass"
          entries={carcass}
          chosen={chosenCarcass}
          onPick={(id) => write({ carcass_type_id: id })}
        />
        <Row
          label="Front"
          entries={fronts}
          chosen={chosenFront}
          onPick={(id) => write({ front_type_id: id })}
        />

        {/* F3.2's hint. The palette is not edited here — it GROWS in Settings,
            and pointing at the door is better than a second colour list that
            would quietly become a rival to it. */}
        <p className="pbi-re-t11 pbi-re-quiet">
          These are the project&apos;s finishes.{' '}
          <button
            type="button"
            className="pbi-re-gold pbi-re-underline"
            data-more-colours="1"
            onClick={() => openModal('design', { anchor })}
          >
            More colours…
          </button>{' '}
          adds them in Settings, where every cabinet wearing that slot follows.
        </p>
      </div>
    </Modal>
  );
}

/** One row of swatches — the project's, and a tick on whichever this unit wears. */
function Row({
  label, entries, chosen, onPick,
}) {
  return (
    <div className="pbi-re-stack-1">
      <div className="pbi-re-fieldrow">
        <span className="pbi-re-fieldlabel pbi-re-mb0 pbi-re-grow">{label}</span>
        {chosen.mixed && <span className="pbi-re-tag" data-mixed="1">mixed</span>}
        {!chosen.mixed && !chosen.value && <span className="pbi-re-t11 pbi-re-quiet">project</span>}
      </div>
      <div className="pbi-re-row pbi-re-wrap pbi-re-gap-1">
        {entries.map((p) => {
          const on = !chosen.mixed && chosen.value === p.id;
          return (
            <button
              key={p.key}
              type="button"
              data-palette-entry={p.key}
              aria-pressed={on}
              className={`pbi-re-px2 pbi-re-py1 pbi-re-round pbi-re-t11 pbi-re-line ${on ? 'pbi-re-hair-gold' : 'pbi-re-hair'}`}
              style={p.hex ? { background: p.hex, color: contrastInk(p.hex) } : undefined}
              title={p.finish?.label || p.label}
              onClick={() => onPick(on ? null : p.id)}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
