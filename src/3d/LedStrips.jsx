import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { mm } from './constants.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { lightingSpec, resolveLighting, stripsForUnit } from '../engine/ledStrips.js';

// ─── TURN 33 (CLAUDE.md F1): THE STRIPS, DRAWN — emissive only ──────────────
// ─── CHAT-FIX 16.08.2026 (owner, point 2): AMENDED — the halo, v2 ───────────
//
// The engine says where every strip is; this draws them. The owner's verdicts
// on halo v1, same day, all four honoured here:
//   · "łuna jest punktowa … a nie na długim ledzie" — the glow was a radial
//     dot; it is now a LINEAR gradient stretched along the strip's whole
//     length, on a per-kind FIXED orientation (setFromUnitVectors left the
//     twist free, so planes and lamps landed sideways).
//   · "poświata górnych świeci do przodu zamiast do góry" — same twist bug;
//     the top wash now has its own pinned rotation, up means up.
//   · "stanowczo za jasne" — halo defaults came down (area 60→22, glow
//     0.5→0.32); further turns are one profile number away.
//   · "jak wyłączę światło, to się LED-y nie wyłączają, a powinny" + "widzę,
//     że renderowanie zabiera sporo pamięci, bo się zacina" — ONE answer to
//     both: the switch is a real switch. OFF = dark strip (a whisper of
//     emissive so geometry reads), no aura, NO RectAreaLights — the lamps
//     exist only while the light is on, so the working view costs what T33
//     cost.
// Spots stay emissive-only. Every number is the profile's
// (`appearance.lighting.*`) — never a literal here.

// The LTC lookup tables RectAreaLight needs — once per app, not per strip.
let ltcReady = false;
function ensureLtc() {
  if (!ltcReady) {
    RectAreaLightUniformsLib.init();
    ltcReady = true;
  }
}

// One shared LINEAR gradient for every aura — bright core line fading across
// the SHORT axis (texture V), full strength along the LONG axis (texture U).
let auraTexture = null;
function getAuraTexture() {
  if (auraTexture || typeof document === 'undefined') return auraTexture;
  const c = document.createElement('canvas');
  c.width = 4; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.85)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 128);
  auraTexture = new THREE.CanvasTexture(c);
  return auraTexture;
}

// ─── PER-KIND ORIENTATION, PINNED ────────────────────────────────────────────
// A light "looks" along its local -Z (three treats lights like cameras); a
// plane faces its local +Z. Each kind gets an EXPLICIT rotation so the long
// axis of both lamp and aura lies along the strip's own long axis — no free
// twist. Everything is local to the unit's group, so a moved or rotated
// wardrobe carries its light.
const HALF_PI = Math.PI / 2;
// The aura's gradient fades along texture V = the plane's local Y, so a
// side line (long axis local Y) gets one extra quarter-turn in the plane —
// the fade stays ACROSS the line, the full strength runs its length.
const Q_Z90 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, HALF_PI));

// ─── TURN 48 (CLAUDE.md F7): WHICH WAY A STRIP LOOKS, STATED ────────────────
//
// F7 is about `top_under` being drawn by a neighbour's picture in the lighting
// panel, and asks for the 3-D emission of the same variant to be VERIFIED.
// It was already right — `top_under` fell into the `else` below and shone DOWN
// — but "right by falling through" is exactly how the panel's own bug happened
// one file over: a kind nobody named ended up wearing the answer meant for
// another. So the two sets are written down. A kind that is in neither still
// falls to DOWN, which is what a strip does unless somebody says otherwise, and
// a kind that is in BOTH is a contradiction a reader can see.
const EMITS_UP = new Set(['top']);                            // -Z → +Y, up the wall
const EMITS_DOWN = new Set(['shelf', 'bottom', 'top_under']); // -Z → -Y, into the cabinet

function orientation(s) {
  // Returns { q, long: 'x'|'y' } — q aims local -Z along the emit direction,
  // `long` says which LOCAL axis carries the strip's length after q.
  const e = new THREE.Euler();
  const up = EMITS_UP.has(s.kind);
  // DOWN is the default as well as a list: a strip nobody has classified shines
  // down, which is what a shelf strip does and what a joiner expects.
  const down = EMITS_DOWN.has(s.kind) || (!up && s.kind !== 'side');
  if (up) e.set(HALF_PI, 0, 0);                        // -Z → +Y (up)
  else if (down) e.set(-HALF_PI, 0, 0);                // -Z → -Y (down)
  else e.set(0, s.side === 'R' ? HALF_PI : -HALF_PI, 0); // -Z → ∓X (into the cabinet)
  const q = new THREE.Quaternion().setFromEuler(e);
  // Down/up rotations keep local X = world X (the strips run along width);
  // the side rotation keeps local Y = world Y (the line runs top-to-bottom).
  return { q, long: s.kind === 'side' ? 'y' : 'x' };
}

export default function LedStrips({
  unit, result, design,
}) {
  const profile = useCabinetProfileStore((s) => s.profile);
  // The light switch — "Turn on the light". ON: emissive up, aura, lamps.
  // OFF: dark strips, nothing else (owner, 16.08 — and the frame rate's too).
  //
  // ─── TURN 35 (CLAUDE.md F10): READ WHERE THE ONE STATE LIVES ──────────────
  // It used to be the session's `uiStore.lightDemo`. The owner's two buttons
  // merged that flag with the project's `enabled`, so the switch is the
  // PROJECT'S answer and the 3D reads it off the design it is already handed —
  // one flag, no mirror to fall out of step with.
  const lightOn = useMemo(() => resolveLighting(design, profile).on, [design, profile]);

  // ─── TURN 45 (CLAUDE.md F9a): OFF IS A PREVIEW, NOT AN ERASER ────────────
  //
  // *"at OFF you still place, see and edit LED lines on carcasses."*
  //
  // `stripsForUnit` has answered `[]` while the light is off since T35, which
  // made the switch an EXISTENCE switch: turn the preview off to look at the
  // carcass in daylight and the lines you had just placed vanished. The
  // geometry is asked for unconditionally now — the design handed to it carries
  // `on: true` for the READ, which stores nothing — and `lightOn` below still
  // decides the brightness, the aura and the lamps, which is all the preview
  // ever meant. `engine/ledStrips.js` is untouched (iron rule 2).
  const litDesign = useMemo(
    () => ({ ...design, lighting: { ...(design?.lighting || {}), on: true } }),
    [design],
  );
  const strips = useMemo(() => stripsForUnit({
    unit, result, design: litDesign, profile,
  }), [unit, result, litDesign, profile]);

  const spec = lightingSpec(profile);
  useEffect(() => { if (strips.length && lightOn) ensureLtc(); }, [strips.length, lightOn]);
  if (!strips.length) return null;

  // ─── TURN 34 (CLAUDE.md F2): BRIGHT ENOUGH TO SEE ─────────────────────────
  // The numbers are the profile's (`appearance.lighting.*`), never literals.
  const boost = lightOn ? spec.demo.emissiveBoost : 1;
  const emissiveOn = spec.view.emissive * boost;
  const aura = lightOn ? getAuraTexture() : null;
  let areaLightsLeft = lightOn ? spec.halo.maxAreaLights : 0;

  return strips.map((s) => {
    const cx = mm(s.box.x + s.box.w / 2);
    const cy = mm(s.box.y + s.box.h / 2);
    const cz = mm(s.box.z + s.box.d / 2);
    const isStrip = s.kind !== 'spot';
    const { q, long } = isStrip ? orientation(s) : { q: null, long: 'x' };
    const longM = mm(long === 'y' ? s.box.h : s.box.w);
    const thinM = mm(s.kind === 'side' ? s.box.d : s.box.d);
    const spread = Math.max(thinM * spec.halo.glowScale, 0.05);
    const takeLight = isStrip && areaLightsLeft > 0;
    if (takeLight) areaLightsLeft -= 1;
    const emissiveIntensity = (lightOn ? emissiveOn : spec.view.offEmissive)
      * (s.kind === 'spot' ? spec.view.spotMultiplier : 1);
    return (
      <group key={s.id} position={[cx, cy, cz]}>
        <mesh userData={{ ccLedStrip: s.kind }}>
          {s.round
            ? <cylinderGeometry args={[mm(s.box.w / 2), mm(s.box.w / 2), mm(s.box.h), 24]} />
            : <boxGeometry args={[mm(s.box.w), mm(s.box.h), mm(s.box.d)]} />}
          <meshStandardMaterial
            color={s.hex}
            emissive={s.hex}
            emissiveIntensity={emissiveIntensity}
            roughness={0.4}
          />
        </mesh>
        {takeLight && (
          <rectAreaLight
            quaternion={q}
            args={[
              s.hex,
              spec.halo.area * boost,
              long === 'x' ? longM : Math.max(thinM * 2, 0.03),
              long === 'y' ? longM : Math.max(thinM * 2, 0.03),
            ]}
          />
        )}
        {isStrip && aura && (
          <mesh quaternion={long === 'y' ? q.clone().multiply(Q_Z90) : q}>
            <planeGeometry args={[longM, spread]} />
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
