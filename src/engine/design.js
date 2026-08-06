// ─── Design settings (project level) ───
// What the whole project is made of and what it looks like: how many carcass
// materials are in play, the standard front, the workshop's own door styles,
// the front colour and the infill width (CLAUDE.md turn 3, phase 6).
//
// This module is the DATA and the RESOLUTION rules — what a given unit ends up
// with once the project defaults, its door style and its own overrides have
// been applied. Pure functions, so the 3D view, the BOM and a test all resolve
// it the same way.

export const DESIGN_SCHEMA = 1;

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
  },
  // The workshop's own door styles: name + front type + material/colour. A unit
  // points at one of these by id.
  doorStyles: [],
  colour: {
    front: null,       // { hex, name, system: 'RAL' | 'F&B' | 'custom' }
  },
  infill: {
    // Used by phase 7: the filler between a unit and the wall.
    sideWidth: 20,
  },
  // Project-level appearance (turn 4). null = the profile default, and a null
  // FRONT finish means "the same as the carcass" — which is what a workshop
  // means by one material throughout.
  finish: { carcass: null, front: null },
  // Defaults the "Add end panel" action inherits (turn 4, BACKLOG #17).
  // `thickness: null` = the project's front thickness.
  endPanel: { height: 'floor', thickness: null, applyToAll: true },
  // Project heights (turn 5, BACKLOG #29). null = "whatever the profile says",
  // which is what a project that has never opened the section means. Resolved
  // through projectHeights() below, so a stored null and a stored number behave
  // the same everywhere.
  heights: { base: null, wall: null, tall: null, wallMount: null, toeKick: null },
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
    }))
    : base.carcass.types;

  return {
    schema: DESIGN_SCHEMA,
    carcass: { types },
    fronts: {
      style: FRONT_STYLE_OPTIONS.some((o) => o.id === d.fronts?.style) ? d.fronts.style : base.fronts.style,
      handle: d.fronts?.handle ?? null,
    },
    doorStyles: Array.isArray(d.doorStyles)
      ? d.doorStyles.map((s) => normaliseDoorStyle(s)).filter(Boolean)
      : [],
    colour: { front: normaliseColour(d.colour?.front) },
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
  };
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

/** One finish out of the profile's list, or null. */
export function finishById(profile, id) {
  if (!id) return null;
  return profile?.appearance?.finishes?.find((f) => f.id === id) || null;
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

  const front = finishById(profile, resolved.doorStyle?.finish_id)
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
