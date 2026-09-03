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
//
// ─── T64 F5 · …AND IT IS THE ITEM STORE OF THE ESTIMATE PAGE ───────────────
//
// The owner: *"wycena inna strona, na której masz 2–3 szafy i wtedy otwierasz
// szafę i edytujesz — zobacz na PRIME SASH WINDOWS."* PSW's model
// (`EstimatesPage.jsx` / `EstimateConfiguratorPage.jsx`, read tonight): one
// estimate = a list of items; one item at a time in the configurator, in ADD
// or EDIT mode; the list is where you go between items.
//
// CLAUDE.md: *"An item IS a saved design — use the existing SAVE/LOAD store as
// the item store; do not write a second persistence."* So this store grew
// what PSW's item list needs and nothing else: a `committed` flag (an item is
// in the estimate once DONE → ADD TO MY ESTIMATE has been pressed — PSW's
// `addItem`; until then it is the thing on the stage), a `thumb` (captured
// off the fixed rig, front view, at the moment of adding), `commit`,
// `duplicate` and `remove` (PSW's `removeItem(estimateId, itemId)` on the ×).
// ONE persistence path — this file — holds every item.

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
  /** [{ id, name, snapshot, committed, thumb }] — the ACTIVE one's snapshot is stale by design. */
  designs: [],
  activeId: null,

  /** The client's own details, once they have filled the quote form in. */
  details: null,
  setDetails: (details) => set({ details }),

  /** Start the estimate with the wardrobe already on the stage. */
  begin: (name = 'Bedroom wardrobe') => {
    const id = nextId();
    set({
      designs: [{
        id, name, snapshot: snapshot(), committed: false, thumb: null,
      }],
      activeId: id,
    });
    return id;
  },

  /** Rename the design on the stage (F4.6's name field). */
  rename: (id, name) => set((s) => ({
    designs: s.designs.map((d) => (d.id === id ? { ...d, name } : d)),
  })),

  /** Take a fresh copy of what is on the stage into the active record. */
  capture: (extra = null) => set((s) => (s.activeId ? {
    designs: s.designs.map((d) => (d.id === s.activeId
      ? { ...d, snapshot: snapshot(), ...(extra || {}) } : d)),
  } : {})),

  /**
   * T64 F5 · DONE → ADD TO MY ESTIMATE (add mode) / SAVE CHANGES (edit mode).
   * The same act in both: what is on the stage becomes the item, with its
   * front-view thumbnail. PSW: `addItem` / `updateItem` on the one estimate.
   */
  commit: ({ thumb = null } = {}) => {
    const s = get();
    if (!s.activeId) return null;
    s.capture({ committed: true, ...(thumb ? { thumb } : {}) });
    return s.activeId;
  },

  /** The items IN the estimate — what the page lists and the top bar counts. */
  items: () => get().designs.filter((d) => d.committed),

  /** F5.3 · ADD ANOTHER WARDROBE — the stage clears, the estimate does not. */
  addDesign: (startFresh, name = 'Second wardrobe') => {
    get().capture();
    startFresh(name);
    const id = nextId();
    set((s) => ({
      designs: [...s.designs, {
        id, name, snapshot: snapshot(), committed: false, thumb: null,
      }],
      activeId: id,
    }));
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

  /** T64 F5 · DUPLICATE — a second item from the first's own snapshot. */
  duplicate: (id) => {
    const s = get();
    if (id === s.activeId) s.capture();
    const from = get().designs.find((d) => d.id === id);
    if (!from) return null;
    const copyId = nextId();
    const copy = {
      ...from,
      id: copyId,
      name: `${from.name} (copy)`,
      snapshot: JSON.parse(JSON.stringify(from.snapshot)),
    };
    set((st) => {
      const at = st.designs.findIndex((d) => d.id === id);
      const designs = [...st.designs];
      designs.splice(at + 1, 0, copy);
      return { designs };
    });
    return copyId;
  },

  /**
   * T64 F5 · × — PSW's `removeItem`. Taking the active design out leaves the
   * stage as it is: the next EDIT or ADD ANOTHER puts something on it.
   */
  remove: (id) => {
    const s = get();
    if (!s.designs.some((d) => d.id === id)) return false;
    set((st) => ({
      designs: st.designs.filter((d) => d.id !== id),
      activeId: st.activeId === id ? null : st.activeId,
    }));
    return true;
  },

  /** F5.3 · LOAD — a whole estimate the client saved earlier, back into memory. */
  loadEstimate: (doc) => {
    const designs = (doc?.designs || [])
      .filter((d) => d?.snapshot?.project)
      .map((d) => ({
        id: nextId(), name: d.name || 'Wardrobe', snapshot: d.snapshot, committed: true, thumb: d.thumb || null,
      }));
    if (!designs.length) return false;
    restore(designs[0].snapshot);
    set({ designs, activeId: designs[0].id, details: doc?.details || null });
    return true;
  },

  activeDesign: () => get().designs.find((d) => d.id === get().activeId) || null,
}));
