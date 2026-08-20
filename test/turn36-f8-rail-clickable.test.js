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

// ─── RE-PINNED, TURN 42 (CLAUDE.md F1) ─────────────────────────────────────
// T36's fault and T36's fix are both intact: the tube has a handler, the aura
// says so, and the scene hands one down. What changed underneath is the
// ADDRESS. The board the rod used to be keyed on — `RAIL-PART`, 40 mm above
// it — is the shelf the owner refused, and it is not cut any more. So an ALONE
// rod is addressed by its OWN ITEM, and an ASSEMBLY's by the fix shelf it
// rides. Either way `panelId` is populated, which is what T36 was defending:
// `Hardware.jsx`'s one gate is `onEdit && rail.panelId`, and a null there takes
// the double-click AND the aura away.
test('F8 — the rail instance carries the ADDRESS its window is keyed on', () => {
  const r = wardrobe({
    width: 900,
    sections: [{ items: [{ id: 'h1', kind: 'hanger', mount: 'alone', pos_mm: 1400 }] }],
  });
  const { rails } = hardwareInstances(r, P);
  assert.equal(rails.length, 1, 'one rod');
  assert.equal(rails[0].mount, 'alone', 'and it is a rod on its own');
  assert.equal(rails[0].panelId, 'h1', 'addressed by its own item, because there is no board');
  assert.equal(rails[0].itemId, 'h1');
  assert.ok(!r.panels.some((p) => p.part === 'RAIL-PART'), 'and no board is cut for it');

  // An ASSEMBLY still names the FIX SHELF it rides — T37's own answer, which
  // this turn does not touch.
  const assembly = wardrobe({
    width: 900,
    sections: [{
      items: [
        { id: 's1', kind: 'shelf', variant: 'fixed', pos_mm: 1440 },
        { id: 'h1', kind: 'hanger', mount: 'shelf', shelf_id: 's1' },
      ],
    }],
  });
  const rod = hardwareInstances(assembly, P).rails[0];
  assert.equal(rod.mount, 'shelf');
  const board = assembly.panels.find((p) => p.id === rod.panelId);
  assert.ok(board && board.part === 'SHELF', 'the fix shelf, and it is a shelf');
  assert.equal(elementKind(board), 'shelf');
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
    // T42-F1: every rod still has an ADDRESS — its own item, in a bay with no
    // board over it. A null here is what takes the double-click and the aura
    // away, which is the whole of T36's finding.
    assert.ok(rod.panelId, 'every rod is addressable');
    assert.equal(rod.mount, 'alone', 'a bay rod with no shelf named is on its own');
    assert.equal(rod.panelId, rod.itemId, 'and it answers to its own item');
    assert.ok(!r.panels.some((p) => p.id === rod.panelId), 'which is NOT a panel — there is no board');
  }
  assert.equal(new Set(rails.map((x) => x.panelId)).size, rails.length, 'and no two share one');
  assert.ok(!r.panels.some((p) => p.part === 'RAIL-PART'), 'no column cuts a partitioner either');
});

test('F8 — the TUBE has the handler, and it is the shelves\' own grammar', () => {
  const hw = src('3d/Hardware.jsx');
  const at = hw.indexOf('function Rail({');
  assert.notEqual(at, -1);
  const rail = hw.slice(at, hw.indexOf('\nexport function FrontHandle', at));
  // The gesture: `to(panelId, { x, y })` — the click point travels with the
  // request, so the window lands where the eye already is (turn 11).
  // T42-F1: `to` is `onEditRail` for a rod on its own and `onEditElement` for
  // an assembly, chosen on the ENGINE's published `mount`.
  assert.match(rail, /to\(rail\.panelId, \{ x: e\.clientX, y: e\.clientY \}\)/);
  assert.match(rail, /const alone = rail\.mount === 'alone';/);
  assert.match(rail, /const to = alone \? onEditRail : onEdit;/);
  assert.match(rail, /onDoubleClick=\{open \|\| undefined\}/);
  // …and it does not also drag the cabinet behind it.
  assert.match(rail, /e\.stopPropagation\(\);/);
  // A rod with no address is not clickable — no handler is invented for it.
  assert.match(rail, /const open = to && rail\.panelId/);
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
  // T42-F1: …and the rod's own two verbs travel the same road.
  assert.match(src('3d/Hardware.jsx'), /onEditRail=\{onEditRail\}/);
  assert.match(src('3d/Hardware.jsx'), /onDragRail=\{onDragRail\}/);
  // UnitView hands `Hardware` the same callback it hands its own panels — the
  // T35 hole was exactly this: the modal existed and nothing reached it.
  const view = src('3d/UnitView.jsx');
  const at = view.indexOf('<Hardware\n');
  assert.notEqual(at, -1, 'the mount, not a mention of it in prose');
  assert.match(view.slice(at, at + 900), /onEditElement=\{onEditElement\}/);
});

test('F8 — the window it opens is a real one, and it is the right one of the two', () => {
  // T42-F1: TWO kinds, two windows, and the scene routes on the engine's own
  // published `mount`. An ASSEMBLY opens the fix shelf's element window — T37's
  // answer, untouched. An ALONE rod opens its own, because there is no board
  // over it to borrow one from.
  assert.match(src('3d/Scene.jsx'), /onEditElement=\{\(panelId, at\) => openModal\('element', \{/);
  assert.match(src('3d/Scene.jsx'), /onEditRail=\{\(railItemId, at\) => openModal\('rail', \{/);
  // …and `rail` is a window the shell actually knows about, placed beside its
  // subject like every other 'object' modal (rule 15).
  assert.match(src('lib/modalLayer.js'), /rail: \{ about: 'object', label: 'Hanging rail' \}/);
  assert.match(src('pages/ConfiguratorPage.jsx'), /modal === 'rail' && <RailModal \/>/);
  // The height is in it, and it commits through the ONE store action.
  assert.match(src('components/RailModal.jsx'), /Height above support/);
  assert.match(src('components/RailModal.jsx'), /setRailHeight\(unit\.id, item\.id, v\)/);
});
