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
  // ─── Turn 20 (CLAUDE.md F12.3) ───
  // A DECOR picker on a VENEER source keeps a veneer facing. The front's
  // veneer source moved to the 85-decor grid this turn, and a project saved
  // before it is faced in `veneer:oak-natural` — dropping that because the
  // picker changed would throw away a decision the owner made, on a board
  // whose look and thickness have not changed at all. New picks are decors;
  // old ones stay valid, and both resolve through `frontFacing`.
  if (picker === 'decor') return !isVeneer || String(source?.id || '') === 'veneer';
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
 *
 * ─── Turn 16 (CLAUDE.md F1.1) ───
 * …and from its ASSIGNED BOARD before that, where one has been assigned. A
 * front type carries stock now, and a board that is 22 mm thick is 22 mm thick
 * whatever source button is lit — this is the same order the carcass side has
 * followed since turn 11 (`drawnBoardT` in the settings surface: carcass 1's
 * assigned board is the truth once one exists).
 *
 * `materials` is passed IN, so this stays a pure function of data and a caller
 * with no stock list to hand gets exactly the answer it got before this turn.
 */
export function projectFrontThickness(design, profile, materials = []) {
  const first = design?.fronts?.types?.[0];
  const board = first?.material_id
    ? (materials || []).find((m) => m.id === first.material_id)
    : null;
  if (Number(board?.thickness) > 0) return Number(board.thickness);
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

// ─── SAVE IS A STATE, NOT A FLASH (turn 16, CLAUDE.md F5) ───────────────────
//
// The owner, of turn 15's green tick: it shows for a moment. It did, because
// "saved" was a BOOLEAN in a component — the same flag that folded the section
// away — so any re-render, any reopening of Settings, put it back to red with
// nothing having changed, and a red Save on a section nobody has touched says
// exactly as little as a green one that never goes red.
//
// F5's answer, in one line: the button's colour is a function of the DATA.
//
//     dirty = the section's current values ≠ the values as they were saved
//
// So it is computed here, purely, from (saved, current) — which is what makes
// it node-testable and what makes it survive the panel being closed and opened
// again: the SNAPSHOT is what is remembered, not the fact that a button was
// once pressed.

/**
 * The sections a Save belongs to. The T15 red-Save sections, exactly — CLAUDE.md
 * F5 says "matching the T15 red-Save sections (Carcasses, Fronts)".
 */
export const SAVE_SECTIONS = ['carcass', 'fronts'];

/**
 * The slice of the design ONE section owns.
 *
 * Deliberately narrow: a section goes red for its own changes and not for the
 * neighbour's, so a workshop editing the fronts does not see the carcass line
 * turn red beside it. The FRONTS section owns the front types, the door SHAPE
 * (chosen in its gallery) and the run-piece switches that stand beside it
 * (F1.2); the CARCASS section owns the carcass types and the project's board
 * thickness, which is the number its folded line prints.
 *
 * @returns {object} a plain, comparable value — no functions, no undefined
 */
export function settingsSectionData(design, section) {
  const d = design || {};
  if (section === 'carcass') {
    return {
      types: (d.carcass?.types || []).map((t) => ({
        id: t.id, label: t.label, source: t.source ?? null,
        material_id: t.material_id ?? null, finish_id: t.finish_id ?? null,
      })),
      colour: d.colour?.carcass ?? null,
      thickness: d.thickness ?? null,
    };
  }
  if (section === 'fronts') {
    return {
      style: d.fronts?.style ?? null,
      types: (d.fronts?.types || []).map((t) => ({
        id: t.id, label: t.label, source: t.source ?? null,
        colour: t.colour ?? null, material_id: t.material_id ?? null, finish_id: t.finish_id ?? null,
      })),
      runMaterials: d.runMaterials ?? null,
    };
  }
  return null;
}

/**
 * A stable string for a section's data, so "has it changed" is one comparison
 * and not a deep walk written twice.
 *
 * Key order is fixed by `settingsSectionData` above — it builds every object
 * literally — so `JSON.stringify` is deterministic here in a way it is not in
 * general.
 */
export function settingsSectionSnapshot(design, section) {
  const data = settingsSectionData(design, section);
  return data === null ? null : JSON.stringify(data);
}

/**
 * Is this section dirty? A PURE function of (saved, current), which is what
 * CLAUDE.md F5 asks for in as many words.
 *
 * Never saved at all → dirty. That is the honest answer for a project that has
 * just been created: there is something to save, and the button says so.
 */
export function isSectionDirty(saved, current) {
  if (saved == null) return true;
  return saved !== current;
}

/**
 * What the Save button should LOOK like, so the component renders an answer
 * rather than deciding one.
 *
 * @returns {{state:'saved'|'dirty', label:string, dirty:boolean}}
 */
export function saveButtonState(saved, current) {
  const dirty = isSectionDirty(saved, current);
  return { dirty, state: dirty ? 'dirty' : 'saved', label: dirty ? 'Save' : '✓ Saved' };
}
