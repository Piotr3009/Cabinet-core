// ─── T75 F22 · PRODUCTION READINESS, ON EVERY LINE ──────────────────────────
//
// CLAUDE.md T75 F22: *"`engine/readiness.js`, pure: `readinessOf(part |
// hardwareLine)` returns `'cut'` ..., `'geometry'` ..., `'bought'` ..., or
// `'manual'` ... it writes nothing into the panel records, so every golden
// dump is byte-identical by construction. The cut list, the BOM and the CNC
// export show the state on every line; the CNC export carries a banner
// counting the lines that are not `'cut'`; the Check lists them by unit. The
// T71 drawing set prints the state in the parts card."*
//
// PROBE (main before F22): no line anywhere carried a state; the parts that
// already said `meta.readiness` (the blind blank, the corner post, the notch's
// box-out, the pelmet, the hob's dummy front) and the worktop's cut-outs and
// joint said it to nobody.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  READINESS_LABELS, READINESS_STATES, notCutParts, readinessBanner, readinessCheckMessage, readinessOf,
} from '../src/engine/readiness.js';
import { buildBom } from '../src/engine/bom.js';
import { CHECKS, runChecks } from '../src/engine/checks.js';
import { cutRows, buildCutList, cutListPages } from '../src/engine/drawings/setPaper.js';
import { exportReadiness, readinessNote } from '../src/lib/cncExport.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { shippedSet } from '../src/engine/sets.js';
import { confirmDrawerBox } from './drawer-box-gate.js';

const kit = (t, extra = {}) => computeCabinet({ ...defaultParamsFor(t, P), type: t, ...extra }, P);
const unitOf = (t) => ({ id: `u-${t}`, type: t, params: defaultParamsFor(t, P), position: { wall: 0, x_mm: 0, rotation_deg: 0 } });

test('the four states and their words', () => {
  assert.deepEqual(READINESS_STATES, ['cut', 'geometry', 'manual', 'bought']);
  assert.deepEqual(READINESS_LABELS, {
    cut: 'Cut', geometry: 'Outline only', manual: 'Fit on site', bought: 'Bought',
  });
});

test('readinessOf: order lines are bought; a part says its own state; a manual hole makes it manual; the side map; else cut', () => {
  assert.equal(readinessOf({ role: 'hinge', label: 'Hinge', qty: 4, unit: 'pcs' }), 'bought');
  assert.equal(readinessOf({ hardwareKit: { role: 'pullout' } }), 'bought');
  assert.equal(readinessOf({ id: 'BLANK', part: 'BLIND-BLANK', cnc: {}, meta: { readiness: 'geometry' } }), 'geometry');
  assert.equal(readinessOf({ id: 'WT', readiness: 'bought', w: 1, part: 'WORKTOP' }), 'bought');
  assert.equal(readinessOf({ id: 'SIDE', part: 'BUL', cnc: {} }, {
    drills: [{ panel: 'SIDE', meta: { readiness: 'manual' } }],
  }), 'manual');
  assert.equal(readinessOf({ id: 'LATTICE-H1-1', part: 'LATTICE-H', cnc: {} }), 'geometry');
  assert.equal(readinessOf({ id: 'x', part: 'NOTE', material_role: 'note' }), 'manual');
  assert.equal(readinessOf({ id: 'BUL', part: 'BUL', cnc: {} }), 'cut');
  assert.equal(readinessOf(null), null);
});

test('the kits as the probe found them: a BUD is all cut; the blank, the dummy hob front and the lattice are outlines', () => {
  assert.deepEqual(notCutParts(kit('BUD')), []);
  assert.deepEqual(notCutParts(kit('WARDROBE')), []);
  // AMENDED BY T78 F10 (12.10.2026): the blind kit's own CORNER-POST (the
  // owner's 40 strip, front material) is a part of the kit from the moment it
  // is placed, an outline like the blank.
  assert.deepEqual(notCutParts(kit('BLIND_BASE')).map((r) => [r.part, r.state]), [['BLIND-BLANK', 'geometry'], ['CORNER-POST', 'geometry']]);
  assert.deepEqual(notCutParts(kit('BUDR_HOB')).map((r) => [r.part, r.state]), [['FALSE-FRONT', 'geometry']]);
  const wine = notCutParts(kit('WINE'));
  assert.ok(wine.length > 0 && wine.every((r) => r.state === 'geometry' && /^LATTICE-/.test(r.part)));
});

test('it WRITES NOTHING: the panel records are the same objects, byte for byte, after reading', () => {
  const r = kit('BLIND_BASE');
  const before = JSON.stringify(r.panels);
  notCutParts(r);
  for (const p of r.panels) readinessOf(p, { drills: r.drills });
  assert.equal(JSON.stringify(r.panels), before);
});

test('THE CUT LIST and THE BOM: every cut row carries its state; a hardware line is bought', () => {
  const bom = buildBom([{ unit: unitOf('BLIND_BASE'), result: kit('BLIND_BASE') }], { profile: P });
  const rows = bom.units[0].rows;
  assert.ok(rows.every((r) => READINESS_STATES.includes(r.readiness)), 'every line has a state');
  assert.equal(rows.find((r) => r.part === 'BLIND-BLANK').readiness, 'geometry');
  assert.equal(rows.find((r) => r.part === 'BUL').readiness, 'cut');
  assert.ok(bom.hardware.length > 0);
  assert.ok(bom.hardware.every((h) => h.readiness === 'bought'));
});

test('THE CHECK (#30, yellow) lists them by unit, like parts counted', () => {
  assert.deepEqual(CHECKS.find((c) => c.n === 30), { n: 30, level: 'yellow', label: 'Parts the machine does not finish' });
  const entries = [
    { unit: unitOf('BUD'), result: kit('BUD') },
    { unit: unitOf('WINE'), result: kit('WINE') },
  ];
  const found = runChecks({ entries, profile: P }).filter((f) => f.check === 30);
  assert.equal(found.length, 1, 'the BUD says nothing');
  assert.equal(found[0].level, 'yellow');
  assert.equal(found[0].unitId, 'u-WINE');
  assert.match(found[0].message, /^Not fully machined, the joiner's to finish: \S+: LATTICE-V x\d+ \(outline only\), LATTICE-H x\d+ \(outline only\)\.$/);
  assert.equal(readinessCheckMessage([]), null);
});

test('THE CHECK names the worktop\'s joint and cut-outs under WT, where there is a room', () => {
  const store = () => useProjectStore.getState();
  store().loadProject({
    id: null, name: 'f22', room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }), design: {},
  }, []);
  confirmDrawerBox();
  store().insertSet(shippedSet('set-vanity'));
  const wt = store().runChecks().filter((f) => f.check === 30 && f.unitNum === 'WT');
  assert.equal(wt.length, 1);
  assert.match(wt[0].message, /WT: sink cut-out over \S+ \(fit on site\)/);
});

test('THE CNC EXPORT carries a banner counting the lines that are not cut, and the ZIP a file saying which', () => {
  const r = kit('WINE');
  const ready = exportReadiness(r.panels, r.drills);
  assert.equal(ready.lines.length, r.panels.length, 'a state on every line');
  const n = notCutParts(r).length;
  assert.equal(ready.count, n);
  assert.equal(ready.banner, `${n} parts are not fully machined: ${n} outline only (no holes).`);
  const note = readinessNote('WR01', ready);
  assert.match(note, /^WR01: \d+ parts are not fully machined/);
  assert.match(note, /LATTICE-H1-1: Outline only/);
  assert.equal(readinessNote('01', exportReadiness(kit('BUD').panels, [])), null, 'all cut: no file');
  assert.deepEqual(readinessBanner([{ state: 'cut' }]), { count: 0, byState: { geometry: 0, manual: 0 }, banner: null });
  assert.equal(readinessBanner([{ state: 'manual' }]).banner, '1 part is not fully machined: 1 to fit on site.');
});

test('THE T71 DRAWING SET prints the state on every line of the parts card', () => {
  const result = kit('BLIND_BASE');
  const rows = cutRows(result);
  const all = [...rows.carcass, ...rows.fronts];
  assert.ok(all.every((r) => READINESS_STATES.includes(r.state)));
  assert.equal(all.find((r) => r.part === 'BLIND-BLANK').state, 'geometry');
  const zones = { box: { x: 0, y: 0, w: 400, h: 280 } };
  const entries = [{ unit: unitOf('BLIND_BASE'), result }];
  const ents = buildCutList(zones, { entries, page: cutListPages(zones, entries)[0] });
  const words = ents.filter((e) => e.text).map((e) => e.text);
  // AMENDED BY T78 F10: two outlines on a blind kit, the blank and the corner post.
  assert.equal(words.filter((t) => t === 'OUTLINE').length, 2);
  assert.equal(words.filter((t) => t === 'CNC').length, all.length - 2);
});
