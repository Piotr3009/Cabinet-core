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

const TEMPLATE_KEY = 'cc.templates.v1';
const TEMPLATE_SCHEMA = 1;
export const NAME_MAX = 60;

/** Params that describe WHERE a unit is rather than WHAT it is. */
const POSITIONAL_PARAMS = [
  'unit_num',
  // The scribe fillers are worked out from the gap the unit lands in
  // (engine/autoparts.js); carrying one project's gap into another is how a
  // 20 mm filler appears against a wall that is not there.
  'side_infill_left_mm',
  'side_infill_right_mm',
  // Turn 32 (CLAUDE.md F3): the front-edge trims are the NEIGHBOURHOOD's,
  // not the build's — the self-healing pass writes them from what stands
  // beside the cabinet, and re-writes them the moment the copy lands
  // somewhere else. Carrying them would dress a copy in the original's
  // neighbours for one render.
  'front_edge_trim',
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

// ─── T75 F20 · A SET: AN ORDERED LIST OF UNITS, THE GAPS BETWEEN THEM ──────
//
// CLAUDE.md T75 F20: *"`lib/templates.js` grows `kind: 'set'`: an ORDERED
// list of units (type + params, positions stripped as today) with the gaps
// between them ... A set is a RECIPE, not a group: after insertion the units
// are ordinary units."*  A set row is `{ id, schema: 2, kind: 'set', name,
// units: [{ type, params, at }], created_at, updated_at }`, where `at` is the
// recipe grammar of `engine/sets.js`: `{ gap }` from the floor unit before it
// (the gap between them, 0 = butted), or `{ over: i }` (a wall unit hung over
// unit i, kept at its own `mount_height`). Positions are stripped exactly as a
// one-unit template strips them, and so is what names ANOTHER unit by id (a
// top box's host): an id means nothing in the job the set lands in.
const SET_SCHEMA = 2;
const CROSS_UNIT_PARAMS = ['rides_on', 'rides_offset_mm'];

/** Is this stored row a multi-unit set? */
export function isSetRow(row) {
  return Boolean(row && row.kind === 'set' && Array.isArray(row.units) && row.units.length
    && row.units.every((u) => u && u.type));
}

/**
 * A set row from the units of a selection, left to right as they stand. Every
 * unit must stand on ONE wall; each keeps the gap to the run before it, and a
 * unit standing over an earlier one (a wall unit over a base unit, a shelf over
 * a wall unit) is kept OVER it, at its own height.
 */
export function setFrom(units, name, { at = 0, id = null } = {}) {
  const list = (units || []).filter((u) => u?.type);
  if (list.length < 2) return null;
  const wall = list[0].position?.wall ?? 0;
  if (!list.every((u) => (u.position?.wall ?? 0) === wall)) return null;
  const xOf = (u) => Number(u.position?.x_mm) || 0;
  const wOf = (u) => Number(u.params?.width) || 0;
  const liftOf = (u) => (getUnitType(u.type).mount === 'wall' ? Number(u.params?.mount_height) || 1 : 0);
  // Left to right; at one x the floor unit first, then what hangs over it,
  // lowest first (a wall unit, then the shelves over that).
  const sorted = [...list].sort((a, b) => xOf(a) - xOf(b) || liftOf(a) - liftOf(b));
  const rows = [];
  let rightEdge = null;
  sorted.forEach((u) => {
    // OVER the earlier unit it overlaps most; otherwise along the run, by
    // its gap to the furthest right edge so far.
    const overlap = (r) => Math.max(0, Math.min(xOf(u) + wOf(u), xOf(r.unit) + wOf(r.unit)) - Math.max(xOf(u), xOf(r.unit)));
    const host = rows.map((r, i) => ({ r, i, o: overlap(r) })).sort((a, b) => b.o - a.o)[0];
    const where = host && host.o > 0
      ? { over: host.i, dx: Math.round(xOf(u) - xOf(host.r.unit)) }
      : { gap: rightEdge == null ? 0 : Math.max(0, Math.round(xOf(u) - rightEdge)) };
    rows.push({ unit: u, row: { type: u.type, params: setUnitParams(u), at: where } });
    rightEdge = Math.max(rightEdge ?? -Infinity, xOf(u) + wOf(u));
  });
  return {
    id: id || newTemplateId(),
    schema: SET_SCHEMA,
    kind: 'set',
    name: cleanName(name) || `Set of ${list.length}`,
    units: rows.map((r) => r.row),
    created_at: at,
    updated_at: at,
  };
}

/** One unit's params as a set keeps them: the template's strip, and no ids of others. */
function setUnitParams(unit) {
  const params = templateParams(unit);
  for (const key of CROSS_UNIT_PARAMS) delete params[key];
  return params;
}

/**
 * Save a selection as a set. A name in use REPLACES that row, as for one unit.
 */
export function saveSet(storage, { units, name, at = 0 }) {
  const clean = cleanName(name);
  if (!clean) return { template: null, error: 'Give the set a name.' };
  const data = read(storage);
  const existing = data.templates.find((t) => t.name.toLowerCase() === clean.toLowerCase());
  const row = setFrom(units, clean, { at, id: existing?.id });
  if (!row) return { template: null, error: 'A set is two or more units on one wall.' };
  if (existing) row.created_at = existing.created_at ?? at;
  write(storage, { templates: [row, ...data.templates.filter((t) => t.id !== row.id)] });
  return { template: row, error: null, replaced: Boolean(existing) };
}

export function cleanName(name) {
  return String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

function newTemplateId(seed) {
  const rand = seed != null ? String(seed) : Math.random().toString(36).slice(2, 9);
  return `tpl_${rand}`;
}

function read(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(TEMPLATE_KEY) || 'null');
    if (!parsed || !Array.isArray(parsed.templates)) return { templates: [] };
    // A row with no type cannot be inserted, so it is not a template — dropping
    // it here keeps every caller from having to ask.
    // T75 F20 · …and a SET row is a template too: it has no single type, it
    // has a list of units, each with one.
    return { templates: parsed.templates.filter((t) => t && t.id && (t.type || isSetRow(t))) };
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
