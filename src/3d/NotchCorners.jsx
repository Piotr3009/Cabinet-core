import { useState } from 'react';
import { COLORS, mm } from './constants.js';
import { useUiStore } from '../stores/uiStore.js';
import { askNotchCorner, notchCornerSpots } from './notchPick.js';

// ─── T75 F7 · CUT CORNER: THE FOUR PLAN CORNERS, LIT ───────────────────────
//
// The owner, 23.09.2026: *"Klikasz 'wytnij narożnik', program podświetla
// narożniki, wybierasz, podajesz wysokość, głębokość, szerokość (np.
// 200x200)."*
//
// CUT CORNER (PRO's right panel, retail's SIZE step) sets `uiStore.notchPick`
// to the selected unit, and this lights its four plan corners in the gold the
// scene already marks a selection and a magnet with: a thin column down each
// vertical edge of the carcass, and above the carcass top a handle that takes
// the click (above, so no board of the carcass stands between it and the eye).
// The click opens the small window AT THE CLICK, the T74 F1 kind (`notch` in
// `lib/modalLayer.js`, about an object, held to an anchor); the window does
// the rest. Nothing here writes a unit: the cut is the store's one action.
//
// R7: nothing here is a DOM node; a walk finds the handles by
// `userData.ccNotchCorner`, as every helper in this folder is found.

const HANDLE_MM = 70;
const LIFT_MM = 90;

export default function NotchCorners({
  unitId, width, depth, height, notch = null,
}) {
  const pick = useUiStore((s) => s.notchPick);
  const [hot, setHot] = useState(null);
  if (!unitId || pick !== unitId) return null;
  const H = Number(height) || 0;
  return (
    <group userData={{ ccHelper: true, ccNotchCorners: unitId }}>
      {notchCornerSpots(width, depth).map((sp) => {
        const lit = hot === sp.corner || notch?.corner === sp.corner;
        return (
          <group key={sp.corner} position={[mm(sp.x), 0, mm(sp.z)]}>
            {/* the corner's own vertical edge, lit */}
            <mesh position={[0, mm(H / 2), 0]} renderOrder={13} raycast={() => null}>
              <boxGeometry args={[mm(14), mm(H), mm(14)]} />
              <meshBasicMaterial color={COLORS.gold} transparent opacity={lit ? 0.9 : 0.6} depthTest={false} toneMapped={false} />
            </mesh>
            {/* …and the handle above the top, which takes the click */}
            <mesh
              position={[0, mm(H + LIFT_MM), 0]}
              renderOrder={14}
              userData={{ ccNotchCorner: sp.corner, ccUnitId: unitId }}
              onPointerOver={(e) => { e.stopPropagation(); setHot(sp.corner); }}
              onPointerOut={() => setHot(null)}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                if (((e.nativeEvent || e).button ?? 0) !== 0) return;
                e.stopPropagation();
                askNotchCorner(unitId, sp.corner, { x: e.clientX, y: e.clientY });
              }}
            >
              <boxGeometry args={[mm(HANDLE_MM), mm(HANDLE_MM), mm(HANDLE_MM)]} />
              <meshBasicMaterial color={lit ? COLORS.goldSoft : COLORS.gold} transparent opacity={lit ? 0.95 : 0.75} depthTest={false} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
