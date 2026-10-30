// ─── T78 · F13 · WIDE-ANGLE HINGES (155 / 170): A FAMILY THE DOOR CHOOSES ───
//
// The owner, 11.10.2026: *"otwieranie drzwi wiekszy kat otwarcia 180 stopni,
// zawiasy."*  CLAUDE.md T78 F13 and the T22 law: the door chooses a FAMILY
// (`standard` | `wide`); inside the family the angle is still derived from the
// front thickness and the catalogue (reference/hardware/blum-hinges.json, every
// number with its page, owner to confirm). The cup pattern does not move; the
// article, the BOM line and the OPENING ANGLE change; the angle drives the
// scene's swing and the collision Check (#33), which says, never clips.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  hingeAngleFor, resolveDoorHinge, setBlumHingeFamilies, wideHingeRule, wideHingeArticle, setHingeCatalogue,
} from '../src/engine/hinges.js';
import { doorOpenAngle } from '../src/engine/doors.js';
import { CHECKS } from '../src/engine/checks.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const FILE = JSON.parse(read('reference/hardware/blum-hinges.json'));
const CLIPTOP = JSON.parse(read('reference/hardware/cliptop-hinges.json'));
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const DEG = Math.PI / 180;

test('F13 · the file: the wide family\'s rule and articles, every one with its page, owner to confirm; nothing of it in the profile', () => {
  const wide = FILE.families.wide;
  assert.deepEqual(FILE.rules.families.wide.hinge_by_front_thickness, [{ max: 21, angle: 170 }, { max: 24, angle: 155 }]);
  assert.equal(FILE.rules.families.wide.confirmed, false);
  for (const angle of ['155', '170']) {
    const h = wide.hinges[angle];
    assert.equal(h.opening_angle.value, Number(angle));
    assert.ok(h.opening_angle.page >= 70, `${angle}: Hinge systems p. 70 onward`);
    assert.equal(h.opening_angle.status, 'owner to confirm');
    assert.ok(h.cup, `${angle}: the cup block`);
  }
  assert.equal(/angle: 1[57][05]|openAngle: 1[57]/.test(read('src/engine/profile.js')), false, 'no wide-angle number in the profile');
  assert.equal(/angle(Deg)?: 1[0-9][05]\b/.test(read('src/engine/companyDefaults.js')), false, 'company defaults never carry an angle (T22)');
});

test('F13 · T22 held: the angle is derived inside the family; unloaded, the wide family has no rung and says so', () => {
  setBlumHingeFamilies(null);
  setHingeCatalogue(CLIPTOP);
  assert.equal(hingeAngleFor({ frontThickness: 19 }), 155, 'standard: the 155 since 15.10.2026');
  assert.equal(hingeAngleFor({ frontThickness: 28 }), 95);
  assert.equal(hingeAngleFor({ frontThickness: 19, family: 'wide' }), null, 'unloaded: no rung');
  assert.equal(wideHingeRule(), null);
  assert.ok(setBlumHingeFamilies(FILE));
  assert.deepEqual(wideHingeRule(), [{ max: 21, angle: 170 }, { max: 24, angle: 155 }]);
  assert.equal(hingeAngleFor({ frontThickness: 19, family: 'wide' }), 170);
  assert.equal(hingeAngleFor({ frontThickness: 21, family: 'wide' }), 170);
  assert.equal(hingeAngleFor({ frontThickness: 22, family: 'wide' }), 155);
  assert.equal(hingeAngleFor({ frontThickness: 24, family: 'wide' }), 155);
  assert.equal(hingeAngleFor({ frontThickness: 25, family: 'wide' }), null, 'the house 25 mm front: no rung in the file as read, owner to confirm p. 84');
  assert.equal(hingeAngleFor({ frontThickness: 19 }), 155, 'the standard family: the 155 since 15.10.2026 (the owner: standardowo zawiasy 155)');
  assert.equal(hingeAngleFor({ frontThickness: 25 }), 110, 'the 25 mm shaker keeps the 110: Blum gives the 155 fronts to 24');
  assert.equal(wideHingeArticle(170), '71T6550');
  assert.equal(wideHingeArticle(155), '71B7550');
  const r170 = resolveDoorHinge({ frontThickness: 19, finish: 'nickel', family: 'wide' });
  assert.deepEqual([r170.angle, r170.hingeFamily, r170.article, r170.complete, r170.status], [170, 'wide', '71T6550', true, 'owner to confirm']);
  const r155 = resolveDoorHinge({ frontThickness: 22, finish: 'nickel', family: 'wide' });
  assert.equal(r155.angle, 155);
  assert.ok(r155.article, 'the 155 has an article (the CLIP top catalogue\'s row or the file\'s)');
  const none = resolveDoorHinge({ frontThickness: 25, finish: 'nickel', family: 'wide' });
  assert.deepEqual([none.angle, none.article, none.complete, none.hingeFamily], [null, null, false, 'wide']);
  const std = resolveDoorHinge({ frontThickness: 25, finish: 'nickel' });
  assert.equal(std.angle, 110);
  assert.equal(std.hingeFamily, 'standard');
});

test('F13 · the engine: the leaf carries its family and, for wide, its angle; the cup pattern does not move; the BOM line changes', () => {
  setBlumHingeFamilies(FILE);
  setHingeCatalogue(CLIPTOP);
  const base = { ...defaultParamsFor('BUD', P), unit_num: 'B1', doors: { count: 2 }, front_t: 19 };
  const std = computeCabinet(base, P);
  const wide = computeCabinet({ ...base, hinge_family: 'wide' }, P);
  const leavesStd = std.panels.filter((p) => p.part === 'FRONT');
  const leavesWide = wide.panels.filter((p) => p.part === 'FRONT');
  // The standard family leaves no FAMILY mark on a leaf nobody chose for (the goldens read no meta);
  // since 15.10.2026 every leaf carries its hinge's ANGLE, so the picture opens as far as the hinge.
  assert.deepEqual(leavesStd.map((p) => [p.meta.hingeFamily, p.meta.openAngleDeg]), [[undefined, 155], [undefined, 155]]);
  assert.deepEqual(leavesWide.map((p) => [p.meta.hingeFamily, p.meta.openAngleDeg]), [['wide', 170], ['wide', 170]]);
  // The house 25 mm shaker: the 110, carried too.
  const shaker = computeCabinet({ ...base, front_t: 25 }, P);
  assert.deepEqual(shaker.panels.filter((p) => p.part === 'FRONT').map((p) => p.meta.openAngleDeg), [110, 110]);
  // The cups: same positions, same count, same layer.
  const cups = (r) => r.drills.filter((d) => d.kind === 'cup').map((d) => [d.panel, d.x, d.y, d.d]);
  assert.deepEqual(cups(wide), cups(std), 'the cup pattern is unchanged in position');
  // The BOM: the article and the angle changed, the count did not.
  const hwStd = std.hardware.filter((h) => h.role === 'hinges');
  const hwWide = wide.hardware.filter((h) => h.role === 'hinges');
  assert.equal(hwWide.reduce((n, h) => n + h.qty, 0), hwStd.reduce((n, h) => n + h.qty, 0));
  assert.equal(hwStd[0].spec.angle, 155);
  assert.equal(hwWide[0].spec.angle, 170);
  assert.equal(hwWide[0].spec.article, '71T6550');
  assert.notEqual(hwWide[0].spec.article, hwStd[0].spec.article);
  // Per leaf: one wide, one standard, two lines.
  const mixed = computeCabinet({ ...base, door_hinge_family: { [leavesStd[0].id]: 'wide' } }, P);
  assert.deepEqual(mixed.panels.filter((p) => p.part === 'FRONT').map((p) => p.meta.hingeFamily ?? 'standard'), ['wide', 'standard']);
  assert.equal(mixed.hardware.filter((h) => h.role === 'hinges').length, 2);
  // No rung: said in words, the leaf is cut, the standard family named.
  const thick = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: 'B1', doors: { count: 1 }, hinge_family: 'wide', front_t: 25 }, P);
  const said = thick.warnings.find((w) => w.code === 'HINGE_WIDE_NO_RUNG');
  assert.ok(said);
  assert.match(said.message, /no hinge for a 25 mm front/);
  assert.equal(thick.panels.filter((p) => p.part === 'FRONT').length, 1);
  // The bi-fold pair's leaf A: T78 forced the wide family on it (p. 116: the bi-fold hinge with the 155 or 170).
  // Since 15.10.2026 the standard hinge IS the 155, so leaf A keeps the door's own family (the 155 on a 19 mm
  // front); the owner's door choice still wins (the wide 170 where chosen).
  const bf = computeCabinet({ ...defaultParamsFor('CORNER_L_BASE', P), unit_num: 'CL01', doors: true, corner_doors: 'bifold', front_t: 19 }, P);
  assert.equal(bf.panels.find((p) => p.id === 'CL01-A-F').meta.hingeFamily, undefined);
  assert.equal(bf.panels.find((p) => p.id === 'CL01-A-F').meta.openAngleDeg, 155);
  const bfWide = computeCabinet({ ...defaultParamsFor('CORNER_L_BASE', P), unit_num: 'CL01', doors: true, corner_doors: 'bifold', front_t: 19, hinge_family: 'wide' }, P);
  assert.equal(bfWide.panels.find((p) => p.id === 'CL01-A-F').meta.hingeFamily, 'wide');
  assert.equal(bfWide.panels.find((p) => p.id === 'CL01-A-F').meta.openAngleDeg, 170);
  // The 25 mm shaker: leaf A takes the 110 and the bi-fold line says the catalogue pairs the hinge with the 155 or 170.
  const bf25 = computeCabinet({ ...defaultParamsFor('CORNER_L_BASE', P), unit_num: 'CL01', doors: true, corner_doors: 'bifold', front_t: 25 }, P);
  assert.equal(bf25.panels.find((p) => p.id === 'CL01-A-F').meta.openAngleDeg, 110);
  assert.match(bf25.warnings.find((w) => w.code === 'CORNER_L_BIFOLD').message, /here the 110: Blum's 155 and 170 stop at 24 and 21 mm fronts, owner to confirm/);
  assert.equal(bf25.warnings.some((w) => w.code === 'HINGE_WIDE_NO_RUNG'), false, 'no forced wide family, no missing rung');
  setBlumHingeFamilies(null);
});

// T85 F4 · amended: A SWING IS A PICTURE. The owner, 30.10.2026 20:48: *"default zawiasy prosze zrob 90 stopni,
// teraz mamy 150 to nie jest dobre."*  The family's angle stays on the leaf (the BOM, Check #33); the view opens every
// hinged leaf to the profile's 90.
test('F13 · the family angle stays on the leaf; the swing is the profile\'s 90 (T85 F4); at a wall it still stops square', () => {
  assert.equal(doorOpenAngle({ doorWidth: 500 }, P), 90 * DEG, 'the picture angle for every door');
  assert.equal(doorOpenAngle({ doorWidth: 500, fullDeg: 170 }, P), 90 * DEG, 'a 170 leaf: the picture is still 90');
  assert.equal(doorOpenAngle({ doorWidth: 500, fullDeg: 155 }, P), 90 * DEG);
  assert.equal(doorOpenAngle({ doorWidth: 500, fullDeg: 170, hingeOffset: 1.5, gapToWall: 10 }, P), 90 * DEG, 'a wall on the hinge side: square');
  const view = read('src/3d/UnitView.jsx');
  assert.doesNotMatch(view, /fullDeg: Number\(panel\?\.meta\?\.openAngleDeg\)/, 'the view no longer hands the hinge angle to the swing');
});

test('F13 · the Check (#33) says a wide swing into a neighbour, in words, never clips; the panel offers the family per leaf', () => {
  assert.ok(CHECKS.some((c) => c.n === 33 && c.level === 'yellow' && /155 \/ 170/.test(c.label)));
  const src = read('src/engine/checks.js');
  assert.match(src, /finding\(33, 'yellow'/);
  assert.match(src, /its free edge swings \$\{over\} mm past its hinge edge/);
  const rp = read('src/components/RightPanel.jsx');
  assert.match(rp, /data-door-hinge-family=\{p\.id\}/);
  assert.match(rp, /<option value="wide">Wide-angle hinges \(155 \/ 170\)<\/option>/);
  // The whole road: two doors side by side, the right one wide, its hinge side facing the neighbour.
  // The house front is 25; the file as read gives the wide family no rung there (owner to confirm
  // p. 84), so this road loads the file WITH the rung the owner would confirm (the 155 to 26).
  const withRung = JSON.parse(JSON.stringify(FILE));
  withRung.rules.families.wide.hinge_by_front_thickness = [{ max: 21, angle: 170 }, { max: 26, angle: 155 }];
  setBlumHingeFamilies(withRung);
  setHingeCatalogue(CLIPTOP);
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const a = S().addUnit('BUD').id;
  S().addDoors(a);
  const b = S().addUnit('BUD', { near: a, side: 'right' }).id;
  S().addDoors(b);
  const leafB = S().unitResult(b).panels.find((p) => p.part === 'FRONT');
  assert.ok(leafB);
  S().updateUnitParams(b, { door_hinge_family: { [leafB.id]: 'wide' }, hinge: 'L' });
  const r = S().unitResult(b);
  const lf = r.panels.find((p) => p.part === 'FRONT');
  assert.equal(lf.meta.hingeFamily, 'wide');
  assert.equal(lf.meta.openAngleDeg, 155);
  assert.equal(lf.meta.hinge, 'L', 'hinged toward its neighbour A');
  const found = S().runChecks().filter((f) => f.check === 33);
  assert.equal(found.length, 1, 'one finding for the one wide door that reaches its neighbour');
  assert.match(found[0].message, /at 155 degrees its free edge swings/);
  assert.equal(found[0].level, 'yellow');
  // The leaf is cut as asked: nothing clipped.
  assert.equal(r.panels.filter((p) => p.part === 'FRONT').length, 1);
  setBlumHingeFamilies(null);
});
