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
 * A composed clone for ONE opening: arms at the sides, rod stretched between.
 *
 * @param {string} url        from coneroSrc()
 * @param {number} openingMm  the column's clear width (instance w)
 * @param {object} c          the profile's conero block (gaps, native rail)
 * @returns {THREE.Object3D|null}  in FILE units, bbox corner at origin;
 *   `userData.ccUnitToMm` says what one file unit is in millimetres
 */
export function coneroClone(url, openingMm, c) {
  const entry = glbSource(url);
  if (!entry?.loaded) return null;
  const clone = glbClone(url);
  if (!clone) return null;
  // Blender export is metres; a future re-export in mm keeps working: the
  // measured width decides, never a guess.
  const unitToMm = entry.size.x < 5 ? 1000 : 1;
  const gap = Math.max(0, Number(c?.sideGapMm) || 0) / unitToMm;
  const want = Math.max(1, Number(openingMm) || 1) / unitToMm;

  let rod = null;
  const arms = [];
  clone.traverse((o) => {
    const n = String(o.name || '');
    if (/-re$|-li$/.test(n)) arms.push(o);
    else if (/^3d-\d/.test(n) && o.parent === clone) rod = rod || o;
  });
  // The rod is the widest top-level child when names ever change.
  if (!rod) {
    let best = 0;
    for (const o of clone.children) {
      const b = new THREE.Box3().setFromObject(o);
      const w = b.max.x - b.min.x;
      if (w > best) { best = w; rod = o; }
    }
  }
  if (rod && !arms.includes(rod)) {
    const b0 = new THREE.Box3().setFromObject(rod);
    const native = b0.max.x - b0.min.x;
    const cx = (b0.min.x + b0.max.x) / 2;
    const sx = Math.max(0.05, (want - 2 * gap) / native);
    rod.scale.x *= sx;
    // stretch about its own centre, then park that centre mid-opening
    rod.position.x += (cx - cx * sx) + (want / 2 - cx);
  }
  for (const arm of arms) {
    const b = new THREE.Box3().setFromObject(arm);
    const left = /-li$/.test(String(arm.name || ''));
    arm.position.x += left ? (gap - b.min.x) : (want - gap - b.max.x);
  }
  clone.userData.ccUnitToMm = unitToMm;
  return clone;
}
