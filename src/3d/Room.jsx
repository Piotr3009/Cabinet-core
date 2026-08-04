import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { mm, COLORS } from './constants.js';
import DimLabel from './DimLabel.jsx';

// The main wall is the anchor of every project (SPEC 4.2). Max 3 walls by
// design — the fourth is deliberately not drawn (it would fight the camera).
// White wall, light floor, nothing else.
export default function Room({ room, showLabels = true }) {
  const widthMm = room.walls[0]?.width ?? 4000;
  const heightMm = room.height ?? 2500;
  const width = mm(widthMm);
  const height = mm(heightMm);
  const floorDepth = Math.max(width, mm(3000));

  const wallEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(width, height)), [width, height]);
  useEffect(() => () => wallEdges.dispose(), [wallEdges]);

  return (
    <group>
      {/* main wall — its inner face sits exactly at z = 0 */}
      <mesh position={[0, height / 2, -0.005]} receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={COLORS.wall} roughness={0.95} metalness={0} />
      </mesh>

      {/* outline, so the white plane still reads as a surface */}
      <lineSegments geometry={wallEdges} position={[0, height / 2, 0]}>
        <lineBasicMaterial color={COLORS.wallEdge} />
      </lineSegments>

      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, floorDepth / 2]} receiveShadow>
        <planeGeometry args={[width, floorDepth]} />
        <meshStandardMaterial color={COLORS.floor} roughness={1} metalness={0} />
      </mesh>

      {showLabels && (
        <>
          <DimLabel position={[0, -0.1, floorDepth * 0.08]} text={`${Math.round(widthMm)} mm`} />
          <DimLabel position={[-width / 2 - 0.2, height / 2, 0]} text={`${Math.round(heightMm)} mm`} />
        </>
      )}
    </group>
  );
}
