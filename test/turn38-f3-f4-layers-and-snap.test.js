// ─── TURN 38 · F3 / F4 — the layers and the snaps ───────────────────────────
//
//   F3  a layer is a NAME and a COLOUR, it lives with the PROJECT, and it
//       exports to DXF under both. No cut/mark semantics — the toolpath is
//       VCarve's problem (the owner's own ruling, 17.08.2026).
//   F4  the eight snap kinds move into a dropdown. Same `partSnapStore` state
//       underneath — "a re-housing, not a rewrite" is CLAUDE.md's own phrase,
//       and this file is what makes that claim checkable.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  USER_LAYER_COLOURS, allLayers, isUserLayer, layerNameFault, makeUserLayer,
  normaliseUserLayers, resolveLayer, sanitiseLayerName, userLayerColour,
} from '../src/engine/partLayers.js';
import { CNC_LAYERS, layerTableFor } from '../src/engine/cnc/layers.js';
import { SNAP_KINDS } from '../src/engine/partSnap.js';
import { usePartSnapStore } from '../src/stores/partSnapStore.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const store = () => useProjectStore.getState();

function project() {
  store().loadProject({
    id: null, name: 't38', room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }), design: {},
  }, []);
}

// ═══ F3 — THE NAME ══════════════════════════════════════════════════════════

test('F3 — a name is sanitised to the charset a DXF layer table can hold', () => {
  assert.equal(sanitiseLayerName('my pencil marks'), 'MY_PENCIL_MARKS');
  // A letter outside A–Z collapses like any other non-charset byte: `ó` is
  // one run of rubbish, and one run is one underscore. That is deliberate —
  // the alternative is transliterating Polish into a DXF, which is a decision
  // about somebody's language that a layer-name sanitiser should not make.
  assert.equal(sanitiseLayerName('  spójrz-tu!  '), 'SP_JRZ_TU');
  assert.equal(sanitiseLayerName('a---b'), 'A_B', 'a run of rubbish is ONE underscore');
  assert.equal(sanitiseLayerName('___'), '', 'a name that sanitises to nothing is not a name');
  assert.equal(sanitiseLayerName(null), '');
  assert.ok(sanitiseLayerName('X'.repeat(80)).length <= 31, 'and it fits the R12 table');
  assert.match(sanitiseLayerName('setup 2'), /^[A-Z0-9_]+$/);
});

test('F3 — the fault is a SENTENCE, and it protects the CNC names', () => {
  assert.match(layerNameFault(''), /needs a name/i);
  assert.match(layerNameFault('screws 3mm'), /already one of the CNC layers/i,
    'SCREWS_3MM is the app’s own and a hole drawn there would join the real ones');
  assert.match(layerNameFault('OUTLINE'), /already one of the CNC layers/i);
  const mine = [makeUserLayer({ name: 'JIG', aci: 1 })];
  assert.match(layerNameFault('jig', mine), /already exists in this project/i);
  assert.equal(layerNameFault('JIG_2', mine), null, 'and a fresh one is fine');
});

// ═══ F3 — THE COLOUR IS AN ACI, BECAUSE R12 HAS NOWHERE ELSE TO PUT ONE ═════

test('F3 — every offered colour is a real AutoCAD index with a screen hex', () => {
  assert.ok(USER_LAYER_COLOURS.length >= 8, 'a palette worth picking from');
  for (const c of USER_LAYER_COLOURS) {
    assert.ok(Number.isInteger(c.aci) && c.aci >= 1 && c.aci <= 255, `${c.label} has a real ACI`);
    assert.match(c.hex, /^#[0-9a-f]{6}$/i, `${c.label} has a screen colour`);
    assert.ok(c.label, 'and a name a person can pick by');
  }
  const aci = USER_LAYER_COLOURS.map((c) => c.aci);
  assert.equal(new Set(aci).size, aci.length, 'no index offered twice');
  assert.equal(userLayerColour(999).hex, USER_LAYER_COLOURS[6].hex, 'an index nobody offered falls back');
});

test('F3 — a layer is a NAME and a COLOUR and NOTHING ELSE', () => {
  const made = makeUserLayer({ name: 'my jig', aci: 3 });
  assert.deepEqual(Object.keys(made).sort(), ['aci', 'kind', 'label', 'name', 'screen', 'user']);
  assert.equal(made.name, 'MY_JIG');
  assert.equal(made.aci, 3);
  // No cut/mark SEMANTICS: no depth, no tool, no diameter, no operation.
  const src = read('engine/partLayers.js');
  for (const forbidden of ['depth', 'toolpath', 'diameter', 'feedRate']) {
    assert.ok(!new RegExp(`${forbidden}\\s*:`).test(src), `a user layer carries no ${forbidden}`);
  }
  assert.match(src, /it is VCarve's/i, '…and the file says whose problem the toolpath is');
});

test('F3 — a stored blob cannot invent a layer, shadow a CNC one or repeat itself', () => {
  const rows = normaliseUserLayers([
    { name: 'JIG', aci: 1 },
    { name: 'jig', aci: 5 },
    { name: 'OUTLINE', aci: 2 },
    { name: '', aci: 2 },
    'nonsense',
    { name: 'SECOND', aci: 4 },
  ]);
  assert.deepEqual(rows.map((r) => r.name), ['JIG', 'SECOND']);
  assert.equal(normaliseUserLayers(null).length, 0);
});

test('F3 — ONE resolver answers built-in and user layers alike', () => {
  const mine = [makeUserLayer({ name: 'JIG', aci: 1 })];
  assert.equal(resolveLayer('SCREWS_3MM', mine).name, 'SCREWS_3MM');
  assert.equal(resolveLayer('JIG', mine).screen, USER_LAYER_COLOURS[0].hex);
  assert.equal(isUserLayer('JIG', mine), true);
  assert.equal(isUserLayer('SCREWS_3MM', mine), false);
  // The built-ins come FIRST and are never re-ordered.
  const all = allLayers(mine);
  assert.deepEqual(all.slice(0, CNC_LAYERS.length).map((l) => l.name), CNC_LAYERS.map((l) => l.name));
  assert.equal(all[all.length - 1].name, 'JIG');
});

// ═══ F3 — IT LIVES WITH THE PROJECT ═════════════════════════════════════════

test('F3 — a user layer is stored on the PROJECT, so it survives save and load', () => {
  project();
  assert.deepEqual(store().projectLayers(), []);
  const { layer, error } = store().addProjectLayer({ name: 'shop jig', aci: 3 });
  assert.equal(error, null);
  assert.equal(layer.name, 'SHOP_JIG');
  assert.deepEqual(store().projectLayers().map((l) => l.name), ['SHOP_JIG']);
  // It is on `project`, which is the object `lib/persist.js` hands to storage
  // whole — so nothing extra had to be taught to save it.
  assert.deepEqual(store().project.cncLayers.map((l) => l.name), ['SHOP_JIG']);
  const saved = JSON.parse(JSON.stringify(store().project));
  store().loadProject(saved, []);
  assert.deepEqual(store().projectLayers().map((l) => l.name), ['SHOP_JIG'], 'and it comes back');

  // The fault is returned, not thrown, and nothing is stored.
  const again = store().addProjectLayer({ name: 'SHOP JIG', aci: 1 });
  assert.match(again.error, /already exists/i);
  assert.equal(store().projectLayers().length, 1);
});

// ═══ F3/F10 — AND IT EXPORTS UNDER ITS OWN NAME AND COLOUR ══════════════════

test('F3 — the DXF layer table declares a user layer with its own ACI', () => {
  const mine = [makeUserLayer({ name: 'JIG', aci: 30 })];
  const rows = layerTableFor(['OUTLINE', 'JIG'], mine);
  assert.deepEqual(rows, [{ name: 'OUTLINE', color: 7 }, { name: 'JIG', color: 30 }]);
  // A layer that is DECLARED but not used is not written — the table states
  // what the entities need and nothing else.
  assert.deepEqual(layerTableFor(['OUTLINE'], mine), [{ name: 'OUTLINE', color: 7 }]);
  // …and a name nothing knows still gets a row, or the file references an
  // undefined layer (the rule that was there before tonight).
  assert.deepEqual(layerTableFor(['MYSTERY'], mine), [{ name: 'MYSTERY', color: 7 }]);
  // With no user layers at all the answer is exactly what it always was.
  assert.deepEqual(layerTableFor(['OUTLINE', 'SCREWS_3MM']), [
    { name: 'OUTLINE', color: 7 }, { name: 'SCREWS_3MM', color: 4 },
  ]);
});

// ═══ F4 — THE SNAPS ARE RE-HOUSED, NOT REWRITTEN ════════════════════════════

test('F4 — the eight kinds are the eight, and the STORE under them is turn 24’s', () => {
  assert.equal(SNAP_KINDS.length, 8);
  usePartSnapStore.getState().reset();
  assert.equal(usePartSnapStore.getState().isOn('END'), true);
  usePartSnapStore.getState().toggle('END');
  assert.equal(usePartSnapStore.getState().isOn('END'), false, 'the same toggle the checkbox row used');
  usePartSnapStore.getState().setAll(false);
  assert.ok(SNAP_KINDS.every((k) => !usePartSnapStore.getState().isOn(k.id)), 'none');
  usePartSnapStore.getState().setAll(true);
  assert.ok(SNAP_KINDS.every((k) => usePartSnapStore.getState().isOn(k.id)), 'all');
});

test('F4 — the dropdown is a DROPDOWN, with all/none at the bottom', () => {
  const src = read('components/PartDetailModal.jsx');
  assert.match(src, /data-snap-menu="1"/, 'there is a `snap ▾` button on the toolbar');
  assert.match(src, /data-snap-dropdown="1"/, '…and what it opens is a dropdown');
  assert.match(src, /data-snap-kind=\{k\.id\}/, 'a checkbox per kind');
  assert.match(src, /data-snap-all="1"/);
  assert.match(src, /data-snap-none="1"/);
  // The state is the SAME store — a re-housing, not a rewrite.
  assert.match(src, /usePartSnapStore/);
  assert.match(src, /toggleSnap\(k\.id\)/);
  // …and the status bar summarises which are on (F2/F4).
  assert.match(src, /data-status-snap=/);
  assert.match(src, /activeSnaps\.length/);
});

test('F3 — the overlay and the dropdown are ONE list component', () => {
  const src = read('components/PartDetailModal.jsx');
  assert.match(src, /data-layer-overlay="1"/, 'the collapsible overlay');
  assert.match(src, /data-layer-overlay-toggle="1"/);
  assert.match(src, /data-layers-menu="1"/, '…and the toolbar dropdown');
  // Both render `LayerList`, so two lists of layers can never disagree.
  assert.equal((src.match(/<LayerList/g) || []).length, 2);
  for (const marker of [
    'data-new-layer-open="1"', 'data-new-layer-name="1"', 'data-new-layer-colour=',
    'data-new-layer-add="1"', 'data-layer-visible=',
  ]) {
    assert.ok(src.includes(marker), `${marker} is on the row`);
  }
  // The overlay takes NO width from the canvas — it floats over it.
  const at = src.indexOf('data-layer-overlay="1"');
  assert.match(src.slice(at - 300, at), /absolute right-2 top-2/);
});
