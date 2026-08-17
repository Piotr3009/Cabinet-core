import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { useUiStore } from '../src/stores/uiStore.js';
import {
  applySelection, memberKey, primaryOf, refsForUnit,
} from '../src/lib/selection.js';

// ─── TURN 36 (CLAUDE.md F2): MULTI-SELECT — CTRL+CLICK, AND THE GROUP MOVES
//
// Re-issued from T35-F2 unchanged: *Ctrl+click selection set (uiStore), scene
// highlight, group edits — shelves: position and depth to all selected; LED
// strips: inset and depth to all selected; one Delete removes the whole set
// through the heal sweep; plain click = today's single-select, untouched.*
//
// The CABINET set is turn 13's and is not touched by this turn. What arrives
// here is the same arithmetic one level down: a set of PIECES inside a unit.
//
// ─── RE-PINNED 17.08.2026 (CLAUDE.md T37-F1) ────────────────────────────────
//
// The owner walked T36-F2 the same day it landed: *"chodziło mi o półki z 2–3
// szaf obok siebie, a nie tylko z jednej"*, and *"przesuwanie półek up-and-down
// jest strasznie trudne — zazwyczaj catch jest na ustawianie głębokości, co
// jest najmniej przydatne."*
//
// So two of T36's pins are now WRONG BY DECISION, and both are re-written
// below rather than deleted, with the sentence that overturned them:
//
//   · "the set is ONE cabinet's" — the boundary is gone. A member is
//     `{unitId, elementRef}`, carried as a KEY, and Ctrl+click reaches across
//     cabinets. Everything else about the arithmetic is untouched.
//   · "the PLAIN path is byte-for-byte what it was" — the plain grab now moves
//     a shelf UP AND DOWN whether or not it is selected. Depth is Alt+drag;
//     nothing was taken away.
//
// Everything T36 pinned that the owner did NOT overturn is pinned here still.

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

const ui = () => useUiStore.getState();
const reset = () => useUiStore.setState({
  selectedUnitId: null, selectedUnitIds: [], selectedElement: null, selectedElements: [],
});

// ═══ 1. THE SET ═════════════════════════════════════════════════════════════

test('F2 — a PLAIN click is today\'s single-select, untouched', () => {
  reset();
  ui().selectElement('u1', 'SHELF-1');
  // T37-F1: a member is a KEY now — `unitId` and the panel id — because the
  // set spans cabinets and a bare `SHELF-1` names two different boards in two
  // wardrobes. The arithmetic over those keys is turn 13's, unchanged.
  assert.deepEqual(ui().selectedElements, [memberKey('u1', 'SHELF-1')]);
  assert.deepEqual(ui().selectedElement, { unitId: 'u1', elementRef: 'SHELF-1' });
  // …and a second plain click REPLACES, it does not add.
  ui().selectElement('u1', 'SHELF-2');
  assert.deepEqual(ui().selectedElements, [memberKey('u1', 'SHELF-2')]);
  assert.deepEqual(ui().selectedElement, { unitId: 'u1', elementRef: 'SHELF-2' });
  assert.deepEqual(ui().selectedUnitIds, ['u1'], 'pointing at a piece points at ONE cabinet');
});

test('F2 — Ctrl+click adds, ticks off, and leaves nothing when the last one goes', () => {
  reset();
  ui().selectElement('u1', 'SHELF-1');
  ui().selectElement('u1', 'SHELF-2', { additive: true });
  ui().selectElement('u1', 'SHELF-3', { additive: true });
  assert.deepEqual(ui().selectedElements,
    ['SHELF-1', 'SHELF-2', 'SHELF-3'].map((r) => memberKey('u1', r)));
  assert.equal(ui().selectedElement.elementRef, 'SHELF-3', 'the PRIMARY is the last one touched');
  // Ctrl+click a member again and it leaves the set; the primary falls back.
  ui().selectElement('u1', 'SHELF-3', { additive: true });
  assert.deepEqual(ui().selectedElements,
    ['SHELF-1', 'SHELF-2'].map((r) => memberKey('u1', r)));
  assert.equal(ui().selectedElement.elementRef, 'SHELF-2');
  ui().selectElement('u1', 'SHELF-2', { additive: true });
  ui().selectElement('u1', 'SHELF-1', { additive: true });
  assert.deepEqual(ui().selectedElements, []);
  assert.equal(ui().selectedElement, null, 'the last one out leaves nothing selected');
});

test('F1 — the set SPANS CABINETS: six shelves in three wardrobes, one set', () => {
  // T36 pinned the opposite here — *"a piece in another starts a new one"* —
  // and the owner's verdict the same day was that this is exactly the case he
  // needed. The boundary is gone (17.08.2026, T37-F1).
  reset();
  ui().selectElement('u1', 'SHELF-1');
  ui().selectElement('u1', 'SHELF-2', { additive: true });
  ui().selectElement('u2', 'SHELF-1', { additive: true });
  ui().selectElement('u2', 'SHELF-2', { additive: true });
  ui().selectElement('u3', 'SHELF-1', { additive: true });
  ui().selectElement('u3', 'SHELF-2', { additive: true });
  assert.equal(ui().selectedElements.length, 6, 'six shelves, three cabinets, one set');
  assert.deepEqual(ui().selectedElement, { unitId: 'u3', elementRef: 'SHELF-2' });
  // A PIECE selection still points the single-unit panels at ONE cabinet —
  // the primary's. `selectedUnitIds.length > 1` is what opens the CABINET bulk
  // panel, and a set of shelves must never do that.
  assert.deepEqual(ui().selectedUnitIds, ['u3']);

  // Each cabinet is handed its OWN members, as bare panel ids — a shelf called
  // SHELF-1 in one wardrobe still cannot light up SHELF-1 in the next.
  assert.deepEqual(refsForUnit(ui().selectedElements, 'u1'), ['SHELF-1', 'SHELF-2']);
  assert.deepEqual(refsForUnit(ui().selectedElements, 'u2'), ['SHELF-1', 'SHELF-2']);
  assert.deepEqual(refsForUnit(ui().selectedElements, 'u9'), [], 'and a cabinet outside it, none');

  // Ctrl+click a member in the FAR cabinet and it leaves, without disturbing
  // the near one — which is the half people forget.
  ui().selectElement('u1', 'SHELF-1', { additive: true });
  assert.equal(ui().selectedElements.length, 5);
  assert.deepEqual(refsForUnit(ui().selectedElements, 'u1'), ['SHELF-2']);
});

test('F2 — it is the SAME arithmetic the cabinet set has used since turn 13', () => {
  // Not a second implementation: one module answers both.
  assert.deepEqual(applySelection(['a'], 'b', true), ['a', 'b']);
  assert.deepEqual(applySelection(['a', 'b'], 'a', true), ['b']);
  assert.deepEqual(applySelection(['a', 'b'], 'c', false), ['c']);
  assert.equal(primaryOf(['a', 'b']), 'b');
  assert.match(src('stores/uiStore.js'), /applyMemberSelection, applySelection, memberKey, parseMember, primaryOf,\n\} from '\.\.\/lib\/selection\.js'/);
  // T37-F1: …and the cross-cabinet version is that same function on KEYS, not
  // a second implementation keyed on object identity.
  assert.deepEqual(applySelection([memberKey('u1', 'a')], memberKey('u2', 'a'), true),
    [memberKey('u1', 'a'), memberKey('u2', 'a')]);
});

test('F2 — clearing, and leaving the editor, take the set with them', () => {
  reset();
  ui().selectElement('u1', 'SHELF-1');
  ui().selectElement('u1', 'SHELF-2', { additive: true });
  ui().clearElement();
  assert.deepEqual(ui().selectedElements, []);
  assert.equal(ui().selectedElement, null);

  ui().selectElement('u1', 'SHELF-1');
  ui().selectElement('u1', 'SHELF-2', { additive: true });
  ui().clearSelection();
  assert.deepEqual(ui().selectedElements, []);

  ui().selectElement('u1', 'SHELF-1');
  ui().goToStart();
  assert.deepEqual(ui().selectedElements, []);
  assert.equal(ui().selectedElement, null);
  useUiStore.setState({ screen: 'editor' });
  reset();
});

// ═══ 2. THE CANVAS ══════════════════════════════════════════════════════════

test('F2 — the modifier travels with the click, off the NATIVE event', () => {
  const view = src('3d/UnitView.jsx');
  // The turn-13 lesson, applied one level down: react-three-fiber builds its
  // own event object by spreading the DOM one, which leaves every modifier
  // behind — so the native event is asked first.
  assert.match(view, /const native = e\.nativeEvent \|\| e;\n\s+const additive = Boolean\(native\.ctrlKey \|\| native\.metaKey \|\| e\.ctrlKey \|\| e\.metaKey\);/);
  assert.match(view, /onSelectElement\?\.\(p\.id, \{ additive: true \}\);/);
  // With the modifier down it is a TICK, not a grab: no drag starts…
  assert.match(view, /e\.stopPropagation\(\);\n\s+onSelectElement\?\.\(p\.id, \{ additive: true \}\);\n\s+return;/);
  // …and the press must NOT travel on to the boards behind the piece. Without
  // the stop, the same press reaches the carcass, whose own handler reads the
  // same modifier and ticks the CABINET out of its selection — which nulls the
  // element selection with it, so every Ctrl+click REPLACED the set instead of
  // growing it. The acceptance walk caught it; this holds it caught.
  // Anchored on the ELEMENT block's own note — turn 13's CABINET block reads
  // the modifier the same way two hundred lines above, and it is untouched.
  const at = view.indexOf('TURN 36 (CLAUDE.md F2): CTRL+CLICK BUILDS A SET');
  assert.notEqual(at, -1);
  const body = view.slice(at, at + 1400);
  assert.match(body, /if \(additive\) \{/);
  assert.match(body, /e\.stopPropagation\(\);/);
  // ─── RE-PINNED 17.08.2026 (T37-F1): THE PRIORITY FLIPPED ─────────────────
  // T36 pinned the plain path as *"byte-for-byte what it was: one bare call,
  // then turn 9's two drags"* — and turn 9's order put DEPTH first for a shelf
  // that was already selected, which the owner found unusable: *"zazwyczaj
  // catch jest na ustawianie głębokości, co jest najmniej przydatne."*
  //
  // The plain grab is POSITION now, selected or not. Depth is the same drag
  // with ALT held — one gesture away, and nothing was taken out.
  assert.match(view, /onSelectElement\?\.\(p\.id\);/);
  assert.match(view, /const wantsDepth = Boolean\(native\.altKey \|\| e\.altKey\);/);
  assert.match(view, /if \(canDrag && wantsDepth\) \{\n\s+startDepthDrag\(/);
  assert.match(view, /if \(canDrag\) \{ startShelfDrag\(e, shelfId, p\.box\.y\); return; \}/);
  // …and the cursor stops changing under the hand: every shelf that moves
  // promises the vertical axis.
  assert.match(view, /document\.body\.style\.cursor = 'ns-resize';/);
  assert.doesNotMatch(view, /cursor = selectedElement === p\.id \? 'ew-resize'/);
  assert.match(src('3d/Scene.jsx'), /onSelectElement=\{\(panelId, opts\) => selectElement\(unit\.id, panelId, opts\)\}/);
});

test('F2 — EVERY member of the set is marked in the scene, not just the last', () => {
  const view = src('3d/UnitView.jsx');
  assert.match(view, /const selectedElementBoxes = useMemo\(/);
  assert.match(view, /selectedElementBoxes\s*\n\s*\.filter\(\(b\) => b !== selectedElementBox\)/);
  // ONE component, one style — the same dashed box the primary has worn since
  // turn 9, not a second highlight that could look different.
  assert.equal((view.match(/<SelectionOutline/g) || []).length, 3, 'unit + set + primary');
  // T37-F1: the set spans cabinets, so each unit is handed its OWN members
  // rather than the whole set only when it happens to hold the primary.
  assert.match(src('3d/Scene.jsx'), /selectedElements=\{refsForUnit\(selectedElements, unit\.id\)\}/);
});

// ═══ 3. THE GROUP EDITS ═════════════════════════════════════════════════════

test('F2 — a shelf\'s HEIGHT and SET-BACK reach the whole set, in one batch', () => {
  const props = src('components/ElementProperties.jsx');
  assert.match(props, /const applyToSelection = \(fn\) => \{/);
  assert.match(props, /return batch\(\(\) => \{ for \(const row of groupItems\) fn\(row\); \}\);/);
  // T37-F1: through the ROW'S OWN cabinet — `unit.id` was hard-coded here,
  // which is what made the set one wardrobe's however the store was called.
  assert.match(props, /applyToSelection\(\(row\) => setShelfPos\(row\.unitId, row\.id, posFromField\(v, G\)\)\)/);
  assert.match(props, /applyToSelection\(\(row\) => setElementDepth\(row\.unitId, row\.id, v\)\)/);
  // A set of ONE is the single piece it always was, down to the store call.
  assert.match(props, /if \(groupSize < 2\) \{\n\s+return fn\(\{\n\s+unitId: unit\.id,/);
  // …and the panel says so, rather than surprising somebody.
  assert.match(props, /data-group-selection=\{groupSize\}/);
});

test('F2 — LED strips: inset and depth reach every selected strip, in one write', () => {
  const panel = src('components/LightingPanel.jsx');
  assert.match(panel, /const setInset = \(it, v\) => updateLightingItemsBulk\(strippedSet\(it\), \{ inset_mm: v \}\);/);
  assert.match(panel, /const setDepth = \(it, v\) => updateLightingItemsBulk\(strippedSet\(it\), \{ depth_mm: v \}\);/);
  // A shelf strip carries its shelf's PANEL ID in `ref`, which is exactly what
  // the Ctrl+click set holds — so the set the joiner already ticked names the
  // strips, and no second selection mechanism was invented for them.
  // T37-F1: matched by MEMBER KEY, so a strip under a shelf in the wardrobe
  // next door is reached by the same slider.
  assert.match(panel, /set\.includes\(memberKey\(it\.unitId, it\.ref\)\)/);
  // A strip outside the selection is still edited alone.
  assert.match(panel, /if \(set\.length < 2 \|\| !set\.includes\(memberKey\(it\.unitId, it\.ref\)\)\) return \[it\.id\];/);
  // …and the master control is one write now, not one per strip.
  assert.match(panel, /const setAll = \(v\) => updateLightingItemsBulk\(/);
  const store = src('stores/projectStore.js');
  assert.match(store, /updateLightingItemsBulk: \(ids, patch\) => \{/);
  assert.match(store, /get\(\)\.setDesign\(\{ lighting: \{ \.\.\.lighting, items \} \}\);/);
});

// ═══ 4. ONE DELETE, THE WHOLE SET, ONE SWEEP ════════════════════════════════

test('F2 — one Delete removes the whole set, through the heal sweep, once', () => {
  const store = src('stores/projectStore.js');
  assert.match(store, /deleteElementSet: \(unitId, refs\) => \{/);
  // The SAME plan a single Delete goes through — a piece the rules refuse is
  // refused here for the same reason and NAMED, not silently skipped.
  assert.match(store, /const plan = deletePlan\(\{ unit, panel \}\);/);
  assert.match(store, /if \(!plan\.allowed\) \{ refused\.push\(plan\.reason\); continue; \}/);
  // One batch, so it is one undo step; one sweep, at the end.
  assert.match(store, /return runBatch\(\(\) => \{\n\s+const removed = \[\];/);
  // T37-F1: …and a member may name its OWN cabinet, so one Delete clears a
  // set that reaches into three of them.
  assert.match(store, /const member = parseMember\(entry\) \|\| \{ unitId, elementRef: entry \};/);
  const at = store.indexOf('deleteElementSet: (unitId, refs)');
  const body = store.slice(at, store.indexOf('\n  removeElement:', at));
  assert.equal((body.match(/healFrontGaps\(\)/g) || []).length, 1, 'ONE sweep, at the end');
  // …and the single-piece path routes into it when a set is what is selected.
  assert.match(store, /if \(Array\.isArray\(set\) && set\.length > 1\) \{\n\s+return get\(\)\.deleteElementSet\(unitId, set\);/);
});

test('F2 — the plans are taken BEFORE the first removal', () => {
  // Removing a drawer renumbers the stack, so a plan taken after the first
  // removal would be a plan about a different cabinet.
  const store = src('stores/projectStore.js');
  const at = store.indexOf('deleteElementSet: (unitId, refs)');
  const body = store.slice(at, store.indexOf('\n  removeElement:', at));
  assert.ok(body.indexOf('deletePlan(') < body.indexOf('runBatch('),
    'every plan is resolved against the result as it stands');
});
