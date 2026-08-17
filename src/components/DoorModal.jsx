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
// Turn 34 (CLAUDE.md F8): what one Delete removes, and whether it may.
import { deletePlan } from '../engine/deleteElement.js';
import { panelWeight } from '../engine/lifts.js';
import { resolvePanelMaterial } from '../engine/materials.js';
import { migrateDesign } from '../engine/design.js';
import { formatMm, roundTo } from '../engine/format.js';
import { HANDLE_TYPES, handleClassOf } from '../engine/handles.js';
import { getUnitType } from '../engine/types.js';
import { sayHingeResult } from '../lib/hingeEdit.js';
// Turn 36 (CLAUDE.md F6): a split leaf's two segments, TOP FIRST.
import { splitSegmentRows } from '../engine/splitDoors.js';

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
  const openModal = useUiStore((s) => s.openModal);
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
  //
  // ─── TURN 31 (CLAUDE.md F1): AND THAT CONVERSION HAPPENS ONCE ────────────
  // Turn 11's `{ at }` and turn 12's `{ anchor }` used to be reconciled in four
  // separate components, each with its own line. The store's own opener does it
  // now (lib/modalLayer.js `withModalAnchor`), so every window in the app reads
  // one field and there is one place a click becomes a rectangle.
  const anchor = useMemo(() => args?.anchor || null, [args]);

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
      name="element"
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
      <div data-door-modal={panel.id} data-door-modal-sections={isDoor ? 'B,A' : 'A'}>
        {/* ─── TURN 33 (CLAUDE.md F7): ONE HINGE BLOCK, AT THE TOP ─────────
            The owner walked the modal and found hinge controls in TWO places:
            the field list's rows (no arrows, no picker) and turn 19's full
            section below. "Ten górny usuń" — the upper one is GONE (the
            `omit` below keeps the right-hand panel's own rows untouched) and
            the WORKING block — the arrow mover and the hinge picker — stands
            where it sat: one block, at the top. */}
        {/* ─── TURN 36 (CLAUDE.md F6): THE SPLIT'S OWN TWO SEGMENTS ────────
            "modal segments top-first". A split leaf is two doors, each with
            its own height, its own hinge set and its own window; this row
            says which one is open and walks to the other. TOP FIRST — the
            owner's order, the kit's `splitDoorSegments` order, and the same
            law engine/items.js applies to shelves and drawers. */}
        {isDoor && panel.meta?.split ? (
          <section className="mb-2 border-b border-shell-600 pb-2" data-split-modal={panel.meta.splitOf}>
            <span className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">
              Split door — {formatMm(panel.meta.splitTopMm)} mm top
            </span>
            <div className="flex gap-1">
              {splitSegmentRows(result.panels, panel.meta.splitOf).map((seg) => (
                <button
                  key={seg.id}
                  type="button"
                  data-split-segment-tab={seg.id}
                  aria-pressed={seg.panel.id === panel.id}
                  className={`cc-btn px-2 flex-1 ${seg.panel.id === panel.id ? 'border-gold text-gold' : ''}`}
                  title={`${seg.label} segment — ${formatMm(seg.panel.h)} mm`}
                  // The sibling window opens WHERE THIS ONE IS STANDING —
                  // rule 15, and the anchor this modal was given is exactly
                  // that rectangle.
                  onClick={() => openModal('element', {
                    unitId: unit.id, panelId: seg.panel.id, anchor: args?.anchor || null,
                  })}
                >
                  {seg.label} · {formatMm(seg.panel.h)}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {isDoor ? (
          <HingeSection
            ref={hingesRef}
            unit={unit}
            panel={panel}
            result={result}
            row={Number.isFinite(Number(args?.hingeIndex)) ? Number(args.hingeIndex) : null}
          />
        ) : null}

        {/* ─── SECTION A — the piece ─────────────────────────────────────── */}
        <section data-door-section="A">
          <ElementProperties unit={unit} panel={panel} item={item} compact omit={['hinges']} />
          {/* ─── Turn 25 (CLAUDE.md F4): ADD HANDLE ───
              Two questions and no more: which TYPE, and — for a bar — the
              screw CENTRES. Where it goes is the owner's law
              (engine/handles.js); what a person may change is the OFFSET off
              it, and changing that moves every front of the same class in the
              project unless they say otherwise. */}
          <HandleSection unit={unit} panel={panel} />
          {/* ─── TURN 33 (CLAUDE.md F4): MIRRORS ON DOORS ───
              Inside, outside, or none — per DOOR. Bonded, never drilled: the
              choice draws a plane and orders `Mirror W × H`, and not one hole
              travels with it. */}
          <MirrorSection unit={unit} panel={panel} isDoor={isDoor} />
          {/* ─── Turn 25 (CLAUDE.md F13): the same toggle the View menu carries
              — "in the door modal AND in the View menu, scoped to the whole
              project". One piece of state, two places to reach it. */}
          <FrontDimensionsToggle panel={panel} />
          {/* ─── Turn 25 (CLAUDE.md F11): REMOVE DOOR ───
              No confirmation — Undo covers it. */}
          <RemoveDoor unit={unit} panel={panel} onDone={closeModal} />
          {/* ─── TURN 34 (CLAUDE.md F8): DELETE, IN THE MODAL ───
              "w modalu pokaż też Delete" (owner, 16.08.2026). The SAME action
              the key runs — one store call, one plan, one heal sweep — so the
              button and the keyboard can never mean two different things. */}
          <DeleteElement unit={unit} panel={panel} onDone={closeModal} />
          {/* ─── Turn 19 (CLAUDE.md F5.1): WHAT IT WEIGHS ───
              An AVENTOS is chosen on the weight of the front, and a joiner who
              cannot see the weight cannot argue with the proposal. */}
          <PieceWeight unit={unit} panel={panel} />
        </section>

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
    // Turn 33 (F6): a COLUMN's drawers count too — the modal must name the
    // same 155° the BOM buys for a stack living beside a divider.
    innerDrawer: Boolean(result?.derived?.drawers || result?.derived?.column_drawers)
      && unit?.type === 'WARDROBE',
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
              onClick={() => sayHingeResult(setHingePos(unit.id, i, mm + (profile.editor.hingeNudgeMm || 5)), notify)}
            >
              ↑
            </button>
            <button
              type="button"
              className="cc-btn-ghost px-2"
              data-hinge-down={i}
              title="Down — the hinge’s own 5 mm stride"
              onClick={() => sayHingeResult(setHingePos(unit.id, i, mm - (profile.editor.hingeNudgeMm || 5)), notify)}
            >
              ↓
            </button>
            <NumberField
              className="cc-input text-right flex-1"
              data-hinge-modal-row={i}
              value={mm}
              title="Above the carcass floor. It cannot pass the hinge above or below it."
              onCommit={(v) => sayHingeResult(setHingePos(unit.id, i, v), notify)}
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
          onClick={() => sayHingeResult(addHinge(unit.id), notify)}
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

  // ─── TURN 30 (CLAUDE.md F6): THE NAG IS GONE ─────────────────────────────
  //
  // The owner, of moving a handle by ten millimetres: it asks a "dziwne
  // pytanie" every single time. It did — a `window.confirm` naming the count,
  // standing in front of an action that is ONE Ctrl+Z away, on the gesture a
  // person repeats most often in a session. A dialog in front of something that
  // cheap to undo is a dialog that only ever gets dismissed, and turn 25 wrote
  // that sentence itself for Remove door two sections down and then did not
  // apply it here.
  //
  // So the move APPLIES DIRECTLY and one undo step covers it, which is what
  // CLAUDE.md asks for in as many words. The count is still said — as a TOAST,
  // after the fact — because "how wide did that go" is a real question; what is
  // gone is being asked it before anything happens.
  //
  // WHAT IS NOT REMOVED: any warning that guards an actual conflict. A handle
  // driven off its own front is `handleFitProblem` (engine/handles.js) and is
  // printed under these very buttons, whether anybody presses one or not — a
  // conflict is a FACT about the job, and the count was a question about an
  // undo.
  const nudge = (axis, mm) => {
    const base = own?.offset || design.fronts.handleOffsets?.[handleClass] || { x: 0, y: 0 };
    const offset = { ...base, [axis]: (Number(base[axis]) || 0) + mm };
    if (!applyToAll) {
      setFrontHandle(unit.id, panel.id, { type, centres, offset });
      notify(`Handle moved on this front only — it now differs from the other ${handleClass.replace('-', ' ')}s.`);
      return;
    }
    // Counted off the COMPUTED units, so it is the fronts that exist rather
    // than a guess — the same number the confirmation used to name.
    const count = handleClassCountOf(handleClass);
    moveHandleClass(handleClass, offset);
    notify(`Handle moved on ${count.total} front${count.total === 1 ? '' : 's'}`
      + `${count.deviating ? ` (${count.deviating} with a handle of their own did not move)` : ''}`
      + ' — Ctrl+Z puts them back.');
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

          <div
            className="flex items-center gap-1 flex-wrap"
            // ─── TURN 33 (CLAUDE.md F7): the owner's law, said where the hand
            // is: x is measured from THIS door's own handle edge, so a pair
            // mirrors — 30 from the left edge on one leaf, 30 from the right
            // on the other. 50/50, never 60/40.
            title="x is measured from this door’s own handle edge — a left/right pair mirrors, so the handles stay symmetric."
          >
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
 * ─── TURN 33 (CLAUDE.md F4): THE DOOR'S MIRROR ──────────────────────────────
 *
 * none / inside / outside, per door — the same per-door grammar the hinge
 * exception speaks (`door_mirrors[panelId]`). A mirror is BONDED to the face,
 * never drilled: no hole pattern exists and none is invented (rule 3). The
 * engine answers with the plane the 3D draws and the `Mirror W × H` order
 * line — the front minus the profile's margin a side, marked owner-to-confirm.
 */
function MirrorSection({ unit, panel, isDoor }) {
  const setDoorMirror = useProjectStore((s) => s.setDoorMirror);
  const doorMirrorsOf = useProjectStore((s) => s.doorMirrorsOf);
  const notify = useUiStore((s) => s.notify);
  if (!isDoor) return null;
  const current = doorMirrorsOf(unit.id)?.[panel.id] || null;
  const words = { inside: 'inside', outside: 'outside' };
  return (
    <div className="mt-2 pt-2 border-t border-shell-600 space-y-1" data-mirror-section={panel.id}>
      <span className="text-[11px] uppercase tracking-wide text-ink-400">Mirror</span>
      <div className="flex gap-1">
        {[[null, 'None'], ['inside', 'Inside'], ['outside', 'Outside']].map(([face, label]) => (
          <button
            key={label}
            type="button"
            data-door-mirror={face || 'none'}
            className={`cc-btn px-2 text-[11px] flex-1 ${current === face ? 'border-gold text-gold' : ''}`}
            onClick={() => {
              setDoorMirror(unit.id, panel.id, face);
              notify(face
                ? `${panel.id}: mirror on the ${words[face]} face — ordered to the front, bonded, nothing drilled.`
                : `${panel.id}: mirror off.`, 'ok');
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-ink-400">
        Bonded to the face, never drilled. The BOM orders the glass at the front minus 20 mm a side
        — a profile number, owner to confirm (15.08.2026).
      </p>
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
          removeFront(unit.id, panel.id);
          onDone?.();
        }}
      >
        Remove door
      </button>
    </div>
  );
}

/**
 * ─── DELETE (turn 34, CLAUDE.md F8) ─────────────────────────────────────────
 *
 * The owner, 16.08.2026: *"szuflady i wszystkie inne elementy: po naciśnięciu
 * i podświetleniu — usunięcie przez naciśnięcie Delete; w modalu pokaż też
 * Delete."*
 *
 * The button and the key are ONE action (`deleteSelectedElement`), so what it
 * removes, where the selection falls and the heal sweep that follows are the
 * same on both. Where the piece cannot go, this SAYS SO in the plan's own
 * sentence rather than offering a button that refuses — the #58 pattern.
 *
 * NO UNDO SYSTEM EXISTS, and the button says what it does: this is immediate.
 */
function DeleteElement({ unit, panel, onDone }) {
  const deleteSelectedElement = useProjectStore((s) => s.deleteSelectedElement);
  const notify = useUiStore((s) => s.notify);
  const plan = useMemo(() => deletePlan({ unit, panel }), [unit, panel]);
  // The door already has its own Remove button, in its own words, right above.
  if (panel?.part === 'FRONT' && !panel?.meta?.appliance) return null;
  if (!plan.allowed) {
    return (
      <p className="mt-2 pt-2 border-t border-shell-600 text-[11px] text-ink-400" data-element-delete-why="1">
        <span className="text-ink-200">Cannot be deleted.</span> {plan.reason}
      </p>
    );
  }
  return (
    <div className="mt-2 pt-2 border-t border-shell-600">
      <button
        type="button"
        className="cc-btn px-2 text-[11px] text-red-300"
        data-element-delete={panel.id}
        title="Removes it now — there is no undo for this."
        onClick={() => {
          const res = deleteSelectedElement({ unitId: unit.id, elementRef: panel.id });
          if (!res.ok) { notify(res.error || 'Nothing was deleted.', 'warn'); return; }
          // A drawer stack decrements one per press and the selection falls to
          // the next drawer down, so the window stays open on it.
          if (!res.next) onDone?.();
        }}
      >
        Delete {plan.label ? plan.label.toLowerCase() : 'this element'} — no undo
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
