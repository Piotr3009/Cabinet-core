import React, { useMemo } from 'react';
import * as THREE from 'three';
import { mm } from './constants.js';
import { machiningLines, panelPlacement } from '../engine/joinery.js';
import { shelfSupportInstances } from '../engine/hardware3d.js';

// ─── DRILL RINGS — a hole you can see, without cutting the board ───────────
//
// The owner, after the eye test:
//
//   "to się za każdym razem pokazuje jak próbujesz wiercić czyli zagłębiać
//    jakiekolwiek CNC lub inne figury w naszych elementach … usuń te
//    zagłębienia, na to miejsce daj złote lub srebrne kółeczka na elemencie …
//    kółeczko 7.5 mm, w środku drugi 5.5 mm, a środek tego 5.5 mm czarny —
//    i będzie wyglądało jak dziura, a nie będziemy niczego rysować w 3D."
//
// WHY HE IS RIGHT. A drilling bored out of the board's solid leaves a ring of
// wall lying in the same plane as the face it is bored into. Two coplanar
// surfaces have no depth order, so the card picks one per pixel per frame:
// that is the flicker, and that is why the back of a cabinet showed through
// its own front. Every new machining class added another few hundred of them.
// A DECAL has no wall. There is nothing to fight, nothing to re-tessellate
// when a cabinet is resized, and — at the angles a kitchen is ever looked at
// — a bright collar around a dark centre is exactly what a sleeved hole looks
// like. It is also a great deal cheaper.
//
// WHAT IS NOT A DECAL. Anything that changes the board's SILHOUETTE stays
// geometry: puzzle sockets and notches are cut by the outline polygon the
// board is extruded from, and a back panel's hanger cut-out is a real gap.
// You can see those on the edge; a decal cannot fake them.
//
// R10 IS UNTOUCHED. The sheet is still the truth and the scene still follows
// it: the positions here come from `machiningLines` — the same function the
// element view and the DXF read — so a hole that exists on the sheet has a
// ring in the room, and one that does not, has not. What changed is how the
// scene DRAWS it, not what it knows.
//
// FRONTS ARE SKIPPED. A door swings; these rings are drawn once for the unit
// and do not travel with it. The holes a front carries are the hinge cup and
// the handle bolts, and both are covered by hardware that IS mounted on the
// leaf, so there is nothing to miss.
//
// SLEEVED HOLES ARE SKIPPED TOO. Where a shelf actually stands, turn 25's
// brass sleeve and pin are already modelled (3d/Hardware.jsx); a decal at the
// same centre would be a second, flatter sleeve fighting the first one.

const RING_SEGMENTS = 24;
const LIFT_MM = 0.15;      // off the face, so nothing is exactly coplanar
const SKIP_MM = 0.6;       // a sleeve this close owns the hole

const METALS = {
  gold: { color: '#c9a227', metalness: 1, roughness: 0.34 },
  silver: { color: '#cfd2d4', metalness: 1, roughness: 0.30 },
};

/** The centre and radius of a hole loop, in cabinet millimetres. */
function loopCircle(points) {
  const c = [0, 0, 0];
  for (const p of points) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }
  const n = points.length || 1;
  c[0] /= n; c[1] /= n; c[2] /= n;
  const d = points[0];
  const r = Math.hypot(d[0] - c[0], d[1] - c[1], d[2] - c[2]);
  return { centre: c, radius: r };
}

export default function DrillRings({ result, profile, design = null }) {
  const groups = useMemo(() => {
    const panels = result?.panels || [];
    const drills = result?.drills || [];
    if (!panels.length || !drills.length) return [];

    // Holes already dressed by a real sleeve model.
    let sleeves = [];
    try {
      sleeves = shelfSupportInstances(result, profile) || [];
    } catch {
      sleeves = [];
    }
    const dressed = (x, y, z) => sleeves.some((s) => Math.abs(s.x - x) < SKIP_MM
      && Math.abs(s.y - y) < SKIP_MM && Math.abs(s.z - z) < SKIP_MM);

    // Bucket by diameter: one instanced pair per size, and a kitchen only ever
    // has a handful of sizes.
    const byDiameter = new Map();

    for (const panel of panels) {
      if (!panel.box) continue;
      // A front animates; see the note above.
      if (panel.role === 'front' || panel.part === 'FRONT') continue;
      const placement = panelPlacement(panel);
      if (!placement) continue;
      const { n } = placement;
      const thickness = Math.abs(n[0]) > 0.5 ? panel.box.w
        : (Math.abs(n[1]) > 0.5 ? panel.box.h : panel.box.d);

      const lines = machiningLines(panel, drills, { lift: 0 });
      for (const line of lines) {
        if (line.kind !== 'hole') continue;
        const { centre, radius } = loopCircle(line.points);
        if (!(radius > 0.2)) continue;
        // The bit enters from the INSIDE of the cabinet: the CNC frame's
        // origin sits on the outward face, so step one board back along the
        // outward normal, then lift a hair further in.
        const step = thickness + LIFT_MM;
        const x = centre[0] - n[0] * step;
        const y = centre[1] - n[1] * step;
        const z = centre[2] - n[2] * step;
        if (dressed(x, y, z)) continue;
        const key = radius.toFixed(2);
        if (!byDiameter.has(key)) byDiameter.set(key, { radius, items: [] });
        byDiameter.get(key).items.push({ x, y, z, normal: [-n[0], -n[1], -n[2]] });
      }
    }

    return [...byDiameter.values()].filter((g) => g.items.length);
  }, [result, profile]);

  const metal = METALS[design?.hardware?.shelfSleeve === 'gold' ? 'gold' : 'silver'];

  if (!groups.length) return null;

  return (
    <group>
      {groups.map((g) => (
        <RingSet key={g.radius.toFixed(2)} radius={g.radius} items={g.items} metal={metal} />
      ))}
    </group>
  );
}

function RingSet({ radius, items, metal }) {
  // 7.5 outside, 5.5 inside — a 1 mm collar, exactly the owner's picture, and
  // it scales sanely for a ⌀3 screw (which reads as a small metal head).
  const collar = Math.min(1, Math.max(0.35, radius * 0.27));
  const inner = Math.max(0.2, radius - collar);

  const ringGeom = useMemo(
    () => new THREE.RingGeometry(mm(inner), mm(radius), RING_SEGMENTS),
    [inner, radius],
  );
  const coreGeom = useMemo(
    () => new THREE.CircleGeometry(mm(inner), RING_SEGMENTS),
    [inner],
  );

  React.useEffect(() => () => { ringGeom.dispose(); coreGeom.dispose(); }, [ringGeom, coreGeom]);

  const matrices = useMemo(() => {
    const up = new THREE.Vector3(0, 0, 1);
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    return items.map((it) => {
      v.set(it.normal[0], it.normal[1], it.normal[2]).normalize();
      q.setFromUnitVectors(up, v);
      return new THREE.Matrix4().compose(
        new THREE.Vector3(mm(it.x), mm(it.y), mm(it.z)),
        q,
        new THREE.Vector3(1, 1, 1),
      );
    });
  }, [items]);

  const setRefs = (mesh) => {
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  };

  return (
    <>
      <instancedMesh ref={setRefs} args={[ringGeom, undefined, items.length]} userData={{ ccHelper: true }}>
        <meshStandardMaterial
          color={metal.color}
          metalness={metal.metalness}
          roughness={metal.roughness}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </instancedMesh>
      <instancedMesh ref={setRefs} args={[coreGeom, undefined, items.length]} userData={{ ccHelper: true }}>
        <meshStandardMaterial
          color="#141414"
          metalness={0}
          roughness={0.95}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </instancedMesh>
    </>
  );
}
