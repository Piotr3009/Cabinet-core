import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
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
// ─── CHAT-FIX 16.08.2026 (owner, point 2): THE T33 "no real lights" LAW ─────
// ─── IS AMENDED, by his word ────────────────────────────────────────────────
// T33 ruled "NO REAL LIGHT SOURCES in the working view" to protect the frame
// rate. The owner, seeing it live: "daje światło ogólnie, ale nie daje światła
// typowo wychodzącego ze stripów — nie widzę poświaty, promieni od tej linii".
// So every STRIP now carries:
//   1. a RectAreaLight (three core — no shadows, cheap-ish, real light
//      falling on the boards), capped at `halo.maxAreaLights` per unit so a
//      12-strip wardrobe cannot tank the scene — beyond the cap, aura only;
//   2. an additive glow quad around the line itself (the aura the eye reads
//      as "LED", canvas gradient, no texture files).
// Spots stay emissive-only — a disc the size of a coin does not get a lamp.
// Every number is the profile's (`appearance.lighting.halo.*`) — never a
// literal here.

// The LTC lookup tables RectAreaLight needs — once per app, not per strip.
let ltcReady = false;
function ensureLtc() {
  if (!ltcReady) {
    RectAreaLightUniformsLib.init();
    ltcReady = true;
  }
}

// One shared radial gradient for every aura — built on first use, cached.
let auraTexture = null;
function getAuraTexture() {
  if (auraTexture || typeof document === 'undefined') return auraTexture;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  auraTexture = new THREE.CanvasTexture(c);
  return auraTexture;
}

// The strip's emitting direction, in the UNIT'S OWN frame. `lookAt` on a
// light aims its local -Z (three treats lights like cameras), and because
// the light is a child of the unit's group, a plain local quaternion is
// enough — no world-space bookkeeping, a rotated wardrobe carries its light.
const MINUS_Z = new THREE.Vector3(0, 0, -1);
function emitQuaternion(s) {
  const d = s.kind === 'top' ? new THREE.Vector3(0, 1, 0)
    : s.kind === 'side' ? new THREE.Vector3(s.side === 'R' ? -1 : 1, 0, 0)
      : new THREE.Vector3(0, -1, 0); // shelf, bottom: down
  return new THREE.Quaternion().setFromUnitVectors(MINUS_Z, d);
}

export default function LedStrips({
  unit, result, design,
}) {
  const profile = useCabinetProfileStore((s) => s.profile);
  // F2: while the demo is on, the placed LEDs come UP (profile-listed boost).
  const lightDemo = useUiStore((s) => s.lightDemo);

  const strips = useMemo(() => stripsForUnit({
    unit, result, design, profile,
  }), [unit, result, design, profile]);

  const spec = lightingSpec(profile);
  useEffect(() => { if (strips.length) ensureLtc(); }, [strips.length]);
  if (!strips.length) return null;

  // ─── TURN 34 (CLAUDE.md F2): BRIGHT ENOUGH TO SEE ─────────────────────────
  // "są zbyt słabe — nic nie widać, za słabo świecą" (owner, 16.08.2026). The
  // numbers are the profile's (`appearance.lighting.*`), never literals here;
  // a spot disc reads smaller than a strip and carries its own multiplier so
  // the two look like the same light.
  const boost = lightDemo ? spec.demo.emissiveBoost : 1;
  const intensity = spec.view.emissive * boost;
  const aura = getAuraTexture();
  let areaLightsLeft = spec.halo.maxAreaLights;

  return strips.map((s) => {
    const cx = mm(s.box.x + s.box.w / 2);
    const cy = mm(s.box.y + s.box.h / 2);
    const cz = mm(s.box.z + s.box.d / 2);
    const isStrip = s.kind !== 'spot';
    const q = isStrip ? emitQuaternion(s) : null;
    // The strip's LONG axis in metres — the light and the aura share it.
    const longM = mm(s.kind === 'side' ? s.box.h : s.box.w);
    const thinM = mm(s.kind === 'side' ? s.box.d : Math.max(s.box.d, s.box.w));
    const takeLight = isStrip && areaLightsLeft > 0;
    if (takeLight) areaLightsLeft -= 1;
    return (
      <group key={s.id} position={[cx, cy, cz]}>
        <mesh userData={{ ccLedStrip: s.kind }}>
          {s.round
            ? <cylinderGeometry args={[mm(s.box.w / 2), mm(s.box.w / 2), mm(s.box.h), 24]} />
            : <boxGeometry args={[mm(s.box.w), mm(s.box.h), mm(s.box.d)]} />}
          <meshStandardMaterial
            color={s.hex}
            emissive={s.hex}
            emissiveIntensity={intensity * (s.kind === 'spot' ? spec.view.spotMultiplier : 1)}
            roughness={0.4}
          />
        </mesh>
        {takeLight && (
          <rectAreaLight
            quaternion={q}
            args={[s.hex, spec.halo.area * boost, longM, Math.max(thinM * 2, 0.03)]}
          />
        )}
        {isStrip && aura && (
          <mesh quaternion={q} position={[0, 0, 0]}>
            <planeGeometry args={[longM * 1.1, Math.max(thinM * spec.halo.glowScale, 0.05)]} />
            <meshBasicMaterial
              map={aura}
              color={s.hex}
              transparent
              opacity={Math.min(1, spec.halo.glowOpacity * boost)}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        )}
      </group>
    );
  });
}
