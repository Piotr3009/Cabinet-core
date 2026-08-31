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
// parameter, and not one bound below is a literal — `A.bounds()` reads the
// profile and this file reads `A.bounds()`.

const SIDE = '24px';

function Panel({ title, children }) {
  return (
    <div style={{ padding: `22px ${SIDE} 40px` }}>
      <h2 className="pbi-display pbi-h4">{title}</h2>
      <GoldLine margin="12px 0 24px" />
      {children}
    </div>
  );
}

/* ─── 1 · YOUR SPACE ──────────────────────────────────────────────────────── */
function SpacePanel({ room, slope }) {
  const b = A.bounds();
  const wall = Math.round(Math.abs(room?.corners?.[1]?.x ?? 3000));
  const ceiling = Math.round(room?.height ?? 2500);
  const on = Boolean(slope);
  const left = Math.round(slope?.pts?.[0]?.y ?? Math.min(ceiling, 1400));
  const right = Math.round(slope?.pts?.[1]?.y ?? ceiling);

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

      <p className="pbi-choice pbi-choice-15" style={{ marginTop: 30 }}>
        Measure wall to wall and floor to ceiling. We will survey before we build.
      </p>
    </Panel>
  );
}

/* ─── 2 · LAYOUT ──────────────────────────────────────────────────────────── */
function LayoutPanel({ unit, room }) {
  const b = A.bounds();
  const wall = Math.round(Math.abs(room?.corners?.[1]?.x ?? 3000));
  const width = Math.round(unit?.params?.width ?? b.defaults.width);
  const depth = Math.round(unit?.params?.depth ?? b.defaults.depth);
  const items = unit?.params?.sections?.[0]?.items || [];
  const doors = items.filter((i) => i.kind === 'partition').length + 1;

  const doorOptions = [1, 2, 3, 4].map((n) => ({
    id: String(n),
    label: String(n),
    // THE ENGINE'S OWN DOOR-WIDTH LAW, asked before the click.
    reason: A.doorCountRefusal(width, n),
  }));

  return (
    <Panel title="LAYOUT">
      <Field label="WARDROBE WIDTH" note={`Your wall is ${wall} mm.`}>
        <Slider
          testid="layout-width"
          min={600}
          max={wall}
          step={10}
          value={Math.min(width, wall)}
          onChange={(v) => A.setSize(unit.id, { width: v })}
        />
      </Field>

      <Field label="DEPTH">
        <ChipRow
          testid="layout-depth"
          value={String(depth)}
          options={b.depths.map((d) => ({ id: String(d), label: `${d}` }))}
          onPick={(id) => A.setSize(unit.id, { depth: Number(id) })}
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

      <Field label="BAYS">
        <ChipRow
          testid="layout-bays"
          value={doors > 1 ? 'divided' : 'single'}
          options={[
            { id: 'single', label: 'SINGLE' },
            { id: 'divided', label: 'DIVIDED' },
          ]}
          onPick={(id) => A.setDoorCount(unit.id, id === 'single' ? 1 : Math.max(2, doors))}
        />
      </Field>
    </Panel>
  );
}

/* ─── 3 · FRONTS ──────────────────────────────────────────────────────────── */
function FrontsPanel({ design }) {
  const b = A.bounds();
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
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
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
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 44, height: 30, background: c.tone, display: 'block' }} />
                <span style={{ fontSize: 10 }}>{c.name}</span>
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
            const s = A.swatch(id);
            return (
              <Chip
                key={id}
                title={s.label}
                selected={finishId === s.finishId}
                onClick={() => A.setFrontDecor(id)}
              >
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 40,
                      height: 26,
                      display: 'block',
                      background: s.hex || 'var(--pbi-soft-ivory)',
                      border: '1px solid var(--pbi-stone-line)',
                    }}
                  />
                  {/* The EGGER attribution, next to the swatch, unconditionally. */}
                  <span className="pbi-choice" style={{ fontSize: 11, maxWidth: 108 }}>{s.label}</span>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {A.INTERIOR_ROWS.map((row) => {
          const has = counts[row.id] || 0;
          const reason = refusals[row.id] || '';
          return (
            <div key={row.id} data-testid={`interior-${row.id}`}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 14px',
                  background: 'var(--pbi-porcelain)',
                  border: '1px solid var(--pbi-stone-line)',
                }}
              >
                <span className="pbi-choice pbi-choice-15" style={{ flex: '1 1 auto', color: 'var(--pbi-onyx)' }}>
                  {row.name}
                </span>

                {has && row.id !== 'pulldown_rail' ? (
                  <button
                    type="button"
                    className="pbi-link"
                    onClick={() => onOpenDetail(row.id)}
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
  const lights = Boolean(project?.lighting?.enabled);

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
        <div
          style={{
            background: 'var(--pbi-porcelain)',
            border: '1px solid var(--pbi-stone-line)',
            padding: '18px 16px',
          }}
          data-testid="estimate-summary"
        >
          {choices.map((c) => (
            <div key={c.label} style={{ display: 'flex', gap: 10, marginBottom: 9 }}>
              <span className="pbi-ui pbi-ui-light pbi-quiet" style={{ flex: '0 0 96px', fontSize: 10 }}>
                {c.label.toUpperCase()}
              </span>
              <span className="pbi-choice" style={{ flex: '1 1 auto', color: 'var(--pbi-onyx)' }}>
                {c.value}
              </span>
            </div>
          ))}
          <div className="pbi-display pbi-h4" style={{ marginTop: 16, textTransform: 'none', letterSpacing: '0.04em' }}>
            {PRICE_ON_REQUEST}
          </div>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
      data-testid="column-options"
      data-category={active}
      aria-label={title}
      style={{
        width: 'var(--pbi-col-options)',
        minWidth: 'var(--pbi-col-options)',
        background: 'var(--pbi-soft-ivory)',
        borderRight: '1px solid var(--pbi-stone-line)',
        overflowY: 'auto',
      }}
    >
      {active === 'space' ? <SpacePanel room={props.room} slope={props.slope} /> : null}
      {active === 'layout' ? <LayoutPanel unit={props.unit} room={props.room} /> : null}
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
