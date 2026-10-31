/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// === T79 F15 · LABEL COLOURS ON THE ENTITY, FOR VCARVE =======================
//
// The handover of 18.10.2026, accepted by the owner at 14:55 (*"ok daj"*):
// *"kolory warstw LABEL_* w VCarve (wariant b, jesli VCarve ignoruje
// kolory)."*  The owner has not said whether VCarve honours a layer's colour,
// so both are written: the LABEL_<cabinet> layer row carried the cabinet's ACI
// since the chat fix of 17.10; now EVERY entity on that layer (the TEXT, the
// #number, the EDGE arrow polylines, record by record: POLYLINE, VERTEX,
// SEQEND, TEXT) carries group 62 = the same ACI on the entity itself.
//
// Without a labels plan the file is byte for byte what it was: the
// fingerprints below were taken from engine/cnc/dxf.js BEFORE this change (the
// six fossil kits, bare, as the classifier computes them, unit by unit and as
// one material sheet). With a plan the only delta is the entity-level 62: the
// file with those pairs taken out is the pre-change file to the byte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { dxfLabelsFor, partNumberPlan } from '../src/engine/partNumbers.js';
import {
  buildUnitDxfFiles, labelAciOf, labelFor, labelLayerRow, materialSheetDxf, panelDxf, parseDxf, writeDxf,
} from '../src/engine/cnc/dxf.js';
import { isOutsideFace } from '../src/engine/cabineo.js';
import { layoutPanels } from '../src/engine/cnc/layout.js';
import { exportablePanels } from '../src/engine/cnc/groups.js';
import { labelsForUnit, projectLabelPlan } from '../src/lib/partLabels.js';
import { exportMaterialDxf, exportSheetDxf, exportUnitDxfZip } from '../src/lib/cncExport.js';

const sha = (s) => createHash('sha256').update(s).digest('hex');
const SIX = ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY'];
const results = SIX.map((t, i) => computeCabinet({ ...defaultParamsFor(t, P), unit_num: `0${i + 1}` }, P));
const units = results.map((r, i) => ({ id: `u${i}`, unitNum: r.unitNum, panels: r.panels }));
const plan = partNumberPlan(units, P);
const labelsOf = (i) => dxfLabelsFor(plan, `u${i}`);
const opts = { gap: P.cnc.layoutGap, rowWidth: P.cnc.layoutRowWidth };
const blocks = (withPlan) => results.map((r, i) => {
  const panels = exportablePanels(r.panels);
  return {
    unitNum: r.unitNum, panels, drills: r.drills, layout: layoutPanels(panels, r.drills, opts), ...(withPlan ? { labels: labelsOf(i) } : {}),
  };
});
const sheetOf = (withPlan) => materialSheetDxf({ blocks: blocks(withPlan), gap: P.cnc.layoutGap, profile: P });
const unitText = (i, labels) => buildUnitDxfFiles(results[i], P, labels ? { labels } : undefined).map((f) => f.dxf).join('\n');

// Taken from the unmodified writer (HEAD before T79 F15), the same calls as below.
// CHAT FIX 31.10.2026 (the owner: *"raczej staraj sie wszedzie omijac zolty bo on
// jest mega nie widoczny na bialym tle (na takim pracuje vcarve)"*): NO YELLOW ON
// THE MACHINE FILE moved the LAYER table's colour rows (PUZZLE_DOG_BONES 2 to 12,
// SHAKER_PANEL_POCKET 41 to 32, DRAWER_BOTTOM_POCKET 2 to 230 on these six) and
// the fourteen hashes with them; not a record of ENTITIES moved: each text with
// the old numbers written back into those rows alone hashes to the pre-change
// value to the character (verify/chatfix-3110/identity.md). The previous values:
// WARDROBE 0ff434a1 / 978637bc, BUD 7dfd770b / aa9ae6f6, WUD 736e9170 / 6bd81c86,
// BUDR 4e1c176f / f2de53f7, BUDR4 3d7ecad5 / d5f12948, PANTRY a5a5e3ed / 6c59ed23,
// SHEET ae6690f0 / 5ecdd099.
const BEFORE = {
  WARDROBE: { plain: '5325178ccdbaf1d76a18b4e6d18f79a81143c0d249fa6d5c0804314011a7c15b', plan: '52acee84fe54b0a7f3f5b26b2ceae6a9f206091d9b3aac21709588db2230745e' },
  BUD: { plain: '8825fbd7279d9759c61d06b191eb84ec25dbc25081ed994e35f58932ef377636', plan: 'd8269135faf02d837c4588ba43ac792f5c2242bab4c4a7be19a3effed677c3ce' },
  WUD: { plain: 'fe391c4d7d6997195656feb9a958c7b33d58caa10d9c2f6edceeba5e7d2209e3', plan: 'e608d3859eb9c5931bd932c34a0ddeda985e7a7da463d6c265c89bf6ee335a55' },
  BUDR: { plain: '4ba30eba5da915af3ca7285f7e0f04ae1284bc65c15c5d38f007ab795f01095d', plan: 'bc218000781c360086adfdadef4d10064217769480b93fd723ac9717005e0885' },
  BUDR4: { plain: '4e3146bcedae4bd16bb9fedecf02b3ae4420826adebab6569f05baa81f64dafe', plan: 'f8893c2ee40b95b89fe3038fe7bf4396cd5532ade432d9668d003fa1c3f4ee1c' },
  PANTRY: { plain: 'd9b0686ef9e952ef0449deeaa929cc94bc96835cfd7c46553b7cd0038f08e2ed', plan: 'dea72766b4d4a6b885deb5bb696c01d3cc06a2e60701dce448ffbc1fa431ec05' },
  SHEET: { plain: '8f498c0eb3fe2b6d00383f49f2403ef6e03437182e19871efbe16a16f4b5adbe', plan: '95d3bc166aa31983569c611909ce060541e5d9847d07ce78c28547d1dda7f5d2' },
};

/** The file's group pairs, as written (the writer pads no code). */
const pairsOf = (text) => {
  const lines = text.split('\r\n');
  const out = [];
  for (let i = 0; i + 1 < lines.length; i += 2) out.push([lines[i], lines[i + 1]]);
  return out;
};

/** The layer table's colours and every ENTITIES record ({ type, layer, color }), VERTEX and SEQEND included. */
function recordsOf(text) {
  const layers = new Map();
  const records = [];
  let section = null;
  let table = null;
  let row = null;
  let rec = null;
  const pairs = pairsOf(text);
  pairs.forEach(([code, value], i) => {
    if (code === '2' && pairs[i - 1]?.[0] === '0' && pairs[i - 1][1] === 'SECTION') { section = value; return; }
    if (code === '2' && pairs[i - 1]?.[0] === '0' && pairs[i - 1][1] === 'TABLE') { table = value; return; }
    if (section === 'TABLES' && table === 'LAYER') {
      if (code === '0') row = value === 'LAYER' ? { name: null, color: null } : null;
      else if (row && code === '2') { row.name = value; layers.set(value, row); } else if (row && code === '62') row.color = Number(value);
      return;
    }
    if (section !== 'ENTITIES') return;
    if (code === '0' && value === 'ENDSEC') { section = null; rec = null; } else if (code === '0') {
      rec = { type: value, layer: null, color: null, colours: 0 };
      records.push(rec);
    } else if (rec && code === '8') rec.layer = value;
    else if (rec && code === '62') { rec.color = Number(value); rec.colours += 1; }
  });
  return { layers, records };
}

/** The file with every ENTITIES-section group 62 taken out, nothing else touched. */
function withoutEntityColours(text) {
  const out = [];
  let section = null;
  const pairs = pairsOf(text);
  pairs.forEach(([code, value], i) => {
    if (code === '2' && pairs[i - 1]?.[0] === '0' && pairs[i - 1][1] === 'SECTION') section = value;
    if (section === 'ENTITIES' && code === '62') return;
    out.push(code, value);
  });
  return `${out.join('\r\n')}\r\n`;
}

/** Every record on a LABEL_ layer carries its layer's colour once, every other record none. */
function assertLabelColours(text, where) {
  const { layers, records } = recordsOf(text);
  const onLabel = records.filter((r) => String(r.layer).startsWith('LABEL_'));
  for (const r of records) {
    if (String(r.layer).startsWith('LABEL_')) {
      const row = layers.get(r.layer);
      assert.ok(row, `${where}: ${r.layer} is declared`);
      assert.equal(r.colours, 1, `${where}: a ${r.type} on ${r.layer} carries group 62 once`);
      assert.equal(r.color, row.color, `${where}: a ${r.type} on ${r.layer} carries its layer's colour ${row.color}`);
    } else {
      assert.equal(r.colours, 0, `${where}: a ${r.type} on ${r.layer} carries no colour of its own`);
    }
  }
  return onLabel;
}

// ═══ A. WITH A PLAN: THE CABINET'S COLOUR ON EVERY ENTITY OF ITS LAYER ═══════

test('T79 F15 · with a labels plan every record on LABEL_<cabinet> (TEXT, POLYLINE, VERTEX, SEQEND) carries group 62 = the layer row\'s ACI; no other record carries one', () => {
  results.forEach((r, i) => {
    const labels = labelsOf(i);
    for (const f of buildUnitDxfFiles(r, P, { labels })) {
      const onLabel = assertLabelColours(f.dxf, `${SIX[i]} ${f.name}`);
      assert.ok(onLabel.some((x) => x.type === 'TEXT'), `${f.name}: the caption is on the cabinet's layer`);
      for (const x of onLabel) assert.equal(x.color, labels.aci, `${f.name}: the cabinet's own ACI ${labels.aci}`);
    }
  });
});

test('T79 F15 · the TEXT, the #number and the EDGE arrow each carry the colour: the WARDROBE\'s TOP, entity by entity', () => {
  const labels = labelsOf(0);
  const top = buildUnitDxfFiles(results[0], P, { labels }).find((f) => f.panelId === 'TOP');
  const texts = top.entities.filter((e) => e.type === 'text');
  const number = texts.find((e) => /^#\d+( |$)/.test(e.str));
  assert.ok(number, 'the caption leads with the number (#04, a line of its own on a narrow TOP)');
  const word = texts.find((e) => e.str === 'EDGE');
  assert.ok(word, 'the EDGE word');
  const arrows = top.entities.filter((e) => e.type === 'poly' && e.layer === labels.layer && !e.closed);
  assert.equal(arrows.length, 3, 'the arrow: three open polylines');
  for (const e of [...texts, ...arrows]) {
    assert.equal(e.layer, labels.layer);
    assert.equal(e.color, labels.aci, `${e.type} ${e.str || ''} carries the cabinet's ACI`);
  }
  for (const e of top.entities.filter((x) => x.layer !== labels.layer)) assert.equal(e.color, undefined, `${e.layer}: no colour of its own`);
  // read back: parseDxf returns the entity's own colour, the same number as its layer row
  const parsed = parseDxf(top.dxf);
  const row = parsed.layerTable.find((l) => l.name === labels.layer);
  assert.equal(row.color, labels.aci);
  const back = parsed.entities.filter((e) => e.layer === labels.layer);
  assert.equal(back.length, texts.length + arrows.length);
  assert.ok(back.every((e) => e.color === row.color));
  assert.ok(parsed.entities.filter((e) => e.layer !== labels.layer).every((e) => e.color === undefined));
});

test('T79 F15 · one colour index, two places: labelLayerRow and labelFor carry labelAciOf (7 when the record has none)', () => {
  const labels = labelsOf(1);
  assert.equal(labelAciOf(labels), labels.aci);
  assert.deepEqual(labelLayerRow(labels), [{ name: labels.layer, aci: labels.aci }]);
  assert.equal(labelFor(labels, 'TOP').aci, labels.aci);
  const bare = { layer: 'LABEL_X', byPanel: new Map() };
  assert.equal(labelAciOf(bare), 7);
  assert.equal(labelLayerRow(bare)[0].aci, 7);
  assert.equal(labelFor(bare, 'TOP').aci, 7);
  assert.equal(labelFor(null, 'TOP'), null);
});

test('T79 F15 · the material sheet across six cabinets: each cabinet\'s words in its own colour, on the entity', () => {
  const text = sheetOf(true);
  const onLabel = assertLabelColours(text, 'SHEET');
  const seen = new Map();
  for (const r of onLabel) seen.set(r.layer, r.color);
  results.forEach((_, i) => assert.equal(seen.get(labelsOf(i).layer), labelsOf(i).aci, `${labelsOf(i).layer} in ${labelsOf(i).aci}`));
  assert.ok(new Set(seen.values()).size > 1, 'more than one colour on the sheet');
});

test('T79 F15 · an OUTSIDE FACE UP board (Cabineo 12 TOP) keeps the colour through the one reflection', () => {
  const r = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', joints_system: 'cabineo12' }, P);
  const cplan = partNumberPlan([{ id: 'c', unitNum: r.unitNum, panels: r.panels }], P);
  const labels = dxfLabelsFor(cplan, 'c');
  const top = r.panels.find((p) => p.id === 'TOP');
  assert.ok(isOutsideFace(top), 'the TOP is machined from the outside face');
  const file = buildUnitDxfFiles(r, P, { labels }).find((f) => f.panelId === 'TOP');
  assert.equal(file.setup, 'outside');
  assertLabelColours(file.dxf, 'cabineo TOP');
  assert.equal(panelDxf(top, r.drills, { unitNum: r.unitNum, profile: P, labels }), file.dxf, 'panelDxf, the same answer');
});

// ═══ B. WITHOUT A PLAN: THE FILE IS WHAT IT WAS ══════════════════════════════

test('T79 F15 · without a labels plan every file is the pre-change file to the byte, and no entity carries a colour', () => {
  results.forEach((r, i) => {
    const text = unitText(i, null);
    assert.equal(sha(text), BEFORE[SIX[i]].plain, `${SIX[i]}: unit files unchanged`);
    assert.equal(recordsOf(text).records.filter((x) => x.colours).length, 0);
    assert.equal(sha(buildUnitDxfFiles(r, P, { labels: null }).map((f) => f.dxf).join('\n')), BEFORE[SIX[i]].plain);
  });
  const sheet = sheetOf(false);
  assert.equal(sha(sheet), BEFORE.SHEET.plain, 'the material sheet unchanged');
  assert.equal(recordsOf(sheet).records.filter((x) => x.colours).length, 0);
});

test('T79 F15 · with a plan the ONLY delta is the entity-level 62: taken out, every file is the pre-change file to the byte', () => {
  results.forEach((r, i) => {
    const files = buildUnitDxfFiles(r, P, { labels: labelsOf(i) });
    assert.notEqual(sha(files.map((f) => f.dxf).join('\n')), BEFORE[SIX[i]].plan, `${SIX[i]}: the colour is written`);
    assert.equal(sha(files.map((f) => withoutEntityColours(f.dxf)).join('\n')), BEFORE[SIX[i]].plan, `${SIX[i]}: nothing else moved`);
  });
  assert.equal(sha(withoutEntityColours(sheetOf(true))), BEFORE.SHEET.plan, 'the material sheet: nothing else moved');
});

// ═══ C. THE WRITER: 62 AFTER THE LAYER, ONLY WHEN ASKED ═════════════════════

test('T79 F15 · writeDxf writes an entity\'s own colour as 62 right after its layer on every record it writes; an entity without one is written as before', () => {
  const layers = [{ name: 'LABEL_W01', color: 30 }];
  const ents = [
    { type: 'poly', layer: 'LABEL_W01', closed: false, pts: [[0, 0], [10, 0]] },
    { type: 'circle', layer: 'LABEL_W01', cx: 1, cy: 1, r: 1 },
    { type: 'arc', layer: 'LABEL_W01', cx: 1, cy: 1, r: 1, start: 0, end: 90 },
    { type: 'text', layer: 'LABEL_W01', x: 5, y: 5, h: 3, str: '#01' },
  ];
  const plain = writeDxf(ents, layers);
  const coloured = writeDxf(ents.map((e) => ({ ...e, color: 30 })), layers);
  assert.equal(recordsOf(plain).records.filter((r) => r.colours).length, 0);
  assert.equal(withoutEntityColours(coloured), plain, 'the colour is the only addition');
  const { records } = recordsOf(coloured);
  assert.deepEqual(records.map((r) => r.type), ['POLYLINE', 'VERTEX', 'VERTEX', 'SEQEND', 'CIRCLE', 'ARC', 'TEXT']);
  assert.ok(records.every((r) => r.colours === 1 && r.color === 30));
  const lines = coloured.split('\r\n');
  const at = lines.indexOf('TEXT');
  assert.deepEqual(lines.slice(at, at + 5), ['TEXT', '8', 'LABEL_W01', '62', '30']);
});

// ═══ D. AS THE CLIENT CLICKS: THE CNC TREE'S THREE EXPORTS ═══════════════════
// components/CncTree.jsx makes the plan with lib/partLabels.js projectLabelPlan
// and hands each export labelsForUnit(plan, unit.id) (or the plan itself, for
// a material); the files that reach the download carry the colour.

async function captureDownload(run) {
  const saved = { document: globalThis.document, create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  let blob; let name;
  URL.createObjectURL = (value) => { blob = value; return 'blob:test'; };
  URL.revokeObjectURL = () => {};
  globalThis.document = { body: { appendChild() {} }, createElement: () => ({ click() { name = this.download; }, remove() {} }) };
  try {
    const output = await run();
    return { output, name, blob };
  } finally {
    if (saved.document === undefined) delete globalThis.document; else globalThis.document = saved.document;
    URL.createObjectURL = saved.create; URL.revokeObjectURL = saved.revoke;
  }
}

test('T79 F15 · the CNC tree\'s unit ZIP, sheet and material exports (projectLabelPlan, labelsForUnit, lib/cncExport) write the colour on every LABEL entity; without a plan none', async () => {
  const appUnits = [{ id: 'a', params: { unit_num: '01' } }, { id: 'b', params: { unit_num: '02' } }];
  const appResults = { a: results[0], b: results[1] };
  const appPlan = projectLabelPlan({ units: appUnits, resultOf: (id) => appResults[id], profile: P });
  const aLabels = labelsForUnit(appPlan, 'a');
  assert.equal(aLabels.layer, 'LABEL_01');

  const zipped = await captureDownload(() => exportUnitDxfZip(results[0], P, { exportAnyway: true, labels: aLabels }));
  const zip = await JSZip.loadAsync(await zipped.blob.arrayBuffer());
  const dxfNames = Object.keys(zip.files).filter((n) => /\.dxf$/.test(n));
  assert.ok(dxfNames.length > 5, 'the unit ZIP holds the parts');
  let labelled = 0;
  for (const n of dxfNames) labelled += assertLabelColours(await zip.file(n).async('string'), `ZIP ${n}`).length;
  assert.ok(labelled > 0, 'the ZIP\'s files carry LABEL entities');

  const ids = exportablePanels(results[0].panels).map((p) => p.id);
  const sheet = await captureDownload(() => exportSheetDxf(results[0], ids, P, { exportAnyway: true, labels: aLabels }));
  const sheetText = await sheet.blob.text();
  assert.ok(assertLabelColours(sheetText, 'SHEET').every((r) => r.color === aLabels.aci), 'the sheet: the cabinet\'s ACI');
  const plainSheet = await captureDownload(() => exportSheetDxf(results[0], ids, P, { exportAnyway: true }));
  assert.equal(recordsOf(await plainSheet.blob.text()).records.filter((r) => r.colours).length, 0, 'no plan, no colour');

  const entries = appUnits.map((u) => ({ unit: u, result: appResults[u.id], panels: exportablePanels(appResults[u.id].panels) }));
  const material = await captureDownload(() => exportMaterialDxf(entries, { profile: P, exportAnyway: true, plan: appPlan }));
  const onLabel = assertLabelColours(await material.blob.text(), 'MATERIAL');
  const colours = new Map(onLabel.map((r) => [r.layer, r.color]));
  assert.equal(colours.get('LABEL_01'), aLabels.aci);
  assert.equal(colours.get('LABEL_02'), labelsForUnit(appPlan, 'b').aci);
  assert.notEqual(colours.get('LABEL_01'), colours.get('LABEL_02'), 'two cabinets, two colours');
});
