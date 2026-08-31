import Chip from '../ui/Chip.jsx';

// ─── THE THREE CONTROLS COLUMN 2 IS MADE OF ────────────────────────────────
//
// A chip row, a bounded slider and a labelled block. Nothing else — F4b is
// explicit that a detail is *"chips and one slider at most"*, and the same
// discipline holds one column to the left. A configurator that grows a fourth
// control grows a fifth the week after.

export function Field({ label, children, note }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <span className="pbi-label">{label}</span>
      {children}
      {note ? (
        <p className="pbi-choice" style={{ margin: '8px 0 0' }}>{note}</p>
      ) : null}
    </div>
  );
}

export function ChipRow({ options, value, onPick, testid }) {
  return (
    <div className="pbi-chip-row" data-testid={testid}>
      {options.map((o) => (
        <Chip
          key={o.id}
          label={o.label}
          sub={o.sub}
          selected={String(value) === String(o.id)}
          disabled={Boolean(o.reason)}
          reason={o.reason || ''}
          onClick={() => onPick(o.id)}
        />
      ))}
    </div>
  );
}

/**
 * A slider whose MIN and MAX are the caller's — and the caller got them from
 * `adapter.bounds()`, which got them from the profile. Petros' iron rule
 * (30.08): engine numbers do not enter a UI without the owner's order, so what
 * is shown is the CHOICE in millimetres and never a parameter's name.
 */
export function Slider({
  min, max, step = 10, value, onChange, unit = 'mm', testid, standardAt = null,
}) {
  const at = Number(value);
  return (
    <div>
      <input
        className="pbi-slider"
        type="range"
        data-testid={testid}
        min={min}
        max={max}
        step={step}
        value={at}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="pbi-ui pbi-ui-light pbi-quiet" style={{ fontSize: 10 }}>{min}</span>
        <span className="pbi-choice pbi-choice-15" style={{ color: 'var(--pbi-onyx)' }}>
          {Math.round(at)}
          {' '}
          {unit}
          {standardAt != null && Math.round(at) === Math.round(standardAt) ? ' — standard' : ''}
        </span>
        <span className="pbi-ui pbi-ui-light pbi-quiet" style={{ fontSize: 10 }}>{max}</span>
      </div>
    </div>
  );
}

/** A stepper, for the counts small enough that a slider would be silly. */
export function Stepper({ value, min, max, onChange, testid }) {
  const step = (by) => onChange(Math.max(min, Math.min(max, Number(value) + by)));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }} data-testid={testid}>
      <button type="button" className="pbi-chip" style={{ minWidth: 42 }} onClick={() => step(-1)}>−</button>
      <span className="pbi-display pbi-h4" style={{ minWidth: 26, textAlign: 'center' }}>{value}</span>
      <button type="button" className="pbi-chip" style={{ minWidth: 42 }} onClick={() => step(1)}>+</button>
    </div>
  );
}
