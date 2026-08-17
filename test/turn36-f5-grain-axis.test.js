import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { grainRun } from '../src/engine/decors.js';
import { sheetTurn } from '../src/engine/cnc/layout.js';
import { GRAIN_AXIS_BY_PART, applyGrainAxis, grainLocked } from '../src/engine/grain.js';

// ─── TURN 36 (CLAUDE.md F5): CNC GRAIN — THE OWNER'S LAW, PER ROLE ──────────
//
// Verbatim, re-issued from T35-F6:
//
//     "szuflady w pionie, wzdłuż słojów; fronty szuflad też; plinth też."
//
// CLAUDE.md: *Grain axis per ROLE is law; the layout may not rotate these
// roles off-grain. Tests pin the axis per role and the no-flip rule.*
//
// This is the turn's ONE named classifier bucket (iron rule 2, `GRAIN_AXIS`).

const unit = (type, over = {}) => computeCabinet({
  ...defaultParamsFor(type, P), unit_num: '01', ...over,
}, P);

const partOf = (r, part) => r.panels.find((p) => p.part === part) || null;

// ═══ 1. THE TABLE ═══════════════════════════════════════════════════════════

test('F5 — the table is exactly the owner\'s five roles, plus the flat bottom', () => {
  assert.deepEqual(Object.keys(GRAIN_AXIS_BY_PART).sort(), [
    'DRAWER-BOTTOM', 'DRAWER-BOX-BACK', 'DRAWER-BOX-FRONT', 'DRAWER-FRONT',
    'DRAWER-SIDE', 'PLINTH',
  ]);
  // "w pionie" — a board that STANDS runs its grain up itself.
  for (const part of ['DRAWER-SIDE', 'DRAWER-BOX-FRONT', 'DRAWER-BOX-BACK', 'DRAWER-FRONT', 'PLINTH']) {
    assert.equal(GRAIN_AXIS_BY_PART[part], 'h', `${part} stands along the grain`);
  }
  // …and the one that lies flat keeps the answer the shoe box already gave:
  // "pamiętaj, żeby dno były słoje w poprzek".
  assert.equal(GRAIN_AXIS_BY_PART['DRAWER-BOTTOM'], 'w');
});

test('F5 — grainLocked names the roles the layout may not turn, and only those', () => {
  for (const part of Object.keys(GRAIN_AXIS_BY_PART)) assert.equal(grainLocked(part), true);
  for (const part of ['SHELF', 'BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK', 'VPART', 'FRONT']) {
    assert.equal(grainLocked(part), false, `${part} is not on the list`);
  }
  assert.equal(grainLocked(undefined), false);
  assert.equal(grainLocked('toString'), false, 'a prototype key is not a part');
});

test('F5 — the pass STATES an axis and never overrules a piece that has one', () => {
  const panels = [
    { part: 'PLINTH', cnc: {} },
    { part: 'DRAWER-BOTTOM', cnc: { grain: 'h' } },   // somebody said so
    { part: 'SHELF', cnc: { grain: 'h' } },
    { part: 'BUL', cnc: {} },
    { part: 'DRAWER-SIDE' },                          // no cnc frame at all
  ];
  applyGrainAxis(panels);
  assert.equal(panels[0].cnc.grain, 'h', 'the plinth is answered');
  assert.equal(panels[1].cnc.grain, 'h', 'a stated axis is a decision, and it stands');
  assert.equal(panels[2].cnc.grain, 'h', 'the shelf is left exactly as turn 26 set it');
  assert.equal(panels[3].cnc.grain, undefined, 'a side is answered by the saw, as before');
  assert.equal(panels[4].cnc.grain, 'h', 'a piece with no frame gets one');
  assert.deepEqual(applyGrainAxis(null), null);
});

// ═══ 2. THE ENGINE, PER ROLE ════════════════════════════════════════════════

test('F5 — a wardrobe\'s drawer box stands along the grain, its bottom across', () => {
  const r = unit('WARDROBE', { drawers: 3 });
  for (const part of ['DRAWER-SIDE', 'DRAWER-BOX-FRONT', 'DRAWER-BOX-BACK']) {
    const p = partOf(r, part);
    assert.ok(p, `${part} is in the cabinet`);
    assert.equal(p.cnc.grain, 'h', `${part}: w pionie, wzdłuż słojów`);
    assert.equal(grainRun(p).axis, 'h', `${part}: and the reader agrees`);
  }
  const bottom = partOf(r, 'DRAWER-BOTTOM');
  assert.equal(bottom.cnc.grain, 'w', 'dno — słoje w poprzek');
});

test('F5 — a BUDR stack answers the same way, out of a different ladder', () => {
  const r = unit('BUDR');
  for (const part of ['DRAWER-SIDE', 'DRAWER-BOX-FRONT', 'DRAWER-BOX-BACK']) {
    assert.equal(partOf(r, part).cnc.grain, 'h', part);
  }
  assert.equal(partOf(r, 'DRAWER-BOTTOM').cnc.grain, 'w');
  // The FRONT — the piece the saw's rule was getting wrong, because it is wide
  // and short and the saw lays a wide board's grain across it.
  const df = partOf(r, 'DRAWER-FRONT');
  assert.ok(df.w > df.h, 'wide and short — the saw would have said `w`');
  assert.equal(df.cnc.grain, 'h', 'fronty szuflad też');
  assert.equal(grainRun(df).axis, 'h');
  assert.equal(grainRun({ ...df, cnc: {} }).axis, 'w', 'which is what it used to be');
});

test('F5 — the PLINTH stands along the grain, long and shallow though it is', () => {
  const r = unit('BUD', { plinth: true });
  const plinth = partOf(r, 'PLINTH');
  assert.ok(plinth, 'the run cuts one');
  assert.ok(plinth.w > plinth.h, 'long and shallow — the saw would have said `w`');
  assert.equal(plinth.cnc.grain, 'h', 'plinth też');
  assert.equal(grainRun(plinth).axis, 'h');
});

test('F5 — every drawer part of every kit is answered, and none is missed', () => {
  for (const type of ['WARDROBE', 'BUDR', 'BUDR2', 'BUDR4', 'PANTRY', 'OVEN_BASE']) {
    const r = unit(type, type === 'WARDROBE' || type === 'PANTRY' ? { drawers: 2 } : {});
    for (const p of r.panels) {
      const want = GRAIN_AXIS_BY_PART[p.part];
      if (!want) continue;
      assert.equal(p.cnc.grain, want, `${type} ${p.id}: ${p.part}`);
    }
  }
});

// ═══ 3. THE NO-FLIP RULE ════════════════════════════════════════════════════

test('F5 — the layout turns NOTHING on this list, so nothing lands off-grain'
  + ' — RE-PINNED 17.08.2026 (T37-F7a): it turns exactly what it must, so nothing lands off-grain', () => {
  // The nester turns the SHELF family and returns 0 for everything else
  // (`sheetTurn`, turn 17 F3), so the no-flip half of the law holds by
  // construction. It is pinned HERE rather than guarded a second time in
  // `layout.js`, because two implementations of one law is how they drift —
  // and because turn 28's own rule stands: the nester does not read the
  // per-piece statement.
  //
  // ─── RE-PINNED 17.08.2026 (CLAUDE.md T37-F7a) ────────────────────────────
  //
  // The owner, on a nest of drawer parts lying flat: *"CNC jest ok, ale
  // wizualizacja nie jest — sprawdź, co ci nadpisuje."* The audit found the
  // sheet at fault too, and this test is where the fault was written down as a
  // law: "the nester returns 0 for everything on this list, so nothing lands
  // off-grain". The first half was true and the SECOND HALF DID NOT FOLLOW.
  //
  // `sheetTurn` returning 0 lays a part down AS DRAWN. A part whose stated
  // grain is its drawn WIDTH — `DRAWER-BOTTOM`, "dno — słoje w poprzek", and
  // every board of the shoe box — was therefore laid with its figure ACROSS the
  // page: off-grain, which is the very thing this test's own title forbids.
  //
  // THE LAW IS UNCHANGED AND THE ASSERTION IS ITS HONEST FORM: the sheet lays a
  // stated part with its grain running UP the page. That is turn 0 for a part
  // that states 'h' and turn 90 for one that states 'w' — so the standing roles
  // are byte-identical and the flat one turns, which is F7a's whole delta.
  const r = unit('BUDR');
  const plinth = unit('BUD', { plinth: true }).panels.find((p) => p.part === 'PLINTH');
  let turned = 0;
  for (const p of [...r.panels, plinth]) {
    if (!grainLocked(p.part)) continue;
    const stated = p.cnc?.grain;
    assert.ok(stated === 'w' || stated === 'h', `${p.part} states its axis`);
    const want = stated === 'w' ? 90 : 0;
    if (want) turned += 1;
    assert.equal(sheetTurn(p), want,
      `${p.part} states '${stated}' — the sheet stands that axis up the page`);
  }
  // …and the two halves are really both present in this cabinet, so neither
  // branch is asserted against an empty set.
  assert.ok(turned > 0, 'the flat one — DRAWER-BOTTOM — is the half that turns');

  // The same law said the other way round — which is what "nothing lands
  // off-grain" was always reaching for, and what it did not actually check.
  // Measured in millimetres of board rather than in the letter of the turn: the
  // extent that ends up UP THE PAGE is the one the piece states its grain along.
  for (const p of [...r.panels, plinth]) {
    if (!grainLocked(p.part)) continue;
    const dw = Number(p.cnc?.drawn_w) > 0 ? Number(p.cnc.drawn_w) : p.w;
    const dh = Number(p.cnc?.drawn_h) > 0 ? Number(p.cnc.drawn_h) : p.h;
    const alongMm = p.cnc.grain === 'w' ? dw : dh;
    const acrossMm = p.cnc.grain === 'w' ? dh : dw;
    // Turn 90 exchanges the drawn axes, so the sheet's own "up" is the drawn w
    // after a turn and the drawn h without one.
    const upMm = sheetTurn(p) === 90 ? dw : dh;
    assert.equal(upMm, alongMm,
      `${p.part}: the stated grain runs UP the sheet (${alongMm} up, ${acrossMm} across)`);
  }
});

test('F5 — and the nester still does not read the statement (turn 28\'s rule)'
  + ' — RE-PINNED 17.08.2026 (T37-F7a): it now DOES, and the old rule is the fall-through', () => {
  const layout = readFileSync(new URL('../src/engine/cnc/layout.js', import.meta.url), 'utf8');
  const code = layout.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  // ─── RE-PINNED 17.08.2026 (CLAUDE.md T37-F7a) ─────────────────────────────
  //
  // *"CNC jest ok, ale wizualizacja nie jest — sprawdź, co ci nadpisuje."*
  //
  // This was `doesNotMatch(code, /grain/)` — "the nester turns by the drawn
  // size, not by the figure" — and F7a is the ruling that it must turn by the
  // figure wherever a part states one. It is INVERTED, not dropped, and BOTH
  // halves of the generalised law are pinned here so neither can be quietly
  // undone: the statement is read, and the old size rule over the old set is
  // still exactly what answers a part that states nothing.
  assert.match(code, /grain/, 'the nester reads the statement (T37-F7a)');
  assert.match(code, /return w > h \? 90 : 0;/, '…and turn 17 F3\'s size rule is still there');
  assert.match(code, /SHELF_BOARD_PARTS\.has/, '…still asked of exactly the old set');
  // And as behaviour rather than as source: a part that states nothing is
  // answered by the size rule, on both of its branches.
  const bare = { part: 'PARTITION', w: 564, h: 550, cnc: {} };
  assert.equal(sheetTurn(bare), 90, 'drawn lying down — the old rule stands it up');
  assert.equal(sheetTurn({ ...bare, w: 550, h: 564 }), 0, '…and leaves an upright one alone');
  assert.equal(sheetTurn({ part: 'FRONT', w: 597, h: 200, cnc: {} }), 0,
    'a part outside the old set is still never turned by size alone');
});

// ═══ 4. NOTHING ELSE MOVED ══════════════════════════════════════════════════

test('F5 — the boards that already had an answer keep it, to the letter', () => {
  const r = unit('BUD', { shelves: 1, doors: { count: 1 } });
  assert.equal(partOf(r, 'SHELF').cnc.grain, 'h', 'turn 26 F8, untouched');
  for (const part of ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK']) {
    assert.equal(partOf(r, part).cnc.grain, undefined, `${part} says nothing — the saw's rule answers`);
  }
  assert.equal(partOf(r, 'FRONT').cnc.grain, undefined, 'a door is tall, so the saw already runs it up');
});

test('F5 — the CUT and the DRAWN FRAME did not move: this states, it does not turn', () => {
  const r = unit('BUDR');
  const side = partOf(r, 'DRAWER-SIDE');
  // Turn 12's own frame for a BUDR box side, unchanged by this turn.
  assert.equal(side.cnc.rotated, true);
  assert.equal(side.cnc.drawn_w, side.h);
  assert.equal(side.cnc.drawn_h, side.w);
  // And a piece the table does not name has no frame invented for it.
  const df = partOf(r, 'DRAWER-FRONT');
  assert.equal(df.cnc.rotated, undefined);
  assert.equal(df.cnc.drawn_w, undefined);
});

test('F5 — the shoe box keeps its own statement, which came first', () => {
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: '01',
    width: 900,
    sections: [{ items: [{ id: 'sb1', kind: 'shoe_box', variant: 'F', dividers: 1 }] }],
  }, P);
  const bottom = r.panels.find((p) => p.part === 'SHOEBOX-BT');
  assert.ok(bottom, 'the box is built');
  assert.equal(bottom.cnc.grain, 'w', 'turn 34 F4 said it first and still says it');
});
