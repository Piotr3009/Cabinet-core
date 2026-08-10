import { create } from 'zustand';
import { DEFAULT_CABINET_PROFILE } from '../engine/profile.js';
import { applySelection, primaryOf } from '../lib/selection.js';

// ─── UI state ───
// Panel geometry, selection and the editor's snap step. Nothing here is
// persisted to the database — it is pure view state.

const SNAP_KEY = 'cc.snapStep';
const XRAY_KEY = 'cc.xray';
// ─── Turn 13 (CLAUDE.md F7) ───
// The key is VERSIONED, and that is the other half of "still X-ray-only in
// practice". The default has said `true` since turn 11, but the flag is
// REMEMBERED — so a browser that switched it off once during turn 11 or 12
// testing kept it off through every reload since, and no change to the default
// could ever reach it. Bumping the key is how a new default gets one chance to
// be seen: the old value is not read, the toggle works exactly as before from
// there on, and nobody has to clear site data to see the fix they asked for.
const HINGES_KEY = 'cc.showHinges.v2';

function loadSnap() {
  try {
    const v = Number(localStorage.getItem(SNAP_KEY));
    return DEFAULT_CABINET_PROFILE.editor.snapSteps.includes(v) ? v : DEFAULT_CABINET_PROFILE.editor.defaultSnap;
  } catch {
    return DEFAULT_CABINET_PROFILE.editor.defaultSnap;
  }
}

/**
 * A remembered on/off (turn 11, CLAUDE.md F1.3).
 *
 * Everything else in this store is a MOMENT — what is selected, what is being
 * dragged, which panel is open — and is deliberately not persisted. A MODE is
 * the other kind of thing: the joiner has said how he wants to look at the job,
 * and nothing but him saying otherwise should change it. Private mode and a
 * full quota are survivable; the default stands.
 */
function loadFlag(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : raw === '1';
  } catch {
    return fallback;
  }
}

/** Writes and returns the value, so a setter can be one expression. */
function saveFlag(key, value) {
  try { localStorage.setItem(key, value ? '1' : '0'); } catch { /* private mode */ }
  return value;
}

export const useUiStore = create((set, get) => ({
  // Which screen the app is on (turn 4, BACKLOG #7). The canvas is reached
  // THROUGH a project — start screen first, always.
  screen: 'start',                   // 'start' | 'editor'
  openEditor: () => set({ screen: 'editor' }),
  goToStart: () => set({
    screen: 'start', selectedUnitId: null, selectedUnitIds: [], selectedSection: null, bomOpen: false,
  }),

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

  // ─── What is on the CNC sheet (turn 11, CLAUDE.md F8.1) ───
  //
  // The sheet shows the WHOLE PROJECT now, grouped per unit, and these are the
  // ticks that take a unit — or one part of one — off it. VIEW STATE and
  // nothing else: not in the project, not in the database, gone on a reload.
  //
  // Stored as "what is HIDDEN" rather than "what is shown", and that is the same
  // decision the CNC panel has made since turn 3 for the same reason: a part
  // that appears because a drawer was added should arrive TICKED. Track what is
  // shown and every new part is invisible until somebody notices.
  cncHiddenUnits: {},                // { [unitId]: true }
  cncHiddenParts: {},                // { [unitId]: { [panelId]: true } }
  // ─── Which VIEW the sheet is drawn in (turn 15, CLAUDE.md F9) ───
  // 'material' — one section per assigned board, left→right
  // 'cabinet'  — a square per carcass, run parts in a group of their own
  // It is a way of LOOKING at the sheet, not a property of the project, so it
  // lives here with the other view state and reaches nothing that is exported.
  cncView: 'material',
  setCncView: (id) => set({ cncView: id === 'cabinet' ? 'cabinet' : 'material' }),

  // ─── The settings SAVE, as a state (turn 16, CLAUDE.md F5) ────────────────
  //
  // What was saved, per section — a snapshot of that section's own data
  // (engine/projectSettings.js `settingsSectionSnapshot`), not a boolean. The
  // difference is the whole phase: a boolean is reset by any re-render and by
  // closing the panel, which is why turn 15's green tick "shows for a moment".
  // A snapshot is compared, so the button stays green until something actually
  // changes and goes red the moment it does.
  //
  // It lives HERE and not in the component for one reason: closing Settings
  // unmounts the component. It is view state and not project state — a saved
  // section is a fact about this session's editing, not about the kitchen — so
  // it goes with the rest of the view state and reaches nothing that is
  // exported.
  settingsSaved: {},                 // { [section]: snapshot string }
  markSettingsSaved: (section, snapshot) => set((s) => ({
    settingsSaved: { ...s.settingsSaved, [section]: snapshot },
  })),
  // A different project is a different set of answers: what was saved about the
  // last one says nothing about this one.
  resetSettingsSaved: () => set({ settingsSaved: {} }),
  toggleCncUnit: (unitId) => set((s) => {
    const { [unitId]: on, ...rest } = s.cncHiddenUnits;
    return { cncHiddenUnits: on ? rest : { ...rest, [unitId]: true } };
  }),
  toggleCncPart: (unitId, panelId) => set((s) => {
    const mine = s.cncHiddenParts[unitId] || {};
    const { [panelId]: on, ...rest } = mine;
    const next = on ? rest : { ...rest, [panelId]: true };
    return {
      cncHiddenParts: Object.keys(next).length
        ? { ...s.cncHiddenParts, [unitId]: next }
        : Object.fromEntries(Object.entries(s.cncHiddenParts).filter(([id]) => id !== unitId)),
    };
  }),
  /** A whole group of parts at once — a preset, or a group header. */
  setCncParts: (unitId, panelIds, shown) => set((s) => {
    const next = { ...(s.cncHiddenParts[unitId] || {}) };
    for (const id of panelIds) {
      if (shown) delete next[id];
      else next[id] = true;
    }
    return {
      cncHiddenParts: Object.keys(next).length
        ? { ...s.cncHiddenParts, [unitId]: next }
        : Object.fromEntries(Object.entries(s.cncHiddenParts).filter(([id]) => id !== unitId)),
    };
  }),
  resetCncVisibility: () => set({ cncHiddenUnits: {}, cncHiddenParts: {} }),

  // Canvas view: the 3D room, or the flat CNC sheet of the selected unit.
  // Both read the SAME engine output — the toggle changes nothing but the way
  // it is drawn, so a parameter edited in 3D is already correct in CNC.
  //
  // ─── Turn 11 (CLAUDE.md F8.2): THE PANELS STAY OPEN ───
  // Switching to CNC closes nothing — not the Library, not the parameter panel.
  // It OPENS the right-hand one, because in CNC that panel is the checkbox tree
  // (components/CncTree.jsx) and a tool you have to go and find is a tool you do
  // not use. The Library is left exactly as it was: a joiner who was halfway
  // through picking a cabinet has not stopped being halfway through it.
  viewMode: '3d',                    // '3d' | 'cnc'
  setViewMode: (mode) => set((s) => (mode === 'cnc'
    ? { viewMode: 'cnc', rightPanelOpen: true, bomOpen: false }
    : { viewMode: '3d', rightPanelOpen: s.rightPanelOpen })),

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

  // Which ink the dimensions are drawn in (turn 5, BACKLOG #34).
  // A drawing office uses one or the other; the hexes themselves live in
  // profile.dimensions.colours, so this is only WHICH, never what.
  //
  // ─── Turn 11 (CLAUDE.md F1.5) ───
  // RED by default now, on the owner's verdict, and the default is READ FROM
  // THE PROFILE (`appearance.dimensions.colour`) rather than written here — a
  // workshop that prefers navy changes one line in profile.js and every new
  // session starts there. `alt` beside it is the other one on the menu.
  dimensionColour: DEFAULT_CABINET_PROFILE.appearance.dimensions.colour,
  setDimensionColour: (key) => set((s) => ({
    dimensionColour: Object.hasOwn(DEFAULT_CABINET_PROFILE.dimensions.colours, key)
      ? key
      : s.dimensionColour,
  })),

  // Thin black contours on every piece — ON by default (turn 4, BACKLOG #5).
  showOutlines: true,
  setShowOutlines: (v) => set({ showOutlines: Boolean(v) }),
  toggleOutlines: () => set((s) => ({ showOutlines: !s.showOutlines })),

  // ─── HIDE FRONTS (turn 18, CLAUDE.md F4 / BACKLOG W22) ────────────────────
  //
  // Doors AND drawer fronts out of the 3D view together, so you can see what is
  // inside a run without opening fourteen doors one at a time.
  //
  // IT IS A LENS, NOT AN EDIT, and the distinction is the whole phase. "Remove
  // doors" (turn 15) is a PROJECT DECISION: it takes the fronts out of the
  // params, and with them out of the BOM, the cut list and the CNC sheet. This
  // touches none of those — nothing here reaches the engine, and a project
  // saved with it on is a project with all its doors.
  //
  // Deliberately NOT persisted, unlike X-ray beside it. X-ray is unmistakable —
  // the board goes translucent — so a session that starts in it explains
  // itself. A cabinet with no fronts looks exactly like a cabinet whose fronts
  // were REMOVED, which is the one thing this must never be mistaken for, so it
  // starts off every time and the toolbar button is lit while it is on.
  hideFronts: false,
  setHideFronts: (v) => set({ hideFronts: Boolean(v) }),
  toggleHideFronts: () => set((s) => ({ hideFronts: !s.hideFronts })),

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
  //
  // ─── TURN 11 (CLAUDE.md F1.3): IT IS A MODE ───
  // Piotr: "X-ray is a MODE, not a moment" — once it is on it has to survive a
  // unit drag, an orbit, a selection change, everything, until it is turned
  // off. Two things were wrong and they are at opposite ends of the app.
  //
  //   • THE STATE was never persisted, so anything that reloaded the tab — and,
  //     in a workshop, that includes the browser deciding to — put it back to
  //     false with nothing said. A mode that forgets itself is a moment. It is
  //     kept on the same shelf as the snap step now, which is the other setting
  //     in this file that is a way of WORKING rather than a piece of the
  //     project.
  //   • THE PICTURE came back solid after a redraw even while this flag was
  //     still true: the material's `transparent` was being flipped on a
  //     material three had already compiled a program for. That half is fixed
  //     where it is caused, in 3d/UnitView.jsx, by keying the material on its
  //     translucency — see the note there.
  xray: loadFlag(XRAY_KEY, false),
  setXray: (v) => set({ xray: saveFlag(XRAY_KEY, Boolean(v)) }),
  toggleXray: () => set((s) => ({ xray: saveFlag(XRAY_KEY, !s.xray) })),

  // ─── The hinges, in Solid (turn 11, CLAUDE.md F3.5; turn 13, F7) ───
  // A MODE like X-ray beside it, and remembered for the same reason: a joiner
  // who wants to see the ironmongery on his cabinets wants to see it tomorrow
  // too.
  //
  // The DEFAULT is the profile's (turn 13, F7): workshop configuration, like
  // every other appearance answer, rather than a `true` in a view store. It is
  // on, and the owner's verdict is that the toggle now exists to HIDE.
  showHinges: loadFlag(HINGES_KEY, DEFAULT_CABINET_PROFILE.appearance.hardware.showInSolid !== false),
  setShowHinges: (v) => set({ showHinges: saveFlag(HINGES_KEY, Boolean(v)) }),
  toggleHinges: () => set((s) => ({ showHinges: saveFlag(HINGES_KEY, !s.showHinges) })),

  // Contour view (BACKLOG #18): a presentation mode for a render or a printed
  // screen — materials fade away, the contours stay. Nothing here reaches the
  // BOM; it is a way of LOOKING at the same project.
  // ─── THE RULER (turn 17, CLAUDE.md F11) ────────────────────────────────
  //
  // Click one point, click another, read the distance. Two points and no more:
  // a third click starts a fresh measurement, which is what a tape does when
  // you move it. It is VIEW state and nothing else — the project never hears
  // about it — because "it measures; it never edits".
  rulerOn: false,
  rulerPoints: [],                   // [[x,y,z] mm] — at most two
  setRuler: (v) => set({ rulerOn: Boolean(v), rulerPoints: [] }),
  toggleRuler: () => set((s) => ({ rulerOn: !s.rulerOn, rulerPoints: [] })),
  addRulerPoint: (p) => set((s) => ({
    rulerPoints: s.rulerPoints.length >= 2 ? [p] : [...s.rulerPoints, p],
  })),
  clearRuler: () => set({ rulerPoints: [] }),

  contourView: false,
  setContourView: (v) => set({ contourView: Boolean(v) }),
  toggleContourView: () => set((s) => ({ contourView: !s.contourView })),

  // Which sections of the right panel are open (turn 4, BACKLOG #10). There are
  // a lot of them now, so everything collapses — and the choice is remembered
  // across units, because a workshop tends to work on one thing at a time.
  //
  // ─── Turn 15 (CLAUDE.md F1.4): CLOSED BY DEFAULT ───
  // Three of the five opened themselves, which on a 310 px column meant the
  // panel arrived already too long to read and the owner could not see where
  // one section ended. Everything starts shut; opening one is one click and the
  // one you open is the one that lights up (components/Section.jsx). Remembered
  // for the SESSION only — this store is deliberately never persisted (see the
  // note at the top of the file), so a fresh tab starts tidy again.
  panelOpen: {
    carcass: false, add: false, contents: false, construction: false, doors: false,
  },
  togglePanelSection: (id) => set((s) => ({ panelOpen: { ...s.panelOpen, [id]: !s.panelOpen[id] } })),
  setPanelSection: (id, open) => set((s) => ({ panelOpen: { ...s.panelOpen, [id]: Boolean(open) } })),

  // ─── Which BAY is being pointed at (turn 12, CLAUDE.md F5.3) ───
  // "the zones left/right of the partition highlight, the user clicks one".
  // A moment, not a mode: it lives exactly as long as the pointer is over the
  // choice, so it belongs here with the drag and the hover and nowhere else.
  zoneHint: null,                    // the bay's index, or null
  setZoneHint: (index) => set({ zoneHint: index == null ? null : Math.trunc(Number(index)) }),

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
  // ─── Turn 13 (CLAUDE.md F5.1): MORE THAN ONE ───
  // The SET, of which `selectedUnitId` is the last entry — the PRIMARY, the one
  // the hand is on and the one every single-unit panel in the app is about. The
  // two are written together and never separately, so nothing that reads
  // `selectedUnitId` (which is most of the app) had to learn anything new.
  selectedUnitIds: [],
  /**
   * @param {string|null} id
   * @param {object} opts  { additive } — Ctrl (or ⌘) held, F5.1
   */
  selectUnit: (id, { additive = false } = {}) => {
    const next = applySelection(get().selectedUnitIds, id, additive);
    const primary = primaryOf(next);
    return set({
      selectedUnitIds: next,
      selectedUnitId: primary,
      selectedSection: primary ? 0 : null,
      rightPanelOpen: next.length > 0,
      // Selecting a DIFFERENT cabinet drops whatever was selected inside the old
      // one — an element belongs to its unit and cannot outlive the selection of
      // it. Re-selecting the SAME unit leaves the element alone, which is what
      // makes clicking a shelf that is already selected a no-op rather than a
      // reset (turn 9, CLAUDE.md F4.1).
      ...(primary === get().selectedUnitId ? {} : { selectedElement: null }),
    });
  },
  clearSelection: () => set({
    selectedUnitId: null, selectedUnitIds: [], selectedSection: null, selectedElement: null,
  }),

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
    // Pointing at a piece is pointing at ONE cabinet: a multi-selection ends
    // here, because the properties that follow are that piece's.
    selectedUnitIds: unitId ? [unitId] : [],
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
