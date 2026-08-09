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
//
// ─── TURN 17: FOUR NAMED DELTAS, AND NOTHING ELSE ──────────────────────────
//
// This is the first turn since turn 13 to move any of them, and CLAUDE.md names
// what may move, in these words:
//
//   1. Every part carries its cabinet's number, INSIDE the part. The label was
//      `01-BUL`; it is `01 BUL 560x2150` (engine/cnc/partLabel.js), and it is
//      sized so that it fits ACROSS the board as well as down it.
//   2. Everything that is NOT that in-part label leaves the exported DXF. There
//      was nothing else in it and there is nothing else in it now — what changes
//      is that it is PINNED, below, including for the new by-material export
//      which could have carried the sheet's headings and does not.
//   3. Shelves are laid out rotated 90°, so the export agrees with the 3D view
//      (engine/cnc/layout.js `sheetTurn`). The shelf's own CNC frame is
//      untouched; what turns is how the sheet puts it down.
//   4. Dog bones the export already cuts become visible on the part. That is a
//      VIEW change and it emits no entity, which is why the LAYER CENSUS below
//      is unchanged to the last count while three fingerprints moved.
//
// verify/t17/cnc-export-identity.md carries the before/after of every one.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import {
  buildUnitDxfFiles, materialSheetDxf, panelLabel, parseDxf, sheetDxf, sheetDxfFileName,
} from '../src/engine/cnc/dxf.js';
import { layoutPanels, sheetTurn } from '../src/engine/cnc/layout.js';
import { partLabelText } from '../src/engine/cnc/partLabel.js';
import { MONO_ADVANCE } from '../src/engine/cnc/annotation.js';
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
  // turn 11 → 17: 2165ad2e → 216a6f6c. Delta 1 and nothing else: the one TEXT
  // entity's string and height. Every coordinate on this part is where it was —
  // a side panel is not a shelf, so delta 3 does not reach it.
  assert.equal(fingerprint(bul.dxf), '216a6f6c', 'the side panel’s DXF has changed');
});

// ─── the sheet ──────────────────────────────────────────────────────────────

test('the one-file sheet DXF is byte-for-byte what it was', () => {
  const result = unit();
  const all = exportablePanels(result.panels).map((p) => p.id);
  // turn 11 → 17: 5692ffcb → 9ff72b97. Deltas 1 and 3: every part's label, and
  // the two shelves laid down turned.
  assert.equal(fingerprint(sheetOf(result, all)), '4b3d4bb8', 'the whole-unit sheet has changed');
});

test('…and so is each preset’s', () => {
  const result = unit();
  const expected = {
    all: '4b3d4bb8',           // was 5692ffcb
    'non-sprayed': 'd69ce32d', // was 74ccd107 — this one has the shelves in it
    sprayed: '9c45132b',      // was a467790b — fronts only, so delta 1 alone
    fronts: '9c45132b',       // was a467790b
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

// ─── turn 17: the deltas, stated as properties and not only as hashes ───────

test('DELTA 1: a part label is the cabinet, the code and the cut size', () => {
  const result = unit();
  const all = exportablePanels(result.panels).map((p) => p.id);
  const texts = parseDxf(sheetOf(result, all)).entities.filter((e) => e.type === 'text');
  assert.equal(texts.length, 31, 'one label per part, and no more');
  for (const t of texts) {
    assert.equal(t.layer, P.cnc.unitNumberLayer, 'the EXISTING text layer — no new layer name');
    // …or, on a board too narrow to hold it, the longest prefix that fits —
    // which still begins with the cabinet's number, because that is the half
    // the owner asked for ("numer szafki musi być na każdym elemencie").
    assert.match(t.str, /^01( [A-Z0-9-]+ [0-9.]+x[0-9.]+|[A-Z0-9 -]*~)$/, `"${t.str}" is not the F1 wording`);
  }
  // …and it is the same wording the formatter gives, not a lookalike.
  const bul = result.panels.find((p) => p.id === 'BUL');
  assert.ok(texts.some((t) => t.str === partLabelText(result.unitNum, bul)));
  assert.equal(partLabelText(result.unitNum, bul), '01 BUL 560x2150');
});

test('DELTA 1: the label FITS INSIDE the part it is cut into', () => {
  // F1.3: "it never spills over the outline". Checked on the narrowest part the
  // kit builds, which is where the old fixed height would have hung over both
  // edges once the string grew from six characters to seventeen.
  const result = unit();
  for (const f of buildUnitDxfFiles(result, P)) {
    const panel = result.panels.find((p) => p.id === f.panelId);
    const text = f.entities.find((e) => e.type === 'text');
    const w = Math.abs(panel.cnc?.drawn_w ?? panel.w);
    const h = Math.abs(panel.cnc?.drawn_h ?? panel.h);
    const across = text.str.length * text.h * MONO_ADVANCE;
    assert.ok(across <= w + 1e-6, `${f.name}: label ${across.toFixed(1)} mm across a ${w} mm board`);
    assert.ok(text.h <= h + 1e-6, `${f.name}: label taller than the board`);
    assert.ok(text.h >= P.cnc.labelMinHeight - 1e-9, `${f.name}: label under the readable floor`);
  }
});

test('DELTA 2: the exported DXF carries the labels and NO other lettering', () => {
  // "żadnych innych liter bo to nam zaśmieca program w CNC." The sheet draws a
  // yellow header per material section and a name over every cabinet's block;
  // none of it may reach a file. Asserted on BOTH exports — the one-file sheet
  // and turn 17's by-material one, which is the new path and the one that could
  // plausibly have carried a heading.
  const result = unit();
  const all = exportablePanels(result.panels).map((p) => p.id);
  const panels = exportablePanels(result.panels);
  const layout = layoutPanels(panels, result.drills, {
    gap: P.cnc.layoutGap, rowWidth: P.cnc.layoutRowWidth,
  });

  const labels = new Set(panels.map((p) => panelLabel(p, { unitNum: result.unitNum, profile: P }).str));
  for (const [what, dxf] of [
    ['the one-file sheet', sheetOf(result, all)],
    ['the by-material sheet', materialSheetDxf({
      blocks: [{
        unitNum: result.unitNum, panels, drills: result.drills, layout,
      }],
      gap: P.cnc.layoutGap,
      profile: P,
    })],
  ]) {
    const texts = parseDxf(dxf).entities.filter((e) => e.type === 'text');
    assert.equal(texts.length, panels.length, `${what}: one text per part and not one more`);
    for (const t of texts) assert.ok(labels.has(t.str), `${what}: "${t.str}" is not a part label`);
  }
});

test('DELTA 3: a shelf is laid down turned, and only a shelf is', () => {
  const result = unit();
  for (const panel of exportablePanels(result.panels)) {
    const turned = sheetTurn(panel) === 90;
    assert.equal(turned, panel.role === 'shelf' && panel.part !== 'VPART',
      `${panel.id} (${panel.part}) is laid down ${turned ? 'turned' : 'square'}`);
  }
});

test('DELTA 4 is a VIEW change: the layer census cannot notice it', () => {
  // The dog bones the element view gained were ALREADY in the file — that is
  // what makes it a view change and it is why CLAUDE.md says "it is the VIEW
  // that moves". If this count ever falls, the opposite bug has happened and it
  // is a BLOCKER, not a delta.
  const result = unit();
  const all = exportablePanels(result.panels).map((p) => p.id);
  const parsed = parseDxf(sheetOf(result, all));
  assert.equal(parsed.entities.filter((e) => e.layer === 'PUZZLE_DOG_BONES').length, 18,
    'the export must still cut every dog bone it cut before the view learnt to draw them');
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
  assert.equal(fingerprint(sheetOf(result, ids)), 'd69ce32d');
});
