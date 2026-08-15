// ─── F6: CHECK v1, THE PRE-PRODUCTION CONTROLLER (turn 31) ──────────────────
//
// "A Check button beside BOM/CNC, and the same list automatically before
// Export. Result = a PANEL of findings (not toasts)."
//
// Eleven rules. Five of them already existed and four of those had never been
// asked of a whole job — turn 30's shelf/hinge clash was shown in one
// cabinet's panel and nowhere else, turn 25's outline guard was shown nowhere
// at all. The other six are this turn's.
//
// Each rule below is its own test, in the owner's own numbering, so a rule that
// is not implemented is a rule that is missing rather than one that quietly
// passed.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { useProjectStore } from '../src/stores/projectStore.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import {
  CHECKS, HINGE_COUNT_TABLE, checkSummary, hingesRequired, openGapWindowMm, runChecks,
  sheetSizeMm, tallNoFixHeightMm, wideFrontMm,
} from '../src/engine/checks.js';

const store = () => useProjectStore.getState();

function project(roomHeight = 2500) {
  store().loadProject({
    id: null,
    name: 'check',
    room: migrateRoom({ height: roomHeight, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
}

const check = () => store().runChecks();
const of = (n) => check().filter((f) => f.check === n);

// ═══════════════════════════════════════════════════════════════════════════
// THE SHAPE
// ═══════════════════════════════════════════════════════════════════════════

test('eleven rules, each with the owner’s colour', () => {
  assert.equal(CHECKS.length, 11);
  assert.deepEqual(CHECKS.map((c) => c.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  // The owner's own colours, verbatim from CLAUDE.md F6.
  const colour = Object.fromEntries(CHECKS.map((c) => [c.n, c.level]));
  assert.deepEqual(colour, {
    1: 'red',
    2: 'red',
    3: 'yellow',
    4: 'red',
    5: 'yellow',
    6: 'yellow',
    7: 'red',
    8: 'yellow',
    9: 'red',
    10: 'red',
    11: 'red',
  });
  for (const c of CHECKS) assert.ok(c.label, `#${c.n} has no label`);
});

test('a clean job says so, and says nothing else', () => {
  project();
  const u = store().addUnit('BUD');
  store().updateUnitParams(u.id, { width: 600, doors: { count: 1 } });
  store().setPlinth?.(u.id);
  const found = check().filter((f) => f.level === 'red');
  assert.deepEqual(found, [], found.map((f) => `#${f.check} ${f.message}`).join('\n'));
  assert.equal(checkSummary([]), 'Nothing to fix — the job is ready to cut.');
});

test('every finding NAMES ITS SUBJECT — unit, panel, millimetres', () => {
  project();
  const u = store().addUnit('BUD');
  // A cabinet with the proven drill fault in it, so there is something to say.
  store().updateUnitParams(u.id, { width: 600, doors: { count: 1 }, hinge_rows: [100, 100, 470] });
  const found = check();
  assert.ok(found.length > 0);
  for (const f of found) {
    assert.ok(f.message, `#${f.check} said nothing`);
    assert.ok(['red', 'yellow'].includes(f.level), `#${f.check} has no colour`);
    assert.ok(Number.isInteger(f.check));
    // "Findings name their subject (unit, panel, mm)."
    assert.ok(f.unitNum || f.unitId, `#${f.check} names no cabinet: ${f.message}`);
  }
});

test('reds come first — the order a joiner works a list down in', () => {
  project();
  const u = store().addUnit('BUD');
  store().updateUnitParams(u.id, {
    width: 600, height: 1400, doors: { count: 1 }, hinge_rows: [100, 100, 470],
  });
  store().addShelves(u.id, 2);
  const found = check();
  const firstYellow = found.findIndex((f) => f.level === 'yellow');
  const lastRed = found.map((f) => f.level).lastIndexOf('red');
  if (firstYellow >= 0 && lastRed >= 0) assert.ok(lastRed < firstYellow, 'a yellow came before a red');
});

// ═══════════════════════════════════════════════════════════════════════════
// THE RULES, ONE BY ONE
// ═══════════════════════════════════════════════════════════════════════════

test('#3 a tall cabinet with shelves and none of them FIXED — yellow', () => {
  project();
  const u = store().addUnit('BUDTALL');
  store().updateUnitParams(u.id, { width: 600, height: 1400 });
  store().addShelves(u.id, 2);
  const found = of(3);
  assert.equal(found.length, 1, 'no #3 raised');
  assert.equal(found[0].level, 'yellow');
  assert.match(found[0].message, /add one fixed shelf/);
  assert.match(found[0].message, /1400 mm tall/);

  // …and a cabinet under the height is silent, whatever its shelves are.
  store().updateUnitParams(u.id, { height: 1000 });
  assert.deepEqual(of(3), []);
  assert.equal(tallNoFixHeightMm(P), 1200, 'the owner’s number');
});

test('#4 a door too heavy for its hinges, against the published Blum table', () => {
  project();
  const u = store().addUnit('BUDTALL');
  store().updateUnitParams(u.id, { width: 600, height: 2100, doors: { count: 1 } });
  // The LISP's own ladder is GENEROUS — it puts six rows on a 2100 mm door,
  // which is more than the Blum table asks for, so a kit-built cabinet is
  // silent and rightly so. The fault this rule exists for is the one a JOINER
  // makes: hinges edited by hand down to two on a door that weighs 20 kg.
  store().updateUnitParams(u.id, { hinge_rows: [100, 2000] });
  const found = of(4);
  assert.ok(found.length >= 1, 'no #4 raised for a 2100 mm door on two hinges');
  assert.equal(found[0].level, 'red');
  assert.match(found[0].message, /Blum CLIP top table asks for/);
  assert.ok(found[0].needHinges > found[0].haveHinges);
  assert.ok(found[0].weightKg > 0, 'the weight is the one the app already computes');
  // …and it flies to the DOOR at its hinges.
  assert.equal(found[0].subject.section, 'hinges');
});

test('#4 the table itself, with its SOURCE named (rule 2 of the turn)', () => {
  // CLAUDE.md F6 #4: "take the published CLIP top table; if the repo lacks it,
  // add it as a reference JSON with the source named". The repo had the ARTICLE
  // list and no count table, so this turn added one — and the honesty about
  // where the numbers came from is part of the file rather than a promise.
  assert.ok(HINGE_COUNT_TABLE._source, 'the table names no source');
  assert.equal(HINGE_COUNT_TABLE._source.publisher, 'Blum');
  assert.ok(HINGE_COUNT_TABLE._source.document);
  assert.ok(Array.isArray(HINGE_COUNT_TABLE._source._honesty));
  assert.ok(
    HINGE_COUNT_TABLE._source._honesty.join(' ').includes('TRANSCRIBED'),
    'the table does not say the numbers were transcribed',
  );

  // The bands, read the way the check reads them.
  assert.equal(hingesRequired({ heightMm: 700, weightKg: 6 }).hinges, 2);
  assert.equal(hingesRequired({ heightMm: 1400, weightKg: 11 }).hinges, 3);
  assert.equal(hingesRequired({ heightMm: 1900, weightKg: 16 }).hinges, 4);
  assert.equal(hingesRequired({ heightMm: 2300, weightKg: 22 }).hinges, 5);
  // Off the published chart, and it SAYS so rather than extrapolating.
  const off = hingesRequired({ heightMm: 2600, weightKg: 30 });
  assert.equal(off.beyondTable, true);
  assert.equal(off.band, null);
  // WEIGHT can put a short door into a taller band — the table is both.
  assert.equal(hingesRequired({ heightMm: 800, weightKg: 12 }).hinges, 3);
});

test('#4 drills NOTHING — the table is a check and never a hole (rule 2)', () => {
  const engine = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');
  assert.ok(!/cliptop-hinge-count/.test(engine));
  const checks = readFileSync(new URL('../src/engine/checks.js', import.meta.url), 'utf8');
  assert.ok(!/addDrill|drills\.push/.test(checks));
});

test('#5 an open gap of 20–80 mm above a run with no infill — yellow', () => {
  // A wall unit hung so its top finishes 40 mm under the ceiling.
  project(2500);
  const u = store().addUnit('WUD');
  store().updateUnitParams(u.id, { width: 600, height: 720, mount_height: 1740 });
  const found = of(5);
  if (found.length) {
    assert.equal(found[0].level, 'yellow');
    assert.match(found[0].message, /dust collection/);
  }
  // The window is the owner's, whatever this particular room happened to do.
  assert.deepEqual(openGapWindowMm(P), { from: 20, to: 80 });
  // 10 mm is a shadow line and 200 is a decision somebody has made: neither is
  // this rule's business.
  store().updateUnitParams(u.id, { mount_height: 1000 });
  assert.deepEqual(of(5), []);
});

test('#6 a base run standing with no plinth — yellow', () => {
  project();
  const u = store().addUnit('BUD');
  store().updateUnitParams(u.id, { width: 600, doors: { count: 1 } });
  const before = of(6);
  assert.equal(before.length, 1, 'no #6 raised for a plinth-less base unit');
  assert.equal(before[0].level, 'yellow');
  assert.match(before[0].message, /no plinth/);
  // …and once it has one, silence.
  store().addPlinth(u.id);
  assert.deepEqual(of(6), []);
});

test('#7 a panel larger than the sheet — red', () => {
  assert.deepEqual(sheetSizeMm(P), { width: 2790, height: 2060 });
  project(3200);
  const u = store().addUnit('WARDROBE');
  // A back panel taller and wider than any board.
  store().updateUnitParams(u.id, { width: 2200, height: 2900 });
  const found = of(7);
  assert.ok(found.length >= 1, 'nothing said about a panel bigger than the bed');
  assert.equal(found[0].level, 'red');
  assert.match(found[0].message, /will not fit a 2790 × 2060 sheet/);
  // A board can be TURNED on the bed, so 2000 × 2500 fits and is silent.
  assert.equal(
    runChecks({
      entries: [{
        unit: { id: 'u', type: 'BUD', params: {}, position: {} },
        result: { unitNum: '01', panels: [{ id: 'P', w: 2000, h: 2500 }], drills: [] },
      }],
      profile: P,
    }).filter((f) => f.check === 7).length,
    0,
  );
});

test('#8 a front wider than 600 at 110° — "consider 155°", yellow', () => {
  assert.equal(wideFrontMm(P), 600);
  project();
  const u = store().addUnit('BUD');
  // 700 wide is still ONE door (BLOCKERS #2: two from 705), so one 696 leaf.
  store().updateUnitParams(u.id, { width: 700, doors: { count: 1 } });
  const found = of(8);
  assert.ok(found.length >= 1, 'nothing said about a wide leaf at 110°');
  assert.equal(found[0].level, 'yellow');
  assert.match(found[0].message, /consider 155°/);
  // A narrow one is silent.
  store().updateUnitParams(u.id, { width: 500 });
  assert.deepEqual(of(8), []);
});

test('#1, #9, #10 and #11 come from the modules that own them', () => {
  project();
  const u = store().addUnit('BUD');
  store().updateUnitParams(u.id, { width: 600, doors: { count: 1 }, hinge_rows: [100, 100, 470] });
  // #10 — the drill guard (F3), asked of every cabinet rather than of none.
  const drill = of(10);
  assert.ok(drill.length >= 1, '#10 is not wired into the Check');
  assert.ok(drill.every((f) => f.level === 'red'));
  assert.ok(drill.some((f) => f.code === 'duplicate-drill'));
  // …and each names the piece it is about, so a click can fly to it.
  for (const f of drill) assert.ok(f.subject, `#10 finding with no subject: ${f.message}`);
});

test('#2 uses F4’s NEIGHBOUR measure — and since T32 fires only where auto has no move', () => {
  project();
  const a = store().addUnit('BUD');
  store().updateUnitParams(a.id, { width: 600, doors: { count: 1 } });
  const b = store().addUnit('BUD', { near: a.id, side: 'right' });
  store().updateUnitParams(b.id, { width: 600, doors: { count: 1 } });
  // A butted pair is silent…
  assert.deepEqual(of(2).filter((f) => f.level === 'red'), []);
  // ─── TURN 32 (CLAUDE.md F3): an END PANEL no longer reaches Check at all —
  // the front narrows itself on that edge the moment the panel appears, which
  // only the NEIGHBOUR measure could have decided (turn 30's front-to-front
  // measure never saw the panel). The healed trim is the proof the measure
  // ran; the empty findings list is the proof the fix is no longer a question.
  store().addEndPanel(b.id, { side: 'R' });
  assert.deepEqual(of(2).filter((f) => f.level === 'red'), [], 'the gap healed itself');
  const front = store().unitResult(b.id).panels.find((p) => p.role === 'front');
  assert.deepEqual(front.meta.edgeTrim, { left: 0, right: 1.5 });
});

// ═══════════════════════════════════════════════════════════════════════════
// THE PANEL AND THE BUTTON
// ═══════════════════════════════════════════════════════════════════════════

test('the result is a PANEL, not toasts', () => {
  const panel = readFileSync(new URL('../src/components/CheckPanel.jsx', import.meta.url), 'utf8');
  assert.match(panel, /data-check-panel=\{findings\.length\}/);
  // …and it never reaches for the message queue: a list of thirty faults
  // delivered four seconds at a time is F2's bug with more steps.
  assert.ok(!/\bnotify\(/.test(panel));
  // A ROW IS A DOOR: the F7/T30 mechanism, one implementation for all eleven.
  assert.match(panel, /const goTo = \(subject, e\) =>/);
  assert.match(panel, /selectElement\(subject\.unitId, subject\.panelId\)/);
  assert.match(panel, /openModal\(editor/);
  // …and a finding that names two ways out shows both, as turn 30's own prompt
  // did for the shelf/hinge clash.
  assert.match(panel, /data-check-alternative/);
});

test('the Check button sits beside BOM, and carries the count', () => {
  const bar = readFileSync(new URL('../src/components/CanvasToolbar.jsx', import.meta.url), 'utf8');
  assert.match(bar, /data-check-button=\{checkCount\}/);
  // BESIDE it, which means after it in the same group.
  assert.ok(bar.indexOf('BOM') < bar.indexOf('data-check-button'));
  assert.match(bar, /toggleCheck/);
});

test('…and the SAME list runs automatically before every export', () => {
  const page = readFileSync(new URL('../src/pages/ConfiguratorPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /const checkBeforeExport = useCallback/);
  // The same call the button makes — a second implementation of eleven rules
  // is eleven chances to disagree.
  assert.match(page, /const found = runChecks\(\);/);
  // The four the page owns: the cutting list, the BOM CSV (turn 32, F5), the
  // project PDF and the DXF ZIP.
  assert.equal([...page.matchAll(/checkBeforeExport\(\);/g)].length, 4, 'an export slipped past it');
  const tree = readFileSync(new URL('../src/components/CncTree.jsx', import.meta.url), 'utf8');
  assert.match(tree, /preflight\(exportAnyway\)/);
});

test('nothing in the Check blocks anything (F6, in as many words)', () => {
  const src = readFileSync(new URL('../src/engine/checks.js', import.meta.url), 'utf8');
  // It returns a list. It does not throw, refuse or repair.
  assert.ok(!/throw new Error/.test(src));
  assert.ok(!/\.push\(\{ *ok: false/.test(src));
  const page = readFileSync(new URL('../src/pages/ConfiguratorPage.jsx', import.meta.url), 'utf8');
  // The pre-flight opens the panel and says so; the export goes ahead.
  const at = page.indexOf('const checkBeforeExport');
  const body = page.slice(at, at + 900);
  assert.match(body, /setCheckOpen\(true\)/);
  assert.ok(!/return false/.test(body), 'the pre-flight blocks the export');
});

// ═══════════════════════════════════════════════════════════════════════════
// THE NUMBERS
// ═══════════════════════════════════════════════════════════════════════════

test('every threshold is a PROFILE number, and an old profile gets them all', () => {
  assert.equal(P.checks.tallNoFixHeightMm, 1200);
  assert.equal(P.checks.openGapFromMm, 20);
  assert.equal(P.checks.openGapToMm, 80);
  assert.equal(P.checks.wideFrontMm, 600);
  assert.deepEqual(P.cnc.sheet, { width: 2790, height: 2060 });
  // A workshop's own numbers are read.
  assert.equal(tallNoFixHeightMm({ checks: { tallNoFixHeightMm: 1500 } }), 1500);
  assert.deepEqual(sheetSizeMm({ cnc: { sheet: { width: 3050, height: 1220 } } }), { width: 3050, height: 1220 });
  assert.equal(wideFrontMm({}), 600);
  // …and a profile saved before Check v1 comes back with the lot. Built from a
  // RECOGNISABLE profile with the new keys removed — see the note in
  // turn31-f4-front-gaps.test.js for why a two-key object would prove nothing.
  const before = { ...P, cnc: { ...P.cnc } };
  delete before.checks;
  delete before.cnc.sheet;
  const old = migrateCabinetProfile(before);
  assert.equal(old.checks.tallNoFixHeightMm, 1200);
  assert.deepEqual(old.cnc.sheet, { width: 2790, height: 2060 });
});
