/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// CHAT FIX 31.10.2026 . NO YELLOW ON THE MACHINE FILE, THE SHEET WEARS THE DXF'S COLOURS, EVERY FIGURE CLOSED.
// The owner, 31.10.2026: *"zmien prosze layer cabineo dziury kolor z zoltego, raczej staraj sie wszedzie omijac zolty
// bo on jest mega nie widoczny na bialym tle (na takim pracuje vcarve)"*; on the mapping: *"1 ok, ale staraj sie
// trzymac w exporcie do DXF i u nas te same kolory, prosze upewnij sie ze wszystkie nasze figury w cnc sa zamkniete"*;
// *"cyjan jest ok, tylko jasny zolty jest nie widoczny"*; *"koduj"*.
//
// Three laws, each read the way the client sees it:
//   1. THE YELLOW FAMILY IS GONE. AutoCAD's index 2 (yellow) and 40 to 59 (amber to pale yellow) are on no layer the
//      app declares (engine/cnc/layers.js, lib/ledGroove.js, a decorated front's pockets) and on no `_C` of any LISP
//      kit in reference/lisp. Cyan (4) stays: the owner's word.
//   2. THE SHEET FOLLOWS THE FILE. For every layer this fix touched, the preview's ink is the DXF's own colour lifted
//      toward white (never darkened, the same hue within a few degrees) until it reads on the black sheet at 3.5 : 1.
//   3. EVERY FIGURE IS CLOSED. On every golden job this repository holds, every POLYLINE the DXF writes on an outline
//      or a pocket layer carries the closed flag, has three points or more and does not repeat its first point as its
//      last (no zero-length closing segment for VCarve to trip on); the owner's MARKS (the 4 mm biscuit line and the
//      corner mark) are the open walks he asked for and nothing else is open.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { CNC_LAYERS, cncLayer } from '../src/engine/cnc/layers.js';
import { buildUnitDxfFiles, parseDxf } from '../src/engine/cnc/dxf.js';
import { frontDecorationLayers } from '../src/engine/cnc/frontOperations.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { buildFrontDecoration, defaultFrontDecoration } from '../src/engine/frontDecoration.js';
import { LED_GROOVE_LAYER } from '../src/lib/ledGroove.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** AutoCAD's own index: 2 is yellow, 40 to 59 run from amber through yellow to the pale yellows. */
const isYellowFamily = (aci) => aci === 2 || (aci >= 40 && aci <= 59);

// ─── 1. THE YELLOW FAMILY IS GONE ───────────────────────────────────────────

test('no CNC layer of the engine wears the yellow family; cyan stays', () => {
  for (const l of CNC_LAYERS) assert.equal(isYellowFamily(l.aci), false, `${l.name} is ACI ${l.aci}, the yellow family`);
  assert.equal(isYellowFamily(LED_GROOVE_LAYER.aci), false, `LED_GROOVE is ACI ${LED_GROOVE_LAYER.aci}`);
  // *"cyjan jest ok"*: the screws and the hanger cut-out keep their 4.
  assert.equal(cncLayer('SCREWS_3MM').aci, 4);
  assert.equal(cncLayer('HANGER_HOLE').aci, 4);
  // The owner's own words were about the Cabineo: the five are no longer 47 to 51.
  assert.deepEqual(
    ['CABINEO_POCKET_15MM', 'CABINEO_POCKET_10MM', 'CABINEO_POCKET_12MM', 'CABINEO_RECESS', 'CABINEO_HOLE_5MM'].map((n) => cncLayer(n).aci),
    [200, 202, 204, 212, 150],
  );
});

test('a decorated front\'s pockets wear the shaker pocket\'s 32, its centre lines the cyan 4', () => {
  // The house's own decorated fronts (engine/frontDecoration.js): a grooved-and-fluted style (GF) carries pockets and
  // centre lines, an all-over pocket style (AM) pockets alone.
  const seen = { pocket: 0, line: 0 };
  for (const style of ['GF', 'FL', 'AM']) {
    const result = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', front_type: 'F' }, P);
    const panel = result.panels.find((p) => p.part === 'FRONT');
    panel.meta = { ...panel.meta, frontDecoration: buildFrontDecoration({ panel, config: defaultFrontDecoration(style, P), profile: P }) };
    for (const l of frontDecorationLayers([panel])) {
      assert.equal(isYellowFamily(l.aci), false, `${style} ${l.name} is ACI ${l.aci}`);
      if (l.kind === 'pocket') {
        seen.pocket += 1;
        assert.deepEqual([l.aci, l.screen], [cncLayer('SHAKER_PANEL_POCKET').aci, cncLayer('SHAKER_PANEL_POCKET').screen], `${style} ${l.name}`);
      } else if (l.kind === 'mark') {
        seen.line += 1;
        assert.equal(l.aci, 4, `${style} ${l.name} keeps the cyan`);
      }
    }
  }
  assert.ok(seen.pocket > 0 && seen.line > 0, `the three styles declared pockets (${seen.pocket}) and lines (${seen.line})`);
});

test('no LISP kit declares a layer in the yellow family', () => {
  const dir = join(ROOT, 'reference', 'lisp');
  const files = readdirSync(dir).filter((f) => f.endsWith('.lsp'));
  assert.ok(files.length > 20, 'the kits are there');
  const found = [];
  for (const f of files) {
    const text = readFileSync(join(dir, f), 'utf8');
    // (command "._LAYER" "_N" NAME "_C" "n" NAME "") and the Cabineo drawing's (cab-layer NAME "n").
    for (const m of text.matchAll(/"_C"\s+"(\d+)"/g)) if (isYellowFamily(Number(m[1]))) found.push(`${f}: _C ${m[1]}`);
    for (const m of text.matchAll(/\(cab-layer\s+[^()]*(?:\([^()]*\))?[^()]*"(\d+)"\)/g)) if (isYellowFamily(Number(m[1]))) found.push(`${f}: cab-layer ${m[1]}`);
    for (const m of text.matchAll(/\(T\s+"(\d+)"\)\)\)/g)) if (isYellowFamily(Number(m[1]))) found.push(`${f}: cab-layer cond ${m[1]}`);
  }
  assert.deepEqual(found, [], 'yellow-family layer colours in the LISP');
  // The kits name the same numbers the engine's table does, where both declare the layer.
  const common = read('reference/lisp/SKYLON_COMMON.lsp');
  assert.match(common, /"PUZZLE_DOG_BONES" "_C" "12"/);
  assert.match(read('reference/lisp/KIT_BUDR_FULL.lsp'), /"DRAWER_BOTTOM_POCKET" "_C" "230"/);
  assert.match(read('reference/lisp/KIT_WARDROBE_FULL.lsp'), /"DRAWER_BOTTOM_POCKET" "_C" "230"/);
  assert.match(read('reference/lisp/KIT_CORNER_L.lsp'), /"CORNER_4MM" "_C" "14"/);
  assert.match(read('reference/lisp/KIT_NOTCH.lsp'), /"CORNER_4MM" "_C" "14"/);
  assert.match(read('reference/lisp/KIT_LED_GROOVE.lsp'), /"LED_GROOVE" "_C" "180"/);
  assert.match(read('reference/lisp/KIT_FRONT_JPULL.lsp'), /"JPULL_EDGE" "_C" "92"/);
  const hawa = read('reference/lisp/KIT_HAWA.lsp');
  for (const [name, aci] of [['HAWA_3MM', 220], ['FRONT_HINGES_5MM_D13', 222], ['FRONT_HINGES_8MM_D13', 224], ['HAWA_FOOT_35MM', 190], ['HAWA_GROOVE_12MM', 192], ['FRONT_HINGES_35MM_D13', 194]]) {
    assert.match(hawa, new RegExp(`"${name}" "_C" "${aci}"`), `KIT_HAWA.lsp ${name} ${aci}`);
    assert.equal(cncLayer(name).aci, aci, `engine ${name} ${aci}`);
  }
  const watch = read('reference/lisp/KIT_WATCH_DRAWER.lsp');
  for (const [name, aci] of [['WATCH_DIVIDER_SLOT', 34], ['WATCH_GLASS_REBATE', 172], ['WATCH_GLASS_OPENING', 174]]) {
    assert.match(watch, new RegExp(`"${name}" "_C" "${aci}"`), `KIT_WATCH_DRAWER.lsp ${name} ${aci}`);
    assert.equal(cncLayer(name).aci, aci, `engine ${name} ${aci}`);
  }
  const cabineo = read('reference/lisp/SKYLON_JOINTS_CABINEO.lsp');
  assert.match(cabineo, /"drill15"\) "200"\)/);
  assert.match(cabineo, /"cutter10"\) "202"\)/);
  assert.match(cabineo, /\(T "204"\)\)\)/);
  assert.match(cabineo, /\(cab-layer \(cabineo-recess-layer\) "212"\)/);
  assert.match(cabineo, /\(cab-layer \(cabineo-hole-layer\) "150"\)/);
});

// ─── 2. THE SHEET FOLLOWS THE FILE ──────────────────────────────────────────

// AutoCAD's index palette for the numbers this fix uses (the 255 / 189 / 129 ladder of AutoCAD's own Index Color
// dialog; Blender's dxfColorMap and dxf-parser carry the same numbers).
const ACI_RGB = {
  12: [189, 0, 0], 14: [129, 0, 0], 22: [189, 46, 0], 32: [189, 94, 0], 34: [129, 64, 0], 84: [31, 129, 0], 86: [25, 104, 0],
  142: [0, 141, 189], 150: [0, 127, 255], 162: [0, 46, 189], 170: [0, 0, 255], 172: [0, 0, 189], 174: [0, 0, 129],
  180: [63, 0, 255], 190: [127, 0, 255], 192: [94, 0, 189], 194: [64, 0, 129], 200: [191, 0, 255], 202: [141, 0, 189],
  204: [96, 0, 129], 212: [189, 0, 189], 220: [255, 0, 191], 222: [189, 0, 141], 224: [129, 0, 96], 230: [255, 0, 127],
};
const SHEET = [0x13, 0x13, 0x13]; // components/CncView.jsx bg-[#131313]
const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lin = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a, b) => { const [h, l] = [lum(a), lum(b)].sort((x, y) => y - x); return (h + 0.05) / (l + 0.05); };
const hue = ([r, g, b]) => {
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); const d = max - min;
  if (d === 0) return 0;
  let h;
  if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
  return ((h * 60) + 360) % 360;
};
const hueGap = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

const TOUCHED = [
  'PUZZLE_DOG_BONES', 'BISCUIT_4MM', 'SHAKER_PANEL_POCKET', 'HANDLES_5MM', 'HINGES_3MM', 'DOWEL_8MM', 'DOWEL_EDGE_8MM',
  'CABINEO_POCKET_15MM', 'CABINEO_POCKET_10MM', 'CABINEO_POCKET_12MM', 'CABINEO_RECESS', 'CABINEO_HOLE_5MM', 'RECESS_WINDOW',
  'CORNER_4MM', 'HAWA_3MM', 'FRONT_HINGES_5MM_D13', 'FRONT_HINGES_8MM_D13', 'HAWA_FOOT_35MM', 'HAWA_GROOVE_12MM',
  'FRONT_HINGES_35MM_D13', 'DRAWER_BOTTOM_POCKET', 'WATCH_DIVIDER_SLOT', 'WATCH_GLASS_REBATE', 'WATCH_GLASS_OPENING',
];

test('every layer this fix touched paints the DXF\'s own colour, lifted toward white only until it reads on the black sheet', () => {
  const rows = [...TOUCHED.map((n) => cncLayer(n)), LED_GROOVE_LAYER];
  for (const l of rows) {
    const dxf = ACI_RGB[l.aci];
    assert.ok(dxf, `${l.name}: ACI ${l.aci} is in the palette this test knows`);
    const ink = rgbOf(l.screen);
    // Lifted, never darkened: every channel at or above the index's own.
    for (let i = 0; i < 3; i += 1) assert.ok(ink[i] >= dxf[i] - 1, `${l.name}: ${l.screen} darkens channel ${i} of the DXF's rgb(${dxf})`);
    // The same hue, within the rounding of a lift.
    assert.ok(hueGap(hue(ink), hue(dxf)) <= 6, `${l.name}: ${l.screen} is hue ${hue(ink).toFixed(1)}, the DXF's is ${hue(dxf).toFixed(1)}`);
    // Readable on the sheet, and not lifted further than that needs (a lift of 2 % less would fall under the floor,
    // or the index is bright enough to be painted as it is).
    const c = contrast(ink, SHEET);
    assert.ok(c >= 3.5, `${l.name}: ${l.screen} reads at ${c.toFixed(2)} : 1 on the sheet, under the 3.5 floor`);
    const asIs = ink.every((v, i) => v === dxf[i]);
    if (!asIs) {
      const lifted = ink.map((v, i) => v - (255 - dxf[i]) * 0.02);
      assert.ok(contrast(lifted, SHEET) < 3.5, `${l.name}: ${l.screen} is lifted further than the floor needs`);
    } else {
      assert.ok(c >= 3.5, `${l.name}: painted as it is, it must already read`);
    }
  }
});

// ─── 3. EVERY FIGURE IS CLOSED ──────────────────────────────────────────────

/** Every job the repository's goldens hold, as params computeCabinet takes. */
function goldenJobs() {
  const dir = join(ROOT, 'fixtures');
  const jobs = [];
  const paramsOf = (i) => ({
    type: i.type, width: i.width, height: i.height, depth: i.depth, board_t: i.board_t, front_t: i.front_t,
    front_type: i.front_type, shelves: i.shelves, drawers: i.drawers, rail: i.rail, rail_offset: i.rail_offset,
    hinge: i.hinge, unit_num: i.unit_num,
  });
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    let j;
    try { j = JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch { continue; }
    if (j && j.params && j.params.type) jobs.push({ name: f, params: j.params });
    for (const c of Array.isArray(j?.cases) ? j.cases : []) {
      if (c?.inputs?.type && c.inputs.width && c.inputs.height && c.inputs.depth) jobs.push({ name: `${f} ${c.id}`, params: paramsOf(c.inputs) });
    }
    for (const u of Array.isArray(j?.units) ? j.units : []) {
      if (u?.params?.type) jobs.push({ name: `${f} ${u.id}`, params: u.params });
    }
  }
  return jobs;
}

const kindOf = (layer) => (layer === LED_GROOVE_LAYER.name ? LED_GROOVE_LAYER.kind : CNC_LAYERS.find((l) => l.name === layer)?.kind || null);

test('on every golden job, every outline and pocket the DXF writes is a closed polyline with no zero-length closing segment', () => {
  const jobs = goldenJobs();
  assert.ok(jobs.length >= 60, `enough jobs to mean something (${jobs.length})`);
  let closed = 0; let marks = 0; let files = 0;
  const faults = [];
  for (const job of jobs) {
    let result;
    try { result = computeCabinet(job.params, P); } catch (e) { continue; }
    if (!result || !Array.isArray(result.panels) || result.error) continue;
    const dxfFiles = buildUnitDxfFiles(result, P, { userLayers: [LED_GROOVE_LAYER] });
    for (const f of dxfFiles) {
      files += 1;
      const { entities } = parseDxf(f.dxf);
      for (const e of entities) {
        if (e.type !== 'poly') continue;
        const kind = kindOf(e.layer);
        if (kind === null || kind === 'text') continue;
        const pts = e.pts;
        const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
        if (kind === 'outline' || kind === 'pocket') {
          if (!e.closed) faults.push(`${job.name} ${f.name}: ${e.layer} polyline is OPEN`);
          if (pts.length < 3) faults.push(`${job.name} ${f.name}: ${e.layer} polyline has ${pts.length} points`);
          if (pts.length >= 2 && same(pts[0], pts[pts.length - 1])) faults.push(`${job.name} ${f.name}: ${e.layer} repeats its first point as its last`);
          for (let i = 1; i < pts.length; i += 1) if (same(pts[i - 1], pts[i])) faults.push(`${job.name} ${f.name}: ${e.layer} has a zero-length segment at ${i}`);
          closed += 1;
        } else if (kind === 'mark') {
          // The owner's own open walks: the biscuit line (2 points) and the corner mark (3 points, one L).
          if (e.closed) faults.push(`${job.name} ${f.name}: ${e.layer} mark is closed`);
          if (pts.length < 2 || pts.length > 3) faults.push(`${job.name} ${f.name}: ${e.layer} mark has ${pts.length} points`);
          marks += 1;
        } else if (kind === 'hole') {
          faults.push(`${job.name} ${f.name}: a polyline on the hole layer ${e.layer}`);
        }
      }
    }
  }
  assert.deepEqual(faults, []);
  assert.ok(files >= 300, `the walk covered the sheets (${files} files)`);
  assert.ok(closed >= 300, `closed figures counted (${closed})`);
  assert.ok(marks >= 1, `at least one job carries a mark (${marks})`);
});

test('the writer itself: a pocket record and an outline close, a mark stays open, by construction', () => {
  const src = read('src/engine/cnc/dxf.js');
  assert.match(src, /closed: true,\s*\n\s*pts: outline\.map/);
  assert.match(src, /entities\.push\(\{ type: 'poly', layer: pocket\.layer, closed: true, pts: pocketPoints\(pocket\) \}\)/);
  assert.match(src, /entities\.push\(\{ type: 'poly', layer: mark\.layer, closed: false, pts: markPoints\(mark\) \}\)/);
  assert.match(src, /put\(70, e\.closed \? 1 : 0\)/);
});
