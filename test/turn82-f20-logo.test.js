/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T82 F20 · THE LOGO AND THE COMPANY ON THE SHEET ───────────────────────
//
// The owner, 25.10.2026, 11:40: *"do tego dodawanie loga do rysunkow musze
// miec dzisiaj profesjonalne rysunki dla klientow"*. CLAUDE.md F20: the
// Drawings window gets, beside Company, a LOGO row ("Choose image", PNG, JPG
// or SVG, read as a data URL, scaled to fit the 24 x 24 box keeping its
// ratio, stored with the title block's company where the company name is
// remembered on this computer) and "Remove"; the sheet draws it as an
// `image` entity on SHEET_MUTED; the PDF embeds it.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';
import jsPDFDefault from 'jspdf';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  dataUrlType, fitLogo, imageSizeOf, layoutSetSheet, logoOf, setZones, titleStrip,
} from '../src/engine/drawings/setSheet.js';
import { titleFor } from '../src/engine/drawings/wallSheets.js';
import { sheetToSvg } from '../src/engine/drawings/svg.js';
import { sheetToDxf } from '../src/engine/drawings/dxf.js';
import { bookletDoc, pdfBytes, pdfImageOf, readLogoFile } from '../src/lib/drawingExport.js';
import {
  LIBRARY_KEY, LOGO_KEY, listLocalProjects, loadLocalProject, logoId, saveLocalProject,
} from '../src/lib/projectLibrary.js';
import { persistProject } from '../src/lib/persist.js';
import { notOnShelf } from '../src/lib/projectLibrary.js';
import { migrateDesign } from '../src/engine/design.js';
import { getProjectType } from '../src/engine/projectTypes.js';

const jsPDF = jsPDFDefault?.jsPDF || jsPDFDefault;

// ─── a real PNG, made here: 8-bit RGBA, every pixel one colour ────────────
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}
function pngDataUrl(w, h) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const row = Buffer.alloc(1 + w * 4);
  for (let x = 0; x < w; x += 1) row.set([20, 60, 120, 255], 1 + x * 4);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString('base64')}`;
}
// A JPEG header with its frame marker (the size is all the engine reads).
function jpegDataUrl(w, h) {
  const app0 = [0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00];
  const sof = [0xFF, 0xC0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
  return `data:image/jpeg;base64,${Buffer.from([0xFF, 0xD8, ...app0, ...sof, 0xFF, 0xD9]).toString('base64')}`;
}
const svgDataUrl = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

const PNG_200x100 = pngDataUrl(200, 100);
const zones = setZones(P);
const BOX = { x: zones.title.x + P.drawings.set.titleCells[0] + 2.5, y: zones.title.y + 4, w: 24, h: 24 };
const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-9, `${what}: ${a} is not ${b}`);
const stripWith = (company) => titleStrip(zones, { company: { ...P.drawings.set.company, ...company } }, P);

// ═══ 1. THE SHEET ═══════════════════════════════════════════════════════════

test('F20 · no logo: the box as T71 drew it, and no image on the strip', () => {
  const strip = stripWith({});
  assert.equal(strip.filter((e) => e.kind === 'image').length, 0, 'no logo, no image entity');
  const box = strip.filter((e) => e.meta === 'logo');
  assert.equal(box.length, 1);
  assert.deepEqual({ kind: box[0].kind, layer: box[0].layer, x: box[0].x, y: box[0].y, w: box[0].w, h: box[0].h, hidden: box[0].hidden },
    { kind: 'rect', layer: 'SHEET_MUTED', ...BOX, hidden: true }, 'the dashed 24 x 24 box where it always was');
  const words = strip.filter((e) => e.kind === 'text').map((e) => e.text);
  assert.ok(words.includes('LOGO') && words.includes('(Settings)'), 'and its two words');
});

test('F20 · a 200 x 100 PNG stands 24 x 12, centred in the 24 x 24 box, on SHEET_MUTED', () => {
  const logo = { href: PNG_200x100, width: 200, height: 100 };
  const strip = stripWith({ name: 'SKYLON JOINERY', logo });
  const images = strip.filter((e) => e.kind === 'image');
  assert.equal(images.length, 1, 'one picture on the strip');
  const [img] = images;
  assert.equal(img.layer, 'SHEET_MUTED');
  assert.equal(img.meta, 'logo', 'named as the box was, so a census leaves it out by name');
  assert.equal(img.href, PNG_200x100, 'the picture itself, as chosen');
  near(img.w, 24, 'width'); near(img.h, 12, 'height');
  near(img.x, BOX.x, 'x'); near(img.y, BOX.y + 6, 'y: 6 up from the box\'s foot');
  assert.ok(img.x >= BOX.x && img.x + img.w <= BOX.x + 24 && img.y >= BOX.y && img.y + img.h <= BOX.y + 24, 'inside the box');
  assert.equal(strip.filter((e) => e.kind === 'rect' && e.meta === 'logo').length, 0, 'the placeholder gives way to the logo');
  const words = strip.filter((e) => e.kind === 'text').map((e) => e.text);
  assert.ok(!words.includes('LOGO') && !words.includes('(Settings)'), 'the placeholder words go with it');
  assert.ok(words.includes('SKYLON JOINERY'), 'the company name as today');
});

test('F20 · the ratio is the picture\'s own: tall, square, wide; read off the header when not said', () => {
  near(fitLogo({ width: 50, height: 100 }, BOX).w, 12, 'a tall logo is 12 wide');
  near(fitLogo({ width: 50, height: 100 }, BOX).x, BOX.x + 6, 'and centred across');
  near(fitLogo({ width: 300, height: 300 }, BOX).w, 24, 'a square one fills the box');
  assert.deepEqual(imageSizeOf(PNG_200x100), { width: 200, height: 100 }, 'the PNG says its size in its IHDR');
  assert.deepEqual(imageSizeOf(jpegDataUrl(640, 160)), { width: 640, height: 160 }, 'the JPEG in its frame marker');
  assert.deepEqual(imageSizeOf(svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40"><rect/></svg>')), { width: 120, height: 40 }, 'the SVG in its viewBox');
  assert.deepEqual(imageSizeOf(svgDataUrl('<svg width="90px" height="30" viewBox="0 0 9 9"/>')), { width: 90, height: 30 }, 'or its width and height');
  // Stored without its size, the strip reads it off the picture.
  const img = stripWith({ logo: { href: PNG_200x100 } }).find((e) => e.kind === 'image');
  near(img.w, 24, 'width'); near(img.h, 12, 'height');
});

test('F20 · only a PNG, JPG or SVG data URL is a logo; anything else leaves the box', () => {
  for (const raw of ['https://example.com/logo.png', 'logo', { href: 'data:image/gif;base64,R0lGOD' }, null, undefined, {}]) {
    assert.equal(logoOf(raw), null, `${JSON.stringify(raw)} is no logo`);
    const strip = stripWith({ logo: raw });
    assert.equal(strip.filter((e) => e.kind === 'image').length, 0);
    assert.equal(strip.filter((e) => e.kind === 'rect' && e.meta === 'logo').length, 1, 'the box stays');
  }
  assert.equal(dataUrlType('data:image/svg+xml;base64,AAAA'), 'image/svg+xml');
});

test('F20 · the logo rides the project\'s title block to every sheet, and the SVG draws it', () => {
  const logo = { href: PNG_200x100, width: 200, height: 100 };
  const project = { name: 'Herbal Hill', number: '032/2026', titleBlock: { company: { name: 'SKYLON JOINERY', logo } } };
  const title = titleFor({ project, profile: P, no: '02', name: 'Wall A · Fronts' });
  const sheet = layoutSetSheet({ drawing: { paper: true, build: () => [] }, title, profile: P });
  const images = sheet.entities.filter((e) => e.kind === 'image');
  assert.equal(images.length, 1, 'the sheet carries the logo once');
  near(images[0].w, 24, 'width'); near(images[0].h, 12, 'height');
  const svg = sheetToSvg(sheet, { kind: 'wall-elevation' });
  const tag = (svg.match(/<image [^>]*data-cc="logo"[^>]*\/>/) || [])[0];
  assert.ok(tag, 'the SVG has the logo as an <image>');
  assert.match(tag, /data-layer="SHEET_MUTED"/);
  assert.match(tag, /width="24" height="12"/);
  assert.ok(tag.includes(`href="${PNG_200x100}"`), 'with the picture itself');
  // The DXF (AutoCAD only, R12) has no word for a picture: it draws the frame it fills, as T71's render.
  assert.doesNotThrow(() => sheetToDxf(sheet));
});

// ═══ 2. THE PDF ═════════════════════════════════════════════════════════════

/** Every addImage the PDF writer makes while `fn` runs. */
function spyAddImage(fn) {
  const calls = [];
  const orig = jsPDF.API.addImage;
  jsPDF.API.addImage = function spy(...args) { calls.push(args); return orig.apply(this, args); };
  try { return { result: fn(), calls }; } finally { jsPDF.API.addImage = orig; }
}

test('F20 · the PDF writer is handed the logo, at its place on the paper, and embeds it', () => {
  const logo = { href: PNG_200x100, width: 200, height: 100 };
  const title = titleFor({ project: { titleBlock: { company: { logo } } }, profile: P, no: '02', name: 'x' });
  const sheet = layoutSetSheet({ drawing: { paper: true, build: () => [] }, title, profile: P });
  const { result: doc, calls } = spyAddImage(() => bookletDoc([sheet]));
  assert.equal(calls.length, 1, 'one picture handed to jsPDF');
  const [data, x, y, w, h] = calls[0];
  assert.equal(data, PNG_200x100, 'the PNG itself');
  near(x, BOX.x, 'x'); near(w, 24, 'w'); near(h, 12, 'h');
  near(y, sheet.height - (BOX.y + 6 + 12), 'y, flipped once at the boundary');
  const bytes = Buffer.from(pdfBytes(doc)).toString('latin1');
  assert.match(bytes, /\/Subtype \/Image/, 'the PDF carries the picture');
  assert.match(bytes, /\/Width 200/, 'at its own pixels');
  assert.equal(doc.getNumberOfPages(), 1);
});

test('F20 · an SVG logo reaches the PDF by its PNG; the SVG sheet keeps the vector', () => {
  const svg = svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40"><rect width="120" height="40" fill="#123"/></svg>');
  const raster = pngDataUrl(60, 20);
  const sheetOf = (logo) => layoutSetSheet({
    drawing: { paper: true, build: () => [] },
    title: titleFor({ project: { titleBlock: { company: { logo } } }, profile: P, no: '02', name: 'x' }),
    profile: P,
  });
  const withRaster = sheetOf({ href: svg, width: 120, height: 40, raster });
  const img = withRaster.entities.find((e) => e.kind === 'image');
  assert.equal(img.href, svg, 'the sheet draws the SVG');
  assert.equal(pdfImageOf(img), raster, 'the PDF takes the PNG beside it');
  const { calls } = spyAddImage(() => bookletDoc([withRaster]));
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], raster);
  // An SVG with no PNG beside it is skipped in words on the console; the page still binds.
  const bare = sheetOf({ href: svg, width: 120, height: 40 });
  assert.equal(pdfImageOf(bare.entities.find((e) => e.kind === 'image')), null);
  const warn = console.warn; console.warn = () => {};
  try {
    const { result, calls: none } = spyAddImage(() => bookletDoc([bare]));
    assert.equal(none.length, 0, 'jsPDF is never handed an SVG');
    assert.equal(result.getNumberOfPages(), 1, 'and the set binds');
  } finally { console.warn = warn; }
  // The visualisation's render is handed as it always was.
  assert.equal(pdfImageOf({ href: PNG_200x100 }), PNG_200x100);
});

// ═══ 3. CHOOSING THE FILE (the window's hands, handed in) ══════════════════

/** A browser's three hands, in node: the "canvas" writes a PNG of the size asked. */
const env = (href, natural = {}) => ({
  draws: [],
  async readAsDataURL() { return href; },
  async loadImage() { return { naturalWidth: natural.w || 0, naturalHeight: natural.h || 0 }; },
  draw(img, w, h, type) { this.draws.push({ w, h, type }); return type === 'image/png' ? pngDataUrl(w, h) : jpegDataUrl(w, h); },
});

test('F20 · Choose image: a PNG is kept as it is, a big one drawn down to the profile\'s size', async () => {
  const small = await readLogoFile({ name: 'skylon.png', type: 'image/png' }, P, env(PNG_200x100));
  assert.deepEqual(small, { href: PNG_200x100, width: 200, height: 100 }, 'a 200 x 100 is kept whole');
  const big = env(pngDataUrl(1800, 600));
  const kept = await readLogoFile({ name: 'big.png', type: 'image/png' }, P, big);
  const { maxPx } = P.drawings.set.logo;
  const third = Math.round(maxPx / 3);
  assert.deepEqual(big.draws, [{ w: maxPx, h: third, type: 'image/png' }], 'drawn down on its long side, its ratio kept');
  assert.deepEqual({ w: kept.width, h: kept.height }, { w: maxPx, h: third });
  assert.deepEqual(imageSizeOf(kept.href), { width: maxPx, height: third });
});

test('F20 · Choose image: an SVG keeps its text and gains its PNG; a file of no picture type is refused in words', async () => {
  const svg = svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40"/>');
  const e = env(svg);
  const kept = await readLogoFile({ name: 'logo.svg', type: 'image/svg+xml' }, P, e);
  assert.equal(kept.href, svg, 'the vector for the sheet');
  assert.equal(dataUrlType(kept.raster), 'image/png', 'the PNG for the PDF');
  assert.deepEqual(e.draws, [{ w: P.drawings.set.logo.maxPx, h: Math.round(P.drawings.set.logo.maxPx / 3), type: 'image/png' }], 'drawn at the long side the profile says');
  // A file the system did not type is named by its extension.
  const untyped = await readLogoFile({ name: 'logo.PNG', type: '' }, P, env(PNG_200x100.replace('image/png', 'application/octet-stream')));
  assert.equal(dataUrlType(untyped.href), 'image/png');
  await assert.rejects(readLogoFile({ name: 'logo.gif', type: 'image/gif' }, P, env('data:image/gif;base64,R0lGOD')), /PNG, JPG or SVG/);
  const tooBig = env(PNG_200x100);
  await assert.rejects(
    readLogoFile({ name: 'huge.png', type: 'image/png' }, { drawings: { set: { logo: { maxPx: 400, maxKb: 0.1 } } } }, tooBig),
    /KB as the title block would keep it/, 'past the cap the window says so and keeps nothing',
  );
});

// ═══ 4. KEPT WITH THE COMPANY, ON THIS COMPUTER ════════════════════════════

// REWRITTEN BY T-CC1b F7 (01.11.2026) to the new law: the company's logo is Joinery Core's (company_settings
// logo_url, lib/jcLogo.js) and "Insert other logo" replaces it for THIS item only, so this computer remembers the
// company's name and lines WITHOUT the logo, and the next item opens with no logo of its own (the company's shows).
// *"logo domyslne z JC albo przycisk wstaw inne logo"* (the owner, 01.11.2026).
test('F20 · the logo is kept with the item; the next item opens on the company logo; Remove takes it off this item', async () => {
  // The store reads localStorage through its persistence gate; node has none, so a Map stands in.
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: (k) => { mem.delete(k); },
  };
  try {
    const { useProjectStore } = await import('../src/stores/projectStore.js');
    const s = useProjectStore.getState();
    s.newProject('T82 F20');
    const logo = { href: PNG_200x100, width: 200, height: 100 };
    s.setTitleBlock({ company: { name: 'SKYLON JOINERY' } });
    assert.deepEqual(s.setTitleBlock({ company: { logo } }), { remembered: true }, 'this computer took it');
    assert.deepEqual(useProjectStore.getState().project.titleBlock.company, { name: 'SKYLON JOINERY', logo }, 'beside the name, in the same company');
    // AMENDED after the review: the memory names the picture by its ref, kept once beside it.
    const remembered = JSON.parse(mem.get('cabinet-core.titleBlock.company'));
    assert.equal(remembered.logo, undefined, 'this computer remembers the company without the item\'s own logo');
    assert.equal(remembered.name, 'SKYLON JOINERY', 'the name is remembered');
    useProjectStore.getState().setTitleBlock({ company: { logo: null } });
    assert.equal(logoOf(useProjectStore.getState().project.titleBlock.company.logo), null, 'Remove, on this item');
    useProjectStore.getState().newProject('Next job');
    const next = useProjectStore.getState().project.titleBlock.company;
    assert.equal(next.name, 'SKYLON JOINERY', 'the next item opens with the company name');
    assert.equal(next.logo, undefined, 'and no logo of its own: the company logo from Joinery Core shows');
    assert.equal(JSON.parse(mem.get('cabinet-core.titleBlock.company')).name, 'SKYLON JOINERY', 'the name stays');
  } finally { delete globalThis.localStorage; }
});

// ═══ 5. THE WINDOW ══════════════════════════════════════════════════════════

test('F20 · the Drawings window has the LOGO row beside Company: Choose image and Remove', () => {
  const modal = readFileSync(new URL('../src/components/DrawingModal.jsx', import.meta.url), 'utf8');
  const company = modal.indexOf("['Company', 'company.name', 'CABINET CORE']");
  const row = modal.indexOf('data-title-block-field="company.logo"');
  assert.ok(company > 0 && row > company, 'the row follows the Company field');
  assert.match(modal, /accept="image\/png,image\/jpeg,image\/svg\+xml,\.png,\.jpg,\.jpeg,\.svg"/, 'PNG, JPG or SVG');
  assert.match(modal, /Choose image/);
  assert.match(modal, />\s*Remove\s*</);
  assert.match(modal, /readLogoFile\(file, profile\)/, 'read by the one reader');
  assert.match(modal, /setTitleBlock\(\{ company: \{ logo: picked \} \}\)/, 'kept with the company');
  assert.match(modal, /setTitleBlock\(\{ company: \{ logo: null \} \}\)/, 'and removed from it');
  assert.ok(!/[\u2013\u2014]/.test(modal.slice(row - 400, row + 2400)), 'no em or en dash in the row');
});

// ═══ 6. AFTER THE REVIEW: THE LOGO IS KEPT ONCE, A REFUSED SAVE SAYS SO ═══
//
// The review of 25.10.2026 (finds.sheets[4], verified): the logo, up to 256
// KB, was copied into every saved job, so the shelf (one localStorage key)
// filled at 19 jobs and the 20th was reported saved but lost.

/** A browser's storage: 5 Mi characters across every key, then QuotaExceededError, as browsers do. */
function quotaStorage(limit = 5 * 1024 * 1024) {
  const map = new Map();
  const used = () => [...map].reduce((n, [k, v]) => n + k.length + v.length, 0);
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem(k, v) {
      const s = String(v);
      const was = map.has(k) ? k.length + map.get(k).length : 0;
      if (used() - was + k.length + s.length > limit) {
        const err = new Error('The quota has been exceeded.'); err.name = 'QuotaExceededError'; throw err;
      }
      map.set(k, s);
    },
    removeItem: (k) => { map.delete(k); },
  };
}
// A logo at the cap: 256 KB of data URL (the sheet reads its size off the object).
const BIG = { href: `data:image/png;base64,${'A'.repeat(256 * 1024 - 22)}`, width: 200, height: 100 };
// AMENDED BY T-CC1a F5 (31.10.2026): a job carries its item id (the server's, law 4); the shelf keeps no job under an
// invented id any more. *"automatyczne polaczenie danego projektu do danego pipelinu lub production projektu"*.
const job = (i, logo = BIG) => ({
  id: `srv-${i}`, name: `Job ${i}`, number: String(i), room: { height: 2500 }, design: null,
  titleBlock: { company: { name: 'SKYLON JOINERY', logo } },
});

// REWRITTEN BY T-CC1a F7 (31.10.2026) to the new law: a save is ONE cc_save_item to Joinery Core carrying the item
// JSON (projectStore.projectForSave, the one builder); the shelf write of persistProject is deleted. What F20 asked
// stands on the new road: the picture rides every save as its `{ ref }`, kept ONCE in this browser, and a refused
// save is said in words, never "saved". *"dopiero caly json powinien sie zapisac do DB przy nacisnieciu Zapisz lub
// co 5 minut automatycznie"* (the owner, 30.10.2026).

/** A fake Joinery Core client: records every rpc; `refuse` answers each with that error. */
function fakeJc({ refuse = null } = {}) {
  const rpc = [];
  const client = {
    rpc: async (name, params) => {
      rpc.push({ name, params });
      if (refuse) return { data: null, error: { message: refuse } };
      if (name === 'cc_create_item') return { data: { id: `srv-new-${rpc.length}`, name: params.p_name, revision: null, jc_project_number: '2601' }, error: null };
      return { data: { id: params.p_item_id, updated_at: '2026-10-31T12:00:00Z', revision: 'A' }, error: null };
    },
    from: () => {
      const q = {
        select: () => q, eq: () => q, order: () => q, limit: () => q,
        single: async () => (refuse ? { data: null, error: { message: refuse } }
          : { data: { id: 'srv-road', jc_pipeline_id: null, jc_project_id: 'p1', jc_project_number: '2601' }, error: null }),
      };
      return q;
    },
  };
  return { client, rpc };
}
async function withJc(client, fn) {
  const had = globalThis.supabaseClient;
  if (client) globalThis.supabaseClient = client; else delete globalThis.supabaseClient;
  try { return await fn(); } finally { if (had) globalThis.supabaseClient = had; else delete globalThis.supabaseClient; }
}

test('F20 after the review · 40 items with a 256 KB logo: every save sends the logo as its ref, the picture kept once', async () => {
  const { useProjectStore } = await import('../src/stores/projectStore.js');
  const shelf = quotaStorage();
  const jc = fakeJc();
  await withJc(jc.client, async () => {
    for (let i = 1; i <= 40; i += 1) {
      useProjectStore.getState().newProject(`Job ${i}`, { id: `srv-${i}` });
      useProjectStore.getState().setTitleBlock({ company: { name: 'SKYLON JOINERY', logo: BIG } });
      const res = await persistProject({ at: i, storage: shelf });
      assert.equal(res.tone, 'ok', `job ${i}: ${res.message}`);
      assert.equal(res.stored, true);
      assert.deepEqual(res.project.titleBlock.company.logo, BIG, `job ${i} keeps its picture whole in memory`);
    }
  });
  assert.equal(jc.rpc.length, 40, 'one request per save');
  for (const { name, params } of jc.rpc) {
    assert.equal(name, 'cc_save_item');
    const sent = JSON.stringify(params.p_design);
    assert.ok(!sent.includes(BIG.href), 'no save carries the picture');
    assert.deepEqual(params.p_design.project.titleBlock.company.logo, { ref: logoId(BIG) });
  }
  assert.deepEqual(Object.keys(JSON.parse(shelf.getItem(LOGO_KEY))), [logoId(BIG)], 'the picture once');
});

test('F20 after the review · a save Joinery Core refuses is said in words, never "saved"', async () => {
  const { useProjectStore } = await import('../src/stores/projectStore.js');
  useProjectStore.getState().newProject('Refused', { id: 'srv-refused' });
  const res = await withJc(fakeJc({ refuse: 'Forbidden' }).client, () => persistProject({ at: 1, storage: quotaStorage() }));
  assert.equal(res.tone, 'error');
  assert.equal(res.stored, false);
  assert.match(res.message, /^Not saved: Forbidden/);
  assert.doesNotMatch(res.message, /Saved/);
  const off = await withJc(null, () => persistProject({ at: 2, storage: quotaStorage() }));
  assert.equal(off.tone, 'error');
  assert.match(off.message, /^Not saved: Joinery Core did not answer\./);
  const ok = await withJc(fakeJc().client, () => persistProject({ at: 3, storage: quotaStorage() }));
  assert.equal(ok.tone, 'ok');
  assert.match(ok.message, /^Saved \d\d:\d\d\.$/);
});

test('F20 after the review · the sheet still draws the logo of a job read back, and of an old job that carries it', () => {
  const shelf = quotaStorage();
  const row = saveLocalProject(shelf, { project: job(7, { href: PNG_200x100, width: 200, height: 100 }), units: [], at: 7 });
  const back = loadLocalProject(shelf, row.id).project;
  const sheetOf = (project) => layoutSetSheet({
    drawing: { paper: true, build: () => [] }, title: titleFor({ project, profile: P, no: '02', name: 'x' }), profile: P,
  });
  const img = sheetOf(back).entities.find((e) => e.kind === 'image');
  assert.ok(img, 'the logo is on the sheet');
  assert.equal(img.href, PNG_200x100);
  near(img.w, 24, 'w'); near(img.h, 12, 'h');
  // A job written by F20's first build: the picture inside the job.
  const old = quotaStorage();
  old.setItem(LIBRARY_KEY, JSON.stringify({ projects: [{ id: 'loc_old', name: 'Old', project: job(8, { href: PNG_200x100, width: 200, height: 100 }), units: [] }] }));
  const opened = loadLocalProject(old, 'loc_old').project;
  assert.equal(sheetOf(opened).entities.find((e) => e.kind === 'image')?.href, PNG_200x100, 'an old job still draws its logo');
  // Its next save keeps the picture once.
  saveLocalProject(old, { project: opened, units: [], at: 9 });
  assert.ok(!old.getItem(LIBRARY_KEY).includes(PNG_200x100), 'and the shelf now names it by its ref');
  assert.equal(loadLocalProject(old, 'loc_old').project.titleBlock.company.logo.href, PNG_200x100);
  // A ref with no picture behind it is no logo: the box, never a crash.
  assert.equal(logoOf({ ref: 'logo-gone' }), null);
});

// REWRITTEN BY T-CC1b F7 (01.11.2026): the company memory keeps no logo (the item's own is the item's only); the
// crash buffer keeps an item's logo as its ref as before. *"logo domyslne z JC albo przycisk wstaw inne logo"*.
test('F20 after the review · the company memory keeps no logo, the cache keeps a ref; a refused memory is said', async () => {
  const mem = quotaStorage();
  globalThis.localStorage = mem;
  try {
    const { useProjectStore } = await import('../src/stores/projectStore.js');
    const s = useProjectStore.getState();
    s.newProject('Cache');
    s.setTitleBlock({ company: { name: 'SKYLON JOINERY', logo: BIG } });
    for (let i = 1; i <= 25; i += 1) {
      useProjectStore.getState().newProject(`Job ${i}`);
      assert.equal(useProjectStore.getState().project.titleBlock.company.logo, undefined, `job ${i} opens on the company logo`);
    }
    assert.ok(!mem.getItem('cabinet-core.titleBlock.company').includes(BIG.href), 'the memory holds no picture');
    assert.ok(!mem.getItem('cabinet-core.titleBlock.company').includes(logoId(BIG)), 'nor its ref');
    // The current-job cache is written 250 ms after a change, with the ref.
    // AMENDED BY T-CC1a F9 (31.10.2026): the cache is the crash buffer of the open item, keyed by tenant and item
    // (lib/crashBuffer.js); it keeps the logo as its ref as the cache did. *"moje zdanie to powinno sie wszystko
    // zapisywac na pamiec podreczna"* (the owner, 30.10.2026).
    const { useAuthStore } = await import('../src/stores/authStore.js');
    useAuthStore.setState({ tenant: { id: 'tenant-f20', name: 'Skylon' } });
    useProjectStore.getState().newProject('Cached', { id: 'srv-cached' });
    useProjectStore.getState().setTitleBlock({ company: { logo: BIG } });
    useProjectStore.getState().setProjectName('Cached job');
    await new Promise((r) => setTimeout(r, 400));
    const cache = mem.getItem('cc.tenant-f20.item.srv-cached.buffer.v1') || '';
    useAuthStore.setState({ tenant: null });
    assert.ok(cache.includes('Cached job'), 'the cache was written');
    assert.ok(!cache.includes(BIG.href) && cache.includes(logoId(BIG)), 'with the logo as its ref');
    // A computer that refuses: the store answers false, and the window says so.
    globalThis.localStorage = { getItem: () => null, setItem: () => { throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); }, removeItem: () => {} };
    assert.deepEqual(useProjectStore.getState().setTitleBlock({ company: { logo: { href: PNG_200x100, width: 200, height: 100 } } }), { remembered: false });
    assert.equal(useProjectStore.getState().project.titleBlock.company.logo.href, PNG_200x100, 'the job still has it');
  } finally { delete globalThis.localStorage; }
  const modal = readFileSync(new URL('../src/components/DrawingModal.jsx', import.meta.url), 'utf8');
  assert.match(modal, /if \(remembered === false\)/, 'the window reads the answer');
  assert.match(modal, /this computer's storage refused to keep it, so the next job will not open with it/);
});

// ═══ 7. A REFUSED SAVE LEAVES THE JOB MARKED UNSAVED, ON EVERY ROAD ═══════
//
// After the review: the three save roads (File > Save in the top bar, Update
// and save in the design settings, File > Save as) called `markSaved`
// whatever the answer, so the unsaved flag cleared on a write the browser
// refused; the start screen put a brand-new job on the shelf and never read
// the answer. Each road's OWN code is run here (sliced from its file, its
// hooks handed in), against the real store and the real save.

const REFUSING = {
  getItem: () => null,
  setItem: () => { const err = new Error('The quota has been exceeded.'); err.name = 'QuotaExceededError'; throw err; },
  removeItem: () => {},
};

/** One road's own function, as its file writes it. */
function roadOf(file, start, end) {
  const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const a = src.indexOf(start);
  assert.ok(a >= 0, `${file} has ${start}`);
  const b = src.indexOf(end, a);
  assert.ok(b > a, `${file}: the end of ${start}`);
  return src.slice(a, b + end.length);
}
const ROADS = {
  'File > Save (TopBar)': {
    src: () => roadOf('src/components/TopBar.jsx', 'const save = async () => {', '\n  };'),
    name: 'save',
    hands: (h) => ({ timer: { current: null }, setSaveState: () => {}, confirmMs: 1, ...h }),
    run: (fn) => fn(),
  },
  'Update and save (DesignSettingsModal)': {
    src: () => roadOf('src/components/DesignSettingsModal.jsx', 'const updateAndSave = async () => {', '\n  };'),
    name: 'updateAndSave',
    hands: (h) => ({ blockers: [], saving: false, setSaving: () => {}, alive: { current: true }, closeModal: () => {}, ...h }),
    run: (fn) => fn(),
  },
  'File > Save as (ConfiguratorPage)': {
    src: () => roadOf('src/pages/ConfiguratorPage.jsx', 'const onSaveAs = useCallback(async (name) => {', '}, [project, units, markSaved]);'),
    name: 'onSaveAs',
    hands: (h) => ({ useCallback: (fn) => fn, ...h }),
    run: (fn) => fn('Copy of the job'),
  },
};

// AMENDED BY T-CC1a F7 (31.10.2026): each road is driven against a fake Joinery Core (`client`), the one save's
// door, instead of a browser storage. *"oczywiscie do CC laczysz sie tylko przez JC"* (the owner, 30.10.2026).
async function driveRoad(road, client) {
  const { useProjectStore } = await import('../src/stores/projectStore.js');
  const had = globalThis.supabaseClient;
  if (client) globalThis.supabaseClient = client; else delete globalThis.supabaseClient;
  try {
    const st = useProjectStore.getState();
    st.newProject('Road', { id: 'srv-road' });
    useProjectStore.getState().setProjectName('Road, changed');
    assert.equal(useProjectStore.getState().dirty, true, 'the job has unsaved changes');
    const said = [];
    const hands = road.hands({
      persistProject,
      project: useProjectStore.getState().project,
      units: useProjectStore.getState().units,
      markSaved: useProjectStore.getState().markSaved,
      notify: (message, tone) => said.push({ message, tone }),
    });
    const names = Object.keys(hands);
    // eslint-disable-next-line no-new-func
    const fn = new Function(...names, `${road.src()}\nreturn ${road.name};`)(...names.map((k) => hands[k]));
    await road.run(fn);
    return { dirty: useProjectStore.getState().dirty, said, project: useProjectStore.getState().project };
  } finally { if (had) globalThis.supabaseClient = had; else delete globalThis.supabaseClient; }
}

// REWRITTEN BY T-CC1a F7 (31.10.2026): the three roads save through the one cc_save_item; a refusal from Joinery
// Core (or no Joinery Core at all) leaves the job marked unsaved and says so; Save as is "Save as new item":
// cc_create_item in the same project, then the same save. *"dopiero caly json powinien sie zapisac do DB przy
// nacisnieciu Zapisz lub co 5 minut automatycznie"* (the owner, 30.10.2026).
for (const [label, road] of Object.entries(ROADS)) {
  test(`F20 after the review · ${label}: a refused write leaves the job marked unsaved, and says so`, async () => {
    for (const client of [fakeJc({ refuse: 'Forbidden' }).client, null]) {
      const refused = await driveRoad(road, client);
      assert.equal(refused.dirty, true, 'the unsaved flag stands');
      assert.equal(refused.said.length, 1);
      assert.equal(refused.said[0].tone, 'error');
      assert.match(refused.said[0].message, client ? /^Not saved: Forbidden/ : /^Not saved: Joinery Core did not answer/);
    }
    const jc = fakeJc();
    const taken = await driveRoad(road, jc.client);
    assert.equal(taken.dirty, false, 'a save Joinery Core took clears it');
    assert.equal(taken.said[0].tone, 'ok');
    if (road.name === 'onSaveAs') {
      assert.deepEqual(jc.rpc.map((c) => c.name), ['cc_create_item', 'cc_save_item']);
      assert.deepEqual(jc.rpc[0].params, { p_name: 'Copy of the job', p_project_id: 'p1' });
      assert.equal(taken.project.id, jc.rpc[1].params.p_item_id, 'the job is now the new item');
      assert.equal(taken.project.name, 'Copy of the job');
    } else {
      assert.deepEqual(jc.rpc.map((c) => [c.name, c.params.p_item_id]), [['cc_save_item', 'srv-road']]);
    }
  });
}

// REWRITTEN BY T-CC1a F4/F5 (31.10.2026) to the new law: the start screen no longer puts a brand-new job on this
// browser's shelf. A new item is born in Joinery Core (cc_create_item, its id the server's) before the editor opens,
// and its first save is the one request of PART C, so the shelf's refusal can no longer touch it. *"automatyczne
// polaczenie danego projektu do danego pipelinu lub production projektu"* (the owner, 30.10.2026).
test('F20 after the review · the start screen: a brand-new item is not put on the shelf any more (T-CC1a F4/F5)', () => {
  const src = roadOf('src/components/StartScreen.jsx', 'const onFlowStart = () => {', '\n  };');
  assert.doesNotMatch(src, /saveLocalProject|notOnShelf/);
  assert.match(src, /openEditor\(\)/);
});

// REWRITTEN BY T-CC1a F7 (31.10.2026): the branches are Joinery Core's answers, not the shelf's.
test('F20 after the review · persistProject says whether the job was stored, on every branch', async () => {
  const { useProjectStore } = await import('../src/stores/projectStore.js');
  useProjectStore.getState().newProject('Branches', { id: 'srv-branches' });
  assert.equal((await withJc(fakeJc().client, () => persistProject({ storage: quotaStorage() }))).stored, true);
  assert.equal((await withJc(fakeJc({ refuse: 'Forbidden' }).client, () => persistProject({ storage: quotaStorage() }))).stored, false);
  assert.equal((await withJc(null, () => persistProject({ storage: quotaStorage() }))).stored, false);
});
