// ─── T76 F1 · THE PATCH LANDS: EVERY CONFLICT RESOLVED BY BOTH SIDES ────────
//
// CLAUDE.md T76 F1: *"`git apply --3way patches/gpt-decorative-fronts.patch`
// on the base ... Resolutions, each one BOTH sides unless stated"*, and the
// TESTS section: *"`test/turn76-*.test.js` for the conflict resolutions (F1:
// the L's leaves ARE decorated; both ZIP files present; both sheet parts
// counted)"*. One test per row of the F1 table, run against the code.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultFrontDecoration } from '../src/engine/frontDecoration.js';
import { buildBom, sheetFamilyOfPart } from '../src/engine/bom.js';
import { exportUnitDxfZip } from '../src/lib/cncExport.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const decorated = (type, style, over = {}) => computeCabinet({
  ...defaultParamsFor(type, P), unit_num: '01', front_type: style,
  front_decoration: defaultFrontDecoration(style, P), ...over,
}, P);

test('F1 · cabinet.js: the L\'s two leaves ARE decorated, and door B still opens first', () => {
  const r = decorated('CORNER_L_BASE', 'G', { unit_num: 'CL01', doors: true });
  const a = r.panels.find((p) => p.id === 'CL01-A-F');
  const b = r.panels.find((p) => p.id === 'CL01-B-F');
  assert.ok(a && b, 'the L cut its two leaves');
  for (const leaf of [a, b]) {
    assert.equal(leaf.meta.frontDecoration?.style, 'G', `${leaf.id} is not decorated`);
    assert.equal(leaf.meta.frontDecoration.status, 'ready', JSON.stringify(leaf.meta.frontDecoration.problems));
    assert.ok(leaf.meta.frontDecoration.operations.length > 0);
  }
  assert.equal(b.meta.opensFirst, true, 'the L block ran first and its leaf keeps its word');
  assert.ok(r.warnings.some((w) => w.code === 'CORNER_L_OPENS_FIRST'));
  // By source: the L block first, GPT's pass after it, in one place.
  const src = read('src/engine/cabinet.js');
  const lBlock = src.indexOf('T75 F4 · THE L\'s DOORS AND ITS PARENTS\' DRILLING JOIN HERE');
  const pass = src.indexOf('if (params?.front_decoration) {');
  assert.ok(lBlock > 0 && pass > lBlock, 'the decoration pass is not after the L block');
});

test('F1 · projectStore.js: one destructuring carries run_upstand, run_pelmet AND front_decoration', () => {
  const src = read('src/stores/projectStore.js');
  const at = src.indexOf('function paramsForEngine(unit, design = null) {');
  const head = src.slice(at, src.indexOf('} = unit.params;', at));
  for (const key of ['run_upstand: _fossilUpstand', 'run_pelmet: _fossilPelmet', 'front_decoration: storedDecoration']) {
    assert.ok(head.includes(key), `${key} is not in the one destructuring`);
  }
});

test('F1 · cncExport.js: READINESS.txt and front-operations.json both ride the unit ZIP', async () => {
  // A blind base: its blank is not fully machined (READINESS.txt), its leaf is decorated (the manifest).
  const r = decorated('BLIND_BASE', 'G', { doors: { count: 1 } });
  assert.ok(r.panels.some((p) => p.meta?.frontDecoration?.status === 'ready'));
  const saved = { document: globalThis.document, create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  let blob = null;
  globalThis.document = { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } };
  URL.createObjectURL = (b) => { blob = b; return 'blob:t'; };
  URL.revokeObjectURL = () => {};
  try {
    const out = await exportUnitDxfZip(r, P);
    assert.equal(out.operationManifest, 'front-operations.json');
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const names = Object.keys(zip.files);
    assert.ok(names.includes('front-operations.json'), names.join(', '));
    assert.ok(names.some((n) => /-READINESS\.txt$/.test(n)), names.join(', '));
    assert.ok(names.some((n) => /-FRONT\.dxf$/.test(n)), 'the FRONT setup rides it too');
  } finally {
    globalThis.document = saved.document;
    URL.createObjectURL = saved.create;
    URL.revokeObjectURL = saved.revoke;
  }
});

test('F1 · RightPanel.jsx: T75\'s imports and FrontDecorationControls both', () => {
  const src = read('src/components/RightPanel.jsx');
  for (const line of [
    "import Modal from './Modal.jsx';",
    "import { notchApplies } from '../engine/notch.js';",
    "import { takesWorktop, worktopEligible } from '../engine/worktop.js';",
    "import { CABINEO_REFUSAL, dowelKitRefusal, jointSystemOf } from '../engine/dowels.js';",
    "import FrontDecorationControls from './FrontDecorationControls.jsx';",
  ]) assert.ok(src.includes(line), line);
});

test('F1 · bom.js: readiness AND manufacturing on the row, one merge key with both', () => {
  const g = decorated('BUD', 'G');
  const fl = decorated('BUD', 'FL');
  const bom = buildBom([{ unit: { id: 'g' }, result: g }, { unit: { id: 'fl' }, result: fl }]);
  const fronts = bom.cutRows.filter((row) => row.role === 'front');
  assert.equal(fronts.length, 2, 'two recipes on equal blanks are two lines');
  for (const row of fronts) {
    assert.equal(row.readiness, 'cut');
    assert.equal(typeof row.manufacturing.identity, 'string');
  }
  // The same recipe twice is one line of two.
  const twice = buildBom([{ unit: { id: 'a' }, result: g }, { unit: { id: 'b' }, result: decorated('BUD', 'G') }]);
  const same = twice.cutRows.filter((row) => row.role === 'front');
  assert.equal(same.length, 1);
  assert.equal(same[0].qty, 2);
  // The key, by source: readiness and the identity in ONE key.
  assert.match(read('src/engine/bom.js'), /\|\$\{r\.readiness\}`\n\s*\+ \(r\.manufacturing \? `\|\$\{r\.manufacturing\.identity\}` : ''\);/);
});

test('F1 · bom.js: FRONT_SHEET_PARTS is the union, pelmet AND front_moulding count on the fronts sheet', () => {
  assert.equal(sheetFamilyOfPart('pelmet'), 'fronts', 'T75\'s pelmet');
  assert.equal(sheetFamilyOfPart('front_moulding'), 'fronts', 'GPT\'s applied strips');
  for (const part of ['door', 'drawer_front', 'false_front', 'end_panel', 'mask']) assert.equal(sheetFamilyOfPart(part), 'fronts', part);
});

test('F1 · the T59 freeze: a file in both EXEMPT blocks carries ONE entry, T75\'s text and GPT\'s line', () => {
  const src = read('test/turn59-f1-the-switch.test.js');
  const exempt = src.slice(src.indexOf('const EXEMPT = {'), src.indexOf('const FROZEN = {'));
  for (const rel of ['src/components/BomPanel.jsx', 'src/components/CncTree.jsx', 'src/components/RightPanel.jsx']) {
    const at = exempt.indexOf(`'${rel}':`);
    assert.ok(at > 0, rel);
    assert.equal(exempt.indexOf(`'${rel}':`, at + 1), -1, `${rel} has two entries`);
    const entry = exempt.slice(at, exempt.indexOf('\n  \'', at + 1));
    assert.match(entry, /T75 F\d/, `${rel} lost T75's text`);
    assert.match(entry, /DECOR F\d/, `${rel} lost GPT's line`);
  }
});

test('F1 · the j-band test moved to the T76 prefix; T75\'s tests own theirs', () => {
  assert.doesNotThrow(() => read('test/turn76-the-j-band.test.js'));
  assert.throws(() => read('test/turn75-the-j-band.test.js'));
});
