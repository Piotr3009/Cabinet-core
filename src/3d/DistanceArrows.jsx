import { useMemo } from 'react';
import { mm } from './constants.js';
import DimensionChain from './DimensionChain.jsx';
import { dimensionStyle } from '../engine/dimensionArrows.js';
import { roomDistances, distanceLabel } from '../engine/dimensions.js';

// ─── Distance arrows, drawn the way a drawing office draws them ───
//
// "How far is that unit from the wall, and what is the gap between those two?"
// The arithmetic is engine/dimensions.js; this file turns each measurement into
// a line, two ends and a caption. Every number it uses is in profile.dimensions,
// in ROOM millimetres — so the annotation scales with the drawing and not one
// bare number lives here (CLAUDE.md rule 3).
//
// Turn 5 (BACKLOG #34) redrew it. What turn 3 had:
//
//   * fat filled cones — a balloon, not a dimension;
//   * heads pointing the WRONG WAY. A three.js cone's tip is half its length
//     from its centre along the axis it points down. The old code put the
//     centre a half-length INTO the gap and pointed the cone that way too, so
//     the tip finished a whole head-length past the face it was supposed to be
//     touching and the base sat on it. Every arrow aimed away from what it
//     measured. Here the ends are placed by their TIP, which is the point being
//     measured, and there is nothing left to get backwards;
//   * gold — the colour of the furniture. A measurement has to read as
//     annotation, so it is drawing ink: navy by default, red as the option in
//     View ▸ Dimension colour.
//
// What replaces it is the plan-view convention: extension lines out from the
// two faces, a thin dimension line between them clear of the units, an oblique
// architectural tick at each end, and the value in the middle.
//
// Live during a drag for free: the store moves the unit, the measurements are
// derived from the units, so the arrow follows the cabinet frame by frame with
// no drag state of its own to keep in step.

// ─── TURN 26 (CLAUDE.md R11): THE DRAWING MOVED OUT ─────────────────────────
//
// R11: ONE DIMENSION COMPONENT. This file held the second of the three
// implementations — its own `Stroke`, its own architectural tick, its own OPEN
// arrowhead and its own caption — and having three is exactly how four dialects
// happened. It computes POINTS now and hands them to `3d/DimensionChain.jsx`.
//
// Nothing about WHAT is measured changed: `engine/dimensions.js roomDistances`
// is still the arithmetic, still per wall, still live during a drag because the
// measurements are derived from the units rather than from a drag state.
//
// The PLACEMENT is the same convention it always was and is now also F4.2's:
// the chain lies ON THE FLOOR, in front of the run, with witness lines coming
// out from the two faces being measured. That is what `plane="xz"` and a
// non-zero `offset` mean to the one component, so this file no longer has to
// say it in meshes.

/**
 * One measurement, as a row of points in its wall's local frame: +X runs along
 * the wall from the start corner, +Z points into the room. The parent group
 * does the placing, so nothing here needs to know which wall of which shaped
 * room it is on.
 */
function rowOf(mark, cfg, i) {
  return {
    key: `${mark.kind}-${i}`,
    // The two faces being measured, at the depth they actually stand at…
    from: [mark.from, mark.depth + cfg.extensionGap],
    to: [mark.to, mark.depth + cfg.extensionGap],
    // …and the dimension line pushed clear of them, into the room.
    offset: cfg.standoff - cfg.extensionGap,
    label: distanceLabel(mark.mm),
  };
}

export default function DistanceArrows({
  walls, units, roomCentre, profile, colourKey,
}) {
  const cfg = profile.dimensions;
  // Turn 11 (CLAUDE.md F1.5): the fallback is the profile's own DEFAULT INK,
  // which lives in appearance.dimensions and is red from this turn on. `cfg` is
  // only where the two hexes are kept.
  const colour = cfg.colours[colourKey]
    || cfg.colours[profile?.appearance?.dimensions?.colour]
    || Object.values(cfg.colours)[0];
  const style = useMemo(() => dimensionStyle(profile), [profile]);
  const marks = useMemo(
    () => roomDistances({ walls, units, minGap: cfg.minGap }),
    [walls, units, cfg.minGap],
  );

  return (
    <>
      {walls.map((wall) => {
        const mine = marks.filter((m) => m.wall === wall.index);
        if (!mine.length) return null;
        // Every mark on one wall shares a height — they are room distances, and
        // a room distance is measured on the floor.
        return (
          <group
            key={`dim-wall-${wall.index}`}
            position={[mm(wall.start.x - roomCentre.x), 0, mm(wall.start.y - roomCentre.y)]}
            rotation={[0, wall.angle, 0]}
          >
            <DimensionChain
              rows={mine.map((m, i) => rowOf(m, cfg, i))}
              style={style}
              plane="xz"
              at={mine[0].y}
              colour={colour}
              name={`wall-${wall.index}`}
            />
          </group>
        );
      })}
    </>
  );
}
