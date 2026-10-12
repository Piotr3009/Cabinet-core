// ─── T78 F20 · THE CABINEO DATA: LAMELLO'S SHEET, EVERY NUMBER AS PRINTED ───
//
// CLAUDE.md T78 F20: *"THE DATA IS IN THE REPO:
// reference/hardware/cabineo/Operating_instructions_Cabineo.pdf (Lamello's
// own sheet, 2 pages; page 2 is the machining drawing). No fetching. Read it
// with a PDF reader and write reference/hardware/cabineo/cabineo.json ...
// every number as the sheet prints it, each with the page and the drawing it
// comes from, owner to confirm."*
//
// This file holds `cabineo.json` to the SHEET (read 11.10.2026: the text
// layer and both pages rendered at 400 dpi), so that no number is retyped
// from memory later. Where CLAUDE.md's expectation and the sheet's print
// differ, the sheet wins and the JSON's `notes` say so; the assertions below
// hold the sheet's numbers. Pure data: no engine import, no central file.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const J = JSON.parse(read('reference/hardware/cabineo/cabineo.json'));
const README = read('reference/hardware/cabineo/README.md');

test('F20 · the file has the house shape: system, units, source, status, and the three id sets CLAUDE.md names', () => {
  assert.equal(J.system, 'cabineo');
  assert.equal(J.units, 'mm');
  assert.equal(J.status, 'owner to confirm');
  assert.match(J.source.file, /Operating_instructions_Cabineo\.pdf$/);
  assert.equal(J.source.pages, 2);
  assert.match(J.source.document, /986320VS/);
  assert.deepEqual(Object.keys(J.variants), ['8', '12', '8M6']);
  assert.deepEqual(Object.keys(J.mountings), ['surface', 'flush', 'flushCap', 'hpl']);
  assert.deepEqual(J.machining.options, ['drill15', 'cutter10', 'cutter12']);
  assert.deepEqual(J.profileChoices.ids, {
    variants: ['8', '12', '8M6'], mountings: ['surface', 'flush', 'flushCap', 'hpl'], machining: ['drill15', 'cutter10', 'cutter12'],
  });
});

test('F20 · every number group carries pageOf (1 or 2) and a drawing that names where it is printed', () => {
  const groups = [];
  const walk = (node, path) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    if ('pageOf' in node && typeof node.pageOf !== 'object') groups.push([path, node]);
    for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
  };
  walk(J, 'J');
  // 38 groups on 11.10.2026 (8 connector, 16 variant, spacing, counterpartHole, 6 mounting, 6 machining); a group may be added, never dropped.
  assert.ok(groups.length >= 38, `only ${groups.length} groups carry pageOf`);
  for (const [path, g] of groups) {
    assert.ok(g.pageOf === 1 || g.pageOf === 2, `${path}.pageOf is ${g.pageOf}`);
    assert.equal(typeof g.drawing, 'string', `${path} has no drawing`);
    assert.ok(g.drawing.length > 20, `${path}.drawing is too short to name a drawing`);
  }
});

test('F20 · page 1: the connector, the torque, the spacing, the minimum panel thicknesses, the insert', () => {
  assert.deepEqual([J.connector.sizeMm.length, J.connector.sizeMm.width, J.connector.sizeMm.height], [33.8, 16.5, 10.8]);
  assert.equal(J.connector.sizeMm.pageOf, 1);
  assert.equal(J.connector.bodyHeightMm.value, 10);
  assert.equal(J.connector.cutterMaxDiaMm.value, 12);
  assert.equal(J.connector.installationToleranceMm.longitudinal, 0.1);
  assert.equal(J.connector.torque.valueNm, 2.5);
  assert.equal(J.connector.torque.qualifier, 'ca.');
  assert.equal(J.connector.torque.speed, 1);
  assert.ok(J.connector.claims.values.includes('no edge drilling'));

  assert.equal(J.spacing.edgeMinMm, 20);
  assert.equal(J.spacing.maxMm, 300);
  assert.equal(J.spacing.pageOf, 1);

  // The screw reach X: 8 / 12 / 8 (page 2 captions).
  assert.equal(J.variants['8'].screwReachXMm, 8);
  assert.equal(J.variants['12'].screwReachXMm, 12);
  assert.equal(J.variants['8M6'].screwReachXMm, 8);

  // Corner joints: the SHEET's numbers (9 / 13 / 14 for the panel that takes the screw, 12 for the board), not CLAUDE.md's "12 / 14".
  assert.equal(J.variants['8'].minPanelMm.cornerJoint.counterpartPanel, 9);
  assert.equal(J.variants['12'].minPanelMm.cornerJoint.counterpartPanel, 13);
  assert.equal(J.variants['8M6'].minPanelMm.cornerJoint.counterpartPanel, 14);
  for (const v of ['8', '12', '8M6']) assert.equal(J.variants[v].minPanelMm.cornerJoint.connectorBoard, 12, v);
  // Centre wall: as CLAUDE.md expects (16 / 24), and 14 to 16 for 8 M6.
  assert.equal(J.variants['8'].minPanelMm.centreWall.centrePanel, 16);
  assert.equal(J.variants['12'].minPanelMm.centreWall.centrePanel, 24);
  assert.equal(J.variants['8M6'].minPanelMm.centreWall.centrePanelMin, 14);
  assert.equal(J.variants['8M6'].minPanelMm.centreWall.centrePanelMax, 16);
  assert.equal(J.variants['8M6'].insert.lengthMm, 12.3);
  assert.ok(J.notes.some((n) => /corner joints from 12 \/ 14/i.test(n) || /Corner joints/.test(n)), 'the corner-joint difference is not noted');
});

test('F20 · page 1: the strength table, 19 mm panels, N, with the asterisk', () => {
  const s8 = J.variants['8'].strengthN, s12 = J.variants['12'].strengthN, s86 = J.variants['8M6'].strengthN;
  for (const s of [s8, s12, s86]) { assert.equal(s.panelMm, 19); assert.equal(s.pageOf, 1); assert.match(s.drawing, /asterisk/); }
  assert.deepEqual(s8.F1_tensile, { beech: 1530, mdf: 610, particleBoard: 520 });
  assert.deepEqual(s8.F2_shear, { beech: 1430, mdf: 680, particleBoard: 530 });
  assert.deepEqual(s8.F3_shear, { beech: 630, mdf: 460, particleBoard: 300 });
  assert.deepEqual(s12.F1_tensile, { beech: 2250, mdf: 980, particleBoard: 820 });
  assert.deepEqual(s12.F2_shear, { beech: 2350, mdf: 1120, particleBoard: 880 });
  assert.deepEqual(s12.F3_shear, { beech: 840, mdf: 490, particleBoard: 330 });
  assert.deepEqual(s86.F1_tensile, { beech: 2030, mdf: 900, particleBoard: 810 });
  assert.deepEqual(s86.F2_shear, { beech: 2150, mdf: 1500, particleBoard: 1210 });
  assert.deepEqual(s86.F3_shear, { beech: 690, mdf: 490, particleBoard: 350 });
});

test('F20 · page 2: the four mountings, pocket depth 11 / 11.5 / 13 / 11, the recesses 0.8 and 2.1, the floor 0.7 / 0.95 / 1, the axis 5 from the collar seat', () => {
  const M = J.mountings;
  assert.deepEqual([M.surface.pocketDepthMm, M.flush.pocketDepthMm, M.flushCap.pocketDepthMm, M.hpl.pocketDepthMm], [11, 11.5, 13, 11]);
  for (const k of Object.keys(M)) { assert.equal(M[k].axisFromCollarSeatMm, 5, k); assert.equal(M[k].pageOf, 2, k); }
  assert.deepEqual([M.surface.axisToFarFace, M.flush.axisToFarFace, M.flushCap.axisToFarFace, M.hpl.axisToFarFace], ['D-5', 'D-5.8', 'D-7.1', 'D-5']);
  assert.equal(M.surface.collarRecessDepthMm, null);
  assert.equal(M.flush.collarRecessDepthMm, 0.8);
  assert.equal(M.flushCap.capRecessDepthMm, 2.1);
  assert.equal(M.hpl.collarRecessDepthMm, null);
  assert.deepEqual([M.surface.floorDimensionMm, M.flush.floorDimensionMm, M.flushCap.floorDimensionMm, M.hpl.floorDimensionMm], [null, 0.7, 0.95, 1]);
  // Derived from the printed pairs (5 and D-5.8; 5 and D-7.1): the axis from the surface.
  assert.deepEqual([M.surface.derived.axisFromSurfaceMm, M.flush.derived.axisFromSurfaceMm, M.flushCap.derived.axisFromSurfaceMm, M.hpl.derived.axisFromSurfaceMm], [5, 5.8, 7.1, 5]);
  // The recess outlines: flush 16.7 wide (length not printed); cap 18.8 wide, r 9.4 at 26.25, 35.65 long.
  assert.equal(M.flush.recessOutline.widthMm, 16.7);
  assert.equal(M.flush.recessOutline.lengthMm, null);
  assert.deepEqual(
    [M.flushCap.recessOutline.widthMm, M.flushCap.recessOutline.endRadiusMm, M.flushCap.recessOutline.endCentreBeyondThirdLobeMm, M.flushCap.recessOutline.endCentreFromEndMm, M.flushCap.recessOutline.lengthMm],
    [18.8, 9.4, 0.25, 26.25, 35.65],
  );
  assert.equal(M.surface.recessOutline, null);
  assert.equal(M.hpl.recessOutline, null);
  // HPL is captioned for Cabineo 8 M6 only; the three standard bands name all three.
  assert.deepEqual(M.hpl.variants, ['8M6']);
  for (const k of ['surface', 'flush', 'flushCap']) assert.deepEqual(M[k].variants, ['8', '12', '8M6'], k);
});

test('F20 · page 2: the three machining options, the standard bands and the HPL band', () => {
  const { drill15, cutter10, cutter12 } = J.machining;
  // Option 1: three dia 15 holes, 3.6 from the end, pitch 11.2 (HPL: 15.2, 3.5, 11.2).
  assert.deepEqual([drill15.standard.holes, drill15.standard.diaMm, drill15.standard.firstCentreFromEndMm, drill15.standard.pitchMm], [3, 15, 3.6, 11.2]);
  assert.deepEqual(drill15.standard.derived.centresFromEndMm, [3.6, 14.8, 26]);
  assert.deepEqual([drill15.hpl.diaMm, drill15.hpl.firstCentreFromEndMm, drill15.hpl.pitchMm], [15.2, 3.5, 11.2]);
  assert.deepEqual(drill15.hpl.derived.centresFromEndMm, [3.5, 14.7, 25.9]);
  // Option 2: lobes dia 15 at 3.6 / 14.8 / 26, waists 9.2 / 20.4, half-heights 5 (waist) and 6.6 (end).
  assert.deepEqual([cutter10.tool.diaMinMm, cutter10.tool.diaMaxMm], [10, 12]);
  assert.deepEqual(cutter10.standard.lobeCentresFromEndMm, [3.6, 14.8, 26]);
  assert.deepEqual(cutter10.standard.waistsFromEndMm, [9.2, 20.4]);
  assert.deepEqual([cutter10.standard.lobeDiaMm, cutter10.standard.halfHeightAtWaistMm, cutter10.standard.halfHeightAtEndMm], [15, 5, 6.6]);
  assert.deepEqual(cutter10.hpl.lobeCentresFromEndMm, [3.5, 14.7, 25.9]);
  assert.deepEqual(cutter10.hpl.waistsFromEndMm, [9.1, 20.3]);
  assert.deepEqual([cutter10.hpl.lobeDiaMm, cutter10.hpl.halfHeightAtWaistMm, cutter10.hpl.halfHeightAtEndMm], [15.2, 5.2, 6.6]);
  // Option 3: the same lobes, a 12 mm channel (half 6), reliefs at 8.1 and 19.3 each 2.2, F3 -13 %.
  assert.equal(cutter12.tool.diaMm, 12);
  assert.deepEqual(cutter12.standard.lobeCentresFromEndMm, [3.6, 14.8, 26]);
  assert.deepEqual([cutter12.standard.channelHeightMm, cutter12.standard.halfHeightAtChannelMm, cutter12.standard.halfHeightAtEndMm], [12, 6, 6.6]);
  assert.deepEqual(cutter12.standard.reliefs, [{ fromEndMm: 8.1, lengthMm: 2.2 }, { fromEndMm: 19.3, lengthMm: 2.2 }]);
  assert.equal(cutter12.standard.shearStrengthF3, '-13 %');
  assert.deepEqual(cutter12.hpl.reliefs, [{ fromEndMm: 8.2, lengthMm: 1.8 }, { fromEndMm: 19.3, lengthMm: 1.8 }]);
  assert.deepEqual([cutter12.hpl.channelHeightMm, cutter12.hpl.halfHeightAtChannelMm, cutter12.hpl.halfHeightAtEndMm], [12, 6, 6.8]);
  // The printed numbers agree with three dia 15 circles at those centres (the JSON's own consistency line is arithmetic, re-done here).
  const r = 7.5, c = [3.6, 14.8, 26];
  const half = (c[1] - c[0]) / 2;
  assert.equal(Math.round(Math.sqrt(r * r - half * half) * 10) / 10, 5);
  assert.equal(Math.round(Math.sqrt(r * r - c[0] * c[0]) * 10) / 10, 6.6);
  const dx = Math.sqrt(r * r - 36);
  assert.equal(Math.round((c[0] + dx) * 10) / 10, 8.1);
  assert.equal(Math.round((c[1] - dx - (c[0] + dx)) * 10) / 10, 2.2);
  assert.equal(Math.round((c[1] + dx) * 10) / 10, 19.3);
});

test('F20 · the counterpart hole: dia 5 in the FACE of the side, its depth NOT on the sheet (D-5 is not it)', () => {
  assert.equal(J.counterpartHole.diaMm, 5);
  assert.equal(J.counterpartHole.depthMm, null);
  assert.match(J.counterpartHole.depthNote, /D-5 mm.*NOT this hole's depth/);
  assert.match(J.counterpartHole.position, /FACE of the counterpart panel/);
});

test('F20 · nothing invented: every article is null and says so; 186310 is not written as the sheet\'s', () => {
  for (const v of ['8', '12', '8M6']) {
    assert.equal(J.variants[v].article, null, v);
    assert.match(J.variants[v].articleNote, /prints no article/);
  }
  for (const k of ['connector8', 'connector12', 'connector8M6', 'insert8M6', 'cap']) assert.equal(J.articles[k], null, k);
  assert.match(J.articles.sheetPrints, /986320VS/);
  assert.match(J.articles.note, /186310/);
  assert.equal(J.cap.article, null);
  assert.equal(J.cap.sizeMm, null);
  // 186310 is never a VALUE in the file: it appears only inside sentences saying the sheet does not name it.
  const leaves = [];
  const walk = (node, path) => {
    if (node && typeof node === 'object') { for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`); return; }
    leaves.push([path, node]);
  };
  walk(J, 'J');
  for (const [path, v] of leaves) {
    assert.notEqual(String(v), '186310', `${path} carries 186310 as a value`);
    if (typeof v === 'string' && v.includes('186310')) {
      assert.match(v, /not on page 1|does not name|names no connector article|not on it|is not written/, `${path} names 186310 without saying the sheet does not`);
    }
  }
  assert.ok(leaves.some(([, v]) => typeof v === 'string' && v.includes('186310')), 'the file should say why 186310 is missing');
});

test('F20 · the owner\'s inverted side (11.10.2026) is written as his, decided: no edge drilling, the pocket from the OUTSIDE face, the 5 mm hole in the side\'s face from the inside', () => {
  assert.match(J.owner.by, /11\.10\.2026/);
  assert.match(J.owner.by, /decided, not proposed/);
  assert.match(J.owner.noEdgeDrilling, /NO panel edge/);
  assert.match(J.owner.pocketCutFrom.top, /OUTSIDE face, from above/);
  assert.match(J.owner.pocketCutFrom.bottom, /OUTSIDE face, from below/);
  assert.match(J.owner.pocketCutFrom.fixedShelf, /underside/);
  assert.match(J.owner.counterpartHole, /FACE of the side, from the inside/);
  assert.equal(J.owner.machinedFace, 'outside');
  assert.match(J.owner.export, /x' = W - x/);
  assert.match(J.owner.export, /OUTSIDE FACE UP/);
  assert.match(J.owner.setOut, /endOffsetMm 50/);
  assert.match(J.owner.setOut, /pitchMm 250/);
  assert.match(J.owner.skinCheck, /MIN_SKIN 3 mm/);
  // The profile's choices are pointed at, not duplicated as numbers here.
  assert.match(J.profileChoices.note, /src\/engine\/profile\.js/);
  assert.match(J.profileChoices.note, /flushCap/);
  assert.match(J.profileChoices.note, /cutter12/);
});

test('F20 · the README says the data is here, names the three variants, the JSON, and what the sheet does not print', () => {
  assert.match(README, /Cabineo 8\b/);
  assert.match(README, /Cabineo 12/);
  assert.match(README, /8 M6/);
  assert.match(README, /cabineo\.json/);
  assert.match(README, /Operating_instructions_Cabineo\.pdf/);
  assert.match(README, /186310/);
  assert.match(README, /not on the sheet/i);
  assert.doesNotMatch(README, /holds no data yet/);
});

test('F20 · no em or en dash in anything this F wrote', () => {
  for (const rel of ['reference/hardware/cabineo/cabineo.json', 'reference/hardware/cabineo/README.md', 'test/turn78-f20-cabineo-data.test.js']) {
    assert.doesNotMatch(read(rel), new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`), `${rel} carries a dash`);
  }
});
