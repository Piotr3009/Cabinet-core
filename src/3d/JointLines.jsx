import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { mm } from './constants.js';
import { joineryLayers, unitJointLines } from '../engine/joinery.js';

// ─── The joint, on the furniture (turn 8, CLAUDE.md F8) ───
//
// One LineSegments per KIND, not per panel: a carcass has six panels and a
// project has forty carcasses, and forty times six draw calls for a few hundred
// millimetres of line is a frame rate spent on hairlines. Grouping by kind
// means four draw calls per unit at most, and each kind gets its own colour
// from the profile.
//
// The geometry is a reading of the CNC data (engine/joinery.js) and nothing
// here knows what a tab is. Tagged `ccHelper`… except it is NOT: a joint is
// FURNITURE, and it belongs in a render exactly as an edge does. What is
// tagged is nothing at all, and that is deliberate — the whole point of showing
// the joint is that a customer sees it.

const KIND_COLOUR = {
  tab: 'solid',
  outline: 'outline',
  socket: 'socket',
  dogbone: 'dogbone',
};

export default function JointLines({
  result, profile, xray = false, design = null,
}) {
  const geometries = useMemo(() => {
    const layers = joineryLayers(profile, design?.joinery || null);
    if (!layers) return [];
    const J = profile.appearance.joinery;
    const byKind = new Map();
    for (const { lines } of unitJointLines(result, layers, { xray, lift: J.lift })) {
      for (const line of lines) {
        // A polyline becomes the segments between its points: LineSegments
        // takes them in pairs, which is what makes one buffer per kind possible
        // however many separate outlines it holds.
        const list = byKind.get(line.kind) || [];
        for (let i = 0; i < line.points.length - 1; i += 1) {
          list.push(...line.points[i].map(mm), ...line.points[i + 1].map(mm));
        }
        byKind.set(line.kind, list);
      }
    }
    return [...byKind.entries()].map(([kind, points]) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3));
      return { kind, geometry, colour: J[KIND_COLOUR[kind]] || J.solid };
    });
  }, [result, profile, xray, design]);

  useEffect(() => () => { for (const g of geometries) g.geometry.dispose(); }, [geometries]);

  if (!geometries.length) return null;
  const opacity = xray ? 1 : profile.appearance.joinery.solidOpacity;
  return (
    <group>
      {geometries.map(({ kind, geometry, colour }) => (
        <lineSegments key={kind} geometry={geometry}>
          <lineBasicMaterial
            color={colour}
            transparent={opacity < 1}
            opacity={opacity}
            // The lines sit 0.4 mm off the board; they must not also fight the
            // panel behind them for the depth buffer.
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>
      ))}
    </group>
  );
}
