import { create } from 'zustand';
import { DEFAULT_CABINET_PROFILE, getCabinetProfile } from '../engine/profile.js';
import { brightnessScale } from '../engine/lighting.js';
import { applySelection, primaryOf } from '../lib/selection.js';
import {
  closeNav, openNav, popNav, pushNav,
} from '../lib/editorStack.js';
import { modalAnchorFault, withModalAnchor } from '../lib/modalLayer.js';
import {
  dismissedByClickAway, expired, greyMs, leaveWarning, makeMessage, pushMessage, queueMax,
  trimQueue,
} from '../engine/messages.js';

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
// Turn 25 (CLAUDE.md F13): "scoped to the WHOLE PROJECT (the owner's choice),
// state remembered." Remembered the way X-ray and the hinges are, in the same
// two helpers — a joiner who works with the front numbers on wants them on
// tomorrow as well.
const FRONT_DIMS_KEY = 'cc.showFrontDimensions';

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

// ─── TURN 26 (CLAUDE.md F10.3): THE BRIGHTNESS SLIDER, REMEMBERED ───────────
//
// "A brightness slider in the View menu scales every source proportionally,
// state remembered." A NUMBER rather than a flag, so it takes the same two
// helpers one storey up — clamped through the profile's own range on the way
// in, because a stored 40 from a hand-edited key must not blow the scene out.
const BRIGHTNESS_KEY = 'cc.brightness';

function loadBrightness() {
  try {
    return brightnessScale(Number(localStorage.getItem(BRIGHTNESS_KEY)), DEFAULT_CABINET_PROFILE);
  } catch {
    return DEFAULT_CABINET_PROFILE.appearance.studio.brightness.default;
  }
}

function saveBrightness(value) {
  try { localStorage.setItem(BRIGHTNESS_KEY, String(value)); } catch { /* private mode */ }
  return value;
}

// ─── The editor stack, in and out of this store (turn 23, CLAUDE.md F1) ──────
//
// `lib/editorStack.js` owns the arithmetic and speaks one shape; this store
// keeps the same three facts under the names the whole app already reads
// (`modal`, `modalArgs`). These two functions are the translation, written
// once so no action has to spell it out.

/** The nav, as the pure module wants it. */
const navOf = (s) => ({
  view: s.modal, args: s.modalArgs, stack: s.modalStack, restore: s.viewRestore,
});

/** …and back, as the patch this store applies. */
const nextNav = (nav) => ({
  modal: nav.view,
  modalArgs: nav.args,
  modalStack: nav.stack,
  viewRestore: nav.restore,
  // The outgoing view's getter goes with the outgoing view: the incoming one
  // registers its own on mount, and a stale getter would snapshot a window
  // that is no longer on screen.
  viewSnapshot: null,
});

// ─── TURN 31 (CLAUDE.md F1): THE SHELL'S OWN DOOR ───────────────────────────
//
// Every window in the app arrives through `openModal` / `pushModal`, so the two
// things F1 asks for that are not the shell's own drawing happen HERE, once:
//
//   • a click point becomes an ANCHOR. Turn 11's `{ at: {x, y} }` and turn 12's
//     `{ anchor: rect }` were reconciled in four different components, each with
//     its own line; now they are reconciled on the way in, and a modal reads
//     `args.anchor` and nothing else.
//
//   • a modal that is ABOUT AN OBJECT and was opened without one is NAMED.
//     Rule 4: the guard speaks, it never silently fixes. Nothing is invented,
//     the window still opens (a window that refuses to open because its opener
//     forgot an argument is a window nobody can use) — the fault is recorded
//     on the store and printed once, and the fix belongs in the caller.
const modalFaults = [];

/** Normalise the args and record any fault. Returns the args to store. */
function throughTheShell(name, args) {
  const next = withModalAnchor(args);
  const fault = modalAnchorFault(name, next);
  if (fault) {
    modalFaults.push({ modal: name, message: fault, at: Date.now() });
    // Once per modal kind: a guard that prints on every open is a guard the
    // console teaches you to scroll past.
    if (modalFaults.filter((f) => f.modal === name).length === 1) {
      // eslint-disable-next-line no-console
      console.warn(`[modal shell] ${fault}`);
    }
  }
  return next;
}

/** What the shell has had to complain about this session (read by the walk). */
export function modalShellFaults() {
  return modalFaults.slice();
}

/** How the view on screen says it was left. Never allowed to throw. */
function readSnapshot(s) {
  try {
    return typeof s.viewSnapshot === 'function' ? s.viewSnapshot() : null;
  } catch {
    // A snapshot that cannot be taken is a window that reopens fresh, which is
    // a worse Back and not a broken one.
    return null;
  }
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

  // ─── DOUBLE-CLICK A PART ON THE SHEET (turn 19, CLAUDE.md F4) ─────────────
  //
  // The owner's turn-17 verdict, dropped in transcription and honoured here:
  // "kliknięcie 2 razy na dany element zabiera nas do listy po prawej, otwiera
  // i podświetla który to element."
  //
  // PURE NAVIGATION. Nothing is edited, nothing is ticked on or off, nothing is
  // rotated — the turn-17 shelf rule made rotation automatic and no verdict
  // since has asked for a hand control. It is view state, so it lives here with
  // the rest of it and reaches nothing that is exported.
  //
  // `stamp` is what makes the SAME part twice still scroll the tree: the effect
  // in components/CncTree.jsx watches the whole record, and two identical
  // records in a row would not be a change.
  cncFocusPart: null,                // { unitId, panelId, stamp } | null
  focusCncPart: (unitId, panelId) => set((s) => ({
    cncFocusPart: unitId && panelId
      ? { unitId, panelId, stamp: (s.cncFocusPart?.stamp || 0) + 1 }
      : null,
  })),
  clearCncFocus: () => set({ cncFocusPart: null }),

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

  // ─── FRONT DIMENSIONS (turn 25, CLAUDE.md F13) ──────────────────────────
  //
  // "A toggle — Show front dimensions — in the door modal and in the View menu,
  // scoped to the WHOLE PROJECT (the owner's choice), state remembered."
  //
  // PROJECT-WIDE and not per-door, and that is his call rather than a
  // simplification: the numbers a joiner is checking with this are the GAPS,
  // and a gap belongs to two fronts at once. A per-door switch would let one
  // leaf of a pair show the gap between them and the other not.
  //
  // Off is a clean scene: nothing is drawn at all, which is the state the app
  // opens in.
  showFrontDimensions: loadFlag(FRONT_DIMS_KEY, false),
  setShowFrontDimensions: (v) => set({
    showFrontDimensions: saveFlag(FRONT_DIMS_KEY, Boolean(v)),
  }),
  toggleFrontDimensions: () => set((s) => ({
    showFrontDimensions: saveFlag(FRONT_DIMS_KEY, !s.showFrontDimensions),
  })),

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

  // ─── Turn 26 (CLAUDE.md F10.3): how bright the room is ───────────────────
  // ONE multiplier on every lamp — the ratios the rig was balanced at are the
  // ones turn 10 measured, whatever this says. Remembered, like X-ray and the
  // front dimensions: the joiner has said how he wants to look at the job.
  brightness: loadBrightness(),
  setBrightness: (v) => set({
    brightness: saveBrightness(brightnessScale(v, DEFAULT_CABINET_PROFILE)),
  }),

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

  // ─── TURN 23 (CLAUDE.md F1): THE EDITOR IS A STACK ────────────────────────
  //
  // `modal` / `modalArgs` are the TOP of it — what is on screen — and have not
  // changed shape, so every one of the app's twelve modals goes on working
  // without knowing this exists. What is new is the three fields under them:
  //
  //   modalStack     the SUSPENDED parents, oldest first. `openModal` clears
  //                  it (a top-level open is a new journey, and the top level
  //                  has no Back); `pushModal` grows it; `popModal` and
  //                  `closeModal` shrink it.
  //   viewSnapshot   a GETTER the current view registers — "how I was left".
  //                  A getter and not a value on purpose: a workspace whose
  //                  camera and scroll wrote themselves into the store on
  //                  every frame would re-render the app sixty times a second
  //                  for a fact nobody reads until the moment of a push.
  //   viewRestore    the snapshot handed BACK to a view that was just resumed.
  //                  Read once, on the way in, and cleared by the next open.
  //
  // The arithmetic itself is `lib/editorStack.js`, pure and tested without a
  // browser. This store is the wiring and nothing more.
  modalStack: [],
  viewSnapshot: null,
  viewRestore: null,
  openModal: (name, args = null) => set((s) => nextNav(
    openNav(navOf(s), name, throughTheShell(name, args)),
  )),
  /** Enter a NESTED editor surface, suspending the one on screen. */
  pushModal: (name, args = null) => set((s) => nextNav(
    pushNav(navOf(s), name, throughTheShell(name, args), readSnapshot(s)),
  )),
  /** ← Back, and Escape: one level, restoring the parent exactly as it was. */
  popModal: () => set((s) => nextNav(popNav(navOf(s)))),
  /** Done, ×, a click outside: the whole journey, not one level of it. */
  closeModal: () => set(() => nextNav(closeNav())),
  /**
   * The current view says how to snapshot itself. Called on mount and cleared
   * on unmount; a view that registers nothing is simply reopened fresh, which
   * is what every dialog in the app wants.
   */
  registerViewSnapshot: (fn) => set({ viewSnapshot: typeof fn === 'function' ? fn : null }),

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

  // ─── OPEN / CLOSE ALL DOORS (turn 25, CLAUDE.md F15) ────────────────────
  //
  // "First press opens every door in the project, second closes them."
  //
  // The STATE is the same `openFronts` map every other animation reads, so it
  // works with turn 24's hinge rig for free: a door opened this way swings on
  // the same value, and its hinge's carcass half folds after it exactly as it
  // does for a door opened by hand. Nothing here reaches the engine.
  //
  // Which way the press goes is decided on what is ACTUALLY open rather than
  // on a remembered flag: a joiner who opened three doors by hand and then
  // pressed the button expects the rest to open, not those three to shut.
  toggleAllFronts: (entries) => set((s) => {
    const rows = (entries || []).filter((e) => e?.unitId && e.panelIds?.length);
    if (!rows.length) return {};
    const anyShut = rows.some((e) => e.panelIds.some((id) => !((s.openFronts[e.unitId]?.[id] ?? 0) > 0.5)));
    if (!anyShut) return { openFronts: {} };
    const next = { ...s.openFronts };
    for (const e of rows) {
      const unit = { ...(next[e.unitId] || {}) };
      for (const id of e.panelIds) unit[id] = 1;
      next[e.unitId] = unit;
    }
    return { openFronts: next };
  }),

  /** Is EVERY door in this set standing open? — what the button lights on. */
  allFrontsOpen: (entries) => {
    const rows = (entries || []).filter((e) => e?.unitId && e.panelIds?.length);
    if (!rows.length) return false;
    const map = get().openFronts;
    return rows.every((e) => e.panelIds.every((id) => (map[e.unitId]?.[id] ?? 0) > 0.5));
  },

  // Snap step: 1 mm default, 0.5 mm and the 32 mm system as options (SPEC 4.8)
  snapStep: loadSnap(),
  setSnapStep: (step) => {
    try { localStorage.setItem(SNAP_KEY, String(step)); } catch { /* private mode */ }
    set({ snapStep: step });
  },

  // ─── THE THREE MESSAGE LEVELS (turn 31, CLAUDE.md F2) ─────────────────────
  //
  // What was here: ONE slot, four seconds, each message erasing the last — and
  // the owner has never seen one. A bulk action fires five in a tick and four
  // of them are gone before a frame is drawn.
  //
  // What is here now is a QUEUE, and the rules that govern it are
  // engine/messages.js — pure, tested without a browser. This store is the
  // wiring and the clock, and nothing more. `notify(message, tone)` is
  // deliberately unchanged: 129 call sites keep working and gain the levels for
  // free, because the four old tones ARE the three levels
  // (`messages.js levelOf`).
  messages: [],
  notify: (message, tone = 'info', opts = null) => {
    if (!message) return null;
    const now = Date.now();
    const profile = getCabinetProfile();
    const msg = makeMessage(message, tone, { at: now, profile, action: opts?.action || null });
    set((s) => ({ messages: trimQueue(pushMessage(s.messages, msg), queueMax(profile)) }));
    // Only a grey has a clock. A red that expired on its own would be exactly
    // the fault this feature exists to end, so there is no timer for one.
    if (msg.expiresAt != null) {
      setTimeout(() => {
        const gone = expired(get().messages, Date.now());
        if (gone.length) set((s) => ({ messages: s.messages.filter((m) => !gone.includes(m.id)) }));
      }, greyMs(profile) + 60);
    }
    return msg.id;
  },
  /** One message, clicked. The RED's only exit. */
  dismissMessage: (id) => set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),
  /** A pointer went down somewhere else: the YELLOWS go, the reds stay. */
  dismissOnClickAway: () => set((s) => {
    const gone = dismissedByClickAway(s.messages);
    return gone.length ? { messages: s.messages.filter((m) => !gone.includes(m.id)) } : {};
  }),
  clearMessages: () => set({ messages: [] }),

  /**
   * ─── LEAVING WITH UNSAVED WORK (F2) ──────────────────────────────────────
   *
   * "Leaving with unsaved work shows a RED 'Save the project — unsaved
   * changes'." Every door out of the editor is `goToStart`, so this is the one
   * place it can be said — and it SPEAKS rather than fixing (rule 4): it does
   * not save behind the joiner's back and it does not bar the door. The message
   * is a RED, so it stays until it is clicked, which is what carries it onto
   * the screen he has just walked to.
   */
  warnIfUnsaved: (projectState) => {
    const warning = leaveWarning(projectState || {});
    if (warning) get().notify(warning.message, warning.tone);
    return warning;
  },
}));
