// ─── T76 F5 · ONE STATE: READINESS ABSORBS MANUFACTURING ────────────────────
//
// CLAUDE.md T76, LAWS: *"One state, one column. T75's `readiness`
// (`engine/readiness.js`) is the single production state of a line. GPT's
// `manufacturing` keeps only what readiness cannot carry (F5)."*  And F5:
// a validated recipe is `cut`; a BLOCKED one is `cut` for the slab and the
// Check names it; an AM strip is a `cut` part and its host carries a `manual`
// NOTE for the gluing (the T75 worktop-joint grammar); `manufacturing` keeps
// `identity` and `construction`, its `status` deleted; the BOM shows the T75
// State column and the construction label; the CNC banner counts GPT's FRONT
// files like any other line and `front-operations.json` carries readiness.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultFrontDecoration } from '../src/engine/frontDecoration.js';
import { appliedStripNotes, notCutParts, readinessOf } from '../src/engine/readiness.js';
import { buildBom } from '../src/engine/bom.js';
import { runChecks } from '../src/engine/checks.js';
import { frontOperationsManifest } from '../src/engine/cnc/frontOperations.js';
import { exportReadiness, exportUnitDxfZip } from '../src/lib/cncExport.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const make = (style, over = {}, type = 'BUD') => {
  const params = {
    ...defaultParamsFor(type, P), unit_num: '01', front_type: style,
    front_decoration: { ...defaultFrontDecoration(style, P), ...over }, ...(over.params || {}),
  };
  return { unit: { id: `u-${style}`, type, params, position: { wall: 0, x_mm: 0 } }, result: computeCabinet(params, P) };
};
const frontOf = (r) => r.panels.find((p) => p.meta?.frontDecoration);

test('F5 · readinessOf: a validated recipe is cut, a blocked one is cut for the slab, a strip is cut', () => {
  const ready = make('G');
  const f = frontOf(ready.result);
  assert.equal(f.meta.frontDecoration.status, 'ready');
  assert.equal(readinessOf(f, { drills: ready.result.drills }), 'cut');
  const blocked = make('G', { groovePitchMm: 3 });
  const b = frontOf(blocked.result);
  assert.equal(b.meta.frontDecoration.status, 'blocked');
  assert.equal(readinessOf(b, { drills: blocked.result.drills }), 'cut', 'the line is the slab\'s');
  // The Check names the blocked recipe (#9, as GPT built it).
  const named = runChecks({ entries: [blocked], profile: P }).filter((x) => x.check === 9 && x.panelId === b.id);
  assert.ok(named.length > 0, 'no Check names the blocked recipe');
  assert.match(named[0].message, /pitch/i);
  const am = make('AM');
  for (const strip of am.result.panels.filter((p) => p.meta?.frontDecorationParent)) {
    assert.equal(readinessOf(strip, { drills: am.result.drills }), 'cut', strip.id);
  }
});

test('F5 · the host of applied strips carries ONE manual NOTE for their gluing', () => {
  const am = make('AM');
  const notes = appliedStripNotes(am.result.panels);
  assert.equal(notes.length, 1);
  assert.deepEqual(notes[0], { id: '01-F strips', part: 'APPLIED-STRIPS', host: '01-F', strips: 4, mitre: 45, state: 'manual' });
  assert.deepEqual(appliedStripNotes(make('G').result.panels), [], 'a routed slab has nothing glued on');
  // A blocked AM has no strips, so nothing to glue.
  assert.deepEqual(appliedStripNotes(make('AM', { mouldingInsetMm: 400 }).result.panels), []);
});

test('F5 · the cut list: State on every line, the NOTE in the worktop joint\'s grammar, counted in nothing', () => {
  const am = make('AM');
  const bom = buildBom([am]);
  const rows = bom.units[0].rows;
  const note = rows.find((r) => r.part === 'APPLIED-STRIPS');
  assert.ok(note, 'no gluing NOTE in the cut list');
  assert.equal(note.material_role, 'note');
  assert.equal(note.readiness, 'manual');
  assert.match(note.material_label, /^NOTE: glue the 4 applied strips to 01-F, 45 degree mitres, after machining$/);
  assert.equal(note.area_m2, 0);
  assert.ok(!bom.cutRows.some((r) => r.part === 'APPLIED-STRIPS'), 'a NOTE merges into nothing');
  for (const r of rows.filter((x) => x.material_role !== 'note')) assert.ok(r.readiness, `${r.id} has no state`);
  assert.equal(rows.find((r) => r.part === 'FRONT').readiness, 'cut');
});

test('F5 · manufacturing keeps ONLY identity and construction; its status is deleted', () => {
  for (const style of ['G', 'GF', 'A', 'AH', 'FL', 'AM']) {
    const bom = buildBom([make(style)]);
    for (const r of bom.units[0].rows.filter((x) => x.manufacturing)) {
      assert.deepEqual(Object.keys(r.manufacturing).sort(), ['construction', 'identity'], `${style} ${r.id}`);
      assert.equal(typeof r.manufacturing.identity, 'string');
    }
  }
  const g = buildBom([make('GF')]).units[0].rows.find((r) => r.part === 'FRONT');
  assert.equal(g.manufacturing.construction, 'GF · Routed slab, depths 6/9 mm');
  const am = buildBom([make('AM')]).units[0].rows;
  assert.equal(am.find((r) => r.part === 'FRONT').manufacturing.construction, 'AM · Slab, 4 applied strips');
  assert.match(am.find((r) => r.part === 'FRONT-MOULDING').manufacturing.construction, /^Applied strip, 45\/45 mitres$/);
  // The identity still tells a blocked recipe from a ready one: never one line.
  const two = buildBom([make('G'), { ...make('G', { groovePitchMm: 3 }), unit: { id: 'u-blocked' } }]);
  assert.equal(two.cutRows.filter((r) => r.role === 'front').length, 2);
});

test('F5 · the BOM panel and the PDF show the State column and the construction, not a second status', () => {
  const panel = read('src/components/BomPanel.jsx');
  assert.match(panel, /\{r\.manufacturing\.construction\}/);
  assert.doesNotMatch(panel, /manufacturing\.(summary|status)/);
  assert.match(panel, /data-readiness=\{r\.readiness \|\| undefined\}/, 'the T75 State column stands');
  const pdf = read('src/lib/exporters.js');
  assert.match(pdf, /r\.manufacturing\.construction/);
  assert.doesNotMatch(pdf, /manufacturing\.(summary|status)/);
});

test('F5 · Check #30 lists the gluing as it lists the worktop joint', () => {
  const am = make('AM');
  assert.deepEqual(notCutParts(am.result), [{ id: '01-F strips', part: 'APPLIED-STRIPS', state: 'manual' }]);
  const found = runChecks({ entries: [am], profile: P }).filter((x) => x.check === 30);
  assert.equal(found.length, 1);
  assert.match(found[0].message, /APPLIED-STRIPS \(fit on site\)/);
  assert.equal(runChecks({ entries: [make('G')], profile: P }).filter((x) => x.check === 30).length, 0, 'a routed slab is all machined');
});

test('F5 · the CNC banner counts the FRONT files\' lines like any other; the manifest carries readiness', async () => {
  const am = make('AM');
  const ready = exportReadiness(am.result.panels, am.result.drills);
  assert.equal(ready.count, 1);
  assert.equal(ready.banner, '1 part is not fully machined: 1 to fit on site.');
  assert.ok(ready.lines.filter((l) => l.part === 'FRONT' || l.part === 'FRONT-MOULDING').every((l) => l.state === 'cut'));
  const g = make('G');
  assert.equal(exportReadiness(g.result.panels, g.result.drills).count, 0, 'a decorated front is a cut line');
  const manifest = frontOperationsManifest([{ unit: am.unit, result: am.result }]);
  assert.equal(manifest.parts[0].readiness, 'cut');
  assert.ok(manifest.parts[0].appliedParts.every((p) => p.readiness === 'cut'));
  assert.ok(manifest.parts[0].additions.every((a) => a.readiness === 'manual'), 'the gluing is the joiner\'s');
  const gm = frontOperationsManifest([{ unit: g.unit, result: g.result }]);
  assert.ok(gm.parts[0].operations.length > 0 && gm.parts[0].operations.every((op) => op.readiness === 'cut'));
  // The unit ZIP: READINESS.txt names the gluing, beside the FRONT file and the manifest.
  const saved = { document: globalThis.document, create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  let blob = null;
  globalThis.document = { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } };
  URL.createObjectURL = (b) => { blob = b; return 'blob:t'; };
  URL.revokeObjectURL = () => {};
  try {
    await exportUnitDxfZip(am.result, P);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const names = Object.keys(zip.files);
    const txt = names.find((n) => /-READINESS\.txt$/.test(n));
    assert.ok(txt, names.join(', '));
    const note = await zip.file(txt).async('string');
    assert.match(note, /01-F strips: Fit on site/);
    assert.ok(names.includes('front-operations.json'));
    const json = JSON.parse(await zip.file('front-operations.json').async('string'));
    assert.equal(json.parts[0].readiness, 'cut');
  } finally {
    globalThis.document = saved.document;
    URL.createObjectURL = saved.create;
    URL.revokeObjectURL = saved.revoke;
  }
});
