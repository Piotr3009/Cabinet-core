// ─── TURN 74 · F6 · THE SECOND SHOE DRAWER: SET BY ITS MOUNTING HEIGHT ─────
//
// The owner, 23.09.2026 (list point 5):
//
//   *"DRUGA SZUFLADA NA BUTY (niskie i wysokie buty). Regulacja = WYSOKOŚĆ
//   MONTAŻU, nie wysokość szuflady. Pierwsza szuflada ZAWSZE na dnie
//   (ustalone, bez zmian). Druga przesuwana góra/dół, program pokazuje
//   odległość między szufladami."*
//
// The probe (`verify/t74/f06-probe.md`, committed before the change): a second
// `addShoeDrawer` was refused in silence, every drawer stood where its INDEX
// put it (stacked tight), only the top drawer of a stack got its ramp, and no
// drawer could be dragged or had a clickable figure. These assertions are the
// probe's rows, turned.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { secondShoeItem } from '../src/engine/watchDrawer.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const S = () => useProjectStore.getState();

/** The probe's wardrobe: 1000 x 2150 x 568, in a 4 x 3 m room. */
function aWardrobe() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  return S().addUnit('WARDROBE', { params: { width: 1000, height: 2150, depth: 568 } }).id;
}
const drawersOf = (id) => S().units.find((u) => u.id === id).params.sections[0].items
  .filter((i) => i.kind === 'drawer').sort((a, b) => a.index - b.index);
const front = (id, n) => S().unitResult(id).panels.find((p) => p.part === 'DRAWER-FRONT' && p.meta?.drawer === n);
const ramp = (id, n) => S().unitResult(id).panels.find((p) => p.part === 'SHOE-RAMP' && p.meta?.drawer === n);

function twoShoeDrawers() {
  const id = aWardrobe();
  assert.ok(S().addShoeDrawer(id), 'the first shoe drawer was refused');
  assert.ok(S().addShoeDrawer(id), 'the SECOND shoe drawer was refused');
  const [first, second] = drawersOf(id);
  return { id, first, second };
}

test('T74 F6 · a SECOND shoe drawer is added on top of the first; a THIRD is refused', () => {
  const { id, first, second } = twoShoeDrawers();
  assert.equal(first.variant, 'shoe');
  assert.equal(second.variant, 'shoe');
  assert.equal(second.index, first.index + 1, 'the second does not stand on the first');
  assert.equal(S().addShoeDrawer(id), null, 'a third shoe drawer was added');
  assert.equal(drawersOf(id).length, 2);
});

test('T74 F6 · a shoe drawer that is not the top of its stack takes no second', () => {
  const id = aWardrobe();
  assert.ok(S().addShoeDrawer(id));
  // A plain drawer over the shoe drawer: the shoe drawer is no longer the top.
  assert.ok(S().addItem(id, { kind: 'drawer', index: 2 }), 'the plain drawer was not added');
  const stack = drawersOf(id);
  assert.deepEqual(stack.map((i) => `${i.index}:${i.variant || 'plain'}`), ['1:shoe', '2:plain']);
  assert.equal(S().addShoeDrawer(id), null, 'a second shoe drawer jumped over a plain drawer');
});

test('T74 F6 · the FIRST shoe drawer stays on the bottom, unchanged, and is not movable', () => {
  const alone = aWardrobe();
  S().addShoeDrawer(alone);
  const before = front(alone, 1).box;
  const { id, first } = twoShoeDrawers();
  assert.deepEqual(front(id, 1).box, before, 'the first shoe drawer moved when the second arrived');
  assert.equal(S().drawerMountBounds(id, first.id), null, 'the first shoe drawer has a mounting height');
  assert.equal(S().setDrawerMount(id, first.id, 600), null, 'the first shoe drawer was moved');
  assert.deepEqual(front(id, 1).box, before);
});

test('T74 F6 · the second arrives stacked tight, and its MOUNTING HEIGHT moves it up and down', () => {
  const { id, second } = twoShoeDrawers();
  const f1 = front(id, 1).box;
  const f2 = front(id, 2).box;
  assert.ok(Math.abs(f2.y - (f1.y + f1.h) - 3) < 1e-6, 'the second does not arrive tight on the first');
  const said = S().setDrawerMount(id, second.id, 450);
  assert.deepEqual(said, { pos: 450, min: said.min, max: said.max, clamped: false });
  assert.equal(front(id, 2).box.y, 450, 'the mounting height is not where the front stands');
  // Its own height is not what moved.
  assert.equal(front(id, 2).box.h, f2.h, 'the second drawer changed its own height');
  assert.deepEqual(front(id, 1).box, f1, 'the first drawer moved');
  // The box and its ramp go with the front.
  const box = S().unitResult(id).panels.filter((p) => p.role === 'drawer_box' && p.meta?.drawer === 2);
  assert.ok(box.length && box.every((p) => p.box.y >= 450 - 1), 'the second box stayed behind');
});

test('T74 F6 · ONE clamp: never below tight on the first, never above what the carcass lets it stand', () => {
  const { id, second } = twoShoeDrawers();
  const f1 = front(id, 1).box;
  const { min, max } = S().drawerMountBounds(id, second.id);
  assert.equal(min, f1.y + f1.h + 3, 'the floor of the clamp is not tight on the first drawer');
  const P = S().unitResult(id);
  assert.ok(max > min && max < 2150, `max ${max}`);
  const low = S().setDrawerMount(id, second.id, 10);
  assert.equal(low.pos, min);
  assert.equal(low.clamped, true);
  assert.equal(front(id, 2).box.y, min);
  const high = S().setDrawerMount(id, second.id, 99999);
  assert.equal(high.pos, max);
  assert.equal(high.clamped, true);
  // At its highest the stack still fits: no drawer is dropped.
  assert.ok(!(S().unitResult(id).warnings || []).some((w) => w.code === 'DRAWERS_TOO_TALL'),
    'the clamp let the drawer stand where the engine drops it');
  assert.ok(front(id, 2), 'the drawer vanished at its highest');
  assert.ok(P);
});

test('T74 F6 · the audit: the clamp carries the drawers ABOVE, and a count change keeps the mounting height', () => {
  const { id, second } = twoShoeDrawers();
  const alone = S().drawerMountBounds(id, second.id).max;
  S().setDrawerMount(id, second.id, 99999);
  assert.equal(drawersOf(id)[1].pos_mm, alone);
  // A plain drawer put on top of the raised one rides on it: the raised one
  // comes down so the stack still fits, and no drawer is dropped.
  S().addItem(id, { kind: 'drawer', index: 3, mount: 'overlay', height_mm: 200 });
  const { max } = S().drawerMountBounds(id, second.id);
  assert.equal(max, alone - 3 - 200, 'the clamp forgot the drawer riding on the second');
  assert.equal(drawersOf(id)[1].pos_mm, max, 'the raised drawer was not brought back inside its clamp');
  assert.ok(!(S().unitResult(id).warnings || []).some((w) => w.code === 'DRAWERS_TOO_TALL'),
    'the engine dropped every drawer');
  assert.equal(S().unitResult(id).panels.filter((p) => p.part === 'DRAWER-FRONT').length, 3);
  // The count goes back to two: the second keeps its mounting height (the
  // audit: `addDrawers` rebuilt the stack without it and stood it tight).
  S().addDrawers(id, 2, 'overlay');
  assert.equal(drawersOf(id).length, 2);
  assert.equal(drawersOf(id)[1].pos_mm, max);
  assert.equal(front(id, 2).box.y, max);
});

test('T74 F6 · BOTH shoe drawers are cut with their ramps; the lower one\'s headroom is the upper box', () => {
  const { id, second } = twoShoeDrawers();
  S().setDrawerMount(id, second.id, 600);
  assert.ok(ramp(id, 1), 'the first shoe drawer lost its ramp under the second');
  assert.ok(ramp(id, 2), 'the second shoe drawer has no ramp');
  const r = S().unitResult(id);
  assert.ok(!(r.warnings || []).some((w) => w.code === 'shoe_insert_refused' || /not the top/.test(w.message || '')),
    'a shoe drawer refused its insert');
});

test('T74 F6 · the kit\'s law stands for everything else: a PLAIN drawer over a shoe drawer still refuses the ramp', () => {
  const src = uncomment(read('src/engine/cabinet.js'));
  assert.match(src, /const twin = index \+ 1 === topIndex && shoeInsertOn\(shoeItemAt\(topIndex, zone\)\);/);
  assert.match(src, /if \(index !== topIndex && !twin\) \{/);
});

test('T74 F6 · a stack that states no mounting height is byte for byte what it was', () => {
  const src = uncomment(read('src/engine/cabinet.js'));
  assert.match(src, /function stackOffsets\(heights, items, gap, G\)/);
  assert.match(src, /const at = i > 0 && Number\.isFinite\(pos\) \? Math\.max\(acc, pos - G\) : acc;/);
  assert.match(src, /top: raised && n \? offsets\[n - 1\] \+ heights\[n - 1\] : null/);
  assert.match(src, /drawerTotalH = drawerStack\.top\s*\?\? drawerHeights\.reduce/);
  assert.match(src, /const totalH = colStack\.top \?\? heights\.reduce/);
  // A saved drawer without `pos_mm` gains none on the way in.
  assert.match(src, /\.\.\.\(Number\.isFinite\(Number\(i\.pos_mm\)\) \? \{ pos_mm: Number\(i\.pos_mm\) \} : \{\}\)/);
});

test('T74 F6 · ONE question names the second shoe drawer, asked by the drag, the figure, the menu and the store', () => {
  const { id, first, second } = twoShoeDrawers();
  const unit = S().units.find((u) => u.id === id);
  assert.equal(secondShoeItem(unit, first.index, null), null);
  assert.equal(secondShoeItem(unit, second.index, null)?.id, second.id);
  for (const rel of ['src/3d/UnitView.jsx', 'src/3d/SpacingChain.jsx', 'src/components/ElementProperties.jsx',
    'src/retail/design/detail/ElementProperties.jsx', 'src/stores/projectStore.js']) {
    assert.match(uncomment(read(rel)), /secondShoeItem\(/, `${rel} asks its own question`);
  }
});

test('T74 F6 · the scene shows the DISTANCE between the drawers, and typing it writes the mounting height', () => {
  const src = uncomment(read('src/3d/SpacingChain.jsx'));
  assert.match(src, /if \(panel\.part === 'DRAWER-FRONT' && Number\(panel\.meta\?\.drawer\) > 1\) \{/);
  assert.match(src, /key: 'drawer-gap',/);
  assert.match(src, /const from = below\.box\.y \+ below\.box\.h;\s*const to = panel\.box\.y;/);
  assert.match(src, /commit: \(want\) => from \+ want,/);
  assert.match(src, /write: 'drawer-mount',/);
  assert.match(src, /if \(chain\.write === 'drawer-mount'\) setDrawerMount\(unit\.id, itemId, next\);/);
});

test('T74 F6 · the typed distance and the setter agree: distance d puts the front at top-of-first + d', () => {
  const { id, second } = twoShoeDrawers();
  const f1 = front(id, 1).box;
  const d = 300;
  S().setDrawerMount(id, second.id, f1.y + f1.h + d);
  const f2 = front(id, 2).box;
  assert.equal(f2.y - (f1.y + f1.h), d);
});

test('T74 F6 · the DRAG goes through the same setter (one clamp for both gestures)', () => {
  const view = uncomment(read('src/3d/UnitView.jsx'));
  assert.match(view, /const shoe = secondShoeOf\(p\);\s*if \(shoe\) \{ startDrawerDrag\(e, shoe\.itemId, shoe\.pos\); return; \}/);
  assert.match(view, /onMoveDrawer\(itemId, \(pt\.y - originY\) \/ MM \+ grabDelta\);/);
  const scene = uncomment(read('src/3d/Scene.jsx'));
  assert.match(scene, /onMoveDrawer=\{\(itemId, posMm\) => setDrawerMount\(unit\.id, itemId, posMm\)\}/);
});

test('T74 F6 · its own height is not a control: the menu shows it, and does not edit it', () => {
  for (const rel of ['src/components/ElementProperties.jsx', 'src/retail/design/detail/ElementProperties.jsx']) {
    const src = uncomment(read(rel));
    assert.match(src, /if \(!Number\.isFinite\(n\) \|\| n < 1 \|\| secondShoeItem\(unit, n, panel\.meta\?\.zone \?\? null\)\) \{/,
      `${rel} still offers the second shoe drawer's height`);
  }
});
