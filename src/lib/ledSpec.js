// ─── THE LED SPEC (turn 45, CLAUDE.md F9b / F9c) ────────────────────────────
//
// The owner, 23.08.2026:
//
//   *"F9b Settings gains sub-tab `5.6 Lighting`: choice `LED flexi 4 mm` (a
//   4 mm groove) vs `Channel` + channel width field (the router's slot width).
//   F9c Optional `W/m` field → the driver calculator."*
//
// Two decisions and one measurement, and every one of them is a fact about how
// THIS JOB's light is built rather than about where a strip sits — which is
// what `design.lighting.items` already carries. A flexi strip is pressed into a
// 4 mm slot; an aluminium channel is screwed into a wider one, and how wide is
// the router's business and the joiner's to type.
//
// ─── WHY IT RIDES THE PROJECT AND NOT `design.lighting` ─────────────────────
//
// `engine/design.js migrateLighting()` is an exhaustive whitelist — on,
// temperature, switch, items — and iron rule 2 closes `src/engine/**`
// byte-for-byte tonight, so a `design.lighting.groove` key would be silently
// dropped on the way through it and the setting would appear to save and then
// not be there.
//
// So it rides the PROJECT, beside the room, exactly as T44's wall slopes do and
// for exactly the same reason (`lib/wallElements.js` has the whole argument).
// One record per job, normalised by one function, read by the surface, the
// driver calculator and — when F9-CNC comes — the groove cutter. The day the
// engine reopens it moves into `design.lighting` and nothing above this line
// changes.
//
// Pure — no React, no store, no engine.

/** The two ways a line is let into a board. */
export const LED_GROOVE_MODES = [
  {
    id: 'flexi',
    label: 'LED flexi 4 mm',
    hint: 'A bare flexible strip pressed into a 4 mm slot.',
  },
  {
    id: 'channel',
    label: 'Channel',
    hint: 'An aluminium channel screwed into a wider slot — you set the width.',
  },
];

export const LED_GROOVE_MODE_IDS = LED_GROOVE_MODES.map((m) => m.id);

/** The flexi slot, in millimetres. It is 4 because the strip is 4. */
export const FLEXI_GROOVE_MM = 4;

/** What a channel starts at, and the range a router will actually cut. */
export const CHANNEL_DEFAULT_MM = 12;
export const CHANNEL_MIN_MM = 4;
export const CHANNEL_MAX_MM = 40;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const round2 = (v) => Math.round(v * 100) / 100;

/** What a project that has never opened tab 5.6 answers. */
export const DEFAULT_LED_SPEC = Object.freeze({
  mode: 'flexi',
  channelWidth: CHANNEL_DEFAULT_MM,
  wattsPerMetre: null,
});

/**
 * One project's LED spec, from anything.
 *
 * `wattsPerMetre` is OPTIONAL and stays null when nobody has typed one — F9c
 * says "optional" in as many words, and a null is what makes the driver
 * calculator honestly say "tell me W/m" rather than invent a number.
 */
export function migrateLedSpec(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const mode = LED_GROOVE_MODE_IDS.includes(r.mode) ? r.mode : DEFAULT_LED_SPEC.mode;
  const width = num(r.channelWidth);
  const wm = num(r.wattsPerMetre);
  return {
    mode,
    channelWidth: round2(clamp(width > 0 ? width : CHANNEL_DEFAULT_MM, CHANNEL_MIN_MM, CHANNEL_MAX_MM)),
    wattsPerMetre: wm > 0 ? round2(wm) : null,
  };
}

/**
 * How wide the groove under a line is, in millimetres.
 *
 * *"width = 4 mm or the channel width"* — F9-CNC's own sentence, and the ONE
 * place it is decided, so the settings tab, the BOM note and the cutter cannot
 * come to three answers.
 */
export function grooveWidthMm(spec) {
  const s = migrateLedSpec(spec);
  return s.mode === 'channel' ? s.channelWidth : FLEXI_GROOVE_MM;
}

/** What the chosen mode is CALLED, for a summary row. */
export function ledModeLabel(spec) {
  const s = migrateLedSpec(spec);
  const m = LED_GROOVE_MODES.find((x) => x.id === s.mode);
  return s.mode === 'channel' ? `${m.label} · ${s.channelWidth} mm` : m.label;
}
