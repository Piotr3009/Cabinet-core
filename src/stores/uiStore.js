import { create } from 'zustand';
import { DEFAULT_CABINET_PROFILE, getCabinetProfile } from '../engine/profile.js';
import { brightnessScale } from '../engine/lighting.js';
import {
  applyMemberSelection, applySelection, memberKey, parseMember, primaryOf,
} from '../lib/selection.js';
import {
  closeNav, openNav, popNav, pushNav,
} from '../lib/editorStack.js';
import { modalAnchorFault, withModalAnchor } from '../lib/modalLayer.js';
// Turn 44 (CLAUDE.md iron rule 5): the vocabulary of the factory/retail mode
// lives with the tree it filters, so this store stores a word it does not own.
import { normaliseAudience } from '../lib/wizardTabs.js';
import { entryAudience } from '../lib/appEntry.js';
import {
  dismissedByClickAway, expired, historyMax, historyRow, leaveWarning, makeMessage,
  pushMessage, queueMax, recordHistory, trimQueue,
} from '../engine/messages.js';
// TURN 59: the shared brain, running memory-only for the PBI retail mount.
import { persistenceOn } from './persistence.js';

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
  // TURN 59: memory-only mode reads nothing; the profile's default stands.
  if (!persistenceOn()) return DEFAULT_CABINET_PROFILE.editor.defaultSnap;
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
  if (!persistenceOn()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : raw === '1';
  } catch {
    return fallback;
  }
}

/** Writes and returns the value, so a setter can be one expression. */
function saveFlag(key, value) {
  if (!persistenceOn()) return value;
  try { localStorage.setItem(key, value ? '1' : '0'); } catch { /* private mode */ }
  return value;
}

// ─── TURN 45 (CLAUDE.md F2): FACTORY OR RETAIL, DECIDED AT THE DOOR ─────────
//
// T44 remembered this in `localStorage` under `cc.audience`, because T44 had a
// header TOGGLE and a toggle's answer has to survive a reload. F2 kills the
// toggle: *"One codebase, TWO entries: the workshop app hardwires `factory`; a
// separate route `/client` … hardwires `retail`."*
//
// So there is nothing left to remember. The head is WHICH DOOR THE APP WAS
// OPENED THROUGH, `lib/appEntry.js` reads it off the location once, and the two
// helpers that persisted it are gone with the switch they served — a key that
// is never written and never read is a key that lies to the next person who
// finds it.

// ─── TURN 26 (CLAUDE.md F10.3): THE BRIGHTNESS SLIDER, REMEMBERED ───────────
//
// "A brightness slider in the View menu scales every source proportionally,
// state remembered." A NUMBER rather than a flag, so it takes the same two
// helpers one storey up — clamped through the profile's own range on the way
// in, because a stored 40 from a hand-edited key must not blow the scene out.
const BRIGHTNESS_KEY = 'cc.brightness';

function loadBrightness() {
  if (!persistenceOn()) return DEFAULT_CABINET_PROFILE.appearance.studio.brightness.default;
  try {
    return brightnessScale(Number(localStorage.getItem(BRIGHTNESS_KEY)), DEFAULT_CABINET_PROFILE);
  } catch {
    return DEFAULT_CABINET_PROFILE.appearance.studio.brightness.default;
  }
}

function saveBrightness(value) {
  if (!persistenceOn()) return value;
  try { localStorage.setItem(BRIGHTNESS_KEY, String(value)); } catch { /* private mode */ }
  return value;
}

// T86B F7.4: THE DIMENSION INK, REMEMBERED. *"menu, patrz SS: dimension powinien
// pojsc do glownego paska, ustawienie koloru wymiarowania powinno byc w settings
// nie tutaj"* (the owner, 30.10.2026, 21:54). Remembered per browser as
// Brightness is; the profile's default when the key is unset or names an ink
// the profile has never heard of.
const DIMENSION_COLOUR_KEY = 'cc.dimensionColour';

/** The ink a key names, or the profile's default (pure: tested without a browser). */
export function dimensionColourFrom(stored, profile = DEFAULT_CABINET_PROFILE) {
  return typeof stored === 'string' && Object.hasOwn(profile.dimensions.colours, stored)
    ? stored
    : profile.appearance.dimensions.colour;
}

function loadDimensionColour() {
  if (!persistenceOn()) return DEFAULT_CABINET_PROFILE.appearance.dimensions.colour;
  try {
    return dimensionColourFrom(localStorage.getItem(DIMENSION_COLOUR_KEY));
  } catch {
    return DEFAULT_CABINET_PROFILE.appearance.dimensions.colour;
  }
}

function saveDimensionColour(key) {
  if (!persistenceOn()) return key;
  try { localStorage.setItem(DIMENSION_COLOUR_KEY, key); } catch { /* private mode */ }
  return key;
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

// ─── T84 F3, F4 (CLAUDE.md PART B): THE STUDIO'S INSPECTOR ─────────────────
//
// Where the Studio's inspector stands when the selection moves. CLAUDE.md T84
// F4 adopts the designer's law: *"Pin keeps inspector open and FOLLOWING
// SELECTION; it never locks unit ID"*. Pinned, the inspector stays where it is
// (the full panel, following whatever is selected now); unpinned, a new
// cabinet (or none) brings the panel back from hidden. It answers a MODE and
// nothing else: there is no unit id in it to freeze. The legacy face never
// reads it.
//
// CHAT FIX 30.10.2026 · the quick card is gone (the owner: *"tylko ten jeden
// przycisk usun, Full settings"*): the modes are 'full' and 'none'; a cabinet
// clicked shows the full panel at once.
const INSPECTOR_MODES = Object.freeze(['full', 'none']);
/** T84 F5 · what the Check may be filtered to. */
const CHECK_FILTERS = Object.freeze(['all', 'red', 'yellow']);
export function inspectorAfterSelect({ inspector = 'full', inspectorPinned = false } = {}, changed = true) {
  const mode = INSPECTOR_MODES.includes(inspector) ? inspector : 'full';
  if (!changed || inspectorPinned) return mode;
  return 'full';
}

// ─── T84 F4 (CLAUDE.md PART B): THE EDIT IS COMMITTED TO ITS OWN CABINET ────
//
// *"Before the selection changes, a pending valid edit is committed to its
// ORIGINAL unit id; an invalid one blocks the switch with its refusal visible;
// Escape cancels it."*  The Studio's inspector registers ONE guard while it is
// mounted (components/studio/InspectorHost.jsx); the three selection actions
// ask it before they write, and a guard that answers `{ ok: false }` leaves the
// selection exactly where it was. No guard (the legacy face, a test, the
// retail mount) is a yes, so nothing outside the Studio changes.
function selectionMayMove(state) {
  const guard = state?.selectionGuard;
  if (typeof guard !== 'function') return true;
  try {
    const answer = guard();
    return !answer || answer.ok !== false;
  } catch {
    return true;
  }
}

export const useUiStore = create((set, get) => ({
  // Which screen the app is on (turn 4, BACKLOG #7). The canvas is reached
  // THROUGH a project — start screen first, always.
  screen: 'start',                   // 'start' | 'editor'
  openEditor: () => set({ screen: 'editor' }),
  goToStart: () => set({
    screen: 'start',
    selectedUnitId: null,
    selectedUnitIds: [],
    selectedSection: null,
    selectedElement: null,
    selectedElements: [],
    bomOpen: false,
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
  libraryInsert: null,               // { near: unitId, side: 'left' | 'right' } or { wall } (T75 F10)
  openLibraryToInsert: (categoryId, at) => set({
    libraryCategory: categoryId || null,
    // T75 F10 · …or a WALL with nobody on it yet: an island face's own plus.
    // eslint-disable-next-line no-nested-ternary
    libraryInsert: at?.near
      ? { near: at.near, side: at.side === 'left' ? 'left' : 'right' }
      : (Number.isInteger(at?.wall) ? { wall: at.wall } : null),
  }),
  clearLibraryInsert: () => set({ libraryInsert: null }),

  // Right parameter panel — closes itself once doors are added (SPEC 4.10)
  rightPanelOpen: true,
  // ─── T84 F4 (verify/t84/p1-host.md F): THE PANEL'S OWN ROADS REACH STUDIO ─
  // Every legacy road that opens the panel to show a row in it (the
  // right-click Rename and its section openers, the inner +, the quick card's
  // Doors / Drawers / Bays rows) brings the Studio inspector to the full
  // panel; the panel's own x hides it, and the breadcrumb's button brings it
  // back. The legacy face never reads `inspector`.
  openRightPanel: () => set({ rightPanelOpen: true, inspector: 'full' }),
  closeRightPanel: () => set({ rightPanelOpen: false, inspector: 'none' }),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),

  // ─── T84 F3 (CLAUDE.md PART B): THE STUDIO'S INSPECTOR ───────────────────
  // 'full' the RightPanel embedded, 'none' hidden (the breadcrumb's button
  // brings it back). Pinned, the full panel stays and follows the selection
  // (`inspectorAfterSelect` above). Read by the Studio face only; the legacy
  // face never looks at it. CHAT FIX 30.10.2026: no 'quick' any more.
  inspector: 'full',
  inspectorPinned: false,
  setInspector: (mode) => set({ inspector: INSPECTOR_MODES.includes(mode) ? mode : 'full' }),
  /** The panel's own roads (a summary row, a section opener): the RightPanel, embedded. */
  showFullSettings: () => set({ inspector: 'full' }),
  hideInspector: () => set({ inspector: 'none' }),
  /** The breadcrumb's button: back from hidden. */
  showInspector: () => set((s) => (s.inspector === 'none' ? { inspector: 'full' } : {})),
  /** Pin: the full panel stays open and FOLLOWS the selection; it stores no unit id. */
  toggleInspectorPin: () => set((s) => ({ inspectorPinned: !s.inspectorPinned, inspector: 'full' })),
  // T84 F4 · the commit-before-switch guard (`selectionMayMove` above).
  selectionGuard: null,
  setSelectionGuard: (fn) => set({ selectionGuard: typeof fn === 'function' ? fn : null }),
  clearSelectionGuard: (fn) => set((s) => (!fn || s.selectionGuard === fn ? { selectionGuard: null } : {})),

  // BOM panel — computed live, shown on demand (SPEC 4.11)
  bomOpen: false,
  setBomOpen: (v) => set({ bomOpen: v }),

  // ─── CHECK v1 (turn 31, CLAUDE.md F6) ─────────────────────────────────────
  // "A Check button beside BOM/CNC" — the same shape as the BOM's own flag,
  // because it is the same kind of thing: a panel, computed live, shown on
  // demand. Opening one closes the other; two 380 px panels over a 3D view is
  // a 3D view nobody can see.
  checkOpen: false,
  setCheckOpen: (v) => set(v ? { checkOpen: true, bomOpen: false } : { checkOpen: false, checkFilter: 'all' }),
  toggleCheck: () => set((s) => (s.checkOpen ? { checkOpen: false, checkFilter: 'all' } : { checkOpen: true, bomOpen: false })),
  // ─── T84 F5 (CLAUDE.md PART C): THE COUNTERS OPEN THE CHECK FILTERED ─────
  // *"1 red · 3 yellow in their colours; click opens Check filtered to that
  // level (a checkFilter in uiStore, 'all' | 'red' | 'yellow'; the Check panel
  // reads it and shows "Show all")."*  Closing the panel puts it back to all.
  checkFilter: 'all',
  setCheckFilter: (level) => set({ checkFilter: CHECK_FILTERS.includes(level) ? level : 'all' }),
  openCheckFiltered: (level) => set({
    checkOpen: true, bomOpen: false, checkFilter: CHECK_FILTERS.includes(level) ? level : 'all',
  }),
  // ─── CHAT FIX 30.10.2026 · THE CABINET'S FINDINGS, FOLDED BY DEFAULT ──────
  // The owner, of the yellow strips under the panel: *"te zolte alerty moze by
  // jakos skromniej to pokazac i zwiniete, jak bedzie 10 to caly menu mi
  // zabierze, ja uwazam ze powinno byc skromnie gdzies na dole a nie ZOLTE
  // wywalone na wierzch, rozprasza tylko czlowieka"*. One quiet row at the
  // foot of the column says the counts; a press unfolds the list over it, a
  // second folds it. One yes or no for the session, never saved.
  issuesOpen: false,
  toggleIssues: () => set((s) => ({ issuesOpen: !s.issuesOpen })),
  // ─── T84 F5 (CLAUDE.md PART C): SHOW FRAMES THE UNIT ─────────────────────
  // The issue strip's Show asks; the camera bar's Frame selection (F6)
  // answers it and clears it. A request, never a camera move made here.
  frameRequest: null,                // { unitIds: string[], at: number } | null
  requestFrame: (unitIds) => set({
    frameRequest: { unitIds: (Array.isArray(unitIds) ? unitIds : [unitIds]).filter(Boolean), at: Date.now() },
  }),
  clearFrameRequest: () => set({ frameRequest: null }),

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

  // ─── T77 F3 · THE LEVEL OF THE ORNATE REFERENCE FILES ──────────────────────
  // CLAUDE.md T77 F3: *"The CNC export offers two levels in the existing
  // export options (no new numeric field): Reference (default) at sampleMm
  // and Full resolution at fullSampleMm."*  A choice of the export, not of the
  // project: it is not saved, and every export of the session reads it (the
  // CNC panel's downloads and Output > CNC / DXF alike).
  cncReferenceLevel: 'reference',    // 'reference' | 'full'
  setCncReferenceLevel: (level) => set({ cncReferenceLevel: level === 'full' ? 'full' : 'reference' }),

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
    ? {
      viewMode: 'cnc', rightPanelOpen: true, bomOpen: false,
      // T84 F4 · main opens the panel for CNC (its tree and its two downloads);
      // the Studio's inspector comes back from hidden the same way, never pinned.
      ...(s.inspector === 'none' ? { inspector: 'full' } : {}),
    }
    : { viewMode: '3d', rightPanelOpen: s.rightPanelOpen })),

  // Dimensions on the 3D canvas: each unit's own W/H/D captions AND the
  // distance arrows between units and to the walls (CLAUDE.md phase 8). One
  // switch, because they are one thing to Piotr: "show me the numbers".
  // ─── THE ISLAND PLAN (owner, 14.10.2026): a draft, until it is inserted ──
  // `{ islandId|null, cx, cy, w, d, rotation, cabs: [{ key, unitId, face, w, type }] }`
  // or null. Opened by the project store (`beginIslandPlan`), drawn by
  // 3d/IslandPlan.jsx over the room canvas, inserted by `insertIslandPlan`.
  islandPlan: null,
  openIslandPlan: (draft) => set({ islandPlan: draft || null }),
  setIslandPlan: (patch) => set((s) => (s.islandPlan ? { islandPlan: { ...s.islandPlan, ...patch } } : {})),
  closeIslandPlan: () => set({ islandPlan: null }),
  // *"możliwość hide island żeby zobaczyć kuchnię bez islandu"*: hidden in the
  // 3D view only; the project, the BOM and the drawings keep it. Session-only.
  hiddenIslands: {},                 // { [islandId]: true }
  toggleIslandHidden: (id) => set((s) => {
    if (!id) return {};
    const { [id]: on, ...rest } = s.hiddenIslands;
    return { hiddenIslands: on ? rest : { ...rest, [id]: true } };
  }),
  // Chat-fix 13.10.2026: a drag or orbit is in progress (3d/frameDemand.jsx).
  gestureActive: false,
  setGestureActive: (v) => set({ gestureActive: Boolean(v) }),
  showDimensions: false,  // Chat-fix 12.10.2026 (owner): off until asked for.
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

  // ─── TURN 45 (CLAUDE.md F2): WHICH DOOR THIS APP WAS OPENED THROUGH ───────
  //
  // *"the workshop app hardwires `factory`; a separate route `/client` …
  // hardwires `retail`."* It is read ONCE, at boot, from the location, and
  // nothing in the running app moves it: there is no switch, no persistence and
  // no second wizard — `lib/wizardTabs.js` is still the one tree and the one
  // filter, and all this word decides is which of its rows are DRAWN.
  //
  // `setAudience` survives the toggle it used to serve because the RETAIL MOUNT
  // is a caller: a host page that mounts this app as the client's configurator
  // says so in one line rather than by faking a URL. Nothing in the workshop
  // app calls it, and the switch's own flip-it verb is gone with the switch.
  audience: entryAudience(),
  setAudience: (v) => set({ audience: normaliseAudience(v) }),

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

  // ─── TURN 50 (CLAUDE.md F2): THE SHARE-OUT OFFER ─────────────────────────
  //
  // *"jak dodaję ostatnią szafkę do ściany i zostanie mniej niż 400 mm … czy
  // chcesz wyśrodkować?"*  A cabinet has just gone in and left a gap too small
  // to be a cabinet. This is the OFFER, and it is view state exactly like
  // everything else in this file: which unit was added, so the scene knows
  // which run to draw the bar at.
  //
  // Decision 1 at the top of CLAUDE.md — a BAR at the gap, not a modal in the
  // middle of the screen — and the corollary is here: ignoring it costs no
  // click, so the offer is cleared by the next thing that happens rather than
  // by a Dismiss button. `null` is "nothing on offer", which is the state the
  // app is in for all but a second or two of its life.
  shareOutOffer: null,               // { unitId } | null
  offerShareOut: (unitId) => set({ shareOutOffer: unitId ? { unitId } : null }),
  clearShareOut: () => set({ shareOutOffer: null }),

  // ─── TURN 53 (CLAUDE.md F1b): …AND THE ✕ ─────────────────────────────────
  //
  // *"musi też być przycisk dismiss — jak nie chcę tego robić teraz, muszę coś
  // nacisnąć. pamiętaj krzyżyk zasada."*
  //
  // T50's line above — *"ignoring it costs no click, so the offer is cleared by
  // the next thing that happens rather than by a Dismiss button"* — is what the
  // owner has just overruled, and he is right: the next thing that happens is
  // very often another settle over the same gap, so the bar he ignored came
  // straight back. The house ✕ rule applies and this is it.
  //
  // What is remembered is not "dismissed" but WHICH OFFER was dismissed:
  // `engine/shareOut.js shareOutSignature` — wall, mount, startAt, endAt, gap.
  // `settleLayout` refuses to re-offer while the signature it computes matches
  // this one; any geometry change that moves one of those numbers makes a
  // different signature, and the bar returns because it is a different offer.
  // Loading a project clears it, because it belongs to the drawing on screen.
  shareOutDismissed: null,           // signature string | null
  dismissShareOut: (signature) => set({
    shareOutOffer: null,
    shareOutDismissed: signature || null,
  }),
  clearShareOutDismissed: () => set({ shareOutDismissed: null }),

  // Which ink the dimensions are drawn in (turn 5, BACKLOG #34).
  // A drawing office uses one or the other; the hexes themselves live in
  // profile.dimensions.colours, so this is only WHICH, never what.
  //
  // ─── Turn 11 (CLAUDE.md F1.5) ───
  // RED by default now, on the owner's verdict, and the default is READ FROM
  // THE PROFILE (`appearance.dimensions.colour`) rather than written here — a
  // workshop that prefers navy changes one line in profile.js and every new
  // session starts there. `alt` beside it is the other one on the menu.
  // T86B F7.4: read from, and written to, `cc.dimensionColour`.
  dimensionColour: loadDimensionColour(),
  setDimensionColour: (key) => set((s) => ({
    dimensionColour: Object.hasOwn(DEFAULT_CABINET_PROFILE.dimensions.colours, key)
      ? saveDimensionColour(key)
      : s.dimensionColour,
  })),

  // Thin black contours on every piece — ON by default (turn 4, BACKLOG #5).
  showOutlines: true,
  setShowOutlines: (v) => set({ showOutlines: Boolean(v) }),
  toggleOutlines: () => set((s) => ({ showOutlines: !s.showOutlines })),

  // ─── PROPS (turn 58b F5 · T58 F8): A PICTURE SWITCH, GLOBAL ───────────────
  //
  // The owner: *"ok props on/off — zegarki wiedzą i reszta też wie."*
  //
  // It lives beside Outlines and X-ray because it answers the same kind of
  // question — what am I looking at — and, like them, it changes NOTHING about
  // the job: the BOM, the cut list, the DXF and the invoice are all built out
  // of `src/engine`, and nothing in `src/engine` can even see the props
  // modules. That blindness is structural, not filtered.
  //
  // OFF by default, and it STAYS off while the pack is unreachable: the
  // toolbar greys the control and says why (`lib/propsSource.js`).
  props: false,
  setProps: (v) => set({ props: Boolean(v) }),
  toggleProps: () => set((s) => ({ props: !s.props })),

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

  // ─── TURN 33 (CLAUDE.md F2): "TURN ON THE LIGHT" — the client demo ────────
  // The room dims to the profile's demo level and every placed LED's emissive
  // comes UP. A LENS, exactly as X-ray is: everything it changes is DERIVED at
  // render time from this one flag (3d/Scene.jsx, 3d/LedStrips.jsx), nothing
  // stored is touched — which is what makes "toggling back restores exactly
  // the previous scene state" true by construction. Session-only on purpose:
  // a demo is a moment, not a way of working.
  //
  // ─── TURN 35 (CLAUDE.md F10): THE LENS BECOMES A SHADOW ──────────────────
  // The owner replaced the two lighting checkboxes with one pair of buttons,
  // so "is the light on" is the PROJECT'S answer now — `design.lighting.on`,
  // persisted and migrated. This flag is NOT deleted and not a second opinion:
  // it is that answer's session shadow, written by 3d/Scene.jsx (uiStore never
  // reads projectStore — the one direction projectStore.js states — so the
  // sync lives at the one place the lens is consumed). The setters below stay
  // exactly as they are: a session lens is still a session lens, and anything
  // that wants one for a moment still has it.
  lightDemo: false,
  setLightDemo: (v) => set({ lightDemo: Boolean(v) }),
  toggleLightDemo: () => set((s) => ({ lightDemo: !s.lightDemo })),

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
  // T79 F2 · or 'above': the undivided opening over the divider's FIX shelf
  // (`projectStore.aboveDividerOf`), lit by `3d/UnitView` as a full-width band.
  zoneHint: null,                    // the bay's index, 'above', or null
  setZoneHint: (index) => set({
    zoneHint: index == null ? null : (index === 'above' ? 'above' : Math.trunc(Number(index))),
  }),

  // ─── T75 F7 · CUT CORNER: THE FOUR CORNERS ARE LIT ───────────────────────
  // *"Klikasz 'wytnij narożnik', program podświetla narożniki, wybierasz."*
  // Which unit's four plan corners stand lit in the scene (`3d/NotchCorners`),
  // or null. A moment, like the bay hint above: the click on a corner opens
  // the small window at the click, and a cut or a click elsewhere ends it.
  notchPick: null,
  startNotchPick: (unitId) => set({ notchPick: unitId || null, edgeNotchPick: null }),
  stopNotchPick: () => set({ notchPick: null }),
  // ─── T79 F5 · CUT EDGE: THE FOUR HORIZONTAL EDGES ARE LIT ────────────────
  // The owner, 18.10.2026: *"możesz zrobić mi też poziome cut? wszystkich 4
  // rogów?"*  Which unit's four horizontal side edges stand lit in the scene
  // (`3d/NotchEdges`), or null; the corners' twin, and one or the other is lit.
  edgeNotchPick: null,
  startEdgeNotchPick: (unitId) => set({ edgeNotchPick: unitId || null, notchPick: null }),
  stopEdgeNotchPick: () => set({ edgeNotchPick: null }),

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
    const now = get();
    const next = applySelection(now.selectedUnitIds, id, additive);
    const primary = primaryOf(next);
    // T84 F4 · a typed edit is committed to its own cabinet first, or the
    // selection stays where it is (`selectionMayMove`); the Studio inspector
    // follows by its rule (`inspectorAfterSelect`).
    const moved = primary !== now.selectedUnitId;
    if (moved && !selectionMayMove(now)) return false;
    return set({
      ...(moved ? { inspector: inspectorAfterSelect(now, true) } : {}),
      selectedUnitIds: next,
      selectedUnitId: primary,
      selectedSection: primary ? 0 : null,
      rightPanelOpen: next.length > 0,
      // Selecting a DIFFERENT cabinet drops whatever was selected inside the old
      // one — an element belongs to its unit and cannot outlive the selection of
      // it. Re-selecting the SAME unit leaves the element alone, which is what
      // makes clicking a shelf that is already selected a no-op rather than a
      // reset (turn 9, CLAUDE.md F4.1).
      // T37-F1: …and the SET goes with it. The two are written together and
      // never separately — that has been this store's own rule since T36 —
      // and a set left standing after its primary was nulled is a set no
      // panel is looking at and every group edit would still write to.
      // T79 F12: …and a Center between armed on the old one ends with it.
      ...(primary === get().selectedUnitId ? {} : { selectedElement: null, selectedElements: [], centreBetween: null }),
    });
  },
  // ─── THE RIGHT-CLICK MENU TURN (01.11.2026), J4: SELECT SEVERAL ───────────
  // The owner's board (iPad, *"9 - ok"*): *"iPad nie ma Ctrl ani Cmd. Wlaczasz
  // Select several w pasku po lewej: kazde dotkniecie dodaje albo zdejmuje
  // szafke, przytrzymanie dalej otwiera menu. Wylaczasz: dotkniecie znow
  // wybiera jedna szafke."* One yes or no: while it is on, every press on a
  // cabinet in the scene is the tick Ctrl+click is on a keyboard
  // (3d/UnitView.jsx reads it); off, a press selects one cabinet, as ever. It
  // changes no selection by itself, on or off.
  selectSeveral: false,
  setSelectSeveral: (on) => set({ selectSeveral: on === true }),
  toggleSelectSeveral: () => set((s) => ({ selectSeveral: !s.selectSeveral })),
  clearSelection: () => {
    // T84 F4 · the same guard and the same rule as selectUnit.
    const now = get();
    const moved = now.selectedUnitId != null;
    if (moved && !selectionMayMove(now)) return false;
    return set({
      ...(moved ? { inspector: inspectorAfterSelect(now, true) } : {}),
      selectedUnitId: null,
      selectedUnitIds: [],
      selectedSection: null,
      selectedElement: null,
      selectedElements: [],
      centreBetween: null,
    });
  },

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
  // ─── TURN 36 (CLAUDE.md F2): MORE THAN ONE PIECE ──────────────────────────
  //
  // The SET, of which `selectedElement` is the last entry — the PRIMARY, the
  // one the hand is on and the one every single-piece panel in the app is
  // about. The two are written together and never separately, so nothing that
  // reads `selectedElement` (which is most of the app) had to learn anything.
  //
  // It is the same shape and the same arithmetic the CABINET set has carried
  // since turn 13 (`lib/selection.js applySelection`), applied one level down:
  // a plain click replaces, Ctrl (or ⌘) adds and removes, and taking the last
  // one away leaves nothing selected.
  //
  // ─── TURN 37 (CLAUDE.md F1): AND IT SPANS CABINETS ────────────────────────
  //
  // T36 wrote here that *"every member is in ONE cabinet… pointing at a piece
  // in another cabinet starts a new set rather than growing this one across a
  // boundary no store action could act over."* The owner's verdict on that,
  // 17.08.2026: *"chodziło mi o półki z 2–3 szaf obok siebie, a nie tylko z
  // jednej… Nie mogę sobie złapać 6 półek z 3 szaf i przesunąć ich razem."*
  //
  // The boundary is gone, and the sentence that justified it was wrong on its
  // own terms: EVERY item action in the project store already takes a `unitId`
  // as its first argument (`setShelfPos(unitId, itemId, mm)`), so a store
  // action that acts across cabinets was never the missing piece — a member
  // that remembered which cabinet it was in was.
  //
  // So a member is `{unitId, elementRef}`, carried as ONE KEY
  // (`lib/selection.js memberKey`) so the add/remove/promote arithmetic stays
  // the single tested copy it has been since turn 13.
  selectedElements: [],              // string[] — `memberKey(unitId, elementRef)`
  /**
   * @param {string|null} unitId
   * @param {string|null} elementRef  the ENGINE's own panel id, e.g. `SHELF-2`
   * @param {object} opts  { additive }: Ctrl (or ⌘) held, F2; { pick }: a
   *   Center between pick, said only by the 3D press on a board (T79 F12)
   */
  // T84 F4 · a piece of ANOTHER cabinet moves the selection to its parent:
  // the guard first, as selectUnit asks it (`selectionMayMove`), and the
  // Studio inspector follows by its rule.
  selectElement: (unitId, elementRef, { additive = false, pick = false } = {}) => ((unitId !== get().selectedUnitId
    && !selectionMayMove(get())) ? false : set((s) => {
    // ─── T79 (CLAUDE.md F12): WHILE CENTER BETWEEN IS ARMED, A CLICK IS A PICK
    // On the cabinet that armed it: the lower first, then the upper, and the
    // selection stays on the shelf whose menu armed it. Only the press on a
    // board says `pick`: any other selection (another cabinet, a Check row,
    // the re-selection an Undo makes) is a click elsewhere, ends the mode and
    // selects as it always has.
    const armed = s.centreBetween;
    if (pick && armed && armed.unitId === unitId && elementRef) {
      return { centreBetween: armed.lower ? { ...armed, upper: elementRef } : { ...armed, lower: elementRef } };
    }
    // ─── TURN 37 (CLAUDE.md F1): GRABBING A MEMBER KEEPS THE SET ────────────
    //
    // The owner's whole verdict is *"złapać 6 półek z 3 szaf i przesunąć ich
    // razem"* — and a drag BEGINS with a plain press. T36's law said a plain
    // press starts a fresh set, so the very gesture that was supposed to move
    // the six collapsed them to one before the first pointermove arrived. The
    // walk caught it, which is what the walk is for.
    //
    // So a plain press on a piece that is ALREADY IN a set of two or more
    // KEEPS the set and promotes that piece to primary — the hand is on it, so
    // it is the one the panels are about. A press anywhere else still starts
    // fresh, which is every single-select in the app and the T36 pin above.
    // This is what every drawing tool does, and for this reason.
    const held = !additive
      && (s.selectedElements || []).length > 1
      && (s.selectedElements || []).includes(memberKey(unitId, elementRef));
    const next = held
      ? [...s.selectedElements.filter((k) => k !== memberKey(unitId, elementRef)),
        memberKey(unitId, elementRef)]
      : applyMemberSelection(s.selectedElements, unitId, elementRef, additive);
    const primary = parseMember(primaryOf(next));
    return {
      // The PRIMARY's cabinet is the one the single-unit panels are about. A
      // set that reaches into three wardrobes still has one hand on it.
      selectedUnitId: primary?.unitId ?? unitId,
      // Pointing at a piece is pointing at ONE cabinet: a multi-selection of
      // CABINETS ends here, because the properties that follow are the piece's.
      // (`selectedUnitIds.length > 1` is what opens the CABINET bulk panel —
      // a piece selection must never do that, however many cabinets it spans.)
      selectedUnitIds: primary?.unitId ? [primary.unitId] : [],
      selectedSection: 0,
      rightPanelOpen: true,
      selectedElements: next,
      selectedElement: primary,
      centreBetween: null,
      ...(unitId !== s.selectedUnitId ? { inspector: inspectorAfterSelect(s, true) } : {}),
    };
  })),
  clearElement: () => set({ selectedElement: null, selectedElements: [], centreBetween: null }),

  // ─── T79 (CLAUDE.md F12): CENTER BETWEEN, TWO PICKS IN ORDER ─────────────
  // *"naciskasz wycentruj pomiędzy, wybierasz dolny i górny element i wtedy
  // wszystkie półki pomiędzy tymi elementami się centrują."* Armed by the
  // shelf menu's `Center between`; `selectElement` above reads the next two
  // picks on THAT cabinet into it, and the project store runs the centring
  // the moment the second lands (this store never reads that one). Escape, or
  // a click anywhere else, ends it.
  centreBetween: null,               // { unitId, lower, upper } | null
  // ─── CHAT FIX 30.10.2026 · TWO PIECES ALREADY HELD ARE THE TWO PICKS ─────
  // The owner: *"powinno sie najpierw wybrac dwie polki a pozniej nacisnac
  // centre between i cala reszta pomiedzy tymi polkami sie centruja"*. So the
  // button reads the selection first: exactly two pieces of THIS cabinet held
  // (Ctrl+click, T36 F2) are the lower and the upper pick, and the act runs
  // the moment the button is pressed (the project store's subscription, as it
  // runs on the second pick); the store reads the two by height and refuses
  // a piece that may not be picked in its own words. Any other selection arms
  // the two picks as before: press, then the lower, then the upper.
  armCentreBetween: (unitId) => set((s) => {
    if (!unitId) return { centreBetween: null };
    const held = (s.selectedElements || []).map(parseMember)
      .filter((m) => m?.unitId === unitId && m.elementRef);
    if (held.length === 2) {
      return { centreBetween: { unitId, lower: held[0].elementRef, upper: held[1].elementRef } };
    }
    return { centreBetween: { unitId, lower: null, upper: null } };
  }),
  cancelCentreBetween: () => set({ centreBetween: null }),

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

  // ─── TURN 40 (CLAUDE.md F4c): "TAKE ME THERE" ─────────────────────────────
  //
  // The owner, on clicking a Check finding: *"super, teraz tak robi, ale nie
  // bierze nas dokładnie do tego miejsca… jeśli to ta półka, powinno nas wziąć
  // do tej półki, jakby najechać kamerą na nią, lub na zawias który jest
  // problemem."*
  //
  // `focusOn` above takes a WORLD POINT, and the Check panel does not have one:
  // a panel's world centre needs the unit's origin, its wall's angle and its
  // own rotation, all of which live in `3d/UnitView.jsx` where the frame is
  // (`panelWorldCentre`). Asking the panel to work that out would be a second
  // copy of the placement maths, which is how a camera ends up flying at the
  // wrong cabinet on wall 3 of an L-shaped room.
  //
  // So the request names the PIECE and the scene resolves it. `atMm` is the
  // height up that piece to centre on, which is what makes *"lub na zawias
  // który jest problemem"* literally true: a hinge fault flies to the hinge's
  // own row on the door rather than to the middle of it.
  focusPanel: null,                  // { unitId, panelId, atMm, at }
  focusOnPanel: (unitId, panelId, { atMm = null } = {}) => set(
    unitId && panelId
      ? { focusPanel: { unitId, panelId, atMm, at: Date.now() } }
      : {},
  ),
  clearFocusPanel: () => set({ focusPanel: null }),

  // Which fronts are open, and how far (0 = shut, 1 = fully open). Purely
  // visual: nothing here reaches the engine, the BOM or the CNC sheet.
  openFronts: {},                    // { [unitId]: { [panelId]: 0..1 } }
  /**
   * ─── TURN 58 (CLAUDE.md F6): A CLOSING DOOR CLOSES WHAT IT COVERS ────────
   *
   * The owner: *"jak zamykasz szafy drzwi, to szuflady muszą się zamykać
   * automatycznie."*  A real leaf swinging shut would hit a drawer standing
   * out of the carcass, so the picture must not draw one closed over it.
   *
   * CLOSING ONLY. Opening a leaf opens NOTHING — a joiner who swings a door
   * to look inside has not asked for six drawers to come at him.
   *
   * `covers` is the list this leaf stands in front of, worked out by GEOMETRY
   * in `engine/covers.js` and handed in by the view that knows what is on
   * screen. Absent — every caller before tonight — the toggle is exactly the
   * two lines it always was.
   *
   * The easing is untouched: these values are the same 0..1 the animation
   * already rides at `delta · 8`, so nothing teleports.
   */
  toggleFront: (unitId, panelId, covers = null) => set((s) => {
    const unit = s.openFronts[unitId] || {};
    const next = (unit[panelId] ?? 0) > 0.5 ? 0 : 1;
    const mine = { ...unit, [panelId]: next };
    // `covers` is either a plain list of front ids or `{ fronts, kits }` — the
    // view hands whichever it has, and both read the same here.
    const fronts = Array.isArray(covers) ? covers : (covers?.fronts || []);
    const kits = Array.isArray(covers) ? [] : (covers?.kits || []);
    if (next > 0.5 || (!fronts.length && !kits.length)) {
      return { openFronts: { ...s.openFronts, [unitId]: mine } };
    }
    // Shutting. Everything behind this leaf glides shut with it.
    for (const id of fronts) mine[id] = 0;
    if (!kits.length) return { openFronts: { ...s.openFronts, [unitId]: mine } };
    const nextKits = { ...s.openKits };
    // …and a LOWERED pull-down parks: lowered, it is in the leaf's way too.
    for (const id of kits) nextKits[id] = 0;
    return { openFronts: { ...s.openFronts, [unitId]: mine }, openKits: nextKits };
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

  // ─── 30.08: THE CONERO PULL-DOWN, LOWERED OR PARKED ───────────────────────
  // The owner's two green points made the rail a mechanism, and a mechanism
  // the scene can swing needs the same kind of switch a door has. It is NOT
  // in `openFronts` on purpose: that map is doors, and turn 25's open-all
  // button must keep meaning doors — a press that also dropped every
  // pull-down rail in the project would be a surprise. Purely visual, like
  // every front animation above: nothing here reaches the engine.
  openKits: {},                      // { [kitId]: 0 | 1 }
  toggleKit: (kitId) => set((s) => {
    if (!kitId) return {};
    const next = (s.openKits[kitId] ?? 0) > 0.5 ? 0 : 1;
    return { openKits: { ...s.openKits, [kitId]: next } };
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
    // T58-F6: Open-all switching OFF is the same act as closing every leaf by
    // hand, so it takes everything with it — the drawers ride `openFronts` and
    // go with the map, and a lowered pull-down parks with them.
    if (!anyShut) return { openFronts: {}, openKits: {} };
    const next = { ...s.openFronts };
    for (const e of rows) {
      const unit = { ...(next[e.unitId] || {}) };
      for (const id of e.panelIds) unit[id] = 1;
      next[e.unitId] = unit;
    }
    return { openFronts: next };
  }),

  // ─── T82 F6 · THE HAWA DOOR'S OWN SWITCH ─────────────────────────────────
  // CLAUDE.md T82 F6: "A toggle on the pocket (right panel: Door closed /
  // open; the same in the viewer's "Open all")". The state is this same
  // `openFronts` map (one switch: Open all, a double click on the leaf and the
  // right panel all write it); this is the pocket's one press for its door or
  // its two: any shut, all open; all open, all shut. Purely visual, nothing
  // reaches the engine.
  togglePocketDoor: (unitId, doorIds) => set((s) => {
    const ids = (doorIds || []).filter(Boolean);
    if (!unitId || !ids.length) return {};
    const unit = { ...(s.openFronts[unitId] || {}) };
    const anyShut = ids.some((id) => !((unit[id] ?? 0) > 0.5));
    for (const id of ids) unit[id] = anyShut ? 1 : 0;
    return { openFronts: { ...s.openFronts, [unitId]: unit } };
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
    // TURN 59: memory-only mode writes nothing.
    if (persistenceOn()) {
      try { localStorage.setItem(SNAP_KEY, String(step)); } catch { /* private mode */ }
    }
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
    /** The sweep, `hideMs` plus a beat after `expiresAt`, through `expired`. */
    const armClock = (expiresAt) => {
      if (expiresAt == null) return;
      setTimeout(() => {
        const gone = expired(get().messages, Date.now());
        if (gone.length) set((s) => ({ messages: s.messages.filter((m) => !gone.includes(m.id)) }));
      }, Math.max(0, expiresAt - Date.now()) + 60);
    };
    if (!message) return null;
    const now = Date.now();
    const profile = getCabinetProfile();
    const msg = makeMessage(message, tone, { at: now, profile, action: opts?.action || null });
    // ─── CHAT FIX 15.08.2026: SAY IT ONCE, WITH A COUNT ─────────────────────
    // Owner, off six identical yellows papering his corner: the SAME sentence
    // queued again folds into the one already standing — "3 × " in front of
    // it — instead of a wall of repeats. Different sentences still queue;
    // a red never folds into anything (an error earns its own line).
    const twin = msg.level !== 'red' && get().messages.find(
      (m) => m.level === msg.level && (m.baseMessage || m.message) === message,
    );
    if (twin) {
      const count = (twin.count || 1) + 1;
      const folded = `${count} × ${message}`;
      set((s) => ({
        messages: s.messages.map((m) => (m.id === twin.id
          ? {
            ...m, count, baseMessage: message, message: folded, at: now, expiresAt: msg.expiresAt,
          }
          : m)),
        // T79 F1: the fold is ONE row of the Changes list, updated in place.
        history: recordHistory(s.history, historyRow({
          ...twin, count, baseMessage: message, message: folded, at: now,
        }), historyMax(profile)),
      }));
      // 19.10.2026: the fold restarts the clock, so the timer is armed again.
      armClock(msg.expiresAt);
      return twin.id;
    }
    set((s) => {
      const messages = trimQueue(pushMessage(s.messages, msg), queueMax(profile));
      // T79 F1: kept as a row when first shown. A sentence `pushMessage` folded
      // into one already standing keeps that one's id, so it stays one row.
      const shown = messages.find((m) => m.id === msg.id)
        || messages.find((m) => m.message === msg.message && m.level === msg.level);
      return {
        messages,
        history: shown ? recordHistory(s.history, historyRow(shown), historyMax(profile)) : s.history,
      };
    });
    // CHAT FIX 19.10.2026 (the owner: "wszystkie chowaja sie po 4 s, czerwone
    // po 8 s": "tak pls"): every level has a clock (engine/messages.js
    // `hideMs`), so every message arms one; its row in the Changes list stays.
    armClock(msg.expiresAt);
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

  // ─── T79 F1 · THE CHANGES LIST ────────────────────────────────────────────
  // *"na dole po lewej zrobić jakby listę rozwijaną i tam historia zmian."*
  // Every message as it was first shown, newest first, the last
  // `profile.ui.messages.historyMax` of them (engine/messages.js
  // `recordHistory`). Collapsed by default and never persisted: this
  // session's notices, not the project's record.
  history: [],
  historyOpen: false,
  toggleHistory: () => set((s) => ({ historyOpen: !s.historyOpen })),
  closeHistory: () => set((s) => (s.historyOpen ? { historyOpen: false } : {})),
  clearHistory: () => set({ history: [] }),

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
