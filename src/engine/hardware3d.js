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
import { panelPlacement } from './joinery.js';
import { cupBoreOf, doorHingeDatum } from './doors.js';

export function hardwareInstances(result, profile) {
  return {
    hinges: hingeInstances(result, profile),
    runners: runnerInstances(result, profile),
    // Turn 18 (CLAUDE.md F6.5): the synchronisation rod, on the wide drawers
    // that need one and on no others.
    rods: rodInstances(result, profile),
    legs: legInstances(result),
    rails: railInstances(result, profile),
    // Turn 25 (CLAUDE.md F6): the sleeves and pins an ADJUSTABLE shelf stands
    // on. Display only — every one of them is read off a ⌀7.5 hole the machine
    // already bores, so nothing here reaches the cut list.
    shelfSupports: shelfSupportInstances(result, profile),
  };
}

/**
 * ─── THE ADJUSTABLE SHELF SHOWS ITS BRASS (turn 25, CLAUDE.md F6) ───────────
 *
 * The owner wants to SEE gold or silver sleeves — and they are the ⌀7.5 this
 * engine has drilled since turn 1, not a new 5 mm system. So there is nothing
 * new to cut: this reads the holes that ALREADY carry each shelf and says where
 * the fitting in them is.
 *
 * ─── WHICH HOLES CARRY IT ───────────────────────────────────────────────────
 *
 * A row of shelf holes is a CLUSTER — three of them, at `clusterOffsets`, so
 * the shelf can be moved a notch either way. Only the one the shelf is actually
 * standing on has a pin in it, and that is the hole at the shelf's own
 * underside. `pinsPerShelf` (4) is the count the BOM has always ordered, and it
 * is what falls out of this: two columns on each of two sides.
 *
 * ─── FIX SHELVES SHOW NOTHING, AND THAT IS THE FEATURE (F6.2) ───────────────
 *
 * A fixed shelf has no pin holes at all — turn 24 made that law — so it has no
 * carrying holes for this to find and contributes nothing without being asked
 * to. One look tells you which shelf is which, and the reason it does is that
 * the picture is a reading of the drilling rather than a second drawing of it.
 *
 * R9 falls out the same way: no shelf, no holes, no sleeves.
 */
export function shelfSupportInstances(result, profile) {
  const layer = profile.shelfHoles.layer;
  const out = [];
  const shelves = result.panels.filter((p) => p.part === 'SHELF' && p.box);
  if (!shelves.length) return out;

  for (const shelf of shelves) {
    // The row the shelf stands on is its own underside. A hole a millimetre
    // either side of it is a NOTCH, not a support.
    const rowY = shelf.box.y;
    for (const hole of result.drills) {
      if (hole.layer !== layer) continue;
      if (Math.abs(hole.y - rowY) > 0.5) continue;
      const side = result.panels.find((p) => p.id === hole.panel);
      const placement = side ? panelPlacement(side) : null;
      if (!placement) continue;
      // …and it has to be a hole in a board this shelf actually reaches.
      const { origin, u, v, n } = placement;
      const thickness = Math.abs(n[0]) > 0.5 ? side.box.w
        : (Math.abs(n[1]) > 0.5 ? side.box.h : side.box.d);
      // The drilled face is the INNER one — the CNC frame's origin sits on the
      // outward face, so stepping one board back along the outward normal is
      // where a sleeve's flange actually shows.
      const at = (i) => origin[i] + u[i] * hole.x + v[i] * hole.y - n[i] * thickness;
      out.push({
        kind: 'shelf_support',
        shelf: shelf.id,
        panel: hole.panel,
        x: at(0),
        y: at(1),
        z: at(2),
        // Which way the pin points OUT of the board it is knocked into: the
        // opposite of the panel's outward normal, i.e. into the cabinet.
        normal: [-n[0], -n[1], -n[2]],
        diameter: hole.d,
      });
    }
  }
  return out;
}

/**
 * ─── ONE PATH FOR EVERY LEAF (turn 26, CLAUDE.md F2.1) ──────────────────────
 *
 * The owner, on the small partition-hung leaves: the hinges are the OLD
 * procedural ones, they do not fold, and they pierce. Three symptoms, and
 * there is now exactly ONE function that answers "where is this door's
 * ironmongery" — this one — for a leaf hung on a carcass side and for a leaf
 * hung on a partition alike.
 *
 * It reads the two facts the ENGINE already wrote on the leaf:
 *
 *   `hingeOn`    which piece the plate is screwed to — 'BUL', 'BUR' or a
 *                partition's own panel id;
 *   `hingeFace`  WHICH of that piece's two faces takes it, where the piece has
 *                two that matter (a partition). Turn 24 derived this from the
 *                door's hand instead and got the same answer by construction —
 *                which is a coincidence held in place by a comment, and this
 *                turn stops relying on it: the meta wins where it is present,
 *                and `test/turn26-f2-one-hinge-path.test.js` asserts the
 *                derivation agrees with it on every leaf of the pair.
 *
 * The HEIGHTS are `drillSummary.hinge_centers` — the carcass rows the plate is
 * screwed to. `x` is the CUP centre: `hinges.cups.xFromHingeEdge` in from the
 * door's hinge edge, the same 21.5 mm the front panel is drilled at. `z` is
 * the leaf's MOUNTING DATUM — its inner face, resolved by the one helper
 * (`engine/doors.js doorHingeDatum`), never re-derived here.
 */
function hingeInstances(result, profile) {
  const out = [];
  const centres = result.drillSummary?.hinge_centers || [];
  if (!centres.length) return out;
  const W = result.params.width;
  const G = result.params.board_t;

  for (const panel of result.panels) {
    for (const instance of doorHingeInstances(panel, {
      panels: result.panels, centres, profile, width: W, boardT: G, depth: result.params.depth,
    })) out.push(instance);
  }
  return out;
}

/**
 * The hinges of ONE leaf. Exported because the paired test asserts the two
 * kinds of leaf come out of the same call rather than out of two that happen
 * to agree (F2.2).
 *
 * @param {object} panel   an engine panel record — anything that is not a
 *   hinged FRONT contributes nothing, which is how the D/W panel (F5.3) and
 *   every carcass board fall out without a branch of their own.
 */
export function doorHingeInstances(panel, {
  panels = [], centres = [], profile, width = 0, boardT = 0, depth = 0,
}) {
  if (!panel || panel.part !== 'FRONT' || !panel.box) return [];
  // The DATUM, and the gate. A leaf with no datum is a leaf that takes no cup
  // hinges at all — today that is the appliance front, and it is one `null`
  // rather than a special case here and another one in the view.
  const datum = doorHingeDatum(panel);
  if (!datum) return [];
  // The BORE — the owner's 11 mm, clamped to the board so a blind cup stays
  // blind on an 18 mm front. It travels on the instance because the view draws
  // the procedural cylinder to it and the guard measures against it, and two
  // readings of one number is how this turn's fault got in.
  const bore = cupBoreOf(panel, profile);

  const cups = profile.hinges.cups;
  const right = panel.meta?.hinge === 'R';
  const edgeX = right ? panel.box.x + panel.box.w : panel.box.x;
  // +1 towards the middle of the door for a left hinge, −1 for a right one.
  const dir = right ? -1 : 1;

  // ─── WHICH PIECE, AND WHICH OF ITS FACES ────────────────────────────────
  //
  // A door hung on a carcass side takes the inner face of that side; a door
  // hung on a PARTITION takes the face of that partition it closes against.
  // Both are named on the leaf itself.
  const on = panel.meta?.hingeOn
    ? panels.find((p) => p.id === panel.meta.hingeOn && p.box)
    : null;
  // `hingeFace` is the ENGINE's own answer and it is the one the plate pattern
  // is drilled from (engine/cabinet.js). 'L' means the plate is on the bearer's
  // LEFT face, 'R' its right one. Absent — a carcass side, which has only one
  // face a door can close against — it falls to the door's own hand, which is
  // the same law said the other way round.
  const face = panel.meta?.hingeFace || (right ? 'L' : 'R');
  const plateFaceX = on
    ? (face === 'L' ? on.box.x : on.box.x + on.box.w)
    : (right ? width - boardT : boardT);

  return centres.map((y) => ({
    kind: 'hinge',
    side: right ? 'R' : 'L',
    dir,
    // The cup, bored into the INNER face of the door.
    x: edgeX + dir * cups.xFromHingeEdge,
    y,
    z: datum.innerZ,
    // Turn 26 (F1.3): the plane nothing about this hinge may cross, carried on
    // the instance so the scene and the guard read one number.
    outerZ: datum.outerZ,
    thickness: datum.thickness,
    cupDepth: bore?.depth ?? 0,
    // …and the plate, on the face of the piece this door hangs from, at the
    // same distance from the front edge the engine drills the plate screws at
    // (profile.hinges.xFromFrontEdge).
    plateX: plateFaceX,
    plateZ: depth - profile.hinges.xFromFrontEdge,
    // Which bearer, and which of its faces — reported so a walk can assert the
    // mount rather than infer it from a coordinate (F2.2).
    hingeOn: panel.meta?.hingeOn || null,
    hingeFace: face,
    onPartition: Boolean(on && on.part === 'VPART'),
    panelId: panel.id,
  }));
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
  // ─── TURN 21 (CLAUDE.md F1.3): THE MODEL STANDS ON THE RUNNER, NOT ON ITS
  //     SCREWS ────────────────────────────────────────────────────────────
  //
  // Both the downloaded GLB and the grey stand-in are placed with their own
  // BOTTOM at the instance's `y`, and turn 18 handed them the drilled row —
  // the MOVENTO screw centres, `firstRowFromBottom` (38 mm) above the runner's
  // underside. So every runner in the app was drawn 38 mm high, exactly like
  // the box that turn 21 has just re-anchored, and the model's own screw holes
  // sat 38 mm above the holes the machine drills for them.
  //
  // The runner's underside is its own quantity now
  // (`runner_bottoms_carcass_y`). `rowY` travels with the instance so the
  // screw centres are still reachable — they are what the carcass is drilled
  // on, and the model's holes are what they must land in.
  const bottoms = result.drillSummary?.runner_bottoms_carcass_y || [];

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
  for (const [i, rowY] of rows.entries()) {
    // Turn 18 (CLAUDE.md F6.4): WHICH DRAWER this pair belongs to, counted from
    // the floor exactly as the engine counts them everywhere else. The variant
    // is a per-drawer answer, so the view has to be able to ask the question,
    // and the rows are already in the engine's own order.
    const drawer = i + 1;
    const y = Number.isFinite(bottoms[i]) ? bottoms[i] : rowY;
    out.push({
      kind: 'runner', side: 'L', drawer, x: leftFace, y, rowY, z, length, thickness: HW.profileThickness,
    });
    out.push({
      kind: 'runner', side: 'R', drawer, x: rightFace, y, rowY, z, length, thickness: HW.profileThickness,
    });
  }
  return out;
}

/**
 * The synchronisation rod, where the drawer is wide enough to need one
 * (turn 18, CLAUDE.md F6.5).
 *
 * A rod ties the two runners together so a wide box cannot rack. WHETHER there
 * is one and HOW LONG it is are the engine's (`result.hardware` →
 * `runner_sync_rods`, computed in cabinet.js from Blum's own thresholds); this
 * only says where it lies — across the back of the box, at the runner row.
 */
function rodInstances(result, profile) {
  const line = result.hardware.find((h) => h.role === 'runner_sync_rods');
  if (!line || !(line.qty > 0)) return [];
  // Turn 21 (CLAUDE.md F1.3): the rod ties the two RUNNERS together, so it
  // rides with them — on the runner's underside, not on its screw centres.
  const rows = result.drillSummary?.runner_bottoms_carcass_y?.length
    ? result.drillSummary.runner_bottoms_carcass_y
    : (result.drillSummary?.runner_rows_carcass_y || []);
  const sides = result.panels.filter((p) => p.part === 'DRAWER-SIDE' && p.box);
  if (!rows.length || !sides.length) return [];
  const xs = sides.map((p) => p.box.x);
  const centreX = (Math.min(...xs) + Math.max(...xs.map((x, i) => x + sides[i].box.w))) / 2;
  const sample = sides[0];
  const length = Number(line.spec?.length_mm) || 0;
  return rows.map((y, i) => ({
    kind: 'rod',
    drawer: i + 1,
    x: centreX,
    y,
    // At the BACK of the box, which is where a synchronisation rod runs.
    z: sample.box.z,
    length,
    diameter: profile.hardware.runner.movento.rod.diameter,
  }));
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
  // SUMMED, not found (turn 19, CLAUDE.md F1.2). One role can be several lines
  // now — a cabinet whose two leaves are fitted with different hinges buys them
  // on two rows, exactly as two drawer variants have bought runners on two rows
  // since turn 18 — and a `find` would have counted the first leaf and drawn
  // twelve hinges against an order for six. A single-line role sums to itself.
  const qty = (role) => result.hardware
    .filter((h) => h.role === role)
    .reduce((n, h) => n + (Number(h.qty) || 0), 0);
  return {
    hinges: qty('hinges'),
    runners: qty('runner_pairs') * 2,
    legs: qty('legs'),
    rails: qty('rail'),
  };
}
