// ─── TURN 40 (CLAUDE.md F1): THE SPLIT-DOOR HINGE CHAIN ─────────────────────
//
// The owner, 18.08.2026: *"jak wstawiam split doors, to zawiasy chyba nie mają
// żadnej logiki… w modalu doors nie można ich przesuwać, nie widzą półek, nie
// są podzielone na top i bottom"* and *"te zawiasy widzą clash ale nie w tym
// miejscu w którym się pokazują, tylko jakby w starym miejscu przed
// podzieleniem na top i bottom."*
//
// CLAUDE.md orders an INVESTIGATION first. It is written up in the header of
// `src/engine/hingeLadder.js` and in the commit body; these are the asserts
// that hold each of its four findings in place, and the two the feature is
// judged on:
//
//   · a split wardrobe door produces the LEAF-CORRECT hinge counts;
//   · moving a top-leaf hinge does not move a bottom-leaf hinge;
//   · the check's reported y equals the DRAWN y, for both leaves.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { splitDoorHingeCount, splitSegmentHingeRows } from '../src/engine/splitDoors.js';
import {
  doorHingeRows, drilledHingeRows, hasOwnHingeRows, hingeRowOwner, hingedDoorLadders,
  isHingedFront,
} from '../src/engine/hingeLadder.js';
import { shelfHingeClashes, shelfHingeClashWindowMm } from '../src/engine/shelfHingeClash.js';
import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();

const wardrobe = (over = {}) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P), unit_num: '01', height: 2150, width: 900, doors: true, ...over,
}, P);

const fronts = (r) => r.panels.filter((p) => p.part === 'FRONT' && p.role === 'front');
const segs = (r) => fronts(r).filter((p) => p.meta?.split);

// ═══ 1. THE FIRST FINDING: THE ENGINE ALREADY CUTS TWO DOORS ════════════════
//
// T36-F6 landed this and it is correct. The fault is downstream of it, and a
// feature that "fixed" the engine here would have been the wrong repair.

test('F1.1 — a split leaf is TWO panels, each with its own ladder', () => {
  const r = wardrobe({ split_top_mm: 600 });
  const two = segs(r);
  assert.equal(two.length, 4, 'two leaves, two segments each');
  for (const p of two) {
    assert.ok(Array.isArray(p.meta.cupY) && p.meta.cupY.length, `${p.id} has its own cup ladder`);
    assert.ok(Array.isArray(p.meta.plateY) && p.meta.plateY.length, `${p.id} has its own plate ladder`);
    assert.equal(p.meta.cupY.length, p.meta.plateY.length);
  }
});

test('F1.2 — the counts are the LEAF’s own, per the kit’s published table', () => {
  const r = wardrobe({ split_top_mm: 600 });
  const top = segs(r).find((p) => p.id === '01-FL-T');
  const bottom = segs(r).find((p) => p.id === '01-FL-B');
  // The opening is the leaf's own cut height; TOP is what the owner typed and
  // BOTTOM is what is left after the 3 mm gap.
  assert.equal(top.h, 600);
  assert.equal(bottom.h, 1544);
  assert.equal(top.meta.cupY.length, splitDoorHingeCount(600), '600 mm leaf → the table’s count');
  assert.equal(bottom.meta.cupY.length, splitDoorHingeCount(1544), '1544 mm leaf → the table’s count');
  assert.equal(top.meta.cupY.length, 2);
  assert.equal(bottom.meta.cupY.length, 3);
  // …and NEVER the whole door's count halved: six hinges over 2147 is what the
  // undivided leaf takes, and 2 + 3 is not 6 / 2 either way round.
  const whole = wardrobe().drillSummary.hinge_centers.length;
  assert.equal(whole, 6);
  assert.notEqual(top.meta.cupY.length + bottom.meta.cupY.length, whole);
  // Each ladder is the standard law run for ITS OWN height.
  assert.deepEqual(top.meta.cupY, splitSegmentHingeRows(600, 2, P.hinges.endOffset));
  assert.deepEqual(bottom.meta.cupY, splitSegmentHingeRows(1544, 3, P.hinges.endOffset));
});

// ═══ 2. THE THIRD FINDING: hinge_centers IS THE PRE-SPLIT LIST ══════════════

test('F1.3 — `hinge_centers` is the WHOLE-DOOR ladder even after a split', () => {
  const plain = wardrobe();
  const split = wardrobe({ split_top_mm: 600 });
  // T36 left it deliberately ("the old key is untouched") — which is exactly
  // why every reader that only knew that key printed a door that is gone.
  assert.deepEqual(split.drillSummary.hinge_centers, plain.drillSummary.hinge_centers);
  // …and the rows the machine actually bores are NOT those.
  assert.notDeepEqual(drilledHingeRows(split), split.drillSummary.hinge_centers);
  assert.deepEqual(drilledHingeRows(split), [100, 772, 1444, 1647, 2047]);
});

test('F1.4 — the ONE reader answers per door, and per cabinet where nothing split', () => {
  const plain = wardrobe();
  const split = wardrobe({ split_top_mm: 600 });

  assert.equal(isHingedFront(fronts(plain)[0]), true);
  assert.equal(isHingedFront({ part: 'SHELF' }), false);

  // A cabinet with no split: every door reads the cabinet's ladder, and the
  // drilled set IS `hinge_centers` — the byte-identity of every reader that
  // swapped to it tonight.
  for (const l of hingedDoorLadders(plain)) {
    assert.deepEqual(l.rows, plain.drillSummary.hinge_centers);
    assert.equal(hasOwnHingeRows(plain, l.panelId), false);
    assert.equal(l.split, null);
  }
  assert.deepEqual(drilledHingeRows(plain), plain.drillSummary.hinge_centers);

  // A split cabinet: each segment reads its own.
  assert.deepEqual(doorHingeRows(split, '01-FL-T'), [1647, 2047]);
  assert.deepEqual(doorHingeRows(split, '01-FL-B'), [100, 772, 1444]);
  assert.equal(hasOwnHingeRows(split, '01-FL-T'), true);

  // And a row names the leaf it is screwed to, plus that leaf's own index.
  assert.deepEqual(hingeRowOwner(split, 772), { panelId: '01-FL-B', hingeIndex: 1, split: 'bottom' });
  assert.deepEqual(hingeRowOwner(split, 2047), { panelId: '01-FL-T', hingeIndex: 1, split: 'top' });
  // On a whole door the answer is the leaf whose span contains it — which is
  // the answer `shelfHingeClashes` gave before tonight, unchanged.
  assert.equal(hingeRowOwner(plain, 880).panelId, '01-FL');
  assert.equal(hingeRowOwner(plain, 880).hingeIndex, 2);
});

// ═══ 3. THE FOURTH FINDING: A DIFFERENT READER, NOT A STALE CACHE ═══════════
//
// T37/T38-F1a was an in-memory MEMO in the UI and a reload cleared it. This is
// measured from node with no UI at all, so a reload is not even a variable:
// the numbers below are what `computeCabinet()` itself returns.

test('F1.5 — HINGES SEE SHELVES: the clash the pre-split reader could not see', () => {
  const windowMm = shelfHingeClashWindowMm(P);
  const r = wardrobe({
    split_top_mm: 600,
    sections: [{ items: [{ id: 'sh1', kind: 'shelf', pos_mm: 780 }] }],
  });
  // A real hinge at 772 and a shelf row at 780 — 8 mm apart, well inside the
  // window. The pre-split list has nothing nearer than 100 mm, which is why
  // this fault was invisible.
  assert.ok(8 < windowMm);
  assert.ok(r.drillSummary.hinge_centers.every((y) => Math.abs(y - 780) >= windowMm),
    'the OLD reader saw no clash here at all');
  const found = shelfHingeClashes({ result: r, profile: P });
  assert.equal(found.length, 1);
  assert.equal(found[0].hingeY, 772);
  assert.equal(found[0].doorPanelId, '01-FL-B');
  assert.equal(found[0].splitSegment, 'bottom');
  assert.equal(found[0].hingeIndex, 1, 'the index inside THAT leaf’s own run');
});

test('F1.6 — …and no longer reports one where no hinge is', () => {
  // 880 is a row of the ladder the split replaced. A shelf beside it used to
  // be reported against a hinge that is not drilled anywhere on this cabinet.
  const r = wardrobe({
    split_top_mm: 600,
    sections: [{ items: [{ id: 'sh1', kind: 'shelf', pos_mm: 900 }] }],
  });
  assert.ok(r.drillSummary.hinge_centers.includes(880), 'the phantom row is still in the old key');
  assert.equal(drilledHingeRows(r).includes(880), false, 'and nothing is bored there');
  assert.deepEqual(shelfHingeClashes({ result: r, profile: P }), []);
});

test('F1.7 — THE CHECK’S y IS THE DRAWN y, for BOTH leaves', () => {
  // One shelf beside a BOTTOM-leaf hinge and one beside a TOP-leaf hinge, in
  // the same cabinet. Every reported y must be a y a segment is drilled at.
  const r = wardrobe({
    split_top_mm: 600,
    sections: [{ items: [
      { id: 'sh1', kind: 'shelf', pos_mm: 1470 },
      { id: 'sh2', kind: 'shelf', pos_mm: 1680 },
    ] }],
  });
  const found = shelfHingeClashes({ result: r, profile: P });
  assert.ok(found.length >= 2, `both leaves report: ${JSON.stringify(found.map((c) => c.hingeY))}`);
  const drawn = new Map(segs(r).map((p) => [p.id, p.meta.plateY]));
  for (const c of found) {
    assert.ok(drawn.has(c.doorPanelId), `${c.doorPanelId} is a drawn segment`);
    assert.ok(drawn.get(c.doorPanelId).some((y) => Math.abs(y - c.hingeY) < 0.5),
      `${c.hingeY} is a row ${c.doorPanelId} is actually drilled at`);
    assert.equal(drawn.get(c.doorPanelId)[c.hingeIndex], c.hingeY,
      'and the INDEX picks that same row out of that leaf’s own list');
  }
  assert.ok(found.some((c) => c.splitSegment === 'bottom'));
  assert.ok(found.some((c) => c.splitSegment === 'top'));
});

// ═══ 4. THE FIX'S OTHER HALF: MOVABLE, PER LEAF ═════════════════════════════

test('F1.8 — the engine takes a per-SEGMENT ladder on the override channel', () => {
  const said = wardrobe({ split_top_mm: 600, split_hinge_rows: { '01-FL-T': [1700, 2047] } });
  const at = (id) => segs(said).find((p) => p.id === id);
  assert.deepEqual(at('01-FL-T').meta.plateY, [1700, 2047], 'the leaf that was told');
  assert.deepEqual(at('01-FL-B').meta.plateY, [100, 772, 1444], 'the leaf below it does NOT move');
  assert.deepEqual(at('01-FR-T').meta.plateY, [1647, 2047], 'nor the other leaf’s top');
  // The cup ladder is the same number in the SEGMENT's own frame — one
  // derivation, so a picture and a sheet cannot disagree.
  assert.deepEqual(at('01-FL-T').meta.cupY, [1700 - at('01-FL-T').box.y, 2047 - at('01-FL-T').box.y]);
  // Say nothing and the kit answers exactly as it did in T36.
  assert.deepEqual(segs(wardrobe({ split_top_mm: 600 })).map((p) => p.meta.plateY),
    [[1647, 2047], [100, 772, 1444], [1647, 2047], [100, 772, 1444]]);
});

test('F1.9 — a hand-added hinge on one leaf is BOUGHT and BORED', () => {
  const plain = wardrobe({ split_top_mm: 600 });
  const more = wardrobe({ split_top_mm: 600, split_hinge_rows: { '01-FL-T': [1647, 1850, 2047] } });
  assert.equal(more.totals.hinges, plain.totals.hinges + 1, 'the BOM buys the one that was added');
  const rec = more.assemblies.splitDoors.find((d) => d.leaf === '01-FL');
  assert.equal(rec.segments.find((s) => s.id === 'T').hinges, 3, 'and the published record says 3');
  const cups = more.drills.filter((d) => d.panel === '01-FL-T' && d.kind === 'cup');
  assert.equal(cups.length, 3, 'and the machine bores three cups in that leaf');
});

// ═══ 5. THE DOORS MODAL, THROUGH THE STORE IT READS ═════════════════════════

function splitProject() {
  store().loadProject({
    id: null, name: 't40-f1', room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }), design: {},
  }, []);
  const { id } = store().addUnit('WARDROBE');
  store().updateUnitParams(id, {
    width: 900, height: 2150, doors: true, split_top_mm: 600,
  });
  // The store numbers its own cabinets, so the segment ids are read off the
  // result rather than typed — a test that hardcoded `01-FL-T` would be
  // asserting the numbering scheme and not the feature.
  const unit = store().units.find((u) => u.id === id);
  const num = unit.params.unit_num;
  return {
    id, num, T: `${num}-FL-T`, B: `${num}-FL-B`, RT: `${num}-FR-T`, whole: `${num}-FL`,
  };
}

/** The kit's own answer for one segment of this project's split wardrobe. */
function kitRows(job, panelId) {
  const unit = store().units.find((u) => u.id === job.id);
  const bare = { ...unit.params, split_hinge_rows: null };
  const r = computeCabinet(paramsForEngine({ ...unit, params: bare }), P);
  return r.panels.find((p) => p.id === panelId).meta.plateY;
}

test('F1.10 — the modal’s reader offers the SEGMENT’s rows, not the cabinet’s', () => {
  const job = splitProject();
  const cabinet = store().hingeRowsOf(job.id);
  assert.equal(cabinet.length, 6, 'asked about the cabinet: the whole-door ladder, as ever');
  const top = store().hingeRowsOf(job.id, job.T);
  const bottom = store().hingeRowsOf(job.id, job.B);
  assert.equal(top.length, 2, `the top leaf’s own two: ${JSON.stringify(top)}`);
  assert.equal(bottom.length, 3, `the bottom leaf’s own three: ${JSON.stringify(bottom)}`);
  assert.notDeepEqual(top, cabinet);
  assert.deepEqual(top, kitRows(job, job.T));
  // A door id that is not a split leaf still answers with the cabinet's.
  assert.deepEqual(store().hingeRowsOf(job.id, job.whole), cabinet);
});

test('F1.11 — MOVING A TOP-LEAF HINGE DOES NOT MOVE A BOTTOM-LEAF HINGE', () => {
  const job = splitProject();
  const before = store().hingeRowsOf(job.id, job.B);
  const otherLeaf = store().hingeRowsOf(job.id, job.RT);
  const wasTop = store().hingeRowsOf(job.id, job.T);
  const landed = store().setHingePos(job.id, 0, 1700, job.T);
  assert.equal(landed, 1700, `it moved and said so: ${JSON.stringify(landed)}`);
  assert.deepEqual(store().hingeRowsOf(job.id, job.T), [1700, wasTop[1]]);
  assert.deepEqual(store().hingeRowsOf(job.id, job.B), before, 'the leaf below is exactly where it was');
  assert.deepEqual(store().hingeRowsOf(job.id, job.RT), otherLeaf, 'and so is the other leaf');
  // It is stored on the SEGMENT's key, and the cabinet's own list is untouched.
  const unit = store().units.find((u) => u.id === job.id);
  assert.deepEqual(Object.keys(unit.params.split_hinge_rows), [job.T]);
  assert.equal(unit.params.hinge_rows ?? null, null);
});

test('F1.12 — a hinge cannot be typed off its own leaf, and Reset hands it back', () => {
  const job = splitProject();
  const kit = kitRows(job, job.T);
  // The TOP leaf stands high up the carcass: 400 is on the bottom leaf's board.
  const foot = store().splitHingeTargetOf(job.id, job.T).from;
  assert.ok(foot > 400, 'the top leaf really does begin above 400');
  store().setHingePos(job.id, 0, 400, job.T);
  const [low] = store().hingeRowsOf(job.id, job.T);
  assert.ok(low >= foot, `clamped to its own leaf, not to the carcass: ${low}`);

  store().resetHinges(job.id, job.T);
  assert.deepEqual(store().hingeRowsOf(job.id, job.T), kit, 'the kit’s ladder answers again');
  const unit = store().units.find((u) => u.id === job.id);
  assert.equal(unit.params.split_hinge_rows ?? null, null, 'and the key is gone, not left empty');
});

test('F1.13 — add and remove act on the leaf they were asked about', () => {
  const job = splitProject();
  store().addHinge(job.id, job.B);
  assert.equal(store().hingeRowsOf(job.id, job.B).length, 4);
  assert.equal(store().hingeRowsOf(job.id, job.T).length, 2, 'the other leaf is untouched');
  store().removeHinge(job.id, 0, job.B);
  assert.equal(store().hingeRowsOf(job.id, job.B).length, 3);
  // And the whole-cabinet path still writes the whole-cabinet list.
  store().removeHinge(job.id, 0);
  const unit = store().units.find((u) => u.id === job.id);
  assert.equal(unit.params.hinge_rows.length, 5);
});

test('F1.14 — the store’s answer and the engine’s are the same list', () => {
  const job = splitProject();
  store().setHingePos(job.id, 0, 1700, job.T);
  const unit = store().units.find((u) => u.id === job.id);
  const r = computeCabinet(paramsForEngine(unit), P);
  const panel = r.panels.find((p) => p.id === job.T);
  assert.deepEqual(panel.meta.plateY, store().hingeRowsOf(job.id, job.T));
});

// ═══ 6. AND THE SIX STANDARD CONFIGS DO NOT MOVE ════════════════════════════

test('F1.15 — a bare computeCabinet is handed no channel and cuts what it cut', () => {
  const bare = computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: '01' }, P);
  assert.equal(bare.assemblies.splitDoors, undefined, 'nothing splits');
  assert.equal(bare.drillSummary.hinge_rows_by_panel && Object.keys(bare.drillSummary.hinge_rows_by_panel).length, 0);
  assert.deepEqual(drilledHingeRows(bare), bare.drillSummary.hinge_centers);
  // The channel is inert when nobody says anything on it — including when the
  // key is present but empty, which is what a project that has reset every
  // leaf saves.
  const empty = computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: '01', split_hinge_rows: {} }, P);
  assert.equal(JSON.stringify(empty), JSON.stringify(bare));
});
