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

import { buildOutputMenu, DRAWING_KINDS } from '../src/lib/outputMenu.js';

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

test('Output carries the three groups CLAUDE.md asks for, in that order', () => {
  const menu = buildOutputMenu({});
  assert.equal(menu.label, 'Output');

  const labels = menu.items.filter((i) => !i.divider).map((i) => i.label);
  assert.deepEqual(labels, [
    'Render…',
    'Drawings',
    'CNC / DXF',
    'Cutting list CSV',
    'BOM PDF',
    'Bill of materials…',
  ]);

  // The groups are separated, not run together: a joiner scanning the menu
  // must see "picture / drawing / machine files", not one list of six.
  assert.equal(menu.items.filter((i) => i.divider).length, 3);
});

test('Drawings offers one live view and holds the place for two more', () => {
  const drawings = buildOutputMenu({}).items.find((i) => i.label === 'Drawings');
  assert.equal(drawings.items.length, DRAWING_KINDS.length);

  const live = drawings.items.filter((i) => !i.disabled);
  assert.equal(live.length, 1, 'turn 6 is a style probe: ONE view, done properly');
  assert.equal(live[0].label, 'Front elevation (preview)');

  for (const soon of drawings.items.filter((i) => i.disabled)) {
    assert.equal(soon.soon, true, `${soon.label} is disabled and must say why`);
    assert.equal(soon.run, undefined, 'a disabled entry carries no action to fire by accident');
  }
});

test('every entry runs the handler it was given — and only that one', () => {
  const fired = [];
  const menu = buildOutputMenu({
    onRender: () => fired.push('render'),
    onDrawing: (kind) => fired.push(`drawing:${kind}`),
    onExportDxf: () => fired.push('dxf'),
    onExportCsv: () => fired.push('csv'),
    onExportPdf: () => fired.push('pdf'),
    onOpenBom: () => fired.push('bom'),
  });

  for (const item of entries(menu)) item.run?.();
  assert.deepEqual(fired, ['render', 'drawing:front-elevation', 'dxf', 'csv', 'pdf', 'bom']);
});

test('the old export places are GONE from the top bar, not left as a second route', () => {
  const src = readFileSync(TOPBAR, 'utf8');

  // File used to carry an Export submenu with the same three items in it.
  // Two menus that both export the cutting list is two things to keep in step.
  assert.ok(!/label: 'Export'/.test(src), "File ▸ Export is gone — Output is the one place");
  for (const label of ['Cutting list CSV', 'BOM PDF', 'CNC / DXF']) {
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
