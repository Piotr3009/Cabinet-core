// ─── TURN 37 (CLAUDE.md F1): MULTI-SELECT v2 ────────────────────────────────
//
// The owner walked T36-F2 the same day it landed and gave two verdicts:
//
//   *"chodziło mi o półki z 2–3 szaf obok siebie, a nie tylko z jednej"*
//   *"przesuwanie półek up-and-down jest strasznie trudne — zazwyczaj catch
//   jest na ustawianie głębokości, co jest najmniej przydatne. Nie mogę sobie
//   złapać 6 półek z 3 szaf i przesunąć ich razem."*
//
// Three things, and the third is the one T36 got backwards:
//
//   1. THE SET SPANS UNITS. Members carry `{unitId, elementRef}` and a group
//      edit writes to every member THROUGH ITS OWN UNIT's store path.
//   2. EVERY MEMBER KEEPS ITS OWN CLAMP, and the move says how many hit a stop.
//   3. THE DRAG PRIORITY FLIPS. The plain grab moves a shelf UP AND DOWN,
//      selected or not. Depth is still there — same drag, ALT held.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import {
  applyMemberSelection, memberKey, membersOf, parseMember, refsForUnit,
} from '../src/lib/selection.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const store = () => useProjectStore.getState();
const ui = () => useUiStore.getState();

function project() {
  useUiStore.setState({
    selectedUnitId: null, selectedUnitIds: [], selectedElement: null, selectedElements: [],
  });
  store().newProject({ name: 'T37 F1', type: 'wardrobe' });
  store().setRoom(migrateRoom({ corners: rectCorners(9000, 4000) }));
}

const itemsOf = (id) => store().units.find((u) => u.id === id).params.sections[0].items;
const shelvesOf = (id) => itemsOf(id).filter((i) => i.kind === 'shelf')
  .sort((a, b) => a.pos_mm - b.pos_mm);
/** The panel id the SCENE would hand back for one shelf item. */
const panelFor = (unitId, itemId) => store().unitResult(unitId).panels
  .find((p) => p.part === 'SHELF' && p.meta?.itemId === itemId)?.id;

/** Three wardrobes, two shelves each — the owner's own case, minus three. */
function threeWardrobes() {
  project();
  const ids = [];
  for (let i = 0; i < 3; i += 1) {
    const { id } = store().addUnit('WARDROBE');
    store().addShelves(id, 2);
    ids.push(id);
  }
  return ids;
}

// ═══ 1. THE SET SPANS UNITS ═════════════════════════════════════════════════

test('F1 — a member is {unitId, elementRef}, and the key round-trips', () => {
  const k = memberKey('u1', 'SHELF-2');
  assert.deepEqual(parseMember(k), { unitId: 'u1', elementRef: 'SHELF-2' });
  assert.equal(parseMember('nonsense'), null);
  assert.deepEqual(membersOf([memberKey('u1', 'A'), memberKey('u2', 'B'), 'junk']),
    [{ unitId: 'u1', elementRef: 'A' }, { unitId: 'u2', elementRef: 'B' }]);
  // Nothing is selected by half a member.
  assert.deepEqual(applyMemberSelection([], null, 'SHELF-1', true), []);
  assert.deepEqual(applyMemberSelection([], 'u1', null, true), []);
});

test('F1 — refsForUnit hands each cabinet its OWN members, and one empty array', () => {
  const set = [memberKey('u1', 'SHELF-1'), memberKey('u2', 'SHELF-1'), memberKey('u1', 'SHELF-2')];
  assert.deepEqual(refsForUnit(set, 'u1'), ['SHELF-1', 'SHELF-2']);
  assert.deepEqual(refsForUnit(set, 'u2'), ['SHELF-1']);
  // A cabinet outside the set gets the SAME frozen array every time — twelve
  // wardrobes must not re-render because eleven of them were handed a fresh [].
  assert.equal(refsForUnit(set, 'u9'), refsForUnit(set, 'u8'));
  assert.equal(refsForUnit([], 'u1'), refsForUnit(null, 'u2'));
});

test('F1 — six shelves in three wardrobes are ONE set', () => {
  const [a, b, c] = threeWardrobes();
  const picked = [];
  for (const unitId of [a, b, c]) {
    for (const sh of shelvesOf(unitId)) {
      const ref = panelFor(unitId, sh.id);
      ui().selectElement(unitId, ref, { additive: picked.length > 0 });
      picked.push({ unitId, itemId: sh.id, ref });
    }
  }
  assert.equal(ui().selectedElements.length, 6, 'six shelves, three cabinets');
  assert.equal(new Set(membersOf(ui().selectedElements).map((m) => m.unitId)).size, 3);
  // …and the store resolves every one of them, through its own cabinet.
  const members = store().shelfSetMembers();
  assert.equal(members.length, 6);
  assert.equal(new Set(members.map((m) => m.unitId)).size, 3);
});

// ═══ 2. THE GROUP MOVES AS ONE, EACH WITH ITS OWN CLAMP ═════════════════════

test('F1 — one drag moves six shelves in three wardrobes, by the same delta', () => {
  const [a, b, c] = threeWardrobes();
  const before = new Map();
  let hand = null;
  let first = true;
  for (const unitId of [a, b, c]) {
    for (const sh of shelvesOf(unitId)) {
      ui().selectElement(unitId, panelFor(unitId, sh.id), { additive: !first });
      before.set(`${unitId} ${sh.id}`, sh.pos_mm);
      if (first) hand = { unitId, itemId: sh.id };
      first = false;
    }
  }
  assert.equal(store().shelfSetMembers().length, 6);

  // Drag the piece in the hand 100 mm UP. Everything else is offered the same.
  const from = before.get(`${hand.unitId} ${hand.itemId}`);
  const state = store().moveShelfSet(hand.unitId, hand.itemId, from + 100, 1);
  assert.ok(state.group, 'the move reports on the group');
  assert.equal(state.group.size, 6);

  const delta = state.pos - from;
  assert.ok(Math.abs(delta) > 0, `the hand actually moved (${delta})`);
  let followed = 0;
  for (const [key, was] of before) {
    const [unitId, itemId] = key.split(' ');
    const now = itemsOf(unitId).find((i) => i.id === itemId).pos_mm;
    if (Math.abs(now - (was + delta)) < 0.001) followed += 1;
  }
  assert.equal(followed, 6 - state.group.stopped,
    'every member that was not stopped moved by exactly the hand\'s delta');
});

test('F1 — a member that runs into its own neighbour STOPS, and is counted', () => {
  project();
  const { id } = store().addUnit('WARDROBE');
  store().addShelves(id, 2);
  const [low, high] = shelvesOf(id);
  // Pin the LOW shelf hard against the floor of its own band, then tick both
  // and drag the pair down: the low one has nowhere left to go.
  const band = store().shelfLimitsOf
    ? store().shelfLimitsOf(id)
    : null;
  store().setShelfPos(id, low.id, 0);           // the clamp puts it at its floor
  const pinned = itemsOf(id).find((i) => i.id === low.id).pos_mm;
  assert.ok(band === null || pinned >= 0);

  ui().selectElement(id, panelFor(id, low.id));
  ui().selectElement(id, panelFor(id, high.id), { additive: true });
  assert.equal(store().shelfSetMembers().length, 2);

  const highWas = itemsOf(id).find((i) => i.id === high.id).pos_mm;
  const state = store().moveShelfSet(id, high.id, highWas - 400, 1);
  assert.equal(state.group.size, 2);
  assert.equal(state.group.stopped, 1, 'the pinned shelf hit a stop and said so');
  // …and it did NOT end up on top of, or through, its neighbour.
  assert.equal(itemsOf(id).find((i) => i.id === low.id).pos_mm, pinned,
    'a member that cannot move stays where it is');
});

test('F1 — a set of ONE is the single drag it always was', () => {
  project();
  const { id } = store().addUnit('WARDROBE');
  store().addShelves(id, 2);
  const [low] = shelvesOf(id);
  ui().selectElement(id, panelFor(id, low.id));      // a plain click: set of one
  assert.equal(store().shelfSetMembers().length, 0, 'one member is not a set');
  const state = store().moveShelfSet(id, low.id, low.pos_mm + 50, 1);
  assert.equal(state.group, undefined, 'it fell straight through to moveShelf');
  assert.ok(Number.isFinite(state.pos));
});

test('F1 — a group edit writes THROUGH EACH MEMBER\'S OWN unit', () => {
  // The panel's own callbacks, held at source: `unit.id` was hard-coded in
  // both, which is what made the set one wardrobe's however the store was
  // called. Every store action already took a unitId; the row had to carry one.
  const props = src('components/ElementProperties.jsx');
  assert.match(props, /unitId: member\.unitId, id: p\.meta\.itemId/);
  assert.match(props, /setShelfPos\(row\.unitId, row\.id, posFromField\(v, G\)\)/);
  assert.match(props, /setElementDepth\(row\.unitId, row\.id, v\)/);
  assert.doesNotMatch(props, /applyToSelection\(\(row\) => setShelfPos\(unit\.id/);
});

// ═══ 3. THE DRAG PRIORITY, PINNED AT SOURCE ═════════════════════════════════

test('F1 — the DEFAULT grab on a shelf moves it UP AND DOWN', () => {
  const view = src('3d/UnitView.jsx');
  const at = view.indexOf('TURN 37 (CLAUDE.md F1): THE PRIORITY FLIPS');
  assert.notEqual(at, -1, 'the flip is written down where it happens');
  const body = view.slice(at, at + 2600);
  // POSITION is the fall-through; DEPTH needs the modifier. Order matters: the
  // depth branch must be guarded, or it swallows the plain grab again.
  assert.match(body, /const wantsDepth = Boolean\(native\.altKey \|\| e\.altKey\);/);
  assert.ok(body.indexOf('if (canDrag && wantsDepth)') < body.indexOf('if (canDrag) { startShelfDrag'),
    'the depth branch is the guarded one');
  // The T36 rule that caused it — "already selected ⇒ depth" — is gone.
  assert.doesNotMatch(view, /alreadyOn/);
});

test('F1 — DEPTH is not gone: it is the same drag with ALT held', () => {
  // Iron rule 4. Nothing was removed to make room for the flip — the depth
  // drag, its plane maths and its store path are all still there.
  const view = src('3d/UnitView.jsx');
  assert.match(view, /const startDepthDrag = useCallback\(/);
  assert.match(view, /startDepthDrag\(e, shelfId, p\.meta\?\.front_mm \?\? 0, p\.box\.y\)/);
  assert.match(view, /onMoveElementDepth/);
  assert.match(src('stores/projectStore.js'), /setElementDepth: \(unitId, itemId, setbackMm\)/);
});

test('F1 — the cursor stops changing under the hand', () => {
  const view = src('3d/UnitView.jsx');
  assert.match(view, /document\.body\.style\.cursor = 'ns-resize';/);
  assert.doesNotMatch(view, /cursor = selectedElement === p\.id \? 'ew-resize' : 'ns-resize'/);
});

test('F1 — the scene calls ONE entry point for a shelf drag', () => {
  const scene = src('3d/Scene.jsx');
  assert.match(scene, /onMoveShelf=\{\(itemId, pos, step\) => moveShelfSet\(unit\.id, itemId, pos, step\)\}/);
  assert.match(scene, /selectedElements=\{refsForUnit\(selectedElements, unit\.id\)\}/);
  // …and `moveShelf` is untouched and still there, because the set of one
  // falls through to it (iron rule 4).
  assert.match(src('stores/projectStore.js'), /moveShelf: \(unitId, itemId, posRaw, snapStep\)/);
});

// ═══ 4. ONE DELETE, ACROSS CABINETS ═════════════════════════════════════════

test('F1 — one Delete clears a set that reaches into three cabinets', () => {
  const [a, b, c] = threeWardrobes();
  const set = [];
  let first = true;
  for (const unitId of [a, b, c]) {
    const sh = shelvesOf(unitId)[0];
    const ref = panelFor(unitId, sh.id);
    ui().selectElement(unitId, ref, { additive: !first });
    set.push(memberKey(unitId, ref));
    first = false;
  }
  const before = [a, b, c].map((u) => shelvesOf(u).length);
  assert.deepEqual(before, [2, 2, 2]);

  const out = store().deleteElementSet(a, set);
  assert.equal(out.ok, true);
  assert.equal(out.removed.length, 3);
  assert.deepEqual([a, b, c].map((u) => shelvesOf(u).length), [1, 1, 1],
    'one shelf out of each of the three');
});

test('F1 — a bare panel id still belongs to the unit it was passed with', () => {
  // Backwards compatible on purpose: every caller before tonight passed
  // `(unitId, ['SHELF-1', 'SHELF-2'])`, and so do T36's own tests.
  const [a] = threeWardrobes();
  const refs = shelvesOf(a).map((sh) => panelFor(a, sh.id));
  const out = store().deleteElementSet(a, refs);
  assert.equal(out.ok, true);
  assert.equal(shelvesOf(a).length, 0);
});

// ═══ 5. THE PROFILE IS UNTOUCHED BY ANY OF IT ═══════════════════════════════

test('F1 — none of this is an engine law', () => {
  // Selection and drag priority are the VIEW's. `computeCabinet` never hears
  // about either, which is why F1 contributes nothing to the classifier.
  assert.doesNotMatch(src('engine/cabinet.js'), /selectedElements|moveShelfSet|altKey/);
  assert.ok(P.editor.minShelfGap > 0, 'and the clamp is still the profile\'s');
});
