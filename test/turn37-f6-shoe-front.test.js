// ─── Turn 37, CLAUDE.md F6: THE BATTEN STEPS BACK, THE FRONT COVERS IT ─────
//
// The owner, 17.08.2026, seeing the drawer variant live in the room:
//
//   *"cofnij o około 30 mm do tyłu (skróć) ten klocek i rozszerz front
//    szuflady, tak żeby zostało po prawej i po lewej od BUR i BUL około
//    10 mm — będzie wyglądać lepiej, a i tak się otworzy."*
//
// TWO numbers, and one sentence of consequence each:
//
//   · the batten is shortened by 30 AT THE FRONT — its rear still lands on
//     the box's back, so the 30 mm it gives up is the 30 nearest the room;
//   · the DRAWER face is widened to the OPENING less 2 × 10, which makes it
//     WIDER than the box it is screwed to and covers the batten-and-runner
//     zone the old width left as daylight.
//
// ─── THE LISP IS LAW (iron rule 3) ─────────────────────────────────────────
// Both numbers are `KIT_SHOE_BOX.lsp` constants first — `SHOE_BATTEN_BACK`
// and `SHOE_FRONT_REVEAL` — and, exactly as T34 does next door, this file
// parses them OFF DISK rather than typing them twice. A kit whose numbers
// move fails this file, which is what "the engine MATCHES the kit; it does
// not interpret it" has to mean in practice.
//
// ─── AND WHAT MUST NOT MOVE ────────────────────────────────────────────────
// *"Box, runners, drilling: unchanged."* Half of this file is the proof of
// the negative: the box's own width, its four walls, the slope, the runner
// column and every hole come back the numbers T34 pinned. The hinge-arc
// check (#12) is likewise NOT disarmed — *"a i tak się otworzy"* is the
// owner's ruling on this configuration, not a licence to stop looking.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { buildBom } from '../src/engine/bom.js';
import {
  shoeBattenLen, shoeBoxPlan, shoeBoxWidth, shoeConst, shoeFrontWidth,
} from '../src/engine/shoeBox.js';

const LISP = readFileSync(new URL('../reference/lisp/KIT_SHOE_BOX.lsp', import.meta.url), 'utf8');

/** `(setq SHOE_BATTEN_BACK 30.0)` → 30. The kit's own constants, off disk. */
function lispConst(name) {
  const m = new RegExp(`\\(setq\\s+${name}\\s+([-0-9.]+)\\)`).exec(LISP);
  assert.ok(m, `${name} is not in KIT_SHOE_BOX.lsp`);
  return Number(m[1]);
}

const C = shoeConst(P);

// The kit's own defaults, so the plan under test is the drawing under test.
const plan = (over = {}) => shoeBoxPlan({
  openingW: 564, depth: 450, boardT: 18, frontT: 18, variant: 'F', dividers: 1, profile: P, ...over,
});

/** A drawer box behind two hinged doors — the case the owner was looking at. */
const drawer = (over = {}) => plan({
  variant: 'D', hingedLeft: true, hingedRight: true, ...over,
});

const wardrobe = (item, over = {}) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P),
  unit_num: '01',
  width: 900,
  doors: { count: 2 },
  ...over,
  sections: [{
    width_mm: over.width ?? 900,
    items: [{ id: 'sb1', kind: 'shoe_box', variant: 'D', dividers: 1, ...item }],
  }],
}, P);

// ─── the kit, first ────────────────────────────────────────────────────────

test('F6 — the KIT carries both constants, and the engine\'s ARE the kit\'s', () => {
  // LISP FIRST: the two names exist in block A, dated and quoted.
  assert.equal(lispConst('SHOE_BATTEN_BACK'), 30, 'batten = box depth − 30');
  assert.equal(lispConst('SHOE_FRONT_REVEAL'), 10, 'DRAWER front = opening − 2 × 10');
  assert.equal(C.battenBack, lispConst('SHOE_BATTEN_BACK'), 'the engine matches the kit');
  assert.equal(C.frontReveal, lispConst('SHOE_FRONT_REVEAL'), 'the engine matches the kit');
  // …and the owner's own words ride the file that carries his numbers.
  assert.match(LISP, /cofnij o okolo 30 mm do tylu/);
  assert.match(LISP, /po prawej i po lewej od BUR i BUL okolo 10 mm/);
  assert.match(LISP, /T37 \(17\.08\.2026\)/);
});

test('F6 — the kit states BOTH laws in its section B, and its drawing uses them', () => {
  // The two law functions, beside `shoeRearEdge` where the kit's geometry lives.
  assert.match(LISP, /\(defun shoeBattenLen \(depth\)/);
  assert.match(LISP, /\(defun shoeFrontW \(variant openingW\)/);
  assert.match(LISP, /\(max 0\.0 \(- depth SHOE_BATTEN_BACK\)\)/);
  assert.match(LISP, /\(max 0\.0 \(- openingW \(\* 2\.0 SHOE_FRONT_REVEAL\)\)\)/);
  // …and the panel drawing READS them rather than the raw depth/box width. The
  // batten's outline is the shortened length; the front's is `frontW`.
  assert.match(LISP, /\(setq len \(shoeBattenLen depth\)\)/);
  assert.match(LISP, /\(drawRect "OUTLINE" x0 y0 \(\+ x0 len\)/);
  assert.match(LISP, /\(setq frontW \(shoeFrontW variant openingW\)\)/);
  assert.match(LISP, /\(drawSHOE_FRONT cx y0 frontW variant\)/);
  // The FIX branch of the front law is untouched — it still takes the opening.
  assert.match(LISP, /\(if \(= variant "F"\)\s*\n\s*openingW/);
});

test('F6 — NO OTHER KIT MOVED: this is KIT_SHOE_BOX\'s own change', () => {
  // Iron rule 3, verbatim: "its own file, its own section — no other kit moves
  // a character". Neither constant may appear anywhere else in reference/lisp/.
  const dir = new URL('../reference/lisp/', import.meta.url);
  const kits = readdirSync(dir).filter((f) => f.endsWith('.lsp'));
  for (const kit of kits) {
    if (kit === 'KIT_SHOE_BOX.lsp') continue;
    const text = readFileSync(new URL(kit, dir), 'utf8');
    assert.ok(!/SHOE_BATTEN_BACK|SHOE_FRONT_REVEAL/.test(text),
      `${kit} must not carry the shoe box's T37 constants`);
  }
});

// ─── the batten ────────────────────────────────────────────────────────────

test('F6 — the batten is box depth − 30, and NOTHING else about it moves', () => {
  // The law function on its own, both directions of the kit's `max 0.0`.
  assert.equal(shoeBattenLen(450, P), 420);
  assert.equal(shoeBattenLen(550, P), 520);
  assert.equal(shoeBattenLen(20, P), 0, 'never a board of minus millimetres');

  const p = drawer();
  const battens = p.panels.filter((x) => x.role === 'batten');
  assert.equal(battens.length, 2, 'one per hinged side — T34\'s law, untouched');
  for (const b of battens) {
    assert.equal(b.w, 450 - 30, 'shortened by exactly the kit\'s 30');
    assert.equal(b.w, shoeBattenLen(p.depth, P), 'and it is the kit\'s own number');
    // The rest of the board is the board it was on 16.08: 30 thick (it FILLS
    // the infill zone), 70 high (the runner axis at 40 sits well inside it),
    // grain along its length, no machining of its own.
    assert.equal(b.thickness, 30, 'still SHOE_INFILL thick');
    assert.equal(b.h, C.battenH, 'still 70 high');
    assert.equal(b.grain, 'w');
    assert.deepEqual(b.pockets, []);
  }
  assert.deepEqual(battens.map((b) => b.side), ['L', 'R']);

  // One hinged side gives one batten; none gives none. T34's law, re-proved
  // because the length change must not touch WHETHER a batten exists.
  assert.equal(drawer({ hingedRight: false }).panels.filter((x) => x.role === 'batten').length, 1);
  assert.equal(plan({ variant: 'D' }).panels.filter((x) => x.role === 'batten').length, 0);
  assert.equal(plan({ variant: 'F' }).panels.filter((x) => x.role === 'batten').length, 0,
    'a FIX box is screwed and has no runner to mount');
});

// ─── the front ─────────────────────────────────────────────────────────────

test('F6 — the DRAWER front is opening − 2 × 10, and it is WIDER than the box', () => {
  assert.equal(shoeFrontWidth({ openingW: 564, variant: 'D', profile: P }), 544);
  assert.equal(shoeFrontWidth({ openingW: 864, variant: 'D', profile: P }), 844);
  assert.equal(shoeFrontWidth({ openingW: 10, variant: 'D', profile: P }), 0, 'never negative');

  const p = drawer();
  const face = p.panels.find((x) => x.role === 'front');
  assert.equal(face.w, 564 - 20, '10 mm of reveal to BUL and 10 to BUR');
  assert.equal(face.h, 120, 'SHOE_FRONT_H does not move');
  assert.equal(face.thickness, 18, 'the project front thickness, as before');
  assert.equal(face.family, 'fronts', 'still a front like every other front');

  // THE POINT of the change: the face now overhangs the box it is screwed to,
  // and it covers all but the reveal of the dead zone beside the box. Behind
  // a hinged door that zone is one runner (13) plus one batten (30) = 43, of
  // which 33 goes under the face and 10 stays as the owner's reveal.
  assert.ok(face.w > p.boxW, 'wider than the box — deliberately');
  assert.equal((p.openingW - p.boxW) / 2, C.runnerW + C.infill, 'the dead zone is 43');
  assert.equal((face.w - p.boxW) / 2, C.runnerW + C.infill - C.frontReveal,
    'the face covers 33 of it and leaves the 10 mm reveal');

  // …and with NO hinged door there is no batten, so the dead zone is the
  // runner alone (13) — the face still overhangs, by 3, and the reveal to the
  // carcass is STILL 10. That is the whole grammar of the owner's number: he
  // measured from BUR and BUL, not from the box.
  const plainDrawer = plan({ variant: 'D' });
  const plainFace = plainDrawer.panels.find((x) => x.role === 'front');
  assert.equal(plainFace.w, 564 - 20, 'the reveal is the reveal, hinged or not');
  assert.equal((plainDrawer.openingW - plainDrawer.boxW) / 2, C.runnerW);
  assert.equal((plainFace.w - plainDrawer.boxW) / 2, C.runnerW - C.frontReveal);
});

test('F6 — the FIX front is UNTOUCHED: the owner spoke about the drawer', () => {
  const fix = plan({ variant: 'F' }).panels.find((x) => x.role === 'front');
  assert.equal(fix.w, 564, 'the whole opening, exactly as T34 cut it');
  assert.equal(fix.family, 'carcass',
    '"nie ze spray tylko z materiału carcasowego — widać ciętą płytę"');
  assert.equal(shoeFrontWidth({ openingW: 564, variant: 'F', profile: P }), 564);
  // The FIX box has no runner and no batten, so it has nothing to cover.
  assert.equal(plan({ variant: 'F' }).boxW, 564);
});

test('F6 — the front SWITCH still switches (T36-F3), at the new width', () => {
  const on = drawer();
  const off = drawer({ front: false });
  assert.equal(on.panels.filter((x) => x.role === 'front').length, 1);
  assert.equal(off.panels.filter((x) => x.role === 'front').length, 0);
  // The width the switch turns off is the NEW width, and the battens under it
  // are the shortened battens either way.
  assert.equal(on.panels.find((x) => x.role === 'front').w, 544);
  assert.deepEqual(
    off.panels.filter((x) => x.role === 'batten').map((x) => x.w),
    on.panels.filter((x) => x.role === 'batten').map((x) => x.w),
  );
});

// ─── and what must NOT have moved ──────────────────────────────────────────

test('F6 — BOX, RUNNERS AND DRILLING: not one number moves', () => {
  const p = drawer();
  // The box's own width is T34's, to the millimetre: opening − 2 × 13 of
  // runner − 30 per hinged side. The front got wider; the BOX did not.
  assert.equal(p.boxW, 564 - 26 - 60);
  assert.equal(p.boxW, shoeBoxWidth({
    openingW: 564, variant: 'D', hingedLeft: true, hingedRight: true, profile: P,
  }));
  assert.equal(p.innerW, p.boxW - 36);

  // The four walls, all 80 high, sides at the full depth (the batten stepped
  // back; the box did NOT get shorter).
  assert.deepEqual(p.panels.filter((x) => x.role === 'side').map((x) => x.w), [450, 450]);
  assert.equal(p.panels.find((x) => x.role === 'back').w, p.innerW);
  assert.equal(p.panels.find((x) => x.role === 'boxFront').w, p.innerW);
  for (const w of p.panels.filter((x) => ['side', 'back', 'boxFront'].includes(x.role))) {
    assert.equal(w.h, 80);
  }

  // The slope, the divider seat and the bottom: untouched.
  assert.equal(p.slope.run, 414, 'depth − 2 × G, as ever');
  assert.equal(p.slope.grooveW, 18.2);
  assert.equal(p.slope.grooveDepth, 6);
  assert.equal(p.panels.find((x) => x.role === 'bottom').w, p.innerW + 12);

  // The runner: the same face, the same NL, the same column, the same holes.
  assert.equal(p.boxFrontX, 21, 'frontT + 3 — "cofnąć na front + 3 mm"');
  assert.equal(p.runner.faceX, 21);
  assert.equal(p.runner.nl, 450);
  assert.equal(p.runner.column, 352);
  assert.equal(p.runner.onSheet, true);
  assert.deepEqual(p.drills.filter((d) => d.side === 'L').map((d) => d.x), [21 + 37, 21 + 352]);
  assert.equal(p.drills.length, 4, 'two per side, and not one more');
  for (const d of p.drills) {
    assert.equal(d.d, 5, 'euro');
    assert.equal(d.layer, 'SHOE_RUNNER_5MM');
    assert.equal(d.y, 40);
  }
  assert.deepEqual(p.warnings, [], 'and nothing to complain about');
});

test('F6 — the two constants are the ONLY levers: dial them back, get T34 back', () => {
  // The sharpest form of "box, runners and drilling: unchanged". If anything
  // else had been touched, winding the two new numbers back to what they
  // implicitly were before 17.08 would NOT reproduce the T34 box —
  //
  //   battenBack  0   the batten ran the box's whole depth
  //   frontReveal 43  the face WAS the box's width, i.e. the opening less one
  //                   runner (13) and one batten (30) per side
  //
  // — and it does, board for board.
  const T34 = {
    ...P,
    wardrobeAccessories: {
      ...P.wardrobeAccessories,
      shoeBox: { ...P.wardrobeAccessories.shoeBox, battenBack: 0, frontReveal: 43 },
    },
  };
  const now = drawer();
  const then = drawer({ profile: T34 });

  assert.equal(then.panels.find((x) => x.role === 'batten').w, 450,
    'the batten is the box\'s whole depth again');
  assert.equal(then.panels.find((x) => x.role === 'front').w, then.boxW,
    'and the face is the box\'s own width again — T34 exactly');

  // Every other board, every hole, the runner and the slope are the SAME
  // objects in both worlds: the two constants moved two numbers and nothing
  // reached anything else.
  const untouched = (p) => p.panels.filter((x) => !['batten', 'front'].includes(x.role));
  assert.deepEqual(untouched(then), untouched(now));
  assert.deepEqual(then.drills, now.drills);
  assert.deepEqual(then.runner, now.runner);
  assert.deepEqual(then.slope, now.slope);
  assert.equal(then.boxW, now.boxW);
  assert.equal(then.innerW, now.innerW);
  assert.equal(then.boxFrontX, now.boxFrontX);
  assert.equal(then.axisY, now.axisY);
});

// ─── in a real cabinet: the BOM and the room ───────────────────────────────

test('F6 — the BOM carries BOTH new widths, because it reads the panels', () => {
  const r = wardrobe({});
  const sb = r.assemblies.shoeBoxes[0];
  assert.deepEqual(sb.hinged, { left: true, right: true }, 'two doors, two hinged sides');

  const unit = { id: 'u1', type: 'WARDROBE', params: {} };
  const rows = buildBom([{ unit, result: r }]).units[0].rows;

  const battens = rows.filter((x) => x.part === 'SHOEBOX-BATTEN');
  assert.equal(battens.length, 2);
  for (const b of battens) {
    assert.equal(b.w, sb.depth - 30, 'the cut list says the SHORT batten');
    assert.equal(b.h, 70);
  }

  const face = rows.find((x) => x.part === 'SHOEBOX-FR');
  assert.ok(face, 'the face is on the cut list');
  assert.equal(face.w, sb.openingW - 20, 'the cut list says the WIDE front');
  assert.equal(face.h, 120);
  // …and it is still bought as a FRONT, not as carcass board.
  const panel = r.panels.find((p) => p.part === 'SHOEBOX-FR');
  assert.equal(panel.material_role, 'front');
  assert.equal(panel.w, sb.openingW - 20);
  // Edging follows the width without being told: all four edges of the face.
  assert.ok(Math.abs(panel.edging.len_m - (2 * panel.w + 2 * panel.h) / 1000) < 1e-6);
});

test('F6 — the ROOM: the batten steps back, and the reveal is 10 to BUL and BUR', () => {
  const r = wardrobe({});
  const sb = r.assemblies.shoeBoxes[0];
  const boxFront = r.panels.find((p) => p.id === 'SHOE1-BF');
  const battens = r.panels.filter((p) => p.part === 'SHOEBOX-BATTEN');
  assert.equal(battens.length, 2);

  // THE STEP BACK. The box's front face is where it always was; the batten's
  // front end now stops 30 short of it, and its REAR end still lands on the
  // box's back — "do tyłu" means the 30 comes off the room end.
  const boxFrontFace = boxFront.box.z + boxFront.box.d;
  for (const b of battens) {
    assert.equal(b.box.d, sb.depth - 30, 'the 3-D board is the shortened board');
    // The box's own back: the box-front board sits `depth − G` in front of it,
    // so this is the box's rear face expressed without re-deriving `boxZ`.
    assert.equal(b.box.z, boxFront.box.z - (sb.depth - boxFront.box.d),
      'its rear is still the box\'s back');
    assert.equal(roundMm(boxFrontFace - (b.box.z + b.box.d)), 30,
      'and its front end stops exactly 30 short of the box front');
    // Nothing else about where it stands moved: still 30 thick, on the bay side.
    assert.equal(b.box.w, 30);
    assert.equal(b.box.h, 70);
  }

  // THE REVEAL, measured against the carcass sides themselves — the only
  // measurement the owner actually made: *"po prawej i po lewej od BUR i BUL
  // około 10 mm"*.
  const BUL = r.panels.find((p) => p.id === 'BUL');
  const BUR = r.panels.find((p) => p.id === 'BUR');
  const face = r.panels.find((p) => p.part === 'SHOEBOX-FR');
  const leftReveal = face.box.x - (BUL.box.x + BUL.box.w);
  const rightReveal = BUR.box.x - (face.box.x + face.box.w);
  assert.equal(roundMm(leftReveal), 10, '10 mm to BUL');
  assert.equal(roundMm(rightReveal), 10, '10 mm to BUR');

  // …and it COVERS what it was widened to cover: each batten's inner part is
  // behind the face, with only the 10 mm reveal of it showing.
  for (const b of battens) {
    const overlap = Math.min(b.box.x + b.box.w, face.box.x + face.box.w)
      - Math.max(b.box.x, face.box.x);
    assert.equal(roundMm(overlap), b.box.w - 10, 'all but the reveal is covered');
  }
});

test('F6 — a FIX box in the room did not move a millimetre', () => {
  // The regression that matters: `shoeBoxBoxFor`'s front case was rewritten
  // from "FIX here, DRAWER there" to one centred-in-the-bay law. For the FIX
  // face (width = the whole opening) that law must be the SAME arithmetic.
  const r = wardrobe({ variant: 'F' });
  const sb = r.assemblies.shoeBoxes[0];
  const face = r.panels.find((p) => p.part === 'SHOEBOX-FR');
  const BUL = r.panels.find((p) => p.id === 'BUL');
  assert.equal(face.w, sb.openingW, 'the full opening');
  assert.equal(roundMm(face.box.x - (BUL.box.x + BUL.box.w)), 0,
    'flush with BUL — no reveal on a FIX, exactly as before');
  assert.equal(face.box.w, sb.openingW);
  // And a FIX box carries no batten at all, so nothing stepped anywhere.
  assert.equal(r.panels.filter((p) => p.part === 'SHOEBOX-BATTEN').length, 0);
});

// ─── the check is not disarmed ─────────────────────────────────────────────

test('F6 — CHECK #12 IS STILL ARMED: "a i tak się otworzy" is a ruling, not a mute', () => {
  const mk = (variant, pos) => ({
    ...defaultParamsFor('WARDROBE', P),
    width: 900,
    unit_num: '01',
    sections: [{
      width_mm: 900,
      items: [{
        id: 'sb1', kind: 'shoe_box', variant, ...(pos != null ? { pos_mm: pos } : {}),
      }],
    }],
  });

  return import('../src/engine/checks.js').then(({ CHECKS, runChecks }) => {
    // It is still in the register, still red, still named.
    const registered = CHECKS.find((c) => c.n === 12);
    assert.ok(registered, 'check #12 is still on the list');
    assert.equal(registered.level, 'red');
    assert.match(registered.label, /Shoe box/);

    const run = (params) => runChecks({
      entries: [{ unit: { id: 'u1', type: 'WARDROBE', params }, result: computeCabinet(params, P) }],
      profile: P,
    }).filter((f) => f.check === 12);

    // …and it still FIRES on the configuration T34 pinned. The F6 change did
    // not quiet it: a fixed box on the floor still stands in the hinge's arc.
    const onFloor = run(mk('F', null));
    assert.equal(onFloor.length, 1, 'hinge at 100 sits inside the 0–120 band');
    assert.equal(onFloor[0].level, 'red');
    assert.match(onFloor[0].message, /raise the box or move the hinge/);
    assert.equal(run(mk('F', 150)).length, 0, 'raised clear, it goes silent');

    // The DRAWER box is silent — and that is the OWNER'S RULING, written down
    // here so it is a decision and not an oversight: *"a i tak się otworzy"*.
    // The check watches FIX boxes, which are screwed across the whole opening
    // and cannot be pulled out of the way; a drawer comes to the door. If a
    // configuration ever disagrees, #12 is the thing that will say so.
    assert.equal(run(mk('D', null)).length, 0,
      'the drawer opens — the owner ruled it, and the check still watches the fix');
  });
});

/** Millimetres, to the engine's own rounding — the room is drawn in these. */
function roundMm(v) {
  return Math.round(Number(v) * 10000) / 10000;
}
