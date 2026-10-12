// ─── T75 F23 · THE SECOND JOINT SYSTEM, DOWELS FIRST, CABINEO'S SLOT ────────
//
// The owner, 9.10.2026: *"lisp najpierw."*  CLAUDE.md T75 PART G: *"Dowels
// first, Cabineo's data slot only ... Switching a unit REPLACES all of its
// puzzle sockets and tenons with dowel pairs on both boards (never both
// systems on one joint); dowels count in the BOM by the hardware law ... THE
// GATE: the CNC export REFUSES a dowel job while `joints.dowel.confirmed` is
// false, in words ("the dowel pattern is proposed, not confirmed by the
// owner"); the Check says the same; the 3D and the cut list show it."*
//
// `reference/lisp/SKYLON_JOINTS_DOWEL.lsp` is the law (written and
// paren-balanced first, ceb5fde); `src/engine/dowels.js` mirrors it routine
// for routine. These assertions are the LISP's own NUMBERS block (section H,
// a BUD 600 at KIT_BUD_FULL defaults, and its one-FIX-shelf case) read off the
// engine's real cut, and the PROBE's F23 rows (verify/t75/p07-probe.md).
//
// T78 F19 AMENDMENT (11.10.2026). The LISP's numbers moved to the owner's:
// *"minimum 2 a kołki co mniej więcej co 250 mm"*, dowels 6 mm, end offset
// 50; its spacing rule moved to the even spread between the two end offsets
// (SKYLON_JOINTS_DOWEL.lsp sections A and B); `maxGapMm` is gone. This test
// holds the engine to the LISP, so it moves WITH the LISP's NUMBERS block
// (section H, recomputed by hand), knowingly: 26 dowels on the BUD 600 where
// T75 had 44, 32 with one FIX shelf where T75 had 54. The profile's own block
// is asserted in the PROBE below against src/engine/profile.js (T78 F19's
// patch f19-profile-dowel.patch); the engine's cut is held to the owner's
// numbers spelled out here, so the mirror does not depend on the order the
// integrator lands the files in.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as Dw from '../src/engine/dowels.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPES } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P0, migrateCabinetProfile } from '../src/engine/profile.js';
import { CHECKS, runChecks } from '../src/engine/checks.js';
import { buildBom, buildCabinetPartQtys } from '../src/engine/bom.js';
import { PART_REGISTRY } from '../src/engine/partRegistry.js';
import { CNC_LAYERS, cncLayer } from '../src/engine/cnc/layers.js';
import { machiningFor } from '../src/engine/machining.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import { duplicateDrills } from '../src/engine/cnc/drillGuard.js';
import { exportMaterialDxf, exportSheetDxf, exportUnitDxfZip } from '../src/lib/cncExport.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { goldenOf } from '../scripts/t75-golden.mjs';
import { partDetailDrawing } from '../src/engine/drawings/partDetail.js';
import { buildUnitCard } from '../src/engine/drawings/unitCard.js';
import { cutRows } from '../src/engine/drawings/setPaper.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();

// T78 F19: the owner's dowel numbers (11.10.2026), `minPerJoint` in, `maxGapMm`
// out. After f19-profile-dowel.patch they ARE DEFAULT_CABINET_PROFILE's (the
// PROBE below asserts it against P0); the cut below is held to them directly.
const F19_DOWEL = {
  diaMm: 6, edgeDepthMm: 20, faceDepthMm: 12, pitchMm: 250, minPerJoint: 2, endOffsetMm: 50, confirmed: false,
};
const P = { ...P0, joints: { ...P0.joints, dowel: { ...F19_DOWEL, layers: P0.joints.dowel.layers } } };

const BUD = { ...defaultParamsFor('BUD', P), unit_num: '01' };
const DOWEL_BUD = { ...BUD, joints_system: 'dowel' };
const FIX = { sections: [{ items: [{ id: 's1', kind: 'shelf', variant: 'fixed', pos_mm: 385 }] }] };
const puzzle = computeCabinet(BUD, P);
const dowel = computeCabinet(DOWEL_BUD, P);
const BOARDS = ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK'];
const panelOf = (r, id) => r.panels.find((p) => p.id === id);
const dowelsOf = (r, panel, joint, edge = false) => r.drills.filter((d) => d.kind === 'dowel' && d.panel === panel
  && d.meta?.joint === joint && (edge ? d.face === 'edge' : d.face !== 'edge'));
const xs = (list) => list.map((d) => d.x);
const ys = (list) => list.map((d) => d.y);
const count = (list) => list.reduce((m, d) => ({ ...m, [`${d.kind}@${d.panel}`]: (m[`${d.kind}@${d.panel}`] || 0) + 1 }), {});

// ═══ THE PROBE, ITS F23 ROWS AS ASSERTIONS ════════════════════════════════

test('F23 PROBE · the puzzle a default BUD cuts today is untouched (the house default)', () => {
  // verify/t75/p07-probe.md, "default BUD 600 x 770 x 558, all ops (MEASURED)".
  const c = count(puzzle.drills);
  assert.equal(c['puzzle@BUL'], 8);
  assert.equal(c['screw@BUL'], 6);
  assert.equal(c['puzzle@BUR'], 8);
  assert.equal(c['puzzle@BACK'], 20);
  assert.equal(c['screw@BACK'], 14);
  assert.equal(panelOf(puzzle, 'BUL').cnc.outline.length, 34);
  assert.equal(panelOf(puzzle, 'TOP').cnc.outline.length, 64);
  assert.equal(puzzle.derived.joints, undefined, 'a puzzle unit carries no joints record at all');
  assert.equal(puzzle.drills.some((d) => d.kind === 'dowel'), false);
});

test('F23 PROBE · the switch: `profile.joints` is the cut law, `profile.joinery` stays the visual picker', () => {
  assert.equal(P0.joints.system, 'puzzle');
  // T78 F19: the owner's numbers (11.10.2026), `minPerJoint` in, `maxGapMm` out.
  assert.deepEqual({ ...P0.joints.dowel, layers: undefined }, { ...F19_DOWEL, layers: undefined });
  // Every number carries its mark: the owner's four are his, the two depths stay proposed.
  const block = read('src/engine/profile.js').split('\n  joints: {')[1].split('layers:')[0];
  for (const key of ['diaMm', 'pitchMm', 'minPerJoint', 'endOffsetMm']) {
    assert.match(block, new RegExp(`${key}: [^\\n]+// owner 11\\.10\\.2026, decided`), `${key} is not marked as the owner's`);
  }
  for (const key of ['edgeDepthMm', 'faceDepthMm']) {
    assert.match(block, new RegExp(`${key}: [^\\n]+// T75 proposed, owner to confirm`), `${key} is not marked proposed`);
  }
  assert.doesNotMatch(block, /maxGapMm:/, 'T75\'s maxGapMm is still a profile number');
  // The migrate line, key by key: a profile saved before T75 gains it shut.
  const old = migrateCabinetProfile({ ...P0, joints: undefined });
  assert.deepEqual(old.joints, P0.joints);
  // T78 F19: THE CODE WINS for the owner's four numbers (the TURN 40 plateBiteMm
  // law: cc.profile.v1 is written whole, so a profile saved under T75 carries
  // dia 8, pitch 32 and maxGapMm 128, and nothing in Settings ever typed them);
  // a tuned depth and the gate keep the saved value; the dead key is dropped.
  const stale = migrateCabinetProfile({ ...P0, joints: { dowel: { diaMm: 8, pitchMm: 32, maxGapMm: 128, edgeDepthMm: 25 } } });
  assert.equal(stale.joints.system, 'puzzle');
  assert.equal(stale.joints.dowel.diaMm, 6);
  assert.equal(stale.joints.dowel.pitchMm, 250);
  assert.equal(stale.joints.dowel.minPerJoint, 2);
  assert.equal(stale.joints.dowel.endOffsetMm, 50);
  assert.equal(stale.joints.dowel.edgeDepthMm, 25, 'a proposed depth the workshop tuned is kept');
  assert.equal(stale.joints.dowel.confirmed, false);
  assert.equal('maxGapMm' in stale.joints.dowel, false, 'the dead key is dropped');
  assert.deepEqual(migrateCabinetProfile(stale).joints, stale.joints, 'twice answers the same');
  // The visual picker is as it was, and the cut never reads it.
  assert.deepEqual(P0.joinery.types.map((t) => t.id), ['dogbone']);
  assert.doesNotMatch(read('src/engine/dowels.js').replace(/\/\/.*$/gm, ''), /joinery/);
  // The per-unit key wins, a stray value says nothing.
  assert.equal(Dw.jointSystemOf({ joints_system: 'dowel' }, P), 'dowel');
  assert.equal(Dw.jointSystemOf({ joints_system: 'nails' }, P), 'puzzle');
  assert.equal(Dw.jointSystemOf({}, { joints: { system: 'dowel' } }), 'dowel');
  assert.equal(Dw.jointSystemOf({ joints_system: 'puzzle' }, { joints: { system: 'dowel' } }), 'puzzle');
});

test('F23 PROBE · the new layers have a policy, an ACI of their own, and the edge bore never reaches the machine', () => {
  const face = cncLayer('DOWEL_8MM');
  const edge = cncLayer('DOWEL_EDGE_8MM');
  assert.equal(face.aci, 45);
  assert.equal(edge.aci, 46);
  const acis = CNC_LAYERS.filter((l) => ['DOWEL_8MM', 'DOWEL_EDGE_8MM'].includes(l.name)).map((l) => l.aci);
  for (const a of acis) assert.equal(CNC_LAYERS.filter((l) => l.aci === a).length, 1, `ACI ${a} is shared`);
  assert.equal(machiningFor('DOWEL_8MM', P).draw, true);
  assert.equal(machiningFor('DOWEL_EDGE_8MM', P).draw, false);
  assert.ok(machiningFor('DOWEL_EDGE_8MM', P).reason.length > 40);
  // The machine file: face holes yes, edge bores never.
  const files = buildUnitDxfFiles(dowel, P);
  const all = files.map((f) => f.dxf).join('\n');
  assert.match(all, /\r?\nDOWEL_8MM\r?\n/);
  assert.doesNotMatch(all, /DOWEL_EDGE_8MM/);
  // Two boards of one joint never share a hole: no duplicate drilling.
  assert.deepEqual(duplicateDrills(dowel.drills), []);
});

// ═══ THE LISP, ROUTINE FOR ROUTINE ════════════════════════════════════════

test('F23 · sections A and B: the profile numbers and the spacing rule, the LISP\'s own answers', () => {
  // T78 F19: the owner, 11.10.2026: *"minimum 2 a kołki co mniej więcej co 250 mm"*, dowels 6 mm.
  const prof = Dw.dowelProfile(P);
  assert.deepEqual(prof, F19_DOWEL);
  assert.deepEqual(Dw.dowelProfile({}), prof, 'a bare call answers what the LISP prints');
  assert.equal('maxGapMm' in prof, false, 'T75\'s max gap is no longer part of the rule');
  assert.equal(Dw.dowelCeil(3.0000000001), 3);
  assert.equal(Dw.dowelCeil(2.68), 3);
  // Section H's table: LEN, the offsets (273.33 and 496.67 are 50 + 670 / 3 and 50 + 1340 / 3).
  const r4 = (o) => o.map((v) => Math.round(v * 10000) / 10000);
  assert.deepEqual(Dw.dowelPositions(540, 50, 250, 2, 6), [50, 270, 490]);
  assert.deepEqual(r4(Dw.dowelPositions(770, 50, 250, 2, 6)), [50, 273.3333, 496.6667, 720]);
  assert.deepEqual(Dw.dowelPositions(564, 50, 250, 2, 6), [50, 282, 514]);
  assert.deepEqual(Dw.dowelPositions(520, 50, 250, 2, 6), [50, 260, 470]);
  // Never fewer than two: a wall unit's 282 side takes two, at 50 and 232 (T75's rule gave one, at 141).
  assert.deepEqual(Dw.dowelPositions(282, 50, 250, 2, 6), [50, 232]);
  // The short run (the two end dowels would meet, closer than one diameter): one on the centre line.
  assert.deepEqual(Dw.dowelPositions(105, 50, 250, 2, 6), [52.5]);
  assert.deepEqual(Dw.dowelPositions(106, 50, 250, 2, 6), [50, 56]);
  assert.deepEqual(Dw.dowelPositions(0, 50, 250, 2, 6), []);
  // Every gap within the pitch, the gaps equal, the ends at the end offset, never fewer than two.
  for (const L of [300, 540, 770, 2150]) {
    const o = Dw.dowelPositions(L, 50, 250, 2, 6);
    assert.ok(o.length >= 2, `${L}: fewer than two`);
    assert.equal(o[0], 50);
    assert.equal(o[o.length - 1], L - 50);
    for (let i = 1; i < o.length; i += 1) assert.ok(o[i] - o[i - 1] <= 250 + 1e-9, `${L}: gap over 250`);
    for (let i = 2; i < o.length; i += 1) assert.ok(Math.abs((o[i] - o[i - 1]) - (o[1] - o[0])) < 1e-9, `${L}: gaps not equal`);
    assert.equal(Dw.dowelTooClose(o, 6), false);
  }
  // The LISP prints those same offsets, carries the minimum and no longer a max gap.
  const lsp = read('reference/lisp/SKYLON_JOINTS_DOWEL.lsp');
  for (const row of ['50 270 490', '50 273.33 496.67 720', '50 282 514', '50 260 470']) {
    assert.ok(lsp.includes(row), `the LISP does not print ${row}`);
  }
  assert.match(lsp, /\(cons "minPerJoint" 2\)/);
  assert.doesNotMatch(lsp, /\(cons "maxGapMm"/);
});

test('F23 · section F: the gate and the refusals, word for word', () => {
  const lsp = read('reference/lisp/SKYLON_JOINTS_DOWEL.lsp');
  assert.ok(lsp.includes(`"${Dw.DOWEL_GATE}"`), 'the gate sentence is the LISP\'s');
  assert.equal(Dw.DOWEL_GATE, 'the dowel pattern is proposed, not confirmed by the owner');
  const prof = Dw.dowelProfile(P);
  assert.equal(Dw.dowelGate(prof), Dw.DOWEL_GATE);
  assert.equal(Dw.dowelGate({ ...prof, confirmed: true }), null);
  assert.deepEqual(Dw.dowelRefusal(prof, 18, 18), []);
  assert.deepEqual(Dw.dowelRefusal({ ...prof, faceDepthMm: 18 }, 18, 18), ['a face hole 18.00 deep would break through a 18.00 board']);
  // T78 F19: the max-gap sentence went with `maxGapMm`; the pitch must be a length, the minimum the owner's two.
  assert.deepEqual(Dw.dowelRefusal({ ...prof, pitchMm: 0 }, 18, 18), ['the pitch 0.00 is not a positive length']);
  assert.deepEqual(Dw.dowelRefusal({ ...prof, minPerJoint: 1 }, 18, 18), [
    'fewer than two dowels per joint: the owner says minimum 2, the profile says 1',
  ]);
  assert.deepEqual(Dw.dowelRefusal({ ...prof, endOffsetMm: 20 }, 18, 18), [
    'at a corner the end dowel (20.00 in) would meet the other joint\'s edge bores (20.00 deep)',
  ]);
  assert.deepEqual(Dw.dowelRefusal(prof, 18, 6), ['a dowel 6.00 wide does not fit a 6.00 edge']);
});

test('F23 · section D: the joint table, the five puzzle joints and the FIX shelf row', () => {
  const t = Dw.dowelJointTable(600, 558, 770, 18, [[385, 18, 20]]);
  assert.deepEqual(t.map((j) => j.name), [
    'BUL-TOP', 'BUR-TOP', 'BUL-BOTTOM', 'BUR-BOTTOM', 'BACK-BUL', 'BACK-BUR', 'BACK-TOP', 'BACK-BOTTOM',
    'BUL-SHELF-1', 'BUR-SHELF-1',
  ]);
  assert.deepEqual(t.map((j) => j.len), [540, 540, 540, 540, 770, 770, 564, 564, 520, 520]);
  // Which board is FACE and which EDGE follows the puzzle: the socket board is the face.
  assert.deepEqual(t.map((j) => [j.face, j.edge, j.edgeName]), [
    ['BUL', 'TOP', 'Y0'], ['BUR', 'TOP', 'YH'], ['BUL', 'BOTTOM', 'Y0'], ['BUR', 'BOTTOM', 'YH'],
    ['BACK', 'BUL', 'XW'], ['BACK', 'BUR', 'X0'], ['BACK', 'TOP', 'X0'], ['BACK', 'BOTTOM', 'X0'],
    ['BUL', 'SHELF-1', 'Y0'], ['BUR', 'SHELF-1', 'YH'],
  ]);
});

// ═══ THE BUD 600, BOARD BY BOARD (section H) ═══════════════════════════════

test('F23 · a dowel BUD: every puzzle joint is gone from both boards, whole', () => {
  for (const id of BOARDS) {
    const p = panelOf(dowel, id);
    assert.equal(p.cnc.outline.length, 4, `${id} keeps a tab`);
    assert.deepEqual(p.cnc.outline, [[0, 0], [p.cnc.drawn_w, 0], [p.cnc.drawn_w, p.cnc.drawn_h], [0, p.cnc.drawn_h]]);
    assert.equal((p.cnc.pockets || []).some((k) => /PUZZLE/.test(k.layer)), false, `${id} keeps a socket or a dog bone`);
  }
  assert.equal(dowel.drills.some((d) => d.kind === 'puzzle'), false, 'a dia 7.5 puzzle hole is left');
  assert.equal(dowel.drills.some((d) => d.kind === 'screw' && BOARDS.includes(d.panel)), false, 'a joint screw row is left');
  // What is not a joint stays exactly as it was: the hinge plates, the cups.
  const keep = (r) => r.drills.filter((d) => !['puzzle', 'screw', 'dowel'].includes(d.kind));
  assert.deepEqual(keep(dowel), keep(puzzle));
  // The panels, their sizes and the cut list are the puzzle unit's.
  assert.deepEqual(dowel.csvLines, puzzle.csvLines);
});

test('F23 · a dowel BUD: the LISP\'s holes, board by board (section H)', () => {
  // T78 F19: section H recomputed by hand under the owner's rule (6 mm, every 250, min 2, end 50).
  const S90 = [50, 270, 490];
  const S90R = [490, 270, 50];
  const UP = [50, 273.3333, 496.6667, 720];
  const ACROSS = [50, 282, 514];
  // BUL: FACE y 761 and y 9, EDGE XW at x 540.
  assert.deepEqual(xs(dowelsOf(dowel, 'BUL', 'BUL-TOP')), S90);
  assert.deepEqual(ys(dowelsOf(dowel, 'BUL', 'BUL-TOP')), S90.map(() => 761));
  assert.deepEqual(xs(dowelsOf(dowel, 'BUL', 'BUL-BOTTOM')), S90);
  assert.deepEqual(ys(dowelsOf(dowel, 'BUL', 'BUL-BOTTOM')), S90.map(() => 9));
  assert.deepEqual(ys(dowelsOf(dowel, 'BUL', 'BACK-BUL', true)), UP);
  assert.deepEqual(xs(dowelsOf(dowel, 'BUL', 'BACK-BUL', true)), UP.map(() => 540));
  // BUR: its frame runs from the back, so the same dowels read backwards.
  assert.deepEqual(xs(dowelsOf(dowel, 'BUR', 'BUR-TOP')), S90R);
  assert.deepEqual(xs(dowelsOf(dowel, 'BUR', 'BUR-BOTTOM')), S90R);
  assert.deepEqual(ys(dowelsOf(dowel, 'BUR', 'BACK-BUR', true)), UP);
  assert.deepEqual(xs(dowelsOf(dowel, 'BUR', 'BACK-BUR', true)), UP.map(() => 0));
  // TOP and BOTTOM: edge bores only, Y0, YH and X0.
  for (const b of ['TOP', 'BOTTOM']) {
    assert.deepEqual(xs(dowelsOf(dowel, b, `BUL-${b}`, true)), S90R);
    assert.deepEqual(ys(dowelsOf(dowel, b, `BUL-${b}`, true)), S90R.map(() => 0));
    assert.deepEqual(ys(dowelsOf(dowel, b, `BUR-${b}`, true)), S90R.map(() => 564));
    assert.deepEqual(ys(dowelsOf(dowel, b, `BACK-${b}`, true)), ACROSS);
    assert.equal(dowel.drills.filter((d) => d.panel === b && d.kind === 'dowel' && d.face !== 'edge').length, 0);
  }
  // BACK: face holes only.
  assert.deepEqual(ys(dowelsOf(dowel, 'BACK', 'BACK-BUL')), UP);
  assert.deepEqual(xs(dowelsOf(dowel, 'BACK', 'BACK-BUL')), UP.map(() => 9));
  assert.deepEqual(xs(dowelsOf(dowel, 'BACK', 'BACK-BUR')), UP.map(() => 591));
  assert.deepEqual(xs(dowelsOf(dowel, 'BACK', 'BACK-TOP')), [68, 300, 532]);
  assert.deepEqual(ys(dowelsOf(dowel, 'BACK', 'BACK-TOP')), [761, 761, 761]);
  assert.deepEqual(ys(dowelsOf(dowel, 'BACK', 'BACK-BOTTOM')), [9, 9, 9]);
  // COUNTS: BUL 6 face + 4 edge; BUR 6 + 4; TOP 9 edge; BOTTOM 9; BACK 14 face; 26 dowels (T75's rule: 44).
  const per = (panel, edge) => dowel.drills.filter((d) => d.kind === 'dowel' && d.panel === panel && (d.face === 'edge') === edge).length;
  assert.deepEqual(BOARDS.map((b) => [per(b, false), per(b, true)]), [[6, 4], [6, 4], [0, 9], [0, 9], [14, 0]]);
  assert.equal(dowel.derived.joints.dowels, 26);
  // The holes: FACE dia 6 depth 12 on DOWEL_8MM (the layer keeps T75's name, see profile.js); EDGE dia 6 depth 20 at z 9, by hand.
  for (const d of dowel.drills.filter((x) => x.kind === 'dowel')) {
    assert.equal(d.d, 6);
    if (d.face === 'edge') {
      assert.equal(d.layer, 'DOWEL_EDGE_8MM');
      assert.equal(d.depth, 20);
      assert.equal(d.z, 9);
      assert.ok(['X0', 'XW', 'Y0', 'YH'].includes(d.edge));
      assert.equal(d.meta.readiness, 'manual', 'an edge bore is the joiner\'s, not the bed\'s');
    } else {
      assert.equal(d.layer, 'DOWEL_8MM');
      assert.equal(d.depth, 12);
    }
  }
  // Both boards of every joint: as many face holes as edge bores, joint by joint.
  for (const j of dowel.derived.joints.joints) {
    const f = dowel.drills.filter((d) => d.meta?.joint === j.name && d.face !== 'edge').length;
    const e = dowel.drills.filter((d) => d.meta?.joint === j.name && d.face === 'edge').length;
    assert.equal(f, j.dowels, `${j.name}: face`);
    assert.equal(e, j.dowels, `${j.name}: edge`);
  }
});

test('F23 · the FIX shelf: dowels replace the biscuit set and the side screws; the BACK\'s row stays', () => {
  const p0 = computeCabinet({ ...BUD, ...FIX }, P);
  const r = computeCabinet({ ...DOWEL_BUD, ...FIX }, P);
  // Under the puzzle: biscuit marks and four through screws per side.
  assert.equal(panelOf(p0, 'BUL').cnc.marks.length, 2);
  assert.equal(p0.drills.filter((d) => d.kind === 'shelf_screw').length, 8);
  // Under dowels: neither, and the dowel row in their place (section H, the shelf case).
  assert.equal((panelOf(r, 'BUL').cnc.marks || []).length, 0);
  assert.equal((panelOf(r, 'BUR').cnc.marks || []).length, 0);
  assert.equal(r.drills.filter((d) => d.kind === 'shelf_screw').length, 0);
  // T78 F19: BUL-SHELF-1 520 long: S 420, n 3, gap 210: 50 260 470 (T75's rule: 50 178 274 370 470).
  assert.deepEqual(xs(dowelsOf(r, 'BUL', 'BUL-SHELF-1')), [70, 280, 490]);
  assert.deepEqual(ys(dowelsOf(r, 'BUL', 'BUL-SHELF-1')), [394, 394, 394]);
  assert.deepEqual(xs(dowelsOf(r, 'BUR', 'BUR-SHELF-1')), [470, 260, 50]);
  assert.deepEqual(xs(dowelsOf(r, 'SHELF-1', 'BUL-SHELF-1', true)), [50, 260, 470]);
  assert.deepEqual(ys(dowelsOf(r, 'SHELF-1', 'BUR-SHELF-1', true)), [564, 564, 564]);
  assert.equal(r.derived.joints.dowels, 32, '6 more dowels: 32 in all (T75: 54)');
  // The FIX shelf's dia 3 row through the BACK is not a dowel joint (section E).
  assert.equal(r.drills.filter((d) => d.kind === 'shelf_back_screw').length, 3);
});

// ═══ ROOM REFUSES FIRST ════════════════════════════════════════════════════

test('F23 · refused in words, and the unit is cut with the puzzle, never half of each', () => {
  const refusedOf = (params) => {
    const r = computeCabinet(params, P);
    const w = r.warnings.find((x) => x.code === Dw.JOINTS_REFUSED);
    assert.ok(w, `${params.type || '?'} was not refused`);
    assert.equal(r.drills.some((d) => d.kind === 'dowel'), false, 'a refused unit carries a dowel');
    assert.equal(r.derived.joints.system, 'puzzle');
    return w.message;
  };
  // Cabineo: reserved, the sentence the README names.
  assert.match(refusedOf({ ...BUD, joints_system: 'cabineo' }), /Cabineo is reserved: its data is not in the repo yet \(reference\/hardware\/cabineo\/README\.md\)/);
  assert.match(read('reference/hardware/cabineo/README.md'), /Cabineo 8\b/);
  assert.match(read('reference/hardware/cabineo/README.md'), /Cabineo 12/);
  assert.match(read('reference/hardware/cabineo/README.md'), /8 M6/);
  // A kit the LISP's table does not describe.
  assert.match(refusedOf({ ...defaultParamsFor('SINK', P), unit_num: '01', joints_system: 'dowel' }), /SINK: its joints are not in SKYLON_JOINTS_DOWEL\.lsp's table/);
  assert.match(refusedOf({ ...defaultParamsFor('FRIDGE', P), unit_num: '01', joints_system: 'dowel' }), /FRIDGE/);
  // A dowel that meets what the kit already cuts: the wall unit's hanger.
  assert.match(refusedOf({ ...defaultParamsFor('WUD', P), unit_num: '01', joints_system: 'dowel' }), /meets the HANGER_HOLE pocket/);
  // A notched carcass keeps the puzzle (KIT_NOTCH re-plans the puzzle's joints).
  const notched = { ...DOWEL_BUD, notch: { corner: 'BL', w: 200, d: 200, h: 0 } };
  assert.match(refusedOf(notched), /corner notch keeps the puzzle/);
  assert.ok(computeCabinet(notched, P).panels.some((p) => p.id === 'RETURN'), 'the notch is still cut');
  // The refused unit is the puzzle unit, byte for byte (plus the sentence).
  const sink = computeCabinet({ ...defaultParamsFor('SINK', P), unit_num: '01' }, P);
  const sinkD = computeCabinet({ ...defaultParamsFor('SINK', P), unit_num: '01', joints_system: 'dowel' }, P);
  assert.deepEqual(sinkD.drills, sink.drills);
  assert.deepEqual(sinkD.panels, sink.panels);
});

test('F23 · every five-board kit cuts dowels or refuses in words; none throws', () => {
  for (const id of Object.keys(UNIT_TYPES)) {
    const r = computeCabinet({ ...defaultParamsFor(id, P), unit_num: '01', joints_system: 'dowel' }, P);
    const j = r.derived?.joints;
    assert.ok(j, `${id}: no joints record`);
    if (j.system === 'dowel') {
      assert.equal(Dw.dowelApplies(UNIT_TYPES[id]), true, `${id} cut dowels the UI would not offer`);
      assert.equal(r.drills.some((d) => d.kind === 'puzzle'), false, `${id}: both systems`);
    } else {
      assert.ok(j.refused && j.refused.length > 20, `${id}: refused in silence`);
    }
  }
  // The kitchen base family takes them.
  for (const id of ['BUD', 'BUDR', 'BUDTALL', 'PANTRY', 'LOW_CABINET', 'WARDROBE']) {
    const r = computeCabinet({ ...defaultParamsFor(id, P), unit_num: '01', joints_system: 'dowel' }, P);
    assert.equal(r.derived.joints.system, 'dowel', `${id}: ${r.derived.joints.refused}`);
  }
});

// ═══ THE DRAWINGS ══════════════════════════════════════════════════════════

test('F23 · the drawings: the part print carries both halves, the set\'s cards build unchanged', () => {
  // The part print reads the unit's drills by panel (engine/drawings/partDetail.js,
  // read-only this turn): the face holes and the edge bores reach it as they are.
  const bul = panelOf(dowel, 'BUL');
  const detail = partDetailDrawing(bul, { drills: dowel.drills, profile: P });
  assert.ok(detail, 'no part detail for the dowel BUL');
  const json = JSON.stringify(detail);
  assert.ok(json.includes('DOWEL_8MM'), 'the face holes are not on the print');
  assert.ok(json.includes('DOWEL_EDGE_8MM'), 'the edge bores are not on the print');
  // The T71 set's parts card and unit card: the boards are the puzzle unit's boards.
  // AMENDED AT INTEGRATION BY T75 F22: *"The T71 drawing set prints the state in the parts
  // card"*: a board with an edge bore is `manual` (fitted on site), so the rows are compared
  // without their state, and the state is asserted on its own.
  const bare = (rows) => ({
    carcass: rows.carcass.map(({ state: _s, ...r }) => r),
    fronts: rows.fronts.map(({ state: _s, ...r }) => r),
  });
  assert.deepEqual(bare(cutRows(dowel)), bare(cutRows(puzzle)));
  const bored = new Set(dowel.drills.filter((d) => d.meta?.readiness === 'manual').map((d) => d.panel));
  for (const r of cutRows(dowel).carcass) assert.equal(r.state, bored.has(r.id) ? 'manual' : 'cut', r.id);
  assert.ok(bored.size > 0, 'the dowel unit has edge bores');
  assert.ok(buildUnitCard(dowel, { unitNum: '01', frontType: 'S', profile: P }), 'the unit card did not build');
});

// ═══ THE GATE ══════════════════════════════════════════════════════════════

test('F23 · THE GATE: each of the three exports refuses a dowel job, and Export anyway cannot pass it', async () => {
  const unit = { id: 'u1', type: 'BUD', params: DOWEL_BUD, position: { wall: 0, x_mm: 0 } };
  await assert.rejects(() => exportUnitDxfZip(dowel, P, { exportAnyway: true }), { message: Dw.DOWEL_GATE });
  assert.throws(() => exportSheetDxf(dowel, ['BUL', '01-F'], P, { exportAnyway: true }), { message: Dw.DOWEL_GATE });
  assert.throws(
    () => exportMaterialDxf([{ unit, result: dowel, panels: dowel.panels }], { profile: P, exportAnyway: true }),
    { message: Dw.DOWEL_GATE },
  );
  // Only an export that would MACHINE a dowel hole: the leaf alone has none.
  assert.equal(Dw.dowelExportRefusal([{ result: dowel, panels: [panelOf(dowel, '01-F')] }], P), null);
  assert.equal(Dw.dowelExportRefusal([{ result: dowel, panels: [panelOf(dowel, 'TOP')] }], P), Dw.DOWEL_GATE);
  // A puzzle job is never asked.
  assert.equal(Dw.dowelExportRefusal([{ result: puzzle }], P), null);
  // The owner confirms: the gate opens for every export at once.
  const confirmed = migrateCabinetProfile({ ...P, joints: { ...P.joints, dowel: { ...P.joints.dowel, confirmed: true } } });
  assert.equal(Dw.dowelExportRefusal([{ result: dowel }], confirmed), null);
  const saved = { document: globalThis.document, create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  globalThis.document = { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } };
  URL.createObjectURL = () => 'blob:t';
  URL.revokeObjectURL = () => {};
  try {
    const out = exportSheetDxf(computeCabinet(DOWEL_BUD, confirmed), ['BUL', 'TOP'], confirmed);
    assert.equal(out.parts, 2);
  } finally {
    globalThis.document = saved.document;
    URL.createObjectURL = saved.create;
    URL.revokeObjectURL = saved.revoke;
  }
  // The sentence sits before the export gate in all three, by source.
  const src = read('src/lib/cncExport.js');
  for (const fn of ['exportUnitDxfZip', 'exportSheetDxf', 'exportMaterialDxf']) {
    const body = src.split(`export ${fn === 'exportUnitDxfZip' ? 'async ' : ''}function ${fn}(`)[1];
    assert.ok(body.indexOf('dowelExportRefusal') < body.indexOf('exportGate('), `${fn}: the gate is after exportGate`);
  }
});

test('F23 · Check #31 says the same, red, per dowel unit; and a refusal in its own words', () => {
  assert.deepEqual(CHECKS.find((c) => c.n === 31), { n: 31, level: 'red', label: 'Joint system: dowels not confirmed, or refused' });
  const unit = { id: 'u1', type: 'BUD', params: DOWEL_BUD, position: { wall: 0, x_mm: 0 } };
  const found = runChecks({ entries: [{ unit, result: dowel }], profile: P }).filter((f) => f.check === 31);
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'red');
  assert.ok(found[0].message.includes(Dw.DOWEL_GATE));
  assert.equal(found[0].unitId, 'u1');
  // Cabineo, refused: red, the sentence.
  const cab = computeCabinet({ ...BUD, joints_system: 'cabineo' }, P);
  const said = runChecks({ entries: [{ unit: { ...unit, params: { ...BUD, joints_system: 'cabineo' } }, result: cab }], profile: P })
    .filter((f) => f.check === 31);
  assert.equal(said.length, 1);
  assert.ok(said[0].message.includes(Dw.CABINEO_REFUSAL));
  // A puzzle unit raises nothing; a confirmed dowel unit raises nothing.
  assert.equal(runChecks({ entries: [{ unit: { ...unit, params: BUD }, result: puzzle }], profile: P }).filter((f) => f.check === 31).length, 0);
  const confirmed = migrateCabinetProfile({ ...P, joints: { ...P.joints, dowel: { ...P.joints.dowel, confirmed: true } } });
  const ok = computeCabinet(DOWEL_BUD, confirmed);
  assert.equal(ok.derived.joints.gate, null);
  assert.equal(runChecks({ entries: [{ unit, result: ok }], profile: confirmed }).filter((f) => f.check === 31).length, 0);
});

// ═══ THE BOM AND THE CUT LIST ══════════════════════════════════════════════

test('F23 · the BOM counts the dowels once, by the hardware law, and the cut list carries the note', () => {
  const q = buildCabinetPartQtys(dowel, { id: 'u1', type: 'BUD' }, { profile: P });
  assert.deepEqual(q.dowel, { unit: 'pcs', pcs: 26 }, 'T78 F19: 26 dowels on the BUD 600 (T75: 44)');
  assert.equal(q.puzzle_screw, undefined, 'a dowel unit buys no puzzle screw');
  assert.equal(PART_REGISTRY.dowel.unit, 'pcs');
  assert.equal(buildCabinetPartQtys(puzzle, { id: 'u1', type: 'BUD' }, { profile: P }).dowel, undefined);
  // The kind is neither a screw (`/screw/`) nor the puzzle.
  assert.equal(/screw/.test('dowel'), false);
  // The cut list: one NOTE row on the unit, counted in nothing.
  const bom = buildBom([{ unit: { id: 'u1', type: 'BUD', params: DOWEL_BUD }, result: dowel }], { profile: P });
  const rows = bom.units[0].rows;
  const note = rows.find((r) => r.role === 'dowel_note');
  assert.ok(note, 'no dowel note on the cut list');
  assert.match(note.material_label, /^NOTE: dowel joints, 26 dowels/);
  assert.ok(note.material_label.includes(Dw.DOWEL_GATE));
  assert.equal(note.readiness, 'manual');
  assert.equal(bom.totals.pieces, dowel.panels.reduce((n, p) => n + p.qty, 0), 'the note is not a piece');
  assert.equal(bom.cutRows.some((r) => r.role === 'dowel_note'), false);
});

// ═══ SAVE AND RELOAD, AND THE UI ═══════════════════════════════════════════

test('F23 · save and reload: the choice is a unit param and the reloaded unit cuts dowels again', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addUnit('BUD');
  const id = S().units[0].id;
  S().updateUnitParams(id, { joints_system: 'dowel' });
  const before = S().unitResult(id);
  assert.equal(before.derived.joints.system, 'dowel');
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  S().newProject();
  S().loadProject(saved.project, saved.units);
  const back = S().units.find((u) => u.id === id);
  assert.equal(back.params.joints_system, 'dowel');
  const after = S().unitResult(id);
  assert.deepEqual(after.drills, before.drills);
  assert.equal(after.derived.joints.dowels, before.derived.joints.dowels);
  // A project saved before tonight carries no key and cuts the puzzle.
  S().updateUnitParams(id, { joints_system: 'puzzle' });
  assert.equal(S().unitResult(id).drills.some((d) => d.kind === 'puzzle'), true);
});

test('F23 · the UI: PRO\'s Construction section offers Puzzle and Dowel, Cabineo refused, no typed number', () => {
  const rp = read('src/components/RightPanel.jsx');
  const row = rp.split('function JointsRow(')[1].split('\n}\n')[0];
  assert.match(rp, /<JointsRow\n/);
  assert.match(rp, /updateUnitParams\(unit\.id, \{ joints_system: system \}\)/);
  for (const k of ['puzzle', 'dowel', 'cabineo']) assert.match(row, new RegExp(`data-joints="${k}"`));
  assert.match(row, /data-joints="cabineo"\n\s+disabled\n/);
  assert.match(row, /title=\{CABINEO_REFUSAL\}/);
  assert.doesNotMatch(row, /NumberField|<input/, 'a typed number in the joints row');
  // PRO only: the retail copy of the element panel never learns the key.
  assert.doesNotMatch(read('src/components/ElementProperties.jsx'), /joints_system/);
  assert.doesNotMatch(read('src/retail/design/detail/ElementProperties.jsx'), /joints_system/);
  // The 3-D says it while the gate is shut.
  assert.match(read('src/3d/UnitView.jsx'), /result\?\.derived\?\.joints\?\.gate && \(/);
  assert.match(read('src/3d/UnitView.jsx'), /text="Dowels: proposed, not confirmed"/);
});

// ═══ THE GOLDEN ════════════════════════════════════════════════════════════

test('F23 · golden-dowel-bud.json is the cut, byte for byte; the six old goldens cannot reach it', () => {
  // T78 F19: re-pinned KNOWINGLY (node scripts/t75-goldens.mjs --write golden-dowel-bud.json) by the
  // owner's numbers of 11.10.2026: 26 dowels where T75's rule cut 44. The six old goldens carry no
  // joint system and cannot reach it.
  const file = JSON.parse(read('fixtures/golden-dowel-bud.json'));
  assert.equal(file.params.joints_system, 'dowel');
  assert.deepEqual(goldenOf(file.params, P), file.expected);
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) {
    assert.equal(defaultParamsFor(id, P).joints_system, undefined, `${id}'s defaults carry a joint system`);
  }
});

test('F23 · no em or en dash in anything this F wrote', () => {
  for (const rel of [
    'src/engine/dowels.js', 'scripts/t75-classify.d/f23.mjs', 'reference/hardware/cabineo/README.md',
    'test/turn75-f23-dowels.test.js',
  ]) {
    assert.doesNotMatch(read(rel), new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`), `${rel} carries a dash`);
  }
});
