// ─── T78 F19 · DOWELS 6 MM, EVERY 250, MINIMUM TWO: THE OWNER'S RULE ─────────
//
// The owner, 11.10.2026: *"minimum 2 a kołki co mniej więcej co 250 mm"*,
// dowels 6 mm. CLAUDE.md T78 F19: *"the dowels are set out at `endOffset` from
// each end and then every `pitch`, never fewer than two, the pitch stretched
// evenly so the last one lands at `endOffset` from the far end."*
//
// LISP FIRST: reference/lisp/SKYLON_JOINTS_DOWEL.lsp sections A and B carry
// the numbers and the rule (T78 amendment at its top), section H its NUMBERS
// recomputed by hand; src/engine/dowels.js mirrors them routine for routine,
// `dowel-positions` as `dowelPositions` with the same five arguments
// (L, e, p, nMin, dia). T75's `maxGapMm` is no longer part of the rule and is
// gone from the LISP, the engine and (f19-profile-dowel.patch) the profile.
//
// The rule, for a joint of length L, end offset e, pitch p, minimum nMin,
// diameter dia:
//   S = L - 2e;  S < dia: one dowel at L / 2 (the two ends would meet);
//   n = max(nMin, 1 + ceil(S / p));  t(i) = e + i * S / (n - 1), i = 0 .. n - 1.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as Dw from '../src/engine/dowels.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P0, migrateCabinetProfile } from '../src/engine/profile.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');

// The owner's numbers, as the LISP's section A prints them.
const OWNER = {
  diaMm: 6, edgeDepthMm: 20, faceDepthMm: 12, pitchMm: 250, minPerJoint: 2, endOffsetMm: 50, confirmed: false,
};
const E = 50;
const PITCH = 250;
const NMIN = 2;
const DIA = 6;

// ═══ THE SIX STATIONS ═══════════════════════════════════════════════════════
//
// L     S     S / p   n  gap      offsets
// 300   200   0.8     2  200      50 250
// 400   300   1.2     3  150      50 200 350
// 600   500   2.0     3  250      50 300 550
// 770   670   2.68    4  223.33   50 273.33 496.67 720
// 1000  900   3.6     5  225      50 275 500 725 950
// 2000  1900  7.6     9  237.5    50 287.5 525 762.5 1000 1237.5 1475 1712.5 1950
const STATIONS = [
  { L: 300, n: 2, gap: 200, offs: [50, 250] },
  { L: 400, n: 3, gap: 150, offs: [50, 200, 350] },
  { L: 600, n: 3, gap: 250, offs: [50, 300, 550] },
  { L: 770, n: 4, gap: 670 / 3, offs: [50, 273.33, 496.67, 720] },
  { L: 1000, n: 5, gap: 225, offs: [50, 275, 500, 725, 950] },
  { L: 2000, n: 9, gap: 237.5, offs: [50, 287.5, 525, 762.5, 1000, 1237.5, 1475, 1712.5, 1950] },
];

for (const st of STATIONS) {
  test(`F19 · station L = ${st.L}: ${st.n} dowels, first 50, last ${st.L - 50}, gap ${Math.round(st.gap * 100) / 100}`, () => {
    const o = Dw.dowelPositions(st.L, E, PITCH, NMIN, DIA);
    assert.equal(o.length, st.n, 'count');
    assert.ok(o.length >= 2, 'never fewer than two');
    assert.equal(o[0], E, 'the first stands at the end offset');
    assert.equal(o[o.length - 1], st.L - E, 'the last lands exactly at the end offset from the far end');
    for (let i = 0; i < o.length; i += 1) assert.ok(Math.abs(o[i] - st.offs[i]) <= 0.01, `offset ${i}: ${o[i]} vs ${st.offs[i]}`);
    for (let i = 1; i < o.length; i += 1) {
      const g = o[i] - o[i - 1];
      assert.ok(g <= PITCH + 1e-6, `gap ${g} over the pitch`);
      assert.ok(Math.abs(g - st.gap) <= 0.01, `gap ${g} is not the even spread ${st.gap}`);
    }
    assert.equal(Dw.dowelTooClose(o, DIA), false);
  });
}

test('F19 · the rule\'s edges: the short joint, the exact pitch, a minimum above two', () => {
  // Under one pitch of span: still two (T75's rule fell to one here; the owner says minimum 2).
  assert.deepEqual(Dw.dowelPositions(282, E, PITCH, NMIN, DIA), [50, 232]);
  assert.deepEqual(Dw.dowelPositions(350, E, PITCH, NMIN, DIA), [50, 300], 'S = p exactly: two, one gap of the pitch');
  assert.deepEqual(Dw.dowelPositions(351, E, PITCH, NMIN, DIA), [50, 175.5, 301], 'S just over p: three');
  // The two end dowels would meet (S < dia): one on the centre, as T75's step 3 did on a short run.
  assert.deepEqual(Dw.dowelPositions(105, E, PITCH, NMIN, DIA), [52.5]);
  assert.deepEqual(Dw.dowelPositions(100, E, PITCH, NMIN, DIA), [50]);
  assert.deepEqual(Dw.dowelPositions(106, E, PITCH, NMIN, DIA), [50, 56], 'S = dia: two that just stand apart');
  assert.deepEqual(Dw.dowelPositions(0, E, PITCH, NMIN, DIA), []);
  assert.deepEqual(Dw.dowelPositions(-5, E, PITCH, NMIN, DIA), []);
  // A minimum above two spreads the same way; a fractional minimum is read whole (the LISP's fix).
  assert.deepEqual(Dw.dowelPositions(600, E, PITCH, 5, DIA), [50, 175, 300, 425, 550]);
  assert.deepEqual(Dw.dowelPositions(600, E, PITCH, 3.9, DIA), [50, 300, 550]);
  // The 1e-9 slack: a span that is a whole number of pitches on paper is that number.
  assert.deepEqual(Dw.dowelPositions(100 + 3 * 250, E, PITCH, NMIN, DIA), [50, 300, 550, 800]);
});

test('F19 · the profile numbers are the owner\'s (the LISP\'s section A), `minPerJoint` in, `maxGapMm` out', () => {
  assert.deepEqual(Dw.dowelProfile({}), OWNER, 'a bare call answers what SKYLON_JOINTS_DOWEL.lsp prints');
  assert.equal('maxGapMm' in Dw.dowelProfile({ joints: { dowel: { maxGapMm: 128 } } }), false, 'a saved max gap is not read');
  assert.equal(Dw.dowelProfile({ joints: { dowel: { minPerJoint: 3 } } }).minPerJoint, 3);
  // The engine's code reads no max gap anywhere (comments aside).
  assert.doesNotMatch(read('src/engine/dowels.js').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''), /maxGapMm/);
  // The refusals that replaced the max-gap sentence.
  assert.deepEqual(Dw.dowelRefusal(OWNER, 18, 18), []);
  assert.deepEqual(Dw.dowelRefusal({ ...OWNER, pitchMm: 0 }, 18, 18), ['the pitch 0.00 is not a positive length']);
  assert.deepEqual(Dw.dowelRefusal({ ...OWNER, minPerJoint: 1 }, 18, 18), [
    'fewer than two dowels per joint: the owner says minimum 2, the profile says 1',
  ]);
  // The corner web at dia 6: 50 - 3 = 47 > 20.
  assert.deepEqual(Dw.dowelRefusal({ ...OWNER, endOffsetMm: 23 }, 18, 18), [
    'at a corner the end dowel (23.00 in) would meet the other joint\'s edge bores (20.00 deep)',
  ]);
  assert.deepEqual(Dw.dowelRefusal({ ...OWNER, endOffsetMm: 23.01 }, 18, 18), []);
});

test('F19 · LISP IS LAW: SKYLON_JOINTS_DOWEL.lsp carries the owner\'s numbers, the rule and the recomputed NUMBERS; every defun keeps its name', () => {
  const lsp = read('reference/lisp/SKYLON_JOINTS_DOWEL.lsp');
  assert.match(lsp, /T78 F19 AMENDMENT \(11\.10\.2026\)/);
  assert.match(lsp, /minimum 2 a kolki co mniej wiecej co 250 mm/, 'the owner\'s words (ASCII, for AutoCAD\'s loader)');
  // Section A, cons by cons.
  assert.match(lsp, /\(cons "diaMm" 6\.0\)/);
  assert.match(lsp, /\(cons "edgeDepthMm" 20\.0\)[^\n]*T75 proposed, owner to confirm/);
  assert.match(lsp, /\(cons "faceDepthMm" 12\.0\)[^\n]*T75 proposed, owner to confirm/);
  assert.match(lsp, /\(cons "pitchMm" 250\.0\)[^\n]*owner 11\.10, decided/);
  assert.match(lsp, /\(cons "minPerJoint" 2\)[^\n]*owner 11\.10, decided/);
  assert.match(lsp, /\(cons "endOffsetMm" 50\.0\)[^\n]*owner 11\.10, decided/);
  assert.match(lsp, /\(cons "diaMm" 6\.0\)[^\n]*owner 11\.10, decided/);
  assert.match(lsp, /\(cons "confirmed" nil\)/);
  assert.doesNotMatch(lsp, /\(cons "maxGapMm"/, 'the max gap is still a profile number in the LISP');
  // Section B: the five arguments, the rule's formula.
  assert.match(lsp, /\(defun dowel-positions \(L e p nMin dia /);
  assert.match(lsp, /t\(i\) = e \+ i \* S \/ \(n - 1\)/);
  assert.match(lsp, /n = max\(nMin, 1 \+ ceil\(S \/ p\)\)/);
  // Every defun of T75 keeps its name.
  for (const name of [
    'dowel-profile', 'dowel-get', 'dowel-ceil', 'dowel-positions', 'dowel-too-close', 'dowel-joint', 'dowel-jget',
    'dowel-face-holes', 'dowel-edge-holes', 'dowel-joint-holes', 'dowel-joint-table', 'dowel-gate', 'dowel-refusal',
    'dowel-print-hole', 'c:DOWEL_JOINTS',
  ]) {
    assert.match(lsp, new RegExp(`\\(defun ${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} `), `defun ${name} is gone`);
  }
  // Section H, the NUMBERS block: the rows the engine is held to.
  for (const row of [
    'BUL-TOP      540  FRONT   440  3  220     50 270 490',
    'BACK-BUL     770  BOTTOM  670  4  223.33  50 273.33 496.67 720',
    'BACK-TOP     564  LEFT    464  3  232     50 282 514',
    'BUL-SHELF-1  520  FRONT   420  3  210     50 260 470',
    'BACK 14 face. 26 face holes, 26 edge holes: 26 DOWELS',
    '6 more dowels: 32 in all',
  ]) {
    assert.ok(lsp.includes(row), `the LISP does not print "${row}"`);
  }
  // The gate sentence is unchanged, word for word.
  assert.ok(lsp.includes(`"${Dw.DOWEL_GATE}"`));
});

test('F19 · the engine mirrors the LISP on the BUD 600: 26 dowels, 32 with one FIX shelf, the holes at the NUMBERS', () => {
  // The owner's numbers spelled out, so this holds whatever profile.js carries today.
  const P = { ...P0, joints: { ...P0.joints, dowel: { ...OWNER, layers: P0.joints.dowel.layers } } };
  const r = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', joints_system: 'dowel' }, P);
  assert.equal(r.derived.joints.system, 'dowel', r.derived.joints.refused);
  assert.equal(r.derived.joints.dowels, 26);
  assert.deepEqual(
    r.derived.joints.joints.map((j) => [j.name, j.len, j.dowels]),
    [['BUL-TOP', 540, 3], ['BUR-TOP', 540, 3], ['BUL-BOTTOM', 540, 3], ['BUR-BOTTOM', 540, 3],
      ['BACK-BUL', 770, 4], ['BACK-BUR', 770, 4], ['BACK-TOP', 564, 3], ['BACK-BOTTOM', 564, 3]],
  );
  const at = (panel, joint, edge) => r.drills
    .filter((d) => d.kind === 'dowel' && d.panel === panel && d.meta?.joint === joint && (d.face === 'edge') === edge);
  assert.deepEqual(at('BUL', 'BUL-TOP', false).map((d) => [d.x, d.y]), [[50, 761], [270, 761], [490, 761]]);
  assert.deepEqual(at('BUL', 'BACK-BUL', true).map((d) => [d.x, d.y]), [[540, 50], [540, 273.3333], [540, 496.6667], [540, 720]]);
  assert.deepEqual(at('BACK', 'BACK-TOP', false).map((d) => [d.x, d.y]), [[68, 761], [300, 761], [532, 761]]);
  // 17.10.2026 (14:15, "lustro bottom i top"): the TOP is drawn from its underside, y from the BUR end, so the
  // back edge's three read from the other end (564 - 514 = 50 .. 564 - 50 = 514: the same three, the other way);
  // the BOTTOM keeps the LISP's order.
  assert.deepEqual(at('TOP', 'BACK-TOP', true).map((d) => [d.x, d.y]), [[0, 514], [0, 282], [0, 50]]);
  assert.deepEqual(at('BOTTOM', 'BACK-BOTTOM', true).map((d) => [d.x, d.y]), [[0, 50], [0, 282], [0, 514]]);
  assert.deepEqual(at('TOP', 'BUL-TOP', true).map((d) => [d.y, d.edge]), [[564, 'YH'], [564, 'YH'], [564, 'YH']], 'the BUL end of the TOP is its y = 564 edge');
  assert.deepEqual(at('BOTTOM', 'BUL-BOTTOM', true).map((d) => [d.y, d.edge]), [[0, 'Y0'], [0, 'Y0'], [0, 'Y0']]);
  for (const d of r.drills.filter((x) => x.kind === 'dowel')) assert.equal(d.d, 6);
  // No gap over the pitch on any joint of the unit, and every joint has at least two.
  for (const j of r.derived.joints.joints) {
    assert.ok(j.dowels >= 2, `${j.name}: fewer than two`);
    assert.ok((j.len - 2 * E) / (j.dowels - 1) <= PITCH + 1e-6, `${j.name}: a gap over the pitch`);
  }
  // One FIX shelf: 6 more.
  const shelf = computeCabinet({
    ...defaultParamsFor('BUD', P), unit_num: '01', joints_system: 'dowel',
    sections: [{ items: [{ id: 's1', kind: 'shelf', variant: 'fixed', pos_mm: 385 }] }],
  }, P);
  assert.equal(shelf.derived.joints.dowels, 32);
  assert.deepEqual(shelf.drills.filter((d) => d.kind === 'dowel' && d.panel === 'BUL' && d.meta?.joint === 'BUL-SHELF-1' && d.face !== 'edge')
    .map((d) => [d.x, d.y]), [[70, 394], [280, 394], [490, 394]]);
  assert.deepEqual(shelf.drills.filter((d) => d.kind === 'dowel' && d.panel === 'SHELF-1' && d.meta?.joint === 'BUR-SHELF-1')
    .map((d) => [d.x, d.y, d.edge]), [[50, 564, 'YH'], [260, 564, 'YH'], [470, 564, 'YH']]);
  // The gate is still shut: the owner decided the numbers, not the confirmation.
  assert.equal(r.derived.joints.gate, Dw.DOWEL_GATE);
  assert.ok(r.warnings.some((w) => w.code === Dw.DOWEL_GATE_CODE));
});

// ═══ THE PROFILE (f19-profile-dowel.patch) ═════════════════════════════════
// Red until the integrator applies the patch to src/engine/profile.js; green after.

test('F19 · src/engine/profile.js carries the owner\'s numbers and drops maxGapMm, and the migrate lets the code win (f19-profile-dowel.patch)', () => {
  assert.deepEqual({ ...P0.joints.dowel, layers: undefined }, { ...OWNER, layers: undefined });
  const src = read('src/engine/profile.js');
  const block = src.split('\n  joints: {')[1].split('layers:')[0];
  assert.match(block, /diaMm: 6,[^\n]*owner 11\.10\.2026, decided/);
  assert.match(block, /pitchMm: 250,[^\n]*owner 11\.10\.2026, decided/);
  assert.match(block, /minPerJoint: 2,[^\n]*owner 11\.10\.2026, decided/);
  assert.match(block, /endOffsetMm: 50,[^\n]*owner 11\.10\.2026, decided/);
  assert.match(block, /edgeDepthMm: 20,[^\n]*T75 proposed, owner to confirm/);
  assert.match(block, /faceDepthMm: 12,[^\n]*T75 proposed, owner to confirm/);
  assert.doesNotMatch(block, /maxGapMm:/);
  // THE CODE WINS for the owner's four (the TURN 40 plateBiteMm law), the depths and the gate stay the saved value.
  const stale = migrateCabinetProfile({ ...P0, joints: { dowel: { diaMm: 8, pitchMm: 32, maxGapMm: 128, faceDepthMm: 10, confirmed: true } } });
  assert.deepEqual({ ...stale.joints.dowel, layers: undefined }, { ...OWNER, faceDepthMm: 10, confirmed: true, layers: undefined });
  assert.equal('maxGapMm' in stale.joints.dowel, false);
});

test('F19 · no em or en dash in anything this F wrote', () => {
  for (const rel of ['reference/lisp/SKYLON_JOINTS_DOWEL.lsp', 'src/engine/dowels.js', 'test/turn78-f19-dowels.test.js', 'test/turn75-f23-dowels.test.js']) {
    assert.doesNotMatch(read(rel), new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`), `${rel} carries a dash`);
  }
});
