/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F4.2 . THE COMPANY'S LINKS (CLAUDE.md T-CC2a law 3)
//
// The owner, 01.11.2026: *"kazdy tenant powinien sobie zlinkowac na maxa
// materialy na poczatku a pozniej dodawac sukcesywnie"*. One store for the
// company's links (catalogue id to one row of its Joinery Core stock) and the
// stock they point at, read once per session and again on the window's Retry.
// The links are the COMPANY's: this store never writes them into a project, and
// a project never holds one. A save goes to Joinery Core at once (one call).

import { create } from 'zustand';
import { loadJcStock, toMaterial } from '../lib/jcStock.js';
import { clearLink, loadLinks, saveLinks } from '../lib/jcLinks.js';
import { useAuthStore } from './authStore.js';

/** The tenant's name for "Saved for <company name>", or null. */
function companyName() {
  try {
    return useAuthStore.getState().tenant?.name || null;
  } catch {
    return null;
  }
}

let inflight = null;

export const useMaterialLinkStore = create((set, get) => ({
  links: new Map(),
  stock: [],
  categories: [],
  // 'idle' until the first read; 'loading'; then 'ok' | 'offline' | 'not-set-up' (the JC half not there yet).
  status: 'idle',
  error: null,
  // The stock read on its own: an empty stock and an offline stock are different sentences.
  stockStatus: 'idle',
  stockError: null,
  companyName: null,
  // A refusal said on the row it belongs to: { [cc_material_id]: words }.
  rowErrors: {},
  saving: {},

  /**
   * The stock and the links, together; once per session unless `force` (the window's Retry).
   * @param {object} [opts] { force, db } (db: lib/jcApi.js withDb by default; a test hands a fake)
   */
  load: async ({ force = false, db } = {}) => {
    const s = get();
    if (!force && (s.status === 'ok' || s.status === 'not-set-up')) return { status: s.status, error: s.error };
    if (inflight && !force) return inflight;
    set({ status: 'loading', stockStatus: 'loading', companyName: companyName() });
    const opts = db ? { db } : {};
    inflight = (async () => {
      const [stockRes, linkRes] = await Promise.all([loadJcStock(opts), loadLinks(opts)]);
      const stockOk = !stockRes.error;
      const next = {
        stock: stockOk ? stockRes.items.map(toMaterial) : get().stock,
        categories: stockOk ? stockRes.categories : get().categories,
        stockStatus: stockOk ? 'ok' : 'offline',
        stockError: stockRes.error || null,
        companyName: companyName(),
      };
      if (linkRes.status === 'ok') {
        Object.assign(next, { links: linkRes.links, status: stockOk ? 'ok' : 'offline', error: stockOk ? null : stockRes.error });
      } else {
        Object.assign(next, {
          links: linkRes.status === 'not-set-up' ? new Map() : get().links,
          status: linkRes.status === 'not-set-up' ? 'not-set-up' : 'offline',
          error: linkRes.error,
        });
      }
      set(next);
      inflight = null;
      return { status: next.status, error: next.error };
    })();
    return inflight;
  },

  /**
   * Link entries to stock rows, at once (one call per 500). On success the links stand in the store as
   * saved; a refusal is said on every row it was for, in JC's words.
   * @param {Array<{cc_material_id, stock_item_id, yield?, sheet_width_mm?, sheet_length_mm?, coverage_m2_per_l?}>} entries
   */
  link: async (entries = [], { db } = {}) => {
    const list = (Array.isArray(entries) ? entries : [entries]).filter((e) => e && e.cc_material_id);
    if (!list.length) return { ok: false, error: null, saved: 0 };
    const ids = list.map((e) => e.cc_material_id);
    set((s) => ({ saving: { ...s.saving, ...Object.fromEntries(ids.map((id) => [id, true])) } }));
    const res = await saveLinks(list, db ? { db } : {});
    const done = (s) => Object.fromEntries(Object.entries(s.saving).filter(([id]) => !ids.includes(id)));
    if (res.error) {
      set((s) => ({
        saving: done(s),
        rowErrors: { ...s.rowErrors, ...Object.fromEntries(ids.map((id) => [id, res.error])) },
        ...(res.status === 'not-set-up' ? { status: 'not-set-up', error: res.error } : {}),
        ...(res.status === 'offline' ? { error: res.error } : {}),
      }));
      return { ok: false, error: res.error, saved: res.saved };
    }
    const at = new Date().toISOString();
    set((s) => {
      const links = new Map(s.links);
      for (const e of list) {
        links.set(e.cc_material_id, {
          cc_material_id: e.cc_material_id,
          stock_item_id: e.stock_item_id || null,
          yield: e.yield ?? null,
          sheet_width_mm: e.sheet_width_mm ?? null,
          sheet_length_mm: e.sheet_length_mm ?? null,
          coverage_m2_per_l: e.coverage_m2_per_l ?? null,
          updated_by: null,
          updated_at: at,
        });
      }
      const rowErrors = { ...s.rowErrors };
      for (const id of ids) delete rowErrors[id];
      return { links, rowErrors, saving: done(s) };
    });
    return { ok: true, error: null, saved: res.saved };
  },

  /** Unlink one entry, at once. */
  unlink: async (ccMaterialId, { db } = {}) => {
    const id = String(ccMaterialId || '');
    if (!id) return { ok: false, error: null };
    set((s) => ({ saving: { ...s.saving, [id]: true } }));
    const res = await clearLink(id, db ? { db } : {});
    const done = (s) => { const n = { ...s.saving }; delete n[id]; return n; };
    if (res.error) {
      set((s) => ({ saving: done(s), rowErrors: { ...s.rowErrors, [id]: res.error } }));
      return { ok: false, error: res.error };
    }
    set((s) => {
      const links = new Map(s.links);
      links.delete(id);
      const rowErrors = { ...s.rowErrors };
      delete rowErrors[id];
      return { links, rowErrors, saving: done(s) };
    });
    return { ok: true, error: null };
  },
}));
