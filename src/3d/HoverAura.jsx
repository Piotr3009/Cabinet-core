import { useCallback, useEffect, useRef, useState } from 'react';
import { mm } from './constants.js';
import DimLabel from './DimLabel.jsx';
import {
  auraBox, auraColour, auraLabel, auraLingerMs,
} from '../engine/hoverAura.js';

// ─── THE CATCHMENT, IN THE SCENE (turn 31, CLAUDE.md F7) ────────────────────
//
// "Not a snap — a CATCHMENT. An invisible enlarged hitbox (~8 mm in scene mm,
// the T30 pick-surface pattern) around every handle and hinge."
//
// THE T30 PICK-SURFACE PATTERN is `3d/Hardware.jsx`'s own: an instanced box,
// `visible={false}`, carrying the gesture and never drawn. It has been the
// hinge's double-click target since turn 19 and it works; what it was not is
// BIG ENOUGH, and it carried a click and nothing else.
//
// This is that surface, enlarged and given the other two jobs F7 asks for:
//
//   • it is the HOVER catchment — inside it, the piece's own number shows;
//   • it is the GRAB / DOUBLE-CLICK target — "no more pixel-hunting a thin
//     rail" is the same box doing the same work at a size a hand can hit.
//
// ─── THE LINGER IS THE FEATURE, NOT A POLISH ────────────────────────────────
//
// three.js raycasts every frame, and a hand held still on the boundary of a box
// crosses it several times a second. Without a linger the label strobes, and a
// strobing label is worse than no label. Leaving starts a clock; coming back
// stops it; the label is pulled only when the clock runs out. One timer, and no
// second geometry.
//
// ─── R7: NOTHING HERE IS A DOM NODE ─────────────────────────────────────────
//
// `userData.ccHoverAura` and not a `data-*` attribute — the same rule every
// helper in this folder follows, because a `data-*` on an R3F mesh crashes the
// reconciler. A walk finds these by traversing the scene.

/**
 * @param {object} props
 *   at        [x, y, z] in SCENE units — where the piece is
 *   size      { w, h, d } of the piece itself, in mm
 *   subject   { kind: 'handle' | 'hinge', panel, mm, id } — what it is about
 *   profile
 *   onActivate  the double-click (the grab target), given the pointer event
 *   labelAt   [x, y, z] for the number, defaulting to just above the piece
 */
export default function HoverAura({
  at, size, subject, profile, onActivate = null, labelAt = null,
  // ─── TURN 32 (CLAUDE.md F9): THE OWNER'S DRAWING ─────────────────────────
  // A rendered node shown INSTEAD of the single label while the aura is hot —
  // the handle's CAD dimension chain. The catchment, the linger and the
  // double-click are exactly what T31 built; only the label changes.
  dims = null,
}) {
  const [hot, setHot] = useState(false);
  const timer = useRef(null);
  const linger = auraLingerMs(profile);

  // A pending "leave" must not outlive the piece: a cabinet deleted while its
  // label is fading would set state on an unmounted component.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const enter = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setHot(true);
  }, []);

  const leave = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; setHot(false); }, linger);
  }, [linger]);

  const box = auraBox(size, profile);
  const text = hot && !dims ? auraLabel(subject, profile) : null;
  const colour = auraColour(profile);

  return (
    <group userData={{ ccHelper: true, ccHoverAura: subject?.id || subject?.kind || '1' }}>
      <mesh
        position={at}
        visible={false}
        userData={{
          ccNoBounds: true,
          ccAuraKind: subject?.kind || null,
          ccAuraId: subject?.id || null,
          // What the walk measures: the box really is the piece plus the
          // profile's own catchment on every side.
          ccAuraMm: [box.w, box.h, box.d],
        }}
        onPointerOver={(e) => { e.stopPropagation(); enter(); }}
        onPointerOut={leave}
        onDoubleClick={onActivate ? (e) => { e.stopPropagation(); onActivate(e); } : undefined}
      >
        <boxGeometry args={[mm(box.w), mm(box.h), mm(box.d)]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {hot && dims}
      {text && (
        <DimLabel variant="bare"
          position={labelAt || [at[0], at[1] + mm(box.h / 2 + 18), at[2]]}
          text={text}
          colour={colour}
          scale={0.85}
        />
      )}
    </group>
  );
}
