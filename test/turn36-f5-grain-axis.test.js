import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { grainRun } from '../src/engine/decors.js';
import { sheetTurn } from '../src/engine/cnc/layout.js';
import {
  CUT_GRAIN_AXIS_BY_PART, GRAIN_AXIS_BY_PART, applyGrainAxis, cutStanding, grainLocked,
} from '../src/engine/grain.js';

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
    // ─── RE-PINNED 19.08.2026 (T41-F1) ────────────────────────────────────
    // The STAMP above is an engine fact and has not moved a byte this turn —
    // that assertion is left exactly as T36 wrote it, and it is now one of the
    // things proving the engine stood still. What moved is the READER: under
    // F1 the 3-D shows the board AS CUT, and the cut stands these boards on
    // their LONG side, so the figure runs the length. Asserted as the length in
    // millimetres rather than as a letter, because the letter is the field and
    // the millimetres are the thing.
    assert.equal(grainRun(p).lengthMm, Math.max(p.w, p.h),
      `${part}: the figure runs the board's length, as it was cut`);
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
  // T41-F1: the cut stands it on its long side, so the figure runs that way.
  assert.equal(grainRun(df).lengthMm, Math.max(df.w, df.h));
  // ─── RE-PINNED 18.08.2026 (CLAUDE.md T40-F2: ONE GRAIN TRUTH) ────────────
  //
  // This asserted that stripping the stamp gave the saw's old answer, `w`. Under
  // F2 the OWNER'S ROLE LIST is what the cut reads, so a drawer front cannot
  // lose its lay by losing a field — which is a strictly better property and
  // the reason the table is an input to the cut rather than a stamp somebody
  // has to remember to apply. To see the saw's old answer you now have to strip
  // the PART as well, because the part IS the decision.
  assert.equal(grainRun({ ...df, cnc: {} }).lengthMm, Math.max(df.w, df.h),
    'the ROLE decides, stamp or no stamp');
  assert.equal(grainRun({ w: df.w, h: df.h, cnc: {} }).axis, 'h',
    'and a nameless board that wide is laid as drawn, so its figure runs its height');
});

test('F5 — the PLINTH stands along the grain, long and shallow though it is', () => {
  const r = unit('BUD', { plinth: true });
  const plinth = partOf(r, 'PLINTH');
  assert.ok(plinth, 'the run cuts one');
  assert.ok(plinth.w > plinth.h, 'long and shallow — the saw would have said `w`');
  assert.equal(plinth.cnc.grain, 'h', 'plinth też');
  // T41-F1: 600 long and 100 deep, and it is cut standing on the 600 — which is
  // the edge that gets banded, and the reason the owner named it.
  assert.equal(grainRun(plinth).lengthMm, Math.max(plinth.w, plinth.h));
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
  // ─── RE-PINNED 18.08.2026 (CLAUDE.md T40-F2: ONE GRAIN TRUTH) ────────────
  //
  // The owner, 18.08: *"Jeżeli cięte jest w pionie, słój w pionie… Jak tniemy,
  // tak słoje się pokazują. Nie będzie wyjątków."*
  //
  // T37-F7a's form of this test read `cnc.grain` — a statement in the DRAWN
  // frame — and asked the sheet to honour that letter. On a role whose kit
  // draws it TURNED, that letter and the ROLE's own intent are 90° apart, which
  // is how one role ended up cut two ways in two kits. F2 makes the OWNER'S
  // TABLE the input to the cut, so the law is now: the axis of the PIECE'S OWN
  // `w × h` record that the table names is the one standing up the sheet. Said
  // in millimetres of board, which is the honest form and the one that cannot
  // be weakened into agreement.
  const r = unit('BUDR');
  const plinth = unit('BUD', { plinth: true }).panels.find((p) => p.part === 'PLINTH');
  let turned = 0;
  for (const p of [...r.panels, plinth]) {
    if (!grainLocked(p.part)) continue;
    const wanted = CUT_GRAIN_AXIS_BY_PART[p.part];
    assert.ok(wanted === 'w' || wanted === 'h', `${p.part} is on the owner's list`);
    const dw = Number(p.cnc?.drawn_w) > 0 ? Number(p.cnc.drawn_w) : p.w;
    const dh = Number(p.cnc?.drawn_h) > 0 ? Number(p.cnc.drawn_h) : p.h;
    // ─── RE-PINNED 19.08.2026 (T41-F1) ────────────────────────────────────
    //
    // T40's form of this asserted `upMm === alongMm` — the millimetres the
    // TABLE's letter names. It is millimetres, so it read as the honest form,
    // and it was not: for five of the six roles the letter names the SHORT
    // side, so the assertion demanded the board be laid FLAT and the sheet
    // obliged. Measured on this very cabinet, a drawer side went down 237 up ×
    // 490 across — banded across its own grain.
    //
    // The honest form is the SHAPE: the long side up the page. It cannot be
    // satisfied by a board lying down, whatever any table says.
    const alongMm = Math.max(p.w, p.h);
    const acrossMm = Math.min(p.w, p.h);
    const upMm = sheetTurn(p) === 90 ? dw : dh;
    if (sheetTurn(p) === 90) turned += 1;
    if (!cutStanding(p.part)) continue;
    assert.equal(upMm, alongMm,
      `${p.part}: it is cut STANDING (${alongMm} up, ${acrossMm} across)`);
    // …and the 3-D DERIVES from that rather than from a table of its own.
    assert.equal(grainRun(p).lengthMm, upMm, `${p.part}: and the picture shows what was cut`);
  }
  // …and the two halves are really both present in this cabinet, so neither
  // branch is asserted against an empty set.
  assert.ok(turned > 0, 'the boards drawn turned — the drawer box — are the half that turns');
  // …and the DRAWER BOTTOM, the one role on the table that is NOT cut standing,
  // is still laid by its own stated grain and did not move this turn.
  assert.equal(cutStanding('DRAWER-BOTTOM'), false);
  const bottom = r.panels.find((p) => p.part === 'DRAWER-BOTTOM');
  assert.equal(sheetTurn(bottom), 90, 'flat, and turned exactly as T37-F7a left it');
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
  // RE-PINNED 18.08.2026 (T40-F2): same rule, drawn-frame variable names.
  assert.match(code, /return dw > dh \? 90 : 0;/, '…and turn 17 F3\'s size rule is still there');
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

test('F5 — the shoe box keeps its own statement, which came first'
  + ' — T54-F7 AMENDED (28.08.2026): the box died; its answer lives on in the shoe DRAWER', () => {
  // ─── T54-F7 AMENDED (28.08.2026) ──────────────────────────────────────────
  //
  // The owner: *"usuń stary kod na shoes i zrób z logiką drawers."* The shoe
  // box world — `kind:'shoe_box'`, `engine/shoeBox.js`, every SHOEBOX-* panel
  // including the SHOEBOX-BT this test read — is DELETED under licence 2; the
  // replacement suite is test/turn54-f7-the-shoe-drawer.test.js. A shoe is a
  // STANDARD drawer (`kind:'drawer', variant:'shoe'`, side height
  // `drawers.shoeSideMm`), so the statement turn 34 F4 pinned on SHOEBOX-BT —
  // "pamiętaj, żeby dno były słoje w poprzek" — is not weakened, it is
  // INHERITED: the shoe's bottom is a DRAWER-BOTTOM and the owner's table
  // already says `w`. Asserted here on the new world, board for board.
  const DR = P.wardrobe.drawers;
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: '01',
    width: 900,
    sections: [{
      width_mm: 900,
      items: [{
        id: 'sd1', kind: 'drawer', index: 1,
        height_mm: DR.shoeSideMm + DR.frontToSideDelta, variant: 'shoe',
      }],
    }],
  }, P);
  const bottom = r.panels.find((p) => p.part === 'DRAWER-BOTTOM');
  assert.ok(bottom, 'the shoe drawer is built by the drawer code');
  assert.equal(bottom.cnc.grain, 'w', 'dno — słoje w poprzek: the answer the shoe box gave first');
  for (const part of ['DRAWER-SIDE', 'DRAWER-BOX-FRONT', 'DRAWER-BOX-BACK', 'DRAWER-FRONT']) {
    const p = r.panels.find((x) => x.part === part);
    assert.ok(p, `${part} is in the shoe drawer`);
    assert.equal(p.cnc.grain, 'h', `${part}: w pionie, wzdłuż słojów — the drawer table answers`);
  }
  // …and no board of the dead world is cut any more.
  assert.equal(r.panels.some((p) => /^SHOEBOX-/.test(p.part || '')), false,
    'no SHOEBOX-* panel exists (licence 2)');
});
