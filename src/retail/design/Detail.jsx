import { useProjectStore } from '../../stores/projectStore.js';
import { useUiStore } from '../../stores/uiStore.js';
import { getCabinetProfile } from '../../engine/profile.js';
import GoldLine from '../ui/GoldLine.jsx';
import Button from '../ui/Button.jsx';
import { ChipRow, Field, Slider, Stepper } from './controls.jsx';
import { REASONS } from './reasons.js';
import { bounds } from './adapter.js';
import { PRICE_ON_REQUEST } from '../config.js';
import { designSummaryLine } from '../estimate/document.js';

// ─── F3.4 / F4b · COLUMN 4 — TWO DUTIES ────────────────────────────────────
//
// *"By default: the ESTIMATE … When an element is selected (a click in the
// stage, or a row in column 2 that carries '›'), the column becomes that
// element's DETAIL (F4b) with '‹ BACK TO ESTIMATE' at the top; DONE returns to
// the estimate."*
//
// One column, two duties, never both — a detail panel that appears BESIDE the
// estimate is the accordion the owner refused, one column to the right.
//
// SELECTION comes from the shared store's own `selectedElement` — the same
// mechanism PRO's element panel reads. This is retail's OWN component reading
// that state; not one line of PRO's panel is imported, which the boundary
// walker enforces.

const S = () => useProjectStore.getState();

const PAD = '20px';

function Duty({ title, onBack, children, backLabel = '‹ BACK TO ESTIMATE' }) {
  return (
    <div style={{ padding: `18px ${PAD} 32px` }}>
      {onBack ? (
        <button type="button" className="pbi-link" data-testid="detail-back" onClick={onBack}>
          {backLabel}
        </button>
      ) : null}
      <h2 className="pbi-display pbi-h4" style={{ marginTop: onBack ? 16 : 0 }}>{title}</h2>
      <GoldLine margin="12px 0 22px" />
      {children}
    </div>
  );
}

/* ─── THE ESTIMATE DUTY ───────────────────────────────────────────────────── */
function EstimateDuty({
  designs, activeId, onSelect, onAdd, onQuote, onSave, onLoad,
}) {
  return (
    <Duty title="YOUR ESTIMATE">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 22 }}>
        {designs.map((d, i) => {
          const on = d.id === activeId;
          return (
            <button
              key={d.id}
              type="button"
              data-testid={`estimate-row-${i + 1}`}
              onClick={() => onSelect(d.id)}
              style={{
                textAlign: 'left',
                padding: '14px 14px',
                background: on ? 'var(--pbi-porcelain)' : 'transparent',
                border: '1px solid var(--pbi-stone-line)',
                borderLeft: `2px solid ${on ? 'var(--pbi-champagne)' : 'var(--pbi-stone-line)'}`,
                cursor: 'pointer',
              }}
            >
              <span className="pbi-ui" style={{ display: 'block', fontSize: 10 }}>
                {`${i + 1} · ${d.name}`}
              </span>
              <span className="pbi-choice" style={{ display: 'block', marginTop: 5 }}>
                {designSummaryLine(d.snapshot)}
              </span>
              <span
                className="pbi-display"
                style={{ display: 'block', marginTop: 7, fontSize: 13, textTransform: 'none', letterSpacing: '0.04em' }}
              >
                {PRICE_ON_REQUEST}
              </span>
            </button>
          );
        })}
      </div>

      <button type="button" className="pbi-link" data-testid="add-another" onClick={onAdd}>
        + ADD ANOTHER WARDROBE
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 32 }}>
        <Button onClick={onQuote} data-testid="detail-quote">REQUEST A QUOTE</Button>
        <Button kind="secondary" onClick={onSave} data-testid="detail-save">SAVE ESTIMATE</Button>
        <label className="pbi-link" style={{ cursor: 'pointer' }}>
          LOAD AN ESTIMATE
          <input
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            data-testid="detail-load"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onLoad(f); }}
          />
        </label>
      </div>
    </Duty>
  );
}

/* ─── F4b · DRAWERS ───────────────────────────────────────────────────────── */
function DrawersDetail({ unit, item, onDone, onBack }) {
  const b = bounds();
  const items = unit.params.sections?.[0]?.items || [];
  const drawers = items.filter((i) => i.kind === 'drawer');
  const top = drawers[drawers.length - 1] || item;
  const hasWatch = drawers.some((d) => d.watch_insert === true);
  const insert = top?.watch_insert ? 'watches'
    : (top?.variant === 'belt_tie' || top?.variant === 'belt_tie_glass' ? 'belts'
      : (top?.variant === 'shoe' ? 'shoes' : 'none'));
  const glass = top?.watch_shelf_glass === true;
  const frontH = Math.round(item?.height_mm ?? b.drawerFront.standard);

  const setInsert = (id) => {
    const store = S();
    if (!top) return;
    if (id === 'watches') { store.setDrawerWatchInsert(unit.id, top.id, true); return; }
    store.setDrawerWatchInsert(unit.id, top.id, false);
    store.updateItem(unit.id, top.id, {
      variant: id === 'belts' ? 'belt_tie' : (id === 'shoes' ? 'shoe' : null),
    });
  };

  return (
    <Duty title="DRAWERS" onBack={onBack}>
      <Field label="HOW MANY">
        <ChipRow
          testid="drawers-count"
          value={String(drawers.length)}
          options={[2, 3, 4].map((n) => ({ id: String(n), label: String(n) }))}
          onPick={(id) => S().addDrawers(unit.id, Number(id))}
        />
      </Field>

      <Field label="TOP DRAWER INSERT">
        <ChipRow
          testid="drawers-insert"
          value={insert}
          options={[
            { id: 'none', label: 'NONE' },
            { id: 'watches', label: 'WATCHES' },
            { id: 'belts', label: 'BELTS' },
            { id: 'shoes', label: 'SHOES' },
          ]}
          onPick={setInsert}
        />
      </Field>

      <Field label="GLASS TOP">
        <ChipRow
          testid="drawers-glass"
          value={glass ? 'on' : 'off'}
          options={[
            { id: 'off', label: 'OFF' },
            { id: 'on', label: 'ON', reason: hasWatch ? '' : REASONS.glassNeedsWatch },
          ]}
          onPick={(id) => top && S().setWatchShelfGlass(unit.id, top.id, id === 'on')}
        />
      </Field>

      {item?.id ? (
        <Field label="FRONT HEIGHT">
          <Slider
            testid="drawers-front-height"
            min={b.drawerFront.min}
            max={b.drawerFront.max}
            step={5}
            standardAt={b.drawerFront.standard}
            value={frontH}
            onChange={(v) => S().setDrawerHeight(unit.id, item.id, v)}
          />
        </Field>
      ) : null}

      <Button kind="secondary" onClick={onDone} data-testid="detail-done">DONE</Button>
    </Duty>
  );
}

/* ─── F4b · SHELVES ───────────────────────────────────────────────────────── */
function ShelvesDetail({ unit, onDone, onBack }) {
  const items = unit.params.sections?.[0]?.items || [];
  const shelves = items.filter((i) => i.kind === 'shelf');
  const setCount = (n) => {
    const store = S();
    const now = (store.units.find((u) => u.id === unit.id)?.params.sections?.[0]?.items || [])
      .filter((i) => i.kind === 'shelf');
    if (n > now.length) store.addShelves(unit.id, n - now.length);
    else for (const sh of now.slice(n)) store.removeItem(unit.id, sh.id);
  };
  return (
    <Duty title="SHELVES" onBack={onBack}>
      <Field label="HOW MANY">
        <Stepper testid="shelves-count" value={shelves.length} min={1} max={6} onChange={setCount} />
      </Field>
      <Field label="SPACING" note="Evenly, between whatever stands above and below them.">
        {/* The T58 law, per bay, run by the store's own action. */}
        <Button
          kind="secondary"
          data-testid="shelves-centre"
          onClick={() => S().redistributeShelvesInBay(unit.id, null)}
        >
          CENTRE THEM
        </Button>
      </Field>
      <Button kind="secondary" onClick={onDone} data-testid="detail-done">DONE</Button>
    </Duty>
  );
}

/* ─── F4b · HANGING RAIL ──────────────────────────────────────────────────── */
function RailDetail({ unit, onDone, onBack }) {
  const items = unit.params.sections?.[0]?.items || [];
  const rail = items.find((i) => i.kind === 'hanger');
  const heights = S().railHeightsAboveFloor?.(unit.id) || [];
  const here = Math.round(heights[0]?.mm ?? rail?.pos_mm ?? 0);
  const H = Math.round(unit.params.height || 2150);
  // The engine's OWN two mounts (engine/railAssembly.js RAIL_MOUNT): with the
  // shelf T37 built for it, or alone by T40's choice. There is no "single /
  // double" rail law in this engine, and inventing one here would be a law
  // retail made up — flagged in the morning report.
  const alone = rail?.mount === 'alone';
  return (
    <Duty title="HANGING RAIL" onBack={onBack}>
      <Field label="MOUNTED">
        <ChipRow
          testid="rail-mount"
          value={alone ? 'alone' : 'shelf'}
          options={[
            { id: 'shelf', label: 'WITH A SHELF' },
            { id: 'alone', label: 'ON ITS OWN' },
          ]}
          onPick={(id) => rail && S().updateItem(unit.id, rail.id, { mount: id })}
        />
      </Field>
      <Field label="HEIGHT">
        <ChipRow
          testid="rail-height"
          value={here > H * 0.75 ? 'high' : (here < H * 0.45 ? 'low' : 'standard')}
          options={[
            { id: 'low', label: 'LOW' },
            { id: 'standard', label: 'STANDARD' },
            { id: 'high', label: 'HIGH' },
          ]}
          onPick={(id) => {
            if (!rail) return;
            const to = id === 'low' ? Math.round(H * 0.4)
              : (id === 'high' ? Math.round(H * 0.86) : Math.round(H * 0.62));
            S().setRailHeight(unit.id, rail.id, to);
          }}
        />
      </Field>
      <Button kind="secondary" onClick={onDone} data-testid="detail-done">DONE</Button>
    </Duty>
  );
}

/* ─── F4b · DOOR ──────────────────────────────────────────────────────────── */
function DoorDetail({ unit, panelId, onDone, onBack }) {
  const result = S().unitResult?.(unit.id) || null;
  const panel = (result?.panels || []).find((p) => p.id === panelId) || null;
  // T46/T55: under a slope the engine FORCES a leaf's hand and says so on the
  // panel's own meta. Retail reads that flag; it never re-derives the rule.
  const forced = Boolean(panel?.meta?.hingeForced);
  const hinge = String(panel?.meta?.hinge || unit.params.hinge || 'L').toUpperCase();
  return (
    <Duty title="DOOR" onBack={onBack}>
      <Field label="HINGE SIDE">
        {forced ? (
          <p className="pbi-choice pbi-choice-15" data-testid="door-forced" style={{ margin: 0 }}>
            {REASONS.hingeForcedBySlope}
          </p>
        ) : (
          <ChipRow
            testid="door-hinge"
            value={hinge === 'R' ? 'R' : 'L'}
            options={[{ id: 'L', label: 'LEFT' }, { id: 'R', label: 'RIGHT' }]}
            onPick={(id) => S().setDoors(unit.id, { hinge: id })}
          />
        )}
      </Field>
      <Button kind="secondary" onClick={onDone} data-testid="detail-done">DONE</Button>
    </Duty>
  );
}

/* ─── F4b · LIGHTING ──────────────────────────────────────────────────────── */
function LightingDetail({ unit, project, onDone, onBack }) {
  const items = unit.params.sections?.[0]?.items || [];
  const hasPane = items.some((i) => i.watch_shelf_glass === true || i.variant === 'belt_tie_glass');
  const strips = Boolean(project?.lighting?.enabled);
  const pane = Boolean(project?.lighting?.pane);
  return (
    <Duty title="LIGHTING" onBack={onBack}>
      <Field label="SHELF STRIPS">
        <ChipRow
          testid="lighting-strips"
          value={strips ? 'on' : 'off'}
          options={[{ id: 'off', label: 'OFF' }, { id: 'on', label: 'ON' }]}
          onPick={(id) => S().setLighting({ enabled: id === 'on' })}
        />
      </Field>
      <Field label="PANE LIGHT">
        <ChipRow
          testid="lighting-pane"
          value={pane ? 'on' : 'off'}
          options={[
            { id: 'off', label: 'OFF' },
            { id: 'on', label: 'ON', reason: hasPane ? '' : 'There is no glass pane in this wardrobe yet.' },
          ]}
          onPick={(id) => S().setLighting({ pane: id === 'on' })}
        />
      </Field>
      <Button kind="secondary" onClick={onDone} data-testid="detail-done">DONE</Button>
    </Duty>
  );
}

/* ─── ANYTHING ELSE ───────────────────────────────────────────────────────── */
function UnknownDetail({ name, onDone, onBack }) {
  return (
    <Duty title={String(name || 'ELEMENT').toUpperCase()} onBack={onBack}>
      <p className="pbi-choice pbi-choice-15" data-testid="detail-unknown">
        No options for this element yet.
      </p>
      <div style={{ marginTop: 24 }}>
        <Button kind="secondary" onClick={onDone} data-testid="detail-done">DONE</Button>
      </div>
    </Duty>
  );
}

export default function Detail(props) {
  const { target } = props;
  const clear = () => { props.onTarget(null); useUiStore.getState().clearElement?.(); };

  const body = () => {
    if (!target) return <EstimateDuty {...props} />;
    const shared = { unit: props.unit, onDone: clear, onBack: clear };
    switch (target.kind) {
      case 'drawers': case 'drawer': return <DrawersDetail {...shared} item={target.item} />;
      case 'shelves': case 'shelf': return <ShelvesDetail {...shared} />;
      case 'hanger': return <RailDetail {...shared} />;
      case 'door': return <DoorDetail {...shared} panelId={target.panelId} />;
      case 'lighting': return <LightingDetail {...shared} project={props.project} />;
      default: return <UnknownDetail {...shared} name={target.kind} />;
    }
  };

  return (
    <aside
      data-testid="column-detail"
      data-duty={target ? 'detail' : 'estimate'}
      style={{
        width: 'var(--pbi-col-detail)',
        minWidth: 'var(--pbi-col-detail)',
        background: 'var(--pbi-warm-white)',
        borderLeft: '1px solid var(--pbi-stone-line)',
        overflowY: 'auto',
      }}
    >
      {body()}
    </aside>
  );
}
