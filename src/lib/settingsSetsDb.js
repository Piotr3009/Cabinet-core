import { withDb } from './supabase.js';
import { migrateDesign } from '../engine/design.js';

// ─── cc_settings_sets — THE SET THAT FOLLOWS THE ACCOUNT (turn 44, F8) ──────
//
// A settings set has lived in localStorage since turn 7, and `lib/settingsSets.js`
// says why in as many words: *"There is no SQL for it yet — mock mode has to
// WORK, not warn."* That is still true and nothing here changes it. What F8
// adds is the OTHER half: a workshop that saves "our standard kitchen" on the
// laptop should find it on the tablet, and that needs a table.
//
//   `supabase/migrations/t44_settings_sets.sql` — SQL PRZED push (iron rule 7).
//
// ─── DEGRADATION IS THE DEFAULT, NOT THE FALLBACK ───────────────────────────
//
// Every function here answers `{ rows|ok, source, error }` and NEVER throws.
// `withDb` already turns mock mode, a dead network and a table that has not had
// the migration run against it into the same quiet `null`, so the three of them
// are one code path: `source: 'local'`, and the surface says so in an amber
// note. The local shelf is written FIRST and always, so a set is never lost
// because a database was slow.

const TABLE = 'cc_settings_sets';

/** A row from the table, in the shape the local shelf already speaks. */
function rowToSet(row) {
  return {
    id: String(row.id),
    name: String(row.name || 'Untitled settings'),
    updated_at: Date.parse(row.created_at || '') || 0,
    source: 'db',
  };
}

/**
 * Every set this account has saved.
 *
 * @returns {Promise<{rows:Array, source:'db'|'local', error:string|null}>}
 */
export async function listSettingsSetsDb() {
  const { data, error, mock } = await withDb(
    (db) => db.from(TABLE).select('id,name,created_at').order('created_at', { ascending: false }),
    null,
  );
  if (mock || error || !Array.isArray(data)) {
    return {
      rows: [],
      source: 'local',
      error: error ? (error.message || String(error)) : null,
    };
  }
  return { rows: data.map(rowToSet), source: 'db', error: null };
}

/**
 * One set's stored design, from the table.
 *
 * @returns {Promise<{design:object|null, source:'db'|'local'}>}
 */
export async function loadSettingsSetDb(id) {
  const { data, error, mock } = await withDb(
    (db) => db.from(TABLE).select('payload').eq('id', id).maybeSingle(),
    null,
  );
  if (mock || error || !data?.payload) return { design: null, source: 'local' };
  return { design: migrateDesign(data.payload), source: 'db' };
}

/**
 * INSERT a set — F8's finale, *"payload = the whole settings object"*.
 *
 * Deliberately the whole `design`, exactly as the local shelf stores it, and
 * for the reason turn 7 wrote down: a set that carried the materials but not
 * the heights would half-apply, and the first time anybody noticed would be in
 * a cut list.
 *
 * @returns {Promise<{ok:boolean, id:string|null, source:'db'|'local', error:string|null}>}
 */
export async function saveSettingsSetDb(name, design) {
  const payload = migrateDesign(design);
  const { data, error, mock } = await withDb(
    (db) => db.from(TABLE).insert({ name: String(name || '').trim() || 'Untitled settings', payload }).select('id').single(),
    null,
  );
  if (mock || error || !data?.id) {
    return {
      ok: false,
      id: null,
      source: 'local',
      error: error ? (error.message || String(error)) : null,
    };
  }
  return {
    ok: true, id: String(data.id), source: 'db', error: null,
  };
}

/** Take one off the account. Local-only when there is no table. */
export async function deleteSettingsSetDb(id) {
  const { error, mock } = await withDb((db) => db.from(TABLE).delete().eq('id', id), null);
  if (mock || error) return { ok: false, source: 'local' };
  return { ok: true, source: 'db' };
}

/** The amber sentence a surface says when the table is not there yet. */
export const NO_TABLE_NOTE = 'Saved on this computer. Run supabase/migrations/t44_settings_sets.sql '
  + 'and the sets follow the account instead.';
