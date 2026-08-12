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

// ─── HALF A MILLIMETRE, FOR A DIMENSION (turn 26, CLAUDE.md F4.3) ───────────
//
// "Precision 0.5 mm everywhere (`formatMm` gains a half-mm mode for
// dimensions): 3 mm gaps and half-millimetre differences are exactly what
// these are for."
//
// The owner's complaint was that the shelf, side and front dimensions read as
// ROUNDED TO 1 MM — so a 3 mm gap between two doors and a 2.5 mm one printed
// the same number, which is precisely the difference a joiner is looking at
// them to find. A dimension is now quantised to the nearest HALF and printed
// as 197, 196.5, 3.
//
// It is a MODE and not the new default, because the two questions are
// different: the cut list prints what the saw is set to (a tenth, since turn
// 5), and a dimension on the screen prints what the eye is being asked to
// judge. `DIMENSION_STEP_MM` is the quantum, in the profile's own units.
export const DIMENSION_STEP_MM = 0.5;

/**
 * A millimetre value as the app shows it.
 *
 * @param {number|string} value
 * @param {{unit?:boolean, dash?:string, half?:boolean}} [opts]
 *   unit  append " mm"
 *   dash  what a non-number reads as (default: an empty string)
 *   half  quantise to the nearest 0.5 — the DIMENSION mode (F4.3)
 */
export function formatMm(value, { unit = false, dash = '', half = false } = {}) {
  // Deliberately stricter than Number(): null, undefined, '' and booleans are
  // NOT zero here. A missing dimension must read as missing — printing "0" is
  // the app inventing a size, which is worse than saying nothing.
  if (value == null || value === '' || typeof value === 'boolean') return dash;
  const n = Number(value);
  if (!Number.isFinite(n)) return dash;
  // n × 0.5 is exact in binary, so a half lands on a real half and never on
  // 196.50000000000003.
  const r = half
    ? roundTo(Math.round(n / DIMENSION_STEP_MM) * DIMENSION_STEP_MM, 1)
    : roundTo(n, MM_DISPLAY_DECIMALS);
  // `Object.is` rather than `=== 0`: -0 would otherwise print as "-0".
  const text = Number.isInteger(r) ? String(Object.is(r, -0) ? 0 : r) : r.toFixed(MM_DISPLAY_DECIMALS);
  return unit ? `${text} mm` : text;
}

/** A dimension's own text: half-millimetre precision, always (F4.3). */
export function formatDimension(value, opts = {}) {
  return formatMm(value, { ...opts, half: true });
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
