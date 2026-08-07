import { create } from 'zustand';
import { browserStorage } from '../lib/projectLibrary.js';
import {
  applySettingsSet, deleteSettingsSet, listSettingsSets, loadSettingsSet,
  renameSettingsSet, saveSettingsSet,
} from '../lib/settingsSets.js';

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

  /** Re-read the shelf (another tab, or a storage swapped in by a test). */
  refresh: () => set((s) => ({ sets: listSettingsSets(s.storage) })),

  /** Point the store at a different storage — used by the tests. */
  useStorage: (storage) => set({ storage, sets: listSettingsSets(storage) }),

  /** @returns {{set:object, replaced:boolean}} */
  save: (name, design, at = Date.now()) => {
    const result = saveSettingsSet(get().storage, { name, design, at });
    set((s) => ({ sets: listSettingsSets(s.storage) }));
    return result;
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

  remove: (id) => {
    const ok = deleteSettingsSet(get().storage, id);
    if (ok) set((s) => ({ sets: listSettingsSets(s.storage) }));
    return ok;
  },
}));
