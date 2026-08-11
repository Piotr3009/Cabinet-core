import { create } from 'zustand';

import * as cloud from '../lib/cloudSync.js';
import { isMockMode } from '../lib/supabase.js';
import { getCabinetProfile } from '../engine/profile.js';
import {
  DEFAULT_COMPANY_DEFAULTS, hasCompanyDefaults, setCompanyDefaults, validateCompanyDefaults,
} from '../engine/companyDefaults.js';

// ─── THE COMPANY'S DEFAULTS, AS STATE (turn 22, CLAUDE.md F2b.2) ────────────
//
// "A 'Company defaults' screen under the Database menu: read, edit, save the
// row. Graceful without a session: the screen says defaults need an account,
// and the app runs on profile numbers as ever."
//
// Every one of those three states is here rather than in the component, so the
// screen is only a form:
//
//   mock      no keys at all — this build has no database
//   signed    a session, and therefore a row to read and write
//   anonymous keys but nobody signed in — the row belongs to somebody
//
// The ENGINE is told about the row (`setCompanyDefaults`) the moment it lands
// and the moment it is cleared, because the cascade lives there and reads it
// through `companyDefaults()`. That is the same hand-off `lib/
// hardwareCatalogue.js` makes for the hinge catalogue: the store owns the
// fetching, the engine owns the rule.

export const useCompanyDefaultsStore = create((set, get) => ({
  /** The validated row, or null for "the workshop has not said". */
  defaults: null,
  /** What the last validation refused, so the screen can say why. */
  rejected: [],
  loaded: false,
  busy: false,
  error: null,
  saved: false,
  mock: isMockMode,

  /** Read the row. Safe to call with no session: it comes back null. */
  load: async () => {
    if (isMockMode) { set({ loaded: true, mock: true }); return null; }
    set({ busy: true, error: null });
    const { defaults, error } = await cloud.loadCompanyDefaults();
    const { value, rejected } = validateCompanyDefaults(defaults, getCabinetProfile());
    const row = hasCompanyDefaults(value) ? value : null;
    setCompanyDefaults(row, getCabinetProfile());
    set({
      defaults: row, rejected, loaded: true, busy: false, error: error ? error.message : null,
    });
    return row;
  },

  /**
   * Edit one field, locally. Validated on every keystroke rather than on save,
   * so a rule-owned key is refused where it is typed rather than three clicks
   * later — which is the difference between a validator and a rejection notice.
   */
  set: (patch) => {
    const merged = { ...(get().defaults || DEFAULT_COMPANY_DEFAULTS), ...patch };
    const { value, rejected } = validateCompanyDefaults(merged, getCabinetProfile());
    const row = hasCompanyDefaults(value) ? value : null;
    setCompanyDefaults(row, getCabinetProfile());
    set({ defaults: row, rejected, saved: false });
    return { value: row, rejected };
  },

  /** Write it. Refused without a session, and says so. */
  save: async () => {
    const row = get().defaults || DEFAULT_COMPANY_DEFAULTS;
    set({ busy: true, error: null, saved: false });
    const { saved, error } = await cloud.saveCompanyDefaults(row);
    set({ busy: false, saved, error: error ? error.message : null });
    return saved;
  },

  /** Signing out takes the row with it — it belonged to that account. */
  forget: () => {
    setCompanyDefaults(null, getCabinetProfile());
    set({
      defaults: null, rejected: [], loaded: false, saved: false, error: null,
    });
  },
}));
