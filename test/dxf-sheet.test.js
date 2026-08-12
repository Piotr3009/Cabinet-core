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
import { layoutPanels, panelBounds, turnPoint } from '../src/engine/cnc/layout.js';

import {
  sheetDxf, sheetEntities, sheetDxfFileName, parseDxf, parseDxfPairs, panelEntities, panelLabel, buildUnitDxfFiles,
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

  // The ones a substring match would get wrong.
  assert.equal(groupOfPanel(r.panels.find((p) => p.id === 'RAIL-PART')), 'shelves');
  assert.equal(groupOfPanel(r.panels.find((p) => p.part === 'FRONT')), 'fronts');
  assert.equal(groupOfPanel(r.panels.find((p) => p.part === 'DRAWER-FRONT')), 'fronts');
  assert.equal(groupOfPanel(r.panels.find((p) => p.id === 'BACK')), 'carcasses');

  // ─── TURN 25 (CLAUDE.md F7.1): FOUR GROUPS, AND TWO THINGS MOVED ─────────
  // The DRAWERS group is gone: a drawer box and the panel that carries its
  // runners are carcass board, cut and assembled as a carcass is, and a joiner
  // ticking "Carcasses" to fill a sheet with everything that is not a front
  // wants them on it.
  assert.equal(groupOfPanel(r.panels.find((p) => p.id === 'D1-SL')), 'carcasses');
  assert.equal(groupOfPanel(r.panels.find((p) => p.id === 'DP-L')), 'carcasses');

  // …and INFILL-* LEAVES the carcass group, with the plinth beside it: both are
  // finishing pieces that stand in the room and are sprayed with the doors.
  const withExtras = computeCabinet({
    type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01', plinth: true, top_infill_mm: 40,
  }, P);
  assert.equal(groupOfPanel(withExtras.panels.find((p) => p.id === 'PLINTH')), 'infills');
  // …and the piece is looked up by a name it really has. `INFILL-T` never
  // existed — the top infill is cut as a FACE and a SHELF — so the old
  // assertion was passing `undefined` to `groupOfPanel` and reading the
  // fallback back out. It proved nothing, which is why it survived the group
  // it was about moving.
  const infills = withExtras.panels.filter((p) => p.role === 'infill');
  assert.ok(infills.length, 'the cabinet really has a top infill');
  for (const piece of infills) assert.equal(groupOfPanel(piece), 'infills', piece.id);
});

test('the four presets select what their names say', () => {
  // Turn 5 (BACKLOG #35): the middle two presets are now cut along the SPRAY
  // line, not along the part groups — see the finish_exposed tests below.
  const r = wardrobeResult();
  const ids = (preset) => panelIdsForPreset(r.panels, preset);

  assert.equal(ids('all').length, r.panels.length);

  const bare = ids('non-sprayed');
  assert.ok(bare.includes('BUL') && bare.includes('BACK'), 'the carcass is in');
  assert.ok(bare.includes('SHELF-1'), 'so are the shelves');
  assert.ok(bare.includes('RAIL-PART'), 'and the rail partition');
  assert.ok(bare.includes('DP-L') && bare.some((id) => id.startsWith('FILLER-')),
    'and the drawer panel with its fillers');
  assert.ok(bare.includes('D1-SL') && bare.includes('D1-DNO'), 'and the drawer boxes');
  assert.equal(bare.some((id) => id.endsWith('-F') || id.includes('-DF')), false, 'no fronts');

  const sprayed = ids('sprayed');
  assert.ok(sprayed.some((id) => id.endsWith('-F')), 'the doors are here instead');
  // Every part is in exactly one of the two — that is what makes the pair a cut
  // of the unit rather than two overlapping opinions about it.
  assert.equal(bare.length + sprayed.length, r.panels.length);
  assert.equal(bare.some((id) => sprayed.includes(id)), false);

  const fronts = ids('fronts');
  assert.ok(fronts.length > 0);
  for (const id of fronts) {
    assert.equal(groupOfPanel(r.panels.find((p) => p.id === id)), 'fronts');
  }
  // A drawer FRONT is a front, not a drawer part.
  assert.ok(fronts.some((id) => id.includes('-DF')));
});

test('a hand-made selection is named after the preset it matches, else custom', () => {
  const r = wardrobeResult();
  for (const preset of EXPORT_PRESETS) {
    const ids = panelIdsForPreset(r.panels, preset.id);
    const named = presetOfSelection(r.panels, ids);
    // The contract is the FILE NAME being true, not the preset button being
    // echoed back: two presets can pick the same parts out of one unit (a
    // wardrobe with no plinth has nothing sprayed but its doors), and either
    // name describes the sheet correctly. What must hold is that the name the
    // file takes selects exactly what is in it.
    assert.deepEqual(panelIdsForPreset(r.panels, named).sort(), [...ids].sort(),
      `"${named}" must describe the same parts as "${preset.id}"`);
  }
  assert.equal(presetOfSelection(r.panels, panelIdsForPreset(r.panels, 'non-sprayed')), 'non-sprayed');
  assert.equal(presetOfSelection(r.panels, panelIdsForPreset(r.panels, 'all')), 'all');
  assert.equal(presetOfSelection(r.panels, ['BUL']), 'custom');
  assert.equal(presetOfSelection(r.panels, []), 'custom');
  assert.equal(sheetDxfFileName('W01', 'non-sprayed'), 'W01-cnc-non-sprayed.dxf');
  assert.equal(sheetDxfFileName('W 01', 'custom'), 'W_01-cnc-custom.dxf');
});

// ─── the file itself ───

test('the sheet DXF contains every selected part, and nothing else', () => {
  const r = wardrobeResult();
  const panels = cuttable(r.panels.filter((p) => groupOfPanel(p) === 'carcass'));
  const layout = layoutFor(panels, r);
  const dxf = sheetDxf({ panels, drills: r.drills, layout, unitNum: r.unitNum, profile: P });
  const parsed = parseDxf(dxf);

  // One label per part, and they name the parts we asked for — in the ONE
  // wording the engine has (turn 17, CLAUDE.md F1.1). Turn 18 breaks that
  // wording onto up to three lines, so the comparison is line for line.
  const labels = parsed.entities.filter((e) => e.type === 'text').map((e) => e.str).sort();
  assert.deepEqual(labels, panels.flatMap((p) => panelLabel(p, { unitNum: r.unitNum, profile: P }).lines).sort());

  // Circle count: exactly the drills of those parts.
  const expectedHoles = r.drills.filter((d) => panels.some((p) => p.id === d.panel)).length;
  assert.equal(parsed.entities.filter((e) => e.type === 'circle').length, expectedHoles);

  // Polyline count: one outline per part plus one per pocket.
  const expectedPolys = panels.reduce((s, p) => s + 1 + (p.cnc.pockets?.length || 0), 0);
  assert.equal(parsed.entities.filter((e) => e.type === 'poly').length, expectedPolys);

  // Nothing from the parts we did NOT select.
  const excluded = r.panels.filter((p) => groupOfPanel(p) !== 'carcass');
  const kept = new Set(labels);
  for (const p of excluded) {
    // A part that is not on this sheet may still SHARE a line with one that is
    // (`01` on its own is every cabinet's first line on a narrow board), so the
    // check is that no line unique to an excluded part got in.
    const own = panelLabel(p, { unitNum: r.unitNum, profile: P }).lines
      .filter((l) => !panels.some((q) => panelLabel(q, { unitNum: r.unitNum, profile: P }).lines.includes(l)));
    for (const line of own) {
      assert.equal(kept.has(line), false, `${p.id} must not be in a carcass-only sheet`);
    }
  }
});

test('the exported layout IS the preview layout, part for part', () => {
  const r = wardrobeResult();
  const panels = cuttable(r.panels);
  const layout = layoutFor(panels, r);
  const entities = sheetEntities({ panels, drills: r.drills, layout, unitNum: r.unitNum, profile: P });

  for (const place of layout.places) {
    // Where the preview draws this part's own label, in sheet coordinates,
    // flipped once into the DXF's y-up frame — the same numbers, not a
    // recomputed arrangement. Turn 17 (CLAUDE.md F3) adds the one thing that
    // can come between the two: a part may be laid down TURNED, and the file
    // has to turn it with the same `turnPoint` the preview does.
    //
    // Matched on the STRING AND THE PLACE together, because two parts of one
    // cabinet may honestly carry the same caption — the two 30 mm fillers are
    // both narrower than their own label and both truncate to `01 FIL~`.
    // Turn 18 (CLAUDE.md F1.1): the caption is a BLOCK of up to three lines, so
    // every line of it has to land where the preview draws that line.
    const own = panelEntities(place.panel, r.drills, { unitNum: r.unitNum, profile: P })
      .filter((e) => e.type === 'text');
    assert.ok(own.length, `${place.panel.id} carries no label at all`);
    for (const line of own) {
      const [tx, ty] = turnPoint(line.x, line.y, place.bounds.turn || 0);
      const dx = place.x - place.bounds.minX;
      const dy = (layout.height - place.y - place.h) - place.bounds.minY;
      const label = entities.find((e) => e.type === 'text' && e.str === line.str
        && Math.abs(e.x - (tx + dx)) < 1e-6 && Math.abs(e.y - (ty + dy)) < 1e-6);
      assert.ok(label, `${place.panel.id} is not on the sheet where the preview draws it`);
      assert.equal(label.rot || 0, place.bounds.turn || 0, `${place.panel.id} label turns with its part`);
    }
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
  // Turn 18 (CLAUDE.md F1.1): one label, laid out on as many lines as the side
  // panel's own rectangle wants — and never more than the profile allows.
  const bul = r.panels.find((p) => p.id === 'BUL');
  assert.equal(
    one.entities.filter((e) => e.type === 'text').length,
    panelLabel(bul, { unitNum: r.unitNum, profile: P }).lines.length,
  );
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
