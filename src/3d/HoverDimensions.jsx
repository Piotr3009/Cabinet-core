import { useMemo } from 'react';
import { mm } from './constants.js';
import DimensionChain from './DimensionChain.jsx';
import { dimensionStyle } from '../engine/dimensionArrows.js';
import { pieceHoverRows } from '../engine/hoverRows.js';
import { bayGapsAround } from '../engine/partitionPositions.js';

// ─── THE BAYS, ON HOVER (turn 23, CLAUDE.md F8.2) ───────────────────────────
//
// "Hovering a vertical partition draws the same style of arrows for the clear
// bay widths to its neighbours (side ↔ partition ↔ partition). Appears on
// hover, fades on leave."
//
// ONE STYLE (F8.3): `profile.hoverDimensions`, the very numbers the CNC part
// detail's arrows are drawn from, and the geometry is the same pure function —
// `engine/dimensionArrows.js`. The two surfaces could hardly be more different
// (an SVG in a modal, meshes in a WebGL scene) and neither of them invents an
// arrowhead.
//
// CLEAR WIDTHS, not centres (F8.2, and F10's own derivation): a bay is the
// space you can put something in, so it is measured face to face. The same
// `bayGapsAround` the partition field reads, so a chip and an arrow cannot
// disagree about a number the owner is placing furniture by.
//
// ─── R7: NOTHING HERE IS A DOM NODE ────────────────────────────────────────
//
// Every group carries `userData.ccHelper`, which is what the ruler's picking
// and the render's bounds already skip — and NOT a `data-*` attribute, which
// crashes the R3F reconciler (the ruler marker's own bug, two turns running).
// A walk finds these by traversing the scene for `ccHoverDimension`.
//
// ─── TURN 26 (CLAUDE.md R11): AND THE DRAWING ITSELF MOVED OUT ─────────────
//
// This file used to own a `Stroke`, a `DimLabel` and the loop that turned a
// dimension into meshes — which is one of the three implementations R11
// abolishes. It computes POINTS now and hands them to `3d/DimensionChain.jsx`,
// the one component. What it kept is the only thing that was ever its own:
// WHICH numbers are worth reading off a hovered piece, and the magnet volume
// that keeps them on screen.

/**
 * The clear bays either side of one hovered partition.
 *
 * @param {object} props
 *   result   computeCabinet() output — the panels are read from it, so this
 *            component derives nothing the engine has not already decided
 *   panelId  the VPART being pointed at, or null for "nothing is hovered"
 *   profile
 */
export default function HoverDimensions({
  result, panelId, profile, onLeave = null,
}) {
  const style = useMemo(() => dimensionStyle(profile), [profile]);

  const drawing = useMemo(() => {
    if (!panelId || !result) return null;
    const panels = result.panels || [];
    const me = panels.find((p) => p.id === panelId);
    if (!me?.box) return null;

    // ─── TURN 25 (CLAUDE.md F14.2): THE SAME ARROWS ON THREE MORE PIECES ──
    //
    // "The SAME thin blue arrows appear on hover for SHELVES (clear gaps to
    // floor, neighbour shelf, top) and for a SIDE PANEL (interior depth and
    // interior height, drawn inside the cabinet)."
    //
    // Same style block, same `dimensionEntities`, same magnet — the only thing
    // that differs per piece is WHICH numbers are worth reading, and that is
    // one pure function (`engine/hoverRows.js`). Horizontal and vertical only,
    // as F14.3 asks: every row below is one axis or the other and there is no
    // path here that could produce a sloping one.
    if (me.part !== 'VPART') {
      const set = pieceHoverRows(result, panelId, profile);
      if (!set) return null;
      return {
        rows: set.rows.map((r, i) => ({
          key: r.key ?? `p${i}`, from: r.from, to: r.to, offset: r.offset ?? 0,
        })),
        z: set.z,
        mid: set.mid,
        own: me.box,
      };
    }

    // What a bay is bounded BY: the two sides' inner faces and every other
    // vertical partition. Read off the engine's own panels, so a partition the
    // owner has just dragged is measured where the engine has just put it.
    const walls = panels
      .filter((p) => (p.part === 'BUL' || p.part === 'BUR' || (p.part === 'VPART' && p.id !== panelId)) && p.box)
      .map((p) => ({ x: p.box.x, w: p.box.w }));

    const gaps = bayGapsAround({ at: { x: me.box.x, w: me.box.w }, walls });
    if (!gaps.length) return null;
    // Turn 24 (CLAUDE.md F10.1): the piece's own box, for the magnet below.
    const own = me.box;

    // Drawn across the FRONT of the partition: the face a joiner is looking at
    // when he points at it, and clear of the shelves.
    //
    // ─── TURN 25 (CLAUDE.md F14.1): AND BELOW THE MIDDLE ──────────────────
    // It used to sit on the bay's own mid-height, which is exactly where the
    // add (+) button stands — so the number a joiner had just asked for was
    // hidden behind the control he asked it with. It drops by a FRACTION of
    // the bay (`hoverDimensions.chainDropFraction`) rather than by a fixed
    // number of millimetres, because the button is placed the same way and a
    // fixed 80 mm is clear on a wardrobe bay and off the bottom of a 300 mm one.
    const y = me.box.y + me.box.h * (0.5 - style.chainDropFraction);
    const z = me.box.z + me.box.d;
    const rows = gaps.map((gap, i) => ({
      key: `bay${i}`, from: [gap.from, y], to: [gap.to, y], offset: 0,
    }));
    return { rows, z, mid: y, own };
  }, [panelId, result, style]);

  if (!drawing) return null;
  const magnet = mm(style.hoverMagnetMm);

  return (
    <group userData={{ ccHelper: true, ccNoBounds: true, ccHoverDimension: panelId }}>
      {/* ─── TURN 24 (CLAUDE.md F10.1): THE MAGNET ──────────────────────────
          Owner: turn 23's arrows vanish at a pixel's twitch. On this surface a
          twitch is a ray sliding off an 18 mm board, and tying the set to the
          board's own `onPointerOut` is what made it happen.
          "Once shown, the arrow set STAYS while the cursor remains within
          `profile.editor.hoverMagnetMm` of the feature — leave the radius,
          they fade." So this is that radius, as a volume: the piece's own box
          grown by the magnet on every side, invisible but raycast, and MOUNTED
          ONLY WHILE THE SET IS SHOWING — so it can never swallow a click on a
          cabinet nobody is measuring.

          Turn 26 (F4.4): "turn 25's magnet stays." It does, unchanged; what
          moved out of this file is the DRAWING. */}
      <DimensionChain
        rows={drawing.rows}
        style={{ ...style, labelGround: 'bare' }}
        plane="xy"
        at={drawing.z + style.strokeMm * 2}
        name={panelId}
      >
        <mesh
          position={[
            mm(drawing.own.x + drawing.own.w / 2),
            mm(drawing.own.y + drawing.own.h / 2),
            mm(drawing.own.z + drawing.own.d / 2),
          ]}
          userData={{ ccHelper: true, ccNoBounds: true, ccHoverMagnet: panelId }}
          onPointerOut={() => onLeave?.()}
        >
          <boxGeometry args={[
            mm(drawing.own.w) + magnet * 2,
            mm(drawing.own.h) + magnet * 2,
            mm(drawing.own.d) + magnet * 2,
          ]}
          />
          {/* Transparent rather than `visible={false}`: three.js does not
              raycast an invisible object at all, and a magnet nothing can
              point at is not a magnet. */}
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </DimensionChain>
    </group>
  );
}
