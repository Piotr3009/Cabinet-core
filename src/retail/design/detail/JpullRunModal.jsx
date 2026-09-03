import { useMemo, useState } from 'react';
import Modal from '../room/Modal.jsx';
import { useUiStore } from '../../../stores/uiStore.js';
import { useProjectStore } from '../../../stores/projectStore.js';
import { useCabinetProfileStore } from '../../../stores/cabinetProfileStore.js';
import { jpullEdgeHeight, jpullSpec } from '../../../engine/handles.js';

// ─── THE J-PULL'S ONE SLIDER (turn 58b, CLAUDE.md F3) ───────────────────────
//
// The owner, on the nine numeric fields the settings panel used to carry:
//
//   *"jakieś dziwne ustawienia, po co mi to? ja nie chcę tego… jak już to
//   pasek albo pokrętło… jedynie wysokość — jeden pasek, przedłuż wycięcie J
//   na pionowych i tyle, nic więcej."*
//
// So: ONE control in this window and nothing else. Not a second row, not a
// start height, not a ramp radius — those stay engine constants, which is
// Petros's iron rule of 30.08 said in the only place it can be broken:
// ENGINE NUMBERS DO NOT ENTER THE UI WITHOUT THE OWNER'S ORDER, and the order
// this turn carries is for exactly one of them.
//
// It is opened by clicking the J STRIP of a tall leaf (`3d/UnitView.jsx` ->
// `3d/jpullProfile.js onJpullStrip`), and it opens BESIDE it — rule 15, the
// one the owner marked permanent.
//
// The value is PER LEAF (`unit.params.front_jpull[panelId].jpull_run_mm`).
// Nothing said means the profile's own run, which is how every resolution in
// this application answers: the workshop's number until a hand moves it.

/** The lowest run worth cutting — the owner's own floor for the slider. */
const MIN_RUN_MM = 300;
const STEP_MM = 10;

export default function JpullRunModal() {
  const args = useUiStore((s) => s.modalArgs);
  const closeModal = useUiStore((s) => s.closeModal);
  const notify = useUiStore((s) => s.notify);
  const units = useProjectStore((s) => s.units);
  const unitResult = useProjectStore((s) => s.unitResult);
  const setFrontJpullRun = useProjectStore((s) => s.setFrontJpullRun);
  const P = useCabinetProfileStore((s) => s.profile);

  const anchor = useMemo(() => args?.anchor || null, [args]);
  const unit = units.find((u) => u.id === args?.unitId) || null;
  const result = unit ? unitResult(unit.id) : null;
  const panel = useMemo(
    () => (result?.panels || []).find((p) => p.id === args?.panelId) || null,
    [result, args?.panelId],
  );

  const spec = jpullSpec(P);
  // The leaf's own ceiling: the edge it is cut on, less the start height the
  // engine keeps. This is the SAME arithmetic `jpullRunOf` refuses on, read
  // from the engine rather than restated — a slider that could ask for a run
  // the engine clamps is a slider that lies.
  const edgeH = panel ? jpullEdgeHeight(panel, panel.meta?.jpull?.edge || 'R') : 0;
  const max = Math.max(MIN_RUN_MM, Math.floor((edgeH - spec.fromBottomMm) / STEP_MM) * STEP_MM);
  const saved = unit?.params?.front_jpull?.[args?.panelId]?.jpull_run_mm ?? null;
  const run = panel?.meta?.jpull?.run || null;
  const current = saved ?? (run ? Math.round(run.to - run.from) : spec.runMm);

  // Live preview on drag: the slider writes on every move, so the leaf in the
  // scene lengthens under the hand. `useState` holds only what the input needs
  // between a move and the recompute that follows it.
  const [draft, setDraft] = useState(null);
  const shown = draft == null ? current : draft;

  if (!unit || !panel || !run) return null;

  const commit = (value) => {
    const v = Math.min(max, Math.max(MIN_RUN_MM, Math.round(value / STEP_MM) * STEP_MM));
    setDraft(v);
    setFrontJpullRun(unit.id, panel.id, v);
  };

  return (
    <Modal
      name="jpull-run"
      title={`${unit.params.unit_num} · ${panel.id} · J-pull run`}
      onClose={closeModal}
      anchor={anchor}
      width="pbi-re-w300"
    >
      <div className="pbi-re-stack-2" data-jpull-run-modal={panel.id}>
        <div className="pbi-re-row pbi-re-mid pbi-re-gap-2">
          <input
            type="range"
            className="pbi-re-grow pbi-re-accent"
            min={MIN_RUN_MM}
            max={max}
            step={STEP_MM}
            value={Math.min(max, Math.max(MIN_RUN_MM, shown))}
            data-jpull-run-slider="1"
            aria-label="J run length"
            onChange={(e) => commit(Number(e.target.value))}
          />
          <span
            className="pbi-re-t11 pbi-re-ink-3 pbi-re-tnum pbi-re-w16 pbi-re-right"
            data-jpull-run-value="1"
          >
            {`${Math.min(max, Math.max(MIN_RUN_MM, shown))} mm`}
          </span>
        </div>
        <p className="pbi-re-t11 pbi-re-quiet">
          {`J run length — ${MIN_RUN_MM} to ${max} mm on this leaf.`}
        </p>
        {saved != null && (
          <button
            type="button"
            className="pbi-re-btn-ghost pbi-re-t11"
            data-jpull-run-reset="1"
            onClick={() => {
              setFrontJpullRun(unit.id, panel.id, null);
              setDraft(null);
              notify('This leaf keeps the workshop’s own J run again.', 'ok');
            }}
          >
            Back to the standard run
          </button>
        )}
      </div>
    </Modal>
  );
}
