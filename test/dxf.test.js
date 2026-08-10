// ─── DXF generator tests ───
//
// The generator writes DXF; this file READS IT BACK with the parser that ships
// next to the writer and checks the result against the engine. Nothing is
// compared to a hand-written expected string: the engine is the reference, so
// any drift between engine geometry and emitted geometry fails here rather
// than in front of the spindle.
//
// Case under test: W-A from fixtures/golden-wardrobe.json — the wardrobe with
// puzzle joints, drawers, a rail, shelves, a door and every layer in play.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE } from '../src/engine/profile.js';
import { CNC_LAYERS, cncLayer, layerTableFor } from '../src/engine/cnc/layers.js';
import {
  buildUnitDxfFiles, dxfFileName, panelDxf, panelLabel, parseDxf, writeDxf,
} from '../src/engine/cnc/dxf.js';


const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', 'fixtures');
const WARDROBE = JSON.parse(readFileSync(join(FIXTURES, 'golden-wardrobe.json'), 'utf8'));
const PROFILE = DEFAULT_CABINET_PROFILE;

const WA = WARDROBE.cases.find((c) => c.id === 'W-A');
const paramsOf = (inputs) => ({
  type: inputs.type, width: inputs.width, height: inputs.height, depth: inputs.depth,
  board_t: inputs.board_t, front_t: inputs.front_t, front_type: inputs.front_type,
  shelves: inputs.shelves, drawers: inputs.drawers, rail: inputs.rail,
  rail_offset: inputs.rail_offset, hinge: inputs.hinge, unit_num: inputs.unit_num,
});

const RESULT = computeCabinet(paramsOf(WA.inputs), PROFILE);
const FILES = buildUnitDxfFiles(RESULT, PROFILE);
const fileFor = (panelId) => FILES.find((f) => f.panelId === panelId);
const near = (a, b) => Math.abs(a - b) <= 1e-6;

// ─── (a) DXF section structure ───

test('DXF structure: HEADER / TABLES / ENTITIES, balanced sections, EOF', () => {
  assert.ok(FILES.length > 0, 'W-A produced no DXF files at all');

  for (const f of FILES) {
    const text = f.dxf;
    assert.ok(text.startsWith('0\r\nSECTION\r\n'), `${f.name} must open with a SECTION`);
    assert.ok(text.endsWith('0\r\nEOF\r\n'), `${f.name} must end with EOF`);
    assert.ok(!/\n(?!\r)/.test(text.replace(/\r\n/g, '')), `${f.name} must use CRLF only`);

    const opens = (text.match(/\r\nSECTION\r\n/g) || []).length;
    const closes = (text.match(/\r\nENDSEC\r\n/g) || []).length;
    assert.equal(opens, closes, `${f.name} SECTION/ENDSEC unbalanced (${opens}/${closes})`);

    const { sections } = parseDxf(text);
    assert.deepEqual(sections, ['HEADER', 'TABLES', 'ENTITIES'], `${f.name} sections`);

    assert.ok(text.includes('$ACADVER\r\n1\r\nAC1009'), `${f.name} must declare the R12 dialect`);
    assert.ok(!/NaN|Infinity|e[+-]\d/i.test(text), `${f.name} contains a non-finite or exponent number`);
  }
});

test('every layer an entity uses is declared in the layer table', () => {
  for (const f of FILES) {
    const { entities, layerTable } = parseDxf(f.dxf);
    const declared = new Set(layerTable.map((l) => l.name));
    assert.ok(declared.has('0'), `${f.name} must declare layer 0`);
    for (const e of entities) {
      assert.ok(declared.has(e.layer), `${f.name} uses undeclared layer ${e.layer}`);
    }
    // …and with the colour the AutoLISP gives it, because VCarve's tool mapping
    // is read off the layer, not off the geometry.
    for (const row of layerTable) {
      if (row.name === '0') continue;
      assert.equal(row.color, cncLayer(row.name).aci, `${f.name} layer ${row.name} colour`);
    }
  }
});

// ─── (b) one CIRCLE per drilled hole, on the right layer ───

test('CIRCLE count per layer per part == the engine drill list', () => {
  let totalCircles = 0;

  for (const f of FILES) {
    const { entities } = parseDxf(f.dxf);
    const circles = entities.filter((e) => e.type === 'circle');
    totalCircles += circles.length;

    const expected = new Map();
    for (const d of RESULT.drills) {
      if (d.panel !== f.panelId) continue;
      expected.set(d.layer, (expected.get(d.layer) || 0) + 1);
    }
    const actual = new Map();
    for (const c of circles) actual.set(c.layer, (actual.get(c.layer) || 0) + 1);

    for (const [layer, n] of expected) {
      assert.equal(actual.get(layer) ?? 0, n, `${f.name}: ${layer} circles`);
    }
    for (const [layer, n] of actual) {
      assert.ok(expected.has(layer), `${f.name}: ${n}× ${layer} circle the engine never drilled`);
    }

    // Diameters have to survive the trip: DXF stores a radius.
    for (const d of RESULT.drills.filter((x) => x.panel === f.panelId)) {
      assert.ok(
        circles.some((c) => c.layer === d.layer && near(c.cx, d.x) && near(c.cy, d.y) && near(c.r, d.d / 2)),
        `${f.name}: no CIRCLE at ${d.x},${d.y} ⌀${d.d} on ${d.layer}`,
      );
    }
  }

  // Nothing is silently dropped project-wide either. Fronts carry cups, so the
  // only drills without a DXF are those on parts with no outline at all.
  const drillable = new Set(FILES.map((f) => f.panelId));
  const expectedTotal = RESULT.drills.filter((d) => drillable.has(d.panel)).length;
  assert.equal(totalCircles, expectedTotal, 'total circles across the unit');
  assert.equal(RESULT.drills.filter((d) => !drillable.has(d.panel)).length, 0,
    'every drilled part must get a DXF');
});

test('puzzle holes are not emitted twice (drills[] already contains cnc.holes)', () => {
  const bul = fileFor('BUL');
  const { entities } = parseDxf(bul.dxf);
  const puzzleCircles = entities.filter((e) => e.type === 'circle' && e.layer === 'PUZZLE_HOLES_7_5MM');
  const enginePuzzle = RESULT.drills.filter((d) => d.panel === 'BUL' && d.layer === 'PUZZLE_HOLES_7_5MM');
  assert.ok(enginePuzzle.length > 0, 'BUL must have puzzle holes to make this test meaningful');
  assert.equal(puzzleCircles.length, enginePuzzle.length);
});

// ─── (c) one closed polyline per pocket ───

test('pocket polyline count == engine pocket count, per layer', () => {
  for (const f of FILES) {
    const panel = RESULT.panels.find((p) => p.id === f.panelId);
    const { entities } = parseDxf(f.dxf);
    const polys = entities.filter((e) => e.type === 'poly');
    const pockets = panel.cnc.pockets || [];

    assert.equal(polys.length, pockets.length + 1,
      `${f.name}: ${polys.length} polylines for ${pockets.length} pockets + 1 outline`);

    const expected = new Map();
    for (const p of pockets) expected.set(p.layer, (expected.get(p.layer) || 0) + 1);
    for (const [layer, n] of expected) {
      assert.equal(polys.filter((p) => p.layer === layer).length, n, `${f.name}: ${layer} pockets`);
    }

    // Each pocket is the engine rectangle, corner for corner.
    for (const p of pockets) {
      const match = polys.find((poly) => poly.layer === p.layer && poly.pts.length === 4
        && near(Math.min(...poly.pts.map((q) => q[0])), Math.min(p.x1, p.x2))
        && near(Math.max(...poly.pts.map((q) => q[0])), Math.max(p.x1, p.x2))
        && near(Math.min(...poly.pts.map((q) => q[1])), Math.min(p.y1, p.y2))
        && near(Math.max(...poly.pts.map((q) => q[1])), Math.max(p.y1, p.y2)));
      assert.ok(match, `${f.name}: no pocket polyline for ${p.layer} ${p.x1},${p.y1}→${p.x2},${p.y2}`);
      assert.ok(match.closed, `${f.name}: pocket on ${p.layer} must be a CLOSED polyline`);
    }
  }
});

// ─── (d) the outline is closed and is the engine outline, point for point ───

test('outline is a closed polyline carrying the engine points unchanged', () => {
  for (const f of FILES) {
    const panel = RESULT.panels.find((p) => p.id === f.panelId);
    const { entities } = parseDxf(f.dxf);
    const outlineLayer = panel.cnc.layer || PROFILE.puzzle.layers.outline;
    const outlines = entities.filter((e) => e.type === 'poly' && e.layer === outlineLayer
      && e.pts.length === panel.cnc.outline.length);

    assert.equal(outlines.length >= 1, true, `${f.name}: no outline polyline on ${outlineLayer}`);
    const outline = outlines[0];
    assert.ok(outline.closed, `${f.name}: outline must be CLOSED (group 70 = 1)`);
    assert.equal(outline.pts.length, panel.cnc.outline.length, `${f.name}: outline vertex count`);
    panel.cnc.outline.forEach(([x, y], i) => {
      assert.ok(near(outline.pts[i][0], x) && near(outline.pts[i][1], y),
        `${f.name}: outline point ${i} is ${outline.pts[i]} not ${[x, y]}`);
    });
  }
});

test('puzzle side panels really do carry tabs, fronts stay rectangles', () => {
  const { entities: bul } = parseDxf(fileFor('BUL').dxf);
  const bulOutline = bul.find((e) => e.type === 'poly' && e.layer === 'OUTLINE');
  assert.ok(bulOutline.pts.length > 4, 'BUL outline must carry tab points');

  const front = RESULT.panels.find((p) => p.part === 'FRONT');
  const { entities: fr } = parseDxf(fileFor(front.id).dxf);
  const frOutline = fr.find((e) => e.type === 'poly' && e.layer === 'OUTLINE');
  assert.equal(frOutline.pts.length, 4, 'a door front is a plain rectangle');
  assert.ok(fr.some((e) => e.type === 'circle' && e.layer === 'FRONT_HINGES_35MM'),
    'the door front must carry its hinge cups');
});

// ─── labels, names, coverage ───

test('every part carries a UNIT_NUMBER label with unit and panel id', () => {
  for (const f of FILES) {
    const { entities } = parseDxf(f.dxf);
    const texts = entities.filter((e) => e.type === 'text');
    // Turn 18 (CLAUDE.md F1.1): ONE label, on up to three lines. A part big
    // enough for the words on one line still gets exactly one TEXT entity.
    const panel = RESULT.panels.find((p) => p.id === f.panelId);
    const label = panelLabel(panel, { unitNum: RESULT.unitNum, profile: PROFILE });
    assert.ok(texts.length >= 1 && texts.length <= PROFILE.cnc.labelMaxLines,
      `${f.name}: ${texts.length} lines of label`);
    assert.equal(texts.length, label.lines.length, `${f.name}: the writer's own line count`);
    for (const t of texts) assert.equal(t.layer, PROFILE.cnc.unitNumberLayer);
    // Turn 17 (CLAUDE.md F1): the cabinet's number, the part code and the cut
    // size — one formatter, shared with the sheet.
    assert.equal(texts.map((t) => t.str).join(' '), label.str);
    assert.match(texts[0].str, new RegExp(`^${RESULT.unitNum}\\b`), `${f.name}: the cabinet's number comes first`);
    assert.ok(texts[0].h >= PROFILE.cnc.labelMinHeight && texts[0].h <= PROFILE.cnc.labelHeight,
      `${f.name}: label height ${texts[0].h} out of range`);
  }
});

test('file names follow {unitNum}-{PANEL_ID}.dxf without repeating the unit', () => {
  assert.equal(dxfFileName('W01', 'BUL'), 'W01-BUL.dxf');
  assert.equal(dxfFileName('W01', 'W01-DF1'), 'W01-DF1.dxf');     // not W01-W01-DF1
  assert.equal(dxfFileName('01', 'SHELF-1'), '01-SHELF-1.dxf');
  assert.equal(dxfFileName('W/1', 'BU L'), 'W_1-BU_L.dxf');       // path-safe

  const names = FILES.map((f) => f.name);
  assert.equal(new Set(names).size, names.length, 'file names must be unique inside the ZIP');
  for (const n of names) assert.match(n, /^[A-Za-z0-9._-]+\.dxf$/);
});

test('one DXF per cut part of the unit — nothing missing, nothing invented', () => {
  const expected = RESULT.panels.filter((p) => p.cnc?.outline?.length >= 2).map((p) => p.id).sort();
  const actual = FILES.map((f) => f.panelId).sort();
  assert.deepEqual(actual, expected);
  // W-A: 5 carcass + 2 shelves + partition + rail partition + DP + 2 fillers
  //      + 2×5 drawer-box parts + 2 drawer fronts + 1 door = 25 parts.
  assert.equal(FILES.length, RESULT.panels.length, 'every panel of W-A has CNC geometry');
});

// ─── the writer itself ───

test('writeDxf emits what it is handed, and the parser reads it back', () => {
  const entities = [
    { type: 'poly', layer: 'OUTLINE', closed: true, pts: [[0, 0], [10, 0], [10, 5], [0, 5]] },
    { type: 'circle', layer: 'SCREWS_3MM', cx: 5, cy: 2.5, r: 1.5 },
    { type: 'text', layer: 'UNIT_NUMBER', x: 5, y: 2.5, h: 6, str: 'X1-TEST' },
  ];
  const round = parseDxf(writeDxf(entities, layerTableFor(entities.map((e) => e.layer)), { min: [0, 0], max: [10, 5] }));
  assert.equal(round.entities.length, 3);
  assert.deepEqual(round.entities[0].pts, [[0, 0], [10, 0], [10, 5], [0, 5]]);
  assert.equal(round.entities[0].closed, true);
  assert.equal(round.entities[1].r, 1.5);
  assert.equal(round.entities[2].str, 'X1-TEST');
  assert.deepEqual(round.layerTable.map((l) => l.name), ['0', 'OUTLINE', 'SCREWS_3MM', 'UNIT_NUMBER']);
});

test('$EXTMIN / $EXTMAX state the true extents, tabs included', () => {
  const bul = RESULT.panels.find((p) => p.id === 'BUL');
  const text = panelDxf(bul, RESULT.drills, { unitNum: RESULT.unitNum, profile: PROFILE });
  const extMax = text.match(/\$EXTMAX\r\n10\r\n([-\d.]+)/);
  assert.ok(extMax, 'header must carry $EXTMAX');
  // BUL tabs run one board thickness past the panel width (560 + 18).
  assert.ok(Number(extMax[1]) >= bul.w + PROFILE.board.thickness - 1e-6,
    `EXTMAX x ${extMax[1]} must include the puzzle tabs (>= ${bul.w + PROFILE.board.thickness})`);
});

test('layer table is a machine contract: names and ACI colours are the LISP ones', () => {
  // createCNCLayers in reference/lisp/SKYLON_COMMON.lsp, plus the per-kit
  // layers: createDrawerCNCLayers in KIT_BUDR_FULL.lsp (L482-488) and the
  // hanger cut-out layer in KIT_WUD_FULL.lsp (L192).
  //
  // ─── TURN 13 (CLAUDE.md F8 / #59): ONE NEW NAME ───
  // BISCUIT_4MM is the first layer in this table that the LISP does not have,
  // and it is deliberate: the owner's partition-fixing pattern is cut with a
  // dedicated 4 mm in-and-out program in VCarve, which is matched BY LAYER NAME
  // exactly as every other tool here is. The name is CLAUDE.md's, letter for
  // letter, and it is as much a machine contract as the rest — ACI 40 because
  // the LISP's own table never uses it, so nothing it already draws changes
  // colour in AutoCAD.
  const expected = {
    OUTLINE: 7, PUZZLE_SOCKET: 1, PUZZLE_DOG_BONES: 2, PUZZLE_HOLES_7_5MM: 3,
    SCREWS_3MM: 4, HINGES_5MM: 5, SHELVES_7_5MM: 6, FRONT_HINGES_35MM: 3,
    FRONT_HINGES_3MM: 30, RUNNERS_3MM: 5, UNIT_NUMBER: 94, CARCASE: 7,
    DRAWER_RUNNER_POCKET: 1, DRAWER_BOTTOM_POCKET: 2, HANGER_HOLE: 4,
    BISCUIT_4MM: 40,
  };
  for (const [name, aci] of Object.entries(expected)) {
    assert.equal(cncLayer(name).aci, aci, `${name} ACI colour`);
  }
  assert.equal(CNC_LAYERS.length, Object.keys(expected).length, 'no undocumented layer in the table');
  // Screen colours must be distinct, or the preview legend is a lie.
  const screens = CNC_LAYERS.filter((l) => l.name !== 'CARCASE').map((l) => l.screen);
  assert.equal(new Set(screens).size, screens.length, 'two layers share a preview colour');
});
