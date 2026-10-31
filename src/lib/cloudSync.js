import { JC_OFFLINE, isJcOffline, withDb } from './jcApi.js';

// ─── T-CC1a F3 · THE CLOUD ROAD IS DELETED (CLAUDE.md T-CC1a law 2) ─────────
// The owner, 30.10.2026: *"oczywiscie do CC laczysz sie tylko przez JC"*. The
// login (signIn, signUp, signOut, getSession, onAuthChange), the cc_projects /
// cc_units road (listProjects, loadProject, saveProject, deleteProject) and the
// assignments' own row are gone; an item is JC's cc_items row (F4 to F7). What
// stays is the company defaults row, until T-CC1b moves it to the tenant's row
// (FROZEN 4, pending T-CC1b): the owner is the signed-in JC user, passed in.

// ─── COMPANY DEFAULTS (turn 22, CLAUDE.md F2b) ──────────────────────────────
//
// One row per owner in `cc_company_defaults` (sql/004_tura22.sql). Both calls
// degrade exactly as everything else here does: no keys, no session, no table
// and no network all resolve to "no row", and the app runs on profile numbers
// as it always has. Nothing throws at the caller.

export async function loadCompanyDefaults() {
  if (isJcOffline()) return { defaults: null, mock: true, error: null };
  const { data, error } = await withDb(
    (db) => db.from('cc_company_defaults').select('defaults, schema, updated_at').limit(1),
    null,
  );
  const row = Array.isArray(data) ? data[0] : data;
  return { defaults: row?.defaults || null, mock: false, error };
}

/**
 * Save the row. `upsert` on the primary key, which IS the owner: so a
 * workshop has one set of defaults and saving twice replaces rather than
 * duplicating. RLS makes it owner-scoped server-side; the client never sends
 * an owner and could not send somebody else's if it tried.
 */
export async function saveCompanyDefaults(defaults, owner = null) {
  if (isJcOffline()) return { saved: false, mock: true, error: new Error(JC_OFFLINE) };
  if (!owner) return { saved: false, mock: false, error: new Error('Company defaults need an account.') };
  const res = await withDb(
    (db) => db.from('cc_company_defaults')
      .upsert({ owner, defaults, schema: 1 }, { onConflict: 'owner' })
      .select()
      .single(),
    null,
  );
  return { saved: !res.error, mock: false, error: res.error };
}
