// ─── THE EDITOR'S TOOL TABLE AND ITS ARITHMETIC (turn 38, CLAUDE.md F2/F5) ──
//
// The bar the CNC editor carries, and the pure functions that turn "the points
// a hand has placed, plus the numbers it has typed" into the next point.
//
// It is a MODULE and not seventeen lines inside a component for the reason
// every other pure helper in this app is one: a table of tools and a dimension
// resolver with six cases are things a node test should be able to read
// without mounting React, and the acceptance walk should be able to ask the
// APP which tools exist rather than counting buttons in a screenshot.
//
// No React, no store, no SVG.

import { distanceToObject, makePolyline } from '../engine/partObjects.js';
import { formatMm } from '../engine/format.js';

// ─── TURN 38 (CLAUDE.md F2): THE TOOLBAR, IN AUTOCAD'S OWN GROUPS ───────────
//
// Draw, then modify, then measure — the order every CAD package on a joiner's
// desk puts them in, so a hand that has used one knows where to look. `pts` is
// how many points the gesture takes; `dims` are the numbers it will accept
// typed, in TAB order (F5).
export const TOOLS = Object.freeze([
  {
    group: 'draw',
    items: [
      { id: 'select', label: 'Select', glyph: '⌖', hint: 'Click a shape, drag a marquee, right-click for the verbs' },
      { id: 'line', label: 'Line', glyph: '╱', pts: 2, dims: ['length', 'angle'], hint: 'Two points' },
      { id: 'polyline', label: 'Polyline', glyph: '⟋⟍', pts: 0, dims: ['length', 'angle'], hint: 'Click, click, … Enter to end · C closes' },
      { id: 'circle', label: 'Circle', glyph: '◯', pts: 2, dims: ['radius'], hint: 'Centre, then radius' },
      { id: 'rect', label: 'Rect', glyph: '▭', pts: 2, dims: ['width', 'height'], hint: 'Two opposite corners' },
      { id: 'arc', label: 'Arc', glyph: '⌒', pts: 3, hint: 'Start, a point on it, end' },
      { id: 'drill', label: 'Drill', glyph: '⊙', pts: 1, hint: 'Stamp a hole' },
      { id: 'dowels', label: 'Dowel line', glyph: '⋯', pts: 2, hint: 'A run of holes at a pitch' },
    ],
  },
  {
    group: 'modify',
    items: [
      { id: 'move', label: 'Move', glyph: '✥', pts: 2, dims: ['dx', 'dy'], hint: 'Base point, then destination' },
      { id: 'copy', label: 'Copy', glyph: '⧉', pts: 2, dims: ['dx', 'dy'], hint: 'Base point, then destination' },
      { id: 'rotate', label: 'Rotate', glyph: '↻', pts: 2, dims: ['angle'], hint: 'Base point, then the angle' },
      { id: 'mirror', label: 'Mirror', glyph: '⇄', pts: 2, hint: 'Two points of the mirror line' },
      { id: 'offset', label: 'Offset', glyph: '⊂', pts: 1, dims: ['distance'], hint: 'Type a distance, click the side' },
      { id: 'trim', label: 'Trim', glyph: '✂', pts: 1, hint: 'Select the cutting edges, click the piece to go' },
      { id: 'fillet', label: 'Fillet', glyph: '◜', pts: 2, dims: ['radius'], hint: 'Type a radius, click two lines' },
      { id: 'array', label: 'Array', glyph: '⣿', pts: 0, dims: ['rows', 'cols', 'spacing'], hint: 'Rows × columns at a spacing' },
    ],
  },
  {
    group: 'measure',
    items: [
      { id: 'measure', label: 'Measure', glyph: '⟺', pts: 2, hint: 'Two points — on screen only, never exported' },
    ],
  },
]);

/** The tools that act on what is already drawn rather than drawing something. */
export const VERB_TOOLS = new Set(['move', 'copy', 'rotate', 'mirror', 'offset', 'trim', 'fillet', 'array']);

/** How big the 3-D thumbnail is, in the three sizes F8 cycles through. */
export const THUMB_SIZES = [
  { id: 'small', w: 180, h: 140 },
  { id: 'medium', w: 300, h: 230 },
  { id: 'large', w: 460, h: 350 },
];

/** F11's stack depth — CLAUDE.md's own number. */
export const UNDO_DEPTH = 50;

/** One tool by its id — the lookup every branch in the editor takes. */
export const TOOL_BY_ID = new Map(TOOLS.flatMap((g) => g.items.map((t) => [t.id, t])));

/** The status bar's hint for the tool in hand. */
export function promptFor({
  tool, spec, pending, picked, selected,
}) {
  if (tool === 'select') {
    if (selected.length) return `${selected.length} selected — right-click for Move, Copy, Rotate, Group, Delete.`;
    if (picked) return 'Delete removes it from this print.';
    return 'Click a shape, drag a marquee, Shift-click to add. Right-click for the verbs.';
  }
  // `pts: 0` is a tool that takes as many points as it is given — a polyline —
  // or none at all, an array. Neither has a "1 of 3" to count, so both say
  // their own hint and nothing else.
  const need = spec.pts ?? 2;
  if (need === 0) return spec.hint;
  return `${spec.label}: ${pending.length} of ${need} point${need === 1 ? '' : 's'} — ${spec.hint}`;
}

/** F7's read-out, in the two numbers a joiner checks a set-out with. */
export function measureText(m) {
  if (!m) return '';
  const dx = m.to.x - m.from.x;
  const dy = m.to.y - m.from.y;
  return `measure ${formatMm(Math.hypot(dx, dy))} (dx ${formatMm(dx)} · dy ${formatMm(dy)})`;
}

/**
 * F5's TAB entry, turned back into a POINT.
 *
 * The numbers a joiner types are the SHAPE's own dimensions — a rect's width
 * and height, a circle's radius, a line's length and angle — so they have to
 * be resolved against the point the gesture started at. A field left empty
 * takes what the cursor is saying, which is what makes the box a refinement of
 * the drag rather than a form standing in front of it.
 */
export function pointFromDims({
  tool, start, cursor, values = {},
}) {
  const here = cursor || start;
  const num = (key) => {
    const v = values[key];
    return v === undefined || v === null || v === '' ? null : Number(v);
  };
  if (!start) return null;
  if (tool === 'rect') {
    const w = num('width');
    const h = num('height');
    const signX = here.x >= start.x ? 1 : -1;
    const signY = here.y >= start.y ? 1 : -1;
    return {
      x: w === null ? here.x : start.x + signX * Math.abs(w),
      y: h === null ? here.y : start.y + signY * Math.abs(h),
    };
  }
  if (tool === 'circle') {
    const r = num('radius');
    if (r === null) return here;
    const ang = Math.atan2(here.y - start.y, here.x - start.x);
    return { x: start.x + Math.abs(r) * Math.cos(ang), y: start.y + Math.abs(r) * Math.sin(ang) };
  }
  if (tool === 'line' || tool === 'polyline') {
    const len = num('length');
    const deg = num('angle');
    const liveLen = Math.hypot(here.x - start.x, here.y - start.y);
    const liveDeg = (Math.atan2(here.y - start.y, here.x - start.x) * 180) / Math.PI;
    const L = len === null ? liveLen : Math.abs(len);
    const A = ((deg === null ? liveDeg : deg) * Math.PI) / 180;
    if (!(L > 0)) return null;
    return { x: start.x + L * Math.cos(A), y: start.y + L * Math.sin(A) };
  }
  if (tool === 'move' || tool === 'copy') {
    const dx = num('dx');
    const dy = num('dy');
    return {
      x: dx === null ? here.x : start.x + dx,
      y: dy === null ? here.y : start.y + dy,
    };
  }
  if (tool === 'rotate') {
    const deg = num('angle');
    if (deg === null) return here;
    const r = Math.max(1, Math.hypot(here.x - start.x, here.y - start.y));
    const A = (deg * Math.PI) / 180;
    return { x: start.x + r * Math.cos(A), y: start.y + r * Math.sin(A) };
  }
  return here;
}

/** The live values a dimension box shows for the fields nobody has typed into. */
export function liveDimValues({ tool, start, cursor }) {
  if (!start || !cursor) return {};
  const dx = cursor.x - start.x;
  const dy = cursor.y - start.y;
  if (tool === 'rect') return { width: Math.abs(dx), height: Math.abs(dy) };
  if (tool === 'circle') return { radius: Math.hypot(dx, dy) };
  if (tool === 'line' || tool === 'polyline') {
    return { length: Math.hypot(dx, dy), angle: (Math.atan2(dy, dx) * 180) / Math.PI };
  }
  if (tool === 'move' || tool === 'copy') return { dx, dy };
  if (tool === 'rotate') return { angle: (Math.atan2(dy, dx) * 180) / Math.PI };
  return {};
}

/** The ghost the canvas paints while a shape is being dragged out (F5). */
export function ghostOf({
  tool, pending, cursor, layer, shapeFrom, entry, spec,
}) {
  if (!pending?.length || !cursor) return null;
  const at = spec?.dims?.length
    ? (pointFromDims({
      tool, start: pending[pending.length - 1], cursor, values: entry?.values || {},
    }) || cursor)
    : cursor;
  const pts = [...pending, at];
  if (tool === 'polyline') return makePolyline({ id: 'ghost', layer, pts: pts.map((p) => [p.x, p.y]) });
  if (tool === 'arc' && pts.length < 3) return null;
  return shapeFrom ? shapeFrom(pts, 'ghost') : null;
}

/** The nearest manual object to a point, within a magnet. */
export function nearestObject(objects, at, magnetMm) {
  let best = null;
  let bestD = Infinity;
  for (const o of objects || []) {
    const d = distanceToObject(o, at);
    if (d < bestD && d <= magnetMm) { best = o; bestD = d; }
  }
  return best;
}
