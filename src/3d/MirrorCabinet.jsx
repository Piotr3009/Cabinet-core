/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F3 · THE MIRROR CABINET IN THE ROOM
//
// The owner, 25.10.2026 (14:09): *"zobacz szafki z mirrorami na wierzchu i
// szybkami w srodku czyli szklane polki, czasami lustro z tylu, podswietlenie
// pod spodem etc"*; *"czasami jak ktos chce to bedzie mial na plecach tez,
// klikasz na plecy i wyskakuje ci opcja chcesz lustro na plecach?"*.
//
// Every PART of the kit (the carcass, the bottom box, the dividers, the
// panels round, the mirror doors, the LED stiles, the glass shelves) is drawn
// by the house's leaf in UnitView, so it opens, picks, drags and outlines as
// every part does; how it LOOKS there (the board 18 and the mirror 4, the lit
// stile, the glass) is `mirrorCabinetRoom.js`. What is drawn HERE is what is
// not a part: the LED under and the LED inside (`derived.mirror.led`, drawn as
// `LedStrips.jsx` draws a strip: an emissive box, the temperature's hex, the
// house's brightness by the project's switch) and, when asked, the mirror on
// the back (a pane a bay on the BACK's inside face, T33's mirror). None of it
// takes a pick: a click goes through to the board behind (the BACK asks).
// FROZEN 3: no lamp is added and the lighting files are not touched; this
// reads `engine/ledStrips.js`'s numbers and nothing else of it.

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mm } from './constants.js';
import {
  LED_STRIP_ROUGHNESS, MIRROR_LOOK, mirrorBackPanes, mirrorLedGlow, mirrorLedStrips, mirrorOf,
  mirrorRecessPlacement,
} from './mirrorCabinetRoom.js';

/** Never in the way of a pick: the strips and the panes are pictures. */
const NO_PICK = () => null;

const centreOf = (b) => [mm(b.x + b.w / 2), mm(b.y + b.h / 2), mm(b.z + b.d / 2)];

/**
 * The mirror cabinet's own light and its back, in the unit's frame.
 *
 * @param {object} props
 *   unit     the unit (its id names the group for the walk)
 *   result   computeCabinet's result (`derived.mirror`, the BACK's panes)
 *   design   the project's design (the light's switch)
 *   profile  the cabinet profile (the strip, the temperatures)
 */
export default function MirrorCabinet({
  unit, result, design, profile,
}) {
  const mirror = mirrorOf(result);
  const panes = useMemo(() => mirrorBackPanes(result), [result]);
  const strips = useMemo(() => (mirror ? mirrorLedStrips(result, profile) : []), [mirror, result, profile]);
  const glow = useMemo(() => (mirror ? mirrorLedGlow(result, { profile, design }) : null), [mirror, result, profile, design]);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useEffect(() => () => box.dispose(), [box]);
  if (!mirror) return null;
  const placed = mirrorRecessPlacement(unit, result, profile);
  return (
    <group
      userData={{
        ccMirrorCabinet: unit.id,
        ccNoBounds: true,
        ccMirrorRoom: {
          recessMm: placed.recessMm,
          backMm: placed.backMm,
          faceMm: placed.faceMm,
          stiles: (mirror.stiles || []).filter((s) => s.kind === 'led').length,
          lit: Boolean(glow?.on),
          panes: panes.length,
          strips: strips.map((s) => s.kind),
        },
      }}
    >
      {panes.map((pn) => (
        <mesh
          key={pn.id}
          geometry={box}
          position={centreOf(pn.box)}
          scale={[mm(pn.box.w), mm(pn.box.h), mm(pn.box.d)]}
          raycast={NO_PICK}
          userData={{ ccMirrorBackPane: pn.id, ccNoBounds: true }}
        >
          <meshPhysicalMaterial {...MIRROR_LOOK} />
        </mesh>
      ))}
      {strips.map((s) => (
        <mesh
          key={s.id}
          geometry={box}
          position={centreOf(s.box)}
          scale={[mm(s.box.w), mm(s.box.h), mm(s.box.d)]}
          raycast={NO_PICK}
          userData={{ ccMirrorLed: s.kind, ccNoBounds: true }}
        >
          <meshStandardMaterial
            color={glow.hex}
            emissive={glow.hex}
            emissiveIntensity={glow.intensity}
            roughness={LED_STRIP_ROUGHNESS}
          />
        </mesh>
      ))}
    </group>
  );
}
