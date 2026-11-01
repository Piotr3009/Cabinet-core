/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// CNC SPEED 01.11.2026 . THE ENGINE HALF (Bruno)
//
// The owner, 01.11.2026: "1 - ok, 2 - ok". The CNC slowness since 743b8e91
// (19.10.2026, the labels on the board) had two causes, measured on the
// owner's Black Kitchen:
//   S1 `cnc/labelAnchor.js labelAnchors` searched a place for the note even
//      when no note is asked (noteSize 0): the note point sits ON the top edge,
//      `roomAt` calls that off the board, and a grid scan through every outline
//      vertex ran for every board of every cabinet. Now no note asked is no
//      search; the caption and a drawn note stand exactly where they stood.
//   S2 `engine/checks.js runChecks` asked the export gate
//      (`cnc/exportGate.js unitFindings`) of EVERY cabinet on every change,
//      and the gate writes every board's DXF entity list to ask it. Now the
//      gate's answer is remembered per result object (the SAME object the
//      result cache hands back for an unchanged cabinet), per profile object
//      and per unit id and number; a new result or a new profile is a new
//      answer.
// These hold both to their law: the same words, the same arrays, less work.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { labelAnchors, onBoardPoint, roomAt, throughWindows } from '../src/engine/cnc/labelAnchor.js';
import { labelBlock } from '../src/engine/cnc/annotation.js';
import { panelNoteBlock, panelEntities } from '../src/engine/cnc/dxf.js';
import { unitFindings, exportGate, gateMemo } from '../src/engine/cnc/exportGate.js';
import { resultFindings } from '../src/engine/cnc/edgeGuard.js';
import { drillFindings } from '../src/engine/cnc/drillGuard.js';
import { offBoardGateFindings } from '../src/engine/cnc/offBoardGuard.js';
import { frontDecorationFindings, frontLayerFindings } from '../src/engine/cnc/frontOperations.js';
import { runChecks } from '../src/engine/checks.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');

const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });
const cut = (type, extra = {}) => computeCabinet(kit(type, extra), P);

/** An outline that counts how often its vertices are read (the work a search does). */
function counting(pts) {
  const seen = { reads: 0 };
  const outline = new Proxy(pts, {
    get(target, key, receiver) {
      if (typeof key === 'string' && /^\d+$/.test(key)) seen.reads += 1;
      return Reflect.get(target, key, receiver);
    },
  });
  return { outline, seen };
}

/** What the gate answered before S2, asked of the guards directly (no memory). */
function freshFindings(result, { profile, unitId, unitNum }) {
  const num = unitNum || result?.unitNum || '';
  return [
    ...resultFindings(result).map((f) => ({
      check: 9, level: 'red', unitId, unitNum: num, panel: f.panel, part: f.part, layer: f.layer, code: f.code,
      message: `${num ? `${num} ` : ''}${f.message}`,
    })),
    ...drillFindings(result, { profile, unitId, unitNum: num }),
    ...offBoardGateFindings(result, { profile, unitId, unitNum: num, panelEntities }),
    ...frontDecorationFindings(result, { unitId, unitNum: num }),
    ...frontLayerFindings([{ result, unit: { id: unitId } }]),
  ];
}

const RECT = [[0, 0], [600, 0], [600, 770], [0, 770]];
const STRIP = [[0, 80], [600, 80], [600, 100], [0, 100]];

// ═══ S1 · NO NOTE ASKED, NO SEARCH FOR ITS PLACE ═════════════════════════════

test('S1: noteSize 0 puts the note at its intended point on the top edge without a grid scan; the caption is what it was', () => {
  // A rectangle: the caption is on the board where it always was; the note's
  // point (w / 2, h) is on the top edge. Main read the outline 49 016 times
  // here (the grid scan of a note nobody draws); now a handful.
  const r = counting(RECT);
  const a = labelAnchors({ w: 600, h: 770, cnc: { outline: r.outline } }, { captionH: 16 });
  assert.deepEqual(a, { caption: [300, 385], note: [300, 770], noteCentre: [300, 770], box: [0, 0, 600, 770] });
  assert.ok(r.seen.reads < 100, `no grid scan for a note nobody asked (${r.seen.reads} vertex reads)`);
  // The dishwasher plinth's strip: the caption still moves onto the strip by
  // the same law (its own search is the caption's, asked), the note does not
  // search: half the work main did (576 048 reads there, 288 024 here).
  const s = counting(STRIP);
  const b = labelAnchors({ w: 600, h: 100, cnc: { outline: s.outline } }, { captionH: 8 });
  assert.deepEqual(b.caption, onBoardPoint(300, 50, STRIP, [], 4), 'the caption: the one law, unchanged');
  assert.deepEqual(b.note, [300, 100], 'the note: its intended point, unmoved');
  const withNote = counting(STRIP);
  labelAnchors({ w: 600, h: 100, cnc: { outline: withNote.outline } }, { captionH: 8, noteSize: 6 });
  assert.ok(s.seen.reads < withNote.seen.reads, `no note asked does less work (${s.seen.reads} < ${withNote.seen.reads})`);
  // A back with a window: the caption steps out of the window exactly as before.
  const back = { w: 600, h: 770, thickness: 18, cnc: { outline: RECT, pockets: [{ layer: 'RECESS_WINDOW', x1: 110, y1: 210, x2: 490, y2: 590, depth: 18 }] } };
  assert.deepEqual(labelAnchors(back, { captionH: 20 }).caption, onBoardPoint(300, 385, RECT, throughWindows(back), 10));
  assert.ok(roomAt(...labelAnchors(back, { captionH: 20 }).caption, RECT, throughWindows(back)) >= 0);
});

test('S1: a note that IS asked (noteSize above 0) is placed exactly as before, searched when off the board', () => {
  const rect = { w: 600, h: 770, cnc: { outline: RECT } };
  assert.deepEqual(labelAnchors(rect, { captionH: 16, noteSize: 10 }), { caption: [300, 385], note: [300, 758], noteCentre: [300, 758], box: [0, 0, 600, 770] });
  // The strip's note at 6 mm: the first line h - 7.2 = 92.8 is on the strip, it stays.
  const strip = { w: 600, h: 100, cnc: { outline: STRIP } };
  assert.deepEqual(labelAnchors(strip, { captionH: 8, noteSize: 6 }).note, [300, 92.8]);
  // A note whose point is in a window is still moved onto the board by the same search.
  const back = { w: 600, h: 770, thickness: 18, cnc: { outline: RECT, pockets: [{ layer: 'RECESS_WINDOW', x1: 0, y1: 700, x2: 600, y2: 770, depth: 18 }] } };
  const n = labelAnchors(back, { noteSize: 10 });
  assert.deepEqual(n.note, onBoardPoint(300, 758, RECT, throughWindows(back), 5));
  assert.ok(roomAt(n.note[0], n.note[1], RECT, throughWindows(back)) >= 0, `moved onto the board (${n.note})`);
});

test('S1: every caller reads the note only when it is drawn, and a drawn note always has a size above 0', () => {
  // The one layout of a note (`cnc/annotation.js labelBlock`): hidden means size 0, drawn means size above 0.
  const hidden = labelBlock({ text: '', sizeMm: 10 });
  assert.equal(hidden.visible, false);
  assert.equal(hidden.size, 0);
  const drawn = labelBlock({ text: 'BEVEL 45 BOTH ENDS', sizeMm: 10, boxW: 600, boxH: 100, minSize: 3 });
  assert.equal(drawn.visible, true);
  assert.ok(drawn.size > 0);
  // A plain board has no note: hidden, size 0.
  const side = cut('BUD').panels.find((p) => p?.cnc?.outline);
  const note = panelNoteBlock(side, { profile: P, ascii: true });
  assert.equal(note.visible, false);
  assert.equal(note.size || 0, 0);
  // The two readers: the DXF writer reads `anchors.note` only under `note.visible`,
  // the CNC sheet draws at `noteCentre` only under `slopeNote.visible`.
  const dxf = read('src/engine/cnc/dxf.js');
  const uses = [...dxf.matchAll(/anchors\.note/g)].map((m) => m.index);
  const gate = dxf.indexOf('if (note.visible) {');
  assert.ok(uses.length > 0 && gate > 0);
  const gateEnd = dxf.indexOf('for (const [i, line] of caption.lines.entries())', gate);
  for (const at of uses) assert.ok(at > gate && at < gateEnd, 'dxf.js reads anchors.note inside if (note.visible) only');
  const sheet = read('src/components/CncView.jsx');
  assert.match(sheet, /\{slopeNote\.visible && \(/);
  const noteXUses = [...sheet.matchAll(/\bnoteX\b/g)].map((m) => m.index);
  const drawnAt = sheet.indexOf('{slopeNote.visible && (');
  const defined = sheet.indexOf('const [noteX, noteY]');
  for (const at of noteXUses) assert.ok(at === defined + 'const ['.length || at > drawnAt, 'CncView.jsx draws the note only under slopeNote.visible');
});

test('S1: the DXF of a board with no note is the same entity list it was (caption at w / 2, h / 2, no note text)', () => {
  const r = cut('BUD');
  for (const panel of r.panels.filter((p) => p?.cnc?.outline)) {
    const note = panelNoteBlock(panel, { profile: P, ascii: true });
    if (note.visible) continue;
    const texts = panelEntities(panel, r.drills || [], { unitNum: '01', profile: P }).filter((e) => e.type === 'text');
    assert.ok(texts.length >= 1, `${panel.id} has its caption`);
    for (const t of texts) assert.ok(roomAt(t.x, t.y, panel.cnc.outline, throughWindows(panel)) >= 0 || t.str === 'EDGE', `${panel.id} "${t.str}" on the board`);
  }
});

// ═══ S2 · THE EXPORT GATE, ONE ANSWER PER UNCHANGED CABINET ═════════════════

test('S2: the gate answers the same words and arrays as the guards asked directly, and a second ask is remembered', () => {
  for (const type of ['BUD', 'WUD', 'DW_PANEL', 'WARDROBE', 'HAWA_POCKET']) {
    const result = cut(type);
    const opts = { profile: P, unitId: `u-${type}`, unitNum: '01' };
    const before = { ...gateMemo };
    const first = unitFindings(result, opts);
    assert.equal(gateMemo.computed, before.computed + 1, `${type}: asked once`);
    assert.deepEqual(first, freshFindings(result, opts), `${type}: the same findings as the guards`);
    const second = unitFindings(result, opts);
    assert.equal(gateMemo.computed, before.computed + 1, `${type}: not asked again`);
    assert.equal(gateMemo.reused, before.reused + 1, `${type}: remembered`);
    assert.deepEqual(second, first, `${type}: the same answer`);
    assert.notEqual(second, first, 'its own array');
  }
});

test('S2: each caller gets its own copy: writing on a finding never reaches the next caller', () => {
  const result = cut('BUD', { unit_num: '07' });
  const prof = { ...P, hinges: { ...P.hinges, minSpacingMm: 5000 } };
  const first = unitFindings(result, { profile: prof, unitId: 'copy', unitNum: '07' });
  assert.ok(first.length > 0, 'a finding to write on');
  const pristine = JSON.parse(JSON.stringify(first));
  first[0].message = 'written by a caller';
  if (first[0].rows) first[0].rows.push(-1);
  first.push({ check: 0 });
  assert.deepEqual(unitFindings(result, { profile: prof, unitId: 'copy', unitNum: '07' }), pristine);
});

test('S2: a changed profile, a changed cabinet, another unit id or number is asked again, never served stale', () => {
  const result = cut('BUD');
  const opts = { profile: P, unitId: 'stale', unitNum: '01' };
  const base = unitFindings(result, opts);
  assert.ok(!base.some((f) => f.code === 'hinge-rows-too-close'), 'the default profile: no hinge clash');
  // A new profile object with a minimum the hinges cannot meet: the clash is said.
  const strict = { ...P, hinges: { ...P.hinges, minSpacingMm: 5000 } };
  let n = gateMemo.computed;
  const withStrict = unitFindings(result, { ...opts, profile: strict });
  assert.equal(gateMemo.computed, n + 1, 'a new profile is asked again');
  assert.ok(withStrict.some((f) => f.code === 'hinge-rows-too-close'), 'the changed profile is read, not a stale answer');
  assert.deepEqual(withStrict, freshFindings(result, { ...opts, profile: strict }));
  // Back to the old profile object: its own answer, remembered.
  assert.deepEqual(unitFindings(result, opts), base);
  // Another unit number speaks in its own words.
  n = gateMemo.computed;
  const renamed = unitFindings(result, { ...opts, profile: strict, unitNum: '09' });
  assert.equal(gateMemo.computed, n + 1);
  assert.ok(renamed.every((f) => f.unitNum === '09'));
  assert.ok(renamed.filter((f) => f.code === 'hinge-rows-too-close').every((f) => f.message.startsWith('09')));
  // A changed cabinet is a new result object: asked again, its own answer.
  n = gateMemo.computed;
  const wider = cut('BUD', { width: 800 });
  assert.deepEqual(unitFindings(wider, opts), freshFindings(wider, opts));
  assert.equal(gateMemo.computed, n + 1);
  // No profile at all is a key of its own, never a profile's answer.
  n = gateMemo.computed;
  assert.deepEqual(unitFindings(result, { unitId: 'stale', unitNum: '01' }), freshFindings(result, { profile: null, unitId: 'stale', unitNum: '01' }));
  assert.equal(gateMemo.computed, n + 1);
});

test('S2: a second runChecks on an unchanged job reuses every cabinet\'s gate answer and says the same findings', () => {
  const units = ['BUD', 'WUD', 'DW_PANEL', 'BUDTALL'].map((type, i) => ({ id: `job-${i}`, type, params: kit(type, { unit_num: `0${i + 1}` }), position: { wall: 0, x_mm: i * 700 } }));
  const entries = units.map((unit) => ({ unit, result: computeCabinet(unit.params, P) }));
  const before = { ...gateMemo };
  const first = runChecks({ entries, units, profile: P });
  assert.equal(gateMemo.computed, before.computed + entries.length, 'the first run asks every cabinet');
  const mid = { ...gateMemo };
  const second = runChecks({ entries, units, profile: P });
  assert.equal(gateMemo.computed, mid.computed, 'the second run asks no cabinet again');
  assert.equal(gateMemo.reused, mid.reused + entries.length, 'every cabinet answered from memory');
  assert.deepEqual(second, first, 'the same findings, the same words');
  // One cabinet changed: only that one is asked.
  const changed = entries.map((e, i) => (i === 1 ? { ...e, result: computeCabinet({ ...e.unit.params, width: 500 }, P) } : e));
  const pre = { ...gateMemo };
  runChecks({ entries: changed, units, profile: P });
  assert.equal(gateMemo.computed, pre.computed + 1, 'only the changed cabinet is asked again');
  // A changed profile: every cabinet is asked again.
  const prof = { ...P, hinges: { ...P.hinges, minSpacingMm: 5000 } };
  const pre2 = { ...gateMemo };
  const strict = runChecks({ entries, units, profile: prof });
  assert.equal(gateMemo.computed, pre2.computed + entries.length);
  assert.ok(strict.some((f) => f.code === 'hinge-rows-too-close'), 'the new profile speaks');
});

test('S2: the export gate (three export buttons) holds out what it held out, through the same memory', () => {
  const result = cut('BUD', { unit_num: '03' });
  const prof = { ...P, hinges: { ...P.hinges, minSpacingMm: 5000 } };
  const gate1 = exportGate([{ unit: { id: 'eg' }, result }], { profile: prof });
  const gate2 = exportGate([{ unit: { id: 'eg' }, result }], { profile: prof });
  assert.equal(gate1.ok, false);
  assert.deepEqual(gate2.findings, gate1.findings);
  assert.deepEqual([...gate2.heldPanelIds], [...gate1.heldPanelIds]);
  assert.equal(gate2.message, gate1.message);
  assert.deepEqual(gate1.findings, freshFindings(result, { profile: prof, unitId: 'eg', unitNum: '03' }));
});
