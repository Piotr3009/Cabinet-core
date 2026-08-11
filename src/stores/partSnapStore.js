import { create } from 'zustand';
import { ALL_SNAPS_ON, SNAP_KINDS } from '../engine/partSnap.js';

// ─── WHICH SNAPS ARE ON, PER USER (turn 24, CLAUDE.md F2.3) ─────────────────
//
// "A checkbox panel under the sheet (as in the mock) toggles each, persisted
// per user."
//
// It is a MODE, not a moment — the joiner has said how he wants the pencil to
// behave, and nothing but him saying otherwise should change it. That is the
// same distinction `uiStore`'s X-ray and hinge flags are drawn on, and the same
// storage: `localStorage`, guarded, with the defaults standing where a browser
// refuses to remember (private mode, a full quota).
//
// The KEY is versioned for the reason `uiStore` versions its own: the day a new
// kind is added, a browser that remembered the seven it knew about must get one
// chance to see the eighth rather than having it silently off forever.

const KEY = 'cc.partSnaps.v1';

/** Only the eight kinds, only booleans — a stored blob cannot invent a snap. */
function normalise(raw) {
  const out = { ...ALL_SNAPS_ON };
  if (!raw || typeof raw !== 'object') return out;
  for (const kind of SNAP_KINDS) {
    if (typeof raw[kind.id] === 'boolean') out[kind.id] = raw[kind.id];
  }
  return out;
}

function load() {
  try {
    return normalise(JSON.parse(localStorage.getItem(KEY) || 'null'));
  } catch {
    return { ...ALL_SNAPS_ON };
  }
}

function save(value) {
  try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* private mode */ }
  return value;
}

export const usePartSnapStore = create((set, get) => ({
  enabled: typeof localStorage !== 'undefined' ? load() : { ...ALL_SNAPS_ON },

  /** One checkbox. */
  toggle: (kind) => set((s) => {
    if (!SNAP_KINDS.some((k) => k.id === kind)) return {};
    return { enabled: save({ ...s.enabled, [kind]: !s.enabled[kind] }) };
  }),

  /** …and the two buttons beside them, because eight checkboxes need them. */
  setAll: (on) => set(() => ({
    enabled: save(Object.fromEntries(SNAP_KINDS.map((k) => [k.id, Boolean(on)]))),
  })),

  /** For the tests, and for a browser that has been cleared under the app. */
  reset: () => set(() => ({ enabled: save({ ...ALL_SNAPS_ON }) })),

  /** Is this kind on? One reader, so no component asks the object directly. */
  isOn: (kind) => get().enabled[kind] !== false,
}));
