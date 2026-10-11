// Ornate A: one canonical, sculpted 2.5D target surface for preview and CAM.
// All coordinates are the existing CNC BACK datum, millimetres, y up.
// The third surface coordinate is POSITIVE DEPTH below the original FRONT.
// It is a depth scalar, not spatial z. Consumers use z = frontZ - depth and
// preserve the existing frontDecorationSolid winding convention.
// No THREE, canvas, bitmap, silhouette overlays or separately floating petals.

import { getCabinetProfile } from './profile.js';
import { boardShortfall, deepestCutMm, minSkinOf } from './frontBoard.js';

export const ORNATE_STYLE_IDS = Object.freeze(['ORNATE_A_1', 'ORNATE_A_2', 'ORNATE_A_3', 'ORNATE_A_4']);
const EPS = 1e-7;
const MAX_PANEL_MM = 5000;
const MAX_VERTICES = 110000;

// ─── T77 F3 · THE SAMPLING NUMBERS LEFT THIS FILE ───────────────────────────
// CLAUDE.md T77 F3: *"RELIEF_SAMPLE_MM, SURFACE_CHORD_MM and CHORD_ERROR_MM
// move from constants in engine/ornateFront.js into
// profile.front.decoration.ornateReference ... The 3D solid keeps the finer
// sampling it has (its own number), the EXPORT reads the profile."*
// Three LEVELS of one surface, each read off the profile handed in (the
// active workshop profile where it names none):
//   'solid'      the canonical record the 3D solid, the drawings and the CNC
//                preview read: `front.decoration.ornateSolid`, GPT's numbers
//                (1.0 relief, 2.0 chord, 0.06 chord error), its own, so no
//                export option can ever thin or block what the 3D shows;
//   'reference'  the default CNC reference files: `ornateReference.sampleMm`
//                with `chordMm` and `chordErrorMm`;
//   'full'       the same at `ornateReference.fullSampleMm`.
// The two export levels are built LEAN: a sample on a straight side whose
// column carries no relief, and whose neighbours carry none, lies on the plane
// its neighbours already span, so it is left out. Nothing else changes: the
// same function, the same law, the same surface, fewer collinear points.
const decorationOf = (profile) => profile?.front?.decoration || {};
const activeDecoration = () => decorationOf(getCabinetProfile());
/** One level's three sampling numbers (mm), and whether it is built lean. */
export function ornateSampling(profile, level = 'solid') {
  const pick = (block, key) => {
    const own = decorationOf(profile)[block]?.[key];
    return Number(own ?? activeDecoration()[block]?.[key]);
  };
  if (level === 'solid') {
    return { level, sampleMm: pick('ornateSolid', 'sampleMm'), chordMm: pick('ornateSolid', 'chordMm'),
      chordErrorMm: pick('ornateSolid', 'chordErrorMm'), lean: false };
  }
  return { level: level === 'full' ? 'full' : 'reference',
    sampleMm: pick('ornateReference', level === 'full' ? 'fullSampleMm' : 'sampleMm'),
    chordMm: pick('ornateReference', 'chordMm'), chordErrorMm: pick('ornateReference', 'chordErrorMm'), lean: true };
}
const round = (n) => Math.round(n * 1e7) / 1e7;
const clone = (value) => Array.isArray(value) ? value.map(clone)
  : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)])) : value;
const numeric = (v) => typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
const recipeOf = (style, profile) => ORNATE_STYLE_IDS.includes(style) ? profile?.front?.decoration?.[style] : null;
const clamp = (v, low = 0, high = 1) => Math.max(low, Math.min(high, v));
const smooth = (v) => { const t = clamp(v); return t * t * (3 - 2 * t); };
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const signedArea = (points) => points.reduce((sum, p, i) => {
  const q = points[(i + 1) % points.length]; return sum + p[0] * q[1] - q[0] * p[1];
}, 0) / 2;
const ccw = (points) => signedArea(points) < 0 ? [...points].reverse() : points;
const same = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < EPS;
const cleaned = (points) => points.filter((p, i) => !same(p, points[(i + points.length - 1) % points.length]));
const insideConvex = (points, p) => points.every((a, i) => {
  const b = points[(i + 1) % points.length];
  return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= -EPS;
});

export function defaultOrnateConfig(style, profile = getCabinetProfile()) {
  const recipe = recipeOf(style, profile);
  return recipe ? { version: 1, style, ...clone(recipe) } : null;
}

/** Deep-copy arrays and retain invalid values for an explicit refusal. */
export function normaliseOrnateConfig(config, style = config?.style, profile = getCabinetProfile()) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return null;
  const recipe = recipeOf(style, profile);
  if (!recipe) return { ...clone(config), version: config.version ?? 1, style };
  const out = { version: config.version ?? 1, style };
  for (const [key, fallback] of Object.entries(recipe)) {
    const value = Object.hasOwn(config, key) ? config[key] : fallback;
    out[key] = typeof fallback === 'number' ? numeric(value)
      : Array.isArray(fallback) ? (Array.isArray(value) ? Array.from(value, numeric) : clone(value)) : clone(value);
  }
  return out;
}

// Corner order: bottom-left, bottom-right, top-right, top-left in FRONT view.
// Keeping identical sampling on all moulding contours joins them without gaps.
function roundedRectangle(width, height, inset, radii, steps, edgeFractions = [[], [], [], []]) {
  const x0 = inset; const y0 = inset; const x1 = width - inset; const y1 = height - inset;
  const centres = [[x0 + radii[0], y0 + radii[0]], [x1 - radii[1], y0 + radii[1]],
    [x1 - radii[2], y1 - radii[2]], [x0 + radii[3], y1 - radii[3]]];
  const points = [];
  for (let corner = 0; corner < 4; corner += 1) {
    const start = Math.PI + corner * Math.PI / 2;
    for (let i = 0; i <= steps[corner]; i += 1) {
      const a = start + Math.PI / 2 * i / steps[corner];
      points.push([centres[corner][0] + radii[corner] * Math.cos(a), centres[corner][1] + radii[corner] * Math.sin(a)]);
    }
    const end = points.at(-1); const next = (corner + 1) % 4;
    const nextAngle = Math.PI + next * Math.PI / 2;
    const nextPoint = [centres[next][0] + radii[next] * Math.cos(nextAngle), centres[next][1] + radii[next] * Math.sin(nextAngle)];
    for (const t of edgeFractions[corner]) points.push([end[0] + (nextPoint[0] - end[0]) * t, end[1] + (nextPoint[1] - end[1]) * t]);
  }
  return points;
}

function meshBuilder() {
  const vertices = []; const triangles = []; const index = new Map();
  const vertex = (p) => {
    const rounded = p.map(round); const key = rounded.join(',');
    if (index.has(key)) return index.get(key);
    const n = vertices.length; vertices.push(rounded); index.set(key, n); return n;
  };
  const triangle = (a, b, c) => {
    const p = vertices[a]; const q = vertices[b]; const r = vertices[c];
    const cross = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    if (Math.abs(cross) <= EPS || a === b || b === c || c === a) return;
    triangles.push(cross > 0 ? [a, b, c] : [a, c, b]);
  };
  const ring = (points, depthAt) => points.map((p, i) => vertex([p[0], p[1], depthAt(p, i)]));
  const join = (outer, inner) => {
    for (let i = 0; i < outer.length; i += 1) {
      const j = (i + 1) % outer.length;
      triangle(outer[i], outer[j], inner[j]); triangle(outer[i], inner[j], inner[i]);
    }
  };
  return { vertices, triangles, vertex, triangle, ring, join };
}

// A leaf is an actual arched/ridged lamina in the same carved surface.
// Its outline is a tapered curved spindle. The crease down its centre and
// the slight left/right asymmetry are heights, not painted lines.
function leaf(origin, tip, width, bend, height = 1) {
  const dx = tip[0] - origin[0]; const dy = tip[1] - origin[1]; const length = Math.hypot(dx, dy);
  const u = [dx / length, dy / length]; const v = [-u[1], u[0]];
  const at = (t) => [origin[0] + dx * t + v[0] * bend * Math.sin(Math.PI * t),
    origin[1] + dy * t + v[1] * bend * Math.sin(Math.PI * t)];
  const outline = [];
  for (let side = -1; side <= 1; side += 2) {
    for (let n = 0; n <= 20; n += 1) {
      const t = side < 0 ? n / 20 : 1 - n / 20; const c = at(t);
      const spread = width * Math.sin(Math.PI * t);
      outline.push([c[0] + v[0] * spread * side, c[1] + v[1] * spread * side]);
    }
  }
  return {
    outline: cleaned(outline),
    ridge: Array.from({ length: 21 }, (_, i) => at(i / 20)),
    heightAt: (p) => {
      const t = ((p[0] - origin[0]) * u[0] + (p[1] - origin[1]) * u[1]) / length;
      if (t <= 0 || t >= 1) return 0;
      const c = at(t); const side = (p[0] - c[0]) * v[0] + (p[1] - c[1]) * v[1];
      const spread = width * Math.sin(Math.PI * t); const s = Math.abs(side / spread);
      if (s >= 1) return 0;
      const ridgeNotch = 1 - 0.2 * Math.exp(-Math.pow(side / (width * 0.09), 2));
      return height * Math.pow(Math.sin(Math.PI * t), 0.55) * Math.pow(1 - s * s, 0.6) * ridgeNotch;
    },
  };
}

function floralMotif() {
  const leaves = []; const centre = [34, 34];
  for (let i = 0; i < 11; i += 1) {
    const angle = 2 * Math.PI * i / 11; const cos = Math.cos(angle); const sin = Math.sin(angle);
    leaves.push(leaf([centre[0] + cos * 7, centre[1] + sin * 7],
      [centre[0] + cos * 28, centre[1] + sin * 28], 4.7, i % 2 ? 1.2 : -1.2));
  }
  // Two leafy sprays follow the corner, tied into the central flower.
  for (const transpose of [false, true]) {
    for (const [origin, tip, w, bend] of [
      [[49, 29], [87, 11], 5.2, 2], [[59, 28], [100, 26], 6.6, -3],
      [[82, 21], [120, 9], 4.8, 2], [[87, 25], [123, 36], 5.4, -2],
      [[108, 20], [145, 16], 4, 1],
    ]) {
      const swap = (p) => transpose ? [p[1], p[0]] : p;
      leaves.push(leaf(swap(origin), swap(tip), w, transpose ? -bend : bend, 0.83));
    }
  }
  const disc = Array.from({ length: 48 }, (_, i) => [centre[0] + 8 * Math.cos(i * Math.PI / 24), centre[1] + 8 * Math.sin(i * Math.PI / 24)]);
  return {
    outlines: [...leaves.map((l) => l.outline), disc], ridges: leaves.map((l) => l.ridge),
    heightAt: (p) => {
      let value = 0;
      for (const l of leaves) value = Math.max(value, l.heightAt(p));
      const r = Math.hypot(p[0] - centre[0], p[1] - centre[1]);
      if (r < 8) value = Math.max(value, Math.sqrt(Math.max(0, 1 - r * r / 64)));
      return value;
    },
  };
}

const MOTIF = floralMotif();

// ─── T77 F6 · THE ORNAMENT IS A PLACEHOLDER UNTIL THE OWNER'S MODEL ARRIVES ──
// CLAUDE.md T77 F6: *"The ornament enters the engine through ONE function
// (ornamentSurface(variant, config, profile) in engine/ornateFront.js ...).
// Beside it a slot the owner fills: reference/hardware/ornate/README.md ...
// and the profile key front.decoration.ornateReference.ornamentModel = null.
// While it is null, the procedural ornament stands, labelled in the BOM
// sentence and the JSON as ornament: 'procedural placeholder'. When a model
// is named, the SAME function returns the model's surface and the label
// changes. Loading the model is NOT this turn; only the slot, the label and
// the README are."*
// So a named model is refused here in words, never silently swapped for the
// placeholder: what is cut must be what the label says.
export const ORNAMENT_PLACEHOLDER = 'procedural placeholder';
export function ornamentSurface(variant, config, profile = getCabinetProfile()) {
  if (variant === 4 || config?.ornament !== true) return { label: 'none', outlines: [], ridges: [], heightAt: () => 0 };
  const own = decorationOf(profile).ornateReference;
  const model = own && Object.hasOwn(own, 'ornamentModel') ? own.ornamentModel
    : (activeDecoration().ornateReference?.ornamentModel ?? null);
  if (model === null || model === undefined || model === '') {
    return { label: ORNAMENT_PLACEHOLDER, outlines: MOTIF.outlines, ridges: MOTIF.ridges, heightAt: MOTIF.heightAt };
  }
  return {
    label: String(model),
    problem: {
      code: 'ORNATE_ORNAMENT_MODEL',
      message: `The profile names the ornament model "${model}", and reading an ornament model is not built yet: `
        + 'set front.decoration.ornateReference.ornamentModel to null to cut the procedural placeholder '
        + '(reference/hardware/ornate/README.md).',
    },
  };
}

/** Build canonical surface. A valid design is still a PROPOSED reference. */
export function buildOrnateFront({ panel, config, style = config?.style, profile = getCabinetProfile(), level = 'solid' }) {
  const parameters = normaliseOrnateConfig(config, style, profile);
  if (!parameters) return null;
  const result = {
    version: 1, style, face: 'front', parameters, outline: [], thickness: Number(panel?.thickness),
    operations: [], additions: [], problems: [], advisories: [], status: 'ready',
    referenceOnly: true, productionApproval: 'proposed-reference', ornament: null,
    approval: { status: 'proposed', productionApproved: false },
    coordinateSystem: 'cnc-back-mm-depth-positive',
    designInterpretation: 'Procedural interpretation of the 10 October 2026 concept board. The outer frame and the total inner moulding band are separate dimensions. Four smooth profile bands terminate at the proposed depth levels. Floral relief is sculpted from the same board; it is not a scan or a production-approved reproduction. Variant 2 uses true semicircular ends fitted to its clear width.',
  };
  const fail = (code, message, extra = {}) => {
    result.status = 'blocked'; result.operations = []; result.problems.push({ code, message, ...extra }); return result;
  };
  if (!recipeOf(style, profile)) return fail('ORNATE_PROFILE', 'This workshop profile has no Ornate A recipe.');
  if (parameters.version !== 1) return fail('ORNATE_VERSION', 'This Ornate A recipe version is not supported.');
  const c = parameters;
  if (!Number.isInteger(c.variant) || c.variant !== ORNATE_STYLE_IDS.indexOf(style) + 1) return fail('ORNATE_VARIANT', 'The selected style and its variant do not match.');
  if (typeof c.mirror !== 'boolean' || typeof c.ornament !== 'boolean') return fail('ORNATE_BOOLEAN', 'Mirror and ornament settings must be booleans.');
  if (c.variant === 4 && c.ornament) return fail('ORNATE_VARIANT', 'Variant 4 is the version without an ornament.');
  // T77 F6 · the ornament, through its one function, named on the record as
  // soon as the variant is known: a relief refused further down (a board too
  // thin, radii that do not fit) still says which ornament it carries (the
  // walk found the label missing on a refused leaf, T77 F7).
  const ornament = ornamentSurface(c.variant, c, profile);
  result.ornament = ornament.label;
  if (ornament.problem) return fail(ornament.problem.code, ornament.problem.message);
  for (const key of ['boardMm', 'referenceWidthMm', 'referenceHeightMm', 'outerFrameMm', 'innerFrameMm', 'innerRadiusMm', 'secondaryRadiusMm', 'cornerDepthMm', 'ornamentReliefMm', 'ornamentScale']) {
    if (!(Number.isFinite(c[key]) && c[key] > 0)) return fail('ORNATE_PARAMETER', `${key} must be a finite positive number.`);
  }
  for (const key of ['stepWidthsMm', 'stepDepthsMm']) {
    if (!Array.isArray(c[key]) || c[key].length !== 4 || c[key].some((v) => !Number.isFinite(v) || v <= 0)) return fail('ORNATE_PROFILE_SECTION', `${key} must contain four finite positive numbers.`);
  }
  if (c.stepDepthsMm.some((d, i) => i && d <= c.stepDepthsMm[i - 1])) return fail('ORNATE_PROFILE_SECTION', 'The four absolute depth levels must increase strictly.');
  if (c.ornamentReliefMm >= c.cornerDepthMm) return fail('ORNATE_RELIEF', 'Floral relief must remain below the original face and within its recessed background.');
  const sampling = ornateSampling(profile, level);
  if (![sampling.sampleMm, sampling.chordMm, sampling.chordErrorMm].every((v) => Number.isFinite(v) && v > 0)) {
    return fail('ORNATE_SAMPLING', `The ${sampling.level} sampling of Ornate A (relief sample, chord and chord error in the profile) must be finite positive millimetres.`);
  }
  const { sampleMm: reliefSampleMm, chordMm, chordErrorMm } = sampling;
  const width = Number(panel?.cnc?.drawn_w ?? panel?.w); const height = Number(panel?.cnc?.drawn_h ?? panel?.h);
  if (![width, height, result.thickness].every((v) => Number.isFinite(v) && v > 0 && v <= MAX_PANEL_MM)) return fail('ORNATE_PANEL', `Ornate A needs finite positive dimensions no larger than ${MAX_PANEL_MM} mm.`);
  const raw = panel?.cnc?.outline || rect(0, 0, width, height);
  if (!Array.isArray(raw) || raw.length < 4 || raw.length > 512 || Array.from(raw).some((p) => !Array.isArray(p) || !Number.isFinite(p[0]) || !Number.isFinite(p[1])
    || (p.length > 2 && (!Number.isFinite(p[2]) || Math.abs(p[2]) > EPS)))) return fail('ORNATE_OUTLINE', 'Ornate A currently supports a rectangular front without arcs or slopes.');
  const outline = cleaned(raw.map((p) => [p[0], p[1]]));
  if (outline.length !== 4 || Math.abs(Math.abs(signedArea(outline)) - width * height) > EPS
    || outline.some(([x, y]) => !((Math.abs(x) < EPS || Math.abs(x - width) < EPS) && (Math.abs(y) < EPS || Math.abs(y - height) < EPS)))) return fail('ORNATE_OUTLINE', 'Ornate A currently supports the full rectangular front outline only; it cannot be squeezed into a slope.');
  result.outline = ccw(outline);
  // T77 F4 · the board is the leaf's own (the assigned material's), never the
  // board the drawing was made on (`boardMm`, 18): the one board rule of
  // `engine/frontBoard.js` (T76's for A/AH) refuses a board thinner than the
  // deepest step plus the skin, in its words, and is silent above it.
  const maxDepth = deepestCutMm(c);
  if (!(minSkinOf(profile) > 0)) return fail('ORNATE_SKIN', 'This workshop profile names no skin to leave under a decoration.');
  const thin = boardShortfall(style, result.thickness, c, profile);
  if (thin) return fail(thin.code, thin.message, { needMm: thin.needMm, haveMm: thin.haveMm });
  const profileWidth = c.stepWidthsMm.reduce((a, b) => a + b, 0);
  if (profileWidth >= c.innerFrameMm) return fail('ORNATE_PROFILE_FIT', 'The total profile width must be smaller than the inner moulding band so its corner background remains.');
  const innerInset = c.outerFrameMm + c.innerFrameMm;
  const innerW = width - 2 * innerInset; const innerH = height - 2 * innerInset;
  if (innerW <= 0 || innerH <= 0) return fail('ORNATE_TOO_SMALL', 'The two frame bands leave no inner panel at this front size.');
  const radii = c.variant === 2 ? [innerW / 2, innerW / 2, innerW / 2, innerW / 2]
    : [c.secondaryRadiusMm, c.innerRadiusMm, c.secondaryRadiusMm, c.innerRadiusMm];
  if (radii[0] + radii[1] > innerW + EPS || radii[2] + radii[3] > innerW + EPS
    || radii[0] + radii[3] > innerH + EPS || radii[1] + radii[2] > innerH + EPS) return fail('ORNATE_RADIUS_FIT', 'The specified corner radii do not fit this inner panel. Change the size or recipe; the radii are never silently clamped.');
  if (c.variant === 2 && innerH < innerW - EPS) return fail('ORNATE_CAPSULE_FIT', 'Variant 2 needs an inner height at least equal to its width for true semicircular ends.');
  const outerInset = innerInset - profileWidth;
  const activeCorners = c.variant === 2 ? [0, 1, 2, 3] : [1, 3];
  const outerRadii = radii.map((r, i) => activeCorners.includes(i) ? r + profileWidth : r);
  const steps = outerRadii.map((r) => Math.max(4, Math.ceil(Math.PI * r / (2 * chordMm)),
    Math.ceil((Math.PI / 2) / (2 * Math.acos(Math.max(-1, 1 - chordErrorMm / r))))));
  // T77 F3 · a finer sampling in the profile is refused before a contour is
  // built, not after a million points: the corner arcs of every ring of the
  // bands alone must fit the budget.
  const bandRows = c.stepWidthsMm.reduce((sum, w) => sum + Math.max(6, Math.ceil(w / chordMm)), 0);
  if (!steps.every(Number.isFinite) || steps.reduce((a, b) => a + b + 1, 0) * (bandRows + 2) > MAX_VERTICES) {
    return fail('ORNATE_COMPLEXITY', `This sampling would exceed the ${MAX_VERTICES} vertex limit. Use a coarser chord in the profile.`);
  }
  const motifReferenceRadius = c.referenceWidthMm / 2 - c.outerFrameMm - c.innerFrameMm;
  if (!(motifReferenceRadius > 0)) return fail('ORNATE_REFERENCE', 'The reference width must leave room for both frame bands.');
  // Refine the long straight sides where a floral spray can enter them. A
  // single side-spanning quad would interpolate a leaf tip across the panel.
  const edgeSpan = Math.max(...outerRadii) / motifReferenceRadius * 150 * c.ornamentScale;
  let edgeFractions = [width - 2 * c.outerFrameMm, height - 2 * c.outerFrameMm,
    width - 2 * c.outerFrameMm, height - 2 * c.outerFrameMm].map((length) => {
    const reach = Math.min(length / 2, edgeSpan); const count = Math.ceil(reach / chordMm);
    const fractions = [];
    for (let n = 1; n <= count; n += 1) {
      const t = reach * n / count / length;
      if (t > EPS && t < 1 - EPS) fractions.push(t, 1 - t);
    }
    return [...new Set(fractions.map(round))].sort((a, b) => a - b);
  });
  const contour = (inset, rr) => roundedRectangle(width, height, inset, rr, steps, edgeFractions);
  let outer = contour(c.outerFrameMm, [0, 0, 0, 0]);
  let mouth = contour(outerInset, outerRadii);
  const corners = [[c.outerFrameMm, c.outerFrameMm], [width - c.outerFrameMm, c.outerFrameMm],
    [width - c.outerFrameMm, height - c.outerFrameMm], [c.outerFrameMm, height - c.outerFrameMm]];
  const axes = [[[1, 0], [0, 1]], [[-1, 0], [0, 1]], [[-1, 0], [0, -1]], [[1, 0], [0, -1]]];
  const motifScale = (corner) => c.ornamentScale * outerRadii[corner] / motifReferenceRadius;
  // The original 600 mm plate sets a 180 mm outer corner radius. The divisor
  // derives that same radius from the profile's reference width and bands.
  const placements = c.ornament ? activeCorners.map((corner) => ({ corner, origin: corners[corner], axes: axes[corner], scale: motifScale(corner) })) : [];
  if (placements.some((p) => !(p.scale > 0) || p.scale > 4)) return fail('ORNATE_ORNAMENT_FIT', 'The reference ornament scale is not suitable for this corner.');
  const placedPoint = (placement, p) => [
    placement.origin[0] + placement.scale * (p[0] * placement.axes[0][0] + p[1] * placement.axes[1][0]),
    placement.origin[1] + placement.scale * (p[0] * placement.axes[0][1] + p[1] * placement.axes[1][1]),
  ];
  if (placements.some((placement) => ornament.outlines.some((points) => points.some((p) => {
    const q = placedPoint(placement, p);
    return q[0] < c.outerFrameMm - EPS || q[0] > width - c.outerFrameMm + EPS
      || q[1] < c.outerFrameMm - EPS || q[1] > height - c.outerFrameMm + EPS || insideConvex(mouth, q);
  })))) return fail('ORNATE_ORNAMENT_FIT', 'The complete floral ornament does not fit its corner background. Reduce the ornament scale or use another radius; the flower is never silently cropped.');
  let columnLengths = outer.map((p, i) => Math.hypot(p[0] - mouth[i][0], p[1] - mouth[i][1]));
  const available = MAX_VERTICES - (bandRows + 2) * outer.length - 1;
  if (available <= 0) return fail('ORNATE_COMPLEXITY', `This recipe would exceed the ${MAX_VERTICES} vertex limit. Reduce its dimensions or corner span.`);
  // Flat areas need only their exact boundary. Sample the botanical relief
  // densely, then retain those samples and their neighbours. This avoids
  // spending most of the budget on flat corners in the capsule variant.
  const radialSpacing = reliefSampleMm;
  if (columnLengths.reduce((a, b) => a + b, 0) / radialSpacing > MAX_VERTICES * 8) return fail('ORNATE_COMPLEXITY', 'The requested relief is too large for bounded surface sampling. Reduce its dimensions or corner span.');
  const mesh = meshBuilder();
  const reliefAt = (p) => {
    let highest = 0;
    for (const placement of placements) {
      const dx = p[0] - placement.origin[0]; const dy = p[1] - placement.origin[1];
      const local = placement.axes.map((axis) => (dx * axis[0] + dy * axis[1]) / placement.scale);
      if (local[0] < 0 || local[1] < 0 || local[0] > 150 || local[1] > 150) continue;
      highest = Math.max(highest, ornament.heightAt(local));
    }
    return highest;
  };
  if (sampling.lean) {
    // T77 F3 · the lean build. Each side's refinement is a column from the
    // frame to the mouth, sampled exactly as the columns below sample it; a
    // column is kept when it, or a neighbour, meets the relief. Every column
    // left out is flat and so are both its neighbours: on a straight side the
    // strip they bound is one plane (each ring of the bands is a straight
    // line there too), so the surface is the same with fewer points.
    const sideEnds = (inset, rr) => {
      const plain = roundedRectangle(width, height, inset, rr, steps);
      let at = 0;
      return [0, 1, 2, 3].map((side) => { at += steps[side] + 1; return [plain[at - 1], plain[at % plain.length]]; });
    };
    const outerEnds = sideEnds(c.outerFrameMm, [0, 0, 0, 0]);
    const mouthEnds = sideEnds(outerInset, outerRadii);
    const along = ([a, b], t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const meetsRelief = (side, t) => {
      const p = along(outerEnds[side], t); const q = along(mouthEnds[side], t);
      const count = Math.max(2, Math.ceil(Math.hypot(p[0] - q[0], p[1] - q[1]) / reliefSampleMm));
      for (let n = 0; n <= count; n += 1) {
        if (reliefAt([p[0] + (q[0] - p[0]) * n / count, p[1] + (q[1] - p[1]) * n / count]) > EPS) return true;
      }
      return false;
    };
    edgeFractions = edgeFractions.map((list, side) => {
      const meets = list.map((t) => meetsRelief(side, t));
      return list.filter((_, i) => meets[i] || meets[i - 1] || meets[i + 1]);
    });
    outer = contour(c.outerFrameMm, [0, 0, 0, 0]);
    mouth = contour(outerInset, outerRadii);
    columnLengths = outer.map((p, i) => Math.hypot(p[0] - mouth[i][0], p[1] - mouth[i][1]));
  }
  const columns = outer.map((p, i) => {
    const count = Math.max(2, Math.ceil(columnLengths[i] / radialSpacing));
    const positionAt = (t) => [p[0] + (mouth[i][0] - p[0]) * t, p[1] + (mouth[i][1] - p[1]) * t];
    const dense = Array.from({ length: count + 1 }, (_, n) => reliefAt(positionAt(n / count)));
    const keep = new Set([0, 0.015, 0.03, 0.045, 0.06, 0.075, 0.09, 0.91, 0.925, 0.94, 0.955, 0.97, 0.985, 1]);
    for (let n = 0; n <= count; n += 1) {
      if (dense[n] <= EPS) continue;
      for (let neighbour = Math.max(0, n - 2); neighbour <= Math.min(count, n + 2); neighbour += 1) keep.add(neighbour / count);
    }
    return [...keep].sort((a, b) => a - b).map((t) => {
      const q = positionAt(t);
      const edgeBlend = smooth(t / 0.09) * smooth((1 - t) / 0.09);
      return { t, index: mesh.vertex([...q, edgeBlend * (c.cornerDepthMm - c.ornamentReliefMm * reliefAt(q))]) };
    });
  });
  for (let column = 0; column < columns.length; column += 1) {
    const a = columns[column]; const b = columns[(column + 1) % columns.length]; let i = 0; let j = 0;
    while (i + 1 < a.length || j + 1 < b.length) {
      const nextA = i + 1 < a.length ? a[i + 1].t : Infinity;
      const nextB = j + 1 < b.length ? b[j + 1].t : Infinity;
      if (nextA <= nextB) { mesh.triangle(a[i].index, b[j].index, a[i + 1].index); i += 1; }
      else { mesh.triangle(a[i].index, b[j].index, b[j + 1].index); j += 1; }
    }
  }
  let previous = columns.map((column) => column.at(-1).index);
  const contours = []; let usedWidth = 0; let previousDepth = 0;
  for (let level = 0; level < 4; level += 1) {
    const band = c.stepWidthsMm[level]; const depth = c.stepDepthsMm[level];
    const samples = Math.max(6, Math.ceil(band / chordMm));
    for (let n = 1; n <= samples; n += 1) {
      const t = n / samples; const travel = usedWidth + band * t;
      const currentRadii = radii.map((r, i) => activeCorners.includes(i) ? r + profileWidth - travel : r);
      const points = contour(outerInset + travel, currentRadii);
      const current = mesh.ring(points, () => previousDepth + (depth - previousDepth) * smooth(t));
      mesh.join(previous, current); previous = current;
    }
    usedWidth += band;
    const currentRadii = radii.map((r, i) => activeCorners.includes(i) ? r + profileWidth - usedWidth : r);
    contours.push({ id: `ornate-profile-${level + 1}`, kind: 'profile-level', closed: true,
      points: cleaned(contour(outerInset + usedWidth, currentRadii)),
      depth, startDepth: previousDepth, widthMm: band, layer: `FRONT_REF_PROFILE_D${String(depth).replace('.', 'P')}`,
      role: 'target-surface-boundary-not-toolpath', readiness: 'geometry' });
    previousDepth = depth;
  }
  // Rounded rectangles/capsules are convex, so this exact boundary fan is safe.
  const centre = mesh.vertex([width / 2, height / 2, previousDepth]);
  for (let i = 0; i < previous.length; i += 1) mesh.triangle(previous[i], previous[(i + 1) % previous.length], centre);
  if (mesh.vertices.length > MAX_VERTICES) return fail('ORNATE_COMPLEXITY', `This detailed relief exceeds the ${MAX_VERTICES} vertex limit. Reduce its dimensions or corner span.`);
  for (const placement of placements) {
    const transform = (p) => placedPoint(placement, p);
    ornament.outlines.forEach((points, i) => contours.push({ id: `ornate-floral-${placement.corner}-${i}`, kind: 'ornament-reference',
      points: points.map(transform), closed: true, layer: 'FRONT_REF_ORNAMENT', depth: null,
      role: 'projected-relief-reference-not-toolpath', readiness: 'geometry' }));
    ornament.ridges.forEach((points, i) => contours.push({ id: `ornate-ridge-${placement.corner}-${i}`, kind: 'ornament-reference',
      points: points.map(transform), closed: false, layer: 'FRONT_REF_ORNAMENT', depth: null,
      role: 'projected-relief-reference-not-toolpath', readiness: 'geometry' }));
  }
  // Construct in FRONT view to match the board, then store BACK exactly once.
  // A user mirror changes the front design; the CNC datum conversion is separate.
  const toBack = (p) => [round(c.mirror ? p[0] : width - p[0]), round(p[1])];
  const vertices = mesh.vertices.map(([x, y, d]) => [...toBack([x, y]), d]);
  const triangles = c.mirror ? mesh.triangles : mesh.triangles.map(([a, b, d]) => [a, d, b]);
  result.operations.push({
    id: 'ornate-sculpted-front', kind: 'relief', face: 'front', points: ccw(cleaned(outer).map(toBack)),
    startDepth: 0, depth: maxDepth, tool: { kind: 'cam-selected' }, layer: 'FRONT_REF_RELIEF',
    readiness: 'geometry', referenceOnly: true, surface: { vertices, triangles },
    contours: contours.map((contour) => ({ ...contour, points: contour.closed ? ccw(contour.points.map(toBack)) : contour.points.map(toBack) })),
    crossSection: { kind: 'four-smooth-bands', widthsMm: [...c.stepWidthsMm], absoluteDepthsMm: [...c.stepDepthsMm] },
    targetSurface: { units: 'mm', depthDatum: 'original-front-face', depthDirection: 'positive-into-board',
      maxContourChordErrorMm: chordErrorMm, reliefRadialSampleMm: radialSpacing,
      reliefMaxAngularChordMm: chordMm, closedSolid: false },
  });
  // T77 F4 · the board is said only when it is too thin (the refusal above);
  // a board that leaves the skin is silently fine, so this note names none.
  result.advisories.push({ code: 'ORNATE_PROPOSED_REFERENCE', message: 'Proposed ornamental design: the physical pattern, the tooling and the CAM setup need approval before production. These contours and the shared relief mesh are reference geometry, not cutter-centre toolpaths.' });
  result.advisories.push({ code: 'ORNATE_BORE_ENVELOPE', message: 'Hardware clearance uses the deepest relief envelope across its recessed footprint. A rejected rear drilling may need a measured local CAM check.' });
  return result;
}
