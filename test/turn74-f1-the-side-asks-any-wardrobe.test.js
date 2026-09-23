// ─── TURN 74 · F1 · THE SIDE ASKS: ANY WARDROBE, A SMALL MODAL AT THE CLICK ─
//
// The owner, 23.09.2026, retesting T73 F2:
//
//   *"po naciśnięciu na bok szafy jak nie ma panelu powinno się pokazać to
//   pytanie, a nie pierwsza czy druga szafa, po prostu po naciśnięciu boku
//   szafy, a jak nic nie naciśniesz i klikniesz na coś innego to znika mały
//   modal jak wymiary lub j pull hands."*
//
// Change 1: ANY wardrobe side (BUL / BUR) of ANY wardrobe with NO end panel on
// it asks; the flush-neighbour exclusion goes; top boxes stay out.
// Change 2: the question is a SMALL ANCHORED MODAL at the click point, the
// same kind of window the dimension label and the J run open. A click anywhere
// else closes it and adds nothing; the right-hand panel does not open.
//
// The REAL click (a mouse on the side's projected point) is the walk's:
// `scripts/t74-walk.mjs f1`. This file holds the law and the wiring.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { setWardrobeEndPanelAuto } from '../src/engine/endPanelAuto.js';
import { MODAL_KINDS, withModalAnchor } from '../src/lib/modalLayer.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import * as A from '../src/retail/design/adapter.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();

function twoFlushWardrobes() {
  setWardrobeEndPanelAuto(true);
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const a = A.addFirstWardrobe();
  const r = A.addBesidePlus({ unitId: a, side: 'right' });
  assert.equal(r.ok, true, r.said);
  U().closeModal();
  return { a, b: r.id };
}
const panelOf = (id, part) => S().unitResult(id).panels.find((p) => p.part === part);
const hasPanel = (id, side) => (S().units.find((u) => u.id === id).params.end_panels || [])
  .some((ep) => (ep.side === 'R' ? 'R' : 'L') === side);

test('T74 F1 · every side of every wardrobe with no end panel asks: first or second, flush or not', () => {
  const { a, b } = twoFlushWardrobes();
  for (const id of [a, b]) {
    for (const [part, side] of [['BUL', 'L'], ['BUR', 'R']]) {
      const ask = A.sideAskFor(id, panelOf(id, part));
      if (hasPanel(id, side)) assert.equal(ask, null, `${id} ${part} carries a panel and still asked`);
      else assert.deepEqual(ask, { side }, `${id} ${part} has no panel and did not ask`);
    }
  }
  // The two sides that meet between them are bare, and both ask now.
  assert.deepEqual(A.sideAskFor(a, panelOf(a, 'BUR')), { side: 'R' });
  assert.deepEqual(A.sideAskFor(b, panelOf(b, 'BUL')), { side: 'L' });
});

test('T74 F1 · only a side asks, and top boxes stay out', () => {
  const { a } = twoFlushWardrobes();
  for (const part of ['TOP', 'BOTTOM', 'BACK']) {
    const p = panelOf(a, part);
    if (p) assert.equal(A.sideAskFor(a, p), null, `${part} asked`);
  }
  A.addTopBox(a);
  const topId = S().units.find((u) => u.params?.rides_on === a)?.id;
  assert.ok(topId, 'no top box to ask of');
  for (const part of ['BUL', 'BUR']) {
    assert.equal(A.sideAskFor(topId, panelOf(topId, part)), null, `the top box's ${part} asked`);
  }
});

test('T74 F1 · the click opens the small question AT the click point, and not the dock', () => {
  const { a } = twoFlushWardrobes();
  U().clearElement?.();
  const side = panelOf(a, 'BUR');
  assert.equal(A.askSide(a, side.id, { x: 612, y: 344 }), true);
  assert.equal(U().modal, 'add-panel');
  const args = U().modalArgs;
  assert.equal(args.unitId, a);
  assert.equal(args.side, 'R');
  // The shell's own anchor, made from the pointer (`withModalAnchor`).
  assert.equal(args.anchor?.x, 612);
  assert.equal(args.anchor?.y, 344);
  // The right-hand panel is not opened: no element selection, no dock name.
  assert.equal(A.resolveSelection(U().selectedElement), null);
  assert.match(read('src/retail/design/detail/docked.jsx'),
    /export const DOCK_MODALS = Object\.freeze\(\['element', 'rail', 'watch-layout'\]\);/,
    'the question became a dock window');
  A.closeEditor();
});

test('T74 F1 · a click elsewhere closes it and adds nothing (the anchored shell\'s own outside click)', () => {
  const { a } = twoFlushWardrobes();
  const before = JSON.stringify(S().units.map((u) => u.params.end_panels || []));
  A.askSide(a, panelOf(a, 'BUR').id, { x: 10, y: 10 });
  // What the shell's outside pointer-down calls is `onClose`, and the question
  // passes the adapter's close there: the modal goes, nothing is added.
  const win = uncomment(read('src/retail/design/detail/AddPanelAsk.jsx'));
  assert.match(win, /onClose=\{A\.closeEditor\}/);
  assert.match(win, /anchor=\{args\?\.anchor \|\| null\}/);
  assert.match(uncomment(read('src/retail/design/room/Modal.jsx')), /onPointerDown=\{sticky \? undefined : close\}/,
    'the anchored shell no longer closes on a click outside');
  A.closeEditor();
  assert.equal(U().modal ?? null, null);
  assert.equal(JSON.stringify(S().units.map((u) => u.params.end_panels || [])), before);
});

test('T74 F1 · YES adds the panel by hand, closes the question and opens the panel\'s own menu', () => {
  const { a } = twoFlushWardrobes();
  A.askSide(a, panelOf(a, 'BUL').id, { x: 100, y: 100 });
  const res = A.addEndPanelFromAsk(a, 'L');
  assert.equal(res.ok, true, res.said);
  assert.ok(hasPanel(a, 'L'));
  assert.equal(U().modal ?? null, null, 'the question stayed open');
  assert.deepEqual(U().selectedElement, { unitId: a, elementRef: 'END-L' });
  assert.equal(A.resolveSelection(U().selectedElement)?.menu, 'panel');
  // …and it is the client's own: the automat never takes it back off.
  assert.ok((S().units.find((u) => u.id === a).params.end_panel_asked || []).includes('L'));
});

test('T74 F1 · where there is no room the store refuses, and its sentence shows in the question', () => {
  const { a, b } = twoFlushWardrobes();
  A.askSide(a, panelOf(a, 'BUR').id, { x: 100, y: 100 });
  const res = A.addEndPanelFromAsk(a, 'R');
  assert.equal(res.ok, false);
  const num = S().units.find((u) => u.id === b).params.unit_num;
  assert.match(res.said, new RegExp(`No room for a .* end panel on the right.*${num}`));
  assert.equal(U().modal, 'add-panel', 'a refusal closed the question: the sentence would have nowhere to show');
  const win = uncomment(read('src/retail/design/detail/AddPanelAsk.jsx'));
  assert.match(win, /if \(!res\.ok\) setSaid\(res\.said \|\| ''\);/);
  assert.match(win, /<Said testid="add-panel-said">\{said\}<\/Said>/);
  A.closeEditor();
});

test('T74 F1 · lights mode is left alone: a side click does not end it', () => {
  const { a } = twoFlushWardrobes();
  U().openModal('lighting');
  assert.equal(A.askSide(a, panelOf(a, 'BUL').id, { x: 1, y: 1 }), false);
  assert.equal(U().modal, 'lighting');
  U().closeModal();
});

test('T74 F1 · the wiring: the scene reports a CLICK (not a drag) on BUL / BUR, PRO passes nothing', () => {
  const view = uncomment(read('src/3d/UnitView.jsx'));
  assert.match(view, /onAskSide = null,/);
  assert.match(view, /onClick=\{onAskSide && \(p\.part === 'BUL' \|\| p\.part === 'BUR'\) \? \(e\) => \{/);
  assert.match(view, /if \(Number\(e\.delta\) > 2\) return;/, 'a drag would ask');
  // A click on a door whose ray goes on into a side must not ask.
  assert.match(view, /const first = \(e\.intersections \|\| \[\]\)\.find\(\(h\) => !isOverlay\(h\.eventObject\)\)\?\.eventObject;\s*if \(first && first !== e\.eventObject\) return;/);
  assert.match(view, /function isOverlay\(object\) \{\s*for \(let o = object; o; o = o\.parent\) if \(o\.userData\?\.ccHelper\) return true;/);
  assert.match(view, /onAskSide\(p\.id, \{ x: e\.clientX, y: e\.clientY \}\);/);
  const scene = uncomment(read('src/3d/Scene.jsx'));
  assert.match(scene, /onAskSide = null,/);
  assert.match(scene, /onAskSide=\{onAskSide \? \(panelId, at\) => onAskSide\(unit\.id, panelId, at\) : null\}/);
  assert.match(uncomment(read('src/retail/design/Stage.jsx')),
    /onAskSide=\{\(unitId, panelId, at\) => \{ A\.askSide\(unitId, panelId, at\); \}\}/);
  // PRO's page never passes it.
  assert.ok(!/onAskSide/.test(read('src/pages/ConfiguratorPage.jsx')));
});

test('T74 F1 · the window is drawn at the room\'s level, registered as an object window', () => {
  assert.deepEqual(MODAL_KINDS['add-panel'], { about: 'object', label: 'Add end panel' });
  assert.match(uncomment(read('src/retail/design/Editors.jsx')), /\{is\('add-panel'\) && <AddPanelAsk args=\{modalArgs\} \/>\}/);
  assert.equal(withModalAnchor({ at: { x: 5, y: 6 } }).anchor.x, 5);
  const win = read('src/retail/design/detail/AddPanelAsk.jsx');
  assert.match(win, /name="add-panel"/);
  assert.match(win, /title="ADD END PANEL\?"/);
  assert.match(win, /import Modal from '\.\.\/room\/Modal\.jsx';/, 'not the anchored shell the size window wears');
  assert.ok(!/useUiStore|useProjectStore/.test(uncomment(win)), 'the window reads a store of its own');
});
