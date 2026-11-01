/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F11 . "NOT ASSIGNED MATERIALS" IN EVERY EXPORT (law 7). The owner, 01.11.2026: *"kazda funkcja przypisana
// (10 rodzajow zawiasow, wszystkie przypisane), inaczej eksport BOM pisze not assigned materials"*. The BOM PDF is
// WRITTEN (jsPDF's node build saves to the working directory, so the test stands in a directory of its own) and its
// page streams are read back; the CSV is the purchase list's own text.
// REWRITTEN BY T-CC2a F5.3 (CLAUDE.md T-CC2a law 7, *"this REWRITES T-CC1b F11's 'Not assigned materials' and 'not a
// price' by name"*; the owner, 13:33, the total with "incomplete" when a line is not linked: *"zgoda"*): the words are
// "Not linked" on the line and "Incomplete total, <n> lines not linked" beside the total; a line is linked through the
// COMPANY'S links (the catalogue entry to a stock row), never assigned in the per-part blob.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { buildBom, purchaseBom, incompleteWords, LINK_WORDS } from '../src/engine/bom.js';
import { exportProjectPdf, buildPurchaseBomCsvText } from '../src/lib/exporters.js';
import { hardwareKey } from '../src/stores/materialAssignmentStore.js';
import { loadHardwareCatalogues } from '../src/lib/hardwareCatalogue.js';
import { STOCK_MATERIALS } from './fixtures/jc-stock.js';

loadHardwareCatalogues();

const e = (id, params) => ({ unit: { id, type: params.type, params }, result: computeCabinet(params, P) });
const JOB = [
  e('u1', { type: 'BUD', width: 600, height: 720, depth: 560, shelves: 1, unit_num: 'B1' }),
  e('u2', { type: 'BUDTALL', width: 600, height: 2100, depth: 560, unit_num: 'T1' }),
];
const BOM = buildBom(JOB, { profile: P });
const HINGES = BOM.hardware.filter((h) => h.role === 'hinges');
const DESIGN = {
  carcass: { types: [{ id: 'c1', label: 'Carcass 1', source: 'egger', finish_id: 'egger:W1000_9' }] },
  fronts: { types: [{ id: 'f1', label: 'Front 1', source: 'spray', colour: { hex: '#5e2129', name: '3005 Wine Red', system: 'RAL' } }] },
};
const STOCK = [
  { id: 's-sheet', name: 'Egger W1000 18 mm', unit: 'sheet', price: 41, item_number: 'EG-1' },
  { id: 's-any', name: 'A stock row', unit: 'pcs', price: 1.5, item_number: 'ANY-1' },
];

/** Every catalogue id the job buys linked, but the ids `leave` names. */
function links({ leave = [] } = {}) {
  const ids = purchaseBom(JOB, { links: new Map(), stock: STOCK, profile: P, design: DESIGN }).rows.map((r) => r.catalogueId).filter(Boolean);
  return new Map(ids.filter((id) => !leave.includes(id)).map((id) => [id, {
    cc_material_id: id, stock_item_id: id.startsWith('sheet.') ? 's-sheet' : 's-any', sheet_width_mm: 2800, sheet_length_mm: 2070,
  }]));
}
const hingeIds = () => purchaseBom(JOB, { links: new Map(), stock: STOCK, profile: P, design: DESIGN }).rows
  .filter((r) => (r.roles || []).includes('hinges') && r.catalogueId).map((r) => r.catalogueId);

const pageTexts = (doc) => doc.internal.pages.slice(1).map((pg) => pg.join('\n')).join('\n');
const count = (hay, needle) => hay.split(needle).length - 1;
function pdfText(map) {
  const was = process.cwd();
  const dir = mkdtempSync(join(tmpdir(), 'cc1b-f11-'));
  process.chdir(dir);
  try {
    return pageTexts(exportProjectPdf({
      entries: JOB, project: { name: 'Words job', design: DESIGN }, capture: null, links: map, stock: STOCK,
    }));
  } finally { process.chdir(was); rmSync(dir, { recursive: true, force: true }); }
}

test('F11.1 one hinge line not linked: "Not linked" on the line, the incomplete words on the cover and beside the total', () => {
  assert.equal(HINGES.length, 2, 'the job buys two hinge specs');
  const [first] = hingeIds();
  assert.ok(first, 'the hinge lines resolve to catalogue entries');
  const txt = pdfText(links({ leave: [first] }));
  assert.ok(count(txt, LINK_WORDS.notLinked) >= 1, txt);
  assert.equal(count(txt, incompleteWords(1)), 2, 'the cover and the total');
  assert.ok(txt.includes(`${incompleteWords(1)}. Link them in Cabinet Core, Materials, Link materials.`));
  assert.match(txt, /Total of the linked lines: £\d+\.\d\d\. Incomplete total, 1 line not linked/);
  assert.doesNotMatch(txt, /Not assigned materials|not a price/, 'T-CC1b\'s words are rewritten by name');
});

test('F11.1 the same job fully linked prints the total and not the words', () => {
  const txt = pdfText(links());
  assert.equal(count(txt, LINK_WORDS.notLinked), 0, txt);
  assert.equal(count(txt, 'Incomplete total'), 0);
  assert.match(txt, /Total: £\d+\.\d\d/);
});

test('F11.1 the purchase list CSV keeps its WARNING row, with the same words', () => {
  const bom = purchaseBom(JOB, { links: new Map(), stock: STOCK, profile: P, design: DESIGN });
  assert.ok(bom.totals.notLinked > 0);
  const csv = buildPurchaseBomCsvText(bom, {});
  const warning = csv.split('\n').find((l) => l.startsWith('WARNING,'));
  assert.ok(warning.includes(incompleteWords(bom.totals.notLinked)), warning);
  assert.match(csv, /TOTAL \(INCOMPLETE\)/);
  assert.ok(csv.includes(',Not linked,'));
});

// INT (F11.1, "the live BOM window shows the same header count as F10"): the window draws the Assign window's own
// count, built by the same two functions; the count is asserted here and the window is shown to bind it.
test('F11.1 the live BOM window carries the count: the Assign window\'s for the old window, the links\' in the BOM (T-CC2a F10.4)', async () => {
  const { buildAssignLines, assignCount } = await import('../src/stores/materialAssignmentStore.js');
  const { readFileSync } = await import('node:fs');
  const hardware = Object.fromEntries(BOM.hardware.map((h) => [hardwareKey(h), { material_id: h === HINGES[0] ? '' : STOCK_MATERIALS[0].id }]));
  const data = { hardware };
  const lines = buildAssignLines({ bom: BOM, data, materials: STOCK_MATERIALS });
  const hingeLines = lines.filter((l) => l.type === 'hardware' && l.role === 'hinges');
  assert.equal(hingeLines.length, 2, 'two hinge specs are two lines');
  assert.equal(hingeLines.filter((l) => !l.assigned).length, 1);
  const c = assignCount(lines.filter((l) => l.qty !== 0 || l.type !== 'part'));
  assert.ok(c.missing >= 1);
  assert.match(c.missingText, /^Not assigned materials: \d+ lines?$/);
  // REWRITTEN BY T-CC2a F10.4 (CLAUDE.md T-CC2a F5.3: *"this REWRITES T-CC1b F11's 'Not assigned materials' and
  // 'not a price' by name"*, law 7, the owner 13:33 *"zgoda"*). It asserted the BOM window drew the Assign window's
  // count (`assignCount(buildAssignLines(...))`, "Not assigned materials: <n> lines"); the BOM window now draws the
  // purchase list's own: "<n> of <m> lines linked" and "Incomplete total, <n> lines not linked" (bom.js
  // incompleteWords). The Assign window's count above stands for the old window, read only until T-CC2b (F14).
  const panel = readFileSync(new URL('../src/components/BomPanel.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(panel, /assignCount\(buildAssignLines/);
  assert.match(panel, /data-bom-link-count=\{String\(linkedLines\)\}[\s\S]{0,300}`\$\{linkedLines\} of \$\{allLines\} lines linked`/);
  assert.match(panel, /notLinked > 0 \? `, \$\{incompleteWords\(notLinked\)\}` : ''/);
});
