// ─── TURN 42 (CLAUDE.md F0): THE WALL PDF SPEAKS ────────────────────────────
//
// The owner, 19/20.08.2026, on the current build: *"pdf w ogóle nie zadziałał
// — coś się znowu zablokowało."* An F5 and a brand-new project changed nothing.
// This is the only feature in the app whose output is PAPER the workshop hands
// to a client, and it was dark.
//
// F0's own law, and it is iron rule 6 said in this feature's words:
//
//   *"assert the EXPORTED BYTES and the words ON SCREEN, never the array's
//   length alone."*
//
// So nothing below counts sheets and calls that a PDF. The document is
// serialised and its FIRST FOUR BYTES are read; the page count is compared to
// the sheet count; and the three states the window can be in — CRASHED,
// genuinely EMPTY, and a real set — are three different things on the glass,
// asserted as three different pieces of markup.
//
// What is NOT here, deliberately: a test that the fault the owner hit
// reproduces. It does not, on this build — see the PR body and
// `verify/t42/f0-wall-pdf-probe.mjs`, which walks his path end to end and comes
// back with a real file every time. What this file pins is that the NEXT time
// it goes dark, the screen says so instead of pretending to be empty.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { wallDrawingSheets, wallSetReport } from '../src/engine/drawings/wallSheets.js';
import {
  PDF_MAGIC, assertPdfBytes, bookletDoc, drawingErrorText, pdfBytes,
} from '../src/lib/drawingExport.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const MODAL = read('src/components/DrawingModal.jsx');
const PAGE = read('src/pages/ConfiguratorPage.jsx');

/**
 * The CODE, without its prose. Both files now QUOTE the swallowing catch in
 * the comment that explains why it is gone, and a check that cannot tell a
 * quotation from the thing itself is a check that would have to be weakened
 * the first time somebody wrote the fault's name down.
 */
const codeOf = (src) => src
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .join('\n');

const ROOM = migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) });

function entry(type, over = {}, position = { wall: 0, x_mm: 0, rotation_deg: 0 }) {
  const params = { ...defaultParamsFor(type, P), unit_num: '01', ...over };
  return { unit: { id: `u-${over.unit_num || type}`, type, params, position }, result: computeCabinet(params, P) };
}

const kitchen = () => [
  entry('BUD', { unit_num: '01', width: 600, plinth: true }, { wall: 0, x_mm: 0, rotation_deg: 0 }),
  entry('BUD', { unit_num: '02', width: 500, plinth: true }, { wall: 0, x_mm: 640, rotation_deg: 0 }),
  entry('WUD', { unit_num: '03', width: 600, mount_height: 1500 }, { wall: 0, x_mm: 40, rotation_deg: 0 }),
  entry('WARDROBE', { unit_num: '04', width: 900 }, { wall: 1, x_mm: 200, rotation_deg: 0 }),
];

const sheetsOf = (entries) => wallDrawingSheets({
  entries, project: { name: 'Anderson Kitchen' }, room: ROOM, profile: P, date: '19/08/2026',
});

// ═══ 1. THE EXPORTED BYTES ═════════════════════════════════════════════════

test('F0 — the exported bytes START %PDF, read off the document and not off a filename', () => {
  const sheets = sheetsOf(kitchen());
  const bytes = pdfBytes(bookletDoc(sheets.map((s) => s.sheet)));
  assert.ok(bytes.length > 1000, `a PDF of ${sheets.length} sheets is not ${bytes.length} bytes`);
  const head = String.fromCharCode(...bytes.slice(0, 4));
  assert.equal(head, PDF_MAGIC, 'the first four bytes of the file the joiner opens');
});

test('F0 — THE PAGE COUNT EQUALS THE SHEET COUNT, on a five-sheet set', () => {
  const sheets = sheetsOf(kitchen());
  assert.deepEqual(sheets.map((s) => s.name), [
    'Wall A /1', 'Wall A /2', 'Wall B /1', 'Wall B /2', 'Horizontal section',
  ]);
  const doc = bookletDoc(sheets.map((s) => s.sheet));
  assert.equal(doc.getNumberOfPages(), sheets.length, 'a page per sheet, in the order they were built');
  // …and the export itself asks the same question, which is what turns the word
  // "Saved" from a claim into a measurement.
  const measured = assertPdfBytes(pdfBytes(doc), { pages: doc.getNumberOfPages(), sheets: sheets.length });
  assert.equal(measured.pages, 5);
  assert.ok(measured.bytes > 1000);
});

test('F0 — the byte assertion REFUSES a document that is not a PDF, and says why', () => {
  const notPdf = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00]);   // a ZIP
  assert.throws(
    () => assertPdfBytes(notPdf, { pages: 1, sheets: 1, what: 'The wall drawings PDF' }),
    /did not come out as a PDF/,
  );
  // …and one that came out the wrong LENGTH, which is the other half of the
  // question and the one a page-count regression would trip.
  const real = pdfBytes(bookletDoc(sheetsOf(kitchen()).map((s) => s.sheet)));
  assert.throws(
    () => assertPdfBytes(real, { pages: 5, sheets: 7 }),
    /came out 5 pages long for 7 sheets/,
  );
});

test('F0 — the export path runs that assertion itself (not only this test)', () => {
  const src = read('src/lib/drawingExport.js');
  const fn = src.slice(src.indexOf('export function exportWallDrawingsPdf'));
  const body = fn.slice(0, fn.indexOf('\n}\n'));
  assert.ok(body.includes('assertPdfBytes'), 'exportWallDrawingsPdf measures the bytes before it says "Saved"');
  assert.ok(body.includes('pdfBytes(doc)'), 'and it measures the document it is about to hand over');
});

// ═══ 2. AN ERROR IS NEVER RELABELLED AS EMPTINESS ══════════════════════════

test('F0 — `drawingErrorText` never answers with the emptiness sentence', () => {
  const shapes = [
    new Error('layoutSheet: bounds are NaN'),
    new Error(''),                                   // the exact case that used to relabel
    new TypeError(''),
    Object.assign(new Error(''), { name: 'AbortError' }),
    'a string thrown by something that is not an Error',
    null,
    undefined,
    {},
    { message: '   ' },
  ];
  for (const e of shapes) {
    const text = drawingErrorText(e);
    assert.ok(text && text.trim().length, `something to read for ${JSON.stringify(String(e))}`);
    assert.ok(!/nothing to draw/i.test(text), `"${text}" is the emptiness sentence wearing an error's coat`);
    assert.ok(!/no cabinet is standing/i.test(text), `"${text}" is the other emptiness sentence`);
  }
  // The named cases, exactly.
  assert.equal(drawingErrorText(new Error('boom')), 'boom');
  assert.equal(drawingErrorText(new TypeError('')), 'TypeError (no message)');
  assert.equal(drawingErrorText('thrown string'), 'thrown string');
});

test('F0 — NEITHER PATH still carries the `|| Nothing to draw yet.` relabelling', () => {
  for (const [name, src] of [['DrawingModal.jsx', MODAL], ['ConfiguratorPage.jsx', PAGE]]) {
    const code = codeOf(src);
    assert.ok(
      !/\|\|\s*'Nothing to draw yet\.'/.test(code),
      `${name} still relabels an error as emptiness`,
    );
    assert.ok(
      !/catch\s*\{\s*return\s*\[\]\s*;?\s*\}/.test(code),
      `${name} still has a catch that swallows the error whole`,
    );
    // …and the fault IS written down, in the comment that explains the fix.
    assert.ok(src.includes('CLAUDE.md F0'), `${name} says which turn took the gag off`);
  }
});

test('F0 — every drawing catch in both files REPORTS: console.error, then a sentence', () => {
  for (const [name, src] of [['DrawingModal.jsx', MODAL], ['ConfiguratorPage.jsx', PAGE]]) {
    const catches = src.match(/catch\s*\([a-z]+\)\s*\{/g) || [];
    assert.ok(catches.length >= 2, `${name} has the drawing catches`);
    assert.ok(src.includes('console.error'), `${name} puts the whole error where a diagnosis can reach it`);
    assert.ok(src.includes('drawingErrorText'), `${name} puts a sentence where a joiner can read it`);
  }
});

// ═══ 3. THE THREE STATES, ON THE GLASS ═════════════════════════════════════

test('F0 — CRASHED and EMPTY are two different things on screen, forever after', () => {
  // The memo answers with both facts…
  assert.ok(/return \{ sheets, error: null, report:/.test(MODAL), 'the set, when it built');
  assert.ok(/return \{ sheets: \[\], error: e, report: null \}/.test(MODAL), 'and the error, when it did not');
  // …and the window renders them as two different pieces of markup.
  assert.ok(MODAL.includes('data-wall-failed="1"'), 'the CRASH has its own subject on the glass');
  assert.ok(MODAL.includes('Wall drawings failed: {drawingErrorText(wallError)}'),
    'and the message itself is on it — not a code, not a shrug');
  assert.ok(MODAL.includes('text-status-danger'), 'in the error style');
  assert.ok(MODAL.includes('data-wall-empty="1"'), 'the EMPTY job has its own subject too');
  assert.ok(MODAL.includes('No cabinet is standing against a wall yet'), 'and keeps the honest sentence');
  // The honest sentence is reachable ONLY when nothing crashed — which is the
  // whole fault this feature was about.
  assert.ok(MODAL.includes("{kind === 'walls' && !wallError && !wallSheetList.length ? ("),
    'the honest sentence is guarded by "and nothing crashed"');
  // …and the HEADING above it, which said "No wall has a cabinet on it" over
  // the red box until this turn, is guarded by the same fact.
  assert.ok(MODAL.includes("wallError ? 'The wall set could not be built' : 'No wall has a cabinet on it'"),
    'the heading tells the same truth the footer does');
});

test('F0 — the buttons stay disabled in BOTH refusing states', () => {
  const disabled = MODAL.match(/disabled=\{!wallSheetList\.length\}/g) || [];
  assert.equal(disabled.length, 2, 'the wall PDF button and the wall DXF button');
  // A crash empties the sheet list, so the same one expression disables both in
  // both states — which is what makes "the buttons stay disabled" true by
  // construction rather than by a second guard somebody has to remember.
  assert.ok(/return \{ sheets: \[\], error: e/.test(MODAL));
});

test('F0 — a genuinely EMPTY job still refuses politely, with no error styling', () => {
  const sheets = wallDrawingSheets({
    entries: [], project: { name: 'X' }, room: ROOM, profile: P, date: 'd',
  });
  assert.equal(sheets.length, 0, 'no units, no sheets');
  assert.throws(() => bookletDoc([]), /nothing to draw/i, 'and binding nothing is an honest refusal');
});

// ═══ 4. THE SET NAMES WHY, PER WALL ════════════════════════════════════════

test('F0 — a TURNED cabinet is NAMED, on the wall it was left off', () => {
  const entries = [
    entry('BUD', { unit_num: '01', width: 600 }, { wall: 0, x_mm: 0, rotation_deg: 0 }),
    entry('BUD', { unit_num: '02', width: 500 }, { wall: 0, x_mm: 700, rotation_deg: 90 }),
    entry('WARDROBE', { unit_num: '03', width: 900 }, { wall: 1, x_mm: 0, rotation_deg: 90 }),
  ];
  const report = wallSetReport({ entries, profile: P });
  assert.equal(report.units, 3);
  assert.equal(report.drawn, 1);

  const a = report.walls.find((w) => w.label === 'A');
  assert.equal(a.drawn, 1);
  assert.equal(a.elevation, true, 'wall A still gets its two sheets');
  assert.deepEqual(a.skipped.map((s) => s.unit), ['02']);
  assert.match(a.skipped[0].reason, /turned away/);

  // THE ONE `wallGroups` COULD NOT ANSWER: a wall whose every cabinet is turned
  // away is dropped from the group list entirely, `skipped` and all — so before
  // this reader, wall B simply vanished off the sheet list without a word.
  const b = report.walls.find((w) => w.label === 'B');
  assert.equal(b.elevation, false, 'no elevation for wall B…');
  assert.deepEqual(b.skipped.map((s) => s.unit), ['03'], '…and it says which cabinet and why');
  assert.equal(wallDrawingSheets({
    entries, project: {}, room: ROOM, profile: P, date: 'd',
  }).some((s) => s.name.startsWith('Wall B')), false);
});

test('F0 — a unit the engine could not answer for is named too, not dropped', () => {
  const report = wallSetReport({
    entries: [{ unit: { id: 'z', params: { unit_num: '09' }, position: { wall: 0, x_mm: 0, rotation_deg: 0 } }, result: null }],
    profile: P,
  });
  assert.deepEqual(report.walls[0].skipped, [{ unit: '09', reason: 'has nothing to draw yet' }]);
  assert.equal(report.drawn, 0);
});

test('F0 — the window RENDERS that census rather than keeping it to itself', () => {
  assert.ok(MODAL.includes('wallSetReport'), 'the modal asks for it');
  assert.ok(MODAL.includes('data-wall-skips="1"'), 'and puts it on the glass under its own subject');
  assert.ok(MODAL.includes('sk.reason'), 'with the reason, per cabinet');
});

test('F0 — `wallSetReport` is a READER: the sheet list is what it always was', () => {
  // Byte-for-byte, on the same seed T40's own test uses. If the census had
  // changed the set, the whole claim "F0 moves no geometry" would be void.
  const sheets = sheetsOf(kitchen());
  assert.deepEqual(sheets.map((s) => [s.name, s.variant, s.wall]), [
    ['Wall A /1', 'fronts', 0], ['Wall A /2', 'carcass', 0],
    ['Wall B /1', 'fronts', 1], ['Wall B /2', 'carcass', 1],
    ['Horizontal section', 'section', null],
  ]);
});

// ═══ 5. A REFUSAL SAYS SO ══════════════════════════════════════════════════

test('F0 — `guard()` never returns false in silence', () => {
  const body = PAGE.slice(PAGE.indexOf('const guard = ('), PAGE.indexOf('// ─── CHECK v1, BEFORE EXPORT'));
  const refusals = body.match(/return false/g) || [];
  assert.equal(refusals.length, 1, 'exactly one refusal in the guard today');
  // Every `return false` in it is preceded by a notify, in the same block.
  for (const chunk of body.split('return false')) {
    if (chunk === body.split('return false').at(-1)) continue;
    assert.ok(chunk.includes('notify('), 'a refusal that says nothing is the fault F0 is about');
  }
  assert.ok(body.includes('subject'), 'and it says WHICH refusal — "export" or "draw"');
  assert.ok(PAGE.includes("guard('draw')"), 'the drawing paths ask in the drawing’s own words');
});
