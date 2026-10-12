// ─── T78 F18 · LIFT-UP WALL UNITS, BLUM AVENTOS: HK top | HS top | HL top | HF top ──
//
// The owner, 11.10.2026: *"szafki poziome otwierane do gory system blum ...
// podwojne drzwi pojedyncze etc."*  CLAUDE.md T78 F18: four FRONT MOTIONS on a
// wall unit (WUD, WUD_GLASS, WARDROBE_WALL), chosen in the Doors section as the
// opening (`front_system`); the leaf has NO hinge cups; the lift arms are the
// hardware, drilled NOTHING until the catalogue's fixing pattern is in
// `reference/hardware/aventos.json` with its page; a front whose power factor
// no unit covers is refused in words (T19's own rule); collision with the
// ceiling, a cornice and the unit above is a Check; the BOM carries the lift
// article and the cover caps and no cups; one golden per system on a 600 x 720
// WUD.
//
// Three groups:
//   A. the module, engine/liftSystems.js, which needs no patch: the kits that
//      take a lift, the selection per system off the catalogue file (every
//      number asserted AGAINST THE FILE, never retyped), the rise, the path,
//      the sentences, the zero holes;
//   B. Check #35 (engine/liftChecks.js), on synthetic results, so it runs
//      with or without the cabinet patch;
//   C. the integrated cut (`computeCabinet` with `front_system`), the BOM,
//      the registry, the scene's and the panel's source, and the four goldens:
//      these run once the scratchpad patches (f18-cabinet-lift.patch,
//      f18-unitview-lift.patch, f18-rightpanel-front-opens.patch,
//      f18-part-registry.patch, f18-checks-35.patch) are in, and SKIP, saying
//      so, while they are not.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import {
  FRONT_SYSTEMS, LIFT_LABELS, LIFT_SYSTEMS, liftData, liftPlanFor, liftRiseMm, liftSystemData, liftSystemOf, liftTakesKit,
  liftTravelAt,
} from '../src/engine/liftSystems.js';
import { LIFT_CLEARANCE_CHECK, liftClearanceFindings, liftObstacles } from '../src/engine/liftChecks.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, getUnitType } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { boardKgM2, frontWeightKg, powerFactor } from '../src/engine/lifts.js';
import { HARDWARE_TO_PART_ID, PART_REGISTRY } from '../src/engine/partRegistry.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import { runChecks } from '../src/engine/checks.js';
import { goldenOf } from '../scripts/t75-golden.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const J = JSON.parse(read('reference/hardware/aventos.json'));
const F = J.t78_f18;

const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });
const near = (a, b, tol = 1e-6) => Math.abs(Number(a) - Number(b)) <= tol;

/** The 600 x 720 x 400 WUD of profile.wallUnit.defaults, as the plan sees it. */
const WUD = kit('WUD');
const CAB = {
  widthMm: WUD.width, heightMm: WUD.height, depthMm: WUD.depth, innerDepthMm: WUD.depth - WUD.board_t, boardMm: WUD.board_t,
};
const LEAF = { widthMm: WUD.width - P.doors.gap, heightMm: WUD.height - P.doors.gap, thicknessMm: WUD.front_t };
const plan = (system, extra = {}) => liftPlanFor({
  system, cabinet: CAB, leaf: LEAF, gapMm: P.doors.gap, profile: P, ...extra,
});

/** Is the cabinet.js patch in? (A lift leaf carries `meta.lift`.) */
const PATCHED = (() => {
  const r = computeCabinet(kit('WUD', { front_system: 'hk' }), P);
  return r.panels.some((p) => p.part === 'FRONT' && p.meta?.lift);
})();
const NOT_IN = 'the F18 cabinet.js patch (scratchpad/patches/f18-cabinet-lift.patch) is not in this tree';

// ═══ A. THE MODULE: THE KITS, THE SELECTION, THE RISE, THE PATH, THE WORDS ═══

test('F18 · no em dash and no en dash in the files F18 wrote', () => {
  for (const rel of ['src/engine/liftSystems.js', 'src/engine/liftChecks.js', 'test/turn78-f18-aventos.test.js', 'scripts/t78-classify.d/f18.mjs']) {
    if (!existsSync(`${ROOT}${rel}`)) continue;
    const txt = read(rel);
    assert.equal(txt.includes(String.fromCharCode(0x2014)), false, `${rel}: em dash`);
    assert.equal(txt.includes(String.fromCharCode(0x2013)), false, `${rel}: en dash`);
  }
});

test('F18 · the four systems, in CLAUDE.md\'s order; hinged is the fifth word and the default', () => {
  assert.deepEqual([...LIFT_SYSTEMS], ['hk', 'hs', 'hl', 'hf']);
  assert.deepEqual([...FRONT_SYSTEMS], ['hinged', 'hk', 'hs', 'hl', 'hf']);
  assert.deepEqual(Object.keys(F.systems), [...LIFT_SYSTEMS], 'the data file names the same four');
  for (const s of LIFT_SYSTEMS) assert.deepEqual(liftSystemData(s), F.systems[s], `${s}: the module reads the file\'s own record`);
  assert.deepEqual(liftData(), F);
});

test('F18 · the kits that take a lift: WUD, WUD_GLASS, WARDROBE_WALL; a hood, an L, a blind, a base, a desk and a drop front do not', () => {
  for (const id of ['WUD', 'WUD_GLASS', 'WARDROBE_WALL']) assert.equal(liftTakesKit(getUnitType(id)), true, id);
  for (const id of ['WUD_HOOD', 'CORNER_L_WALL', 'BLIND_WALL', 'BUD', 'BUDTALL', 'WARDROBE', 'WARDROBE_DESK', 'DW_PANEL', 'WARDROBE_TOP']) {
    assert.equal(liftTakesKit(getUnitType(id)), false, id);
  }
  assert.equal(liftTakesKit(null), false);
  // The choice is read only where the kit takes one: a stale field is a field, not an order.
  assert.equal(liftSystemOf({ front_system: 'hk' }, getUnitType('WUD')), 'hk');
  assert.equal(liftSystemOf({ front_system: 'hf' }, getUnitType('WARDROBE_WALL')), 'hf');
  assert.equal(liftSystemOf({ front_system: 'hk' }, getUnitType('WUD_HOOD')), null);
  assert.equal(liftSystemOf({ front_system: 'hinged' }, getUnitType('WUD')), null);
  assert.equal(liftSystemOf({}, getUnitType('WUD')), null);
  assert.equal(liftSystemOf({ front_system: 'sideways' }, getUnitType('WUD')), null);
});

test('F18 · the front\'s weight and the power factor are T19\'s own maths on the profile board table', () => {
  const p = plan('hk');
  const kgM2 = boardKgM2({ thickness: LEAF.thicknessMm, kind: P.board.defaultKgM2Kind, profile: P }).kgM2;
  assert.equal(kgM2, P.board.kgM2.mfc[String(LEAF.thicknessMm)], 'the 25 mm MFC row');
  assert.ok(near(p.weightKg, frontWeightKg({ widthMm: LEAF.widthMm, heightMm: LEAF.heightMm, kgM2 })));
  assert.ok(near(p.pf, powerFactor({ cabinetHeightMm: CAB.heightMm, frontWeightKg: p.weightKg })));
  assert.ok(near(p.pf, 720 * (0.597 * 0.717 * 16.5), 1e-6), 'KH x (area x kg/m2)');
});

test('F18 · HK top: T19\'s selectLiftUnit picks the set; the article is the file\'s 22K set for that unit; cap 18 kg; angle 107', () => {
  const p = plan('hk');
  const K = F.systems.hk;
  // pf 5085 lies in 2700 (1730 to 5200) and in no smaller unit: T19's ladder, the file's ranges.
  const expected = J.power_units_hk_top.filter((u) => p.pf >= u.pf[0] && p.pf <= u.pf[1]).sort((a, b) => a.pf[0] - b.pf[0])[0];
  assert.equal(p.derived.power_unit, expected.unit);
  assert.equal(p.lift.article, K.liftMechanismSets.find((s) => s.existingUnit === expected.unit).set);
  assert.equal(p.lines.unit.spec.article, p.lift.article);
  assert.equal(p.lines.arm, null, 'the HK top has no lever arm set');
  assert.equal(p.lines.caps.spec.article, K.coverCaps.standard.article);
  assert.equal(p.lines.bracket.spec.article, F.shared.frontFixingBrackets.woodAndWideAlu.article);
  assert.equal(p.lines.bracket.spec.template, F.shared.frontFixingBrackets.markingTemplate.article);
  assert.equal(p.lines.hinges, null, 'no hinge set on a one-leaf lift');
  assert.equal(p.lift.angleDeg, K.animation.openDeg.full);
  assert.equal(p.lift.travel, null);
  assert.equal(p.lift.placeholderPath, false, 'the HK path is the catalogue angle, not a placeholder');
  // The 720 WUD is over the HK top's KH 205 to 600: said in T19's words, not refused (the set still proposed).
  assert.ok(p.warnings.some((w) => w.code === 'LIFT_CABINET' && /205/.test(w.message) && /600/.test(w.message)));
  assert.equal(p.warnings.some((w) => w.code === 'LIFT_NO_UNIT'), false);
  // The 18 kg cap: a 1800 x 600 leaf in 25 MFC weighs 17.8 kg, a 1800 x 650 one 19.3: the second is refused in words.
  const heavy = liftPlanFor({
    system: 'hk', cabinet: { ...CAB, widthMm: 1800, heightMm: 650 }, leaf: { widthMm: 1797, heightMm: 647, thicknessMm: 25 }, profile: P,
  });
  assert.ok(heavy.weightKg > K.frontWeightMaxKg.value);
  assert.ok(heavy.warnings.some((w) => w.code === 'LIFT_FRONT_WEIGHT' && /18 kg/.test(w.message)), 'the cap, in its own sentence');
  assert.ok(heavy.warnings.some((w) => w.code === 'LIFT_NO_UNIT'), 'and the ladder refuses it too (LF over 9000)');
  assert.equal(heavy.lift.refused, 'LIFT_NO_UNIT');
  assert.equal(heavy.lift.article, null);
});

test('F18 · HK top: a front too light or too heavy for the ladder is REFUSED in words (LIFT_NO_UNIT), the line stays with no article', () => {
  const light = liftPlanFor({
    system: 'hk', cabinet: { ...CAB, heightMm: 300 }, leaf: { widthMm: 297, heightMm: 297, thicknessMm: 18 }, profile: P,
  });
  assert.ok(light.pf < J.power_units_hk_top[0].pf[0], 'under the 2300 unit\'s floor');
  assert.equal(light.lift.article, null);
  assert.equal(light.lines.unit.spec.article, null);
  assert.equal(light.lines.unit.spec.refused, 'LIFT_NO_UNIT');
  const w = light.warnings.find((x) => x.code === 'LIFT_NO_UNIT');
  assert.ok(w && /too light/.test(w.message), w?.message);
  assert.match(light.lines.unit.specLabel, /refused/);
});

test('F18 · HS top: the set by cabinet height AND front weight band (en/34), the lever arm 22S3500, the shared caps 22.8000, no angle, placeholder path', () => {
  const p = plan('hs');
  const S = F.systems.hs;
  const hit = S.liftMechanismSets.find((s) => s.bands.some((b) => CAB.heightMm >= b.cabinetHeightKHMm[0] && CAB.heightMm <= b.cabinetHeightKHMm[1]
    && p.weightKg >= b.frontWeightFGKg[0] && p.weightKg <= b.frontWeightFGKg[1]));
  assert.equal(hit.set, '22S2800', 'KH 720 in 650 to 800, FG 7.1 in 3.5 to 18.5');
  assert.equal(p.lift.article, hit.set);
  assert.equal(p.lines.arm.spec.article, S.leverArm.set);
  assert.equal(p.lines.caps.spec.article, F.shared.coverCapsTop.standard.article);
  assert.equal(p.lift.angleDeg, null);
  assert.equal(p.lift.travel, null, 'the file has no HS keyframes');
  assert.equal(p.lift.placeholderPath, true);
  assert.equal(p.lift.riseMm, LEAF.heightMm, 'the placeholder path: a plain rise of the leaf height');
  assert.equal(p.warnings.some((w) => w.code === 'LIFT_NO_UNIT' || w.code === 'LIFT_CABINET'), false);
  // A 900 high cabinet is outside KH 350 to 800: refused in words and the limit said.
  const tall = liftPlanFor({ system: 'hs', cabinet: { ...CAB, heightMm: 900 }, leaf: { ...LEAF, heightMm: 897 }, profile: P });
  assert.equal(tall.lift.article, null);
  assert.ok(tall.warnings.some((w) => w.code === 'LIFT_NO_UNIT'));
  assert.ok(tall.warnings.some((w) => w.code === 'LIFT_CABINET' && /350 to 800/.test(w.message)));
  assert.equal(tall.lines.arm.spec.article, null, 'the arm set covers 350 to 800 only');
});

test('F18 · HL top: a 720 WUD is over KH 300 to 580: no set, refused in words; a 500 one takes 22L2500 and the 22L3800 arm', () => {
  const p = plan('hl');
  const L = F.systems.hl;
  assert.equal(p.lift.article, null);
  assert.ok(p.warnings.some((w) => w.code === 'LIFT_NO_UNIT' && /22L2200/.test(w.message) && /22L2500/.test(w.message)));
  assert.ok(p.warnings.some((w) => w.code === 'LIFT_CABINET' && /300 to 580/.test(w.message)));
  assert.equal(p.lines.arm.spec.article, null);
  const low = liftPlanFor({ system: 'hl', cabinet: { ...CAB, heightMm: 500 }, leaf: { ...LEAF, heightMm: 497 }, profile: P });
  const set = L.liftMechanismSets.find((s) => 500 >= s.cabinetHeightKHMm[0] && 500 <= s.cabinetHeightKHMm[1]
    && low.weightKg >= s.frontWeightFGKg[0] && low.weightKg <= s.frontWeightFGKg[1]);
  assert.equal(set.set, '22L2500');
  assert.equal(low.lift.article, set.set);
  // Two arm sets overlap at 480 to 540 (22L3800 and 22L3900): the first is taken, T19's "smaller wins"; the file records the catalogue's own advice.
  assert.equal(low.lines.arm.spec.article, L.leverArms.find((a) => 500 >= a.cabinetHeightKHMm[0] && 500 <= a.cabinetHeightKHMm[1]).set);
  assert.equal(low.lines.arm.spec.article, '22L3800');
  assert.match(F.shared.overlapRule.engineConflict, /SMALLER/);
  assert.equal(low.warnings.some((w) => w.code === 'LIFT_NO_UNIT' || w.code === 'LIFT_CABINET'), false);
  assert.equal(low.lift.riseMm, 497, 'placeholder path: the leaf height');
});

test('F18 · HF top: the set by its own LF bands (first wins), the arm by KH, the hinge set and its count rule, equal halves, 116 degrees, fold null', () => {
  const p = plan('hf');
  const H = F.systems.hf;
  const set = H.liftMechanismSets.find((s) => p.pf >= s.powerFactorLF[0] && p.pf <= s.powerFactorLF[1]);
  assert.equal(set.set, '22F2200', 'LF 5085 in 1350 to 6750 (and in 2700 to 13500; the first wins)');
  assert.equal(p.lift.article, set.set);
  assert.equal(p.lines.arm.spec.article, H.leverArms.find((a) => CAB.heightMm >= a.cabinetHeightKHMm[0] && CAB.heightMm <= a.cabinetHeightKHMm[1]).set);
  assert.equal(p.lines.arm.spec.article, '22F3500');
  assert.equal(p.lines.hinges.spec.article, H.hinges.upperFrontToTopPanel.sets.insertaEDowel.article);
  assert.equal(p.lines.hinges.spec.centre_article, H.hinges.centreHinge.articles.expando.article);
  assert.equal(p.lines.hinges.qty, H.hinges.upperFrontToTopPanel.count.default, '600 wide, 7 kg: two');
  assert.equal(p.lines.hinges.spec.cup_pattern, null, 'TB and cup depth are null in the file: no cup');
  // Three at KB 1200 or FG 12, four at KB 1800 or FG 20 (en/23).
  const wide = liftPlanFor({ system: 'hf', cabinet: { ...CAB, widthMm: 1200 }, leaf: { ...LEAF, widthMm: 1197 }, profile: P });
  assert.equal(wide.lines.hinges.qty, 3);
  const widest = liftPlanFor({ system: 'hf', cabinet: { ...CAB, widthMm: 1800, heightMm: 1000 }, leaf: { widthMm: 1797, heightMm: 997, thicknessMm: 25 }, profile: P });
  assert.equal(widest.lines.hinges.qty, 4);
  // The halves: equal, less the gap between them; the upper's own angle; the fold is printed nowhere.
  assert.deepEqual(p.halves, [(LEAF.heightMm - P.doors.gap) / 2, (LEAF.heightMm - P.doors.gap) / 2]);
  assert.equal(p.lift.angleDeg, H.animation.upperLeafOpenDeg.full);
  assert.equal(p.lift.foldDeg, null);
  assert.equal(p.lift.placeholderPath, true, 'the fold is the placeholder (the lower half hangs plumb)');
  assert.equal(p.warnings.some((w) => w.code === 'LIFT_NO_UNIT' || w.code === 'LIFT_CABINET'), false);
});

test('F18 · THE RISE is one derivation: HK at 107 is the catalogue\'s own Y = FH x 0.29 + FD; HF the upper half; HS / HL the path', () => {
  const hk = liftRiseMm({ system: 'hk', angleDeg: 107 }, { heightMm: 717, thicknessMm: 25 });
  // The catalogue's 0.29 is cos(107 degrees) rounded (0.2924): within 2 mm on a 717 leaf.
  assert.ok(near(hk, 717 * 0.29 + 25, 2), `${hk} vs FH x 0.29 + FD = ${717 * 0.29 + 25}`);
  assert.ok(near(hk, -717 * Math.cos((107 * Math.PI) / 180) + 25, 0.06));
  assert.equal(liftRiseMm({ system: 'hk', angleDeg: 90 }, { heightMm: 717, thicknessMm: 25 }), 25, 'square: only the board stands proud');
  assert.equal(liftRiseMm({ system: 'hk', angleDeg: 75 }, { heightMm: 717, thicknessMm: 25 }), 25, 'under square: the free edge is below the pivot');
  const hf = liftRiseMm({ system: 'hf', angleDeg: 116, halves: [357, 357] }, { heightMm: 717, thicknessMm: 25 });
  assert.ok(near(hf, Math.round((-357 * Math.cos((116 * Math.PI) / 180) + 25) * 10) / 10, 0.11));
  assert.equal(liftRiseMm({ system: 'hs', travel: null }, { heightMm: 717 }), 717);
  assert.equal(liftRiseMm({ system: 'hl', travel: [{ t: 0, dy: 0 }, { t: 0.5, dy: 300 }, { t: 1, dy: 120 }] }, { heightMm: 717 }), 300, 'the highest keyframe');
  assert.equal(plan('hk').lift.riseMm, hk, 'the plan writes the same number on the piece');
});

test('F18 · THE PATH: linear between keyframes; without keyframes a plain rise of the leaf height, no travel forward, no rotation', () => {
  assert.deepEqual(liftTravelAt({ travel: null }, 717, 0.5), { dy: 358.5, dz: 0, rotateDeg: 0 });
  assert.deepEqual(liftTravelAt({ travel: null }, 717, 1), { dy: 717, dz: 0, rotateDeg: 0 });
  assert.deepEqual(liftTravelAt({ travel: null }, 717, 0), { dy: 0, dz: 0, rotateDeg: 0 });
  const kf = [{ t: 0, dy: 0, dz: 0, rotateDeg: 0 }, { t: 1, dy: 400, dz: 200, rotateDeg: 90 }];
  assert.deepEqual(liftTravelAt({ travel: kf }, 717, 0.25), { dy: 100, dz: 50, rotateDeg: 22.5 });
  assert.deepEqual(liftTravelAt({ travel: kf }, 717, 1), { dy: 400, dz: 200, rotateDeg: 90 });
  assert.deepEqual(liftTravelAt({ travel: kf }, 717, 2), { dy: 400, dz: 200, rotateDeg: 90 }, 'clamped at the end');
});

test('F18 · every system: a line and a body, ZERO holes, said in words (LIFT_NO_PATTERN) because every fixing pattern in the file is null', () => {
  for (const s of LIFT_SYSTEMS) {
    const sys = F.systems[s];
    const pattern = sys.fixingLiftMechanism?.holePositions?.value ?? sys.fixingLiftMechanism?.preMountedSystemScrews?.holePositions?.value ?? null;
    assert.equal(pattern, null, `${s}: the file prints no fixing pattern`);
    const p = plan(s);
    const info = p.warnings.find((w) => w.code === 'LIFT_NO_PATTERN');
    assert.ok(info, `${s}: LIFT_NO_PATTERN`);
    assert.equal(info.level, 'info');
    assert.match(info.message, /zero holes/);
    assert.match(info.message, /aventos\.json/);
    assert.equal(p.derived.holes, 0);
    assert.equal(p.bodies.length, 2, 'one mechanism per side');
    assert.deepEqual(p.bodies.map((b) => b.side), ['L', 'R']);
    for (const b of p.bodies) {
      assert.equal(b.kind, 'lift_arm');
      assert.equal(b.placeholder, true);
      assert.ok(b.box.x >= CAB.boardMm && b.box.x + b.box.w <= CAB.widthMm - CAB.boardMm, 'inside the sides');
      assert.ok(b.box.y + b.box.h <= CAB.heightMm - CAB.boardMm + 1e-9, 'under the top board');
      assert.ok(b.box.z + b.box.d <= CAB.depthMm - CAB.boardMm + 1e-9, 'behind the front plane');
    }
    assert.equal(p.lines.unit.spec.mechanisms, 2);
    assert.equal(p.lines.unit.spec.status, 'owner to confirm');
    assert.equal(p.lines.bracket.spec.holes_on_leaf, null);
    assert.equal(p.derived.label, LIFT_LABELS[s]);
    assert.match(p.derived.said, /zero holes/);
  }
  assert.equal(F.systems.hf.drillingPositionsLiftMechanism.datum.value, null, 'the HF table has no datum: a record, not a pattern');
});

test('F18 · an unknown system is refused in words, nothing throws', () => {
  const p = liftPlanFor({ system: 'hx', cabinet: CAB, leaf: LEAF, profile: P });
  assert.equal(p.lift.article, null);
  assert.ok(p.warnings.some((w) => w.code === 'LIFT_NO_UNIT' && /no record/.test(w.message)));
});

// ═══ B. CHECK #35: THE LEAF AGAINST WHAT STANDS OVER IT (synthetic results) ═══

const fakeEntry = ({
  id = 'u1', num = '01', mount = 1500, lift = { system: 'hk', angleDeg: 107, riseMm: 234.6 }, cornice = null, wall = 0, x = 0, width = 600, height = 720,
} = {}) => ({
  unit: {
    id, type: 'WUD', position: { wall, x_mm: x }, params: {
      unit_num: num, width, height, depth: 400, mount_height: mount, ...(cornice ? { cornice } : {}),
    },
  },
  result: {
    unitNum: num,
    panels: [{
      id: `${num}-F`, part: 'FRONT', role: 'front', box: { x: 1.5, y: 0, z: 403, w: 597, h: height - 3, d: 25 }, meta: { lift },
    }],
  },
});

test('F18 · #35: a 2500 room, the leaf top at 2217, a rise of 235: the ceiling is 283 above, nothing said; at 2400 it is 183 and the leaf is named', () => {
  const e = fakeEntry();
  assert.deepEqual(liftClearanceFindings({ entries: [e], room: { height: 2500 }, profile: P }), []);
  const out = liftClearanceFindings({ entries: [e], room: { height: 2400 }, profile: P });
  assert.equal(out.length, 1);
  const f = out[0];
  assert.equal(f.check, LIFT_CLEARANCE_CHECK);
  assert.equal(f.check, 35);
  assert.equal(f.level, 'yellow');
  assert.equal(f.unitId, 'u1');
  assert.equal(f.panelId, '01-F');
  assert.equal(f.obstacle, 'ceiling');
  assert.equal(f.clearMm, 2400 - (1500 + 717));
  assert.match(f.message, /rises 235 mm above its top edge at 107 degrees/);
  assert.match(f.message, /the ceiling is 183 mm above it/);
  assert.match(f.message, /cut as asked/);
  assert.match(f.message, /HL top/);
  assert.deepEqual(f.subject, { unitId: 'u1', panelId: '01-F', editor: 'element' });
});

test('F18 · #35: a cornice on the unit leaves the leaf only the carcass top (3 mm): said; an HS placeholder path says so in words', () => {
  const corniced = fakeEntry({ cornice: P.autoParts.cornice.heights[0] });
  const out = liftClearanceFindings({ entries: [corniced], room: { height: 3000 }, profile: P });
  assert.equal(out.length, 1);
  assert.equal(out[0].obstacle, 'cornice');
  assert.match(out[0].message, /cornice on its top stands 3 mm above it/);
  const hs = fakeEntry({ lift: { system: 'hs', angleDeg: null, travel: null, placeholderPath: true, riseMm: 717 } });
  const said = liftClearanceFindings({ entries: [hs], room: { height: 2500 }, profile: P });
  assert.equal(said.length, 1);
  assert.match(said[0].message, /placeholder path/);
  assert.match(said[0].message, /owner to confirm/);
});

test('F18 · #35: a wall unit hanging higher on the same span is the ceiling the leaf meets; one beside it is not', () => {
  const low = fakeEntry({ id: 'low', num: '01', mount: 1200, height: 400, lift: { system: 'hk', angleDeg: 107, riseMm: 140 } });
  const above = fakeEntry({ id: 'up', num: '02', mount: 1700, lift: null }).unit;
  const beside = fakeEntry({ id: 'side', num: '03', mount: 1700, x: 700, lift: null }).unit;
  const units = [low.unit, above, beside];
  const obstacles = liftObstacles({ unit: low.unit, leafTopMm: 1200 + 397, units, room: { height: 2700 }, profile: P });
  assert.deepEqual(obstacles.map((o) => o.kind), ['ceiling', 'unit']);
  assert.equal(obstacles[1].unitId, 'up');
  assert.equal(obstacles[1].clearMm, 1700 - 1597);
  const out = liftClearanceFindings({ entries: [low], units, room: { height: 2700 }, profile: P });
  assert.equal(out.length, 1);
  assert.equal(out[0].obstacle, 'unit');
  assert.equal(out[0].aboveUnitId, 'up');
  assert.match(out[0].message, /Wall unit 02 above it is 103 mm above it/);
  const alone = liftClearanceFindings({ entries: [low], units: [low.unit, beside], room: { height: 2700 }, profile: P });
  assert.deepEqual(alone, [], 'the unit beside it is not over it');
});

test('F18 · #35 reads only lift leaves: a hinged WUD, a drop front and an HF lower half say nothing', () => {
  const hinged = fakeEntry({ lift: null });
  hinged.result.panels[0].meta = { hinge: 'L' };
  const lower = fakeEntry({ lift: { system: 'hf', parent: '01-F-UP', riseMm: 181.5 } });
  assert.deepEqual(liftClearanceFindings({ entries: [hinged, lower], room: { height: 1000 }, profile: P }), []);
  assert.deepEqual(liftClearanceFindings({ entries: [], room: { height: 1000 }, profile: P }), []);
});

// ═══ C. THE INTEGRATED CUT: ONCE THE PATCHES ARE IN ═══════════════════════════

test('F18 · a WUD with front_system hk: ONE full-width leaf, no cups, no cup screws, no plate rows, no hinge line, meta.lift on the piece', (t) => {
  if (!PATCHED) return t.skip(NOT_IN);
  const r = computeCabinet(kit('WUD', { front_system: 'hk' }), P);
  const leaves = r.panels.filter((p) => p.part === 'FRONT');
  assert.equal(leaves.length, 1);
  assert.equal(r.derived.doors, 1);
  const leaf = leaves[0];
  assert.equal(leaf.id, '01-F');
  assert.equal(leaf.w, 600 - P.doors.gap);
  assert.equal(leaf.h, 720 - P.doors.gap);
  assert.equal(leaf.thickness, 25);
  assert.equal(leaf.box.x, P.doors.gap / 2);
  assert.equal(leaf.box.z, 400 + P.doors.gap);
  assert.equal(leaf.meta.opening, 'lift');
  assert.equal(leaf.meta.frontSystem, 'hk');
  assert.equal(leaf.meta.lift.system, 'hk');
  assert.equal(leaf.meta.lift.angleDeg, F.systems.hk.animation.openDeg.full);
  assert.equal(leaf.meta.lift.article, '22K2700');
  assert.equal(leaf.meta.hinge, undefined, 'no hinge hand: the hinge family pass, the plate rows and the cup loop pass it by');
  assert.deepEqual(r.drills.filter((d) => d.panel === '01-F'), [], 'not one hole in the leaf');
  assert.deepEqual(r.drills.filter((d) => d.kind === 'cup' || d.kind === 'cup_screw' || d.kind === 'hinge'), [], 'no cups, no plate rows anywhere');
  assert.deepEqual(r.drillSummary.hinge_centers, []);
  assert.deepEqual(r.drillSummary.side_hinge_holes_y, []);
  assert.deepEqual(r.drillSummary.hinged_sides, []);
  assert.equal(r.totals.hinges, 0);
  assert.equal(r.hardware.some((h) => h.role === 'hinges'), false, 'the BOM buys no hinge');
  assert.equal(hardwareInstances(r, P).hinges.length, 0, 'the scene hangs no hinge model');
  assert.equal(hardwareInstances(r, P).kits.filter((k) => k.body === 'lift_arm').length, 2, 'two placeholder bodies reach the scene');
  assert.equal(r.derived.lift.system, 'hk');
  assert.equal(r.derived.lift.article, '22K2700');
  assert.equal(r.derived.lift.holes, 0);
  assert.equal(r.assemblies.liftKits.length, 2);
});

test('F18 · THE BOM: the lift article, the arm where the system has one, the cover caps, the brackets, the HF hinge set; no cups (assert)', (t) => {
  if (!PATCHED) return t.skip(NOT_IN);
  const expect = {
    hk: { lift_unit: '22K2700', lift_caps: '22K8000', lift_bracket: '20S4200' },
    hs: { lift_unit: '22S2800', lift_arm: '22S3500', lift_caps: '22.8000', lift_bracket: '20S4200' },
    hl: { lift_unit: null, lift_arm: null, lift_caps: '22.8000', lift_bracket: '20S4200' },
    hf: { lift_unit: '22F2200', lift_arm: '22F3500', lift_caps: '22.8000', lift_bracket: '20S4200', lift_hinges: '78Z5530T' },
  };
  for (const s of LIFT_SYSTEMS) {
    const r = computeCabinet(kit('WUD', { front_system: s }), P);
    const roles = Object.fromEntries(r.hardware.filter((h) => h.role.startsWith('lift_')).map((h) => [h.role, h.spec.article ?? null]));
    assert.deepEqual(roles, expect[s], s);
    assert.equal(r.hardware.some((h) => h.role === 'hinges' || h.role === 'bifold_hinges'), false, `${s}: no cup hinge line`);
    assert.equal(r.drills.filter((d) => d.kind === 'cup').length, 0, `${s}: no cups`);
    for (const h of r.hardware.filter((x) => x.role.startsWith('lift_'))) {
      assert.equal(h.qty >= 1, true);
      assert.equal(typeof h.spec_label, 'string');
      assert.equal(h.spec.status, 'owner to confirm');
    }
    const unit = r.hardware.find((h) => h.role === 'lift_unit');
    assert.equal(unit.label, `${LIFT_LABELS[s]} lift mechanism set`);
    assert.ok(r.warnings.some((w) => w.code === 'LIFT_NO_PATTERN' && w.level === 'info' && w.message.startsWith('01: ')));
  }
  const hl = computeCabinet(kit('WUD', { front_system: 'hl' }), P);
  assert.ok(hl.warnings.some((w) => w.code === 'LIFT_NO_UNIT'), 'the 720 WUD is refused for the HL top, in words');
  assert.equal(hl.derived.lift.refused, true);
});

test('F18 · the HF top is TWO panels, F-UP hinged to the carcass top and F-LOW hung on it (the bifold child grammar), equal halves, the gap between', (t) => {
  if (!PATCHED) return t.skip(NOT_IN);
  const r = computeCabinet(kit('WUD', { front_system: 'hf' }), P);
  const leaves = r.panels.filter((p) => p.part === 'FRONT');
  assert.deepEqual(leaves.map((p) => p.id), ['01-F-UP', '01-F-LOW']);
  assert.equal(r.derived.doors, 1, 'one leaf, in two halves');
  const [up, low] = leaves;
  assert.equal(up.h, low.h);
  assert.equal(up.h + low.h + P.doors.gap, 720 - P.doors.gap, 'the two halves and the gap fill the leaf height');
  assert.equal(low.box.y, 0);
  assert.equal(up.box.y, low.h + P.doors.gap);
  assert.equal(up.meta.lift.half, 'upper');
  assert.equal(up.meta.lift.child, '01-F-LOW');
  assert.equal(low.meta.lift.half, 'lower');
  assert.equal(low.meta.lift.parent, '01-F-UP');
  assert.equal(up.meta.lift.angleDeg, 116);
  assert.equal(low.meta.lift.foldDeg, null, 'the fold is printed nowhere; the scene hangs the lower half plumb as a placeholder');
  assert.deepEqual(r.drills.filter((d) => /^01-F/.test(d.panel)), [], 'no cup in either half (TB null in the file)');
  assert.equal(r.hardware.find((h) => h.role === 'lift_hinges').qty, 2);
});

test('F18 · a 900 wide WUD (two doors by the width rule) takes ONE lift leaf; a WUD_GLASS lift leaf keeps its glass aperture; a WARDROBE_WALL lifts too', (t) => {
  if (!PATCHED) return t.skip(NOT_IN);
  const wide = computeCabinet(kit('WUD', { width: 900, front_system: 'hk' }), P);
  assert.deepEqual(wide.panels.filter((p) => p.part === 'FRONT').map((p) => [p.id, p.w]), [['01-F', 900 - P.doors.gap]]);
  assert.equal(wide.derived.doors, 1);
  assert.equal(wide.derived.lift.article, '22K2900', 'a heavier front, the bigger unit');
  const glass = computeCabinet(kit('WUD_GLASS', { front_system: 'hk' }), P);
  const pane = glass.panels.find((p) => p.part === 'FRONT');
  assert.ok(pane.meta.glass, 'the glass pass runs on a lift leaf too');
  assert.equal(pane.meta.lift.system, 'hk');
  const ww = computeCabinet(kit('WARDROBE_WALL', { front_system: 'hs' }), P);
  assert.equal(ww.panels.filter((p) => p.part === 'FRONT').length, 1);
  assert.equal(ww.derived.lift.system, 'hs');
});

test('F18 · NOTHING OLDER MOVES: a WUD with no front_system, with `hinged`, or a hood asked for a lift, is byte for byte today\'s cut', (t) => {
  if (!PATCHED) return t.skip(NOT_IN);
  const plain = JSON.stringify(computeCabinet(kit('WUD'), P));
  assert.equal(JSON.stringify(computeCabinet(kit('WUD', { front_system: 'hinged' }), P)), plain);
  assert.equal(JSON.stringify(computeCabinet(kit('WUD', { front_system: null }), P)), plain);
  const r = JSON.parse(plain);
  assert.equal(r.derived.lift, undefined);
  assert.equal(r.assemblies.liftKits, undefined);
  assert.equal(r.drills.filter((d) => d.kind === 'cup').length, 3, 'three cups on the hinged door');
  const hood = computeCabinet(kit('WUD_HOOD', { front_system: 'hk' }), P);
  assert.equal(hood.derived.lift, undefined, 'a hood takes no lift');
  assert.equal(JSON.stringify(hood), JSON.stringify(computeCabinet(kit('WUD_HOOD'), P)));
  const off = computeCabinet(kit('WUD', { front_system: 'hk', doors: false }), P);
  assert.equal(off.panels.filter((p) => p.part === 'FRONT').length, 0, 'no doors asked: no leaf, lift or not');
  assert.equal(off.derived.lift, undefined);
});

test('F18 · the registry knows the five lift roles (t39\'s own law) and Check #35 runs through runChecks', (t) => {
  if (!PATCHED) return t.skip(NOT_IN);
  assert.equal(HARDWARE_TO_PART_ID.lift_unit, 'lift_mechanism');
  assert.equal(HARDWARE_TO_PART_ID.lift_arm, 'lift_lever_arm');
  assert.equal(HARDWARE_TO_PART_ID.lift_caps, 'lift_cover_caps');
  assert.equal(HARDWARE_TO_PART_ID.lift_bracket, 'lift_front_bracket');
  assert.equal(HARDWARE_TO_PART_ID.lift_hinges, 'hinge_aventos_hf');
  for (const id of Object.values(HARDWARE_TO_PART_ID).filter((v) => /lift|aventos/.test(v))) assert.ok(PART_REGISTRY[id], id);
  const unit = {
    id: 'u1', type: 'WUD', position: { wall: 0, x_mm: 0 }, params: kit('WUD', { front_system: 'hk', mount_height: 1500 }),
  };
  const result = computeCabinet(unit.params, P);
  const findings = runChecks({ entries: [{ unit, result }], room: { height: 2400, corners: [] }, profile: P });
  const f35 = findings.filter((f) => f.check === 35);
  assert.equal(f35.length, 1);
  assert.match(f35[0].message, /AVENTOS HK top leaf/);
  assert.equal(runChecks({ entries: [{ unit, result }], room: { height: 2800, corners: [] }, profile: P }).some((f) => f.check === 35), false);
});

test('F18 · the scene and the panel: MovingPanel reads meta.lift (top-edge pivot, travel, the HF child), RightPanel offers Front opens', (t) => {
  const view = read('src/3d/UnitView.jsx');
  const panel = read('src/components/RightPanel.jsx');
  if (!/meta\?\.lift/.test(view) || !/front_system/.test(panel)) return t.skip('the F18 UnitView / RightPanel patches are not in this tree');
  assert.match(view, /liftTravelAt/);
  assert.match(view, /const lift = front === 'door' && !drops && p\.meta\?\.lift \? p\.meta\.lift : null;/);
  assert.match(view, /liftPivotsTop/);
  assert.match(view, /group\.current\.rotation\.x = -\(a \* full\);/, 'the top-edge pivot: positive amount opens upward (a negative angle about x)');
  assert.match(view, /&& !p\.meta\?\.lift\?\.parent\n\s*&& !p\.meta\?\.bifold\?\.parent\)\.map/, 'the HF lower half renders inside its upper half, beside the bifold child');
  assert.match(view, /p\.meta\?\.opening === 'drop' \|\| p\.meta\?\.lift/, 'no carcass hinge to fold');
  assert.match(panel, /data-front-system="1"/);
  assert.match(panel, /liftTakesKit\(type\) && result\.derived\.doors > 0/);
  for (const w of ['HK top (lift up)', 'HS (up and over)', 'HL (lift parallel)', 'HF (bi-fold up)']) assert.ok(panel.includes(w), w);
  assert.equal(/front_system:\s*['"]h[kslf]['"]/.test(panel), false, 'no system is typed into the panel as a default');
});

test('F18 · the four goldens, one per system on the 600 x 720 WUD, byte for byte', (t) => {
  if (!PATCHED) return t.skip(NOT_IN);
  for (const s of LIFT_SYSTEMS) {
    const rel = `fixtures/golden-lift-${s}.json`;
    assert.ok(existsSync(`${ROOT}${rel}`), `${rel} exists (scripts/t78-goldens.mjs --write golden-lift-${s}.json)`);
    const g = JSON.parse(read(rel));
    assert.equal(g.meta.F, 'F18');
    assert.equal(g.params.front_system, s);
    assert.deepEqual(goldenOf(g.params), g.expected, `${rel}: the engine moved`);
    const fronts = g.expected.panels.filter((p) => p.part === 'FRONT');
    assert.equal(fronts.length, s === 'hf' ? 2 : 1);
    assert.equal(g.expected.drills.some(([k]) => /FRONT_HINGES|\|01-F/.test(k)), false, `${rel}: no hole in the leaf`);
    assert.equal(g.expected.hardware.some((h) => h.role === 'hinges'), false, `${rel}: no hinge line`);
    assert.ok(g.expected.hardware.some((h) => h.role === 'lift_unit' && h.qty === 1), `${rel}: the lift line`);
    assert.ok(g.expected.hardware.some((h) => h.role === 'lift_caps' && h.qty === 1), `${rel}: the cover caps`);
  }
});
