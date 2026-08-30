import { useState } from 'react';
import * as THREE from 'three';

import { mm } from './constants.js';
import { useScreenScale } from './DimLabel.jsx';
import { ledIconsOn, useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';

// ─── TURN 54 (CLAUDE.md F5): THE LED ICONS SHOW WHILE LIGHTING IS OPEN ──────
//
// The owner: *"po otwarciu modalu Lighting ikony LED mają być widoczne — nie
// dodajesz nic do szaf. teraz jak nie naciśniesz szafy to nie widać ikon left
// LED / right LED i ludzie nie wiedzą, że takie funkcje istnieją. żadnego
// nowego modalu."*
//
// Until tonight the left/right LED controls lived ONLY in the Lighting panel,
// behind its selected-unit gate — a joiner who never clicked a cabinet never
// learnt the feature existed. So: while the EXISTING Lighting panel is open
// (and only then — panel closed is exactly yesterday's scene), every unit
// wears two clickable LED icons, one per side, and clicking one toggles that
// side's strip — the very `{ unitId, kind: 'side', ref }` item the panel's
// own buttons write. No new modal, nothing added to the cabinets' data: two
// sprites of pure UI, `ccHelper` so no render or shadow ever sees them.
//
// LEGIBILITY AT DISTANCE (F5.2, DECISION for the owner — veto "bez clampa"):
// the icon rides `useScreenScale`, the house's own constant-pixel mechanism
// (DimLabel's), so it can never shrink into an unreadable speck across a
// six-metre room.

const cache = new Map();

/** The pill, drawn once per (side, lit) pair. */
function ledTexture(side, lit) {
  const key = `${side}|${lit ? 1 : 0}`;
  const known = cache.get(key);
  if (known) return known;
  const W = 256;
  const H = 96;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const r = H / 2 - 6;
  const gold = '#d9b45b';
  ctx.beginPath();
  ctx.roundRect(6, 6, W - 12, H - 12, r);
  ctx.fillStyle = lit ? gold : 'rgba(24,24,28,0.88)';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = gold;
  ctx.stroke();
  // The bulb dot, on the side the strip lives on.
  const dotX = side === 'L' ? 34 : W - 34;
  ctx.beginPath();
  ctx.arc(dotX, H / 2, 13, 0, Math.PI * 2);
  ctx.fillStyle = lit ? '#ffffff' : gold;
  ctx.fill();
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = lit ? '#1c1c20' : '#f5efe2';
  ctx.fillText(side === 'L' ? 'L LED' : 'R LED', W / 2 + (side === 'L' ? 12 : -12), H / 2 + 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}

/** One icon: a billboarded sprite at constant pixel height. */
function LedIcon({
  position, side, lit, onToggle,
}) {
  const [hover, setHover] = useState(false);
  // 22 px tall on screen, whatever the camera does — the clamp (F5.2).
  const ref = useScreenScale(hover ? 26 : 22, (object, h) => {
    object.scale.set(h * (256 / 96), h, 1);
  });
  return (
    <sprite
      ref={ref}
      userData={{ ccHelper: true }}
      position={position}
      renderOrder={30}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}
    >
      <spriteMaterial
        attach="material"
        map={ledTexture(side, lit)}
        transparent
        depthTest={false}
        toneMapped={false}
        allowOverride={false}
      />
    </sprite>
  );
}

/**
 * The pair, for one unit. Rendered inside the unit's own local frame.
 *
 * ─── TURN 58 (F4): THE GATE IS GONE; THE LAW IS BESIDE THE OTHER VIEW FLAGS ──
 *
 * What stood here was `const lightingOpen = useUiStore((s) => s.modal ===
 * 'lighting'); if (!lightingOpen) return null;` — this turn's second licensed
 * deletion. T54-F5 wrote that the gate IS the feature, and it was right about
 * the PURPOSE and wrong about the HOME: a modal being open is not a way of
 * looking at a cabinet, so the icons could not be kept on while working, and
 * one piece of the scene decided its own visibility while every other overlay
 * in this app asks the view store.
 *
 * `ledIconsOn` is now the one answer (stores/uiStore.js), and it still shows
 * them while the Lighting panel is open — T54's discoverability, kept on
 * purpose and stated as a rule instead of implied by a gate.
 */
export default function LedIcons({ unit, W, H, D }) {
  const visible = useUiStore(ledIconsOn);
  const design = useProjectStore((s) => s.project.design);
  const addLightingItem = useProjectStore((s) => s.addLightingItem);
  const removeLightingItem = useProjectStore((s) => s.removeLightingItem);
  if (!visible) return null;
  const items = design?.lighting?.items || [];
  const itemOf = (side) => items.find((i) => i.unitId === unit.id && i.kind === 'side' && i.ref === side);
  const toggle = (side) => {
    const has = itemOf(side);
    if (has) removeLightingItem(has.id);
    else addLightingItem({ unitId: unit.id, kind: 'side', ref: side });
  };
  return (
    <group userData={{ ccHelper: true }}>
      {['L', 'R'].map((side) => (
        <LedIcon
          key={side}
          side={side}
          lit={Boolean(itemOf(side))}
          position={[mm(side === 'L' ? 60 : W - 60), mm(H * 0.78), mm(D + 60)]}
          onToggle={() => toggle(side)}
        />
      ))}
    </group>
  );
}
