import { create } from 'zustand';
import { browserStorage } from '../lib/projectLibrary.js';
import {
  deleteTemplate, listTemplates, renameTemplate, saveTemplate,
} from '../lib/templates.js';

// ─── Saved sets (BACKLOG #30) ───
// The store is a thin shell over lib/templates.js: the RULES are pure functions
// over a storage object (testable in node), and this is only the subscription
// the Library panel and the context menu read.
//
// The local shelf always — it is what makes mock mode a working app rather than
// a demo (CLAUDE.md rule 7). Supabase is the real home when it is configured;
// sql/003_tura5.sql is the table, as a file.

export const useTemplateStore = create((set, get) => ({
  storage: browserStorage(),
  templates: listTemplates(browserStorage()),

  /** Re-read the shelf (another tab, or a storage swapped in by a test). */
  refresh: () => set((s) => ({ templates: listTemplates(s.storage) })),

  /** Point the store at a different storage — used by the tests. */
  useStorage: (storage) => set({ storage, templates: listTemplates(storage) }),

  /**
   * Save a configured unit as a saved set.
   * @returns {{template:object|null, error:string|null, replaced?:boolean}}
   */
  save: (unit, name, at = Date.now()) => {
    const result = saveTemplate(get().storage, { unit, name, at });
    if (result.template) set((s) => ({ templates: listTemplates(s.storage) }));
    return result;
  },

  rename: (id, name) => {
    const result = renameTemplate(get().storage, id, name);
    if (result.ok) set((s) => ({ templates: listTemplates(s.storage) }));
    return result;
  },

  remove: (id) => {
    const ok = deleteTemplate(get().storage, id);
    if (ok) set((s) => ({ templates: listTemplates(s.storage) }));
    return ok;
  },
}));
