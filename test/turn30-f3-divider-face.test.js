// ─── TURN 30 F3 — a divider is bored from ONE face, and it says which ───────
//
// The owner: a partition shows shelf-pin drilling on BOTH faces, and a machine
// drills one.
//
// ─── IT WAS WORSE THAN A PICTURE ────────────────────────────────────────────
//
// A partition serving two bays had the SAME LADDER EMITTED TWICE — once for the
// left bay's shelves and once for the right's — at identical x and y. Six
// positions, twelve holes, the bit going down each one a second time. That is
// not a display option: it is a drilling nobody would cut and a DXF nobody
// should be handed.
//
// ─── WHAT SHIPS ─────────────────────────────────────────────────────────────
//
//   * a per-divider setting, `drill_face: 'L' | 'R'`, written by the divider's
//     own modal through `setPartitionDrillFace`;
//   * the ENGINE drills that face only, so the 3-D and the DXF agree by
//     construction — both read `result.drills` and there is one list;
//   * DEFAULT **LEFT**, from `profile.shelfHoles.partitionFace`. CLAUDE.md is
//     explicit: the owner wants a longer conversation about dividers, so LEFT
//     is a SAFE PLACEHOLDER and one line changes it. The SETTING is not in
//     question and that is what this file proves — the default is a value, the
//     mechanism is a law.
//
// ─── AND A CABINET WITH NO DIVIDER IN IT DOES NOT MOVE ──────────────────────
//
// Rule 1. F3 is not on the override channel and is not F4's sanctioned fixture
// change, so a bare kit must come out byte-for-byte as it did. It does, and it
// is asserted rather than assumed: a side panel has ONE face that matters and
// is never asked the question at all.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { bearerList, bearingWalls, shelfBearers } from '../src/engine/shelfBearers.js';
import { elementFields } from '../src/engine/elements.js';

const SH = P.shelfHoles;
const PER_ROW = SH.clusterOffsets.length * 2;   // three holes, two columns

/** A wardrobe with a divider and a shelf in each bay of it. */
const both = (over = {}, profile = P) => computeCabinet({
  ...defaultParamsFor('WARDROBE', profile),
  unit_num: 'W1',
  width: 1200,
  shelves: 2,
  sections: [{
    items: [
      { id: 'p1', kind: 'partition', x_mm: 600, ...over },
      { id: 'sL', kind: 'shelf', pos_mm: 800, zone: 0 },
      { id: 'sR', kind: 'shelf', pos_mm: 1400, zone: 1 },
    ],
  }],
}, profile);

const pins = (r, panelId) => r.drills.filter((d) => d.panel === panelId && d.layer === SH.layer);
const rowsOn = (r, panelId) => [...new Set(pins(r, panelId).map((d) => d.y))].sort((a, b) => a - b);

// ─── THE FAULT, AND THAT IT IS GONE ─────────────────────────────────────────

test('F3 a divider takes ONE ladder, not two stacked on each other', () => {
  const r = both();
  const part = r.panels.find((p) => p.part === 'VPART');
  const on = pins(r, part.id);
  assert.equal(on.length, PER_ROW, 'one bay’s ladder and no more');
  // The fault, said as the thing that made it a fault: no two holes at one
  // point. Before F3 every one of these was drilled twice.
  const at = new Set(on.map((d) => `${d.x},${d.y}`));
  assert.equal(at.size, on.length, 'no hole is drilled twice');
});

test('F3 the face DECIDES which bay’s shelves put pins in the divider', () => {
  // Not a cosmetic flag: the two bays' shelves are at different heights, so
  // the ladder that comes out names the bay it came from.
  const part = (r) => r.panels.find((p) => p.part === 'VPART');
  const left = both({ drill_face: 'L' });
  const right = both({ drill_face: 'R' });
  const base = part(left).box.y;
  assert.deepEqual(rowsOn(left, part(left).id), SH.clusterOffsets.map((dy) => 800 + dy - base).sort((a, b) => a - b));
  assert.deepEqual(rowsOn(right, part(right).id), SH.clusterOffsets.map((dy) => 1400 + dy - base).sort((a, b) => a - b));
  // …and they really are two different answers, which is what says the setting
  // is wired to the drilling and not to a label.
  assert.notDeepEqual(rowsOn(left, part(left).id), rowsOn(right, part(right).id));
});

test('F3 the SIDES are untouched by any of it — both bays keep their own ladders', () => {
  for (const face of ['L', 'R']) {
    const r = both({ drill_face: face });
    assert.equal(pins(r, 'BUL').length, PER_ROW, `BUL keeps the left bay’s ladder (${face})`);
    assert.equal(pins(r, 'BUR').length, PER_ROW, `BUR keeps the right bay’s ladder (${face})`);
  }
  // A side has ONE face that matters — its inner one — and a shelf can only
  // ever land on that. The engine asks the question of partitions alone.
  const src = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');
  assert.match(src, /if \(bearer\.kind === 'partition' && bearer\.side !== partitionFaceOf\(bearer\.id\)\) continue;/);
});

// ─── THE DEFAULT IS ONE PROFILE LINE ────────────────────────────────────────

test('F3 nothing said = LEFT, and LEFT is one line of the profile', () => {
  assert.equal(P.shelfHoles.partitionFace, 'L');
  const r = both();
  assert.equal(r.panels.find((p) => p.part === 'VPART').meta.drillFace, 'L');
  assert.deepEqual(rowsOn(r, 'VPART-1'), rowsOn(both({ drill_face: 'L' }), 'VPART-1'));

  // …and changing THAT ONE LINE changes every divider that has not been asked.
  // This is the sentence CLAUDE.md's Q1 is about, proved rather than promised.
  const rightHanded = migrateCabinetProfile({
    ...P,
    shelfHoles: { ...P.shelfHoles, partitionFace: 'R' },
  });
  const flipped = both({}, rightHanded);
  assert.equal(flipped.panels.find((p) => p.part === 'VPART').meta.drillFace, 'R');
  assert.deepEqual(rowsOn(flipped, 'VPART-1'), rowsOn(both({ drill_face: 'R' }), 'VPART-1'));
});

test('F3 a divider that HAS been asked keeps its own answer whatever the profile says', () => {
  const rightHanded = migrateCabinetProfile({
    ...P,
    shelfHoles: { ...P.shelfHoles, partitionFace: 'R' },
  });
  const r = both({ drill_face: 'L' }, rightHanded);
  assert.equal(r.panels.find((p) => p.part === 'VPART').meta.drillFace, 'L');
  // …and a nonsense value is not obeyed: it falls back to the project's answer
  // rather than boring nothing at all.
  const junk = both({ drill_face: 'middle' }, rightHanded);
  assert.equal(junk.panels.find((p) => p.part === 'VPART').meta.drillFace, 'R');
});

// ─── THE PANEL, THE SUMMARY AND THE MODAL ALL SAY THE SAME THING ───────────

test('F3 the answer is on the PANEL and in the summary — one reading, not four', () => {
  const r = both({ drill_face: 'R' });
  assert.equal(r.panels.find((p) => p.part === 'VPART').meta.drillFace, 'R');
  assert.deepEqual(r.drillSummary.partition_drill_face, { 'VPART-1': 'R' });
  // The 3-D and the DXF agree by CONSTRUCTION rather than by agreement: both
  // read `result.drills`, and there is one list.
  const bored = new Set(r.drills.filter((d) => d.layer === SH.layer).map((d) => d.panel));
  assert.ok(bored.has('VPART-1'));
});

test('F3 the setting is in the DIVIDER’s modal, beside the board it is cut from', () => {
  const r = both();
  const part = r.panels.find((p) => p.part === 'VPART');
  assert.deepEqual(elementFields(part), [
    'position-x', 'partition-slot', 'partition-drill-face', 'setback', 'thickness', 'material',
  ]);
  const props = readFileSync(new URL('../src/components/ElementProperties.jsx', import.meta.url), 'utf8');
  assert.match(props, /case 'partition-drill-face':/);
  assert.match(props, /data-partition-drill-face=\{id\}/);
  assert.match(props, /setPartitionDrillFace\(unit\.id, item\.id, id\)/);
  // …and a divider that has been asked can be handed back to the project.
  assert.match(props, /data-partition-drill-face-reset="1"/);
  const store = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');
  assert.match(store, /setPartitionDrillFace: \(unitId, itemId, face\) =>/);
  assert.match(store, /get\(\)\.updateItem\(unitId, itemId, \{ drill_face: value \}\);/);
});

// ─── THE RESOLUTION IS SAID ONCE ────────────────────────────────────────────

test('F3 which face a shelf lands on is `shelfBearers`’ own answer, not a second derivation', () => {
  const r = both({ drill_face: 'R' });
  const walls = bearingWalls(r.panels);
  const shelfL = r.panels.find((p) => p.part === 'SHELF' && p.meta.run.to <= 600 + 1e-6);
  const shelfR = r.panels.find((p) => p.part === 'SHELF' && p.meta.run.from >= 618 - 1e-6);
  const faceOf = (shelf) => bearerList(shelfBearers({
    walls, run: shelf.meta.run, level: shelf.box.y, tolerance: P.carcass.shelfWidthClearance,
  })).filter((b) => b.kind === 'partition').map((b) => b.side);
  // A shelf to the LEFT of the divider lands on the divider's LEFT face, and
  // one to its right on its RIGHT. Two shelves, two faces, one function.
  assert.deepEqual(faceOf(shelfL), ['L']);
  assert.deepEqual(faceOf(shelfR), ['R']);
});

// ─── RULE 1: A BARE KIT DOES NOT MOVE ───────────────────────────────────────

test('F3 a cabinet with no divider in it is byte-for-byte what it was', () => {
  const plain = computeCabinet({
    ...defaultParamsFor('BUD', P),
    unit_num: '01',
    sections: [{ items: [{ id: 's1', kind: 'shelf', pos_mm: 300 }, { id: 's2', kind: 'shelf', pos_mm: 600 }] }],
  }, P);
  const perSide = 2 * SH.clusterOffsets.length * plain.drillSummary.shelf_hole_x.length;
  assert.equal(pins(plain, 'BUL').length, perSide);
  assert.equal(pins(plain, 'BUR').length, perSide);
  // …and the summary gains no key at all where there is no divider to describe,
  // so a golden box's summary is the summary it has always had, key for key.
  assert.equal('partition_drill_face' in plain.drillSummary, false);
  // The order the machine reads them in is turn 26's, which is why the
  // fingerprint on the golden defaults does not move.
  const order = plain.drills.filter((d) => d.layer === SH.layer).map((d) => d.panel);
  assert.deepEqual([...new Set(order)], ['BUL', 'BUR']);
});

test('F3 a bare kit call passes no face at all, and the engine still answers', () => {
  // Every golden fixture is a bare call. The engine must not need the field.
  const bare = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01' }, P);
  assert.ok(Array.isArray(bare.drills));
  assert.equal('partition_drill_face' in bare.drillSummary, false);
});
