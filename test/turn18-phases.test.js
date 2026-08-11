// ─── TURN 18 — THE DRAWER TURN, PHASE BY PHASE ──────────────────────────────
//
// The owner put the last missing numbers on the table — the two side pockets,
// read off his own workshop DXF — and brought the whole MOVENTO 760H ladder as
// GLB. So drawers become TRUE, runners become VISIBLE, and the CNC labels stop
// spilling over their parts.
//
// Every assertion here is one of CLAUDE.md's own sentences, in arithmetic.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { computeCabinet, minDrawerFrontHeight } from '../src/engine/cabinet.js';
import { defaultParamsFor, getUnitType } from '../src/engine/types.js';
import {
  MONO_ADVANCE, labelBlock, partLabelAnchor, splitLines,
} from '../src/engine/cnc/annotation.js';
import { panelLabel, panelLabelBlock, parseDxf, panelDxf } from '../src/engine/cnc/dxf.js';
import { partLabelText } from '../src/engine/cnc/partLabel.js';
import {
  clearRunnerCatalogue, parseRunnerManifest, resolveRunnerVariant, runnerEntry,
  runnerModelUrl, runnerNominalLength, runnerPairSpec, setRunnerCatalogue, syncRodFor,
} from '../src/engine/runners.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import { DEFAULT_DESIGN, migrateDesign } from '../src/engine/design.js';
import { elementFields } from '../src/engine/elements.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';

const unit = (id, extra = {}) => computeCabinet({ ...defaultParamsFor(id, P), unit_num: '01', ...extra }, P);
const store = () => useProjectStore.getState();

// ─── F1 — the label wraps, centres and shrinks ──────────────────────────────

test('F1.1 — a label breaks onto up to three CENTRED lines at its own words', () => {
  // `F-01 BUR 597x568` — three words, and the natural break is one per line.
  assert.deepEqual(splitLines(['F-01', 'BUR', '597x568'], 3), ['F-01', 'BUR', '597x568']);
  // Two lines keeps the longest line as short as it can be, rather than
  // greedily filling the first.
  assert.deepEqual(splitLines(['F-01', 'BUR', '597x568'], 2), ['F-01 BUR', '597x568']);
  assert.deepEqual(splitLines(['ONE'], 3), ['ONE'], 'never more lines than words');

  // A small square part takes all three, because three is what stands tallest
  // on it — the block is centred both ways, so every line's offset is measured
  // from the middle and they add up to nothing.
  const block = labelBlock({
    text: 'F-01 BUR 597x568',
    sizeMm: 70,
    boxW: 300,
    boxH: 300,
    maxLines: 3,
    fillRatio: 0.85,
    lineGap: 0.25,
    minSize: 6,
  });
  assert.equal(block.visible, true);
  assert.equal(block.lines.length, 3);
  assert.ok(Math.abs(block.lines.reduce((s, l) => s + l.dy, 0)) < 1e-9, 'centred, both ways');
  assert.ok(block.lines[0].dy > 0 && block.lines[2].dy < 0, 'first line at the top');
});

test('F1.1 — a line that still will not fit truncates with `~`, and never crosses the outline', () => {
  const block = labelBlock({
    text: 'F-01 INFILL-L-FACE 30x2100',
    sizeMm: 70,
    boxW: 30,
    boxH: 2100,
    maxLines: 3,
    fillRatio: 0.85,
    lineGap: 0.25,
    minSize: 6,
  });
  assert.ok(block.visible);
  assert.ok(block.lines.some((l) => l.text.endsWith('~')), 'the middle step between drawing and hiding');
  for (const line of block.lines) {
    assert.ok(line.text.length * block.size * MONO_ADVANCE <= 30 + 1e-9,
      `"${line.text}" is wider than the board it is cut into`);
  }
  assert.ok(block.height <= 2100 + 1e-9, 'and the block is no taller than the part');
});

test('F1.1 — the sheet and the file lay a label out with ONE function', () => {
  const r = unit('WARDROBE', { drawers: 2, shelves: 2, doors: true });
  for (const panel of r.panels.filter((p) => p.cnc?.outline?.length)) {
    const sheet = panelLabelBlock(panel, { unitNum: '01', profile: P });
    const file = panelLabel(panel, { unitNum: '01', profile: P });
    assert.deepEqual(file.lines, sheet.lines.map((l) => l.text),
      `${panel.id}: the board and the screen must say the same words`);
  }
});

test('F1.2 — the EXPORT writes it at half the sheet’s height, never under the floor', () => {
  assert.equal(P.cnc.exportLabelScale, 0.5);
  const r = unit('WARDROBE', { drawers: 2, shelves: 2, doors: true });
  const bul = r.panels.find((p) => p.id === 'BUL');
  const sheet = panelLabelBlock(bul, { unitNum: '01', profile: P });
  const file = panelLabel(bul, { unitNum: '01', profile: P });
  // ─── Turn 20 (CLAUDE.md F4) ───
  // Half the sheet's height, OR the absolute cap, whichever is smaller — and
  // since `cnc.labelHeight` came down 40 → 20 the cap is the binding one on a
  // big part. The scale itself is untouched, which is F4.2 in as many words.
  assert.equal(file.h, Math.min(sheet.size * P.cnc.exportLabelScale, P.cnc.labelHeight));

  for (const panel of r.panels.filter((p) => p.cnc?.outline?.length)) {
    const s = panelLabelBlock(panel, { unitNum: '01', profile: P });
    const f = panelLabel(panel, { unitNum: '01', profile: P });
    assert.ok(f.h >= P.cnc.labelMinHeight - 1e-9, `${panel.id}: under the readable floor`);
    assert.ok(f.h <= s.size + 1e-9, `${panel.id}: the file is never BIGGER than the sheet`);
    assert.ok(f.h <= P.cnc.labelHeight + 1e-9, `${panel.id}: over the LISP's own cap`);
  }
});

test('F1.3 — a wider advance and a tighter fill: it must fit in the WORST font', () => {
  assert.equal(MONO_ADVANCE, 0.85, 'the reader’s CAD picks its own face, and his is wider than ours');
  assert.equal(P.cnc.labelFillRatio, 0.85);
  assert.equal(P.cnc.labelMaxLines, 3);
  // …and a profile saved before this turn comes back with all three.
  const old = migrateCabinetProfile({ ...P, cnc: { layoutGap: 50, layoutRowWidth: 3600 } });
  assert.equal(old.cnc.labelFillRatio, P.cnc.labelFillRatio);
  assert.equal(old.cnc.exportLabelScale, P.cnc.exportLabelScale);
});

test('F1 — the caption is centred in the part, both ways', () => {
  const at = partLabelAnchor({
    x: 100, y: 200, w: 600, h: 400,
  });
  assert.deepEqual(at, { x: 400, y: 400 });
});

test('F1.4 — the exported file carries TEXT and nothing else new', () => {
  const r = unit('WARDROBE', { drawers: 2, shelves: 2, doors: true });
  const bul = r.panels.find((p) => p.id === 'BUL');
  const parsed = parseDxf(panelDxf(bul, r.drills, { unitNum: '01', profile: P }));
  const texts = parsed.entities.filter((e) => e.type === 'text');
  const label = panelLabel(bul, { unitNum: '01', profile: P });
  assert.equal(texts.length, label.lines.length);
  for (const t of texts) assert.equal(t.layer, P.cnc.unitNumberLayer, 'no new layer name');
  // The block's own middle is the part's own middle — a one-line label is
  // written at exactly the coordinate it always was.
  const w = bul.cnc.drawn_w ?? bul.w;
  const h = bul.cnc.drawn_h ?? bul.h;
  for (const t of texts) assert.equal(t.x, w / 2);
  assert.ok(Math.abs(texts.reduce((s, t) => s + (t.y - h / 2), 0)) < 1e-6, 'centred on the part');
  assert.equal(partLabelText('01', bul), '01 BUL 560x2150');
});

// ─── F2 — drawer heights actually SAVE in kitchen units ─────────────────────

/** A clean project with one unit of `type`, and its id. */
function withUnit(type) {
  store().loadProject({
    id: null, name: 'turn18', room: null, design: null,
  }, []);
  const { id, error } = store().addUnit(type);
  assert.equal(error, null, error || '');
  return id;
}

test('F2.1 — a BUDR2 with ITEM ROWS takes 500 and the engine returns 500/264', () => {
  // This is the bug, in one assertion. Placement gives a kitchen drawer unit
  // ITEM ROWS (projectStore `newUnit`), so `drawerRef` handed the store an item
  // id, the call took the WARDROBE route, and it wrote `height_mm` on an item
  // the budr engine never reads. The value landed where nothing looks.
  const id = withUnit('BUDR2');
  const rows = store().units.find((u) => u.id === id).params.sections[0].items
    .filter((i) => i.kind === 'drawer')
    .sort((a, b) => a.index - b.index);
  assert.equal(rows.length, 2, 'a drawer unit IS its drawers — the rows are there at placement');

  // Addressed by the ITEM ID, exactly as the panel addresses it.
  store().setDrawerHeight(id, rows[0].id, 500);
  assert.deepEqual(store().units.find((u) => u.id === id).params.drawer_heights, [500],
    'only what somebody SAID is written down');
  const r = store().unitResult(id);
  assert.deepEqual(r.derived.drawer_heights, [500, 264],
    'what he typed, and the kit’s ratio for what is left');

  // …and by the INDEX, which is what a ratio stack’s own controls use.
  store().setDrawerHeight(id, 1, 260);
  assert.deepEqual(store().unitResult(id).derived.drawer_heights, [500, 260]);
});

test('F2.1 — a WARDROBE’s drawers are still items, and still take the wardrobe route', () => {
  const id = withUnit('WARDROBE');
  store().addDrawers(id, 2);
  const rows = store().units.find((u) => u.id === id).params.sections[0].items
    .filter((i) => i.kind === 'drawer')
    .sort((a, b) => a.index - b.index);
  store().setDrawerHeight(id, rows[0].id, 250);
  const saved = store().units.find((u) => u.id === id).params.sections[0].items
    .find((i) => i.id === rows[0].id);
  assert.equal(saved.height_mm, 250, 'a wardrobe drawer really is an item with a height');
  assert.equal(store().unitResult(id).derived.drawer_heights[0], 250);
});

test('F2.2 — the clamp is the engine’s, and its floor is the owner’s 38', () => {
  assert.equal(minDrawerFrontHeight(P), 38);
  assert.equal(minDrawerFrontHeight(P), P.baseDrawerUnit.runnerScrewFromBase + P.baseDrawerUnit.clearanceBelowRunner);
  const id = withUnit('BUDR2');
  store().setDrawerHeight(id, 0, 10);
  assert.equal(store().unitResult(id).derived.drawer_heights[0], 38, 'never inside the runner it hangs on');
});

test('F2.3 — the kit’s 4:3:2 drift stays FROZEN, and Reset returns to it exactly', () => {
  const id = withUnit('BUDR');
  const kit = [...store().unitResult(id).derived.drawer_heights];
  store().setDrawerHeight(id, 0, 400);
  assert.notDeepEqual(store().unitResult(id).derived.drawer_heights, kit);
  store().resetDrawerHeights(id);
  assert.deepEqual(store().unitResult(id).derived.drawer_heights, kit, 'BLOCKERS #64, untouched');
});

// ─── F3 — the drawer SIDES tell the truth ───────────────────────────────────

const pocketsOf = (panel) => Object.fromEntries((panel.cnc.pockets || []).map((p) => [p.layer, p]));

test('F3.1/F3.2 — every drawer side carries the runner reduction and the bottom groove', () => {
  const B = P.baseDrawerUnit;
  for (const [kit, extra] of [['BUDR', {}], ['WARDROBE', { drawers: 2 }], ['OVEN_BASE', {}]]) {
    const r = unit(kit, extra);
    const side = r.panels.find((p) => p.part === 'DRAWER-SIDE');
    assert.ok(side, `${kit} has drawer sides`);
    const p = pocketsOf(side);
    assert.ok(p.DRAWER_RUNNER_POCKET, `${kit}: the runner reduction`);
    assert.ok(p.DRAWER_BOTTOM_POCKET, `${kit}: the bottom groove`);
    assert.equal(p.DRAWER_RUNNER_POCKET.depth, 2, `${kit}: an 18 board becomes 16 where the runner lives`);
    assert.equal(p.DRAWER_BOTTOM_POCKET.depth, 7, `${kit}: a board stands in the other one`);

    // The side is drawn along its LENGTH in one kit and along its HEIGHT in
    // the other, so the bands are read off whichever axis is the short one.
    const runner = p.DRAWER_RUNNER_POCKET;
    const bottom = p.DRAWER_BOTTOM_POCKET;
    const acrossRunner = [Math.min(runner.x1, runner.x2), Math.max(runner.x1, runner.x2)];
    const upRunner = [Math.min(runner.y1, runner.y2), Math.max(runner.y1, runner.y2)];
    const band = (acrossRunner[1] - acrossRunner[0]) < (upRunner[1] - upRunner[0])
      ? { runner: acrossRunner, bottom: [Math.min(bottom.x1, bottom.x2), Math.max(bottom.x1, bottom.x2)] }
      : { runner: upRunner, bottom: [Math.min(bottom.y1, bottom.y2), Math.max(bottom.y1, bottom.y2)] };
    assert.deepEqual(band.runner, [0, B.runnerPocketWidth],
      `${kit}: the reduction runs from the BOTTOM EDGE up to the groove`);
    assert.deepEqual(band.bottom, [B.runnerPocketWidth, B.runnerPocketWidth + 18 + B.bottomPocketExtra],
      `${kit}: the groove’s lower edge is 15 above the bottom, and it takes an 18 board`);
  }
});

test('F3.3 — the arithmetic closes: the bottom enters each side 6.5 mm', () => {
  for (const [kit, extra, len, wide] of [
    ['WARDROBE', { drawers: 2 }, 'boxFrontLen', 'bottom_w'],
    ['BUDR', {}, 'boxFrontLen', 'bottom_w'],
  ]) {
    const d = unit(kit, extra).derived;
    assert.equal(d[wide] - d[len], P.baseDrawerUnit.bottomOversize, `${kit}: bottomOversize`);
    const entry = (d[wide] - d[len]) / 2;
    assert.equal(entry, 6.5, `${kit}: 6.5 into a 7 mm groove`);
    assert.ok(entry < P.baseDrawerUnit.bottomPocketDepth, `${kit}: half a millimetre of air`);
  }
});

test('F3.4 — the front and the back of the box STAND ON the bottom', () => {
  for (const [kit, extra] of [['BUDR', {}], ['WARDROBE', { drawers: 2 }]]) {
    const r = unit(kit, extra);
    const of = (suffix) => r.panels.find((p) => p.id === `D1-${suffix}`);
    const side = of('SL');
    const bottom = of('DNO');
    const boxFront = of('BF');
    assert.equal(bottom.box.y, side.box.y + P.baseDrawerUnit.runnerPocketWidth,
      `${kit}: the bottom stands IN the groove, 15 above the side’s bottom edge`);
    assert.equal(boxFront.box.y, bottom.box.y + bottom.box.h,
      `${kit}: and the front stands ON the bottom`);
    // …which is exactly what `side − 15 − G − 1` has always meant.
    assert.equal(
      side.box.y + side.box.h - (boxFront.box.y + boxFront.box.h),
      P.baseDrawerUnit.boxFrontHeightExtra,
      `${kit}: one millimetre of air at the top`,
    );
  }
});

// ─── F4 — hide the fronts, don't remove them ────────────────────────────────

test('F4 — Hide fronts is VIEW state, and it starts off', () => {
  const ui = useUiStore.getState();
  assert.equal(ui.hideFronts, false, 'a cabinet with no fronts must never be mistaken for one with none');
  ui.toggleHideFronts();
  assert.equal(useUiStore.getState().hideFronts, true);
  useUiStore.getState().setHideFronts(false);
  assert.equal(useUiStore.getState().hideFronts, false);
});

test('F4 — it is a LENS: nothing in the BOM, the cut list, the CNC or the params moves', () => {
  const id = withUnit('BUDR2');
  const before = JSON.stringify(store().unitResult(id));
  const params = JSON.stringify(store().units.find((u) => u.id === id).params);
  useUiStore.getState().setHideFronts(true);
  assert.equal(JSON.stringify(store().unitResult(id)), before, 'the engine never hears about it');
  assert.equal(JSON.stringify(store().units.find((u) => u.id === id).params), params);
  useUiStore.getState().setHideFronts(false);
});

// ─── F5 — the oven base, corrected ──────────────────────────────────────────

test('F5.1 — the oven’s sides keep only the sockets the back can catch', () => {
  const oven = unit('OVEN_BASE');
  const bud = unit('BUD');
  const layers = (r, id) => (r.panels.find((p) => p.id === id).cnc.pockets || []).map((p) => p.layer).sort();

  assert.deepEqual(layers(bud, 'BUL'),
    ['PUZZLE_DOG_BONES', 'PUZZLE_DOG_BONES', 'PUZZLE_DOG_BONES', 'PUZZLE_SOCKET', 'PUZZLE_SOCKET', 'PUZZLE_SOCKET', 'PUZZLE_SOCKET'],
    'a full-back base unit still carries all seven');
  for (const id of ['BUL', 'BUR']) {
    assert.deepEqual(layers(oven, id),
      ['PUZZLE_DOG_BONES', 'PUZZLE_SOCKET', 'PUZZLE_SOCKET'],
      `${id}: one dog bone into the low back, and the bottom’s two sockets`);
  }

  // The one that is kept is the one the BACK actually has a socket for.
  const back = oven.panels.find((p) => p.id === 'BACK');
  const bone = (oven.panels.find((p) => p.id === 'BUL').cnc.pockets || [])
    .find((p) => p.layer === 'PUZZLE_DOG_BONES');
  const centre = (bone.y1 + bone.y2) / 2;
  assert.equal(centre, P.puzzle.tabCentresFromEnd, 'the lowest tenon, 95 up from the carcass floor');
  assert.ok(centre + P.puzzle.dogboneHalfHeight <= back.h, 'and its dog bone lands INSIDE the back');
});

test('F5.2 — the top is two rails, and the FRONT one lies flat', () => {
  const r = unit('OVEN_BASE');
  const TR = P.ovenUnit.topRails;
  assert.equal(r.panels.some((p) => p.id === 'TOP'), false, 'a full TOP over an oven is a lid');
  const back = r.panels.find((p) => p.id === 'RAIL-B');
  const front = r.panels.find((p) => p.id === 'RAIL-F');
  assert.ok(back && front, 'the sink’s two-holder pattern');
  // ON EDGE: it is as tall as the rail and one board deep.
  assert.equal(back.box.h, TR.backHeight);
  assert.equal(back.box.d, r.params.board_t);
  // FLAT: one board tall and as deep as the rail is wide.
  assert.equal(front.box.h, r.params.board_t);
  assert.equal(front.box.d, TR.frontWidth);
  assert.equal(front.box.y + front.box.h, r.params.height, 'flush with the top of the carcass');
  // Its cut piece is still `rail width × internal width`.
  assert.equal(front.w, TR.frontWidth);
  assert.equal(front.h, r.derived.internal_width);
});

test('F5.2 — the flat rail takes its own screw pattern, and the sink keeps its', () => {
  const r = unit('OVEN_BASE');
  const TR = P.ovenUnit.topRails;
  const S = r.params.board_t / 2 + P.puzzle.centrelineExtra;
  const rows = r.drills.filter((d) => d.panel === 'BUL' && d.kind === 'rail_screw');
  // Two on the flat rail's centreline, and two down the back rail's edge.
  const flat = rows.filter((d) => Math.abs(d.y - (r.params.height - S)) < 1e-9).map((d) => d.x).sort((a, b) => a - b);
  assert.deepEqual(flat, [TR.frontScrewFromEdge, TR.frontWidth - TR.frontScrewFromEdge],
    'laid out along a HORIZONTAL board’s width, not down a vertical rail');
  const onEdge = rows.filter((d) => d.y !== r.params.height - S).map((d) => r.params.height - d.y).sort((a, b) => a - b);
  assert.deepEqual(onEdge, TR.backScrewFromTop);
  // …and the sink's own numbers are untouched, in the profile and on the part.
  assert.equal(P.sinkUnit.railHeight, 100);
  assert.deepEqual(P.sinkUnit.holderScrewFromTop, [30, 70]);
  const sink = unit('SINK');
  assert.ok(sink.panels.some((p) => p.id === 'HOLDER-F'), 'the sink still has its own two holders');
  assert.equal(sink.drills.some((d) => d.kind === 'rail_screw'), false, 'and none of the oven’s drilling');
});

test('F5.3 — no ventilation cut: the open back and the open top ARE the airflow', () => {
  const r = unit('OVEN_BASE');
  const shelf = r.panels.find((p) => p.id === 'FIXED');
  assert.deepEqual(shelf.cnc.pockets, [], 'a slot here would vent into a CLOSED drawer');
  assert.deepEqual(shelf.cnc.holes, []);
});

test('F5.4 — the drawer front takes its gap below the appliance, and the box fits the opening', () => {
  const r = unit('OVEN_BASE', { height: 770 });
  const front = r.panels.find((p) => p.part === 'DRAWER-FRONT');
  assert.equal(front.h, 169, '770 − 3 − 595 − 3');
  assert.equal(front.h, 770 - P.doors.gap - P.ovenUnit.ovenHeight - P.baseDrawerUnit.gap);

  const shelf = r.panels.find((p) => p.id === 'FIXED');
  const side = r.panels.find((p) => p.part === 'DRAWER-SIDE');
  const bottom = r.panels.find((p) => p.id === 'BOTTOM');
  assert.ok(side.box.y >= bottom.box.y + bottom.box.h, 'the box stands above the carcass bottom');
  // ─── Turn 20 (CLAUDE.md F1) ───
  // The box RIDES its runner now — `boxAboveRunner` above the drilled row —
  // and this clamp still measures the headroom from the ROW, because F1.2
  // keeps turn 18's side heights and the turn allows exactly one CNC delta.
  // So the SIDE is cut to the old clearance and the app WARNS that the box it
  // makes stands that far past the shelf, rather than silently re-cutting a
  // board (engine/cabinet.js, APPLIANCE_DRAWER_BOX_OVER_SHELF). What turn 18
  // promised — the box is cut to the OPENING and not to the front — is exactly
  // what is still asserted here.
  assert.equal(side.box.h, shelf.box.y - r.drillSummary.runner_rows_carcass_y[0],
    'the side is cut to the opening under the shelf, not to 0.7 × its front');
  assert.ok(r.warnings.some((w) => w.code === 'APPLIANCE_DRAWER_BOX_OVER_SHELF'),
    'and the app says what riding the runner costs against that clamp');
});

// ─── F6 — the MOVENTO pipeline ──────────────────────────────────────────────

test('F6.3 — NL is the largest standard runner that fits the depth', () => {
  assert.equal(runnerNominalLength(520, P), 490);
  assert.equal(runnerNominalLength(490, P), 490);
  assert.equal(runnerNominalLength(489, P), 440);
  assert.equal(runnerNominalLength(100, P), null, 'nothing in the ladder fits a 100 mm cabinet');
  // …and it is the same number the engine cuts the box to.
  const r = unit('BUDR2', { depth: 558 });
  assert.equal(r.hardware.find((h) => h.role === 'runner_pairs').spec.length_mm, 490);
  assert.equal(runnerNominalLength(558 - r.params.board_t - P.baseDrawerUnit.depthAllowance, P), 490);
});

test('F6.4 — the variant is project → unit → drawer, and T is the default', () => {
  assert.equal(P.hardware.runner.movento.defaultVariant, 'T');
  const design = migrateDesign({ ...DEFAULT_DESIGN, runners: { system: null, variant: 'S' } });
  assert.equal(resolveRunnerVariant({ profile: P }), 'T', 'nobody has said anything');
  assert.equal(resolveRunnerVariant({ design, profile: P }), 'S', 'the project has');
  const withUnitSay = { params: { runner_variant: 'T' } };
  assert.equal(resolveRunnerVariant({ unit: withUnitSay, design, profile: P }), 'T', 'this cabinet has');
  const withDrawerSay = { params: { runner_variant: 'T', runner_variants: { 2: 'S' } } };
  assert.equal(resolveRunnerVariant({
    drawer: 2, unit: withDrawerSay, design, profile: P,
  }), 'S', 'this drawer has');
  assert.equal(resolveRunnerVariant({
    drawer: 1, unit: withDrawerSay, design, profile: P,
  }), 'T', '…and only this drawer');
  // SU is in the owner's bucket and is deliberately not on the menu.
  assert.equal(migrateDesign({ ...DEFAULT_DESIGN, runners: { variant: 'SU' } }).runners.variant, null);
  assert.equal(resolveRunnerVariant({ unit: { params: { runner_variant: 'SU' } }, profile: P }), 'T');
});

test('F6.4 — the variant is HARDWARE: the geometry does not move', () => {
  const t = computeCabinet({ ...defaultParamsFor('BUDR2', P), unit_num: '01' }, P);
  const s = computeCabinet({ ...defaultParamsFor('BUDR2', P), unit_num: '01', runner_variant: 'S' }, P);
  const shape = (r) => JSON.stringify({ panels: r.panels, drills: r.drills, csv: r.csvLines });
  assert.equal(shape(t), shape(s), 'Blum’s own page: the pattern does not change with the motion tech');
  assert.notEqual(
    t.hardware.find((h) => h.role === 'runner_pairs').spec.variant,
    s.hardware.find((h) => h.role === 'runner_pairs').spec.variant,
    '…and what is BOUGHT does',
  );
});

test('F6.7 — the BOM orders per drawer, per variant', () => {
  // One line while the stack agrees — which is the line this app has written
  // since turn 3 — and two the moment one drawer is fitted differently. A parts
  // list that averaged them would order the wrong runner for one of them.
  const plain = computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: '01' }, P);
  const one = plain.hardware.filter((h) => h.role === 'runner_pairs');
  assert.equal(one.length, 1);
  assert.equal(one[0].qty, 3);

  const mixed = computeCabinet({
    ...defaultParamsFor('BUDR', P), unit_num: '01', runner_variants: { 2: 'S' },
  }, P);
  const rows = mixed.hardware.filter((h) => h.role === 'runner_pairs');
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((r) => [r.spec.variant, r.qty]).sort(), [['S', 1], ['T', 2]]);
  assert.equal(rows.reduce((s, r) => s + r.qty, 0), 3, 'and they still add up to the stack');

  // The PROJECT's own answer reaches the engine the way the hinge standard
  // does — as an input in the design layer, never a formula in the engine.
  const job = computeCabinet({
    ...defaultParamsFor('BUDR', P), unit_num: '01', project_runner_variant: 'S',
  }, P);
  assert.equal(job.hardware.find((h) => h.role === 'runner_pairs').spec.variant, 'S');
  // …and a bare kit call — every golden fixture — takes the workshop's default.
  assert.equal(plain.hardware.find((h) => h.role === 'runner_pairs').spec.variant, 'T');
});

test('F6.4 — the drawer’s own runner is a field in the element editor', () => {
  const r = unit('BUDR');
  const box = r.panels.find((p) => p.role === 'drawer_box');
  assert.ok(elementFields(box).includes('runner-variant'));
  const front = r.panels.find((p) => p.part === 'DRAWER-FRONT');
  assert.ok(elementFields(front).includes('runner-variant'), 'reachable from the front too');

  const id = withUnit('BUDR');
  store().setDrawerRunnerVariant(id, 2, 'S');
  assert.equal(store().units.find((u) => u.id === id).params.runner_variants['2'], 'S');
  store().setDrawerRunnerVariant(id, 2, null);
  assert.equal(store().units.find((u) => u.id === id).params.runner_variants['2'], undefined,
    'given back to the project rather than frozen at today’s answer');
});

test('F6.5 — the synchronisation rod is Blum’s threshold and a parametric length', () => {
  const R = P.hardware.runner.movento.rod;
  assert.equal(R.unitAloneBelow, 314);
  assert.deepEqual(R.narrow, [281, 305]);
  assert.deepEqual(R.withAdapters, [314, 1385]);

  assert.deepEqual(syncRodFor({ openingWidth: 250, boxWidth: 240, profile: P }),
    { fitted: false, kind: 'none', length: null }, 'the unit works alone');
  assert.equal(syncRodFor({ openingWidth: 290, boxWidth: 280, profile: P }).kind, 'narrow');
  assert.equal(syncRodFor({ openingWidth: 600, boxWidth: 554, profile: P }).kind, 'adapters');
  assert.equal(syncRodFor({ openingWidth: 1500, boxWidth: 1450, profile: P }).fitted, false,
    'past the catalogue’s own top there is no rod for it');
  // The length is the BOX less the ends the adapters take up.
  assert.equal(syncRodFor({ openingWidth: 600, boxWidth: 554, profile: P }).length, 554 - R.endAllowance);

  // …and it reaches the BOM and the 3D from the same one place.
  const wide = unit('BUDR2', { width: 600 });
  const narrow = unit('BUDR2', { width: 300 });
  assert.ok(wide.hardware.find((h) => h.role === 'runner_sync_rods').qty > 0);
  assert.equal(narrow.hardware.some((h) => h.role === 'runner_sync_rods'), false);
  assert.equal(hardwareInstances(wide, P).rods.length, wide.derived.drawer_heights.length);
  assert.equal(hardwareInstances(narrow, P).rods.length, 0);
});

test('F6.6 — with no catalogue the app still knows what to order, and says what it cannot', () => {
  clearRunnerCatalogue();
  const spec = runnerPairSpec({ nl: 490, variant: 'T', profile: P });
  assert.equal(spec.system, '760H');
  assert.equal(spec.nl, 490);
  assert.equal(spec.complete, false, 'no bucket, no article — and it says so rather than inventing one');
  assert.deepEqual(spec.articles, { L: null, R: null });
  assert.equal(runnerEntry({ system: '760H', nl: 490, variant: 'T', side: 'L' }), null);

  const r = unit('BUDR2');
  const line = r.hardware.find((h) => h.role === 'runner_pairs');
  assert.equal(line.spec.length_mm, 490, 'the LENGTH is the engine’s and needs nothing downloaded');
  assert.match(line.spec_label, /MOVENTO 760H/);
});

test('F6.7/F6.8 — the manifest IS the catalogue, and the BOM orders by article', () => {
  const parsed = setRunnerCatalogue({
    files: [
      { file: 'movento-760h-490-T-L.glb', system: '760H', nl: 490, variant: 'T', article: '760H4900T-L' },
      { file: 'movento-760h-490-T-R.glb', system: '760H', nl: 490, variant: 'T', article: '760H4900T-R' },
      { file: 'movento-760h-490-S-L.glb', system: '760H', nl: 490, variant: 'S', side: 'L', article: '760H4900S-L' },
      { file: 'movento-760h-490-SU-L.glb', system: '760H', nl: 490, variant: 'SU', side: 'L', article: 'x' },
      { file: 'broken.glb', system: '', nl: 0, variant: '', article: null },
    ],
  });
  assert.equal(parsed.files.length, 4, 'half an entry in a parts list is how a workshop orders wrong');
  // The side is read off the row where it is given and off the FILE NAME where
  // it is not — neither is guessed.
  assert.equal(runnerEntry({
    system: '760H', nl: 490, variant: 'T', side: 'R',
  }).article, '760H4900T-R');

  const spec = runnerPairSpec({ nl: 490, variant: 'T', profile: P });
  assert.equal(spec.complete, true);
  assert.deepEqual(spec.articles, { L: '760H4900T-L', R: '760H4900T-R' });

  const r = unit('BUDR2');
  const line = r.hardware.find((h) => h.role === 'runner_pairs');
  assert.match(line.spec_label, /760H4900T-L \/ 760H4900T-R/);
  assert.equal(line.spec.articles.L, '760H4900T-L');

  // …and the model url is the folder the manifest itself was read from, with
  // the row's BASENAME on the end (turn 20, CLAUDE.md F2.1/F2.3 — this line
  // used to assert `…/hardware/hardware/runners/…`, which is the 400 the owner
  // was looking at, written down as an expectation).
  const url = runnerModelUrl(runnerEntry({
    system: '760H', nl: 490, variant: 'T', side: 'L',
  }), P, 'https://x.supabase.co/storage/v1/object/public');
  assert.equal(url, 'https://x.supabase.co/storage/v1/object/public/hardware/runners/blum/movento/movento-760h-490-T-L.glb');

  clearRunnerCatalogue();
});

test('F6 — a malformed manifest is no catalogue at all, and nothing throws', () => {
  assert.equal(parseRunnerManifest(null), null);
  assert.equal(parseRunnerManifest({ nothing: true }), null);
  assert.deepEqual(parseRunnerManifest([]), { files: [] });
  clearRunnerCatalogue();
});

test('F6.2 — the LISP owns the positions: a runner row is the row the CNC drills', () => {
  const r = unit('BUDR2');
  const rows = r.drillSummary.runner_rows_carcass_y;
  const runners = hardwareInstances(r, P).runners;
  assert.equal(runners.length, rows.length * 2, 'a PAIR per row');
  for (const [i, y] of rows.entries()) {
    const pair = runners.filter((x) => x.drawer === i + 1);
    assert.equal(pair.length, 2);
    for (const x of pair) assert.equal(x.y, y, 'the model is a costume on the screws');
  }
  // The measured offset lives in ONE place, and it is a profile number.
  assert.deepEqual(Object.keys(P.hardware.runner.movento.modelOrigin).sort(), ['x', 'y', 'z']);
});

test('F6 — the oven base is a drawer unit too, and it gets the whole pipeline', () => {
  const r = unit('OVEN_BASE');
  assert.equal(getUnitType('OVEN_BASE').drawerStyle, 'budr');
  assert.equal(r.hardware.find((h) => h.role === 'runner_pairs').qty, 1);
  assert.equal(hardwareInstances(r, P).runners.length, 2);
});
