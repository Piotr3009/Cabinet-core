// Decorative front recipes, explicitly enabled by the project.
// Piotr, 09.10.2026: choose defaults and code; they remain editable recipe
// values, not manufacturer specifications. Existing styles without a recipe
// keep their existing geometry. Coordinates are the CNC back-view in mm.
//
// ─── T76 F4 · THE NUMBERS LEFT THIS FILE ────────────────────────────────────
// CLAUDE.md T76 F4: *"GPT put the recipe defaults in code (`RECIPES` ...).
// The house law: numbers live in `engine/profile.js`."*  `RECIPES` is deleted;
// every recipe is `profile.front.decoration[style]` of the profile handed in,
// and a caller that hands none gets the active workshop profile
// (`getCabinetProfile()`, the road every other number travels). What stays
// here is the geometry: which styles this module can machine, and how.

import { machiningFor } from './machining.js';
import { getCabinetProfile } from './profile.js';
// T77 F4 · the board rule moved to its own module, so the Ornate engine asks
// the same function without importing this file (CLAUDE.md T77 F4: "one
// function serves both").
import { boardShortfall, minSkinOf, skinShort } from './frontBoard.js';
import { ORNATE_STYLE_IDS, buildOrnateFront, defaultOrnateConfig, normaliseOrnateConfig } from './ornateFront.js';

export { ORNATE_STYLE_IDS } from './ornateFront.js';

const EPS = 1e-7;
const MAX_OPERATIONS = 256;
const CURVE_STEPS = 24;
const CONTOUR_TOLERANCE_MM = 0.025;

/** Existing 2.5D machining recipes. Proposed 3D reliefs are ORNATE_STYLE_IDS. */
export const DECORATIVE_FRONT_STYLES = Object.freeze(['G', 'GF', 'A', 'AH', 'FL', 'AM']);

/** The cutters a groove recipe may name, per style (T76 F4: a V is a V). */
const GROOVE_CUTTERS = Object.freeze({ G: ['v', 'endmill'], GF: ['v', 'endmill'], FL: ['ballnose'] });

/** One style's recipe in this profile, or null where the style has none. */
function recipeOf(style, profile) {
  if (![...DECORATIVE_FRONT_STYLES, ...ORNATE_STYLE_IDS].includes(style)) return null;
  return profile?.front?.decoration?.[style] || null;
}

/** Explicit opt-in: no object is created merely by opening an old style. */
export function defaultFrontDecoration(style, profile = getCabinetProfile()) {
  if (ORNATE_STYLE_IDS.includes(style)) return defaultOrnateConfig(style, profile);
  const recipe = recipeOf(style, profile);
  return recipe ? { version: 1, style, ...recipe } : null;
}

/** Preserve invalid entered numbers for validation, never silently clamp. */
export function normaliseFrontDecoration(config, style = config?.style, profile = getCabinetProfile()) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return null;
  if (ORNATE_STYLE_IDS.includes(style)) return normaliseOrnateConfig(config, style, profile);
  const recipe = recipeOf(style, profile);
  if (!recipe) return { ...config, version: config.version ?? 1, style };
  const out = { version: config.version ?? 1, style };
  for (const [key, fallback] of Object.entries(recipe)) {
    const value = Object.hasOwn(config, key) ? config[key] : fallback;
    out[key] = typeof fallback === 'number'
      ? (typeof value === 'number' ? value : (typeof value === 'string' && value.trim() ? Number(value) : NaN))
      : value;
  }
  return out;
}

const round = (v) => Math.round(v * 1e7) / 1e7;
const point = (p) => [round(p[0]), round(p[1])];
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const area = (pts) => pts.reduce((a, p, i) => {
  const q = pts[(i + 1) % pts.length];
  return a + p[0] * q[1] - q[0] * p[1];
}, 0) / 2;
const ccw = (pts) => area(pts) < 0 ? [...pts].reverse() : pts;
const bounds = (pts) => ({
  x1: Math.min(...pts.map((p) => p[0])), y1: Math.min(...pts.map((p) => p[1])),
  x2: Math.max(...pts.map((p) => p[0])), y2: Math.max(...pts.map((p) => p[1])),
});
const rect = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
const problem = (code, message) => ({ code, message });
const token = (value) => String(value).replace('.', 'P').replace('e', 'E').replace('-', 'N').replace('+', '');
// T76 F4 · `sizeLetter` T is a tool diameter; W is a V groove's width at the
// face (a V names no diameter: CAM picks the bit).
function operationLayer(kind, depth, startDepth, diameter, sizeLetter = 'T') {
  const readable = `FRONT_${kind}_D${token(depth)}_S${token(startDepth)}_${sizeLetter}${token(diameter)}`;
  if (readable.length <= 31) return readable;
  // R12 layer names stay within 31 characters. Exact decimal values remain in
  // the operation manifest; they are never rounded to manufacture a label.
  const signature = `${kind}|${depth}|${startDepth}|${sizeLetter}${diameter}`;
  let hash = 14695981039346656037n;
  for (const char of signature) hash = BigInt.asUintN(64, (hash ^ BigInt(char.charCodeAt(0))) * 1099511628211n);
  return `FRONT_${kind}_${hash.toString(16).padStart(16, '0').toUpperCase()}`;
}
// Sagitta bound for each chord. A half ellipse is bounded by its larger
// semi-axis. The practical front-size limit below keeps this work bounded.
const halfCurveSteps = (radius, minimum = CURVE_STEPS) => Math.max(minimum,
  Math.ceil(Math.PI / (2 * Math.acos(Math.max(-1, 1 - CONTOUR_TOLERANCE_MM / radius)))));

function cleanPolygon(points) {
  return points.filter((p, i) => distance(p, points[(i + points.length - 1) % points.length]) > EPS);
}

function convexPolygon(points) {
  if (points.length < 3 || Math.abs(area(points)) < EPS) return false;
  // Requiring every edge to contain every other vertex also rejects crossed
  // polygons. Concave custom outlines need a dedicated offset recipe.
  return points.every((a, i) => points.every((p) => cross(a, points[(i + 1) % points.length], p) >= -EPS));
}

function clipHalfPlane(points, a, b, offset) {
  if (!points.length) return [];
  const length = distance(a, b);
  const signed = (p) => cross(a, b, p) / length - offset;
  const out = [];
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i]; const q = points[(i + 1) % points.length];
    const sp = signed(p); const sq = signed(q);
    if (sp >= -EPS) out.push(p);
    if ((sp >= -EPS) !== (sq >= -EPS)) {
      const t = sp / (sp - sq);
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return cleanPolygon(out);
}

function insetPolygon(outline, inset) {
  let result = outline.map((p) => [...p]);
  for (let i = 0; i < outline.length && result.length; i += 1) {
    result = clipHalfPlane(result, outline[i], outline[(i + 1) % outline.length], inset);
  }
  return result.length >= 3 && area(result) > EPS ? result : [];
}

function contains(outline, pts) {
  return pts.every((p) => outline.every((a, i) => cross(a, outline[(i + 1) % outline.length], p) >= -0.0001));
}

// Real pockets carry the cutter's inside corner radius, including on slopes.
function roundedPolygon(polygon, radius) {
  const corners = polygon.map((v, i) => {
    const prev = polygon[(i + polygon.length - 1) % polygon.length];
    const next = polygon[(i + 1) % polygon.length];
    const lp = distance(v, prev); const ln = distance(v, next);
    const u = [(prev[0] - v[0]) / lp, (prev[1] - v[1]) / lp];
    const z = [(next[0] - v[0]) / ln, (next[1] - v[1]) / ln];
    const angle = Math.acos(Math.max(-1, Math.min(1, u[0] * z[0] + u[1] * z[1])));
    const tangent = radius / Math.tan(angle / 2);
    const bisector = [u[0] + z[0], u[1] + z[1]];
    const magnitude = Math.hypot(...bisector);
    if (magnitude < EPS) return { v, tangent: 0, straight: true };
    const centreDistance = radius / Math.sin(angle / 2);
    const centre = [v[0] + centreDistance * bisector[0] / magnitude, v[1] + centreDistance * bisector[1] / magnitude];
    const start = [v[0] + u[0] * tangent, v[1] + u[1] * tangent];
    return { v, tangent, centre, start, sweep: Math.PI - angle };
  });
  if (corners.some((c, i) => c.tangent + corners[(i + 1) % corners.length].tangent > distance(c.v, corners[(i + 1) % corners.length].v) - EPS)) return [];
  const result = [];
  for (const c of corners) {
    if (c.straight) { result.push(c.v); continue; }
    const a0 = Math.atan2(c.start[1] - c.centre[1], c.start[0] - c.centre[0]);
    const steps = Math.max(2, Math.ceil(c.sweep / (Math.PI / CURVE_STEPS)));
    for (let i = 0; i <= steps; i += 1) {
      const a = a0 + c.sweep * i / steps;
      result.push([c.centre[0] + radius * Math.cos(a), c.centre[1] + radius * Math.sin(a)]);
    }
  }
  return cleanPolygon(result).map(point);
}

function pocket(id, points, depth, startDepth = 0, diameter = 6) {
  return {
    id, kind: 'pocket', face: 'front', points: ccw(points).map(point), depth, startDepth,
    tool: { kind: 'endmill', diameter },
    layer: operationLayer('POCKET', depth, startDepth, diameter),
  };
}

function intervalAtX(polygon, x) {
  const ys = [];
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i]; const b = polygon[(i + 1) % polygon.length];
    if (x < Math.min(a[0], b[0]) - EPS || x > Math.max(a[0], b[0]) + EPS) continue;
    if (Math.abs(a[0] - b[0]) < EPS) { ys.push(a[1], b[1]); continue; }
    const t = (x - a[0]) / (b[0] - a[0]);
    ys.push(a[1] + t * (b[1] - a[1]));
  }
  return ys.length ? [Math.min(...ys), Math.max(...ys)] : null;
}

function capsule(x, y0, y1, radius) {
  const points = [];
  const steps = halfCurveSteps(radius);
  for (let i = 0; i <= steps; i += 1) {
    const a = Math.PI + Math.PI * i / steps;
    points.push([x + radius * Math.cos(a), y0 + radius * Math.sin(a)]);
  }
  for (let i = 0; i <= steps; i += 1) {
    const a = Math.PI * i / steps;
    points.push([x + radius * Math.cos(a), y1 + radius * Math.sin(a)]);
  }
  return points;
}

// T76 F4 · one builder for a groove's floor, whatever its section: `atDepth`
// is the depth below the groove's own mouth at a distance from its centre
// line (a circle for the ballnose, a straight V for the V), and `base` is the
// floor the mouth opens in (0 on the face, the recess floor in GF).
function grooveSurface({ x, y0, y1, depth, mouth, transform, horizontal, atDepth, base = 0 }) {
  const vertices = []; const triangles = [];
  const add = (x0, y, d) => { vertices.push([...point(transform([x0, y])), round(base + d)]); return vertices.length - 1; };
  const profile = [];
  for (let i = 0; i <= CURVE_STEPS; i += 1) {
    const offset = -mouth + 2 * mouth * i / CURVE_STEPS;
    const d = atDepth(offset);
    profile.push([round(offset), round(d)]);
    add(x + offset, y0, d); add(x + offset, y1, d);
    if (i) {
      const n = vertices.length - 4;
      triangles.push([n, n + 2, n + 1], [n + 1, n + 2, n + 3]);
    }
  }
  // Stopped ends: the same cross-section revolved around each endpoint
  // (spherical for the ballnose, conical for the V), not a flat-ended
  // rectangular groove in the preview.
  const capSteps = halfCurveSteps(mouth);
  for (const [cy, start] of [[y0, Math.PI], [y1, 0]]) {
    const centre = add(x, cy, depth);
    let previous = null;
    for (let ring = 1; ring <= 12; ring += 1) {
      const rho = mouth * ring / 12; const current = [];
      for (let i = 0; i <= capSteps; i += 1) {
        const angle = start + Math.PI * i / capSteps;
        current.push(add(x + rho * Math.cos(angle), cy + rho * Math.sin(angle), atDepth(rho)));
        if (!i) continue;
        if (!previous) triangles.push([centre, current[i - 1], current[i]]);
        else triangles.push([previous[i - 1], current[i - 1], current[i]], [previous[i - 1], current[i], previous[i]]);
      }
      previous = current;
    }
  }
  if (horizontal) triangles.forEach((t) => { [t[1], t[2]] = [t[2], t[1]]; });
  return { profile, surface: { vertices, triangles } };
}

function makeGrooves(outline, config, depthStart) {
  const flute = config.grooveCutter === 'ballnose';
  const vee = config.grooveCutter === 'v';
  const horizontal = config.grooveDirection === 'horizontal';
  const transform = horizontal ? ([x, y]) => [y, x] : ([x, y]) => [x, y];
  const local = ccw(outline.map(transform));
  const b = bounds(local);
  const depth = config.grooveDepthMm;
  const radius = flute ? config.fluteDiameterMm / 2 : null;
  const width = flute ? 2 * Math.sqrt(depth * (config.fluteDiameterMm - depth)) : config.grooveWidthMm;
  if (!(width > EPS) || b.x2 - b.x1 < width - EPS) return { problem: problem('FRONT_DECORATION_TOO_SMALL', 'The front is too narrow for one complete groove and its margins.') };
  if (config.groovePitchMm <= width + EPS) return { problem: problem('FRONT_DECORATION_PITCH', 'Groove pitch must be larger than the actual groove opening width.') };
  const count = Math.floor((b.x2 - b.x1 - width + EPS) / config.groovePitchMm) + 1;
  if (count > MAX_OPERATIONS - 1) return { problem: problem('FRONT_DECORATION_LIMIT', `The recipe exceeds ${MAX_OPERATIONS - 1} grooves on one front.`) };
  const centre = (b.x1 + b.x2) / 2;
  const first = centre - (count - 1) * config.groovePitchMm / 2;
  const operations = [];
  for (let i = 0; i < count; i += 1) {
    const x = first + i * config.groovePitchMm;
    const left = intervalAtX(local, x - width / 2); const right = intervalAtX(local, x + width / 2);
    if (!left || !right) return { problem: problem('FRONT_DECORATION_TOO_SMALL', 'A complete groove does not fit inside the cut front.') };
    const bottom = Math.max(left[0], right[0]); const top = Math.min(left[1], right[1]);
    if (top - bottom <= width + EPS) return { problem: problem('FRONT_DECORATION_TOO_SMALL', 'A complete stopped groove does not fit below this slope.') };
    const y0 = bottom + width / 2; const y1 = top - width / 2;
    const points = ccw(capsule(x, y0, y1, width / 2).map(transform));
    if (!contains(outline, points)) return { problem: problem('FRONT_DECORATION_OUTSIDE', 'A groove would cross the cut front outline.') };
    const op = pocket(`groove-${i + 1}`, points, depthStart + depth, depthStart, Math.min(6, width));
    if (vee) {
      // T76 F4 · the owner's V (31.08.2026): its width at the mouth and its
      // depth, both recorded; the vector is the centre line CAM follows.
      const mouth = width / 2;
      const section = grooveSurface({
        x, y0, y1, depth, mouth, transform, horizontal, base: depthStart,
        atDepth: (rho) => Math.max(0, depth * (1 - Math.abs(rho) / mouth)),
      });
      Object.assign(op, {
        kind: 'vgroove', centreline: [point(transform([x, y0])), point(transform([x, y1]))],
        tool: { kind: 'v' },
        layer: operationLayer('VGROOVE', depthStart + depth, depthStart, width, 'W'),
        crossSection: { kind: 'v', width: round(width), depth, profile: section.profile },
        surface: section.surface,
      });
    } else if (flute) {
      const section = grooveSurface({
        x, y0, y1, depth, mouth: width / 2, transform, horizontal,
        atDepth: (rho) => Math.max(0, Math.sqrt(Math.max(0, radius * radius - rho * rho)) - (radius - depth)),
      });
      Object.assign(op, {
        kind: 'flute', centreline: [point(transform([x, y0])), point(transform([x, y1]))],
        tool: { kind: 'ballnose', diameter: config.fluteDiameterMm },
        layer: operationLayer('FLUTE', depth, 0, config.fluteDiameterMm),
        crossSection: { kind: 'circular', radius, width: round(width), depth, profile: section.profile },
        surface: section.surface,
      });
    }
    operations.push(op);
  }
  return { operations };
}

// T76 F4 · the owner, 31.08.2026: a SEMICIRCULAR head, its rise half the
// inner width. *"A leaf narrower than the rise allows is refused in words,
// never squashed to an ellipse."*  The ratio GPT scaled by is gone with it.
function makeArch(inner) {
  const b = bounds(inner); const width = b.x2 - b.x1; const height = b.y2 - b.y1;
  const rise = width / 2;
  if (height <= rise + EPS) {
    return {
      problem: problem('FRONT_DECORATION_ARCH', `A semicircular arch rises half the inner width, ${round(rise)} mm here, `
        + `and this leaf gives ${round(height)} mm of inner height. The arch is never squashed to an ellipse: `
        + 'choose another style for this leaf, or a taller one.'),
    };
  }
  const shoulder = b.y2 - rise; const cx = (b.x1 + b.x2) / 2;
  const points = [[b.x1, b.y1], [b.x2, b.y1], [b.x2, shoulder]];
  const steps = halfCurveSteps(Math.max(width / 2, rise), 48);
  for (let i = 1; i <= steps; i += 1) {
    const a = Math.PI * i / steps;
    points.push([cx + width / 2 * Math.cos(a), shoulder + rise * Math.sin(a)]);
  }
  if (!contains(inner, points)) return { points: [] };
  return { points: roundedPolygon(points, 3) };
}

function makeMouldings(panel, outline, c) {
  const b = bounds(outline); const rectangleArea = (b.x2 - b.x1) * (b.y2 - b.y1);
  if (Math.abs(area(outline) - rectangleArea) > 0.001) return null;
  const x1 = b.x1 + c.mouldingInsetMm; const x2 = b.x2 - c.mouldingInsetMm;
  const y1 = b.y1 + c.mouldingInsetMm; const y2 = b.y2 - c.mouldingInsetMm; const w = c.mouldingWidthMm;
  if (x2 - x1 <= 2 * w + 6 || y2 - y1 <= 2 * w + 6) return [];
  const strips = [
    ['bottom', [[x1, y1], [x2, y1], [x2 - w, y1 + w], [x1 + w, y1 + w]], x2 - x1],
    ['right', [[x2, y1], [x2, y2], [x2 - w, y2 - w], [x2 - w, y1 + w]], y2 - y1],
    ['top', [[x2, y2], [x1, y2], [x1 + w, y2 - w], [x2 - w, y2 - w]], x2 - x1],
    ['left', [[x1, y2], [x1, y1], [x1 + w, y1 + w], [x1 + w, y2 - w]], y2 - y1],
  ];
  return strips.map(([id, points, length]) => ({
    id: `moulding-${id}`, kind: 'moulding', face: 'front', parentFrontId: panel.id,
    points: ccw(points).map(point), width: w, thickness: c.mouldingProjectionMm,
    projection: c.mouldingProjectionMm, length, mitreStart: c.mitreDeg, mitreEnd: c.mitreDeg,
    layer: 'FRONT_REFERENCE_NO_CUT',
    cutOutline: [[0, 0], [length, 0], [length - w, w], [w, w]],
    cut: { length, width: w, thickness: c.mouldingProjectionMm, outline: [[0, 0], [length, 0], [length - w, w], [w, w]] },
    mitres: { start: c.mitreDeg, end: c.mitreDeg },
    construction: 'applied-rectangular-strip',
  }));
}

function distanceToSegment(p, a, b) {
  const dx = b[0] - a[0]; const dy = b[1] - a[1];
  const dot = dx * dx + dy * dy;
  const t = dot > EPS ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / dot)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

function circleTouchesPolygon(centre, radius, polygon) {
  if (contains(polygon, [centre])) return true;
  return polygon.some((p, i) => distanceToSegment(centre, p, polygon[(i + 1) % polygon.length]) <= radius + EPS);
}

function polygonsOverlap(a, b) {
  // Separating axis test for convex polygons. The emitted recipes are convex.
  for (const points of [a, b]) {
    for (let i = 0; i < points.length; i += 1) {
      const p = points[i]; const q = points[(i + 1) % points.length];
      const axis = [p[1] - q[1], q[0] - p[0]];
      const aa = a.map((v) => v[0] * axis[0] + v[1] * axis[1]);
      const bb = b.map((v) => v[0] * axis[0] + v[1] * axis[1]);
      if (Math.max(...aa) < Math.min(...bb) - EPS || Math.max(...bb) < Math.min(...aa) - EPS) return false;
    }
  }
  return true;
}

/** Validate opposing machining after the cabinet has placed its hardware. */
export function validateFrontDecoration({ panel, decoration, drills = [], profile = getCabinetProfile() }) {
  if (!decoration || decoration.status === 'blocked') return decoration?.problems || [];
  const problems = []; const thickness = Number(panel?.thickness);
  const MIN_SKIN = minSkinOf(profile);
  for (const drill of drills) {
    if (drill.panel && drill.panel !== panel.id) continue;
    const depth = Number(drill.depth) > 0 ? Number(drill.depth) : machiningFor(drill.layer, profile).depth;
    if (Number.isFinite(depth) && depth > 0 && depth < thickness - EPS) continue;
    const centre = [Number(drill.x), Number(drill.y)];
    const radius = Number(drill.d ?? drill.diameter) / 2;
    if (!centre.every(Number.isFinite) || !(radius > 0) || !Number.isFinite(radius)) continue;
    // Through bores are independent operations and the solid clips every
    // intersected floor and step. Applied strips still need their own holes.
    if (decoration.additions.some((strip) => circleTouchesPolygon(centre, radius, strip.points))) {
      problems.push(problem('FRONT_DECORATION_MOULDING_BORE', 'A through handle hole overlaps an applied moulding strip. Move the handle or change the moulding inset.'));
    }
  }
  for (const op of decoration.operations) {
    if (skinShort(thickness, op.depth, profile)) {
      problems.push(problem('FRONT_DECORATION_SKIN', `${op.id} leaves less than ${MIN_SKIN} mm of front material.`));
    }
    for (const drill of drills) {
      if (drill.panel && drill.panel !== panel.id) continue;
      if (drill.kind === 'handle' || drill.face === 'front') continue;
      const depth = Number(drill.depth) > 0 ? Number(drill.depth) : machiningFor(drill.layer, profile).depth;
      if (!(depth > 0) || !Number.isFinite(depth) || depth >= thickness - EPS) continue;
      const radius = Number(drill.d ?? drill.diameter) / 2;
      if (!(radius > 0) || !Number.isFinite(radius)) continue;
      if (!skinShort(thickness - depth, op.depth, profile)) continue;
      if (circleTouchesPolygon([Number(drill.x), Number(drill.y)], radius, op.points)) {
        problems.push(problem('FRONT_DECORATION_BACK_BORE', `${op.id} conflicts with the back ${drill.kind || 'bore'} or leaves less than ${MIN_SKIN} mm between cuts.`));
      }
    }
  }
  const j = panel?.cnc?.jpull;
  if (j?.edge && j.profile) {
    const b = bounds(decoration.outline);
    const reach = Math.max(Number(j.profile.slotDepth) || 0, Number(j.profile.reliefMm) || 0) + (Number(j.profile.slotR) || 0);
    const ramp = Number(j.profile.rampR) || 0;
    const from = Number.isFinite(Number(j.from)) ? Number(j.from) - ramp : b.y1;
    const to = Number.isFinite(Number(j.to)) ? Number(j.to) + ramp : b.y2;
    const band = j.edge === 'L' ? rect(b.x1, from, b.x1 + reach, to)
      : j.edge === 'R' ? rect(b.x2 - reach, from, b.x2, to)
        : ['T', 'TOP'].includes(j.edge) ? rect(b.x1, b.y2 - reach, b.x2, b.y2) : null;
    if (band && [...decoration.operations, ...decoration.additions].some((item) => polygonsOverlap(item.points, band))) {
      problems.push(problem('FRONT_DECORATION_JPULL', 'The decoration enters the J-pull machining zone. Increase its frame or margin.'));
    }
  }
  return problems;
}

/**
 * T76 F7 · the skin rule asked of a BOARD before any leaf is cut. The walk
 * found retail's doors (18 to 20 mm) cannot take the owner's arch (an 18 mm
 * recess and the 3 mm skin under it): the recipe is not shrunk and the door
 * is not swapped, so a caller that offers styles asks this first and says
 * the answer in words. The recipe's deepest cut is its recess and the groove
 * below it (GF), or its groove alone (G, FL); applied strips cut nothing.
 *
 * @returns {{code, message, needMm, haveMm}|null}
 */
export function boardRefusal(style, thicknessMm, profile = getCabinetProfile(), recipe = recipeOf(style, profile)) {
  // T77 F4 · the one function (`engine/frontBoard.js`), for A/AH and Ornate
  // alike; `recipe` is a leaf's own numbers where a caller has them.
  return recipeOf(style, profile) ? boardShortfall(style, thicknessMm, recipe, profile) : null;
}

/** The one canonical record read by CNC, 3D, BOM and drawings. */
export function buildFrontDecoration({ panel, config, style = config?.style, drills = [], profile = getCabinetProfile() }) {
  if (ORNATE_STYLE_IDS.includes(style)) {
    if (!config) return null;
    const ornate = buildOrnateFront({ panel, config, style, profile });
    if (ornate?.status === 'ready') {
      const problems = validateFrontDecoration({ panel, decoration: ornate, drills, profile });
      if (problems.length) return { ...ornate, status: 'blocked', operations: [], additions: [], problems: [...ornate.problems, ...problems] };
    }
    return ornate;
  }
  const parameters = normaliseFrontDecoration(config, style, profile);
  if (!parameters) return null;
  // T76 F4 · `advisories` are said by the Check and block nothing (the board
  // thinner than the recipe's); `problems` stay GPT's refusals.
  const result = {
    version: 1, style, face: 'front', parameters, outline: [], thickness: Number(panel?.thickness),
    operations: [], additions: [], problems: [], advisories: [], status: 'ready',
  };
  const fail = (p) => {
    result.problems.push(p); result.status = 'blocked'; result.operations = []; result.additions = [];
    return result;
  };
  const recipe = recipeOf(style, profile);
  if (!recipe) return fail(problem('FRONT_DECORATION_STYLE', 'This decorative front recipe is not supported.'));
  if (parameters.version !== 1) return fail(problem('FRONT_DECORATION_VERSION', 'This decorative front recipe version is not supported.'));
  for (const [key, fallback] of Object.entries(recipe)) {
    const value = parameters[key];
    if (typeof fallback === 'number' && (!Number.isFinite(value) || value <= 0)) return fail(problem('FRONT_DECORATION_PARAMETER', `${key} must be a finite positive number.`));
  }
  if (parameters.grooveDirection && !['vertical', 'horizontal'].includes(parameters.grooveDirection)) return fail(problem('FRONT_DECORATION_DIRECTION', 'Choose vertical or horizontal grooves.'));
  if (GROOVE_CUTTERS[style] && !GROOVE_CUTTERS[style].includes(parameters.grooveCutter)) {
    return fail(problem('FRONT_DECORATION_CUTTER', `${style} grooves are cut with ${GROOVE_CUTTERS[style].join(' or ')}, not ${parameters.grooveCutter}.`));
  }
  if (style === 'AM' && parameters.mitreDeg !== 45) return fail(problem('FRONT_DECORATION_MITRE', 'Four strips close a rectangle only with 45 degree mitres.'));
  if (style === 'FL' && parameters.grooveDepthMm > parameters.fluteDiameterMm / 2) return fail(problem('FRONT_DECORATION_FLUTE', 'Flute depth cannot exceed the ballnose radius.'));
  const width = Number(panel?.cnc?.drawn_w ?? panel?.w); const height = Number(panel?.cnc?.drawn_h ?? panel?.h);
  if (![width, height, result.thickness].every((v) => Number.isFinite(v) && v > 0 && v <= 100000)) return fail(problem('FRONT_DECORATION_PANEL', 'The front needs finite positive dimensions no greater than 100000 mm.'));
  const raw = panel?.cnc?.outline || rect(0, 0, width, height);
  if (!Array.isArray(raw) || raw.length > 512 || raw.some((p) => !Array.isArray(p) || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || (p[2] && Math.abs(p[2]) > EPS))) return fail(problem('FRONT_DECORATION_OUTLINE', 'This decoration needs a finite straight-segment front outline.'));
  const outline = ccw(cleanPolygon(raw.map((p) => [p[0], p[1]])));
  result.outline = outline.map(point);
  if (!convexPolygon(outline)) return fail(problem('FRONT_DECORATION_OUTLINE', 'This decoration needs a simple convex front outline; the custom cut cannot be offset safely.'));
  if (style === 'AM') {
    const additions = makeMouldings(panel, outline, parameters);
    if (additions === null) return fail(problem('FRONT_DECORATION_MOULDING_SLOPE', 'Applied moulding currently requires a rectangular front; this outline needs its own mitre recipe.'));
    if (!additions.length) return fail(problem('FRONT_DECORATION_TOO_SMALL', 'The front is too small for the moulding width and inset.'));
    result.additions = additions;
  } else {
    let inner = outline;
    if (parameters.frameMm) {
      inner = insetPolygon(outline, parameters.frameMm);
      if (!inner.length) return fail(problem('FRONT_DECORATION_TOO_SMALL', 'The frame leaves no inner panel on this cut front.'));
      const b = bounds(inner);
      if (b.x2 - b.x1 < 12 || b.y2 - b.y1 < 12) return fail(problem('FRONT_DECORATION_TOO_SMALL', 'The frame must leave at least 12 mm of inner panel in both directions.'));
      const arch = ['A', 'AH'].includes(style) ? makeArch(inner) : null;
      if (arch?.problem) return fail(arch.problem);
      const points = arch ? arch.points : roundedPolygon(inner, 3);
      if (!points.length) return fail(problem('FRONT_DECORATION_TOO_SMALL', 'The complete recessed pattern does not fit inside this cut front.'));
      result.operations.push(pocket('panel-recess', points, parameters.recessDepthMm));
    }
    if (['G', 'GF', 'FL'].includes(style)) {
      const grooveRegion = insetPolygon(inner, parameters.grooveInsetMm);
      if (!grooveRegion.length) return fail(problem('FRONT_DECORATION_TOO_SMALL', 'The groove margins leave no usable front area.'));
      const grooves = makeGrooves(grooveRegion, parameters, parameters.recessDepthMm || 0);
      if (grooves.problem) return fail(grooves.problem);
      result.operations.push(...grooves.operations);
    }
  }
  const validation = validateFrontDecoration({ panel, decoration: result, drills, profile });
  if (validation.length) {
    result.problems.push(...validation); result.status = 'blocked'; result.operations = []; result.additions = [];
    return result;
  }
  // T76 F4 · the owner's arched recipe is drawn for a 30 board. On a thinner
  // front it still cuts (the skin rule above holds) and the Check says so in
  // words: the recipe is not shrunk and the material is not swapped.
  if (Number.isFinite(parameters.boardMm) && result.thickness < parameters.boardMm - EPS) {
    const left = round(result.thickness - (parameters.recessDepthMm || 0));
    result.advisories.push(problem('FRONT_DECORATION_BOARD', `${style} is drawn for a ${parameters.boardMm} mm board and this front is `
      + `${result.thickness} mm: the ${parameters.recessDepthMm} mm recess leaves ${left} mm. Assign a ${parameters.boardMm} mm `
      + 'front material, or keep this board by decision.'));
  }
  return result;
}
