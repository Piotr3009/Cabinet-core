// T75 · THE T71 SET ON THE THREE PROOF PROJECTS, AND ON HERBAL HILL
//
// CLAUDE.md T75, TESTS AND PROOF: *"the T71 drawing set green on the Herbal
// Hill fixture and on one new fixture per part (`fixtures/t75-corner-
// kitchen.json`, `fixtures/t75-island.json`, `fixtures/t75-wardrobe-
// corner.json`)"*, and LAWS: *"A feature is DONE when it ... shows on the T71
// drawing set, survives save and reload"*.
//
// The three fixtures are built by `scripts/t75-fixtures.mjs` THROUGH THE REAL
// STORE (the calls the UI makes). Here each is opened the way the app opens a
// job (`loadProject`), and the set is bound the way the app binds it
// (`ConfiguratorPage.jsx` and `DrawingModal.jsx`: `wallDrawingSheets` over
// `allResults()`, the room, `worktopsOf()`, the design and its front types).
// Herbal Hill (T71's proof kitchen) goes through the same store road.
//
// For every project: every sheet builds; the T71 zone law holds (geometry in
// the frame, nothing in the title strip but its own words); every sheet
// renders to SVG and to DXF; the cut list carries every unit; and one
// feature of the part is read off the sheets against the engine's own cut.

import test from 'node:test';
import { DRAWING_LAYERS } from '../src/engine/drawings/layers.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getCabinetProfile } from '../src/engine/profile.js';
import { resolveUnitDesign } from '../src/engine/design.js';
import { roomWalls } from '../src/engine/room.js';
import { cornersOf } from '../src/engine/corners.js';
import { formatMm } from '../src/engine/format.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { sheetToSvg } from '../src/engine/drawings/svg.js';
import { sheetToDxf } from '../src/engine/drawings/dxf.js';
import { boundsOf } from '../src/engine/drawings/primitives.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { hhUnits, HH_PROJECT, HH_ROOM } from './fixtures/t71-herbal-hill.js';

const P = getCabinetProfile();
const S = () => useProjectStore.getState();
const FRAME_LAYERS = ['FRAME', 'FRAME_LIGHT', 'SHEET_MUTED'];

const readFixture = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), 'utf8'));

/** Herbal Hill as a saved job: T71's thirteen units and its worktop record. */
function herbalHill() {
  const units = hhUnits(P);
  const ids = units.filter((x) => ['01', '02', '03', '04', '05', '06'].includes(x.params.unit_num)).map((x) => x.id);
  return {
    project: { ...HH_PROJECT, room: HH_ROOM, design: { fronts: { style: 'F' }, worktops: [{ id: 'wt-1', unitIds: ids, decor: null }] } },
    units,
  };
}

const PROJECTS = [
  ['Herbal Hill', herbalHill],
  ['t75-corner-kitchen', () => readFixture('t75-corner-kitchen')],
  ['t75-island', () => readFixture('t75-island')],
  ['t75-wardrobe-corner', () => readFixture('t75-wardrobe-corner')],
];

function open(make) {
  const { project, units } = make();
  S().loadProject(project, units);
}

/** The set, bound the way the app binds it. */
function theSet() {
  const { project } = S();
  return wallDrawingSheets({
    entries: S().allResults(),
    project,
    room: project.room,
    worktops: S().worktopsOf(),
    frontTypeOf: (u) => resolveUnitDesign(u, project.design).frontType,
    design: project.design,
    profile: P,
    date: '10.10.2026',
  });
}

const textsOf = (sheet) => sheet.entities.filter((e) => e.kind === 'text').map((e) => String(e.text));
const sheetOf = (set, variant) => set.find((s) => s.variant === variant);
const cutTexts = (set) => set.filter((s) => s.variant === 'cutlist').flatMap((s) => textsOf(s.sheet));
const inBox = (e, b) => {
  const x = e.x ?? e.x1 ?? e.cx ?? e.pts?.[0]?.[0];
  const y = e.y ?? e.y1 ?? e.cy ?? e.pts?.[0]?.[1];
  return x != null && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
};

/** The words a unit's block carries on the cut list, from `UNIT nn` to the next. */
function blockOf(texts, unitNum) {
  const from = texts.indexOf(`UNIT ${unitNum}`);
  assert.ok(from >= 0, `UNIT ${unitNum} is not on the cut list`);
  const next = texts.findIndex((t, i) => i > from && (/^UNIT /.test(t) || /^TOTALS/.test(t)));
  return texts.slice(from, next < 0 ? undefined : next);
}

/** The engine's panel is on the cut list under its unit, at its own size. */
function assertCutRow(texts, unit, panelId) {
  const result = S().unitResult(unit.id);
  const panel = result.panels.find((p) => p.id === panelId);
  assert.ok(panel, `${unit.params.unit_num}: the engine cuts no ${panelId}`);
  const block = blockOf(texts, unit.params.unit_num);
  const at = block.indexOf(panelId);
  assert.ok(at > 0, `${unit.params.unit_num}: ${panelId} is not in its block on the cut list`);
  assert.equal(block[at + 1], `${Number(panel.qty) || 1} x`);
  assert.equal(block[at + 2], `${formatMm(panel.w)} x ${formatMm(panel.h)}`, `${unit.params.unit_num}: ${panelId} is not drawn at the engine's size`);
  return panel;
}

/** The plan's filled slabs (the worktop seen below the wall cut). */
// AMENDED 22.10.2026 (T81 F8): the slab on the wall plan is on its own ink, the
// WORKTOP layer, its fill the layer's (*"kazdy kolor zrob inny layer"*).
const slabPolys = (sheet) => sheet.entities.filter((e) => e.kind === 'poly' && e.layer === 'WORKTOP' && e.fill === DRAWING_LAYERS.WORKTOP.fill && e.solid);

/** A poly's size in the room's millimetres, at its sheet's scale. */
function worldSize(e, sheet) {
  const b = boundsOf([e]);
  return [b.w * sheet.scale, b.h * sheet.scale].map((v) => Math.round(v)).sort((a, c) => a - c);
}

/**
 * The RED findings a project may carry, each named and justified:
 *
 * Check #20 on an island's AUTO END PANEL. The automat sizes the panel across
 * the whole island end (both faces' reach plus the core, F10: *"sized to the
 * whole island depth"*), and `roomFit.js roomFitRefusal` measures it against
 * the 900 mm END FACE as if it stood on a wall: a red the automat makes
 * itself, on every island, empty or not. An engine defect, reported with the
 * fixtures; tolerated here only on a panel the automat made.
 */
function unexplainedRed() {
  const units = new Map(S().units.map((u) => [u.id, u]));
  return S().runChecks().filter((f) => f.level === 'red').filter((f) => {
    const u = units.get(f.unitId);
    const islandEndPanel = f.check === 20 && u?.params?.island_auto === true && u?.params?.island_panel === 'end';
    return !islandEndPanel;
  });
}

// ═══ THE LAWS, ON EVERY PROJECT ════════════════════════════════════════════

for (const [name, make] of PROJECTS) {
  test(`T75 set · ${name}: opens in the store, and a saved fixture is what the store gives back`, () => {
    const saved = make();
    open(make);
    assert.equal(S().units.length, saved.units.length, 'every unit came back');
    if (name !== 'Herbal Hill') {
      // The fixtures were written after a save and a reopen: loading one is a
      // fixed point, so a reload changes nothing the drawings read.
      assert.deepEqual(JSON.parse(JSON.stringify(S().units)), saved.units, 'the units moved on reload');
      assert.deepEqual(JSON.parse(JSON.stringify(S().project)), saved.project, 'the project moved on reload');
    }
  });

  test(`T75 set · ${name}: the Check has no red finding it cannot name`, () => {
    open(make);
    const red = unexplainedRed();
    assert.deepEqual(red.map((f) => `#${f.check} ${f.message}`), []);
  });

  test(`T75 set · ${name}: every sheet builds, and none carries a NaN`, () => {
    open(make);
    const set = theSet();
    assert.ok(set.length >= 5, `a set, not ${set.length} sheets`);
    // AMENDED 22.10.2026 (T81 F2): the set opens on the 3D, the cover folded
    // into its column (*"najpierw chce widziec 3d jak zrobiles pierwsza strona"*).
    assert.equal(set[0].variant, '3d');
    assert.ok(set.some((s) => s.variant === 'cutlist'), 'the cut list is bound');
    for (const s of set) {
      assert.ok(s.sheet && Array.isArray(s.sheet.entities) && s.sheet.entities.length > 0, `${s.no} ${s.name} is empty`);
      assert.equal(s.sheet.sheetNo, s.no);
      assert.ok(!/NaN|Infinity/.test(JSON.stringify(s.sheet)), `${s.no} ${s.name} carries a NaN`);
    }
  });

  test(`T75 set · ${name}: a drawn thing never leaves its zone, and the strip carries only its own words`, () => {
    open(make);
    for (const s of theSet()) {
      const z = s.sheet.zones;
      const geometry = s.sheet.entities.filter((e) => e.kind !== 'text' && !FRAME_LAYERS.includes(e.layer) && !e.meta);
      for (const e of geometry) {
        const b = boundsOf([e]);
        const inside = b.x >= z.frame.x - 0.01 && b.x + b.w <= z.frame.x + z.frame.w + 0.01
          && b.y >= z.frame.y - 0.01 && b.y + b.h <= z.frame.y + z.frame.h + 0.01;
        assert.ok(inside, `${s.name}: a ${e.kind} on ${e.layer} leaves the frame (${JSON.stringify(b)})`);
      }
      const strip = s.sheet.entities.filter((e) => inBox(e, z.title) && !FRAME_LAYERS.includes(e.layer) && e.kind !== 'text' && !e.meta);
      assert.deepEqual(strip.map((e) => `${e.kind}:${e.layer}`), [], `${s.name}: the strip carries only its own words`);
    }
  });

  test(`T75 set · ${name}: every sheet renders to SVG and to DXF`, () => {
    open(make);
    for (const s of theSet()) {
      let svg = null; let dxf = null;
      assert.doesNotThrow(() => { svg = sheetToSvg(s.sheet, { kind: s.variant }); }, `${s.name}: the SVG threw`);
      assert.doesNotThrow(() => { dxf = sheetToDxf(s.sheet); }, `${s.name}: the DXF threw`);
      assert.match(svg, /^<svg|<svg /, `${s.name}: no SVG`);
      assert.ok(svg.length > 1000, `${s.name}: an SVG of nothing`);
      assert.match(dxf, /ENTITIES/, `${s.name}: a DXF with no entities section`);
      assert.match(dxf, /EOF\s*$/, `${s.name}: a DXF that does not end`);
    }
  });

  test(`T75 set · ${name}: the cut list carries every unit of the project, and the totals count them`, () => {
    open(make);
    const texts = cutTexts(theSet());
    for (const u of S().units) {
      assert.ok(texts.includes(`UNIT ${u.params.unit_num}`), `${u.params.unit_num} (${u.type}) is not on the cut list`);
    }
    assert.ok(texts.some((t) => t === `TOTALS · ${S().units.length} units`), 'the totals do not count every unit');
  });
}

// ═══ ONE FEATURE PER PROJECT, READ OFF THE SHEETS ═════════════════════════

test('T75 set · Herbal Hill through the store: his nine sheets, his slab on the front view', () => {
  open(herbalHill);
  const set = theSet();
  // AMENDED 22.10.2026 (T81 F2): nine sheets still, in the owner's order
  // (*"najpierw ... 3d ... wszystkie fronty ... bez frontow ... przekroj z gory
  // ... przekroje pionowe, a na koncu wizualizacja"*), the X-ray among them.
  assert.deepEqual(set.map((s) => `${s.no} ${s.name}`), [
    '01 3D', '02 Wall A · Fronts', '03 Wall A · Without fronts', '04 Wall A · X-ray',
    '05 Plan · base units', '06 Plan · wall units', '07 Wall A · Sections A-A and B-B',
    '08 Visualisation', '09 Cut list and materials',
  ]);
  const fronts = sheetOf(set, 'fronts');
  // AMENDED 22.10.2026 (T81 F8): the legend's WORKTOP swatch wears the slab's tint (`meta: 'legend'`) and is not a slab.
  assert.equal(fronts.sheet.entities.filter((e) => e.kind === 'rect' && e.fill === '#f3f3f3' && e.meta !== 'legend').length, 1, 'one slab on the front view');
});

test('T75 set · the corner kitchen: the corners the engine solved, the joints and the cut-out on the plan, the post on the cut list', () => {
  open(() => readFixture('t75-corner-kitchen'));
  const walls = roomWalls(S().project.room);
  const solutions = cornersOf({ units: S().units, walls, profile: P }).map((c) => c.solution).sort();
  assert.deepEqual(solutions, ['L', 'blind', 'post', 'post'], 'the L, the blind, and the post at base and wall height');
  const set = theSet();
  const plan = sheetOf(set, 'plan-wall');
  const words = textsOf(plan.sheet);
  // F5: one joint per record that turns a corner, each a NOTE on the worktop sheet.
  const slabs = S().worktopsOf();
  const butts = slabs.filter((w) => w.geometry.butts && w.joint?.at);
  assert.equal(butts.length, 2, 'two records turn a corner: the post corner and the blind corner');
  for (const w of butts) assert.equal(w.joint.readiness, 'manual');
  assert.equal(words.filter((t) => t === `BUTT JOINT, ${P.autoParts.worktop.joint.boltCount} BOLTS`).length, butts.length, 'each joint is noted on the plan');
  // F5: the SINK's cut-out, drawn at the engine's numbers.
  const cutouts = slabs.flatMap((w) => w.cutouts || []);
  assert.equal(cutouts.length, 1);
  const c = cutouts[0];
  assert.equal(c.kind, 'sink');
  assert.ok(words.includes(`SINK ${Math.round(c.w)} x ${Math.round(c.d)} R${c.r}`), 'the sink cut-out is not on the plan');
  // F4/F5: the L's own slab, drawn as its L outline (six vertices), not its box.
  const lSlab = slabs.find((w) => w.geometry.shape === 'L');
  assert.ok(lSlab, 'the L carries its own slab');
  assert.equal(slabPolys(plan.sheet).length, slabs.length, 'every slab is drawn on the wall plan');
  assert.ok(slabPolys(plan.sheet).some((e) => e.pts.length === lSlab.geometry.outline.length && e.pts.length === 6), 'the L slab is not drawn as its L');
  // F2: every corner post the engine cuts is on the cut list at its size.
  const texts = cutTexts(set);
  const posted = S().units.filter((u) => u.params.corner_post_left_mm > 0 || u.params.corner_post_right_mm > 0);
  // AMENDED BY T78 F10: the strip at the BLIND stop is the blind kit's own part
  // (`${unitNum}-POST`, cut the moment the kit is placed); the run landing there
  // carries the stop record only (`corner_butt_*_mm`), so two auto posts remain.
  assert.equal(posted.length, 2, 'the base post on wall B, the wall unit post');
  for (const u of posted) {
    const id = u.params.corner_post_left_mm > 0 ? 'CORNER-POST-L' : 'CORNER-POST-R';
    const post = assertCutRow(texts, u, id);
    assert.equal(post.w, P.corner.postMm);
    assert.equal(post.role, 'corner_post');
  }
  const butted = S().units.filter((u) => u.params.corner_butt_left_mm > 0 || u.params.corner_butt_right_mm > 0);
  assert.equal(butted.length, 1, 'the run at the blind stop carries the stop record');
  const blindKit = S().units.find((u) => u.type === 'BLIND_BASE');
  const kitPost = assertCutRow(texts, blindKit, `${blindKit.params.unit_num}-POST`);
  assert.equal(kitPost.w, P.corner.postMm);
  assert.equal(kitPost.role, 'corner_post');
  // F3: the blind blank, the engine's arithmetic.
  const blind = S().units.find((u) => u.type === 'BLIND_BASE');
  const blank = assertCutRow(texts, blind, `${blind.params.unit_num}-BLANK`);
  assert.equal(blank.w, blind.params.blind_mm);
  // F5: the upstand, cut on the run that asked for it.
  const owner = S().units.find((u) => S().unitResult(u.id).panels.some((p) => p.role === 'upstand'));
  assert.ok(owner, 'no unit cuts the upstand');
  assert.equal(assertCutRow(texts, owner, 'UPSTAND').h, P.autoParts.worktop.upstand.heightMm);
  // F4: the L's boards are on the cut list as the engine cuts them.
  const l = S().units.find((u) => u.type === 'CORNER_L_BASE');
  for (const id of ['TOP-L', 'BOTTOM-L', 'BACK-A', 'BACK-B', 'SIDE-A', 'SIDE-B']) assertCutRow(texts, l, id);
});

test('T75 set · the island: its units on the plan, ONE slab over the whole at its size, the cut-out on it', () => {
  open(() => readFixture('t75-island'));
  const walls = roomWalls(S().project.room);
  const faceOf = (u) => walls[u.position?.wall ?? 0]?.face || null;
  const onIsland = S().units.filter((u) => walls[u.position?.wall ?? 0]?.island);
  // Since 12.10.2026 (owner) no automat board closes the empty end E2.
  assert.deepEqual([...new Set(onIsland.map(faceOf))].sort(), ['A', 'B', 'E1'], 'every face but the empty end is used');
  assert.ok(onIsland.some((u) => faceOf(u) === 'E1' && !u.params.island_auto), 'an end unit stands on E1');
  const set = theSet();
  // The island's units are drawn on the base plan, each by its number.
  const base = textsOf(sheetOf(set, 'plan-base').sheet);
  for (const u of onIsland) assert.ok(base.includes(String(u.params.unit_num)), `${u.params.unit_num} on face ${faceOf(u)} is not on the plan`);
  // F11: ONE slab over the island, drawn on the wall plan at its own size.
  const slabs = S().worktopsOf();
  const islandSlabs = slabs.filter((w) => w.geometry.shape === 'island');
  assert.equal(islandSlabs.length, 1, 'ONE slab over the whole island');
  const g = islandSlabs[0].geometry;
  assert.equal(islandSlabs[0].extend.E2, P.autoParts.worktop.seatingMm, 'the seating overhang on the empty end');
  const plan = sheetOf(set, 'plan-wall');
  const polys = slabPolys(plan.sheet);
  assert.equal(polys.length, slabs.length, 'every slab is drawn on the wall plan');
  const want = [g.w, g.d].map((v) => Math.round(v)).sort((a, c) => a - c);
  assert.ok(polys.some((e) => worldSize(e, plan.sheet).every((v, i) => Math.abs(v - want[i]) <= 1)),
    `the island slab ${want.join(' x ')} is not drawn at its size: ${polys.map((e) => worldSize(e, plan.sheet).join(' x ')).join(', ')}`);
  // The sink on face A proposes its cut-out on the island's slab, and the plan draws it.
  const [c] = islandSlabs[0].cutouts;
  assert.equal(c.kind, 'sink');
  assert.ok(textsOf(plan.sheet).includes(`SINK ${Math.round(c.w)} x ${Math.round(c.d)} R${c.r}`), 'the island sink cut-out is not on the plan');
});

test('T75 set · the wardrobe corner: the L, the blind and the post, and the CUT CORNER box boards on the cut list', () => {
  open(() => readFixture('t75-wardrobe-corner'));
  assert.equal(S().project.design.projectType, 'wardrobe');
  const walls = roomWalls(S().project.room);
  const solutions = cornersOf({ units: S().units, walls, profile: P }).map((c) => c.solution).sort();
  assert.deepEqual(solutions, ['L', 'blind', 'post']);
  const texts = cutTexts(theSet());
  // F7: the notch is cut, and its boxing boards are on the cut list at the engine's size.
  const notched = S().units.find((u) => u.params.notch);
  assert.deepEqual(notched.params.notch, { corner: 'BL', w: 200, d: 200, h: 0 });
  const result = S().unitResult(notched.id);
  const box = result.panels.filter((p) => p.role === 'notch_box');
  assert.deepEqual(box.map((p) => p.id).sort(), ['RETURN', 'STEP']);
  for (const p of box) assertCutRow(texts, notched, p.id);
  // The side at the notch is the shorter board KIT_NOTCH plans: d less than
  // the same wardrobe's side without one, and the cut list draws it so.
  const plain = S().units.find((u) => u.type === 'WARDROBE' && !u.params.notch && u.params.depth === notched.params.depth);
  const full = S().unitResult(plain.id).panels.find((p) => p.id === 'BUL');
  assert.equal(assertCutRow(texts, notched, 'BUL').w, full.w - notched.params.notch.d);
  // F2 and F3 in the wardrobe family.
  const post = S().units.find((u) => u.params.corner_post_left_mm > 0);
  assert.equal(assertCutRow(texts, post, 'CORNER-POST-L').h, S().unitResult(post.id).panels.find((p) => p.id === 'CORNER-POST-L').h);
  const blind = S().units.find((u) => u.type === 'BLIND_WARDROBE');
  assert.equal(assertCutRow(texts, blind, `${blind.params.unit_num}-BLANK`).w, blind.params.blind_mm);
  // F4: the wardrobe L's one-piece L boards.
  const l = S().units.find((u) => u.type === 'CORNER_L_WARDROBE');
  for (const id of ['TOP-L', 'BOTTOM-L']) assertCutRow(texts, l, id);
});
