import { useMemo } from 'react';
import { mm } from './constants.js';
import DimLabel from './DimLabel.jsx';
import { dimensionEntities, dimensionStyle } from '../engine/dimensionArrows.js';
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

/** One thin bar between two points in the cabinet's own X–Y plane, at z. */
function Stroke({
  from, to, z, weight, colour,
}) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy);
  if (!(length > 1e-6)) return null;
  return (
    <mesh
      position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, z]}
      rotation={[0, 0, Math.atan2(dy, dx)]}
      userData={{ ccHelper: true, ccNoBounds: true }}
    >
      <boxGeometry args={[length, weight, weight * 0.6]} />
      <meshBasicMaterial color={colour} toneMapped={false} />
    </mesh>
  );
}

/**
 * The clear bays either side of one hovered partition.
 *
 * @param {object} props
 *   result   computeCabinet() output — the panels are read from it, so this
 *            component derives nothing the engine has not already decided
 *   panelId  the VPART being pointed at, or null for "nothing is hovered"
 *   profile
 */
export default function HoverDimensions({ result, panelId, profile }) {
  const style = useMemo(() => dimensionStyle(profile), [profile]);

  const drawing = useMemo(() => {
    if (!panelId || !result) return null;
    const panels = result.panels || [];
    const me = panels.find((p) => p.id === panelId && p.part === 'VPART');
    if (!me?.box) return null;

    // What a bay is bounded BY: the two sides' inner faces and every other
    // vertical partition. Read off the engine's own panels, so a partition the
    // owner has just dragged is measured where the engine has just put it.
    const walls = panels
      .filter((p) => (p.part === 'BUL' || p.part === 'BUR' || (p.part === 'VPART' && p.id !== panelId)) && p.box)
      .map((p) => ({ x: p.box.x, w: p.box.w }));

    const gaps = bayGapsAround({ at: { x: me.box.x, w: me.box.w }, walls });
    if (!gaps.length) return null;

    // Drawn across the FRONT of the partition, at its own mid-height: the face
    // a joiner is looking at when he points at it, and clear of the shelves.
    const y = me.box.y + me.box.h / 2;
    const z = me.box.z + me.box.d;
    const rows = gaps
      .map((gap) => dimensionEntities({
        from: [gap.from, y], to: [gap.to, y], offset: 0, style,
      }))
      .filter(Boolean);
    return { rows, z, mid: y };
  }, [panelId, result, style]);

  if (!drawing) return null;
  const weight = mm(style.strokeMm * 2);

  return (
    <group userData={{ ccHelper: true, ccNoBounds: true, ccHoverDimension: panelId }}>
      {drawing.rows.map((row, i) => (
        // eslint-disable-next-line react/no-array-index-key -- a bay has no id of its own
        <group key={i} userData={{ ccHelper: true, ccNoBounds: true }}>
          {row.segments.map(([a, b], j) => (
            <Stroke
              // eslint-disable-next-line react/no-array-index-key -- nor does a segment
              key={j}
              from={[mm(a[0]), mm(a[1])]}
              to={[mm(b[0]), mm(b[1])]}
              z={mm(drawing.z) + weight}
              weight={weight}
              colour={style.colour}
            />
          ))}
          {/* The value, on the line — the scene's own label sprite, in the
              hover ink rather than the dimension red, so it reads as the
              moment it is. */}
          <DimLabel
            position={[mm(row.text.at[0]), mm(row.text.at[1]), mm(drawing.z) + weight * 2]}
            text={String(Math.round(row.value))}
            colour={style.colour}
            variant="flat"
            scale={0.8}
          />
        </group>
      ))}
    </group>
  );
}
