// ─── The Output menu (turn 6, CLAUDE.md F1) ───
//
// The point of this file is not that a menu has entries. It is that turn 6
// MOVED three exports that already worked, and a move is exactly the change
// that leaves a dead second copy behind: File ▸ Export still there, still
// wired, quietly diverging. So the check is on both ends — every export is
// reachable from Output, and TopBar carries no other route to it.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as outputMenu from '../src/lib/outputMenu.js';
import { buildOutputMenu } from '../src/lib/outputMenu.js';

const TOPBAR = new URL('../src/components/TopBar.jsx', import.meta.url).pathname;

/** Every non-divider entry, flattened through the submenus. */
function entries(menu) {
  const out = [];
  const walk = (items, path) => {
    for (const item of items || []) {
      if (item.divider) continue;
      const here = [...path, item.label];
      if (item.items) walk(item.items, here);
      else out.push({ ...item, path: here.join(' ▸ ') });
    }
  };
  walk(menu.items, []);
  return out;
}

// REWRITTEN BY T-CC1b F5 (law 5, OUTPUT IS WHAT LEAVES FOR THE WORKSHOP): the owner, 01.11.2026:
// *"na dole Drawings dobre, ale myli sie z Output; Output zmniejszyc"*; *"Output tylko: cutting list,
// BOM PDF, labels 21 i 44"*. The render, the drawings, the CNC files, the BOM window and Spraying
// leave by their own doors (test/turn-cc1b-f05-output.test.js finds each).
test('Output carries the four CLAUDE.md T-CC1b F5 names, in that order, and nothing else', () => {
  const menu = buildOutputMenu({});
  assert.equal(menu.label, 'Output');
  assert.deepEqual(menu.items.map((i) => i.label), [
    'Cutting list CSV',
    'BOM PDF',
    // Chat fix 17.10.2026 and T79 F18: one entry per paper.
    'Part labels · 21 per sheet (Avery L7160)',
    'Part labels · 44 per sheet',
  ]);
  assert.equal(menu.items.find((i) => i.label === 'BOM PDF').hint, 'The materials list of the job as a PDF: parts, materials, hardware');
  assert.equal(outputMenu.DRAWING_KINDS, undefined, 'the Drawings submenu is deleted with its kinds');
});

test('every entry runs the handler it was given, and only that one', () => {
  const fired = [];
  const menu = buildOutputMenu({
    onExportCsv: () => fired.push('csv'),
    onExportPdf: () => fired.push('pdf'),
    onExportLabels: ({ sheet }) => fired.push(`labels:${sheet}`),
  });
  for (const item of entries(menu)) item.run?.();
  assert.deepEqual(fired, ['csv', 'pdf', 'labels:L7160', 'labels:generic44']);
});

test('the old export places are GONE from the top bar, not left as a second route', () => {
  const src = readFileSync(TOPBAR, 'utf8');

  // File used to carry an Export submenu with the same three items in it.
  // Two menus that both export the cutting list is two things to keep in step.
  assert.ok(!/label: 'Export'/.test(src), "File ▸ Export is gone — Output is the one place");
  for (const label of ['Cutting list CSV', 'BOM PDF']) {
    assert.equal(
      src.split(label).length - 1, 0,
      `${label} is spelled in lib/outputMenu.js only, never a second time in TopBar`,
    );
  }

  // …and File is back to being about the project.
  const file = src.slice(src.indexOf("label: 'File'"), src.indexOf('buildOutputMenu({'));
  for (const label of ['New project…', 'Open…', 'Save', 'Save as…', 'Close project']) {
    assert.ok(file.includes(label), `File keeps ${label}`);
  }
});
