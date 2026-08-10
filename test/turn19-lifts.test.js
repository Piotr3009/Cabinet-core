// ─── THE LIFT-SELECTION ENGINE (turn 19, CLAUDE.md F5) ──────────────────────
//
// "node:test the lot: each range's edges, the overlap rule, the limits, the
// assignment warnings, MFC vs MDF weights."
//
// Turn 20 builds the HK and HF cabinet KITS after a pattern session with the
// owner. This turn owes it maths that is already right, and this file is what
// makes that claim checkable: every number below comes out of
// reference/hardware/aventos.json, which is the CATALOGUE OF RECORD, and the
// test asserts the ENGINE'S BEHAVIOUR against the FILE rather than against a
// second copy of the file written out by hand.
//
// The owner's rule is the thing being pinned: "silnik proponuje, klient assign,
// ale guidance i sprzeciw." An assignment is never refused. It is warned about,
// with the unit that would have fitted named in the warning.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  aventosCatalogue, boardKgM2, clearAventosCatalogue, frontWeightKg, panelWeight,
  parseAventosCatalogue, powerFactor, selectLiftUnit, setAventosCatalogue,
} from '../src/engine/lifts.js';
import { AVENTOS_CATALOGUE, loadHardwareCatalogues } from '../src/lib/hardwareCatalogue.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { MOCK_MATERIALS } from '../src/stores/materialAssignmentStore.js';

loadHardwareCatalogues();

/** The catalogue's own ranges, read rather than retyped (CLAUDE.md F5.2). */
const UNITS = AVENTOS_CATALOGUE.power_units_hk_top;
const range = (unit) => UNITS.find((u) => u.unit === unit).pf;
const LIMITS = AVENTOS_CATALOGUE.rules.hk_limits;

// ─── the catalogue itself ───────────────────────────────────────────────────

test('the catalogue of record is read, not retyped', () => {
  const cat = aventosCatalogue();
  assert.ok(cat, 'aventos.json is loaded by the lib loader');
  assert.equal(cat.powerUnits.length, UNITS.length);
  for (const u of UNITS) {
    const mine = cat.powerUnits.find((x) => x.unit === u.unit);
    assert.deepEqual(mine.pf, u.pf, `${u.unit} carries the file's own range`);
    assert.deepEqual(mine.articles, u.articles.map(String));
  }
  assert.deepEqual(cat.limits.heightMm, LIMITS.cabinet_height_mm);
  assert.equal(cat.limits.widthMaxMm, LIMITS.cabinet_width_max_mm);
  assert.equal(cat.limits.innerDepthMinMm, LIMITS.inner_depth_min_mm);
});

test('a unit whose range cannot be read is DROPPED rather than guessed at', () => {
  const parsed = parseAventosCatalogue({
    power_units_hk_top: [
      { unit: 2300, pf: [420, 1610], articles: ['x'] },
      { unit: 9999, pf: [500] },                        // half a range
      { unit: 8888, pf: [900, 100] },                   // upside down
      { pf: [1, 2] },                                   // no unit
    ],
  });
  assert.deepEqual(parsed.powerUnits.map((u) => u.unit), [2300]);
});

test('a file that is not a catalogue at all parses to null, and nothing throws', () => {
  assert.equal(parseAventosCatalogue(null), null);
  assert.equal(parseAventosCatalogue({}), null);
  assert.equal(parseAventosCatalogue({ power_units_hk_top: [] }), null);
});

// ─── board weight, MFC vs MDF (F5.1) ────────────────────────────────────────

test('the profile carries the owner’s own board weights, MFC and lacquered MDF', () => {
  assert.equal(P.board.kgM2.mfc[18], 12);
  assert.equal(P.board.kgM2.mfc[22], 14.5);
  assert.equal(P.board.kgM2.mfc[25], 16.5);
  assert.equal(P.board.kgM2.mdf_lacquered[18], 14);
  assert.equal(P.board.kgM2.mdf_lacquered[22], 17);
  assert.equal(P.board.kgM2.mdf_lacquered[25], 19);
});

test('…and the catalogue of record carries the SAME table, so neither can drift', () => {
  // CLAUDE.md F5.1 puts these numbers in profile.js (rule 2 — a workshop tunes
  // its own boards) and aventos.json carries them because they came with the
  // lift data. Two homes for one fact is only safe if something holds them to
  // each other, and this is that something.
  const file = AVENTOS_CATALOGUE.board_kg_m2;
  for (const kind of ['mfc', 'mdf_lacquered']) {
    for (const [thickness, kg] of Object.entries(file[kind])) {
      assert.equal(P.board.kgM2[kind][thickness], kg, `${kind} ${thickness} mm`);
    }
  }
});

test('an MDF front weighs more than the MFC one beside it, at every thickness', () => {
  for (const t of [18, 22, 25]) {
    const mfc = boardKgM2({ thickness: t, kind: 'mfc', profile: P });
    const mdf = boardKgM2({ thickness: t, kind: 'mdf_lacquered', profile: P });
    assert.equal(mfc.source, 'profile');
    assert.equal(mfc.exact, true);
    assert.ok(mdf.kgM2 > mfc.kgM2, `${t} mm: lacquered MDF is the heavier board`);
  }
});

test('an ASSIGNED board wins the profile table — that is what assigning is for', () => {
  const stock = { id: 'x', thickness: 18, kg_m2: 21.5 };
  const own = boardKgM2({
    stock, thickness: 18, kind: 'mfc', profile: P,
  });
  assert.equal(own.kgM2, 21.5);
  assert.equal(own.source, 'stock');
  // …and a board with no figure on it falls back rather than weighing nothing.
  const fallback = boardKgM2({
    stock: { id: 'y', thickness: 18 }, thickness: 18, kind: 'mfc', profile: P,
  });
  assert.equal(fallback.kgM2, 12);
  assert.equal(fallback.source, 'profile');
});

test('a thickness the table has no row for takes the nearest board, and says so', () => {
  const near = boardKgM2({ thickness: 19, kind: 'mfc', profile: P });
  assert.equal(near.kgM2, 12, '19 mm is nearest the 18');
  assert.equal(near.exact, false, 'and it does not pretend to be exact');
  // A tie goes to the THICKER board: a lift proposed on a weight that is too
  // low is the failure that drops a door on somebody.
  const tie = boardKgM2({ thickness: 20, kind: 'mfc', profile: P });
  assert.equal(tie.kgM2, 14.5, '20 mm sits between 18 and 22 — the heavier wins');
});

test('a front’s weight is its area times that, in kilogrammes', () => {
  // 600 × 720 at 12 kg/m² = 0.432 m² × 12 = 5.184 kg
  assert.equal(Math.round(frontWeightKg({ widthMm: 600, heightMm: 720, kgM2: 12 }) * 1000) / 1000, 5.184);
  assert.equal(frontWeightKg({ widthMm: 0, heightMm: 720, kgM2: 12 }), null);
  assert.equal(frontWeightKg({ widthMm: 600, heightMm: 720, kgM2: 0 }), null);
});

test('a panel weighs what the board it is CUT FROM weighs (turn 16’s resolver)', () => {
  const panel = { w: 600, h: 720, thickness: 18 };
  const mfc = MOCK_MATERIALS.find((m) => m.id === 'mat_mfc18_white');
  const mdf = MOCK_MATERIALS.find((m) => m.id === 'mat_mdf18');

  const onMfc = panelWeight({
    panel, material: { material_id: mfc.id }, materials: MOCK_MATERIALS, profile: P,
  });
  const onMdf = panelWeight({
    panel, material: { material_id: mdf.id }, materials: MOCK_MATERIALS, profile: P,
  });
  assert.equal(onMfc.kgM2, 12);
  assert.equal(onMdf.kgM2, 14);
  assert.ok(onMdf.kg > onMfc.kg, 'the same door in MDF is the heavier door');

  // Nothing assigned: a SPRAYED front is lacquered MDF and everything else is
  // faced chipboard, both from profile.js.
  const sprayed = panelWeight({
    panel, material: { finish: { kind: 'spray' } }, materials: [], profile: P,
  });
  assert.equal(sprayed.kind, P.board.sprayedKgM2Kind);
  assert.equal(sprayed.kgM2, 14);
  const plain = panelWeight({
    panel, material: null, materials: [], profile: P,
  });
  assert.equal(plain.kind, P.board.defaultKgM2Kind);
  assert.equal(plain.kgM2, 12);
});

// ─── the power factor (F5.2) ────────────────────────────────────────────────

test('pf is the cabinet’s height times the front’s weight — Blum’s own formula', () => {
  assert.equal(powerFactor({ cabinetHeightMm: 400, frontWeightKg: 5 }), 2000);
  assert.equal(powerFactor({ cabinetHeightMm: 0, frontWeightKg: 5 }), null);
  assert.equal(powerFactor({ cabinetHeightMm: 400, frontWeightKg: 0 }), null);
});

/** A case that lands exactly on `pf`, given a cabinet height. */
const at = (pf, height = 400) => ({
  cabinetHeightMm: height,
  frontWeightKg: pf / height,
  cabinetWidthMm: 600,
  innerDepthMm: 300,
});

test('every range’s EDGES are inside it, and a hair outside is outside', () => {
  for (const u of UNITS) {
    const [lo, hi] = u.pf;
    const inLo = selectLiftUnit(at(lo));
    const inHi = selectLiftUnit(at(hi));
    assert.ok(inLo.proposed != null, `${u.unit}: the bottom of the range proposes something`);
    assert.ok(inHi.proposed != null, `${u.unit}: and so does the top`);
    // The unit proposed at a range's own bottom is that unit or a SMALLER one
    // whose range also holds the value — never a bigger one.
    assert.ok(inLo.proposed <= u.unit, `${u.unit}: never proposes bigger than the range asked for`);
  }
  // Under the smallest and over the biggest: nothing proposed, and a warning
  // that says which way to go.
  const smallest = UNITS[0];
  const biggest = UNITS[UNITS.length - 1];
  const tooLight = selectLiftUnit(at(smallest.pf[0] - 1));
  assert.equal(tooLight.proposed, null);
  assert.ok(tooLight.warnings.some((w) => w.code === 'PF_BELOW_RANGE'));
  const tooHeavy = selectLiftUnit(at(biggest.pf[1] + 1));
  assert.equal(tooHeavy.proposed, null);
  assert.ok(tooHeavy.warnings.some((w) => w.code === 'PF_ABOVE_RANGE'));
});

test('an OVERLAP resolves to the SMALLER unit', () => {
  // 930–1610 is held by both the 2300 and the 2500; 1730–2800 by the 2500 and
  // the 2700; 3200–5200 by the 2700 and the 2900. Every one of them is the
  // smaller unit's answer — read off the file, so a catalogue revision that
  // moved a range would move this test with it.
  const overlaps = [
    [range(2300), range(2500), 2300],
    [range(2500), range(2700), 2500],
    [range(2700), range(2900), 2700],
  ];
  for (const [lower, upper, expected] of overlaps) {
    const mid = (upper[0] + lower[1]) / 2;
    assert.ok(mid >= upper[0] && mid <= lower[1], 'the sample really is in the overlap');
    assert.equal(selectLiftUnit(at(mid)).proposed, expected, `pf ${mid} → the smaller unit`);
  }
});

test('a real cabinet: 600 × 400 in 18 mm MFC proposes a unit and no warnings', () => {
  const kg = frontWeightKg({ widthMm: 600, heightMm: 400, kgM2: 12 });
  const answer = selectLiftUnit({
    cabinetHeightMm: 400, frontWeightKg: kg, cabinetWidthMm: 600, innerDepthMm: 300,
  });
  assert.equal(answer.pf, 400 * kg);
  assert.ok(answer.proposed, 'a wall unit of this size takes an HK');
  assert.equal(answer.unit, answer.proposed, 'with nothing assigned, the proposal is fitted');
  assert.deepEqual(answer.warnings, [], 'and nothing to object to');
  assert.ok(answer.articles.length, 'the article travels with it');
});

// ─── the HK limits (F5.2) ───────────────────────────────────────────────────

test('the cabinet’s own limits are checked whatever the front weighs', () => {
  const [minH, maxH] = LIMITS.cabinet_height_mm;
  const inRange = { ...at(1000, minH), cabinetHeightMm: minH, frontWeightKg: 1000 / minH };
  assert.ok(!selectLiftUnit(inRange).warnings.some((w) => w.code === 'HK_HEIGHT'));

  const tooShort = selectLiftUnit({
    cabinetHeightMm: minH - 1, frontWeightKg: 3, cabinetWidthMm: 600, innerDepthMm: 300,
  });
  assert.ok(tooShort.warnings.some((w) => w.code === 'HK_HEIGHT'));
  const tooTall = selectLiftUnit({
    cabinetHeightMm: maxH + 1, frontWeightKg: 3, cabinetWidthMm: 600, innerDepthMm: 300,
  });
  assert.ok(tooTall.warnings.some((w) => w.code === 'HK_HEIGHT'));

  const tooWide = selectLiftUnit({
    cabinetHeightMm: 400, frontWeightKg: 3, cabinetWidthMm: LIMITS.cabinet_width_max_mm + 1, innerDepthMm: 300,
  });
  assert.ok(tooWide.warnings.some((w) => w.code === 'HK_WIDTH'));

  const tooShallow = selectLiftUnit({
    cabinetHeightMm: 400, frontWeightKg: 3, cabinetWidthMm: 600, innerDepthMm: LIMITS.inner_depth_min_mm - 1,
  });
  assert.ok(tooShallow.warnings.some((w) => w.code === 'HK_DEPTH'));
  // A warning is not a refusal: the unit is still proposed and still fitted.
  assert.ok(tooShallow.proposed, 'the maths still answers — the owner’s rule is guidance, not a gate');
});

// ─── the client's own answer (F5.3) ─────────────────────────────────────────

test('an assignment is FITTED, never refused — and objected to when it is wrong', () => {
  // A front too heavy for the 2300: the owner's own example sentence.
  const heavy = selectLiftUnit({ ...at(2500), assigned: 2300 });
  assert.equal(heavy.unit, 2300, 'the client’s answer is what gets fitted');
  assert.equal(heavy.assigned, 2300);
  assert.equal(heavy.proposed, 2500, 'and the engine still says what it would have chosen');
  const objection = heavy.warnings.find((w) => w.code === 'ASSIGNED_TOO_SMALL');
  assert.ok(objection, 'it objects');
  assert.match(objection.message, /too heavy for 2300/);
  assert.match(objection.message, /2500 fits/, 'with guidance, not just a complaint');
});

test('…and the other way round, for a front too light for the unit picked', () => {
  const light = selectLiftUnit({ ...at(range(2300)[0]), assigned: 2900 });
  assert.equal(light.unit, 2900);
  const objection = light.warnings.find((w) => w.code === 'ASSIGNED_TOO_LARGE');
  assert.ok(objection);
  assert.match(objection.message, /too light for 2900/);
});

test('an assignment INSIDE its range is fitted with nothing said', () => {
  const mid = (range(2500)[0] + range(2500)[1]) / 2;
  const answer = selectLiftUnit({ ...at(mid), assigned: 2500 });
  assert.equal(answer.unit, 2500);
  assert.deepEqual(answer.warnings, []);
});

test('a unit that is not in the catalogue is named as such rather than obeyed silently', () => {
  const answer = selectLiftUnit({ ...at(1000), assigned: 1234 });
  assert.ok(answer.warnings.some((w) => w.code === 'UNKNOWN_UNIT'));
  assert.equal(answer.assigned, null);
  assert.equal(answer.unit, answer.proposed, 'so the proposal stands');
});

// ─── degradation ────────────────────────────────────────────────────────────

test('with no catalogue read, nothing is proposed and nothing throws', (t) => {
  const saved = aventosCatalogue();
  clearAventosCatalogue();
  t.after(() => setAventosCatalogue(AVENTOS_CATALOGUE));
  assert.ok(saved, 'it was loaded before this test cleared it');

  const answer = selectLiftUnit(at(1000));
  assert.equal(answer.unit, null);
  assert.equal(answer.proposed, null);
  assert.deepEqual(answer.warnings.map((w) => w.code), ['NO_CATALOGUE']);
});

test('without a height or a weight there is no power factor, and it says so', () => {
  const answer = selectLiftUnit({ cabinetHeightMm: 400 });
  assert.equal(answer.pf, null);
  assert.ok(answer.warnings.some((w) => w.code === 'NO_POWER_FACTOR'));
});

// ─── the warning text, as the walk will show it (F6) ────────────────────────

test('the warning text is a sentence a joiner can act on', () => {
  // CLAUDE.md F6 asks for "the lift engine's warning text surfaced in a test
  // snapshot (no kit UI)". This is that snapshot, and it is the whole point of
  // the phase: turn 20 will put these words on a screen and they have to be
  // words rather than codes.
  const snapshot = [
    selectLiftUnit({ ...at(2500), assigned: 2300 }),
    selectLiftUnit(at(range(2900)[1] + 5000)),
    selectLiftUnit({
      cabinetHeightMm: 700, frontWeightKg: 4, cabinetWidthMm: 2000, innerDepthMm: 200,
    }),
  ].flatMap((a) => a.warnings.map((w) => w.message));

  for (const line of snapshot) {
    assert.equal(typeof line, 'string');
    assert.ok(line.length > 20, `a warning is a sentence: ${line}`);
    assert.ok(/[.!]$/.test(line), `…that finishes: ${line}`);
  }
  assert.ok(snapshot.some((l) => /2500 fits/.test(l)), 'guidance names the unit that would fit');
  assert.ok(snapshot.some((l) => /Lighter board/.test(l)), 'and says what to do when none does');
  assert.ok(snapshot.some((l) => /205–600 mm high/.test(l)), 'the HK height limit, in its own words');
  assert.ok(snapshot.some((l) => /up to 1800 mm wide/.test(l)));
  assert.ok(snapshot.some((l) => /at least 261 mm inner depth/.test(l)));
});
