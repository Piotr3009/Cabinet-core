// ─── CONERO PULL-DOWN RAIL — the model over the placeholder (30.08.2026) ────
//
// The T33 grammar promised: "the day the owner supplies files, a datum wrapper
// over `glbSource` replaces the walls." This is that wrapper, and it IS the
// hinge/runner pipeline: `hardwareModelSrc` says where the file is (or null,
// and the walls stay), `glbSource` decodes it once, `glbClone` hands a copy
// seated at its own bbox corner.
//
// The mechanics the owner approved (mockup v3): triangular bases fixed at the
// MIDDLE OF THE DEPTH on each side, 27 mm off the panel for hinge clearance;
// the rod parks vertically ABOVE the bases; opening is a 90° swing — none of
// which this module animates yet: the scene shows the CLOSED state, which is
// exactly the file's own pose.
//
// One file, three named objects (the manufacturer's own export):
//   '3d-674367-674569-730mm'  the rod — telescopic, so it is the ONE child
//                             stretched to the opening
//   '3d-238278-re' / '-li'    right/left arm with its base plate — never
//                             scaled, pinned to its side at the 27 mm gap
import * as THREE from 'three';
import { hardwareModelSrc } from '../engine/hardwareUrl.js';
import { glbClone, glbSource } from './glbSource.js';

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
  if (rod && !arms.includes(rod)) {
    const b0 = new THREE.Box3().setFromObject(rod);
    const nativeRail = b0.max.x - b0.min.x;
    const cx = (b0.min.x + b0.max.x) / 2;
    // Keep the file's own rod-into-arm engagement: the rod grows by exactly
    // what the frame grows, so its ends sit in the sleeves at any width.
    const sx = Math.max(0.05, (nativeRail + (want - entry.size.x)) / nativeRail);
    rod.scale.x *= sx;
    // stretch about its own centre, then park that centre mid-opening
    rod.position.x += (cx - cx * sx) + (want / 2 - cx);
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
  clone.userData.ccUnitToMm = unitToMm;
  return clone;
}
