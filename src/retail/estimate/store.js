import { create } from 'zustand';
import { useProjectStore } from '../../stores/projectStore.js';

// ─── F5 · THE ESTIMATE — SEVERAL WARDROBES, NO PRICES, NO DISK ─────────────
//
// *"the list of designs in this estimate (a client may design several
// wardrobes — the PSW multi-window law)"* and *"ADD ANOTHER WARDROBE starts a
// fresh design in the same estimate; the summary lists all; the stage shows
// the selected one."*
//
// The shared `projectStore` holds ONE project, which is right: it is the brain
// of the wardrobe currently on the stage. So this store holds the OTHERS, as
// snapshots of that same shape, and switching design is: snapshot what is on
// the stage, then `loadProject` the one being switched to. The shared store's
// own loader does the migrating, so a design made ten minutes ago comes back
// through exactly the door a saved job does.
//
// MEMORY ONLY. Nothing here touches localStorage, Supabase or a network. A
// reload loses the estimate, and F5.3's SAVE ESTIMATE — a file the client
// keeps — is the honest answer to that until R2 has a database.

let seq = 0;
const nextId = () => { seq += 1; return `design-${seq}`; };

const snapshot = () => {
  const s = useProjectStore.getState();
  return JSON.parse(JSON.stringify({ project: s.project, units: s.units }));
};

const restore = (record) => {
  if (!record) return false;
  useProjectStore.getState().loadProject(record.project, record.units);
  return true;
};

export const useEstimateStore = create((set, get) => ({
  /** [{ id, name, snapshot }] — the ACTIVE one's snapshot is stale by design. */
  designs: [],
  activeId: null,

  /** The client's own details, once they have filled the quote form in. */
  details: null,
  setDetails: (details) => set({ details }),

  /** Start the estimate with the wardrobe already on the stage. */
  begin: (name = 'Bedroom wardrobe') => {
    const id = nextId();
    set({ designs: [{ id, name, snapshot: snapshot() }], activeId: id });
    return id;
  },

  /** Rename the design on the stage (F4.6's name field). */
  rename: (id, name) => set((s) => ({
    designs: s.designs.map((d) => (d.id === id ? { ...d, name } : d)),
  })),

  /** Take a fresh copy of what is on the stage into the active record. */
  capture: () => set((s) => (s.activeId ? {
    designs: s.designs.map((d) => (d.id === s.activeId ? { ...d, snapshot: snapshot() } : d)),
  } : {})),

  /** F5.3 · ADD ANOTHER WARDROBE — the stage clears, the estimate does not. */
  addDesign: (startFresh, name = 'Second wardrobe') => {
    get().capture();
    startFresh(name);
    const id = nextId();
    set((s) => ({ designs: [...s.designs, { id, name, snapshot: snapshot() }], activeId: id }));
    return id;
  },

  /** Put a different design on the stage. */
  select: (id) => {
    const s = get();
    if (id === s.activeId) return false;
    s.capture();
    const want = get().designs.find((d) => d.id === id);
    if (!want || !restore(want.snapshot)) return false;
    set({ activeId: id });
    return true;
  },

  /** F5.3 · LOAD — a whole estimate the client saved earlier, back into memory. */
  loadEstimate: (doc) => {
    const designs = (doc?.designs || [])
      .filter((d) => d?.snapshot?.project)
      .map((d) => ({ id: nextId(), name: d.name || 'Wardrobe', snapshot: d.snapshot }));
    if (!designs.length) return false;
    restore(designs[0].snapshot);
    set({ designs, activeId: designs[0].id, details: doc?.details || null });
    return true;
  },

  activeDesign: () => get().designs.find((d) => d.id === get().activeId) || null,
}));
