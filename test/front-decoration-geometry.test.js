import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DECORATIVE_FRONT_STYLES, defaultFrontDecoration, normaliseFrontDecoration,
  buildFrontDecoration, validateFrontDecoration,
} from '../src/engine/frontDecoration.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const panel = { id: '01-F', w: 600, h: 720, thickness: 25 };
const build = (style, config = {}, part = panel, drills = []) => buildFrontDecoration({
  panel: part, style, config: { ...defaultFrontDecoration(style), ...config }, drills, profile: P,
});
const signedArea = (pts) => pts.reduce((sum, p, i) => {
  const next = pts[(i + 1) % pts.length];
  return sum + p[0] * next[1] - next[0] * p[1];
}, 0) / 2;
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const inside = (outline, p) => outline.every((v, i) => cross(v, outline[(i + 1) % outline.length], p) >= -0.0001);

test('old saved style names alone never opt into a machining recipe', () => {
  for (const style of ['F', 'S', 'HJ', 'GL', ...DECORATIVE_FRONT_STYLES]) {
    assert.equal(buildFrontDecoration({ panel, style }), null);
    assert.equal(normaliseFrontDecoration(null, style), null);
  }
  for (const style of ['F', 'S', 'HJ', 'GL']) assert.equal(defaultFrontDecoration(style), null);
});

test('every enabled default recipe is bounded, deterministic and uses the front face', () => {
  for (const style of DECORATIVE_FRONT_STYLES) {
    const config = defaultFrontDecoration(style); const snapshot = structuredClone(config);
    const result = build(style, config);
    assert.equal(result.status, 'ready', `${style}: ${JSON.stringify(result.problems)}`);
    assert.deepEqual(result, build(style, config));
    assert.deepEqual(config, snapshot, 'the saved recipe was not modified');
    for (const item of [...result.operations, ...result.additions]) {
      assert.equal(item.face, 'front');
      assert.ok(signedArea(item.points) > 0, `${style}: CCW contour`);
      assert.ok(item.points.every((p) => inside(result.outline, p)), `${style}: inside the cut front`);
    }
    for (const op of result.operations) {
      assert.ok(op.depth > op.startDepth);
      assert.ok(op.tool.diameter > 0);
      assert.match(op.layer, /^FRONT_[A-Z0-9_p]+$/);
    }
  }
});

test('grooves centre the exact pitch with equal opposite margins and rounded stopped ends', () => {
  const result = build('G');
  const centres = result.operations.map((op) => {
    const xs = op.points.map((p) => p[0]);
    assert.ok(op.points.length > 20, 'actual circular ends, not a square rectangle');
    assert.equal(Math.max(...xs) - Math.min(...xs), 6);
    return (Math.max(...xs) + Math.min(...xs)) / 2;
  });
  assert.equal(centres[0] + centres.at(-1), panel.w);
  for (let i = 1; i < centres.length; i += 1) assert.equal(centres[i] - centres[i - 1], 25);
  assert.ok(result.operations.every((op) => op.depth === 3 && op.startDepth === 0));
});

test('framed grooves keep absolute depth and their separate initial recess', () => {
  const result = build('GF');
  assert.equal(result.operations[0].id, 'panel-recess');
  assert.equal(result.operations[0].depth, 6);
  for (const groove of result.operations.slice(1)) {
    assert.equal(groove.startDepth, 6); assert.equal(groove.depth, 9);
    assert.ok(groove.points.every((p) => inside(result.operations[0].points, p)));
  }
});

test('convex sloped leaves inset along the true edge normal', () => {
  const outline = [[0, 0], [600, 0], [600, 480], [300, 720], [0, 720]];
  const sloped = { ...panel, cnc: { outline, drawn_w: 600, drawn_h: 720 } };
  for (const style of ['G', 'GF', 'FL']) {
    const result = build(style, {}, sloped);
    assert.equal(result.status, 'ready', `${style}: ${JSON.stringify(result.problems)}`);
    for (const op of result.operations) {
      for (const p of op.points) {
        assert.ok(inside(outline, p));
        for (let i = 0; i < outline.length; i += 1) {
          const a = outline[i]; const b = outline[(i + 1) % outline.length];
          const gap = cross(a, b, p) / Math.hypot(b[0] - a[0], b[1] - a[1]);
          assert.ok(gap >= (result.parameters.frameMm || result.parameters.grooveInsetMm) - 0.0001);
        }
      }
    }
  }
});

test('arch resize rule retains a genuine curved internal opening within its frame', () => {
  const a = build('A'); const ah = build('AH');
  assert.equal(a.status, 'ready');
  assert.deepEqual(a.operations, ah.operations, 'handleless remains a separate existing handle choice');
  const points = a.operations[0].points;
  assert.ok(points.length > 50);
  assert.ok(Math.abs(Math.max(...points.map((p) => p[1])) - 660) < 0.1);
  assert.ok(points.some((p) => p[0] > 60 && p[0] < 300 && p[1] > 420 && p[1] < 650));
  assert.equal(build('A', { archRatio: 2 }).status, 'blocked');
});

test('ballnose opening and the sampled surface agree with cutter radius and depth', () => {
  for (const direction of ['vertical', 'horizontal']) {
    const result = build('FL', { grooveDirection: direction });
    const op = result.operations[0];
    assert.equal(op.tool.kind, 'ballnose'); assert.equal(op.tool.diameter, 12);
    assert.ok(Math.abs(op.crossSection.width - 2 * Math.sqrt(27)) < 1e-6);
    assert.equal(op.crossSection.profile[0][1], 0);
    assert.equal(op.crossSection.profile.at(-1)[1], 0);
    assert.equal(Math.max(...op.crossSection.profile.map((p) => p[1])), 3);
    for (const [x, y, depth] of op.surface.vertices) {
      assert.ok(Number.isFinite(x) && Number.isFinite(y));
      assert.ok(depth >= 0 && depth <= 3);
    }
    for (const indices of op.surface.triangles) {
      assert.ok(indices.every((i) => i >= 0 && i < op.surface.vertices.length));
      const [p, q, r] = indices.map((i) => op.surface.vertices[i]);
      assert.ok(cross(p, q, r) >= -EPSILON, 'surface keeps its winding after horizontal rotation');
    }
  }
});
const EPSILON = 1e-6;

test('applied moulding is four real mitred cutting parts with a shared host', () => {
  const result = build('AM');
  assert.equal(result.operations.length, 0);
  assert.equal(result.additions.length, 4);
  assert.deepEqual(result.additions.map((p) => p.cut.length), [480, 600, 480, 600]);
  const volume = result.additions.reduce((sum, p) => {
    assert.equal(p.parentFrontId, panel.id);
    assert.equal(p.cut.width, 20); assert.equal(p.cut.thickness, 8);
    assert.deepEqual(p.mitres, { start: 45, end: 45 });
    assert.equal(signedArea(p.cut.outline), signedArea(p.points));
    return sum + signedArea(p.points) * p.thickness;
  }, 0);
  assert.equal(volume, (480 * 600 - 440 * 560) * 8);
});

test('narrow fronts and unsupported outlines are refused without partial machining', () => {
  const concave = { ...panel, cnc: { outline: [[0, 0], [600, 0], [600, 720], [300, 500], [0, 720]] } };
  const crossed = { ...panel, cnc: { outline: [[0, 0], [600, 720], [600, 0], [0, 720]] } };
  const curved = { ...panel, cnc: { outline: [[0, 0, 0.5], [600, 0], [600, 720], [0, 720]] } };
  const slope = { ...panel, cnc: { outline: [[0, 0], [600, 0], [600, 400], [0, 720]] } };
  const results = [build('GF', {}, { ...panel, h: 120 }), build('G', {}, { ...panel, w: 61 }),
    build('G', {}, concave), build('GF', {}, crossed), build('A', {}, curved), build('AM', {}, slope)];
  for (const result of results) {
    assert.equal(result.status, 'blocked');
    assert.ok(result.problems.length);
    assert.deepEqual(result.operations, []); assert.deepEqual(result.additions, []);
  }
});

test('invalid numbers, unknown versions, excessive work and overlapping grooves are refused', () => {
  for (const value of [NaN, Infinity, -1, 0, '', null, 'nonsense']) {
    assert.equal(build('G', { grooveDepthMm: value }).status, 'blocked', String(value));
  }
  assert.equal(normaliseFrontDecoration({ grooveDepthMm: '4.5' }, 'G').grooveDepthMm, 4.5);
  assert.equal(build('G', { version: 2 }).status, 'blocked');
  assert.equal(build('G', { groovePitchMm: 5 }).status, 'blocked');
  assert.equal(build('G', { grooveWidthMm: 0.1, groovePitchMm: 0.2 }).status, 'blocked');
  assert.equal(build('G', { grooveDirection: 'diagonal' }).status, 'blocked');
  assert.equal(build('FL', { grooveDepthMm: 7 }).status, 'blocked');
  assert.equal(build('G', {}, { ...panel, w: Infinity }).status, 'blocked');
});

test('the remaining skin rule uses the deepest absolute cut', () => {
  assert.equal(build('GF', {}, { ...panel, thickness: 12 }).status, 'ready');
  const blocked = build('GF', {}, { ...panel, thickness: 11.9 });
  assert.equal(blocked.status, 'blocked');
  assert.ok(blocked.problems.some((p) => p.code === 'FRONT_DECORATION_SKIN'));
});

test('back cup conflicts inspect its full bore disc and preserve a 3 mm web', () => {
  const part = { ...panel, thickness: 18 };
  const recipe = build('G', {}, part);
  const first = recipe.operations[0]; const x = (Math.min(...first.points.map((p) => p[0])) + Math.max(...first.points.map((p) => p[0]))) / 2;
  const cup = { panel: part.id, kind: 'cup', x, y: 100, d: 35, depth: 13 };
  assert.ok(validateFrontDecoration({ panel: part, decoration: recipe, drills: [cup] }).some((p) => p.code === 'FRONT_DECORATION_BACK_BORE'));
  assert.equal(build('G', {}, part, [cup]).status, 'blocked');
  assert.equal(build('G', {}, part, [{ ...cup, x: -100 }]).status, 'ready');
  assert.equal(build('G', {}, part, [{ ...cup, panel: 'other' }]).status, 'ready');
  assert.equal(build('G', {}, part, [{ ...cup, kind: 'handle' }]).status, 'ready');
});

test('left, right and top J-pull machining bands reject intersecting decoration', () => {
  for (const edge of ['L', 'R', 'TOP']) {
    const part = { ...panel, cnc: { jpull: { edge, from: 100, to: 600, profile: { slotDepth: 40, slotR: 5, reliefMm: 30, rampR: 25 } } } };
    assert.equal(build('G', { grooveInsetMm: 30 }, part).status, 'blocked', edge);
    assert.equal(build('GF', {}, part).status, 'ready', `${edge}: 60 mm frame clears the band`);
  }
});

test('actual knob bores crossing a groove edge retain their separate through operation', () => {
  const cabinet = computeCabinet({ ...defaultParamsFor('BUD', P), front_type: 'G', project_handle: { type: 'knob' } }, P);
  const front = cabinet.panels.find((p) => p.role === 'front');
  const handles = cabinet.drills.filter((d) => d.kind === 'handle');
  assert.equal(handles.length, 1, 'the normal engine emitted an actual through knob hole');
  assert.equal(build('G', {}, front, cabinet.drills).status, 'ready', 'default leaves the handle in the frame');
  const crossing = build('G', { grooveInsetMm: 44 }, front, cabinet.drills);
  assert.equal(crossing.status, 'ready');
  assert.ok(crossing.operations.length > 0);
  assert.equal(handles[0].depth, undefined, 'the recipe does not replace the through drilling depth');
});

test('through bores wholly inside a flat floor or flute remain representable', () => {
  for (const style of ['G', 'FL']) {
    const recipe = build(style);
    const op = recipe.operations[0];
    const xs = op.points.map((p) => p[0]);
    const x = (Math.min(...xs) + Math.max(...xs)) / 2;
    const drill = { panel: panel.id, kind: 'handle', x, y: 100, d: 2 };
    assert.equal(build(style, {}, panel, [drill]).status, 'ready');
    const crossing = { ...drill, x: Math.min(...xs) };
    assert.equal(build(style, {}, panel, [crossing]).status, 'ready', 'a through bore can cross the machined boundary');
  }
  const nested = build('GF');
  const deep = nested.operations[1]; const xs = deep.points.map((p) => p[0]);
  const d = { panel: panel.id, kind: 'handle', x: (Math.min(...xs) + Math.max(...xs)) / 2, y: 200, d: 2 };
  assert.equal(build('GF', {}, panel, [d]).status, 'ready', 'wholly within nested pocket');
});

test('a through handle bore may not require unprovided drilling in applied strips', () => {
  const drill = { panel: panel.id, kind: 'handle', x: 70, y: 300, d: 5 };
  const result = build('AM', {}, panel, [drill]);
  assert.equal(result.status, 'blocked');
  assert.ok(result.problems.some((p) => p.code === 'FRONT_DECORATION_MOULDING_BORE'));
  assert.equal(build('AM', {}, panel, [{ ...drill, x: 40 }]).status, 'ready');
});

test('DXF layer names retain exact depth distinctions in uppercase within the R12 limit', () => {
  const decimal = build('G', { grooveDepthMm: 3.5 }).operations[0];
  assert.match(decimal.layer, /D3P5/);
  const a = build('G', { grooveDepthMm: 3.123456789123456 }).operations[0];
  const b = build('G', { grooveDepthMm: 3.123456789123457 }).operations[0];
  assert.notEqual(a.layer, b.layer, 'sub-micron edits are not rounded into one operation identity');
  assert.equal(a.depth, 3.123456789123456);
  assert.equal(b.depth, 3.123456789123457);
  for (const op of [decimal, a, b]) {
    assert.equal(op.layer, op.layer.toUpperCase());
    assert.ok(op.layer.length <= 31);
    assert.match(op.layer, /^[A-Z0-9_]+$/);
  }
});

test('default recipes fit real wardrobe leaves at 18 and 25 mm with both hinge hands', () => {
  assert.equal(defaultFrontDecoration('G').grooveInsetMm, 50);
  assert.equal(defaultFrontDecoration('FL').grooveInsetMm, 50);
  for (const thickness of [18, 25]) {
    const cabinet = computeCabinet({ ...defaultParamsFor('WARDROBE', P), width: 1200, height: 2150, front_t: thickness }, P);
    const leaves = cabinet.panels.filter((p) => p.role === 'front');
    assert.deepEqual(leaves.map((p) => p.meta.hinge).sort(), ['L', 'R']);
    for (const front of leaves) {
      assert.equal(front.thickness, thickness);
      for (const style of ['G', 'FL']) {
        const result = build(style, {}, front, cabinet.drills);
        assert.equal(result.status, 'ready', `${style}/${thickness}/${front.meta.hinge}: ${JSON.stringify(result.problems)}`);
        const deeperCups = cabinet.drills.map((drill) => drill.kind === 'cup' ? { ...drill, depth: 13 } : drill);
        assert.equal(build(style, {}, front, deeperCups).status, 'ready', 'also leaves 3 mm behind a 13 mm cup');
      }
      if (thickness === 18) {
        // T76 F3 · SS is gone; its own geometry (a 25 frame, now 6 deep) is asked of GF instead.
        assert.equal(build('GF', { frameMm: 25, recessDepthMm: 6 }, front, cabinet.drills).status, 'blocked', 'an explicit deeper recipe still gets validated');
      }
    }
  }
});

test('factory drawer-front screws retain the workshop blind depth when their records omit it', () => {
  for (const type of ['BUDR', 'BUDR4']) {
    const cabinet = computeCabinet({ ...defaultParamsFor(type, P), front_t: 18, front_type: 'G' }, P);
    const screws = cabinet.drills.filter((drill) => drill.kind === 'front_screw');
    assert.ok(screws.length > 0);
    assert.ok(screws.every((drill) => drill.depth == null && drill.layer === 'FRONT_HINGES_3MM'));
    for (const front of cabinet.panels.filter((p) => p.role === 'front')) {
      const result = build('G', {}, front, cabinet.drills);
      assert.equal(result.status, 'ready', `${type}/${front.id}: ${JSON.stringify(result.problems)}`);
      const through = cabinet.drills.map((drill) => drill.kind === 'front_screw' ? { ...drill, depth: front.thickness } : drill);
      assert.equal(build('G', {}, front, through).status, 'ready', 'explicit through variant remains independent');
    }
  }
  const recipe = build('G');
  const groove = recipe.operations[0];
  const xs = groove.points.map((p) => p[0]);
  const screw = { panel: panel.id, kind: 'front_screw', layer: 'FRONT_HINGES_3MM', x: (Math.min(...xs) + Math.max(...xs)) / 2, y: 100, d: 3 };
  const profile = structuredClone(P);
  profile.editor.drillDefaults.FRONT_HINGES_3MM.depth = 21;
  const blocked = buildFrontDecoration({ panel, config: defaultFrontDecoration('G'), style: 'G', drills: [screw], profile });
  assert.ok(blocked.problems.some((p) => p.code === 'FRONT_DECORATION_BACK_BORE'), 'the actual workshop depth is used, not a copied default');
  const explicit = buildFrontDecoration({ panel, config: defaultFrontDecoration('G'), style: 'G', drills: [{ ...screw, depth: 11 }], profile });
  assert.equal(explicit.status, 'ready', 'an explicitly stated bore depth takes precedence');
  const defaultProfile = buildFrontDecoration({ panel, config: defaultFrontDecoration('G'), style: 'G', drills: [screw] });
  assert.equal(defaultProfile.status, 'ready', 'direct engine callers share the same default workshop profile');
});
