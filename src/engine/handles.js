// ─── HANDLES (turn 25, CLAUDE.md F4) ────────────────────────────────────────
//
// A handle is three things at once and they have to agree to the millimetre:
// a MODEL in the room, a HOLE on the machine, and a POSITION that is the same
// on every front of its kind across the whole kitchen. This module owns the
// third — the reference point — because it is the one the other two are built
// on, and because the owner's law for it is a set of rules that read differently
// for a base door, a wall door, a tall door and a horizontal front.
//
// ─── THE OWNER'S LAW, VERBATIM IN SHAPE ─────────────────────────────────────
//
//   base unit doors     50 from the TOP of the front, 50 in from the opening
//                       edge
//   wall unit doors     50 from the BOTTOM, 50 in from the opening edge
//   tall unit doors     MID HEIGHT of the door, 50 in — movable
//   drawer fronts and
//   D/W panels          HORIZONTAL, centred on the width, 50 from the top
//   SHAKER fronts       centred on the FRAME's width — the vertical frame for
//                       a door, the bottom/top frame for a horizontal — unless
//                       that frame is under 30 mm, when the 50 × 50 rule
//                       answers instead
//
// Which end "the top" is measured from is the same question the wall unit's
// mirror answers: a base unit's doors are gripped from above and a wall unit's
// from below, because that is where the hand is.
//
// ─── ONE LINE ACROSS THE KITCHEN ────────────────────────────────────────────
//
// Moving one handle moves every front of its CLASS in the project, behind a
// confirmation that names the count. The class is exactly the list above: a
// base door and a wall door do not line up with each other and were never
// meant to, but every base door in the room lines up with every other one.
//
// Pure functions — no React, no three.js, no store (engine rule).

/** The two things a person picks. */
export const HANDLE_TYPES = [
  { id: 'bar', label: 'Bar', hint: 'A round bar on two posts' },
  { id: 'knob', label: 'Knob', hint: 'One screw, one hole' },
];

/** The screw centres a bar comes in. A typed number is accepted too (F4). */
export const BAR_CENTRES = [96, 128, 160, 192, 224];

/** The classes that line up with each other, and nothing else. */
export const HANDLE_CLASSES = ['base-door', 'wall-door', 'tall-door', 'horizontal'];

/** The handle block of a profile, with every field present. */
export function handleSpec(profile) {
  const h = profile?.handles || {};
  return {
    inset: Number(h.inset) || 0,
    shakerMinFrame: Number(h.shakerMinFrame) || 0,
    holeDiameter: Number(h.holeDiameter) || 0,
    layer: h.layer || 'HANDLES_5MM',
    centres: Array.isArray(h.barCentres) && h.barCentres.length ? h.barCentres : BAR_CENTRES,
    defaultCentres: Number(h.defaultCentres) || 128,
    bar: { ...(h.bar || {}) },
    knob: { ...(h.knob || {}) },
  };
}

/**
 * Which class of front this is — and therefore which handles it lines up with.
 *
 * Decided on the PIECE and its cabinet's mount, never on a list of ids. A
 * drawer front is horizontal whatever cabinet it is in; a D/W panel's face is
 * horizontal because the owner says so and because it is a drawer front's
 * neighbour in a run.
 *
 * @param {object} panel      an engine panel record
 * @param {object} unitType   the entry from engine/types.js
 * @returns {string|null} one of HANDLE_CLASSES, or null where a front takes no
 *   handle at all
 */
export function handleClassOf(panel, unitType) {
  if (panel?.role !== 'front') return null;
  if (panel.part === 'DRAWER-FRONT') return 'horizontal';
  // ─── TURN 27 (CLAUDE.md F2.2): READ THE GESTURE, NOT THE APPLIANCE ──────
  // This asked `meta.appliance` — an `if (dwPanel)` in the handle law, which
  // is exactly what F2 is about. The owner's rule is about how the front is
  // GRIPPED, and a front that falls forward about its bottom edge is gripped
  // from above like a drawer front. Any front that drops answers the same way,
  // whatever is behind it.
  if (panel.meta?.opening === 'drop') return 'horizontal';
  if (panel.part !== 'FRONT') return null;
  const group = unitType?.heightGroup;
  if (unitType?.mount === 'wall') return 'wall-door';
  if (group === 'tall') return 'tall-door';
  return 'base-door';
}

/** Does this class run up the front, or across it? */
function handleAxisOf(handleClass) {
  return handleClass === 'horizontal' ? 'horizontal' : 'vertical';
}

/**
 * WHERE THE REFERENCE HOLE GOES, in the front's own cut frame (origin
 * bottom-left, y up — the frame every outline in this engine is in).
 *
 * @param {object} args
 *   panel        the front
 *   handleClass  from `handleClassOf`
 *   hinge        'L' | 'R' — which edge the door is hung on, so the OPENING
 *                edge is the other one
 *   frame        the shaker frame this front actually got, or null
 * @param {object} profile
 * @returns {{x:number, y:number, axis:string, rule:string}}
 *   `rule` names which of the owner's lines was followed, so a test and a
 *   tooltip can both say WHY the hole is there.
 */
export function handleReference({
  panel, handleClass, hinge = 'L', frame = null,
}, profile) {
  const spec = handleSpec(profile);
  const w = Number(panel?.w) || 0;
  const h = Number(panel?.h) || 0;
  const inset = spec.inset;
  const axis = handleAxisOf(handleClass);

  // ─── THE SHAKER RULE ────────────────────────────────────────────────────
  // A handle on a shaker goes on the FRAME, centred across it, because that is
  // the only part of the door with material behind it to take a screw. Under
  // `shakerMinFrame` there is not enough frame to centre anything on and the
  // 50 × 50 rule answers instead — which is also what a flat front gets.
  const f = Number(frame);
  const onFrame = Number.isFinite(f) && f > 0 && f >= spec.shakerMinFrame;

  if (axis === 'horizontal') {
    // Centred on the width; `inset` from the TOP — or on the centre line of
    // the top frame where there is one. "Centred on the width" is a statement
    // about the HANDLE, not about one of its screws, so this point is the
    // handle's own centre and a bar's two holes straddle it.
    const y = onFrame ? h - f / 2 : h - inset;
    return {
      x: w / 2,
      y,
      axis,
      anchor: 'centre',
      rule: onFrame ? 'shaker-top-frame' : 'top-inset',
    };
  }

  // A door. The OPENING edge is the one away from the hinge.
  //
  // ─── TURN 28 (CLAUDE.md F2b): RESOLVED IN THE SHEET'S OWN MIRROR ─────────
  //
  // A FRONT's cut frame — the frame this function returns and the one the
  // drilling is written in — is the INSIDE MIRROR: origin at the leaf's
  // bottom-RIGHT corner, x running LEFT (`engine/joinery.js panelPlacement`).
  // The workshop bores a door from the back and the sheet is drawn the way the
  // door lies on the bench. The CUP law honours it and always has: an L-hinged
  // leaf's cup is drawn at `w − 21.5` and lands 21.5 mm from the LEFT edge in
  // the room, which is its hinge edge.
  //
  // THE FAULT: `openingLeft = hinge === 'R'` is the ROOM's left, written
  // straight into the MIRRORED frame — so on the sheet the knob printed beside
  // the cups, on the hinge stile, for BOTH hands. The owner's sheet `03-F`
  // (597 × 767) is the picture of it: three ⌀35 cups up one stile and the
  // handle hole next to them.
  //
  // The law, in the frame it is written into: hinge L → the hinge edge is
  // sheet-RIGHT (`x = w`), so the reference stands at sheet-LEFT, `x = inset`;
  // hinge R the converse. ONE condition flips. `y`, the centres, the anchors
  // and every other rule below are untouched, and the 3-D handle lands on the
  // free stile in the room because it reads this same frame back through the
  // same mirror (3d/Hardware.jsx).
  const openingAtSheetOrigin = hinge === 'L';
  const acrossFromEdge = onFrame ? f / 2 : inset;
  const x = openingAtSheetOrigin ? acrossFromEdge : w - acrossFromEdge;

  // ─── WHICH POINT THIS IS ────────────────────────────────────────────────
  //
  // The owner's law gives two different KINDS of reference and a bar has to
  // read the difference or it hangs off the board:
  //
  //   "50 from the TOP"     is a HOLE — F4.2 in as many words, "the reference
  //   "50 from the BOTTOM"  hole plus its partner at the chosen centres". The
  //                         partner goes INTO the door, away from the near
  //                         edge, which is the only direction there is room in.
  //   "MID HEIGHT"          is the handle's own CENTRE. A bar hung from mid
  //                         height by one screw would sit 80 mm low on a tall
  //                         door, and nobody means that by "mid height".
  let y;
  let rule;
  let anchor;
  let towards;
  if (handleClass === 'wall-door') {
    y = inset;
    rule = 'bottom-inset';
    anchor = 'end';
    towards = +1;                       // the partner is ABOVE: the door is up there
  } else if (handleClass === 'tall-door') {
    y = h / 2;
    rule = 'mid-height';
    anchor = 'centre';
    towards = 0;
  } else {
    y = h - inset;
    rule = 'top-inset';
    anchor = 'end';
    towards = -1;                       // the partner is BELOW
  }
  return {
    x, y, axis, anchor, towards, rule: onFrame ? `${rule}+shaker-stile` : rule,
  };
}

/**
 * The holes one handle drills, in the front's own frame.
 *
 * A knob is ONE hole. A bar is the reference hole and its partner, `centres`
 * apart ALONG the handle's own axis — which is the axis of the CLASS, not of
 * the door: a bar on a drawer front lies across it and its two screws are side
 * by side.
 *
 * `anchor` decides how the two sit about the reference, and it comes from the
 * owner's own wording (see `handleReference`): an edge-relative reference IS
 * one of the holes and the partner goes into the door; a centre-relative one
 * is the handle's middle and the pair straddles it.
 *
 * @returns {Array<{x:number, y:number, d:number, layer:string}>}
 */
export function handleHoles({
  reference, type = 'bar', centres = null,
}, profile) {
  const spec = handleSpec(profile);
  const d = spec.holeDiameter;
  const layer = spec.layer;
  if (!reference) return [];
  const { x, y, axis } = reference;
  if (type === 'knob') return [{ x, y, d, layer }];
  const c = Number(centres) > 0 ? Number(centres) : spec.defaultCentres;
  const at = (dx, dy) => ({ x: x + dx, y: y + dy, d, layer });
  if (reference.anchor === 'end') {
    const dir = Number(reference.towards) || -1;
    return axis === 'horizontal'
      ? [at(0, 0), at(dir * c, 0)]
      : [at(0, 0), at(0, dir * c)];
  }
  const half = c / 2;
  return axis === 'horizontal'
    ? [at(-half, 0), at(half, 0)]
    : [at(0, -half), at(0, half)];
}

/**
 * Does this handle actually fit on this front?
 *
 * A 224 mm bar on a 197 mm drawer front is two holes off the board. The answer
 * is the same grammar F3 uses: a plain sentence, and the handle is not drilled.
 *
 * @returns {string|null}
 */
export function handleFitProblem({
  panel, reference, type = 'bar', centres = null,
}, profile) {
  const holes = handleHoles({ reference, type, centres }, profile);
  if (!holes.length) return null;
  const w = Number(panel?.w) || 0;
  const h = Number(panel?.h) || 0;
  const spec = handleSpec(profile);
  const edge = spec.holeDiameter;         // keep a hole its own diameter off an edge
  for (const hole of holes) {
    if (hole.x < edge || hole.x > w - edge || hole.y < edge || hole.y > h - edge) {
      const c = Number(centres) > 0 ? Number(centres) : spec.defaultCentres;
      return `A ${trim(c)} mm bar does not fit on a ${trim(w)} × ${trim(h)} mm front `
        + 'at that position — no holes are drilled.';
    }
  }
  return null;
}

/**
 * One front's handle, resolved: the project's answer, this front's own where it
 * has one, and the reference point either way.
 *
 * ─── THE HIERARCHY IS TURN 19'S, EXACTLY ────────────────────────────────────
 * The PROJECT says which handle and where; ONE FRONT may say something else and
 * be believed, and wears a deviation badge for saying it. There is no third
 * level, because a kitchen with three answers to "where is the handle" is a
 * kitchen nobody can fit.
 *
 * @param {object} args
 *   panel        the front
 *   unitType     engine/types.js entry
 *   project      { type, centres, offset } or null — the project's handle
 *   own          this front's override, or null
 *   hinge, frame as `handleReference`
 * @param {object} profile
 * @returns {{type:string, centres:number, reference:object, holes:Array,
 *            deviation:boolean, class:string, problem:string|null}|null}
 *   null where this front has no handle at all.
 */
export function resolveHandle({
  panel, unitType, project = null, own = null, hinge = 'L', frame = null,
}, profile) {
  const handleClass = handleClassOf(panel, unitType);
  if (!handleClass) return null;
  const chosen = own || project;
  if (!chosen || !chosen.type) return null;

  const spec = handleSpec(profile);
  const type = chosen.type === 'knob' ? 'knob' : 'bar';
  const centres = type === 'knob'
    ? 0
    : (Number(chosen.centres) > 0 ? Number(chosen.centres) : spec.defaultCentres);

  const base = handleReference({
    panel, handleClass, hinge, frame,
  }, profile);
  // An offset moves the WHOLE handle off its reference point — the "movable"
  // in the tall-door rule, and what dragging one writes.
  //
  // A PROJECT offset is stored PER CLASS — "moving one moves all" moves the
  // base doors without touching the wall doors, because those two lines were
  // never meant to agree with each other. A FRONT's own offset is its own.
  const offset = own?.offset || chosen.offsets?.[handleClass] || chosen.offset || null;
  const reference = offset
    ? {
      ...base,
      x: base.x + (Number(offset.x) || 0),
      y: base.y + (Number(offset.y) || 0),
    }
    : base;

  const holes = handleHoles({ reference, type, centres }, profile);
  const problem = handleFitProblem({
    panel, reference, type, centres,
  }, profile);
  return {
    type,
    centres,
    reference,
    holes: problem ? [] : holes,
    // A front that says something the project did not is a front that has
    // been moved on its own — the badge turn 19 gave a per-hinge override.
    deviation: Boolean(own),
    class: handleClass,
    problem,
  };
}

/**
 * How many fronts a change to this class would move.
 *
 * The number the confirmation names — "this moves handles on 14 fronts" — and
 * it is counted from the units themselves rather than guessed, because a
 * confirmation with the wrong number in it is worse than none.
 *
 * @param {Array} entries  [{ panels, unitType }] — every computed unit
 * @param {string} handleClass
 * @returns {{total:number, deviating:number}} `deviating` are the fronts that
 *   have said something of their own and will therefore NOT move.
 */
export function handleClassCount(entries, handleClass, ownOf = () => null) {
  let total = 0;
  let deviating = 0;
  for (const entry of entries || []) {
    for (const panel of entry.panels || []) {
      if (handleClassOf(panel, entry.unitType) !== handleClass) continue;
      total += 1;
      if (ownOf(entry, panel)) deviating += 1;
    }
  }
  return { total, deviating };
}

const trim = (v) => {
  const s = Number(v).toFixed(2).replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s;
};
