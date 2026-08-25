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
  const line = cutLinePts(cut, w);
  if (!line) return shakerPocket({ w, h, frame }, profile);
  const width = Number(w) || 0;
  const f = Number(frame);
  // The narrowest the leaf gets is what decides, and it is asked of the very
  // function every straight front is asked of.
  const low = line.reduce((lo, q) => Math.min(lo, q.y), Infinity);
  if (frameFitProblem({ w: width, h: Math.min(low, Number(h) || 0), frame: f }, profile)) return null;
  const rect = shakerPanelRect({ w: width, h, frame: f }, profile);
  if (!rect) return null;

  // ─── THE FRAME FOLLOWS THE LINE, SEGMENT BY SEGMENT (T50-F6) ─────────────
  //
  // Each straight run of the ceiling is moved INWARD along its OWN normal, so
  // the rail under it is `frame` wide measured square to it — `frame · sec θ`
  // in y, which is T46's factor per segment rather than once across the leaf.
  // The inner boundary is the LOWER ENVELOPE of those offset lines: on a
  // convex fall that is the exact inward offset, and on a valley it is
  // conservative, which is the safe direction (a rail is never narrower than
  // the frame, only wider).
  const offsets = [];
  for (let i = 1; i < line.length; i += 1) {
    const a = line[i - 1];
    const b = line[i];
    const run = b.x - a.x;
    if (!(Math.abs(run) > 1e-9)) continue;
    const m = (b.y - a.y) / run;
    offsets.push({ m, c: a.y - m * a.x - f * Math.sqrt(1 + m * m) });
  }
  if (!offsets.length) return null;
  const innerAt = (x) => offsets.reduce((lo, o) => Math.min(lo, o.c + o.m * x), Infinity);

  // Where the envelope BENDS: the line's own knees, and every crossing of two
  // offset lines. Both are exact and there are at most a handful of each.
  const bends = new Set(line.slice(1, -1).map((q) => q.x));
  for (let i = 0; i < offsets.length; i += 1) {
    for (let k = i + 1; k < offsets.length; k += 1) {
      const dm = offsets[i].m - offsets[k].m;
      if (Math.abs(dm) < 1e-12) continue;
      bends.add((offsets[k].c - offsets[i].c) / dm);
    }
  }

  const round4 = (v) => Math.round(v * 1e4) / 1e4;
  const ceilingOf = (x) => Math.min(rect.y2, innerAt(x));
  // Every x the top boundary could change direction at, inside the recess.
  const xs = [rect.x1, ...[...bends].filter((x) => x > rect.x1 + 1e-9 && x < rect.x2 - 1e-9), rect.x2]
    .sort((a, b) => a - b);
  // …plus where it crosses the recess's own flat top, which it does linearly
  // between two consecutive bends.
  const top = [];
  for (let i = 0; i < xs.length; i += 1) {
    const x = xs[i];
    if (i > 0) {
      const px = xs[i - 1];
      const pa = innerAt(px) - rect.y2;
      const pb = innerAt(x) - rect.y2;
      if ((pa > 0) !== (pb > 0) && Math.abs(pa - pb) > 1e-12) {
        const t = pa / (pa - pb);
        top.push({ x: px + (x - px) * t, y: rect.y2 });
      }
    }
    top.push({ x, y: ceilingOf(x) });
  }
  // A recess whose top boundary has fallen through its own floor is a leaf
  // with no panel left — cut it plain and say so, exactly as a frame that will
  // not fit is refused rather than squeezed.
  if (top.every((q) => q.y <= rect.y1 + 1e-9)) return null;

  const points = [
    [round4(rect.x1), round4(rect.y1)],
    [round4(rect.x2), round4(rect.y1)],
    ...[...top].reverse().map((q) => [round4(q.x), round4(Math.max(rect.y1, q.y))]),
  ];
  // Two identical vertices in a row are one vertex — a knee that lands on the
  // recess's own corner, and a flat ceiling whose envelope never bends.
  const clean = points.filter((q, i) => {
    const prev = points[(i - 1 + points.length) % points.length];
    return Math.abs(prev[0] - q[0]) > 1e-9 || Math.abs(prev[1] - q[1]) > 1e-9;
  });
  if (clean.length < 3) return null;
  const ys = clean.map((q) => q[1]);
  const xsOut = clean.map((q) => q[0]);
  return {
    layer: rect.layer,
    // The BOUNDING BOX stays, so every reader written before tonight — the
    // 3-D solid, the elevation, the nesting — keeps working unchanged and a
    // reader that understands `points` cuts the true polygon.
    x1: Math.min(...xsOut),
    y1: Math.min(...ys),
    x2: Math.max(...xsOut),
    y2: Math.max(...ys),
    depth: rect.depth,
    cutout: true,
    points: clean,
  };
}

/**
 * The cut line a front carries, as points in ITS OWN sheet frame — or null
 * where there is no cut at all.
 *
 * ─── TURN 50 (CLAUDE.md F6): T46'S NAMED DEBT, PAID ─────────────────────────
 *
 * T46 took `{ hL, hR }` — the clear height at the leaf's two edges — and drew
 * one straight diagonal between them. T47 then made the ceiling a POLYLINE, and
 * a shaker under a knee has been getting a straight chord across it ever since:
 * the same smear T47 fixed for the carcass, one board down. A cut carrying
 * `pts` answers with them; a cut carrying only the pair answers with the two
 * vertices that pair always WAS, so every fixture and every saved project reads
 * straight.
 */
function cutLinePts(cut, w) {
  if (!cut) return null;
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : NaN);
  if (Array.isArray(cut.pts) && cut.pts.length >= 2) {
    const pts = cut.pts
      .map((q) => ({ x: num(q?.x), y: num(q?.y) }))
      .filter((q) => Number.isFinite(q.x) && Number.isFinite(q.y))
      .sort((a, b) => a.x - b.x);
    return pts.length >= 2 ? pts : null;
  }
  const hL = num(cut.hL);
  const hR = num(cut.hR);
  if (!Number.isFinite(hL) || !Number.isFinite(hR)) return null;
  return [{ x: 0, y: hL }, { x: Number(w) || 0, y: hR }];
}
