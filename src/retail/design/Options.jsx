import { useProjectStore } from '../../stores/projectStore.js';
import GoldLine from '../ui/GoldLine.jsx';
import Button from '../ui/Button.jsx';
import Chip from '../ui/Chip.jsx';
import FrontThumb from './FrontThumb.jsx';
import { ChipRow, Field, Slider } from './controls.jsx';
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
function SpacePanel({ room, project }) {
  const b = A.designBounds();
  const wall = Math.round(Math.abs(room?.corners?.[1]?.x ?? 3000));
  const ceiling = Math.round(room?.height ?? 2500);
  // The two sliders, read back out of the engine's own elevation.
  const { on, left, right } = A.slopeHeights(project);

  return (
    <Panel title="YOUR SPACE">
      <Field label="WALL WIDTH">
        <Slider
          testid="space-wall"
          min={b.wall.min}
          max={b.wall.max}
          step={b.wall.step}
          value={wall}
          onChange={(v) => A.setSpace({ wallMm: v })}
        />
      </Field>

      <Field label="CEILING HEIGHT">
        <Slider
          testid="space-ceiling"
          min={b.ceiling.min}
          max={b.ceiling.max}
          step={b.ceiling.step}
          value={ceiling}
          onChange={(v) => A.setSpace({ ceilingMm: v })}
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
            <Slider
              testid="space-slope-left"
              min={b.ceiling.min - 900}
              max={ceiling}
              step={b.ceiling.step}
              value={left}
              onChange={(v) => A.setSlope({ on: true, leftMm: v, rightMm: right })}
            />
          </Field>
          <Field label="HEIGHT AT THE RIGHT WALL">
            <Slider
              testid="space-slope-right"
              min={b.ceiling.min - 900}
              max={ceiling}
              step={b.ceiling.step}
              value={right}
              onChange={(v) => A.setSlope({ on: true, leftMm: left, rightMm: v })}
            />
          </Field>
        </>
      ) : null}

      <p className="pbi-choice pbi-choice-15 pbi-panel-note">
        Measure wall to wall and floor to ceiling. We will survey before we build.
      </p>
    </Panel>
  );
}

/* ─── 2 · LAYOUT ──────────────────────────────────────────────────────────── */
function LayoutPanel({ unit, room, onOpenDetail }) {
  const b = A.designBounds();
  const size = A.unitBounds(unit.id);
  const wall = Math.round(Math.abs(room?.corners?.[1]?.x ?? 3000));
  const width = Math.round(unit?.params?.width ?? b.defaults.width);
  const depth = Math.round(unit?.params?.depth ?? b.defaults.depth);
  const items = unit?.params?.sections?.[0]?.items || [];
  const doors = items.filter((i) => i.kind === 'partition').length + 1;

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
      <button
        type="button"
        className="pbi-link"
        data-testid="layout-open-wardrobe"
        onClick={() => onOpenDetail('wardrobe')}
      >
        THIS WARDROBE ›
      </button>

      <Field label="WARDROBE WIDTH" note={`Your wall is ${wall} mm.`}>
        <Slider
          testid="layout-width"
          min={size.width.min}
          max={size.width.max}
          step={10}
          value={Math.min(width, size.width.max)}
          onChange={(v) => A.setUnitSize(unit.id, { width: v })}
        />
      </Field>

      {/* T60 F1: the DEPTH is a slider bounded by the engine, not three chips
          whose numbers were retail's own — and which, before the projectType
          fix, matched nothing on the first frame a client ever saw. */}
      <Field label="DEPTH">
        <Slider
          testid="layout-depth"
          min={size.depth.min}
          max={size.depth.max}
          step={10}
          standardAt={b.defaults.depth}
          value={depth}
          onChange={(v) => A.setUnitSize(unit.id, { depth: v })}
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
function InteriorPanel({ unit, onOpenDetail }) {
  const store = useProjectStore.getState();
  const counts = A.interiorCounts(unit);
  const refusals = A.interiorRefusals(unit.id, unit);
  const [, force] = [0, () => {}];

  return (
    <Panel title="INTERIOR">
      <div className="pbi-interior-list">
        {A.INTERIOR_ROWS.map((row) => {
          const has = counts[row.id] || 0;
          const reason = refusals[row.id] || '';
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
                    onClick={() => { row.add(store, unit.id); force(); }}
                  >
                    ADD
                  </button>
                )}
              </div>
              {reason ? <span className="pbi-chip-reason">{reason}</span> : null}
            </div>
          );
        })}
      </div>
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
        <LayoutPanel unit={props.unit} room={props.room} onOpenDetail={props.onOpenDetail} />
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
