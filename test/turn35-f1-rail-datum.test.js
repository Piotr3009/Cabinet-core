// ─── Turn 35, CLAUDE.md F1: THE RAIL'S OWN DATUM ───────────────────────────
//
// The owner's biggest complaint of 16.08: *"nie mogę ustawić wysokości raila —
// sam się wstawia, i jak edytuję dwuklikiem, to nie ma opcji ustawienia
// wysokości."* And the law: *"drążek ustawiamy zawsze od najbliższej czegoś od
// dołu — albo od szuflad, albo od półek. Jeśli napiszę 900, to niech będzie od
// półki, chyba że nic nie ma — to wtedy od dna."*
//
// Five things have to be true together, and the spec names all five: the
// support resolves (drawers vs shelf vs floor, the highest wins), his own
// 900-above-a-shelf comes out at the shelf, the base is LIVE, a legacy rail
// derives a number that renders the SAME scene, and the fault above fires red
// and clears.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { CHECKS, railClearanceMm, runChecks } from '../src/engine/checks.js';
import {
  RAIL_DATUM, railDatumFor, railObstruction, railSupportTops, resolveRailAxis,
} from '../src/engine/railDatum.js';
import { elementFields, elementKind, elementLabel } from '../src/engine/elements.js';

// ─── the pure law ───────────────────────────────────────────────────────────

const bay = (opts) => railSupportTops({ floor: 18, ceiling: 2132, ...opts });

test('F1 the support resolves: drawers, a shelf, or the floor — and it is NAMED', () => {
  // Nothing in the bay. "chyba że nic nie ma — to wtedy od dna."
  const bare = resolveRailAxis({ supports: bay({}), offset: 900, ceiling: 2132 });
  assert.equal(bare.support, 18, 'the bay floor');
  assert.equal(bare.datum.kind, RAIL_DATUM.FLOOR);
  assert.equal(bare.axis, 918);

  // A drawer stack and nothing else — the LISP's own law, and it holds with no
  // datum said at all, which is what makes every old project render unmoved.
  const drawers = resolveRailAxis({ supports: bay({ stackTop: 444 }), offset: 900, ceiling: 2132 });
  assert.equal(drawers.support, 444, 'the drawer stack’s closing partition');
  assert.equal(drawers.datum.kind, RAIL_DATUM.DRAWERS);
  assert.equal(drawers.axis, 1344);

  // …and a shelf is only ever the datum when the rail SAYS so.
  const supports = bay({ stackTop: 444, shelves: [{ id: 's1', top: 918 }] });
  const silent = resolveRailAxis({ supports, offset: 900, ceiling: 2132 });
  assert.equal(silent.support, 444, 'nothing said → the old law, unchanged');
  const said = resolveRailAxis({
    supports, datum: { kind: RAIL_DATUM.SHELF, id: 's1' }, offset: 900, ceiling: 2132,
  });
  assert.equal(said.support, 918, 'the shelf — "niech będzie od półki"');
  assert.equal(said.axis, 1818);
});

test('F1 the ambiguity the datum exists to kill: 764 has TWO honest answers', () => {
  // Drawer stack at 444, shelf at 1306. "The highest support below the axis"
  // is satisfied by 444 → 1208 AND by 1306 → 2070. No function of the number
  // alone can choose; the rail says which, and says it once.
  const supports = bay({ stackTop: 444, shelves: [{ id: 'hi', top: 1306 }] });
  const under = resolveRailAxis({ supports, datum: { kind: RAIL_DATUM.DRAWERS }, offset: 764, ceiling: 2132 });
  const over = resolveRailAxis({ supports, datum: { kind: RAIL_DATUM.SHELF, id: 'hi' }, offset: 764, ceiling: 2132 });
  assert.equal(under.axis, 1208, 'hung in the space UNDER the shelf');
  assert.equal(over.axis, 2070, 'hung above it');
  assert.notEqual(under.axis, over.axis, 'and they are genuinely different rails');
});

test('F1 a datum naming a shelf that has been TAKEN OUT falls back, it does not guess', () => {
  const supports = bay({ stackTop: 444 });          // the shelf is gone
  const r = resolveRailAxis({
    supports, datum: { kind: RAIL_DATUM.SHELF, id: 'deleted' }, offset: 900, ceiling: 2132,
  });
  assert.equal(r.support, 444, 'the old law, which is always an answer');
  assert.equal(r.datum.kind, RAIL_DATUM.DRAWERS);
});

test('F1 railDatumFor answers the sentence at the one moment it is answerable', () => {
  const supports = bay({ stackTop: 444, shelves: [{ id: 's1', top: 918 }, { id: 's2', top: 1306 }] });
  // The rod is at 1208. The highest thing under it is the shelf at 918.
  const a = railDatumFor({ supports, axis: 1208 });
  assert.deepEqual(a.datum, { kind: RAIL_DATUM.SHELF, id: 's1' });
  assert.equal(a.offset, 290);
  // At 600 it is the drawer stack.
  const b = railDatumFor({ supports, axis: 600 });
  assert.deepEqual(b.datum, { kind: RAIL_DATUM.DRAWERS, id: null });
  assert.equal(b.offset, 156);
  // Low down it is the floor, and never something above it.
  const c = railDatumFor({ supports, axis: 300 });
  assert.equal(c.datum.kind, RAIL_DATUM.FLOOR);
  assert.equal(c.offset, 282);
});

test('F1 the pair railDatumFor returns ROUND-TRIPS — the rod does not move', () => {
  const supports = bay({ stackTop: 444, shelves: [{ id: 's1', top: 918 }, { id: 's2', top: 1306 }] });
  for (const axis of [200, 444.5, 600, 919, 1208, 1400, 1700, 2000]) {
    const { datum, offset } = railDatumFor({ supports, axis });
    const back = resolveRailAxis({ supports, datum, offset, ceiling: 2132 });
    assert.equal(back.axis, axis, `a rail at ${axis} moved`);
  }
});

// ─── the base is LIVE ───────────────────────────────────────────────────────

test('F1 the base is live: move the shelf and the rail rides with it, keeping its number', () => {
  const datum = { kind: RAIL_DATUM.SHELF, id: 's1' };
  const before = resolveRailAxis({
    supports: bay({ stackTop: 444, shelves: [{ id: 's1', top: 918 }] }), datum, offset: 900, ceiling: 2132,
  });
  const after = resolveRailAxis({
    supports: bay({ stackTop: 444, shelves: [{ id: 's1', top: 1118 }] }), datum, offset: 900, ceiling: 2132,
  });
  assert.equal(before.support, 918);
  assert.equal(after.support, 1118);
  assert.equal(after.axis - before.axis, 200, 'the rail rode the whole 200');
  assert.equal(after.axis - after.support, 900, 'and its NUMBER never changed');
});

// ─── the engine ────────────────────────────────────────────────────────────

function wardrobe(extra = {}) {
  const params = { ...defaultParamsFor('WARDROBE', P), unit_num: 'W01', ...extra };
  return computeCabinet(params, P);
}

test('F1 a wardrobe with a rail and NO shelf under it is the LISP’s own answer, untouched', () => {
  const r = wardrobe({ rail: true, rail_offset: 1400 });
  // KIT_WARDROBE_FULL L668: `railAbsY = (+ gruboscPlyty railOffset)` with no
  // drawers — the board thickness, then the number.
  assert.equal(r.derived.rail_y, P.board.thickness + 1400);
  assert.equal(r.derived.rail_support_y, P.board.thickness, 'the bay floor');
});

test('F1 …and the kit’s own rail law is quoted where the engine can be held to it', () => {
  const lisp = readFileSync(new URL('../reference/lisp/KIT_WARDROBE_FULL.lsp', import.meta.url), 'utf8');
  assert.match(lisp, /\(setq railAbsY \(\+ wieniecY gruboscPlyty railOffset\)\)/);
  assert.match(lisp, /\(setq railAbsY \(\+ gruboscPlyty railOffset\)\)/);
});

test('F1 his own example: 900 above a shelf, in the engine', () => {
  const G = P.board.thickness;
  const items = [
    { id: 's1', kind: 'shelf', pos_mm: 918 - G },
    { id: 'r1', kind: 'hanger', pos_mm: 900, datum: { kind: RAIL_DATUM.SHELF, id: 's1' } },
  ];
  const r = wardrobe({ rail: true, rail_offset: 900, sections: [{ items }] });
  assert.equal(r.derived.rail_support_y, 918, 'the shelf top, not the floor');
  assert.equal(r.derived.rail_y, 1818);

  // …and the SAME rail with nothing said stays on the old law's answer.
  const silent = wardrobe({
    rail: true,
    rail_offset: 900,
    sections: [{ items: [items[0], { id: 'r1', kind: 'hanger', pos_mm: 900 }] }],
  });
  assert.equal(silent.derived.rail_support_y, G, 'the bay floor — no drawers, no datum');
  assert.equal(silent.derived.rail_y, G + 900);
});

test('F1 a LEGACY rail — no datum anywhere — renders byte-identically', () => {
  // This is the whole migration, and it is that there is not one: a rail that
  // says nothing is read by the line the engine has always used, so a project
  // saved before this turn opens on exactly the scene it was saved on.
  const G = P.board.thickness;
  for (const offset of [200, 900, 1400, 1800]) {
    const legacy = wardrobe({ rail: true, rail_offset: offset });
    assert.equal(legacy.derived.rail_y, G + offset, `a legacy rail at ${offset} moved`);
    const withShelfUnder = wardrobe({
      rail: true,
      rail_offset: offset,
      sections: [{ items: [{ id: 's1', kind: 'shelf', pos_mm: 300 }, { id: 'r1', kind: 'hanger', pos_mm: offset }] }],
    });
    assert.equal(withShelfUnder.derived.rail_y, G + offset,
      'and a shelf appearing under it does not move it either — only a DATUM does');
  }
});

// ─── check #13 ─────────────────────────────────────────────────────────────

test('F1 rule 13 is on the list, it is RED, and the twelve before it are untouched', () => {
  const row = CHECKS.find((c) => c.n === 13);
  assert.ok(row, 'rule 13 exists');
  assert.equal(row.level, 'red');
  assert.equal(row.label, 'Rail × obstacle above');
  assert.equal(CHECKS.filter((c) => c.n <= 12).length, 12);
});

test('F1 the clearance is the rail partitioner’s own 40 — no new number to answer', () => {
  assert.equal(railClearanceMm(P), P.wardrobe.rail.partitionAbove);
  assert.equal(railClearanceMm(null), 40);
});

test('F1 the obstruction is arithmetic, and it says how much is missing', () => {
  assert.deepEqual(railObstruction({ axis: 1000, clearance: 40, ceiling: 2132 }).clash, false);
  const tight = railObstruction({ axis: 2110, clearance: 40, ceiling: 2132 });
  assert.equal(tight.clash, true);
  assert.equal(tight.room, -18, 'eighteen millimetres short');
});

test('F1 the red fires on a rail pushed into the top — and CLEARS when it comes down', () => {
  const unit = { id: 'u1', type: 'WARDROBE', position: { wall: 0, x_mm: 0 }, params: {} };
  const findings = (offset) => {
    const result = wardrobe({ rail: true, rail_offset: offset });
    return runChecks({
      entries: [{ unit: { ...unit, params: result.params }, result }],
      units: [{ ...unit, params: result.params }],
      room: { height: 2500, corners: [] },
      design: {},
      materials: [],
      profile: P,
      wallWidthOf: () => 6000,
    }).filter((f) => f.check === 13);
  };
  const high = findings(2100);
  assert.equal(high.length, 1, 'a rail 2100 above the floor of a 2150 carcass is a fault');
  assert.match(high[0].message, /hanging rail at \d+ needs 40 mm over it/);
  assert.equal(high[0].level, 'red');
  assert.deepEqual(findings(1400), [], 'and at the owner’s own default there is nothing to say');
});

// ─── the modal that did not exist ──────────────────────────────────────────

// ─── RE-PINNED, TURN 42 (CLAUDE.md F1) ─────────────────────────────────────
// T35 gave the rail a modal by keying it on the BOARD 40 mm over the rod,
// because the rod was not a panel and could not be picked. The owner refused
// that board; `case 'RAIL-PART': return 'hanger-rail'` is deleted by name under
// iron rule 3, and the rod is picked as ITSELF now.
//
// What T35 was really after — *"nie mogę ustawić wysokości raila"*, a window
// with the height in it — is unchanged and is asserted where it now lives.
test('F1 the rail’s BOARD is not an element any more, because there is no board', () => {
  assert.equal(elementKind({ part: 'RAIL-PART', role: 'shelf' }), null,
    'nothing maps that part name — the engine cannot emit it');
  // The KIND itself survives, and so does its field list: it is the ROD's kind
  // now rather than a board's, and `rail-height` is still its first question.
  assert.equal(elementLabel({ part: 'SHELF', role: 'shelf' }), 'Shelf', 'the label table still answers');
  assert.ok(elementFields({ part: 'SHELF', role: 'shelf' }).length > 0, 'and the field table with it');

  // And the height is where a joiner reaches it: the rod's own window, opened
  // by a double-click on the tube (`3d/Hardware.jsx` → `openModal('rail')`).
  const modal = readFileSync(new URL('../src/components/RailModal.jsx', import.meta.url), 'utf8');
  assert.match(modal, /Height above support/, 'the question he came to ask, first');
  assert.match(modal, /setRailHeight\(unit\.id, item\.id, v\)/, 'through the one store action');
});

test('F1 the field is wired to the store and names the DATUM, not a floor', () => {
  const src = readFileSync(new URL('../src/components/ElementProperties.jsx', import.meta.url), 'utf8');
  assert.match(src, /case 'rail-height':/);
  assert.match(src, /label="Height above support"/, 'the spec’s own words');
  assert.match(src, /data-rail-height="1"/);
  assert.match(src, /setRailHeight\(unit\.id, railItem\.id, v\)/);
  const store = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');
  assert.match(store, /setRailHeight: \(unitId, itemId, mmRaw\) => \{/);
});
