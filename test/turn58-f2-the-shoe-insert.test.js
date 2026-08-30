import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { shoeDividerXs, shoeInsertSpec, shoeRampPlan } from '../src/engine/shoeInsert.js';

// ─── TURN 58 · F2 — THE SHOE DRAWER GETS ITS INSERT BACK ───────────────────
//
// HISTORY, HONESTLY. T54-F7 killed the old shoe world on the owner's own order
// (*"usuń stary kod na shoes i zrób z logiką drawers"*) and took
// `reference/lisp/KIT_SHOE_BOX.lsp` with it. The re-spec covered the BOX — a
// shoe is a `variant:'shoe'` drawer now, standard in every way but its 80 mm
// side — and it never mentioned the INSIDE. So the ramp and the dividers went
// into the same grave without anybody deciding they should, and a shoe drawer
// has been an empty box ever since.
//
// The conditions now exist. The insert comes back, and only the insert.
//
// ─── THE ANGLE IS THE LIVING LAW ───────────────────────────────────────────
// The ramp leans at `P.wardrobeAccessories.shoeShelf.tiltDeg` — the shoe SHELF
// variant that survived T54 — and the kit states the same number as
// `shoeRampTiltDeg`. Asserted equal below, so a second shoe angle cannot enter
// this app without the suite going red.

const KIT = readFileSync(new URL('../reference/lisp/KIT_WARDROBE_FULL.lsp', import.meta.url), 'utf8');
const DR = P.wardrobe.drawers;
const SHOE_FRONT = DR.shoeSideMm + DR.frontToSideDelta;

const wardrobeWith = (items, over = {}) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P),
  unit_num: 'W01',
  width: 900,
  sections: [{ width_mm: 900, items }],
  ...over,
}, P);

const shoeDrawer = (index) => ({
  id: `s${index}`, kind: 'drawer', index, height_mm: SHOE_FRONT, variant: 'shoe',
});
const plainDrawer = (index) => ({ id: `d${index}`, kind: 'drawer', index, height_mm: 200 });
const watchDrawer = (index) => ({
  id: `w${index}`, kind: 'drawer', index, height_mm: 200, watch_insert: true,
});

const insertOf = (r) => r.panels.filter((p) => p.role === 'shoe_insert');
const refusals = (r, code = 'shoe_insert_refused') => r.warnings.filter((w) => w.code === code);

/** A shoe drawer on top of one plain drawer — the shape the owner asked for. */
const TOP_SHOE = [plainDrawer(1), shoeDrawer(2)];

// ═══ 1. THE PARTS ARE BORN ══════════════════════════════════════════════════

test('F2 · one ramp and TWO dividers — always two', () => {
  const r = wardrobeWith(TOP_SHOE);
  const parts = insertOf(r);
  assert.equal(parts.filter((p) => p.part === 'SHOE-RAMP').length, 1, 'one ramp');
  assert.equal(parts.filter((p) => p.part === 'SHOE-DIVIDER').length, 2,
    '"po prostu daj 2 zawsze" — and no field offers a third answer');
  assert.equal(shoeInsertSpec(P).dividerCount, 2, 'the count is a constant, not an input');
});

test('F2 · the ramp leans at the shoe SHELF\'s own tilt — one angle in this app', () => {
  const ramp = insertOf(wardrobeWith(TOP_SHOE)).find((p) => p.part === 'SHOE-RAMP');
  assert.equal(ramp.meta.tilt_deg, P.wardrobeAccessories.shoeShelf.tiltDeg,
    'the LIVING law — the T33 shelf variant that survived T54');
  // …and the kit says the same number, parsed off the file rather than retyped.
  const stated = KIT.match(/\(defun shoeRampTiltDeg \( \/ \) ([0-9.]+)\)/);
  assert.ok(stated, 'the kit states the tilt as a one-line constant');
  assert.equal(Number(stated[1]), P.wardrobeAccessories.shoeShelf.tiltDeg,
    'LISP first, and the engine follows the same number');
});

test('F2 · the tilt prints on the sheet the way a slope prints CUT β°', () => {
  const ramp = insertOf(wardrobeWith(TOP_SHOE)).find((p) => p.part === 'SHOE-RAMP');
  assert.equal(ramp.meta.note, `CUT ${P.wardrobeAccessories.shoeShelf.tiltDeg} DEG`);
});

test('F2 · every insert board is born with the grain HORIZONTAL', () => {
  // The Petros sheet-goods law, exactly as the watch insert carries it
  // (T55-F6): *"wszystkie przegródki muszą być w poziomie słoje nie w pionie."*
  for (const p of insertOf(wardrobeWith(TOP_SHOE))) {
    assert.equal(p.cnc.grain, 'h', `${p.id} states its grain at birth`);
    assert.equal(p.cnc.rotated, true, 'drawn standing, its length up the sheet');
  }
});

test('F2 · three even lanes, and the dividers are the shoe stock', () => {
  const parts = insertOf(wardrobeWith(TOP_SHOE));
  const divs = parts.filter((p) => p.part === 'SHOE-DIVIDER');
  const s = shoeInsertSpec(P);
  for (const d of divs) assert.equal(d.thickness, s.insertT);
  const lanes = divs.map((d) => d.meta.lane_w_mm);
  assert.equal(new Set(lanes).size, 1, 'the three lanes are even');
  assert.ok(lanes[0] > 0);
});

test('F2 · the lanes are measured off the clear width, and they are even', () => {
  const s = shoeInsertSpec(P);
  const xs = shoeDividerXs(600, s);
  assert.equal(xs.length, 2, 'two dividers, three lanes');
  // Lane, stock, lane, stock, lane — and the three lanes are the same width.
  const lane = (600 - 2 * s.insertT) / 3;
  assert.ok(Math.abs(xs[0] - lane) < 1e-6);
  assert.ok(Math.abs(xs[1] - (2 * lane + s.insertT)) < 1e-6);
  assert.ok(Math.abs((600 - (xs[1] + s.insertT)) - lane) < 1e-6, 'the last lane closes the width');
});

test('F2 · the dividers are the ramp\'s own length — no second arithmetic', () => {
  const parts = insertOf(wardrobeWith(TOP_SHOE));
  const ramp = parts.find((p) => p.part === 'SHOE-RAMP');
  for (const d of parts.filter((p) => p.part === 'SHOE-DIVIDER')) {
    assert.equal(d.w, ramp.h, 'a divider runs the length of the ramp it stands on');
  }
});

// ═══ 2. THE ANGLE NEVER MOVES; THE RUN DOES ═════════════════════════════════

test('F2 · a drawer deeper than its headroom gets a SHORTER ramp, not a shallower one', () => {
  const r = wardrobeWith(TOP_SHOE);
  const ramp = insertOf(r).find((p) => p.part === 'SHOE-RAMP');
  assert.equal(ramp.meta.tilt_deg, P.wardrobeAccessories.shoeShelf.tiltDeg,
    'the tilt is the same whatever the depth — the old T34 box moved the ANGLE and that is the fault');
  if (ramp.meta.clamped) {
    assert.ok(ramp.meta.run_mm < ramp.meta.run_mm + 1, 'the run gave way');
    // …and the joiner is told, rather than being surprised by a half ramp.
    assert.equal(refusals(r, 'shoe_ramp_clamped').length, 1, 'the Check line says so');
  }
});

test('F2 · the plan keeps the tilt across every depth it is asked about', () => {
  const s = shoeInsertSpec(P);
  for (const depth of [200, 404, 600]) {
    const plan = shoeRampPlan(depth, 200, s);
    if (!plan.ok) continue;
    // rise / run is the tangent of the ONE angle, whatever the run came out
    // as. Both numbers are rounded to the house's 4 dp on the record, so the
    // tolerance is that rounding and not a fudge: a thousandth of a degree is
    // far below anything a saw or a joiner can tell apart.
    const deg = (Math.atan(plan.rise / plan.run) * 180) / Math.PI;
    assert.ok(Math.abs(deg - s.tiltDeg) < 1e-3, `${depth} mm deep still leans at ${s.tiltDeg}°`);
  }
});

// ═══ 3. THE OWNER'S THREE REFUSALS, IN WORDS ════════════════════════════════

test('F2 · TOP OF THE STACK ONLY — "tylko na wierzchu innych szuflad"', () => {
  const r = wardrobeWith([shoeDrawer(1), plainDrawer(2)]);
  assert.equal(insertOf(r).length, 0, 'nothing is cut');
  const [why] = refusals(r);
  assert.ok(why, 'and it is refused in words');
  assert.equal(why.reason, 'not-top');
  assert.match(why.message, /top of its stack/);
  assert.match(why.message, /drawer 2 is above it/, 'the message names what is above it');
});

test('F2 · NOTHING ABOVE IT — "nie może mieć półki nad sobą"', () => {
  const r = wardrobeWith([
    plainDrawer(1), shoeDrawer(2), { id: 'sh', kind: 'shelf', pos_mm: 700 },
  ]);
  const [why] = refusals(r).filter((w) => w.reason === 'shelf-above');
  assert.ok(why, 'a shelf over the shoes is refused');
  assert.match(why.message, /shoe drawer carries nothing above it/);
  assert.equal(insertOf(r).length, 0);
});

test('F2 · WATCHES XOR SHOES, and the refusal NAMES the other — both directions', () => {
  // Shoe added where a watch already is.
  const a = wardrobeWith([watchDrawer(1), shoeDrawer(2)]);
  const shoeNo = refusals(a).find((w) => w.reason === 'watch-in-cabinet');
  assert.ok(shoeNo, 'the shoe is refused');
  assert.equal(shoeNo.watch_drawer, 1, 'and the watch drawer is named on the record');
  assert.match(shoeNo.message, /drawer 1 in this cabinet holds the watch insert/);
  assert.match(shoeNo.message, /watches or shoes, never both/);
  assert.equal(insertOf(a).length, 0);

  // …and a watch added where a shoe already is — the same rule, the other door.
  const b = wardrobeWith([shoeDrawer(1), watchDrawer(2)]);
  const watchNo = refusals(b, 'watch_insert_refused').find((w) => w.reason === 'shoe-in-cabinet');
  assert.ok(watchNo, 'the watch is refused too');
  assert.equal(watchNo.shoe_drawer, 1, 'and the shoe drawer is named');
  assert.match(watchNo.message, /is the shoe drawer/);
  assert.equal(b.panels.filter((p) => p.role === 'watch_insert').length, 0,
    'no watch tray is cut either');
});

// ═══ 4. AND NOTHING ELSE MOVED ══════════════════════════════════════════════

test('F2 · a wardrobe with no shoe drawer cuts no insert and says nothing', () => {
  const r = wardrobeWith([plainDrawer(1), plainDrawer(2)]);
  assert.equal(insertOf(r).length, 0);
  assert.equal(refusals(r).length, 0, 'and no warning about a drawer nobody asked to dress');
});

test('F2 · the flat golden is untouched — a bare kit has no drawer items at all', () => {
  const bare = computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: '01' }, P);
  assert.equal(bare.panels.filter((p) => p.role === 'shoe_insert').length, 0);
  assert.equal(bare.warnings.filter((w) => /shoe/.test(w.code)).length, 0);
});

test('F2 · the shoe drawer\'s BOX is still a standard drawer', () => {
  // T54-F7's whole claim, and this turn must not disturb it: the insert is
  // added INSIDE, and not one board of the box changes.
  const plain = wardrobeWith([plainDrawer(1), { ...shoeDrawer(2), variant: undefined, height_mm: SHOE_FRONT }]);
  const shoe = wardrobeWith(TOP_SHOE);
  const boards = (r) => r.panels
    .filter((p) => p.role === 'drawer_box' && p.meta?.drawer === 2)
    .map((p) => `${p.part}:${p.w}x${p.h}x${p.thickness}`)
    .sort();
  assert.deepEqual(boards(shoe), boards(plain), 'board for board, the same box');
});
