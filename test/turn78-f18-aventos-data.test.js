// ─── T78 F18 · THE AVENTOS DATA: HK top, HS top, HL top, HF top, READ FROM OUTSIDE ──
//
// CLAUDE.md T78 F18: *"the lift arms are the hardware, drilled NOTHING until the
// catalogue's fixing pattern is in reference/hardware/aventos.json with its page
// (extend the file; the power-unit selection it already holds decides the
// article ...)"* and the T78 preamble: *"Numbers enter the engine ONLY through
// reference/hardware/*.json with the catalogue page beside each, marked owner
// to confirm."*
//
// On 11.10.2026 no Blum host, no dealer host and not even example.com could be
// opened from the build container (WebFetch: getaddrinfo ENOTFOUND for every
// host; curl: 403 to CONNECT at the egress proxy), so the `t78_f18` key of
// aventos.json was written from web-search snippets of the named catalogue
// URLs and says so in `source.read`. This test holds the file to THAT
// discipline, exactly as test/turn78-f07-f15-f16-box-data.test.js holds the
// box files: the six T19 keys first and byte-for-byte in meaning, the new key
// last; `owner to confirm` everywhere; a URL or a catalogue page beside every
// printed number; a value nobody printed is null with a sentence; the owner's
// numbers never silently invented; no dash character anywhere.
// Pure data: no engine import, no central file.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const REL = 'reference/hardware/aventos.json';
const RAW = readFileSync(new URL(`../${REL}`, import.meta.url), 'utf8');
const J = JSON.parse(RAW);
const F = J.t78_f18;

test('F18 · the six T19 keys come first and the new key last; the T19 numbers the engine reads are what they were', () => {
  assert.deepEqual(Object.keys(J), ['system', 'units', 'power_units_hk_top', 'board_kg_m2', 'rules', 'items', 't78_f18']);
  assert.equal(J.system, 'aventos');
  assert.equal(J.units, 'mm');
  assert.deepEqual(J.power_units_hk_top.map((u) => [u.unit, ...u.pf]), [
    [2300, 420, 1610], [2500, 930, 2800], [2700, 1730, 5200], [2900, 3200, 9000],
  ]);
  assert.deepEqual(J.rules.hk_limits, { cabinet_height_mm: [205, 600], cabinet_width_max_mm: 1800, inner_depth_min_mm: 261 });
  assert.equal(J.items.length, 29, 'the GLB component list is untouched');
});

test('F18 · the new key has the house shape: status, source (catalogue, read, caveat, pages), then data', () => {
  assert.deepEqual(Object.keys(F).slice(0, 2), ['status', 'source']);
  assert.equal(F.status, 'owner to confirm');
  assert.match(F.source.catalogue, /publications\.blum\.com\/2024\/catalogue\/en\//);
  assert.match(F.source.read, /403 to CONNECT/, 'the file must say how it was read');
  assert.match(F.source.read, /ENOTFOUND/, 'and that WebFetch resolved nothing');
  assert.ok(Object.keys(F.source.pages).length >= 12, `fewer than twelve catalogue pages named: ${Object.keys(F.source.pages).length}`);
  for (const k of ['en/22', 'en/23', 'en/34', 'en/40', 'en/50', 'en/572', 'en/673']) {
    assert.ok(F.source.pages[k], `page ${k} is named`);
  }
  assert.deepEqual(Object.keys(F.systems), ['hk', 'hs', 'hl', 'hf'], 'the four front motions of CLAUDE.md F18, in its order');
});

test('F18 · no em dash and no en dash anywhere in the file (CLAUDE.md law)', () => {
  assert.equal(RAW.includes(String.fromCharCode(0x2014)), false, 'em dash');
  assert.equal(RAW.includes(String.fromCharCode(0x2013)), false, 'en dash');
});

test('F18 · every object in t78_f18 that prints a number also names where it was read', () => {
  const offenders = [];
  const walk = (node, path, inherited) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`, inherited)); return; }
    const has = (k) => Object.prototype.hasOwnProperty.call(node, k);
    const here = inherited || has('url') || has('printed') || has('page') || has('note') || has('source') || has('reading') || has('status') || has('see') || has('formula');
    const numeric = Object.entries(node).filter(([, v]) => typeof v === 'number');
    if (numeric.length && !here) offenders.push(`${path} prints ${numeric.map(([k]) => k).join(', ')} with no source beside it`);
    for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`, here);
  };
  walk(F, 't78_f18', false);
  assert.deepEqual(offenders, []);
});

test('F18 · a value nobody printed is null WITH a sentence, never a number from memory', () => {
  const nulls = [];
  const walk = (node, path) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`)); return; }
    if (Object.prototype.hasOwnProperty.call(node, 'value') && node.value === null) {
      nulls.push(path);
      assert.equal(typeof node.note, 'string', `${path}: null without a note`);
      assert.ok(node.note.length > 30, `${path}: the note does not say what is missing`);
    }
    for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
  };
  walk(F, 't78_f18');
  // 11.10.2026: the HK top hole positions (both fixings), the bracket holes on every leaf, the HS and HL hole
  // positions, the HS and HL keyframes, the HL space above, the HF datum, the centre hinge cup depth and
  // counterpart, the HF fold angle, the HS 2026 formula, the universal template article, among others.
  assert.ok(nulls.length >= 18, `only ${nulls.length} honest nulls; the file is not that complete`);
});

test('F18 · HK top: the ladder the engine already has is the 2024 catalogue ladder, cited; opening angle 75 to 107; 18 kg; three depths', () => {
  const K = F.systems.hk;
  assert.deepEqual(K.liftMechanismSets.map((s) => [s.set, s.existingUnit, ...s.powerFactorLF]), [
    ['22K2300', 2300, 420, 1610], ['22K2500', 2500, 930, 2800], ['22K2700', 2700, 1730, 5200], ['22K2900', 2900, 3200, 9000],
  ]);
  for (const s of K.liftMechanismSets) assert.match(s.url, /^https:\/\//, `${s.set} carries a URL`);
  assert.deepEqual(K.cabinet.heightKHMm.value, [205, 600]);
  assert.equal(K.cabinet.widthKBMaxMm.value, 1800);
  assert.equal(K.cabinet.internalDepthLTMinMm.standard.value, 187);
  assert.equal(K.cabinet.internalDepthLTMinMm.servoDrive.value, 235);
  assert.equal(K.cabinet.internalDepthLTMinMm.visibleWallHangingBracket.value, 261, 'the existing 261 is the visible-bracket case');
  assert.match(K.cabinet.internalDepthLTMinMm.existingKeyNote, /stays 261/);
  assert.equal(K.frontWeightMaxKg.value, 18);
  assert.deepEqual(K.openingAngleDeg.value, [75, 107]);
  assert.equal(K.fixingLiftMechanism.preMountedSystemScrews.gridMm, 32);
  assert.equal(K.fixingLiftMechanism.preMountedSystemScrews.holePositions.value, null, 'no hole comes from this file');
  assert.equal(K.fixingLiftMechanism.chipboardScrews.drillingDepthMm, 11.5);
  assert.equal(K.fixingLiftMechanism.chipboardScrews.holePositions.value, null);
  assert.equal(K.frontFixingBracket.holePositionsOnLeaf.value, null);
  assert.deepEqual(K.frontFixingBracket.articles, ['20S4200', '20S4200A', '20S42T1', '20S42E1']);
  assert.equal(K.coverCaps.standard.article, '22K8000');
  assert.equal(K.coverCaps.servoDrive.article, '23K8000');
  assert.equal(K.planning.spaceRequirementY.formula, 'Y = FH x 0.29 + FD minus SOB');
  assert.deepEqual(K.planning.spaceRequirementXByFrontThickness.table, { 16: 68, 19: 57, 22: 47, 26: 33, 28: 27 });
  assert.deepEqual(K.animation.keyframes, [{ t: 0, rotateDeg: 0 }, { t: 1, rotateDeg: 107 }]);
  assert.match(K.animation.openDeg.status, /owner to confirm/);
});

test('F18 · HS top: three sets by cabinet height AND front weight, one lever arm 350 to 800, no angle, keyframes null', () => {
  const S = F.systems.hs;
  assert.deepEqual(S.cabinet.heightKHMm.value, [350, 800]);
  assert.equal(S.cabinet.internalDepthLTMinMm.value, 264);
  assert.deepEqual(S.liftMechanismSets.map((s) => s.set), ['22S2200', '22S2500', '22S2800']);
  assert.deepEqual(S.liftMechanismSets[0].bands, [
    { cabinetHeightKHMm: [350, 450], frontWeightFGKg: [2, 11.5] },
    { cabinetHeightKHMm: [450, 540], frontWeightFGKg: [2.5, 12.5] },
  ]);
  assert.deepEqual(S.liftMechanismSets[1].bands, [{ cabinetHeightKHMm: [480, 660], frontWeightFGKg: [2.75, 15.25] }]);
  assert.deepEqual(S.liftMechanismSets[2].bands, [{ cabinetHeightKHMm: [650, 800], frontWeightFGKg: [3.5, 18.5] }]);
  assert.equal(S.leverArm.set, '22S3500');
  assert.deepEqual(S.leverArm.cabinetHeightKHMm, [350, 800]);
  assert.equal(S.openingAngleDeg.value, null);
  assert.equal(S.animation.keyframes.value, null);
  assert.deepEqual(S.planning.spaceRequirementCornice2022.table.map((r) => [r.gapFMm, r.xMaxMm, r.yMaxMm]), [[3, 35, 101], [2, 31, 101], [1.5, 28, 101]]);
  assert.equal(S.fixingLiftMechanism.holePositions.value, null);
});

test('F18 · HL top: two sets, four lever arms, space above in words only, keyframes null', () => {
  const L = F.systems.hl;
  assert.deepEqual(L.cabinet.heightKHMm.value, [300, 580]);
  assert.equal(L.cabinet.internalDepthLTMinMm.value, 264);
  assert.deepEqual(L.liftMechanismSets.map((s) => [s.set, ...s.cabinetHeightKHMm, ...s.frontWeightFGKg]), [
    ['22L2200', 300, 389, 1.5, 9], ['22L2500', 390, 580, 1.75, 10],
  ]);
  assert.deepEqual(L.leverArms.map((a) => [a.set, ...a.cabinetHeightKHMm]), [
    ['22L3200', 300, 340], ['22L3500', 340, 390], ['22L3800', 390, 540], ['22L3900', 480, 580],
  ]);
  assert.deepEqual(L.frontWeightBandsTD145.bands.map((b) => [...b.cabinetHeightKHMm, ...b.frontWeightFGKg]), [
    [300, 339, 1.5, 9], [340, 389, 1.75, 10], [390, 540, 2, 12.25], [480, 580, 2.5, 14],
  ]);
  assert.equal(L.planning.spaceRequirementAboveMm.value, null);
  assert.equal(L.animation.keyframes.value, null);
  assert.equal(L.fixingLiftMechanism.holePositions.value, null);
});

test('F18 · HF top: three LF bands, 81 to 116, three lever arms with LH, the H / X / Y table with its datum null, the hinges, the fold null', () => {
  const H = F.systems.hf;
  assert.deepEqual(H.cabinet.heightKHMm.value, [480, 1200]);
  assert.equal(H.cabinet.internalDepthLTMinMm.value, 264);
  assert.deepEqual(H.liftMechanismSets.map((s) => [s.set, ...s.powerFactorLF]), [
    ['22F2200', 1350, 6750], ['22F2500', 2700, 13500], ['22F2800', 10000, 19300],
  ]);
  assert.match(H.liftMechanismSets[0].reading, /22F2211/, 'the 2200 band is a reading and says so');
  assert.deepEqual(H.openingAngleDeg.value, [81, 116]);
  assert.deepEqual(H.leverArms.map((a) => [a.set, ...a.cabinetHeightKHMm, a.minLeverArmSpaceLHMm]), [
    ['22F3200', 480, 610, 443], ['22F3500', 600, 910, 512], ['22F3900', 840, 1200, 632],
  ]);
  const D = H.drillingPositionsLiftMechanism;
  assert.deepEqual(D.systemScrews.table, [
    { cabinetHeightKHMm: [480, 519], H: 93.5, X: 38.5, Y: 102 },
    { cabinetHeightKHMm: [520, 1200], H: 116, X: 38.5, Y: 124 },
  ]);
  assert.deepEqual(D.chipboardScrews.table.map((r) => r.H), [93, 115.5]);
  assert.equal(D.datum.value, null, 'the drawing datum was not read, so no hole comes from this table');
  // hinges: the upper leaf on the top panel, the centre hinge between the leaves
  assert.equal(H.hinges.upperFrontToTopPanel.sets.insertaEDowel.article, '78Z5530T');
  assert.equal(H.hinges.upperFrontToTopPanel.cup.diameterMm, 35);
  assert.equal(H.hinges.upperFrontToTopPanel.cup.drillingDistanceTB.value, null);
  assert.deepEqual(H.hinges.upperFrontToTopPanel.count.rule, { threeAt: { widthKBMm: 1200, frontWeightKg: 12 }, fourAt: { widthKBMm: 1800, frontWeightKg: 20 } });
  assert.equal(H.hinges.centreHinge.articles.expando.article, '78Z553ET');
  assert.equal(H.hinges.centreHinge.articles.screwOn.article, null);
  assert.equal(H.hinges.centreHinge.openingAngleDeg.value, 134);
  assert.equal(H.hinges.centreHinge.cupPattern.cupDiameterMm.value, 35);
  assert.equal(H.hinges.centreHinge.cupPattern.screwHoleSpacingMm.value, 45);
  assert.deepEqual(H.hinges.centreHinge.cupPattern.drillingDistanceMm.value, [3, 6]);
  assert.equal(H.hinges.centreHinge.cupPattern.cupDepthMm.value, null);
  assert.equal(H.planning.spaceRequirementY2022.withoutStop, 'Y max = FHo x 0.44 + 38');
  assert.equal(H.planning.spaceRequirementY2022.stop104, 'Y max = FHo x 0.24 + 34');
  assert.equal(H.animation.upperLeafOpenDeg.full, 116);
  assert.equal(H.animation.foldAngleDeg.value, null);
  assert.deepEqual(H.animation.keyframes, [{ t: 0, upperRotateDeg: 0, foldDeg: 0 }, { t: 1, upperRotateDeg: 116, foldDeg: null }]);
});

test('F18 · the shared parts: the formula, the +50 percent, the overlap conflict named, the brackets, the two cover cap sets', () => {
  const S = F.shared;
  assert.match(S.powerFactor.formula, /KH \(mm\) x front weight FG \(kg\)/);
  assert.equal(S.thirdMechanism.pctIncrease, 50);
  assert.match(S.overlapRule.engineConflict, /SMALLER unit/, 'the catalogue says the opposite of T19 F5.2 and the file says so');
  assert.equal(S.frontFixingBrackets.woodAndWideAlu.article, '20S4200');
  assert.equal(S.frontFixingBrackets.narrowAlu.article, '20S4200A');
  assert.equal(S.frontFixingBrackets.markingTemplate.article, 'ZML.2200');
  assert.equal(S.frontFixingBrackets.holePositionsOnLeaf.value, null);
  assert.equal(S.coverCapsTop.standard.article, '22.8000');
  assert.equal(S.coverCapsTop.servoDrive.article, '23.8000');
  assert.equal(S.templates.hingeDrilling.article, '65.055A');
  assert.equal(S.templates.universalDrilling.article, null);
  assert.match(F.engineNotes.noHoles, /never a hole/);
});
