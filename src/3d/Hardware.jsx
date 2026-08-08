import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mm } from './constants.js';

// ─── The hardware, in 3D (turn 7, CLAUDE.md F3 / BACKLOG #42) ───
//
// Procedural, to the millimetre: a hinge is a ⌀35 cup, a body, an arm and a
// mounting plate; a runner is a pair of L-profiles; a leg is a plate, a stem
// and a foot; a rail is a tube. Nothing is downloaded and no model file exists
// — the sizes are `profile.hardware` (the catalogue) and the POSITIONS are
// engine/hardware3d.js, which reads them off the same drilling the CNC files
// come from. A hinge in this view is where the machine will bore for one.
//
// Everything repeatable is an InstancedMesh. A wardrobe has twelve hinges and
// four legs; ten of them in a room is 160 pieces of hardware, and 160 draw
// calls per frame is how a working view starts to stutter. Instanced, it is
// five — one per SHAPE per unit, whatever the counts are.
//
// What shows when: hinges and runners are X-RAY ONLY, because a working view
// full of ironmongery is a working view nobody can read (CLAUDE.md: "the normal
// view stays clean"). Legs and the rail are always drawn, as they always have
// been — hiding a leg would be a regression dressed as a feature.

/**
 * @param {object} props
 *   instances  engine/hardware3d.js hardwareInstances() output
 *   profile
 *   xray       are we looking through the furniture?
 *   hinges     draw the hinge bodies even in Solid (turn 11, CLAUDE.md F3.5)
 */
export default function Hardware({
  instances, profile, xray = false, hinges = false,
}) {
  const colours = profile.appearance.hardware;
  return (
    <group userData={{ ccHardware: true }}>
      <Legs items={instances.legs} profile={profile} colour={colours.leg} />
      {instances.rails.map((rail, i) => (
        <Rail key={`rail-${i}`} rail={rail} colour={colours.rail} />
      ))}
      {/* ─── Turn 11 (CLAUDE.md F3.5): the hinges are furniture ───
          Owner verdict: a hinge is a thing that is FITTED, and a joiner opening
          a door wants to see it there rather than having to switch to X-ray to
          be told it exists. Same instances, same positions — the engine's own
          drilling (engine/hardware3d.js) — so the count of what is drawn is
          still the count of what is on order.

          The RUNNERS stay behind X-ray: they live inside a closed drawer box
          where nothing but an X-ray can see them anyway, and drawing eight of
          them per stack in Solid is the wall of ironmongery this component was
          written to avoid. The colour is `appearance.hardware.hinge` — a dark
          hardware tone, quieter than the bright bracket grey X-ray uses,
          because in Solid it is a small object on a white door rather than the
          thing being explained. */}
      {(xray || hinges) && (
        <Hinges
          items={instances.hinges}
          profile={profile}
          colour={xray ? colours.bracket : (colours.hinge || colours.bracket)}
        />
      )}
      {xray && <Runners items={instances.runners} profile={profile} colour={colours.bracket} />}
    </group>
  );
}

/**
 * One instanced mesh, positioned by a callback.
 *
 * `place(i, matrix)` writes the matrix for instance i. The effect is layout —
 * not `useFrame` — because none of this moves: hardware is nailed to the
 * cabinet, and re-writing 160 matrices every frame for furniture that is
 * standing still is exactly the cost this component exists to avoid.
 */
function Pieces({ count, place, colour, roughness = 0.35, metalness = 0.75, children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < count; i += 1) {
      place(i, matrix);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [count, place]);

  if (!count) return null;
  return (
    // ccNoBounds: hardware is IN the picture but must not frame it — a render
    // that zoomed out to fit a leg bracket would be a render of a leg bracket.
    <instancedMesh ref={ref} args={[undefined, undefined, count]} userData={{ ccNoBounds: true }}>
      {children}
      <meshStandardMaterial color={colour} roughness={roughness} metalness={metalness} />
    </instancedMesh>
  );
}

const put = (matrix, position, quaternion = null, scale = null) => matrix.compose(
  position,
  quaternion || new THREE.Quaternion(),
  scale || new THREE.Vector3(1, 1, 1),
);

// ─── Hinges ─────────────────────────────────────────────────────────────────

/**
 * Three instanced meshes for one hinge: the cup, the arm that leaves it, and
 * the plate on the carcass side. Three shapes, three meshes — an InstancedMesh
 * carries one geometry, and three of them is still three draw calls for twelve
 * hinges rather than thirty-six.
 */
function Hinges({ items, profile, colour }) {
  const H = profile.hardware.hinge;

  // The cup is bored along the DEPTH axis, so the cylinder (whose own axis is
  // Y) is laid down once, here, rather than per instance.
  const laid = useMemo(() => new THREE.Quaternion()
    .setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), []);

  const placeCup = useMemo(() => (i, m) => {
    const h = items[i];
    put(m, new THREE.Vector3(mm(h.x), mm(h.y), mm(h.z + H.cupDepth / 2)), laid);
  }, [items, H.cupDepth, laid]);

  // The arm runs straight back off the cup, into the carcass.
  const placeArm = useMemo(() => (i, m) => {
    const h = items[i];
    put(m, new THREE.Vector3(mm(h.x), mm(h.y), mm(h.z - H.armLength / 2)));
  }, [items, H.armLength]);

  // The plate, screwed to the inner face of the side panel the door hangs from.
  const placePlate = useMemo(() => (i, m) => {
    const h = items[i];
    const x = h.plateX + h.dir * (H.plateThickness / 2);
    put(m, new THREE.Vector3(mm(x), mm(h.y), mm(h.plateZ)));
  }, [items, H.plateThickness]);

  return (
    <>
      <Pieces count={items.length} place={placeCup} colour={colour} metalness={0.8}>
        <cylinderGeometry args={[mm(H.cupDiameter / 2), mm(H.cupDiameter / 2), mm(H.cupDepth), 18]} />
      </Pieces>
      <Pieces count={items.length} place={placeArm} colour={colour}>
        <boxGeometry args={[mm(H.armWidth), mm(H.armThickness), mm(H.armLength)]} />
      </Pieces>
      <Pieces count={items.length} place={placePlate} colour={colour}>
        <boxGeometry args={[mm(H.plateThickness), mm(H.plateWidth), mm(H.plateLength)]} />
      </Pieces>
    </>
  );
}

// ─── Runners ────────────────────────────────────────────────────────────────

/**
 * A pair per drawer, drawn as the L each profile is: a face standing up against
 * the box side and a return along the bottom of it. Two instanced meshes for
 * the two legs of the L, whatever the drawer count is.
 */
function Runners({ items, profile, colour }) {
  const R = profile.hardware.runner;

  const placeFace = useMemo(() => (i, m) => {
    const r = items[i];
    const dir = r.side === 'L' ? -1 : 1;
    put(
      m,
      new THREE.Vector3(mm(r.x + dir * (r.thickness / 2)), mm(r.y + R.profileHeight / 2), mm(r.z + r.length / 2)),
      null,
      new THREE.Vector3(1, 1, mm(r.length)),
    );
  }, [items, R.profileHeight]);

  const placeFlange = useMemo(() => (i, m) => {
    const r = items[i];
    const dir = r.side === 'L' ? -1 : 1;
    put(
      m,
      new THREE.Vector3(mm(r.x + dir * (R.flangeDepth / 2)), mm(r.y), mm(r.z + r.length / 2)),
      null,
      new THREE.Vector3(1, 1, mm(r.length)),
    );
  }, [items, R.flangeDepth]);

  return (
    <>
      {/* The upright face. Its LENGTH is a per-instance scale, so one geometry
          serves a 390 mm runner and a 690 mm one. */}
      <Pieces count={items.length} place={placeFace} colour={colour} metalness={0.7}>
        <boxGeometry args={[mm(R.profileThickness), mm(R.profileHeight), 1]} />
      </Pieces>
      <Pieces count={items.length} place={placeFlange} colour={colour} metalness={0.7}>
        <boxGeometry args={[mm(R.flangeDepth), mm(R.profileThickness), 1]} />
      </Pieces>
    </>
  );
}

// ─── Legs ───────────────────────────────────────────────────────────────────

/**
 * Plate, stem, foot — the three parts of an adjustable leg, which is what turn
 * 7 replaces the single box with. Always visible, as legs have always been.
 */
function Legs({ items, profile, colour }) {
  const L = profile.hardware.leg;

  const placePlate = useMemo(() => (i, m) => {
    const leg = items[i];
    // The plate is screwed to the underside of the carcass base.
    put(m, new THREE.Vector3(mm(leg.x), mm(-L.plateThickness / 2), mm(leg.z)));
  }, [items, L.plateThickness]);

  const placeStem = useMemo(() => (i, m) => {
    const leg = items[i];
    const stem = Math.max(1, leg.height - L.plateThickness - L.footHeight);
    put(
      m,
      new THREE.Vector3(mm(leg.x), mm(-(L.plateThickness + stem / 2)), mm(leg.z)),
      null,
      new THREE.Vector3(1, mm(stem), 1),
    );
  }, [items, L.plateThickness, L.footHeight]);

  const placeFoot = useMemo(() => (i, m) => {
    const leg = items[i];
    put(m, new THREE.Vector3(mm(leg.x), mm(-(leg.height - L.footHeight / 2)), mm(leg.z)));
  }, [items, L.footHeight]);

  return (
    <>
      <Pieces count={items.length} place={placePlate} colour={colour} roughness={0.55} metalness={0.3}>
        <boxGeometry args={[mm(items[0]?.plate || L.footDiameter), mm(L.plateThickness), mm(items[0]?.plate || L.footDiameter)]} />
      </Pieces>
      <Pieces count={items.length} place={placeStem} colour={colour} roughness={0.5} metalness={0.4}>
        <cylinderGeometry args={[mm(L.stemDiameter / 2), mm(L.stemDiameter / 2), 1, 12]} />
      </Pieces>
      <Pieces count={items.length} place={placeFoot} colour={colour} roughness={0.6} metalness={0.2}>
        <cylinderGeometry args={[mm(L.footDiameter / 2), mm(L.footDiameter / 2), mm(L.footHeight), 14]} />
      </Pieces>
    </>
  );
}

// ─── The rail ───────────────────────────────────────────────────────────────

/** One tube, at the diameter the profile carries. Not instanced: there is one. */
function Rail({ rail, colour }) {
  return (
    <mesh
      position={[mm(rail.x), mm(rail.y), mm(rail.z)]}
      rotation={[0, 0, Math.PI / 2]}
      userData={{ ccNoBounds: true }}
    >
      <cylinderGeometry args={[mm(rail.diameter / 2), mm(rail.diameter / 2), mm(rail.length), 14]} />
      <meshStandardMaterial color={colour} roughness={0.4} metalness={0.6} />
    </mesh>
  );
}
