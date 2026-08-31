import Chip from '../ui/Chip.jsx';

// ─── THE CONTROLS THE DESIGN ROOM IS MADE OF ───────────────────────────────
//
// A chip row, a bounded slider, a stepper and a labelled block. Nothing else —
// F4b is explicit that a detail is *"chips and one slider at most"*, and the
// same discipline holds one column to the left. A configurator that grows a
// fourth control grows a fifth the week after.
//
// T60 F1: not one of them writes a pixel any more. Every dimension is a class
// in `styles/room.css` reading a token from `styles/scale.css`, so a control
// on a 1280-wide laptop is the same control at 78% and not a control somebody
// squeezed.

export function Field({ label, children, note }) {
  return (
    <div className="pbi-field-block">
      {label ? <span className="pbi-label">{label}</span> : null}
      {children}
      {note ? <p className="pbi-choice pbi-field-note">{note}</p> : null}
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
          note={o.note || ''}
          // The engine's own hint, where there is one — on hover for a mouse
          // and in the accessible name always. A chip with a DRAWING keeps it
          // here rather than under the row, where four permanent sentences
          // would bury the four pictures they describe.
          title={o.title || o.hint || ''}
          onClick={() => onPick(o.id)}
        >
          {o.draw ? (
            <span className="pbi-stack">
              {o.draw}
              <span>{o.label}</span>
              {o.sub ? <span className="pbi-choice pbi-chip-sub">{o.sub}</span> : null}
            </span>
          ) : null}
        </Chip>
      ))}
    </div>
  );
}

/**
 * A slider whose MIN and MAX are the caller's — and the caller got them from
 * the adapter, which got them from the profile or from the store's own answer.
 * Petros' iron rule (30.08): engine numbers do not enter a UI without the
 * owner's order, so what is shown is the CHOICE in millimetres and never a
 * parameter's name.
 */
export function Slider({
  min, max, step = 10, value, onChange, unit = 'mm', testid, standardAt = null, disabled = false,
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
        value={Math.max(min, Math.min(max, at))}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="pbi-slider-scale">
        <span className="pbi-ui pbi-ui-light pbi-quiet pbi-slider-end">{min}</span>
        <span className="pbi-choice pbi-choice-15 pbi-slider-now">
          {Math.round(at)}
          {' '}
          {unit}
          {standardAt != null && Math.round(at) === Math.round(standardAt) ? ' — standard' : ''}
        </span>
        <span className="pbi-ui pbi-ui-light pbi-quiet pbi-slider-end">{max}</span>
      </div>
    </div>
  );
}

/**
 * SAID — the control that is not one.
 *
 * The standing law: *"a control that cannot act must not be shown as if it
 * could."* Sometimes the honest answer is not a greyed control at all but a
 * sentence: a shoe drawer's ramp is fixed law, a shelf pinned between two
 * dividers has nowhere to go. This is how the room says so — the third voice,
 * the same one every refusal is written in, and never beside a slider that
 * would not move.
 */
export function Said({ children, testid }) {
  return <p className="pbi-choice pbi-choice-15 pbi-duty-line" data-testid={testid}>{children}</p>;
}
