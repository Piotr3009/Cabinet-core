import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import { elementKind } from '../src/engine/elements.js';
import { auraLabel } from '../src/engine/hoverAura.js';

// ─── TURN 36 (CLAUDE.md F8): THE RAIL IS CLICKABLE ──────────────────────────
//
// The owner, eye-testing T35-F1: *"nie ma możliwości 2 kliku i edycji tego
// drążka."* T35 shipped the rail's DATUM and the rail's MODAL and left the
// `<Rail>` tube with NO handler — nothing to click. No screenshot existed
// that would have caught it, which is why iron rule 6 exists this turn.

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

const wardrobe = (over = {}) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P), unit_num: '01', rail: true, ...over,
}, P);

test('F8 — the rail instance carries the PANEL the modal is keyed on', () => {
  const r = wardrobe({ width: 900 });
  const { rails } = hardwareInstances(r, P);
  assert.equal(rails.length, 1, 'one rod');
  assert.equal(rails[0].panelId, 'RAIL-PART');
  // …and that panel really is the one the app answers as a hanger rail.
  const board = r.panels.find((p) => p.id === 'RAIL-PART');
  assert.ok(board, 'the board 40 mm over the rod is cut');
  assert.equal(elementKind(board), 'hanger-rail');
});

test('F8 — a COLUMN rail names its own column\'s board', () => {
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: '01',
    width: 1600,
    sections: [{
      items: [
        { id: 'p1', kind: 'partition', x_mm: 800 },
        { id: 'h1', kind: 'hanger', zone: 0 },
        { id: 'h2', kind: 'hanger', zone: 1 },
      ],
    }],
  }, P);
  const { rails } = hardwareInstances(r, P);
  assert.ok(rails.length >= 2, `two columns, two rods (${rails.length})`);
  for (const rod of rails) {
    assert.ok(rod.panelId, 'every rod names a board');
    assert.ok(r.panels.some((p) => p.id === rod.panelId), `${rod.panelId} is a real panel`);
    assert.equal(elementKind(r.panels.find((p) => p.id === rod.panelId)), 'hanger-rail');
  }
  assert.equal(new Set(rails.map((x) => x.panelId)).size, rails.length, 'and no two share one');
});

test('F8 — the TUBE has the handler, and it is the shelves\' own grammar', () => {
  const hw = src('3d/Hardware.jsx');
  const at = hw.indexOf('function Rail({');
  assert.notEqual(at, -1);
  const rail = hw.slice(at, hw.indexOf('\nexport function FrontHandle', at));
  // The gesture: `onEditElement(panelId, { x, y })` — the click point travels
  // with the request, so the modal lands where the eye already is (turn 11).
  assert.match(rail, /onEdit\(rail\.panelId, \{ x: e\.clientX, y: e\.clientY \}\)/);
  assert.match(rail, /onDoubleClick=\{open \|\| undefined\}/);
  // …and it does not also drag the cabinet behind it.
  assert.match(rail, /e\.stopPropagation\(\);/);
  // A rod with no board named is not clickable — no handler is invented for it.
  assert.match(rail, /const open = onEdit && rail\.panelId/);
});

test('F8 — the HOVER AURA says the rod is live before the hand commits', () => {
  const hw = src('3d/Hardware.jsx');
  const at = hw.indexOf('function Rail({');
  const rail = hw.slice(at, hw.indexOf('\nexport function FrontHandle', at));
  assert.match(rail, /<HoverAura/);
  assert.match(rail, /subject=\{\{ kind: 'rail', id: rail\.panelId, mm: rail\.y \}\}/);
  // The same component the hinge and the handle wear — not a second one.
  assert.match(hw, /import HoverAura from '\.\/HoverAura\.jsx'/);
  // …and it has a number to show.
  assert.equal(auraLabel({ kind: 'rail', mm: 1850 }, P), '1850 up');
  assert.equal(auraLabel({ kind: 'rail', mm: 'nonsense' }, P), null);
});

test('F8 — the handler is WIRED: the scene actually hands one down', () => {
  assert.match(src('3d/Hardware.jsx'), /onEditElement = null,/);
  assert.match(src('3d/Hardware.jsx'), /onEdit=\{onEditElement\}/);
  // UnitView hands `Hardware` the same callback it hands its own panels — the
  // T35 hole was exactly this: the modal existed and nothing reached it.
  const view = src('3d/UnitView.jsx');
  const at = view.indexOf('<Hardware\n');
  assert.notEqual(at, -1, 'the mount, not a mention of it in prose');
  assert.match(view.slice(at, at + 900), /onEditElement=\{onEditElement\}/);
});

test('F8 — the modal it opens is the one that already exists', () => {
  // No second window: `RAIL-PART` has answered `hanger-rail` since T35, the
  // field list for that kind carries the height, and Scene turns the callback
  // into `openModal('element', …)`.
  assert.match(src('engine/elements.js'), /case 'RAIL-PART': return 'hanger-rail';/);
  assert.match(src('engine/elements.js'), /'hanger-rail': \['rail-height'/);
  assert.match(src('components/ElementProperties.jsx'), /label="Height above support"/);
  assert.match(src('3d/Scene.jsx'), /onEditElement=\{\(panelId, at\) => openModal\('element', \{/);
});
