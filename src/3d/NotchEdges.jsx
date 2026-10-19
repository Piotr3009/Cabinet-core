/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
import { useState } from 'react';
import { COLORS, mm } from './constants.js';
import { useUiStore } from '../stores/uiStore.js';
import { askNotchEdge, notchEdgeSpots } from './notchPick.js';

// ─── T79 F5 · CUT EDGE: THE FOUR HORIZONTAL EDGES, LIT ─────────────────────
//
// The owner, 18.10.2026: *"cut the corner działa idealnie, ale możesz zrobić mi
// też poziome cut? wszystkich 4 rogów?"*
//
// `NotchCorners.jsx`'s twin (KIT_NOTCH.lsp D22). CUT EDGE (PRO's right panel,
// retail's SIZE step) sets `uiStore.edgeNotchPick` to the selected unit, and
// this lights its four horizontal side edges in the same gold: a thin bar
// along the whole width at each edge, and ON the edge, at the middle of the
// width, the square handle that takes the click. The click opens the small
// window AT THE CLICK (`edge-notch` in `lib/modalLayer.js`, about an object,
// held to an anchor); the window does the rest. Nothing here writes a unit.
//
// CHAT FIX 19.10.2026, the owner's eye-test of T79 F5: *"linia krawedzi
// prawie niewidoczna i trudna do klikniecia; ma byc jak narozniki, kwadraty"*;
// asked "kwadrat na srodku kazdej z 4 poziomych krawedzi boku, jak przy
// naroznikach?": *"tak, bez mockupu, identycznie jak pionowe"*. The lifted
// handles and their drop lines are gone; the square stands on its edge, the
// corner's size, and a board of this carcass standing in front of it lets the
// press through to it (`UnitView.jsx`, `edgeHandleBehind`).
//
// R7: nothing here is a DOM node; a walk finds the handles by
// `userData.ccNotchEdge`, as every helper in this folder is found.

const HANDLE_MM = 70;
const BAR_MM = 14;

export default function NotchEdges({
  unitId, width, depth, height, edgeNotch = null,
}) {
  const pick = useUiStore((s) => s.edgeNotchPick);
  const [hot, setHot] = useState(null);
  if (!unitId || pick !== unitId) return null;
  const W = Number(width) || 0;
  return (
    <group userData={{ ccHelper: true, ccNotchEdges: unitId }}>
      {notchEdgeSpots(width, depth, height).map((sp) => {
        const lit = hot === sp.edge || edgeNotch?.edge === sp.edge;
        const opacity = lit ? 0.9 : 0.6;
        return (
          <group key={sp.edge}>
            {/* the edge itself, the whole width, lit */}
            <mesh position={[mm(W / 2), mm(sp.y), mm(sp.z)]} renderOrder={13} raycast={() => null}>
              <boxGeometry args={[mm(W), mm(BAR_MM), mm(BAR_MM)]} />
              <meshBasicMaterial color={COLORS.gold} transparent opacity={opacity} depthTest={false} toneMapped={false} />
            </mesh>
            {/* ...and the square ON the edge, at the middle, which takes the click */}
            <mesh
              position={[mm(sp.x), mm(sp.y), mm(sp.z)]}
              renderOrder={14}
              userData={{ ccNotchEdge: sp.edge, ccUnitId: unitId }}
              onPointerOver={(e) => { e.stopPropagation(); setHot(sp.edge); }}
              onPointerOut={() => setHot(null)}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                if (((e.nativeEvent || e).button ?? 0) !== 0) return;
                e.stopPropagation();
                askNotchEdge(unitId, sp.edge, { x: e.clientX, y: e.clientY });
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
