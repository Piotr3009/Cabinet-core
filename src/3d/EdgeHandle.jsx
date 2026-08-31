import { useState } from 'react';
import { mm } from './constants.js';
import { chromeOn } from './chrome.js';

// ─── The top edge of a piece you can pull up (turn 6, CLAUDE.md F3/F4) ───
//
// An end panel and a vertical L-infill both finish at whatever height the room
// gives them: usually the top of the unit, sometimes the ceiling, sometimes a
// line the joiner picks by eye. That is three different answers, so it is an
// INTERACTION rather than a setting — hover the edge to see it, drag it to
// place it, double-click it to send it to the ceiling.
//
// The handle is a thin band lying ON the edge rather than a knob floating
// beside it: what you grab is the thing that moves, which is the same bargain
// the shelves have made since turn 1.
//
// It is TOOL, not furniture — `ccHelper` keeps it out of a render.
//
// ─── TURN 8 (CLAUDE.md F2.4): INVISIBLE UNTIL YOU TOUCH IT ───
//
// Turn 6 drew it at 22 % opacity all the time, sitting exactly ON the top face
// of the piece it belongs to, and the same width. Two things came out of that,
// and Piotr reported both:
//
//   1. A GREY HAZE along the top of every end panel and filler in the room. A
//      permanent bar is not a handle; it reads as part of the furniture, which
//      is the one thing a handle must never do.
//   2. Z-FIGHTING — the "jelly". Two coplanar surfaces a hundredth of a
//      millimetre apart is a coin toss per pixel per frame, and it flickers
//      with the smallest camera move.
//
// So: nothing is drawn at rest. The mesh is still THERE — it has to be, or
// there would be nothing to hover — but it is invisible, and picking works on
// an invisible mesh because R3F raycasts geometry and not pixels. When it does
// draw, it stands `lift` above the face and is inset `inset` on every side, so
// the two surfaces are never coplanar and the outline never touches the edge of
// the piece underneath.

/** How far the band stands above the face, and how far inside its outline. */
const HANDLE_LIFT_MM = 0.6;
const HANDLE_INSET_MM = 1;

export default function EdgeHandle({
  position, width, depth, thickness, colour, active = false, title,
  onPointerDown, onDoubleClick,
}) {
  // TURN 59: the PBI retail mount draws the furniture and none of the tool.
  // PRO never calls `setProChrome`, so this is `true` and this line is a no-op.
  // T61 F1 · the CHANNEL, not the master switch: the client's room
  // owns the drag handles on a unit's edges. PRO sets no
  // channel, so `chromeOn` falls through to `on` and this guard still
  // reads `if (!true)` — which IS the no-change proof.
  if (!chromeOn('edge')) return null;
  const [hover, setHover] = useState(false);
  const lit = active || hover;

  return (
    <mesh
      userData={{ ccHelper: true }}
      // Lifted clear of the face it lies on. 0.6 mm is under a millimetre of
      // real furniture — invisible as a position, decisive as a depth.
      position={[position[0], position[1] + mm(HANDLE_LIFT_MM), position[2]]}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'ns-resize'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}
    >
      <boxGeometry args={[
        mm(Math.max(width - 2 * HANDLE_INSET_MM, 1)),
        mm(thickness),
        mm(Math.max(depth - 2 * HANDLE_INSET_MM, 1)),
      ]}
      />
      <meshBasicMaterial
        color={colour}
        transparent
        // Not there at all until the cursor finds the edge, or a drag is live.
        // `visible` and not opacity 0: an invisible mesh is not drawn, not
        // sorted and not blended, and it still raycasts — so hovering works and
        // the frame costs nothing.
        visible={lit}
        opacity={0.85}
        depthWrite={false}
        toneMapped={false}
        // Tool, not furniture: it must not reach the contact-shadow depth pass
        // (turn 9, CLAUDE.md F1.3).
        allowOverride={false}
      />
      {title && <group name={title} />}
    </mesh>
  );
}
