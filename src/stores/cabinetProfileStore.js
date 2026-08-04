import { create } from 'zustand';
import {
  DEFAULT_CABINET_PROFILE, migrateCabinetProfile, setActiveCabinetProfile, getCabinetProfile,
} from '../engine/profile.js';

// ─── Workshop profile store ───
// Owns the persisted profile and pushes it into the engine's single read point.
// The engine itself never imports this file (plain-function rule).

const KEY = 'cc.profile.v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrateCabinetProfile(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

const initial = typeof localStorage !== 'undefined' ? load() : null;
setActiveCabinetProfile(initial);

export const useCabinetProfileStore = create((set) => ({
  profile: initial || DEFAULT_CABINET_PROFILE,

  setProfile: (profile) => {
    const migrated = migrateCabinetProfile(profile) || DEFAULT_CABINET_PROFILE;
    setActiveCabinetProfile(migrated);
    try { localStorage.setItem(KEY, JSON.stringify(migrated)); } catch { /* private mode */ }
    set({ profile: migrated });
  },

  resetProfile: () => {
    setActiveCabinetProfile(null);
    try { localStorage.removeItem(KEY); } catch { /* private mode */ }
    set({ profile: DEFAULT_CABINET_PROFILE });
  },

  current: () => getCabinetProfile(),
}));
