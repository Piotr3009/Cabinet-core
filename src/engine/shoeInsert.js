// ─── THE SHOE DRAWER'S INSERT (turn 58, CLAUDE.md F2) ──────────────────────
//
// HISTORY, HONESTLY — and it is the reason this file exists at all. T54-F7
// killed the old shoe world on the owner's own order (*"usun stary kod na
// shoes i zrób z logiką drawers"*) and `reference/lisp/KIT_SHOE_BOX.lsp` went
// into the grave with it. The re-spec covered the BOX — a shoe is a
// `variant:'shoe'` drawer now, with a standard box and an 80 mm side — and it
// never mentioned what goes INSIDE. So the ramp and the dividers died without
// anybody deciding they should, and a shoe drawer has been a plain empty box
// ever since.
//
// This brings back the INSERT and only the insert. The box is a standard
// drawer and not one line here touches it.
//
// ─── THE ANGLE IS NOT A NEW NUMBER ─────────────────────────────────────────
//
// The ramp leans at the SHOE SHELF's own tilt — `wardrobeAccessories.
// shoeShelf.tiltDeg`, the T33 variant that survived T54 — because there is one
// shoe angle in this app and this is it. `reference/lisp/KIT_WARDROBE_FULL.lsp`
// section F states the same number as `shoeRampTiltDeg`, and the suite asserts
// the two are equal, so a second angle cannot be introduced quietly.
//
// Pure functions — no store, no three.js. The engine calls them; a node test
// can look at the answer.

import { roundTo } from './format.js';

/** The insert's own stock and the two numbers the owner fixed. */
export function shoeInsertSpec(profile) {
  const acc = profile?.wardrobeAccessories?.shoeShelf || {};
  return {
    // THE LIVING LAW. Not a copy — the shoe shelf's own tilt, read where it
    // lives, so moving it there moves the ramp with it.
    tiltDeg: Number(acc.tiltDeg) || 0,
    // *"po prostu daj 2 zawsze"* — three even lanes, and no field offers a
    // third answer anywhere in this app.
    dividerCount: 2,
    // The 9 mm the watch tray is cut from: two trays off one sheet.
    insertT: Number(profile?.watchDrawer?.dividerT) || 9,
    // How proud of the ramp a divider stands — high enough to keep a pair
    // apart, low enough that a shoe lifts out over it. Clamped down where the
    // headroom is short; below `dividerMinH` there is no lane worth cutting
    // and the insert is refused in words instead.
    dividerH: 60,
    dividerMinH: 20,
    // The shortest ramp worth calling one.
    rampMinRun: 100,
    // A hair of clearance so the insert drops in rather than being tapped in.
    clearanceMm: 1,
  };
}

/** Is this drawer item a shoe drawer? The variant IS the answer (T54-F7). */
export function shoeInsertOn(item) {
  return String(item?.variant || '').toLowerCase() === 'shoe';
}

/** …and a watch drawer, asked the same way, for the exclusion below. */
export function watchDrawerItem(item) {
  return item?.watch_insert === true || String(item?.variant || '').toLowerCase() === 'watch';
}

/**
 * Will the insert fit this drawer? Refuse in words rather than squash it.
 *
 * The same refuse-and-report the watch tray already keeps, and for the same
 * reason: a shipped-but-squashed insert is a board the workshop has to throw.
 */
export function shoeInsertFit(interior, profile, { headroom = Infinity } = {}) {
  const s = shoeInsertSpec(profile);
  const clear = {
    w: Number(interior?.width) || 0,
    d: Number(interior?.depth) || 0,
  };
  const lane = (clear.w - s.dividerCount * s.insertT) / (s.dividerCount + 1);
  if (!(clear.w > 0 && clear.d > 0)) {
    return { ok: false, reason: 'no-interior', lane };
  }
  if (lane < s.insertT * 2) return { ok: false, reason: 'too-narrow', lane };
  const plan = shoeRampPlan(clear.d, headroom, s);
  if (!plan.ok) return { ok: false, reason: plan.reason, lane, ...plan };
  return { ok: true, reason: null, lane, ...plan };
}

/**
 * HOW FAR THE RAMP RUNS, AND HOW TALL ITS DIVIDERS STAND.
 *
 * ─── THE ANGLE NEVER MOVES; THE RUN DOES ───────────────────────────────────
 *
 * The old shoe box (T34) solved this the other way round — *"rearEdge =
 * min(80, run × tan 10deg) … deep box ⇒ rear pinned at 80 and the angle comes
 * out under 10"* — and that is precisely the second angle CLAUDE.md forbids
 * tonight: two shoe drawers of different depths would lean at two different
 * angles and neither would be the shoe shelf's.
 *
 * So the TILT is fixed at the living law and the RUN is what gives way. The
 * ramp starts at the drawer's front floor and rises going back, and it stops
 * where the headroom stops it — a shoe stands toe-down at the front and heel
 * up the slope, which is the way a shoe rack has always been read.
 *
 * `headroom` is the clear height from the drawer floor to whatever board is
 * over it (the stack's own closing partition, normally). The ramp's rear
 * corner and a divider standing on it both have to pass under it.
 */
export function shoeRampPlan(depth, headroom, spec) {
  const beta = ((Number(spec?.tiltDeg) || 0) * Math.PI) / 180;
  const tan = Math.tan(beta);
  const d = Math.max(0, Number(depth) || 0);
  const room = Number.isFinite(headroom) ? Math.max(0, headroom) : Infinity;
  if (!(tan > 0)) return { ok: false, reason: 'no-tilt' };
  const wantRise = d * tan;
  // What the headroom leaves for the rise, once a divider and a hair of
  // clearance have had their share.
  const roomForRise = room === Infinity
    ? wantRise
    : room - spec.dividerMinH - spec.clearanceMm;
  const rise = Math.min(wantRise, Math.max(0, roomForRise));
  const run = rise / tan;
  if (run < spec.rampMinRun) {
    return {
      ok: false,
      reason: 'no-headroom',
      needsHeight: spec.rampMinRun * tan + spec.dividerMinH + spec.clearanceMm,
      headroom: room,
    };
  }
  const dividerH = room === Infinity
    ? spec.dividerH
    : Math.min(spec.dividerH, room - rise - spec.clearanceMm);
  return {
    ok: true,
    run: roundTo(run, 4),
    rise: roundTo(rise, 4),
    length: roundTo(run / Math.cos(beta), 4),
    dividerH: roundTo(dividerH, 4),
    // TRUE when the drawer is deeper than the headroom allowed — the report
    // and the Check line both want to know, because a joiner looking at a
    // half-length ramp deserves the sentence rather than the surprise.
    clamped: run < d - 0.01,
    fullRun: roundTo(d, 4),
    headroom: room,
  };
}

/** Where the two dividers stand, measured off the clear width. */
export function shoeDividerXs(innerW, spec) {
  const lane = (innerW - spec.dividerCount * spec.insertT) / (spec.dividerCount + 1);
  return Array.from({ length: spec.dividerCount }, (_, i) => roundTo(
    (i + 1) * lane + i * spec.insertT, 4,
  ));
}

const rect = (w, h) => ({
  outline: [[0, 0], [w, 0], [w, h], [0, h]], pockets: [], holes: [], layer: 'OUTLINE',
});

/**
 * Every piece of one shoe insert, in the DRAWER BOX's own frame.
 *
 * ONE RAMP + TWO DIVIDERS, always — `shoeInsertSpec.dividerCount` is a
 * constant and not an input, which is *"po prostu daj 2 zawsze"* said as code.
 *
 * ─── THE GRAIN, BORN HORIZONTAL ────────────────────────────────────────────
 * The owner's Petros iron rule, the one T55-F6 wrote down for the watch tray:
 * *"wszystkie przegródki muszą być w poziomie słoje nie w pionie"*. Every
 * board here is DRAWN STANDING — its length up the sheet — and states
 * `grain: 'h'` on the record at birth, so the cut decides and the 3-D renders
 * what was cut.
 *
 * @param {object} interior  `drawerBoxInterior()`'s answer — clear sizes AND
 *                           the corner they are measured from
 * @param {object} profile
 * @param {object} opts      { drawer } — the index the parts are keyed on
 * @returns {{parts:Array, spec:object, ramp:object}|null}
 */
export function shoeInsertParts(interior, profile, { drawer = 1, headroom = Infinity } = {}) {
  const fit = shoeInsertFit(interior, profile, { headroom });
  if (!fit.ok) return null;
  const s = shoeInsertSpec(profile);
  const at = interior.at || { x: 0, y: 0, z: 0 };
  const innerW = interior.width - 2 * s.clearanceMm;
  const x0 = at.x + s.clearanceMm;
  const z0 = at.z + s.clearanceMm;
  const y0 = at.y;

  const parts = [];
  /** A board, drawn standing, with the grain stated at birth. */
  const push = (id, part, box, w, h, meta) => parts.push({
    id: `D${drawer}-${id}`,
    part,
    role: 'shoe_insert',
    w: roundTo(w, 4),
    h: roundTo(h, 4),
    thickness: s.insertT,
    box,
    cnc: {
      rotated: true,
      drawn_w: roundTo(h, 4),
      drawn_h: roundTo(w, 4),
      grain: 'h',
      ...rect(roundTo(h, 4), roundTo(w, 4)),
    },
    meta: { drawer, ...meta },
  });

  // THE RAMP. Its BOX is the piece as fitted — lying on the lean, rear edge
  // up — and the 3-D leans it about its FRONT bottom edge, which is where it
  // touches the drawer floor. The `tilt_deg` is the shoe SHELF's own, and the
  // sheet prints it beside the blank the way a slope prints `CUT β°`.
  push('SHOE-RAMP', 'SHOE-RAMP', {
    x: x0, y: y0, z: z0, w: innerW, h: s.insertT, d: fit.length,
  }, innerW, fit.length, {
    tilt_deg: roundTo(s.tiltDeg, 4),
    tilt_pivot: { y: y0, z: z0 },
    rise_mm: fit.rise,
    run_mm: fit.run,
    clamped: fit.clamped,
    note: `CUT ${roundTo(s.tiltDeg, 1)} DEG`,
  });

  // THE TWO DIVIDERS, standing on the ramp and running front to back, so the
  // drawer reads as three even lanes. Their length is the ramp's own — there
  // is no second arithmetic for it.
  shoeDividerXs(innerW, s).forEach((dx, i) => {
    push(`SHOE-DIV-${i + 1}`, 'SHOE-DIVIDER', {
      x: x0 + dx, y: y0, z: z0, w: s.insertT, h: fit.dividerH, d: fit.length,
    }, fit.length, fit.dividerH, {
      divider: i + 1,
      lane_w_mm: roundTo(fit.lane, 4),
      tilt_deg: roundTo(s.tiltDeg, 4),
      tilt_pivot: { y: y0, z: z0 },
    });
  });

  return { parts, spec: s, ramp: fit };
}
