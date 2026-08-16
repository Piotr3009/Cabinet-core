import { useMemo } from 'react';
import { mm } from './constants.js';
import { useUiStore } from '../stores/uiStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { lightingSpec, stripsForUnit } from '../engine/ledStrips.js';

// ─── TURN 33 (CLAUDE.md F1): THE STRIPS, DRAWN — emissive only ──────────────
//
// The engine says where every strip is (engine/ledStrips.js, in the unit's own
// millimetre frame); this draws thin EMISSIVE boxes and discs there, inside
// the unit's group so a moved or rotated wardrobe carries its light with it.
//
// NO REAL LIGHT SOURCES in the working view — an emissive surface costs what
// any surface costs, a point light costs the whole scene (rule: do not tank
// the frame rate). F2's "Turn on the light" raises `emissiveIntensity` and
// dims the studio rig; it adds no lamps either.

export default function LedStrips({
  unit, result, design,
}) {
  const profile = useCabinetProfileStore((s) => s.profile);
  // F2: while the demo is on, the placed LEDs come UP (profile-listed boost).
  const lightDemo = useUiStore((s) => s.lightDemo);

  const strips = useMemo(() => stripsForUnit({
    unit, result, design, profile,
  }), [unit, result, design, profile]);
  if (!strips.length) return null;

  const spec = lightingSpec(profile);
  const intensity = spec.view.emissive * (lightDemo ? spec.demo.emissiveBoost : 1);

  return strips.map((s) => {
    const cx = mm(s.box.x + s.box.w / 2);
    const cy = mm(s.box.y + s.box.h / 2);
    const cz = mm(s.box.z + s.box.d / 2);
    return (
      <mesh
        key={s.id}
        position={[cx, cy, cz]}
        userData={{ ccLedStrip: s.kind }}
      >
        {s.round
          ? <cylinderGeometry args={[mm(s.box.w / 2), mm(s.box.w / 2), mm(s.box.h), 24]} />
          : <boxGeometry args={[mm(s.box.w), mm(s.box.h), mm(s.box.d)]} />}
        <meshStandardMaterial
          color={s.hex}
          emissive={s.hex}
          emissiveIntensity={intensity}
          roughness={0.4}
        />
      </mesh>
    );
  });
}
