// ─── Saved settings sets (turn 7, CLAUDE.md F2 / BACKLOG #41) ───
//
// A workshop does not choose its materials, its joinery and its heights afresh
// for every job. It has two or three ways it builds — "our standard kitchen",
// "the painted shaker one", "contract spec" — and a new project should be able
// to start from one of them by name.
//
// So this is a new stored thing: a COMPLETE set of project design settings
// under a name. It is deliberately the whole `design` object and not a subset:
// a set that carried the materials but not the heights would be a set that
// silently half-applies, and the first time somebody noticed would be in a cut
// list.
//
// Same shape as lib/projectLibrary.js and lib/templates.js, for the same
// reasons: every function takes its storage, so the rules are testable in node
// without a DOM; the database is the real home when it is configured, and
// `source: 'local'` is on every row so the UI can say where a set came from.
// There is no SQL for it yet — mock mode has to WORK, not warn (CLAUDE.md).

import { migrateDesign } from '../engine/design.js';

export const SETTINGS_SETS_KEY = 'cc.settingsSets.v1';
export const SETTINGS_SET_SCHEMA = 1;

function read(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(SETTINGS_SETS_KEY) || 'null');
    if (!parsed || !Array.isArray(parsed.sets)) return { sets: [] };
    return { sets: parsed.sets.filter((s) => s && s.id && s.name) };
  } catch {
    // A corrupted shelf must not take the app down with it.
    return { sets: [] };
  }
}

function write(storage, data) {
  try { storage.setItem(SETTINGS_SETS_KEY, JSON.stringify(data)); } catch { /* quota */ }
  return data;
}

const newId = (seed) => `set_${seed != null ? String(seed) : Math.random().toString(36).slice(2, 9)}`;

/** Trimmed, and never empty — an unnamed set is a set nobody can pick again. */
export function normaliseSetName(name) {
  const trimmed = String(name ?? '').trim();
  return trimmed || 'Untitled settings';
}

/**
 * Save a set. Matching on the NAME (case-insensitively) rather than on an id,
 * because "save my standard kitchen" twice means replace it, not keep two rows
 * called the same thing and let the user guess which one is live.
 *
 * @returns {{set:object, replaced:boolean}}
 */
export function saveSettingsSet(storage, { name, design, at = 0, id = null }) {
  const data = read(storage);
  const label = normaliseSetName(name);
  const existing = data.sets.find((s) => (id ? s.id === id : s.name.toLowerCase() === label.toLowerCase()));
  const set = {
    id: existing?.id || id || newId(),
    schema: SETTINGS_SET_SCHEMA,
    name: label,
    // A snapshot, migrated on the way in: a set saved today must still apply
    // cleanly to a project opened after the design shape has grown.
    design: migrateDesign(design),
    created_at: existing?.created_at || at,
    updated_at: at,
    source: 'local',
  };
  write(storage, { sets: [set, ...data.sets.filter((s) => s.id !== set.id)] });
  return { set, replaced: Boolean(existing) };
}

/** Every set, most recently saved first. */
export function listSettingsSets(storage) {
  return [...read(storage).sets]
    .sort((a, b) => (Number(b.updated_at) || 0) - (Number(a.updated_at) || 0))
    .map((s) => ({ id: s.id, name: s.name, updated_at: s.updated_at || 0, source: 'local' }));
}

/** One set's design, migrated — or null when the id is unknown. */
export function loadSettingsSet(storage, id) {
  const row = read(storage).sets.find((s) => s.id === id);
  if (!row) return null;
  return { id: row.id, name: row.name, design: migrateDesign(row.design) };
}

export function renameSettingsSet(storage, id, name) {
  const data = read(storage);
  const label = normaliseSetName(name);
  const sets = data.sets.map((s) => (s.id === id ? { ...s, name: label } : s));
  write(storage, { sets });
  return sets.some((s) => s.id === id);
}

export function deleteSettingsSet(storage, id) {
  const data = read(storage);
  const sets = data.sets.filter((s) => s.id !== id);
  write(storage, { sets });
  return sets.length !== data.sets.length;
}

/**
 * Apply a set to a project's design.
 *
 * The set wins on everything it carries EXCEPT the two things that belong to
 * this project and not to the way the workshop builds: which kind of job it is
 * and how much of the room it covers. Somebody who picks "our standard kitchen"
 * while starting a vanity means the materials and the joinery, not that the job
 * has become a kitchen.
 */
export function applySettingsSet(design, set) {
  const base = migrateDesign(design);
  const from = migrateDesign(set?.design);
  return migrateDesign({ ...from, projectType: base.projectType, scope: base.scope });
}
