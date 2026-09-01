import { useEffect, useRef, useState } from 'react';
import { commitNumber, formatNumber } from '../../../lib/numberField.js';
import { getCabinetProfile } from '../../../engine/profile.js';

// ─── One numeric input, used everywhere (BACKLOG #2) ───
//
// While the field has focus it holds TEXT — nothing is parsed, rounded or
// clamped, so a value can actually be typed. Enter and blur commit it through
// lib/numberField.js; Escape puts the stored value back.
//
// It is a text input on purpose: `type="number"` hands the browser a second
// opinion about what is typeable (and hides what it rejects), which is half of
// the original bug. `inputMode="decimal"` still brings up the numeric keypad.
//
// Turn 5 (BACKLOG #33): a millimetre field commits on the HALF-millimetre grid
// and shows halves back. That is the default here, because every field in this
// app that is not explicitly something else is millimetres — the one exception
// in the app (the BOM yield coefficient) already passes `integer={false}`, and
// a field that really wants whole numbers passes `step={1}`.

export default function NumberField({
  value,
  onCommit,
  min,
  max,
  integer = true,
  decimals = 2,
  step,
  allowEmpty = false,
  className = 'cc-input',
  onInvalid,
  ...rest
}) {
  // `integer: false` = a plain decimal field (the yield); it takes no grid.
  const grid = integer ? (step ?? getCabinetProfile().editor.mmStep) : null;
  const shown = formatNumber(value, { integer, decimals, step: grid });
  const [text, setText] = useState(shown);
  const [editing, setEditing] = useState(false);
  const ref = useRef(null);

  // A value changed from OUTSIDE (a clamp, a drag, another field) must show up
  // here — but never while the user is mid-word in this very field.
  useEffect(() => {
    if (!editing) setText(shown);
  }, [shown, editing]);

  const commit = () => {
    const result = commitNumber({ text, current: value, min, max, integer, step: grid, allowEmpty });
    setEditing(false);
    if (result.reverted) {
      setText(shown);
      if (onInvalid) onInvalid(text);
      return;
    }
    setText(formatNumber(result.value, { integer, decimals, step: grid }));
    onCommit(result.value, result);
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      className={className}
      value={text}
      onFocus={() => setEditing(true)}
      onChange={(e) => { setEditing(true); setText(e.target.value); }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); ref.current?.select(); }
        // Escape abandons the edit — the stored value comes back, unchanged.
        if (e.key === 'Escape') { e.preventDefault(); setEditing(false); setText(shown); ref.current?.blur(); }
      }}
      {...rest}
    />
  );
}
