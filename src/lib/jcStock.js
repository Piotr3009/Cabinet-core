/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T-CC1b F9 · THE STOCK IS JOINERY CORE'S (CLAUDE.md T-CC1b law 6) ────────
//
// The owner, 01.11.2026: *"materialy z JC (jego baza), przypisanie w CC"*;
// *"materials w JC ma wlasny UUID, i to samo musimy zrobic: przypisac UUID z JC
// do naszego materialu"*. A material in Cabinet Core IS a row of the tenant's
// `stock_items`, keyed by JC's uuid. Two reads through JC's own client
// (`withDb`, lib/jcApi.js), never a write; everything below the reads is pure:
// rows in, materials out. The categories are THE TENANT'S OWN (JC rule 6.5):
// they are shown as they are, never hardcoded here.

import { JC_OFFLINE, withDb } from './jcApi.js';

/** The columns of each read, exactly (CLAUDE.md T-CC1b F9.1). */
export const STOCK_COLUMNS = {
  stock_items: 'id, name, category, subcategory, unit, current_quantity, cost_per_unit, size, thickness, color, item_number, image_url, supplier_id',
  stock_categories: 'id, name, type, parent_category_id, display_order',
};

/** The empty stock in words (PROPOSED, CLAUDE.md T-CC1b F9.2), and where the button goes. */
export const STOCK_EMPTY = 'No materials in your Joinery Core stock yet. Add them in Joinery Core, Stock.';
export const STOCK_PAGE = '/stock.html';

/** A read's refusal in words: JC's own message, or JC_OFFLINE when JC did not answer. */
function words(res) {
  if (!res || res.mock) return JC_OFFLINE;
  if (res.error) return String(res.error?.message || res.error?.error || res.error || JC_OFFLINE);
  return null;
}

/**
 * The two reads. Resolves `{ items, categories, error }`; `error` is the first refusal in words
 * (JC_OFFLINE when JC did not answer) and the rows are then empty: the window says the words and
 * offers Retry, never an empty list in silence.
 */
export async function loadJcStock({ db = withDb } = {}) {
  const [items, cats] = await Promise.all([
    db((c) => c.from('stock_items').select(STOCK_COLUMNS.stock_items).order('name'), []),
    db((c) => c.from('stock_categories').select(STOCK_COLUMNS.stock_categories).order('display_order'), []),
  ]);
  const error = words(items) || words(cats);
  if (error) return { items: [], categories: [], error };
  const rows = (r) => (Array.isArray(r?.data) ? r.data : []);
  return { items: rows(items), categories: rows(cats), error: null };
}

// ─── THE KIND: the vocabulary the BOM already knows ─────────────────────────
// PROPOSED word lists (CLAUDE.md T-CC1b F9.1). Words are matched whole, on the
// row's category, subcategory and name, lower case.
const KIND_WORDS = {
  board: ['sheet', 'board', 'mdf', 'mfc', 'ply', 'plywood', 'melamine', 'veneer', 'worktop'],
  edging: ['edging', 'abs', 'pvc'],
  hardware: ['hinge', 'runner', 'drawer', 'handle', 'knob', 'leg', 'bracket', 'screw', 'cabineo',
    'dowel', 'lift', 'aventos', 'rail', 'fitting', 'ironmongery'],
};

/** Every word of a text, lower case, plurals folded ("hinges" reads "hinge"). */
function wordsOf(text) {
  const out = new Set();
  for (const w of String(text || '').toLowerCase().split(/[^a-z0-9]+/)) {
    if (!w) continue;
    out.add(w);
    if (w.length > 3 && w.endsWith('s')) out.add(w.slice(0, -1));
  }
  return out;
}

/** 'board' | 'edging' | 'hardware' | 'other' for one stock row. */
export function ccKindOf(row) {
  const said = wordsOf(`${row?.category || ''} ${row?.subcategory || ''} ${row?.name || ''}`);
  const has = (list) => list.some((w) => said.has(w));
  const t = Number(row?.thickness);
  if (Number.isFinite(t) && t > 3 && has(KIND_WORDS.board)) return 'board';
  if (has(KIND_WORDS.edging)) return 'edging';
  if (has(KIND_WORDS.hardware)) return 'hardware';
  return 'other';
}

/** One stock row as a Cabinet Core material. `id` IS JC's uuid; nothing of CC's own is minted. */
export function toMaterial(row) {
  return {
    id: row.id,
    jc_uuid: row.id,
    name: row.name || '',
    category: ccKindOf(row),
    group: row.category || '',
    subgroup: row.subcategory || '',
    thickness: Number(row.thickness) || null,
    unit: row.unit || '',
    price: Number(row.cost_per_unit) || 0,
    color: row.color || '',
    size: row.size || '',
    item_number: row.item_number || '',
    image_url: row.image_url || '',
    stock: Number(row.current_quantity),
  };
}

/** The tenant's categories as a tree, from `parent_category_id`, in `display_order`. */
export function categoryTree(categories = []) {
  const rows = (Array.isArray(categories) ? categories : []).filter((c) => c && c.id != null);
  const order = (a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0)
    || String(a.name || '').localeCompare(String(b.name || ''));
  const ids = new Set(rows.map((c) => c.id));
  const node = (c) => ({
    id: c.id,
    name: c.name || '',
    children: rows.filter((k) => k.parent_category_id === c.id).sort(order).map(node),
  });
  return rows.filter((c) => c.parent_category_id == null || !ids.has(c.parent_category_id)).sort(order).map(node);
}

/** The category names a tree node stands for: itself and every child under it. */
function namesUnder(tree = [], id = null) {
  const find = (nodes) => {
    for (const n of nodes) {
      if (n.id === id) return n;
      const hit = find(n.children || []);
      if (hit) return hit;
    }
    return null;
  };
  const hit = id == null ? null : find(tree);
  if (!hit) return null;
  const out = new Set();
  const walk = (n) => { out.add(String(n.name).toLowerCase()); (n.children || []).forEach(walk); };
  walk(hit);
  return out;
}

/**
 * The stock list narrowed: a search over name, item number, colour and size; a kind ('all' or one
 * of ccKindOf's words, 'paint' too); a category from the tree (the row's group or subgroup).
 */
export function filterStock(materials = [], { q = '', kind = 'all', category = null, tree = [] } = {}) {
  const needle = String(q || '').trim().toLowerCase();
  const names = namesUnder(tree, category);
  return (materials || []).filter((m) => {
    if (kind && kind !== 'all' && String(m.category || '').toLowerCase() !== kind) return false;
    if (names && !names.has(String(m.group || '').toLowerCase()) && !names.has(String(m.subgroup || '').toLowerCase())) return false;
    if (!needle) return true;
    return `${m.name || ''} ${m.item_number || m.code || ''} ${m.color || ''} ${m.size || ''}`.toLowerCase().includes(needle);
  });
}
