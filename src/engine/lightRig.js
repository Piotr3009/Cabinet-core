// ─── THE LIGHT PANEL IS BUILT LIKE A ROOM (turn 51, CLAUDE.md F6) ───────────
//
// The owner, 26.08.2026:
//
//   *"robimy w Light coś na wzór pokoju, czyli lewa ściana, sufit i prawa
//   ściana, i wtedy włącz/wyłącz światło poszczególną lampę."*
//
// So the model is the ROOM HE IS STANDING IN, and CLAUDE.md adds the fourth
// side: **ceiling, left wall, right wall, facing** — each with an ON/OFF and a
// strength.
//
// ─── NOTHING IS INVENTED; THE PANEL DRIVES WHAT IS THERE ────────────────────
//
// CLAUDE.md, in as many words: *"The existing rig maps onto it: the overhead
// bands are CEILING, the showroom pillars are the WALLS."*  So this module is a
// MAPPING and not a second rig:
//
//   CEILING     the showroom BANDS (`appearance.studio.band`) — one tube per
//               run, hung above the fronts — and T26's derived ceiling source
//               with them. Both hang overhead; a joiner who switches off "the
//               ceiling" means both.
//   LEFT WALL   the showroom PILLAR standing at the run's left.
//   RIGHT WALL  the same at its right. (The rig ships ONE, on the right —
//               chat-fix 25.08: *"tylko na prawej od mebli"* — so the default
//               below has the left OFF, and the scene is what it was.)
//   FACING      what comes from the camera's side: the KEY, the FILL and the
//               jupiter SPOTS, which hang in the upper FRONT corners.
//
// ─── WHAT IS NOT ON THE PANEL, AND WHY ──────────────────────────────────────
//
// The AMBIENT, the HEMISPHERE and the RIM are the room's base light and stay
// on whatever the four switches say. A panel that could turn the scene black is
// a panel whose first use is an accident, and none of the three is a LAMP in
// the owner's sentence — they are the daylight in the room and the bounce off
// its walls.
//
// ─── DECISION 2, TAKEN FOR HIM AND WRITTEN AT THE TOP OF CLAUDE.md ─────────
//
// *"A lamp has ON/OFF and a strength, and does not slide along its wall.
// Position stays the rig's arithmetic. Sliding is a second feature and can come
// when the panel has proved itself."*  So a lamp here is two fields and no
// third.
//
// ─── DECISION 1: THE SETTINGS LIVE WITH THE PROJECT ────────────────────────
//
// *"a room with one window and a showroom want different rigs, and a saved job
// should reopen looking as it did."*  So this is project data, migrated on the
// way in like every other project record, and `projectStore` saves it.
//
// Pure functions and pure data. No React, no three.js, no store.

/** The four lamps, in the order the panel draws them. */
export const RIG_LAMPS = ['ceiling', 'leftWall', 'rightWall', 'facing'];

/** What each is called on the panel, and which real lamps it drives. */
export const RIG_LABELS = {
  ceiling: 'Ceiling',
  leftWall: 'Left wall',
  rightWall: 'Right wall',
  facing: 'Facing',
};

export const RIG_HINTS = {
  ceiling: 'The tube over each run, and the broad source at ceiling height.',
  leftWall: 'The tall panel of light standing to the left of the run.',
  rightWall: 'The same, on the right — the one the rig ships with.',
  facing: 'The key, the fill and the spots, from where you are standing.',
};

/** How far a strength may be turned, and where it starts. */
export const STRENGTH_MIN = 0;
export const STRENGTH_MAX = 2;
export const STRENGTH_STEP = 0.05;

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const clampStrength = (v) => Math.min(STRENGTH_MAX, Math.max(STRENGTH_MIN, num(v, 1)));

/** One lamp, sane: a switch and a strength, and nothing else (decision 2). */
function migrateLamp(raw) {
  return {
    on: raw?.on !== false,
    strength: clampStrength(raw?.strength ?? 1),
  };
}

/**
 * ─── THE PRESETS (CLAUDE.md F6) ────────────────────────────────────────────
 *
 * *"`Showroom`, `Bright`, `Moody`, `Neutral` (flat, for judging a colour). A
 * preset sets the four; the owner then tunes."*
 *
 * SHOWROOM is the rig as it ships, so a project that has never been touched and
 * a project set back to Showroom look the same — which is what makes this a
 * starting point rather than a fifth rig.
 *
 * NEUTRAL is the one with a job to do rather than a mood: the WALLS ARE OFF.
 * A pillar rakes a gloss front at a grazing angle on purpose (Fresnel — see
 * `3d/Scene.jsx`), which is exactly what you do NOT want when the question is
 * "is this the right white". Flat, even, and no highlight to read a colour
 * through.
 */
export const RIG_PRESETS = {
  showroom: {
    label: 'Showroom',
    hint: 'The rig as it ships — a tube over the run and one raking wall.',
    lamps: {
      ceiling: { on: true, strength: 1 },
      leftWall: { on: false, strength: 1 },
      rightWall: { on: true, strength: 1 },
      facing: { on: true, strength: 1 },
    },
  },
  bright: {
    label: 'Bright',
    hint: 'Both walls, everything up — a shop floor with the lights on.',
    lamps: {
      ceiling: { on: true, strength: 1.4 },
      leftWall: { on: true, strength: 1.2 },
      rightWall: { on: true, strength: 1.2 },
      facing: { on: true, strength: 1.3 },
    },
  },
  moody: {
    label: 'Moody',
    hint: 'One wall raking, the ceiling low — an evening kitchen.',
    lamps: {
      ceiling: { on: true, strength: 0.45 },
      leftWall: { on: false, strength: 1 },
      rightWall: { on: true, strength: 1.5 },
      facing: { on: true, strength: 0.5 },
    },
  },
  neutral: {
    label: 'Neutral',
    hint: 'Flat and even, no raking highlight — for judging a colour.',
    lamps: {
      ceiling: { on: true, strength: 1.1 },
      leftWall: { on: false, strength: 1 },
      rightWall: { on: false, strength: 1 },
      facing: { on: true, strength: 1.1 },
    },
  },
};

export const PRESET_IDS = Object.keys(RIG_PRESETS);

/**
 * The rig a project starts with — SHOWROOM, adjusted to whatever the profile's
 * pillars actually are.
 *
 * The shipped rig has ONE pillar, on the right (`studio.pillars.count: 1`,
 * `side: 'right'`). A workshop that has set `count: 2` gets both switches on,
 * and one that has set `side: 'left'` gets the left. So a project opened with
 * the panel untouched looks EXACTLY as it did before tonight, whatever profile
 * it is opened under — which is the only honest default for a feature that adds
 * switches to a rig people are already using.
 */
export function defaultLightRig(profile) {
  const cfg = profile?.appearance?.studio?.pillars || {};
  const both = Number(cfg.count) === 2;
  const left = both || String(cfg.side || 'right') === 'left';
  const right = both || String(cfg.side || 'right') !== 'left';
  return migrateLightRig({
    preset: 'showroom',
    lamps: {
      ...RIG_PRESETS.showroom.lamps,
      leftWall: { on: left, strength: 1 },
      rightWall: { on: right, strength: 1 },
    },
  });
}

/** Bring any stored rig — or nothing at all — to the shape above. */
export function migrateLightRig(raw) {
  const lamps = {};
  for (const id of RIG_LAMPS) lamps[id] = migrateLamp(raw?.lamps?.[id]);
  const preset = PRESET_IDS.includes(raw?.preset) ? raw.preset : 'showroom';
  return { preset, lamps };
}

/** The rig a PRESET makes, ready to store. */
export function rigFromPreset(id) {
  const preset = RIG_PRESETS[id] || RIG_PRESETS.showroom;
  return migrateLightRig({ preset: RIG_PRESETS[id] ? id : 'showroom', lamps: preset.lamps });
}

/**
 * What one lamp is worth: 0 when it is off, its strength when it is on.
 *
 * The ONE function every surface asks, so the scene, the panel's own read-back
 * and a node test cannot disagree about what "off" means.
 */
export function lampGain(rig, id) {
  const lamp = migrateLightRig(rig).lamps[id];
  if (!lamp || !lamp.on) return 0;
  return lamp.strength;
}

/**
 * ─── THE EXPORT IGNORES THE PANEL (CLAUDE.md F6) ───────────────────────────
 *
 * *"`renderCapture` and every PDF render with ONE fixed rig, whatever the
 * switches say. A client compares a render against an Egger sample, and two
 * renders of the same decor must not differ because somebody flipped a lamp."*
 *
 * This is that rig, and it is deliberately a CONSTANT rather than "whatever
 * showroom happens to be": a preset is a starting point somebody may tune, and
 * a picture that shipped to a client last month has to be reproducible today.
 * Every lamp on, every strength 1 — the rig the profile's own numbers describe,
 * with nothing added and nothing taken away.
 *
 * The one exception is the LEFT WALL, and it is not an exception to the rule —
 * it is the profile's own geometry: the rig ships one pillar and a second one
 * would be a lamp the scene has never had.
 */
function exportRig(profile) {
  const cfg = profile?.appearance?.studio?.pillars || {};
  const both = Number(cfg.count) === 2;
  const left = both || String(cfg.side || 'right') === 'left';
  const right = both || String(cfg.side || 'right') !== 'left';
  return {
    preset: 'showroom',
    lamps: {
      ceiling: { on: true, strength: 1 },
      leftWall: { on: left, strength: 1 },
      rightWall: { on: right, strength: 1 },
      facing: { on: true, strength: 1 },
    },
  };
}

/** …and the same question, for the export. */
export function exportGain(profile, id) {
  return lampGain(exportRig(profile), id);
}

/** The one line the panel prints, so nobody has to find this comment. */
export const EXPORT_NOTICE = 'Renders and PDFs ignore these switches — '
  + 'they always use one fixed rig, so two pictures of the same decor match.';

/** Does this rig still match the preset it names? (The panel says so.) */
export function matchesPreset(rig) {
  const now = migrateLightRig(rig);
  const preset = rigFromPreset(now.preset);
  return RIG_LAMPS.every((id) => now.lamps[id].on === preset.lamps[id].on
    && Math.abs(now.lamps[id].strength - preset.lamps[id].strength) < 1e-9);
}
