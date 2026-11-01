/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F9 . SUGGEST, NEVER DECIDE (CLAUDE.md T-CC2a law 8)
//
// The owner, 01.11.2026: *"tylko podpowiedz od akceptacji tenanta"*. Cabinet
// Core may point at ONE row of the company's Joinery Core stock for a catalogue
// entry; nothing is linked until the company presses Accept. The rules
// (PROPOSED, F9.1), and nothing else:
//   a sheet with a decor: a stock row whose name or item number holds the decor
//     code ("H3325", any separator between the letter and the digits) AND whose
//     thickness equals the entry's;
//   an MDF sheet: the word MDF in the name or item number, and the thickness;
//   hardware: the entry's own article number, exact, in the row's name or
//     number (only where the entry has one).
// At most one suggestion per entry. The words are read off the stock row the
// company typed in Joinery Core; a size is NEVER read out of a text (law 6):
// the sheet's width and length are typed when the company links it.
//
// Below the rules, the arithmetic of the link form (F8.5): the sheet's two
// sizes, the offcut allowance as a percentage of the yield, the paint's
// coverage, checked against the rules of JC's own `cc_save_material_links`
// before anything is sent. Pure: no store, no React, no network.

/**
 * The bounds JC's `cc_save_material_links` refuses outside (CLAUDE.md T-CC2a,
 * WHAT JOINERY CORE GIVES: 22023). Mirrored here so the form says it in words
 * before the call, never instead of the call.
 */
const LINK_RULES = Object.freeze({
  sheetMm: Object.freeze({ min: 100, max: 6000 }),
  yield: Object.freeze({ min: 1, max: 3 }),
  coverage: Object.freeze({ min: 0.1, max: 100 }),
});

const lower = (v) => String(v ?? '').toLowerCase();
const fold = (v) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const escape = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The decor code an entry carries: "H3325" for the decor "H3325_28", or null. */
export function decorCodeOf(entry) {
  const id = String(entry?.decorId || '').trim();
  if (!id) return null;
  const code = id.split(/[_\s]/)[0].toUpperCase();
  return /^[A-Z]+\d+$/.test(code) ? code : null;
}

/** "H3325" in a text, any separator between the letters and the digits, never inside a longer code. */
function holdsCode(text, code) {
  const m = String(code || '').match(/^([A-Z]+)(\d+)$/);
  if (!m) return false;
  return new RegExp(`(^|[^a-z0-9])${m[1]}[\\s._/-]*${m[2]}(?![0-9])`, 'i').test(String(text || ''));
}

/** Any EGGER-shaped decor code in a text (a letter and three or more digits). */
function holdsAnyCode(text) {
  return /(^|[^a-z0-9])[a-z][\s._/-]*\d{3,5}(?![0-9])/i.test(String(text || ''));
}

/** The word MDF, whole (digits may touch it: "MDF18", "18MDF"). */
function saysMdf(text) {
  return /(^|[^a-z])mdf(?![a-z])/i.test(String(text || ''));
}

/** The row is cut at the entry's thickness: both numbers, equal. */
function sameThickness(row, entry) {
  const a = Number(row?.thickness);
  const b = Number(entry?.thickness);
  return a > 0 && b > 0 && a === b;
}

/** The article number of an entry, exact, in a row's number (separators folded) or as a whole word of its name. */
function holdsArticle(row, article) {
  const a = String(article || '').trim();
  if (!a) return 0;
  if (fold(row?.item_number) && fold(row.item_number) === fold(a)) return 2;
  const word = new RegExp(`(^|[^a-z0-9])${escape(a)}([^a-z0-9]|$)`, 'i');
  return word.test(String(row?.item_number || '')) || word.test(String(row?.name || '')) ? 1 : 0;
}

/**
 * The ONE stock row CC suggests for one catalogue entry, or null. `stock` is
 * the store's list (lib/jcStock.js toMaterial rows), in Joinery Core's order
 * (by name); the first row that meets the rule wins, so the answer is the same
 * on every computer.
 */
export function suggestFor(entry, stock = []) {
  if (!entry || entry.retired) return null;
  const rows = Array.isArray(stock) ? stock.filter((r) => r && r.id != null && !r.placeholder) : [];
  if (!rows.length) return null;
  const said = (r) => `${r.name || ''} ${r.item_number || ''}`;

  if (entry.kind === 'sheet' && entry.decorId) {
    const code = decorCodeOf(entry);
    if (!code) return null;
    return rows.find((r) => sameThickness(r, entry) && (holdsCode(r.name, code) || holdsCode(r.item_number, code))) || null;
  }
  if (entry.kind === 'sheet' && entry.brand === 'mdf') {
    const hits = rows.filter((r) => sameThickness(r, entry) && saysMdf(said(r)));
    // A decor-faced MDF ("H3325 on MDF 18") still says MDF; a plain one is the better first answer.
    return hits.find((r) => !holdsAnyCode(said(r))) || hits[0] || null;
  }
  if (entry.kind === 'hardware' && entry.articleNo) {
    let best = null;
    let score = 0;
    for (const r of rows) {
      const s = holdsArticle(r, entry.articleNo);
      if (s > score) { best = r; score = s; }
      if (score === 2) break;
    }
    return best;
  }
  return null;
}

/**
 * Is this entry linked to a row the company still has? `links` is the store's
 * Map (or a plain object); `stockOk` false means the stock was not read, and a
 * link is then taken at its word.
 */
export function linkStatus(entry, links, stock = [], { stockOk = true } = {}) {
  const id = String(entry?.id || '');
  const link = links instanceof Map ? links.get(id) : links?.[id];
  if (!link || !link.stock_item_id) return { status: 'not-linked', link: null, row: null };
  const row = (stock || []).find((r) => r && r.id === link.stock_item_id) || null;
  if (!row && stockOk) return { status: 'removed', link, row: null };
  return { status: 'linked', link, row };
}

/**
 * The suggestions of a list of entries: entry id to stock row, for the entries
 * that have no live link (never linked, or linked to a row Joinery Core no
 * longer has). Nothing is linked here; a suggestion is a sentence on a row.
 */
export function suggestAll(entries = [], stock = [], links = new Map(), { stockOk = true } = {}) {
  const out = new Map();
  if (!stockOk) return out;
  for (const e of entries || []) {
    if (!e || e.retired) continue;
    if (linkStatus(e, links, stock, { stockOk }).status === 'linked') continue;
    const row = suggestFor(e, stock);
    if (row) out.set(e.id, row);
  }
  return out;
}

// ─── THE LINK FORM (F8.5) ───────────────────────────────────────────────────

/** "10" for a yield of 1.10, or '' when there is none. */
export function offcutPctOf(yieldValue) {
  const y = Number(yieldValue);
  if (!(y >= 1)) return '';
  return String(Math.round((y - 1) * 10000) / 100);
}

/** The yield a typed offcut percentage stands for: 10 gives 1.1. */
export function yieldOfPct(pct) {
  const p = Number(pct);
  if (!Number.isFinite(p)) return null;
  return Math.round((1 + p / 100) * 10000) / 10000;
}

const blank = (v) => v == null || String(v).trim() === '';

/**
 * A sheet's link fields from what was typed. Both sizes are required, whole
 * millimetres from 100 to 6000; the offcut allowance is a percentage, blank
 * meaning "the workshop's own" (the link then holds no yield and the BOM reads
 * `profile.materials.sheetYield`). Resolves `{ ok, values, errors }`; `errors`
 * holds the words per field.
 */
export function sheetFields({ width, length, offcutPct } = {}) {
  const errors = {};
  const { min, max } = LINK_RULES.sheetMm;
  const size = (v, label) => {
    if (blank(v)) { errors[label] = 'Required'; return null; }
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) { errors[label] = `Whole millimetres, ${min} to ${max}`; return null; }
    return n;
  };
  const w = size(width, 'width');
  const l = size(length, 'length');
  let y = null;
  if (!blank(offcutPct)) {
    y = yieldOfPct(offcutPct);
    if (y == null || y < LINK_RULES.yield.min || y > LINK_RULES.yield.max) {
      errors.offcut = `0 to ${Math.round((LINK_RULES.yield.max - 1) * 100)} %`;
      y = null;
    }
  }
  const ok = Object.keys(errors).length === 0;
  const values = ok ? { sheet_width_mm: w, sheet_length_mm: l, ...(y != null ? { yield: y } : {}) } : null;
  return { ok, values, errors };
}

/** A paint's optional coverage (m² per litre): blank is fine, else 0.1 to 100. */
export function paintFields({ coverage } = {}) {
  if (blank(coverage)) return { ok: true, values: {}, errors: {} };
  const n = Number(coverage);
  const { min, max } = LINK_RULES.coverage;
  if (!Number.isFinite(n) || n < min || n > max) {
    return { ok: false, values: null, errors: { coverage: `${min} to ${max}` } };
  }
  return { ok: true, values: { coverage_m2_per_l: n }, errors: {} };
}

/** Does linking this entry ask for the small form first? 'sheet' | 'paint' | null (one click). */
export function formKindOf(entry) {
  if (entry?.kind === 'sheet') return 'sheet';
  if (entry?.kind === 'paint') return 'paint';
  return null;
}

/**
 * Accept all suggestions (F9.2): the links for the TICKED suggestions only,
 * the one sheet size applied to every ticked sheet. `items` is
 * `[{ entry, row }]`; `ticked` a Set of entry ids. Resolves `{ ok, links,
 * errors }`; when a ticked sheet needs the size and the size is not valid,
 * nothing is offered to save.
 */
export function acceptAllLinks(items = [], ticked = new Set(), sheet = {}) {
  const chosen = (items || []).filter((it) => it?.entry && it?.row && ticked.has(it.entry.id));
  const needsSheet = chosen.some((it) => formKindOf(it.entry) === 'sheet');
  const form = needsSheet ? sheetFields(sheet) : { ok: true, values: {}, errors: {} };
  if (!form.ok) return { ok: false, links: [], errors: form.errors };
  const links = chosen.map(({ entry, row }) => ({
    cc_material_id: entry.id,
    stock_item_id: row.id,
    ...(formKindOf(entry) === 'sheet' ? form.values : {}),
  }));
  return { ok: links.length > 0, links, errors: {} };
}

/** The sheet brand an entry is sold under ('egger', 'mdf', 'generic'): the Accept all panel asks one size per brand. */
export function sheetBrandOf(entry) {
  return String(entry?.brand || 'generic');
}

/**
 * Accept all suggestions, the size asked ONCE PER BRAND (Ewa's P6, the owner
 * approved 01.11.2026): an Egger board and an MDF board are rarely the same
 * sheet, so a size typed for one is never given to the other. `sizes` is
 * `{ [brand]: { width, length, offcutPct } }`. Resolves `{ ok, links, errors,
 * brands }`: `brands` the brands of the ticked sheets, in the order they come;
 * `errors` the words per brand and field. One brand with a bad size offers
 * nothing to save.
 */
export function acceptAllLinksByBrand(items = [], ticked = new Set(), sizes = {}) {
  const chosen = (items || []).filter((it) => it?.entry && it?.row && ticked.has(it.entry.id));
  const brands = [];
  for (const it of chosen) {
    const b = sheetBrandOf(it.entry);
    if (formKindOf(it.entry) === 'sheet' && !brands.includes(b)) brands.push(b);
  }
  const values = {};
  const errors = {};
  for (const b of brands) {
    const form = sheetFields(sizes?.[b] || {});
    if (form.ok) values[b] = form.values; else errors[b] = form.errors;
  }
  if (Object.keys(errors).length) return { ok: false, links: [], errors, brands };
  const links = chosen.map(({ entry, row }) => ({
    cc_material_id: entry.id,
    stock_item_id: row.id,
    ...(formKindOf(entry) === 'sheet' ? values[sheetBrandOf(entry)] : {}),
  }));
  return { ok: links.length > 0, links, errors: {}, brands };
}

/**
 * The link as it stood, to be saved back (the Undo of an Unlink, Ewa's P8):
 * the stock row, the sheet's sizes, its yield and the paint's coverage, each
 * only when the link held it. Numbers as numbers (Joinery Core's read may hand
 * a numeric back as text).
 */
export function linkBack(link, ccMaterialId = link?.cc_material_id) {
  if (!ccMaterialId || !link?.stock_item_id) return null;
  const has = (v) => v != null && v !== '' && Number.isFinite(Number(v));
  return {
    cc_material_id: String(ccMaterialId),
    stock_item_id: link.stock_item_id,
    ...(has(link.yield) ? { yield: Number(link.yield) } : {}),
    ...(has(link.sheet_width_mm) ? { sheet_width_mm: Number(link.sheet_width_mm) } : {}),
    ...(has(link.sheet_length_mm) ? { sheet_length_mm: Number(link.sheet_length_mm) } : {}),
    ...(has(link.coverage_m2_per_l) ? { coverage_m2_per_l: Number(link.coverage_m2_per_l) } : {}),
  };
}

/**
 * The search of the left table (F8.3): by the entry's name and its decor code,
 * case folded; "h3325", "H 3325" and "3325" all find "Egger H3325 ST28 ...".
 */
export function matchesEntry(entry, q) {
  const needle = lower(q).trim();
  if (!needle) return true;
  const code = decorCodeOf(entry) || '';
  const hay = `${lower(entry?.name)} ${lower(entry?.decorId)} ${lower(code)}`;
  if (hay.includes(needle)) return true;
  const n = fold(needle);
  return n.length > 0 && (fold(entry?.name).includes(n) || fold(code).includes(n));
}

/**
 * A short token for one catalogue id, for the window's markup (`data-link-row`)
 * and the walk that clicks it. The id itself is never written into the page
 * (*"CC powinien miec swoja (nie widoczna) numeracje materialow"*, the owner,
 * 12:50); the token is a hash of it (FNV-1a, base 36), the same on every run.
 */
export function rowToken(id) {
  let h = 0x811c9dc5;
  const s = String(id ?? '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `r${h.toString(36)}`;
}
