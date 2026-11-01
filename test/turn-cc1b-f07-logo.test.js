/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F7 . THE LOGO IS THE COMPANY'S. The owner, 01.11.2026: *"logo domyslne z JC albo przycisk wstaw inne
// logo"*. One read of company_settings.logo_url through withDb, the file fetched once into a data URL and kept
// for the session per tenant; the item's own logo first, the company's where it has none; a refusal is words.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';
import { JC_OFFLINE } from '../src/lib/jcApi.js';
import { companyLogo, loadCompanyLogo, logoCacheKey, readCompanyLogoFile } from '../src/lib/jcLogo.js';
import { logoOf } from '../src/engine/drawings/setSheet.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { bookletDoc } from '../src/lib/drawingExport.js';
import { t81Kitchen, setArgs, S } from '../scripts/t81-kitchen.mjs';

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}
function pngDataUrl(w, h, rgb = [20, 60, 120]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const row = Buffer.alloc(1 + w * 4);
  for (let x = 0; x < w; x += 1) row.set([...rgb, 255], 1 + x * 4);
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(Array.from({ length: h }, () => row)))), chunk('IEND', Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString('base64')}`;
}
const COMPANY_PNG = pngDataUrl(120, 60);
const OWN_PNG = pngDataUrl(80, 80, [200, 10, 10]);
const LOGO_URL = 'https://storage.joinerycore.com/logos/skylon.png';

/** A fake JC client: company_settings answers one row; every from/select is recorded. */
function fakeClient(row) {
  const log = [];
  return {
    log,
    from: (table) => {
      const q = { table, cols: null };
      const chain = {
        select: (cols) => { q.cols = cols; return chain; },
        maybeSingle: () => { log.push({ ...q, maybeSingle: true }); return Promise.resolve({ data: row, error: null }); },
      };
      return chain;
    },
  };
}
const dbOf = (client) => async (fn, mock) => {
  try { const r = await fn(client); return r?.error ? { data: mock, error: r.error, mock: false } : { data: r?.data ?? null, error: null, mock: false }; } catch (e) { return { data: mock, error: e, mock: false }; }
};
function memSession() {
  const m = new Map();
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}
/** The browser's fetch, faked: the logo URL answers the PNG's bytes. */
const fetchOk = (calls) => async (href) => {
  calls.push(href);
  const bytes = Buffer.from(COMPANY_PNG.split(',')[1], 'base64');
  return { ok: true, status: 200, blob: async () => new Blob([bytes], { type: 'image/png' }) };
};
/** readLogoFile, faked to what it returns for this PNG (its sizing is T82's and tested there). */
const readLogo = async (file) => ({ href: `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}`, width: 120, height: 60 });

test('F7 · ONE read of company_settings logo_url (maybeSingle), the href as JC gives it', async () => {
  const client = fakeClient({ logo_url: LOGO_URL });
  const got = await loadCompanyLogo({ db: dbOf(client) });
  assert.deepEqual(got, { href: LOGO_URL, error: null });
  assert.deepEqual(client.log, [{ table: 'company_settings', cols: 'logo_url', maybeSingle: true }]);
  // logo_url null: no logo and no error.
  assert.deepEqual(await loadCompanyLogo({ db: dbOf(fakeClient({ logo_url: null })) }), { href: null, error: null });
  // Joinery Core silent: no logo and its words.
  assert.deepEqual(await loadCompanyLogo({ db: async () => ({ data: null, error: null, mock: true }) }), { href: null, error: JC_OFFLINE });
  // The real withDb with no JC client is the mock road.
  assert.equal((await loadCompanyLogo()).error, JC_OFFLINE);
});

test('F7 · the file fetched once into a data URL, kept for the session under cc.<tenant>.logo.v1', async () => {
  const client = fakeClient({ logo_url: LOGO_URL });
  const calls = [];
  const storage = memSession();
  const a = await companyLogo({ tenantId: 't-1', profile: {}, db: dbOf(client), storage, fetchImpl: fetchOk(calls), readLogo });
  assert.equal(a.error, null);
  assert.equal(a.href, LOGO_URL, 'the screen gets the href as given');
  assert.equal(a.logo.href, COMPANY_PNG, 'the sheets get the data URL');
  assert.equal(logoCacheKey('t-1'), 'cc.t-1.logo.v1');
  assert.ok(storage.m.has('cc.t-1.logo.v1'));
  const b = await companyLogo({ tenantId: 't-1', profile: {}, db: dbOf(client), storage, fetchImpl: fetchOk(calls), readLogo });
  assert.deepEqual(b, a, 'the second opening reads the session');
  assert.equal(client.log.length, 1, 'one read per session');
  assert.equal(calls.length, 1, 'one fetch per session');
  // Another tenant is another key.
  await companyLogo({ tenantId: 't-2', profile: {}, db: dbOf(client), storage, fetchImpl: fetchOk(calls), readLogo });
  assert.equal(client.log.length, 2);
});

test('F7 · a fetch the browser refuses (CORS, 404): no logo, one line of words, nothing cached', async () => {
  const storage = memSession();
  const cors = await companyLogo({
    tenantId: 't-1', profile: {}, db: dbOf(fakeClient({ logo_url: LOGO_URL })), storage, readLogo,
    fetchImpl: async () => { throw new TypeError('Failed to fetch'); },
  });
  assert.equal(cors.logo, null);
  assert.match(cors.error, /^The company logo from Joinery Core could not be read by this browser \(Failed to fetch\); the sheets go out without a logo\./);
  assert.equal(storage.m.size, 0, 'a refusal is asked again next time');
  const notFound = await readCompanyLogoFile(LOGO_URL, { profile: {}, readLogo, fetchImpl: async () => ({ ok: false, status: 404 }) });
  assert.equal(notFound.logo, null);
  assert.match(notFound.error, /the server answered 404/);
  assert.ok(!/[\u2013\u2014]/.test(cors.error));
});

test('F7 · the title block: the company logo where the item has none; the item\'s own wins; Remove means none', () => {
  const company = { href: COMPANY_PNG, width: 120, height: 60 };
  assert.equal(logoOf(null, company).href, COMPANY_PNG, 'the item has none: the company\'s');
  assert.equal(logoOf({ href: OWN_PNG, width: 80, height: 80 }, company).href, OWN_PNG, 'Insert other logo: the item\'s own');
  assert.equal(logoOf('none', company), null, 'Remove: no logo at all');
  assert.equal(logoOf(null, null), null, 'no company logo: no logo, no error');
});

test('F7 · the PDF road receives it: the set\'s title strips carry the company image; the item\'s own replaces it for THIS item', () => {
  t81Kitchen({ inframe: false });
  const company = { href: COMPANY_PNG, width: 120, height: 60 };
  const imagesOf = (set) => set.flatMap((s) => s.sheet.entities.filter((e) => e.kind === 'image' && e.meta === 'logo').map((e) => e.href));
  const set = wallDrawingSheets(setArgs({ companyLogo: company }));
  const hrefs = imagesOf(set);
  assert.equal(hrefs.length, set.length, 'every sheet');
  assert.ok(hrefs.every((h) => h === COMPANY_PNG));
  assert.ok(bookletDoc(set.map((s) => s.sheet)).getNumberOfPages() === set.length, 'and jsPDF binds them');
  // No company logo: the T71 box.
  assert.equal(imagesOf(wallDrawingSheets(setArgs())).length, 0);
  // Insert other logo (the T82 road, setTitleBlock), on THIS item: the item's own on every sheet.
  S().setTitleBlock({ company: { logo: { href: OWN_PNG, width: 80, height: 80 } } });
  assert.ok(imagesOf(wallDrawingSheets(setArgs({ companyLogo: company }))).every((h) => h === OWN_PNG));
  // Use company logo: the item's own cleared, the company's again.
  S().setTitleBlock({ company: { logo: null } });
  assert.ok(imagesOf(wallDrawingSheets(setArgs({ companyLogo: company }))).every((h) => h === COMPANY_PNG));
  // Remove: none.
  S().setTitleBlock({ company: { logo: 'none' } });
  assert.equal(imagesOf(wallDrawingSheets(setArgs({ companyLogo: company }))).length, 0);
  // A new item opens without this item's choice in its design (the company's shows by default).
  S().newProject('Next item');
  assert.notEqual(S().project.titleBlock?.company?.logo?.href, OWN_PNG);
});

test('F7 · the window: Insert other logo, Use company logo, Remove; the company href on screen; the refusal in one line', () => {
  const modal = readFileSync(new URL('../src/components/DrawingModal.jsx', import.meta.url), 'utf8');
  assert.match(modal, /import \{ companyLogo as loadCompanyMark \} from '\.\.\/lib\/jcLogo\.js';/);
  assert.match(modal, /loadCompanyMark\(\{ tenantId, profile \}\)/, 'read once the window opens, per tenant');
  assert.match(modal, />\s*Insert other logo\s*</);
  assert.match(modal, />\s*Use company logo\s*</);
  assert.match(modal, />\s*Remove\s*</);
  assert.match(modal, /setTitleBlock\(\{ company: \{ logo: null \} \}\)/, 'Use company logo clears the item\'s own');
  assert.match(modal, /setTitleBlock\(\{ company: \{ logo: 'none' \} \}\)/, 'Remove: none on this item');
  assert.match(modal, /readLogoFile\(file, profile\)/, 'Insert other logo is the Choose image road, unchanged inside');
  assert.match(modal, /companyLogo: sheetCompanyLogo/, 'the set receives the company logo');
  assert.match(modal, /onError=\{\(\) => setScreenLogoBroken\(true\)\}/, 'never a broken image');
  assert.match(modal, /data-title-block-logo-refused="1">\{companyMark\.error\}/, 'the refusal in words');
  assert.ok(!/Choose image\s*</.test(modal), 'the button reads Insert other logo now');
});
