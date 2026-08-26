// ─── THE WAREHOUSE, LOCAL FIRST (turn 51, CLAUDE.md F7) ─────────────────────
//
// *"RLS on the table. Degrades gracefully with no network: the warehouse opens,
// says it is offline, and does not lose a typed row."*
//
// The last clause is the whole design. Every write lands in THIS STORE first
// and reaches `cc_warehouse` afterwards, and the second half is allowed to
// fail: a joiner typing a row at a bench with no signal is doing the same work
// he would be doing online, and the row is on his screen either way.
// `localStorage` is the shelf that survives the tab closing.
//
// `source` is what the surface prints: 'db' once the table has answered,
// 'local' for mock mode, a dead network, or a table nobody has run the
// migration against — the three are one code path (`lib/warehouseDb.js`).

import { create } from 'zustand';
import {
  listWarehouse, removeMaterialDb, saveManyDb, saveMaterialDb,
} from '../lib/warehouseDb.js';
import {
  PRICE_TYPED, mergeImport, migrateMaterial, newMaterial, renameSubcategory,
} from '../engine/warehouse.js';

const KEY = 'cc_warehouse_rows';

function loadShelf() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((r) => migrateMaterial(r)).filter(Boolean) : [];
  } catch {
    // A corrupt shelf is an empty shelf, never a crash on the way in.
    return [];
  }
}

function saveShelf(rows) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
  } catch { /* a full or private browser — the rows are still in memory */ }
}

export const useWarehouseStore = create((set, get) => ({
  rows: typeof localStorage !== 'undefined' ? loadShelf() : [],
  source: 'local',
  error: null,
  loading: false,
  /** What the last import did, for the panel's own sentence. */
  lastImport: null,

  /** Write the list, to the shelf and to memory. One place, so they agree. */
  put: (rows) => {
    saveShelf(rows);
    set({ rows });
  },

  /**
   * Ask the table, and keep what is here if it cannot answer.
   *
   * A row typed offline is NOT dropped when the table finally answers: the two
   * lists are merged on `id`, with the table winning where both have a row —
   * it is the shared copy, and a second machine may have corrected it — and the
   * local-only rows pushed up. That is the whole of "does not lose a typed row"
   * once the signal comes back.
   */
  load: async () => {
    set({ loading: true });
    const { rows, source, error } = await listWarehouse();
    if (source !== 'db') {
      set({ loading: false, source: 'local', error });
      return { source: 'local', error };
    }
    const here = get().rows;
    const fromDb = new Map(rows.map((r) => [r.id, r]));
    const mine = here.filter((r) => !fromDb.has(r.id));
    const merged = [...rows, ...mine];
    get().put(merged);
    set({ loading: false, source: 'db', error: null });
    // Anything that was only ever local goes up, now that there is somewhere
    // to put it.
    if (mine.length) await saveManyDb(mine);
    return { source: 'db', error: null };
  },

  /** A blank row, on the shelf at once so it can be typed into. */
  addMaterial: (patch = {}) => {
    const rows = get().rows;
    const born = newMaterial(rows, patch);
    get().put([...rows, born]);
    saveMaterialDb(born).then(({ ok }) => { if (!ok) set({ source: 'local' }); });
    return born;
  },

  /** Correct one. The patch is merged and the whole row re-normalised. */
  updateMaterial: (id, patch) => {
    const rows = get().rows;
    const at = rows.findIndex((r) => r.id === id);
    if (at < 0) return null;
    // A price TYPED HERE is a typed price, whatever it was before — which is
    // what makes the import's guard mean something (`mergeImport`).
    const touchedPrice = Object.prototype.hasOwnProperty.call(patch, 'cost_per_unit');
    const next = migrateMaterial({
      ...rows[at],
      ...patch,
      ...(touchedPrice ? { price_source: PRICE_TYPED } : {}),
    }, { rows });
    const out = [...rows];
    out[at] = { ...next, id: rows[at].id, item_number: rows[at].item_number };
    get().put(out);
    saveMaterialDb(out[at]).then(({ ok }) => { if (!ok) set({ source: 'local' }); });
    return out[at];
  },

  removeMaterial: (id) => {
    get().put(get().rows.filter((r) => r.id !== id));
    removeMaterialDb(id).then(({ ok }) => { if (!ok) set({ source: 'local' }); });
  },

  /** *"renameable in bulk"* — every row wearing the old name, in one write. */
  renameSubcategory: (from, to) => {
    const rows = renameSubcategory(get().rows, from, to);
    get().put(rows);
    saveManyDb(rows.filter((r) => r.subcategory === String(to || '').trim()))
      .then(({ ok }) => { if (!ok) set({ source: 'local' }); });
  },

  /**
   * An import — the CSV's rows merged in on `jc_uuid`.
   *
   * The arithmetic is `engine/warehouse.js mergeImport` and none of it is here:
   * overwrite the matched row, never add a second, and say which hand-typed
   * prices moved.
   */
  importRows: (incoming = []) => {
    const result = mergeImport(get().rows, incoming);
    get().put(result.rows);
    set({ lastImport: { added: result.added, updated: result.updated, repriced: result.repriced } });
    saveManyDb(result.rows).then(({ ok }) => { if (!ok) set({ source: 'local' }); });
    return result;
  },

  clearImportReport: () => set({ lastImport: null }),
}));
