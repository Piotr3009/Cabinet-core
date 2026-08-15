// ─── TURN 30 F11 — two hinges under 600, on the OVERRIDE CHANNEL ───────────
//
// CLAUDE.md states both halves and they are the whole feature:
//
//   "LISP ladders: Base = always 3; Low = 2 under 800. Owner's standard: ANY
//    door under **600 mm** takes **2** hinges (100 / wys−100). Same override
//    channel as F5: `hinge_two_below_mm` default null (=LISP ladders, bare kit
//    unchanged), company/project value 600. Respect per-door manual hinge
//    edits — they win."
//
// ─── WHY THIS IS AN INPUT AND NOT A LADDER ──────────────────────────────────
//
// Rule 1. `hingeCentres` is the AutoLISP's own arithmetic and stays exactly
// what it is; a bare `computeCabinet()` — every golden fixture — passes no
// threshold and drills the kit's own count. The owner's rule is a WORKSHOP
// STANDARD and travels the plinth's road: profile default null → company row →
// project design → `paramsForEngine()` → one input on the call.
//
// ─── AND "THEY WIN" IS CONTROL FLOW, NOT A PROMISE ──────────────────────────
//
// A door somebody has edited by hand returns from `hingeRows` before the new
// rule is ever reached, because the explicit list is the first thing the
// function looks at. That is asserted below rather than described.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet, hingeCentres, hingeRows } from '../src/engine/cabinet.js';
import { defaultParamsFor, getUnitType, UNIT_TYPE_ORDER } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { DEFAULT_DESIGN, migrateDesign } from '../src/engine/design.js';
import {
  DEFAULT_COMPANY_DEFAULTS, prefillDesignFromCompany, validateCompanyDefaults,
} from '../src/engine/companyDefaults.js';

const END = P.hinges.endOffset;

const bud = (over = {}) => computeCabinet({
  ...defaultParamsFor('BUD', P), unit_num: '01', doors: true, ...over,
}, P);

// ─── 1. THE LISP'S LADDERS ARE STILL THE BARE ANSWER ────────────────────────

test('F11 the LISP ladders are what CLAUDE.md says they are', () => {
  // Base is ALWAYS three, whatever the height — that is the ladder the owner's
  // standard is an exception to, and it is asserted so the exception has
  // something to be an exception to.
  for (const h of [400, 500, 770, 900]) {
    assert.equal(hingeCentres(h, P.hinges.rules.base, P).length, 3, `base at ${h}`);
  }
  // Low takes two under 800 and three above it.
  assert.equal(hingeCentres(700, P.hinges.rules.low, P).length, 2);
  assert.equal(hingeCentres(900, P.hinges.rules.low, P).length, 3);
});

test('F11 a BARE call passes no threshold and drills the kit’s own count', () => {
  // Rule 1, across the type list rather than on one cabinet: every golden
  // fixture is a bare call and none of them may move.
  let seen = 0;
  for (const type of UNIT_TYPE_ORDER) {
    const r = computeCabinet({
      ...defaultParamsFor(type, P), unit_num: '01', height: 500, doors: true,
    }, P);
    if (!r.drillSummary.hinge_centers.length) continue;
    seen += 1;
    // Which LADDER this kit is on is read off the type, never guessed.
    const rule = P.hinges.rules[getUnitType(type).hingeRule] || P.hinges.rules.base;
    assert.deepEqual(
      r.drillSummary.hinge_centers,
      hingeCentres(r.params.height, rule, P).map((v) => Math.round(v * 10000) / 10000),
      `${type}: the kit's own ladder, unchanged`,
    );
  }
  assert.ok(seen >= 3, `${seen} hinged kits checked`);
});

test('F11 …and nothing said leaves a short door on the kit’s ladder', () => {
  const short = bud({ height: 500 });
  assert.equal(short.drillSummary.hinge_centers.length, 3, 'base is always three');
  assert.deepEqual(short.drillSummary.hinge_centers, bud({ height: 500, hinge_two_below_mm: null }).drillSummary.hinge_centers);
  assert.deepEqual(short.drillSummary.hinge_centers, bud({ height: 500, hinge_two_below_mm: 0 }).drillSummary.hinge_centers);
});

// ─── 2. THE OWNER'S STANDARD ────────────────────────────────────────────────

test('F11 THE RULE: any door under 600 takes TWO, at 100 and wys − 100', () => {
  const r = bud({ height: 500, hinge_two_below_mm: 600 });
  assert.equal(r.drillSummary.hinge_centers.length, 2);
  assert.deepEqual(r.drillSummary.hinge_centers, [END, 500 - END]);
  assert.equal(END, 100, 'and "100" is the profile’s own endOffset');
});

test('F11 …and a door AT or OVER the threshold is left on the ladder', () => {
  // The leaf is `H − gap + extend`, so the boundary is asked in the leaf's own
  // height rather than the carcass's — which is what "any DOOR under 600" says.
  const under = bud({ height: 590, hinge_two_below_mm: 600 });
  const over = bud({ height: 700, hinge_two_below_mm: 600 });
  assert.equal(under.drillSummary.hinge_centers.length, 2);
  assert.equal(over.drillSummary.hinge_centers.length, 3);
  // …and the switch really is at the DOOR's height: a 603 carcass has a 600
  // leaf, which is not under 600.
  const leafAt600 = bud({ height: 600 + P.doors.gap, hinge_two_below_mm: 600 });
  assert.equal(leafAt600.drillSummary.hinge_centers.length, 3, 'a 600 leaf is not under 600');
});

test('F11 the CUPS follow the hinges, so a two-hinge door is bored twice', () => {
  const r = bud({ height: 500, hinge_two_below_mm: 600 });
  assert.equal(r.drillSummary.front_cup_y.length, 2, 'two cups for two hinges');
  const cups = r.drills.filter((d) => d.layer === P.hinges.cups.layer);
  assert.equal(cups.length, 2, 'and two holes in the leaf');
  // …and the BOM buys two rather than three.
  const line = r.totals.hardware?.find((h) => /hinge/i.test(h.key || h.label || ''));
  if (line) assert.equal(line.qty % 2, 0, `${line.qty} hinges for a two-hinge door`);
});

// ─── 3. A HAND-EDITED DOOR WINS ────────────────────────────────────────────

test('F11 a door somebody has edited BY HAND is untouched — they win', () => {
  const own = [120, 300, 480];
  const r = bud({ height: 500, hinge_two_below_mm: 600, hinge_rows: own });
  assert.deepEqual(r.drillSummary.hinge_centers, own);
  // …and it is CONTROL FLOW rather than a promise: the explicit list returns
  // before the new rule is ever reached.
  const src = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');
  const at = src.indexOf('export function hingeRows({');
  assert.ok(at > 0, 'the function is there');
  // Both strings appear once, inside it, and the ORDER is the whole claim: the
  // explicit list returns before the threshold is even read.
  const owns = src.indexOf('if (Array.isArray(own) && own.length)', at);
  const below = src.indexOf('const below = Number(twoBelowMm);', at);
  assert.ok(owns > at && below > at, `${owns} / ${below}`);
  assert.ok(owns < below, 'the hand-edited list is looked at FIRST');
});

test('F11 the PROJECT STANDARD (2/3) and this rule do not fight', () => {
  // Turn 17's standard removes one INNER hinge; F11 replaces the ladder
  // outright for a short door. A short door on standard 2 is still the two
  // outer ones — there is no inner one left to remove, and no third answer.
  const r = bud({ height: 500, hinge_two_below_mm: 600, hinge_standard: 2 });
  assert.deepEqual(r.drillSummary.hinge_centers, [END, 500 - END]);
  // …and a TALL door on standard 2 is turn 17's own answer, untouched.
  const tall = bud({ height: 770, hinge_two_below_mm: 600, hinge_standard: 2 });
  assert.equal(tall.drillSummary.hinge_centers.length, 2);
  assert.deepEqual(tall.drillSummary.hinge_centers, [100, 670], 'the middle one came off');
});

test('F11 the pure function is askable, and null is the ladder', () => {
  const rule = P.hinges.rules.base;
  assert.equal(hingeRows({ height: 500, rule, doorHeight: 497, twoBelowMm: 600 }, P).length, 2);
  assert.equal(hingeRows({ height: 500, rule, doorHeight: 497, twoBelowMm: null }, P).length, 3);
  assert.equal(hingeRows({ height: 500, rule, doorHeight: null, twoBelowMm: 600 }, P).length, 3,
    'no door height, no rule to apply');
});

// ─── 4. THE CHANNEL, END TO END ────────────────────────────────────────────

test('F11 the profile’s default is NULL, and null is the LISP', () => {
  assert.equal(P.hinges.twoBelowMm, null);
});

test('F11 the project layer has a place to say it', () => {
  assert.equal(DEFAULT_DESIGN.hingeTwoBelow, null);
  assert.equal(migrateDesign({}).hingeTwoBelow, null, 'a project saved before this turn says nothing');
  assert.equal(migrateDesign({ hingeTwoBelow: 600 }).hingeTwoBelow, 600);
  assert.equal(migrateDesign({ hingeTwoBelow: 0 }).hingeTwoBelow, null);
});

test('F11 the COMPANY row has one too, and it prefills the project', () => {
  assert.equal(DEFAULT_COMPANY_DEFAULTS.hinge_two_below_mm, null);
  const row = { ...DEFAULT_COMPANY_DEFAULTS, hinge_two_below_mm: 600 };
  const checked = validateCompanyDefaults(row, P);
  assert.deepEqual(checked.rejected, [], 'nothing about it is rule-owned');
  assert.equal(checked.value.hinge_two_below_mm, 600);
  // A number that is not a door height is SAID rather than obeyed.
  assert.equal(validateCompanyDefaults({ ...row, hinge_two_below_mm: 60 }, P).rejected.length, 1);
  // …and the ANGLE is still forbidden, which is the line F2b.1 draws.
  assert.ok(validateCompanyDefaults({ ...row, hinge_angle: 110 }, P).rejected.length >= 1);

  assert.equal(prefillDesignFromCompany({}, row, P).hingeTwoBelow, 600);
  assert.equal(prefillDesignFromCompany({ hingeTwoBelow: 700 }, row, P).hingeTwoBelow, 700, 'the project wins');
});

test('F11 `paramsForEngine` carries it, like the plinth', () => {
  const store = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');
  assert.match(store, /hinge_two_below_mm: design\?\.hingeTwoBelow \?\? null,/);
  const at = store.indexOf('hinge_two_below_mm:');
  const above = store.slice(Math.max(0, at - 600), at);
  assert.match(above, /golden fixture/);
  assert.match(above, /override channel|same road|INPUT in the design layer/i);
});
