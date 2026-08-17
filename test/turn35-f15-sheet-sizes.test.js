// ─── TURN 35, CLAUDE.md F15: SHEET SIZES, A LIST PER FAMILY ────────────────
//
// The owner, 16.08.2026: *"musimy wpisywać wymiary w setup produkcyjne płyt —
// jak mamy bok 2600 a maksymalna płyta 2400, to niech nie pozwoli"*, and the
// list itself: *"z listy wybór — Jumbo 2070 × 2800, Standard 1220 × 2440, 10
// foot 1020 × 3050, i Other, i tu wpisujemy sami. To musi być w carcases I
// fronty."*
//
// TWO sheets, because a workshop does not buy its carcass board and its front
// board off the same rack. Check #7 then measures every panel against ITS OWN
// family's board and says, in red, what to do about one that will not go.
//
// NO AUTO-SPLITTING. The rule reports, exactly as it did before and exactly as
// every other rule in this file does: "the decision is the owner's; the
// program only refuses loudly."
//
// `profile.cnc.sheet` (2790 × 2060, turn 31) is untouched and is the FALLBACK
// under both, so a shop that never opens the new panel is checked against the
// same board it has been checked against since turn 31. `profile.bom.sheet`
// (2800 × 2070) is a DIFFERENT thing — the PURCHASE sheet — and stays where it
// is; turn 32's invoice test asserts the two must differ.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile,
} from '../src/engine/profile.js';
import {
  runChecks, sheetFamilyOfPanel, sheetOptionIdFor, sheetSizeForFamily, sheetSizeMm,
} from '../src/engine/checks.js';
import { groupOfPanel } from '../src/engine/cnc/groups.js';

/** One unit's worth of panels, run through the checker, #7 only. */
const seven = (panels, profile = P) => runChecks({
  entries: [{
    unit: { id: 'u', type: 'WARDROBE', params: {}, position: {} },
    result: { unitNum: '01', panels, drills: [] },
  }],
  profile,
}).filter((f) => f.check === 7);

/** A profile with one or both family sheets set. */
const withSheets = (over) => migrateCabinetProfile({ ...P, cnc: { ...P.cnc, ...over } });

const side = (w, h) => ({ id: 'BUL', part: 'BUL', role: 'side', w, h });
const front = (w, h) => ({ id: 'FRONT', part: 'FRONT', role: 'front', w, h });

// ═══════════════════════════════════════════════════════════════════════════
// THE LIST — the owner's four, in his own words
// ═══════════════════════════════════════════════════════════════════════════

test('the four options are the owner\'s, letter for letter', () => {
  assert.deepEqual(P.cnc.sheetOptions.map((o) => o.label), [
    'Jumbo 2070 × 2800',
    'Standard 1220 × 2440',
    '10 ft 1020 × 3050',
    'Other…',
  ]);
  const by = Object.fromEntries(P.cnc.sheetOptions.map((o) => [o.id, o]));
  assert.deepEqual([by.jumbo.width, by.jumbo.height], [2070, 2800], 'his "207" read as 2070 — the Egger XL');
  assert.deepEqual([by.standard.width, by.standard.height], [1220, 2440]);
  assert.deepEqual([by.tenfoot.width, by.tenfoot.height], [1020, 3050]);
  assert.equal(by.other.width, null, 'Other carries no size of its own — the fields do');
  assert.equal(by.other.height, null);
});

test('the two family sheets open on SILENCE, which is the turn-31 board', () => {
  assert.deepEqual(P.cnc.sheetCarcass, { width: null, height: null });
  assert.deepEqual(P.cnc.sheetFronts, { width: null, height: null });
  // …so nothing that has never opened the panel is checked against anything new.
  assert.deepEqual(sheetSizeMm(P), { width: 2790, height: 2060 });
  assert.deepEqual(sheetSizeForFamily(P, 'carcasses'), { width: 2790, height: 2060 });
  assert.deepEqual(sheetSizeForFamily(P, 'fronts'), { width: 2790, height: 2060 });
  // The PURCHASE sheet is a different thing and did not move (turn 32, F5).
  assert.deepEqual(P.bom.sheet, { width: 2800, height: 2070 });
  assert.notDeepEqual(P.bom.sheet, P.cnc.sheet);
});

test('an old profile gains all three keys, and the LIST comes from the code', () => {
  const before = { ...P, cnc: { ...P.cnc } };
  delete before.cnc.sheetCarcass;
  delete before.cnc.sheetFronts;
  delete before.cnc.sheetOptions;
  const old = migrateCabinetProfile(before);
  assert.deepEqual(old.cnc.sheetCarcass, { width: null, height: null });
  assert.deepEqual(old.cnc.sheetFronts, { width: null, height: null });
  assert.deepEqual(old.cnc.sheetOptions, P.cnc.sheetOptions);
  assert.deepEqual(old.cnc.sheet, { width: 2790, height: 2060 }, 'and turn 31\'s board came through');

  // THE FORM IS THE APP'S, THE VALUES ARE THE WORKSHOP'S (T35-F7's law): a
  // stored list cannot hide a format the code now offers.
  const stale = migrateCabinetProfile({
    ...P,
    cnc: { ...P.cnc, sheetOptions: [{ id: 'jumbo', label: 'Jumbo', width: 2070, height: 2800 }] },
  });
  assert.deepEqual(stale.cnc.sheetOptions, P.cnc.sheetOptions, 'the code\'s list wins');
  // …but a workshop's VALUE is kept.
  const kept = withSheets({ sheetCarcass: { width: 1220, height: 2440 } });
  assert.deepEqual(sheetSizeForFamily(kept, 'carcasses'), { width: 1220, height: 2440 });
});

test('Other… round-trips: any typed pair comes back exactly, and is "other"', () => {
  const typed = withSheets({
    sheetCarcass: { width: 2440, height: 1830 },
    sheetFronts: { width: 3050, height: 1300 },
  });
  assert.deepEqual(sheetSizeForFamily(typed, 'carcasses'), { width: 2440, height: 1830 });
  assert.deepEqual(sheetSizeForFamily(typed, 'fronts'), { width: 3050, height: 1300 });
  assert.equal(sheetOptionIdFor(typed, 'carcasses'), 'other');
  assert.equal(sheetOptionIdFor(typed, 'fronts'), 'other');
  // …through a save and a reload.
  const reloaded = migrateCabinetProfile(JSON.parse(JSON.stringify(typed)));
  assert.deepEqual(sheetSizeForFamily(reloaded, 'carcasses'), { width: 2440, height: 1830 });
  assert.deepEqual(sheetSizeForFamily(reloaded, 'fronts'), { width: 3050, height: 1300 });

  // A LISTED size lights its own button rather than "other" — the button is
  // DERIVED from the size, so the two can never drift.
  const listed = withSheets({
    sheetCarcass: { width: 1220, height: 2440 },
    sheetFronts: { width: 2070, height: 2800 },
  });
  assert.equal(sheetOptionIdFor(listed, 'carcasses'), 'standard');
  assert.equal(sheetOptionIdFor(listed, 'fronts'), 'jumbo');
  // Silence resolves to the shop's own 2790 × 2060, which is no listed format
  // and is honestly "other" — which is what the two number fields are for.
  assert.equal(sheetOptionIdFor(P, 'carcasses'), 'other');

  // Half a sheet size is not a sheet: a width with no height falls back whole
  // rather than borrowing the other number from somewhere else.
  const half = withSheets({ sheetCarcass: { width: 2400, height: null } });
  assert.deepEqual(sheetSizeForFamily(half, 'carcasses'), { width: 2790, height: 2060 });
});

// ═══════════════════════════════════════════════════════════════════════════
// WHICH FAMILY A PART IS IN — the export's own decider, not a second one
// ═══════════════════════════════════════════════════════════════════════════

test('the family is read off the ROLE, by cnc/groups.js and nothing else', () => {
  for (const role of ['front', 'end_panel', 'mask']) {
    assert.equal(sheetFamilyOfPanel({ role }), 'fronts', role);
    assert.equal(groupOfPanel({ role }), 'fronts', 'and the export agrees');
  }
  // Everything else is board that lives inside a carcass — shelves, infills
  // and plinths included: they are cut from the carcass rack.
  for (const role of ['side', 'top', 'bottom', 'back', 'shelf', 'infill', 'plinth', undefined]) {
    assert.equal(sheetFamilyOfPanel({ role }), 'carcasses', String(role));
  }
  // Never on the id string: "RAIL-PART" is a shelf and belongs to carcasses.
  assert.equal(sheetFamilyOfPanel({ id: 'FRONT-LOOKING-NAME', role: 'shelf' }), 'carcasses');
});

// ═══════════════════════════════════════════════════════════════════════════
// CHECK #7 — the gate, per family, and the way out
// ═══════════════════════════════════════════════════════════════════════════

test('THE OWNER\'S CASE: a 2600 side vs a 2400 CARCASS sheet fires — even with Jumbo fronts', () => {
  const profile = withSheets({
    sheetCarcass: { width: 1220, height: 2400 },
    sheetFronts: { width: 2070, height: 2800 },
  });
  const found = seven([side(600, 2600), front(600, 2600)], profile);
  assert.equal(found.length, 1, 'the SIDE, and only the side');
  assert.equal(found[0].level, 'red');
  assert.equal(found[0].panelId, 'BUL');
  assert.equal(found[0].sheetFamily, 'carcasses');
  // The way out, in the spec's own words.
  assert.ok(
    found[0].message.includes('side 2600 > sheet 2400 — split the wardrobe or add a Top box.'),
    `the message does not name the way out: ${found[0].message}`,
  );
  assert.equal(found[0].overMm, 2600);
  assert.equal(found[0].limitMm, 2400);
  // NO AUTO-SPLITTING: the rule returns a list and moves nothing.
  assert.equal(typeof found[0].subject, 'object');

  // …and the FRONT is silent because ITS OWN board is 2800 long. That is the
  // whole feature: one job, two racks.
  assert.deepEqual(seven([front(600, 2600)], profile), []);
});

test('…and the other way round: a big FRONT against a small fronts sheet', () => {
  const profile = withSheets({
    sheetCarcass: { width: 2070, height: 2800 },
    sheetFronts: { width: 1220, height: 2400 },
  });
  const found = seven([side(600, 2600), front(600, 2600)], profile);
  assert.equal(found.length, 1);
  assert.equal(found[0].panelId, 'FRONT');
  assert.equal(found[0].sheetFamily, 'fronts');
  assert.ok(found[0].message.includes('front 2600 > sheet 2400'), found[0].message);
  assert.ok(found[0].message.includes('split the wardrobe or add a Top box.'));
});

test('a board can still be TURNED on the bed, and both edges are measured', () => {
  const profile = withSheets({ sheetCarcass: { width: 1220, height: 2440 } });
  // 2400 × 1200 fits a 1220 × 2440 board turned over. Silence.
  assert.deepEqual(seven([side(2400, 1200)], profile), []);
  // …but 1300 across it does not, and the SHORT edge is what is named.
  const wide = seven([side(2400, 1300)], profile);
  assert.equal(wide.length, 1);
  assert.equal(wide[0].limitMm, 1220);
  assert.equal(wide[0].overMm, 1300);
  assert.ok(wide[0].message.includes('side 1300 > sheet 1220'), wide[0].message);
});

test('a workshop that has said NOTHING is checked exactly as turn 31 checked it', () => {
  // Both families fall back to `cnc.sheet`, so this is the old rule verbatim.
  const found = seven([side(2200, 2900), front(2200, 2900)], P);
  assert.equal(found.length, 2, 'both parts, one board');
  for (const f of found) {
    assert.match(f.message, /will not fit a 2790 × 2060 sheet/, 'turn 31\'s own sentence');
    assert.deepEqual(f.sheetMm, { width: 2790, height: 2060 });
  }
  // …and the shop's own single board still overrides both, as it always did.
  const legacy = withSheets({ sheet: { width: 3050, height: 1220 } });
  assert.deepEqual(sheetSizeMm(legacy), { width: 3050, height: 1220 });
  assert.deepEqual(sheetSizeForFamily(legacy, 'fronts'), { width: 3050, height: 1220 });
});

// ═══════════════════════════════════════════════════════════════════════════
// THE PANEL
// ═══════════════════════════════════════════════════════════════════════════

test('Settings gains a "sheet" section after thickness, in the house style', () => {
  const src = readFileSync(new URL('../src/components/SettingsPanel.jsx', import.meta.url), 'utf8');
  const at = src.indexOf('data-settings-section="sheet"');
  assert.ok(at > 0, 'the section is not in the panel');
  assert.ok(src.indexOf('data-settings-section="thickness"') < at, 'it goes after thickness');
  assert.ok(at < src.indexOf('data-settings-section="door-style"'), 'and before the door styles');

  // TWO selectors, one per family, both driven by the profile's own list.
  assert.match(src, /family="carcasses"/);
  assert.match(src, /family="fronts"/);
  assert.match(src, /sheetCarcass: size/);
  assert.match(src, /sheetFronts: size/);

  // Buttons, `aria-pressed`, gold when chosen — never a dropdown and never a
  // radio, because this panel has neither and this row did not add the first.
  const row = src.slice(src.indexOf('function SheetSizeRow'));
  assert.match(row, /data-sheet-option=\{o\.id\}/);
  assert.match(row, /aria-pressed=\{chosen === o\.id\}/);
  assert.match(row, /border-gold text-gold/);
  // …and Other… is the two number fields, exactly as the owner asked.
  assert.match(row, /data-sheet-width=\{family\}/);
  assert.match(row, /data-sheet-height=\{family\}/);
  const rowOnly = row.slice(0, row.indexOf('\n}\n') + 1);
  assert.ok(!/<select/i.test(rowOnly) && !/type="radio"/.test(rowOnly), 'no dropdown, no radio');
});
