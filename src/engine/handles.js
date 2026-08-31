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

/**
 * The things a person picks.
 *
 * ─── TURN 57 (CLAUDE.md F2): AND THE THIRD IS NOT A THING AT ALL ───────────
 *
 * A J-PULL IS A HANDLE SYSTEM. Two axes, never merged:
 *
 *   FACE PATTERN   slab, shaker, grooved, glass, ...   what it LOOKS like
 *   HANDLE SYSTEM  bar, knob, none, J-PULL             how it is HELD
 *
 * A grooved door with a J edge has to be possible, and it is only possible if
 * the two are separate — so the J lives HERE, on the module that has owned
 * "how is this front gripped" since turn 25, and not in a pattern registry.
 * The law itself is `reference/lisp/KIT_FRONT_JPULL.lsp`; this file follows it
 * and takes its numbers from the profile, which takes them from that kit.
 *
 * It is a system with no hardware. Nothing is screwed to a J-pull front and
 * nothing is drilled in one: the edge is machined instead, and `resolveHandle`
 * answers with an EDGE record rather than a hole list.
 */
export const HANDLE_TYPES = [
  { id: 'bar', label: 'Bar', hint: 'A round bar on two posts' },
  { id: 'knob', label: 'Knob', hint: 'One screw, one hole' },
  { id: 'jpull', label: 'J-pull handleless', hint: 'Machined into the front\'s own edge — nothing is screwed on' },
];

/** The only edges a J can be machined on. A diagonal is not one of them. */
export const JPULL_EDGES = ['TOP', 'L', 'R'];

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
  // T58b (CLAUDE.md F3.3): this ONE leaf's own J run, in millimetres, or null
  // for the profile's. It is the only jpull number a hand can reach after
  // this turn — the start height and the ramp radius stay engine constants.
  jpullRunMm = null,
}, profile) {
  const handleClass = handleClassOf(panel, unitType);
  if (!handleClass) return null;
  const chosen = own || project;
  if (!chosen || !chosen.type) return null;

  // ─── TURN 57 (CLAUDE.md F2.1): THE J IS ANSWERED FIRST, AND WHOLE ────────
  //
  // Before a single line of hardware arithmetic. That is the LICENCE the turn
  // grants, spent exactly here and nowhere else: on a jpull front the handle
  // and its drilling are *never born*, rather than born and then filtered out
  // somewhere downstream. A `bar` record that existed for one function call
  // before being dropped would eventually be read by something — the BOM, the
  // wall elevation, a hover aura — and a J-pull kitchen would quietly buy
  // handles.
  if (chosen.type === 'jpull') {
    return resolveJpull({
      panel, handleClass, hinge, deviation: Boolean(own), runMm: jpullRunMm,
    }, profile);
  }

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
  //
  // ─── TURN 33 (CLAUDE.md F7): THE OFFSET IS EDGE-RELATIVE, AND MIRRORS ────
  //
  // The owner's law, off his own pair: "30 means 30 from the LEFT edge on the
  // left door and 30 from the RIGHT edge on the right door" — the offset is
  // measured FROM THE DOOR'S OWN HANDLE EDGE, so a pair stays 50/50, never
  // 60/40. The fault was one line: `x: base.x + offset.x` added the stored
  // number in the SHEET frame, whose +x runs the same room direction on every
  // leaf — so "move left" walked both handles of a pair the same way, one
  // toward its edge and one away.
  //
  // The law, in the frame it is written into: positive `offset.x` moves the
  // handle AWAY from its own handle (opening) edge, INTO the door — sheet +x
  // on an L-hinged leaf (its edge is at the sheet origin), sheet −x on an
  // R-hinged one. One sign, exactly where the BASE is already hand-mirrored
  // (`openingAtSheetOrigin`, handleReference above). A horizontal front is
  // one centred piece with no pair to mirror against and keeps the plain
  // sheet reading it has always had.
  //
  // MIGRATION, 15.08.2026 (dated, the spec's own ask): stored offsets are
  // REINTERPRETED as edge-offsets — for every L-hinged door the two readings
  // are the same number; an R-hinged door's stored x now reads mirrored,
  // which is the behaviour the owner reported as the fault. No data moves;
  // golden fixtures carry no handle offsets (bare calls pass no handle).
  const offset = own?.offset || chosen.offsets?.[handleClass] || chosen.offset || null;
  const intoDoor = base.axis === 'vertical' && hinge === 'R' ? -1 : 1;
  const reference = offset
    ? {
      ...base,
      x: base.x + intoDoor * (Number(offset.x) || 0),
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

// ─── TURN 57 (CLAUDE.md F1/F2): THE J-PULL, FROM THE LISP DOWN ──────────────
//
// Every number below comes out of `profile.handles.jpull`, and every number
// there is the one `reference/lisp/KIT_FRONT_JPULL.lsp` states. There is no
// third copy: `test/turn57-f2-the-jpull-system.test.js` reads the kit off disk
// and holds the profile to it.

/** The J-pull block of a profile, with every field present. */
export function jpullSpec(profile) {
  const j = profile?.handles?.jpull || {};
  const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
  return {
    // The stopped run — the owner's "500 mm, zaczyna sie od dolu frontu
    // okolo 700 mm", and the lead-in radius he will tune later.
    runMm: num(j.runMm, 500),
    fromBottomMm: num(j.fromBottomMm, 700),
    rampR: num(j.rampR, 25),
    // …and the section itself, measured off `J_hand.dxf` on an 18 mm board.
    lipT: num(j.lipT, 4.212),
    slotW: num(j.slotW, 10),
    slotDepth: num(j.slotDepth, 40),
    slotR: num(j.slotR, 5),
    rearLeg: num(j.rearLeg, 3.788),
    reliefMm: num(j.reliefMm, 30),
    layer: j.layer || 'JPULL_EDGE',
  };
}

/**
 * WHICH EDGE — one function, one answer. (`SKY:jpullEdge`.)
 *
 * The owner's table, made executable, in the ROOM's frame — the frame his
 * sentence is spoken in:
 *
 *   wall-door    null   "na szafkach wiszacych nie rob J". A wall door is
 *                       gripped from below and "to juz robi program": the
 *                       existing front geometry stands, and nothing at all is
 *                       machined. null is the answer, not an absence of one.
 *   horizontal   TOP    every drawer front, and every front that drops.
 *   base-door    TOP    full width.
 *   tall-door    the VERTICAL edge OPPOSITE the hinge — the opening side, the
 *                       edge a hand reaches for.
 *
 * The tall rule is one `if` and that is the whole of it, which is what makes
 * the forced hand under a rake free: `meta.hinge` flips (T46/T55), and this
 * flips with it without ever hearing that a slope exists.
 *
 * A DIAGONAL is unsayable rather than merely forbidden — there are three
 * answers and none of them is a raked edge.
 *
 * @param {string|null} handleClass  one of HANDLE_CLASSES
 * @param {string} hinge  'L' | 'R', in the ROOM's frame
 * @returns {'TOP'|'L'|'R'|null}
 */
export function jpullEdgeOf(handleClass, hinge) {
  if (handleClass === 'wall-door') return null;
  if (handleClass === 'horizontal' || handleClass === 'base-door') return 'TOP';
  if (handleClass === 'tall-door') return hinge === 'R' ? 'L' : 'R';
  return null;
}

/**
 * …and the same edge in the SHEET's frame, which is where it is cut.
 *
 * THE INSIDE MIRROR (engine/joinery.js `panelPlacement`): a front's cut frame
 * has its origin at the leaf's bottom RIGHT corner with x running LEFT,
 * because the workshop bores a door from the back and the sheet is drawn the
 * way the door lies on the bench. So a ROOM-left edge is at sheet x = w and a
 * room-right edge is at sheet x = 0 — the two names swap.
 *
 * T28-F2b is the scar from getting exactly this wrong for the handle, and it
 * is why the two frames are NAMED APART here and never mixed rather than
 * being one letter that means different things in different functions.
 *
 * (A pleasant consequence, derived and not assumed: on a tall door the J's
 * SHEET letter is the same letter as the hinge's ROOM one, because opposite
 * and mirrored cancel. It is written out as two steps anyway — a coincidence
 * relied on is a coincidence that breaks when one of the two rules changes.)
 */
export function jpullSheetEdge(roomEdge) {
  if (roomEdge === 'TOP') return 'TOP';
  if (roomEdge === 'L') return 'R';
  if (roomEdge === 'R') return 'L';
  return null;
}

/**
 * HOW FAR ALONG — the stopped run. (`SKY:jpullRun`.)
 *
 * A TOP edge runs the full width and there is nothing to decide. A tall door's
 * runs `runMm` starting `fromBottomMm` up the leaf's OWN bottom edge, and the
 * height of the edge it is cut on gets a say.
 *
 * Three answers, and the difference between the last two is the point:
 *
 *   edgeH <= fromBottomMm   null — REFUSED. There is no leaf above the start
 *                           of the run; the engine says so and does not slide
 *                           the run down, because a J at ankle height is not a
 *                           handle.
 *   from + run > edgeH      CLAMPED, and it says it was: a 900 mm leaf under a
 *                           rake gets the run it can hold and a Check line
 *                           names it.
 *   otherwise               the owner's own 700 → 1200.
 *
 * @param {number} edgeH  the height of the EDGE the J is cut on — which under
 *   a rake is the SHORT side of the leaf, not the leaf's tallest point
 * @returns {{from:number,to:number,clamped:boolean}|null}
 */
export function jpullRunOf(edgeH, spec) {
  const h = Number(edgeH) || 0;
  const from = spec.fromBottomMm;
  const want = from + spec.runMm;
  if (!(h > from)) return null;
  if (want > h) return { from, to: h, clamped: true };
  return { from, to: want, clamped: false };
}

/**
 * The height of the edge the J is cut on.
 *
 * A flat leaf: its own height, both sides. A SLOPE-CUT leaf: the height at
 * THAT edge, which the piece already publishes in the room's frame
 * (`meta.slopeCut.roomL` / `roomR`, engine/cabinet.js). Under a rake the hinge
 * is forced onto the tall edge, so the J's edge is the SHORT one — and a run
 * measured against the leaf's tallest point would be a run hanging in the air
 * above a door that is not there.
 *
 * A leaf that is BOTH trimmed and slope-cut has already been re-cut by F0a
 * before this is asked, because the trim applier runs earlier in the file —
 * so `roomL`/`roomR` are the refreshed numbers and not the stale ones.
 */
export function jpullEdgeHeight(panel, roomEdge) {
  const h = Number(panel?.h) || 0;
  const cut = panel?.meta?.slopeCut;
  if (!cut || roomEdge === 'TOP') return h;
  const at = roomEdge === 'L' ? cut.roomL : cut.roomR;
  return Number.isFinite(Number(at)) ? Math.min(h, Number(at)) : h;
}

/** `J-PULL TOP`, or `J-PULL R 700-1200` for a stopped run. ASCII, upper case. */
export function jpullNoteText(sheetEdge, run) {
  if (!sheetEdge) return null;
  if (!run) return `J-PULL ${sheetEdge}`;
  return `J-PULL ${sheetEdge} ${Math.round(run.from)}-${Math.round(run.to)}`;
}

/**
 * The whole answer for one J-pull front.
 *
 * Never a hole and never a handle: `holes` is empty by construction, so every
 * consumer that counts holes — the drilling, the BOM's handle line, the 3-D
 * mount — is already right about this front without being told about J-pulls.
 *
 * @returns {{system:'jpull', class:string, edge:string|null, sheetEdge:string|null,
 *   run:object|null, note:string|null, profile:object, holes:Array, cut:boolean,
 *   problem:string|null, reason:string|null}}
 *   `cut` is the one the caller acts on: true where the edge is machined —
 *   including a run the leaf clamped short — and false for a wall door and for
 *   an edge that refused.
 */
export function resolveJpull({
  panel, handleClass, hinge = 'L', deviation = false, runMm = null,
}, profile) {
  const profileSpec = jpullSpec(profile);
  // ─── TURN 58b (CLAUDE.md F3.3): ONE NUMBER A HAND CAN REACH ──────────────
  //
  // The owner, on the nine fields the settings panel used to show: *"jakieś
  // dziwne ustawienia, po co mi to? ja nie chcę tego… jedynie wysokość —
  // jeden pasek, przedłuż wycięcie J na pionowych i tyle, nic więcej."*
  //
  // So exactly ONE of them survives as a per-LEAF override — the RUN. Where
  // the leaf says nothing the profile answers, which is what every resolution
  // in this engine does; `fromBottomMm` and `rampR` are not exposed at all and
  // stay what the workshop's profile says they are.
  const own = Number(runMm);
  const spec = Number.isFinite(own) && own > 0
    ? { ...profileSpec, runMm: own }
    : profileSpec;
  const edge = jpullEdgeOf(handleClass, hinge);
  const common = {
    system: 'jpull',
    type: 'jpull',
    class: handleClass,
    holes: [],
    deviation,
    profile: {
      lipT: spec.lipT,
      slotW: spec.slotW,
      slotDepth: spec.slotDepth,
      slotR: spec.slotR,
      rearLeg: spec.rearLeg,
      reliefMm: spec.reliefMm,
      rampR: spec.rampR,
      // 40 + 5, a CONSEQUENCE — stated so the machine is not set 5 mm shallow
      // by a workshop that changed the slot depth and left a 45 behind.
      reachDepth: spec.slotDepth + spec.slotR,
    },
  };
  if (!edge) {
    // A wall door, and the owner's own sentence. No machining, and no handle
    // either — the front is finished as it stands.
    return {
      ...common,
      edge: null,
      sheetEdge: null,
      run: null,
      note: null,
      problem: null,
      reason: 'wall-door',
      cut: false,
    };
  }
  const sheetEdge = jpullSheetEdge(edge);
  if (edge === 'TOP') {
    return {
      ...common,
      edge,
      sheetEdge,
      run: null,
      note: jpullNoteText(sheetEdge, null),
      problem: null,
      reason: null,
      cut: true,
    };
  }
  const edgeH = jpullEdgeHeight(panel, edge);
  const run = jpullRunOf(edgeH, spec);
  if (!run) {
    // REFUSED, in words, and nothing is cut. Never a guess at a lower start.
    return {
      ...common,
      edge,
      sheetEdge,
      run: null,
      note: null,
      reason: 'too-short',
      cut: false,
      problem: `the J-pull starts ${trim(spec.fromBottomMm)} mm up and this edge is only `
        + `${trim(edgeH)} mm — there is no leaf to machine.`,
    };
  }
  return {
    ...common,
    edge,
    sheetEdge,
    run,
    note: jpullNoteText(sheetEdge, run),
    // A CLAMPED run is still cut. That is the whole difference between the
    // clamp and the refusal, and it is stated as a flag rather than inferred
    // from which of two `reason` strings is set: a shorter run is a working
    // handle, and a run that starts above the top of the door is not a handle
    // at all.
    cut: true,
    reason: run.clamped ? 'clamped' : null,
    problem: run.clamped
      ? `the J-pull run is cut short to ${trim(run.to - run.from)} mm — a ${trim(spec.runMm)} mm run `
        + `from ${trim(spec.fromBottomMm)} mm would run off a ${trim(edgeH)} mm edge.`
      : null,
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
