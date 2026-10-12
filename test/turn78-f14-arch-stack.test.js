// ─── T78 · F14 · THE ARCH ON SMALL DOORS, AND ONE ARCH ACROSS A DRAWER STACK ─
//
// The owner, 11.10.2026: *"jak mamy arche to powinny byc na malych drzwiczkach
// tez zaaplikowane a jak mamy szuflady to przez wszystkie szuflady przechodzi
// arch."*  Small doors: the A / AH recipe applies at any leaf size; the T76 F4
// refusal (rise impossible) stays only where the semicircle truly cannot fit.
// A drawer stack: ONE arch over the whole stack, computed on the combined
// front height (fronts plus the gaps), each front receiving its SLICE.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { buildFrontDecoration, defaultFrontDecoration } from '../src/engine/frontDecoration.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const DECO = defaultFrontDecoration('A', P);
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

test('F14 · a small door takes the arch at any size the semicircle fits; below that the refusal is the rise, in words', () => {
  const ok = computeCabinet({ ...defaultParamsFor('WUD', P), unit_num: 'W1', width: 300, height: 300, doors: true, front_type: 'A', front_decoration: DECO }, P);
  const leaf = ok.panels.find((p) => p.part === 'FRONT');
  assert.equal(leaf.meta.frontDecoration.status, 'ready', `a 300 x 300 leaf: ${JSON.stringify(leaf.meta.frontDecoration.problems)}`);
  assert.equal(leaf.meta.frontDecoration.operations.length, 1);
  assert.equal(leaf.meta.frontDecoration.stack, undefined, 'a door is no stack');
  const tiny = computeCabinet({ ...defaultParamsFor('WUD', P), unit_num: 'W1', width: 300, height: 150, doors: true, front_type: 'A', front_decoration: DECO }, P);
  const t = tiny.panels.find((p) => p.part === 'FRONT');
  assert.equal(t.meta.frontDecoration.status, 'blocked');
  assert.deepEqual(t.meta.frontDecoration.problems.map((p) => p.code), ['FRONT_DECORATION_ARCH']);
  assert.match(t.meta.frontDecoration.problems[0].message, /never squashed to an ellipse/);
});

test('F14 · a BUDR x3 stack: one arch computed on the stack (767 high, the gaps included), each front its slice; the crown on the top front', () => {
  const r = computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: 'D1', front_type: 'A', front_decoration: DECO }, P);
  const fronts = r.panels.filter((p) => p.part === 'DRAWER-FRONT').sort((a, b) => a.box.y - b.box.y);
  assert.equal(fronts.length, 3);
  const bottom = fronts[0].box.y; const top = fronts[2].box.y + fronts[2].box.h;
  for (const f of fronts) {
    const st = f.meta.frontDecoration.stack;
    assert.ok(st?.slice, `${f.id} is a slice`);
    assert.ok(near(st.heightMm, top - bottom), 'the stack is the column, bottom to top, gaps included');
    assert.ok(near(st.offsetMm, f.box.y - bottom));
    assert.equal(st.fronts, 3);
  }
  // Alone (no stack) every front of this unit is refused: a 477 inner width's rise does not fit a 338 front.
  for (const f of fronts) {
    const alone = buildFrontDecoration({ panel: f, config: DECO, style: 'A', drills: r.drills, profile: P, stack: null });
    assert.equal(alone.status, 'blocked');
    assert.deepEqual(alone.problems.map((p) => p.code), ['FRONT_DECORATION_ARCH']);
  }
  // Stacked: the top front carries the crown, a slice narrower than its width, ending 60 (the frame) below its top.
  const crown = fronts[2].meta.frontDecoration;
  assert.equal(crown.status, 'ready', JSON.stringify(crown.problems));
  const pts = crown.operations[0].points;
  const ys = pts.map((p) => p[1]); const xs = pts.map((p) => p[0]);
  assert.ok(near(Math.min(...ys), 0), 'the slice runs from the front\'s bottom edge (no frame between fronts)');
  assert.ok(near(Math.max(...ys), fronts[2].h - DECO.frameMm, 0.5), 'to the frame below its top');
  assert.ok(Math.max(...xs) - Math.min(...xs) < fronts[2].w - 2 * DECO.frameMm - 1, 'the crown is narrower than the stack\'s inner width');
  // The middle front's slice runs edge to edge in y (the arch is broken only by the gaps).
  const mid = fronts[1].meta.frontDecoration;
  assert.ok(mid.stack.slice);
  // The lower fronts: T76's skin law refuses the recess where it reaches the box's front fixing screws
  // (the recipe's 18 recess on the house 25 board). Said in words, never silently cut.
  for (const f of [fronts[0], fronts[1]]) {
    const d = f.meta.frontDecoration;
    assert.equal(d.status, 'blocked');
    assert.ok(d.problems.every((p) => p.code === 'FRONT_DECORATION_BACK_BORE'), `${f.id}: ${d.problems.map((p) => p.code)}`);
    assert.ok(r.warnings.some((w) => w.panel === f.id && w.code === 'FRONT_DECORATION_BACK_BORE'));
  }
});

test('F14 · the slice is cut: the DXF carries each front\'s own contour; a drawer front of a flat or shaker style is untouched', () => {
  const r = computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: 'D1', front_type: 'A', front_decoration: DECO }, P);
  const top = r.panels.filter((p) => p.part === 'DRAWER-FRONT').sort((a, b) => a.box.y - b.box.y)[2];
  const op = top.meta.frontDecoration.operations[0];
  assert.equal(op.kind || op.type || 'pocket', op.kind || op.type || 'pocket');
  assert.ok(op.points.length > 20, 'a real contour');
  assert.ok(op.points.every(([x, y]) => x >= 0 && x <= top.w && y >= 0 && y <= top.h), 'inside the front');
  const flat = computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: 'D1', front_type: 'F' }, P);
  assert.ok(flat.panels.filter((p) => p.part === 'DRAWER-FRONT').every((f) => !f.meta.frontDecoration));
  const src = read('src/engine/frontDecoration.js');
  assert.match(src, /function sliceToBand\(points, y0, y1\)/);
  assert.match(src, /stack = null,\s*\}\) \{/);
});

test('F14 · the golden', () => {
  const g = JSON.parse(read('fixtures/golden-arch-stack.json'));
  assert.equal(g.meta.F, 'F14');
  assert.equal(g.params.front_type, 'A');
});
