// ─── Legs ───
// One rule for every standing type: four in the corners, and over a width
// threshold a FIFTH in the geometric centre of the footprint — the centre of
// the width AND of the depth (Piotr, turn 3). A 1200 mm base unit sags in the
// middle without it.
//
// The AutoLISP only ever draws a PAIR in the elevation view (drawLegPair:
// legW 78, inset by one board thickness from each side) and carries NO leg
// drilling in any CNC section, so this module places legs and counts them; it
// emits no holes. If leg plates ever get drilled, the positions are already
// here to hang them on.
//
// Pure functions — every number comes from profile.legs.

/**
 * @param {{width:number, depth:number, boardT:number, height:number}} unit
 * @param {object} profile
 * @returns {{count:number, height:number, positions:Array<{x:number,z:number,role:string}>}}
 */
export function legLayout({ width, depth, boardT, height }, profile) {
  const L = profile.legs;
  const inset = L.insetFromSide == null ? boardT : L.insetFromSide;
  const xL = inset;
  const xR = width - inset - L.width;
  const zFront = depth - L.insetFromFront - L.width;
  const zBack = L.insetFromBack;

  const positions = [
    { x: xL, z: zFront, role: 'corner' },
    { x: xR, z: zFront, role: 'corner' },
    { x: xL, z: zBack, role: 'corner' },
    { x: xR, z: zBack, role: 'corner' },
  ].slice(0, L.cornerCount);

  if (width > L.extraLegOverWidth) {
    positions.push({ x: width / 2 - L.width / 2, z: depth / 2 - L.width / 2, role: 'centre' });
  }

  return { count: positions.length, height, width: L.width, positions };
}

/** How many legs a unit of this width needs (the hardware quantity). */
export function legCount(width, profile) {
  return profile.legs.cornerCount + (Number(width) > profile.legs.extraLegOverWidth ? 1 : 0);
}
