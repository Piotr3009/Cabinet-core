/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T79 F18 · 21 OR 44 PER SHEET, TWO MENU ENTRIES (CLAUDE.md PART F).
//
// The handover of 18.10: *"przełącznik 21/44 naklejek w oknie eksportu"*; the
// owner, 14:55: *"ok daj"*. There is no export window: Output > Part labels
// exported at once on profile.labels.sheet. Now two entries, each naming a
// preset of profile.labels.sheets (L7160, the default, and generic44), both
// running onExportLabels({ sheet }), which hands the paper to exportLabelsPdf.
// What this file holds: the two entries and the paper each names; the grids
// (3 x 7 and 4 x 11) in the produced PDF, by its page count for a known number
// of labels; the default still L7160; a paper the profile lacks refused in
// words; the page handler passing the paper on; the stale "44 per page" gone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { getCabinetProfile } from '../src/engine/profile.js';
import { formatPartNo, labelRecords, labelSheetGrid } from '../src/engine/partNumbers.js';
import { buildOutputMenu } from '../src/lib/outputMenu.js';
import { labelsDoc, labelsProfileOn } from '../src/lib/labelsPdf.js';
import { pdfBytes } from '../src/lib/drawingExport.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const P = getCabinetProfile();

const W = defaultParamsFor('WARDROBE', P);
const r1 = computeCabinet({ ...W, width: 1000, unit_num: 'W01', items: [{ kind: 'shelf', variant: 'adjustable', pos_mm: 600 }] }, P);
const base = labelRecords([{ id: 'u1', unitNum: 'W01', panels: r1.panels }], P);

/** Exactly `n` sticker records, numbered 1..n, cycled off one wardrobe's boards. */
function recordsOf(n) {
  return Array.from({ length: n }, (_, i) => ({ ...base[i % base.length], no: i + 1, noText: formatPartNo(i + 1, P), total: n }));
}

/** The pages of a PDF counted in its BYTES: every `/Type /Page` object that is not the `/Pages` tree. */
function pdfPageObjects(doc) {
  const text = Buffer.from(pdfBytes(doc)).toString('latin1');
  return (text.match(/\/Type\s*\/Page(?!s)/g) || []).length;
}

const L21 = 'Part labels · 21 per sheet (Avery L7160)';
const L44 = 'Part labels · 44 per sheet';

test('F18 · the Output menu carries both entries, once each, after the BOM PDF, and each hands onExportLabels its paper', () => {
  const ran = [];
  const menu = buildOutputMenu({ onExportLabels: (opts) => ran.push(opts) });
  const flat = menu.items.filter((i) => i.label);
  const i21 = flat.findIndex((i) => i.label === L21);
  const i44 = flat.findIndex((i) => i.label === L44);
  assert.ok(i21 > 0 && i44 === i21 + 1, 'the 21 entry, then the 44 entry beside it');
  assert.equal(flat[i21 - 1].label, 'BOM PDF', 'in the machine files\' group, where the one entry stood');
  assert.equal(flat.filter((i) => /^Part labels/.test(i.label)).length, 2, 'two entries, no third and no old one');
  assert.equal(flat.filter((i) => i.label === 'Part labels (PDF)').length, 0, 'the single entry is gone, not left beside them');
  flat[i21].run({ type: 'click' });
  flat[i44].run({ type: 'click' });
  assert.deepEqual(ran, [{ sheet: 'L7160' }, { sheet: 'generic44' }], 'the click event is not handed on; the paper is');
  // every paper a menu entry names is a preset the profile holds
  for (const opts of ran) assert.ok(P.labels.sheets[opts.sheet], `${opts.sheet} is in profile.labels.sheets`);
  // no handler: the entries are inert, never a throw
  const bare = buildOutputMenu({}).items.filter((i) => /^Part labels/.test(i.label || ''));
  for (const item of bare) assert.doesNotThrow(() => item.run());
});

test('F18 · the stale "44 per page" hint is corrected; the hints say which paper, the numbers stay the profile\'s', () => {
  const src = read('src/lib/outputMenu.js');
  assert.ok(!/44 per page/.test(src), 'the hint no longer says 44 per page on the 21-up default');
  const flat = buildOutputMenu({}).items.filter((i) => /^Part labels/.test(i.label || ''));
  for (const item of flat) assert.ok(item.hint && item.hint.length > 8, `${item.label} has a hint`);
  assert.match(flat[0].hint, /default Avery paper/, 'the 21-up entry is the default paper (profile.labels.sheet)');
  for (const item of flat) assert.ok(!/owner/.test(item.hint), `${item.label}: a hint speaks to whoever prints, not about the owner`);
  assert.match(flat[1].hint, /44-up/);
});

test('F18 · the two grids: L7160 is 3 x 7 (21 per A4), generic44 is 4 x 11 (44 per A4), both from profile.labels.sheets', () => {
  const g21 = labelSheetGrid(labelsProfileOn(P, 'L7160'));
  const g44 = labelSheetGrid(labelsProfileOn(P, 'generic44'));
  assert.equal(g21.perPage, 21);
  assert.equal(g44.perPage, 44);
  assert.deepEqual([g21.pageW, g21.pageH, g44.pageW, g44.pageH], [210, 297, 210, 297], 'both on A4');
  // 3 columns: the fourth cell starts row two; 4 columns: the fifth does
  assert.equal(g21.cells[3].x, g21.cells[0].x);
  assert.ok(g21.cells[3].y > g21.cells[0].y);
  assert.equal(g44.cells[4].x, g44.cells[0].x);
  assert.ok(g44.cells[4].y > g44.cells[0].y);
  assert.equal(new Set(g21.cells.map((c) => c.y)).size, 7, '7 rows');
  assert.equal(new Set(g44.cells.map((c) => c.y)).size, 11, '11 rows');
  assert.deepEqual(g44.cells[0], { x: 8.4, y: 8.8, w: 48.3, h: 25.4 }, 'the 44-up preset lays out as it did on 13:07');
});

test('F18 · the produced PDF: 44 labels are 3 pages on L7160 and 1 page on generic44; 45 labels are 3 and 2', () => {
  const r44 = recordsOf(44);
  const on21 = labelsDoc({ records: r44, profile: P, sheet: 'L7160' });
  const on44 = labelsDoc({ records: r44, profile: P, sheet: 'generic44' });
  assert.deepEqual([on21.pages, on21.doc.getNumberOfPages(), pdfPageObjects(on21.doc)], [3, 3, 3], '21 + 21 + 2 on the Avery paper');
  assert.deepEqual([on44.pages, on44.doc.getNumberOfPages(), pdfPageObjects(on44.doc)], [1, 1, 1], 'one 44-up sheet');
  assert.deepEqual([on21.labels, on44.labels], [44, 44]);
  assert.deepEqual([on21.perPage, on21.paper, on44.perPage, on44.paper], [21, 'L7160', 44, 'generic44']);
  const r45 = recordsOf(45);
  assert.equal(labelsDoc({ records: r45, profile: P, sheet: 'L7160' }).pages, 3);
  assert.equal(labelsDoc({ records: r45, profile: P, sheet: 'generic44' }).pages, 2);
  // the page size is the paper's (A4 portrait, in mm)
  const size = on44.doc.internal.pageSize;
  assert.deepEqual([Math.round(size.getWidth()), Math.round(size.getHeight())], [210, 297]);
});

test('F18 · the default stays L7160: no paper named is the profile\'s own sheet, and the profile is not changed', () => {
  assert.equal(P.labels.sheet.preset, 'L7160');
  const before = JSON.stringify(P.labels);
  const plain = labelsDoc({ records: recordsOf(44), profile: P });
  assert.deepEqual([plain.pages, plain.perPage, plain.paper], [3, 21, 'L7160']);
  labelsDoc({ records: recordsOf(44), profile: P, sheet: 'generic44' });
  assert.equal(JSON.stringify(P.labels), before, 'choosing a paper never writes it into the profile');
  assert.equal(labelsProfileOn(P, null), P);
  assert.equal(labelsProfileOn(P, undefined), P);
});

test('F18 · a paper the profile does not hold is refused in words, never printed on another paper', () => {
  assert.throws(() => labelsProfileOn(P, 'A5x8'), /There is no label paper called A5x8 in the profile; no labels were made\./);
  assert.throws(() => labelsDoc({ records: recordsOf(3), profile: P, sheet: 'A5x8' }), /no label paper called A5x8/);
});

test('F18 · the page: onExportLabels takes { sheet } and hands it to exportLabelsPdf, the notice says how many per sheet', () => {
  const page = read('src/pages/ConfiguratorPage.jsx');
  assert.match(page, /const onExportLabels = useCallback\(\(opts\) => \{/);
  assert.match(page, /const sheet = typeof opts\?\.sheet === 'string' \? opts\.sheet : null;/);
  assert.match(page, /exportLabelsPdf\(\{ records, profile, sheet, project: project\.name \}\)/);
  assert.match(page, /\$\{res\.perPage\} per sheet\./);
  assert.match(page, /onExportLabels=\{onExportLabels\}/);
  const pdf = read('src/lib/labelsPdf.js');
  assert.match(pdf, /export function exportLabelsPdf\(\{ records, profile, sheet = null, project = null, now = new Date\(\) \}\)/);
  assert.match(pdf, /labelsDoc\(\{ records, profile, sheet \}\)/);
});
