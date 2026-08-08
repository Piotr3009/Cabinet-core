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

/**
 * Is this wall facing the camera, or are we standing behind it?
 *
 * Shared by the editor's per-frame hook and by the render pass, which looks
 * through a camera of its own — one test, so a still can never disagree with
 * the view it was taken from about which walls are in the way.
 */
export function wallFacesCamera(face, cameraPosition) {
  if (!face) return true;
  V.set(cameraPosition.x - face.midX, 0, cameraPosition.z - face.midZ);
  return face.inwardX * V.x + face.inwardZ * V.z > 0;
}

/**
 * The bounced light a studio rig has no way to produce (turn 8, CLAUDE.md F1).
 *
 * The walls and the floor are the only surfaces in the scene that are not
 * furniture, and they are the only ones that need this: a wall is lit almost
 * entirely by light that has already been somewhere else. Carried as emission
 * on the room's own materials rather than as an ambient light, because an
 * ambient big enough to whiten a wall is an ambient big enough to flatten every
 * cabinet in front of it — which is exactly what turn 7 did and what Piotr
 * reported.
 */
function bounce(hex, profile) {
  const amount = profile?.appearance?.studio?.roomBounce ?? 0;
  return new THREE.Color(hex).multiplyScalar(Math.max(0, Math.min(1, amount)));
}

/** One wall: a plane with a hole per window and per door. */
function Wall({
  wall, height, openings, centre, showLabel, profile,
}) {
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
  //
  // The test itself lives in `wallFacesCamera` and the numbers it needs are
  // parked in userData, because a RENDER looks through a camera of its own
  // (3d/renderCapture.js) and this hook would have hidden the walls for the
  // editor's camera instead. The first render framed on a unit standing at a
  // wall came back as a full-frame grey rectangle — the back of that wall.
  const face = useMemo(() => ({
    midX: mm((wall.start.x + wall.end.x) / 2 - centre.x),
    midZ: mm((wall.start.y + wall.end.y) / 2 - centre.y),
    inwardX: wall.inward.x,
    inwardZ: wall.inward.y,
  }), [wall.start.x, wall.start.y, wall.end.x, wall.end.y, wall.inward.x, wall.inward.y, centre.x, centre.y]);

  useFrame(({ camera }) => {
    if (!ref.current) return;
    ref.current.visible = wallFacesCamera(face, camera.position);
  });

  const midLabel = [
    mm((wall.start.x + wall.end.x) / 2 - centre.x),
    mm(height) * 0.5,
    mm((wall.start.y + wall.end.y) / 2 - centre.y),
  ];

  return (
    <group>
      <group ref={ref} userData={{ ccWall: face }} position={position} rotation={[0, wall.angle, 0]}>
        {/* Lambert, not standard, since turn 6 — and this is a PERFORMANCE
            decision with a visual answer attached. A wall is matt white paint:
            at roughness 0.95 and metalness 0 the standard material was already
            computing a physically-based response to arrive at flat diffuse.
            What it was ALSO doing, once the environment map arrived, was
            sampling the room probe for every wall and floor pixel — and the
            walls and the floor are most of the frame. `scene.environment`
            reaches MeshStandardMaterial only, so this one change takes the
            biggest surface in the scene out of the image-based lighting path
            and leaves it looking exactly the same. */}
        <mesh geometry={geometry} receiveShadow>
          <meshLambertMaterial
            color={COLORS.wall}
            emissive={bounce(COLORS.wall, profile)}
            side={THREE.DoubleSide}
          />
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

export default function Room({ room, showLabels = true, profile = null }) {
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
        <meshLambertMaterial
          color={COLORS.floor}
          emissive={bounce(COLORS.floor, profile)}
          side={THREE.DoubleSide}
        />
      </mesh>

      {walls.map((wall) => (
        <Wall
          key={wall.index}
          wall={wall}
          height={height}
          openings={openingsOnWall(room, wall.index)}
          centre={bounds.centre}
          showLabel={showLabels}
          profile={profile}
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
