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

/** Quantise a raw value to a snap step: round(raw/step)*step. */
export function snap(value, step) {
  const s = Number(step);
  if (!Number.isFinite(s) || s <= 0) return Number(value);
  return Math.round(Number(value) / s) * s;
}

/** Clamp helper used by the interior editor. */
export function clamp(value, min, max) {
  return Math.min(Math.max(Number(value), min), max);
}
