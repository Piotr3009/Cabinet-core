// ─── One DXF, several parts, laid out exactly as the preview shows them ───
//
// The claim this file has to defend is "what you see is what you cut". It is
// tested by PARSING THE FILE BACK: every entity the engine produced for the
// selected parts must be in it, once, at the position the layout module put it
// — the same module the CNC view draws with.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { layoutPanels, panelBounds } from '../src/engine/cnc/layout.js';
import {
  sheetDxf, sheetEntities, sheetDxfFileName, parseDxf, parseDxfPairs, panelEntities, buildUnitDxfFiles,
} from '../src/engine/cnc/dxf.js';
import {
  EXPORT_PRESETS, PART_GROUPS, groupOfPanel, groupPanels, panelIdsForPreset, presetOfSelection,
} from '../src/engine/cnc/groups.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const WARDROBE = JSON.parse(readFileSync(join(HERE, '..', 'fixtures', 'golden-wardrobe.json'), 'utf8'));

const wardrobeResult = () => computeCabinet({
  ...WARDROBE.cases[0].inputs, type: 'WARDROBE',
}, P);

const layoutFor = (panels, result) => layoutPanels(panels, result.drills, {
  gap: P.cnc.layoutGap, rowWidth: P.cnc.layoutRowWidth,
});

const cuttable = (panels) => panels.filter((p) => p.cnc?.outline?.length >= 2);

// ─── groups ───

test('every cut part lands in exactly one group, decided on part and role', () => {
  const r = wardrobeResult();
  const groups = groupPanels(r.panels);
  const total = [...groups.values()].reduce((s, list) => s + list.length, 0);
  assert.equal(total, r.panels.length, 'no part is lost or counted twice');
  for (const id of PART_GROUPS.map((g) => g.id)) assert.ok(groups.has(id));

  // The two that a substring match would get wrong.
  assert.equal(groupOfPanel(r.panels.find((p) => p.id === 'RAIL-PART')), 'shelves');
  assert.equal(groupOfPanel(r.panels.find((p) => p.id === 'D1-SL')), 'drawers');
  assert.equal(groupOfPanel(r.panels.find((p) => p.id === 'DP-L')), 'drawers', 'the drawer panel is a drawer part');
  assert.equal(groupOfPanel(r.panels.find((p) => p.part === 'FRONT')), 'fronts');
  assert.equal(groupOfPanel(r.panels.find((p) => p.part === 'DRAWER-FRONT')), 'fronts');
  assert.equal(groupOfPanel(r.panels.find((p) => p.id === 'BACK')), 'carcass');

  // The turn-3 automatics are carcass work.
  const withExtras = computeCabinet({
    type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01', plinth: true, top_infill_mm: 40,
  }, P);
  assert.equal(groupOfPanel(withExtras.panels.find((p) => p.id === 'PLINTH')), 'carcass');
  assert.equal(groupOfPanel(withExtras.panels.find((p) => p.id === 'INFILL-T')), 'carcass');
});

test('the four presets select what their names say', () => {
  const r = wardrobeResult();
  const ids = (preset) => panelIdsForPreset(r.panels, preset);

  assert.equal(ids('all').length, r.panels.length);
  assert.ok(ids('carcass').includes('BUL') && ids('carcass').includes('BACK'));
  assert.equal(ids('carcass').some((id) => id.startsWith('D1-')), false, 'no drawer parts');
  assert.equal(ids('carcass').some((id) => id.startsWith('SHELF')), false, 'no shelves');

  const noDrawers = ids('no-drawers');
  assert.equal(noDrawers.some((id) => /^D\d-/.test(id)), false);
  assert.equal(noDrawers.some((id) => id.startsWith('DP-')), false);
  assert.ok(noDrawers.includes('SHELF-1'), 'shelves stay');
  assert.ok(noDrawers.some((id) => id.endsWith('-F')), 'doors stay');

  const fronts = ids('fronts');
  assert.ok(fronts.length > 0);
  for (const id of fronts) {
    assert.equal(groupOfPanel(r.panels.find((p) => p.id === id)), 'fronts');
  }
  // A drawer FRONT is a front, not a drawer part — the distinction the
  // "all without drawers" preset lives or dies on.
  assert.ok(fronts.some((id) => id.includes('-DF')));
});

test('a hand-made selection is named after the preset it matches, else custom', () => {
  const r = wardrobeResult();
  for (const preset of EXPORT_PRESETS) {
    assert.equal(presetOfSelection(r.panels, panelIdsForPreset(r.panels, preset.id)), preset.id);
  }
  assert.equal(presetOfSelection(r.panels, ['BUL']), 'custom');
  assert.equal(presetOfSelection(r.panels, []), 'custom');
  assert.equal(sheetDxfFileName('W01', 'carcass'), 'W01-cnc-carcass.dxf');
  assert.equal(sheetDxfFileName('W 01', 'custom'), 'W_01-cnc-custom.dxf');
});

// ─── the file itself ───

test('the sheet DXF contains every selected part, and nothing else', () => {
  const r = wardrobeResult();
  const panels = cuttable(r.panels.filter((p) => groupOfPanel(p) === 'carcass'));
  const layout = layoutFor(panels, r);
  const dxf = sheetDxf({ panels, drills: r.drills, layout, unitNum: r.unitNum, profile: P });
  const parsed = parseDxf(dxf);

  // One label per part, and they name the parts we asked for.
  const labels = parsed.entities.filter((e) => e.type === 'text').map((e) => e.str).sort();
  assert.deepEqual(labels, panels.map((p) => `${r.unitNum}-${p.id}`).sort());

  // Circle count: exactly the drills of those parts.
  const expectedHoles = r.drills.filter((d) => panels.some((p) => p.id === d.panel)).length;
  assert.equal(parsed.entities.filter((e) => e.type === 'circle').length, expectedHoles);

  // Polyline count: one outline per part plus one per pocket.
  const expectedPolys = panels.reduce((s, p) => s + 1 + (p.cnc.pockets?.length || 0), 0);
  assert.equal(parsed.entities.filter((e) => e.type === 'poly').length, expectedPolys);

  // Nothing from the parts we did NOT select.
  const excluded = r.panels.filter((p) => groupOfPanel(p) !== 'carcass');
  for (const p of excluded) {
    assert.equal(labels.includes(`${r.unitNum}-${p.id}`), false, `${p.id} must not be in a carcass-only sheet`);
  }
});

test('the exported layout IS the preview layout, part for part', () => {
  const r = wardrobeResult();
  const panels = cuttable(r.panels);
  const layout = layoutFor(panels, r);
  const entities = sheetEntities({ panels, drills: r.drills, layout, unitNum: r.unitNum, profile: P });

  for (const place of layout.places) {
    const label = entities.find((e) => e.type === 'text' && e.str === `${r.unitNum}-${place.panel.id}`);
    assert.ok(label, `${place.panel.id} missing from the sheet`);
    // Where the preview draws this part's own label, in sheet coordinates,
    // flipped once into the DXF's y-up frame — the same numbers, not a
    // recomputed arrangement.
    const own = panelEntities(place.panel, r.drills, { unitNum: r.unitNum, profile: P })
      .find((e) => e.type === 'text');
    const dx = place.x - place.bounds.minX;
    const dy = (layout.height - place.y - place.h) - place.bounds.minY;
    assert.ok(Math.abs(label.x - (own.x + dx)) < 1e-6, `${place.panel.id} label x`);
    assert.ok(Math.abs(label.y - (own.y + dy)) < 1e-6, `${place.panel.id} label y`);
  }
});

test('no two parts overlap in the exported sheet, and none of it runs negative', () => {
  const r = wardrobeResult();
  const panels = cuttable(r.panels);
  const layout = layoutFor(panels, r);
  const dxf = sheetDxf({ panels, drills: r.drills, layout, unitNum: r.unitNum, profile: P });
  const parsed = parseDxf(dxf);

  // Everything sits in the positive quadrant: a machine zero at the sheet
  // corner is the only assumption a CAM operator should have to make.
  for (const e of parsed.entities) {
    if (e.type === 'poly') for (const [x, y] of e.pts) {
      assert.ok(x >= -1e-6 && y >= -1e-6, `polyline point ${x},${y} outside the sheet`);
    }
    if (e.type === 'circle') assert.ok(e.cx >= -1e-6 && e.cy >= -1e-6);
  }

  // Boxes derived from the layout must not intersect.
  const boxes = layout.places.map((pl) => ({
    id: pl.panel.id, x1: pl.x, y1: pl.y, x2: pl.x + pl.w, y2: pl.y + pl.h,
  }));
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]; const b = boxes[j];
      const overlap = a.x1 < b.x2 - 1e-6 && b.x1 < a.x2 - 1e-6 && a.y1 < b.y2 - 1e-6 && b.y1 < a.y2 - 1e-6;
      assert.equal(overlap, false, `${a.id} overlaps ${b.id} on the sheet`);
    }
  }
});

test('the header extents cover the whole sheet, tabs and all', () => {
  const r = wardrobeResult();
  const panels = cuttable(r.panels);
  const layout = layoutFor(panels, r);
  const dxf = sheetDxf({ panels, drills: r.drills, layout, unitNum: r.unitNum, profile: P });
  // $EXTMAX is a header variable, so it is read off the raw pairs.
  const pairs = parseDxfPairs(dxf);
  const at = pairs.findIndex(([code, v]) => code === 9 && v === '$EXTMAX');
  assert.ok(at > -1, 'the header states the extents');
  const maxX = Number(pairs[at + 1][1]);
  const maxY = Number(pairs[at + 2][1]);
  assert.ok(maxX >= layout.width - 1e-6, `EXTMAX x ${maxX} < sheet width ${layout.width}`);
  assert.ok(maxY >= layout.height - 1e-6, `EXTMAX y ${maxY} < sheet height ${layout.height}`);
});

test('the per-part ZIP export is untouched — it is still the fallback route', () => {
  const r = wardrobeResult();
  const files = buildUnitDxfFiles(r, P);
  assert.equal(files.length, cuttable(r.panels).length, 'one file per cut part');
  assert.ok(files.every((f) => f.name.endsWith('.dxf')));
  assert.ok(files.some((f) => f.name === 'W01-BUL.dxf'));
  // And each of those files still parses on its own.
  const one = parseDxf(files.find((f) => f.name === 'W01-BUL.dxf').dxf);
  assert.ok(one.entities.length > 0);
  assert.equal(one.entities.filter((e) => e.type === 'text').length, 1);
});

test('an empty selection is refused rather than writing an empty file', () => {
  const r = wardrobeResult();
  const layout = layoutFor([], r);
  const entities = sheetEntities({ panels: [], drills: r.drills, layout, unitNum: r.unitNum, profile: P });
  assert.deepEqual(entities, []);
});

test('a single part exported as a sheet is the same drawing as its own file', () => {
  const r = wardrobeResult();
  const bul = r.panels.find((p) => p.id === 'BUL');
  const layout = layoutFor([bul], r);
  const sheet = parseDxf(sheetDxf({ panels: [bul], drills: r.drills, layout, unitNum: r.unitNum, profile: P }));
  const single = parseDxf(buildUnitDxfFiles(r, P).find((f) => f.panelId === 'BUL').dxf);

  assert.equal(sheet.entities.length, single.entities.length);
  // Same shape, just moved: the offset between the two is constant.
  const sheetPoly = sheet.entities.find((e) => e.type === 'poly');
  const singlePoly = single.entities.find((e) => e.type === 'poly');
  const dx = sheetPoly.pts[0][0] - singlePoly.pts[0][0];
  const dy = sheetPoly.pts[0][1] - singlePoly.pts[0][1];
  for (let i = 0; i < singlePoly.pts.length; i += 1) {
    assert.ok(Math.abs(sheetPoly.pts[i][0] - (singlePoly.pts[i][0] + dx)) < 1e-6);
    assert.ok(Math.abs(sheetPoly.pts[i][1] - (singlePoly.pts[i][1] + dy)) < 1e-6);
  }
  // A lone part sits at the sheet origin, less its own overhang.
  const bounds = panelBounds(bul, r.drills);
  assert.ok(Math.abs(dx + bounds.minX) < 1e-6, `x offset ${dx} vs bounds ${bounds.minX}`);
});
