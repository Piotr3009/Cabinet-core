// ─── Turn 34, CLAUDE.md F4: THE SHOE BOX ───────────────────────────────────
//
// The owner retired the T33 pinned 15° shelf in one sentence, 16.08.2026:
// *"jeżeli nie jest szuflada to powinien być fix, nie z pinami — tu jest
// błąd"*. What replaces it he designed line by line in chat the same day, and
// the record is `reference/lisp/KIT_SHOE_BOX.lsp` — its own kit, the house
// pattern, delivered with the spec.
//
// ─── THE LISP IS LAW (iron rule 3) ─────────────────────────────────────────
// Every expectation below is READ OUT OF THE KIT FILE, not typed twice: the
// constants block A is parsed straight off disk and the engine is held against
// it. A kit whose numbers move fails this file, which is what "the engine
// MATCHES that section; it does not interpret it" has to mean in practice.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import {
  shoeAngleDeg, shoeBoxPlan, shoeBoxWidth, shoeConst, shoeRearEdge,
  shoeRunnerLadder, shoeRunnerMap, shoeRunnerNl, shoeRunnerSpec,
} from '../src/engine/shoeBox.js';
import {
  elementActions, elementFields, elementKind, elementLabel, isMainViewElement,
} from '../src/engine/elements.js';

const LISP = readFileSync(new URL('../reference/lisp/KIT_SHOE_BOX.lsp', import.meta.url), 'utf8');

/** `(setq SHOE_WALL_H 80.0)` → 80. The kit's own constants, off disk. */
function lispConst(name) {
  const m = new RegExp(`\\(setq\\s+${name}\\s+([-0-9.]+)\\)`).exec(LISP);
  assert.ok(m, `${name} is not in KIT_SHOE_BOX.lsp`);
  return Number(m[1]);
}

const C = shoeConst(P);

// ─── the gate: the kit is there, and it is the one the spec named ──────────

test('VERIFY SECOND — the kit exists and carries its marker', () => {
  assert.match(LISP, /;;; KIT_SHOE_BOX\.lsp/);
  assert.match(LISP, /Command: SHOE_BOX/);
});

test('constants block A: every number the engine uses IS the kit\'s', () => {
  assert.equal(C.wallH, lispConst('SHOE_WALL_H'), '80 — sides, back and box front');
  assert.equal(C.frontH, lispConst('SHOE_FRONT_H'), '120 — the front, BOTH variants');
  assert.equal(C.dividerH, lispConst('SHOE_DIV_H'), '50');
  assert.equal(C.runnerW, lispConst('SHOE_RUNNER_W'), '13 — "runners 13 mm szerokości"');
  assert.equal(C.grooveDepth, lispConst('SHOE_GROOVE_D'), '6 — in all FOUR walls');
  assert.equal(C.groovePlay, lispConst('SHOE_GROOVE_PLAY'), '0.2 of play');
  assert.equal(C.angleMaxDeg, lispConst('SHOE_ANGLE_MAX'), '10° — the ceiling');
  assert.equal(C.pilotD, lispConst('SHOE_PILOT_D'), '⌀3');
  assert.equal(C.pilotN, lispConst('SHOE_PILOT_N'), '3 per side');
  assert.equal(C.pilotEnd, lispConst('SHOE_PILOT_END'), '50 from each box end');
  assert.equal(C.runnerFixD, lispConst('SHOE_RUNFIX_D'), '⌀5 euro');
  assert.equal(C.fixAxis, lispConst('SHOE_FIX_AXIS'), 'axis 40 above the box floor');
  assert.equal(C.setbackX, lispConst('SHOE_SETBACK_X'), 'front + 3');
  assert.equal(C.infill, lispConst('SHOE_INFILL'), '30 per hinged side');
  // ─── ADDED 17.08.2026 (T37-F6) ────────────────────────────────────────────
  // This test's contract is "EVERY number the engine uses IS the kit's", so
  // the two the owner added on 17.08 belong on the list the day they are
  // added — otherwise the contract quietly stops being true. Their own proof
  // (the geometry, the BOM and the room) is turn37-f6-shoe-front.test.js.
  assert.equal(C.battenBack, lispConst('SHOE_BATTEN_BACK'), '30 off the batten\'s front');
  assert.equal(C.frontReveal, lispConst('SHOE_FRONT_REVEAL'), '10 of reveal to BUL and BUR');
  assert.equal(C.runnerFrontFix, lispConst('SHOE_RUNNER_FRONT_FIX'), '37 from the runner face');
  // …and the two names the kit's own layer maker writes.
  assert.match(LISP, /"SHOE_GROOVE_6MM"/);
  assert.match(LISP, /"SHOE_RUNNER_5MM"/);
  assert.equal(C.layers.groove, 'SHOE_GROOVE_6MM');
  assert.equal(C.layers.runner, 'SHOE_RUNNER_5MM');
  assert.equal(C.layers.screw, 'SCREWS_3MM', 'the FIX pilots reuse the ⌀3 screw layer');
});

test('SHOE_RUNNER_MAP: the engine mirrors the owner\'s sheet, rung for rung', () => {
  // Parsed off the kit: ((150 . 77.2) (200 . 128.0) …)
  const from = LISP.indexOf('(setq SHOE_RUNNER_MAP');
  const to = LISP.indexOf('(setq SHOE_RUNNER_FRONT_FIX');
  assert.ok(from > 0 && to > from, 'the map is in the kit');
  const pairs = [...LISP.slice(from, to).matchAll(/\((\d+)\s*\.\s*([\d.]+)\)/g)]
    .map(([, nl, col]) => [Number(nl), Number(col)]);
  assert.equal(pairs.length, 12, 'twelve rungs on the sheet');
  const engine = shoeRunnerMap(P);
  for (const [nl, col] of pairs) {
    assert.equal(engine.get(nl), col, `NL${nl} column`);
  }
  assert.equal(engine.size, pairs.length, 'and not one rung the sheet does not carry');
  assert.deepEqual(shoeRunnerLadder(P),
    [150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700]);
  // The snap grammar: the largest rung not above the depth; an explicit ask wins.
  assert.equal(shoeRunnerNl(475, P), 450);
  assert.equal(shoeRunnerNl(700, P), 700);
  assert.equal(shoeRunnerNl(149, P), null, 'below the whole sheet');
  assert.equal(shoeRunnerNl(475, P, 500), 500, 'an explicit NL wins');
});

// ─── section B: the angle law ──────────────────────────────────────────────

test('angle law v2: the WHOLE bottom stays inside — cap = wall − board·cos a', () => {
  // ─── REWRITTEN 16.08.2026 (chat-fix, owner): "dno ma za duży skos,
  // wychodzi poza obręb boxa" ── v1 capped the UNDERSIDE at the wall top and
  // the board's thickness broke out above the side. v2's cap subtracts the
  // board (G + groove play) standing on the slope.
  const G = 18;
  const board = G + C.groovePlay;

  // Shallow: exactly 10°, nowhere near any cap.
  const shallow = shoeRearEdge(300, P, G); // angle law: owner's 7° since 16.08 (was 10)
  assert.ok(Math.abs(shallow - 300 * Math.tan((7 * Math.PI) / 180)) < 1e-9);
  assert.ok(Math.abs(shoeAngleDeg(300, shallow) - 7) < 1e-9, 'exactly 7°');

  // Deep: the rear edge pins BELOW the wall by the board's own height on the
  // slope — the top of the bottom finishes flush with (never above) the wall.
  const deep = shoeRearEdge(600, P, G);
  const aDeep = Math.atan2(deep, 600);
  assert.ok(deep < C.wallH, 'below the wall, not at it — the board needs its room');
  assert.ok(deep + board * Math.cos(aDeep) <= C.wallH + 1e-6,
    'underside + board thickness stays inside the box');
  assert.ok(shoeAngleDeg(600, deep) <= 7 + 1e-9);

  // The cap never goes negative on any sane depth.
  assert.ok(shoeRearEdge(50, P, G) >= 0);
});

// ─── the width law, both variants ──────────────────────────────────────────

test('FIX takes the whole opening; DRAWER loses 2 × 13 and 30 per hinged side', () => {
  assert.equal(shoeBoxWidth({ openingW: 564, variant: 'F', profile: P }), 564);
  // W − 26, nothing hinged.
  assert.equal(shoeBoxWidth({ openingW: 564, variant: 'D', profile: P }), 564 - 26);
  // …and 30 more per hinged side.
  assert.equal(shoeBoxWidth({
    openingW: 564, variant: 'D', hingedLeft: true, profile: P,
  }), 564 - 26 - 30);
  assert.equal(shoeBoxWidth({
    openingW: 564, variant: 'D', hingedLeft: true, hingedRight: true, profile: P,
  }), 564 - 26 - 60);
});

// ─── the plan itself: the six pieces and the groove in all four walls ──────

const plan = (over = {}) => shoeBoxPlan({
  openingW: 564, depth: 450, boardT: 18, frontT: 18, variant: 'F', dividers: 1, profile: P, ...over,
});

test('the box is 2 sides + back + box front, ALL 80 high, from the CARCASS board', () => {
  const p = plan();
  const walls = p.panels.filter((x) => ['side', 'back', 'boxFront'].includes(x.role));
  assert.equal(walls.length, 4, '"plecki ważne, czyli skrzyneczka z 3 stron" + front');
  for (const w of walls) {
    assert.equal(w.h, 80, `${w.role} is 80 high`);
    assert.equal(w.thickness, 18, `${w.role} is cut from the project carcass board`);
  }
  // The sides run the box's DEPTH; the back and box front the INNER width.
  assert.deepEqual(p.panels.filter((x) => x.role === 'side').map((x) => x.w), [450, 450]);
  assert.equal(p.panels.find((x) => x.role === 'back').w, 564 - 36);
  assert.equal(p.panels.find((x) => x.role === 'boxFront').w, 564 - 36);
});

test('the groove is 6 deep in ALL FOUR walls, width = bottom + 0.2', () => {
  const p = plan();
  const grooved = p.panels.filter((x) => (x.pockets || [])
    .some((k) => k.layer === 'SHOE_GROOVE_6MM'));
  assert.deepEqual(grooved.map((x) => x.role), ['side', 'side', 'back', 'boxFront'],
    'all four walls, and only the walls');
  for (const w of grooved) {
    for (const k of w.pockets) assert.equal(k.depth, 6);
  }
  assert.equal(p.slope.grooveW, 18.2, 'bottom G + 0.2 of play');

  // The SIDE groove is the kit's PARALLELOGRAM: lower edge (G,0) → (depth−G,
  // rear), width taken PERPENDICULAR to the slope.
  const side = p.panels.find((x) => x.role === 'side');
  const g = side.pockets[0];
  assert.equal(g.pts.length, 4);
  assert.deepEqual(g.pts[0], [18, 0], 'the box floor at the inner face of the box front');
  assert.deepEqual(g.pts[1], [450 - 18, p.slope.rear], 'up to the inner face of the back');
  const width = Math.hypot(g.pts[3][0] - g.pts[0][0], g.pts[3][1] - g.pts[0][1]);
  assert.ok(Math.abs(width - 18.2) < 1e-3, 'and its width is perpendicular, not vertical');

  // The BACK's is horizontal at the rear-edge height; the FRONT's at the floor.
  const back = p.panels.find((x) => x.role === 'back').pockets[0];
  assert.equal(back.y1, p.slope.rear);
  assert.ok(Math.abs(back.y2 - (p.slope.rear + 18.2)) < 1e-6);
  const bf = p.panels.find((x) => x.role === 'boxFront').pockets[0];
  assert.equal(bf.y1, 0);
  assert.ok(Math.abs(bf.y2 - 18.2) < 1e-6);
});

test('the bottom engages 6 into every wall, and its GRAIN runs ACROSS', () => {
  const p = plan();
  const bottom = p.panels.find((x) => x.role === 'bottom');
  assert.equal(bottom.w, p.innerW + 12, 'inner width + 6 each side');
  assert.ok(Math.abs(bottom.h - (p.slope.slopeLen + 12)) < 1e-6, 'slope length + 6 each end');
  // "pamiętaj, żeby dno były słoje w poprzek" — along the WIDTH, and the piece
  // says so, the way T33's eye-tests pin grain.
  assert.equal(bottom.grain, 'w');
  // The slope length is the hypotenuse, never the flat run.
  assert.ok(p.slope.slopeLen > p.slope.run);
  assert.ok(Math.abs(p.slope.slopeLen
    - Math.hypot(p.slope.run, p.slope.rear)) < 0.01);
});

test('the divider is 0 or 1, 50 high, ACROSS the width, standing on the slope', () => {
  assert.equal(plan({ dividers: 0 }).panels.filter((x) => x.role === 'divider').length, 0);
  assert.equal(plan({ dividers: 5 }).panels.filter((x) => x.role === 'divider').length, 1,
    '"jedna lub 0 przegródek — 2 nie mają sensu"');
  const p = plan();
  const d = p.panels.find((x) => x.role === 'divider');
  assert.equal(d.h, 50);
  assert.equal(d.w, p.innerW, 'left to right — "jak będą 2 rzędy butów"');
  assert.equal(d.seat.atRunMm, p.slope.run / 2, 'at mid-run');
  assert.ok(Math.abs(d.seat.heightMm - p.slope.rear / 2) < 0.01, 'and it stands ON the slope');
});

test('a FRONT on BOTH variants, 120 high — and the material law differs', () => {
  const fix = plan({ variant: 'F' }).panels.find((x) => x.role === 'front');
  assert.equal(fix.h, 120);
  assert.equal(fix.w, 564, 'FIX: the full opening width');
  assert.equal(fix.family, 'carcass',
    '"nie ze spray tylko z materiału carcasowego — widać ciętą płytę"');

  const drw = plan({ variant: 'D', hingedLeft: true }).panels.find((x) => x.role === 'front');
  assert.equal(drw.h, 120);
  // ─── RE-PINNED 17.08.2026 (T37-F6) ────────────────────────────────────────
  // What this line asserted from T34 until this date, and WHY it was right
  // then, kept verbatim so the history reads:
  //
  //     assert.equal(drw.w, 564 - 26 - 30, 'DRAWER: the narrowed box\'s own
  //                  width');
  //
  // The drawer face WAS the box's own width — opening less 2 × 13 of runner
  // and 30 more for the one hinged side — because the box was what it was
  // screwed to and nobody had looked at it in the room yet.
  //
  // The owner then looked at it: *"rozszerz front szuflady, tak żeby zostało
  // po prawej i po lewej od BUR i BUL około 10 mm — będzie wyglądać lepiej, a
  // i tak się otworzy."* So the face is now the OPENING less 2 × 10, which is
  // 66 mm wider than the box it hangs on and covers the batten-and-runner zone
  // the old width left as daylight. `SHOE_FRONT_REVEAL` in KIT_SHOE_BOX.lsp is
  // the law; the whole of it is proved next door in turn37-f6-shoe-front.
  assert.equal(drw.w, 564 - 20, 'DRAWER: the opening less 10 mm of reveal each side');
  assert.ok(drw.w > (564 - 26 - 30), 'and it is WIDER than the box — deliberately');
  assert.equal(drw.family, 'fronts', 'a front like every other front');
});

// ─── the mounting laws ─────────────────────────────────────────────────────

test('FIX: 3 × ⌀3 through-pilots per side, 50 from each end + the middle', () => {
  const p = plan({ variant: 'F', depth: 450, frontT: 18 });
  const perSide = (s) => p.drills.filter((d) => d.side === s);
  assert.equal(perSide('L').length, 3);
  assert.equal(perSide('R').length, 3);
  for (const d of p.drills) {
    assert.equal(d.d, 3);
    assert.equal(d.layer, 'SCREWS_3MM', 'driven from OUTSIDE — "środek: nie widać nic"');
    assert.equal(d.y, 40, 'the row at box mid height (posZ 0 + 40)');
  }
  // boxFrontX = frontT + 3 = 21 (the kit computes it for BOTH variants).
  assert.equal(p.boxFrontX, 21);
  assert.deepEqual(perSide('L').map((d) => d.x), [21 + 50, 21 + 225, 21 + 450 - 50]);
  // …and there is NO runner drilling on a fix.
  assert.equal(p.runner, null);
  assert.equal(shoeRunnerSpec(p, P), null, 'a fix buys nothing — it is screwed');
});

test('DRAWER: the face is frontT + 3, first fix 37, the rear at the NL column', () => {
  const p = plan({
    variant: 'D', depth: 450, frontT: 18, hingedLeft: true, hingedRight: true,
  });
  assert.equal(p.runner.faceX, 21, '"pamiętaj żeby cofnąć na front + 3 mm"');
  assert.equal(p.runner.nl, 450, 'the depth snapped to the sheet');
  assert.equal(p.runner.column, shoeRunnerMap(P).get(450));
  const xs = p.drills.filter((d) => d.side === 'L').map((d) => d.x);
  assert.deepEqual(xs, [21 + 37, 21 + 352], 'first fixing 37 from the face, rear at the column');
  for (const d of p.drills) {
    assert.equal(d.d, 5, 'euro');
    assert.equal(d.layer, 'SHOE_RUNNER_5MM');
    assert.equal(d.y, 40);
  }
  // The BOM's half: a YELLOW named spec, never an article.
  const spec = shoeRunnerSpec(p, P);
  assert.equal(spec.system, 'Side-mount shoe runner');
  assert.equal(spec.width_mm, 13);
  assert.equal(spec.complete, false);
  assert.deepEqual(spec.articles, { L: null, R: null });
});

test('an NL off the sheet drills NOTHING and says so — the kit\'s refusal grammar', () => {
  const p = plan({ variant: 'D', depth: 450, runnerNl: 475 });
  assert.equal(p.runner.nl, 475);
  assert.equal(p.runner.column, null);
  assert.equal(p.runner.onSheet, false);
  assert.deepEqual(p.drills, [], 'no hole is invented');
  assert.equal(p.warnings[0].code, 'SHOE_RUNNER_NL_OFF_SHEET');
  assert.match(p.warnings[0].message, /not on the owner's sheet/);
});

test('the position field: default 0 on the bay floor, and the row moves with it', () => {
  assert.equal(plan().posZ, 0, 'default 0 — on the floor');
  const raised = plan({ posZ: 300 });
  assert.equal(raised.posZ, 300);
  for (const d of raised.drills) assert.equal(d.y, 340, 'posZ + 40, the whole row');
});

// ─── in a real cabinet ─────────────────────────────────────────────────────

const wardrobe = (items, over = {}) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P),
  unit_num: '01',
  doors: true,
  ...over,
  sections: [{ width_mm: over.width ?? defaultParamsFor('WARDROBE', P).width, items }],
}, P);

test('a FIX shoe box cuts seven boards and drills six pilots into the carcass sides', () => {
  const r = wardrobe([{ id: 'sb1', kind: 'shoe_box', variant: 'F', dividers: 1 }]);
  const cut = r.panels.filter((p) => p.id.startsWith('SHOE1-'));
  assert.deepEqual(cut.map((p) => p.meta.shoe_role).sort(),
    ['back', 'bottom', 'boxFront', 'divider', 'front', 'side', 'side']);
  const pilots = r.drills.filter((d) => d.kind === 'shoe_pilot');
  assert.equal(pilots.length, 6, '3 per side');
  assert.deepEqual([...new Set(pilots.map((d) => d.panel))].sort(), ['BUL', 'BUR']);
  // The right-hand side is the mirror of the left, about the panel's own width.
  const side = r.panels.find((p) => p.id === 'BUL');
  const L = pilots.filter((d) => d.panel === 'BUL').map((d) => d.x).sort((a, b) => a - b);
  const R = pilots.filter((d) => d.panel === 'BUR').map((d) => side.w - d.x).sort((a, b) => a - b);
  assert.deepEqual(R, L, 'the two sides carry the same row, mirrored');
  // Nothing bought: a fix is screwed.
  assert.equal(r.hardware.filter((h) => h.role === 'shoe_runner_pairs').length, 0);
});

test('a DRAWER shoe box narrows by W − 26 and orders a YELLOW runner line', () => {
  const r = wardrobe([{ id: 'sb1', kind: 'shoe_box', variant: 'D', dividers: 0 }], { width: 900 });
  const sb = r.assemblies.shoeBoxes[0];
  const hinged = (sb.hinged.left ? 1 : 0) + (sb.hinged.right ? 1 : 0);
  assert.equal(sb.boxW, sb.openingW - 26 - 30 * hinged);
  const line = r.hardware.find((h) => h.role === 'shoe_runner_pairs');
  assert.ok(line, 'the pair is ordered');
  assert.equal(line.spec.complete, false, 'YELLOW: no article to order against');
  assert.match(line.spec_label, /Side-mount shoe runner/);
  assert.match(line.spec_label, /13 mm per side/);
  assert.match(line.spec_label, /article unknown/);
  // …and it is NOT the MOVENTO family.
  assert.ok(!/MOVENTO/.test(line.spec_label));
});

test('the shoe box reads the ONE dpSideLaw — the same 30 the drawer stack takes', () => {
  // The turn33-f6 edge-length proof, on a SECOND reader. `dpSideLaw` is one
  // object in engine/cabinet.js — `{ left: doorCount === 2 || hinge === 'L',
  // right: doorCount === 2 || hinge === 'R' }` — and the shoe box is handed it
  // rather than re-deriving anything. So the box narrows on exactly the sides
  // the drawer machinery's standoff stands on, and by exactly 30 each.
  const box = (doors, hinge) => wardrobe(
    [{ id: 'sb1', kind: 'shoe_box', variant: 'D' }],
    { width: 900, doors, hinge },
  ).assemblies.shoeBoxes[0];

  const two = box({ count: 2 }, 'L');
  const leftOnly = box({ count: 1 }, 'L');
  const rightOnly = box({ count: 1 }, 'R');

  assert.deepEqual(two.hinged, { left: true, right: true });
  assert.deepEqual(leftOnly.hinged, { left: true, right: false });
  assert.deepEqual(rightOnly.hinged, { left: false, right: true });

  // One hinged side costs 30; two cost 60. The bare width is W − 26.
  assert.equal(leftOnly.boxW, leftOnly.openingW - 26 - 30);
  assert.equal(rightOnly.boxW, rightOnly.openingW - 26 - 30);
  assert.equal(two.boxW, two.openingW - 26 - 60);
  assert.equal(leftOnly.boxW - two.boxW, 30, 'exactly 30 per hinged side, from the one law');

  // And the law it read is the SAME one the drawer stack reads: a cabinet with
  // drawers puts its DP standoff on those same sides.
  const withDrawers = computeCabinet({
    ...defaultParamsFor('WARDROBE', P), unit_num: '01', width: 900, doors: { count: 1 }, hinge: 'R', drawers: 2,
  }, P);
  const dps = withDrawers.panels.filter((p) => p.part === 'DP');
  assert.ok(dps.length >= 1, 'the stack stood its drawer panel');
  assert.deepEqual([...new Set(dps.map((p) => p.meta.side))], ['R'],
    'the standoff is on the hinged side — and so was the shoe box\'s 30');
});

test('the T33 pinned shelf is UNTOUCHED — no silent migration', () => {
  // A project saved as the 15° shoe SHELF keeps rendering exactly as saved:
  // same variant, same tilt, same stop rail, and NOT a box.
  const r = wardrobe([{ id: 's1', kind: 'shelf', pos_mm: 400, variant: 'shoe' }]);
  const shelf = r.panels.find((p) => p.part === 'SHELF' && p.meta?.variant === 'shoe');
  assert.ok(shelf, 'the shelf is still cut');
  assert.equal(shelf.meta.tilt_deg, P.wardrobeAccessories.shoeShelf.tiltDeg);
  assert.equal(shelf.meta.tilt_deg, 15);
  assert.ok(r.panels.some((p) => p.part === 'SHOE-RAIL'), 'the stop rail still rides with it');
  assert.equal(r.panels.filter((p) => p.id.startsWith('SHOE1-')).length, 0, 'and no box appeared');
  // …and `assemblies.shoeBoxes` is ABSENT rather than empty — iron rule 2:
  // a cabinet with no box must be byte-identical to main, and an empty list
  // published on every cabinet in the app is a delta that says nothing.
  assert.equal(r.assemblies.shoeBoxes, undefined);
});

test('a bay too small for a box is REFUSED and named — never half-cut', () => {
  const p = shoeBoxPlan({
    openingW: 30, depth: 450, boardT: 18, variant: 'F', profile: P,
  });
  assert.deepEqual(p.panels, []);
  assert.equal(p.warnings[0].code, 'SHOE_BOX_TOO_SMALL');
});

// ─── the UI half: one selectable thing, its own modal, and the grey note ───

test('the box is ONE selectable element with its own modal — any board reaches it', () => {
  const r = wardrobe([{ id: 'sb1', kind: 'shoe_box', variant: 'D', dividers: 1 }], { width: 900 });
  const boards = r.panels.filter((p) => p.id.startsWith('SHOE1-'));
  // CHAT-FIX 16.08 (owner): a DRAWER box behind hinged doors carries a
  // physical SHOE-INFILL board per hinged side ("boczna ścianka, bo
  // zawiasy") — the default 900 wardrobe has two doors, so 7 + 2.
  const infills = boards.filter((p) => p.part === 'SHOEBOX-BATTEN');
  assert.equal(infills.length, 2, 'one board per hinged side');
  assert.equal(boards.length, 9);
  for (const b of boards) {
    assert.equal(elementKind(b), 'shoe-box');
    assert.ok(isMainViewElement(b), 'clickable in the room, like a shelf');
    assert.match(elementLabel(b), /^Shoe box \(drawer\) — /);
    // The owner's decisions, and only those.
    // ─── TURN 36 (CLAUDE.md F3): A FOURTH ONE — THE FRONT ──────────────────
    // His closing word on T35-F3: *"punkt 3 — tak, z przełącznikiem"*. The
    // 120 mm decorative face becomes a switch, DEFAULT ON, so every box cut
    // before 17.08 is the box it was. It sits beside the variant because it
    // is the same kind of decision — what this box IS — and before the
    // divider, which is what is inside it.
    assert.deepEqual(elementFields(b),
      ['shoe-box-variant', 'shoe-box-front', 'shoe-box-dividers', 'shoe-box-height', 'material']);
    // It comes out in one piece; it is not dragged — the height field is where
    // it stands, because that is the number the carcass side is drilled for.
    assert.equal(elementActions(b).remove.allowed, true);
    assert.equal(elementActions(b).move.allowed, false);
    // …and deleting ANY board deletes the BOX, through the item every removal
    // path already reads.
    assert.equal(b.meta.itemId, 'sb1');
  }
});

test('the T33 stop rail is STILL not selectable — the retired shelf did not move', () => {
  const r = wardrobe([{ id: 's1', kind: 'shelf', pos_mm: 400, variant: 'shoe' }]);
  const rail = r.panels.find((p) => p.part === 'SHOE-RAIL');
  assert.ok(rail, 'the rail is still cut with the shelf');
  assert.equal(elementKind(rail), null,
    'the box\'s prefix is SHOEBOX-, so SHOE-RAIL is untouched');
});

test('the wizard-free UI half is wired: an Add-items entry and a grey note', () => {
  const add = readFileSync(new URL('../src/components/AddItems.jsx', import.meta.url), 'utf8');
  assert.match(add, /id: 'shoe_box',\s*\n\s*label: 'Shoe box'/);
  assert.match(add, /data-add-shoe-box="1"/);
  assert.match(add, /data-shoe-box-variant=\{id\}/);
  assert.match(add, /data-shoe-box-dividers=\{n\}/);
  assert.match(add, /data-shoe-box-height="1"/);
  // …and the shelf that was retired says so, once, in grey.
  const props = readFileSync(new URL('../src/components/ElementProperties.jsx', import.meta.url), 'utf8');
  assert.match(props, /data-shoe-shelf-note="1"/);
  assert.match(props, /older pinned shoe shelf/);
  assert.match(props, /shelfTypeOf\(item\) === 'shoe' && \(/);
  // The three modal controls.
  for (const f of ['shoe-box-variant', 'shoe-box-dividers', 'shoe-box-height']) {
    assert.ok(props.includes(`case '${f}':`), `${f} has a control`);
  }
});


// ─── CHECK #12 — CHAT-FIX 16.08 (owner, decision C) ─────────────────────────
// "jest clash hinges i fix shelf i nie pokazuje tego problemu" — the rule
// REPORTS (house grammar: never fixes): a FULL-WIDTH fixed box whose front
// band (posZ … posZ+120) contains a hinge centre goes red; raised clear, it
// goes silent.
test('check #12: a fixed shoe box in the swing of a hinge arm goes red', async () => {
  const { runChecks } = await import('../src/engine/checks.js');
  const mk = (pos) => ({
    ...defaultParamsFor('WARDROBE', P),
    width: 900,
    unit_num: '01',
    sections: [{ width_mm: 900, items: [{ id: 'sb1', kind: 'shoe_box', variant: 'F', ...(pos != null ? { pos_mm: pos } : {}) }] }],
  });
  const run = (params) => runChecks({
    entries: [{ unit: { id: 'u1', type: 'WARDROBE', params }, result: computeCabinet(params, P) }],
    profile: P,
  }).filter((f) => f.check === 12);

  const onFloor = run(mk(null));
  assert.equal(onFloor.length, 1, 'hinge at 100 sits inside the 0–120 band');
  assert.equal(onFloor[0].level, 'red');
  assert.match(onFloor[0].message, /raise the box or move the hinge/);

  const raised = run(mk(150));
  assert.equal(raised.length, 0, 'band 150–270 clears the 100 and 490 hinges');
});
