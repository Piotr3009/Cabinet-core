/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT-FIX 14.10.2026: THE HARDWARE, LIGHTER WHEN THE CAMERA IS FAR ───────
//
// Measured on the owner's machine (Intel UHD, 14.10.2026): a plain base
// cabinet is ~40,000 triangles in the room, and two Blum hinges account for
// ~18,000 of them (profile.js: 8,962 per hinge, the real 71B3550 file). Twelve
// cabinets are 480,000 triangles and the integrated GPU drops to 30 fps the
// moment an island adds two more. The engine, the BOM and the editor windows
// are untouched: this is the ROOM view only.
//
// Every mesh of a loaded hardware GLB gets a second, decimated geometry once
// at load (SimplifyModifier from three's own examples, ~1/5 of the triangles,
// never below LITE_MIN_TRIANGLES). Clones share both by reference. A walker
// on the room canvas (3d/frameDemand.jsx) swaps each hardware mesh to the lite
// geometry when it stands farther than FULL_WITHIN_M from the camera, and back
// when the camera comes close: the same file, the same finish, fewer
// triangles where no eye can tell. The owner's rule from 14.08.2026 stands: a
// hinge is the downloaded model or nothing; there is no stand-in here.

import * as THREE from 'three';
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';

const FULL_WITHIN_M = 1.8;
const BACK_TO_FULL_M = 1.5;
const LITE_RATIO = 0.2;
const LITE_MIN_TRIANGLES = 400;
const SIMPLIFY_ABOVE_TRIANGLES = 600;

const trianglesOf = (g) => Math.floor((g.index ? g.index.count : g.attributes.position.count) / 3);

/** Give every mesh of a freshly loaded model its lite geometry. Idempotent. */
export function prepareHardwareLod(scene) {
  if (!scene) return;
  const modifier = new SimplifyModifier();
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry || o.geometry.userData.ccLite !== undefined) return;
    const full = o.geometry;
    const tris = trianglesOf(full);
    if (tris <= SIMPLIFY_ABOVE_TRIANGLES) { full.userData.ccLite = null; return; }
    try {
      const keep = Math.max(LITE_MIN_TRIANGLES, Math.round(tris * LITE_RATIO));
      // The modifier removes VERTICES; triangles go down with them at about
      // the same ratio, which is all a lite copy needs.
      const remove = Math.max(0, Math.floor(full.attributes.position.count * (1 - keep / tris)));
      const lite = modifier.modify(full, remove);
      if (trianglesOf(lite) >= tris) { full.userData.ccLite = null; return; }
      lite.computeVertexNormals();
      lite.userData.ccLiteOf = full;
      full.userData.ccLite = lite;
    } catch {
      full.userData.ccLite = null;
    }
  });
}

/** Mark a clone's meshes so the walker can find them. */
export function tagHardwareLod(root) {
  root.traverse((o) => {
    if (o.isMesh && o.geometry?.userData?.ccLite) o.userData.ccLod = { full: o.geometry, lite: o.geometry.userData.ccLite };
  });
}

const at = new THREE.Vector3();

/** One pass: every tagged mesh gets the geometry its distance deserves. */
export function applyHardwareLod(scene, camera) {
  scene.traverse((o) => {
    const lod = o.userData?.ccLod;
    if (!lod) return;
    at.setFromMatrixPosition(o.matrixWorld);
    const d = at.distanceTo(camera.position);
    const isLite = o.geometry === lod.lite;
    if (!isLite && d > FULL_WITHIN_M) o.geometry = lod.lite;
    else if (isLite && d < BACK_TO_FULL_M) o.geometry = lod.full;
  });
}
