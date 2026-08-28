import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import {
  watchDrawerFit, watchDrawerFixedHeight, watchDrawerSpec,
} from '../src/engine/watchDrawer.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';

// ─── T54 · F4 — THE WATCH DRAWER: THE DOOR TO IT EXISTS, AND 120 IS THE
// NUMBER ────────────────────────────────────────────────────────────────────
//
// T53 shipped the modal and forgot the handle: NO click in the whole app
// opened `watch-layout` (the audit missed it because the screenshots showed
// the modal, not the road). And the owner has re-sized: *"120 proszę."*
//
// The height DERIVES — `watchDrawerFixedHeight` needed no code change — so
// the one number that moves is `insideDepthMm`: 60 → 40, LISP first
// (KIT_WATCH_DRAWER.lsp), with the trade note amended: a 44–48 chronograph
// will no longer lie flat (his veto line, written beside the number). The
// pocket floor (60 CLEAR WIDTH) is across, not down, and does not move.

const store = () => useProjectStore.getState();
const S = watchDrawerSpec(P);

test('F4.3 · the derivation prints itself: 40 + 9 + 2 + 15 + 18 + 36 = 120', () => {
  assert.equal(S.insideDepthMm, 40, '*"120 proszę"* — the one number that moved');
  assert.equal(watchDrawerFixedHeight(P), 120);
  assert.equal(
    watchDrawerFixedHeight(P),
    S.insideDepthMm + S.baseT + S.headroomMm
      + P.baseDrawerUnit.runnerPocketWidth + P.board.thickness
      + P.wardrobe.drawers.frontToSideDelta,
    'every term is a profile number — the derivation, not a literal',
  );
});

test('F4.3 · 120 fits and 119 REFUSES', () => {
  const clearOf = (front) => front - P.baseDrawerUnit.runnerPocketWidth
    - P.board.thickness - P.wardrobe.drawers.frontToSideDelta;
  assert.equal(watchDrawerFit({ width: 500, height: clearOf(120), depth: 450 }, P).ok, true,
    '120 fits');
  const at119 = watchDrawerFit({ width: 500, height: clearOf(119), depth: 450 }, P);
  assert.equal(at119.ok, false, '119 refuses');
  assert.equal(at119.reason, 'too-shallow', 'and says why');
});

test('F4.3 · the pocket floor is untouched — 60 is ACROSS, not down', () => {
  assert.equal(S.pocketMinMm, 60, 'a watch case runs 30–48 mm across');
});

test('F4.3 · LISP is law: the 40 landed in KIT_WATCH_DRAWER.lsp first, veto beside it', () => {
  const kit = readFileSync(new URL('../reference/lisp/KIT_WATCH_DRAWER.lsp', import.meta.url), 'utf8');
  assert.match(kit, /T54 AMENDMENT \(28\.08\.2026\)/);
  assert.match(kit, /"120 prosze\."/, 'the owner\'s words');
  assert.match(kit, /60 -> 40/, 'the number that moved, named');
  assert.match(kit, /44-48 mm chronograph will no longer lie flat/, 'the trade note, amended');
  assert.match(kit, /INSIDE DEPTH {2}60 mm/, 'the history stays');
  // …and the profile carries the same amendment beside its number.
  const prof = readFileSync(new URL('../src/engine/profile.js', import.meta.url), 'utf8');
  assert.match(prof, /insideDepthMm: 40/);
  assert.match(prof, /trade standard is ~50/);
});

// ─── (F4.4) SAVED PROJECTS RE-DERIVE ────────────────────────────────────────

test('F4.4 · a T53-saved 140 loads as 120 — no stored 140 anywhere', () => {
  const ROOM = migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) });
  // A saved unit exactly as T53 wrote it: the watch drawer with its height
  // STORED at the old derivation, 140.
  const saved = [{
    id: 'u1',
    type: 'WARDROBE',
    position: { wall: 0, x_mm: 40, rotation_deg: 0 },
    params: {
      type: 'WARDROBE',
      width: 900,
      height: 2150,
      depth: 568,
      unit_num: 'W01',
      sections: [{
        width_mm: 900,
        items: [
          { id: 'd1', kind: 'drawer', index: 1, height_mm: 200 },
          {
            id: 'd2',
            kind: 'drawer',
            index: 2,
            height_mm: 140,
            watch_insert: true,
            watch_layout: 'classic',
            watch_shelf_glass: false,
          },
        ],
      }],
    },
  }];
  store().loadProject({
    id: null, name: 'a T53 job', number: '53', client: 'the owner', room: ROOM, design: {},
  }, JSON.parse(JSON.stringify(saved)));
  const items = store().units[0].params.sections[0].items;
  const watch = items.find((i) => i.watch_insert === true);
  assert.equal(watch.height_mm, 120, 'the height re-derived on load');
  assert.equal(JSON.stringify(store().units).includes('140'), false, 'no stored 140 anywhere');
  // …and the engine cuts it at 120: the front is the derivation's own number.
  const result = store().unitResult('u1');
  const front = result.panels.find((p) => p.part === 'DRAWER-FRONT' && Number(p.meta?.drawer) === 2);
  assert.equal(front.h, 120, 'cut at 120');
  assert.equal((result.assemblies.watchInserts || []).length, 1, 'and the insert is still built');
  // The plain drawer under it did not move.
  assert.equal(items.find((i) => i.id === 'd1').height_mm, 200, 'only the watch drawer re-derives');
});

// ─── (F4.1 / F4.2) THE ROADS — asserted in the source, the house pattern ────

const unitView = readFileSync(new URL('../src/3d/UnitView.jsx', import.meta.url), 'utf8');
const scene = readFileSync(new URL('../src/3d/Scene.jsx', import.meta.url), 'utf8');
const addItems = readFileSync(new URL('../src/components/AddItems.jsx', import.meta.url), 'utf8');

test('F4.1 · Entry A — the scene: a watch piece opens watch-layout beside the click', () => {
  // A tray piece (rail, divider, base) opens on POINTER DOWN — it was inert.
  assert.match(unitView, /if \(p\.role === 'watch_insert' && p\.meta\?\.drawer && onEditWatch\) \{/);
  assert.match(unitView, /onEditWatch\(p\.meta\.drawer, p\.meta\.zone \?\? null, \{ x: e\.clientX, y: e\.clientY \}\);/);
  // The front and the box of a WATCH drawer route to the layout, not the
  // generic drawer editor — resolved from the ITEM, never guessed by y.
  assert.match(unitView, /i\.watch_insert === true\n\s*&& Number\(i\.index\) === Number\(p\.meta\.drawer\)/);
  // …and the scene resolves the item by the engine's own helper and opens
  // BESIDE the click (anchor, house modal law).
  assert.match(scene, /const item = drawerItemOf\(unit, drawer, zone \?\? null\);/);
  assert.match(scene, /openModal\('watch-layout', \{\n\s*unitId: unit\.id,\n\s*itemId: item\.id,\n\s*anchor: \{/);
});

test('F4.2 · Entry B — the menu: the Watch drawer row on a unit that HAS one opens the modal', () => {
  assert.match(addItems, /if \('watch_drawer' === kind\.id\) \{/);
  assert.match(addItems, /openModal\('watch-layout', \{\n\s*unitId: unit\.id, itemId: watchItem\.id, anchor: anchorOfEvent\(e\),\n\s*\}\);/);
});

// ─── (F4.5) THE PROBE'S OWN CLAIM ───────────────────────────────────────────

test('F4.5 · no golden carries an insert, and the gate still bites', () => {
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) {
    const params = { ...defaultParamsFor(id, P), unit_num: '01' };
    const items = (params.sections || []).flatMap((s) => s?.items || []);
    assert.equal(items.filter((i) => i?.watch_insert === true).length, 0, `${id} asks for nothing`);
  }
  const asked = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    width: 900,
    sections: [{
      width_mm: 900,
      items: [{
        id: 'd1', kind: 'drawer', index: 1, height_mm: 120, watch_insert: true,
      }],
    }],
  }, P);
  assert.equal((asked.assemblies?.watchInserts || []).length, 1, 'a 120 drawer takes the insert');
});
