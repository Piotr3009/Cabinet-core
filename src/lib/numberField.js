// ─── Number field logic (BACKLOG #2) ───
//
// The bug: a controlled `<input type="number">` whose onChange normalised and
// clamped on every keystroke. Typing "250" into a field with a 100 mm minimum
// went 2 → clamped to 100 → "1002" → clamped again; the value could not be
// typed at all, only nudged with the spinner.
//
// The pattern that fixes it, and is used for EVERY numeric field in the app:
//   1. the input holds TEXT while it is being edited — a local buffer;
//   2. Enter or blur COMMITS: parse, round, clamp, hand the number over;
//   3. Escape restores the stored value and abandons the edit.
//
// The parsing and clamping live here as plain functions so the rule is testable
// in node without a DOM, and so the component is only about focus and keys.

/** How a committed value is shown back in the field. */
export function formatNumber(value, { integer = true, decimals = 2 } = {}) {
  const n = numberOrNull(value);
  if (n == null) return '';
  if (integer) return String(Math.round(n));
  // Trailing zeros read as noise in a field the user is about to retype.
  return String(Number(n.toFixed(decimals)));
}

/**
 * Turn the buffer into the number to store.
 *
 * @param {object} args
 *   text      what the user typed
 *   current   the stored value, used when the text is not a number at all
 *   min,max   optional workshop limits — applied ONCE, on commit
 *   integer   round to whole mm (the default: this app measures in mm)
 *   allowEmpty  an empty field means "no value" rather than "keep the old one"
 * @returns {{value:number|null, ok:boolean, clamped:boolean, reverted:boolean}}
 *   ok       the text was a usable number
 *   clamped  the number was outside [min,max] and was pulled back in
 *   reverted nothing usable was typed, so `value` is the stored one
 */
export function commitNumber({ text, current, min, max, integer = true, allowEmpty = false }) {
  const raw = String(text ?? '').trim().replace(',', '.');

  if (raw === '' || raw === '-' || raw === '.' || raw === '-.') {
    if (allowEmpty && raw === '') return { value: null, ok: true, clamped: false, reverted: false };
    return { value: numberOrNull(current), ok: false, clamped: false, reverted: true };
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return { value: numberOrNull(current), ok: false, clamped: false, reverted: true };
  }

  let value = integer ? Math.round(parsed) : parsed;
  let clamped = false;
  if (Number.isFinite(Number(min)) && value < Number(min)) { value = Number(min); clamped = true; }
  if (Number.isFinite(Number(max)) && value > Number(max)) { value = Number(max); clamped = true; }
  return { value, ok: true, clamped, reverted: false };
}

/**
 * A number, or null. Deliberately stricter than Number(): null, undefined, ''
 * and booleans are NOT zero here. A field with nothing in it must show nothing
 * and commit nothing — showing "0" would be the app inventing a dimension.
 */
function numberOrNull(v) {
  if (v == null || v === '' || typeof v === 'boolean') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
