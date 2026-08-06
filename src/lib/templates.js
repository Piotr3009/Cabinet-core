// ─── Saved sets: a configured unit, kept to be used again (BACKLOG #30) ───
//
// A joiner builds one 900 mm wardrobe with two internal drawers, a rail, three
// shelves and an end panel, and then wants nine more like it. Turn 4 left
// Library ▸ Saved sets in the menu as a place held open for exactly this.
//
// A template is the unit's PARAMETERS and nothing else. Explicitly not saved:
//   * where it stood — a template is a cabinet, not a position, and inserting
//     one goes through the ordinary add path so collisions and free slots
//     behave exactly as they do for a library type;
//   * its unit number — the new unit gets the next one in the project;
//   * its automatic parts (the scribe fillers) — those are consequences of
//     where a unit ends up, and are worked out again where it lands.
//
// Every function takes its storage, like lib/projectLibrary.js, so the rules
// are testable in node without a DOM and without touching real localStorage.
// Supabase is the real home when it is configured; sql/003_tura5.sql is the
// table, as a FILE (CLAUDE.md: sql is never executed from here).

import { getUnitType } from '../engine/types.js';

export const TEMPLATE_KEY = 'cc.templates.v1';
export const TEMPLATE_SCHEMA = 1;
export const NAME_MAX = 60;

/** Params that describe WHERE a unit is rather than WHAT it is. */
const POSITIONAL_PARAMS = [
  'unit_num',
  // The scribe fillers are worked out from the gap the unit lands in
  // (engine/autoparts.js); carrying one project's gap into another is how a
  // 20 mm filler appears against a wall that is not there.
  'side_infill_left_mm',
  'side_infill_right_mm',
];

/**
 * The saveable half of a unit: everything about how it is BUILT.
 *
 * Ids inside the params (drawer and shelf item ids) are deliberately kept —
 * they are regenerated on insert, so a template used twice cannot produce two
 * units whose shelves share an id.
 */
export function templateParams(unit) {
  const params = { ...(unit?.params || {}) };
  for (const key of POSITIONAL_PARAMS) delete params[key];
  return JSON.parse(JSON.stringify(params));
}

/** A template row from a unit and a name. `at` is injected: the caller owns the clock. */
export function templateFrom(unit, name, { at = 0, id = null } = {}) {
  if (!unit?.type) return null;
  return {
    id: id || newTemplateId(),
    schema: TEMPLATE_SCHEMA,
    name: cleanName(name) || `${getUnitType(unit.type).label}`,
    type: unit.type,
    params: templateParams(unit),
    created_at: at,
    updated_at: at,
  };
}

export function cleanName(name) {
  return String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

export function newTemplateId(seed) {
  const rand = seed != null ? String(seed) : Math.random().toString(36).slice(2, 9);
  return `tpl_${rand}`;
}

function read(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(TEMPLATE_KEY) || 'null');
    if (!parsed || !Array.isArray(parsed.templates)) return { templates: [] };
    // A row with no type cannot be inserted, so it is not a template — dropping
    // it here keeps every caller from having to ask.
    return { templates: parsed.templates.filter((t) => t && t.id && t.type) };
  } catch {
    // A corrupted shelf must not take the app down with it.
    return { templates: [] };
  }
}

function write(storage, data) {
  try { storage.setItem(TEMPLATE_KEY, JSON.stringify(data)); } catch { /* quota */ }
  return data;
}

/** Every saved set, newest first. */
export function listTemplates(storage) {
  return [...read(storage).templates].sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
}

export function getTemplate(storage, id) {
  return read(storage).templates.find((t) => t.id === id) || null;
}

/**
 * Save a unit as a template.
 * A name already in use REPLACES that template rather than making a second one
 * with the same label — "Save as template" twice under one name is how a
 * workshop edits the set it just made, and two identical entries in the library
 * would be a list nobody can use.
 */
export function saveTemplate(storage, { unit, name, at = 0 }) {
  const clean = cleanName(name);
  if (!clean) return { template: null, error: 'Give the set a name.' };
  if (!unit?.type) return { template: null, error: 'No unit to save.' };

  const data = read(storage);
  const existing = data.templates.find((t) => t.name.toLowerCase() === clean.toLowerCase());
  const row = templateFrom(unit, clean, { at, id: existing?.id });
  if (existing) row.created_at = existing.created_at ?? at;

  const templates = [row, ...data.templates.filter((t) => t.id !== row.id)];
  write(storage, { templates });
  return { template: row, error: null, replaced: Boolean(existing) };
}

export function renameTemplate(storage, id, name) {
  const clean = cleanName(name);
  if (!clean) return { ok: false, error: 'Give the set a name.' };
  const data = read(storage);
  if (data.templates.some((t) => t.id !== id && t.name.toLowerCase() === clean.toLowerCase())) {
    return { ok: false, error: `There is already a saved set called “${clean}”.` };
  }
  const templates = data.templates.map((t) => (t.id === id ? { ...t, name: clean } : t));
  write(storage, { templates });
  return { ok: templates.some((t) => t.id === id), error: null };
}

export function deleteTemplate(storage, id) {
  const data = read(storage);
  const templates = data.templates.filter((t) => t.id !== id);
  write(storage, { templates });
  return templates.length !== data.templates.length;
}
