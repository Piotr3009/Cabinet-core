import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import {
  applyPartEdits, dowelPositions, editCount, featureKey, partFeatures, partSignature,
  withPartEdit, withoutLastPartEdit, withoutPartEdits,
} from '../src/engine/partEdits.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultParamsFor, UNIT_TYPE_ORDER } from '../src/engine/types.js';
import { buildUnitDxfFiles, panelDxf, parseDxf } from '../src/engine/cnc/dxf.js';

// ─── TURN 23 · F9 — the pencil on one print ────────────────────────────────
//
// "He does NOT want to touch the engine — he wants to edit ONE part in ONE
// project, and the next wardrobe must come out stock."

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

const stock = (type = 'WARDROBE', extra = {}) => computeCabinet(
  { ...defaultParamsFor(type, P), ...extra },
  P,
);

const panelOf = (result, part) => result.panels.find((p) => p.part === part);

// ─── The engine stays pure and ignorant (F9.2) ─────────────────────────────

test('F9.2 — computeCabinet is never handed the edits, and cannot see them', () => {
  const cabinet = src('engine/cabinet.js');
  assert.doesNotMatch(cabinet, /partEdits|part_edits/, 'the engine does not know this feature exists');
  // …and the override step is applied in ONE place, which every surface reads.
  const store = src('stores/projectStore.js');
  assert.equal((store.match(/applyPartEdits\(/g) || []).length, 2, 'unitResult and allResults, and nowhere else');
});

test('F9.2 — a project with no edits gets the SAME OBJECT back', () => {
  const result = stock();
  assert.equal(applyPartEdits(result, null), result);
  assert.equal(applyPartEdits(result, {}), result);
  assert.equal(applyPartEdits(result, { BACK: { signature: 'x', ops: [] } }), result);
});

// ─── Feature ids are stable across identical recomputes (F9.3) ─────────────

test('F9.3 — the same cabinet computed twice gives the same feature ids', () => {
  const a = stock();
  const b = stock();
  const back = panelOf(a, 'BACK');
  assert.deepEqual(
    partFeatures(back, a.drills).map((f) => f.fid),
    partFeatures(panelOf(b, 'BACK'), b.drills).map((f) => f.fid),
  );
});

test('F9.3 — an id survives a change ELSEWHERE that renumbers the list', () => {
  const before = stock('WARDROBE', { width: 900 });
  const side = panelOf(before, 'BUL');
  const target = partFeatures(side, before.drills).find((f) => f.kind === 'hole');

  // Add two shelves: the side gains rows of pin holes, so an INDEX-based id
  // would now point at a different hole. This is the whole reason ids are
  // derived from what a feature IS.
  const after = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    width: 900,
    sections: [{
      width_mm: 900,
      items: [{ id: 's1', kind: 'shelf', pos_mm: 400 }, { id: 's2', kind: 'shelf', pos_mm: 800 }],
    }],
  }, P);
  const ids = partFeatures(panelOf(after, 'BUL'), after.drills).map((f) => f.fid);
  assert.ok(ids.includes(target.fid), 'the hole the owner pointed at is still that hole');
});

test('F9.3 — two identical features in the same place are told apart, stably', () => {
  const panel = { id: 'X', cnc: {} };
  const drills = [
    { panel: 'X', layer: 'SCREWS_3MM', x: 10, y: 10, d: 3 },
    { panel: 'X', layer: 'SCREWS_3MM', x: 10, y: 10, d: 3 },
  ];
  const ids = partFeatures(panel, drills).map((f) => f.fid);
  assert.equal(new Set(ids).size, 2);
  assert.equal(ids[1], `${ids[0]}#1`);
  assert.deepEqual(partFeatures(panel, drills).map((f) => f.fid), ids, 'and the same twice');
});

test('F9.3 — an id says what it is about, in words a person can read', () => {
  assert.equal(featureKey('hole', 'SCREWS_3MM', [37, 50, 3]), 'hole|SCREWS_3MM|37|50|3');
  assert.equal(featureKey('hole', 'SCREWS_3MM', [-0, 50.000001, 3]), 'hole|SCREWS_3MM|0|50|3');
});

// ─── The four tools (F9.1) ─────────────────────────────────────────────────

test('F9.1 — DELETE takes exactly one feature off the part, and nothing else', () => {
  const result = stock();
  const back = panelOf(result, 'BACK');
  const holes = partFeatures(back, result.drills).filter((f) => f.kind === 'hole');
  const edits = withPartEdit({}, 'BACK', { op: 'hide', feature: holes[0].fid }, partSignature(back));

  const after = applyPartEdits(result, edits);
  assert.equal(after.drills.length, result.drills.length - 1);
  const gone = partFeatures(panelOf(after, 'BACK'), after.drills).map((f) => f.fid);
  assert.ok(!gone.includes(holes[0].fid));
  // Every OTHER part is untouched, by identity.
  for (const panel of result.panels) {
    if (panel.id === 'BACK') continue;
    assert.equal(after.panels.find((p) => p.id === panel.id), panel, `${panel.id} was re-created`);
  }
});

test('F9.1 — DELETE reaches a pocket and a mark as readily as a hole', () => {
  const result = stock();
  const side = panelOf(result, 'BUL');
  const pocket = partFeatures(side, result.drills).find((f) => f.kind === 'pocket');
  assert.ok(pocket, 'a side panel has puzzle sockets');
  const after = applyPartEdits(result, withPartEdit({}, 'BUL', { op: 'hide', feature: pocket.fid }, partSignature(side)));
  assert.equal(
    panelOf(after, 'BUL').cnc.pockets.length,
    side.cnc.pockets.length - 1,
  );
});

test('F9.1 — ADD A DRILL: ⌀, depth, position and an EXISTING layer', () => {
  const result = stock();
  const back = panelOf(result, 'BACK');
  const edits = withPartEdit({}, 'BACK', {
    op: 'drill', layer: 'SCREWS_3MM', x: 123, y: 456, d: 8, depth: 15,
  }, partSignature(back));
  const after = applyPartEdits(result, edits);
  const mine = after.drills.filter((d) => d.kind === 'hand');
  assert.equal(mine.length, 1);
  assert.deepEqual(
    { ...mine[0] },
    {
      panel: 'BACK', kind: 'hand', layer: 'SCREWS_3MM', x: 123, y: 456, d: 8, depth: 15,
    },
  );
});

test('F9.1 — ADD A LINE writes a mark, on the channel the format already has', () => {
  const result = stock();
  const back = panelOf(result, 'BACK');
  const after = applyPartEdits(result, withPartEdit({}, 'BACK', {
    op: 'line', layer: 'BISCUIT_4MM', from: [10, 20], to: [110, 20],
  }, partSignature(back)));
  const marks = panelOf(after, 'BACK').cnc.marks;
  assert.equal(marks.length, 1);
  assert.deepEqual(marks[0], { layer: 'BISCUIT_4MM', from: [10, 20], to: [110, 20] });
});

test('F9.1 — ADD A DOWEL LINE: start, end, pitch — ends always drilled, gaps even', () => {
  assert.deepEqual(
    dowelPositions({ from: [0, 0], to: [96, 0], pitch: 32 }).map((p) => p.x),
    [0, 32, 64, 96],
  );
  // A pitch that does not divide evenly is EVENED OUT, never left with a short
  // last gap — the same rule F6's back screws follow.
  const run = dowelPositions({ from: [0, 0], to: [100, 0], pitch: 32 });
  assert.equal(run.length, 5);
  assert.equal(run[0].x, 0);
  assert.equal(run[run.length - 1].x, 100);
  for (let i = 1; i < run.length; i += 1) assert.ok(run[i].x - run[i - 1].x <= 32 + 1e-9);
  // Degenerate cases are answers, not throws.
  assert.deepEqual(dowelPositions({ from: [5, 5], to: [5, 5], pitch: 32 }), [{ x: 5, y: 5 }]);
  assert.deepEqual(dowelPositions({ from: null, to: [5, 5], pitch: 32 }), []);
});

test('F9.1 — a dowel line becomes real holes on the part', () => {
  const result = stock();
  const back = panelOf(result, 'BACK');
  const after = applyPartEdits(result, withPartEdit({}, 'BACK', {
    op: 'dowels', layer: 'SHELVES_7_5MM', from: [50, 100], to: [50, 292], pitch: 32, d: 7.5, depth: 12,
  }, partSignature(back)));
  const mine = after.drills.filter((d) => d.kind === 'hand');
  assert.equal(mine.length, 7);
  assert.deepEqual([...new Set(mine.map((d) => d.x))], [50]);
  assert.deepEqual([...new Set(mine.map((d) => d.d))], [7.5]);
});

test('F9.1 — an op nobody defined is ignored rather than obeyed', () => {
  const result = stock();
  const back = panelOf(result, 'BACK');
  assert.deepEqual(withPartEdit({}, 'BACK', { op: 'explode' }, partSignature(back)), {});
  assert.deepEqual(withPartEdit({}, 'BACK', null, partSignature(back)), {});
  assert.deepEqual(withPartEdit({}, '', { op: 'drill' }, 'x'), {});
});

// ─── The badge, and Back to computed (F9.3) ────────────────────────────────

test('F9.3 — the badge counts CHANGES, and "Back to computed" drops all of them', () => {
  const result = stock();
  const back = panelOf(result, 'BACK');
  const sig = partSignature(back);
  let edits = withPartEdit({}, 'BACK', { op: 'drill', layer: 'SCREWS_3MM', x: 1, y: 1, d: 3 }, sig);
  edits = withPartEdit(edits, 'BACK', { op: 'drill', layer: 'SCREWS_3MM', x: 2, y: 2, d: 3 }, sig);
  edits = withPartEdit(edits, 'BACK', { op: 'drill', layer: 'SCREWS_3MM', x: 3, y: 3, d: 3 }, sig);
  assert.equal(editCount(edits.BACK), 3);
  assert.equal(applyPartEdits(result, edits).handEdits.byPanel.BACK.count, 3);

  assert.equal(editCount(withoutLastPartEdit(edits, 'BACK').BACK), 2, 'Undo is one step');
  assert.deepEqual(withoutPartEdits(edits, 'BACK'), {}, 'Back to computed is all of them');
  assert.equal(applyPartEdits(result, withoutPartEdits(edits, 'BACK')), result, '…and the part is stock again');
});

test('F9.3 — A RESIZED PART DOES NOT CARRY ITS EDITS, and the app is told', () => {
  const small = stock('WARDROBE', { width: 600 });
  const back = panelOf(small, 'BACK');
  const edits = withPartEdit({}, 'BACK', {
    op: 'drill', layer: 'SCREWS_3MM', x: 550, y: 2000, d: 8,
  }, partSignature(back));
  // Same project, wider cabinet: the back is a different board.
  const wide = stock('WARDROBE', { width: 900 });
  assert.notEqual(partSignature(panelOf(wide, 'BACK')), partSignature(back));

  const after = applyPartEdits(wide, edits);
  assert.equal(after.drills.some((d) => d.kind === 'hand'), false, 'the export is STOCK, not wrong');
  assert.equal(after.handEdits.stale.length, 1);
  assert.equal(after.handEdits.stale[0].panelId, 'BACK');
  assert.equal(after.handEdits.stale[0].count, 1);
  assert.equal(after.handEdits.byPanel.BACK.stale, true);
});

test('F9.3 — and the app ASKS rather than deciding', () => {
  const modal = src('components/HandEditsModal.jsx');
  assert.match(modal, /carries manual edits/i);
  assert.match(modal, /data-hand-edits-drop="1"/);
  assert.match(modal, /data-hand-edits-undo="1"/);
  assert.match(src('pages/ConfiguratorPage.jsx'), /<HandEditsModal \/>/);
});

// ─── CNC: zero on stock, exactly the difference on an edited part (F9.5) ───

test('F9.5 — THE DXF DELTA: exactly one hide and one added drill, and nothing else', () => {
  const result = stock('WARDROBE', { width: 900 });
  const back = panelOf(result, 'BACK');
  const sig = partSignature(back);
  const holes = partFeatures(back, result.drills).filter((f) => f.kind === 'hole');
  assert.ok(holes.length >= 1, 'the back has something to remove');

  let edits = withPartEdit({}, 'BACK', { op: 'hide', feature: holes[0].fid }, sig);
  edits = withPartEdit(edits, 'BACK', {
    op: 'drill', layer: 'SCREWS_3MM', x: 300, y: 1500, d: 8, depth: 15,
  }, sig);
  const edited = applyPartEdits(result, edits);

  const before = parseDxf(panelDxf(back, result.drills, { unitNum: '01', profile: P })).entities;
  const after = parseDxf(panelDxf(panelOf(edited, 'BACK'), edited.drills, { unitNum: '01', profile: P })).entities;

  const key = (e) => JSON.stringify(e);
  const beforeKeys = before.map(key);
  const afterKeys = after.map(key);
  const removed = beforeKeys.filter((k) => !afterKeys.includes(k));
  const added = afterKeys.filter((k) => !beforeKeys.includes(k));

  assert.equal(removed.length, 1, `removed ${removed.length}: ${removed.join(' | ')}`);
  assert.equal(added.length, 1, `added ${added.length}: ${added.join(' | ')}`);
  const gone = JSON.parse(removed[0]);
  const grew = JSON.parse(added[0]);
  assert.equal(gone.type, 'circle');
  assert.equal(grew.type, 'circle');
  assert.equal(grew.layer, 'SCREWS_3MM');
  assert.equal(grew.r, 4, 'a ⌀8 hole is r 4');
  assert.equal(grew.cx, 300);
  assert.equal(grew.cy, 1500);
});

test('F9.5 — …and a FRESH UNIT OF THE SAME KIT exports STOCK, byte for byte', () => {
  const result = stock('WARDROBE', { width: 900 });
  const back = panelOf(result, 'BACK');
  const edits = withPartEdit({}, 'BACK', {
    op: 'drill', layer: 'SCREWS_3MM', x: 300, y: 1500, d: 8,
  }, partSignature(back));
  applyPartEdits(result, edits);

  // The NEXT cabinet: same kit, same params, no edits of its own. It must be
  // byte-identical to the stock export — "the next wardrobe comes out stock",
  // and by construction rather than by care.
  const neighbour = stock('WARDROBE', { width: 900 });
  const mine = buildUnitDxfFiles(neighbour, P);
  const stockFiles = buildUnitDxfFiles(stock('WARDROBE', { width: 900 }), P);
  assert.deepEqual(mine.map((f) => f.name), stockFiles.map((f) => f.name));
  for (let i = 0; i < mine.length; i += 1) {
    assert.equal(mine[i].dxf, stockFiles[i].dxf, `${mine[i].name} is not stock`);
  }
});

test('F9.5 — no kit, at its defaults, is touched by this feature at all', () => {
  for (const id of UNIT_TYPE_ORDER) {
    const result = computeCabinet(defaultParamsFor(id, P), P);
    assert.equal(applyPartEdits(result, null), result, `${id}`);
    assert.equal(result.drills.some((d) => d.kind === 'hand'), false, `${id} grew a hand drill`);
    assert.equal(result.handEdits, undefined, `${id} grew a handEdits key`);
  }
});

// ─── The tools exist in the surface the owner asked for (F9.1 / F9.4) ─────

test('F9.1 — the four tools are in the PART DETAIL, with a layer picked from a list', () => {
  const detail = src('components/PartDetailModal.jsx');
  assert.match(detail, /data-delete-feature="1"/);
  // ─── TURN 24 (CLAUDE.md F2.1): THE SAME FOUR, RENAMED AS THE MOCK NAMES
  //     THEM ────────────────────────────────────────────────────────────────
  // The owner vetoed turn 23's interaction and the replacement was drawn for
  // him: **Select · Drill · Line · Dowel line**, from one list, with the layer
  // picker beside them. What this test has always been about — one list, the
  // EXISTING layers, no custom layers — is untouched.
  // ─── RE-PINNED 17.08.2026 (TURN 38, CLAUDE.md F2/F3) ────────────────────
  // The four are still four and still the first four a hand reaches for; what
  // moved is HOW the toolbar is written. Turn 24's `[['select', 'Select'], …]`
  // pairs became a TOOLS table with a glyph, a hint and how many points each
  // gesture takes, because the bar now carries seventeen tools in AutoCAD's
  // own three groups and a pair of strings cannot say any of that.
  const tools = src('lib/partTools.js');
  for (const tool of ['select', 'drill', 'line', 'dowels']) {
    assert.match(tools, new RegExp(`id: '${tool}'`), `the ${tool} tool`);
  }
  assert.match(detail, /data-part-tool=\{t\.id\}/);
  // …and the layer list is the app's own PLUS the project's, which is F3 and
  // is the belief this line used to pin the other way ("no custom layers this
  // turn — parked by the owner's word"). He asked for them on 17.08.
  assert.match(detail, /layerList\.map/, 'the layer comes from one list');
  assert.match(detail, /allLayers\(projectLayersRaw\)/, '…the CNC table plus this project’s own');
  assert.match(detail, /data-back-to-computed="1"/);
  assert.match(detail, /data-hand-edited=/);
});

test('F9.4 — the detail draws the part as the SHEET lays it', () => {
  // `partDetailDrawing` uses `cnc.drawn_w × drawn_h`, and `cnc/layout.js` places
  // the very same rectangle. One frame, so a hole typed at 300, 40 in the
  // detail is at 300, 40 on the machine.
  const result = stock();
  const back = panelOf(result, 'BACK');
  const layout = src('engine/cnc/layout.js');
  assert.match(layout, /panel\.cnc\?\.drawn_w/);
  assert.match(src('engine/drawings/partDetail.js'), /cnc\.drawn_w/);
  assert.equal(Number(back.cnc.drawn_w), back.w);
  assert.match(src('components/PartDetailModal.jsx'), /data-part-orientation=/);
});

test('F9.2 — the badge is on the SHEET as well as in the detail', () => {
  assert.match(src('components/CncView.jsx'), /data-hand-edited=/);
  assert.match(src('components/CncView.jsx'), /handEdits/);
});

test('F9 — the edits are stored on the PROJECT, and survive a save', () => {
  // `params` is what this app persists, caches and undoes, so that is where a
  // pencil mark goes. The store writes it through the ordinary param path.
  const store = src('stores/projectStore.js');
  assert.match(store, /params\.part_edits/);
  assert.match(store, /updateUnitParams\(unitId, \{ part_edits: next \}\)/);
});
