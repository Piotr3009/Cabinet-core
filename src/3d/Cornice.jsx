import { useMemo } from 'react';
import * as THREE from 'three';

import { corniceSection, corniceSolids } from '../engine/cornice.js';
import { mm } from './constants.js';

// ─── THE CORNICE, DRAWN (turn 22, CLAUDE.md F1) ─────────────────────────────
//
// The moulding is not a panel — it is bought by the metre, it never reaches a
// cut list and the CNC export has never heard of it — so it cannot ride the
// `MovingPanel` path every board in this app rides. It gets this instead, and
// it is deliberately thin: every number it draws with comes out of
// `engine/cornice.js`, which is pure and tested, and all that happens here is
// that rings of points become triangles.
//
// ─── WHY RINGS ──────────────────────────────────────────────────────────────
//
// A swept moulding is one SECTION dragged along a line, and a 45° mitre is that
// same section with each of its points slid along the sweep by its own
// projection — the outer face runs on past the inner one by the depth of the
// piece, which is exactly what a mitre is. So the engine hands over two rings
// per member (`corniceSolids`) and the walls between them are a strip of quads.
// The END CAPS use the SECTION's own triangulation, applied to whichever ring
// they close, so a skewed mitre face is triangulated as correctly as a square
// one — a fan would fold over itself in the concave cove and show through.

/** One member's geometry: the skin between two rings, capped at both ends. */
function memberGeometry(a, b, capIndices) {
  const n = a.length;
  const positions = [];
  const index = [];
  const push = (p) => { positions.push(mm(p[0]), mm(p[1]), mm(p[2])); };
  for (const p of a) push(p);
  for (const p of b) push(p);

  // The skin. The section is a CLOSED polygon, so the last point joins the
  // first — that edge is the moulding's back face, the one screwed to the
  // infill.
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    index.push(i, j, n + j);
    index.push(i, n + j, n + i);
  }
  // The two ends.
  for (const [x, y, z] of capIndices) {
    index.push(x, z, y);
    index.push(n + x, n + y, n + z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export default function Cornice({ element, profile, surface, outline = null }) {
  const members = useMemo(() => {
    if (!element) return [];
    const section = corniceSection(element.height, profile);
    if (section.length < 3) return [];
    // The section's own triangulation, computed once and applied to both ends.
    const contour = section.map(([d, y]) => new THREE.Vector2(d, y));
    let caps = [];
    try {
      caps = THREE.ShapeUtils.triangulateShape(contour, []);
    } catch {
      caps = [];
    }
    const solids = corniceSolids(element, {
      carcassTop: element.carcassTop,
      doorPlane: element.doorPlane,
      backZ: element.backZ,
    }, profile);
    return solids.map((s) => ({ id: s.id, geometry: memberGeometry(s.a, s.b, caps) }));
  }, [element, profile]);

  if (!members.length) return null;

  return (
    <group userData={{ ccCornice: true }}>
      {members.map((m) => (
        <mesh key={m.id} geometry={m.geometry} castShadow receiveShadow userData={{ ccCorniceMember: m.id }}>
          <meshPhysicalMaterial
            color={surface.colour}
            roughness={surface.roughness}
            metalness={surface.metalness}
            clearcoat={surface.clearcoat}
            clearcoatRoughness={surface.clearcoatRoughness}
            envMapIntensity={surface.envMapIntensity}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {outline && members.map((m) => (
        <lineSegments key={`edge-${m.id}`} userData={{ ccHelper: true }}>
          <edgesGeometry args={[m.geometry, outline.threshold]} />
          <lineBasicMaterial color={outline.colour} />
        </lineSegments>
      ))}
    </group>
  );
}
