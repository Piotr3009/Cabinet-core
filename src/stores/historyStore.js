import { create } from 'zustand';
import { useProjectStore } from './projectStore.js';
import { useUiStore } from './uiStore.js';
import { getCabinetProfile } from '../engine/profile.js';
import { isBatching, onBatchEnd } from './historyBatch.js';

// ─── Undo / Redo (turn 12, CLAUDE.md F9) ────────────────────────────────────
//
// "Ctrl+Z (+ a toolbar button) and Ctrl+Y / Ctrl+Shift+Z. Project-store
// history: snapshot on every mutating action (add/remove/move/edit/settings
// change), bounded depth (profile number, e.g. 50), survives nothing (no
// persistence — session only). Zustand snapshot pattern; selection state
// sensibly restored."
//
// ─── WHY IT IS A SUBSCRIBER AND NOT A COMMIT CALL ───
//
// The obvious shape is a `commit()` at the top of every mutating action. The
// project store has about sixty of them, and the day somebody adds the
// sixty-first without it is the day undo starts silently skipping a kind of
// edit — the worst failure this feature has, because it looks like it works.
//
// So it watches instead. zustand hands a subscriber the state and the state
// before it, and the project store never mutates in place — every action
// returns fresh objects through `set` — so the PREVIOUS `{ project, units }` is
// already a complete, frozen-in-practice snapshot. Nothing has to be cloned and
// nothing can be forgotten: an action that changes the project is undoable by
// construction.
//
// ─── ONE DRAG IS ONE UNDO ───
//
// A shelf drag writes to the store on every pointer frame. Pushing each of
// those is a hundred undo steps for one gesture, and the joiner presses Ctrl+Z
// eleven times to move a shelf back where it was.
//
// The burst is coalesced on a TRAILING timer: the first change of a burst
// remembers the state BEFORE it, every change after that only restarts the
// clock, and the snapshot is pushed once the hand has stopped. That is exactly
// one undo step per gesture, with no list of "which actions are draggy" to keep
// in step with the store.
//
// ─── WHAT IT DOES NOT DO ───
//
// It does not persist. CLAUDE.md says "survives nothing", and it is right: an
// undo stack restored from localStorage would offer to undo something the
// joiner did yesterday, on a project he may since have saved.

const snapshotOf = (state) => ({
  project: state.project,
  units: state.units,
  // The selection travels with the snapshot so that undoing a delete gives the
  // cabinet back SELECTED, which is where the hand already is.
  selectedUnitId: useUiStore.getState().selectedUnitId,
  selectedElement: useUiStore.getState().selectedElement,
});

const settings = () => {
  const h = getCabinetProfile()?.editor?.history || {};
  return {
    depth: Number(h.depth) > 0 ? Math.trunc(h.depth) : 50,
    coalesceMs: Number(h.coalesceMs) >= 0 ? Number(h.coalesceMs) : 400,
  };
};

export const useHistoryStore = create((set, get) => ({
  past: [],
  future: [],

  /** Can the buttons be pressed? What the toolbar and the menu read. */
  canUndo: () => get().past.length > 0 || pendingSnapshot != null,
  canRedo: () => get().future.length > 0,

  /**
   * Put a snapshot on the stack.
   *
   * A NEW edit is the end of any redo path — that is what every undo stack in
   * every application does, and the alternative (keeping the future around) is
   * a redo that quietly applies an edit to a project it was not taken from.
   */
  push: (snapshot) => set((s) => ({
    past: [...s.past, snapshot].slice(-settings().depth),
    future: [],
  })),

  undo: () => {
    flush();
    const { past } = get();
    if (!past.length) return false;
    const previous = past[past.length - 1];
    const current = snapshotOf(useProjectStore.getState());
    set({ past: past.slice(0, -1), future: [...get().future, current].slice(-settings().depth) });
    apply(previous);
    return true;
  },

  redo: () => {
    flush();
    const { future } = get();
    if (!future.length) return false;
    const next = future[future.length - 1];
    const current = snapshotOf(useProjectStore.getState());
    set({ future: future.slice(0, -1), past: [...get().past, current].slice(-settings().depth) });
    apply(next);
    return true;
  },

  /**
   * Forget everything. Opening or starting a project is not an edit to the one
   * that was open — it is a different job, and undoing across the boundary
   * would put half of one project inside the other.
   */
  clear: () => {
    cancel();
    set({ past: [], future: [] });
  },
}));

// ─── The watcher ────────────────────────────────────────────────────────────

/** The state before the current burst, waiting for the hand to stop. */
let pendingSnapshot = null;
let timer = null;
/** True while an undo/redo is writing, so the write is not recorded as an edit. */
let applying = false;

function cancel() {
  if (timer) clearTimeout(timer);
  timer = null;
  pendingSnapshot = null;
}

function flush() {
  if (!pendingSnapshot) return;
  const snapshot = pendingSnapshot;
  cancel();
  useHistoryStore.getState().push(snapshot);
}

function apply(snapshot) {
  applying = true;
  try {
    useProjectStore.setState({ project: snapshot.project, units: snapshot.units, dirty: true });
    // Selection, sensibly: a piece that is no longer there cannot be selected,
    // and pretending otherwise leaves the right-hand panel describing nothing.
    const ui = useUiStore.getState();
    const exists = snapshot.units.some((u) => u.id === snapshot.selectedUnitId);
    if (exists) {
      if (snapshot.selectedElement) ui.selectElement(snapshot.selectedUnitId, snapshot.selectedElement.elementRef);
      else ui.selectUnit(snapshot.selectedUnitId);
    } else {
      ui.clearSelection();
    }
  } finally {
    applying = false;
  }
}

/**
 * Start watching. Called once from main.jsx; safe to call twice.
 *
 * Returns the unsubscribe function, which is what a test uses to leave the
 * global stores as it found them.
 */
let stop = null;
let unwatchBatch = null;
export function watchProjectHistory() {
  if (stop) return stop;
  // One snapshot when the outermost batch closes — however many writes it made.
  unwatchBatch = onBatchEnd(() => { if (!applying) flush(); });
  stop = useProjectStore.subscribe((state, previous) => {
    if (applying) return;
    // Only the PROJECT and its UNITS are history. `dirty` flips on every write
    // and is not an edit; neither is anything else the store may grow.
    if (state.project === previous.project && state.units === previous.units) return;
    // A different project altogether — not an edit to this one.
    if (state.project?.id !== previous.project?.id && previous.project?.id != null) {
      useHistoryStore.getState().clear();
      return;
    }
    if (!pendingSnapshot) {
      pendingSnapshot = {
        project: previous.project,
        units: previous.units,
        selectedUnitId: useUiStore.getState().selectedUnitId,
        selectedElement: useUiStore.getState().selectedElement,
      };
    }
    if (timer) clearTimeout(timer);
    // ─── Turn 13 (CLAUDE.md F5.4): A BULK ACTION IS ONE STEP ───
    // Six cabinets given a plinth is six `set` calls in one tick. The trailing
    // timer would already have merged them — but only if there IS a timer, and
    // a test sets `coalesceMs` to zero precisely so there is not. A batch is
    // therefore declared rather than inferred: the snapshot above is kept, and
    // the push waits for `onBatchEnd` below.
    if (isBatching()) return;
    const { coalesceMs } = settings();
    // coalesceMs 0 is "no coalescing", which is what a test wants: the push is
    // immediate rather than a timer nobody is waiting for.
    if (coalesceMs <= 0) { flush(); return; }
    timer = setTimeout(flush, coalesceMs);
  });
  return stop;
}

export function unwatchProjectHistory() {
  cancel();
  if (stop) stop();
  stop = null;
  if (unwatchBatch) unwatchBatch();
  unwatchBatch = null;
}

/** For tests: settle any burst without waiting for the timer. */
export function flushHistory() {
  flush();
}
