import { create } from 'zustand';
import { DEFAULT_CABINET_PROFILE } from '../engine/profile.js';

// ─── UI state ───
// Panel geometry, selection and the editor's snap step. Nothing here is
// persisted to the database — it is pure view state.

const SNAP_KEY = 'cc.snapStep';

function loadSnap() {
  try {
    const v = Number(localStorage.getItem(SNAP_KEY));
    return DEFAULT_CABINET_PROFILE.editor.snapSteps.includes(v) ? v : DEFAULT_CABINET_PROFILE.editor.defaultSnap;
  } catch {
    return DEFAULT_CABINET_PROFILE.editor.defaultSnap;
  }
}

export const useUiStore = create((set, get) => ({
  // Floating Library panel (grab & move — SPEC 4.1)
  libraryPos: { x: 24, y: 88 },
  setLibraryPos: (pos) => set({ libraryPos: pos }),

  // Right parameter panel — closes itself once doors are added (SPEC 4.10)
  rightPanelOpen: true,
  openRightPanel: () => set({ rightPanelOpen: true }),
  closeRightPanel: () => set({ rightPanelOpen: false }),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),

  // BOM panel — computed live, shown on demand (SPEC 4.11)
  bomOpen: false,
  setBomOpen: (v) => set({ bomOpen: v }),

  // Canvas view: the 3D room, or the flat CNC sheet of the selected unit.
  // Both read the SAME engine output — the toggle changes nothing but the way
  // it is drawn, so a parameter edited in 3D is already correct in CNC.
  viewMode: '3d',                    // '3d' | 'cnc'
  setViewMode: (mode) => set({ viewMode: mode === 'cnc' ? 'cnc' : '3d' }),

  // Modals
  modal: null,                       // 'add-items' | 'room' | 'auth' | 'materials' | null
  openModal: (name) => set({ modal: name }),
  closeModal: () => set({ modal: null }),

  // Selection: which unit and which of its sections is highlighted
  selectedUnitId: null,
  selectedSection: null,
  selectUnit: (id) => set({ selectedUnitId: id, selectedSection: id ? 0 : null, rightPanelOpen: Boolean(id) }),
  clearSelection: () => set({ selectedUnitId: null, selectedSection: null }),

  // Shelf being dragged in 3D — drives the live dimension readout
  dragging: null,                    // { unitId, itemId, pos_mm, above, below }
  setDragging: (d) => set({ dragging: d }),

  // Right-click menu on an item in the canvas. `actions` is built by the
  // caller, so a new action is a list entry, not a new menu.
  contextMenu: null,                 // { x, y, unitId, panelId, actions: [{id,label,run}] }
  openContextMenu: (menu) => set({ contextMenu: menu }),
  closeContextMenu: () => set({ contextMenu: null }),

  // "Look at THIS" — a double click asks the camera to fly to a point in the
  // scene rather than to the middle of the room (CLAUDE.md phase 5).
  focusRequest: null,                // { target: [x,y,z], radius, at }
  focusOn: (target, radius) => set({ focusRequest: { target, radius, at: Date.now() } }),
  clearFocus: () => set({ focusRequest: null }),

  // Which fronts are open, and how far (0 = shut, 1 = fully open). Purely
  // visual: nothing here reaches the engine, the BOM or the CNC sheet.
  openFronts: {},                    // { [unitId]: { [panelId]: 0..1 } }
  toggleFront: (unitId, panelId) => set((s) => {
    const unit = s.openFronts[unitId] || {};
    const next = (unit[panelId] ?? 0) > 0.5 ? 0 : 1;
    return { openFronts: { ...s.openFronts, [unitId]: { ...unit, [panelId]: next } } };
  }),
  closeAllFronts: (unitId) => set((s) => {
    if (!unitId) return { openFronts: {} };
    const { [unitId]: _dropped, ...rest } = s.openFronts;
    return { openFronts: rest };
  }),

  // Snap step: 1 mm default, 0.5 mm and the 32 mm system as options (SPEC 4.8)
  snapStep: loadSnap(),
  setSnapStep: (step) => {
    try { localStorage.setItem(SNAP_KEY, String(step)); } catch { /* private mode */ }
    set({ snapStep: step });
  },

  // Transient toast messages (validation feedback)
  toast: null,
  notify: (message, tone = 'info') => {
    set({ toast: { message, tone, at: Date.now() } });
    setTimeout(() => {
      if (Date.now() - (get().toast?.at ?? 0) >= 3800) set({ toast: null });
    }, 4000);
  },
  dismissToast: () => set({ toast: null }),
}));
