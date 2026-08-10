// ─── THE HINGE CATALOGUE (turn 19, CLAUDE.md F1 / W36) ──────────────────────
//
// The owner's model has two levels — "jeden główny wybór przypisany… a jak
// jedna szafka będzie miała inne hinges… assign if other hinge" — and one thing
// that is NOT a choice at either level: the ANGLE. The front decides it.
//
// What this file pins:
//
//   • the rule is READ from reference/hardware/cliptop-hinges.json and not
//     retyped anywhere, so a catalogue revision moves the app;
//   • per-door resolution, and the exception that beats it;
//   • the BOM splitting by angle and finish while the COUNT never moves;
//   • the ⌀3 plate can never be selected while its drilling pattern is unknown;
//   • and the iron rule of the turn — NOTHING here changes a hole.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearHingeCatalogue, doorHingeAssignment, hingeAngleFor, hingeCatalogue, hingeChoices,
  hingeFamilies, hingeFamily, hingeModelUrl, hingeReResolve, hingeSpecLabel, parseHingeCatalogue,
  plateFamily, resolveDoorHinge, resolveHingeFinish, resolveHingePlate, resolveHingeSystem,
  setHingeCatalogue,
} from '../src/engine/hinges.js';
import { CLIPTOP_HINGE_CATALOGUE, loadHardwareCatalogues } from '../src/lib/hardwareCatalogue.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { hardwareCounts, hardwareInstances } from '../src/engine/hardware3d.js';
import { migrateDesign } from '../src/engine/design.js';

loadHardwareCatalogues();

const RULES = CLIPTOP_HINGE_CATALOGUE.rules;
const C = P.hardware.hinge.cliptop;

const base = (extra = {}) => ({
  type: 'BUD', width: 600, height: 720, depth: 560, unit_num: '01',
  doors: { count: 1, hinge: 'L' }, ...extra,
});

const hingeRows = (result) => result.hardware.filter((h) => h.role === 'hinges');

// ─── the catalogue of record ────────────────────────────────────────────────

test('the loader hands the engine the file, and the engine never fetches', () => {
  const cat = hingeCatalogue();
  assert.ok(cat, 'cliptop-hinges.json is in hand');
  assert.equal(cat.system, CLIPTOP_HINGE_CATALOGUE.system);
  assert.equal(cat.items.length, CLIPTOP_HINGE_CATALOGUE.items.length);
});

test('the ANGLE RULE is the file’s, read rather than retyped', () => {
  const cat = hingeCatalogue();
  assert.deepEqual(
    cat.rules.byThickness.map((r) => [r.max, r.angle]),
    RULES.hinge_by_front_thickness.map((r) => [r.max, r.angle]),
  );
  assert.equal(cat.rules.wardrobeInnerDrawer, RULES.hinge_wardrobe_inner_drawer);
});

test('the catalogue names the SAME three layers the export writes (rule 7)', () => {
  // A catalogue that named other layers would be a catalogue describing a
  // machine this app does not drive — and the CNC identity of this turn rests
  // on the three of them being untouched.
  const { layers } = hingeCatalogue().rules;
  assert.equal(layers.cup, P.hinges.cups.layer);
  assert.equal(layers.cup_screws, P.hinges.cups.screwLayer);
  assert.equal(layers.plate_knockin5, P.hinges.layer);
  assert.equal(layers.cup, 'FRONT_HINGES_35MM');
  assert.equal(layers.cup_screws, 'FRONT_HINGES_3MM');
  assert.equal(layers.plate_knockin5, 'HINGES_5MM');
});

test('half an entry is dropped rather than guessed at', () => {
  const parsed = parseHingeCatalogue({
    items: [
      { file: 'a.glb', family: 'X', article: '1', role: 'hinge', angle: 110, finish: 'nickel' },
      { file: 'b.glb', family: 'Y', role: 'hinge' },              // no article
      { file: 'c.glb', article: '3', role: 'hinge' },             // no family
      { file: 'd.glb', family: 'Z', article: '4', role: 'wat' },  // not a role we know
    ],
  });
  assert.deepEqual(parsed.items.map((i) => i.family), ['X']);
  assert.equal(parseHingeCatalogue(null), null);
  assert.equal(parseHingeCatalogue({ items: [] }), null);
});

// ─── the angle (F1.2) ───────────────────────────────────────────────────────

test('the front’s thickness decides the angle, at every rung and its edge', () => {
  const [thin, thick] = RULES.hinge_by_front_thickness;
  assert.equal(hingeAngleFor({ frontThickness: 18 }), thin.angle);
  assert.equal(hingeAngleFor({ frontThickness: thin.max }), thin.angle, 'the edge is INSIDE the rung');
  assert.equal(hingeAngleFor({ frontThickness: thin.max + 0.5 }), thick.angle);
  assert.equal(hingeAngleFor({ frontThickness: thick.max }), thick.angle);
  // Thicker than anything the catalogue has a hinge for: no angle is the honest
  // answer, and the BOM then prints the spec with no article against it.
  assert.equal(hingeAngleFor({ frontThickness: thick.max + 1 }), null);
  assert.equal(hingeAngleFor({ frontThickness: 0 }), null);
});

test('a wardrobe door with a drawer behind it takes the 155°, whatever the front', () => {
  for (const t of [18, 22, 25, 30]) {
    assert.equal(
      hingeAngleFor({ frontThickness: t, innerDrawer: true }),
      RULES.hinge_wardrobe_inner_drawer,
      `${t} mm front, drawer behind it`,
    );
  }
  assert.equal(hingeAngleFor({ frontThickness: 18, innerDrawer: true }), 155);
});

// ─── the families, and the second article nobody has explained ──────────────

test('a family is ONE choice carrying BOTH of its articles', () => {
  const families = hingeFamilies({ angle: 110, finish: 'nickel' });
  assert.equal(families.length, 1, 'one family per angle and finish today');
  const [f] = families;
  assert.equal(f.family, '71B3550');
  assert.equal(f.articles.length, 2, 'both articles travel — neither is thrown away');
  assert.equal(f.article, f.articles[0], 'the leading one is what is drawn and listed');
  assert.ok(f.file.includes(f.article), 'and the file is that article’s own');
});

test('every angle and finish the rule can reach has a hinge in the catalogue', () => {
  const angles = [
    ...RULES.hinge_by_front_thickness.map((r) => r.angle),
    RULES.hinge_wardrobe_inner_drawer,
  ];
  for (const angle of angles) {
    for (const finish of C.finishes.map((f) => f.id)) {
      const [hit] = hingeFamilies({ angle, finish });
      assert.ok(hit, `${angle}° in ${finish}`);
      assert.equal(hit.angle, angle);
      assert.equal(hit.finish, finish);
    }
  }
});

test('the dropdown offers the catalogue’s hinges and nothing else', () => {
  const choices = hingeChoices();
  const hinges = CLIPTOP_HINGE_CATALOGUE.items.filter((i) => i.role === 'hinge');
  assert.equal(choices.length, new Set(hinges.map((i) => i.family)).size);
  for (const c of choices) {
    assert.ok(c.angle > 0, `${c.family} has an angle`);
    assert.match(c.label, new RegExp(`${c.family}.*${c.angle}°`));
  }
  assert.ok(hingeFamily('71B9590'), 'and a family can be looked up by name');
  assert.equal(hingeFamily('nope'), null);
  assert.equal(hingeFamily(null), null);
});

// ─── the project's answers (F1.1 / F1.5) ────────────────────────────────────

test('finish and system resolve against the profile, and an unknown one falls back', () => {
  const d = (hinges) => migrateDesign({ hinges });
  assert.equal(resolveHingeFinish(d({ finish: 'onyx' }), P), 'onyx');
  assert.equal(resolveHingeFinish(d({ finish: 'ONYX' }), P), 'onyx', 'case is not a different finish');
  assert.equal(resolveHingeFinish(d({ finish: 'chartreuse' }), P), C.defaultFinish);
  assert.equal(resolveHingeFinish(d({}), P), C.defaultFinish);
  assert.equal(resolveHingeSystem(d({ system: 'unicorn' }), P), C.system);
});

test('the ⌀3 plate ships DISABLED and can never be resolved to (F1.5)', () => {
  const screw = C.plates.find((p) => p.id === 'plate_screw3');
  assert.ok(screw, 'the option is VISIBLE — a workshop must be able to see it exists');
  assert.equal(screw.enabled, false);
  assert.equal(screw.hint, 'drilling pattern pending');
  // A project carrying it — hand-edited, or saved by a future build — comes back
  // on the knock-in plate. An enabled option that silently drilled the ⌀5
  // pattern would make the export lie about what is on the machine.
  assert.equal(resolveHingePlate(migrateDesign({ hinges: { plate: 'plate_screw3' } }), P), 'plate_knockin5');
  assert.equal(resolveHingePlate(migrateDesign({}), P), C.defaultPlate);
  assert.equal(C.plates.find((p) => p.id === 'plate_knockin5').enabled, true);
});

test('the plate that IS drilled for has a model in the catalogue, in both finishes', () => {
  for (const finish of C.finishes.map((f) => f.id)) {
    const plate = plateFamily({ plate: 'plate_knockin5', finish });
    assert.ok(plate, `the knock-in plate in ${finish}`);
    assert.equal(plate.role, 'plate_knockin5');
    assert.ok(plate.file);
  }
});

// ─── one door's own hinge (F1.3) ────────────────────────────────────────────

test('project → rule → door: the nearest answer wins', () => {
  const byRule = resolveDoorHinge({ frontThickness: 18, finish: 'nickel' });
  assert.equal(byRule.angle, 110);
  assert.equal(byRule.family, '71B3550');
  assert.equal(byRule.assigned, false);

  const assigned = resolveDoorHinge({
    assigned: '71B7590', frontThickness: 18, finish: 'nickel',
  });
  assert.equal(assigned.family, '71B7590', 'the door’s own answer');
  assert.equal(assigned.angle, 155, 'and its angle comes off the family, not the rule');
  assert.equal(assigned.finish, 'onyx', 'an exception may reach across the finish too');
  assert.equal(assigned.assigned, true);
  assert.equal(assigned.ruleAngle, 110, 'while still reporting what the rule would have said');
});

test('an assignment the catalogue no longer has is a stale field, not an override', () => {
  const stale = resolveDoorHinge({ assigned: '71B0000', frontThickness: 18, finish: 'nickel' });
  assert.equal(stale.assigned, false);
  assert.equal(stale.family, '71B3550', 'the rule answers instead');
});

test('the assignment is keyed on the engine’s own panel id', () => {
  const params = { door_hinges: { '01-FL': '71B9550' } };
  assert.equal(doorHingeAssignment(params, '01-FL'), '71B9550');
  assert.equal(doorHingeAssignment(params, '01-FR'), null, 'the other leaf is untouched');
  assert.equal(doorHingeAssignment({}, '01-FL'), null);
  assert.equal(doorHingeAssignment(params, null), null);
});

// ─── the BOM (F1.2) ─────────────────────────────────────────────────────────

test('an ordinary cabinet keeps the ONE hinge line it has had since turn 3', () => {
  const r = computeCabinet(base({ width: 1200, doors: { count: 2 } }), P);
  const rows = hingeRows(r);
  assert.equal(rows.length, 1, 'two identical doors are one thing to buy');
  assert.equal(rows[0].qty, r.totals.hinges);
  assert.equal(rows[0].spec.doors, 2);
  assert.equal(rows[0].spec.angle, 110, '18 mm fronts by default');
});

test('a THICK front resolves to the 95° and the article follows', () => {
  const thin = hingeRows(computeCabinet(base({ front_t: 18 }), P))[0];
  const thick = hingeRows(computeCabinet(base({ front_t: 32 }), P))[0];
  assert.equal(thin.spec.angle, 110);
  assert.equal(thick.spec.angle, 95);
  assert.notEqual(thin.spec.article, thick.spec.article);
  assert.equal(thick.spec.family, '71B9550');
  assert.equal(thin.qty, thick.qty, 'and the COUNT does not move — a hinge is a hinge');
});

test('the FINISH changes the article and nothing else', () => {
  const nickel = hingeRows(computeCabinet(base({ project_hinge_finish: 'nickel' }), P))[0];
  const onyx = hingeRows(computeCabinet(base({ project_hinge_finish: 'onyx' }), P))[0];
  assert.equal(nickel.spec.angle, onyx.spec.angle);
  assert.equal(nickel.qty, onyx.qty);
  assert.notEqual(nickel.spec.article, onyx.spec.article);
  assert.equal(onyx.spec.family, '71B3590');
});

test('a wardrobe with an inner drawer buys the 155° hinge', () => {
  const plain = computeCabinet({
    type: 'WARDROBE', width: 900, height: 2150, depth: 578, unit_num: '01', doors: { count: 2 },
  }, P);
  const withDrawers = computeCabinet({
    type: 'WARDROBE', width: 900, height: 2150, depth: 578, unit_num: '01', doors: { count: 2 }, drawers: 3,
  }, P);
  assert.equal(hingeRows(plain)[0].spec.angle, 110);
  assert.equal(hingeRows(withDrawers)[0].spec.angle, 155, 'the drawer must clear the open door');
  assert.equal(hingeRows(withDrawers)[0].spec.family, '71B7550');
});

test('two leaves fitted differently are TWO lines, and they still add up', () => {
  const params = base({ width: 1200, doors: { count: 2 }, door_hinges: { '01-FR': '71B7590' } });
  const r = computeCabinet(params, P);
  const rows = hingeRows(r);
  assert.equal(rows.length, 2, 'two things to buy');
  assert.equal(rows.reduce((n, h) => n + h.qty, 0), r.totals.hinges, 'and the total is untouched');
  const own = rows.find((h) => h.spec.assigned);
  assert.ok(own, 'the assigned one is marked as such');
  assert.equal(own.spec.family, '71B7590');
  assert.equal(own.spec.doors, 1, 'ONE door, not the cabinet');
  assert.match(own.spec_label, /assigned/);
  // …and the picture agrees with the order form, which is turn 7's contract.
  assert.equal(hardwareInstances(r, P).hinges.length, hardwareCounts(r).hinges);
});

test('the spec_label reads like something a workshop can order', () => {
  const row = hingeRows(computeCabinet(base({ project_hinge_system_label: 'CLIP top BLUMOTION' }), P))[0];
  assert.match(row.spec_label, /3 per door × 1/);
  assert.match(row.spec_label, /110°/);
  assert.match(row.spec_label, /CLIP top BLUMOTION/);
  assert.match(row.spec_label, /nickel/);
  // …and with nothing known it is the line the BOM has printed since turn 3.
  assert.equal(hingeSpecLabel({ perDoor: 3, doors: 2 }), '3 per door × 2');
  assert.equal(hingeSpecLabel({ perDoor: 3, doors: 0 }), '');
});

// ─── the re-resolve gate (F1.4) ─────────────────────────────────────────────

test('a board change that flips the angle says so, and never overrules a hand', () => {
  const flip = hingeReResolve({
    fromThickness: 18, toThickness: 32, assignedDoors: 2, totalDoors: 6,
  });
  assert.equal(flip.flipped, true);
  assert.equal(flip.from, 110);
  assert.equal(flip.to, 95);
  assert.equal(flip.reResolved, 4);
  assert.equal(flip.kept, 2);
  assert.match(flip.message, /110° → 95°/);
  assert.match(flip.message, /4 doors follow the front/);
  assert.match(flip.message, /2 assigned doors keep/);
});

test('…and a board change that does NOT flip it says nothing at all', () => {
  const same = hingeReResolve({
    fromThickness: 18, toThickness: 22, assignedDoors: 1, totalDoors: 4,
  });
  assert.equal(same.flipped, false);
  assert.equal(same.message, null, 'a toast that fires every time teaches you to ignore it');
});

// ─── the models (F1.6) ──────────────────────────────────────────────────────

test('a model url is the catalogue’s own path under the bucket', () => {
  const [f] = hingeFamilies({ angle: 110, finish: 'nickel' });
  assert.equal(hingeModelUrl(f, P, ''), f.file, 'no bucket configured — the bare path');
  assert.equal(
    hingeModelUrl(f, P, 'https://x.test/storage/v1/object/public'),
    `https://x.test/storage/v1/object/public/${C.bucket}/${f.file}`,
  );
  assert.equal(hingeModelUrl(null, P, ''), null);
  assert.equal(hingeModelUrl({ file: '' }, P, ''), null);
});

// ─── THE IRON RULE: NOTHING HERE DRILLS ANYTHING DIFFERENT ──────────────────

test('finish, angle and a hand-assigned hinge change NO hole, NO panel, NO layer', () => {
  // CLAUDE.md turn 19, rule 0: "ZERO deltas this turn. The default hinge IS
  // today's drilling." This is that rule as an assertion rather than a promise:
  // four cabinets that differ in every hardware answer available, and the
  // geometry of all four is byte-identical.
  const geometry = (params) => {
    const r = computeCabinet(params, P);
    return JSON.stringify({
      drills: r.drills,
      panels: r.panels.map((p) => ({
        id: p.id, w: p.w, h: p.h, thickness: p.thickness, cnc: p.cnc, box: p.box,
      })),
      totals: r.totals,
      centres: r.drillSummary.hinge_centers,
    });
  };
  const plain = geometry(base({ width: 1200, doors: { count: 2 } }));
  for (const extra of [
    { project_hinge_finish: 'onyx' },
    { project_hinge_system_label: 'CLIP top BLUMOTION' },
    { door_hinges: { '01-FL': '71B7590', '01-FR': '71B9550' } },
    { project_hinge_finish: 'onyx', door_hinges: { '01-FR': '71B7550' } },
  ]) {
    assert.equal(
      geometry(base({ width: 1200, doors: { count: 2 }, ...extra })),
      plain,
      `${JSON.stringify(extra)} moved a hole`,
    );
  }
});

test('with NO catalogue read the BOM line is exactly what it was before turn 19', (t) => {
  clearHingeCatalogue();
  t.after(() => setHingeCatalogue(CLIPTOP_HINGE_CATALOGUE));

  const r = computeCabinet(base({ width: 1200, doors: { count: 2 } }), P);
  const rows = hingeRows(r);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].qty, 6);
  assert.equal(rows[0].spec.per_door, 3);
  assert.equal(rows[0].spec.doors, 2);
  assert.equal(rows[0].spec.cup_diameter_mm, P.hinges.cups.diameter);
  assert.equal(rows[0].spec_label, '3 per door × 2', 'turn 3’s own label, unchanged');
  assert.equal(rows[0].spec.angle, null);
  assert.equal(rows[0].spec.article, null);
  // …and the drilling is still there, because a hinge without an article is
  // still a hinge.
  assert.ok(r.drillSummary.hinge_centers.length);
  assert.equal(hardwareCounts(r).hinges, 6);
});
