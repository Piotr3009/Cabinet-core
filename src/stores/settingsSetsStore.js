import { create } from 'zustand';
import { browserStorage } from '../lib/projectLibrary.js';
import {
  applySettingsSet, deleteSettingsSet, listSettingsSets, loadSettingsSet,
  renameSettingsSet, saveSettingsSet,
} from '../lib/settingsSets.js';
// ─── TURN 44 (CLAUDE.md F8): …AND THE TABLE, WHERE THERE IS ONE ─────────────
// `cc_settings_sets`. The local shelf below is written FIRST and ALWAYS; the
// table is then offered the same row. No table, no session, no network — one
// code path, `source: 'local'`, and an amber note on the surface.
import { deleteSettingsSetDb, listSettingsSetsDb, loadSettingsSetDb, saveSettingsSetDb } from '../lib/settingsSetsDb.js';

// ─── Saved settings sets (turn 7, CLAUDE.md F2) ───
// A thin shell over lib/settingsSets.js, exactly like templateStore is over
// lib/templates.js: the RULES are pure functions over a storage object and are
// tested in node, and this is only the subscription the new-project flow and
// Design Settings read.
//
// The local shelf always — it is what makes mock mode a working app rather than
// a demo (CLAUDE.md rule 7). Supabase is the real home when it is configured;
// no SQL for this table exists yet, and nothing here waits for it.

export const useSettingsSetsStore = create((set, get) => ({
  storage: browserStorage(),
  sets: listSettingsSets(browserStorage()),
  // 'local' until cc_settings_sets has actually answered (T44 F8). Every
  // surface that says where a set lives reads THIS and never guesses.
  source: 'local',

  /** Re-read the shelf (another tab, or a storage swapped in by a test). */
  refresh: () => set((s) => ({ sets: listSettingsSets(s.storage) })),

  /** Point the store at a different storage — used by the tests. */
  useStorage: (storage) => set({ storage, sets: listSettingsSets(storage) }),

  /**
   * ─── TURN 44 (CLAUDE.md F8): THE SHELF FIRST, THE TABLE SECOND ───────────
   *
   * The local write is synchronous and unconditional — that is what has made
   * mock mode a working app rather than a demo since turn 7, and a set must
   * never be lost because a database was slow. The row is THEN offered to
   * `cc_settings_sets`; a refusal of any kind (mock mode, no session, the
   * migration not run) is the same quiet answer and leaves `source: 'local'`.
   *
   * @returns {Promise<{set:object, replaced:boolean, source:'db'|'local', error:string|null}>}
   */
  save: async (name, design, at = Date.now()) => {
    const result = saveSettingsSet(get().storage, { name, design, at });
    set((s) => ({ sets: listSettingsSets(s.storage) }));
    const db = await saveSettingsSetDb(name, design);
    if (db.ok) await get().syncFromDb();
    return { ...result, source: db.ok ? 'db' : 'local', error: db.error };
  },

  /** Read the list from the table, where there is one. Never throws. */
  syncFromDb: async () => {
    const { rows, source } = await listSettingsSetsDb();
    if (source !== 'db') return { source: 'local' };
    set({ sets: rows, source: 'db' });
    return { source: 'db' };
  },

  /** The stored design of one set, or null. */
  load: (id) => loadSettingsSet(get().storage, id),

  /** That set's settings, on top of this project's design. */
  applyTo: (design, id) => {
    const found = loadSettingsSet(get().storage, id);
    return found ? applySettingsSet(design, found) : null;
  },

  rename: (id, name) => {
    const ok = renameSettingsSet(get().storage, id, name);
    if (ok) set((s) => ({ sets: listSettingsSets(s.storage) }));
    return ok;
  },

  /**
   * That set's settings, wherever it lives (T44 F8). The local shelf answers
   * first because it is the one that always exists; a set that only the table
   * knows about is fetched. Null when neither has it — the surface then says
   * the set is gone rather than applying nothing and looking broken.
   */
  applyToAsync: async (design, id) => {
    const local = loadSettingsSet(get().storage, id);
    if (local) return applySettingsSet(design, local);
    const { design: remote } = await loadSettingsSetDb(id);
    return remote ? applySettingsSet(design, { design: remote }) : null;
  },

  remove: (id) => {
    const ok = deleteSettingsSet(get().storage, id);
    if (ok) set((s) => ({ sets: listSettingsSets(s.storage) }));
    // The table gets the same instruction, and its answer changes nothing on
    // screen: the row is already off the list either way.
    deleteSettingsSetDb(id);
    return ok;
  },
}));
