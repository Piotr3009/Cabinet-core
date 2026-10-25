/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F11 · THE BASIN, ONLY TO THE EYE
//
// The owner, 25.10.2026 (12:57): *"dodanie 1 sink or 2 sink? dodajesz tylko do
// widoku"*. A vanity with `sinks` 1 or 2 shows a basin set into its top: a
// white bowl hung in the worktop's oval hole, its waste at the bottom. To the
// eye and nothing else: no board, no cut list line, no CNC (the basin is
// supplied by others, as appliances are), and it never takes a click (the
// vanity and the worktop under it keep every pick they had).
//
// Every number is the engine's: the slab's cut-outs of `kind 'basin'`
// (`engine/worktop.js cutoutsFor`, the one law the plan, the BOM and the Check
// read) carry the oval's size, its centre on the LISP's waste
// (`engine/vanity.js vanityWastes`) and its depth (`profile.vanity.basin`).
// What is HERE is the wall frame, the same three lines `Scene.jsx Worktops`
// places the slab with, so the bowl and the hole cannot disagree.

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mm } from './constants.js';
import { basinSpec } from '../engine/worktop.js';

/** Never in the way of a pick: the basin is a picture. */
const NO_PICK = () => null;

/** The waste's disc, in mm: a plain dark circle at the bowl's bottom. */
const WASTE_R = 20;
const WASTE_LIFT = 2;

/** A wall-frame point (along, out) at a height, in the scene. */
function framePoint(wall, roomCentre, along, out, y) {
  return new THREE.Vector3(mm(wall.start.x - roomCentre.x), mm(y), mm(wall.start.y - roomCentre.y))
    .addScaledVector(new THREE.Vector3(wall.along.x, 0, wall.along.y), mm(along))
    .addScaledVector(new THREE.Vector3(wall.inward.x, 0, wall.inward.y), mm(out));
}

/** One bowl: the lower half of an ellipsoid, open at its rim, scaled to the basin. */
function Bowl({
  c, wall, roomCentre, top, colour, bowl, waste,
}) {
  const depth = Number(c.depthMm) || 0;
  const rim = framePoint(wall, roomCentre, c.cx, c.cz, top);
  const drain = framePoint(wall, roomCentre, c.cx, c.cz, top - depth + WASTE_LIFT);
  return (
    <group userData={{ ccBasin: c.unitId, ccBasinMm: { w: c.w, d: c.d, h: depth, cx: c.cx, cz: c.cz } }}>
      <mesh
        geometry={bowl}
        position={rim.toArray()}
        rotation={[0, wall.angle, 0]}
        scale={[mm(c.w / 2), mm(depth), mm(c.d / 2)]}
        raycast={NO_PICK}
        receiveShadow
      >
        <meshStandardMaterial color={colour} roughness={0.18} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={waste} position={drain.toArray()} rotation={[-Math.PI / 2, 0, wall.angle]} raycast={NO_PICK}>
        <meshStandardMaterial color="#6b6b6b" roughness={0.35} metalness={0.6} />
      </mesh>
    </group>
  );
}

/**
 * Every basin the room's worktops carry, hung in its hole.
 *
 * @param {object} props
 *   worktops    the slabs the room draws (the store's `worktopsOf()`)
 *   walls       roomWalls(room)
 *   roomCentre  the scene's origin in room millimetres
 *   profile     the cabinet profile (`vanity.basin.colour` when it names one)
 */
export function Basins({
  worktops, walls, roomCentre, profile,
}) {
  // One geometry each for every bowl and every waste, scaled per basin.
  const bowl = useMemo(() => new THREE.SphereGeometry(1, 40, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), []);
  const waste = useMemo(() => new THREE.CircleGeometry(mm(WASTE_R), 24), []);
  useEffect(() => () => { bowl.dispose(); waste.dispose(); }, [bowl, waste]);
  const colour = basinSpec(profile).colour || '#f4f4f1';
  return (worktops || []).flatMap((w) => {
    const g = w.geometry || w;
    const wall = walls?.[g.wall] || walls?.[0];
    if (!wall) return [];
    const top = Number(g.y) + Number(g.h);
    return (g.cutouts || w.cutouts || [])
      .filter((c) => c.kind === 'basin')
      .map((c) => (
        <Bowl
          key={`${w.slabId || w.id}:${c.unitId}:${c.basin}`}
          c={c}
          wall={wall}
          roomCentre={roomCentre}
          top={top}
          colour={colour}
          bowl={bowl}
          waste={waste}
        />
      ));
  });
}

export default Basins;
