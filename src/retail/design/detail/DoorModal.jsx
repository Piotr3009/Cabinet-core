import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../room/Modal.jsx';
import NumberField from '../room/NumberField.jsx';
import ElementProperties from './ElementProperties.jsx';
import { useUiStore } from '../../../stores/uiStore.js';
import { useProjectStore } from '../../../stores/projectStore.js';
import { useCabinetProfileStore } from '../../../stores/cabinetProfileStore.js';
import { useMaterialAssignmentStore } from '../../../stores/materialAssignmentStore.js';
import {
  doorHingeAssignment, hingeChoices, resolveDoorHinge, resolveHingeFinish,
} from '../../../engine/hinges.js';
import { elementLabel } from '../../../engine/elements.js';
// Turn 34 (CLAUDE.md F8): what one Delete removes, and whether it may.
import { deletePlan } from '../../../engine/deleteElement.js';
import { panelWeight } from '../../../engine/lifts.js';
import { resolvePanelMaterial } from '../../../engine/materials.js';
import { migrateDesign } from '../../../engine/design.js';
import { formatMm, roundTo } from '../../../engine/format.js';
import { HANDLE_TYPES, handleClassOf } from '../../../engine/handles.js';
import { getUnitType } from '../../../engine/types.js';
import { sayHingeResult } from '../../../lib/hingeEdit.js';
// Turn 36 (CLAUDE.md F6): a split leaf's two segments, TOP FIRST.
// T37-F4b: …and what THIS leaf has been asked to split at — one law, read the
// same way the engine reads it (unit-wide, or this bay's own answer).
import { splitSegmentRows, splitTopFor } from '../../../engine/splitDoors.js';
// Turn 36 (CLAUDE.md F4c): …and a door's hinge rows, TOP FIRST as well.
import { hingeRows } from '../../../engine/items.js';

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

  // ─── TURN 37 (CLAUDE.md F4c): CLICK ANOTHER LEAF, THE WINDOW FOLLOWS ───────
  //
  // The owner, of the doors modal: *"niech się nie wyłącza za każdym razem jak
  // kliknę — dopiero krzyżykiem; a niech się przeskakuje tylko nazwa drzwi,
  // które są kliknięte."* Two halves of one sentence: the window STAYS (it is
  // `sticky` and the key is off, below), and what changes when a hand lands on
  // another leaf is its SUBJECT — the title, the hinges, the split field.
  //
  // It is done HERE, on the selection this component already lives beside, and
  // not in the 3-D: the scene reports what was clicked, exactly as it did
  // yesterday, and nothing in `src/3d/` learns a second thing about modals.
  // Re-opening `element` is what SWAPS the subject rather than replacing the
  // window — the shell keeps its place, because it reads `modalArgs` and holds
  // no state of its own about which door it is on.
  //
  // A shelf's window does not do this: `isDoor` is the guard, and rule 15's
  // beside-the-object law is untouched for every other piece in the app.
  const selected = useUiStore((s) => s.selectedElement);
  useEffect(() => {
    if (!isDoor || !selected?.unitId || !selected?.elementRef) return;
    if (selected.unitId === args?.unitId && selected.elementRef === args?.panelId) return;
    const other = units.find((u) => u.id === selected.unitId);
    const leaf = other
      ? (unitResult(other.id)?.panels || []).find((p) => p.id === selected.elementRef)
      : null;
    // Only a LEAF swaps the subject. Clicking a shelf while the doors modal
    // stands open leaves it exactly where it is — it is not a close either.
    if (!leaf || leaf.part !== 'FRONT' || leaf.role !== 'front' || leaf.meta?.appliance) return;
    openModal('element', {
      unitId: selected.unitId, panelId: selected.elementRef, anchor: args?.anchor || null,
    });
  }, [selected, isDoor, args, units, unitResult, openModal]);

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
      // ─── TURN 37 (CLAUDE.md F4c): THE DOORS MODAL'S OWN CONDUCT ───────────
      //
      // The owner, verbatim: *"włącza i wyłącza się jak pojebane — niech się
      // ustawi po lewej stronie ekranu całkowicie, i niech się nie wyłącza za
      // każdym razem jak kliknę — dopiero krzyżykiem."*
      //
      //   dock          it STANDS at the left edge, always the same place, and
      //                 never over the door it is about.
      //   sticky        a pointer-down in the scene reaches the scene: the
      //                 window does not eat the click and does not close on it.
      //                 (T33's own prop, unchanged — this is its second user.)
      //   escapeCloses  the key is off. Only the × closes this window.
      //
      // A DOOR ONLY. This one component is still every piece's window, and a
      // shelf's opens beside the shelf, draggable, Escape-closable — rule 15,
      // which CLAUDE.md marked permanent and this turn overrides for THIS
      // modal and no other.
      dock={isDoor ? 'left' : null}
      sticky={isDoor}
      escapeCloses={!isDoor}
      width="pbi-re-w340"
    >
      <div data-door-modal={panel.id} data-door-modal-sections={isDoor ? 'B,A' : 'A'}>
        {/* ─── TURN 37 (CLAUDE.md F4b): THE SPLIT, WHERE THE DOOR IS ───────
            "Dodanie splitu powinno być w modalu doors też, i to widoczne
            bardzo — nie mała jakaś malutka pierdółka." Its own row, full
            width, first thing in the window. */}
        {isDoor ? <SplitDoorField unit={unit} panel={panel} anchor={args?.anchor || null} /> : null}
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
          <section className="pbi-re-mb2 pbi-re-line-b pbi-re-hair pbi-re-pb2" data-split-modal={panel.meta.splitOf}>
            <span className="pbi-re-block pbi-re-t10 pbi-re-caps pbi-re-track pbi-re-quiet pbi-re-mb1">
              Split door — {formatMm(panel.meta.splitTopMm)} mm top
            </span>
            <div className="pbi-re-row pbi-re-gap-1">
              {splitSegmentRows(result.panels, panel.meta.splitOf).map((seg) => (
                <button
                  key={seg.id}
                  type="button"
                  data-split-segment-tab={seg.id}
                  aria-pressed={seg.panel.id === panel.id}
                  className={`pbi-re-btn pbi-re-px2 pbi-re-grow ${seg.panel.id === panel.id ? 'pbi-re-hair-gold pbi-re-gold' : ''}`}
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

        <p className="pbi-re-t11 pbi-re-quiet pbi-re-mt2">
          The same fields are in the right-hand panel, which is already showing this piece.
        </p>
      </div>
    </Modal>
  );
}

/**
 * ─── TURN 37 (CLAUDE.md F4b): THE SPLIT FIELD, IN THE DOORS MODAL ───────────
 *
 * The owner, 17.08.2026: *"dodanie splitu powinno być w modalu doors też, i to
 * widoczne bardzo — nie mała jakaś malutka pierdółka."*
 *
 * So: its OWN labelled row, FULL WIDTH, at the top of the window — the first
 * thing in the door's modal, not a line at the bottom of a list. The bay-side
 * field in the right-hand panel STAYS (CLAUDE.md: "the bay-side field stays");
 * this is a second surface onto the same one number, and both commit through
 * the same store setters, so they cannot mean two different things.
 *
 * WHICH NUMBER IT WRITES is the leaf's own: a leaf that lives in a BAY writes
 * that bay's answer (`setBaySplitTop` — 0 there means "not this bay", even
 * where the unit asked for one), and a leaf across the face writes the unit's
 * (`setSplitTop`). That is the same hierarchy `engine/splitDoors.js splitTopFor`
 * reads back, which is why the value below is read through it rather than off
 * one of the two fields.
 *
 * AND THE WINDOW SURVIVES ITS OWN EDIT. Typing 600 RE-CUTS the leaf: `DOOR-1`
 * becomes `DOOR-1-T` and `DOOR-1-B`, and the panel this window was opened on
 * stops existing. Rather than going blank — which would be the "wyłącza się jak
 * pojebane" the owner is complaining about in F4c — it re-points itself at the
 * TOP segment (or back at the whole leaf when the split is cleared), asking the
 * ENGINE which of the two ids is actually there rather than guessing: a number
 * the kit refuses (either segment under 100 mm) leaves the leaf whole, and the
 * window has to land on the door that exists.
 */
function SplitDoorField({ unit, panel, anchor }) {
  const setSplitTop = useProjectStore((s) => s.setSplitTop);
  const setBaySplitTop = useProjectStore((s) => s.setBaySplitTop);
  const openModal = useUiStore((s) => s.openModal);
  const notify = useUiStore((s) => s.notify);

  // The leaf's own bay, and the leaf's own id — a SEGMENT carries `splitOf`,
  // which is the whole leaf this pair was cut from.
  const bay = panel.meta?.bay ?? null;
  const baseId = panel.meta?.splitOf || panel.id;
  const value = Number(panel.meta?.splitTopMm)
    || splitTopFor({ unit: unit.params.split_top_mm, bays: unit.params.bay_doors }, bay)
    || 0;

  const commit = (v) => {
    const mm = Math.max(0, Math.round(Number(v) || 0));
    if (bay == null) setSplitTop(unit.id, mm);
    else setBaySplitTop(unit.id, bay, mm);
    const fresh = useProjectStore.getState().unitResult(unit.id);
    const ids = new Set((fresh?.panels || []).map((p) => p.id));
    const split = ids.has(`${baseId}-T`);
    const next = [`${baseId}-T`, baseId].find((id) => ids.has(id));
    if (next && next !== panel.id) {
      // The anchor this window was opened with travels on, so the shell has an
      // object to fall back to if this piece ever stops being a door (T31-F1's
      // rule: an object-bound window is opened WITH its object).
      openModal('element', { unitId: unit.id, panelId: next, anchor: anchor || null });
    }
    const refused = mm > 0 && !split;
    notify(split
      ? `${baseId}: split at ${formatMm(mm)} mm — a fix shelf goes on the line, full depth.`
      : `${baseId}: one door${refused ? ' — that number leaves a segment under 100 mm, so it was refused' : ''}.`,
    refused ? 'warn' : 'ok');
  };

  return (
    <section
      className="pbi-re-mb3 pbi-re-pb3 pbi-re-line-b pbi-re-hair pbi-re-stack-1"
      data-split-door-modal={baseId}
    >
      <span className="pbi-re-block pbi-re-t11 pbi-re-caps pbi-re-track pbi-re-gold">Split door</span>
      <div className="pbi-re-row pbi-re-mid pbi-re-gap-2 pbi-re-wfull">
        <span className="pbi-re-txs pbi-re-ink-2 pbi-re-grow">Top segment</span>
        <NumberField
          className="pbi-re-input pbi-re-w24 pbi-re-right"
          data-split-top-modal="1"
          min={0}
          value={value}
          title="The upper leaf's height, in mm. 0 = one door, as before."
          onCommit={commit}
        />
        <span className="pbi-re-t11 pbi-re-quiet">mm</span>
      </div>
      <p className="pbi-re-t11 pbi-re-quiet">
        {bay == null
          ? 'Every leaf across this face.'
          : `Bay ${bay + 1} only — the other bays keep their own answer.`}
        {' '}
        The bottom segment is what is left after the 3 mm between them, and a fix shelf goes on the
        line — full depth, no 20 mm setback: that is what a divider is. Shelves centre against it as
        they do against the top and the base.
      </p>
    </section>
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

  // ─── TURN 40 (CLAUDE.md F1): THE ROWS OF THIS DOOR, NOT OF A DOOR THAT
  //     NO LONGER EXISTS ─────────────────────────────────────────────────────
  //
  // The owner: *"w modalu doors nie można ich przesuwać"*. This asked the
  // CABINET for its ladder, and on a split leaf that ladder is the whole-door
  // one the split replaced — six rows on a 2150 wardrobe where the machine
  // bores three and two. Moving one wrote `params.hinge_rows`, which the split
  // pass does not read, so nothing moved. It asks about the PANEL now, and
  // every setter below is handed the same panel, so what the window shows and
  // what the arrow moves are one list.
  const isSplitLeaf = Boolean(panel?.meta?.split);
  const rows = hingeRowsOf(unit.id, panel.id);
  const ownSplitRows = Boolean(unit.params.split_hinge_rows && unit.params.split_hinge_rows[panel.id]);
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
      className="pbi-re-mt3 pbi-re-pt3 pbi-re-line-t pbi-re-hair pbi-re-stack-3"
      data-door-section="B"
      data-hinge-modal="1"
    >
      <span className="pbi-re-t11 pbi-re-caps pbi-re-track pbi-re-gold">Hinges</span>

      {/* ── what this door is fitted with, and what decided it ───────────── */}
      <div className="pbi-re-stack-1">
        <span className="pbi-re-t11 pbi-re-caps pbi-re-track pbi-re-quiet">This door</span>
        <p className="pbi-re-t11 pbi-re-quiet" data-hinge-resolved={spec.family || ''}>
          {spec.angle ? (
            <>
              <span className="pbi-re-ink-1">{spec.angle}°</span>
              {spec.family ? <> · <span className="pbi-re-ink-1">{spec.family}</span></> : null}
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
      <div className="pbi-re-stack-1">
        <span className="pbi-re-t11 pbi-re-caps pbi-re-track pbi-re-quiet">Assign other hinge</span>
        <select
          className="pbi-re-input pbi-re-wfull"
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
        <p className="pbi-re-t11 pbi-re-quiet">
          This DOOR, not the cabinet — the other leaf keeps its own answer, and the BOM buys both.
          Nothing about the drilling changes: the cup, the screws and the plate holes are the same
          wherever the hinge came from.
        </p>
      </div>

      {/* ── move it up and down ──────────────────────────────────────────── */}
      <div className="pbi-re-stack-1" data-hinge-modal-rows="1">
        <div className="pbi-re-fieldrow">
          <span className="pbi-re-fieldlabel pbi-re-grow" data-hinge-scope={isSplitLeaf ? panel.meta.split : 'cabinet'}>
            Hinges · {rows.length}
            {isSplitLeaf ? ` · ${panel.meta.split} leaf` : ''}
          </span>
          {(isSplitLeaf ? ownSplitRows : Array.isArray(unit.params.hinge_rows) && unit.params.hinge_rows.length) ? (
            <button
              type="button"
              className="pbi-re-btn pbi-re-px2"
              data-hinge-modal-reset="1"
              title="Back to the kit's own spacing and the project standard"
              onClick={() => resetHinges(unit.id, isSplitLeaf ? panel.id : null)}
            >
              Reset
            </button>
          ) : null}
        </div>
        {/* ─── TURN 36 (CLAUDE.md F4c): TOP HINGE FIRST ────────────────────
            The owner's third finding, re-issued from T35-F5: *the modal's
            hinge rows sort by Y DESCENDING.* The order is `engine/items.js
            hingeRows`, beside the shelf and drawer lists that have read
            top-down since turn 4 — the engine counts from the floor, a human
            reads from the ceiling.
            Every row carries the ENGINE's own index, and that is the
            load-bearing half: `setHingePos` and `removeHinge` index into the
            ASCENDING list, so a reversed display that went on passing its own
            loop counter would make the top row's − delete the bottom hinge.
            The gold ring reads the same index, because the 3-D pick counts
            bottom-up too. */}
        {hingeRows(rows).map((hr) => (
          <div
            key={`h${hr.index}`}
            className={`pbi-re-row pbi-re-mid pbi-re-gap-1 pbi-re-round ${row === hr.index ? 'pbi-re-ring pbi-re-ring-gold' : ''}`}
            data-hinge-row={hr.index}
            data-hinge-row-current={row === hr.index ? '1' : ''}
          >
            <span className="pbi-re-t10 pbi-re-quiet pbi-re-w4 pbi-re-tnum">{hr.num}</span>
            <button
              type="button"
              className="pbi-re-btn-ghost pbi-re-px2"
              data-hinge-up={hr.index}
              title="Up — the hinge’s own 5 mm stride"
              onClick={() => sayHingeResult(setHingePos(unit.id, hr.index, hr.mm + (profile.editor.hingeNudgeMm || 5), isSplitLeaf ? panel.id : null), notify)}
            >
              ↑
            </button>
            <button
              type="button"
              className="pbi-re-btn-ghost pbi-re-px2"
              data-hinge-down={hr.index}
              title="Down — the hinge’s own 5 mm stride"
              onClick={() => sayHingeResult(setHingePos(unit.id, hr.index, hr.mm - (profile.editor.hingeNudgeMm || 5), isSplitLeaf ? panel.id : null), notify)}
            >
              ↓
            </button>
            <NumberField
              className="pbi-re-input pbi-re-right pbi-re-grow"
              data-hinge-modal-row={hr.index}
              value={hr.mm}
              title="Above the carcass floor. It cannot pass the hinge above or below it."
              onCommit={(v) => sayHingeResult(setHingePos(unit.id, hr.index, v, isSplitLeaf ? panel.id : null), notify)}
            />
            <button
              type="button"
              className="pbi-re-btn-ghost pbi-re-px2"
              data-hinge-modal-remove={hr.index}
              title="Take this hinge off"
              onClick={() => removeHinge(unit.id, hr.index, isSplitLeaf ? panel.id : null)}
            >
              −
            </button>
          </div>
        ))}
        <button
          type="button"
          className="pbi-re-btn pbi-re-wfull"
          data-hinge-modal-add="1"
          title="One more hinge, in the biggest gap in the run"
          onClick={() => sayHingeResult(addHinge(unit.id, isSplitLeaf ? panel.id : null), notify)}
        >
          + Add a hinge
        </button>
        <p className="pbi-re-t11 pbi-re-quiet">
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
    <p className="pbi-re-t11 pbi-re-quiet pbi-re-mt2" data-piece-weight={roundTo(weight.kg, 2)}>
      Weight <span className="pbi-re-ink-1">{roundTo(weight.kg, 2)} kg</span>
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
    <div className="pbi-re-mt2 pbi-re-pt2 pbi-re-line-t pbi-re-hair pbi-re-stack-2" data-handle-section={handleClass}>
      <div className="pbi-re-row pbi-re-mid pbi-re-gap-2">
        <span className="pbi-re-t11 pbi-re-caps pbi-re-track pbi-re-quiet">Handle</span>
        {spec?.deviation && (
          <span
            className="pbi-re-t10 pbi-re-px1 pbi-re-round pbi-re-line pbi-re-hair-gold pbi-re-gold"
            data-handle-deviation={panel.id}
            title="This front has a handle of its own — it does not follow the project."
          >
            own
          </span>
        )}
      </div>

      {!spec && (
        <div className="pbi-re-row pbi-re-gap-1">
          {HANDLE_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="pbi-re-btn pbi-re-px2 pbi-re-t11"
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
          <div className="pbi-re-row pbi-re-mid pbi-re-gap-1 pbi-re-wrap">
            {HANDLE_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`pbi-re-btn pbi-re-px2 pbi-re-t11 ${type === t.id ? 'pbi-re-hair-gold pbi-re-ink' : ''}`}
                data-handle-type={t.id}
                onClick={() => add({ type: t.id })}
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              className="pbi-re-btn pbi-re-px2 pbi-re-t11 pbi-re-mlauto"
              data-remove-handle={panel.id}
              onClick={() => { setProjectHandle(null); setFrontHandle(unit.id, panel.id, null); }}
            >
              Remove
            </button>
          </div>

          {type === 'bar' && (
            <div className="pbi-re-row pbi-re-mid pbi-re-gap-1 pbi-re-wrap">
              <span className="pbi-re-t11 pbi-re-quiet">Centres</span>
              {profile.handles.barCentres.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`pbi-re-btn pbi-re-px1 pbi-re-t11 ${centres === c ? 'pbi-re-hair-gold pbi-re-ink' : ''}`}
                  data-handle-centres={c}
                  onClick={() => add({ centres: c })}
                >
                  {c}
                </button>
              ))}
              <NumberField
                className="pbi-re-input pbi-re-w16"
                value={centres}
                min={16}
                max={1200}
                onCommit={(v) => add({ centres: v })}
              />
            </div>
          )}

          <p className="pbi-re-t11 pbi-re-quiet" data-handle-rule={spec.rule}>
            {formatMm(spec.x)} × {formatMm(spec.y)} from the bottom-left · {spec.rule.replace(/-/g, ' ')}
            {spec.problem ? ` · ${spec.problem}` : ''}
          </p>

          <div
            className="pbi-re-row pbi-re-mid pbi-re-gap-1 pbi-re-wrap"
            // ─── TURN 33 (CLAUDE.md F7): the owner's law, said where the hand
            // is: x is measured from THIS door's own handle edge, so a pair
            // mirrors — 30 from the left edge on one leaf, 30 from the right
            // on the other. 50/50, never 60/40.
            title="x is measured from this door’s own handle edge — a left/right pair mirrors, so the handles stay symmetric."
          >
            <span className="pbi-re-t11 pbi-re-quiet">Move</span>
            {[['x', -10], ['x', 10], ['y', -10], ['y', 10]].map(([axis, mm]) => (
              <button
                key={`${axis}${mm}`}
                type="button"
                className="pbi-re-btn pbi-re-px1 pbi-re-t11"
                data-handle-nudge={`${axis}${mm > 0 ? '+' : ''}${mm}`}
                onClick={() => nudge(axis, mm)}
              >
                {axis}{mm > 0 ? '+' : ''}{mm}
              </button>
            ))}
          </div>

          <label className="pbi-re-row pbi-re-mid pbi-re-gap-1 pbi-re-t11 pbi-re-quiet">
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
    <div className="pbi-re-mt2 pbi-re-pt2 pbi-re-line-t pbi-re-hair pbi-re-stack-1" data-mirror-section={panel.id}>
      <span className="pbi-re-t11 pbi-re-caps pbi-re-track pbi-re-quiet">Mirror</span>
      <div className="pbi-re-row pbi-re-gap-1">
        {[[null, 'None'], ['inside', 'Inside'], ['outside', 'Outside']].map(([face, label]) => (
          <button
            key={label}
            type="button"
            data-door-mirror={face || 'none'}
            className={`pbi-re-btn pbi-re-px2 pbi-re-t11 pbi-re-grow ${current === face ? 'pbi-re-hair-gold pbi-re-gold' : ''}`}
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
      <p className="pbi-re-t11 pbi-re-quiet">
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
    <div className="pbi-re-mt2 pbi-re-pt2 pbi-re-line-t pbi-re-hair">
      <button
        type="button"
        className="pbi-re-btn pbi-re-px2 pbi-re-t11 pbi-re-bad"
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
      <p className="pbi-re-mt2 pbi-re-pt2 pbi-re-line-t pbi-re-hair pbi-re-t11 pbi-re-quiet" data-element-delete-why="1">
        <span className="pbi-re-ink-2">Cannot be deleted.</span> {plan.reason}
      </p>
    );
  }
  return (
    <div className="pbi-re-mt2 pbi-re-pt2 pbi-re-line-t pbi-re-hair">
      <button
        type="button"
        className="pbi-re-btn pbi-re-px2 pbi-re-t11 pbi-re-bad"
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
    <label className="pbi-re-row pbi-re-top pbi-re-gap-15 pbi-re-mt2 pbi-re-pt2 pbi-re-line-t pbi-re-hair pbi-re-t11 pbi-re-quiet">
      <input
        type="checkbox"
        className="pbi-re-mt05"
        data-front-dimensions
        checked={showFrontDimensions}
        onChange={toggleFrontDimensions}
      />
      <span>
        <span className="pbi-re-ink-1">Show front dimensions</span>
        {' — '}
        every front&apos;s width and height and the gaps around it, for the whole project.
      </span>
    </label>
  );
}
