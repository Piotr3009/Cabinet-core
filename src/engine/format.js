// ─── Number formatting helpers ───
// The cutting-list CSV must be byte-identical to what the AutoLISP scripts
// write, so rounding has to behave like AutoLISP's (rtos v 2 dec): round half
// away from zero, fixed number of decimals, no thousands separator.
//
// Pure functions — no React, no store imports (engine rule).

/** Round half away from zero to `dec` decimals. Returns a Number. */
export function roundTo(value, dec = 0) {
  const v = Number(value);
  if (!Number.isFinite(v)) return 0;
  const f = 10 ** dec;
  // The epsilon nudge protects against binary representation eating a tie
  // (e.g. 2.195 is stored as 2.19499999999999995).
  const scaled = Math.abs(v) * f;
  const r = Math.round(scaled + Number.EPSILON * scaled + 1e-9) / f;
  return v < 0 ? -r : r;
}

/** AutoLISP (rtos value 2 dec) — decimal string with a fixed decimal count. */
export function rtos(value, dec = 0) {
  return roundTo(value, dec).toFixed(dec);
}

/** Panel area in m² from mm dimensions (full precision, never rounded here). */
export function areaM2(widthMm, heightMm) {
  return (Number(widthMm) * Number(heightMm)) / 1e6;
}

/** Length in metres from mm. */
export function metres(mm) {
  return Number(mm) / 1000;
}

// ─── Millimetres on screen (BACKLOG #33) ───
// ONE function formats every millimetre the app shows: the 3D dimension
// labels, the distance arrows, the BOM, the CNC captions, the parameter panel
// and every message that quotes a size. Before turn 5 each of those did its own
// `Math.round`, so a shelf row at 704.7 mm read "705" and a 196.5 mm filler was
// simply not sayable — the workshop cuts to half a millimetre and the screen
// has to be able to say so.
//
// The rule, from CLAUDE.md turn 5 F1:
//   whole numbers  → "197"
//   halves         → "196.5"
//   anything else  → one decimal ("704.7" — a shelf row off the LISP formula)
//
// A tenth is the finest thing worth showing: the saw does not hold 704.68, and
// a column of numbers with four decimals is unreadable at a bench.
export const MM_DISPLAY_DECIMALS = 1;

/**
 * A millimetre value as the app shows it.
 *
 * @param {number|string} value
 * @param {{unit?:boolean, dash?:string}} [opts]
 *   unit  append " mm"
 *   dash  what a non-number reads as (default: an empty string)
 */
export function formatMm(value, { unit = false, dash = '' } = {}) {
  // Deliberately stricter than Number(): null, undefined, '' and booleans are
  // NOT zero here. A missing dimension must read as missing — printing "0" is
  // the app inventing a size, which is worse than saying nothing.
  if (value == null || value === '' || typeof value === 'boolean') return dash;
  const n = Number(value);
  if (!Number.isFinite(n)) return dash;
  const r = roundTo(n, MM_DISPLAY_DECIMALS);
  // `Object.is` rather than `=== 0`: -0 would otherwise print as "-0".
  const text = Number.isInteger(r) ? String(Object.is(r, -0) ? 0 : r) : r.toFixed(MM_DISPLAY_DECIMALS);
  return unit ? `${text} mm` : text;
}

/** "600 × 720" — the pair that captions a panel, through the same rule. */
export function formatMmPair(a, b, separator = ' × ') {
  return `${formatMm(a)}${separator}${formatMm(b)}`;
}

/** Quantise a raw value to a snap step: round(raw/step)*step. */
export function snap(value, step) {
  const s = Number(step);
  if (!Number.isFinite(s) || s <= 0) return Number(value);
  // n × 0.5 is exact in binary, so a 0.5 snap lands on a real half and never on
  // 196.50000000000003 — which is what would leak a 14-decimal number into a
  // field the moment the drag stopped.
  const quantised = Math.round(Number(value) / s) * s;
  // Steps that are NOT a power of two (32 mm is, 0.1 mm is not) can still carry
  // representation dust; trimming to the step's own precision keeps the stored
  // number the number the user is looking at.
  return roundTo(quantised, decimalsOf(s));
}

/** How many decimals a step has — 0.5 → 1, 32 → 0. Capped: this is millimetres. */
function decimalsOf(step) {
  const text = String(step);
  const dot = text.indexOf('.');
  if (dot < 0) return 0;
  return Math.min(6, text.length - dot - 1);
}

/** Clamp helper used by the interior editor. */
export function clamp(value, min, max) {
  return Math.min(Math.max(Number(value), min), max);
}
