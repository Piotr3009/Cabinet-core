// ─── TURN 69 · F9 — A WARDROBE WIDENS BOTH WAYS ────────────────────────────
//
// CLAUDE.md, F9, verbatim:
//
//   *"Owner: beside an existing neighbour it grows only right — wrong, "i tu i
//   w PRO". The widening law lives in the STORE (shared core — no new PRO
//   exemption): a width increase takes free space on EITHER side, splitting as
//   the room allows; refusal only when both sides are blocked, with the
//   sentence. Prove in both apps."*
//
// "Prove in both apps" is proved HERE and not twice: both doors write through
// `projectStore.updateUnitParams` — PRO's `UnitSizeModal.jsx` calls it
// directly, retail's `adapter.setUnitSize` calls it through `S()` — and this
// file asserts that too, because a law proved in one app and reached by two
// paths is only one law if both paths are the same call.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const S = () => useProjectStore.getState();

/** A wardrobe of `w` standing at `x` on wall 1 of a 4 m room. */
function stand(w, x) {
  const { id } = S().addUnit('WARDROBE', { params: { width: w, height: 2200, depth: 600 } });
  S().updateUnitParams(id, { width: w });
  S().moveUnit(id, x, 1);
  return id;
}

function room(build) {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  return build();
}

const at = (id) => Math.round(S().units.find((u) => u.id === id).position.x_mm);
const wide = (id) => Math.round(S().units.find((u) => u.id === id).params.width);

// ═══ 1 · THE SYMPTOM, GONE ══════════════════════════════════════════════════

test('F9 · with a neighbour on the RIGHT, it grows LEFT', () => {
  const id = room(() => { const t = stand(1000, 1500); stand(1000, 2600); return t; });
  const before = at(id);
  const res = S().updateUnitParams(id, { width: 1800 });
  assert.equal(wide(id), 1800, 'the wall had the room and the wardrobe did not take it');
  // BEFORE TONIGHT this was the whole bug: the near edge never moved, so the
  // only width on offer was whatever the far edge alone could reach.
  assert.ok(at(id) < before, 'the near edge did not move — it grew only right');
  // What it took from the left is exactly what the right could not give.
  const gaveRight = 2600 - (before + 1000);
  assert.equal(at(id), before - (800 - gaveRight),
    'the split is not "the far edge first, the near edge for the rest"');
  assert.deepEqual(res.notices, [], 'a width that fitted was announced as a limit');
});

test('F9 · on a free wall it still grows RIGHT, exactly as it always did', () => {
  const id = room(() => stand(1000, 1500));
  const before = at(id);
  S().updateUnitParams(id, { width: 1800 });
  assert.equal(wide(id), 1800);
  assert.equal(at(id), before, 'the near edge moved when it had no reason to');
});

test('F9 · the space is SPLIT when neither side alone is enough', () => {
  // 800 at 200, the target at 1100, 800 at 2200: a little on each side.
  const id = room(() => { stand(800, 200); const t = stand(1000, 1100); stand(800, 2200); return t; });
  const beforeX = at(id);
  const beforeW = wide(id);
  const res = S().updateUnitParams(id, { width: 1800 });
  assert.ok(wide(id) > beforeW, 'it took nothing at all');
  assert.ok(at(id) < beforeX, 'it took nothing from the left');
  assert.ok(wide(id) < 1800, 'this scene is meant to be short of the ask');
  // The sentence names BOTH sides — the other one is not left to be discovered.
  assert.match(res.notices[0], /on the right/);
  assert.match(res.notices[0], /on the left/);
});

test('F9 · refusal ONLY when both sides are blocked, and it says what is on each', () => {
  const id = room(() => { stand(800, 200); const t = stand(1000, 1100); stand(800, 2200); return t; });
  S().updateUnitParams(id, { width: 1800 });     // takes everything both sides have
  const grown = wide(id);
  const heldAt = at(id);

  const res = S().updateUnitParams(id, { width: 1800 });   // asked again
  assert.equal(wide(id), grown, 'it grew past two neighbours');
  assert.equal(at(id), heldAt, 'it moved with nowhere to go');
  assert.match(res.notices[0], /cannot grow either way/);
  assert.match(res.notices[0], /is on the right and/);
  assert.match(res.notices[0], /is on the left/);
});

test('F9 · shrinking is untouched — the near edge stays put', () => {
  const id = room(() => stand(1600, 1200));
  const before = at(id);
  S().updateUnitParams(id, { width: 900 });
  assert.equal(wide(id), 900);
  assert.equal(at(id), before, 'a narrower cabinet drifted');
});

test('F9 · a widening never walks over its neighbour', () => {
  const id = room(() => { const left = stand(900, 100); const t = stand(900, 1500); void left; return t; });
  S().updateUnitParams(id, { width: 3000 });
  const [a, b] = S().units.map((u) => ({ l: u.position.x_mm, r: u.position.x_mm + u.params.width }));
  assert.ok(a.r <= b.l + 1e-6 || b.r <= a.l + 1e-6, 'two wardrobes are inside each other');
});

// ═══ 2 · ONE LAW, AND BOTH APPS REACH IT BY THE SAME CALL ═══════════════════

test('F9 · retail reaches the same law, through the same store call', () => {
  const id = room(() => { const t = stand(1000, 1500); stand(1000, 2600); return t; });
  const before = at(id);
  const said = A.setUnitSize(id, { width: 1800 });
  assert.equal(said.ok, true);
  assert.equal(wide(id), 1800, 'retail did not get the law');
  assert.ok(at(id) < before, 'retail did not get the law — it still grew only right');
});

test('F9 · there is ONE widening law, in the store, and no PRO exemption bought it', () => {
  const store = read('src/stores/projectStore.js');
  assert.match(store, /TURN 69 \(CLAUDE\.md F9\): A WARDROBE WIDENS BOTH WAYS/,
    'the law is not in the shared store');
  assert.equal((store.match(/nearEdgeTo = at - takeLeft;/g) || []).length, 1,
    'the near edge is moved in more than one place — that is two laws');

  // PRO's own door is byte-for-byte what it was: it never needed to change,
  // because it already writes through the store.
  assert.match(read('src/components/UnitSizeModal.jsx'), /updateUnitParams\(unit\.id, \{ \[key\]: value \}\)/,
    'PRO stopped writing widths through the store');
  // …and retail's door is the same call, one layer out.
  assert.match(read('src/retail/design/adapter.js'), /S\(\)\.updateUnitParams\(unitId, patch\)/,
    'retail stopped writing widths through the store');

  // The exemption map did NOT grow for F9: no widening file is on it.
  // (T71 licensed `DrawingModal.jsx` for the drawing set, argued in the
  // manifest with the owner's words; F9's own door, `UnitSizeModal.jsx`, is
  // still not on the list, which is what this assertion was ever about.)
  const freeze = read('test/turn59-f1-the-switch.test.js');
  const exempt = [...freeze.matchAll(/'src\/components\/([A-Za-z]+)\.jsx':\n\s+'T(\d\d) F/g)].map((m) => [m[1], m[2]]);
  // T72 licenses `ElementProperties` (F2's two chips and its setback row, F3's
  // CENTER ALL, F12's divider setback), `DoorModal` (F6's hinge block) and
  // `JpullRunModal` (F4's typed run) — each with the owner's own words and its
  // new hash, each re-copied the same night. The assertion is the one it always
  // was, asked of a list that a turn may add to and never of a number: EVERY
  // name on it is one a turn argued, and F9's own door is not among them.
  // AMENDED BY T74: `DrawRoomModal` (F3's focused, selected field), argued in
  // the manifest with the owner's words, re-frozen at its new hash. And
  // `UnitSizeModal` (T74 F7: the wardrobe wall unit's depth and its BACK |
  // FRONT), licensed by T74 and not by F9: what F9 said it did not buy, it
  // still did not buy, and the assertion below asks exactly that.
  // AMENDED BY T75: `BomPanel` and `ContextMenu` (F5: the worktop reaches the
  // BOM, the upstand reaches the menu), argued in the manifest with the
  // owner's words, re-frozen at their new hashes. Neither is a widening file.
  // AMENDED BY T75 F7: `RightPanel` (CUT CORNER and its small window), argued
  // in the manifest with the owner's words of 23.09 (*"Klikasz 'wytnij
  // narożnik'..."*), re-frozen at its new hash. Not a widening file.
  // AMENDED BY T75 F9/F10: `LibraryPanel` (a plus on an island face) and
  // `RightPanel` (the face named in the Wall select), argued the same way.
  // AMENDED BY T75 F15: `LibraryPanel` (*"The held-open row `cornice-pelmet`
  // opens as a PLAIN pelmet"*: the Extras row is an action on the selected
  // run), argued in the manifest, re-frozen. Not a widening file.
  // AMENDED BY T75 F23: `RightPanel` again (the Joints row, Puzzle or Dowel,
  // *"lisp najpierw."*), argued in the manifest, re-frozen. Not a widening file.
  const ARGUED = [
    'AddItems', 'BomPanel', 'ContextMenu', 'DoorModal', 'DrawRoomModal', 'DrawingModal', 'ElementProperties', 'JpullRunModal',
    // AMENDED BY T75 F21: `WarehouseModal` (the JoineryCore CSV contract).
    'LibraryPanel', 'RightPanel', 'RoomModal', 'UnitSizeModal', 'WarehouseModal', 'WatchLayoutModal',
    // AMENDED BY T75 F20: `SaveTemplateModal` (a selection saved as a set) and `TopBar` (the Sets
    // shelf's menu line), *"`lib/templates.js` grows `kind: 'set'`"*. Neither is a widening file.
    'SaveTemplateModal', 'TopBar',
    // AMENDED BY T78 F19 (12.10.2026): `CompanyDefaultsModal` (the Joints choice, *"Cabineo 8 AND 12,
    // chosen in the company's default settings"*), argued in the manifest, re-frozen. Not a widening file.
    'CompanyDefaultsModal',
    // AMENDED BY T78 F21: `SprayingPanel` (Output > Spraying, a new PRO page, *"cale sprayowanie jako osobne menu Cabinet Core"*), argued, frozen. Not a widening file.
    'SprayingPanel',
    // AMENDED BY T75 F22: `CncTree` (the readiness banner after an export). Not a widening file.
    'CncTree',
    // AMENDED 15.10.2026 (the evening): `WallElevationModal` (the recess and the chimney drawn in the FRONT view, a recess's
    // band typed; the owner: *"nie widze kresek, gdzie jest komin i gdzie wneka"*, *"dowolny"*), argued in the manifest under
    // T78 F7's chat-fix, re-frozen. Not a widening file.
    'WallElevationModal',
    // AMENDED BY T79 F1 (18.10.2026): `Messages` (every level in one bottom-left column with a history, the owner:
    // *"wszystkie informacje po zmianach ... zrób po lewej, niech one tam znikają"*), argued, re-frozen. Not a widening file.
    'Messages',
    // AMENDED BY T79 F12: `CabinetEditorModal` (Center between armed from the shelf menu in this window: a
    // click in its canvas is the pick, *"wybierasz dolny i górny element"*), argued, re-frozen. Not a widening file.
    'CabinetEditorModal',
    // AMENDED BY THE CHAT FIX OF 19.10.2026: `RailModal` (the rod's window finds its rod by item id: a second rod in
    // the same bay, the owner: *"nie ma mozliwosci dodania drugiego ponizej, dodaj to prosze"*), argued, re-frozen.
    // Not a widening file.
    'RailModal',
  ];
  const unargued = exempt.map(([n]) => n).filter((n) => !ARGUED.includes(n));
  assert.deepEqual(unargued, [], 'a file entered EXEMPT that no turn argued');
  for (const [name, turn] of exempt) {
    // AMENDED BY T78 F19: T78 licenses CompanyDefaultsModal (the Joints choice). AMENDED BY T79 F1: T79 licenses Messages.
    // AMENDED BY T79 F12: T79 licenses CabinetEditorModal (Center between's pick).
    assert.ok(['67', '69', '71', '72', '74', '75', '78', '79'].includes(turn), `${name} names turn ${turn}, which licensed nothing`);
  }
  assert.ok(!exempt.some(([n, t]) => /UnitSize/.test(n) && t === '69'), 'F9 bought no exemption');
  // AMENDED BY T75 F9: RoomModal's licence is renewed tonight (ADD ISLAND), so
  // its newest reason names T75; T69's own sentence still stands beneath it.
  assert.deepEqual(exempt.filter(([, t]) => t === '69').map(([n]) => n), [], 'T69 licenses nothing new');
  assert.match(read('test/turn59-f1-the-switch.test.js'), /T69 F1 . the preset row becomes 1 WALL/, 'T69\'s RoomModal reason was lost');
});
