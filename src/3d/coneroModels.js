// ─── CONERO PULL-DOWN RAIL — the model over the placeholder (30.08.2026) ────
//
// The T33 grammar promised: "the day the owner supplies files, a datum wrapper
// over `glbSource` replaces the walls." This is that wrapper, and it IS the
// hinge/runner pipeline: `hardwareModelSrc` says where the file is (or null,
// and the walls stay), `glbSource` decodes it once, `glbClone` hands a copy
// seated at its own bbox corner.
//
// The mechanics the owner approved (mockup v3 + his green points, 30.08):
// triangular bases fixed at the MIDDLE OF THE DEPTH on each side, 27 mm off
// the panel for hinge clearance; the rod parks vertically ABOVE the bases;
// opening is a 90° swing about the plate axis, the rod counter-turning in
// its sleeves so the handle hangs plumb — `coneroPose` below is that swing,
// and the file's own pose is fraction zero.
//
// One file, three named objects (the manufacturer's own export):
//   '3d-674367-674569-730mm'  the rod — telescopic, so it is the ONE child
//                             stretched to the opening
//   '3d-238278-re' / '-li'    right/left arm with its base plate — never
//                             scaled, pinned to its side at the 27 mm gap
import * as THREE from 'three';
import { hardwareModelSrc } from '../engine/hardwareUrl.js';
import { glbClone, glbSource } from './glbSource.js';

// ─── The two axes the owner marked (30.08, his green points) ────────────────
// Measured from `conero-pantograf-730.glb`'s own vertex buffers, file metres:
//   plate — the arm pivot, the CENTRE OF THE BASE PLATE ("jeden gdzieś w
//           okolicy zielonego punktu i drugi dokładnie naprzeciwko"): one
//           axis through both plates, so one rotation serves both arms;
//   tube  — the rod tube's own axis: the rod turns the OPPOSITE way in the
//           arm ends, which is what keeps the handle hanging plumb through
//           the whole swing (his third point).
export const CONERO_AXES = {
  plate: { y: 0.0504, z: -0.1046 },
  tube: { y: 0.6573, z: -0.1290 },
};

/** The fetchable URL for the CONERO file, or null (walls stay). */
export function coneroSrc(profile, storageBase = '') {
  const c = profile?.wardrobeAccessories?.kits?.pulldown_rail?.conero;
  if (!c?.file) return null;
  return hardwareModelSrc({
    file: c.file, bucket: c.bucket, path: c.path, storageBase,
  });
}

/**
 * A composed clone for ONE opening — the owner's three laws (30.08):
 *   1. the bases' OUTER faces touch the cabinet sides — span = the opening;
 *   2. the rod stretches between them, keeping the file's own rod-into-arm
 *      engagement at every width;
 *   3. base underside to rail top = `totalHmm` (830 on the sheet), so the
 *      whole frame is scaled vertically to it;
 * and one look: dark powder-grey metal, the product's own, not the file's white.
 *
 * @param {string} url        from coneroSrc()
 * @param {number} openingMm  the column's clear width (instance w)
 * @param {number} totalHmm   base underside → rail top, in mm
 * @returns {THREE.Object3D|null}  in FILE units, bbox corner at origin;
 *   `userData.ccUnitToMm` says what one file unit is in millimetres
 */
export function coneroClone(url, openingMm, totalHmm) {
  const entry = glbSource(url);
  if (!entry?.loaded) return null;
  const clone = glbClone(url);
  if (!clone) return null;
  // The clone has never rendered, so its world matrices are identity — every
  // Box3 below would miss the seat shift without this one line.
  clone.updateMatrixWorld(true);
  // Blender export is metres; a future re-export in mm keeps working: the
  // measured width decides, never a guess.
  const unitToMm = entry.size.x < 5 ? 1000 : 1;
  const want = Math.max(1, Number(openingMm) || 1) / unitToMm;

  let rod = null;
  const arms = [];
  clone.traverse((o) => {
    const n = String(o.name || '');
    if (/-re$|-li$/.test(n)) arms.push(o);
    else if (/^3d-/.test(n)) rod = rod || o;
  });
  // `glbClone` wraps the scene in a group, so the three named nodes are
  // GRANDCHILDREN — never trust parenthood, only names; and when names ever
  // change, the widest SIBLING of the arms is the rod.
  if ((!rod || arms.includes(rod)) && arms.length) {
    let best = 0;
    rod = null;
    for (const o of arms[0].parent?.children || []) {
      if (arms.includes(o)) continue;
      const b = new THREE.Box3().setFromObject(o);
      const w = b.max.x - b.min.x;
      if (w > best) { best = w; rod = o; }
    }
  }
  let rodPivot = null;
  if (rod && !arms.includes(rod)) {
    const b0 = new THREE.Box3().setFromObject(rod);
    const nativeRail = b0.max.x - b0.min.x;
    // Keep the file's own rod-into-arm engagement: the rod grows by exactly
    // what the frame grows, so its ends sit in the sleeves at any width.
    const sx = Math.max(0.05, (nativeRail + (want - entry.size.x)) / nativeRail);
    rod.scale.x *= sx;
    // Park it mid-opening the way the arms are parked below: MEASURE the box
    // after the scale, then shift by the measured miss. The 30.08 bug was a
    // predicted shift that assumed the pivot at x=0 — this file's rod scales
    // about its own centre, so the "correction" alone pushed the rod 175 mm
    // right on a 560 opening, out past the side.
    clone.updateMatrixWorld(true);
    const b1 = new THREE.Box3().setFromObject(rod);
    rod.position.x += want / 2 - (b1.min.x + b1.max.x) / 2;
    // Axis B: reseat the rod on a pivot at ITS OWN TUBE — local coordinates
    // ARE file coordinates here (the named nodes carry no transforms; the
    // seat shift lives on their parent) — so the counter-turn that keeps the
    // handle plumb has a hinge to turn on. The x the centring just set rides
    // along on the rod and the closed pose does not move.
    rodPivot = new THREE.Group();
    rodPivot.position.set(0, CONERO_AXES.tube.y, CONERO_AXES.tube.z);
    rod.parent.add(rodPivot);
    rod.position.y -= CONERO_AXES.tube.y;
    rod.position.z -= CONERO_AXES.tube.z;
    rodPivot.add(rod);
  }
  for (const arm of arms) {
    const b = new THREE.Box3().setFromObject(arm);
    const left = /-li$/.test(String(arm.name || ''));
    // Law 1: the base's outer face ON the side — zero gap.
    arm.position.x += left ? (0 - b.min.x) : (want - b.max.x);
  }
  // Law 3: the frame's height is the sheet's number.
  const hTarget = Math.max(1, Number(totalHmm) || 0) / unitToMm;
  if (Number(totalHmm) > 0 && entry.size.y > 1e-6) {
    clone.scale.y *= hTarget / entry.size.y;
  }
  // The look: one dark metal on every mesh (the clone shares the file's
  // white materials otherwise).
  const metal = new THREE.MeshStandardMaterial({ color: 0x35373b, metalness: 0.7, roughness: 0.45 });
  clone.traverse((o) => { if (o.isMesh) o.material = metal; });
  // ─── Axis A: the swing, built OUTSIDE the height scale ────────────────────
  // Law 3 stretches the whole frame in y; a rotation nested UNDER that
  // anisotropic scale would shear the open pose (the arm would shorten as it
  // lay down). So the hinge sits ABOVE it, at the plate centre in the SEATED,
  // SCALED frame the caller actually looks at. At rotation zero the carrier
  // cancels the pivot exactly and the closed picture is the approved one.
  const kY = clone.scale.y;
  const swing = new THREE.Group();
  swing.position.set(0, (CONERO_AXES.plate.y - entry.min.y) * kY, CONERO_AXES.plate.z - entry.min.z);
  const carrier = new THREE.Group();
  carrier.position.set(0, -swing.position.y, -swing.position.z);
  carrier.add(clone);
  swing.add(carrier);
  const root = new THREE.Group();
  root.add(swing);
  root.userData.ccUnitToMm = unitToMm;
  root.userData.ccConero = { swing, rodPivot };
  return root;
}

/**
 * Put the mechanism at `fraction` of its travel: 0 = parked (the file's own
 * closed pose, the picture the owner approved, to the byte), 1 = fully
 * lowered — the arms flat, the rod out in front, the handle still plumb
 * because the rod turns BACK by the same angle in its sleeves (axis B).
 *
 * The sign: the scene's fronts open toward +z (a drawer slides out at
 * `pivot.z + travel`), and rotation.x = +90° is what carries the up-standing
 * arm to +z — forward and down, out in front of the wardrobe.
 *
 * (Known and accepted: the rod's counter-turn sits UNDER the height scale,
 * so a MID-swing frame skews the handle by up to the scale factor for a
 * blink. Both ENDPOINTS are exact — "to jest tylko wizualizacja", the owner.)
 */
export function coneroPose(model, fraction) {
  const rig = model?.userData?.ccConero;
  if (!rig) return;
  const a = (Math.max(0, Math.min(1, Number(fraction) || 0)) * Math.PI) / 2;
  rig.swing.rotation.x = a;
  if (rig.rodPivot) rig.rodPivot.rotation.x = -a;
}
