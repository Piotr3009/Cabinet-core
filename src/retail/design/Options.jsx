import { useEffect, useRef, useState } from 'react';
import GoldLine from '../ui/GoldLine.jsx';
import Chip from '../ui/Chip.jsx';
import ComingSoon from '../ui/ComingSoon.jsx';
import FrontThumb from './FrontThumb.jsx';
import {
  Button, ChipRow, Field, MoreOptions, NumberField, Said,
} from './controls.jsx';
import { REASONS } from './reasons.js';
import * as A from './adapter.js';
import { useUiStore } from '../../stores/uiStore.js';
import MaterialSlot from './material/MaterialSlot.jsx';
// T70 F5 · the SECOND and THIRD front colour's own picker — PRO's copied
// swatch board (`scripts/t63-copies.mjs`), rendered as it stands.
import ColourPicker from './material/ColourPicker.jsx';
import WizardHardware from './material/WizardHardware.jsx';
import AddItems from './detail/AddItems.jsx';
import { CATEGORIES, stepIndex } from './Categories.jsx';
import { PRICE_ON_REQUEST, RETAIL_SHOW_WORKSHOP_TOOLS } from '../config.js';
import { anchorOfEvent } from '../../lib/modalAnchor.js';

// ─── T64 F2 · COLUMN 3 — THE OPTIONS OF THE ACTIVE STEP ────────────────────
//
// The owner, 03.09.2026: *"najważniejsze: wybieranie Egger boardów nie ma w
// ogóle ustawienia środek / carcases — a powinno być najpierw INTERIORS
// (najpierw materiał, a później reszta) — i następnie FRONTY."* And the law
// every panel below obeys, THE RULE OF THE LAZY CLIENT: every step has a
// sensible answer already chosen. NEXT always works. Seven clicks give a
// finished wardrobe (T66 F2 made it seven by putting SIZE third). A picky
// client finds MORE OPTIONS in every step; a lazy one never sees them.
//
// Seven panels, one at a time, in the owner's order — WHAT, WHERE, SIZE,
// INSIDE, FRONTS, EXTRAS, REVIEW (T66 F2 put SIZE third) — each with its
// default already standing and its picky half folded under one link. NEXT and
// BACK on every step; a step can also be clicked on the rail. Nothing in any
// step is a slider; fields per T62's row law; chips for choices.
//
// Every write goes through `adapter.js`; not one line below names an engine
// parameter, and not one bound below is a literal.

function Panel({ title, children, testid }) {
  return (
    <div className="pbi-panel" data-testid={testid}>
      <h2 className="pbi-display pbi-h4">{title}</h2>
      <GoldLine />
      {children}
    </div>
  );
}

/**
 * ─── T68 F5 · A HEADED GROUP INSIDE A STEP ─────────────────────────────────
 *
 * The owner approved EXTRAS as THREE headed groups, so a step gains one level
 * of structure — and exactly one. It is the `pbi-advanced` heading T66 F3
 * already put in this column, given a name and made repeatable, so the step
 * grows no new visual vocabulary: a hairline above, a small uppercase head,
 * and the rows under it.
 */
function Group({ title, children, testid }) {
  return (
    <section className="pbi-group" data-testid={testid}>
      <h3 className="pbi-ui pbi-ui-light pbi-quiet pbi-group-head">{title}</h3>
      {children}
    </section>
  );
}

/* ─── T65 F1 · THE STEP THAT NEEDS A WARDROBE, AND HASN'T GOT ONE ─────────── */
//
// *"the steps after WHERE stay reachable but say plainly that they need a
// wardrobe."* Reachable, not disabled: the rail still walks, NEXT still works,
// and the step says the one true thing about itself instead of crashing on a
// unit that is not there. One sentence, one button, the same store path as
// everywhere else.
function NeedsAWardrobe({ title, testid, what }) {
  const [said, setSaid] = useState('');
  return (
    <Panel title={title} testid={testid}>
      <p className="pbi-choice pbi-choice-15 pbi-panel-note" data-testid={`${testid}-empty`}>
        {what} Add a wardrobe first — press the plus on the floor, or go back to WHERE.
      </p>
      <Button
        data-testid={`${testid}-add-wardrobe`}
        onClick={() => setSaid(A.addFirstWardrobe() ? '' : REASONS.roomRefusedWardrobe())}
      >
        ADD A WARDROBE
      </Button>
      {said ? <Said testid={`${testid}-said`}>{said}</Said> : null}
    </Panel>
  );
}

/* ─── 1 · WHAT ────────────────────────────────────────────────────────────── */
//
// Default: Wardrobe. The other tiles are PRO's own `PROJECT_TYPES`, greyed
// with the engine's reason (`adapter.projectTypeTiles` — the type's own
// library category is the predicate; the retail room mounts the wardrobe
// library alone).
function WhatPanel({ project }) {
  const chosen = A.projectTypeOf(project);
  return (
    <Panel title="WHAT ARE WE MAKING?" testid="panel-what">
      {/* ─── T67 F3 · A CLEAN LIST, AND ONE QUIET NOTE ────────────────────
          The owner: *"te napisy pod przyciskami daj jedne pod spodem, chcę
          mieć ładną czystą listę."*  So NO tile carries a `reason` line any
          more — the list is names — and the one note under it is the
          paragraph that already closed this step, which now says what the
          five lines said.

          An inactive tile keeps its refusal where a refusal belongs: on the
          tile, on hover or focus, in a card that also hands over the address
          — *"jak najedziesz, napis coming soon i send email to make order,
          email do skopiowania."*  `ComingSoon` is that card, once, for all
          of them. */}
      <div className="pbi-tiles" data-testid="what-tiles">
        {A.projectTypeTiles().map((t) => {
          const chip = (
            <Chip
              selected={chosen === t.id}
              disabled={Boolean(t.reason)}
              title={t.reason ? undefined : t.hint}
              onClick={() => A.setProjectType(t.id)}
            >
              <span className="pbi-stack">
                <span data-testid={`what-${t.id}`}>{t.label.toUpperCase()}</span>
              </span>
            </Chip>
          );
          return t.reason
            ? <ComingSoon key={t.id} what={t.label}>{chip}</ComingSoon>
            : <span key={t.id}>{chip}</span>;
        })}
      </div>
      <p className="pbi-choice pbi-choice-15 pbi-panel-note" data-testid="what-note">
        {REASONS.projectTypeNotOnline()}
        {' Press NEXT — every step already has an answer, and you can change any of them.'}
      </p>
    </Panel>
  );
}

/* ─── 2 · WHERE ───────────────────────────────────────────────────────────── */
//
// Two fields — the wall and the ceiling — and NOTHING STANDS IN THE ROOM.
// T64 F1.8: ONE WALL. The `WALLS 1 | 2` chips and `WALL 2 WIDTH` of T61 are
// gone under CLAUDE.md's licence; a second wardrobe is the estimate's
// business (F5). The L-shape, when it exists, will be a furniture TYPE.
//
// ─── T65 F1 · THE EMPTY ROOM IS A FIRST-CLASS STATE ────────────────────────
//
// The owner: *"ściana 4000 mm, ale bez szaf"*. The step ends with a wall and
// an empty floor; ADD A WARDROBE below is one of the two doors to
// `adapter.addFirstWardrobe` (the other is the plus on the empty floor), and
// NEXT still works with the floor empty — the lazy client's law does not
// require furniture, only that every step has its answer.
function WherePanel({ unit, room, onEditRoom }) {
  const b = A.designBounds();
  const wall = A.wallLengthMm(room, 0);
  const ceiling = Math.round(room?.height ?? 2500);
  const [said, setSaid] = useState('');

  return (
    <Panel title="WHERE DOES IT GO?" testid="panel-where">
      <Field label="WALL WIDTH">
        <NumberField
          testid="space-wall"
          min={b.wall.min}
          max={b.wall.max}
          value={wall}
          outOfRange={REASONS.outOfRange}
          onCommit={(v) => {
            const verdict = A.setSpace({ wallMm: v });
            if (verdict?.message) return verdict.message;
            // T65 F1: the wall is just the room now. Nothing is resized to it,
            // because nothing is standing in it unless the client put it there.
            setSaid('');
            return '';
          }}
        />
      </Field>

      <Field label="CEILING HEIGHT">
        <NumberField
          testid="space-ceiling"
          min={b.ceiling.min}
          max={b.ceiling.max}
          value={ceiling}
          outOfRange={REASONS.outOfRange}
          onCommit={(v) => A.setSpace({ ceilingMm: v })?.message || ''}
        />
      </Field>

      {said ? <Said testid="where-said">{said}</Said> : null}

      {/* ─── T69 F10 · THE ROOM COMES FIRST ───────────────────────────────
          *"EDIT THE ROOM sits ABOVE ADD A WARDROBE in the WHERE step. First
          the room, then the furniture; the lazy client may still press ADD at
          once."*

          It is the order a joiner surveys in and the order the two controls
          answer in: a wardrobe is placed IN something, and the something is
          the room. Nothing is gated by it — ADD A WARDROBE is a live button
          whether or not the room has been touched, which is the lazy client's
          standing law — only the reading order moved. */}
      {/* ─── T66 F8 · THE ROOM IS NOT HIDDEN ──────────────────────────────
          The owner: *"edit the room powinien być zawsze na wierzchu, a nie
          ukryte pod more options."* So the button stands in WHERE, under the
          two fields, always visible.

          AND MORE OPTIONS IS GONE FROM THIS STEP, because the room was the
          only thing left in it: T62 took the sloped-ceiling chip and the two
          opening buttons into the copied elevation editor, and T66 F3 took
          *"THIS WARDROBE — SIZE AND DOORS ›"* with the thin wardrobe menu it
          opened — the three numbers are the SIZE step now and the doors are
          EXTRAS. A fold with nothing behind it is a control that does nothing.

          THE HOUSE RULE (rule 15) is untouched: the window opens BESIDE its
          trigger, and the trigger has simply stopped hiding. */}
      <div className="pbi-duty-actions">
        <Button
          kind="secondary"
          size="small"
          data-testid="space-edit-room"
          onClick={(e) => onEditRoom(anchorOfEvent(e))}
        >
          EDIT THE ROOM ›
        </Button>
      </div>
      <p className="pbi-choice pbi-panel-note">
        EDIT THE ROOM draws the plan — walls, boxes, sloping ceilings, windows and doors.
        Nothing is fitted around them yet: a wardrobe may stand across a window and we will
        sort it on the survey.
      </p>

      {/* T65 F1 · one of the two doors to `addFirstWardrobe`; the other is the
          plus on the empty floor. The room is empty until one of them is used. */}
      {unit ? null : (
        <Button
          data-testid="where-add-wardrobe"
          onClick={() => setSaid(A.addFirstWardrobe() ? '' : REASONS.roomRefusedWardrobe())}
        >
          ADD A WARDROBE
        </Button>
      )}

      <p className="pbi-choice pbi-choice-15 pbi-panel-note">
        {unit
          ? 'Measure wall to wall and floor to ceiling. We will survey before we build.'
          : 'Measure wall to wall and floor to ceiling. The room is empty — add a wardrobe here or press the plus on the floor.'}
      </p>

    </Panel>
  );
}

/* ─── 3 · SIZE ────────────────────────────────────────────────────────────── */
//
// The owner: *"chcę wstawić wszystkie 3 size na początku, a dopiero później
// carcass board etc."*
//
// THREE TYPED FIELDS, and not one of them is new machinery: WIDTH, HEIGHT and
// DEPTH call `adapter.setUnitSize` — the very setter T66 F3's docked editor
// calls, which asks the ROOM first (`roomFitRefusalFor`) and hands back its
// refusal as a whole sentence. So *"room refuses first"* surfaces under the
// field a client typed into, in the room's own words, exactly as it does on
// the right.
//
// The DEFAULTS stand: a wardrobe is born at the lazy client's width, the
// profile's height and the standard depth, so NEXT works on this step without
// a keystroke — which is the whole of the lazy client's law.
function SizePanel({ unit }) {
  // T65 F1's law, given to a third step: the room can be empty, and a step
  // that needs a wardrobe says so rather than typing into one that is not
  // there. Hooks stay unconditional — the empty state is chosen at the render.
  const b = unit ? A.unitBounds(unit.id) : null;
  const size = unit?.params || {};

  if (!unit || !b) {
    return <NeedsAWardrobe title="SIZE" testid="panel-size" what="How wide, how tall and how deep are a wardrobe's three numbers." />;
  }

  return (
    <Panel title="SIZE" testid="panel-size">
      <Field label="WIDTH">
        <NumberField
          outOfRange={REASONS.outOfRange}
          testid="size-width"
          min={b.width.min}
          max={b.width.max}
          value={Math.round(size.width || 0)}
          onCommit={(v) => A.setUnitSize(unit.id, { width: v }).said}
        />
      </Field>

      <Field label="HEIGHT">
        <NumberField
          outOfRange={REASONS.outOfRange}
          testid="size-height"
          min={b.height.min}
          max={b.height.max}
          value={Math.round(size.height || 0)}
          onCommit={(v) => A.setUnitSize(unit.id, { height: v }).said}
        />
      </Field>

      <Field label="DEPTH">
        <NumberField
          outOfRange={REASONS.outOfRange}
          testid="size-depth"
          min={b.depth.min}
          max={b.depth.max}
          standardAt={A.designBounds().defaults.depth}
          value={Math.round(size.depth || 0)}
          onCommit={(v) => A.setUnitSize(unit.id, { depth: v }).said}
        />
      </Field>

      <p className="pbi-choice pbi-choice-15 pbi-panel-note">
        Millimetres, floor to top and wall to wall. We survey before we build, so these are the
        numbers we start from rather than the ones we cut to.
      </p>
    </Panel>
  );
}

/* ─── T64 · TOMBSTONE: `LayoutPanel` STOOD HERE ───────────────────────────── */
//
// WARDROBE WIDTH and DEPTH are the wardrobe's own menu (WIDTH AND HEIGHT ›);
// DOORS and BAYS moved under its Advanced heading (F1.7); the WALL row and
// ADD WARDROBE ON WALL 2 went with the second wall (F1.8); ADD TOP BOX is
// EXTRAS. The engine's door rule decides the doors.

/* ─── T67 F7 · TOMBSTONE: `ReHomed` STOOD HERE ─────────────────────────────
 *
 * The owner, on the screenshot of INSIDE grown long: *"jak dodajesz szuflady,
 * to się nie powinny pokazywać pod spodem, tu menu po lewej ma być puste —
 * powinno się pokazywać po prawej."*  It moved WHOLE to
 * `detail/ReHomed.jsx`, which the dock renders — not one call changed.
 */

/* ─── 4 · INSIDE ──────────────────────────────────────────────────────────── */
//
// *"najpierw materiał, a później reszta"*: the CARCASS material first — PRO's
// own `MaterialChoicePanel` with the tiled `DecorPickerModal` behind it,
// COPIED (T63) — then the inside colour in three answers, then PRO's own
// `AddItems`, whole. Default: white inside, an empty carcass; NEXT works.
function InsidePanel({ unit, project }) {
  // T65 F1: the room can be empty. Hooks below are unconditional, so the
  // empty state is chosen at the RENDER, not by an early return.
  const counts = A.interiorCounts(unit);
  // T65 F7: BAYS is a standing FIELD below, not a `›` row that only appears
  // once a divider exists — so it is taken out of the summary list here.
  const inside = A.INTERIOR_ROWS.filter((row) => !row.bays && (counts[row.id] || 0) > 0);
  // T66 F6 · the ONE bays entry reads its name off the same table the rows do.
  const baysRow = A.INTERIOR_ROWS.find((row) => row.bays) || null;
  const bays = unit ? A.bayCount(unit.id) : 1;
  // T69 F6 · the bays THEMSELVES, from the store's own `zonesOf` — PRO's list,
  // in PRO's order. The count above is what a client types; this is what the
  // pointer walks along.
  const zones = unit ? A.bayZones(unit.id) : [];
  // T69 F6 · which bay the pointer is on — the SHARED store's own integer, the
  // very one `3d/UnitView.jsx` draws the box from. One law, two readers.
  const hinted = useUiStore((st) => st.zoneHint);
  const b = A.designBounds();

  // ─── T64 F1.4 · SHELVES GO IN CENTRED ────────────────────────────────────
  // A shelf that arrives through PRO's list lands at the centre of the
  // biggest opening (PRO's law); the KIT's even ladder for the bay it landed
  // in is the store's own `redistributeShelvesInBay` — asked once, here,
  // when the count grows. See `adapter.spreadNewShelf`.
  const shelves = counts.shelves || 0;
  const last = useRef(shelves);
  useEffect(() => {
    if (unit?.id && shelves > last.current) A.spreadNewShelf(unit.id);
    last.current = shelves;
  }, [shelves, unit?.id]);

  if (!unit) {
    return <NeedsAWardrobe title="INSIDE" testid="panel-inside" what="Shelves, rails and drawers go inside a wardrobe." />;
  }

  return (
    <Panel title="INSIDE" testid="panel-inside">
      {/* THE MATERIAL FIRST. PRO's slot for the carcass, exactly as PRO shows it. */}
      <Field label="CARCASS BOARD" block>
        <div data-testid="inside-material">
          <MaterialSlot kind="carcass" title="Carcass — what is it made of?" />
        </div>
      </Field>

      {/* ─── T67 F6 · TOMBSTONE: THE `INSIDE COLOUR` ROW STOOD HERE ────────
          The owner, circling it on the screenshot: *"to już niepotrzebne … to
          jest zdublowanie funkcji."*  SAME AS FRONTS · WHITE · CHOOSE… asked
          the client the question the CARCASS BOARD slot above it had already
          asked — and its third chip did not even answer it itself: it reached
          into the DOM and pressed that slot's own button. ONE LAW for what
          the inside wears, and it is the slot. */}

      {/* PRO's "What goes inside", whole (T63 F3). */}
      <div data-testid="interior-pro-list">
        <AddItems unit={unit} />
      </div>

      {/* ─── T65 F7 / T66 F6 · VERTICAL PARTITIONS (BAYS) — ONE ENTRY ──────
          The owner, T65: *"zamiast vertical partition dać BAYS i wpisz ilość,
          max 3"*. And tonight, F6: *"zamień nazwę przycisku z vertical
          partition (divider) na Vertical partitions (bays), a ten na dole
          usuń."*

          So there is ONE place a client adds a bay and ONE place he counts
          them, and this is it. The name comes off `INTERIOR_ROWS` — the same
          table the row above reads — and the second control that stood at the
          foot of this panel is DELETED.

          A TYPED count, T62's row law, never a slider: writing 3 puts two
          dividers in and writing 1 takes them out, both through
          `addFlushPartition`, the same call PRO's copied list makes. DOORS do
          not follow (T65 F9). */}
      <Field label={String(baysRow?.name || 'Vertical partitions (bays)').toUpperCase()}>
        <NumberField
          testid="inside-bays"
          min={b.bays.min}
          max={b.bays.max}
          value={bays}
          outOfRange={REASONS.outOfRange}
          onCommit={(v) => {
            const why = A.bayRefusal(unit.id, v);
            if (why) return why;
            A.setBayCount(unit.id, v);
            return '';
          }}
        />
      </Field>

      {/* ─── T69 F6 · THE BAY LIGHTS UP UNDER THE POINTER ─────────────────
          *"PRO highlights a bay when its chip is hovered; retail lost it. READ
          PRO's mechanism first (the chip→scene hover path), carry the same
          mechanism — one law, no second highlighter."*

          PRO's mechanism, read end to end: a chip's `onPointerEnter` calls
          `uiStore.setZoneHint(index)`, `Scene.jsx` passes that integer to the
          SELECTED unit's `UnitView`, and `UnitView` draws the box over
          `bays[zoneHint]`. Four of those five links are SHARED — retail runs
          the same ui store, the same Scene and the same UnitView — so the only
          thing missing was a chip, and the only thing written is a chip. The
          highlight itself is PRO's, unchanged, and there is no second one.

          The row appears only where it MEANS something: one bay is not a
          choice, which is `AddItems.jsx`'s own `zones.length > 1` and the same
          sentence T65 wrote about the note below it. Pressing a chip SELECTS
          the cabinet on the stage, because `Scene.jsx` draws the hint for the
          selected unit and a highlight nobody can see is not one. */}
      {zones.length > 1 ? (
        <div
          className="pbi-opening-list"
          data-testid="inside-bay-chips"
          onPointerLeave={() => A.hoverBay(null)}
        >
          {zones.map((z) => (
            <button
              key={z.id ?? z.index}
              type="button"
              // The chip shows what the SCENE shows: `zoneHint` is one
              // integer and both read it, so the lit chip and the lit bay
              // cannot disagree. It is also what makes this a row of the
              // opening list rather than a bare button — the same `is-on` law
              // its siblings in FRONTS and HANDLES wear.
              className={`pbi-opening-row${hinted === z.index ? ' is-on' : ''}`}
              data-testid={`inside-bay-${z.index}`}
              data-on={hinted === z.index ? 'yes' : 'no'}
              data-bay={z.index}
              title={`${Math.round(z.size)} mm clear`}
              onPointerEnter={() => A.hoverBay(z.index)}
              onFocus={() => A.hoverBay(z.index)}
              onBlur={() => A.hoverBay(null)}
              onClick={() => { A.selectUnitOnStage(unit.id); A.hoverBay(z.index); }}
            >
              {`BAY ${z.index + 1} · ${Math.round(z.size)}`}
            </button>
          ))}
        </div>
      ) : null}

      {/* PRO's own line, and T65's law about when it appears: *"i wtedy
          dopiero informacja o tym że bays można zrobić niższe ale półka musi
          być fix"* — above one, and not before. */}
      {bays > 1 ? (
        <p className="pbi-choice pbi-choice-15 pbi-panel-note" data-testid="bays-note">
          {REASONS.baysMayDiffer}
        </p>
      ) : null}

      {/* EQUAL BAYS — PRO's own button, re-homed from the deleted
          `PartitionMenu`. Where ONE divider stands is the docked editor's
          `position-x`, which is PRO's own field on the divider itself. */}
      {bays > 1 ? (
        <div className="pbi-duty-actions">
          <Button
            kind="secondary"
            size="small"
            data-testid="partition-equal"
            onClick={() => A.centrePartitions(unit.id)}
          >
            EQUAL BAYS
          </Button>
        </div>
      ) : null}

      {/* ─── T67 F7 · THE LIST IS A LIST: A NAME, A COUNT, AND A DOOR ──────
          *"jak dodajesz szuflady, to się nie powinny pokazywać pod spodem, tu
          menu po lewej ma być puste — powinno się pokazywać po prawej … te
          funkcje niech przejdą na prawą stronę."*

          So the row shows the row and its count — "Drawers · 3" — and nothing
          expands beneath it. Pressing the row SELECTS that stack through the
          same store the stage writes (`adapter.selectOnStage`), which docks
          its editor on the right with `ReHomed`'s controls above it. One
          sentence: LEFT ADDS, RIGHT EDITS. */}
      {inside.length ? (
        <div className="pbi-interior-list" data-testid="interior-inside">
          {inside.map((row) => (
            <div key={row.id} data-testid={`interior-${row.id}`}>
              {/* T64 F3's law: ONE Button, and it is `controls.jsx`'s. The row
                  keeps its own rectangle by wearing its own two classes over
                  the button's — geometry is the row's, the element is the
                  house's. */}
              <Button
                kind="secondary"
                className="pbi-interior-row pbi-interior-open"
                data-testid={`interior-open-${row.id}`}
                data-interior-open={row.id}
                title={`Edit the ${String(row.name).toLowerCase()} — the controls are on the right`}
                onClick={() => {
                  // The DOCK reads the stage's own selection, and the stage
                  // speaks in PANEL ids — `stageRefFor` asks the engine which
                  // of this unit's panels IS this row.
                  const ref = A.stageRefFor(unit.id, row.menu);
                  if (ref) A.selectOnStage(unit.id, ref);
                }}
              >
                <span className="pbi-choice pbi-choice-15 pbi-interior-name">{row.name}</span>
                <span className="pbi-choice pbi-interior-count" data-testid={`interior-count-${row.id}`}>
                  {counts[row.id]}
                </span>
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {/* ─── T66 F3 · RE-HOMED FROM THE DELETED `WardrobeMenu` ────────────
          Two of its rows opened a COPIED PRO window and had nowhere else to
          go: THIS WARDROBE'S COLOUR (`UnitFinishModal` — it writes the UNIT,
          so two wardrobes may differ) and MATERIALS AND HARDWARE (the project
          palette). Both are about what the wardrobe is MADE OF, which is this
          step; both open beside their button, per the house rule; and neither
          is an element editor, so neither belongs on the right. */}
      <MoreOptions testid="inside-more">
        <Field label="THIS WARDROBE">
          <div className="pbi-duty-actions">
            <Button
              kind="secondary"
              size="small"
              data-testid="wardrobe-open-finish"
              onClick={(e) => A.openEditor('unit-finish', { unitIds: [unit.id], anchor: A.anchorOf(e) })}
            >
              THIS WARDROBE&apos;S COLOUR ›
            </Button>
            <Button
              kind="secondary"
              size="small"
              data-testid="wardrobe-open-materials"
              onClick={(e) => A.openEditor('design', { anchor: A.anchorOf(e) })}
            >
              MATERIALS AND HARDWARE ›
            </Button>
          </div>
        </Field>
      </MoreOptions>

    </Panel>
  );
}

/* ─── 5 · FRONTS ──────────────────────────────────────────────────────────── */
//
// Default: shaker, push-to-open, the collection's EGGER decor. The OPENING is
// PRO's own four (`lib/frontOpening.js FRONT_OPENINGS`), written as PRO's
// wizard writes them (T64 F1.5 — a J-pull is a HANDLE, and this is where the
// J did not render). Under MORE OPTIONS: the shaker frame, the collections,
// PRO's style gallery and every source the slot's own strip offers.
/**
 * ─── T66 F4 · ONE LINE PER STYLE, AND THEY LIVE BELOW THE LIST ─────────────
 *
 * *"dopiero pod spodem wszystkie informacje, a nie pod każdym przyciskiem."*
 *
 * These are DESCRIPTIONS, not refusals — `reasons.js` is the home of a
 * sentence retail puts to an engine's boolean, and none of these answers a
 * predicate. The engine has no words for a door's LOOK (`FRONT_STYLE_OPTIONS`
 * is ids and labels), so the copy is retail's, keyed on the engine's own ids
 * so a style the engine adds cannot silently acquire another style's line.
 */
const STYLE_LINES = Object.freeze({
  F: 'A flat slab, edge to edge. The quietest of the four and the one that shows a decor best.',
  S: 'A frame around a recessed panel — the English wardrobe door. The frame width is yours to set.',
  G: 'Vertical grooves machined into the face, evenly across the leaf.',
  A: 'A curved head on a full-height leaf, for a room with the height to carry it.',
});

function FrontsPanel({ design, project }) {
  const b = A.designBounds();
  // ─── T70 F5 · THE COLOUR ROWS, AND THE ONE THAT IS TAKING CLICKS ─────────
  // `painting` is the row a stage click lands on. It is RETAIL's own state and
  // deliberately not a store field: it is a mode this panel is in, it dies
  // with the panel, and nothing outside this step has any business reading it.
  const [painting, setPainting] = useState(null);
  const [said, setSaid] = useState('');
  const colourRows = A.frontColourRows(project);
  // A click on the stage is the SHARED store's own selection — the same fact
  // PRO reads — so no second selection law is written for this.
  const picked = useUiStore((st) => st.selectedElement);
  useEffect(() => {
    if (!painting) return;
    const word = A.paintFrontOnStage(picked, painting);
    if (word) setSaid(word);
    // `picked` is the whole trigger: each new front the client clicks paints
    // once. `painting` stays on so a colour can be given to several.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, painting]);
  // A colour that is removed takes its row with it.
  useEffect(() => {
    if (painting && !colourRows.some((r) => r.id === painting)) setPainting(null);
  }, [colourRows, painting]);
  const style = design?.fronts?.style || 'S';
  const frame = design?.fronts?.shakerFrame || b.shakerFrame.standard;
  const opening = A.frontOpeningOf(project);
  // SLAB · SHAKER · GROOVED · ARCHED, in CLAUDE.md F4's own order.
  const order = ['F', 'S', 'G', 'A'];
  const styles = A.frontStyles()
    .filter((s) => s.id !== 'HJ')
    .sort((x, y) => order.indexOf(x.id) - order.indexOf(y.id));

  return (
    <Panel title="FRONTS" testid="panel-fronts">
      {/* ─── T66 F4 · A LIST, NOT A MOSAIC ────────────────────────────────
          The owner, on the screenshot: *"style front to mega burdel"* — and
          then exactly how to fix it: *"to powinno być lista, a nie obok siebie
          … lista jak internals … dopiero pod spodem wszystkie informacje, a
          nie pod każdym przyciskiem."*

          So: ONE ROW PER STYLE, in a column, each a small drawing and a name,
          the selected row carrying the gold hairline and a coming-soon row
          simply greyed. The sentences do NOT stand under each row — they
          collect in one quiet block below the list, which is the half of his
          instruction that made the mosaic unreadable. */}
      <Field label="STYLE" block>
        <div className="pbi-style-list" data-testid="fronts-style">
          {/* T57's doctrine: the J is a handle system, not a shape — so the
              legacy `HJ` shape is not offered as a style; it is the OPENING
              below, and it is the only J the client can choose. */}
          {styles.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`pbi-style-row${style === s.id ? ' is-on' : ''}${s.soon ? ' is-soon' : ''}`}
              data-testid={`fronts-style-${s.id}`}
              data-on={style === s.id ? 'yes' : 'no'}
              data-soon={s.soon ? 'yes' : 'no'}
              disabled={s.soon}
              aria-pressed={style === s.id}
              onClick={() => A.setFrontStyle(s.id)}
            >
              <FrontThumb style={s.id} size="row" />
              <span className="pbi-choice pbi-style-name">{s.label}</span>
            </button>
          ))}
        </div>
      </Field>

      {/* ─── SHAKER'S OWN FIELD, DIRECTLY UNDER THE LIST ───────────────────
          *"SHAKER selected → a FRAME WIDTH field appears directly under the
          list"* — typed, per the field law, reading the ENGINE's own bounds
          around `profile.front.types.S.frameWidth`. Only when shaker is the
          style: a field about a frame no door has is a field that lies. */}
      {style === 'S' ? (
        <Field label="FRAME WIDTH">
          <NumberField
            outOfRange={REASONS.outOfRange}
            testid="fronts-frame-width"
            min={b.shakerFrame.min}
            max={b.shakerFrame.max}
            standardAt={b.shakerFrame.standard}
            value={Math.round(frame)}
            onCommit={(v) => { A.setShakerFrame(v); return ''; }}
          />
        </Field>
      ) : null}

      {/* ─── AND THE SENTENCES COLLECT HERE, ONCE ──────────────────────────
          The selected style's line, and the coming-soon note if any greyed
          row is standing in the list above. Two sentences at most, in one
          quiet block, under the list they are about. */}
      <div className="pbi-style-notes" data-testid="fronts-style-notes">
        <p className="pbi-choice pbi-choice-15" data-testid="fronts-style-line">{STYLE_LINES[style] || ''}</p>
        {styles.some((s) => s.soon) ? (
          <p className="pbi-choice pbi-quiet" data-testid="fronts-style-soon">{REASONS.styleComingSoon}</p>
        ) : null}
      </div>

      {/* ─── T66 F4 · THE OPENING IS AN ALIGNED LIST ───────────────────────
          *"OPENING becomes an aligned list of the four choices — one column,
          equal widths, no stagger."* The four are PRO's own
          (`lib/frontOpening.js FRONT_OPENINGS`); only their arrangement moved. */}
      <Field label="OPENING" block>
        <div className="pbi-opening-list" data-testid="fronts-opening">
          {A.frontOpenings().map((o) => (
            <button
              key={o.id}
              type="button"
              className={`pbi-opening-row${opening === o.id ? ' is-on' : ''}`}
              data-testid={`fronts-opening-${o.id}`}
              data-on={opening === o.id ? 'yes' : 'no'}
              aria-pressed={opening === o.id}
              title={o.hint || ''}
              onClick={() => A.setFrontOpening(o.id)}
            >
              {o.label.toUpperCase()}
            </button>
          ))}
        </div>
      </Field>

      {/* T63 F4 · PRO's slot for the fronts, with the tiled EGGER modal behind it. */}
      <Field label="COLOUR" block>
        <div data-testid="fronts-material">
          <MaterialSlot kind="front" title="Fronts — what are they made of?" />
        </div>
      </Field>

      {/* ─── T70 F5 · A DESIGN MAY CARRY TWO OR THREE FRONT COLOURS ────────
          CLAUDE.md's own reading of *"2–3 typy kolorów frontów"*, decided for
          the owner and overturnable in one word: the client may give a SECOND
          and a THIRD colour to chosen fronts.

          ITS MECHANISM IS THE BRIEF'S: the store's `setUnitFinish` /
          `resetUnitFinish`, the per-unit override that has sat unused since
          T60 — *"never a second palette law."*  So the grain of it is PER
          CABINET, and the row says so rather than implying otherwise: clicking
          a front colours THAT wardrobe's fronts. A top box is a unit of its
          own and can take a colour by itself.

          ALL FRONTS is row one: the project's own type, which is the ABSENCE
          of an override — so pressing it and clicking a wardrobe is
          `resetUnitFinish`, the other half of the named pair. */}
      <Field label="MORE THAN ONE COLOUR" note={REASONS.secondColourIsPerWardrobe} block>
        <div className="pbi-opening-list" data-testid="fronts-colour-rows">
          {colourRows.map((row) => (
            <button
              key={row.id}
              type="button"
              className={`pbi-opening-row${painting === row.id ? ' is-on' : ''}`}
              data-testid={`fronts-colour-${row.id}`}
              data-on={painting === row.id ? 'yes' : 'no'}
              data-wearing={row.wearing}
              aria-pressed={painting === row.id}
              title={painting === row.id
                ? 'Click a wardrobe front on the stage to give it this colour'
                : 'Pick this colour, then click the fronts it goes on'}
              onClick={() => setPainting(painting === row.id ? null : row.id)}
            >
              <span
                className="pbi-colour-dot"
                style={row.colour?.hex ? { background: row.colour.hex } : undefined}
                aria-hidden
              />
              <span className="pbi-choice">{row.label}</span>
              <span className="pbi-choice pbi-quiet">
                {`${row.colour?.name || row.colour?.hex || 'not chosen'} · ${row.wearing}`}
              </span>
            </button>
          ))}
        </div>
      </Field>

      {/* The ACTIVE row's own picker, and the two acts that belong to it. The
          first row's colour is the MATERIAL SLOT's above — one road to the
          project's own front finish, exactly as it was. */}
      {painting && painting !== colourRows[0]?.id ? (
        <Field label="THIS COLOUR" block>
          <div data-testid="fronts-colour-picker">
            <ColourPicker
              label="Sprayed"
              value={colourRows.find((r) => r.id === painting)?.colour || null}
              onChange={(c) => A.setFrontColourFor(painting, c)}
            />
          </div>
          <div className="pbi-duty-actions">
            <Button
              kind="secondary"
              size="small"
              data-testid="fronts-colour-remove"
              onClick={() => { setSaid(A.removeFrontColour(painting)); setPainting(null); }}
            >
              REMOVE THIS COLOUR
            </Button>
          </div>
        </Field>
      ) : null}

      {colourRows.length < A.frontTypeCap() ? (
        <div className="pbi-duty-actions">
          <Button
            kind="secondary"
            size="small"
            data-testid="fronts-colour-add"
            onClick={() => { const id = A.addFrontColour(); if (id) setPainting(id); }}
          >
            {colourRows.length === 1 ? '+ ADD A SECOND COLOUR' : '+ A THIRD'}
          </Button>
        </div>
      ) : null}
      {said ? <Said testid="fronts-said">{said}</Said> : null}

      {/* ─── T70 F5 · AND HOW GLOSSY IT IS, UNDER THE COLOUR ───────────────
          *"A SHEEN control sits under the front colour (matt → satin →
          gloss), the engine's own sheen vocabulary from the profile."*

          THE SIX WORDS ARE THE ENGINE'S — `engine/design.js sheenLabel`, read
          before this was written, expressed as shares of
          `profile.appearance.sheenScale.max` so a workshop that reshapes the
          scale keeps them in proportion. The VALUES are `sheenSteps`. The
          WRITE is `setDesign({ sheen })`, which is the one call PRO's own
          `SheenSlider` makes — one law, two doors.

          NOT A SLIDER, and that is the owner's own ruling rather than an
          omission: *"nie widze sensu [suwaków] bo i tak nie trafisz"* (T61
          F5). PRO's surface stays PRO's; the vocabulary is shared. */}
      <Field label="SHEEN" note={A.sheenWords(project)}>
        <ChipRow
          testid="fronts-sheen"
          value={A.sheenOf(project)}
          options={A.sheenChoices().map((c) => ({ id: c.id, label: c.label, title: c.hint }))}
          onPick={(id) => setSaid(A.setSheen(id))}
        />
      </Field>

      {/* ─── T68 F8 · TOMBSTONES: `MORE OPTIONS` AND THE TWO BLOCKS IN IT ──
          The owner: *"z menu front usuń COLLECTION proszę, i MORE OPTIONS —
          po co mi dwa razy ta sama opcja."*

          THE COLLECTION CHIPS stood here and are a LICENSED REMOVAL. A
          collection is a PRESET a client arrives on — the landing page's four
          cards and the `?collection=` link, which is where they entered and
          where they stay. Offering them again HALFWAY THROUGH the step was the
          second road F1's probe convicted: whichever of this block and the
          STYLE list was pressed last won the opening, and the J came and went
          with the press order. `adapter.applyCollection` is untouched and is
          still what the landing page presses.

          THE STYLE GALLERY stood here and is a LICENSED REMOVAL. The STYLE
          LIST at the top of this step (T66 F4) is the one road. Nothing
          RE-HOMES: the gallery's four extra ids — `HJ`, `GF`, `AH`, `GL` —
          are not capabilities the list dropped, they are `FRONT_STYLE_OPTIONS`
          whole, and T66 F4 narrowed the client's choice to four on purpose
          (*"SLAB · SHAKER · GROOVED · ARCHED"*). `HJ` in particular is the
          very lie F1's probe measured: it reads as J-pull and machines
          NOTHING — no `meta.jpull`, no shaker recess — because T57 moved the J
          onto the HANDLE axis, where the OPENING list above now offers it
          honestly. The copied component `material/FrontStyleGallery.jsx` is
          NOT deleted: 1:1 = COPY, and a copy is not cut because its caller
          count fell.

          AND THE FOLD ITSELF GOES WITH THEM, on this step's own standing law:
          *"A fold with nothing behind it is a control that does nothing."*
          MORE OPTIONS stays on every other step, where there is something
          behind it. */}
    </Panel>
  );
}

/* ─── 6 · EXTRAS ──────────────────────────────────────────────────────────── */
/**
 * ─── T68 F5 · THREE HEADED GROUPS, AND THE PLINTH LAW ──────────────────────
 *
 * The owner approved the layout, group by group:
 *
 *   DOORS & FRONTS      ADD DOORS · the door count · SPLIT DOOR (top segment)
 *   THE CARCASS WEARS   PLINTH · CORNICE · TOP INFILL · END PANELS L/R/BOTH ·
 *                       SCRIBE FILLERS AT THE WALL · SERVICE CUT-OUT (greyed)
 *   ADDITIONS           ADD TOP BOX · ADD ANOTHER WARDROBE
 *
 * WHAT CHANGED, and what did not. Every control below writes through the SAME
 * adapter call it wrote through last night; not one store path is new and not
 * one bound is a literal. What moved is where a client finds them, and the
 * three things CLAUDE.md names:
 *
 *   THE PLINTH IS A TYPED FIELD. The owner, of the NONE chip: *"none nie
 *   działa"* — and he is right: a wardrobe's plinth is always there, and only
 *   its height was ever the question. NONE is a LICENSED REMOVAL and the two
 *   remaining chips go with it, because a chip row of two numbers is a worse
 *   answer than a field between them. 50–150 mm, read off
 *   `profile.wardrobe.plinth` (T68's one engine licence), refused out of range
 *   under the field in the engine's own sentence.
 *
 *   LIGHTS LEAVES. *"LIGHTS leaves EXTRAS — its home is the view-bar button
 *   and the docked panel. One entry."* Both were already there (T63 F2); what
 *   goes is this step's third door to the same panel.
 *
 *   END PANELS AND SCRIBE FILLERS ARRIVE, from the right-click menu, calling
 *   the menu's own store paths — and the menu's copies of those rows die (F9)
 *   rather than standing beside them.
 *
 * SERVICE CUT-OUT is the owner's new function — a cut-out for a pipe or a box
 * — and it is GREYED WITH A REASON, which is the lawful form of *"martwa
 * narazie"*. No geometry tonight.
 */
function ExtrasPanel({ unit, project }) {
  const [said, setSaid] = useState('');
  // T65 F8: the cornice, what it leaves open, and the panels already standing.
  const cornice = unit ? A.corniceOf(unit.id) : 0;
  const gap = unit ? A.ceilingGapMm(unit.id) : 0;
  const panelSides = unit ? A.endPanelSides(unit.id) : [];
  // T66 F7 · what the split may do here, asked of the engine before the press.
  const split = unit ? A.splitDoor(unit.id) : null;
  // T66 F3 · the boxes standing on this wardrobe — each a unit of its own.
  const boxes = unit ? A.topBoxesOn(unit.id) : [];
  const topBoxReason = unit ? A.topBoxRefusal(unit.id) : '';

  // T65 F1: the plinth, the top box and the panels all belong to a wardrobe.
  if (!unit) {
    return <NeedsAWardrobe title="EXTRAS" testid="panel-extras" what="The plinth, the panels and the top box all belong to a wardrobe." />;
  }

  const plinth = Math.round(unit?.params?.leg_height ?? 100);
  // `b.` is this column's name for "the engine's own bounds" — `designBounds`
  // in FRONTS, `unitBounds` in SIZE, and the plinth law here. The prefix is
  // what `test/turn61-f5-f6-fields-and-openings.test.js` reads to prove no
  // typed field in this file carries a literal bound.
  const b = A.plinthBounds();
  const bothPanels = ['L', 'R'].every((s) => panelSides.some((p) => p.side === s));

  return (
    <Panel title="EXTRAS" testid="panel-extras">
      {/* ═══ 1 · DOORS & FRONTS ═══════════════════════════════════════════ */}
      <Group title="DOORS & FRONTS" testid="extras-group-doors">
        {/* ─── T65 F9 · ADD DOORS ──────────────────────────────────────────
            The owner: *"drzwi to osobna decyzja, w extrasach lub w setup"* ·
            *"ADD DOORS — i tu i tu chyba"*. Here on the left and on the
            selected wardrobe on the right, and BOTH press
            `adapter.addDoors` — one law, two doors to it. */}
        <Field label="DOORS">
          <div className="pbi-duty-actions">
            <Button
              kind="secondary"
              size="small"
              data-testid="extras-add-doors"
              title={A.doorsOn(unit.id) ? 'Take the doors off this wardrobe' : 'Hang doors on this wardrobe'}
              onClick={() => setSaid((A.doorsOn(unit.id) ? A.removeDoors(unit.id) : A.addDoors(unit.id)).said)}
            >
              {A.doorsOn(unit.id) ? 'REMOVE DOORS' : 'ADD DOORS'}
            </Button>
          </div>
        </Field>

        {/* ─── THE COUNT — T64's own line above it, kept ────────────────────
            *"3 drzwi czy 4 — dopiero jako coś co trzeba edytować, a nie na
            głównym menu."* T66 F3 put it under an Advanced heading in this
            step; F5's approved layout names it a plain row of this group, so
            the heading goes and PRO's own sentence stays as the row's note.

            T68 F3 · pressing 2 now returns the standard equal pair, whatever
            the face has been through. */}
        <Field label="HOW MANY" note={REASONS.doorsAreSet}>
          <ChipRow
            testid="wardrobe-doors"
            value={String(A.doorCount(unit.id))}
            options={[1, 2, 3, 4].map((n) => ({
              id: String(n),
              label: String(n),
              // The engine's two laws, asked before the click: the structural
              // one that refuses, and the yellow one that only has something
              // to say.
              reason: A.doorCountRefusal(Math.round(unit.params?.width || 0), n),
              note: A.doorCountNote(Math.round(unit.params?.width || 0), n),
            }))}
            onPick={(id) => A.setDoorCount(unit.id, Number(id))}
          />
        </Field>

        {/* ─── T66 F7 · SPLIT DOOR (TOP SEGMENT) ───────────────────────────
            *"split door top segment też powinien być w extras."* The SECOND
            DOOR to the SAME store path the copied `DoorModal` presses.
            T68 F3 · and `0` is the same reset a door count performs. */}
        <Field label="SPLIT DOOR (TOP SEGMENT)">
          {split?.said ? (
            <Said testid="extras-split-said">{split.said}</Said>
          ) : (
            <NumberField
              outOfRange={REASONS.outOfRange}
              testid="extras-split-top"
              min={split.min}
              max={split.max}
              value={split.value}
              onCommit={(v) => A.setSplitTopMm(unit.id, split.bay, v).said}
            />
          )}
        </Field>
        {split && !split.said && split.value > 0 ? (
          <div className="pbi-duty-actions">
            <Button
              kind="secondary"
              size="small"
              data-testid="extras-split-clear"
              onClick={() => setSaid(A.setSplitTopMm(unit.id, split.bay, 0).said)}
            >
              ONE DOOR AGAIN
            </Button>
          </div>
        ) : null}

        {/* ─── T69 F8 · HANDLES, IN EXTRAS — BEZAPELACYJNIE ────────────────
            *"HANDLES row lands in EXTRAS — bezapelacyjnie — same store path as
            FRONTS' opening controls. One law, two doors."*

            THE SAME CALL, and that is the whole of it: `adapter.setHandle`
            writes `setProjectHandle`, which is what the FRONTS step's own
            handle axis writes (T57 put the J-pull on it, T64 F1.5 wrote it as
            PRO's wizard does). There is no second handle law here and no
            per-unit shadow of one — the list is the ENGINE's own
            `HANDLE_TYPES` through `adapter.handleSystems`, NONE included,
            exactly as FRONTS offers it. */}
        <Field label="HANDLES" block note={REASONS.handlesArePerProject}>
          <div className="pbi-opening-list" data-testid="extras-handles">
            {A.handleSystems().map((h) => (
              <button
                key={h.id}
                type="button"
                className={`pbi-opening-row${A.handleChoice(project) === h.id ? ' is-on' : ''}`}
                data-testid={`extras-handle-${h.id}`}
                data-on={A.handleChoice(project) === h.id ? 'yes' : 'no'}
                aria-pressed={A.handleChoice(project) === h.id}
                title={h.hint || ''}
                onClick={() => A.setHandle(h.id)}
              >
                {h.label}
              </button>
            ))}
          </div>
        </Field>
      </Group>

      {/* ═══ 2 · THE CARCASS WEARS ════════════════════════════════════════ */}
      <Group title="THE CARCASS WEARS" testid="extras-group-carcass">
        {/* ─── T68 F5 · THE PLINTH, TYPED ──────────────────────────────────
            *"none nie działa"*, and the plinth is always there. The bounds are
            the ENGINE's (`profile.wardrobe.plinth`, 50–150 for a wardrobe) and
            the standard is `profile.wardrobe.legHeight`; a number outside them
            is refused UNDER the field, in `REASONS.outOfRange`'s own sentence,
            by the same `NumberField` every other millimetre in this column
            uses. */}
        <Field label="PLINTH" note={REASONS.plinthIsAlwaysThere}>
          <NumberField
            outOfRange={REASONS.outOfRange}
            testid="extras-plinth"
            min={b.min}
            max={b.max}
            standardAt={b.standard}
            value={plinth}
            onCommit={(v) => { A.setPlinth(unit.id, v); return ''; }}
          />
        </Field>

        {/* ─── T65 F8 · CORNICE ────────────────────────────────────────────
            The owner: *"nie widzę przycisków: top infill, cornice, panels."*
            It is already on: a client's wardrobe arrives wearing the profile's
            40, grown to the largest moulding that fits when the ceiling is
            100 mm away or less. NONE is the way back out — and unlike the
            plinth's, this NONE is real: a wardrobe without a cornice is a
            wardrobe the workshop builds. */}
        <Field label="CORNICE" note={cornice && gap > 0 ? REASONS.corniceLeavesAGap({ gap }) : ''}>
          <ChipRow
            testid="details-cornice"
            value={String(cornice)}
            options={[
              { id: '0', label: 'NONE' },
              ...A.corniceHeights().map((h) => ({ id: String(h), label: `${h}` })),
            ]}
            onPick={(id) => setSaid(A.setCorniceHeight(unit.id, Number(id)).ok ? '' : REASONS.corniceRefused)}
          />
        </Field>

        {/* ─── T68 F5 · TOP INFILL, RE-HOMED FROM THE RIGHT-CLICK MENU ─────
            The menu's own row, calling the menu's own store actions
            (`addTopInfill` / `removeTopInfill`). Its state is read with the
            ENGINE's `hasTopInfill`, which knows that a run MEMBER carries no
            height of its own — the reason the menu's own switch needed it. */}
        <Field label="TOP INFILL" note={REASONS.topInfillClosesTheGap}>
          <ChipRow
            testid="details-top-infill"
            value={A.topInfillOn(unit.id) ? 'on' : 'off'}
            options={[{ id: 'off', label: 'OFF' }, { id: 'on', label: 'ON' }]}
            onPick={(id) => setSaid(A.setTopInfill(unit.id, id === 'on').said)}
          />
        </Field>

        {/* ─── T69 F8 · TO THE CEILING, IN THE JOINER'S ORDER ──────────────
            *"TOP INFILL asks 'to the ceiling?': yes → first the VERTICAL
            members reach the ceiling (end panel if present, vertical
            infills), THEN the horizontal top infill closes — automatically,
            in that order. A side must never show (the visibility law)."*

            THE ORDER IS THE STORE'S (`closeToCeiling`) and not this panel's:
            it is a fact about how the thing is made. What stands here is the
            QUESTION — one press, no millimetres, no piece named — and the
            answer is the same three setters a joiner would reach for, in the
            order he would reach for them. */}
        <Field label="TO THE CEILING?" note={REASONS.toTheCeiling}>
          <div className="pbi-duty-actions">
            <Button
              kind="secondary"
              size="small"
              data-testid="extras-to-the-ceiling"
              disabled={A.closedToCeiling(unit.id)}
              title={A.closedToCeiling(unit.id)
                ? 'This wardrobe already reaches the ceiling'
                : 'Run the uprights to the ceiling, then close the top'}
              onClick={() => {
                const done = A.closeToCeiling(unit.id);
                setSaid(done.order.length ? REASONS.closedInOrder(done.order) : '');
              }}
            >
              CLOSE TO THE CEILING
            </Button>
          </div>
        </Field>

        {/* ─── END PANELS L / R / BOTH ─────────────────────────────────────
            The automat puts them where a side would otherwise show (T65 F6);
            this is the client's own hand on the same act, and a panel he asks
            for here is PERMANENT. BOTH is one press over the same per-side
            call — there is no third store path for it (F5). */}
        <Field label="END PANELS" note={REASONS.endPanelsAreFinished}>
          <ChipRow
            testid="details-end-panels"
            value={bothPanels ? 'BOTH' : ''}
            options={[
              ...['L', 'R'].map((side) => ({
                id: side,
                label: panelSides.some((p) => p.side === side) ? `${side} ✓` : side,
              })),
              { id: 'BOTH', label: bothPanels ? 'BOTH ✓' : 'BOTH' },
            ]}
            onPick={(id) => {
              if (id === 'BOTH') { setSaid(A.setEndPanelsBoth(unit.id, !bothPanels).said); return; }
              const has = panelSides.find((p) => p.side === id);
              const res = has
                ? A.removeEndPanelByHand(unit.id, has.id)
                : A.addEndPanelByHand(unit.id, id);
              setSaid(res.said || '');
            }}
          />
        </Field>

        {/* ─── SCRIBE FILLERS AT THE WALL, RE-HOMED (F5 / F9) ──────────────
            The menu's own label and the menu's own store action
            (`setSideInfillEnabled`). The piece is DERIVED — it is a fact about
            where the wardrobe is standing — so the switch is not "add one", it
            is "does this wardrobe take one at all". */}
        <Field
          label="SCRIBE FILLERS AT THE WALL"
          note={A.scribeFillersOn(unit.id) ? REASONS.scribeFillersAtTheWall : REASONS.scribeFillersOff}
        >
          <ChipRow
            testid="details-scribe-fillers"
            value={A.scribeFillersOn(unit.id) ? 'on' : 'off'}
            options={[{ id: 'off', label: 'OFF' }, { id: 'on', label: 'ON' }]}
            onPick={(id) => setSaid(A.setScribeFillers(unit.id, id === 'on').said)}
          />
        </Field>

        {/* ─── T68 F5 · SERVICE CUT-OUT — GREYED, WITH ITS REASON ──────────
            The owner's new function: a cut-out for pipes or a box. There is no
            geometry tonight, and the no-dead-controls law says a control that
            cannot act must SAY SO — *"greyed WITH reason is the lawful form of
            martwa narazie"*. `ComingSoon` is the one implementation of that
            card (T67 F3): hover OR focus opens it, so it is keyboard-reachable
            even though the button itself is not. */}
        <Field label="SERVICE CUT-OUT" note={REASONS.serviceCutOutSoon}>
          <div className="pbi-duty-actions">
            <ComingSoon what="Service cut-out">
              <Button
                kind="secondary"
                size="small"
                data-testid="extras-service-cutout"
                disabled
                title={REASONS.serviceCutOutSoon}
              >
                SERVICE CUT-OUT
              </Button>
            </ComingSoon>
          </div>
        </Field>
      </Group>

      {/* ═══ 3 · ADDITIONS ════════════════════════════════════════════════ */}
      <Group title="ADDITIONS" testid="extras-group-additions">
        {/* ─── T69 F8 · TOMBSTONE: `ADD TOP BOX` STOOD HERE ────────────────
            The owner: *"po cholerę ten box"* — a split door covers what a top
            box was for, and this step already offers one. A LICENSED REMOVAL
            of the CLIENT ENTRY and nothing else: the engine's `WARDROBE_TOP`
            type, `adapter.addTopBox`, `store.addUnit('WARDROBE_TOP')` and
            PRO's own door to it are all untouched, and the editors below
            still edit a box a saved project already carries. */}

        {/* ─── T66 F3 · A BOX IS A UNIT OF ITS OWN, AND IT IS EDITED HERE ───
            T61 F3's law stands: *"a box and the cabinet under it are two
            things in the same place"*, so its width and its height are its own
            and never the host's. The DEPTH is not offered, and that is T61's
            own reasoning unchanged: it is the host's (`settleRiders` re-writes
            it on every mutation), so typing it would be a lie. */}
        {boxes.map((box) => {
          const bb = A.unitBounds(box.id);
          return bb ? (
            <div key={box.id} className="pbi-interior-more" data-testid={`topbox-${box.id}`}>
              <Field label="TOP BOX WIDTH">
                <NumberField
                  outOfRange={REASONS.outOfRange}
                  testid="topbox-width"
                  min={bb.width.min}
                  max={bb.width.max}
                  value={Math.round(box.params?.width || 0)}
                  onCommit={(v) => A.setUnitSize(box.id, { width: v }).said}
                />
              </Field>
              <Field label="TOP BOX HEIGHT" note={REASONS.topBoxStopsAtTheCeiling}>
                <NumberField
                  outOfRange={REASONS.outOfRange}
                  testid="topbox-height"
                  min={bb.height.min}
                  max={bb.height.max}
                  value={Math.round(box.params?.height || 0)}
                  onCommit={(v) => A.setUnitSize(box.id, { height: v }).said}
                />
              </Field>
              <div className="pbi-duty-actions">
                <Button
                  kind="secondary"
                  size="small"
                  data-testid="topbox-remove"
                  onClick={() => A.removeUnit(box.id)}
                >
                  REMOVE THE TOP BOX
                </Button>
              </div>
            </div>
          ) : null;
        })}

        {/* ─── T68 F5 · ADD ANOTHER WARDROBE ───────────────────────────────
            T65 F1's law: *"The client places the first wardrobe: the plus on
            the empty floor, and an ADD A WARDROBE action in the step itself,
            both calling one store path."* This is a THIRD door to that same
            `addFirstWardrobe` and not a fourth path — the room refuses when
            the wall has no room left, in the room's own sentence. */}
        <Field label="ANOTHER WARDROBE" note={REASONS.anotherWardrobeGoesBeside}>
          <div className="pbi-duty-actions">
            <Button
              kind="secondary"
              size="small"
              data-testid="extras-add-wardrobe"
              onClick={() => setSaid(A.addFirstWardrobe() ? '' : REASONS.roomRefusedWardrobe())}
            >
              ADD ANOTHER WARDROBE
            </Button>
          </div>
        </Field>

        {said ? <Said testid="layout-said">{said}</Said> : null}
      </Group>

      <MoreOptions testid="extras-more">
        {/* ─── T68 F5 · TOMBSTONE: `LIGHT STRIPS` STOOD HERE ───────────────
            *"LIGHTS leaves EXTRAS — its home is the view-bar button and the
            docked panel. One entry."* Both already existed (T63 F2); what is
            deleted is this step's third door to the same panel, and the
            LIGHTING on/off chips above it, which were a second writer of
            `design.lighting.on` beside the copied panel's own PRO control. */}

        {/* T63 F4 · PRO's hardware step, COPIED: hinge finish, internal metal,
            soft-close, push-to-open — the client's audience, as PRO reads it. */}
        <div data-testid="extras-hardware">
          <WizardHardware audience={RETAIL_SHOW_WORKSHOP_TOOLS ? 'factory' : A.pageAudience()} />
        </div>
      </MoreOptions>
    </Panel>
  );
}

/* ─── 7 · REVIEW ──────────────────────────────────────────────────────────── */
//
// Front view (the room parks the camera on entering), the design's summary in
// words, "Price on request", the name — and the ONE primary button of the
// room: DONE → ADD TO MY ESTIMATE, or SAVE CHANGES in edit mode (F5).
function ReviewPanel({
  choices, name, onName, onDone, editing, onReset,
}) {
  const [asked, setAsked] = useState(false);
  return (
    <Panel title="REVIEW" testid="panel-review">
      <Field label="NAME">
        <input
          className="pbi-field"
          data-testid="estimate-name"
          value={name}
          onChange={(e) => onName(e.target.value)}
        />
      </Field>

      <div className="pbi-duty-what" data-testid="estimate-summary">
        {choices.map((c) => (
          <div key={c.label} className="pbi-summary-row">
            <span className="pbi-ui pbi-ui-light pbi-quiet pbi-summary-key">
              {c.label.toUpperCase()}
            </span>
            <span className="pbi-choice pbi-summary-value">{c.value}</span>
          </div>
        ))}
        <div className="pbi-display pbi-total" data-testid="review-price">{PRICE_ON_REQUEST}</div>
      </div>

      <div className="pbi-duty-actions">
        <Button onClick={onDone} data-testid="review-done">
          {editing ? 'SAVE CHANGES' : 'DONE → ADD TO MY ESTIMATE'}
        </Button>
      </div>

      <MoreOptions testid="review-more">
        {/* ─── START AGAIN — the one button that can lose an evening ────────
            It asks IN PLACE, twice, the second press labelled with what it
            does. Moved here from the old rail's foot (F4). */}
        {asked ? (
          <div className="pbi-rail-ask" data-testid="reset-ask">
            <span className="pbi-choice">Everything you have chosen for this wardrobe will go.</span>
            <Button kind="link" data-testid="reset-confirm" onClick={() => { setAsked(false); onReset(); }}>
              YES, START AGAIN
            </Button>
            <Button kind="link" className="pbi-rail-ask-no" onClick={() => setAsked(false)}>
              KEEP IT
            </Button>
          </div>
        ) : (
          <Button kind="link" data-testid="reset-design" onClick={() => setAsked(true)}>
            START AGAIN
          </Button>
        )}
      </MoreOptions>
    </Panel>
  );
}

/**
 * ─── NEXT AND BACK, ON EVERY STEP ──────────────────────────────────────────
 * NEXT is the step's primary action everywhere but REVIEW, where DONE is; so
 * on the last step it stands down and BACK stands alone. NEXT always works —
 * that is the lazy client's law, and it is what makes six clicks a wardrobe.
 */
function StepNav({ active, onPick }) {
  const i = stepIndex(active);
  const prev = CATEGORIES[i - 1] || null;
  const next = CATEGORIES[i + 1] || null;
  return (
    <div className="pbi-stepnav" data-testid="step-nav">
      <Button
        kind="secondary"
        size="small"
        data-testid="step-back"
        disabled={!prev}
        onClick={() => prev && onPick(prev.id)}
      >
        ‹ BACK
      </Button>
      <span className="pbi-ui pbi-ui-light pbi-quiet pbi-stepnav-count" data-testid="step-count">
        {`${i + 1} / ${CATEGORIES.length}`}
      </span>
      {next ? (
        <Button data-testid="step-next" onClick={() => onPick(next.id)}>
          {`NEXT · ${next.label}`}
        </Button>
      ) : null}
    </div>
  );
}

export default function Options(props) {
  const { active, title } = props;
  const step = CATEGORIES.find((c) => c.id === active) || CATEGORIES[0];
  return (
    <section
      className="pbi-options"
      data-testid="column-options"
      data-category={step.id}
      aria-label={step.label}
    >
      {/* PSW's title line: "{estimate number} — Add window" / "Edit {name}". */}
      <div className="pbi-options-title pbi-ui pbi-ui-light pbi-quiet" data-testid="options-title">{title}</div>

      {step.id === 'what' ? <WhatPanel project={props.project} /> : null}
      {step.id === 'where' ? (
        <WherePanel
          unit={props.unit}
          room={props.room}
          onEditRoom={props.onEditRoom}
        />
      ) : null}
      {step.id === 'size' ? <SizePanel unit={props.unit} /> : null}
      {step.id === 'inside' ? (
        <InsidePanel unit={props.unit} project={props.project} />
      ) : null}
      {step.id === 'fronts' ? <FrontsPanel design={props.design} project={props.project} /> : null}
      {step.id === 'extras' ? <ExtrasPanel unit={props.unit} project={props.project} /> : null}
      {step.id === 'review' ? (
        <ReviewPanel
          choices={props.choices}
          name={props.designName}
          onName={props.onDesignName}
          onDone={props.onDone}
          editing={props.editing}
          onReset={props.onReset}
        />
      ) : null}

      <StepNav active={step.id} onPick={props.onPick} />
    </section>
  );
}
