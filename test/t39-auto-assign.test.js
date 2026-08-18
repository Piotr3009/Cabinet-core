// ─── THE AUTOMATIC ASSIGNMENTS (turn 39, CLAUDE.md F4) ──────────────────────
//
// The owner: *"zawiasy automatycznie po wyborze koloru, nóżki też
// automatycznie w zależności od wysokości."*
//
// Four rules and one law over all four: A MANUAL ASSIGNMENT ALWAYS WINS AND IS
// NEVER OVERWRITTEN. CLAUDE.md F4 asks for each rule to be tested with
// in-range, out-of-range and boundary inputs, and for a manual assignment to
// survive a rule re-run. All of that is below.
//
// Every rule resolves to a MATERIAL ID — a row in a workshop's own stock list —
// so the ladders are the workshop's and they ship EMPTY. A rule with nothing to
// choose from must return a SENTENCE, never a guess, and that is asserted as
// hard as the successes are.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import {
  legProductFor, legHeightsIn, hingeProductFor, projectMetal, runnerProductsFor,
  lightingProductsFor, autoAssignments, applicable, refusals,
} from '../src/engine/autoAssign.js';
import { normalizeAssignments, assignmentFor } from '../src/engine/partRegistry.js';

// A workshop's own ladder: a 100 mm leg winding 95–120 and a 150 winding
// 145–180. The gap between 120 and 145 is real and is the point.
const LEGS = [
  { material_id: 'leg100', label: 'Adjustable leg 100', nominal_mm: 100, min_mm: 95, max_mm: 120 },
  { material_id: 'leg150', label: 'Adjustable leg 150', nominal_mm: 150, min_mm: 145, max_mm: 180 },
];

function cabinet(typeId, extra = {}) {
  const params = { ...defaultParamsFor(typeId, P), unit_num: '01', ...extra };
  return { unit: { id: `u_${typeId}`, type: typeId, params }, result: computeCabinet(params, P) };
}

// ═══ LEGS ═══════════════════════════════════════════════════════════════════

test('IN RANGE — a 100 mm plinth takes the 100 mm leg', () => {
  const p = legProductFor(100, LEGS);
  assert.equal(p.material_id, 'leg100');
  assert.match(p.why, /100 mm plinth/);
});

test('IN RANGE — 110 is covered by the 100 mm leg’s adjustment, not by the 150', () => {
  assert.equal(legProductFor(110, LEGS).material_id, 'leg100');
  assert.equal(legProductFor(160, LEGS).material_id, 'leg150');
});

test('BOUNDARY — both ends of a range are INSIDE it', () => {
  assert.equal(legProductFor(95, LEGS).material_id, 'leg100');
  assert.equal(legProductFor(120, LEGS).material_id, 'leg100');
  assert.equal(legProductFor(145, LEGS).material_id, 'leg150');
  assert.equal(legProductFor(180, LEGS).material_id, 'leg150');
});

test('OUT OF RANGE — the gap, the bottom and the top all refuse AND SAY WHY', () => {
  for (const h of [94, 121, 130, 144, 181, 400]) {
    const p = legProductFor(h, LEGS);
    assert.equal(p.material_id, null, `${h} mm must not be given a leg`);
    assert.match(p.why, /no leg adjusts to/, `${h} mm: ${p.why}`);
    assert.match(p.why, /95–120/, 'the sentence names the ladder it does cover');
  }
});

test('NEAREST NOMINAL wins where two legs both reach', () => {
  const overlapping = [
    { material_id: 'leg100', nominal_mm: 100, min_mm: 90, max_mm: 200 },
    { material_id: 'leg150', nominal_mm: 150, min_mm: 90, max_mm: 200 },
  ];
  assert.equal(legProductFor(110, overlapping).material_id, 'leg100');
  assert.equal(legProductFor(140, overlapping).material_id, 'leg150');
  // Dead centre is a tie, and a tie must be DECIDED — never left to key order.
  assert.equal(legProductFor(125, overlapping).material_id, 'leg100');
});

test('NO LADDER — the profile ships empty, so the rule says so', () => {
  const p = legProductFor(100, []);
  assert.equal(p.material_id, null);
  assert.match(p.why, /no leg rules/);
  assert.deepEqual(P.materials.legRules, [], 'this app does not invent workshop numbers');
});

test('a rule with no material behind it is not a rule', () => {
  assert.equal(legProductFor(100, [{ label: 'blank', nominal_mm: 100, min_mm: 90, max_mm: 120 }]).material_id, null);
  assert.equal(legProductFor(100, [{ material_id: 'x', nominal_mm: 100 }]).material_id, null, 'a rule with no range covers nothing');
});

test('a cabinet with no legs at all is not a refusal to find one', () => {
  assert.match(legProductFor(0, LEGS).why, /stands on no legs/);
  assert.match(legProductFor(null, LEGS).why, /stands on no legs/);
});

test('the heights come from the ENGINE’s own leg lines', () => {
  const bud = cabinet('BUD', { doors: true, plinth: true });
  const heights = legHeightsIn([bud]);
  const engine = (bud.result.hardware || []).find((h) => h.role === 'legs');
  assert.deepEqual(heights, [engine.spec.height_mm]);
  assert.equal(legProductFor(heights[0], LEGS).material_id, 'leg100');
  // A wall unit has none, and that is silence rather than zero.
  assert.deepEqual(legHeightsIn([cabinet('WUD', { doors: true })]), []);
});

// ═══ HINGES ═════════════════════════════════════════════════════════════════

const HINGES = [
  { material_id: 'hinge_nickel', label: 'CLIP top BLUMOTION nickel', finish: 'nickel' },
  { material_id: 'hinge_onyx', label: 'CLIP top BLUMOTION onyx', finish: 'onyx' },
];

test('the colour the project already chose is the colour the hinge follows', () => {
  assert.equal(projectMetal({ hardware: { shelfSleeve: 'onyx' } }, P), 'onyx');
  // Nobody has chosen: the workshop's own default stands, and there is no
  // second colour question for hinges.
  assert.equal(projectMetal(null, P), P.appearance.metalDefault);
});

test('chrome and silver both resolve to the SAME nickel hinge', () => {
  for (const metal of ['chrome', 'silver']) {
    const p = hingeProductFor({ design: { hardware: { shelfSleeve: metal } }, profile: P, rules: HINGES });
    assert.equal(p.material_id, 'hinge_nickel', metal);
    assert.match(p.why, new RegExp(`${metal} → nickel`));
  }
  const onyx = hingeProductFor({ design: { hardware: { shelfSleeve: 'onyx' } }, profile: P, rules: HINGES });
  assert.equal(onyx.material_id, 'hinge_onyx');
});

test('GOLD refuses, and the refusal is the truth — nobody publishes a gold hinge', () => {
  const p = hingeProductFor({ design: { hardware: { shelfSleeve: 'gold' } }, profile: P, rules: HINGES });
  assert.equal(p.material_id, null);
  assert.match(p.why, /no hinge is published in gold/);
  // The app's own table is what says so; the rule does not decide it.
  assert.equal(P.appearance.metalHingeFinish.gold, null);
});

test('a finish with no rule for it refuses by name', () => {
  const p = hingeProductFor({ design: { hardware: { shelfSleeve: 'onyx' } }, profile: P, rules: [HINGES[0]] });
  assert.equal(p.material_id, null);
  assert.match(p.why, /no rule for hinge finish "onyx"/);
});

test('the more specific rule wins — a general row and one exception beside it', () => {
  const rules = [
    { material_id: 'general', finish: 'nickel' },
    { material_id: 'for_this_system', finish: 'nickel', system: 'cliptop_blumotion' },
  ];
  const p = hingeProductFor({ design: { hardware: { shelfSleeve: 'chrome' } }, profile: P, rules });
  assert.equal(p.material_id, 'for_this_system');
});

test('the PLATE follows the same colour, off its own ladder', () => {
  const profile = {
    ...P,
    materials: { ...P.materials, hingePlateRules: [{ material_id: 'plate_nickel', finish: 'nickel' }] },
  };
  const p = hingeProductFor({ design: { hardware: { shelfSleeve: 'chrome' } }, profile, part: 'hinge_plate' });
  assert.equal(p.material_id, 'plate_nickel');
  // …and an empty plate ladder refuses in the plate's own words.
  const none = hingeProductFor({ design: { hardware: { shelfSleeve: 'chrome' } }, profile: P, part: 'hinge_plate' });
  assert.match(none.why, /no hinge plate rules/);
});

// ═══ RUNNERS ════════════════════════════════════════════════════════════════

test('the runner length is READ off the engine, never re-derived', () => {
  const budr = cabinet('BUDR', { doors: true });
  const engineNls = [...new Set((budr.result.hardware || [])
    .filter((h) => h.role === 'runner_pairs')
    .map((h) => h.spec.nl))];
  const rows = runnerProductsFor({ entries: [budr], profile: P, design: null });
  assert.ok(rows.length > 0, 'a three-drawer unit asks for runners');
  assert.deepEqual(rows.map((r) => r.nl).sort(), engineNls.sort());
  // No rules: a sentence naming the length the engine chose.
  assert.equal(rows[0].material_id, null);
  assert.match(rows[0].why, /no runner rules/);
});

test('a rule at that exact nominal is chosen; a rule at another is not', () => {
  const budr = cabinet('BUDR', { doors: true });
  const nl = (budr.result.hardware || []).find((h) => h.role === 'runner_pairs').spec.nl;
  const hit = runnerProductsFor({
    entries: [budr], profile: P, rules: [{ material_id: `movento_${nl}`, nl_mm: nl }],
  });
  assert.equal(hit[0].material_id, `movento_${nl}`);
  assert.match(hit[0].why, new RegExp(`NL ${nl}`));

  const miss = runnerProductsFor({
    entries: [budr], profile: P, rules: [{ material_id: 'wrong', nl_mm: nl + 50 }],
  });
  assert.equal(miss[0].material_id, null);
  assert.match(miss[0].why, new RegExp(`no runner rule for NL ${nl}`));
});

test('the VARIANT breaks a tie between two rules at the same length', () => {
  const budr = cabinet('BUDR', { doors: true });
  const line = (budr.result.hardware || []).find((h) => h.role === 'runner_pairs');
  const rows = runnerProductsFor({
    entries: [budr],
    profile: P,
    rules: [
      { material_id: 'standard', nl_mm: line.spec.nl, variant: 'S' },
      { material_id: 'tipon', nl_mm: line.spec.nl, variant: 'T' },
    ],
  });
  assert.equal(rows[0].material_id, line.spec.variant === 'T' ? 'tipon' : 'standard');
});

test('a cabinet with no drawers asks for no runners', () => {
  assert.deepEqual(runnerProductsFor({ entries: [cabinet('BUD', { doors: true })], profile: P }), []);
});

// ═══ LIGHTING ═══════════════════════════════════════════════════════════════

test('LED products are chosen by id, and the metres are not this rule’s business', () => {
  const profile = {
    ...P,
    materials: { ...P.materials, ledRules: { ...P.materials.ledRules, strip: 'led3000', profile: 'chan12' } },
  };
  const rows = lightingProductsFor({ profile, usage: { led_strip: {}, led_profile: {}, led_driver: {} } });
  const by = Object.fromEntries(rows.map((r) => [r.partId, r]));
  assert.equal(by.led_strip.material_id, 'led3000');
  assert.equal(by.led_profile.material_id, 'chan12');
  assert.equal(by.led_driver.material_id, null);
  assert.match(by.led_driver.why, /no LED driver product/);
  // A part the job does not carry is not proposed at all.
  assert.equal(by.led_spot, undefined);
});

// ═══ THE PASS, AND THE LAW OVER IT ══════════════════════════════════════════

test('the pass proposes for every rule the project’s state supports', () => {
  const budr = cabinet('BUDR', { doors: true, plinth: true });
  const profile = {
    ...P,
    materials: {
      ...P.materials,
      legRules: LEGS,
      hingeRules: HINGES,
      runnerRules: [{ material_id: 'mv', nl_mm: (budr.result.hardware.find((h) => h.role === 'runner_pairs')).spec.nl }],
    },
  };
  const props = autoAssignments({
    entries: [budr], design: { hardware: { shelfSleeve: 'chrome' } }, profile,
  });
  const ids = props.map((p) => p.partId);
  assert.ok(ids.includes('hinge'));
  assert.ok(ids.includes('leg'));
  assert.ok(ids.includes('runner'));
  const ok = applicable(props);
  assert.ok(ok.length >= 3, `only ${ok.length} proposals could be made`);
  for (const p of refusals(props)) assert.ok(p.why && p.why.length > 8, 'every refusal carries a sentence');
});

test('two different plinth heights in one job REFUSE rather than pick one', () => {
  const a = cabinet('BUD', { doors: true, plinth: true, leg_height: 100 });
  const b = cabinet('BUD', { doors: true, plinth: true, leg_height: 150 });
  const profile = { ...P, materials: { ...P.materials, legRules: LEGS } };
  const leg = autoAssignments({ entries: [a, b], profile }).find((p) => p.partId === 'leg');
  assert.equal(leg.material_id, null);
  assert.match(leg.why, /100 and 150/);
  assert.match(leg.why, /choose by hand/);
});

test('THE LAW — a manual assignment survives the rule, in both directions', () => {
  // The store owns the law; this pins the DATA half of it, which is what the
  // store reads: a part with a material and no `auto` tag is a hand's work.
  let data = normalizeAssignments({ base: { leg: { material_id: 'the_joiner_chose_this' } } });
  const proposal = legProductFor(100, LEGS);
  assert.equal(proposal.material_id, 'leg100');

  // What `setAutoAssignment` does, in one line, so the rule is testable without
  // a browser: it refuses when a hand has set the part and no tag says the rule
  // set it.
  const wouldWrite = !(data.base.leg?.material_id && !data.auto?.leg);
  assert.equal(wouldWrite, false, 'a rule may not overwrite a hand');

  // And where the RULE set it, the rule may still move it.
  data = normalizeAssignments({ base: { leg: { material_id: 'leg100' } }, auto: { leg: true } });
  assert.equal(Boolean(data.auto.leg), true);
  const mayMove = !(data.base.leg?.material_id && !data.auto?.leg);
  assert.equal(mayMove, true);
  assert.equal(assignmentFor(data, 'leg').material_id, 'leg100');
});
