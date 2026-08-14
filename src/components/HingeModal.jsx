import { useMemo } from 'react';
import Modal from './Modal.jsx';
import NumberField from './NumberField.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import {
  doorHingeAssignment, hingeChoices, resolveDoorHinge, resolveHingeFinish,
} from '../engine/hinges.js';
import { migrateDesign } from '../engine/design.js';
import { formatMm } from '../engine/format.js';
import { anchorAtPoint } from '../lib/modalAnchor.js';

// ─── DOUBLE-CLICK A HINGE (turn 19, CLAUDE.md F1.3 / W36) ───────────────────
//
// The owner, verbatim: "a jak jedna szafka będzie miała inne hinges, to po
// podwójnym kliknięciu na hinge otworzy się modal… przesuń up/down plus assign
// if other hinge."
//
// Two things in one window, and they are two things a joiner does to a hinge:
//
//   MOVE IT. Turn 17 already put add / remove / move-by-millimetre in the right
//   panel and this is not a second copy of that — it calls the SAME store
//   setters (`setHingePos`, `addHinge`, `removeHinge`, `resetHinges`), which is
//   where the clamp and the workshop grid live. What turn 19 adds is a
//   CONVENIENT ENTRANCE: the hinge you are looking at, opened by pointing at it.
//
//   ASSIGN ANOTHER ONE. The exception to the project's rule, for THIS DOOR. The
//   dropdown is the catalogue's own hinge entries (engine/hinges.js
//   `hingeChoices`), so it lists what the workshop can actually buy and nothing
//   else; "Follow the rule" hands the door back.
//
// The two halves are deliberately different in scope and the window says so:
// the ROWS belong to the cabinet, because its doors are drilled as a set and
// the carcass carries one hinge column per hinged side; the ASSIGNMENT belongs
// to the DOOR, because two leaves of one cabinet can be fitted differently and
// the BOM has to buy both.
//
// Placed by the shell, which since turn 19 opens up and to the RIGHT of the
// click (F3) — this is the modal the owner was looking at when he said the
// window covered the thing it was about.

export default function HingeModal() {
  const args = useUiStore((s) => s.modalArgs);
  const closeModal = useUiStore((s) => s.closeModal);
  const notify = useUiStore((s) => s.notify);
  const units = useProjectStore((s) => s.units);
  const unitResult = useProjectStore((s) => s.unitResult);
  const hingeRowsOf = useProjectStore((s) => s.hingeRowsOf);
  const setHingePos = useProjectStore((s) => s.setHingePos);
  const addHinge = useProjectStore((s) => s.addHinge);
  const removeHinge = useProjectStore((s) => s.removeHinge);
  const resetHinges = useProjectStore((s) => s.resetHinges);
  const assignDoorHinge = useProjectStore((s) => s.assignDoorHinge);
  const storedDesign = useProjectStore((s) => s.project.design);
  const profile = useCabinetProfileStore((s) => s.profile);

  const unit = units.find((u) => u.id === args?.unitId) || null;
  const result = unit ? unitResult(unit.id) : null;
  const panel = result?.panels.find((p) => p.id === args?.panelId) || null;
  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);

  const anchor = useMemo(
    () => args?.anchor || anchorAtPoint(args?.at?.x, args?.at?.y),
    [args],
  );

  const rows = unit ? hingeRowsOf(unit.id) : [];
  const finish = resolveHingeFinish(design, profile);
  // Every hinge in the catalogue, whatever its finish — a joiner assigning an
  // exception is allowed to reach for the onyx one on a nickel job, because
  // that is exactly the kind of thing an exception is for.
  const choices = useMemo(() => hingeChoices(), []);
  const assigned = unit && panel ? doorHingeAssignment(unit.params, panel.id) : null;

  // What this door resolves to right now — the answer the BOM will print. It
  // is the engine's own function, so the window cannot describe one hinge while
  // the parts list orders another.
  const spec = useMemo(() => resolveDoorHinge({
    assigned,
    frontThickness: panel?.thickness ?? unit?.params?.front_t ?? profile.front.thickness,
    innerDrawer: Boolean(result?.derived?.drawers) && unit?.type === 'WARDROBE',
    finish,
  }), [assigned, panel, unit, result, finish, profile]);

  if (!unit || !panel) return null;

  const row = Number.isFinite(Number(args?.hingeIndex)) ? Number(args.hingeIndex) : null;

  return (
    <Modal
      title={`${unit.params.unit_num} · hinges · ${panel.meta?.hinge === 'R' ? 'right' : 'left'} door`}
      onClose={closeModal}
      anchor={anchor}
      width="w-[340px]"
    >
      <div className="space-y-3" data-hinge-modal="1">
        {/* ── what this door is fitted with, and what decided it ───────────── */}
        <div className="space-y-1">
          <span className="text-[11px] uppercase tracking-wide text-ink-400">This door</span>
          <p className="text-[11px] text-ink-400" data-hinge-resolved={spec.family || ''}>
            {spec.angle ? (
              <>
                <span className="text-ink-100">{spec.angle}°</span>
                {spec.family ? <> · <span className="text-ink-100">{spec.family}</span></> : null}
                {spec.finish ? ` · ${spec.finish}` : ''}
                {spec.article ? ` · ${spec.article}` : ''}
                {' — '}
                {spec.assigned
                  ? 'assigned by hand; the front’s thickness does not move it.'
                  : `from the front (${formatMm(panel.thickness)} mm) and what is behind this door.`}
              </>
            ) : (
              'No hinge catalogue has been read — the drilling is unchanged and the BOM lists no article.'
            )}
          </p>
        </div>

        {/* ── assign another one ───────────────────────────────────────────── */}
        <div className="space-y-1">
          <span className="text-[11px] uppercase tracking-wide text-ink-400">Assign other hinge</span>
          <select
            className="cc-input w-full"
            data-hinge-assign="1"
            value={assigned || ''}
            title="This door only. The rest of the job keeps the project's answer."
            onChange={(e) => {
              const family = e.target.value || null;
              assignDoorHinge(unit.id, panel.id, family);
              notify(family
                ? `${panel.id}: ${family} assigned — this door only.`
                : `${panel.id}: back on the rule.`, 'ok');
            }}
          >
            <option value="">Follow the rule ({spec.ruleAngle ? `${spec.ruleAngle}°` : 'the front decides'})</option>
            {choices.map((c) => (
              <option key={c.family} value={c.family}>{c.label}</option>
            ))}
          </select>
          <p className="text-[11px] text-ink-400">
            This DOOR, not the cabinet — the other leaf keeps its own answer, and the BOM buys both.
            Nothing about the drilling changes: the cup, the screws and the plate holes are the same
            wherever the hinge came from.
          </p>
        </div>

        {/* ── move it up and down ──────────────────────────────────────────── */}
        <div className="space-y-1" data-hinge-modal-rows="1">
          <div className="cc-row">
            <span className="cc-label flex-1">Hinges · {rows.length}</span>
            {Array.isArray(unit.params.hinge_rows) && unit.params.hinge_rows.length ? (
              <button
                type="button"
                className="cc-btn px-2"
                data-hinge-modal-reset="1"
                title="Back to the kit's own spacing and the project standard"
                onClick={() => resetHinges(unit.id)}
              >
                Reset
              </button>
            ) : null}
          </div>
          {rows.map((mm, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={`h${i}`} className={`flex items-center gap-1 rounded ${row === i ? 'ring-1 ring-gold/70' : ''}`}>
              <span className="text-[10px] text-ink-400 w-4 tabular-nums">{i + 1}</span>
              <button
                type="button"
                className="cc-btn-ghost px-2"
                data-hinge-up={i}
                title="Up — the hinge\u2019s own 5 mm stride"
                onClick={() => setHingePos(unit.id, i, mm + (profile.editor.hingeNudgeMm || 5))}
              >
                ↑
              </button>
              <button
                type="button"
                className="cc-btn-ghost px-2"
                data-hinge-down={i}
                title="Down — the hinge\u2019s own 5 mm stride"
                onClick={() => setHingePos(unit.id, i, mm - (profile.editor.hingeNudgeMm || 5))}
              >
                ↓
              </button>
              <NumberField
                className="cc-input text-right flex-1"
                data-hinge-modal-row={i}
                value={mm}
                title="Above the carcass floor. It cannot pass the hinge above or below it."
                onCommit={(v) => setHingePos(unit.id, i, v)}
              />
              <button
                type="button"
                className="cc-btn-ghost px-2"
                data-hinge-modal-remove={i}
                title="Take this hinge off"
                onClick={() => removeHinge(unit.id, i)}
              >
                −
              </button>
            </div>
          ))}
          <button
            type="button"
            className="cc-btn w-full"
            data-hinge-modal-add="1"
            title="One more hinge, in the biggest gap in the run"
            onClick={() => addHinge(unit.id)}
          >
            + Add a hinge
          </button>
          <p className="text-[11px] text-ink-400">
            The ROWS are the cabinet’s — both leaves, because they are drilled as a set. Editing them
            turns the project standard off for this cabinet; Reset hands it back.
          </p>
        </div>
      </div>
    </Modal>
  );
}
