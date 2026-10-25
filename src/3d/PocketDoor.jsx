/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F6 · THE HAWA DOOR IN THE ROOM: CLOSED, AND OPEN INTO ITS POCKET
//
// The owner, 25.10.2026 (11:40): *"wysuwasz pocket door i zakrywasz szafke lub
// szafki"*. CLAUDE.md T82 F6: "A toggle on the pocket (right panel: Door
// closed / open; the same in the viewer's "Open all") slides the door into the
// pocket: open = the door rotated 90 degrees about its hinge edge and
// translated E1 into the pocket, its leading edge M proud. The hardware:
// today's symbols (a vertical profile 17 x 60 PROPOSED in the hardware zone of
// panel B, the ejector block for Push), no GLB. The hinge cups on the door's
// back as the engine drills them."
//
// The LEAF is not drawn here. It is the board the room draws every board with
// (UnitView's `MovingPanel`: the front material it wears, its outline, its
// handlers and its `ccPanelId`), handed in as `children` and standing still
// where the engine cut it; this component only CARRIES it: an outer group that
// slides (the carriage on its tracks, with the vertical profile and the
// ejector on it) and an inner one that turns (the door on its hinges, with its
// cups). Where it stands at each moment is `engine/pocketDoorPose.js`, between
// the engine's own `closed` and `open` boxes (`result.hawa.doors`), the one
// pose the plan's dashed door is drawn from too. The two hardware zones and
// their tracks are screwed to panel B and stay. The open state is the room's
// own `openFronts` value for this door (uiStore), so the toolbar's Open all,
// a double click on the leaf and the right panel's toggle are one switch.
//
// A door the engine published no figures for is drawn as it was cut, shut,
// and never moved by a guess.

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mm } from './constants.js';
import {
  pocketDoorGeometry, pocketDoorHoles, pocketDoorPose, pocketHardwareBoxes,
} from '../engine/pocketDoorPose.js';

// A drilled hole is a dark disc on the face it is bored into (3d/DrillRings.jsx's
// own law: a decal, never a cut), lifted a hair so it never shares the plane.
const HOLE_CORE = '#141414';
const LIFT_M = 0.00015;
const NO_RAYCAST = () => null;

/** One hole on the door's back: a dark disc facing out of the face. */
function HoleDisc({ hole }) {
  const n = hole.normal || [0, 0, -1];
  const quaternion = useMemo(() => new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(n[0], n[1], n[2]).normalize(),
  ), [n[0], n[1], n[2]]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <mesh
      position={[mm(hole.x) + n[0] * LIFT_M, mm(hole.y) + n[1] * LIFT_M, mm(hole.z) + n[2] * LIFT_M]}
      quaternion={quaternion}
      raycast={NO_RAYCAST}
      userData={{ ccPocketHole: hole.d, ccNoBounds: true }}
    >
      <circleGeometry args={[mm(hole.d / 2), 24]} />
      <meshBasicMaterial color={HOLE_CORE} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** A symbol box, in the unit's millimetres. */
function SymbolBox({ box, colour }) {
  return (
    <mesh
      position={[mm((box.x0 + box.x1) / 2), mm((box.y0 + box.y1) / 2), mm((box.z0 + box.z1) / 2)]}
      raycast={NO_RAYCAST}
      userData={{ ccPocketHardware: box.kind, ccNoBounds: true }}
    >
      <boxGeometry args={[mm(box.x1 - box.x0), mm(box.y1 - box.y0), mm(box.z1 - box.z0)]} />
      <meshStandardMaterial color={colour} roughness={0.35} metalness={0.75} />
    </mesh>
  );
}

export default function PocketDoor({
  door, result, profile, open = 0, children = null,
}) {
  const geometry = useMemo(() => pocketDoorGeometry(result, profile), [result, profile]);
  const rig = useMemo(() => geometry?.doors.find((d) => d.doorId === door?.id) || null, [geometry, door?.id]);
  // The drilling the engine states for this door, on its back (KIT_HAWA.lsp D10).
  const holes = useMemo(() => (rig ? pocketDoorHoles(rig, geometry.numbers).holes : []), [rig, geometry]);
  const boxes = useMemo(
    () => (rig ? pocketHardwareBoxes(geometry).filter((b) => b.doorId === rig.doorId) : []),
    [rig, geometry],
  );
  const slide = useRef(null);
  const turn = useRef(null);
  const amount = useRef(0);

  useFrame((_, delta) => {
    if (!rig || !slide.current || !turn.current) return;
    const target = Math.max(0, Math.min(1, Number(open) || 0));
    if (Math.abs(amount.current - target) < 0.001) amount.current = target;
    // The room's own easing (MovingPanel): fast at the start, settled in about 0.35 s.
    else amount.current += (target - amount.current) * Math.min(1, delta * 8);
    const pose = pocketDoorPose(rig, amount.current);
    turn.current.rotation.y = pose.angle;
    slide.current.position.z = mm(pose.slideZ);
    // Where the door is, for a walk that reads the scene (0 shut, 1 open).
    slide.current.userData.ccPocketDoorT = amount.current;
  });

  if (!rig) return children;

  const colour = profile?.appearance?.hardware?.bracket || '#8d8d92';
  // The Push ejector is a length of the profile: drawn in the darker hardware tone so it reads as a unit on it.
  const ejectorColour = profile?.appearance?.hardware?.hinge || colour;
  const [px, pz] = rig.pivot;
  return (
    <group>
      {/* The carriage: the door on its hinges, and the profile and the ejector it hangs from. */}
      <group ref={slide} userData={{ ccPocketDoor: door.id, ccPocketDoorT: 0 }}>
        <group ref={turn} position={[mm(px), 0, mm(pz)]}>
          <group position={[-mm(px), 0, -mm(pz)]}>
            {children}
            {holes.map((h, i) => <HoleDisc key={`${door.id}:hole:${i}`} hole={h} />)}
          </group>
        </group>
        {boxes.filter((b) => b.slides).map((b) => (
          <SymbolBox key={b.id} box={b} colour={b.kind === 'ejector' ? ejectorColour : colour} />
        ))}
      </group>
      {/* The two hardware zones and their tracks: screwed to panel B, they stay. */}
      {boxes.filter((b) => !b.slides).map((b) => <SymbolBox key={b.id} box={b} colour={colour} />)}
    </group>
  );
}
