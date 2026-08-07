import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mm, COLORS } from './constants.js';
import DimLabel from './DimLabel.jsx';
import { roomWalls, roomBounds, openingsOnWall } from '../engine/room.js';
import { formatMm } from '../engine/format.js';

// The room is a LIST OF WALLS (engine/room.js) — four for a rectangle, six for
// an L. All four are drawn, and the ones the camera is behind hide themselves,
// so looking down at the room from above gives a clean plan view instead of a
// white box (CLAUDE.md turn 3, phase 3; supersedes the "fourth wall is never
// drawn" decision of SPEC 4.2).

const V = new THREE.Vector3();

/** One wall: a plane with a hole per window and per door. */
function Wall({ wall, height, openings, centre, showLabel }) {
  const ref = useRef(null);

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const w = mm(wall.width);
    const h = mm(height);
    shape.moveTo(0, 0);
    shape.lineTo(w, 0);
    shape.lineTo(w, h);
    shape.lineTo(0, h);
    shape.closePath();
    for (const o of openings) {
      const hole = new THREE.Path();
      const x1 = mm(o.x_mm); const x2 = mm(o.x_mm + o.width);
      const y1 = mm(o.sill); const y2 = mm(o.sill + o.height);
      hole.moveTo(x1, y1);
      hole.lineTo(x2, y1);
      hole.lineTo(x2, y2);
      hole.lineTo(x1, y2);
      hole.closePath();
      shape.holes.push(hole);
    }
    return new THREE.ShapeGeometry(shape);
  }, [wall.width, height, openings]);

  // World position of the wall's start corner, with the room centred on origin.
  const position = [mm(wall.start.x - centre.x), 0, mm(wall.start.y - centre.y)];

  // Auto-hide: a wall the camera is BEHIND would only ever be seen from its
  // back face, so it is hidden. Done per frame against the live camera, not
  // once at mount — the whole point is that it follows the orbit.
  useFrame(({ camera }) => {
    if (!ref.current) return;
    const midX = mm((wall.start.x + wall.end.x) / 2 - centre.x);
    const midZ = mm((wall.start.y + wall.end.y) / 2 - centre.y);
    V.set(camera.position.x - midX, 0, camera.position.z - midZ);
    const facing = wall.inward.x * V.x + wall.inward.y * V.z;
    ref.current.visible = facing > 0;
  });

  const midLabel = [
    mm((wall.start.x + wall.end.x) / 2 - centre.x),
    mm(height) * 0.5,
    mm((wall.start.y + wall.end.y) / 2 - centre.y),
  ];

  return (
    <group>
      <group ref={ref} position={position} rotation={[0, wall.angle, 0]}>
        <mesh geometry={geometry} receiveShadow>
          <meshStandardMaterial color={COLORS.wall} roughness={0.95} metalness={0} side={THREE.DoubleSide} />
        </mesh>
        {/* the opening reveals, so a hole reads as a hole and not as a gap */}
        {openings.map((o) => (
          <lineSegments key={o.id} position={[0, 0, 0.001]}>
            <edgesGeometry args={[new THREE.PlaneGeometry(mm(o.width), mm(o.height))
              .translate(mm(o.x_mm + o.width / 2), mm(o.sill + o.height / 2), 0)]}
            />
            <lineBasicMaterial color={o.kind === 'door' ? COLORS.gold : '#9fb4c8'} />
          </lineSegments>
        ))}
      </group>
      {showLabel && (
        <DimLabel position={[midLabel[0], mm(height) + 0.12, midLabel[2]]} text={formatMm(wall.width, { unit: true })} />
      )}
    </group>
  );
}

export default function Room({ room, showLabels = true }) {
  const walls = useMemo(() => roomWalls(room), [room]);
  const bounds = useMemo(() => roomBounds(room), [room]);
  const height = room.height ?? 2500;

  const floor = useMemo(() => {
    const shape = new THREE.Shape();
    room.corners.forEach((c, i) => {
      const x = mm(c.x - bounds.centre.x);
      const y = mm(c.y - bounds.centre.y);
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    });
    shape.closePath();
    const geom = new THREE.ShapeGeometry(shape);
    // The shape is built in XY; lay it flat with x → X and y → Z.
    geom.rotateX(Math.PI / 2);
    return geom;
  }, [room.corners, bounds.centre.x, bounds.centre.y]);

  return (
    <group>
      <mesh geometry={floor} receiveShadow>
        <meshStandardMaterial color={COLORS.floor} roughness={1} metalness={0} side={THREE.DoubleSide} />
      </mesh>

      {walls.map((wall) => (
        <Wall
          key={wall.index}
          wall={wall}
          height={height}
          openings={openingsOnWall(room, wall.index)}
          centre={bounds.centre}
          showLabel={showLabels}
        />
      ))}

      {showLabels && (
        <DimLabel
          position={[-mm(bounds.width) / 2 - 0.2, mm(height) / 2, -mm(bounds.depth) / 2]}
          text={formatMm(height, { unit: true })}
        />
      )}
    </group>
  );
}
