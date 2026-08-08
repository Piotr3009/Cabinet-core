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
  // Which screen the app is on (turn 4, BACKLOG #7). The canvas is reached
  // THROUGH a project — start screen first, always.
  screen: 'start',                   // 'start' | 'editor'
  openEditor: () => set({ screen: 'editor' }),
  goToStart: () => set({ screen: 'start', selectedUnitId: null, selectedSection: null, bomOpen: false }),

  // Floating Library panel (grab & move — SPEC 4.1). Turn 4: it is opened from
  // the Library MENU, one category at a time, and it has an X (BACKLOG #9).
  libraryPos: { x: 24, y: 96 },
  setLibraryPos: (pos) => set({ libraryPos: pos }),
  libraryCategory: null,             // null = the panel is closed
  setLibraryCategory: (id) => set({ libraryCategory: id || null, libraryInsert: null }),
  closeLibrary: () => set({ libraryCategory: null, libraryInsert: null }),

  // ─── Insert mode (turn 9, CLAUDE.md F2) ───
  // The library was opened by a "+" at the end of a run rather than from the
  // menu, so the PLACE is already decided and the only question left is which
  // type goes there. It is carried in exactly the shape `projectStore.addUnit`
  // takes — `{ near, side }` — because the insertion itself is turn 8's and is
  // not being rewritten: this phase changes the trigger, not the mechanics.
  //
  // Cleared whenever the panel is closed or a category is chosen from the menu,
  // so a place picked on the canvas can never outlive the click that picked it.
  libraryInsert: null,               // { near: unitId, side: 'left' | 'right' }
  openLibraryToInsert: (categoryId, at) => set({
    libraryCategory: categoryId || null,
    libraryInsert: at?.near ? { near: at.near, side: at.side === 'left' ? 'left' : 'right' } : null,
  }),
  clearLibraryInsert: () => set({ libraryInsert: null }),

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

  // Dimensions on the 3D canvas: each unit's own W/H/D captions AND the
  // distance arrows between units and to the walls (CLAUDE.md phase 8). One
  // switch, because they are one thing to Piotr: "show me the numbers".
  showDimensions: true,
  setShowDimensions: (v) => set({ showDimensions: Boolean(v) }),
  toggleDimensions: () => set((s) => ({ showDimensions: !s.showDimensions })),

  // ─── One cabinet's OWN dimensions (turn 8, CLAUDE.md F7) ───
  // `showDimensions` above is the project's: each unit's W/H/D caption and the
  // distances between them. This is the other question a joiner asks, about one
  // cabinet at a time — "what are all the numbers on THIS" — and the answer is
  // too much to leave on for a whole kitchen. Per unit, toggled from the
  // right-click menu, and view state like everything else here.
  unitDimensions: {},                // { [unitId]: true }
  toggleUnitDimensions: (unitId) => set((s) => {
    if (!unitId) return {};
    const { [unitId]: on, ...rest } = s.unitDimensions;
    return { unitDimensions: on ? rest : { ...rest, [unitId]: true } };
  }),
  clearUnitDimensions: () => set({ unitDimensions: {} }),

  // Which ink the distance dimensions are drawn in (turn 5, BACKLOG #34).
  // A drawing office uses one or the other; the hexes themselves live in
  // profile.dimensions.colours, so this is only WHICH, never what.
  dimensionColour: 'navy',           // 'navy' | 'red'
  setDimensionColour: (key) => set({ dimensionColour: key === 'red' ? 'red' : 'navy' }),

  // Thin black contours on every piece — ON by default (turn 4, BACKLOG #5).
  showOutlines: true,
  setShowOutlines: (v) => set({ showOutlines: Boolean(v) }),
  toggleOutlines: () => set((s) => ({ showOutlines: !s.showOutlines })),

  // Realistic lighting in the WORKING view (turn 6): the environment probe the
  // sheen comes from. On by default — it is most of what turn 6 is for.
  //
  // It is switchable because it is the one part of the lifting that is not
  // free: the probe is sampled for every lit pixel of every panel, and on a
  // machine with no GPU worth the name that is felt. A render is unaffected —
  // it turns the lighting back on for the still whatever this says.
  //
  // ─── Turn 9 (CLAUDE.md F1.3) ───
  // It used to switch the CONTACT SHADOWS off with the probe, and it no longer
  // does. The shadow is one blob for the whole run now, baked once per layout
  // change and free to look at afterwards (3d/Scene.jsx FloorShadow) — so the
  // performance reason this toggle exists stopped applying to it, and a joiner
  // who turns the probe down to keep an old laptop moving keeps his furniture
  // standing on the floor.
  realisticLighting: true,
  setRealisticLighting: (v) => set({ realisticLighting: Boolean(v) }),
  toggleRealisticLighting: () => set((s) => ({ realisticLighting: !s.realisticLighting })),

  // X-ray (turn 7, CLAUDE.md F3 / BACKLOG #42): look THROUGH the furniture. The
  // board goes translucent, the contours stay, and the hardware the workshop
  // has to buy appears where it is fitted. A way of LOOKING at the project —
  // nothing here reaches the engine, the BOM or the CNC sheet.
  xray: false,
  setXray: (v) => set({ xray: Boolean(v) }),
  toggleXray: () => set((s) => ({ xray: !s.xray })),

  // Contour view (BACKLOG #18): a presentation mode for a render or a printed
  // screen — materials fade away, the contours stay. Nothing here reaches the
  // BOM; it is a way of LOOKING at the same project.
  contourView: false,
  setContourView: (v) => set({ contourView: Boolean(v) }),
  toggleContourView: () => set((s) => ({ contourView: !s.contourView })),

  // Which sections of the right panel are open (turn 4, BACKLOG #10). There are
  // a lot of them now, so everything collapses — and the choice is remembered
  // across units, because a workshop tends to work on one thing at a time.
  panelOpen: { carcass: true, add: false, contents: true, construction: false, doors: true },
  togglePanelSection: (id) => set((s) => ({ panelOpen: { ...s.panelOpen, [id]: !s.panelOpen[id] } })),
  setPanelSection: (id, open) => set((s) => ({ panelOpen: { ...s.panelOpen, [id]: Boolean(open) } })),

  // Which "Add items" type has its settings open. One at a time: they are
  // alternatives, not a form to fill in top to bottom.
  addItemKind: null,                 // 'drawers' | 'shelves' | 'hanger' | null
  setAddItemKind: (kind) => set((s) => ({ addItemKind: s.addItemKind === kind ? null : kind })),

  // Modals. `modalArgs` is what the modal is ABOUT — which unit is being saved
  // as a template, for instance — so a modal needs no store of its own.
  // 'room' | 'auth' | 'design' | 'save-as' | 'save-template' | 'render' | 'drawing'
  modal: null,
  modalArgs: null,
  openModal: (name, args = null) => set({ modal: name, modalArgs: args }),
  closeModal: () => set({ modal: null, modalArgs: null }),

  // Selection: which unit and which of its sections is highlighted
  selectedUnitId: null,
  selectedSection: null,
  selectUnit: (id) => set({
    selectedUnitId: id,
    selectedSection: id ? 0 : null,
    rightPanelOpen: Boolean(id),
    // Selecting a DIFFERENT cabinet drops whatever was selected inside the old
    // one — an element belongs to its unit and cannot outlive the selection of
    // it. Re-selecting the SAME unit leaves the element alone, which is what
    // makes clicking a shelf that is already selected a no-op rather than a
    // reset (turn 9, CLAUDE.md F4.1).
    ...(id === get().selectedUnitId ? {} : { selectedElement: null }),
  }),
  clearSelection: () => set({ selectedUnitId: null, selectedSection: null, selectedElement: null }),

  // ─── One ELEMENT inside a unit (turn 9, CLAUDE.md F4.1) ───
  // Until now the smallest thing that could be selected was a whole cabinet, so
  // nothing inside one was individually editable — a shelf was a row in a list
  // and nothing else. This is the selection a joiner means when he points at a
  // shelf: `{ unitId, elementRef }`, where the ref is the ENGINE's own panel id
  // (`SHELF-2`), because that is the id the 3D view draws, the BOM prints and
  // the CNC sheet lays out. Nothing new to keep in step.
  //
  // Cleared by clicking elsewhere or by Escape, exactly as a unit selection is.
  selectedElement: null,             // { unitId, elementRef } | null
  selectElement: (unitId, elementRef) => set({
    selectedUnitId: unitId,
    selectedSection: 0,
    rightPanelOpen: true,
    selectedElement: unitId && elementRef ? { unitId, elementRef } : null,
  }),
  clearElement: () => set({ selectedElement: null }),

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
  /**
   * Open a set of fronts at once — used when internal drawers are added, so the
   * doors swing out of the way and the drawers you just asked for are visible
   * (turn 4, BACKLOG #13). Purely visual, like every other front animation.
   */
  openFrontsFor: (unitId, panelIds) => set((s) => {
    if (!unitId || !panelIds?.length) return {};
    const unit = { ...(s.openFronts[unitId] || {}) };
    for (const id of panelIds) unit[id] = 1;
    return { openFronts: { ...s.openFronts, [unitId]: unit } };
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
