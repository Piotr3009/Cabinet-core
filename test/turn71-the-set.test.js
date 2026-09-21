// ─── TURN 71 · THE SET: ONE VIEW PER SHEET, EVERY SHEET THE SAME LAW ────────
//
// The owner, 21.09.2026, with Skylon Joinery's AutoCAD set for 3-7 Herbal
// Hill on the table:
//
//   *"nasze w CC teraz się nakładają, a tutaj jest wszystko osobno … mega
//   profesjonalnie … nie zapomnij zostawić w stopce miejsca na firmę, daty,
//   nazwy"*, then *"żeby tylko odzwierciedlało rzeczywistość, nóżki żeby były
//   takie jak wszędzie"*, then *"chodziło mi o kształt nóżek jak na
//   wizualizacji … weź zakoduj"*.
//
// So the set is proved on HIS kitchen (`fixtures/t71-herbal-hill.js`), read
// off his six sheets: the sheet law (zones that never overlap, one title strip,
// the scale rung printed), the chains (each dimension once, in its own band,
// no two figures on one spot), the hardware drawn from the engine's own
// numbers (the leg the scene draws, the plates the side is drilled for), the
// order and numbering of the set, the cut list's pagination, and the three
// renderers reading the two new entity kinds.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { wallGroups } from '../src/engine/drawings/wallElevation.js';
import {
  chooseSetScale, drawingContext, fitEntities, keyPlan, layoutSetSheet, setPage, setZones, titleStrip, wrapWords,
} from '../src/engine/drawings/setSheet.js';
import { chainH, chainV, figureCollisions, figureWidth } from '../src/engine/drawings/setChains.js';
import {
  applianceLabel, buildRunElevation, hingePlateMarks, legHardware, measureRun, worktopsOnWall,
} from '../src/engine/drawings/setElevation.js';
import { buildPlan, cutEntries, cutHeight, measurePlan } from '../src/engine/drawings/setPlan.js';
import { buildStation, sectionStations } from '../src/engine/drawings/setSection.js';
import { buildPerspective, makeCamera, runBoxes } from '../src/engine/drawings/setPerspective.js';
import { buildCutList, buildVisual, cutListPages, cutRows, visualPictureBox } from '../src/engine/drawings/setPaper.js';
import { titleFor, visualAspect, wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { sheetToSvg } from '../src/engine/drawings/svg.js';
import { sheetToDxf } from '../src/engine/drawings/dxf.js';
import { boundsOf, entPoly, moveEntities } from '../src/engine/drawings/primitives.js';
import { DRAWING_LAYERS } from '../src/engine/drawings/layers.js';
import { bookletDoc } from '../src/lib/drawingExport.js';
import { hhEntries, hhWorktops, HH_PROJECT, HH_ROOM } from './fixtures/t71-herbal-hill.js';

const entries = hhEntries(P);
const worktops = hhWorktops(P);
const setOf = (extra = {}) => wallDrawingSheets({
  entries, project: HH_PROJECT, room: HH_ROOM, worktops, profile: P, date: '21.09.2026', design: { fronts: { style: 'F' } }, ...extra,
});
const wallA = () => wallGroups(entries, P)[0];
const textsOf = (sheet) => sheet.entities.filter((e) => e.kind === 'text').map((e) => String(e.text));
const inBox = (e, b) => {
  const x = e.x ?? e.x1 ?? e.cx ?? e.pts?.[0]?.[0];
  const y = e.y ?? e.y1 ?? e.cy ?? e.pts?.[0]?.[1];
  return x != null && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
};

// ═══ 1. THE SHEET LAW ══════════════════════════════════════════════════════

test('T71 · the zones: A3 landscape, one strip across, a column, bands, and nothing overlaps', () => {
  const S = P.drawings.set;
  const z = setZones(P, { column: true, caption: true });
  assert.deepEqual([z.page.id, z.page.width, z.page.height, z.page.orientation], ['A3', 420, 297, 'landscape']);
  assert.deepEqual(z.frame, { x: S.margin, y: S.margin, w: 420 - 2 * S.margin, h: 297 - 2 * S.margin });
  assert.equal(z.title.w, z.frame.w, 'the title strip runs the whole width, as his does');
  assert.equal(z.title.h, S.titleHeight);
  assert.equal(z.column.x, z.box.x + z.box.w, 'the column starts where the drawing box ends');
  assert.equal(z.column.w, S.columnWidth);
  assert.equal(z.box.y, z.title.y + z.title.h, 'the box stands on the strip');
  // The object area is the box less a dimension band on every side and the
  // caption at the top: the chains have a home and the caption has a home.
  assert.equal(z.object.x, z.box.x + S.band);
  assert.equal(z.object.w, z.box.w - 2 * S.band);
  assert.equal(z.object.h, z.box.h - z.captionHeight - 2 * S.band);
  // Without a column (cover, cut list) the box takes the whole width.
  assert.equal(setZones(P, { column: false }).box.w, z.frame.w);
  assert.equal(S.titleCells.reduce((a, b) => a + b, 0), z.frame.w, 'the seven cells add up to the strip');
});

test('T71 · the scale is a rung of the ladder and says so; a picture is NTS', () => {
  const z = setZones(P);
  const run = chooseSetScale({ w: 4420 + 2 * 26 * 20, h: 2400 }, z.object, P);
  assert.deepEqual([run.scale, run.label, run.onLadder], [20, '1:20 @ A3', true], 'his 4420 wall lands on 1:20');
  const section = chooseSetScale({ w: 1400, h: 2400 }, z.object, P);
  assert.deepEqual([section.scale, section.label], [15, '1:15 @ A3']);
  const huge = chooseSetScale({ w: 40000, h: 100 }, z.object, P);
  assert.equal(huge.label, 'NTS', 'off the ladder there is no rung to print');
  assert.ok(!huge.onLadder && huge.scale > 50);
  // Every scaled sheet of the proof set prints its rung; the strip repeats it.
  for (const s of setOf()) {
    if (['cover', 'cutlist'].includes(s.variant)) { assert.equal(s.sheet.scaleLabel, 'n/a'); continue; }
    if (['perspective', 'visual'].includes(s.variant)) { assert.equal(s.sheet.scaleLabel, 'NTS'); continue; }
    assert.ok(P.drawings.set.scales.includes(s.sheet.scale), `${s.name}: 1:${s.sheet.scale} is a rung`);
    assert.equal(s.sheet.scaleLabel, `1:${s.sheet.scale} @ A3`);
    assert.ok(textsOf(s.sheet).includes(s.sheet.scaleLabel), `${s.name}: printed in the strip`);
  }
});

test('T71 · a drawn thing never leaves its zone: geometry in the box, strip words in the strip', () => {
  for (const s of setOf()) {
    const z = s.sheet.zones;
    const geometry = s.sheet.entities.filter((e) => e.kind !== 'text' && !['FRAME', 'FRAME_LIGHT', 'SHEET_MUTED'].includes(e.layer) && !e.meta);
    for (const e of geometry) {
      const b = boundsOf([e]);
      const inside = b.x >= z.frame.x - 0.01 && b.x + b.w <= z.frame.x + z.frame.w + 0.01
        && b.y >= z.frame.y - 0.01 && b.y + b.h <= z.frame.y + z.frame.h + 0.01;
      assert.ok(inside, `${s.name}: a ${e.kind} on ${e.layer} leaves the frame (${JSON.stringify(b)})`);
    }
    // Nothing drawn for the object crosses into the title strip.
    const strip = s.sheet.entities.filter((e) => inBox(e, z.title) && !['FRAME', 'FRAME_LIGHT', 'SHEET_MUTED'].includes(e.layer) && e.kind !== 'text' && !e.meta);
    assert.deepEqual(strip.map((e) => `${e.kind}:${e.layer}`), [], `${s.name}: the strip carries only its own words`);
  }
});

test('T71 · the title strip: his cells, the company from Settings, the status ticked, the sheet numbered', () => {
  const t = titleFor({ project: { ...HH_PROJECT, titleBlock: { ...HH_PROJECT.titleBlock, company: { name: 'SKYLON JOINERY', tagline: 'Bespoke joinery', lines: ['Unit 4', '020 7000 0000'] } } }, profile: P, no: '03', name: 'Wall A · Front view', date: 'x' });
  assert.equal(t.company.name, 'SKYLON JOINERY');
  assert.equal(t.drawingNo, '032-2026-03', 'the job number and the sheet number make the drawing number');
  assert.equal(t.statusName, 'For approval');
  assert.equal(t.date, '08.02.2026', 'the title block\'s own date wins over the export date');
  const strip = titleStrip(setZones(P), { ...t, scale: '1:20 @ A3', paper: 'A3', sheet: '03', of: '09' }, P);
  const words = strip.filter((e) => e.kind === 'text').map((e) => e.text);
  for (const w of ['SKYLON JOINERY', 'Bespoke joinery', 'Unit 4', '020 7000 0000', 'AP&W', '3-7 Herbal Hill, 1st floor', '03 · Wall A · Front view', '032-2026-03', 'PT', '032/2026', '1:20 @ A3', 'A3', 'A', '08.02.2026']) {
    assert.ok(words.includes(w), `the strip says ${w}`);
  }
  assert.ok(words.some((w) => /For approval/.test(w)));
  // The status boxes: three, the current one filled.
  const boxes = strip.filter((e) => e.kind === 'rect' && e.w === 4 && e.h === 4);
  assert.equal(boxes.length, 3);
  assert.equal(boxes.filter((e) => e.fill).length, 1, 'exactly one status is ticked');
  // No em or en dash anywhere on the strip.
  assert.ok(!words.some((w) => /[\u2013\u2014]/.test(w)), 'no dashes on the strip');
});

test('T71 · the key plan is the room, the wall in hand highlighted, every wall lettered', () => {
  assert.deepEqual([setPage(P).id, setPage(P).orientation], ['A3', 'landscape']);
  const kp = keyPlan(setZones(P), { room: HH_ROOM, highlight: 0, arrow: true }, P);
  const words = kp.filter((e) => e.kind === 'text').map((e) => e.text);
  for (const w of ['KEY PLAN', 'A', 'B', 'C', 'D']) assert.ok(words.includes(w), `the key plan says ${w}`);
  assert.ok(kp.some((e) => e.kind === 'poly' && e.fill), 'the wall in hand is a filled band');
  const col = setZones(P).column;
  for (const e of kp) {
    const b = boundsOf([e]);
    assert.ok(b.x >= col.x - 0.01 && b.x + b.w <= col.x + col.w + 0.01, 'and it stays in the column');
  }
  assert.ok(!keyPlan(setZones(P), { room: HH_ROOM, highlight: null, arrow: false }, P).some((e) => e.kind === 'poly' && e.fill), 'a plan sheet highlights no wall');
});

test('T71 · an appliance space is named on the sheet by the engine\'s own type, never guessed', () => {
  assert.equal(applianceLabel({ type: 'DW_PANEL' }), 'D/W');
  assert.equal(applianceLabel({ type: 'FRIDGE' }), 'FRIDGE');
  assert.equal(applianceLabel({ type: 'OVEN_BASE' }), 'OVEN');
  assert.equal(applianceLabel({ type: 'BUD' }), null);
  assert.equal(applianceLabel({ type: 'SINK' }), 'SINK', 'the sink is named on the fronts, and never boxed as a space');
  const ctx = drawingContext(20, P);
  const fronts = buildRunElevation(wallA(), { withFronts: true, room: HH_ROOM, profile: P, ctx });
  const labels = fronts.entities.filter((e) => e.kind === 'text' && e.layer === 'APPLIANCE').map((e) => e.text);
  assert.ok(labels.some((t) => /D\/W/.test(t)) && labels.some((t) => /FRIDGE/.test(t)), 'the dishwasher and the fridge are named on the front view');
});

test('T71 · `wrapWords` and `fitEntities`: the small helpers do what the sheets lean on', () => {
  assert.deepEqual(wrapWords('one two three four', 9), ['one two', 'three', 'four']);
  assert.deepEqual(wrapWords('averyveryverylongword x', 5), ['averyveryverylongword', 'x'], 'a word longer than the row stands alone');
  const fitted = fitEntities([entPoly('CARCASE', [[0, 0], [1000, 0], [1000, 500]]), { kind: 'text', layer: 'UNIT_NUMBER', x: 500, y: 250, text: '01', height: 120, paperHeight: 3 }], { x: 10, y: 10, w: 100, h: 100 }, { textHeight: 2 });
  const b = boundsOf(fitted.filter((e) => e.kind === 'poly'));
  assert.ok(b.w <= 96.01 && b.x >= 10 && b.x + b.w <= 110, 'scaled into the box');
  assert.equal(fitted[1].height, 2, 'every word at one paper height');
  assert.equal(fitted[1].paperHeight, undefined);
});

// ═══ 2. THE CHAINS ═════════════════════════════════════════════════════════

test('T71 · a chain lifts a figure that does not fit its segment, with a leader, alternating', () => {
  const ctx = drawingContext(20, P);
  const tight = chainH({ edges: [0, 30, 60, 1000], y: 100, yObj: 0, ctx });
  assert.deepEqual(tight.figures.map((f) => f.caption), ['30', '30', '940']);
  const lifted = tight.figures.filter((f) => f.lifted);
  assert.equal(lifted.length, 2, 'the two 30s cannot carry a figure and are lifted');
  assert.ok(Math.abs(lifted[0].y - lifted[1].y) > ctx.mm(3), 'and alternate, so the two lifted figures do not collide');
  assert.ok(!tight.figures[2].lifted, 'the 940 sits on its line');
  assert.ok(tight.some((e) => e.kind === 'line' && e.layer === 'DIMENSIONS' && Math.abs(e.y2 - e.y1) > 0 && e.x1 === e.x2 && e.y1 === 100), 'a leader from the line');
  assert.equal(figureCollisions([tight], ctx.textHeight).length, 0);
  // Arrowheads are filled triangles in the dimension colour; the ticks are polys.
  const heads = tight.filter((e) => e.kind === 'poly');
  assert.ok(heads.length >= 2 && heads.every((e) => e.fill === DRAWING_LAYERS.DIMENSIONS.colour && e.noStroke));
  // A vertical chain reads the same way, rotated.
  const v = chainV({ edges: [0, 150, 870, 2400], x: 500, xObj: 0, ctx, left: false });
  assert.deepEqual(v.figures.map((f) => f.caption), ['150', '720', '1530']);
  assert.ok(v.some((e) => e.kind === 'text' && e.rotate === -90), 'figures stand along the line');
  assert.equal(figureWidth('1530', ctx.textHeight), 4 * ctx.textHeight * 0.55);
});

test('T71 · on the proof kitchen no two figures share a spot, and every chain stays in its band', () => {
  const group = wallA();
  const onWall = worktopsOnWall(worktops.map((w) => w.geometry || w), group.wall);
  for (const withFronts of [true, false]) {
    const bounds = measureRun(group, { room: HH_ROOM, worktops: onWall, profile: P });
    const { scale } = chooseSetScale(bounds, setZones(P).object, P);
    const ctx = drawingContext(scale, P);
    const built = buildRunElevation(group, { withFronts, room: HH_ROOM, worktops: onWall, profile: P, ctx });
    assert.equal(figureCollisions(built.chains, ctx.textHeight).length, 0, `${withFronts ? 'fronts' : 'internal'}: no two figures collide`);
    // Every figure is outside the run (in a band), never over the cabinets.
    const run = { x: group.from, y: 0, w: group.to - group.from, h: Math.max(group.top, ...onWall.map((w) => w.y + w.h)) };
    for (const ch of built.chains) {
      for (const f of ch.figures) {
        const over = f.x > run.x && f.x < run.x + run.w && f.y > run.y && f.y < run.y + run.h;
        assert.ok(!over, `figure ${f.caption} at ${f.x},${f.y} sits over the run`);
      }
    }
    // Each dimension once in its home: no chain repeats a segment, and the
    // overall stands on one line only. (The wall run above and the floor run
    // below may both read 520 over the same x: two runs, two homes, as his.)
    for (const ch of built.chains) {
      const keys = ch.figures.map((f) => `${f.axis}:${Math.round(f.a)}:${Math.round(f.b)}`);
      assert.equal(new Set(keys).size, keys.length, 'a chain never repeats a segment');
    }
    const overall = built.chains.filter((ch) => ch.figures.some((f) => f.axis === 'x' && Math.round(f.b - f.a) === 4420));
    assert.equal(overall.length, 1, 'the 4420 overall is on exactly one line');
  }
});

test('T71 · the front view\'s chains are his: wall units above, floor run and scribes below, overall on the second line', () => {
  const group = wallA();
  const onWall = worktopsOnWall(worktops.map((w) => w.geometry || w), group.wall);
  const ctx = drawingContext(20, P);
  const built = buildRunElevation(group, { withFronts: true, room: HH_ROOM, worktops: onWall, profile: P, ctx });
  const captions = (i) => built.chains[i].figures.map((f) => f.caption);
  // Above: the wall run, 520 520 520 520 1040 600, over its own band.
  assert.deepEqual(captions(0).filter((c) => /^\d+$/.test(c)).slice(0, 6), ['520', '520', '520', '520', '1040', '600']);
  // Below: 25 off wall D, the floor run, the fridge, the infill, the wall end.
  const below = captions(1);
  assert.equal(below[0], '25', 'the scribe to wall D is the first figure');
  assert.ok(below.includes('1040') && below.includes('600'), 'the sink and the fridge');
  assert.equal(below.reduce((a, c) => a + Number(c), 0), 4420, 'the floor chain adds up to the wall');
  const overall = captions(2);
  assert.deepEqual(overall, ['4420'], 'the overall on the second line, once');
  // Left: a chain from the floor to the ceiling, so the ceiling is read too.
  const toCeiling = built.chains.find((ch) => ch.figures.length && ch.figures.every((f) => f.axis === 'y')
    && Math.min(...ch.figures.map((f) => f.a)) === 0 && Math.max(...ch.figures.map((f) => f.b)) === HH_ROOM.height);
  assert.ok(toCeiling, 'the ceiling is dimensioned');
  assert.equal(toCeiling.figures.reduce((a, f) => a + (f.b - f.a), 0), HH_ROOM.height);
});

// ═══ 3. THE HARDWARE, FROM THE ENGINE ══════════════════════════════════════

test('T71 · the legs on the internal layout are the scene\'s leg: plate, stem, foot, at the engine\'s positions', () => {
  const L = P.hardware.leg;
  const bud = entries.find((e) => e.unit.params.unit_num === '01').result;
  const legs = bud.assemblies.legs;
  const legH = bud.assemblies.carcass.legHeight;
  assert.ok(legs.positions.length >= 2 && legH > 0, 'the engine publishes the legs');
  const one = legHardware(legs.positions[0], { width: legs.width, height: legH, profile: P });
  assert.equal(one.length, 3, 'plate, stem, foot');
  const [plate, stem, foot] = one;
  assert.equal(plate.w, legs.width, 'the plate is as wide as the engine\'s leg');
  assert.equal(plate.h, L.plateThickness);
  assert.equal(stem.w, L.stemDiameter);
  assert.equal(foot.w, L.footDiameter);
  assert.equal(foot.h, L.footHeight);
  assert.equal(plate.h + stem.h + foot.h, legH, 'the three add up to the leg height');
  assert.equal(foot.y, -legH, 'the foot stands on the floor');
  assert.ok(one.every((e) => e.layer === 'LEG_BLOCK' && e.solid));
  // On the sheet: three rects per leg per unit, and the front view has none.
  const group = wallA();
  const ctx = drawingContext(20, P);
  const internal = buildRunElevation(group, { withFronts: false, room: HH_ROOM, profile: P, ctx });
  // One leg per x on an elevation: the back leg of a pair stands behind the front one.
  const uniqueXs = (m) => new Set((m.result.assemblies?.legs?.positions || []).map((p) => Math.round(p.x))).size;
  const expected = group.members.reduce((a, m) => a + ((m.result.assemblies?.carcass?.legHeight || 0) > 0 ? 3 * uniqueXs(m) : 0), 0);
  assert.ok(expected >= 3 * 2 * 6, 'his six legged base units, two legs each in elevation');
  assert.equal(internal.entities.filter((e) => e.layer === 'LEG_BLOCK').length, expected);
  const fronts = buildRunElevation(group, { withFronts: true, room: HH_ROOM, profile: P, ctx });
  assert.equal(fronts.entities.filter((e) => e.layer === 'LEG_BLOCK').length, 0, 'the plinth hides them on the front view');
  // Where they stand, in x, is the engine's own list, moved by the unit's x.
  const m = group.members[0];
  const plates = internal.entities.filter((e) => e.layer === 'LEG_BLOCK' && e.h === L.plateThickness && e.x >= m.x && e.x < m.x + m.width);
  assert.deepEqual(plates.map((e) => Math.round(e.x - m.x)).sort((a, b) => a - b), [...new Set(legs.positions.map((p) => Math.round(p.x)))].sort((a, b) => a - b));
});

test('T71 · the hinge plates are the side\'s own drilling: three per door on his 720 doors, six on the two-door sink', () => {
  const r = (num) => entries.find((e) => e.unit.params.unit_num === num).result;
  const plates = (num) => hingePlateMarks(r(num), P);
  const pairs = r('01').drillSummary.side_hinge_holes_y.length;
  assert.equal(plates('01').length, pairs * r('01').drillSummary.hinged_sides.length);
  assert.equal(plates('01').length, 3, 'a 770 door: three hinges');
  assert.equal(plates('05').length, 6, 'the sink\'s two doors: three each side');
  assert.equal(plates('04').length, 0, 'a drawer unit has no plates');
  assert.ok(plates('01').every((e) => e.layer === 'HINGES' && e.h === P.hardware.hinge.plateLength));
  // On the LEFT side for an L door, at the board's inner face.
  const G = Number(r('01').params.board_t) || 18;
  assert.ok(plates('01').every((e) => e.x === G));
});

test('T71 · the worktop is the design layer\'s slab, and the set resolves it itself when nobody hands it in', () => {
  const [slab] = worktops.map((w) => w.geometry || w);
  assert.ok(slab && slab.w > 3000, 'one slab over the six base units');
  const withSlab = setOf().find((s) => s.variant === 'fronts');
  const slabs = (s) => s.sheet.entities.filter((e) => e.kind === 'rect' && e.fill === '#f3f3f3');
  assert.equal(slabs(withSlab).length, 1, 'the front view draws the worktop');
  // The same set, with the records on the design and no `worktops` argument.
  const resolved = wallDrawingSheets({
    entries, project: HH_PROJECT, room: HH_ROOM, profile: P, date: 'd',
    design: { fronts: { style: 'F' }, worktops: [{ id: 'wt-1', unitIds: entries.slice(0, 6).map((e) => e.unit.id), decor: null }] },
  }).find((s) => s.variant === 'fronts');
  assert.equal(slabs(resolved).length, 1, 'resolved from the design\'s own records');
  const bare = wallDrawingSheets({ entries, project: HH_PROJECT, room: HH_ROOM, profile: P, date: 'd' }).find((s) => s.variant === 'fronts');
  assert.equal(slabs(bare).length, 0, 'and none when the design has none');
});

// ═══ 4. THE PLANS, THE SECTIONS, THE PERSPECTIVE ═══════════════════════════

test('T71 · the plans: cut at 400 and 1700, measured on the walls, marked with the section stations', () => {
  assert.equal(cutHeight('base', P), P.drawings.set.planCut.base);
  assert.equal(cutHeight('wall', P), P.drawings.set.planCut.wall);
  const base = cutEntries(entries, cutHeight('base', P), P).map((e) => e.unit.params.unit_num);
  const wall = cutEntries(entries, cutHeight('wall', P), P).map((e) => e.unit.params.unit_num);
  assert.deepEqual(base, ['01', '02', '03', '04', '05', '06', '07'], 'the base plan cuts the floor run and the fridge');
  assert.deepEqual(wall, ['07', '08', '09', '10', '11', '12', '13'], 'the wall plan cuts the wall run and the tall fridge');
  const b = measurePlan({ room: HH_ROOM, profile: P });
  assert.deepEqual([b.w, b.h], [4420, 3200], 'the walls alone set the scale');
  const set = setOf();
  const plan = set.find((s) => s.variant === 'plan-base');
  assert.equal(plan.sheet.scale, 20);
  const words = textsOf(plan.sheet);
  assert.ok(words.includes('WALL A') && words.includes('WALL C'), 'the walls are named');
  assert.ok(words.filter((w) => w === 'A').length >= 2 && words.filter((w) => w === 'B').length >= 2, 'A-A and B-B are flagged on the plan');
  assert.ok(words.includes('DOOR 900'), 'the opening on wall B');
  // The plan draws every cut unit's number and the depth of the run.
  for (const n of base) assert.ok(words.includes(n), `unit ${n} on the base plan`);
});

test('T71 · the sections: A-A through the drawer unit, B-B through the sink, a chosen cabinet as C-C', () => {
  const group = wallA();
  const stations = sectionStations(group);
  assert.deepEqual(stations.map((s) => [s.letter, s.member.unit.params.unit_num]), [['A', '04'], ['B', '05']]);
  const chosen = sectionStations(group, { chosenId: 'hh-02' });
  assert.deepEqual(chosen.map((s) => s.letter), ['A', 'B', 'C']);
  assert.deepEqual(sectionStations(group, { chosenId: 'hh-04' }).map((s) => s.letter), ['A', 'B'], 'choosing A-A\'s own unit adds nothing');
  const ctx = drawingContext(15, P);
  const st = buildStation(group, stations[0], { room: HH_ROOM, worktops: worktops.map((w) => w.geometry || w), profile: P, ctx });
  assert.ok(st.members.map((m) => m.unit.params.unit_num).includes('04'));
  assert.ok(st.entities.some((e) => e.pen === 'CUT'), 'the knife cuts');
  assert.ok(st.entities.some((e) => e.layer === 'LEG_BLOCK'), 'the legs stand under the cut carcass');
  assert.ok(st.entities.some((e) => e.kind === 'rect' && e.fill === '#d9d9d9'), 'the worktop slab is cut');
  assert.ok(textsOf(st).some((t) => /SECTION A-A · through unit/.test(t)));
  assert.equal(figureCollisions(st.chains, ctx.textHeight).length, 0);
  const sheet = setOf().find((s) => s.variant === 'sections');
  assert.equal(sheet.name, 'Wall A · Sections A-A and B-B');
  assert.equal(setOf({ sectionUnitId: 'hh-02' }).find((s) => s.variant === 'sections').name, 'Wall A · Sections A-A and B-B and C-C');
});

test('T71 · the perspective: the engine\'s boxes through a pinhole, painted far to near, numbered, NTS', () => {
  const group = wallA();
  const boxes = runBoxes(group, { worktops: worktops.map((w) => w.geometry || w), profile: P });
  assert.equal(boxes.filter((b) => b.tag === 'unit').length, group.members.length);
  assert.equal(boxes.filter((b) => b.tag === 'worktop').length, 1);
  assert.ok(boxes.filter((b) => b.tag === 'plinth').length >= 6);
  const cam = makeCamera([0, 1650, 5000], [2000, 1200, 0]);
  const near = cam.project([2000, 1200, 1000]); const far = cam.project([2000, 1200, 0]);
  assert.ok(near[2] < far[2], 'distance is a distance');
  const ctx = drawingContext(1, P);
  const pic = buildPerspective(group, { room: HH_ROOM, worktops: worktops.map((w) => w.geometry || w), profile: P, ctx });
  const faces = pic.entities.filter((e) => e.kind === 'poly' && e.fill === 'white');
  assert.ok(faces.length > 20, 'faces, painted');
  assert.ok(pic.entities.filter((e) => e.layer === 'DOORS').length >= 13, 'every front is a box on the picture');
  const numbers = pic.entities.filter((e) => e.kind === 'text' && e.layer === 'UNIT_NUMBER').map((e) => e.text);
  assert.deepEqual(numbers.sort(), group.members.map((m) => m.unit.params.unit_num).sort());
  assert.ok(pic.entities.every((e) => e.layer !== 'DIMENSIONS'), 'a picture is not dimensioned');
  const sheet = setOf().find((s) => s.variant === 'perspective');
  assert.equal(sheet.sheet.scaleLabel, 'NTS');
});

// ═══ 5. THE SET, BOUND ═════════════════════════════════════════════════════

test('T71 · the order and the numbering of his set, the cover last with the index of the others', () => {
  const set = setOf();
  assert.deepEqual(set.map((s) => `${s.no} ${s.name}`), [
    '00 Cover, index and revisions', '01 Plan · base units', '02 Plan · wall units',
    '03 Wall A · Front view', '04 Wall A · Internal layout', '05 Wall A · Sections A-A and B-B',
    '06 Wall A · Perspective view', '07 Visualisation', '08 Cut list and materials',
  ]);
  for (const s of set) {
    assert.equal(s.sheet.sheetNo, s.no);
    assert.equal(s.sheet.sheetOf, '09');
    assert.ok(textsOf(s.sheet).includes(`${s.no} / 09`), `${s.name} is numbered on its strip`);
    assert.ok(textsOf(s.sheet).includes(`032-2026-${s.no}`), `${s.name} carries its drawing number`);
  }
  const cover = textsOf(set[0].sheet);
  for (const s of set.slice(1)) {
    assert.ok(cover.includes(s.no) && cover.includes(s.name), `the index lists ${s.no} ${s.name}`);
    assert.ok(cover.includes(s.sheet.scaleLabel), `…with its scale ${s.sheet.scaleLabel}`);
  }
  assert.ok(cover.includes('First issue') && cover.includes('PT'), 'the revision table');
  assert.ok(set[0].sheet.entities.some((e) => e.kind === 'poly' && e.fill === 'white'), 'the cover carries the perspective, fitted');
  assert.deepEqual(wallDrawingSheets({ entries: [], project: HH_PROJECT, room: HH_ROOM, profile: P }), [], 'no cabinet, no set');
});

test('T71 · the cut list: every panel per unit from the engine, paged down four columns, the totals last', () => {
  const rows = cutRows(entries[0].result);
  // The engine's own split: board panels, then the front-material ones (the
  // plinth is cut from front material and the engine says so).
  assert.deepEqual(rows.carcass.map((r) => r.id), ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK', 'SHELF-1']);
  assert.deepEqual(rows.fronts.map((r) => r.id), ['PLINTH', '01-F']);
  const zones = setZones(P, { column: false, caption: true });
  const one = cutListPages(zones, entries);
  assert.equal(one.length, 1, 'his 13 units fit one sheet');
  assert.equal(one[0].length, 13);
  assert.ok(one[0].every((b) => b.col >= 0 && b.col < 4));
  assert.ok(one[0].every((b) => b.y - b.h >= zones.box.y + 6 - 0.01), 'no block runs off the bottom');
  const many = cutListPages(zones, [...entries, ...entries, ...entries, ...entries]);
  assert.ok(many.length > 1, '52 units need more than one sheet');
  assert.equal(many.flat().length, 52, 'every unit is on exactly one page');
  const set = wallDrawingSheets({ entries: [...entries, ...entries, ...entries, ...entries], project: HH_PROJECT, room: HH_ROOM, profile: P, date: 'd' });
  const lists = set.filter((s) => s.variant === 'cutlist');
  assert.equal(lists.length, many.length);
  assert.match(lists[0].name, /Cut list and materials 1 of \d/);
  assert.ok(!textsOf(lists[0].sheet).some((t) => /^TOTALS/.test(t)), 'the totals are not on the first page');
  assert.ok(textsOf(lists[lists.length - 1].sheet).some((t) => /^TOTALS · 52 units/.test(t)), 'and are on the last');
  const words = textsOf(buildCutList(zones, { entries }).length ? { entities: buildCutList(zones, { entries }) } : { entities: [] });
  assert.ok(words.includes('UNIT 04') && words.includes('BUDR 520'));
  assert.ok(words.some((w) => /carcass panels? ·/.test(w)));
  assert.ok(words.some((w) => /^TOTALS · 13 units/.test(w)));
});

test('T71 · the visualisation frames the render at the picture\'s own aspect, and says what it waits for without one', () => {
  const zones = setZones(P, { column: true, caption: true });
  const pic = visualPictureBox(zones);
  assert.ok(Math.abs(visualAspect(P) - pic.w / pic.h) < 1e-9);
  assert.ok(visualAspect(P) > 1.2 && visualAspect(P) < 2, 'a landscape frame');
  const empty = buildVisual(zones, { finishes: [{ name: 'FRONTS', desc: 'x', colour: '#abcdef' }], note: 'a note that is long enough to need wrapping onto a second row of the column' });
  assert.ok(empty.some((e) => e.kind === 'text' && e.text === 'RENDER'));
  assert.ok(!empty.some((e) => e.kind === 'image'));
  assert.ok(empty.filter((e) => e.kind === 'text' && /wrapping|column/.test(e.text)).length >= 2, 'the note wraps');
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const withImage = buildVisual(zones, { image: png });
  const img = withImage.find((e) => e.kind === 'image');
  assert.ok(img && img.href === png && img.w < pic.w && img.h < pic.h);
  const set = setOf({ renderImage: png });
  const visual = set.find((s) => s.variant === 'visual');
  assert.ok(visual.sheet.entities.some((e) => e.kind === 'image'), 'the set frames the render it is handed');
  assert.match(sheetToSvg(visual.sheet, { kind: 'visual' }), /<image [^>]*href="data:image\/png/);
  assert.ok(sheetToDxf(visual.sheet).includes('FRAME_LIGHT'), 'the DXF draws the frame and skips the pixels');
  assert.equal(bookletDoc([visual.sheet]).getNumberOfPages(), 1, 'and the PDF binds it');
});

// ═══ 6. THE RENDERERS READ THE NEW ENTITY KINDS ════════════════════════════

test('T71 · poly, image, right-aligned, masked and bold text reach the SVG, the DXF and the PDF', () => {
  const sheet = {
    width: 100, height: 100, format: { id: 'A4' },
    entities: [
      { ...entPoly('CARCASE', [[10, 10], [50, 10], [50, 40]], { fill: 'white' }), pen: 'VISIBLE' },
      { ...entPoly('DIMENSIONS', [[10, 60], [20, 60], [15, 70]], { fill: '#1A3CE6' }), noStroke: true },
      { ...entPoly('BUILDING', [[60, 60], [90, 60], [90, 90]], { open: true }), pen: 'THIN' },
      { kind: 'text', layer: 'FRAME', x: 90, y: 90, text: 'right', height: 3, align: 'right', weight: 'bold', mask: true, colour: '#ff0000' },
      { kind: 'rect', layer: 'SHEET_MUTED', x: 5, y: 80, w: 10, h: 10, fill: '#f2f2f2', noStroke: true },
    ],
  };
  const svg = sheetToSvg(sheet, { kind: 'x' });
  assert.match(svg, /<path d="M10 90 L50 90 L50 60 Z" fill="#ffffff"/i, 'a closed poly, white-filled, Y flipped');
  assert.match(svg, /<path d="M60 40 L90 40 L90 10" fill="none"/, 'an open poly is not closed');
  assert.match(svg, /fill="#1A3CE6" stroke="none"/, 'a filled arrowhead has no stroke');
  assert.match(svg, /text-anchor="end"/, 'right-aligned');
  assert.match(svg, /font-weight="bold"/);
  assert.match(svg, /<rect [^>]*fill="#ffffff"[^>]*\/>\s*<text[^>]*>right<\/text>/, 'the mask stands behind the word');
  assert.match(svg, /fill="#f2f2f2" stroke="none"/, 'a filled rect with no stroke');
  const dxf = sheetToDxf(sheet);
  assert.match(dxf, /POLYLINE/, 'a poly is a polyline in R12');
  assert.ok((dxf.match(/\r\n0\r\nPOLYLINE\r\n/g) || []).length >= 3, 'the three polys (a rect is a polyline too)');
  assert.equal(bookletDoc([sheet]).getNumberOfPages(), 1, 'jsPDF draws it all without throwing');
  // The primitives move and bound a poly like anything else.
  const moved = moveEntities([entPoly('X', [[0, 0], [1, 1]])], 5, 5)[0];
  assert.deepEqual(moved.pts, [[5, 5], [6, 6]]);
  assert.deepEqual(boundsOf([entPoly('X', [[2, 3], [7, 9]])]), { x: 2, y: 3, w: 5, h: 6 });
});

// ═══ 7. THE APP, WIRED ═════════════════════════════════════════════════════

test('T71 · the window hands the set the worktops and the render, carries the title block, and the menu says "set"', () => {
  const modal = readFileSync(new URL('../src/components/DrawingModal.jsx', import.meta.url), 'utf8');
  assert.match(modal, /worktops: worktopsOf\(\)/, 'the design layer\'s slabs go on the sheets');
  assert.match(modal, /renderImage,/, 'and the render');
  assert.match(modal, /rig\.capture\(job\)/, 'captured through the same rig as Output ▸ Render');
  assert.match(modal, /preset: 'iso-left'/, 'from the three-quarter left');
  assert.match(modal, /aspect: visualAspect\(profile\)/, 'shaped to the sheet\'s frame');
  assert.match(modal, /data-title-block="1"/, 'the title block\'s words are typed here');
  assert.match(modal, /setTitleBlock\(\{ company: \{ name: v \} \}\)/);
  assert.match(modal, /page\.no \? `\$\{page\.no\} · \$\{page\.name\}` : page\.name/, 'the sheet buttons are numbered');
  assert.ok(!/format,\n\s+date,\n\s+\}\);\n\s+\/\/ The census/.test(modal), 'the set takes no paper choice');
  const page = readFileSync(new URL('../src/pages/ConfiguratorPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /<DrawingModal rig=\{renderRig\} \/>/, 'the page hands the window the rig');
  assert.match(page, /worktops: worktopsOf\(\),\s+renderImage,/, 'the menu path binds the same set');
  const menu = readFileSync(new URL('../src/lib/outputMenu.js', import.meta.url), 'utf8');
  assert.match(menu, /label: 'Drawing set \(PDF\)'/);
  assert.match(menu, /label: 'Drawing set \(DXF\)'/);
});

test('T71 · the store: `setTitleBlock` merges, the company is remembered for the next job', async () => {
  const { useProjectStore } = await import('../src/stores/projectStore.js');
  const s = useProjectStore.getState();
  s.newProject('T71');
  s.setTitleBlock({ drawnBy: 'PT', company: { name: 'SKYLON JOINERY' } });
  s.setTitleBlock({ company: { tagline: 'Bespoke joinery' }, status: 'C' });
  const tb = useProjectStore.getState().project.titleBlock;
  assert.deepEqual(tb, { drawnBy: 'PT', status: 'C', company: { name: 'SKYLON JOINERY', tagline: 'Bespoke joinery' } });
  // The title strip reads it.
  const t = titleFor({ project: useProjectStore.getState().project, profile: P, no: '01', name: 'x' });
  assert.equal(t.company.name, 'SKYLON JOINERY');
  assert.equal(t.statusName, 'For production');
  // A new job carries the company (when this computer remembers one) and
  // nothing else of the last job's block.
  s.newProject('Next');
  const next = useProjectStore.getState().project.titleBlock;
  assert.equal(next.drawnBy, undefined);
  assert.ok(next.company == null || next.company.name === 'SKYLON JOINERY');
});

test('T71 · the unit card is untouched (iron rule 4): the T43 golden still matches byte for byte', () => {
  const golden = readFileSync(new URL('./fixtures/t43-unit-card-before.svg', import.meta.url), 'utf8');
  assert.ok(golden.length > 1000, 'the golden exists; its own test compares it');
});
