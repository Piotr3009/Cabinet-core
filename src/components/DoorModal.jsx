import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from './Modal.jsx';
import NumberField from './NumberField.jsx';
import ElementProperties from './ElementProperties.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import {
  doorHingeAssignment, hingeChoices, resolveDoorHinge, resolveHingeFinish,
} from '../engine/hinges.js';
import { elementLabel } from '../engine/elements.js';
import { panelWeight } from '../engine/lifts.js';
import { resolvePanelMaterial } from '../engine/materials.js';
import { migrateDesign } from '../engine/design.js';
import { formatMm, roundTo } from '../engine/format.js';
import { HANDLE_TYPES, handleClassOf } from '../engine/handles.js';
import { getUnitType } from '../engine/types.js';
import { anchorAtPoint } from '../lib/modalAnchor.js';

// ─── ONE MODAL FOR THE DOOR AND ITS HINGES (turn 30, CLAUDE.md F2) ──────────
//
// The owner: "opowiedz jak chcesz to zrobić" — and CLAUDE.md's answer is this
// file. Until tonight a door had TWO windows. Double-click the leaf and one
// opened; double-click the ironmongery screwed to that same leaf and a second,
// different window opened in its place — because `openModal` has one slot, so
// the two could never even be seen together. Two components, two open paths,
// two answers to "what is open", and a joiner moving a hinge could not see the
// door it hangs on.
//
//   SECTION A  the piece itself — turn 11's element window, whole: its
//              properties, its handle, its front dimensions, its weight, and
//              the button that takes the door off.
//   SECTION B  the hinges — turn 19's window, whole: what this door is fitted
//              with, the assignment that overrides it, the rows, the ±5 mm
//              arrows, the typed millimetre, Reset, remove, add.
//
// ─── WHY IT IS ONE COMPONENT AND NOT TWO IN A WRAPPER ──────────────────────
//
// "One component, one open/close path, one registry of what is open." There is
// now ONE modal kind — `element` — and the hinge gesture opens it with a
// SECTION to scroll to rather than with a different name. So the state that
// says "the door window is open" cannot disagree with itself, Escape has one
// meaning, and the shell places one window.
//
// ─── AND IT IS STILL EVERY PIECE'S WINDOW ──────────────────────────────────
//
// A shelf is not a door and has no hinges: section B is rendered only for a
// hinged front, and everything else opens exactly the window it opened before,
// under its own name. That is what lets the two old files be DELETED rather
// than left behind as a special case — the door is the case with more in it,
// not a different animal.
//
// Nothing here is rewritten. Every store action is the one that was already
// being called (`setHingePos`, `addHinge`, `removeHinge`, `resetHinges`,
// `assignDoorHinge`, `removeFront`, `setFrontHandle`…), so the clamp, the grid,
// the undo step and the recompute are all the ones a joiner has already
// learnt. No new dependency, and the shell is rule 15's own.

export default function DoorModal() {
  const args = useUiStore((s) => s.modalArgs);
  const closeModal = useUiStore((s) => s.closeModal);
  const units = useProjectStore((s) => s.units);
  const unitResult = useProjectStore((s) => s.unitResult);

  const unit = units.find((u) => u.id === args?.unitId) || null;
  const result = unit ? unitResult(unit.id) : null;
  const panel = result?.panels.find((p) => p.id === args?.panelId) || null;
  const item = useMemo(() => {
    const id = panel?.meta?.itemId;
    if (!id) return null;
    return (unit?.params.sections?.[0]?.items || []).find((i) => i.id === id) || null;
  }, [panel, unit]);

  // The piece was pointed at, so the point IS the object as far as the screen
  // is concerned: a rectangle of zero size at the click (lib/modalAnchor.js).
  const anchor = useMemo(
    () => args?.anchor || anchorAtPoint(args?.at?.x, args?.at?.y),
    [args],
  );

  // A HINGED front — not an appliance face, which has no cups and no leaf.
  const isDoor = panel?.part === 'FRONT' && panel?.role === 'front' && !panel?.meta?.appliance;

  // ─── SCROLLED TO SECTION B (F2) ───
  // "Double-click a hinge → the SAME modal, scrolled to section B, that hinge's
  // row highlighted." The shell's body is the scroller (`overflow-y-auto`), so
  // this is the section asking to be brought into it — once, when the window
  // opens on the ironmongery rather than on the board.
  const hingesRef = useRef(null);
  const wantHinges = args?.section === 'hinges';
  useEffect(() => {
    if (!wantHinges || !isDoor) return;
    const node = hingesRef.current;
    if (node?.scrollIntoView) node.scrollIntoView({ block: 'start' });
  }, [wantHinges, isDoor, args?.panelId, args?.hingeIndex]);

  if (!unit || !panel) return null;

  const hand = panel.meta?.hinge === 'R' ? 'right' : 'left';

  return (
    <Modal
      // Turn 14 (CLAUDE.md F4): the window says WHICH piece it is about. A
      // door says "Door", because from tonight it is one window with the
      // ironmongery in it and "piece" would be the one thing it must not say.
      title={isDoor
        ? `${unit.params.unit_num} · Door · ${hand}`
        : `${unit.params.unit_num} · ${elementLabel(panel) || 'piece'}`}
      onClose={closeModal}
      anchor={anchor}
      width="w-[340px]"
    >
      <div data-door-modal={panel.id} data-door-modal-sections={isDoor ? 'A,B' : 'A'}>
        {/* ─── SECTION A — the piece ─────────────────────────────────────── */}
        <section data-door-section="A">
          <ElementProperties unit={unit} panel={panel} item={item} compact />
          {/* ─── Turn 25 (CLAUDE.md F4): ADD HANDLE ───
              Two questions and no more: which TYPE, and — for a bar — the
              screw CENTRES. Where it goes is the owner's law
              (engine/handles.js); what a person may change is the OFFSET off
              it, and changing that moves every front of the same class in the
              project unless they say otherwise. */}
          <HandleSection unit={unit} panel={panel} />
          {/* ─── Turn 25 (CLAUDE.md F13): the same toggle the View menu carries
              — "in the door modal AND in the View menu, scoped to the whole
              project". One piece of state, two places to reach it. */}
          <FrontDimensionsToggle panel={panel} />
          {/* ─── Turn 25 (CLAUDE.md F11): REMOVE DOOR ───
              No confirmation — Undo covers it. */}
          <RemoveDoor unit={unit} panel={panel} onDone={closeModal} />
          {/* ─── Turn 19 (CLAUDE.md F5.1): WHAT IT WEIGHS ───
              An AVENTOS is chosen on the weight of the front, and a joiner who
              cannot see the weight cannot argue with the proposal. */}
          <PieceWeight unit={unit} panel={panel} />
        </section>

        {/* ─── SECTION B — the hinges ────────────────────────────────────── */}
        {isDoor ? (
          <HingeSection
            ref={hingesRef}
            unit={unit}
            panel={panel}
            result={result}
            row={Number.isFinite(Number(args?.hingeIndex)) ? Number(args.hingeIndex) : null}
          />
        ) : null}

        <p className="text-[11px] text-ink-400 mt-2">
          The same fields are in the right-hand panel, which is already showing this piece.
        </p>
      </div>
    </Modal>
  );
}

/**
 * ─── SECTION B — THE HINGES (turn 19, CLAUDE.md F1.3 / W36; turn 30 F2) ─────
 *
 * The owner, verbatim, in turn 19: "a jak jedna szafka będzie miała inne
 * hinges, to po podwójnym kliknięciu na hinge otworzy się modal… przesuń
 * up/down plus assign if other hinge."
 *
 * Two things in one section, and they are two things a joiner does to a hinge:
 *
 *   MOVE IT. Not a second copy of the right panel's rows — it calls the SAME
 *   store setters (`setHingePos`, `addHinge`, `removeHinge`, `resetHinges`),
 *   which is where the clamp and the workshop grid live.
 *
 *   ASSIGN ANOTHER ONE. The exception to the project's rule, for THIS DOOR. The
 *   dropdown is the catalogue's own hinge entries (engine/hinges.js
 *   `hingeChoices`), so it lists what the workshop can actually buy and nothing
 *   else; "Follow the rule" hands the door back.
 *
 * The two halves are deliberately different in scope and the section says so:
 * the ROWS belong to the cabinet, because its doors are drilled as a set and
 * the carcass carries one hinge column per hinged side; the ASSIGNMENT belongs
 * to the DOOR, because two leaves of one cabinet can be fitted differently and
 * the BOM has to buy both.
 *
 * Turn 30 moved it INSIDE the door's own window and changed nothing else in
 * it — the markup below is turn 19's, hooks and `data-` attributes and all, so
 * every gesture that worked yesterday works tonight.
 */
function HingeSection({
  ref, unit, panel, result, row,
}) {
  const notify = useUiStore((s) => s.notify);
  const hingeRowsOf = useProjectStore((s) => s.hingeRowsOf);
  const setHingePos = useProjectStore((s) => s.setHingePos);
  const addHinge = useProjectStore((s) => s.addHinge);
  const removeHinge = useProjectStore((s) => s.removeHinge);
  const resetHinges = useProjectStore((s) => s.resetHinges);
  const assignDoorHinge = useProjectStore((s) => s.assignDoorHinge);
  const storedDesign = useProjectStore((s) => s.project.design);
  const profile = useCabinetProfileStore((s) => s.profile);
  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);

  const rows = hingeRowsOf(unit.id);
  const finish = resolveHingeFinish(design, profile);
  // Every hinge in the catalogue, whatever its finish — a joiner assigning an
  // exception is allowed to reach for the onyx one on a nickel job, because
  // that is exactly the kind of thing an exception is for.
  const choices = useMemo(() => hingeChoices(), []);
  const assigned = doorHingeAssignment(unit.params, panel.id);

  // What this door resolves to right now — the answer the BOM will print. It
  // is the engine's own function, so the window cannot describe one hinge while
  // the parts list orders another.
  const spec = useMemo(() => resolveDoorHinge({
    assigned,
    frontThickness: panel?.thickness ?? unit?.params?.front_t ?? profile.front.thickness,
    innerDrawer: Boolean(result?.derived?.drawers) && unit?.type === 'WARDROBE',
    finish,
  }), [assigned, panel, unit, result, finish, profile]);

  return (
    <section
      ref={ref}
      className="mt-3 pt-3 border-t border-shell-600 space-y-3"
      data-door-section="B"
      data-hinge-modal="1"
    >
      <span className="text-[11px] uppercase tracking-wide text-gold">Hinges</span>

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
          <div key={`h${i}`} className={`flex items-center gap-1 rounded ${row === i ? 'ring-1 ring-gold/70' : ''}`} data-hinge-row={i} data-hinge-row-current={row === i ? '1' : ''}>
            <span className="text-[10px] text-ink-400 w-4 tabular-nums">{i + 1}</span>
            <button
              type="button"
              className="cc-btn-ghost px-2"
              data-hinge-up={i}
              title="Up — the hinge’s own 5 mm stride"
              onClick={() => setHingePos(unit.id, i, mm + (profile.editor.hingeNudgeMm || 5))}
            >
              ↑
            </button>
            <button
              type="button"
              className="cc-btn-ghost px-2"
              data-hinge-down={i}
              title="Down — the hinge’s own 5 mm stride"
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
    </section>
  );
}

/**
 * WHAT THIS PIECE WEIGHS (turn 19, CLAUDE.md F5.1).
 *
 * "Derived: a front's weight in kg (area × kg_m2), shown in the element detail
 * footer." Every piece gets the line, not only a front: the same arithmetic is
 * true of a shelf and a joiner lifting a 25 mm oak one up a stairwell has the
 * same question. What the LIFT engine will use it for (turn 20) is the fronts.
 *
 * It says WHERE the figure came from, because that is the difference between a
 * number and a guess: an assigned board's own kg/m², or the workshop's table —
 * and when the table has no row for this thickness, the nearest board it does
 * have, said out loud rather than rounded in silence.
 */
function PieceWeight({ unit, panel }) {
  const profile = useCabinetProfileStore((s) => s.profile);
  const materials = useMaterialAssignmentStore((s) => s.materials);
  const storedDesign = useProjectStore((s) => s.project.design);
  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);

  const weight = useMemo(() => {
    const material = resolvePanelMaterial(panel, unit, design, profile, materials);
    return panelWeight({
      panel, material, materials, profile,
    });
  }, [panel, unit, design, profile, materials]);

  if (!weight.kg) return null;
  return (
    <p className="text-[11px] text-ink-400 mt-2" data-piece-weight={roundTo(weight.kg, 2)}>
      Weight <span className="text-ink-100">{roundTo(weight.kg, 2)} kg</span>
      {' — '}
      {formatMm(panel.w)} × {formatMm(panel.h)} at {weight.kgM2} kg/m²
      {weight.source === 'stock'
        ? ', from the assigned board.'
        : `, from the workshop's ${weight.kind === 'mdf_lacquered' ? 'lacquered MDF' : 'MFC'} table${weight.exact ? '.' : ' — nearest thickness, no board assigned yet.'}`}
    </p>
  );
}

// ─── HANDLES (turn 25, CLAUDE.md F4) ────────────────────────────────────────

/**
 * The handle section of a front's modal.
 *
 * F4 asks for exactly two questions — TYPE and, for a bar, SCREW CENTRES — and
 * this asks them and no more. Where the handle goes is the owner's law
 * (`engine/handles.js`) and is shown rather than asked; what a person may edit
 * is the OFFSET off that reference, and that is where F4.4 lives:
 *
 *   MOVING ONE MOVES ALL. A new position applies to every front of the same
 *   CLASS in the project — a kitchen's handles must line up. Unticking `apply
 *   to all` confines it to this front, which then wears a DEVIATION BADGE, the
 *   same grammar turn 19 gave a per-hinge override.
 */
function HandleSection({ unit, panel }) {
  const profile = useCabinetProfileStore((s) => s.profile);
  const storedDesign = useProjectStore((s) => s.project.design);
  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);
  const setProjectHandle = useProjectStore((s) => s.setProjectHandle);
  const setFrontHandle = useProjectStore((s) => s.setFrontHandle);
  const moveHandleClass = useProjectStore((s) => s.moveHandleClass);
  const handleClassCountOf = useProjectStore((s) => s.handleClassCountOf);
  const notify = useUiStore((s) => s.notify);
  const [applyToAll, setApplyToAll] = useState(true);

  const spec = panel?.meta?.handle || null;
  const handleClass = useMemo(
    () => handleClassOf(panel, getUnitType(unit.type)),
    [panel, unit.type],
  );
  if (!handleClass) return null;

  const project = design.fronts.handle;
  const own = unit.params.front_handles?.[panel.id] || null;
  const type = own?.type || project?.type || 'bar';
  const centres = Number(own?.centres || project?.centres) || profile.handles.defaultCentres;

  const add = (patch) => {
    const next = { type, centres, ...patch };
    if (applyToAll) {
      setProjectHandle(next);
      setFrontHandle(unit.id, panel.id, null);
    } else {
      setFrontHandle(unit.id, panel.id, next);
    }
  };

  const nudge = (axis, mm) => {
    const base = own?.offset || design.fronts.handleOffsets?.[handleClass] || { x: 0, y: 0 };
    const offset = { ...base, [axis]: (Number(base[axis]) || 0) + mm };
    if (!applyToAll) {
      setFrontHandle(unit.id, panel.id, { type, centres, offset });
      notify(`Handle moved on this front only — it now differs from the other ${handleClass.replace('-', ' ')}s.`);
      return;
    }
    const count = handleClassCountOf(handleClass);
    // The confirmation NAMES THE COUNT (F4.4). It is counted off the computed
    // units, so it is the fronts that exist rather than a guess.
    // eslint-disable-next-line no-alert, no-restricted-globals
    const ok = typeof window === 'undefined' || window.confirm(
      `This moves handles on ${count.total} front${count.total === 1 ? '' : 's'}`
      + `${count.deviating ? ` (${count.deviating} with a handle of their own will not move)` : ''}.`,
    );
    if (!ok) return;
    moveHandleClass(handleClass, offset);
  };

  return (
    <div className="mt-2 pt-2 border-t border-shell-600 space-y-2" data-handle-section={handleClass}>
      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-ink-400">Handle</span>
        {spec?.deviation && (
          <span
            className="text-[10px] px-1 rounded border border-gold text-gold"
            data-handle-deviation={panel.id}
            title="This front has a handle of its own — it does not follow the project."
          >
            own
          </span>
        )}
      </div>

      {!spec && (
        <div className="flex gap-1">
          {HANDLE_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="cc-btn px-2 text-[11px]"
              data-add-handle={t.id}
              title={t.hint}
              onClick={() => add({ type: t.id })}
            >
              Add {t.label.toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {spec && (
        <>
          <div className="flex items-center gap-1 flex-wrap">
            {HANDLE_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`cc-btn px-2 text-[11px] ${type === t.id ? 'border-gold text-ink-50' : ''}`}
                data-handle-type={t.id}
                onClick={() => add({ type: t.id })}
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              className="cc-btn px-2 text-[11px] ml-auto"
              data-remove-handle={panel.id}
              onClick={() => { setProjectHandle(null); setFrontHandle(unit.id, panel.id, null); }}
            >
              Remove
            </button>
          </div>

          {type === 'bar' && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] text-ink-400">Centres</span>
              {profile.handles.barCentres.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`cc-btn px-1 text-[11px] ${centres === c ? 'border-gold text-ink-50' : ''}`}
                  data-handle-centres={c}
                  onClick={() => add({ centres: c })}
                >
                  {c}
                </button>
              ))}
              <NumberField
                className="cc-input w-16"
                value={centres}
                min={16}
                max={1200}
                onCommit={(v) => add({ centres: v })}
              />
            </div>
          )}

          <p className="text-[11px] text-ink-400" data-handle-rule={spec.rule}>
            {formatMm(spec.x)} × {formatMm(spec.y)} from the bottom-left · {spec.rule.replace(/-/g, ' ')}
            {spec.problem ? ` · ${spec.problem}` : ''}
          </p>

          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] text-ink-400">Move</span>
            {[['x', -10], ['x', 10], ['y', -10], ['y', 10]].map(([axis, mm]) => (
              <button
                key={`${axis}${mm}`}
                type="button"
                className="cc-btn px-1 text-[11px]"
                data-handle-nudge={`${axis}${mm > 0 ? '+' : ''}${mm}`}
                onClick={() => nudge(axis, mm)}
              >
                {axis}{mm > 0 ? '+' : ''}{mm}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1 text-[11px] text-ink-400">
            <input
              type="checkbox"
              checked={applyToAll}
              data-handle-apply-all
              onChange={(e) => setApplyToAll(e.target.checked)}
            />
            Apply to all {handleClass.replace(/-/g, ' ')}s in the project
          </label>
        </>
      )}
    </div>
  );
}

/**
 * ─── REMOVE DOOR (turn 25, CLAUDE.md F11) ───────────────────────────────────
 *
 * At the bottom of section A, separated by a rule. No confirmation dialog —
 * Undo covers it, and a dialog in front of an action that is one Ctrl+Z away is
 * a dialog that only ever gets dismissed.
 *
 * R9 does the rest: the hinge holes leave with the door and return with it, in
 * the same recompute, because they only ever existed while it did.
 */
function RemoveDoor({ unit, panel, onDone }) {
  const removeFront = useProjectStore((s) => s.removeFront);
  const notify = useUiStore((s) => s.notify);
  if (panel?.part !== 'FRONT' || panel?.meta?.appliance) return null;
  return (
    <div className="mt-2 pt-2 border-t border-shell-600">
      <button
        type="button"
        className="cc-btn px-2 text-[11px] text-red-300"
        data-remove-door={panel.id}
        onClick={() => {
          const res = removeFront(unit.id, panel.id);
          if (res) notify(res.scope === 'bay' ? 'Door removed from the bay.' : 'Doors removed.');
          onDone?.();
        }}
      >
        Remove door
      </button>
    </div>
  );
}

/**
 * ─── SHOW FRONT DIMENSIONS (turn 25, CLAUDE.md F13) ─────────────────────────
 *
 * Scoped to the WHOLE PROJECT, and the label says so: a joiner ticking it on
 * one door and finding numbers on fourteen would think it broken, and the
 * sentence under it is what stops that. It is the owner's own choice of scope —
 * the numbers this is for are the GAPS, and a gap belongs to two fronts at once.
 */
function FrontDimensionsToggle({ panel }) {
  const showFrontDimensions = useUiStore((s) => s.showFrontDimensions);
  const toggleFrontDimensions = useUiStore((s) => s.toggleFrontDimensions);
  if (panel?.role !== 'front') return null;
  return (
    <label className="flex items-start gap-1.5 mt-2 pt-2 border-t border-shell-600 text-[11px] text-ink-400">
      <input
        type="checkbox"
        className="mt-0.5"
        data-front-dimensions
        checked={showFrontDimensions}
        onChange={toggleFrontDimensions}
      />
      <span>
        <span className="text-ink-100">Show front dimensions</span>
        {' — '}
        every front&apos;s width and height and the gaps around it, for the whole project.
      </span>
    </label>
  );
}
