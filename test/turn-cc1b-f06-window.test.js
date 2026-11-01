/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F6 . ONE WINDOW, ONE EXPORT. The owner, 01.11.2026: *"usunac card 3D view i front only"* and *"usunac
// przyciski all units i drawing set pdf, tylko export pdf"*. The Drawings window is the set: its sheet list with
// the ticks, Wall DXF (kept, PROPOSED) and Export PDF over the ticked sheets.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickedSheets, wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { bookletDoc } from '../src/lib/drawingExport.js';
import { t81Kitchen, setArgs } from '../scripts/t81-kitchen.mjs';

const MODAL = readFileSync(new URL('../src/components/DrawingModal.jsx', import.meta.url), 'utf8');
/** The markup and the code, without the prose that quotes what was deleted. */
const code = MODAL.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

test('F6 · the window renders no Card (3 views), Front only, All units (PDF), Drawing set (PDF) or Export SVG', () => {
  for (const gone of ['Card (3 views)', 'Front only', 'All units (PDF)', 'Drawing set (PDF)', 'Export SVG']) {
    assert.ok(!code.includes(gone), `"${gone}" is gone`);
  }
  assert.ok(!MODAL.includes('booklet'), 'no booklet anywhere in the file');
  assert.ok(!/save\('svg'\)|save\('pdf'\)|exportDrawingSvg|exportDrawingPdf|exportBookletPdf/.test(code), 'the svg and per-sheet pdf roads are deleted');
  assert.ok(!/KINDS\.preview|'unit-card':|'front-elevation':|data-drawing-kind-tab/.test(code), 'the kinds and the selector row are deleted');
  assert.match(code, /const KINDS = \{\s+walls: \{ title: 'Drawings', view: 'wall-elevation' \},\s+\};/, 'KINDS keeps walls only');
  assert.match(code, /const kind = 'walls';/, 'the kind is the constant');
  assert.match(code, /title=\{KINDS\.walls\.title\}/, 'the window is called Drawings');
  assert.match(code, /width="w-\[880px\]"/, 'the width stays');
});

test('F6 · the footer: Close, Wall DXF, Export PDF (gold); Export PDF disabled with no ticked sheet and binds the ticked', () => {
  const footer = code.slice(code.indexOf('footer={('), code.indexOf(')}\n    >'));
  const labels = [...footer.matchAll(/>\s*([A-Z][A-Za-z ]+)\s*<\/button>/g)].map((m) => m[1].trim());
  assert.deepEqual(labels, ['Close', 'Wall DXF', 'Export PDF']);
  assert.match(footer, /className="cc-btn-gold"\s+data-wall-drawings-pdf="1"/);
  assert.match(footer, /disabled=\{!wallPicked\.length\}[\s\S]*onClick=\{\(\) => save\('walls-pdf'\)\}/);
  assert.match(code, /exportWallDrawingsPdf\(wallPicked\.map\(\(x\) => x\.sheet\)/, 'the set\'s PDF road, the ticked sheets');
  assert.match(code, /type="checkbox"\s+data-wall-sheet-pick=\{page\.name\}/, 'the sheet list keeps its ticks');
});

test('F6 · the road Export PDF calls binds the ticked sheets in the set\'s order', () => {
  t81Kitchen({ inframe: false });
  const set = wallDrawingSheets(setArgs());
  const leftOut = new Set(set.slice(1, 4).map((s) => s.name));
  const picked = pickedSheets(set, (s) => !leftOut.has(s.name));
  assert.equal(picked.length, set.length - 3);
  assert.equal(bookletDoc(picked.map((s) => s.sheet)).getNumberOfPages(), picked.length);
  assert.deepEqual(pickedSheets(set, () => false), [], 'none ticked: nothing to bind, the button is disabled');
});

test('F6 · the help paragraph names the sheets that exist after F8', () => {
  const note = MODAL.slice(MODAL.indexOf('data-wall-note="1"'));
  assert.match(note, /<b> visualisations<\/b> \(the left and the right angle, your own render and the chosen AI picture/);
  assert.match(note, /press <b>Export PDF<\/b>/);
  assert.ok(!/[\u2013\u2014]/.test(note.slice(0, 1600)), 'no em or en dash in the help');
});
