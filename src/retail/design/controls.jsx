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

/**
 * ─── TURN 62 (CLAUDE.md F4): A FIELD IS A ROW ──────────────────────────────
 *
 * The owner, of the column as T61 left it: *"te twoje pola na liczby są
 * okropne, duże, rozwalone po całości, w ogóle to nie ma składu ani takiego
 * ładnego porządku."*
 *
 * He is right, and the cause was here. `Field` stacked LABEL over CONTROL over
 * NOTE, and every numeric control carried a permanent range line as well — so
 * six numbers became eighteen lines and the column read as a page of
 * paragraphs rather than a list of settings.
 *
 * ONE ROW, TWO COLUMNS: the label on the left at a fixed width so every label
 * in the panel starts at the same x, the control on the right, and nothing
 * else on that line. A NOTE is a second line inside the same row and only when
 * a caller passed one deliberately — CLAUDE.md's *"no more than one per
 * panel"* is a rule about callers, and it is asserted over the callers rather
 * than defended by silently dropping what one of them asked for.
 *
 * Both the label width and the row height are tokens in `styles/scale.css`, so
 * a row is the same row at 78% on a laptop as at 100% on the owner's monitor
 * (T60 F1's law: not one measurement written in a component).
 */
export function Field({ label, children, note }) {
  return (
    <div className="pbi-field-row">
      {label ? <span className="pbi-label pbi-field-row-label">{label}</span> : null}
      <div className="pbi-field-row-ctl">{children}</div>
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

// T62 F5 · LICENSED REMOVAL: `Slider` stood here. Its caller count reached
// zero — twelve in the detail menus became typed rows, and YOUR SPACE had none.

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
 * 1. IT DOES NOT CLAMP. The slider T62 deleted carried `value={Math.max(min,
 *    Math.min(max, at))}` — a silent clamp, right for a track with two ends
 *    and wrong for a typed number, because a client typing 4500 into a 4000
 *    wall would be
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
          title={`${min}–${max} ${unit}${
            standardAt != null && now === Math.round(standardAt) ? ' · standard' : ''}`}
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
      {/* ─── T62 F4 · THE RANGE IS NOT A PERMANENT LINE ───────────────────
          It lives in the input's `title` (above), where a hand that wants it
          finds it and an eye reading the column never has to step over it —
          and it comes back as a SENTENCE, under the field, at the one moment
          it is the answer to something: a value the field refused. The
          `standard` mark went the same way, into the same title, because a
          badge that is absent on five rows out of six is a ragged column. */}
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
