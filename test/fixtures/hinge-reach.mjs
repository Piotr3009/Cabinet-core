// ─── HOW FAR A MOUNTED HINGE REACHES INTO ITS LEAF (turn 26, F1.3/F2.2) ─────
//
// Shared by `turn26-f1-no-pierce` (the sweep across door types and rig angles)
// and by `turn26-f2-one-hinge-path` (the paired test, which asks the same
// question of a side-hung and a partition-hung leaf). One implementation,
// because two would be two things that could disagree about the very geometry
// the pair exists to prove identical.
//
// It reads the GLB's bytes directly — `scripts/glb-meshes.mjs`, no loader and
// no XHR — places them by the same transform `3d/glbSource.js` applies, splits
// the members with the same `memberOfNode` the rig uses, and folds member B
// about the same `foldPivotMm` axis `3d/hingeModels.js` folds it about.
//
// ─── TURN 30 (CLAUDE.md F1): THAT TRANSFORM IS `−fileDatum` NOW ────────────
//
// It was `−min + modelOrigin`. The owner's 155° hinge proved what min-relative
// costs on a file whose bounding box is not the measured one, so the body goes
// on its ABSOLUTE cup datum and this reader follows it there. On `42542984`
// the two are the same placement to the byte, which is why every number this
// file has ever produced is unchanged.

import { readFileSync } from 'node:fs';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { foldPivotMm, memberOfNode } from '../../src/3d/hingeModels.js';
import { parseGlb, meshTable } from '../../scripts/glb-meshes.mjs';

const C = P.hardware.hinge.cliptop;

/** 0 … a CLIP top's full 110°, and the angles the screenshots are taken at. */
export const ANGLES = [0, 15, 30, 45, 60, 90, 100, 110];

let ROWS = null;
export function hingeMeshRows() {
  if (!ROWS) {
    ROWS = meshTable(parseGlb(readFileSync(new URL(
      './hardware-local/hardware/hinges/blum/71B3550_10001.glb',
      import.meta.url,
    ))));
  }
  return ROWS;
}

export function hingeFileBox() {
  const all = hingeMeshRows();
  const pick = (i, fn) => fn(...all.map((r) => (fn === Math.min ? r.min[i] : r.max[i])));
  return {
    min: { x: pick(0, Math.min), y: pick(1, Math.min), z: pick(2, Math.min) },
    max: { x: pick(0, Math.max), y: pick(1, Math.max), z: pick(2, Math.max) },
  };
}

/**
 * How far into the leaf each member of the downloaded body reaches, in the
 * LEAF's own frame, with the door open by `deg`.
 *
 * Member A is clipped into the door and rides it: in the leaf's frame it never
 * moves. Member B stays in the CARCASS's frame and folds about the cup axis, so
 * it is transformed into the room and then counter-rotated by the door's own
 * swing about the door's own hinge edge — which is what `3d/UnitView.jsx
 * MovingPanel` turns the leaf by.
 *
 * The two axes are NOT the same axis, and that is the honest cost of the
 * one-joint approximation turn 24 named: the arm's front link drifts a little
 * deeper into the bore as the leaf opens. What it must never do — and what this
 * measures — is come out of the front of the door.
 */
export function hingeReach(leaf, h, deg, cliptop = C) {
  const box = hingeFileBox();
  const D = cliptop.fileDatum;
  const profile = {
    ...P,
    hardware: { ...P.hardware, hinge: { ...P.hardware.hinge, cliptop } },
  };
  const pivot = foldPivotMm({ profile });
  // The hand the FILE is authored for; the other hand is the same clone
  // mirrored about the cup (`3d/Hardware.jsx useHingeModels`).
  const s = h.side !== cliptop.fileHand ? -1 : 1;
  // The leaf's own swing, signed exactly as `MovingPanel` signs it.
  const phi = (leaf.meta?.hinge === 'R' ? 1 : -1) * ((deg * Math.PI) / 180);
  const hingeEdgeX = leaf.meta?.hinge === 'R' ? leaf.box.x + leaf.box.w : leaf.box.x;
  const midZ = leaf.box.z + leaf.box.d / 2;

  let a = -Infinity;
  let b = -Infinity;
  for (const row of hingeMeshRows()) {
    const member = memberOfNode(row.node, cliptop.rig, row.max[2]);
    for (const cx of [row.min[0], row.max[0]]) {
      for (const cy of [row.min[1], row.max[1]]) {
        for (const cz of [row.min[2], row.max[2]]) {
          const lx = s * (cx - D.x);
          const lz = cz - D.z;
          if (member === 'A') { a = Math.max(a, h.z + lz); continue; }
          // fold about (s·pivot.x, pivot.z), in the cup's own frame…
          const dx = lx - s * pivot.x;
          const dz = lz - pivot.z;
          const fx = s * pivot.x + dx * Math.cos(phi) + dz * Math.sin(phi);
          const fz = pivot.z + (-dx * Math.sin(phi) + dz * Math.cos(phi));
          // …into the room, and back into the leaf's frame.
          const ex = h.x + fx - hingeEdgeX;
          const ez = h.z + fz - midZ;
          b = Math.max(b, midZ + (ex * Math.sin(phi) + ez * Math.cos(phi)));
        }
      }
    }
  }
  return { a, b };
}
