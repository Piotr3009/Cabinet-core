import { useState } from 'react';
import { mm } from './constants.js';

// ─── The top edge of a piece you can pull up (turn 6, CLAUDE.md F3/F4) ───
//
// An end panel and a vertical L-infill both finish at whatever height the room
// gives them: usually the top of the unit, sometimes the ceiling, sometimes a
// line the joiner picks by eye. That is three different answers, so it is an
// INTERACTION rather than a setting — click the edge to see it, drag it to
// place it, double-click it to send it to the ceiling.
//
// The handle is a thin band lying ON the edge rather than a knob floating
// beside it: what you grab is the thing that moves, which is the same bargain
// the top-infill handle has made since turn 3 and the shelves since turn 1.
//
// It is TOOL, not furniture — `ccHelper` keeps it out of a render.

export default function EdgeHandle({
  position, width, depth, thickness, colour, active = false, title,
  onPointerDown, onDoubleClick,
}) {
  const [hover, setHover] = useState(false);
  const lit = active || hover;

  return (
    <mesh
      userData={{ ccHelper: true }}
      position={position}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'ns-resize'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}
    >
      <boxGeometry args={[mm(width), mm(thickness), mm(depth)]} />
      <meshBasicMaterial
        color={colour}
        transparent
        // Barely there until you touch it. A permanent bar along the top of
        // every end panel in the room would read as part of the furniture,
        // which is the one thing a handle must never do.
        opacity={lit ? 0.85 : 0.22}
        depthWrite={false}
        toneMapped={false}
      />
      {title && <group name={title} />}
    </mesh>
  );
}
