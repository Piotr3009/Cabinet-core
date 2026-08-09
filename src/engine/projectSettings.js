// ─── The project's own defaults (turn 11, CLAUDE.md F9) ─────────────────────
//
// Step 5 of the new-project flow is where a workshop says how it builds THIS
// job: the heights and the depth every unit starts at, what the carcasses and
// the fronts are made of, which variant of each piece of ironmongery is fitted,
// and how thick the board is.
//
// Everything here is DESIGN-layer — it is stored with the project and it reaches
// the engine through `paramsForEngine`, exactly as the plinth and the top infill
// do. Not one formula moved: the maths still lives in the LISP-derived engine
// and this feeds numbers into it.
//
// Pure functions and pure data. `null` means "whatever the profile says", which
// is the same convention every other design field uses, and it is what lets a
// workshop change its standard and have every project that never overrode it
// follow.

import { DEFAULT_CABINET_PROFILE } from './profile.js';
import { veneerIdFromFinishId } from './veneers.js';

const settingsOf = (profile) => profile?.projectSettings || DEFAULT_CABINET_PROFILE.projectSettings;

/** Every carcass source a project may pick from. */
export function carcassSources(profile) {
  return settingsOf(profile).carcassSources;
}

/** …and every front source. */
export function frontSources(profile) {
  return settingsOf(profile).frontSources;
}

export function sourceById(list, id) {
  return list.find((s) => s.id === id) || null;
}

/**
 * WHICH PICKER a source asks for (turn 15, CLAUDE.md F3).
 *
 * The owner's "mega ważne": a Veneer front was offering RAL palettes and a
 * Laminate front was offering them too. Neither is a paint. The answer is a
 * property of the SOURCE — a veneer picks a timber, a laminate picks a decor, a
 * spray picks a colour — so it is read off the source's own record and the
 * component decides nothing.
 *
 * A source that names no picker and is not marked `coloursSoon` falls back to
 * the colour picker, which is what every source did before this turn.
 *
 * @returns {'decor'|'veneer'|'colour'|null}
 */
export function pickerForSource(source) {
  if (!source) return null;
  if (source.picker !== undefined) return source.picker;
  if (source.coloursSoon) return null;
  return source.kind === 'spray' ? 'colour' : 'decor';
}

/** Does this source face the board with something the FINISH layer stores? */
export function sourceTakesFacing(source) {
  const picker = pickerForSource(source);
  return picker === 'decor' || picker === 'veneer';
}

/**
 * Could this stored facing have come from this source?
 *
 * A decor id under a Veneer source is a leftover from the button that was
 * pressed before, and leaving it there is how a project ends up veneered in a
 * laminate. Asked by the setters, so switching a source drops what the new one
 * cannot mean rather than carrying it silently.
 */
export function facingMatchesSource(finishId, source) {
  if (!finishId) return true;
  const isVeneer = veneerIdFromFinishId(finishId) != null;
  const picker = pickerForSource(source);
  if (picker === 'veneer') return isVeneer;
  if (picker === 'decor') return !isVeneer;
  return false;
}

/**
 * How thick a board from this source is (CLAUDE.md F9.3).
 *
 * "auto per source — EGGER 18, veneer 19, laminate 18". The workshop does not
 * type this; it follows from where the board came from, which is the whole point
 * of asking for the source first.
 */
export function thicknessForSource(profile, kind, id) {
  const list = kind === 'front' ? frontSources(profile) : carcassSources(profile);
  return sourceById(list, id)?.thickness ?? null;
}

/**
 * The CARCASS board this project is cut from.
 *
 * Most specific first: a thickness typed by hand ("Other"), then the one chosen
 * from the selector, then the one that follows from carcass type 1's source, and
 * finally the profile's own board. A project that has answered none of it builds
 * exactly what it built before turn 11.
 */
export function projectBoardThickness(design, profile) {
  const t = design?.thickness || {};
  if (Number(t.custom) > 0) return Number(t.custom);
  if (Number(t.board) > 0) return Number(t.board);
  const first = design?.carcass?.types?.[0];
  const fromSource = first?.source ? thicknessForSource(profile, 'carcass', first.source) : null;
  return fromSource ?? profile.board.thickness;
}

/**
 * The FRONT board, from front type 1's source. A workshop running veneer fronts
 * gets 19 without saying so twice.
 */
export function projectFrontThickness(design, profile) {
  const first = design?.fronts?.types?.[0];
  const fromSource = first?.source ? thicknessForSource(profile, 'front', first.source) : null;
  return fromSource ?? profile.front.thickness;
}

/**
 * The DEPTH every unit starts at (CLAUDE.md F9.1: "ALL-units depth").
 *
 * One number for the whole job, because that is how a kitchen is built and
 * because a run whose cabinets are 558 and 560 has a step down the front of it.
 * A unit may still be given its own; this is where it starts.
 */
export function projectDepth(design, profile) {
  const own = Number(design?.depth);
  if (Number.isFinite(own) && own > 0) return own;
  return profile.baseUnit.defaults.depth;
}

/**
 * Which VARIANT of a piece of ironmongery this project fits.
 *
 * The user picks a variant; the automat picks the concrete item from it. A
 * project that has never been asked gets the profile's default, which is the
 * one the workshop fits by habit.
 */
export function hardwareVariant(design, profile, key) {
  const spec = settingsOf(profile).hardware[key];
  if (!spec?.variants) return null;
  const wanted = design?.hardware?.[key];
  return spec.variants.find((v) => v.id === wanted)?.id || spec.default || spec.variants[0]?.id || null;
}

/** Every hardware question, resolved — what the panel shows and the BOM reads. */
export function hardwareChoices(design, profile) {
  const H = settingsOf(profile).hardware;
  return Object.entries(H).map(([key, spec]) => ({
    key,
    label: spec.label,
    hint: spec.hint || null,
    fits: spec.fits || null,
    auto: spec.auto || null,
    variants: spec.variants || null,
    chosen: spec.variants ? hardwareVariant(design, profile, key) : null,
  }));
}

/**
 * The front TYPES a project runs (max 2, CLAUDE.md F9.2).
 *
 * The same shape the carcass types have had since turn 3, and normalised the
 * same way — an id, a label, where it comes from, and what colour it is — so
 * that end panels and infills defaulting to "front type 1" is a lookup rather
 * than a special case.
 */
export function normaliseFrontTypes(types, profile) {
  const max = settingsOf(profile).maxFrontTypes;
  const list = Array.isArray(types) && types.length ? types : [{ id: 'f1' }];
  return list.slice(0, max).map((t, i) => ({
    id: t.id || `f${i + 1}`,
    label: t.label || `Front ${i + 1}`,
    source: t.source || frontSources(profile)[0]?.id || null,
    colour: t.colour ?? null,
    material_id: t.material_id ?? null,
    // What a BOARD front is faced with — a decor or a veneer (turn 15, F3).
    finish_id: t.finish_id ?? null,
  }));
}

/** Grow or shrink the list to `count`, keeping what is already answered. */
export function setFrontTypeCount(types, count, profile) {
  const max = settingsOf(profile).maxFrontTypes;
  const n = Math.min(max, Math.max(1, Math.trunc(Number(count) || 1)));
  const next = [...normaliseFrontTypes(types, profile)];
  while (next.length < n) {
    next.push({
      id: `f${next.length + 1}`,
      label: `Front ${next.length + 1}`,
      source: frontSources(profile)[0]?.id || null,
      colour: null,
      material_id: null,
      finish_id: null,
    });
  }
  return next.slice(0, n);
}

/**
 * The five default DIMENSIONS step 5 asks for, resolved (CLAUDE.md F9.1).
 *
 * Four of them are the project heights turn 5 already owns; the fifth is the
 * depth. Gathered here so the step renders one list rather than reaching into
 * two modules and hoping they agree.
 */
export function projectDimensions(design, profile, heights) {
  return [
    { key: 'base', label: 'Base unit height', value: heights.base },
    { key: 'depth', label: 'Depth (all units)', value: projectDepth(design, profile) },
    { key: 'tall', label: 'Tall unit height', value: heights.tall },
    { key: 'wall', label: 'Wall unit height', value: heights.wall },
    { key: 'toeKick', label: 'Plinth height', value: heights.toeKick },
  ];
}
