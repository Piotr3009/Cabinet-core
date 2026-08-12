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
  };
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
 * Read off the PIECE's own `meta.frontType`, never off the unit's type: a
 * D/W panel's face is a FRONT in every way that matters to the BOM and the
 * spray booth and is deliberately flat (turn 17, F9), and the way that stays
 * true is that the fact lives on the part.
 */
export function isShakerFront(panel) {
  if (panel?.role !== 'front') return false;
  if (panel?.meta?.appliance) return false;
  return panel?.meta?.frontType === 'S';
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
