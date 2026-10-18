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
const BEFORE = {
  WARDROBE: { plain: '0ff434a112102a476ebf911453a31acdd90d9334ff8d86d7ab644b10a667dac1', plan: '978637bc86acdbf3b19b26a6a710070250493f4303b4860dbf8c2b405bcafddb' },
  BUD: { plain: '7dfd770b47b547a9800834dd1fb079c5a559a5a5b9fce58dacb2a43e74e59ef2', plan: 'aa9ae6f63f48b35fbc45774c42c93d46c616e52e8909aeda6e3a849c78eb46cb' },
  WUD: { plain: '736e9170cb1c9a99b733f94828f92dc385d64f643e1e1b99a969345b482654e1', plan: '6bd81c864c5664a0c4828639ae367a064f9f74dc44b117f903e1a42724d2a9fd' },
  BUDR: { plain: '4e1c176fc91906b002cf76676c67abf0331130ecfc8df84a3d2f4957ff9849ea', plan: 'f2de53f79dbd22aac09cf36d9043a405df9b39fb673a46910f0890749be5a294' },
  BUDR4: { plain: '3d7ecad5b4d2d58017856c1aeef6ffca0fee9d6641cfd54aed11bb1df03c2eed', plan: 'd5f1294824a792ff6792d7489305527acbf9fadf20af3b9359e9c9d340ffdc90' },
  PANTRY: { plain: 'a5a5e3ed10e804ebb068a5830d994aaf53e2d26876dedfb3b4dd845e9206f447', plan: '6c59ed233aa8a1a2413c07e69faca4376596e567668227ca2d05a93eb649b63e' },
  SHEET: { plain: 'ae6690f0419fc6bbc7f04595958651e4ec9f1cb5d228804ef9a483dd242daae2', plan: '5ecdd09969c408d41985f3428a632bd512c915e9c76729821a0b75553a5abe4b' },
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
