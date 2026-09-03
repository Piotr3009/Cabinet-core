import { useEffect, useRef, useState } from 'react';
import GoldLine from '../ui/GoldLine.jsx';
import Chip from '../ui/Chip.jsx';
import FrontThumb from './FrontThumb.jsx';
import {
  Button, ChipRow, Field, MoreOptions, NumberField, Said,
} from './controls.jsx';
import { REASONS } from './reasons.js';
import { COLLECTIONS } from './collections.js';
import * as A from './adapter.js';
import MaterialSlot from './material/MaterialSlot.jsx';
import FrontStyleGallery from './material/FrontStyleGallery.jsx';
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
// sensible answer already chosen. NEXT always works. Six clicks give a
// finished wardrobe. A picky client finds MORE OPTIONS in every step; a lazy
// one never sees them.
//
// Six panels, one at a time, in the owner's order — WHAT, WHERE, INSIDE,
// FRONTS, EXTRAS, REVIEW — each with its default already standing and its
// picky half folded under one link. NEXT and BACK on every step; a step can
// also be clicked on the rail. Nothing in any step is a slider; fields per
// T62's row law; chips for choices.
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
      <div className="pbi-tiles" data-testid="what-tiles">
        {A.projectTypeTiles().map((t) => (
          <Chip
            key={t.id}
            selected={chosen === t.id}
            disabled={Boolean(t.reason)}
            reason={t.reason}
            title={t.hint}
            onClick={() => A.setProjectType(t.id)}
          >
            <span className="pbi-stack">
              <span data-testid={`what-${t.id}`}>{t.label.toUpperCase()}</span>
            </span>
          </Chip>
        ))}
      </div>
      <p className="pbi-choice pbi-choice-15 pbi-panel-note">
        The online designer builds wardrobes today; the rest we make to order. Press NEXT —
        every step already has an answer, and you can change any of them.
      </p>
    </Panel>
  );
}

/* ─── 2 · WHERE ───────────────────────────────────────────────────────────── */
//
// Two fields — the wall and the ceiling — and the wardrobe fills the wall
// (`adapter.fitWardrobeToWall`: the store's own clamp decides how much of it).
// T64 F1.8: ONE WALL. The `WALLS 1 | 2` chips and `WALL 2 WIDTH` of T61 are
// gone under CLAUDE.md's licence; a second wardrobe is the estimate's
// business (F5). The L-shape, when it exists, will be a furniture TYPE.
function WherePanel({ unit, room, onEditRoom, onOpenDetail }) {
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
            // The wardrobe fills the wall, and the store says how much of it.
            const fit = unit ? A.fitWardrobeToWall(unit.id) : { said: '' };
            setSaid(fit.said || '');
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

      <p className="pbi-choice pbi-choice-15 pbi-panel-note">
        Measure wall to wall and floor to ceiling. The wardrobe fills the wall; we will survey
        before we build.
      </p>

      <MoreOptions testid="where-more">
        {/* ─── T62 · TOMBSTONE: THE SLOPED CEILING CHIP, AND THE TWO OPENING
                BUTTONS, STOOD HERE. F3's copied elevation editor has them. */}
        <div className="pbi-duty-actions">
          {/* THE HOUSE RULE (rule 15): the window opens BESIDE its trigger. */}
          <Button
            kind="secondary"
            size="small"
            data-testid="space-edit-room"
            onClick={(e) => onEditRoom(anchorOfEvent(e))}
          >
            EDIT THE ROOM ›
          </Button>
          <Button
            kind="secondary"
            size="small"
            data-testid="layout-open-wardrobe"
            onClick={() => onOpenDetail('wardrobe')}
          >
            THIS WARDROBE — SIZE AND DOORS ›
          </Button>
        </div>
        <p className="pbi-choice pbi-panel-note">
          EDIT THE ROOM draws the plan — walls, boxes, sloping ceilings, windows and doors.
          Nothing is fitted around them yet: a wardrobe may stand across a window and we will
          sort it on the survey.
        </p>
      </MoreOptions>
    </Panel>
  );
}

/* ─── T64 · TOMBSTONE: `LayoutPanel` STOOD HERE ───────────────────────────── */
//
// WARDROBE WIDTH and DEPTH are the wardrobe's own menu (WIDTH AND HEIGHT ›);
// DOORS and BAYS moved under its Advanced heading (F1.7); the WALL row and
// ADD WARDROBE ON WALL 2 went with the second wall (F1.8); ADD TOP BOX is
// EXTRAS. The engine's door rule decides the doors.

/* ─── 3 · INSIDE ──────────────────────────────────────────────────────────── */
//
// *"najpierw materiał, a później reszta"*: the CARCASS material first — PRO's
// own `MaterialChoicePanel` with the tiled `DecorPickerModal` behind it,
// COPIED (T63) — then the inside colour in three answers, then PRO's own
// `AddItems`, whole. Default: white inside, an empty carcass; NEXT works.
function InsidePanel({ unit, project, onOpenDetail }) {
  const counts = A.interiorCounts(unit);
  const inside = A.INTERIOR_ROWS.filter((row) => (counts[row.id] || 0) > 0);
  const colour = A.insideColourOf(project);

  // ─── T64 F1.4 · SHELVES GO IN CENTRED ────────────────────────────────────
  // A shelf that arrives through PRO's list lands at the centre of the
  // biggest opening (PRO's law); the KIT's even ladder for the bay it landed
  // in is the store's own `redistributeShelvesInBay` — asked once, here,
  // when the count grows. See `adapter.spreadNewShelf`.
  const shelves = counts.shelves || 0;
  const last = useRef(shelves);
  useEffect(() => {
    if (shelves > last.current) A.spreadNewShelf(unit.id);
    last.current = shelves;
  }, [shelves, unit.id]);

  return (
    <Panel title="INSIDE" testid="panel-inside">
      {/* THE MATERIAL FIRST. PRO's slot for the carcass, exactly as PRO shows it. */}
      <Field label="CARCASS BOARD" block>
        <div data-testid="inside-material">
          <MaterialSlot kind="carcass" title="Carcass — what is it made of?" />
        </div>
      </Field>

      <Field label="INSIDE COLOUR">
        <div className="pbi-chip-row" data-testid="inside-colour">
          <Chip selected={colour === 'fronts'} onClick={() => A.setInsideColour('fronts')} label="SAME AS FRONTS" />
          <Chip selected={colour === 'white'} onClick={() => A.setInsideColour('white')} label="WHITE" />
          <Chip
            selected={colour === 'chosen'}
            onClick={() => {
              // The third answer opens the same EGGER window the slot above
              // opens — PRO's tile, PRO's modal, one click.
              const slot = document.querySelector('[data-testid="inside-material"] [data-change-decor], [data-testid="inside-material"] [data-choose-decor]');
              slot?.click();
            }}
            label="CHOOSE…"
          />
        </div>
      </Field>

      {/* PRO's "What goes inside", whole (T63 F3). */}
      <div data-testid="interior-pro-list">
        <AddItems unit={unit} />
      </div>

      {inside.length ? (
        <div className="pbi-interior-list" data-testid="interior-inside">
          {inside.map((row) => (
            <div key={row.id} data-testid={`interior-${row.id}`}>
              <div className="pbi-interior-row">
                <span className="pbi-choice pbi-choice-15 pbi-interior-name">{row.name}</span>
                <Button
                  kind="link"
                  data-testid={`interior-open-${row.id}`}
                  onClick={() => onOpenDetail(row.menu)}
                  title="Open this"
                >
                  {`${counts[row.id]} ›`}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}

/* ─── 4 · FRONTS ──────────────────────────────────────────────────────────── */
//
// Default: shaker, push-to-open, the collection's EGGER decor. The OPENING is
// PRO's own four (`lib/frontOpening.js FRONT_OPENINGS`), written as PRO's
// wizard writes them (T64 F1.5 — a J-pull is a HANDLE, and this is where the
// J did not render). Under MORE OPTIONS: the shaker frame, the collections,
// PRO's style gallery and every source the slot's own strip offers.
function FrontsPanel({ design, project }) {
  const b = A.designBounds();
  const style = design?.fronts?.style || 'S';
  const frame = design?.fronts?.shakerFrame || b.shakerFrame.standard;
  const opening = A.frontOpeningOf(project);

  return (
    <Panel title="FRONTS" testid="panel-fronts">
      <Field label="STYLE" block>
        <div className="pbi-chip-row" data-testid="fronts-style">
          {/* T57's doctrine: the J is a handle system, not a shape — so the
              legacy `HJ` shape is not offered as a style; it is the OPENING
              below, and it is the only J the client can choose. */}
          {A.frontStyles().filter((s) => s.id !== 'HJ').map((s) => (
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

      <Field label="OPENING">
        <ChipRow
          testid="fronts-opening"
          value={opening}
          options={A.frontOpenings().map((o) => ({ id: o.id, label: o.label.toUpperCase(), hint: o.hint }))}
          onPick={(id) => A.setFrontOpening(id)}
        />
      </Field>

      {/* T63 F4 · PRO's slot for the fronts, with the tiled EGGER modal behind it. */}
      <Field label="COLOUR" block>
        <div data-testid="fronts-material">
          <MaterialSlot kind="front" title="Fronts — what are they made of?" />
        </div>
      </Field>

      <MoreOptions testid="fronts-more">
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

        <Field label="COLLECTION" block>
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

        {/* T63 F4 · PRO's door-style GALLERY (T15 F4), COPIED. */}
        <Field label="STYLE GALLERY" block>
          <div data-testid="fronts-style-gallery">
            <FrontStyleGallery value={style} onPick={(id) => A.setFrontStyle(id)} />
          </div>
        </Field>
      </MoreOptions>
    </Panel>
  );
}

/* ─── 5 · EXTRAS ──────────────────────────────────────────────────────────── */
//
// Default: lighting off, the standard plinth, no top box. MORE OPTIONS:
// PRO's Lighting panel (copied), PRO's WizardHardware (copied — hinge
// finish, internal metal, soft-close, push-to-open) and ADD TOP BOX.
function ExtrasPanel({ unit, project }) {
  const plinth = Math.round(unit?.params?.leg_height ?? 100);
  const lights = A.lightingOn(project);
  const topBoxReason = A.topBoxRefusal(unit.id);
  const [said, setSaid] = useState('');

  return (
    <Panel title="EXTRAS" testid="panel-extras">
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
          options={A.plinthOptions()}
          onPick={(id) => A.setPlinth(unit.id, Number(id))}
        />
      </Field>

      <MoreOptions testid="extras-more">
        <Field label="LIGHT STRIPS">
          <div className="pbi-duty-actions">
            {/* T63 F2 · LIGHTS opens PRO's Lighting panel beside the button —
                the very call PRO's own Lighting button makes. */}
            <Button
              kind="secondary"
              size="small"
              data-testid="extras-open-lighting"
              onClick={(e) => A.openEditor('lighting', { anchor: A.anchorOf(e) })}
            >
              WHERE THE LIGHT GOES ›
            </Button>
          </div>
        </Field>

        {/* T61 F3 · *"4 add top"* — greyed with the ROOM's own sentence. */}
        <Field label="TOP BOX" note={A.topBoxesOn(unit.id).length ? REASONS.topBoxGoesBeside : ''}>
          <div className="pbi-duty-actions">
            <Button
              kind="secondary"
              size="small"
              data-testid="layout-add-top-box"
              disabled={Boolean(topBoxReason)}
              title={topBoxReason || 'Add a top box on this wardrobe'}
              onClick={() => setSaid(A.addTopBox(unit.id).said)}
            >
              ADD TOP BOX
            </Button>
          </div>
          {topBoxReason ? (
            <span className="pbi-chip-reason" data-testid="layout-top-box-reason">{topBoxReason}</span>
          ) : null}
          {said ? <Said testid="layout-said">{said}</Said> : null}
        </Field>

        {/* T63 F4 · PRO's hardware step, COPIED: hinge finish, internal metal,
            soft-close, push-to-open — the client's audience, as PRO reads it. */}
        <div data-testid="extras-hardware">
          <WizardHardware audience={RETAIL_SHOW_WORKSHOP_TOOLS ? 'factory' : A.pageAudience()} />
        </div>
      </MoreOptions>
    </Panel>
  );
}

/* ─── 6 · REVIEW ──────────────────────────────────────────────────────────── */
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
          onOpenDetail={props.onOpenDetail}
        />
      ) : null}
      {step.id === 'inside' ? (
        <InsidePanel unit={props.unit} project={props.project} onOpenDetail={props.onOpenDetail} />
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
