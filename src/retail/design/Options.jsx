import { useState } from 'react';
import { useProjectStore } from '../../stores/projectStore.js';
import GoldLine from '../ui/GoldLine.jsx';
import Button from '../ui/Button.jsx';
import Chip from '../ui/Chip.jsx';
import FrontThumb from './FrontThumb.jsx';
import {
  ChipRow, Field, NumberField, Said, Slider,
} from './controls.jsx';
import { REASONS } from './reasons.js';
import { COLLECTIONS } from './collections.js';
import * as A from './adapter.js';
import { CATEGORIES } from './Categories.jsx';
import { PRICE_ON_REQUEST } from '../config.js';

// ─── F4 · COLUMN 2 — THE OPTIONS OF THE ACTIVE CATEGORY ────────────────────
//
// *"The active category's options, ALWAYS visible as a column — never an
// accordion, never folding inside column 1."*
//
// One panel per category, one at a time, and the column never changes width.
// Every write goes through `adapter.js`; not one line below names an engine
// parameter, and not one bound below is a literal — `A.designBounds()` reads the
// profile and this file reads `A.designBounds()`.

function Panel({ title, children }) {
  return (
    <div className="pbi-panel">
      <h2 className="pbi-display pbi-h4">{title}</h2>
      <GoldLine />
      {children}
    </div>
  );
}

/* ─── 1 · YOUR SPACE ──────────────────────────────────────────────────────── */
//
// ─── T61 · WHAT CHANGED HERE, AND ON WHOSE ORDER ───────────────────────────
//
// F5  Every slider in this panel is a typed FIELD. *"nie widze sensu [suwaków]
//     bo i tak nie trafisz, trzeba bedzie wpisac."* The bounds are the same two
//     `A.designBounds()` calls the sliders read; what is new is that a number
//     outside them is REFUSED with a sentence rather than silently clamped.
// F2  WALLS `1 | 2`, and with 2 a second field for the other side of the
//     rectangle. *"zrob 2 sciany"* · *"2 tak wystarczy"*.
// F6  WINDOWS & DOORS, drawn only. *"3 — narazie sie rysuja"*.
function SpacePanel({ room, project }) {
  const b = A.designBounds();
  const wall = A.wallLengthMm(room, 0);
  const wall2 = A.wallLengthMm(room, 1);
  const ceiling = Math.round(room?.height ?? 2500);
  const twoWalls = A.wallChoice(project) === 'two';
  // The two heights, read back out of the engine's own elevation.
  const { on, left, right } = A.slopeHeights(project);
  const openings = A.roomOpenings(project, room);

  return (
    <Panel title="YOUR SPACE">
      {/* ─── T61 F2 · HOW MANY WALLS ────────────────────────────────────────
          The scope is the PROJECT's own field (`design.scope`), migrated on the
          way in by the vocabulary's own gate, and the wall list it produces is
          `engine/room.js wallIndicesInScope`. Retail names no wall itself. */}
      <Field label="WALLS">
        <ChipRow
          testid="space-walls"
          value={A.wallChoice(project)}
          options={A.WALL_CHOICES}
          onPick={(id) => A.setWallCount(id)}
        />
      </Field>

      <Field label="WALL WIDTH">
        <NumberField
          testid="space-wall"
          min={b.wall.min}
          max={b.wall.max}
          value={wall}
          outOfRange={REASONS.outOfRange}
          onCommit={(v) => A.setSpace({ wallMm: v })?.message || ''}
        />
      </Field>

      {/* THE SECOND WALL IS THE RECTANGLE'S OTHER SIDE, and that is not a new
          write: `rectCorners(width, depth)` has always put corner 2 at (W, D),
          so wall 1's length IS the argument `setSpace` was already reading back
          and handing straight in. It appears only when there are two walls to
          have one. */}
      {twoWalls ? (
        <Field label="WALL 2 WIDTH">
          <NumberField
            testid="space-wall2"
            min={b.wall.min}
            max={b.wall.max}
            value={wall2}
            outOfRange={REASONS.outOfRange}
            onCommit={(v) => A.setSpace({ wall2Mm: v })?.message || ''}
          />
        </Field>
      ) : null}

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

      <Field label="SLOPED CEILING">
        <ChipRow
          testid="space-slope"
          value={on ? 'on' : 'off'}
          options={[{ id: 'off', label: 'NO' }, { id: 'on', label: 'YES' }]}
          onPick={(id) => A.setSlope({ on: id === 'on', leftMm: left, rightMm: right })}
        />
      </Field>

      {on ? (
        <>
          <Field label="HEIGHT AT THE LEFT WALL">
            <NumberField
              testid="space-slope-left"
              min={b.ceiling.min - 900}
              max={ceiling}
              value={left}
              outOfRange={REASONS.outOfRange}
              onCommit={(v) => { A.setSlope({ on: true, leftMm: v, rightMm: right }); return ''; }}
            />
          </Field>
          <Field label="HEIGHT AT THE RIGHT WALL">
            <NumberField
              testid="space-slope-right"
              min={b.ceiling.min - 900}
              max={ceiling}
              value={right}
              outOfRange={REASONS.outOfRange}
              onCommit={(v) => { A.setSlope({ on: true, leftMm: left, rightMm: v }); return ''; }}
            />
          </Field>
        </>
      ) : null}

      <OpeningsBlock openings={openings} room={room} project={project} twoWalls={twoWalls} />

      <p className="pbi-choice pbi-choice-15 pbi-panel-note">
        Measure wall to wall and floor to ceiling. We will survey before we build.
      </p>
    </Panel>
  );
}

/* ─── T61 F6 · WINDOWS AND DOORS ──────────────────────────────────────────── */
//
// *"3 — narazie sie rysuja."* They draw and nothing fits around them: a wardrobe
// may stand across a window and the app says nothing. Named as a known gap.
//
// Every field's ends are `A.openingBounds`, which is `clampOpening`'s own
// arithmetic read back — so the engine's limits are what a client is refused
// by, and the engine's silent clamp never has to fire.
function OpeningsBlock({
  openings, room, project, twoWalls,
}) {
  const wallOptions = A.wallsShown(project, room)
    .map((i) => ({ id: String(i), label: String(i + 1) }));

  return (
    <Field label="WINDOWS &amp; DOORS">
      <div className="pbi-openings" data-testid="space-openings">
        {openings.map((o) => {
          const bounds = A.openingBounds(o, room);
          const num = (key, label) => (
            <div className="pbi-opening-field" key={key}>
              <span className="pbi-ui pbi-ui-light pbi-quiet">{label}</span>
              <NumberField
                testid={`opening-${key}-${o.id}`}
                min={bounds[key].min}
                max={bounds[key].max}
                value={Math.round(Number(o[key]) || 0)}
                outOfRange={REASONS.outOfRange}
                onCommit={(v) => A.setOpening(o.id, { [key]: v }).said}
              />
            </div>
          );
          return (
            <div className="pbi-opening" key={o.id} data-testid={`opening-${o.id}`}>
              <div className="pbi-opening-head">
                <span className="pbi-choice pbi-choice-15">
                  {o.kind === 'door' ? 'DOOR' : 'WINDOW'}
                </span>
                <button
                  type="button"
                  className="pbi-link"
                  data-testid={`opening-remove-${o.id}`}
                  onClick={() => A.removeOpening(o.id)}
                >
                  REMOVE
                </button>
              </div>
              {twoWalls ? (
                <ChipRow
                  testid={`opening-wall-${o.id}`}
                  value={String(o.wall)}
                  options={wallOptions}
                  onPick={(id) => A.setOpening(o.id, { wall: Number(id) })}
                />
              ) : null}
              {num('x_mm', 'FROM THE LEFT')}
              {num('width', 'WIDTH')}
              {num('height', 'HEIGHT')}
              {o.kind === 'window' ? num('sill', 'SILL — OFF THE FLOOR') : null}
            </div>
          );
        })}
        <div className="pbi-duty-actions">
          <Button
            kind="secondary"
            data-testid="opening-add-window"
            onClick={() => A.addOpening('window', 0)}
          >
            ADD WINDOW
          </Button>
          <Button
            kind="secondary"
            data-testid="opening-add-door"
            onClick={() => A.addOpening('door', 0)}
          >
            ADD DOOR
          </Button>
        </div>
        {/* THE GAP, SAID OUT LOUD rather than left to be discovered. */}
        <p className="pbi-choice pbi-choice-15 pbi-panel-note">
          Windows and doors are drawn so you can see the room. Nothing is fitted
          around them yet — tell us about them and we will on the survey.
        </p>
      </div>
    </Field>
  );
}

/* ─── 2 · LAYOUT ──────────────────────────────────────────────────────────── */
//
// ─── T61 · WHAT CHANGED HERE ───────────────────────────────────────────────
//
// F5  WARDROBE WIDTH and DEPTH are typed fields, refusing out of range in the
//     store's own words.
// F2  A WALL chip row on the selected wardrobe (`projectStore.setUnitWall`,
//     whose refusal is shown verbatim), and ADD WARDROBE ON WALL 2 when the
//     second wall is empty.
// F3  ADD TOP BOX beside "THIS WARDROBE ›" — *"4 add top"* — the same action
//     the wardrobe's own Duty menu carries.
function LayoutPanel({ unit, room, project, onOpenDetail }) {
  const b = A.designBounds();
  const size = A.unitBounds(unit.id);
  const [said, setSaid] = useState('');
  const wallIndex = A.unitWall(unit.id);
  const wall = A.wallLengthMm(room, wallIndex);
  const width = Math.round(unit?.params?.width ?? b.defaults.width);
  const depth = Math.round(unit?.params?.depth ?? b.defaults.depth);
  const items = unit?.params?.sections?.[0]?.items || [];
  const doors = items.filter((i) => i.kind === 'partition').length + 1;
  const shown = A.wallsShown(project, room);
  const twoWalls = shown.length > 1;
  const topBoxReason = A.topBoxRefusal(unit.id);
  const emptyWall = shown.find((i) => !A.unitsOnWall(i).length);

  if (!size) return null;

  const doorOptions = [1, 2, 3, 4].map((n) => ({
    id: String(n),
    label: String(n),
    // THE ENGINE'S OWN LAWS, asked before the click — the structural one that
    // refuses, and the yellow one that only has something to say.
    reason: A.doorCountRefusal(width, n),
    note: A.doorCountNote(width, n),
  }));

  return (
    <Panel title="LAYOUT">
      {/* ─── THE WAY INTO THE WARDROBE'S OWN MENU ─────────────────────────
          A single click on the STAGE reaches a door, a shelf, a drawer — every
          piece a client points at. It does NOT reach the carcass, and that is
          the shared core's own turn-13 verdict kept: *"clicking a cabinet must
          select the CABINET"*, which is a selection and not an element. So the
          wardrobe's own menu is opened from here, where the client is already
          making that decision, rather than by inventing a gesture for it. */}
      <div className="pbi-layout-links">
        <button
          type="button"
          className="pbi-link"
          data-testid="layout-open-wardrobe"
          onClick={() => onOpenDetail('wardrobe')}
        >
          THIS WARDROBE ›
        </button>

        {/* T61 F3 · *"4 add top"* — the button on the selected wardrobe. It
            greys with the ROOM's own sentence, which `A.topBoxRefusal` reads
            from the very predicate `addUnit` refuses with. */}
        <button
          type="button"
          className="pbi-link"
          data-testid="layout-add-top-box"
          disabled={Boolean(topBoxReason)}
          title={topBoxReason || 'Add a top box on this wardrobe'}
          onClick={() => setSaid(A.addTopBox(unit.id).said)}
        >
          ADD TOP BOX
        </button>
      </div>
      {topBoxReason ? (
        <span className="pbi-chip-reason" data-testid="layout-top-box-reason">{topBoxReason}</span>
      ) : null}

      {/* T61 F2 · WHICH WALL this wardrobe stands on. `setUnitWall` looks for a
          free slot and refuses in its own words when there is none. */}
      {twoWalls ? (
        <Field label="WALL">
          <ChipRow
            testid="layout-wall"
            value={String(wallIndex)}
            options={shown.map((i) => ({ id: String(i), label: String(i + 1) }))}
            onPick={(id) => setSaid(A.setUnitWall(unit.id, Number(id)).said)}
          />
        </Field>
      ) : null}

      {twoWalls && emptyWall != null ? (
        <div className="pbi-duty-actions">
          <Button
            kind="secondary"
            data-testid="layout-add-wardrobe"
            onClick={() => setSaid(A.addWardrobeOnWall(emptyWall).said)}
          >
            {`ADD WARDROBE ON WALL ${emptyWall + 1}`}
          </Button>
        </div>
      ) : null}

      {said ? <Said testid="layout-said">{said}</Said> : null}

      <Field label="WARDROBE WIDTH" note={`Wall ${wallIndex + 1} is ${wall} mm.`}>
        <NumberField
          testid="layout-width"
          min={size.width.min}
          max={size.width.max}
          value={width}
          outOfRange={REASONS.outOfRange}
          onCommit={(v) => A.setUnitSize(unit.id, { width: v }).said}
        />
      </Field>

      {/* T60 F1: the DEPTH was a slider bounded by the engine, not three chips
          whose numbers were retail's own. T61 F5 makes it a typed field with the
          same two ends. */}
      <Field label="DEPTH">
        <NumberField
          testid="layout-depth"
          min={size.depth.min}
          max={size.depth.max}
          standardAt={b.defaults.depth}
          value={depth}
          outOfRange={REASONS.outOfRange}
          onCommit={(v) => A.setUnitSize(unit.id, { depth: v }).said}
        />
      </Field>

      <Field label="DOORS">
        <ChipRow
          testid="layout-doors"
          value={String(doors)}
          options={doorOptions}
          onPick={(id) => A.setDoorCount(unit.id, Number(id))}
        />
      </Field>

      {/* T60: a BAY is a compartment and a DOOR is a leaf. t59 wired this row
          to the door count, so it was the row above it under another name. */}
      <Field label="BAYS">
        <ChipRow
          testid="layout-bays"
          value={String(A.bayCount(unit.id))}
          options={[1, 2, 3, 4].map((n) => ({
            id: String(n), label: String(n), reason: A.bayRefusal(unit.id, n),
          }))}
          onPick={(id) => A.setBayCount(unit.id, Number(id))}
        />
      </Field>
    </Panel>
  );
}

/* ─── 3 · FRONTS ──────────────────────────────────────────────────────────── */
function FrontsPanel({ design }) {
  const b = A.designBounds();
  const style = design?.fronts?.style || 'F';
  const frame = design?.fronts?.shakerFrame || b.shakerFrame.standard;
  const finishId = design?.fronts?.types?.[0]?.finish_id || null;

  return (
    <Panel title="FRONTS">
      <Field label="FRONT STYLE">
        <div className="pbi-chip-row" data-testid="fronts-style">
          {A.frontStyles().map((s) => (
            <Chip
              key={s.id}
              selected={style === s.id}
              disabled={s.soon}
              reason={s.reason}
              onClick={() => A.setFrontStyle(s.id)}
            >
              <span className="pbi-stack">
                <FrontThumb style={s.id} />
                <span>{s.label}</span>
              </span>
            </Chip>
          ))}
        </div>
      </Field>

      {style === 'S' ? (
        <Field label="SHAKER FRAME">
          <ChipRow
            testid="fronts-frame"
            value={frame <= b.shakerFrame.narrow ? 'narrow' : 'standard'}
            options={[
              { id: 'narrow', label: 'NARROW', sub: `${b.shakerFrame.narrow} mm` },
              { id: 'standard', label: 'STANDARD', sub: `${b.shakerFrame.standard} mm` },
            ]}
            onPick={(id) => A.setShakerFrame(id === 'narrow' ? b.shakerFrame.narrow : b.shakerFrame.standard)}
          />
        </Field>
      ) : null}

      <Field label="COLLECTION">
        <div className="pbi-chip-row" data-testid="fronts-collection">
          {COLLECTIONS.map((c) => (
            <Chip key={c.id} onClick={() => A.applyCollection(c.id)}>
              <span className="pbi-stack">
                <span className="pbi-tone-tile" style={{ background: c.tone }} />
                <span>{c.name}</span>
              </span>
            </Chip>
          ))}
        </div>
      </Field>

      <Field
        label="COLOUR"
        note="Every board is EGGER. Colour matching is only valid against the original sample."
      >
        <div className="pbi-chip-row" data-testid="fronts-colour">
          {[...new Set(COLLECTIONS.flatMap((c) => c.swatches))].map((id) => {
            const s = A.swatchFor(id);
            return (
              <Chip
                key={id}
                title={s.label}
                selected={finishId === s.finishId}
                onClick={() => A.setFrontDecor(id)}
              >
                <span className="pbi-stack">
                  <span className="pbi-swatch-tile" style={{ background: s.hex || 'var(--pbi-soft-ivory)' }} />
                  {/* The EGGER attribution, next to the swatch, unconditionally. */}
                  <span className="pbi-choice pbi-swatch-label">{s.label}</span>
                </span>
              </Chip>
            );
          })}
        </div>
      </Field>
    </Panel>
  );
}

/* ─── 4 · INTERIOR ────────────────────────────────────────────────────────── */
//
// ─── T61 F4 · THE FULL ROW SET ─────────────────────────────────────────────
//
// The owner: *"dowozimy dla klientow musi bcy wszystko"*. Six rows become
// PRO's ten, in PRO's order, with PRO's predicates — the list itself is
// `adapter.INTERIOR_ROWS` and a test reads it against `components/AddItems.jsx`
// so the two cannot drift.
//
// THE STANDING LAW HOLDS: no dead control. A row either works or is greyed with
// the sentence its own predicate earns — the STORE's where the store has one
// (the watch drawer's *"Add the drawers first"*), `reasons.js`'s where the
// shared core answers only in a boolean, and never a wording retail invented
// for something the engine already says.
//
// AND THE CLICK LISTENS. t59 pressed ADD and threw the answer away: a store
// that refused reported nothing, which is the same fault as a dead control with
// better manners. The answer is read and shown, in the third voice.
function InteriorPanel({ unit, onOpenDetail }) {
  const store = useProjectStore.getState();
  const [said, setSaid] = useState('');
  const counts = A.interiorCounts(unit);
  const refusals = A.interiorRefusals(unit.id, unit);
  const notes = A.interiorNotes(unit);

  // WHAT THE SHARED CORE SAID ABOUT **THIS** PRESS. Only a message the queue
  // GREW belongs to this click; the tail of the queue holds every notice the
  // session has raised. The same measurement `adapter.setTopInsert` makes.
  const add = (row) => {
    const before = A.messageCount();
    const answer = row.add(store, unit.id);
    // Three shapes of answer, all the shared core's: a verdict object, a bare
    // null (the refusal is in the queue, or there was none), or an id.
    const direct = answer && typeof answer === 'object' ? String(answer.error || '') : '';
    setSaid(direct || (A.messageCount() > before ? A.lastEngineWord() : ''));
  };

  return (
    <Panel title="INTERIOR">
      <div className="pbi-interior-list">
        {A.INTERIOR_ROWS.map((row) => {
          const has = counts[row.id] || 0;
          const reason = refusals[row.id] || '';
          const note = notes[row.id] || '';
          return (
            <div key={row.id} data-testid={`interior-${row.id}`}>
              <div className="pbi-interior-row">
                <span className="pbi-choice pbi-choice-15 pbi-interior-name">{row.name}</span>

                {/* T60 F3: every row that HAS something opens that thing's own
                    menu — the pull-down included, which t59 left without one. */}
                {has ? (
                  <button
                    type="button"
                    className="pbi-link"
                    data-testid={`interior-open-${row.id}`}
                    onClick={() => onOpenDetail(row.menu)}
                    title="Open this"
                  >
                    {`${has} ›`}
                  </button>
                ) : null}

                {reason ? (
                  <span className="pbi-ui pbi-ui-light pbi-quiet">UNAVAILABLE</span>
                ) : (
                  <button
                    type="button"
                    className="pbi-link"
                    data-testid={`interior-add-${row.id}`}
                    onClick={() => add(row)}
                  >
                    ADD
                  </button>
                )}
              </div>
              {reason ? <span className="pbi-chip-reason">{reason}</span> : null}
              {!reason && note ? (
                <span className="pbi-chip-reason" data-testid={`interior-note-${row.id}`}>{note}</span>
              ) : null}
            </div>
          );
        })}
      </div>
      {said ? <Said testid="interior-said">{said}</Said> : null}
    </Panel>
  );
}

/* ─── 5 · DETAILS ─────────────────────────────────────────────────────────── */
function DetailsPanel({ unit, design, project }) {
  const handle = design?.fronts?.handle?.type || 'none';
  const jpull = handle === 'jpull';
  const plinth = Math.round(unit?.params?.leg_height ?? 100);
  const lights = A.lightingOn(project);

  return (
    <Panel title="DETAILS">
      <Field label="HANDLES">
        <ChipRow
          testid="details-handle"
          value={handle}
          options={A.handleSystems().map((h) => ({
            id: h.id,
            label: h.label,
            // T57's law: a J-pull is the front's own edge, so nothing else can
            // be screwed on while it is chosen.
            reason: jpull && h.id !== 'jpull' ? A.REASON_JPULL : '',
          }))}
          onPick={(id) => A.setHandle(id)}
        />
      </Field>

      <Field label="LIGHTING">
        <ChipRow
          testid="details-lighting"
          value={lights ? 'on' : 'off'}
          options={[{ id: 'off', label: 'OFF' }, { id: 'on', label: 'ON' }]}
          onPick={(id) => A.setLighting(id === 'on')}
        />
      </Field>

      <Field label="PLINTH">
        <ChipRow
          testid="details-plinth"
          value={String(plinth)}
          options={[{ id: '100', label: '100' }, { id: '150', label: '150' }]}
          onPick={(id) => A.setPlinth(unit.id, Number(id))}
        />
      </Field>
    </Panel>
  );
}

/* ─── 6 · ESTIMATE ────────────────────────────────────────────────────────── */
function EstimatePanel({ choices, name, onName, onQuote, onSave }) {
  return (
    <Panel title="ESTIMATE">
      <Field label="WHAT WE WILL QUOTE">
        <div className="pbi-duty-what" data-testid="estimate-summary">
          {choices.map((c) => (
            <div key={c.label} className="pbi-summary-row">
              <span className="pbi-ui pbi-ui-light pbi-quiet pbi-summary-key">
                {c.label.toUpperCase()}
              </span>
              <span className="pbi-choice pbi-summary-value">{c.value}</span>
            </div>
          ))}
          <div className="pbi-display pbi-total">{PRICE_ON_REQUEST}</div>
        </div>
      </Field>

      <Field label="NAME THIS DESIGN">
        <input
          className="pbi-field"
          data-testid="estimate-name"
          value={name}
          onChange={(e) => onName(e.target.value)}
        />
      </Field>

      <div className="pbi-duty-actions">
        <Button onClick={onQuote} data-testid="estimate-quote">REQUEST A QUOTE</Button>
        <Button kind="secondary" onClick={onSave} data-testid="estimate-save">SAVE ESTIMATE</Button>
      </div>
    </Panel>
  );
}

export default function Options(props) {
  const { active } = props;
  const title = CATEGORIES.find((c) => c.id === active)?.label || '';
  return (
    <section
      className="pbi-options"
      data-testid="column-options"
      data-category={active}
      aria-label={title}
    >
      {active === 'space' ? <SpacePanel room={props.room} project={props.project} /> : null}
      {active === 'layout' ? (
        <LayoutPanel
          unit={props.unit}
          room={props.room}
          project={props.project}
          onOpenDetail={props.onOpenDetail}
        />
      ) : null}
      {active === 'fronts' ? <FrontsPanel design={props.design} /> : null}
      {active === 'interior' ? <InteriorPanel unit={props.unit} onOpenDetail={props.onOpenDetail} /> : null}
      {active === 'details' ? (
        <DetailsPanel unit={props.unit} design={props.design} project={props.project} />
      ) : null}
      {active === 'estimate' ? (
        <EstimatePanel
          choices={props.choices}
          name={props.designName}
          onName={props.onDesignName}
          onQuote={props.onQuote}
          onSave={props.onSave}
        />
      ) : null}
    </section>
  );
}
