// ─── TURN 43, F7: THE RUNNER STAND-IN DIES, AND A MISSING ARTICLE SPEAKS ────
//
// The owner, 20.08.2026, after the fourth grey overlay: *"jak kod nadpisuje to
// go usuń."*
//
// ─── THE TRACE, MEASURED, END TO END ────────────────────────────────────────
//
//     overlay box 490
//       → runnerAskFor        NL 500        (the +10, the ONE place it lives)
//       → ladder rung         500           (the owner's own 250…700)
//       → the LIVE bucket     tops out at 450
//       → runnerEntry         null
//       → the grey L-profile
//
// NOTHING OVERRIDES ANYTHING. There is no second drawing path, no overlay
// branch, no hand-coded runner: the fallback wins BY SILENCE, and it has been
// winning since the day the ladder gained a rung the shop does not stock.
//
// So the fallback is deleted — globally, offline and mock and showroom
// included — and the silence is replaced by a sentence: RED per drawer where
// the catalogue is loaded and the rung has no article, ONE amber project note
// where there is no catalogue at all.
//
// Node, the registry and not the pixel — and seeded with the COMMITTED
// SNAPSHOT (iron rule 8), so this test shops where the owner shops.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import {
  clearRunnerCatalogue, ladderRungFor, runnerAskFor, runnerEntry, runnerLadder,
  runnerModelSrc, setRunnerCatalogue,
} from '../src/engine/runners.js';
import { CHECKS, runChecks, runnerRowsOf } from '../src/engine/checks.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const SHOWROOM = JSON.parse(read('test/fixtures/hardware-local/hardware/runners/blum/movento/manifest.json'));
const M = P.hardware.runner.movento;

/**
 * WHAT `3d/Hardware.jsx` DOES, expression for expression — the `wanted` memo of
 * `<Runners>`. Asserting on this is asserting on the registry the component
 * reads, which is what "the registry, not the pixel" means.
 */
const asTheViewAsks = (row, variant = M.defaultVariant) => {
  const entry = runnerEntry({
    system: M.system,
    nl: runnerAskFor(row.length, P) ?? row.length,
    variant,
    side: row.side,
    ladder: runnerLadder(P),
  });
  const url = entry ? runnerModelSrc(entry, P, 'https://showroom/') : null;
  return {
    entry,
    url,
    model: Boolean(url),
    // The `reason` string `reportHardware` publishes, unchanged by this turn.
    reason: url ? null : 'no-url',
  };
};

/** A wardrobe with an OVERLAY stack on the outside of it — the owner's case. */
const overlayUnit = (over = {}) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P),
  unit_num: '01',
  width: 900,
  height: 2150,
  sections: [{ items: [1, 2, 3].map((i) => ({ id: `o${i}`, kind: 'overlay_drawer', height_mm: 200 })) }],
  ...over,
}, P);

const entryOf = (unit, result) => ({ unit, result });
const unitOf = (id, type, params) => ({
  id, type, params: { ...defaultParamsFor(type, P), unit_num: id, ...params }, position: { wall: 0, x_mm: 0, rotation_deg: 0 },
});

const reds = (findings) => findings.filter((f) => f.check === 18 && f.level === 'red');
const ambers = (findings) => findings.filter((f) => f.check === 18 && f.level === 'yellow');

test.afterEach(() => clearRunnerCatalogue());

// ═══ 1. THE OVERLAY WARDROBE: NOTHING MOUNTS, AND THE CHECK SAYS WHY ═══════

test('F7 — box 490 asks NL500, the snapshot stops at 450, and ZERO models mount', () => {
  setRunnerCatalogue(SHOWROOM);
  const result = overlayUnit();
  const rows = hardwareInstances(result, P).runners;
  assert.ok(rows.length > 0, 'the stack has runners at all');
  assert.equal(rows[0].length, 490, 'the overlay stack runs the BUDR depth law and lands on 490');
  assert.equal(runnerAskFor(490, P), 500, 'the nominal a workshop orders against it');
  assert.equal(ladderRungFor(500, P), 500, 'and the rung it lands on');
  assert.equal(Math.max(...SHOWROOM.files.map((f) => f.nl)), 450, 'the shop stops at 450');

  const mounted = rows.map((r) => asTheViewAsks(r));
  assert.equal(mounted.filter((m) => m.model).length, 0, 'not one model is mounted');
  for (const m of mounted) assert.equal(m.reason, 'no-url', 'and the walk reports it as no-url');
});

test('F7 — the RED check names the NL and the variant, per drawer', () => {
  setRunnerCatalogue(SHOWROOM);
  const unit = unitOf('01', 'WARDROBE', {
    width: 900,
    height: 2150,
    sections: [{ items: [1, 2, 3].map((i) => ({ id: `o${i}`, kind: 'overlay_drawer', height_mm: 200 })) }],
  });
  const result = computeCabinet({ ...unit.params }, P);
  const found = runChecks({ entries: [entryOf(unit, result)], profile: P });
  const red = reds(found);

  assert.equal(red.length, runnerRowsOf(result).length, 'one red per DRAWER, not one per unit and not one per panel');
  for (const f of red) {
    assert.match(f.message, /Runner NL500 \(T\): no article in catalogue — upload the model or adjust the ladder\./,
      'the sentence CLAUDE.md wrote, verbatim, behind the unit and drawer it is about');
    assert.equal(f.runnerNl, 500);
    assert.equal(f.runnerVariant, 'T');
    assert.equal(f.unitId, unit.id, 'and it flies to the cabinet');
  }
  assert.equal(ambers(found).length, 0, 'a LOADED catalogue is never the amber note');
  assert.ok(CHECKS.find((c) => c.n === 18 && c.level === 'red'), 'the rule is in the list, in red');
});

// ═══ 2. GIVE THE SHOP THE ARTICLE AND EVERYTHING CLEARS ═══════════════════

test('F7 — ONE injected 500/T row mounts the model and clears the red', () => {
  // TEST SCOPE ONLY. The committed snapshot is NOT edited (iron rule 8): this
  // is `setRunnerCatalogue` in this process, which is exactly what
  // `lib/runnerCatalogue.js` will do the moment the owner's upload lands.
  setRunnerCatalogue({
    ...SHOWROOM,
    files: [
      ...SHOWROOM.files,
      {
        file: 'hardware/runners/blum/movento/760H5000T_99999999.glb', nl: 500, variant: 'T', article: '99999999',
      },
    ],
  });

  const unit = unitOf('01', 'WARDROBE', {
    width: 900,
    height: 2150,
    sections: [{ items: [1, 2, 3].map((i) => ({ id: `o${i}`, kind: 'overlay_drawer', height_mm: 200 })) }],
  });
  const result = computeCabinet({ ...unit.params }, P);

  const mounted = hardwareInstances(result, P).runners.map((r) => asTheViewAsks(r));
  assert.equal(mounted.filter((m) => m.model).length, mounted.length, 'every row mounts a model');
  for (const m of mounted) {
    assert.equal(m.entry.article, '99999999', 'and it is the article that just arrived');
    assert.match(m.url, /760H5000T_99999999\.glb$/, 'at the URL the app composes for it');
  }

  assert.equal(reds(runChecks({ entries: [entryOf(unit, result)], profile: P })).length, 0,
    'the red clears the moment the article exists — nothing else had to change');
});

// ═══ 3. NO CATALOGUE AT ALL: ONE AMBER, NEVER A RED WALL ══════════════════

test('F7 — no catalogue is ONE amber project note and ZERO reds', () => {
  clearRunnerCatalogue();
  const unit = unitOf('01', 'WARDROBE', {
    width: 900,
    height: 2150,
    sections: [{ items: [1, 2, 3].map((i) => ({ id: `o${i}`, kind: 'overlay_drawer', height_mm: 200 })) }],
  });
  const other = unitOf('02', 'BUDR', {});
  const found = runChecks({
    entries: [
      entryOf(unit, computeCabinet({ ...unit.params }, P)),
      entryOf(other, computeCabinet({ ...other.params }, P)),
    ],
    profile: P,
  });
  assert.equal(reds(found).length, 0, 'a dead network is not a fault in the job');
  const amber = ambers(found);
  assert.equal(amber.length, 1, 'ONE note for the whole project, however many drawers it has');
  assert.equal(amber[0].message, 'hardware catalogue unreachable — runners not verified');
  assert.equal(amber[0].unitId, null, 'it belongs to the project, not to a cabinet');
  assert.equal(amber[0].subject, null, 'and it offers no flight, because there is nowhere to fly');
});

test('F7 — …and a project with no drawers at all says nothing, catalogue or not', () => {
  clearRunnerCatalogue();
  const unit = unitOf('01', 'BUD', { plinth: true });
  const found = runChecks({ entries: [entryOf(unit, computeCabinet({ ...unit.params }, P))], profile: P });
  assert.equal(found.filter((f) => f.check === 18).length, 0,
    'there is nothing to verify, so there is nothing to say');
});

// ═══ 4. THE CHANNEL IS INTACT — A FALLBACK WAS REMOVED, NOT A PATH ════════

test('F7 — a drawer whose rung the SNAPSHOT carries mounts exactly as before', () => {
  setRunnerCatalogue(SHOWROOM);
  // NL450 is in the owner's own bucket — in variant S, and in S only, which is
  // a fact about his shop that an invented showroom used to hide.
  const stocked = SHOWROOM.files.filter((f) => f.nl === 450);
  assert.ok(stocked.length, 'the snapshot really does carry NL450');
  assert.deepEqual([...new Set(stocked.map((f) => f.variant))], ['S'], 'in S, and only in S');

  const result = computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: '02', depth: 508 }, P);
  const rows = hardwareInstances(result, P).runners;
  assert.equal(rows[0].length, 440, 'a 508 deep BUDR cuts a 440 box');
  const mounted = rows.map((r) => asTheViewAsks(r, 'S'));
  assert.equal(mounted.filter((m) => m.model).length, mounted.length, 'and every one of them mounts');
  for (const m of mounted) assert.equal(m.entry.nl, 450, 'on the rung the shop stocks');
});

// ═══ 5. THE DELETION ITSELF, AND WHAT SURVIVED IT ═════════════════════════

test('F7 — the stand-in is GONE from `3d/Hardware.jsx`, and `reportHardware` is not', () => {
  const hw = read('src/3d/Hardware.jsx');
  const at = hw.indexOf('function Runners({');
  const block = hw.slice(at, hw.indexOf('\nfunction ', at + 10));

  // The four things iron rule 3 names, by name.
  assert.ok(!/const plain = useMemo/.test(block), 'the `plain` list');
  assert.ok(!/const placeFace/.test(block), 'placeFace');
  assert.ok(!/const placeFlange/.test(block), 'placeFlange');
  assert.ok(!/<Pieces/.test(block), 'and BOTH <Pieces> blocks');
  assert.ok(!/boxGeometry/.test(block), 'no geometry of our own is left in the runner at all');

  // What stays, byte for byte: the report, and its two reason strings.
  assert.match(block, /reportHardware\(surface, 'runner', wanted\.map\(\(w, i\) => \(\{/);
  assert.match(block, /reason: models\[i\] \? null : \(w\.url \? 'no-model' : 'no-url'\),/);
  assert.match(block, /parent: 'drawer',/);
  // …and the model path, which is the only thing that draws a runner now.
  assert.match(block, /<primitive/);
  assert.match(block, /<SlideOut key=\{`d\$\{drawer\}`\} distance=\{slideOf\(drawer\)\}>/);
});

test('F7 — the deletion is GLOBAL: no mode anywhere keeps a grey runner', () => {
  // The owner's order was not conditional and neither is the code: there is no
  // offline branch, no mock branch and no showroom branch left to hide one in.
  const hw = read('src/3d/Hardware.jsx');
  const at = hw.indexOf('function Runners({');
  const block = hw.slice(at, hw.indexOf('\nfunction ', at + 10));
  assert.ok(!/mock|offline|fallback/i.test(block.replace(/^\s*(\/\/|\*).*$/gm, '')),
    'no mode is special-cased in the runner');
});
