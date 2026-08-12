// ─── Turn 17, owner's review: the two appliance kits, corrected ────────────
//
// Three of these four were shipped wrong in turn 17 and one of them was my
// fault twice over, so they are pinned here in the owner's own arithmetic.
//
// 1. "front musi być SZEROKOŚĆ 594, a wysokość taka sama jak reszta frontów
//    base" — the instruction said height, the engine built a letterbox.
// 2. "nie ma nóg w ogóle, bo tam gdzie są nogi, tam jest D/W".
// 3. "szafka zamiast standardowych jak wszystkie 770 ma 870" — the oven unit
//    was taken off the base height group and given a made-up default.
// 4. "szafka 770 − 3 mm gap − 595 oven — to ile zostaje?" 172. The engine said
//    133, because it measured the OPENING and a front covers the boards.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, getUnitType } from '../src/engine/types.js';

const build = (type, extra = {}) => computeCabinet(
  { ...defaultParamsFor(type, P), unit_num: '01', ...extra }, P,
);
const front = (kit) => kit.panels.find((p) => /^01-F/.test(p.id));

// ── D/W panel ───────────────────────────────────────────────────────────────

test('the D/W front is 594 WIDE, and it stays 594 whatever the opening', () => {
  for (const width of [500, 600, 900]) {
    assert.equal(Math.round(front(build('DW_PANEL', { width })).w), 594,
      `a ${width} mm gap still takes the 594 front — over 600 and the machine cannot open`);
  }
});

test('the D/W front is as TALL as the base fronts beside it', () => {
  for (const height of [720, 770, 800]) {
    assert.equal(Math.round(front(build('DW_PANEL', { height })).h), height - P.doors.gap,
      'it stands in a run of base fronts and lines up with them');
  }
});

test('the D/W front is centred in its opening', () => {
  const kit = build('DW_PANEL', { width: 600 });
  assert.equal(front(kit).box.x, 3, '(600 − 594) / 2');
});

test('the D/W panel has NO legs — the appliance stands there', () => {
  const type = getUnitType('DW_PANEL');
  assert.equal(type.legs, false);
  const legs = (build('DW_PANEL').hardware || [])
    .filter((h) => /leg/i.test(h.type || h.id || ''));
  assert.equal(legs.length, 0, 'a leg drawn here is a leg somebody would try to fit');
});

// ─── TURN 27 (CLAUDE.md F2.1): …AND THEN IT BECAME A CABINET ───────────────
//
// The owner: *"dlaczego zmywarki nie traktujesz jak szafki?"* Turn 17's answer
// here — a front and a top and nothing else — is what made a D/W a species of
// its own, and six faults followed from it over five turns. It keeps sides,
// top, bottom, back and plinth exactly like its neighbours now; what it does
// not keep is anything INSIDE, because what goes inside it is a dishwasher.
test('the D/W unit is an ordinary carcass with an appliance in it', () => {
  const ids = build('DW_PANEL').panels.map((p) => p.id).sort();
  assert.deepEqual(ids, ['01-F', 'BACK', 'BOTTOM', 'BUL', 'BUR', 'TOP']);
  const r = build('DW_PANEL', { shelves: 3, rail: true, drawers: 2 });
  assert.equal(r.panels.filter((p) => p.role === 'shelf').length, 0, 'nothing inside');
  assert.equal(r.drills.filter((d) => d.layer === P.shelfHoles.layer).length, 0, 'and no pin ladder');
});

// ── Oven base ───────────────────────────────────────────────────────────────

test('the oven base takes the project base height, like every base unit', () => {
  assert.equal(getUnitType('OVEN_BASE').heightGroup, 'base');
  assert.equal(P.ovenUnit.defaults.height, 770, 'the worktop decides, not the appliance');
});

test("the drawer front is the owner's own sum: H − gap − oven − gap", () => {
  // ─── TURN 18 (CLAUDE.md F5.4) ───
  // Turn 17 stopped at `H − gap − oven` — 172 on a 770 carcass — and the
  // owner's review adds the half that was missing: the oven's FACE behaves
  // like a front in the run, and two fronts never touch. So the drawer front
  // loses a gap to the appliance as well as the one above it: 169.
  // "szczelina 3 mm jak wszystkie nasze drzwi."
  for (const height of [720, 770, 900]) {
    assert.equal(Math.round(front(build('OVEN_BASE', { height })).h),
      height - P.doors.gap - P.ovenUnit.ovenHeight - P.baseDrawerUnit.gap,
      'a front covers the carcass bottom and the shelf; it is not the opening between them');
  }
  assert.equal(Math.round(front(build('OVEN_BASE', { height: 770 })).h), 169);
});

test('the oven stands on its shelf with exactly the gap above it', () => {
  const height = 770;
  const kit = build('OVEN_BASE', { height });
  const shelf = kit.panels.find((p) => p.id === 'FIXED');
  const standsAt = shelf.box.y + shelf.box.h;     // the shelf's TOP face

  assert.equal(standsAt + P.ovenUnit.ovenHeight, height - P.doors.gap,
    '172 + 595 = 767, and 770 − 767 is the 3 mm gap');
  // …and the drawer front stops one gap BELOW the appliance face, which is
  // where the shelf's top face is: 169 + 3 = 172 (turn 18, F5.4).
  assert.equal(Math.round(front(kit).h) + P.baseDrawerUnit.gap, standsAt,
    'the front covers the face below the shelf, less the gap two fronts keep');
});

test('the oven shelf is still 598 from the TOP', () => {
  assert.equal(P.ovenUnit.shelfFromTop, 598);
  assert.equal(P.ovenUnit.shelfFromTop, P.doors.gap + P.ovenUnit.ovenHeight,
    '598 is 3 + 595 — one number, two ways of saying it, and they must agree');
});

test('the drawer BOX still fits the opening, not the face', () => {
  const kit = build('OVEN_BASE', { height: 770 });
  const side = kit.panels.find((p) => /D1-S[LR]/.test(p.id));
  const f = front(kit);
  assert.ok(side, 'the drawer has sides');
  assert.ok(side.h < f.h, 'a box lives between the boards the front covers');
});
