// ─── Where the bought hardware actually IS (turn 7, CLAUDE.md F3 / #42) ───
//
// The engine has always said how MANY hinges a unit needs and where the holes
// for them go. It has never said where the hinge is, because until X-ray mode
// nothing had to draw one.
//
// This turns the drilling into placements. It is deliberately not a new source
// of truth: every position below is read off `result.drillSummary`,
// `result.assemblies` or a panel's own box — the same numbers the CNC files and
// the cut list come from — so a hinge in the 3D view cannot end up somewhere
// the machine will not drill for it. The SIZES come from `profile.hardware`,
// which is the catalogue: no model files, nothing downloaded, and a workshop on
// a different hinge system edits one block of millimetres.
//
// The counts are the contract. `hardwareInstances()` must produce exactly what
// `result.hardware` says has to be bought — that is what test/hardware-3d.js
// checks against the golden fixtures, and it is what stops the picture and the
// order form from drifting apart.
//
// Coordinates are cabinet-local millimetres, the same frame every panel box is
// in: x across the width, y up from the carcass base, z from the wall (0) to
// the front face (depth).
//
// Pure functions — no React, no three.js, no store imports.

/**
 * @param {object} result   computeCabinet() output
 * @param {object} profile
 * @returns {{hinges:Array, runners:Array, legs:Array, rails:Array}}
 */
export function hardwareInstances(result, profile) {
  return {
    hinges: hingeInstances(result, profile),
    runners: runnerInstances(result, profile),
    legs: legInstances(result),
    rails: railInstances(result, profile),
  };
}

/**
 * One hinge per door per hinge row.
 *
 * The HEIGHTS are `drillSummary.hinge_centers` — the carcass rows the plate is
 * screwed to, which is what CLAUDE.md names. The SIDE and the door's own edges
 * come from the front panel's box, so a pair of doors puts one hinge set on
 * each side without this function knowing how many doors there are.
 *
 * `x` is the CUP centre: `hinges.cups.xFromHingeEdge` in from the door's hinge
 * edge, which is the same 21.5 mm the front panel is drilled at.
 */
function hingeInstances(result, profile) {
  const out = [];
  const centres = result.drillSummary?.hinge_centers || [];
  if (!centres.length) return out;
  const cups = profile.hinges.cups;
  const W = result.params.width;
  const G = result.params.board_t;
  const D = result.params.depth;

  for (const panel of result.panels) {
    if (panel.part !== 'FRONT' || !panel.box) continue;
    const right = panel.meta?.hinge === 'R';
    const edgeX = right ? panel.box.x + panel.box.w : panel.box.x;
    // +1 towards the middle of the door for a left hinge, −1 for a right one.
    const dir = right ? -1 : 1;
    for (const y of centres) {
      out.push({
        kind: 'hinge',
        side: right ? 'R' : 'L',
        dir,
        // The cup, bored into the back face of the door.
        x: edgeX + dir * cups.xFromHingeEdge,
        y,
        z: panel.box.z,
        // …and the plate, on the inner face of the side panel this door hangs
        // from, at the same distance from the front edge the engine drills the
        // plate screws at (profile.hinges.xFromFrontEdge).
        plateX: right ? W - G : G,
        plateZ: D - profile.hinges.xFromFrontEdge,
        panelId: panel.id,
      });
    }
  }
  return out;
}

/**
 * Two runner profiles per drawer — a PAIR, which is the unit the BOM counts in.
 *
 * The rows are the engine's own (`runner_rows_carcass_y`), and everything else
 * is read off the DRAWER BOX that runs on them: how far back the box sits, how
 * long it is, and where its two sides are. That is not a shortcut — it is the
 * only way the runner can be guaranteed to be under the box it carries, on a
 * wardrobe whose drawer panel makes the two sides asymmetric.
 *
 * The length the box gives is the same one the BOM orders
 * (result.hardware → runner_pairs → spec.length_mm), which the test holds.
 */
function runnerInstances(result, profile) {
  const rows = result.drillSummary?.runner_rows_carcass_y || [];
  if (!rows.length) return [];

  const W = result.params.width;
  const G = result.params.board_t;
  const D = result.params.depth;
  const HW = profile.hardware.runner;

  // The drawer box, as the engine cut it. Any one of the sides answers the
  // three questions this needs; they are all the same depth in one unit.
  const sides = result.panels.filter((p) => p.part === 'DRAWER-SIDE' && p.box);
  const sample = sides[0] || null;
  const length = sample ? sample.box.d
    : Number(result.hardware.find((h) => h.role === 'runner_pairs')?.spec?.length_mm) || 0;
  const z = sample ? sample.box.z : D - length;

  // The outside faces of the box: where the pair sits. Without a box (a stack
  // the carcass refused), fall back to the carcass sides so the count still
  // matches what is on order.
  const xs = sides.map((p) => p.box.x);
  const leftFace = xs.length ? Math.min(...xs) : G;
  const rightFace = xs.length ? Math.max(...xs.map((x, i) => x + sides[i].box.w)) : W - G;

  const out = [];
  for (const y of rows) {
    out.push({ kind: 'runner', side: 'L', x: leftFace, y, z, length, thickness: HW.profileThickness });
    out.push({ kind: 'runner', side: 'R', x: rightFace, y, z, length, thickness: HW.profileThickness });
  }
  return out;
}

/**
 * The legs, from the engine's own layout — four in the corners and a fifth in
 * the middle over the width threshold (profile.legs). The view has placed these
 * since turn 1; what turn 7 changes is that they are a plate, a stem and a foot
 * instead of a box.
 */
function legInstances(result) {
  const legs = result.assemblies.legs;
  const height = result.assemblies.carcass.legHeight || 0;
  if (!legs || !(height > 0)) return [];
  return legs.positions.map((leg) => ({
    kind: 'leg',
    x: leg.x + legs.width / 2,
    y: -height / 2,
    z: leg.z + legs.width / 2,
    height,
    plate: legs.width,
  }));
}

/** The hanging rail, if this unit has one: a tube at the profile's diameter. */
function railInstances(result, profile) {
  const rail = result.assemblies.rail;
  if (!rail) return [];
  return [{
    kind: 'rail',
    x: (rail.x1 + rail.x2) / 2,
    y: rail.y,
    z: rail.z,
    length: rail.x2 - rail.x1,
    diameter: profile.hardware.rail.diameter,
  }];
}

/**
 * What the BOM says has to be bought, as plain counts — so a test can hold the
 * picture and the order form to each other without knowing either one's shape.
 *
 * A runner PAIR is two profiles; everything else is one instance per piece.
 */
export function hardwareCounts(result) {
  const qty = (role) => Number(result.hardware.find((h) => h.role === role)?.qty) || 0;
  return {
    hinges: qty('hinges'),
    runners: qty('runner_pairs') * 2,
    legs: qty('legs'),
    rails: qty('rail'),
  };
}
