// ─── THE RULER'S ONE NUMBER (turn 17, CLAUDE.md F11) ────────────────────────
//
// "A ruler in the canvas: click one point, click another, read the distance in
// mm… It measures; it never edits."
//
// The picking is a 3D question and lives in 3d/Ruler.jsx. The DISTANCE is not:
// it is the number the tool exists to produce, it is what a joiner will write
// on a cutting list, and it belongs where a node test can ask for it without a
// browser, a canvas or a camera.
//
// Pure JavaScript — no React, no three.js (engine rule).

/**
 * The distance between two picked points, in millimetres.
 *
 * A half-taken measurement — one point clicked, the second not yet — answers 0
 * rather than throwing: the tool is drawn every frame while the joiner decides
 * where the other end is.
 *
 * @param {number[]} a  [x, y, z] in mm
 * @param {number[]} b  [x, y, z] in mm
 * @returns {number} mm
 */
export function rulerDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  return Math.hypot(
    (Number(b[0]) || 0) - (Number(a[0]) || 0),
    (Number(b[1]) || 0) - (Number(a[1]) || 0),
    (Number(b[2]) || 0) - (Number(a[2]) || 0),
  );
}
