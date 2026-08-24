// ─── THE SHAKER, AS A SHAPE (turn 25, CLAUDE.md F3) ─────────────────────────
//
// Until this turn a shaker front rendered as a flat slab and only its 25 mm
// thickness said otherwise. What makes a shaker a shaker is a RECESS: a pocket
// in the face leaving a frame of equal width all round, with the panel floor
// sitting `recessDepth` below the frame's face.
//
// ─── EQUAL ON ALL FOUR SIDES ────────────────────────────────────────────────
//
// The owner: "shaker zawsze równy". There is deliberately no rail/stile pair in
// here — a second number is a second thing to get wrong, and he does not want
// one. One frame width, 10…200 mm, default 70.
//
// ─── AND IT IS REFUSED, NOT CLAMPED ─────────────────────────────────────────
//
// A 200 mm frame on a 300 mm door is not a shaker with a thin panel; it is two
// frames overlapping. The app says so in a plain sentence and cuts the front
// PLAIN. What it never does is quietly reduce the frame to 120 so that it fits:
// a joiner who set 200 and got 120 has a kitchen where some doors have one
// frame and some have another, and nothing on his screen ever told him.
//
// ─── ONE LAW, THREE CONSUMERS ───────────────────────────────────────────────
//
// The 3-D solid (`3d/shakerSolid.js`), the CNC pocket (`engine/cabinet.js` →
// the front's own sheet) and the elevation drawing
// (`engine/drawings/frontElevation.js`) all ask THIS module whether a front has
// a frame and where it runs. Before this turn the drawing carried a heuristic
// of its own (`box.w > off × 2.2`), which is how a picture and a cut part come
// to disagree about the same door.
//
// Pure functions — no React, no three.js, no store (engine rule).

/** The shaker block of a profile, with every field present. */
export function shakerSpec(profile) {
  const s = profile?.front?.types?.S || {};
  return {
    frameWidth: Number(s.frameWidth) || 0,
    frameMin: Number(s.frameMin) || 0,
    frameMax: Number(s.frameMax) || 0,
    recessDepth: Number(s.recessDepth) || 0,
    minPanel: Number(s.minPanel) || 0,
    pocketLayer: s.pocketLayer || 'SHAKER_PANEL_POCKET',
    // Turn 34 (CLAUDE.md F7): what a project saved before 16.08.2026 was cut
    // to, for the pin below and for nothing else.
    legacyFrameWidth: Number(s.legacyFrameWidth) || 0,
  };
}

/**
 * ─── TURN 34 (CLAUDE.md F7): A CHANGED DEFAULT NEVER REDRAWS A SAVED JOB ────
 *
 * The owner, 16.08.2026: *"zmienimy default z 70 na 60, ale nie teraz"* — and
 * the turn is now. The profile's `frameWidth` is 60 from this turn on, so a
 * NEW project's shakers are 60 mm framed.
 *
 * A project already on somebody's bench is a different matter entirely. It was
 * quoted, cut and possibly hung at 70, and opening it must not silently make
 * every door 10 mm different. So on the way in, a project that HAS SHAKER
 * ANYWHERE and has never said a frame width of its own gets 70 written onto
 * it, explicitly — the F7-handles precedent, in as many words.
 *
 * Two things this deliberately does NOT do: it does not touch a project that
 * states its own number (that IS the answer, whatever it is), and it does not
 * touch a project with no shaker in it (there is nothing to pin, and writing a
 * field onto a job that has no use for it is how a diff becomes unreadable).
 *
 * @param {object|null} design  a MIGRATED design
 * @param {object} profile
 * @returns {object|null} the patch to merge, or null where nothing is owed
 */
export function legacyShakerFrame(design, profile) {
  const spec = shakerSpec(profile);
  if (!(spec.legacyFrameWidth > 0)) return null;
  // Already answered — by the project, at any value. Never overwritten.
  if (Number.isFinite(Number(design?.fronts?.shakerFrame))
    && Number(design.fronts.shakerFrame) > 0) return null;
  if (!hasShakerAnywhere(design)) return null;
  return { fronts: { ...(design?.fronts || {}), shakerFrame: spec.legacyFrameWidth } };
}

/** Is there a Shaker front anywhere in this project's design? */
export function hasShakerAnywhere(design) {
  if (design?.fronts?.style === 'S') return true;
  const types = design?.fronts?.types;
  if (Array.isArray(types) && types.some((t) => t?.style === 'S')) return true;
  // A saved DOOR STYLE is still a shaker in the job — `frontType` is the field
  // (engine/design.js `normaliseDoorStyle`), and a style with no id is not a
  // style at all.
  const doorStyles = design?.doorStyles;
  return Array.isArray(doorStyles) && doorStyles.some((d) => d?.frontType === 'S');
}

/**
 * The project's frame width: the design's own number where it has one, the
 * profile's default where it has not.
 *
 * It is a PROJECT setting and not a per-door one, for the same reason F13's
 * dimension toggle is: a kitchen whose doors wear three different frames is a
 * kitchen nobody meant to build.
 *
 * @param {object|null} design   the project design
 * @param {object} profile
 * @returns {number} mm — the stored value where it is inside the profile's own
 *   range, the default otherwise. An out-of-range STORED value is a project
 *   saved by a different profile, and the default is the honest answer to it.
 */
export function shakerFrameMm(design, profile) {
  const spec = shakerSpec(profile);
  const stored = Number(design?.fronts?.shakerFrame);
  if (Number.isFinite(stored) && stored >= spec.frameMin && stored <= spec.frameMax) return stored;
  return spec.frameWidth;
}

/**
 * Is this number a frame a person may set at all?
 *
 * @returns {string|null} a plain sentence, or null where it is fine
 */
export function frameRangeProblem(frame, profile) {
  const spec = shakerSpec(profile);
  const f = Number(frame);
  if (!Number.isFinite(f)) return 'The shaker frame needs a number.';
  if (f < spec.frameMin || f > spec.frameMax) {
    return `The shaker frame is ${spec.frameMin}–${spec.frameMax} mm; ${trim(f)} mm is outside it.`;
  }
  return null;
}

/**
 * Does a frame of this width fit THIS leaf?
 *
 * `2 × frame + minPanel` on each axis, and the narrow axis is the one that
 * decides — a tall door fails on its width and a drawer front on its height.
 *
 * @returns {string|null} the plain message, or null where it fits
 */
export function frameFitProblem({ w, h, frame }, profile) {
  const spec = shakerSpec(profile);
  const f = Number(frame);
  const width = Number(w) || 0;
  const height = Number(h) || 0;
  const need = 2 * f + spec.minPanel;
  const tight = [];
  if (width > 0 && width < need) tight.push(`${trim(width)} mm wide`);
  if (height > 0 && height < need) tight.push(`${trim(height)} mm high`);
  if (!tight.length) return null;
  return `A ${trim(f)} mm shaker frame needs a front at least ${trim(need)} mm across `
    + `(2 × ${trim(f)} + ${trim(spec.minPanel)} mm of panel); this one is ${tight.join(' and ')}. `
    + 'It is cut plain.';
}

/** Both questions at once — the one a caller normally wants. */
export function shakerProblem({ w, h, frame }, profile) {
  return frameRangeProblem(frame, profile) || frameFitProblem({ w, h, frame }, profile);
}

/** Does this leaf get a recess? */
export function shakerFits({ w, h, frame }, profile) {
  return shakerProblem({ w, h, frame }, profile) === null;
}

/**
 * Where the recess runs on a front, in the front's own cut frame (origin
 * bottom-left, y up — the frame every outline in this engine is in).
 *
 * @returns {{x1:number, y1:number, x2:number, y2:number, depth:number,
 *            layer:string, frame:number}|null} null where it does not fit
 */
export function shakerPanelRect({ w, h, frame }, profile) {
  if (!shakerFits({ w, h, frame }, profile)) return null;
  const spec = shakerSpec(profile);
  const f = Number(frame);
  return {
    x1: f, y1: f, x2: Number(w) - f, y2: Number(h) - f,
    depth: spec.recessDepth,
    layer: spec.pocketLayer,
    frame: f,
  };
}

/**
 * …and the same rectangle as a POCKET record the exporter can write.
 *
 * `cutout: true` is what turns the loop CLOCKWISE in the DXF (F1.2): this is
 * the first thing this engine has ever cut that lies wholly INSIDE a board, and
 * the opposed winding is the signal VCarve reads to know which side of the line
 * the material is on. `depth` is what lets the 3-D view and the part detail cut
 * it as a real absence rather than draw a rectangle on the face.
 */
export function shakerPocket({ w, h, frame }, profile) {
  const rect = shakerPanelRect({ w, h, frame }, profile);
  if (!rect) return null;
  return {
    layer: rect.layer,
    x1: rect.x1, y1: rect.y1, x2: rect.x2, y2: rect.y2,
    depth: rect.depth,
    cutout: true,
  };
}

/**
 * Is this panel a front cut from the shaker style?
 *
 * Read off the PIECE's own `meta.frontType`, never off the unit's type — the
 * fact lives on the part.
 *
 * ─── TURN 26 (CLAUDE.md F5.5): AND AN APPLIANCE FRONT IS A FRONT ───────────
 *
 * This function used to answer FALSE for a D/W panel whatever its type said,
 * on turn 17's reading of "it is a front and nothing else — no hinges, flat, no
 * door furniture". The owner's turn-26 verdict corrects the middle of that
 * sentence: "A D/W front is a front: F3-turn-25's shaker applies to it, and so
 * do handles. The `dwPanel` path must stop being a special case for anything a
 * front normally has."
 *
 * What turn 17 was really saying — and what stands — is that it takes no CUP
 * HINGES, because it screws to the appliance's own door. That is one law about
 * one thing, and it is said where it belongs: on the drilling pass in
 * `engine/cabinet.js`, and in `engine/doors.js doorHingeDatum`, which hands a
 * D/W panel no datum at all. It is not said here, because "does this board
 * carry a rebate" and "is this board hung on hinges" are two questions.
 */
export function isShakerFront(panel) {
  if (panel?.role !== 'front') return false;
  return panel?.meta?.frontType === 'S';
}

/**
 * ─── TURN 30 (CLAUDE.md F21): AND A GLASS DOOR IS A FRAME TOO ───────────────
 *
 * Same question, same place, same answer off the PIECE's own `meta.frontType`.
 * A glass door is a shaker whose panel is not there: the frame is the shaker's,
 * of the shaker's width, and the recess goes all the way through.
 */
export function isGlassFront(panel) {
  if (panel?.role !== 'front') return false;
  return panel?.meta?.frontType === 'GL';
}

/**
 * The APERTURE a glass door's pane goes in: the shaker's own panel rectangle,
 * cut through the board instead of 6 mm into it.
 *
 * Returns null on a leaf the frame will not fit, exactly as `shakerPocket`
 * does — a 200 mm frame on a 300 mm door is two frames overlapping whether the
 * middle is glass or oak.
 */
export function glassAperture({ w, h, frame, thickness }, profile) {
  const rect = shakerPanelRect({ w, h, frame }, profile);
  if (!rect) return null;
  const layer = profile?.front?.types?.GL?.apertureLayer || 'GLASS_APERTURE';
  return {
    layer,
    x1: rect.x1,
    y1: rect.y1,
    x2: rect.x2,
    y2: rect.y2,
    // All the way through: the pane, not a recess.
    depth: Number(thickness) || rect.depth,
    cutout: true,
  };
}

/**
 * How far the panel floor sits below the front's face.
 *
 * ─── F3.5: THE HINGE RULE READS THE FULL BOARD ──────────────────────────────
 * Stated here so the number has a name and a single home. A shaker's panel
 * floor is `thickness − recessDepth` — 19 on a 25 — and it is a FLOOR, not a
 * thickness: the hinge angle ladder, the cup depth and everything else that
 * asks "how thick is this door" must read the board, which is 25. The engine
 * never writes 19 onto `panel.thickness`, and `test/turn25-f3-shaker.test.js`
 * pins that, because it is exactly the kind of thing that silently picks the
 * wrong article.
 */
export function shakerPanelFloor(thickness, profile) {
  const t = Number(thickness) || 0;
  const d = shakerSpec(profile).recessDepth;
  return Math.max(0, t - d);
}

const trim = (v) => {
  const s = Number(v).toFixed(2).replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s;
};

// ─── TURN 46 (CLAUDE.md F4): A SHAKER ON A PENTAGON ─────────────────────────
//
// *"Shaker on a pentagon: the frame follows all five edges (mitred at the
// diagonal); `shakerFits` decides at the threaded frame as ever — too small
// stays plain."*
//
// THE FRAME FOLLOWS ALL FIVE EDGES. A mitred frame of equal width is the
// panel's own outline moved INWARD by `frame` along every edge's normal — and
// on a diagonal the inward normal is not vertical, so the offset in y is
// `frame · sec θ`, where `tan θ` is the line's gradient. That factor is the
// whole of the difference between a frame that looks equal and one that is:
// dropping the diagonal by a bare `frame` leaves a rail visibly narrower than
// the four straight ones, which is precisely what "shaker zawsze równy" is not.
//
// ─── AND IT IS REFUSED, NOT SQUEEZED ────────────────────────────────────────
//
// The fit is asked at the LOW end, because that is where the frame runs out
// first: a 60 mm frame on a leaf that is 2147 mm tall at one edge and 90 mm at
// the other is two rails meeting. `frameFitProblem` is the same threaded
// function every other front in the app is measured by (T25's law, unchanged)
// — it is simply handed the height that decides, and a leaf that fails it is
// cut PLAIN with the sentence the app has always printed.

/**
 * The recess of a shaker front cut on the slope.
 *
 * @param {object} args
 *   w, h        the leaf's cut rectangle
 *   frame       the project's frame width
 *   cut         `{ hL, hR }` — the clear height at the leaf's left and right
 *               edges IN THE SHEET'S OWN FRAME (the inside mirror), which is
 *               the frame the outline beside it is written in.
 * @returns {{layer:string, x1:number, y1:number, x2:number, y2:number,
 *            depth:number, cutout:boolean, points:Array<[number,number]>}|null}
 *   null where the frame does not fit — the leaf is then cut plain.
 */
export function shakerCutPocket({ w, h, frame, cut }, profile) {
  if (!cut || !Number.isFinite(Number(cut.hL)) || !Number.isFinite(Number(cut.hR))) {
    return shakerPocket({ w, h, frame }, profile);
  }
  const width = Number(w) || 0;
  const f = Number(frame);
  const hL = Number(cut.hL);
  const hR = Number(cut.hR);
  // The narrowest the leaf gets is what decides, and it is asked of the very
  // function every straight front is asked of.
  if (frameFitProblem({ w: width, h: Math.min(hL, hR, Number(h) || 0), frame: f }, profile)) return null;
  const rect = shakerPanelRect({ w: width, h, frame: f }, profile);
  if (!rect) return null;
  // The diagonal, moved inward along its OWN normal.
  const gradient = width > 0 ? (hR - hL) / width : 0;
  const drop = f * Math.sqrt(1 + gradient * gradient);
  const innerAt = (x) => hL + gradient * x - drop;
  const round4 = (v) => Math.round(v * 1e4) / 1e4;
  // The inset rectangle, clipped by the inset diagonal — the same half-plane
  // clip the outline itself is cut with (`engine/puzzle.js`), so the frame and
  // the board it is in can never disagree about where the diagonal is.
  const corners = [[rect.x1, rect.y1], [rect.x2, rect.y1], [rect.x2, rect.y2], [rect.x1, rect.y2]];
  const under = (p) => p[1] <= innerAt(p[0]) + 1e-9;
  const cross = (a, b) => {
    const fa = a[1] - innerAt(a[0]);
    const fb = b[1] - innerAt(b[0]);
    const d = fa - fb;
    if (Math.abs(d) < 1e-12) return [b[0], innerAt(b[0])];
    const t = Math.min(Math.max(fa / d, 0), 1);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const points = [];
  for (let i = 0; i < corners.length; i += 1) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    if (under(a)) points.push([round4(a[0]), round4(a[1])]);
    if (under(a) !== under(b)) {
      const c = cross(a, b);
      points.push([round4(c[0]), round4(c[1])]);
    }
  }
  if (points.length < 3) return null;
  const ys = points.map((q) => q[1]);
  const xs = points.map((q) => q[0]);
  return {
    layer: rect.layer,
    // The BOUNDING BOX stays, so every reader written before tonight — the
    // 3-D solid, the elevation, the nesting — keeps working unchanged and a
    // reader that understands `points` cuts the true pentagon.
    x1: Math.min(...xs),
    y1: Math.min(...ys),
    x2: Math.max(...xs),
    y2: Math.max(...ys),
    depth: rect.depth,
    cutout: true,
    points,
  };
}
