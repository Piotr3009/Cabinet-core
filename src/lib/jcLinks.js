/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F4 . THE LINKS CLIENT (CLAUDE.md T-CC2a law 3: A LINK IS THE COMPANY'S)
//
// The owner, 01.11.2026: *"zebysmy przypisali pewne materialy na stale nie do
// projektu, tylko na stale"*; *"najwazniejsze zeby te linki sie nigdy klientowi
// nie rozlaczyly z jego DB"*. One read of Joinery Core's `cc_material_links` and
// two functions (`cc_save_material_links`, `cc_clear_material_link`), through
// JC's own client (`withDb`, lib/jcApi.js), never a throw. JC injects the tenant
// and the user; Cabinet Core never sends them. Every answer is in words:
// JC_OFFLINE when JC does not answer, LINKS_NOT_SET_UP when the table or the
// function is not there yet (the SQL of T-JC3a not run: 403 or 400 with no row),
// the function's own refusal words otherwise (42501, 22023).

import { JC_OFFLINE, withDb } from './jcApi.js';

/** The read's columns: every column but `tenant_id` (CLAUDE.md T-CC2a, WHAT JOINERY CORE GIVES). */
export const LINK_COLUMNS = 'cc_material_id, stock_item_id, yield, sheet_width_mm, sheet_length_mm, coverage_m2_per_l, updated_by, updated_at';

/** The JC half not there yet, in words (fail-open, CLAUDE.md T-CC2a F4). */
export const LINKS_NOT_SET_UP = 'Material links are not set up in Joinery Core yet.';

/** At most this many links in one `cc_save_material_links` call (JC's function: 1 to 500). */
export const LINKS_PER_CALL = 500;

/** The refusals JC's functions answer in their own words (CLAUDE.md T-CC2a: 42501, 22023). */
const OWN_CODES = new Set(['42501', '22023']);

/** The words of a table or a function that is not there (JC's db.js and rpc.js, PostgREST's own). */
const ABSENT = /not set up|does not serve|does not exist|could not find|no rpc|not allowed|unknown (table|function)|schema cache|not found/i;

/** 'offline' | 'not-set-up' | 'refused' and the words, for one `withDb` answer with an error. */
function refusal(res) {
  if (!res || res.mock) return { status: 'offline', error: JC_OFFLINE };
  const e = res.error || {};
  const code = String(e.code ?? e.details?.code ?? '');
  const words = String(e.message || e.error || (typeof e === 'string' ? e : '') || '').trim();
  if (OWN_CODES.has(code)) return { status: 'refused', error: words || LINKS_NOT_SET_UP };
  const httpStatus = Number(e.status ?? e.statusCode);
  // The table or the function not there yet: a 403 or 400 (a 404 too) that names no refusal of the function's own.
  if ([400, 403, 404].includes(httpStatus) && (!words || ABSENT.test(words))) return { status: 'not-set-up', error: LINKS_NOT_SET_UP };
  if (!httpStatus && !words) return { status: 'offline', error: JC_OFFLINE };
  return { status: 'refused', error: words || JC_OFFLINE };
}

/** One call through the reader; a reader that throws is JC not answering, never a throw here. */
async function ask(db, fn, mockValue) {
  try {
    return await db(fn, mockValue);
  } catch (err) {
    return { data: mockValue, error: err, mock: true };
  }
}

/** A number or null, as JC's numeric columns arrive (text or number). */
function numOrNull(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** One row of `cc_material_links` as the store keeps it. */
function toLink(row) {
  return {
    cc_material_id: String(row?.cc_material_id || ''),
    stock_item_id: row?.stock_item_id ? String(row.stock_item_id) : null,
    yield: numOrNull(row?.yield),
    sheet_width_mm: numOrNull(row?.sheet_width_mm),
    sheet_length_mm: numOrNull(row?.sheet_length_mm),
    coverage_m2_per_l: numOrNull(row?.coverage_m2_per_l),
    updated_by: row?.updated_by ?? null,
    updated_at: row?.updated_at ?? null,
  };
}

/**
 * The company's links. Resolves `{ links: Map<cc_material_id, link>, status, error }`; status 'ok' |
 * 'offline' | 'not-set-up' | 'refused'. Never throws.
 */
export async function loadLinks({ db = withDb } = {}) {
  const res = await ask(db, (c) => c.from('cc_material_links').select(LINK_COLUMNS), []);
  if (!res || res.mock || res.error) {
    const r = refusal(res);
    return { links: new Map(), status: r.status, error: r.error };
  }
  const rows = Array.isArray(res.data) ? res.data : [];
  const links = new Map();
  for (const row of rows) {
    const link = toLink(row);
    if (link.cc_material_id) links.set(link.cc_material_id, link);
  }
  return { links, status: 'ok', error: null };
}

/** The keys JC's function reads, and only those: never a tenant or a user (JC injects both). */
function forJc(link) {
  const out = { cc_material_id: String(link?.cc_material_id || ''), stock_item_id: link?.stock_item_id || null };
  for (const k of ['yield', 'sheet_width_mm', 'sheet_length_mm', 'coverage_m2_per_l']) {
    const n = numOrNull(link?.[k]);
    if (n != null) out[k] = n;
  }
  return out;
}

/**
 * Save links: one `cc_save_material_links` call per LINKS_PER_CALL. Resolves `{ saved, calls, status,
 * error }`; the first refusal stops the rest and is said in its words. Never throws.
 */
export async function saveLinks(links = [], { db = withDb } = {}) {
  const list = (Array.isArray(links) ? links : []).map(forJc).filter((l) => l.cc_material_id);
  let saved = 0;
  let calls = 0;
  for (let i = 0; i < list.length; i += LINKS_PER_CALL) {
    const chunk = list.slice(i, i + LINKS_PER_CALL);
    calls += 1;
    // eslint-disable-next-line no-await-in-loop
    const res = await ask(db, (c) => c.rpc('cc_save_material_links', { p_links: chunk }), null);
    if (!res || res.mock || res.error) {
      const r = refusal(res);
      return { saved, calls, status: r.status, error: r.error };
    }
    saved += Number(res.data?.saved ?? chunk.length) || 0;
  }
  return { saved, calls, status: 'ok', error: null };
}

/** Clear one link. Resolves `{ cleared, status, error }`. Never throws. */
export async function clearLink(ccMaterialId, { db = withDb } = {}) {
  const id = String(ccMaterialId || '');
  const res = await ask(db, (c) => c.rpc('cc_clear_material_link', { p_cc_material_id: id }), null);
  if (!res || res.mock || res.error) {
    const r = refusal(res);
    return { cleared: false, status: r.status, error: r.error };
  }
  return { cleared: Boolean(res.data?.cleared ?? res.data === true), status: 'ok', error: null };
}
