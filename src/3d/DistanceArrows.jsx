import { useMemo } from 'react';
import { mm } from './constants.js';
import DimLabel from './DimLabel.jsx';
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

/** A thin bar between two points in the wall's local X–Z plane, at height y. */
function Stroke({ from, to, y, weight, colour }) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dx, dz);
  if (!(length > 0)) return null;
  return (
    <mesh
      position={[(from[0] + to[0]) / 2, y, (from[1] + to[1]) / 2]}
      rotation={[0, -Math.atan2(dz, dx), 0]}
    >
      {/* Flat in Y as well as thin in Z: a dimension line is a LINE, and a
          square-section bar catches the light like a piece of furniture. */}
      <boxGeometry args={[length, weight * 0.6, weight]} />
      <meshBasicMaterial color={colour} toneMapped={false} allowOverride={false} />
    </mesh>
  );
}

/**
 * One end of a dimension: the architectural tick (a 45° slash across the line)
 * or an OPEN arrowhead — two strokes meeting at the measured point, nothing
 * filled in. `dir` is +1 when the head points along +X, −1 the other way.
 */
function End({ x, y, z, dir, cfg, weight, colour }) {
  const size = mm(cfg.arrowHead);
  if (cfg.head === 'open') {
    // The apex sits ON the measured point and the two strokes run back from it,
    // which is what makes "which way does it point" a non-question.
    const back = dir * size;
    const spread = size * 0.34;
    return (
      <>
        <Stroke from={[x, z]} to={[x - back, z - spread]} y={y} weight={weight} colour={colour} />
        <Stroke from={[x, z]} to={[x - back, z + spread]} y={y} weight={weight} colour={colour} />
      </>
    );
  }
  const rad = (cfg.tickAngle * Math.PI) / 180;
  const half = size * 0.5;
  return (
    <Stroke
      from={[x - Math.cos(rad) * half, z - Math.sin(rad) * half]}
      to={[x + Math.cos(rad) * half, z + Math.sin(rad) * half]}
      y={y}
      weight={weight}
      colour={colour}
    />
  );
}

/**
 * One measurement, in its wall's local frame: +X runs along the wall from the
 * start corner, +Z points into the room. The parent group does the placing, so
 * nothing here needs to know which wall of which shaped room it is on.
 */
function Arrow({ mark, cfg, colour }) {
  const x1 = mm(mark.from);
  const x2 = mm(mark.to);
  const y = mm(mark.y);
  const zLine = mm(mark.depth + cfg.standoff);
  const zFace = mm(mark.depth + cfg.extensionGap);
  const zTip = mm(mark.depth + cfg.standoff + cfg.extension * 0.25);
  const weight = mm(cfg.lineWeight);
  const head = mm(cfg.arrowHead);
  const span = x2 - x1;

  // A narrow gap has no room for two heads pointing inwards at each other: past
  // that point they turn round and point AT the gap from outside, and the line
  // is carried out past them — which is what a draughtsman does, and it is only
  // meaningful at all now that the heads point where they are aimed.
  const inward = span > head * 2.2;
  const overrun = inward ? 0 : head * 1.6;

  return (
    <group>
      {/* the dimension line */}
      <Stroke
        from={[x1 - overrun, zLine]}
        to={[x2 + overrun, zLine]}
        y={y}
        weight={weight}
        colour={colour}
      />

      {/* extension lines: out from the exact faces being measured, stopping a
          little past the dimension line */}
      {[x1, x2].map((x, i) => (
        <Stroke key={`ext${i}`} from={[x, zFace]} to={[x, zTip]} y={y} weight={weight} colour={colour} />
      ))}

      {[[x1, 1], [x2, -1]].map(([x, into], i) => (
        <End
          key={`end${i}`}
          x={x}
          y={y}
          z={zLine}
          dir={inward ? into : -into}
          cfg={cfg}
          weight={weight}
          colour={colour}
        />
      ))}

      <DimLabel
        position={[(x1 + x2) / 2, y + mm(cfg.labelOffset), zLine]}
        text={distanceLabel(mark.mm)}
        colour={colour}
        scale={0.9}
      />
    </group>
  );
}

export default function DistanceArrows({ walls, units, roomCentre, profile, colourKey }) {
  const cfg = profile.dimensions;
  // Turn 11 (CLAUDE.md F1.5): the fallback is the profile's own DEFAULT INK,
  // which lives in appearance.dimensions and is red from this turn on. `cfg` is
  // only where the two hexes are kept.
  const colour = cfg.colours[colourKey]
    || cfg.colours[profile?.appearance?.dimensions?.colour]
    || Object.values(cfg.colours)[0];
  const marks = useMemo(
    () => roomDistances({ walls, units, minGap: cfg.minGap }),
    [walls, units, cfg.minGap],
  );

  return (
    <>
      {walls.map((wall) => {
        const mine = marks.filter((m) => m.wall === wall.index);
        if (!mine.length) return null;
        return (
          <group
            key={`dim-wall-${wall.index}`}
            position={[mm(wall.start.x - roomCentre.x), 0, mm(wall.start.y - roomCentre.y)]}
            rotation={[0, wall.angle, 0]}
          >
            {mine.map((m, i) => (
              <Arrow key={`${m.kind}-${i}`} mark={m} cfg={cfg} colour={colour} />
            ))}
          </group>
        );
      })}
    </>
  );
}
