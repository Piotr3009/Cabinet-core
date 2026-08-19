// ─── TURN 40 (CLAUDE.md F5): WALL DRAWINGS — THE WHOLE RUN, NOT ONE CABINET ─
//
// The owner, 18.08.2026: *"nie mamy drawingu całościowego — pokazuje nam tylko
// pojedyncze szafki, a ja bym chciał drawing całości profesjonalny jak z
// AutoCada."* He supplied his own AutoCAD set — Anderson Kitchen rev B — and
// CLAUDE.md reads that set as the spec's true source. These asserts hold the
// feature to it, sheet list and all:
//
//   · A SHEET IS A WALL. /1 with fronts, /2 the carcass, plus one horizontal
//     section for the whole job.
//   · TWO DIMENSION CHAINS PER AXIS — *"the single most important detail of
//     the whole feature — one chain is not his drawing"*.
//   · "No Scale" in the title block; do not invent a scale label.
//   · The DXF carries text and says so; the CNC path still carries none.
//
// And CLAUDE.md's own four named tests: a two-cabinet wall composes both
// cabinets at their x positions; the detailed chain sums to the grouped chain;
// a wall with no cabinets produces no sheet rather than an empty one; the DXF
// writer emits text only on this path.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import {
  buildHorizontalSection, buildWallElevation, chainValues, handleMarks, heightChains,
  horizontalChains, turnedAway, verticalChains, wallGroups, wallLabel, widthChains, widthGroups,
} from '../src/engine/drawings/wallElevation.js';
import { wallDrawingsFilename } from '../src/lib/drawingExport.js';
import { wallDrawingPages, wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { DXF_AUTOCAD_ONLY, sheetToDxf } from '../src/engine/drawings/dxf.js';
import { sheetToSvg } from '../src/engine/drawings/svg.js';
import { DRAWING_LAYERS } from '../src/engine/drawings/layers.js';
import { buildUnitDxfFiles, panelLabel } from '../src/engine/cnc/dxf.js';

const ROOM = migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) });

/** One entry of the store's `allResults()` shape, built without a store. */
function entry(type, over, position) {
  const params = { ...defaultParamsFor(type, P), ...over };
  return {
    unit: { id: `u-${over.unit_num}`, type, params, position },
    result: computeCabinet(params, P),
  };
}

/** A wall with two base units side by side and a wall unit over them. */
function kitchen() {
  return [
    entry('BUD', { unit_num: '01', width: 600, plinth: true }, { wall: 0, x_mm: 0, rotation_deg: 0 }),
    entry('BUD', { unit_num: '02', width: 500, plinth: true }, { wall: 0, x_mm: 640, rotation_deg: 0 }),
    entry('WUD', { unit_num: '03', width: 600, mount_height: 1500 }, { wall: 0, x_mm: 40, rotation_deg: 0 }),
    entry('WARDROBE', { unit_num: '04', width: 900 }, { wall: 1, x_mm: 200, rotation_deg: 0 }),
  ];
}

const sheetsOf = (entries, project = {}) => wallDrawingSheets({
  entries, project: { name: 'Anderson Kitchen', client: 'Mr Anderson', number: 'J-1042', ...project },
  room: ROOM, profile: P, date: '18/08/2026',
});

const textsOf = (sheet) => sheet.entities.filter((e) => e.kind === 'text').map((e) => String(e.text));

// ═══ 1. A SHEET IS A WALL ══════════════════════════════════════════════════

test('F5 — the sheet list is HIS: /1, /2 per wall, and one horizontal section', () => {
  const sheets = sheetsOf(kitchen());
  assert.deepEqual(sheets.map((s) => s.name), [
    'Wall A /1', 'Wall A /2', 'Wall B /1', 'Wall B /2', 'Horizontal section',
  ]);
  assert.deepEqual(sheets.map((s) => s.variant), ['fronts', 'carcass', 'fronts', 'carcass', 'section']);
  assert.equal(wallLabel(0), 'A');
  assert.equal(wallLabel(1), 'B');
  assert.equal(wallLabel(25), 'Z');
});

test('F5 — /1 HAS the fronts and /2 does NOT, which is the whole split', () => {
  const [one, two] = sheetsOf(kitchen());
  const doors = (s) => s.sheet.entities.filter((e) => e.layer === 'DOORS').length;
  assert.ok(doors(one) > 0, 'the fronts sheet has fronts on it');
  assert.equal(doors(two), 0, 'the carcass sheet has none');
  // …and the carcass is on BOTH, because it is the same cabinets either way.
  const carcase = (s) => s.sheet.entities.filter((e) => e.layer === 'CARCASE').length;
  assert.ok(carcase(one) > 0 && carcase(two) > 0);
});

test('F5 — A TWO-CABINET WALL COMPOSES BOTH CABINETS AT THEIR x POSITIONS', () => {
  // CLAUDE.md's first named test. Measured on the DRAWING rather than on the
  // sheet, so no scale or paper choice can hide a cabinet in the wrong place.
  const entries = [
    entry('BUD', { unit_num: '01', width: 600 }, { wall: 0, x_mm: 0, rotation_deg: 0 }),
    entry('BUD', { unit_num: '02', width: 500 }, { wall: 0, x_mm: 640, rotation_deg: 0 }),
  ];
  const group = wallGroups(entries, P)[0];
  assert.equal(group.members.length, 2);
  assert.equal(group.from, 0);
  assert.equal(group.to, 1140, '640 + 500');

  const el = buildWallElevation(group, { withFronts: true, room: ROOM, profile: P });
  // Each cabinet's own carcass outline, at its own x. `buildFrontElevation`
  // draws one 0,0 → W,H rectangle per unit and the composition moves it.
  const outlines = el.entities.filter((e) => e.kind === 'rect' && e.layer === 'CARCASE'
    && Math.abs(e.w - 600) < 0.5 === false ? false : true);
  const at = (x, w) => el.entities.some((e) => e.kind === 'rect' && e.layer === 'CARCASE'
    && Math.abs(e.x - x) < 0.5 && Math.abs(e.w - w) < 0.5);
  assert.ok(at(0, 600), 'the first cabinet stands at 0');
  assert.ok(at(640, 500), 'and the second at 640 — its own x_mm, not beside it');
  assert.ok(outlines.length > 0);
  // The unit numbers are both on the sheet, each over its own cabinet.
  const nums = el.entities.filter((e) => e.kind === 'text' && e.layer === 'UNIT_NUMBER');
  assert.deepEqual(nums.map((e) => e.text).sort(), ['01', '02']);
  assert.ok(Math.abs(nums.find((e) => e.text === '02').x - (640 + 500 / 2)) < 1);
});

test('F5 — a WALL WITH NO CABINETS produces NO SHEET rather than an empty one', () => {
  // CLAUDE.md's third named test. The room has four walls; only two carry a
  // cabinet, so only those two get sheets.
  const sheets = sheetsOf(kitchen());
  assert.equal(sheets.filter((s) => s.variant !== 'section').length, 4, 'two walls, two sheets each');
  assert.equal(new Set(sheets.filter((s) => s.wall != null).map((s) => s.wall)).size, 2);
  // Nothing at all: no elevation, and the section is the only thing left.
  assert.deepEqual(wallGroups([], P), []);
  assert.deepEqual(sheetsOf([]).map((s) => s.name), []);
  // …and one cabinet on wall 3 alone gets wall D and nothing else.
  const lonely = sheetsOf([entry('BUD', { unit_num: '09', width: 600 }, { wall: 3, x_mm: 100, rotation_deg: 0 })]);
  assert.deepEqual(lonely.map((s) => s.name), ['Wall D /1', 'Wall D /2', 'Horizontal section']);
});

// ═══ 2. TWO DIMENSION CHAINS PER AXIS ══════════════════════════════════════

test('F5 — THE DETAILED CHAIN SUMS TO THE GROUPED CHAIN', () => {
  // CLAUDE.md's second named test, and the arithmetic a joiner does on site to
  // check a drawing. His own numbers are the shape of it: the top chain reads
  // 597.0 · 37 · 501.0 · … and the bottom reads 599.5 · 37 · 1011.0 · … — two
  // different breakdowns of one length.
  const entries = [
    entry('BUD', { unit_num: '01', width: 600 }, { wall: 0, x_mm: 0, rotation_deg: 0 }),
    entry('BUD', { unit_num: '02', width: 500 }, { wall: 0, x_mm: 600, rotation_deg: 0 }),
    entry('BUD', { unit_num: '03', width: 400 }, { wall: 0, x_mm: 1137, rotation_deg: 0 }),
  ];
  const group = wallGroups(entries, P)[0];
  const { detailed, grouped } = widthChains(group.members, P);
  const sum = (a) => a.reduce((n, v) => n + v, 0);
  assert.deepEqual(detailed, [600, 500, 37, 400], 'each cabinet, and the gap between them');
  assert.deepEqual(grouped, [1100, 37, 400], 'the two that touch are ONE number');
  assert.equal(sum(detailed), sum(grouped), 'and the two chains add up to the same wall');
  assert.equal(sum(grouped), group.to - group.from);
});

test('F5 — BOTH chains are actually DRAWN, above and below', () => {
  // A chain that exists as an array and not as arrowheads is not a drawing.
  const group = wallGroups(kitchen(), P)[0];
  const el = buildWallElevation(group, { withFronts: true, room: ROOM, profile: P });
  const dims = el.entities.filter((e) => e.kind === 'text' && e.layer === 'DIMENSIONS');
  const above = dims.filter((e) => !e.rotate && e.y > group.top);
  const below = dims.filter((e) => !e.rotate && e.y < 0);
  assert.ok(above.length >= 2, `the detailed chain is above the cabinets: ${above.length}`);
  assert.ok(below.length >= 1, `the grouped chain is below them: ${below.length}`);
  const { detailed, grouped } = widthChains(group.members, P);
  assert.equal(above.length, detailed.length, 'one number per detailed segment');
  assert.equal(below.length, grouped.length, 'one number per grouped segment');
});

test('F5 — the VERTICAL pair: every front’s own height, and the grouped bands', () => {
  const group = wallGroups(kitchen(), P)[0];
  const { fronts, bands } = heightChains(group.members);
  const sum = (a) => a.reduce((n, v) => n + v, 0);
  assert.ok(fronts.length >= 2, `a run of front heights: ${JSON.stringify(fronts)}`);
  assert.ok(bands.length >= 3, `the toe kick, the base run, the gap, the wall run: ${JSON.stringify(bands)}`);
  // The bands start at the FLOOR and finish at the top of the wall, which is
  // what makes the left-hand overall height the sum of them.
  assert.equal(sum(bands), group.top);

  const el = buildWallElevation(group, { withFronts: true, room: ROOM, profile: P });
  const vertical = el.entities.filter((e) => e.kind === 'text' && e.layer === 'DIMENSIONS' && e.rotate === -90);
  // Two chains on the right plus the single overall on the left.
  assert.equal(vertical.length, fronts.length + bands.length + 1);
  assert.ok(vertical.some((e) => e.text === String(group.top)), 'the overall height is on it');
});

test('F5 — /2 drops the FRONT chain and keeps the bands, because it has no fronts', () => {
  const group = wallGroups(kitchen(), P)[0];
  const two = buildWallElevation(group, { withFronts: false, room: ROOM, profile: P });
  const { fronts, bands } = heightChains(group.members);
  const vertical = two.entities.filter((e) => e.kind === 'text' && e.layer === 'DIMENSIONS' && e.rotate === -90);
  assert.equal(vertical.length, bands.length + 1, 'the bands and the overall, and not the fronts');
  assert.ok(fronts.length > 0, 'the fronts chain really does exist on /1');
  // Both horizontal chains are still there: a carcass sheet is still set out
  // along the wall.
  const horizontal = two.entities.filter((e) => e.kind === 'text' && e.layer === 'DIMENSIONS' && !e.rotate);
  const { detailed, grouped } = widthChains(group.members, P);
  assert.equal(horizontal.length, detailed.length + grouped.length);
});

test('F5 — the grouping law is `engine/runs.js`’s, not a second one', () => {
  const tol = P.autoParts.topInfill.runGap;
  const members = [
    { x: 0, width: 600, base: 0, top: 900, result: { panels: [] } },
    { x: 600 + tol, width: 600, base: 0, top: 900, result: { panels: [] } },
    { x: 1200 + tol + 40, width: 600, base: 0, top: 900, result: { panels: [] } },
  ];
  const groups = widthGroups(members, P);
  assert.equal(groups.length, 2, 'a gap inside the tolerance is not a break; 40 mm is');
  assert.equal(groups[0].members.length, 2);
});

// ═══ 3. THE OWNER'S CONVENTIONS ════════════════════════════════════════════

test('F5 — "No Scale", and no scale label invented', () => {
  const [one] = sheetsOf(kitchen());
  const texts = textsOf(one.sheet);
  assert.ok(texts.includes('No Scale'), 'the title block says what he says');
  assert.ok(!texts.some((t) => /^1:\d+$/.test(t)), 'and no ratio is printed anywhere on the sheet');
  // The sheet is still LAID OUT at a ratio — a drawing has to fit the paper.
  assert.ok(one.sheet.scale > 0);
});

test('F5 — his title block: Client, Address, Project, Drawing, Job No, Scale, Rev, Date', () => {
  const [one] = sheetsOf(kitchen(), { address: '14 Anderson Way', rev: 'B' });
  const texts = textsOf(one.sheet);
  for (const label of ['Client', 'Address', 'Project', 'Drawing', 'Job No', 'Scale', 'Rev', 'Date']) {
    assert.ok(texts.includes(label), `the block carries a ${label} row`);
  }
  for (const value of ['Mr Anderson', '14 Anderson Way', 'Anderson Kitchen', 'Wall A /1', 'J-1042', 'B', '18/08/2026']) {
    assert.ok(texts.some((t) => t.includes(value)), `…and its value: ${value}`);
  }
});

test('F5 — the colour convention: magenta fronts, grey hinge diagonals, green handles, red fabric', () => {
  assert.equal(DRAWING_LAYERS.DOORS.colour, '#D400D4', 'fronts in magenta');
  assert.equal(DRAWING_LAYERS.DOOR_SWING.colour, '#8A8A8A', 'the hinge side, in grey');
  assert.equal(DRAWING_LAYERS.HANDLES.colour, '#009A3D', 'handles in green');
  assert.equal(DRAWING_LAYERS.BUILDING.colour, '#C0392B', 'building fabric in red');

  const group = wallGroups(kitchen(), P)[0];
  const el = buildWallElevation(group, { withFronts: true, room: ROOM, profile: P });
  const layers = new Set(el.entities.map((e) => e.layer));
  assert.ok(layers.has('DOORS'));
  assert.ok(layers.has('DOOR_SWING'), 'the diagonals from the hinge side are on it');
  assert.ok(layers.has('BUILDING'), 'the floor and the ceiling are on it');

  // The floor runs past the end cabinets, because building fabric continues.
  const fabric = el.entities.filter((e) => e.layer === 'BUILDING' && e.kind === 'line');
  assert.ok(fabric.some((e) => Math.abs(e.y1) < 1e-6), 'the floor');
  assert.ok(fabric.some((e) => Math.abs(e.y1 - ROOM.height) < 1e-6), 'and the ceiling');
  assert.ok(fabric.every((e) => e.x1 < group.from + 1e-6 && e.x2 > group.to - 1e-6));
});

test('F5 — HANDLES are drawn where the engine drills them, never re-derived', () => {
  const withHandle = entry('BUD', {
    unit_num: '05', width: 600, project_handle: { type: 'bar', centres: 128 },
  }, { wall: 0, x_mm: 0, rotation_deg: 0 });
  const holes = (withHandle.result.drillSummary.handles || []).flatMap((h) => h.holes || []);
  const marks = handleMarks(withHandle.result, P, { dx: 250, dy: 100 });
  if (!holes.length) {
    assert.deepEqual(marks, [], 'no handle asked for, no handle drawn — R9');
    return;
  }
  assert.ok(marks.length > 0);
  assert.ok(marks.every((m) => m.layer === 'HANDLES'), 'green, all of it');
  // Every mark sits on a hole the machine actually makes, offset by the
  // composition and by nothing else.
  const xs = new Set(holes.map((h) => Math.round((h[0] + 250) * 10) / 10));
  assert.ok(marks.some((m) => xs.has(Math.round(m.x1 * 10) / 10)));
});

// ═══ 4. THE HORIZONTAL SECTION ═════════════════════════════════════════════

test('F5 — the section draws the ROOM, every footprint, and the numbers in green', () => {
  const entries = kitchen();
  const plan = buildHorizontalSection(entries, { room: ROOM, profile: P });
  assert.equal(plan.walls, 4, 'a rectangular room has four');
  const fabric = plan.entities.filter((e) => e.layer === 'BUILDING');
  assert.equal(fabric.length, 4, 'one line per wall, in red');
  const nums = plan.entities.filter((e) => e.kind === 'text' && e.layer === 'UNIT_NUMBER');
  assert.deepEqual(nums.map((e) => e.text).sort(), ['01', '02', '03', '04'],
    'every cabinet is numbered on the plan — his own convention');
  // A cabinet on wall B is placed through wall B's own frame, so it does not
  // land on top of wall A's.
  const onB = nums.find((e) => e.text === '04');
  const onA = nums.find((e) => e.text === '01');
  assert.ok(Math.hypot(onB.x - onA.x, onB.y - onA.y) > 500, 'the two walls are apart on the plan');
  // …and every wall is named, so an elevation can be found from the plan.
  const labels = plan.entities.filter((e) => e.kind === 'text' && e.layer === 'VIEW_TITLE').map((e) => e.text);
  assert.deepEqual(labels, ['WALL A', 'WALL B', 'WALL C', 'WALL D']);
});

test('F5 — a TURNED cabinet is off the elevation and NAMED, and still on the plan', () => {
  // An elevation of a wall cannot draw a cabinet standing edge-on to it, and
  // pretending otherwise would be a drawing that lies. `engine/runs.js` skips a
  // turned unit for the same reason.
  const entries = [
    entry('BUD', { unit_num: '01', width: 600 }, { wall: 0, x_mm: 0, rotation_deg: 0 }),
    entry('BUD', { unit_num: '02', width: 600 }, { wall: 0, x_mm: 700, rotation_deg: 90 }),
  ];
  assert.equal(turnedAway(entries[1].unit), true);
  assert.equal(turnedAway(entries[0].unit), false);
  const group = wallGroups(entries, P)[0];
  assert.equal(group.members.length, 1);
  assert.equal(group.skipped.length, 1);
  const el = buildWallElevation(group, { withFronts: true, room: ROOM, profile: P });
  assert.equal(el.skipped, 1);
  assert.ok(el.entities.some((e) => e.kind === 'text' && /turned unit/.test(e.text)),
    'the sheet SAYS the cabinet is not on it');
  // …and it is on the plan, where its footprint is honest.
  const plan = buildHorizontalSection(entries, { room: ROOM, profile: P });
  assert.ok(plan.entities.some((e) => e.kind === 'text' && e.text === '02'));
});

// ═══ 5. THE DXF: TEXT ON THIS PATH AND NOWHERE ELSE ════════════════════════

test('F5 — the wall DXF carries TEXT: dimensions, labels and the title block', () => {
  const [one] = sheetsOf(kitchen());
  const dxf = sheetToDxf(one.sheet);
  assert.match(dxf, /AC1009/, 'R12, the dialect BLOCKERS #8 settled');
  const texts = [...dxf.matchAll(/\r\n0\r\nTEXT\r\n[\s\S]*?\r\n1\r\n(.*?)\r\n/g)].map((m) => m[1]);
  assert.ok(texts.length > 10, `a drawing is nothing without its numbers: ${texts.length}`);
  assert.ok(texts.includes('No Scale'), 'the title block is in the file');
  assert.ok(texts.includes('Wall A /1'), 'and the drawing name');
  assert.ok(texts.some((t) => /^\d/.test(t)), 'and the dimensions');
});

test('F5 — …and it says AutoCAD only, ON the drawing', () => {
  const [one] = sheetsOf(kitchen());
  const dxf = sheetToDxf(one.sheet);
  assert.equal(DXF_AUTOCAD_ONLY, 'AutoCAD only - do NOT open in VCarve');
  assert.ok(dxf.includes(DXF_AUTOCAD_ONLY),
    'a warning in a menu is read once; a warning in the file is read by whoever opens it');
  // Removable only by an explicit null, which nothing in the app passes.
  assert.ok(!sheetToDxf(one.sheet, { note: null }).includes('VCarve'));
});

test('F5 — THE CNC EXPORT PATH IS UNTOUCHED and still ships no text', () => {
  // CLAUDE.md's fourth named test, and the reason the two writers are separate
  // modules rather than one writer with a flag.
  const result = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01' }, P);
  const files = buildUnitDxfFiles(result, P);
  assert.ok(files.length > 0);
  for (const f of files) {
    const texts = [...f.dxf.matchAll(/\r\n0\r\nTEXT\r\n[\s\S]*?\r\n1\r\n(.*?)\r\n/g)].map((m) => m[1]);
    // The only text a cut part has ever carried is its own IN-PART LABEL —
    // the unit and part name, and the cut size under it (`panelLabel`, turn 3).
    // That predates this feature and is pinned by
    // `test/cnc-export-identity.test.js`; what matters here is that F5 added
    // nothing to it. Asserted against the label the app itself computes rather
    // than against a count, so a kit whose label wraps onto three lines does
    // not fail a test about wall drawings.
    const label = panelLabel(
      result.panels.find((p) => f.name.includes(p.id)) || result.panels[0],
      { unitNum: result.unitNum, profile: P },
    );
    const own = new Set(label.lines || []);
    for (const t of texts) {
      assert.ok(own.has(t), `${f.name}: "${t}" is not part of the part's own label`);
    }
    assert.ok(!f.dxf.includes('VCarve'), `${f.name} carries no drawing note`);
    assert.ok(!f.dxf.includes('No Scale'));
    assert.ok(!/\bClient\b|\bJob No\b|\bRev\b/.test(f.dxf), `${f.name} carries no title block`);
  }
  // And the drawing writer is a different module from the CNC one, on purpose.
  const src = readFileSync(new URL('../src/engine/drawings/dxf.js', import.meta.url), 'utf8');
  assert.match(src, /import \{ writeDxf \} from '\.\.\/cnc\/dxf\.js'/, 'the R12 serialiser is shared…');
  assert.match(src, /DXF_AUTOCAD_ONLY/, '…and nothing else is');
  const cnc = readFileSync(new URL('../src/engine/cnc/dxf.js', import.meta.url), 'utf8');
  assert.ok(!cnc.includes('wallElevation'), 'the CNC writer knows nothing about wall drawings');
  assert.ok(!cnc.includes('AutoCAD only'), '…and carries none of this feature’s text');
});

// ═══ 6. THE SHEET IS A REAL SHEET ══════════════════════════════════════════

test('F5 — every sheet renders as SVG and as a page, and the preview IS the export', () => {
  const sheets = sheetsOf(kitchen());
  for (const page of sheets) {
    const svg = sheetToSvg(page.sheet, { kind: 'wall-elevation' });
    assert.match(svg, /^<svg /);
    assert.match(svg, /data-cc-drawing="wall-elevation"/);
    assert.ok(svg.includes('No Scale'), `${page.name}: the title block is on the glass too`);
    assert.ok(page.sheet.width > 0 && page.sheet.height > 0);
  }
  assert.deepEqual(wallDrawingPages({
    entries: kitchen(), project: { name: 'x' }, room: ROOM, profile: P, date: '',
  }).length, sheets.length);
});

test('F5 — chainValues is total, and a single edge is not a chain', () => {
  assert.deepEqual(chainValues([0, 600, 1100]), [600, 500]);
  assert.deepEqual(chainValues([600, 0, 1100]), [600, 500], 'order does not matter');
  assert.deepEqual(chainValues([600, 600.2]), [], 'two edges a joiner cannot measure between are one');
  assert.deepEqual(chainValues([]), []);
  assert.deepEqual(chainValues([500]), []);
});


// ═══ 7. THE TWO CHAIN BUILDERS, ON THEIR OWN ═══════════════════════════════

test('F5 — the chain builders draw exactly the two runs they are named for', () => {
  // Called directly, so the pair is pinned without a whole wall around it —
  // which is what stops a future refactor quietly dropping one of the two.
  const group = wallGroups(kitchen(), P)[0];
  const { detailed, grouped } = widthChains(group.members, P);
  const h = horizontalChains(group.members, {
    profile: P, textHeight: 55, y: { top: group.top, bottom: 0 },
  });
  const hTexts = h.filter((e) => e.kind === 'text');
  assert.equal(hTexts.length, detailed.length + grouped.length, 'two runs, not one');
  assert.ok(hTexts.some((e) => e.y > group.top), 'one above');
  assert.ok(hTexts.some((e) => e.y < 0), 'and one below');

  const { fronts, bands } = heightChains(group.members);
  const v = verticalChains(group.members, {
    profile: P, textHeight: 55, x: { left: group.from, right: group.to }, fronts: true,
  });
  const vTexts = v.filter((e) => e.kind === 'text');
  assert.equal(vTexts.length, fronts.length + bands.length + 1, 'two runs and the overall');
  assert.ok(vTexts.some((e) => e.x > group.to), 'both on the right');
  assert.ok(vTexts.some((e) => e.x < group.from), 'the overall on the left');
});

test('F5 — the set names its own files, and the job names them', () => {
  // T31-F5: every export this app writes carries the job and the minute.
  const now = new Date(2026, 7, 18, 23, 45);
  assert.equal(
    wallDrawingsFilename({ project: 'Anderson Kitchen', now }),
    wallDrawingsFilename({ project: 'Anderson Kitchen', ext: 'pdf', now }),
  );
  const pdf = wallDrawingsFilename({ project: 'Anderson Kitchen', now });
  const zip = wallDrawingsFilename({ project: 'Anderson Kitchen', ext: 'zip', now });
  assert.match(pdf, /wall-drawings/);
  assert.match(pdf, /\.pdf$/);
  assert.match(zip, /\.zip$/);
  assert.ok(pdf.includes('1808') && pdf.includes('2345'), `the minute is in it: ${pdf}`);
});
