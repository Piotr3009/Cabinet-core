// ─── T77 F4 · ONE BOARD RULE: 18 ON THE BOARD, 25 IN THE WORKSHOP ──────────
//
// CLAUDE.md T77 F4: *"The owner's board is drawn for 18 mm; the workshop's
// default front is 25 (`profile.front.thickness`). GPT keeps the ASSIGNED
// material's thickness (right: a 12 mm relief in a 25 board leaves 13 and
// passes the 3 mm skin).
// - `boardMm: 18` in the ornate profile is the BOARD OF THE DRAWING, not a
//   demand: the Check speaks only when the assigned front is THINNER than the
//   deepest step plus the 3 mm skin (15 mm for the default recipe), in words,
//   naming the leaf and the number; a thicker board is silently fine. This is
//   T76 F4's rule for A/AH applied the same way; one function serves both.
// - The JSON and the drawing print the ACTUAL board of the leaf, never the
//   board of the drawing."*
//
// This file holds the proof of that: ONE function (`engine/frontBoard.js`
// `boardShortfall`) answers retail's question (`boardRefusal`, T76 F7) and
// the Ornate engine alike; the engine refuses a 12 mm board in that
// function's own words and the export gate holds that leaf alone; every board
// from 15 up is silent (no hold, no Check, no warning); T76's A/AH rule is
// kept as it was; the source carries one path; the operations JSON prints the
// leaf's own board and never the 18 of the drawing.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { boardShortfall, deepestCutMm, minSkinOf, skinShort } from '../src/engine/frontBoard.js';
import { boardRefusal, defaultFrontDecoration } from '../src/engine/frontDecoration.js';
import { ORNATE_STYLE_IDS } from '../src/engine/ornateFront.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { runChecks } from '../src/engine/checks.js';
import { exportGate } from '../src/engine/cnc/exportGate.js';
import { buildOrnateReferenceFiles } from '../src/engine/cnc/ornateExport.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
const D = P.front.decoration;

/** The engine BUD with one style on its leaf, at a board (or the profile's). */
function bud(style, frontT) {
  const params = {
    ...defaultParamsFor('BUD', P), unit_num: '01', front_type: style,
    front_decoration: defaultFrontDecoration(style, P),
  };
  if (frontT !== undefined) params.front_t = frontT;
  const result = computeCabinet(params, P);
  const leaves = result.panels.filter((p) => p.meta?.frontDecoration);
  assert.equal(leaves.length, 1, `${style}: one decorated leaf on the BUD`);
  const front = leaves[0];
  const unit = { id: 'u1', type: 'BUD', params, position: { wall: 0, x_mm: 0 } };
  const gate = exportGate([{ unit, result }], { profile: P });
  const checks = runChecks({ entries: [{ unit, result }], profile: P });
  return { params, result, front, unit, gate, checks };
}

const BOARD_CODES = ['FRONT_DECORATION_BOARD', 'FRONT_DECORATION_BOARD_TOO_THIN'];

test('F4 · ONE FUNCTION: boardRefusal asks boardShortfall, for A/AH and Ornate alike', () => {
  // A (T76's arch): 18 mm recess, 3 mm skin, a 21 mm board. T76 F7's sentence, kept.
  const a = boardRefusal('A', 20, P);
  assert.deepEqual(a, boardShortfall('A', 20, D.A, P));
  assert.deepEqual(a, {
    code: 'FRONT_DECORATION_BOARD_TOO_THIN',
    message: 'A cuts 18 mm into the face and must leave 3 mm under it: it needs a board of at least 21 mm, and this one is 20 mm.',
    needMm: 21,
    haveMm: 20,
  });
  assert.deepEqual(boardRefusal('AH', 20, P), boardShortfall('AH', 20, D.AH, P));
  assert.equal(boardRefusal('A', 21, P), null, 'the arch on 21 leaves its 3 mm');

  // Ornate A: the deepest step 12 plus the skin 3, a 15 mm board.
  const o = boardRefusal('ORNATE_A_1', 12, P);
  assert.deepEqual(o, boardShortfall('ORNATE_A_1', 12, D.ORNATE_A_1, P));
  assert.equal(o.code, 'FRONT_DECORATION_BOARD_TOO_THIN');
  assert.equal(o.needMm, 15);
  assert.equal(o.haveMm, 12);
  assert.equal(o.message,
    'ORNATE_A_1 cuts 12 mm into the face and must leave 3 mm under it: it needs a board of at least 15 mm, and this one is 12 mm.');
  assert.deepEqual(boardRefusal('ORNATE_A_1', 14.9, P), boardShortfall('ORNATE_A_1', 14.9, D.ORNATE_A_1, P));
  assert.equal(boardRefusal('ORNATE_A_1', 14.9, P).haveMm, 14.9);

  // A thicker board is silently fine, whatever board the recipe was drawn on.
  for (const style of ORNATE_STYLE_IDS) {
    for (const t of [15, 16, 18, 25]) assert.equal(boardRefusal(style, t, P), null, `${style} on ${t}`);
    assert.ok(boardRefusal(style, 14.9, P), `${style} on 14.9 is refused`);
  }

  // The threshold is the deepest cut plus the profile's skin, never boardMm.
  const recipe = D.ORNATE_A_1;
  assert.equal(recipe.boardMm, 18, 'the board of the drawing stays in the recipe');
  assert.equal(P.front.thickness, 25, 'the workshop\'s default front');
  assert.equal(deepestCutMm(recipe), 12);
  assert.equal(minSkinOf(P), 3);
  assert.equal(deepestCutMm(recipe) + minSkinOf(P), 15, 'CLAUDE.md: 15 mm for the default recipe');
  assert.equal(skinShort(15, 12, P), false);
  assert.equal(skinShort(14.9, 12, P), true);
  assert.equal(boardShortfall('ORNATE_A_1', 25, { ...recipe, boardMm: 40 }, P), null, 'a drawing on 40 demands nothing of a 25 board');
  assert.equal(boardShortfall('ORNATE_A_1', 16, { ...recipe, boardMm: 12 }, P), null, 'nor a drawing on 12 of a 16 board');
  assert.equal(boardShortfall('ORNATE_A_1', 20, { ...recipe, stepDepthsMm: [3, 6, 9, 20] }, P).needMm, 23, 'the deepest step sets it');
  assert.equal(boardShortfall('ORNATE_A_1', 5, { ...recipe, stepDepthsMm: [1, 2, 3, 4], cornerDepthMm: 6 }, P).needMm, 9,
    'a corner background deeper than the steps sets it');

  // One skin, read off one profile number, by both families.
  const thickSkin = { ...P, front: { ...P.front, decorationMinSkinMm: 5 } };
  assert.equal(boardRefusal('ORNATE_A_1', 16, thickSkin).needMm, 17);
  assert.equal(boardRefusal('A', 22, thickSkin).needMm, 23);
  assert.equal(boardRefusal('ORNATE_A_1', 17, thickSkin), null);

  // The other recipes ride the same function: recess plus groove, or groove.
  assert.equal(boardRefusal('G', 5, P).needMm, 6);
  assert.equal(boardRefusal('GF', 11, P).needMm, 12);
  // AMENDED BY T82 F15 (25.10.2026): FL's T76 grooves still need 6; a Fluted front
  // CHOSEN now is the owner's reeds (*"daj wariant b czyli na styk narazie"*), 20 cut
  // 10 deep, and the same function asks it 13 (10 plus the 3 mm skin).
  assert.equal(boardRefusal('FL', 5, P, D.FL).needMm, 6);
  assert.equal(boardRefusal('FL', 5, P).needMm, 13);
  assert.equal(boardRefusal('FL', 13, P), null, 'reeds of 20 on 13 leave their 3 mm');
  assert.equal(boardRefusal('AM', 1, P), null, 'applied strips cut nothing');
  assert.equal(boardRefusal('F', 1, P), null, 'a plain front has no recipe');
});

test('F4 · THE ENGINE ASKS THE SAME FUNCTION: a 12 mm leaf is refused in its words and held alone', () => {
  for (const t of [12, 14.9]) {
    const { result, front, gate, checks } = bud('ORNATE_A_1', t);
    assert.equal(front.id, '01-F');
    assert.equal(front.thickness, t, 'the assigned board, not the drawing\'s');
    const decoration = front.meta.frontDecoration;
    assert.equal(decoration.status, 'blocked');
    assert.deepEqual(decoration.operations, [], 'nothing is squeezed');
    const expected = boardShortfall('ORNATE_A_1', t, D.ORNATE_A_1, P);
    assert.equal(decoration.problems.length, 1, JSON.stringify(decoration.problems));
    const [refused] = decoration.problems;
    assert.deepEqual(
      { code: refused.code, message: refused.message, needMm: refused.needMm, haveMm: refused.haveMm },
      expected,
    );
    assert.equal(refused.needMm, 15);
    assert.equal(refused.haveMm, t);
    // The cabinet's warning names the leaf.
    const warned = result.warnings.filter((w) => w.panel === front.id && BOARD_CODES.includes(w.code));
    assert.deepEqual(warned.map((w) => [w.code, w.message]), [['FRONT_DECORATION_BOARD_TOO_THIN', `01-F: ${expected.message}`]]);
    // The gate holds that leaf, and only it.
    assert.deepEqual(gate.held.map((h) => h.panelId), ['01-F']);
    const mine = gate.findings.filter((f) => f.panel === front.id);
    assert.equal(mine.length, 1, JSON.stringify(gate.findings));
    assert.match(mine[0].message, /01-F/);
    assert.match(mine[0].message, /\b15 mm\b/);
    assert.ok(mine[0].message.includes(`${t} mm`), mine[0].message);
    assert.equal(gate.findings.length, 1, 'nothing else on the BUD is said');
    // The Check says it once, red (#9), in the same words; #32 says nothing.
    const said = checks.filter((f) => f.panelId === front.id && (f.check === 9 || f.check === 32));
    assert.equal(said.length, 1, JSON.stringify(said));
    assert.equal(said[0].check, 9);
    assert.equal(said[0].level, 'red');
    assert.equal(said[0].message, `01 01-F: ${expected.message}`);
  }
});

test('F4 · A THICKER BOARD IS SILENT: 15, 16, 18 and 25 under all four Ornate styles', () => {
  for (const style of ORNATE_STYLE_IDS) {
    for (const t of [15, 16, 18, 25]) {
      const at = `${style} on ${t}`;
      const { result, front, gate, checks } = bud(style, t);
      assert.equal(front.thickness, t, at);
      const decoration = front.meta.frontDecoration;
      assert.equal(decoration.status, 'ready', `${at}: ${JSON.stringify(decoration.problems)}`);
      assert.deepEqual(decoration.problems, [], at);
      assert.equal(decoration.operations[0].depth, 12, `${at}: the relief is not shrunk`);
      assert.deepEqual(gate.held, [], `${at}: nothing held`);
      assert.deepEqual(gate.findings.filter((f) => f.panel === front.id), [], `${at}: no finding`);
      assert.deepEqual(result.warnings.filter((w) => w.panel === front.id && BOARD_CODES.includes(w.code)), [], `${at}: no board warning`);
      assert.ok(!decoration.advisories.some((a) => BOARD_CODES.includes(a.code)), `${at}: no board advisory`);
      assert.ok(!decoration.advisories.some((a) => /\b18 mm\b|board/i.test(a.message)), `${at}: no note names a board`);
      assert.deepEqual(checks.filter((f) => f.panelId === front.id && (f.check === 9 || f.check === 32)), [], `${at}: the Check is silent`);
    }
  }
});

test('F4 · A/AH ARE UNCHANGED: T76\'s advisory on 25, the skin refusal on 20', () => {
  for (const style of ['A', 'AH']) {
    const { result, front, gate, checks } = bud(style);
    assert.equal(front.thickness, 25, `${style}: the profile's default front`);
    assert.equal(front.meta.frontDecoration.status, 'ready', `${style}: the leaf is still cut`);
    const advice = result.warnings.filter((w) => w.panel === front.id && w.code === 'FRONT_DECORATION_BOARD');
    assert.equal(advice.length, 1, `${style}: T76 F4's advisory is still said`);
    assert.equal(advice[0].message, `01-F: ${style} is drawn for a 30 mm board and this front is 25 mm: the 18 mm recess leaves 7 mm. `
      + 'Assign a 30 mm front material, or keep this board by decision.');
    assert.deepEqual(gate.held, [], `${style}: the advisory holds nothing`);
    const said = checks.filter((f) => f.panelId === front.id && f.check === 32);
    assert.equal(said.length, 1);
    assert.equal(said[0].level, 'yellow');

    // On 20 the arch is refused by the skin rule, in the words T76 left.
    const thin = bud(style, 20);
    const decoration = thin.front.meta.frontDecoration;
    assert.equal(decoration.status, 'blocked', style);
    assert.deepEqual(decoration.operations, []);
    assert.deepEqual(decoration.problems, [{ code: 'FRONT_DECORATION_SKIN', message: 'panel-recess leaves less than 3 mm of front material.' }]);
    assert.ok(thin.result.warnings.some((w) => w.panel === thin.front.id && w.code === 'FRONT_DECORATION_SKIN'));
    assert.ok(!thin.result.warnings.some((w) => w.panel === thin.front.id && w.code === 'FRONT_DECORATION_BOARD'),
      'a refused leaf carries no advisory');
    assert.deepEqual(thin.gate.held.map((h) => h.panelId), ['01-F']);

    // The engine's skin rule and the one function draw the line at the same board.
    for (const t of [20.9, 21, 25]) {
      const engineRefuses = bud(style, t).front.meta.frontDecoration.status === 'blocked';
      assert.equal(engineRefuses, boardRefusal(style, t, P) !== null, `${style} on ${t}: engine and boardRefusal agree`);
    }
  }
});

function sources(dir) {
  const out = [];
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sources(full));
    else if (/\.(?:m?js|jsx|ts|tsx)$/.test(entry)) out.push(relative(ROOT, full).split('\\').join('/'));
  }
  return out;
}

test('F4 · ONE PATH IN THE SOURCE: the skin is read in one module, and both engines import it', () => {
  const readers = sources(join(ROOT, 'src')).filter((rel) => read(rel).includes('decorationMinSkinMm'));
  assert.deepEqual(readers.sort(), ['src/engine/frontBoard.js', 'src/engine/profile.js']);

  const ornate = read('src/engine/ornateFront.js');
  assert.match(code(ornate), /import\s*\{[^}]*\bboardShortfall\b[^}]*\}\s*from\s*'\.\/frontBoard\.js'/);
  assert.doesNotMatch(ornate, /thickness\s*-\s*maxDepth/, 'GPT\'s second copy of the comparison survived');
  assert.doesNotMatch(ornate, /The deepest cut leaves/, 'GPT\'s second sentence survived');
  assert.doesNotMatch(code(ornate), /from\s*'\.\/frontDecoration\.js'/, 'the Ornate engine asks frontBoard.js, not frontDecoration.js');

  const decoration = code(read('src/engine/frontDecoration.js'));
  assert.match(decoration, /import\s*\{[^}]*\bboardShortfall\b[^}]*\}\s*from\s*'\.\/frontBoard\.js'/);
  assert.doesNotMatch(decoration, /function\s+(?:minSkinOf|skinShort)\b/, 'frontDecoration.js keeps its own skin function');
  assert.doesNotMatch(decoration, /(?:const|let|var)\s+(?:minSkinOf|skinShort)\s*=/, 'frontDecoration.js keeps its own skin function');
  assert.doesNotMatch(decoration, /FRONT_DECORATION_BOARD_TOO_THIN/, 'the refusal sentence lives in frontBoard.js only');

  const board = code(read('src/engine/frontBoard.js'));
  const imports = [...board.matchAll(/from\s*'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(imports, ['./profile.js'], 'the rule depends on the profile and nothing else');
  assert.equal((board.match(/FRONT_DECORATION_BOARD_TOO_THIN/g) || []).length, 1);
});

test('F4 · THE JSON PRINTS THE ACTUAL BOARD: 25 leaves 13, 18 leaves 6, and 18 is never the drawing\'s', () => {
  for (const [frontT, remaining] of [[undefined, 13], [18, 6]]) {
    const { result, front } = bud('ORNATE_A_1', frontT);
    const board = frontT ?? 25;
    assert.equal(front.thickness, board);
    assert.equal(front.meta.frontDecoration.parameters.boardMm, 18, 'the record keeps the recipe\'s own number');
    const files = buildOrnateReferenceFiles([{ result }], { profile: P });
    const jsonFiles = files.filter((f) => f.type === 'json');
    assert.equal(jsonFiles.length, 1);
    const text = jsonFiles[0].contents;
    const spec = JSON.parse(text);
    assert.equal(spec.status, 'reference-only', JSON.stringify(spec.problems));
    assert.equal(spec.panelId, '01-F');
    assert.equal(spec.thicknessMm, board, 'the leaf\'s own board');
    assert.equal(spec.operations[0].finalDepthMm, 12);
    assert.equal(spec.operations[0].remainingThicknessMm, remaining);
    assert.doesNotMatch(text, /"boardMm"/, 'the board of the drawing is not printed');
    assert.ok(!Object.hasOwn(spec.parameters, 'boardMm'));
  }
});

// T77 F7 · what the walk found: the refused leaf's package said it carried a
// relief reference it did not ship, and the refused record named no ornament.
test('F7 · a refused relief names its ornament, and its package claims no reference it did not ship', async () => {
  const { exportUnitDxfZip } = await import('../src/lib/cncExport.js');
  const { frontManufacturing } = await import('../src/engine/frontDecorationBom.js');
  const JSZip = (await import('jszip')).default;
  const thin = computeCabinet({ ...defaultParamsFor('BUD', P), front_t: 12, front_type: 'ORNATE_A_1',
    front_decoration: defaultFrontDecoration('ORNATE_A_1', P) }, P);
  const leaf = thin.panels.find((p) => p.meta?.frontDecoration);
  assert.equal(leaf.meta.frontDecoration.status, 'blocked');
  assert.equal(leaf.meta.frontDecoration.ornament, 'procedural placeholder');
  assert.match(frontManufacturing(leaf).construction, /ornament: procedural placeholder$/);
  const saved = { document: globalThis.document, create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  let blob;
  URL.createObjectURL = (value) => { blob = value; return 'blob:test'; };
  URL.revokeObjectURL = () => {};
  globalThis.document = { body: { appendChild() {} }, createElement: () => ({ click() {}, remove() {} }) };
  try {
    await exportUnitDxfZip(thin, P);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const names = Object.keys(zip.files);
    assert.ok(!names.some((n) => /\.stl$/.test(n)), 'a refused relief ships no model');
    const readiness = names.find((n) => /READINESS\.txt$/.test(n));
    const note = readiness ? await zip.file(readiness).async('string') : '';
    assert.doesNotMatch(note, /Ornate proposed reference/, 'no reference line for a model that did not ship');
    // A relief that built still says its reference, as geometry.
    const fine = computeCabinet({ ...defaultParamsFor('BUD', P), front_type: 'ORNATE_A_1',
      front_decoration: defaultFrontDecoration('ORNATE_A_1', P) }, P);
    await exportUnitDxfZip(fine, P);
    const zip2 = await JSZip.loadAsync(await blob.arrayBuffer());
    const note2 = await zip2.file(Object.keys(zip2.files).find((n) => /READINESS\.txt$/.test(n))).async('string');
    assert.match(note2, /01 01-F Ornate proposed reference/);
  } finally {
    if (saved.document === undefined) delete globalThis.document; else globalThis.document = saved.document;
    URL.createObjectURL = saved.create; URL.revokeObjectURL = saved.revoke;
  }
});

// T77 F7 · the walk found each finding of a decorated leaf said twice on the
// L's panel (the parent's carried over, the L's own pass again): once now.
test('F7 · on the L each decorated leaf says each finding once', () => {
  for (const style of ['ORNATE_A_2', 'A']) {
    // 15.10.2026: a new L is a bi-fold pair; the "opens first" line is the PAIR's (corner_doors null).
    const r = computeCabinet({ ...defaultParamsFor('CORNER_L_BASE', P), front_type: style, corner_doors: null,
      front_decoration: defaultFrontDecoration(style, P) }, P);
    const leaves = r.panels.filter((p) => p.meta?.frontDecoration).map((p) => p.id);
    assert.equal(leaves.length, 2, `${style}: both L leaves decorated`);
    const seen = new Map();
    for (const w of r.warnings) {
      if (!leaves.includes(w.panel)) continue;
      const key = `${w.panel}|${w.code}`;
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    assert.ok(seen.size > 0, `${style}: the leaves say something`);
    for (const [key, n] of seen) assert.equal(n, 1, `${style}: ${key} said ${n} times`);
    assert.ok(r.warnings.some((w) => w.code === 'CORNER_L_OPENS_FIRST'), `${style}: door B still opens first`);
  }
});
