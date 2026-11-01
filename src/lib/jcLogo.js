/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F7 . THE LOGO IS THE COMPANY'S (CLAUDE.md T-CC1b, PART B)
//
// The owner, 01.11.2026: *"logo domyslne z JC albo przycisk wstaw inne logo"*.
// The title block's logo, when the item carries none of its own, is the
// company's: ONE read of Joinery Core's `company_settings` (`logo_url`)
// through `withDb`, the one client, JC's. The href is shown on screen as JC
// gives it; the PDF draws an image, so the file is fetched ONCE into a data
// URL by `readLogoFile`'s own sizing (lib/drawingExport.js, the T82 F20
// reader) and kept for the session under `cc.<tenant>.logo.v1` in
// sessionStorage (PROPOSED). A fetch the browser refuses (CORS, 404) leaves
// the sheets without a logo and the window says so in one line: never a
// broken image.

import { JC_OFFLINE, withDb } from './jcApi.js';
import { readLogoFile, drawingErrorText } from './drawingExport.js';

/** The session's cache key for a tenant's logo (PROPOSED). */
export function logoCacheKey(tenantId) {
  return `cc.${tenantId || 'none'}.logo.v1`;
}

/** The words when the browser will not read the company's logo file. */
function logoRefusedText(reason) {
  return `The company logo from Joinery Core could not be read by this browser (${reason}); the sheets go out without a logo. Insert other logo to put one on.`;
}

/**
 * ONE read: `company_settings` select `logo_url`. `{ href, error }`: the
 * href as JC stores it, or null when the company has none (no error then);
 * Joinery Core silent or refusing gives null and the words.
 */
export async function loadCompanyLogo({ db = withDb } = {}) {
  const res = await db((c) => c.from('company_settings').select('logo_url').maybeSingle(), null);
  if (res?.mock) return { href: null, error: JC_OFFLINE };
  if (res?.error) return { href: null, error: String(res.error?.message || res.error) };
  const href = typeof res?.data?.logo_url === 'string' && res.data.logo_url.trim() ? res.data.logo_url.trim() : null;
  return { href, error: null };
}

const EXT_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml' };

/** The file's name and type, from its address when the server did not type it. */
function fileOf(blob, href) {
  const path = String(href || '').split(/[?#]/)[0];
  const ext = (/\.([a-z0-9]+)$/i.exec(path) || [])[1]?.toLowerCase() || '';
  const type = blob?.type || EXT_TYPES[ext] || '';
  const name = path.split('/').pop() || `company-logo.${ext || 'png'}`;
  if (typeof File !== 'undefined') return new File([blob], name, { type });
  return Object.assign(blob, { name });
}

/**
 * The company's logo file read for the PDF: `{ logo, error }` where `logo`
 * is `readLogoFile`'s `{ href (data URL), width, height, raster? }`. A refusal
 * of any kind answers `logo: null` and the one line of words.
 */
export async function readCompanyLogoFile(href, { profile, fetchImpl = null, readLogo = readLogoFile } = {}) {
  if (!href) return { logo: null, error: null };
  const get = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!get) return { logo: null, error: logoRefusedText('this browser cannot fetch it') };
  try {
    const res = await get(href, { mode: 'cors', credentials: 'omit' });
    if (!res || !res.ok) return { logo: null, error: logoRefusedText(`the server answered ${res?.status ?? 'nothing'}`) };
    const blob = await res.blob();
    const logo = await readLogo(fileOf(blob, href), profile);
    return { logo, error: null };
  } catch (err) {
    return { logo: null, error: logoRefusedText(drawingErrorText(err)) };
  }
}

function sessionStore() {
  try { return typeof sessionStorage !== 'undefined' ? sessionStorage : null; } catch { return null; }
}

/**
 * The company's logo for this session: `{ href, logo, error }`. `href` for
 * the screen, `logo` (a data URL logo) for the sheets and the PDF. Read once
 * per session per tenant; an answer with an error is not cached, so the next
 * opening of the window asks again.
 */
export async function companyLogo({
  tenantId = null, profile, db = withDb, storage = sessionStore(), fetchImpl = null, readLogo = readLogoFile,
} = {}) {
  const key = logoCacheKey(tenantId);
  try {
    const raw = storage?.getItem(key);
    const kept = raw ? JSON.parse(raw) : null;
    if (kept && typeof kept === 'object' && 'href' in kept) return { href: kept.href || null, logo: kept.logo || null, error: null };
  } catch { /* a broken cache entry is read again from Joinery Core */ }
  const { href, error } = await loadCompanyLogo({ db });
  if (error) return { href: null, logo: null, error };
  const file = await readCompanyLogoFile(href, { profile, fetchImpl, readLogo });
  if (file.error) return { href, logo: null, error: file.error };
  try { storage?.setItem(key, JSON.stringify({ href, logo: file.logo })); } catch { /* a full session store: read again next time */ }
  return { href, logo: file.logo, error: null };
}
