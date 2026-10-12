// ─── T78 F7 / F15 / F16 · THE BOX SYSTEM DATA: BLUM, READ FROM OUTSIDE ──────
//
// CLAUDE.md T78: *"Source of hardware numbers: the Blum catalogue 2024/25
// online ... Numbers enter the engine ONLY through reference/hardware/*.json
// with the catalogue page beside each, marked owner to confirm."*  F7 wants
// `blum-space-corner.json`, F16 `blum-inner-drawer.json`, F15 Blum's inner
// front dimensions (`blum-inner-front.json`).
//
// On 11.10.2026 no Blum host could be opened from the build container (the
// egress proxy answers 403 to CONNECT for publications.blum.com, www.blum.com,
// d2.blum.com and every dealer host; WebFetch cannot resolve them), so the
// three files were written from web-search snippets of the named URLs and
// say so in `source.read`. This test holds the files to THAT discipline: the
// house shape, `owner to confirm` everywhere, a URL or a catalogue page beside
// every printed number, the owner's words never silently invented (a value
// nobody printed is null with a sentence), and no dash character anywhere.
// Pure data: no engine import, no central file.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const FILES = {
  spaceCorner: 'reference/hardware/blum-space-corner.json',
  innerDrawer: 'reference/hardware/blum-inner-drawer.json',
  innerFront: 'reference/hardware/blum-inner-front.json',
};
const RAW = Object.fromEntries(Object.entries(FILES).map(([k, rel]) => [k, read(rel)]));
const J = Object.fromEntries(Object.entries(RAW).map(([k, txt]) => [k, JSON.parse(txt)]));

test('T78 box data · the three files have the house shape of aventos.json and cliptop-hinges.json: system, units, status, source, then data', () => {
  for (const [k, j] of Object.entries(J)) {
    const keys = Object.keys(j);
    assert.deepEqual(keys.slice(0, 4), ['system', 'units', 'status', 'source'], `${k}: ${keys.slice(0, 4)}`);
    assert.equal(j.units, 'mm', k);
    assert.equal(j.status, 'owner to confirm', k);
    assert.match(j.source.catalogue, /publications\.blum\.com\/2024\/catalogue\/en\//, k);
    assert.match(j.source.read, /403 to CONNECT/, `${k}: the file must say how it was read`);
    assert.ok(Object.keys(j.source.pages).length >= 5, `${k}: fewer than five catalogue pages named`);
  }
  assert.equal(J.spaceCorner.system, 'space_corner');
  assert.equal(J.innerDrawer.system, 'legrabox_inner_drawer');
  assert.equal(J.innerFront.system, 'legrabox_inner_front');
});

test('T78 box data · no em dash and no en dash in any of the three files (CLAUDE.md law)', () => {
  for (const [k, txt] of Object.entries(RAW)) {
    assert.equal(txt.includes(String.fromCharCode(0x2014)), false, `${k} has an em dash`);
    assert.equal(txt.includes(String.fromCharCode(0x2013)), false, `${k} has an en dash`);
  }
});

test('T78 box data · every object that prints a number also names where it was read (url, page, printed, how or a null note)', () => {
  const offenders = [];
  const walk = (node, path, inherited) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    const has = (k) => Object.prototype.hasOwnProperty.call(node, k);
    const here = inherited || has('url') || has('printed') || has('page') || has('catalogue2024') || has('how') || has('note') || has('source') || has('reading');
    const numeric = Object.entries(node).filter(([, v]) => typeof v === 'number');
    if (numeric.length && !here) offenders.push(`${path} prints ${numeric.map(([k]) => k).join(', ')} with no source beside it`);
    for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`, here);
  };
  for (const [k, j] of Object.entries(J)) walk(j, k, false);
  assert.deepEqual(offenders, []);
});

test('T78 box data · a value nobody printed is null WITH a sentence, never a number from memory', () => {
  const nulls = [];
  const walk = (node, path) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    if (Object.prototype.hasOwnProperty.call(node, 'value') && node.value === null) {
      nulls.push(path);
      assert.equal(typeof node.note, 'string', `${path}: null without a note`);
      assert.ok(node.note.length > 30, `${path}: the note does not say what is missing`);
    }
    for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
  };
  for (const [k, j] of Object.entries(J)) walk(j, k);
  // 11.10.2026: the LEGRABOX pairing of SPACE CORNER, the leaves' mitre, the corner element envelope, K / N / F inner drawer data, the pair's minimum front height, among others.
  assert.ok(nulls.length >= 12, `only ${nulls.length} honest nulls; the files are not that complete`);
});

test('F7 · SPACE CORNER: the kit as Blum prints it', () => {
  const S = J.spaceCorner;
  assert.deepEqual([S.cabinet.recommendedWidthMm.min, S.cabinet.recommendedWidthMm.max], [900, 1200]);
  assert.equal(S.cabinet.minimumWidthMm.value, null);
  assert.deepEqual(S.cabinet.usCornerCabinetSizesInch.values, [33, 36, 39, 42]);
  assert.equal(S.cabinet.depth.drawerNominalLengthMm.value, 650);
  assert.equal(S.cabinet.depth.minInternalDepthMm.value, 'NL + 75');

  const M = S.variants.movento_wooden_drawer;
  assert.equal(M.runner.article, '769.6860S');
  assert.equal(M.runner.nominalLengthMm.value, 686);
  assert.match(M.runner.nominalLengthMm.how, /27/);
  assert.equal(M.runner.euMoventoArticle.value, null);
  assert.deepEqual(M.lockingDevice.articles, { right: 'T51.7601 R', left: 'T51.7601 L' });
  assert.equal(M.lockingDevice.minInsideDrawerWidthMm, 170);
  assert.equal(M.lockingDevice.sideAdjustmentMm, 1.5);
  assert.equal(M.maxDrawerSideThicknessMm.value, 16);
  assert.deepEqual(M.predecessor.articles, { sideFiveEighths: '569.6860B', sideThreeQuarters: '569A6860B' });

  const Z = S.variants.tandembox_antaro_syncromotion;
  assert.equal(Z.sets.M.article, 'Z33M00E0A6');
  assert.equal(Z.sets.M.spaceRequirementHeightMm, 101.5);
  assert.equal(Z.sets.D.article, 'Z33D00E0A6');
  assert.equal(Z.sets.D.spaceRequirementHeightMm, 228);
  assert.equal(Z.sets.D.frontClearanceMm.value, 3);
  assert.equal(Z.sets.C.article, null);
  assert.equal(Z.trigger.articles.right, 'Z33.005-01');
  assert.deepEqual(
    [Z.tandemboxAntaroDrawerSideHeightsMm.N, Z.tandemboxAntaroDrawerSideHeightsMm.M, Z.tandemboxAntaroDrawerSideHeightsMm.K, Z.tandemboxAntaroDrawerSideHeightsMm.C, Z.tandemboxAntaroDrawerSideHeightsMm.D],
    [69, 84, 116, 171, 203],
  );
  assert.equal(S.variants.tandembox_fixed_corner_front_sets.sets.M.article, 'ZSF.340E.M1');
  assert.equal(S.variants.legrabox.article, null, 'no Blum source pairs SPACE CORNER with LEGRABOX');

  // Fronts: two leaves per row; the mitre is nobody's number; the body is a placeholder.
  assert.equal(S.fronts.leavesPerRow.value, 2);
  assert.equal(S.fronts.shape.meetingEdgeMitre.value, null);
  assert.equal(S.cornerElement.holes, 'none drilled by the engine (CLAUDE.md T78 law: a bought mechanism is a line and a body, never a hole, until its manufacturer\'s drilling is here with a page number; no drilling pattern was read)');
  assert.match(S.bodyPlaceholder.status, /placeholder/);
  assert.deepEqual([S.bodyPlaceholder.footprintMm.x, S.bodyPlaceholder.footprintMm.z], [75, 75]);
  assert.equal(S.bodyPlaceholder.readiness, 'bought');
  // The catalogue pages CLAUDE.md asks for, as far as the index showed them.
  assert.ok(S.source.pages['en/687'].includes('65.1106'));
  assert.ok(S.source.pages['en/292'].includes('SPACE CORNER with SYNCROMOTION'));
});

test('F16 · the inner drawer: LEGRABOX heights, lengths, space requirements, and the pair sum stays derived', () => {
  const D = J.innerDrawer;
  assert.deepEqual([D.legraboxHeightsMm.N, D.legraboxHeightsMm.M, D.legraboxHeightsMm.K, D.legraboxHeightsMm.C, D.legraboxHeightsMm.F], [66.5, 90.5, 128.5, 177, 241]);
  assert.deepEqual(D.nominalLengthsMm.values, [270, 300, 350, 400, 450, 500, 550, 600, 650]);
  assert.equal(D.innerDrawers.M.webCode, 'DQBPDA');
  assert.equal(D.innerDrawers.M.catalogue2024, 'en/204');
  assert.equal(D.innerDrawers.M.spaceRequirementInCabinetMm.value, 109);
  assert.equal(D.innerDrawers.M.latchSet.article, 'ZI7.0M07');
  assert.equal(D.innerDrawers.M.latchSet.fromHeightMm, 71);
  assert.equal(D.innerDrawers.K.webCode, 'DQGPIM');
  assert.equal(D.innerDrawers.K.catalogue2024, 'en/208');
  assert.equal(D.innerDrawers.K.spaceRequirementInCabinetMm.value, null);
  assert.equal(D.innerDrawers.N.value, null);
  assert.equal(D.innerDrawers.C_innerPullOut.spaceRequirementInCabinetMm.value, 191);
  assert.equal(D.innerDrawers.F_innerPullOut.spaceRequirementInCabinetMm.value, null);
  assert.equal(D.deepPullOutBelow.C.spaceRequirementInCabinetMm.value, 193);
  assert.equal(D.deepPullOutBelow.M_drawer.spaceRequirementInCabinetMm.value, 106);
  assert.equal(D.planning.minInternalCabinetDepth.value, 'NL + 3');
  assert.equal(D.planning.tipOnMinFrontGapMm.value, 2.5);
  // The pair's minimum is the SUM of two printed space requirements and nothing else.
  assert.equal(D.derived.stackMinimumMm.C_below_M_above.value, 193 + 109);
  assert.equal(D.derived.stackMinimumMm.C_below_C_above.value, 193 + 191);
  assert.equal(D.derived.stackMinimumMm.F_below_M_above.value, null);
  assert.match(D.derived.stackMinimumMm.status, /derived, owner to confirm/);
  assert.equal(D.arrangement.minimumFrontHeightRule.value, null, 'Blum\'s own minimum front height for the pair was not read');
  assert.equal(D.derived.clearanceBetweenBoxes.value, null);
  assert.equal(D.articles.cabinetProfiles.value, null);
  assert.deepEqual(D.tandemboxAlternative.innerPullOutGalleryC.spaceRequirementMm, 192);
  assert.deepEqual(D.tandemboxAlternative.innerPullOutGalleryD.spaceRequirementMm, 224);
});

test('F15 · the inner front: the front piece, its cut rule, its heights, and the engine proposal kept apart from Blum', () => {
  const F = J.innerFront;
  assert.equal(F.frontPiece.withoutGroove.article, 'ZV7.1043C01');
  assert.equal(F.frontPiece.withoutGroove.lengthMm, 1043);
  assert.equal(F.frontPiece.withoutGroove.heightMm.value, 98);
  assert.equal(F.frontPiece.withoutGroove.catalogue2024, 'en/208');
  assert.equal(F.frontPiece.withGroove.article, 'ZV7.1043MN1');
  assert.equal(F.frontPiece.withGroove.heightMm.value, 48);
  assert.equal(F.frontPiece.withGroove.cutRule.value, null);
  assert.equal(F.widthRule.frontPieceCutLength.value, 'LW - 126');
  assert.equal(F.widthRule.maxCabinetWidthMm.value, 1200);
  assert.equal(F.widthRule.relativeToBoxWidth.value, null, 'no Blum overhang over the box; nothing derived in its place');
  assert.deepEqual([F.widthRule.engineProposal.overhangMm, F.widthRule.engineProposal.heightMm], [0, 'box side height']);
  assert.match(F.widthRule.engineProposal.status, /T78 proposed/);
  assert.match(F.widthRule.engineProposal.status, /not a Blum number/);
  assert.equal(F.heightsPerBoxHeight.M.frontPieceHeightMm, 98);
  assert.equal(F.heightsPerBoxHeight.M.spaceRequirementInCabinetMm, 109);
  assert.deepEqual(F.heightsPerBoxHeight.M.fixingSet, ['ZI7.0MS0', 'ZI7.0MI0']);
  assert.equal(F.heightsPerBoxHeight.K.innerDrawerOverallHeightMm.value, null);
  assert.deepEqual(F.heightsPerBoxHeight.K.fixingSet, ['ZI7.0KS0', 'ZI7.0KI0']);
  assert.equal(F.heightsPerBoxHeight.C_crossGallery.innerDrawerOverallHeightMm.value, 185);
  assert.equal(F.heightsPerBoxHeight.C_crossGallery.spaceRequirementInCabinetMm, 191);
  assert.deepEqual(F.heightsPerBoxHeight.C_crossGallery.fixingSet, ['ZI7.3CS0', 'ZI7.3CI0']);
  assert.equal(F.heightsPerBoxHeight.C_designElement.frontPieceHeightMm, 48);
  assert.equal(F.heightsPerBoxHeight.N.value, null);
  assert.equal(F.heightsPerBoxHeight.F.value, null);
  assert.equal(F.fixing.drilling.value, null, 'no hole comes from this file');
  assert.equal(F.fixing.frontFixingPieces.sets.N, null);
});
