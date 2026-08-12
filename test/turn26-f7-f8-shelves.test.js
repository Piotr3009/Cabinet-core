// ─── TURN 26 · F7 + F8 — THE SHELF, ON THE SHEET ────────────────────────────
//
// Two of the owner's own production laws, both about the same board.
//
// F7  "**no biscuits on the shelf itself — not even on its ends.**" Twice, and
//     the second time decisively. A fix shelf is an OUTLINE and a LABEL. The
//     joint lives in the BEARERS — biscuit slots in the faces of BUL/BUR and of
//     the partition, ⌀3 through-screws from BUL/BUR only and never through a
//     partition — plus, his own addition, ⌀3 in the BACK on the shelf's axis at
//     the partition's own spacing: ends 50, pitch ≤ 400.
//
// F8  "shelves are laid across the sheet, so the grain runs front-to-back; the
//     edge banding goes on the LONG front edge and must run WITH the grain."
//     Every shelf lies length left-to-right now, the sides' own convention and
//     the one the partition took in turn 24.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { biscuitSets } from '../src/engine/biscuits.js';
import { partitionBackScrewRun, partitionBackSpec } from '../src/engine/partitionFixings.js';
import { panelPlacement } from '../src/engine/joinery.js';
import { sheetTurn } from '../src/engine/cnc/layout.js';

const G = P.board.thickness;

const withItems = (items, extra = {}) => computeCabinet({
  ...defaultParamsFor('BUD', P),
  unit_num: '01',
  width: 600,
  sections: [{ width_mm: 600, items }],
  ...extra,
}, P);

const fixShelf = (extra = {}) => withItems([{
  id: 's1', kind: 'shelf', pos_mm: 300, variant: 'fixed',
}], extra);

const shelfOf = (r) => r.panels.find((p) => p.part === 'SHELF');
const marksOf = (r, id) => (r.panels.find((p) => p.id === id)?.cnc?.marks || []);

// ─── F7.1 — THE SHELF IS A CLEAN RECTANGLE ──────────────────────────────────

test('F7.1 — the fix shelf’s CNC is an OUTLINE and a LABEL, and nothing else', () => {
  const r = fixShelf();
  const shelf = shelfOf(r);
  assert.ok(shelf, 'the cabinet cuts one');
  assert.ok(shelf.meta.locked, '…and it really is the fixed kind');

  // The RED TEST: not one entity of any kind but the outline.
  assert.deepEqual(shelf.cnc.marks || [], [], 'no biscuit marks — not even on its ends');
  assert.deepEqual(shelf.cnc.pockets || [], [], 'no pockets');
  assert.deepEqual(shelf.cnc.holes || [], [], 'no holes on the part record');
  assert.equal(r.drills.filter((d) => d.panel === shelf.id).length, 0, 'and nothing drilled in it');

  // The outline IS a rectangle — four corners, no notch, no relief.
  assert.equal(shelf.cnc.outline.length, 4);
  assert.deepEqual(shelf.cnc.outline, [
    [0, 0], [shelf.h, 0], [shelf.h, shelf.w], [0, shelf.w],
  ]);
});

test('F7.3 — zero ⌀7.5 on a fix shelf OR its bearers (turn 24’s red test, held)', () => {
  const r = fixShelf();
  const shelf = shelfOf(r);
  assert.equal(r.drills.filter((d) => d.layer === P.shelfHoles.layer).length, 0,
    'a shelf that is screwed is not a shelf on pins');
  for (const id of [shelf.id, 'BUL', 'BUR']) {
    assert.equal(r.drills.filter((d) => d.panel === id && d.layer === P.shelfHoles.layer).length, 0, id);
  }
  // (BUL carries ⌀7.5 of its OWN — the puzzle joint's through-dowels, on
  // `PUZZLE_HOLES_7_5MM`. They are a different hole for a different job and the
  // red test is about the pin ladder, which is why it asks the LAYER.)
  // …and an ADJUSTABLE one is the other half of the law: pins, and no joint.
  const adj = withItems([{ id: 's1', kind: 'shelf', pos_mm: 300 }]);
  assert.ok(adj.drills.filter((d) => d.layer === P.shelfHoles.layer).length > 0, 'pins');
  assert.equal(adj.drills.filter((d) => d.kind === 'shelf_screw').length, 0, 'and no screws');
  assert.deepEqual(marksOf(adj, shelfOf(adj).id), []);
  assert.deepEqual(marksOf(adj, 'BUL'), []);
});

// ─── F7.2 — THE JOINT LIVES IN THE BEARERS ──────────────────────────────────

test('F7.2 — biscuit slots in BUL/BUR, and ⌀3 through-screws from there only', () => {
  const r = fixShelf();
  const shelf = shelfOf(r);
  const sets = biscuitSets({ length: shelf.box.d, screws: true, profile: P });
  assert.ok(sets.length >= 2);
  for (const side of ['BUL', 'BUR']) {
    assert.equal(marksOf(r, side).length, sets.length, `${side}: one 70 mm mark per set`);
    for (const m of marksOf(r, side)) assert.equal(m.layer, 'BISCUIT_4MM');
    assert.equal(
      r.drills.filter((d) => d.panel === side && d.kind === 'shelf_screw').length,
      sets.length * 2,
      `${side}: two ⌀3 per set`,
    );
  }
});

test('F7.2 — a PARTITION takes the mark and NEVER a screw', () => {
  const r = withItems([
    { id: 'p1', kind: 'partition', x_mm: 450 },
    {
      id: 's1', kind: 'shelf', pos_mm: 300, zone: 0, variant: 'fixed',
    },
  ]);
  const part = r.panels.find((p) => p.part === 'VPART');
  assert.ok(part);
  assert.ok(marksOf(r, part.id).length > 0, 'it IS set out');
  for (const m of marksOf(r, part.id)) assert.equal(m.layer, 'BISCUIT_4MM');
  assert.equal(r.drills.filter((d) => d.panel === part.id && d.kind === 'shelf_screw').length, 0,
    'a partition serves two bays — a through screw would surface in the neighbour’s face');
  // …and the shelf itself is STILL a bare rectangle beside a partition.
  assert.deepEqual(marksOf(r, shelfOf(r).id), []);
});

test('F7.2 — ⌀3 in the BACK, on the shelf’s axis: ends 50, pitch ≤ 400', () => {
  const r = fixShelf();
  const shelf = shelfOf(r);
  const spec = partitionBackSpec(P);
  const screws = r.drills.filter((d) => d.panel === 'BACK' && d.kind === 'shelf_back_screw');
  assert.ok(screws.length > 0, 'the back holds it');
  for (const s of screws) {
    assert.equal(s.layer, spec.layer, 'the partition’s own layer');
    assert.equal(s.d, spec.diameter, '…and its own ⌀');
  }

  // ONE LAW, ONE FUNCTION. The positions are `partitionBackScrewRun` asked
  // along the shelf's own run — a shelf and a partition are one board doing one
  // job in two directions, and a second spacing rule for the second direction
  // is a second thing to get wrong.
  const run = shelf.meta.run;
  const wanted = partitionBackScrewRun({ from: run.from, to: run.to, profile: P });
  assert.deepEqual(screws.map((s) => s.x).sort((a, b) => a - b), [...wanted].sort((a, b) => a - b));
  // The owner's two numbers, read off the answer: ends at 50, no gap over 400.
  assert.equal(wanted[0] - run.from, P.partitionBack.fromEnd);
  assert.equal(run.to - wanted[wanted.length - 1], P.partitionBack.fromEnd);
  for (let i = 1; i < wanted.length; i += 1) {
    assert.ok(wanted[i] - wanted[i - 1] <= P.partitionBack.maxPitch + 1e-9);
  }

  // …and they are on the SHELF's own axis — its board's centre line.
  const jointY = shelf.box.y + shelf.box.h / 2;
  for (const s of screws) assert.ok(Math.abs(s.y - jointY) < 1e-6, `${s.y} vs ${jointY}`);
});

test('F7.2 — a long shelf grows an intermediate screw; a short one does not', () => {
  const wide = computeCabinet({
    ...defaultParamsFor('BUD', P),
    unit_num: '01',
    width: 1200,
    sections: [{ width_mm: 1200, items: [{ id: 's1', kind: 'shelf', pos_mm: 300, variant: 'fixed' }] }],
  }, P);
  const narrow = computeCabinet({
    ...defaultParamsFor('BUD', P),
    unit_num: '01',
    width: 400,
    sections: [{ width_mm: 400, items: [{ id: 's1', kind: 'shelf', pos_mm: 300, variant: 'fixed' }] }],
  }, P);
  const count = (r) => r.drills.filter((d) => d.panel === 'BACK' && d.kind === 'shelf_back_screw').length;
  assert.ok(count(wide) > count(narrow), `${count(wide)} on 1200, ${count(narrow)} on 400`);
  assert.equal(count(narrow), 2, 'the two end screws and nothing between them');
});

test('R9 — no fix shelf, no joint anywhere: the back is clean again', () => {
  const none = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01' }, P);
  assert.equal(none.drills.filter((d) => d.kind === 'shelf_back_screw').length, 0);
  assert.equal(none.drills.filter((d) => d.kind === 'shelf_screw').length, 0);
  assert.deepEqual(marksOf(none, 'BUL'), []);
  // …add it and it returns, identical.
  const a = fixShelf().drills.filter((d) => d.kind === 'shelf_back_screw');
  const b = fixShelf().drills.filter((d) => d.kind === 'shelf_back_screw');
  assert.deepEqual(b, a);
});

// ─── F8 — THE SHELF LIES ALONG THE GRAIN ────────────────────────────────────

test('F8 — every shelf is drawn `depth × width`, fix and adjustable alike', () => {
  for (const [name, r] of [
    ['adjustable', withItems([{ id: 's1', kind: 'shelf', pos_mm: 300 }])],
    ['fix', fixShelf()],
  ]) {
    const shelf = shelfOf(r);
    assert.equal(shelf.cnc.rotated, true, `${name}: the drawing is turned`);
    assert.equal(shelf.cnc.drawn_w, shelf.h, `${name}: x is the DEPTH`);
    assert.equal(shelf.cnc.drawn_h, shelf.w, `${name}: y is the width — the long axis, up the page`);
    // The CUT SIZE has not moved. This is a frame change, not a re-cut, and the
    // CSV and the BOM print `w × h` exactly as they did.
    assert.ok(shelf.w > shelf.h, 'this shelf really is wider than it is deep');
    assert.ok(r.csvLines.some((l) => l.includes(`,${shelf.id},${Math.round(shelf.w)},${Math.round(shelf.h)},`)),
      `${name}: the cut list is unchanged`);
  }
});

test('F8 — it is the SIDES’ convention, and the partition’s: the grain axis up the page', () => {
  // The convention is about WHICH AXIS the grain runs along, not about which
  // number happens to be bigger. On every one of these boards the drawing's y
  // is the piece's own grain axis and its x is the cross-grain one:
  //
  //   a SIDE       grain up the height,   drawn `depth × height`
  //   a PARTITION  grain up the height,   drawn `depth × height`   (turn 24)
  //   a SHELF      grain along the width, drawn `depth × width`    (turn 26)
  //
  // …and in every case the DEPTH is the drawing's x, which is what makes the
  // three read as one family on the sheet.
  const r = withItems([
    { id: 'p1', kind: 'partition', x_mm: 300 },
    { id: 's1', kind: 'shelf', pos_mm: 300, zone: 0 },
  ]);
  const drawn = (p) => [p.cnc?.drawn_w ?? p.w, p.cnc?.drawn_h ?? p.h];
  for (const id of ['BUL', 'BUR']) {
    const side = r.panels.find((p) => p.id === id);
    assert.deepEqual(drawn(side), [side.w, side.h], `${id}: depth × height`);
  }
  const part = r.panels.find((p) => p.part === 'VPART');
  assert.deepEqual(drawn(part), [part.h, part.w], 'the partition, since turn 24: depth × height');
  const shelf = shelfOf(r);
  assert.deepEqual(drawn(shelf), [shelf.h, shelf.w], 'and the shelf, from this turn: depth × width');
});

test('F8 — the FRAME turns and the handedness does not: it is a rotation, not a mirror', () => {
  const shelf = shelfOf(fixShelf());
  const pl = panelPlacement(shelf);
  assert.ok(pl, 'a shelf has a frame');
  // x runs from the FRONT of the cabinet towards the back; y across the width.
  assert.deepEqual(pl.u, [0, 0, -1]);
  assert.deepEqual(pl.v, [1, 0, 0]);
  // The machined face is still the board's TOP — the face a partition lands on.
  assert.deepEqual(pl.n, [0, 1, 0]);
  // u × v = −n on every case in `panelPlacement`, and it still does here: the
  // piece is TURNED, not flipped, so nothing that reads this frame has to know.
  const cross = [
    pl.u[1] * pl.v[2] - pl.u[2] * pl.v[1],
    pl.u[2] * pl.v[0] - pl.u[0] * pl.v[2],
    pl.u[0] * pl.v[1] - pl.u[1] * pl.v[0],
  ].map((v) => v + 0);
  assert.deepEqual(cross, pl.n.map((v) => -v + 0));
  // The origin is the front-left corner of the top face.
  assert.deepEqual(pl.origin, [shelf.box.x, shelf.box.y + shelf.box.h, shelf.box.z + shelf.box.d]);
});

test('F8 — the nester has nothing left to turn, and TOPS are out of scope', () => {
  const r = withItems([{ id: 's1', kind: 'shelf', pos_mm: 300 }], { drawers: 2 });
  assert.equal(sheetTurn(shelfOf(r)), 0, 'a shelf arrives standing');
  // "Tops and bottoms are NOT in scope" — CLAUDE.md F8, in as many words.
  for (const id of ['TOP', 'BOTTOM']) {
    const board = r.panels.find((p) => p.id === id);
    if (!board) continue;
    assert.equal(board.cnc.rotated, true, `${id} is drawn as it always was`);
    assert.equal(board.cnc.drawn_w, board.h, '…the TOP’s own nesting, untouched');
    assert.equal(sheetTurn(board), 0, 'and the nester leaves it where turn 1 put it');
  }
  // …and the PARTITION board under a drawer stack is out of scope too: it is
  // the cabinet's structure, not a shelf a joiner sets out.
  const part = r.panels.find((p) => p.part === 'PARTITION');
  if (part) assert.equal(part.cnc.rotated, undefined, 'drawn `width × depth`, as before');
});

test('F8 — a DEEP, narrow shelf is laid the same way: the law is the frame, not the size', () => {
  // A shelf in a cabinet deeper than it is wide. The convention is about which
  // axis the grain runs along, not about which number is bigger, so this board
  // is drawn `depth × width` exactly like every other one — and `sheetTurn`,
  // which asks the DRAWING, then leaves it alone or stands it up on its own
  // terms without this law having to know.
  const deep = computeCabinet({
    ...defaultParamsFor('BUD', P),
    unit_num: '01',
    width: 300,
    depth: 600,
    sections: [{ width_mm: 300, items: [{ id: 's1', kind: 'shelf', pos_mm: 300 }] }],
  }, P);
  const shelf = shelfOf(deep);
  assert.equal(shelf.cnc.drawn_w, shelf.h);
  assert.equal(shelf.cnc.drawn_h, shelf.w);
  assert.ok(shelf.h > shelf.w, 'it really is deeper than it is wide');
});
