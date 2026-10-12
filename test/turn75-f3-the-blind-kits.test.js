// ─── T75 · F3 · THE BLIND KITS, THREE OF THEM ──────────────────────────────
//
// CLAUDE.md T75 F3: *"A blind unit stands at the corner with its door at the
// reachable end and a BLANK where the adjacent run hides its front. It is the
// parent kit at its own width, hole for hole; only the face differs ... The
// DOOR: one leaf, width = W minus blank minus the gaps, hinged on the far side
// ... the test asserts it hole for hole against a BUD / WUD / WARDROBE of the
// same W ... no divider may be placed inside the blind part (refused in words)
// ... retail EXTRAS a button `ADD CORNER WARDROBE`."*
//
// The owner, 9.10.2026: *"daj od razu narożniki przemyślane."*

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import {
  UNIT_TYPES, UNIT_NUM_PREFIX, defaultParamsFor, getCategory, isBlindKit,
} from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { KITCHEN_LIBRARY } from '../src/engine/library.js';
import { ELEMENT_TO_PART_ID } from '../src/engine/partRegistry.js';
import { blindClearanceView } from '../src/engine/corners.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore, BLIND_DIVIDER_REFUSAL } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';
import { goldenOf } from '../scripts/t75-golden.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const KITS = [['BLIND_BASE', 'BUD', 'BB'], ['BLIND_WALL', 'WUD', 'BW'], ['BLIND_WARDROBE', 'WARDROBE', 'BX']];

test('F3 · three types, each its parent field by field, with blind, one door and its own prefix', () => {
  for (const [id, parent, prefix] of KITS) {
    const t = UNIT_TYPES[id];
    const p = UNIT_TYPES[parent];
    assert.ok(t, `${id} missing`);
    assert.equal(t.blind, true);
    assert.equal(t.doorCount, 1);
    assert.equal(UNIT_NUM_PREFIX[id], prefix);
    for (const key of ['heightGroup', 'family', 'lisp', 'hingeRule', 'cupRule', 'legs', 'legSource', 'hangers',
      'doorExtend', 'mount', 'drawerStyle', 'minHeightKey']) {
      assert.deepEqual(t[key], p[key], `${id}.${key} is not ${parent}'s`);
    }
    assert.deepEqual(t.carcass, p.carcass);
    assert.deepEqual(t.supports, p.supports);
    assert.ok(isBlindKit(id));
  }
  assert.ok(!isBlindKit('BUD'));
});

test('F3 · the defaults are the profile\'s, marked proposed: base 1000, wall 900, wardrobe 1200', () => {
  assert.equal(P.blindBase.defaults.width, 1000);
  assert.equal(P.blindWall.defaults.width, 900);
  assert.equal(P.blindWardrobe.defaults.width, 1200);
  const src = readFileSync(`${ROOT}src/engine/profile.js`, 'utf8');
  for (const block of ['blindBase', 'blindWall', 'blindWardrobe']) {
    const at = src.indexOf(`  ${block}: {`);
    assert.ok(at > 0, block);
    assert.match(src.slice(at, at + 200), /T75 proposed, owner to confirm/, `${block} is not marked proposed`);
  }
});

test('F3 · the carcass is the parent\'s, hole for hole, at the same width', () => {
  for (const [id, parent] of KITS) {
    const p = defaultParamsFor(id, P);
    const r = computeCabinet(p, P);
    const q = computeCabinet({
      ...defaultParamsFor(parent, P), width: p.width, height: p.height, depth: p.depth, doors: { count: 1, hinge: 'R' },
    }, P);
    const carcass = (res) => res.drills.filter((d) => !String(d.panel).includes('-F') && !String(d.panel).includes('BLANK'));
    assert.deepEqual(carcass(r), carcass(q), `${id} is not drilled as ${parent}`);
    // AMENDED BY T78 F10: the kit's own corner strip (role corner_post) is the blind kit's board, not the parent's.
    const boards = (res) => res.panels.filter((x) => !['front', 'blind_blank', 'corner_post'].includes(x.role)).map((x) => [x.id, x.w, x.h]);
    assert.deepEqual(boards(r), boards(q), `${id}'s boards are not ${parent}'s`);
  }
});

test('F3 · the face: a blank with no hole, and ONE leaf hinged on the far side, W less blank less gaps', () => {
  const p = defaultParamsFor('BLIND_BASE', P);
  const r = computeCabinet(p, P);
  const blank = r.panels.find((x) => x.role === 'blind_blank');
  const door = r.panels.find((x) => x.role === 'front');
  const want = p.depth + P.front.thickness + P.corner.postMm + P.doors.clearance.corner;
  assert.equal(blank.w, want, 'the blank is the adjacent run\'s depth + front + post + rule 7');
  assert.equal(blank.material_role, 'front');
  assert.equal(blank.cnc.outline.length, 4);
  assert.deepEqual(blank.cnc.holes || [], [], 'the blank carries no hole');
  assert.equal(r.drills.filter((d) => d.panel === blank.id).length, 0);
  assert.equal(blank.meta.readiness, 'geometry');
  assert.equal(ELEMENT_TO_PART_ID['BLIND-BLANK'], 'false_front');
  assert.equal(r.panels.filter((x) => x.role === 'front').length, 1, 'one leaf');
  assert.equal(door.meta.hinge, 'R', 'the blank on the left, the hinge on the far side');
  assert.equal(door.w, p.width - want - P.doors.clearance.endPanel - P.doors.gap / 2);
  assert.equal(door.box.x, want + P.doors.clearance.endPanel);
  // Mirrored: the blank on the right hinges the leaf on the left.
  const m = computeCabinet({ ...p, blind_side: 'right' }, P);
  assert.equal(m.panels.find((x) => x.role === 'front').meta.hinge, 'L');
  assert.equal(m.panels.find((x) => x.role === 'blind_blank').box.x, p.width - want);
  // The client's own number wins over the corner's.
  const own = computeCabinet({ ...p, blind_mm: 700, blind_mm_own: 500 }, P);
  assert.equal(own.panels.find((x) => x.role === 'blind_blank').w, 500);
  assert.equal(computeCabinet({ ...p, blind_mm: 700 }, P).panels.find((x) => x.role === 'blind_blank').w, 700);
});

test('F3 · library: Base units "Blind corner", Wall units "Blind corner wall", Wardrobes "Blind corner wardrobe"', () => {
  const rows = KITCHEN_LIBRARY.flatMap((g) => g.items || []);
  assert.equal(rows.find((r) => r.typeId === 'BLIND_BASE')?.label, 'Blind corner');
  assert.equal(rows.find((r) => r.typeId === 'BLIND_WALL')?.label, 'Blind corner wall');
  assert.ok(KITCHEN_LIBRARY.find((g) => g.id === 'base-units').items.some((r) => r.typeId === 'BLIND_BASE'));
  assert.ok(KITCHEN_LIBRARY.find((g) => g.id === 'wall-units').items.some((r) => r.typeId === 'BLIND_WALL'));
  assert.ok(getCategory('wardrobe').types.includes('BLIND_WARDROBE'));
  assert.equal(UNIT_TYPES.BLIND_WARDROBE.label, 'Blind corner wardrobe');
});

function blindCorner() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addUnit('BLIND_BASE');
  const a = S().units[0].id;
  S().moveUnit(a, 4000, 0);
  S().addDoors(a);
  S().addUnit('BUD');
  const b = S().units[1].id;
  S().setUnitWall(b, 1);
  S().addDoors(b);
  S().moveUnit(b, 0, 0);
  return { a, b };
}

test('F3 · in the corner: the blank faces it, its width is the arithmetic, the next run lands on the stop', () => {
  const { a, b } = blindCorner();
  assert.equal(U(a).params.blind_side, 'right', 'the corner is on its right');
  const face = 10 + U(b).params.depth + P.doors.gap + U(b).params.front_t;
  assert.equal(U(b).position.x_mm, 10 + U(a).params.depth + P.doors.gap + U(a).params.front_t + P.corner.postMm);
  const gapA = 4000 - (U(a).position.x_mm + U(a).params.width);
  assert.equal(U(a).params.blind_mm, face + P.corner.postMm + P.doors.clearance.corner - gapA);
  const r = S().unitResult(a);
  const blank = r.panels.find((x) => x.role === 'blind_blank');
  assert.equal(blank.w, U(a).params.blind_mm);
  assert.equal(blank.box.x, U(a).params.width - blank.w, 'on the corner side');
  assert.equal(r.panels.find((x) => x.role === 'front').meta.hinge, 'L', 'hinged on the far side');
  // The clearance rulebook measures the leaf against the blank (rule 2), not
  // against the carcass end the blank stands on: nothing to heal.
  const row = S().frontClearances().find((x) => x.unitId === a);
  assert.equal(row.edges.right.kind, 'endPanel');
  assert.equal(row.edges.right.correctionMm, 0);
  assert.equal(S().runChecks().filter((f) => f.check === 2 && f.unitId === a).length, 0);
});

test('F3 · the hand\'s number stays: the automat never takes the override back', () => {
  const { a, b } = blindCorner();
  S().updateUnitParams(a, { blind_mm_own: 480 });
  S().moveUnit(b, 1500, 0);
  S().moveUnit(b, 0, 0);
  assert.equal(U(a).params.blind_mm_own, 480);
  assert.equal(S().unitResult(a).panels.find((x) => x.role === 'blind_blank').w, 480);
});

test('F3 · the clearance view hands the rulebook the blank as a rigid neighbour', () => {
  const p = { ...defaultParamsFor('BLIND_BASE', P), unit_num: '01' };
  const unit = { id: 'u', type: 'BLIND_BASE', params: p, position: { wall: 0, x_mm: 100 } };
  const view = blindClearanceView([{ unit, result: computeCabinet(p, P) }]);
  const v = view.units[0];
  const blank = p.depth + P.front.thickness + P.corner.postMm + P.doors.clearance.corner;
  assert.equal(v.position.x_mm, 100 + blank);
  assert.equal(v.params.width, p.width - blank);
  assert.deepEqual(v.params.end_panels.at(-1), { id: 'blind-blank', side: 'L', thickness: blank });
  assert.equal(view.entries[0].result.panels.some((x) => x.role === 'blind_blank'), false);
});

test('F3 · no divider in the blind part: asked for there, refused in words; added, it goes where the door opens', async () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addUnit('BLIND_WARDROBE');
  const a = S().units[0].id;
  S().moveUnit(a, 0, 0);
  assert.equal(U(a).params.blind_side, 'left');
  const notes = [];
  const { useUiStore } = await import('../src/stores/uiStore.js');
  const before = useUiStore.getState().notify;
  useUiStore.setState({ notify: (m) => { notes.push(m); } });
  try {
    assert.equal(S().addPartition(a, 200), null, 'a divider inside the blind part was placed');
    assert.ok(notes.includes(BLIND_DIVIDER_REFUSAL), 'not refused in words');
  } finally {
    useUiStore.setState({ notify: before });
  }
  const id = S().addPartition(a);
  const x = U(a).params.sections[0].items.find((i) => i.id === id).x_mm;
  const blank = S().unitResult(a).panels.find((p) => p.role === 'blind_blank');
  const blindTo = blank ? blank.box.x + blank.box.w : 0;
  assert.ok(x >= blindTo, `the divider stands at ${x}, inside the blind part (to ${blindTo})`);
  assert.ok(S().setPartitionX(a, id, 50).x >= blindTo, 'the drag went into the blind part');
});

test('F3 · retail: ADD CORNER WARDROBE beside ADD ANOTHER WARDROBE, into the nearest free corner, or refused', () => {
  const opt = readFileSync(`${ROOT}src/retail/design/Options.jsx`, 'utf8');
  const another = opt.indexOf('data-testid="extras-add-wardrobe"');
  const corner = opt.indexOf('data-testid="extras-add-corner-wardrobe"');
  // Beside it, just before it: ADD WALL UNIT keeps its own place just after it (T74 F7).
  assert.ok(another > 0 && corner > 0 && corner < another && another - corner < 1500, 'the button is not beside ADD ANOTHER WARDROBE');
  assert.match(opt, />\s*ADD CORNER WARDROBE\s*</);
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  A.addFirstWardrobe();
  const placed = [];
  for (let k = 0; k < 4; k += 1) placed.push(A.addCornerWardrobe());
  assert.equal(placed.filter((r) => r.id).length, 3, 'four corners, one already taken by the first wardrobe');
  assert.match(placed[3].said, /no free corner/);
  const blind = S().units.filter((u) => u.type === 'BLIND_WARDROBE');
  assert.equal(blind.length, 3);
  // None was dropped into another's corner square: no overlaps, every one in a corner.
  assert.equal(S().runChecks().filter((f) => /overlap/i.test(f.message || '')).length, 0);
});

test('F3 · three goldens of their own, byte for byte', () => {
  for (const [file, type] of [
    ['golden-blind-base.json', 'BLIND_BASE'], ['golden-blind-wall.json', 'BLIND_WALL'], ['golden-blind-wardrobe.json', 'BLIND_WARDROBE'],
  ]) {
    const g = JSON.parse(readFileSync(`${ROOT}fixtures/${file}`, 'utf8'));
    assert.equal(g.params.type, type);
    assert.deepEqual(goldenOf(g.params, P), g.expected, `${file} moved`);
  }
});
