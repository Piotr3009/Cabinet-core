import { useEffect, useRef, useState } from 'react';
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
 * ─── TURN 61 (CLAUDE.md F5): A FIELD, NOT A SLIDER ─────────────────────────
 *
 * The owner: *"nie widze sensu [suwaków] bo i tak nie trafisz, trzeba bedzie
 * wpisac; kratki do wpisywania rogi pieknie zaokraglone a nie kanciaki, ze
 * zlota obwodka a nie jakis dziwny pomarancz."*
 *
 * He is right about the reason and the reason is the design: a wall is 3140 mm,
 * not "about three metres", and a control you cannot hit is a control that
 * makes a client type the number anyway — in their head, and then approximately
 * with a mouse. So: millimetres, integers, typed.
 *
 * ─── THE THREE THINGS THIS IS NOT ──────────────────────────────────────────
 *
 * 1. IT DOES NOT CLAMP. `Slider` carries `value={Math.max(min, Math.min(max,
 *    at))}` — a silent clamp, right for a track with two ends and wrong for a
 *    typed number, because a client who types 4500 into a 4000 wall would be
 *    shown 4000 and told nothing. Out of range is REFUSED, the typing is left
 *    where it is so it can be corrected, and the sentence appears underneath.
 *    That is T50's room-refuses-first law, said by a text box.
 * 2. IT DOES NOT WRITE ON EVERY KEYSTROKE. A wall on its way from 3000 to 400
 *    passes through 40, and 40 is a room the store would refuse and a wardrobe
 *    it would re-seat. The commit is on BLUR and on Enter, which is what a
 *    person means by typing a number. ESCAPE puts the old one back.
 * 3. IT AUTHORS NO SENTENCE. `onCommit` returns whatever the shared core said —
 *    `setRoom`'s `roomChangeGuard` verdict, `setUnitSize`'s store notice — and
 *    this renders it verbatim. The ONE sentence retail owns is the out-of-range
 *    one, because the bounds it names are the profile's and the engine has no
 *    words for a number nobody was allowed to type; it lives in `reasons.js`
 *    with its predicate beside it, like every other.
 *
 * BOUNDS ARE THE CALLER'S, and the caller got them from `A.designBounds()` or
 * `A.unitBounds()` — the same two the sliders read. Nothing here is a literal.
 *
 * @param {number} min · @param {number} max — the engine's own ends
 * @param {(mm:number) => (string|{said?:string}|void)} onCommit — returns the
 *        shared core's sentence, or nothing when it had none to say
 */
export function NumberField({
  min, max, value, onCommit, unit = 'mm', testid,
  standardAt = null, disabled = false, outOfRange,
}) {
  const now = Math.round(Number(value) || 0);
  const [draft, setDraft] = useState(String(now));
  const [said, setSaid] = useState('');
  // WHAT THE STORE HOLDS IS THE TRUTH. When it changes under us — another
  // control moved this number, or the commit went through — the box follows it
  // and any standing refusal is dropped, because it was about the old value.
  const last = useRef(now);
  useEffect(() => {
    if (last.current === now) return;
    last.current = now;
    setDraft(String(now));
    setSaid('');
  }, [now]);

  const commit = () => {
    const n = Math.round(Number(draft));
    if (!Number.isFinite(n) || String(draft).trim() === '') { setDraft(String(now)); setSaid(''); return; }
    if (n === now) { setSaid(''); return; }
    if (n < min || n > max) { setSaid(outOfRange(min, max)); return; }
    const answer = onCommit(n);
    const sentence = typeof answer === 'string' ? answer : (answer?.said || '');
    setSaid(sentence);
    // A refusal leaves the store where it was, so the box must go back to it —
    // otherwise the room says one number and the field shows another.
    if (sentence) setDraft(String(Math.round(Number(value) || 0)));
  };

  return (
    <div className="pbi-numfield-wrap">
      <div className="pbi-numfield-row">
        <input
          className="pbi-field pbi-numfield"
          type="text"
          inputMode="numeric"
          data-testid={testid}
          data-min={min}
          data-max={max}
          value={draft}
          disabled={disabled}
          aria-invalid={said ? 'true' : undefined}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d-]/g, ''))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
            if (e.key === 'Escape') { setDraft(String(now)); setSaid(''); }
          }}
        />
        <span className="pbi-ui pbi-ui-light pbi-quiet pbi-numfield-unit">{unit}</span>
      </div>
      <div className="pbi-numfield-scale">
        <span className="pbi-ui pbi-ui-light pbi-quiet">{`${min}–${max}`}</span>
        {standardAt != null && now === Math.round(standardAt)
          ? <span className="pbi-choice pbi-numfield-standard">standard</span>
          : null}
      </div>
      {said ? <span className="pbi-chip-reason" data-testid={testid ? `${testid}-said` : undefined}>{said}</span> : null}
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
