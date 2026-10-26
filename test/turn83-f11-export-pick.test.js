/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F11 · EXPORT THE SHEETS YOU CHOOSE
//
// The owner, 25.10.2026 (22:41): *"daj mozliwosc exportowania tylko
// naprzyklad frontow lub cos takiego, nie koniecznie wszystkie strony na
// raz"*. CLAUDE.md T83 F11: "The Drawings window's Set tab gets a check box
// per sheet (all on by default, "All" and "None" buttons); "Drawing set
// (PDF)" exports the checked sheets in the set's order, the page numbers
// "n / N" counting the exported ones; the Wall DXF the same. The choice lives
// in the window (ui state), not in the project. Tests: exportWallDrawingsPdf
// given three of nine sheets writes three pages numbered 1 / 3 to 3 / 3".
//
// The PDF is WRITTEN (jsPDF's node build saves to the working directory, so
// the test stands in a directory of its own) and read back from the file; the
// DXF ZIP is caught where the browser would download it and opened again.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';

import { t81Kitchen, setArgs } from '../scripts/t81-kitchen.mjs';
import { numberPages, pickedSheets, wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { bookletDoc, exportWallDrawingsDxf, exportWallDrawingsPdf } from '../src/lib/drawingExport.js';

const THREE = ['Cut list and materials', 'Wall A · Fronts', 'Plan · base units'];

/** The T81 kitchen's set: nine sheets. */
function theSet() {
  t81Kitchen({ inframe: false });
  return wallDrawingSheets(setArgs());
}

/** The SHEET cell of a laid-out sheet: the strip's bold `NN / MM`. */
const sheetCell = (sheet) => sheet.entities.filter((e) => e.kind === 'text' && e.layer === 'FRAME' && /^\d\d \/ \d\d$/.test(e.text)).map((e) => e.text);

/** The text a PDF page draws, from the document's own page streams. */
const pageTexts = (doc) => doc.internal.pages.slice(1).map((pg) => pg.join('\n'));

/** Stand in a directory of our own while jsPDF writes its file there. */
function inTempDir(fn) {
  const was = process.cwd();
  const dir = mkdtempSync(join(tmpdir(), 't83-f11-'));
  process.chdir(dir);
  try { return fn(dir); } finally { process.chdir(was); rmSync(dir, { recursive: true, force: true }); }
}

test('T83 F11 · the T81 kitchen\'s set has nine sheets, and three of them are picked in the SET\'s order', () => {
  const set = theSet();
  assert.equal(set.length, 9, set.map((s) => s.name).join(', '));
  const three = pickedSheets(set, THREE);
  assert.deepEqual(three.map((s) => s.name), ['Wall A · Fronts', 'Plan · base units', 'Cut list and materials'], 'the set\'s order, not the order ticked');
  assert.deepEqual(three.map((s) => s.no), ['02', '05', '09']);
  // The same entries, not copies: the window keeps showing the set.
  assert.ok(three.every((s) => set.includes(s)));
  // null is every sheet; a predicate is asked of each; nothing ticked is nothing.
  assert.deepEqual(pickedSheets(set, null), set);
  assert.deepEqual(pickedSheets(set, (s) => s.variant === 'fronts').map((s) => s.name), ['Wall A · Fronts']);
  assert.deepEqual(pickedSheets(set, []), []);
  assert.deepEqual(pickedSheets(set, new Set(['Wall A · Fronts'])).map((s) => s.no), ['02']);
});

test('T83 F11 · numberPages: each bound page counts the pages bound; the set itself is untouched', () => {
  const set = theSet();
  const three = pickedSheets(set, THREE);
  const before = three.map((s) => sheetCell(s.sheet));
  const pages = numberPages(three.map((s) => s.sheet));
  assert.deepEqual(pages.map(sheetCell), [['01 / 03'], ['02 / 03'], ['03 / 03']]);
  assert.deepEqual(pages.map((p) => [p.pageNo, p.pageOf]), [['01', '03'], ['02', '03'], ['03', '03']]);
  // The sheets the window shows still say their place in the set.
  assert.deepEqual(three.map((s) => sheetCell(s.sheet)), before);
  assert.deepEqual(before, [['02 / 09'], ['05 / 09'], ['09 / 09']]);
  // A drawing keeps its number: only the SHEET cell counts the pages.
  for (const [i, p] of pages.entries()) {
    const words = p.entities.filter((e) => e.kind === 'text').map((e) => e.text);
    assert.ok(words.includes(`${three[i].no} · ${three[i].name}`), `${three[i].name} keeps its drawing number`);
  }
  // The whole set bound in order is the very same objects: byte for byte what it was.
  const all = numberPages(set.map((s) => s.sheet));
  assert.ok(all.every((p, i) => p === set[i].sheet), 'the whole set, in order, is handed back as it is');
  // A sheet that was never stamped is left alone.
  const bare = { entities: [{ kind: 'text', layer: 'FRAME', text: ' / ' }] };
  assert.equal(numberPages([bare])[0], bare);
});

test('T83 F11 · exportWallDrawingsPdf given three of nine sheets writes three pages numbered 1 / 3 to 3 / 3', () => {
  const set = theSet();
  const three = pickedSheets(set, THREE);
  inTempDir((dir) => {
    const out = exportWallDrawingsPdf(three.map((s) => s.sheet), { project: 'T83 F11' });
    assert.equal(out.pages, 3, 'three pages');
    assert.deepEqual(readdirSync(dir), [out.filename], 'one file written');
    const file = readFileSync(join(dir, out.filename), 'latin1');
    assert.ok(file.startsWith('%PDF'), 'a PDF');
    assert.equal((file.match(/\/Type \/Page\b(?!s)/g) || []).length, 3, 'three page objects in the file');
    assert.deepEqual(file.match(/\(\d\d \/ \d\d\) Tj/g), ['(01 / 03) Tj', '(02 / 03) Tj', '(03 / 03) Tj'], 'the SHEET cells, in the file');
    // Page by page, the set's order: the fronts, the plan, the cut list.
    const texts = pageTexts(out.doc);
    assert.equal(texts.length, 3);
    ['02 · Wall A · Fronts', '05 · Plan · base units', '09 · Cut list and materials'].forEach((name, i) => {
      assert.ok(texts[i].includes(`(${name}) Tj`), `page ${i + 1} is ${name}`);
      assert.ok(texts[i].includes(`(0${i + 1} / 03) Tj`), `page ${i + 1} reads 0${i + 1} / 03`);
      assert.ok(!/\/ 09\) Tj/.test(texts[i]), `page ${i + 1} does not count the whole set`);
    });
  });
});

test('T83 F11 · one sheet (Fronts only) is a one-page PDF; the whole set prints exactly what it printed', () => {
  const set = theSet();
  inTempDir(() => {
    const one = exportWallDrawingsPdf(pickedSheets(set, ['Wall A · Fronts']).map((s) => s.sheet), { project: 'T83 F11' });
    assert.equal(one.pages, 1);
    assert.ok(pageTexts(one.doc)[0].includes('(01 / 01) Tj'));
    // Every sheet ticked (the default): the pages the set always bound, stream for stream.
    const all = exportWallDrawingsPdf(set.map((s) => s.sheet), { project: 'T83 F11' });
    assert.equal(all.pages, 9);
    assert.deepEqual(pageTexts(all.doc), pageTexts(bookletDoc(set.map((s) => s.sheet))), 'the whole set unchanged');
    assert.deepEqual(pageTexts(all.doc).map((t) => (t.match(/\((\d\d \/ \d\d)\) Tj/) || [])[1]), set.map((s) => `${s.no} / 09`));
  });
});

test('T83 F11 · the Wall DXF binds the same ticked sheets, each strip counting the files bound', async () => {
  const set = theSet();
  const three = pickedSheets(set, THREE);
  // Where the browser would download the ZIP, catch it.
  let caught = null;
  const had = { document: globalThis.document, create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  globalThis.document = { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } };
  URL.createObjectURL = (blob) => { caught = blob; return 'blob:t83-f11'; };
  URL.revokeObjectURL = () => {};
  try {
    const out = await exportWallDrawingsDxf(three, { project: 'T83 F11' });
    assert.equal(out.files.length, 3, out.files.join(', '));
    assert.ok(caught, 'the ZIP was handed to the download');
    const zip = await JSZip.loadAsync(await caught.arrayBuffer());
    const dxfs = Object.keys(zip.files).filter((n) => n.endsWith('.dxf'));
    assert.deepEqual(dxfs, out.files, 'the three files, in the set\'s order');
    for (const [i, name] of out.files.entries()) {
      const body = await zip.file(name).async('string');
      assert.ok(body.includes(`0${i + 1} / 03`), `${name} reads 0${i + 1} / 03`);
      assert.ok(!body.includes(' / 09'), `${name} does not count the whole set`);
    }
    assert.ok(out.files[0].startsWith('wall-a'), out.files[0]);
  } finally {
    if (had.document === undefined) delete globalThis.document; else globalThis.document = had.document;
    URL.createObjectURL = had.create;
    URL.revokeObjectURL = had.revoke;
  }
});

test('T83 F11 · the window: a check box per sheet, All and None, the choice its own state, the exports bind the ticked', () => {
  const modal = readFileSync(new URL('../src/components/DrawingModal.jsx', import.meta.url), 'utf8');
  assert.match(modal, /type="checkbox"\s+data-wall-sheet-pick=\{page\.name\}/, 'a check box per sheet of the list');
  assert.match(modal, /checked=\{!leftOut\.has\(page\.name\)\}/, 'ticked unless left out: all on by default');
  assert.match(modal, /const \[leftOut, setLeftOut\] = useState\(\(\) => new Set\(\)\);/, 'the window\'s own state, empty when it opens');
  assert.match(modal, /data-wall-sheets-all="1" onClick=\{\(\) => setLeftOut\(new Set\(\)\)\}>All</, 'All');
  assert.match(modal, /data-wall-sheets-none="1" onClick=\{\(\) => setLeftOut\(new Set\(wallSheetList\.map\(\(p\) => p\.name\)\)\)\}>None</, 'None');
  assert.match(modal, /pickedSheets\(wallSheetList, \(s\) => !leftOut\.has\(s\.name\)\)/, 'the engine\'s picker, in the set\'s order');
  assert.match(modal, /exportWallDrawingsPdf\(wallPicked\.map\(\(x\) => x\.sheet\)/, 'the PDF binds the ticked sheets');
  assert.match(modal, /exportWallDrawingsDxf\(wallPicked,/, 'the DXF the same');
  assert.match(modal, /if \(!wallPicked\.length\) \{ notify\('No sheet is ticked/, 'nothing ticked is refused in words');
  // Never in the project: no store action carries the choice.
  assert.ok(!/setTitleBlock\([^)]*leftOut|useProjectStore\([^)]*leftOut|leftOut[^\n]*persist/.test(modal), 'the choice is not the project\'s');
});
