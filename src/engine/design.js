// ─── Design settings (project level) ───
// What the whole project is made of and what it looks like: how many carcass
// materials are in play, the standard front, the workshop's own door styles,
// the front colour and the infill width (CLAUDE.md turn 3, phase 6).
//
// This module is the DATA and the RESOLUTION rules — what a given unit ends up
// with once the project defaults, its door style and its own overrides have
// been applied. Pure functions, so the 3D view, the BOM and a test all resolve
// it the same way.

import { decorFinish } from './decors.js';
import { DEFAULT_CABINET_PROFILE } from './profile.js';

// ─── Turn 9 (CLAUDE.md F5) ───
// 2: the sheen scale went from 0–25 to 5–100 %. A stored 20 means "a mirror" on
// the old scale and "nearly dead matt" on the new one, so it cannot simply be
// read across — it has to be MIGRATED, once, and the stamp is what makes "once"
// true. `migrateDesign` runs on every read (it is how every consumer normalises
// a design), so a rule with no version behind it would multiply the same value
// by four again on every render.
export const DESIGN_SCHEMA = 2;

export const FRONT_STYLE_OPTIONS = [
  { id: 'S', label: 'Shaker' },
  { id: 'F', label: 'Flat' },
  // 'H' (handleless J-groove) exists in the engine profile and the LISP; it is
  // not offered as a *standard* here until the handle work lands.
];

export const DEFAULT_DESIGN = {
  schema: DESIGN_SCHEMA,
  // 1–3 carcass materials. One is the common case; three is a run with a
  // different board inside the tall units and another for the island.
  carcass: {
    // `finish_id` is what the board LOOKS like (turn 4); `material_id` is what
    // it costs. A decor is chosen per material type, not per unit.
    types: [{ id: 'c1', label: 'Carcass 1', material_id: null, finish_id: null }],
  },
  fronts: {
    style: 'S',
    // Handles are a later phase — the slot is here so the shape does not change
    // under a saved project when they arrive.
    handle: null,
    // ─── Turn 11 (CLAUDE.md F9.2) ───
    // Up to TWO front types, the twin of the 1–3 carcass types above. Each has a
    // SOURCE (RAL / F&B / veneer / laminate / wood), a colour and, where it is a
    // bought board, the stock it is assigned to. End panels and infills default
    // to front type 1; a per-unit override is F3.2's separate editing.
    types: [],
  },
  // The workshop's own door styles: name + front type + material/colour. A unit
  // points at one of these by id.
  doorStyles: [],
  colour: {
    front: null,       // { hex, name, system: 'RAL' | 'F&B' | 'custom' }
    // Turn 11 (CLAUDE.md F9.2): "yes, carcasses can be sprayed". A carcass whose
    // SOURCE is `sprayed` is a colour rather than a board, and this is where the
    // colour lives — beside the front's, in the same shape, resolved the same way.
    carcass: null,
  },
  infill: {
    // Used by phase 7: the filler between a unit and the wall. The NUMBER lives
    // in profile.js like every other number (CLAUDE.md rule 2) — turn 11 raised
    // it from 20 to 40 on the owner's verdict, and taking it from there is what
    // makes that a one-line change rather than a hunt.
    sideWidth: DEFAULT_CABINET_PROFILE.autoParts.sideInfill.defaultWidth,
  },
  // Project-level appearance (turn 4). null = the profile default, and a null
  // FRONT finish means "the same as the carcass" — which is what a workshop
  // means by one material throughout.
  finish: { carcass: null, front: null },
  // Defaults the "Add end panel" action inherits (turn 4, BACKLOG #17).
  // `thickness: null` = the project's front thickness.
  endPanel: { height: 'floor', thickness: null, applyToAll: true },
  // ─── Turn 11 (CLAUDE.md F9.1/F9.3) ───
  // The two project-wide numbers that are not heights: the DEPTH every unit
  // starts at, and the BOARD every carcass is cut from. `null` on both means the
  // profile's, exactly like every other null here — `thickness.board` is the
  // 18 / 22 / 25 selector and `thickness.custom` is the "Other" field, which
  // wins when it is filled in.
  depth: null,
  thickness: { board: null, custom: null },
  // Which VARIANT of each piece of ironmongery this job fits. The automat picks
  // the concrete item; the user only ever picks a variant (F9.2).
  hardware: { hinges: null, runners: null, handles: null },
  // Project heights (turn 5, BACKLOG #29). null = "whatever the profile says",
  // which is what a project that has never opened the section means. Resolved
  // through projectHeights() below, so a stored null and a stored number behave
  // the same everywhere.
  heights: { base: null, wall: null, tall: null, wallMount: null, toeKick: null },
  // ─── Turn 7 (CLAUDE.md F2 / BACKLOG #41) ───
  // What kind of job this is, and how much of the room it covers. Both are
  // STARTING POINTS chosen in the new-project flow and both stay editable: the
  // type decides which Library category opens and which heights the job begins
  // at, the scope only decides whether the flow shows Room setup on the way in.
  // A project that never went through the flow has neither, and everything
  // falls back exactly as it did before turn 7.
  projectType: null,
  scope: 'room',                 // 'room' | 'wall'
  // How the carcass is held together (profile.joinery). null = the profile's
  // default, which today is the only one there is.
  joinery: null,
  // ─── Sheen (turn 8; rescaled turn 9, CLAUDE.md F5) ───
  // How glossy the SPRAYED surfaces of this job are, as a PERCENTAGE of gloss —
  // 5 % dead matt to 100 % full gloss, in fives, which is how a lacquer is
  // ordered (profile.appearance.sheenScale). null = the profile's default,
  // exactly like every other null in this object.
  sheen: null,
};

export const HEIGHT_KEYS = ['base', 'wall', 'tall', 'wallMount', 'toeKick'];

const clone = (v) => JSON.parse(JSON.stringify(v));

/** Fill in anything a stored design predates, without touching user values. */
export function migrateDesign(design) {
  const d = design && typeof design === 'object' ? design : {};
  const base = clone(DEFAULT_DESIGN);
  const types = Array.isArray(d.carcass?.types) && d.carcass.types.length
    ? d.carcass.types.slice(0, 3).map((t, i) => ({
      id: t.id || `c${i + 1}`,
      label: t.label || `Carcass ${i + 1}`,
      material_id: t.material_id ?? null,
      finish_id: t.finish_id ?? null,
      // Turn 11 (CLAUDE.md F9.2): EGGER decor or SPRAYED. It is what decides the
      // board's thickness (engine/projectSettings.js) as well as its look.
      source: t.source ?? null,
    }))
    : base.carcass.types;

  return {
    schema: DESIGN_SCHEMA,
    carcass: { types },
    depth: Number(d.depth) > 0 ? Number(d.depth) : null,
    thickness: {
      board: Number(d.thickness?.board) > 0 ? Number(d.thickness.board) : null,
      custom: Number(d.thickness?.custom) > 0 ? Number(d.thickness.custom) : null,
    },
    hardware: {
      hinges: d.hardware?.hinges ? String(d.hardware.hinges) : null,
      runners: d.hardware?.runners ? String(d.hardware.runners) : null,
      handles: d.hardware?.handles ? String(d.hardware.handles) : null,
    },
    fronts: {
      style: FRONT_STYLE_OPTIONS.some((o) => o.id === d.fronts?.style) ? d.fronts.style : base.fronts.style,
      handle: d.fronts?.handle ?? null,
      types: coupleFrontTypes(d),
    },
    doorStyles: Array.isArray(d.doorStyles)
      ? d.doorStyles.map((s) => normaliseDoorStyle(s)).filter(Boolean)
      : [],
    colour: { front: projectFrontColour(d), carcass: normaliseColour(d.colour?.carcass) },
    infill: { sideWidth: Number(d.infill?.sideWidth) >= 0 ? Number(d.infill.sideWidth) : base.infill.sideWidth },
    finish: {
      carcass: d.finish?.carcass ?? null,
      front: d.finish?.front ?? null,
    },
    endPanel: {
      height: d.endPanel?.height === 'unit' ? 'unit' : base.endPanel.height,
      thickness: Number(d.endPanel?.thickness) > 0 ? Number(d.endPanel.thickness) : null,
      applyToAll: d.endPanel?.applyToAll !== false,
    },
    heights: Object.fromEntries(HEIGHT_KEYS.map((k) => [
      k, Number(d.heights?.[k]) > 0 ? Number(d.heights[k]) : null,
    ])),
    projectType: d.projectType ? String(d.projectType) : null,
    scope: d.scope === 'wall' ? 'wall' : 'room',
    joinery: d.joinery ? String(d.joinery) : null,
    // `== null` and not a truthiness test: Number(null) is 0, and a shortcut
    // that treats 0 as "not set" would also treat a real stored 0 that way.
    sheen: migrateSheen(d),
  };
}

// ─── ONE FRONT COLOUR (turn 12, CLAUDE.md F1) ───────────────────────────────
//
// The bug the owner hit within minutes of turn 11: "the scene ignores what the
// new menu sets". It did, and this is why.
//
// Turn 11 gave the project FRONT TYPES — up to two of them, each with a source
// and a colour — and step 5 set the front colour by writing
// `design.fronts.types[0].colour`. But NOTHING READS THAT FIELD. Every consumer
// in the app — `resolveUnitDesign` below, the sprayed finish, the BOM, the unit
// card, the 3D materials — asks `design.colour.front`, which is what the older
// Design-settings modal wrote. Two places to say the same thing, one of them
// wired to nothing: pick the wrong menu and the doors stay the colour they were.
//
// So the two are made ONE, here, in the migration every read already goes
// through:
//
//   FRONT TYPE 1'S COLOUR *IS* THE PROJECT'S FRONT COLOUR.
//
// `design.colour.front` remains the field the app reads, because a dozen
// consumers read it and this phase is not a rename; it is now a MIRROR of front
// type 1 rather than a rival to it. Writing either one is writing both
// (`withFrontColour` below is the one setter), and a project cached before this
// turn — which has a colour in one place and nothing in the other — comes back
// with both filled in, whichever half it stored. That is the migration
// CLAUDE.md F1.1 asks for, and it costs a stored project nothing.

/** The colours of the project's front types, with type 1 and `colour.front` agreed. */
function coupleFrontTypes(d) {
  const types = Array.isArray(d?.fronts?.types)
    ? d.fronts.types.slice(0, 2).map((t, i) => ({
      id: t.id || `f${i + 1}`,
      label: t.label || `Front ${i + 1}`,
      source: t.source ?? null,
      colour: normaliseColour(t.colour),
      material_id: t.material_id ?? null,
    }))
    : [];
  if (!types.length) return types;
  // A cached project from before turn 12 has the colour in `colour.front` and
  // nothing on the type. Backfill it; a type that has its own is left alone.
  if (!types[0].colour) types[0] = { ...types[0], colour: normaliseColour(d?.colour?.front) };
  return types;
}

/** The project's front colour: front type 1's, or the older field if that is all there is. */
function projectFrontColour(d) {
  const first = Array.isArray(d?.fronts?.types) ? d.fronts.types[0] : null;
  return normaliseColour(first?.colour) || normaliseColour(d?.colour?.front);
}

/**
 * Set the project's front colour — in BOTH places, so it cannot be set in one.
 *
 * This is the ONE setter (CLAUDE.md F1.1: "ONE component, ONE data path"). The
 * settings surface calls it, the store calls it, and there is nowhere left to
 * write half of the answer from.
 *
 * @param {object} design   any design, stored or migrated
 * @param {object|null} colour
 * @param {string|null} typeId  which front type — defaults to the first
 * @returns {object} a migrated design with the colour set
 */
export function withFrontColour(design, colour, typeId = null) {
  const d = migrateDesign(design);
  const c = normaliseColour(colour);
  const types = d.fronts.types.length
    ? d.fronts.types
    : [{
      id: 'f1', label: 'Front 1', source: null, colour: null, material_id: null,
    }];
  const index = typeId ? types.findIndex((t) => t.id === typeId) : 0;
  const at = index === -1 ? 0 : index;
  const next = types.map((t, i) => (i === at ? { ...t, colour: c } : t));
  return {
    ...d,
    fronts: { ...d.fronts, types: next },
    // Only front type 1 is the project's front colour. Type 2 is a second
    // material a workshop assigns per piece; it has never been the default and
    // it does not become one by being edited.
    colour: at === 0 ? { ...d.colour, front: c } : d.colour,
  };
}

// ─── The sheen migration (turn 9, CLAUDE.md F5) ───

/** The old scale's top. Anything at or under it, on a pre-schema-2 design, is old. */
const LEGACY_SHEEN_MAX = 25;
/** 0–25 → 5–100 is exactly ×4. */
const LEGACY_SHEEN_FACTOR = 4;
/** The new scale, for the clamp — the same numbers profile.appearance.sheenScale ships. */
const SHEEN_FLOOR = 5;
const SHEEN_CEILING = 100;

/**
 * A stored sheen, on the scale this version of the app speaks.
 *
 * Turn 8 wrote 0–25. Turn 9 asks in per-cent of gloss, 5–100 in fives, because
 * that is how a lacquer is specified and ordered. The two overlap — 20 is a
 * legal value on both scales and means opposite ends of the tin — so a stored
 * number is only safe to read once you know WHICH scale wrote it, and that is
 * what `schema` is for.
 *
 * One way, silent, once. A design that has been through this carries schema 2
 * and is never touched again, which matters because this function runs on every
 * read of every design in the app.
 *
 * The old 0 (dead matt) becomes 5, the flattest lacquer anybody actually sells:
 * ×4 is 0, and the clamp lifts it onto the scale.
 */
function migrateSheen(stored) {
  const raw = stored?.sheen;
  if (raw == null || !Number.isFinite(Number(raw)) || Number(raw) < 0) return null;
  const value = Number(raw);
  const legacy = Number(stored?.schema) !== DESIGN_SCHEMA && value <= LEGACY_SHEEN_MAX;
  const scaled = legacy ? value * LEGACY_SHEEN_FACTOR : value;
  return Math.min(Math.max(scaled, SHEEN_FLOOR), SHEEN_CEILING);
}

// ─── Sheen (turn 8; rescaled turn 9, CLAUDE.md F5) ───
// The industry's own scale: a lacquer is specified as a PERCENTAGE of gloss,
// 5 % dead matt to 100 % full gloss, in fives. Turn 8 ran 0–25, which is the
// same information in a language a paint supplier does not speak — and which
// had a 0 on it, and there is no such thing as a lacquer with no sheen at all.
//
// It is here and not in the 3D layer because it is a PROJECT decision — "this
// kitchen is a 60" — and because the mapping to a renderer number has to be one
// formula in one place, or the settings panel and the picture will disagree
// about what a 60 looks like.

const SHEEN_FALLBACK = { min: 5, max: 100, step: 5, default: 60 };
const scaleOf = (profile) => profile?.appearance?.sheenScale || SHEEN_FALLBACK;

/** The values the slider may take: 5, 10, … 100 with the defaults. */
export function sheenSteps(profile) {
  const S = scaleOf(profile);
  const out = [];
  for (let v = S.min; v <= S.max + 1e-9; v += S.step) out.push(Math.round(v * 100) / 100);
  return out;
}

/** This project's sheen: its own where it has set one, the profile's where not. */
export function projectSheen(design, profile) {
  const S = scaleOf(profile);
  const stored = migrateDesign(design).sheen;
  const wanted = stored == null ? S.default : stored;
  return clampSheen(wanted, profile);
}

/** On the scale, and on the grid: a value between two steps lands on the nearer. */
export function clampSheen(value, profile) {
  const S = scaleOf(profile);
  const v = Number(value);
  if (!Number.isFinite(v)) return S.default;
  const snapped = S.step > 0 ? Math.round((v - S.min) / S.step) * S.step + S.min : v;
  return Math.min(Math.max(snapped, S.min), S.max);
}

/**
 * The Spraying formula, on the per-cent scale: `roughness = 1 − sheen / 100`.
 * 5 → 0.95 (dead matt), 50 → 0.5, 100 → 0.0 (full gloss).
 *
 * Written against the scale's own `max` rather than a literal 100, because that
 * is the number the profile carries and CLAUDE.md rule 3 puts numbers there —
 * with the shipped scale the two are the same thing.
 */
export function roughnessFromSheen(sheen, profile) {
  const max = Number(scaleOf(profile).max) || SHEEN_FALLBACK.max;
  const v = clampSheen(sheen, profile);
  return Math.min(1, Math.max(0, 1 - v / max));
}

/**
 * What a sheen value is CALLED, so a slider with twenty stops is not twenty
 * bare numbers. The words are the ones on a lacquer data sheet, and the bands
 * are the ones a sprayer would put them in: 5–10 dead matt, up to 25 matt,
 * eggshell, satin, semi-gloss, and full gloss at the top.
 *
 * Expressed as a SHARE of the scale's own maximum, so a workshop that reshapes
 * the scale keeps the words in proportion to it.
 */
export function sheenLabel(sheen, profile) {
  const max = Number(scaleOf(profile).max) || SHEEN_FALLBACK.max;
  const share = clampSheen(sheen, profile) / max;
  if (share <= 0.1) return 'Dead matt';
  if (share <= 0.25) return 'Matt';
  if (share <= 0.45) return 'Eggshell';
  if (share <= 0.65) return 'Satin';
  if (share <= 0.85) return 'Semi-gloss';
  return 'Gloss';
}

/**
 * Which joinery system this project is cut with (turn 7, CLAUDE.md F2).
 *
 * One resolution point, so the settings screen, the preview and anything that
 * later asks the engine "which joint" cannot disagree. A stored id that this
 * install has never heard of falls back to the profile default rather than
 * rendering nothing — the same rule a removed decor gets.
 */
export function resolveJoinery(design, profile) {
  const types = profile?.joinery?.types || [];
  const wanted = migrateDesign(design).joinery || profile?.joinery?.defaultType;
  return types.find((t) => t.id === wanted) || types[0] || null;
}

// ─── Project heights (turn 5, BACKLOG #29) ───

/**
 * The heights this project builds to: its own where it has set one, the
 * profile's where it has not. One resolution point, so the settings panel, the
 * "does this unit still match the project?" check and the code that places a
 * new unit can never disagree about what "the project's tall height" is.
 */
export function projectHeights(design, profile) {
  const stored = migrateDesign(design).heights;
  const fromProfile = profile?.projectHeights || {};
  return Object.fromEntries(HEIGHT_KEYS.map((k) => [
    k, Number(stored[k]) > 0 ? Number(stored[k]) : Number(fromProfile[k]) || 0,
  ]));
}

/**
 * The height a NEW unit of this type takes, or null when the type has none —
 * a low cabinet's height is its identity, so the project does not overrule it
 * and the kit's own default stands.
 *
 * `heightGroupOf` is passed in rather than imported: engine/types.js imports
 * nothing from here and this imports nothing from there, which keeps the two
 * ends of the same idea from becoming a cycle.
 */
export function heightForGroup(group, design, profile) {
  if (!group) return null;
  const heights = projectHeights(design, profile);
  return heights[group] || null;
}

/**
 * Is this unit's height still the project's, or has it been set by hand?
 *
 * The FLAG is what the panel shows and what "apply the new project height"
 * respects — a unit is custom because somebody said so, not because a number
 * happens to differ. Without that, a unit clamped to 2140 mm by a low ceiling
 * would look custom for ever and stop following the project.
 */
export function isCustomHeight(unit) {
  return Boolean(unit?.params?.height_custom);
}

export function normaliseColour(colour) {
  if (!colour) return null;
  const hex = String(colour.hex || '').trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  return {
    hex: hex.toLowerCase(),
    name: colour.name || hex.toLowerCase(),
    system: ['RAL', 'F&B', 'custom'].includes(colour.system) ? colour.system : 'custom',
  };
}

export function normaliseDoorStyle(style) {
  if (!style?.id) return null;
  return {
    id: String(style.id),
    name: String(style.name || 'Untitled style'),
    frontType: FRONT_STYLE_OPTIONS.some((o) => o.id === style.frontType) ? style.frontType : 'S',
    material_id: style.material_id ?? null,
    finish_id: style.finish_id ?? null,
    colour: normaliseColour(style.colour),
  };
}

/** How many carcass material types this project runs (1–3). */
export function setCarcassTypeCount(design, count) {
  const n = Math.min(3, Math.max(1, Math.trunc(Number(count) || 1)));
  const types = [...design.carcass.types];
  while (types.length < n) {
    types.push({
      id: `c${types.length + 1}`, label: `Carcass ${types.length + 1}`, material_id: null, finish_id: null,
    });
  }
  return { ...design, carcass: { types: types.slice(0, n) } };
}

/**
 * What this unit is actually made of and what colour it is.
 *
 * Order, most specific first: the unit's own override, then its door style,
 * then the project default. The engine never asks — it takes params — so this
 * is what the UI and the 3D view call to turn "the project is Shaker in
 * Hague Blue" into numbers and a hex.
 */
export function resolveUnitDesign(unit, design) {
  const d = migrateDesign(design);
  const styleId = unit?.params?.door_style_id || null;
  const style = d.doorStyles.find((s) => s.id === styleId) || null;

  const frontType = unit?.params?.front_type
    || style?.frontType
    || d.fronts.style;

  const colour = normaliseColour(unit?.params?.front_colour)
    || style?.colour
    || d.colour.front
    || null;

  const carcassTypeId = unit?.params?.carcass_type_id || d.carcass.types[0]?.id || null;
  const carcassType = d.carcass.types.find((t) => t.id === carcassTypeId) || d.carcass.types[0] || null;

  return {
    frontType,
    colour,
    doorStyle: style,
    carcassType,
    frontMaterialId: style?.material_id ?? null,
    carcassMaterialId: carcassType?.material_id ?? null,
  };
}

// ─── Finishes (turn 4, BACKLOG #4) ───

/**
 * One finish, by id: a manufacturer decor ("egger:H1180_37") or one of the
 * finishes the profile ships with. Null when the id names neither — which is
 * the case for a project saved against a decor pack this install does not have,
 * and the callers below fall back for it exactly as they do for a finish that
 * was removed from a profile.
 */
export function finishById(profile, id) {
  if (!id) return null;
  return decorFinish(id) || profile?.appearance?.finishes?.find((f) => f.id === id) || null;
}

/**
 * What this unit is FINISHED in — the carcass and the fronts, resolved the same
 * way for the 3D view, the panel and anything later.
 *
 * Most specific first:
 *   carcass — the carcass type's own decor, then the project default, then the
 *             profile default (broken white).
 *   front   — the door style's decor, then the project default, then THE
 *             CARCASS. "Fronts default to the carcass" is the rule from
 *             CLAUDE.md F2, and it is expressed here rather than in the view.
 *
 * An id that no longer exists (a decor removed from a profile) falls back the
 * same way instead of rendering nothing.
 *
 * ─── TURN 9 (CLAUDE.md F6): SPRAY IS A FINISH ───
 * A sprayed colour now comes back in the `front` slot as a finish of its own,
 * ahead of any board — because paint COVERS the decor, exactly as it does in
 * the workshop, and because everything downstream (the BOM panel, the PDF, the
 * unit card, the part labels) reads this one function. Turn 8 kept the two
 * apart and made every consumer remember to ask about `design.colour.front`
 * separately, which is why a sprayed door could be printed as its carcass decor
 * on a drawing while the 3D view had it right.
 *
 * `resolveUnitDesign` already resolves the colour most-specific-first — the
 * unit's own, then its door style's, then the project's — so a spray chosen for
 * ONE cabinet reaches its cut list and nobody else's.
 */
export function resolveFinishes(unit, design, profile) {
  const d = migrateDesign(design);
  const A = profile?.appearance || {};
  const resolved = resolveUnitDesign(unit, d);

  const carcass = finishById(profile, resolved.carcassType?.finish_id)
    || finishById(profile, d.finish.carcass)
    || finishById(profile, A.defaultCarcassFinish)
    || A.finishes?.[0]
    || null;

  const front = sprayFinish(resolved.colour)
    || finishById(profile, resolved.doorStyle?.finish_id)
    || finishById(profile, d.finish.front)
    || finishById(profile, A.defaultFrontFinish)
    || carcass;

  return { carcass, front };
}

/**
 * A readable name for a colour, whatever it came from. Used in the BOM and the
 * PDF, where "#1f3a5f" alone is not an order anybody can place.
 */
export function colourLabel(colour) {
  const c = normaliseColour(colour);
  if (!c) return '—';
  return c.system === 'custom' ? c.hex : `${c.name} (${c.system})`;
}

/**
 * What ONE element inside a cabinet may be made of (turn 9, CLAUDE.md F4.3).
 *
 * Deliberately short: the project's own carcass materials, 1 to 3 of them, plus
 * the fronts. That is the same list Design Settings offers and the same list a
 * workshop has actually bought board for — a per-shelf free-text material would
 * be a fourth sheet nobody ordered, appearing on a cut list.
 *
 * `materials` is the assignment store's plain list (id + name), passed IN so
 * this stays a pure function of data (CLAUDE.md rule 1).
 *
 * @returns {Array<{key:string, material_id:string|null, material_label:string}>}
 */
export function elementMaterialChoices(design, profile, materials = []) {
  const d = migrateDesign(design);
  const byId = new Map((materials || []).map((m) => [m.id, m]));
  const out = d.carcass.types.map((t) => ({
    key: t.id,
    material_id: t.material_id || null,
    // What the workshop calls this board: its decor if one is set, otherwise
    // the material it has been assigned, otherwise the slot's own name.
    material_label: finishById(profile, t.finish_id)?.label
      || byId.get(t.material_id)?.name
      || t.label,
  }));
  const { front } = resolveFinishes(null, d, profile);
  out.push({
    key: 'front',
    // There is no ONE front material id at project level — a front material is
    // a property of a door style — so the LABEL is what travels. It is the
    // label the BOM, the PDF and the unit card already print for a front.
    material_id: null,
    material_label: front?.label || 'Fronts',
  });
  return out;
}

// ─── Sprayed fronts (turn 9, CLAUDE.md F6) ──────────────────────────────────

/**
 * What a SPRAYED finish is called: "RAL 3005 Wine Red spray", "F&B Railings 31
 * spray", or the bare hex plus "spray" for a colour somebody typed.
 *
 * ONE convention, and it lives here rather than in each of the four places a
 * finish is printed — the BOM panel, the PDF, the unit card's title block and
 * the part labels all read the finish object this produces, so none of them can
 * invent a second way of naming the same tin of paint.
 *
 * The system goes in FRONT of the name because that is how it is ordered: a
 * workshop rings a supplier and says "RAL 3005", not "3005 Wine Red, RAL".
 */
export function sprayFinishLabel(colour) {
  const c = normaliseColour(colour);
  if (!c) return null;
  return c.system === 'custom' ? `${c.hex} spray` : `${c.system} ${c.name} spray`;
}

/**
 * A sprayed colour, dressed as a FINISH.
 *
 * Turn 8 kept the two apart: `design.finish.front` was a board (a melamine or a
 * decor) and `design.colour.front` was paint, and everything downstream had to
 * remember to ask about both. That is why a sprayed front printed as its
 * CARCASS decor on a unit card while the 3D view showed it correctly painted.
 *
 * A sprayed front is a finish like any other — it is what the piece is finished
 * IN — so it is returned as one, and `resolveFinishes` hands it out in the
 * `front` slot. `kind: 'spray'` is what tells a caller the difference; the
 * absence of a `texture` is what stops it being treated as a decor.
 */
export function sprayFinish(colour) {
  const c = normaliseColour(colour);
  if (!c) return null;
  return {
    id: `spray:${c.hex}`,
    label: sprayFinishLabel(c),
    kind: 'spray',
    hex: c.hex,
    colour: c,
  };
}
