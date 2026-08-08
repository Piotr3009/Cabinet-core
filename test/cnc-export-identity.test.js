// ─── Turn 11, CLAUDE.md F8.3: THE EXPORT IS UNTOUCHED ───────────────────────
//
// Turn 11 rebuilds the CNC VIEW — every unit at once, grouped, with a checkbox
// tree in the right-hand panel. CLAUDE.md is explicit that the EXPORT must not
// move a millimetre with it: "The CNC EXPORT (files, grouping, numbers) is
// untouched — prove it with an export-diff check in tests".
//
// So this is the proof, and it is deliberately a HARD one: a fingerprint of the
// actual DXF text for a known unit, taken from the pure generator the browser
// path calls (engine/cnc/dxf.js — lib/cncExport.js is the ZIP and the download
// around it and adds nothing to the content). If anything at all changes about
// what goes into a file — a coordinate, a layer name, a group code, the order of
// the entities — this fails and says by how much.
//
// The numbers below were taken from the engine on the turn-11 baseline, which
// is the point: they are what the machine has been cutting. If a future turn
// MEANS to change the output it changes them here, deliberately, in a commit
// that says so — which is the difference between a decision and an accident.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import {
  buildUnitDxfFiles, parseDxf, sheetDxf, sheetDxfFileName,
} from '../src/engine/cnc/dxf.js';
import { layoutPanels } from '../src/engine/cnc/layout.js';
import { exportablePanels, panelIdsForPreset, presetOfSelection } from '../src/engine/cnc/groups.js';
import { useUiStore } from '../src/stores/uiStore.js';

/** The unit this file is about. Ordinary, and every kind of part in it. */
const unit = () => computeCabinet({
  type: 'WARDROBE',
  width: 600,
  height: 2150,
  depth: 578,
  board_t: 18,
  front_t: 25,
  front_type: 'S',
  unit_num: '01',
  shelves: 2,
  drawers: 3,
  rail: true,
  doors: true,
  hinge: 'L',
}, P);

/**
 * A fingerprint of a string — 32-bit FNV-1a, written out rather than imported
 * so that this test depends on nothing but the engine it is checking.
 */
function fingerprint(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function sheetOf(result, ids) {
  const wanted = new Set(ids);
  const panels = exportablePanels(result.panels).filter((p) => wanted.has(p.id));
  const layout = layoutPanels(panels, result.drills, {
    gap: P.cnc.layoutGap,
    rowWidth: P.cnc.layoutRowWidth,
  });
  return sheetDxf({
    panels, drills: result.drills, layout, unitNum: result.unitNum, profile: P,
  });
}

// ─── the files ──────────────────────────────────────────────────────────────

test('the per-panel files are the same files, named the same way', () => {
  const files = buildUnitDxfFiles(unit(), P);
  assert.equal(files.length, 31, 'one DXF per cut part of this wardrobe');
  // The naming convention, which is what a workshop's folder is sorted by.
  for (const f of files) {
    assert.match(f.name, /^01-[A-Z0-9-]+\.dxf$/, `${f.name} is not the convention`);
  }
  assert.ok(files.some((f) => f.name === '01-BUL.dxf'));
  assert.ok(files.some((f) => f.name === '01-BACK.dxf'));
});

test('a per-panel DXF is byte-for-byte what it was', () => {
  const files = buildUnitDxfFiles(unit(), P);
  const bul = files.find((f) => f.name === '01-BUL.dxf');
  assert.equal(fingerprint(bul.dxf), '2165ad2e', 'the side panel’s DXF has changed');
});

// ─── the sheet ──────────────────────────────────────────────────────────────

test('the one-file sheet DXF is byte-for-byte what it was', () => {
  const result = unit();
  const all = exportablePanels(result.panels).map((p) => p.id);
  assert.equal(fingerprint(sheetOf(result, all)), '5692ffcb', 'the whole-unit sheet has changed');
});

test('…and so is each preset’s', () => {
  const result = unit();
  const expected = {
    all: '5692ffcb',
    'non-sprayed': '74ccd107',
    sprayed: 'a467790b',
    fronts: 'a467790b',
  };
  for (const [preset, print] of Object.entries(expected)) {
    const ids = panelIdsForPreset(exportablePanels(result.panels), preset);
    assert.equal(fingerprint(sheetOf(result, ids)), print, `the "${preset}" sheet has changed`);
  }
});

test('the file NAME still says which preset it is', () => {
  const result = unit();
  const sprayed = panelIdsForPreset(exportablePanels(result.panels), 'sprayed');
  assert.equal(presetOfSelection(result.panels, sprayed), 'fronts',
    'a wardrobe with no plinth or infill has nothing sprayed but its doors — the narrower name wins');
  assert.equal(sheetDxfFileName('01', 'non-sprayed'), '01-cnc-non-sprayed.dxf');
  assert.equal(sheetDxfFileName('01', 'custom'), '01-cnc-custom.dxf');
});

test('the entities are grouped by layer exactly as before', () => {
  const result = unit();
  const all = exportablePanels(result.panels).map((p) => p.id);
  const parsed = parseDxf(sheetOf(result, all));
  const byLayer = new Map();
  for (const e of parsed.entities) byLayer.set(e.layer, (byLayer.get(e.layer) || 0) + 1);
  const counts = Object.fromEntries([...byLayer].sort(([a], [b]) => a.localeCompare(b)));
  assert.deepEqual(counts, {
    FRONT_HINGES_35MM: 6,
    FRONT_HINGES_3MM: 12,
    HINGES_5MM: 12,
    OUTLINE: 31,
    PUZZLE_DOG_BONES: 18,
    PUZZLE_HOLES_7_5MM: 36,
    PUZZLE_SOCKET: 18,
    RUNNERS_3MM: 18,
    SCREWS_3MM: 50,
    SHELVES_7_5MM: 24,
    UNIT_NUMBER: 31,
  }, 'the layer census of the exported sheet has changed');
});

// ─── the view cannot reach it ───────────────────────────────────────────────

test('hiding a unit in the CNC VIEW changes no exported byte', () => {
  // The new checkbox tree is view state (uiStore) and the export is a pure
  // function of the unit's own result. This is the assertion that says the two
  // cannot become entangled: the fingerprint is taken with the store in both
  // states and it is the same fingerprint.
  const result = unit();
  const all = exportablePanels(result.panels).map((p) => p.id);
  const before = fingerprint(sheetOf(result, all));

  const ui = useUiStore.getState();
  ui.toggleCncUnit('some-unit-id');
  ui.toggleCncPart('some-unit-id', 'BUL');
  assert.ok(useUiStore.getState().cncHiddenUnits['some-unit-id'], 'the store really did change');

  assert.equal(fingerprint(sheetOf(result, all)), before);
  useUiStore.getState().resetCncVisibility();
});

test('the tree’s ticks are the export’s selection, and nothing else', () => {
  // What the tree DOES reach is the list of ids handed to the exporter — which
  // is exactly what the turn-3 checkbox list did. Untick the fronts and the file
  // is the "non-sprayed" file, to the byte.
  const result = unit();
  const cuttable = exportablePanels(result.panels);
  const hidden = new Set(panelIdsForPreset(cuttable, 'sprayed'));
  const ids = cuttable.map((p) => p.id).filter((id) => !hidden.has(id));
  assert.equal(fingerprint(sheetOf(result, ids)), '74ccd107');
});
