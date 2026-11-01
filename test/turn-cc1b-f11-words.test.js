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
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { buildBom, purchaseBom } from '../src/engine/bom.js';
import { expandAssignments, normalizeAssignments } from '../src/engine/partRegistry.js';
import {
  exportProjectPdf, buildPurchaseBomCsvText, notAssignedWords, NOT_ASSIGNED,
} from '../src/lib/exporters.js';
import { hardwareKey } from '../src/stores/materialAssignmentStore.js';
import { STOCK_MATERIALS, stock } from './fixtures/jc-stock.js';

const e = (id, params) => ({ unit: { id, type: params.type, params }, result: computeCabinet(params, P) });
const JOB = [
  e('u1', { type: 'BUD', width: 600, height: 720, depth: 560, shelves: 1, unit_num: 'B1' }),
  e('u2', { type: 'BUDTALL', width: 600, height: 2100, depth: 560, unit_num: 'T1' }),
];
const BOM = buildBom(JOB, { profile: P });
const HINGES = BOM.hardware.filter((h) => h.role === 'hinges');

/** Every board role and every hardware line assigned, but the lines `leave` names. */
function assigned({ leave = [] } = {}) {
  const base = {};
  for (const r of BOM.roles) base[r.role] = { material_id: stock('Egger W980').id };
  const hardware = {};
  for (const h of BOM.hardware) {
    const key = hardwareKey(h);
    hardware[key] = { material_id: leave.includes(key) ? '' : stock(h.role === 'hinges' ? 'Blum Clip top Blumotion' : 'Adjustable leg').id };
  }
  return { ...expandAssignments(normalizeAssignments({ ...base })), ...base, hardware };
}

const pageTexts = (doc) => doc.internal.pages.slice(1).map((pg) => pg.join('\n')).join('\n');
const count = (hay, needle) => hay.split(needle).length - 1;
function pdfText(assignments) {
  const was = process.cwd();
  const dir = mkdtempSync(join(tmpdir(), 'cc1b-f11-'));
  process.chdir(dir);
  try {
    return pageTexts(exportProjectPdf({
      entries: JOB, project: { name: 'Words job', design: {} }, capture: null, assignments, materials: STOCK_MATERIALS,
    }));
  } finally { process.chdir(was); rmSync(dir, { recursive: true, force: true }); }
}

test('F11.1 one unassigned hinge line: the words twice (the line and the cover), and no total as a price', () => {
  assert.equal(HINGES.length, 2, 'the job buys two hinge specs');
  const txt = pdfText(assigned({ leave: [hardwareKey(HINGES[0])] }));
  assert.equal(count(txt, NOT_ASSIGNED), 2, txt);
  assert.ok(txt.includes('Not assigned materials: 1 line. Assign them in Cabinet Core, Materials, before ordering.'));
  assert.ok(!txt.includes('£'), 'no total is printed as a price');
  assert.ok(txt.includes('Total: not a price'));
});

test('F11.1 the same job fully assigned prints the total and not the words', () => {
  const txt = pdfText(assigned());
  assert.equal(count(txt, NOT_ASSIGNED), 0);
  assert.match(txt, /Total: £\d+\.\d\d/);
});

test('F11.1 the purchase list CSV keeps its WARNING row, with the same words', () => {
  const bom = purchaseBom(JOB, { assignments: {}, materials: STOCK_MATERIALS, profile: P });
  assert.ok(bom.totals.unassigned > 0);
  const csv = buildPurchaseBomCsvText(bom, {});
  const warning = csv.split('\n').find((l) => l.startsWith('WARNING,'));
  assert.ok(warning.includes(notAssignedWords(bom.totals.unassigned)), warning);
  assert.match(csv, /TOTAL \(INCOMPLETE\)/);
});

// INT (F11.1, "the live BOM window shows the same header count as F10"): the window draws the Assign window's own
// count, built by the same two functions; the count is asserted here and the window is shown to bind it.
test('F11.1 the live BOM window carries the count: the Assign window\'s for the old window, the links\' in the BOM (T-CC2a F10.4)', async () => {
  const { buildAssignLines, assignCount } = await import('../src/stores/materialAssignmentStore.js');
  const { readFileSync } = await import('node:fs');
  const data = assigned({ leave: [hardwareKey(HINGES[0])] });
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
