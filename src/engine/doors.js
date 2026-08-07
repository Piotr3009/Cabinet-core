// ─── How far a door actually opens (turn 8, CLAUDE.md F5) ───
//
// A door in the middle of a run swings a little past square, which is what a
// cup hinge does and what makes the inside of the cabinet readable. A door with
// a WALL on its hinge side cannot.
//
// The geometry is worth writing down, because the answer looks arbitrary and is
// not. A door hinged on its left, opening, sweeps its free edge forward and
// then round; the free edge's position along the wall is
//
//     x(θ) = hingeX + doorWidth · cos θ
//
// At θ = 90° that is the hinge line itself — the door stands square to the
// front and takes up no width at all. PAST 90° the cosine goes negative and the
// free edge crosses BACK over the hinge, towards the wall, until at 180° the
// door is flat against the side of the cabinet. So the wall is not hit on the
// way out; it is hit on the way past square.
//
// Which is why CLAUDE.md's answer — max 90° at a wall — is the right one and
// not a rounding: 90° is exactly the last angle at which a door of any width,
// beside a gap of any size, is still travelling away from the wall.
//
// Turn 8's other change is in here too: `gapToWall` is measured from where the
// unit ACTUALLY stands (F3), so the 10 mm every cabinet is held off the wall is
// part of the answer rather than a millimetre nobody counted.
//
// Pure functions — no React, no store imports, no three.js. Nothing here
// reaches the cut list: a swing is a picture.

const DEG = Math.PI / 180;

/**
 * The angle, in RADIANS, this door may open to.
 *
 * @param {object} args
 *   doorWidth   the front's own width, mm
 *   hingeOffset how far the hinge line is from the unit's edge on that side,
 *               mm (the overlay clearance — half the door gap)
 *   gapToWall   clear millimetres between that edge and the wall, or null when
 *               what is beside it is not a wall (a neighbour, open room)
 * @param {object} profile
 */
export function doorOpenAngle({ doorWidth, hingeOffset = 0, gapToWall = null }, profile) {
  const full = (profile?.doors?.openAngle ?? 99) * DEG;
  if (gapToWall == null) return full;

  const atWall = (profile?.doors?.openAngleAtWall ?? 90) * DEG;
  const w = Math.abs(Number(doorWidth) || 0);
  const gap = Math.max(0, Number(gapToWall) || 0);
  const offset = Math.max(0, Number(hingeOffset) || 0);
  if (w <= 0) return Math.min(full, atWall);

  // Where the free edge would touch: hingeX + w·cos θ = −gap, with the hinge at
  // `offset` inside the unit's edge and the wall `gap` outside it.
  const cos = -(gap + offset) / w;
  // A gap wider than the door itself is never reached at all; the door is free.
  const touch = cos <= -1 ? Math.PI : Math.acos(Math.max(-1, Math.min(1, cos)));

  // The door is free until it would touch. `atWall` is the floor under that,
  // because past square the door is travelling towards the wall and a swing
  // that stops with two millimetres to spare is a swing that looks wrong.
  if (touch >= full) return full;
  return Math.min(full, Math.max(atWall, 0));
}

/**
 * Where a wall unit hangs so that its TOP lines up with a tall unit's top
 * (turn 8, CLAUDE.md F5).
 *
 * A run of wall units beside a tall cabinet finishes on one line or the kitchen
 * looks like two kitchens. That line is the tall unit's top, so the mount
 * height is what puts the wall unit's top there — and it is a STARTING POINT,
 * not a rule: the field stays editable and a joiner may hang it wherever the
 * window lets him.
 *
 * @returns {number|null} the mounting height, or null when it cannot be met
 *          (a wall unit taller than the tall one it is beside).
 */
export function mountHeightAlignedWith({ tallTop, unitHeight, roomHeight = 0 }) {
  const top = Number(tallTop) || 0;
  const h = Number(unitHeight) || 0;
  const mount = top - h;
  if (!(mount > 0)) return null;
  const ceiling = Number(roomHeight) || 0;
  if (ceiling > 0 && mount + h > ceiling) return null;
  return mount;
}
